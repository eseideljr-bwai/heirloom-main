# Analytics: HubSpot page tracking + contact sync — rollout runbook

Status labels: **[code]** implemented in this branch, not deployed ·
**[account]** needs an account owner (GTM / GA4 / HubSpot / GCP) · **[done]** confirmed done.

Live IDs (read from production, Nov 19 2026): GTM `GTM-KXQ7G3V3`, GA4 `G-GE349TN856`,
HubSpot hub `244135672` (data region `na2`).

---

## 1. What the code does

| Area | Where | Status |
|---|---|---|
| Route → feature map (the only paths/titles analytics sees) | `lib/analytics/route-map.ts` | [code] |
| Generic page titles from the map (server + client) | `app/layout.tsx` `generateMetadata`, `AnalyticsRoot` | [code] |
| Cookie banner (opt-in, equal-weight buttons, approved copy), "Cookie settings" in footer + Settings → Privacy | `app/components/analytics/CookieBanner.tsx`, `lib/analytics/consent.ts`, `config.ts` | [code] |
| GTM loader: Consent Mode v2 denied defaults inline before GTM; GTM injected only after consent; none in the iOS app | `app/components/GoogleTagManager.tsx` | [code] |
| HubSpot route observer: `setPath` before the first view, `setPath`+`trackPageView` on later path changes, dedupe, `identify`, sign-out reset | `app/components/analytics/AnalyticsRoot.tsx`, `lib/analytics/hubspot.ts` | [code] |
| Token stripping (`/invite/<token>`, `/auth/action?…`, `?next=/invite/<token>`) | `lib/analytics/url-scrub.ts`, `middleware.ts`, `app/invite/page.tsx` | [code] |
| CSP: `img-src https://track-na2.hubspot.com` only | `middleware.ts` | [code] |
| `Referrer-Policy: strict-origin` (no paths in any referrer) | `next.config.mjs` | [code] |
| `track()` with two events, once each | `lib/analytics/datalayer.ts`, `events.ts` | [code] |
| Contact sync handler `POST /api/analytics/sync` (off unless `HUBSPOT_SYNC_ENABLED=1`) | `app/api/analytics/sync/route.ts`, `lib/server/analytics-sync/*` | [code] |
| Sync triggers, daily sync, email-arrival flag, sign-up checkbox | `lib/analytics/sync.ts`, `email-flag.ts`, `UsageSyncRoot.tsx`, `MarketingOptInCheckbox.tsx` | [code] |
| Unit tests (36) against a mocked HubSpot | `scripts/tests/analytics-sync.test.mts` — `npm run test:analytics` | [code] |

---

## 2. GTM container changes (GTM-KXQ7G3V3) — [account]

Do these in a new workspace, check in **Preview** (Tag Assistant) against a build that loads
GTM, then publish. Don't add a History Change trigger or a second Google tag.

**Variables → User-Defined → New → Custom JavaScript**

1. `CJS - KL page_location`
   ```js
   function () {
     var k = window.klAnalytics;
     return k ? k.pageLocation() : location.origin + '/other';
   }
   ```
2. `CJS - KL page_title`
   ```js
   function () {
     var k = window.klAnalytics;
     return k ? k.pageTitle() : 'Kinloom';
   }
   ```
   These read the *current* location at event time. Don't use Data Layer variables for these:
   GA4's history page_view fires inside Next's `pushState`, before the app can push `kl_route`,
   so a data-layer value would describe the previous page.

**Triggers → New → Custom Event**

3. `CE - kl_consent_granted` — event name `kl_consent_granted`.
4. `CE - sign_up` — event name `sign_up`.
5. `CE - first_kinloom_created` — event name `first_kinloom_created`.

**Tags**

6. **Google tag `G-GE349TN856`** (existing, currently paused)
   - Configuration settings → add `page_location` = `{{CJS - KL page_location}}`,
     `page_title` = `{{CJS - KL page_title}}`.
   - Advanced settings → Consent settings → *Require additional consent for tag to fire* →
     `analytics_storage`.
   - Trigger: keep **Initialization – All Pages**.
   - Unpause **only** after Preview shows sanitized values on a direct load *and* on in-app
     navigations (step 10).
7. **HubSpot Custom HTML tag** (existing)
   - Trigger: replace *All Pages* with `CE - kl_consent_granted`.
   - Advanced → Tag firing options → **Once per page**.
   - Consent settings → require `analytics_storage`.
8. **New GA4 Event tag `GA4 - sign_up`** — measurement ID `G-GE349TN856`, event name `sign_up`,
   **no parameters**, trigger `CE - sign_up`, consent `analytics_storage`.
9. **New GA4 Event tag `GA4 - first_kinloom_created`** — same, event name
   `first_kinloom_created`, trigger `CE - first_kinloom_created`.

**Verify in Preview, then publish**

10. In Preview: (a) before Accept, no tag fires and no `google-analytics.com` / `hubspot`
    request goes out; (b) after Accept, the Google tag's `page_location` is
    `https://app.kinloom.com/<feature path>` (e.g. `/kinloom`, never `/library/01H…`);
    (c) navigate in-app and check the history `page_view` carries the **new** feature path and
    generic title; (d) open an invitation link: no token anywhere. If (c) shows a stale or raw
    location, stop: the fallback is to turn off "page changes based on browser history events"
    in the GA4 stream and fire `page_view` from a `kl_route` Custom Event tag (report first).
11. Publish with a version name such as `Kinloom consent + sanitized page views`.

---

## 3. HubSpot setup — [account]

**Settings**
- Tracking code → confirm `app.kinloom.com` is listed under the site domains.
- Privacy & consent → Cookies: **no HubSpot cookie banner for `app.kinloom.com`** (Kinloom shows
  its own; only one banner may ever appear).
- Non-HubSpot forms collection: OFF **[done Nov 19, nothing captured]**. Keep it off; the CSP
  also keeps `*.hscollectedforms.net` blocked.
- Default marketing status for contacts created by integrations: **non-marketing**.
- Data privacy settings: decide whether the account accepts a legal basis on subscriptions. If
  yes, set `HUBSPOT_LEGAL_BASIS_ENABLED=1`; if not, the sync records the choice as a property only.
- Email subscription types: pick the one sign-up opt-ins go to → its id is `HUBSPOT_SUBSCRIPTION_ID`.

**Private app** (Settings → Integrations → Private apps): name "Kinloom app sync".
Scopes: `crm.objects.contacts.read`, `crm.objects.contacts.write`, and — only if the
subscription opt-in is used — `communication_preferences.write`. The token goes to GCP
Secret Manager (section 5), never to GitHub or a `NEXT_PUBLIC_` variable.

**Property group** `kinloom_usage` (label "Kinloom usage"), contact object. Internal names and
option values must match exactly; labels are free.

| Internal name | Label | Type (field type) | Options: label → internal value |
|---|---|---|---|
| `kinloom_account_status` | Kinloom account status | Enumeration (dropdown) | Invited → `invited`; Active → `active` |
| `kinloom_signup_date` | Kinloom sign-up date | Date picker | |
| `kinloom_age_bracket` | Kinloom age bracket | Enumeration (dropdown) | Under 18 → `under_18`; 18–24 → `18_24`; 25–34 → `25_34`; 35–44 → `35_44`; 45–54 → `45_54`; 55–64 → `55_64`; 65+ → `65_plus` |
| `kinloom_gender` | Kinloom gender | Enumeration (dropdown) | Female → `female`; Male → `male`; Undisclosed → `undisclosed` |
| `kinloom_first_kinloom_date` | First kinloom date | Date picker | |
| `kinloom_kinlooms_created` | Kinlooms created | Number | |
| `kinloom_owns_family_space` | Owns a Family Space | Single checkbox (boolean) | Yes → `true`; No → `false` |
| `kinloom_last_active_date` | Kinloom last active | Date picker | |
| `kinloom_plan` | Kinloom plan | Enumeration (dropdown) | Free → `free`; Paid Home → `paid_home`; Paid Family Space → `paid_family_space` |
| `kinloom_invited_date` | Kinloom invited date | Date picker | |
| `kinloom_contact_origin` | Kinloom contact origin | Enumeration (dropdown) | Already in HubSpot → `hubspot_existing`; Invitation → `invitation`; App sign-in → `app_sign_in` |
| `kinloom_established_date` | Added by Kinloom app | Date picker | |
| `kinloom_marketing_opt_in` | Kinloom marketing opt-in | Enumeration (dropdown) | Yes → `yes`; No → `no`; Prior consent → `prior_consent` |
| `kinloom_marketing_opt_in_date` | Kinloom marketing opt-in date | Date picker | |

Not created: `kinloom_invitations_sent` (D5, dropped).

---

## 4. Property dictionary (source of every value)

All reads are existing Laravel GETs made with the member's own HttpOnly-cookie identity (D12).
A failed read means no write at all.

| Property | Source | Rule |
|---|---|---|
| account_status | `GET /me` `onboarding_state === 'complete'` → `active`. Invitee sync → `invited` | Members never written as `invited`; active contacts never touched by invitee sync |
| signup_date | Day of the `signup` / `onboarding` sync (D4) | Set once; existing members stay empty |
| age_bracket | `GET /me/profile` `birth_date` | Bracket only; the date never leaves the server |
| gender | `GET /me/profile` `person.gender` (`f`/`m`/`n`) | Empty when unset |
| first_kinloom_date | `GET /vault?status=final&per_page=1&page=<total>` → oldest `created_at` (D7) | Set once |
| kinlooms_created | `GET /vault?status=final&per_page=1` `meta.total` (D7) | Current count; drops on delete |
| owns_family_space | `GET /me` `spaces[].role === 'owner'` (D6) | Current |
| last_active_date | Day of the sync | Browser sends daily at most once per member per day |
| plan | `GET /me` `plan`: free→free, home→paid_home, family→paid_family_space | Current |
| invited_date | Invitee sync day; invitee email from `GET /family-homes/{home}/manage` or `GET /family-spaces/{space}/manage` (owner only), matched by invitation id | Set once |
| contact_origin | HubSpot state at first sync | Set once |
| established_date | Day the app created the contact | Only on create |
| marketing_opt_in (+ date) | The member's own sign-up choice; `prior_consent` only if HubSpot already holds the address as a marketing contact | Sign-up only; marketing status never written (D11) |

Reads per sync: sign-in/daily/kinloom/etc. ≤ 4 (`/me`, `/me/profile`, `/vault` ×1–2);
sign-up 1 (`/me`); invitation 2 (`/me`, one manage endpoint).

**Known limitations**
- Invitations sent: not derivable (pending only) — dropped (D5).
- Sign-up date: no account-created date in the API; going forward only (D4).
- "Created a Family Space": only *currently owns* is derivable (D6).
- First kinloom date: oldest *surviving* final kinloom; set once, so a later delete doesn't move it.
- HubSpot IP location: only from email clicks/forms; `kinloom_region` (load-balancer geo
  headers) is open — the app appears to sit behind an external HTTPS load balancer (static IP
  8.233.186.189, `via: 1.1 google`); confirm in GCP.
- Existing members are added on their next sign-in or daily sync; no backfill.
- Talk and Biographer publishes inside the iOS app still sync (server-side), but no browser analytics runs there (D9).

---

## 5. Dev/Local test plan (when testing resumes)

**Setup**
- HubSpot: a **test portal** (developer test account) with the property group above and its own
  private app token. Never the production portal from local/dev.
- `.env.local` / dev Cloud Run: `HUBSPOT_SYNC_ENABLED=1`, `HUBSPOT_PRIVATE_APP_TOKEN=<test portal>`,
  optionally `HUBSPOT_SUBSCRIPTION_ID` + `HUBSPOT_LEGAL_BASIS_ENABLED=1` if the test portal supports it.
- GTM: dev builds don't set `NEXT_PUBLIC_GTM_ID`. For page-tracking tests, either set it on a dev
  build and use GTM **Preview** only (nothing published), or create a GTM environment. Add
  your IPs to GA4 internal traffic first.
- Two test member accounts (A, B) + one fresh email for sign-up + one invitee inbox.
- `npm run test:analytics` (36 unit tests) must pass first.

**Phase 1 — page tracking** (DevTools Network filtered to `google-analytics|hubspot|googletagmanager`)
1. Fresh profile, load `/`: banner shows; **no** GTM/GA4/HubSpot requests; `dataLayer` has only
   consent defaults + `kl_route`.
2. Accept: `gtm.js` loads; exactly one GA4 `page_view` and one HubSpot `__ptq.gif`, both
   `/sign-in` with the generic title.
3. Navigate Home → Library → a kinloom → back → forward → refresh: one view each, paths `/home`,
   `/library`, `/kinloom`, … ; never an id; titles `Kinloom · …`.
4. Library search / filters (query-only): no new view.
5. Open `/invite/<real token>`: address bar becomes `/invite`; refresh works; no token in any
   request (search the HAR for the token).
6. Password reset email link: address bar `/auth/action`; refresh still works; no `oobCode` in any request.
7. Sign in as A: next HubSpot view carries identify; in the test portal A's contact shows the views.
8. Sign out, sign in as B on the same browser: `hubspotutk` changes; B's views land on B; nothing on A.
9. Cookie settings → Decline: page reloads; no GTM, no requests; `__hs_do_not_track` / HubSpot cookies cleared.
10. Complete onboarding (fresh account): one `sign_up` in `dataLayer`; refresh/revisit: none.
    Accept an invitation with a fresh account: one `sign_up`.
11. Publish a first kinloom: one `first_kinloom_created`; publish a second: none.
12. iOS embed (`?embed=ios`): no banner, no `gtm-bootstrap` script, no vendor requests.
13. Console: no hydration warnings, no CSP violations other than none expected.

**Phase 2 — contact sync** (test portal; check contact properties after each)
14. Sign up with the box **checked** → contact created: `app_sign_in`, established date,
    `kinloom_marketing_opt_in=yes` + date; subscription opted in only if legal basis enabled;
    marketing status unchanged (non-marketing).
15. Sign up **unchecked** → `no` + date; no subscription change.
16. Sign up after visiting with `?_hsenc=x&_hsmi=y` → checkbox hidden; address that is a marketing
    contact → `prior_consent`; address that isn't → opt-in empty, nothing subscribed. Flag gone
    after sign-up; a flag older than 30 days is ignored.
17. Onboard → `active`, signup date set; repeat → dates unchanged.
18. Sign in as a member with no contact → created `active`, `app_sign_in`, snapshot; sign in again
    → no duplicate, origin/established unchanged. Member already in the portal → `hubspot_existing`.
19. Publish / delete kinlooms → count follows; first kinloom date set once.
20. Invite to Home and to a Space → invitee contact `invited` + invited date only; inviting an
    `active` contact changes nothing; revoke → stays `invited`.
21. Invitee signs up with the invited address and onboards → same contact becomes `active`.
22. `curl -X POST /api/analytics/sync -d '{"reason":"daily"}'` with no cookies → 401; with a
    body full of property values/emails → those are ignored.
23. Force a Laravel 429 or HubSpot outage (bad token) → member sees nothing; server log shows only
    a code; no partial update in the portal.
24. Check server logs contain no emails, tokens or bodies.

---

## 6. Production rollout checklist

**Before merge**
- [ ] [account] GA4 admin: user-provided data collection off; site search + form interactions off;
      retention 14 months; internal traffic defined. GA4 data-deletion request for earlier
      token-bearing URLs (`/invite/…`, `oobCode`, `?q=`).
- [x] [done] GA4 Google tag paused (GTM v4). HubSpot non-HubSpot forms collection off.
- [ ] [account] HubSpot: cookie banner off for `app.kinloom.com`; non-marketing default for
      integrations.
- [x] [done] HubSpot: `kinloom_usage` group + the 14 properties (section 3); verified in local
      testing (the sync wrote correctly to a test contact). Private app token created.
- [x] [done] GCP: Secret Manager secret `hubspot-private-app-token` in `bw-heirloom-prod`
      (version 2 = the real token), readable only by `heirloom-web-prod@…` (Secret Accessor).
- [x] [code] `.github/workflows/deploy.yml` → `deploy-prod` (`heirloom-main-prod`):
      ```yaml
      env_vars: |
        …
        HUBSPOT_SYNC_ENABLED=0
      secrets: |
        ANTHROPIC_API_KEY=anthropic-api-key:latest
        HUBSPOT_PRIVATE_APP_TOKEN=hubspot-private-app-token:latest
      ```
      The first prod deploy ships with the sync **off**; it is turned on in a follow-up
      commit (see "Turn on the sync"). `HUBSPOT_SUBSCRIPTION_ID` and
      `HUBSPOT_LEGAL_BASIS_ENABLED` are optional and left unset for now: without them a
      sign-up opt-in is recorded as the `kinloom_marketing_opt_in` property only.
      Dev/preview jobs: leave the HubSpot vars out (sync stays off).
- [ ] Dev/Local test plan (section 5) passed; `npm run test:analytics` green.
- [ ] Dan: Privacy Policy covers the analytics cookies, the HubSpot sync and the email-arrival flag.

**Deploy (sync off, GA4 paused)**
- [ ] Merge + deploy. Verify on `app.kinloom.com`: banner shows; before Accept no vendor requests;
      CSP header contains `https://track-na2.hubspot.com` and **not** `hscollectedforms`;
      `Referrer-Policy: strict-origin`; invite/reset links strip tokens.
- [ ] GTM: apply section 2 in a workspace; Preview against production; check step 10; publish.
      Unpause the Google tag in the same version only if step 10 (c) passes.
- [ ] Check HubSpot receives sanitized views (Contacts → a test contact → activity).

**Turn on the sync** (only after the Phase 1 checks above pass in prod)
- [ ] Follow-up commit: change `HUBSPOT_SYNC_ENABLED=0` to `1` in `deploy.yml` → `deploy-prod`,
      then deploy. Change it in `deploy.yml`, not only with `gcloud run services update`:
      every deploy re-applies the value in `deploy.yml`, so a console-only change would be
      reset to `0` by the next deploy.
- [ ] Sign in with a test member; confirm the contact and properties. Watch logs for
      `[analytics-sync]` warnings for a day.
- [ ] Optional, later: only after confirming the account supports a legal basis, add
      `HUBSPOT_SUBSCRIPTION_ID` + `HUBSPOT_LEGAL_BASIS_ENABLED=1` to `deploy-prod`. Until then
      both stay unset.

**Rollback** (fastest first)
- Sync: `HUBSPOT_SYNC_ENABLED=0` (route returns 204 and does nothing).
- Vendors: pause the Google tag and the HubSpot tag in GTM and publish (no deploy needed).
- Banner/tracking code: revert this branch's commit; the CSP and loader revert with it.
- Re-ask everyone for consent: bump `CONSENT_VERSION` in `lib/analytics/config.ts`.
- Remove synced data: delete the `kinloom_usage` property values in HubSpot (bulk edit) or the
  properties themselves; contacts with origin `invitation` / `app_sign_in` were created by the app.
