# Kinloom iOS WebView bridge contract (version 1)

Status: **Draft for sign-off** (SOW Phase 0, "finalize WebView bridge contract")
Covers SOW items: D1 (shell-less mode), D2 (bridge emitter), D3 (session bootstrap), W-Auth, W-Session
Owner: Jose Couto. Approver: Eric Seidel, Jr.
Web code: `lib/embed.ts`, `middleware.ts`, `app/api/auth/mobile-session/route.ts`

This document is the agreement between the web app (this repo) and the native iOS app about how the Talk and Biographer creation flows run inside a `WKWebView`. If the two sides disagree with this document, the document wins until it is changed here.

## 1. What this covers

The iOS app is native SwiftUI for everything that is API-driven. Two flows stay on the web, inside an authenticated `WKWebView`:

| Flow | Entry URL |
|---|---|
| Talk | `/create/talk` |
| Biographer | `/create/import` |

The publish step inside those flows is also web (SOW W1–W2). Native does not rebuild these flows, and they do not move to Laravel.

This contract does not cover the social graph (Vault, Family Home, Family Space, publications). Those wait for the frozen API contract (D11). When D11 lands, the publish step changes on the web side; the message types below are designed so that change is additive (see section 7).

## 2. Opening a flow, in order

1. Native holds a signed-in Firebase user.
2. Native gets a current Firebase ID token (`getIDToken`, forcing a refresh if it is close to expiry).
3. Native calls `POST /api/auth/mobile-session` (section 4).
4. Native copies the returned cookies into the web view's `WKHTTPCookieStore` **before the first navigation**.
5. Native loads the entry URL **with `?embed=ios`** appended, for example `https://<web-domain>/create/talk?embed=ios`.

The user never sees the web login screen.

### Embedded mode (D1)

`?embed=ios`, or the request header `X-Kinloom-Client: ios`, turns on embedded mode. The server sets a session cookie `kinloom_embed=ios` so every later navigation inside the flow stays embedded. `?embed=off` clears it.

Embedded mode changes presentation only:

- The web navigation bar is not rendered and the page uses the full width. Native owns the title bar and the close button.
- The web page does not sign the user out on its own. (The web normally watches Firebase and signs out when the Firebase user disappears. A `WKWebView` has no web Firebase user, so doing that would revoke the native app's tokens. It is switched off in embedded mode.)
- Exits that would leave the flow are sent to native as messages instead of navigating (section 5).

Embedded mode is never an access check. The API decides what a user can read or write; the flag cannot widen that.

Recommended: use the `?embed=ios` query parameter on the first URL. A custom header on the first request also works, but the query parameter is the simpler path and survives redirects.

## 3. Cookies

Set by `POST /api/auth/mobile-session`. In production all of them are `Secure`, `SameSite=Lax`, path `/`, so install them for the **https** origin.

| Cookie | HttpOnly | Lifetime | Purpose |
|---|---|---|---|
| `kinloom_session` | yes | **1 hour** | Firebase session cookie. Proves who the user is. |
| `kinloom_id_token` | yes | 55 minutes | Fresh ID token the server uses to call the Laravel API. |
| `kinloom_session_started_at` | no | 30 days | Start time, used by the web's absolute session limit. |
| `kinloom_active_family_space` | no | 30 days | Optional. Set only if native sends `activeFamilySpaceId`. Advisory: the server checks it against `/me` and ignores a space the user does not belong to. |
| `kinloom_embed` | no | session | Set by the server on the first embedded request. |

The `kinloom_embed` cookie is set by middleware on the response to the first embedded request, so native does not need to create it.

The ordinary web login keeps a 14-day session cookie. The mobile route deliberately issues a 1-hour one (section 4, why).

## 4. Session bootstrap endpoint (D3)

`POST /api/auth/mobile-session`

Request headers:

```
Content-Type: application/json
X-Kinloom-Client: ios
```

Request body:

```json
{ "idToken": "<Firebase ID token>", "activeFamilySpaceId": "<optional ulid>" }
```

Responses:

| Status | Meaning |
|---|---|
| 200 | `{ "ok": true, "uid": "...", "expiresInSeconds": 3600 }` plus the `Set-Cookie` headers above |
| 400 | Body is not valid JSON |
| 401 | Token is invalid, expired, or revoked, or it came from a server-minted custom sign-in |
| 403 | `X-Kinloom-Client: ios` header is missing |
| 422 | `idToken` is missing |
| 502 | The server could not complete the token exchange. Safe to retry once. |

### Why a dedicated route, not `/api/auth/session`

This settles SOW open question #1 ("allow `/api/auth/session` from native, or a dedicated mobile route?").

`/api/auth/session` cannot serve a native app. Firebase only turns an ID token into a session cookie if the user signed in within the last 5 minutes. A native user who signed in days ago holds a valid ID token that fails that check. The mobile route verifies the token (including revocation), exchanges it for a fresh one for the same user, and issues the cookie from that.

Because that exchange could turn a leaked token into a long session, the session is capped at **1 hour** and the native app re-bootstraps every time it presents the web view.

### Security properties

- The custom header means a form on another site cannot call the endpoint (browsers cannot send custom headers cross-site without CORS approval, and the route offers none).
- Revoked tokens are rejected.
- Tokens that came from the server's own custom sign-in are rejected, so a minted token cannot renew itself.
- Session and token cookies are `HttpOnly`; page scripts cannot read them.
- No token is returned in the JSON body or written to logs.

## 5. Messages from web to native (D2)

The web posts one object per event to `window.webkit.messageHandlers.kinloom`. Native registers a `WKScriptMessageHandler` under the name **`kinloom`**.

Every message has the same envelope:

```json
{ "version": 1, "type": "<type>", ... }
```

| `type` | Extra fields | When it fires | Native should |
|---|---|---|---|
| `publishComplete` | `kinloomIds: string[]` | The flow published and is finished | Dismiss the web view. Refresh the Vault and any room that shows kinlooms. |
| `cancel` | none | The user backed out. Nothing new was published. | Dismiss the web view. |
| `requestClose` | none | The flow tried to go to a screen the web view does not host (a user with no family space is sent to onboarding; onboarding is native) | Dismiss the web view and route natively. |
| `sessionExpired` | none | An API call returned 401, or the web session vanished or timed out | Run the expiry flow (section 6). |

Notes:

- For a sectioned Biographer import, `kinloomIds` holds **only the last section's** IDs. Earlier sections were saved as the user went, so native should refresh from the API rather than rely on the list.
- If a native handler is not registered, or posting throws, the page falls back to its normal web navigation. That is how the same pages keep working in a desktop browser. It also means: if native registers the handler, native must close the web view on `publishComplete` and `cancel`, because the web will not navigate away on its own.
- `sessionExpired` is sent at most once per page load by the timer, and on every 401 from an API call. Native should debounce.

Example Swift handler:

```swift
final class KinloomBridge: NSObject, WKScriptMessageHandler {
    func userContentController(_ c: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let version = body["version"] as? Int, version == 1,
              let type = body["type"] as? String else { return }   // ignore anything unknown

        switch type {
        case "publishComplete":
            let ids = body["kinloomIds"] as? [String] ?? []
            // dismiss web view, refresh Vault
        case "cancel", "requestClose":
            // dismiss web view
        case "sessionExpired":
            // run the expiry flow
        default:
            break   // unknown types are ignored, never an error
        }
    }
}
```

## 6. Session expiry and recovery (W-Session)

The web signals an expired session in three ways. Native must handle all three, because a page can fail in different places:

1. The bridge message `sessionExpired`.
2. A **navigation guard**: the main frame navigates to `/`, `/login` or `/signup`. A user who has a valid session never lands there (middleware sends them to `/home`), so landing there means the session is gone. The server redirect carries `?next=<original path>` or `?reason=session_expired`.
3. An HTTP 401 from `/api/*` (also surfaced as message 1 by the page).

Recovery, as the SOW describes:

1. Native refreshes the Firebase ID token.
2. Native calls `POST /api/auth/mobile-session` again and replaces the cookies.
3. Native reloads the last good URL **once**.
4. If that fails, native shows a native error. It does not loop.

Native should also re-bootstrap proactively each time it presents the web view. The session lasts one hour, so a flow left open longer will need step 1–3 when the user resumes.

The 24-hour idle and 30-day absolute limits from the web still exist. In embedded mode they send `sessionExpired` instead of signing the user out.

## 7. Versioning and change rules

- `version` is an integer. This document is version 1.
- **Additive changes do not bump the version**: a new message `type`, or a new optional field on an existing message. Native must ignore unknown `type` values and unknown fields (the example handler above does).
- **Breaking changes bump the version**: renaming or removing a message or field, or changing what a field means. When that happens, the web keeps sending version 1 until Eric and the iOS lead agree a minimum app version.
- When the social graph contract (D11) lands, the publish step will report where the kinloom went (Family Home, Family Spaces). That is planned as new optional fields on `publishComplete`, so it stays version 1.

## 8. Tested so far

Run on 7 October 2026 against a local web server and the real Firebase project and Laravel backend, with a real account. Read-only: nothing was created or published.

| Check | Result |
|---|---|
| Sign in with Firebase, `POST /api/auth/mobile-session` with the header | 200, cookies set as in section 3, session lifetime 3600 seconds |
| Missing header | 403 |
| Missing token | 422 |
| Garbage token | 401 |
| Cookies on `/create/talk`, `/create/import`, `/library` | 200, no redirect |
| Same pages without cookies | redirect to `/?next=...` |
| `/api/auth/me` and `/api/proxy/me` with the cookies | the user's profile from the Laravel backend |

## 9. Not tested yet

- A real `WKWebView` on a device. The cookie install, the message handler, the navigation guard and the reload-once recovery are all native-side work that waits for the iOS app.
- The deployed staging web domain (D10). Cookies are `Secure` in production, so they are only exercised over https there.

## 10. Decisions for Eric to sign off

1. **Dedicated route.** `POST /api/auth/mobile-session` replaces "allow `/api/auth/session` from native". Reason in section 4.
2. **1-hour session** for the web view, with re-bootstrap each time the web view is presented.
3. **Entry URLs** `/create/talk` and `/create/import` with `?embed=ios`.
4. **Four message types** (section 5), version 1, additive-only changes within a version.
5. **Native owns navigation chrome**: title bar, close button, and what happens after `publishComplete`.

| | Name | Date |
|---|---|---|
| Web (Jose Couto) | | |
| Kinloom (Eric Seidel, Jr.) | | |
