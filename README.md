# Heirloom Main

Next.js front end for the Heirloom / Kinloom platform.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in Firebase values
npm run dev -- -p 3004
```

## Auth (Epic 1)

Identity is owned by **Firebase Authentication**. The browser holds
the Firebase ID token; every API call to Laravel sends it as a
`Authorization: Bearer <id-token>` header. Laravel verifies the
token via the Firebase Admin SDK on every request.

### Required env vars

See `.env.example`. The browser needs `NEXT_PUBLIC_FIREBASE_*` for
the Web SDK; the server needs Admin SDK service-account credentials
for session-cookie minting and SSR custom-token exchange.

### Setting up a Firebase project

1. Create a project at <https://console.firebase.google.com>.
2. Authentication → Sign-in method → enable **Email/Password**.
3. Project settings → General → "Your apps" → register a Web app.
   Copy the `apiKey`, `authDomain`, `projectId` into the three
   `NEXT_PUBLIC_FIREBASE_*` env vars.
4. Project settings → Service accounts → "Generate new private key".
   Either:
   - Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
     `FIREBASE_PRIVATE_KEY` from the JSON, **or**
   - `base64 -i service-account.json | pbcopy` and set
     `FIREBASE_SERVICE_ACCOUNT_B64`.
5. The same service-account credentials must be configured on the
   Laravel side so it can verify ID tokens issued by your project.

### Architecture

- `lib/firebase-client.ts`    — Web SDK init (browser).
- `lib/server/firebase-admin.ts` — Admin SDK init (server).
- `lib/auth.ts`               — client-facing login/register/etc.
- `lib/auth-context.tsx`      — React context + idle/absolute timeouts.
- `lib/server/auth.ts`        — `getCurrentUser` for server components.
- `app/api/auth/session/route.ts` — sync browser ID token ↔ server
  session cookie + short-lived ID-token cookie.
- `app/api/proxy/[...path]/route.ts` — same-origin BFF that forwards
  the Bearer header to Laravel.
- `middleware.ts`             — route protection + per-request CSP nonce.

### Cookies

| Cookie | TTL | HttpOnly | Purpose |
|---|---|---|---|
| `kinloom_session` | 14d | yes | Firebase session cookie. Identity for middleware + SSR. |
| `kinloom_id_token` | 55min | yes | Raw Firebase ID token. Bearer for SSR-to-Laravel calls. Refreshed on every `onIdTokenChanged`. |
| `kinloom_session_started_at` | 30d | no | Absolute-timeout clock (Epic 2). |
| `kinloom_active_family_space` | 30d | no | Currently-selected family space. |
| `kinloom_embed` | browser session | no | `ios` inside the iOS app's WebView. Hides the web chrome. |

### CSP

Strict, nonce-based. Generated per-request in `middleware.ts`.
Inline scripts are blocked unless they carry the per-response nonce.
`'unsafe-inline'` remains on `style-src` only (React style attributes).

## iOS WebView embed

The iOS app hosts Talk (`/create/talk`) and Biographer (`/create/import`)
in a WKWebView, through the publish step.

1. **Sign-in.** Native POSTs its Firebase ID token to
   `/api/auth/mobile-session` with `X-Kinloom-Client: ios` and body
   `{ "idToken": "...", "activeFamilySpaceId": "..." }` (the space is
   optional). It copies the `Set-Cookie` values into `WKHTTPCookieStore`
   before the first navigation. The session lasts one hour; re-bootstrap
   each time the WebView opens.
2. **Shell-less mode.** Open the flow with `?embed=ios`. AppNav is hidden
   and the web app leaves session handling to native. `?embed=off`
   clears it.
3. **Bridge.** The web posts `{ version: 1, type, ... }` to
   `window.webkit.messageHandlers.kinloom`:
   `publishComplete` (with `kinloomIds`), `cancel`, `requestClose`,
   `sessionExpired`. Full contract in `lib/embed.ts`. Without a handler,
   every exit navigates as it does on the web.
4. **Expired session.** A redirect to `/` or a `sessionExpired` message
   means re-bootstrap and reload once.

Universal Links for `/invite/*` are served from
`/.well-known/apple-app-site-association` once `APPLE_APP_IDS` is set.
