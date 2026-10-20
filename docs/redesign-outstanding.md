# Federated Containers redesign — outstanding items

Running list of everything deferred, faked or unverified while building the
new design against the current MVP backend. Grouped by who can clear it.

---

## 1. Blocked on the backend

### Already in the Recurse SOW
| # | Item | Blocks | SOW |
|---|---|---|---|
| 1.1 | `Home.motto` (nullable text) | My Home — family motto | 2.1 |
| 1.2 | `Home.established_year` | My Home — "since" stat | 2.1 |
| 1.3 | `status` on the kinloom **read** model (write-only today) + latest-draft lookup + a word count | My Home — "Where you left off" | 4.1 |
| 1.4 | `kinloom.featured_quote` | My Home pull quote; Legacy Portrait quote | 4.1 |
| 1.5 | Featured recorded voice per Home | My Home — voice player | 5.1 |
| 1.6 | **Publications join table** — which container each kinloom is published to | Publish sheet targets; Vault chips + all four filters; Portrait stats; scope page rows; Our Library's "published to" chip | 4.2 |
| 1.7 | Per-target member counts | Publish sheet reach line; footer "private to N people" | 4.2 |
| 1.8 | Default publish target | Publish sheet | 4.2 |

### Not scoped — needs a change order or a cut
| # | Item | Blocks |
|---|---|---|
| 1.9 | Featured film per Home | My Home hero card |
| 1.10 | Featured photograph per Home | My Home "moment" |
| 1.11 | Recent photo media for a Home | My Home closing-band strip |
| 1.12 | Media tallies (photographs / voices / films) | My Home band note. SOW 5.1's "profile and counts" is ambiguous — confirm |
| 1.13 | **Viewer-filtered counts** ("you can see N of M") | Portrait scope line; Legacy Bank sidebar; scope page |
| 1.14 | `published_at` | Vault + Library show `created_at` year instead |
| 1.15 | `when` / `where` on a kinloom | Composer fields render but do not persist |
| 1.16 | `member_id` on `/me` | Account menu can't self-resolve; worked around with `/portrait/me` + `/legacy-bank/me` resolver routes |
| 1.17 | Query params on **any** content endpoint | All filtering, sorting and paging is client-side; the whole space is refetched per view |

**Suggestion for 1.9–1.12:** these all come from the design's featured-content
curation (`featurehome`), which isn't scoped and whose screen isn't built.
Deriving them automatically — most recent film, most recent photo, latest
photos — needs no curation UI and only a filtered query. Cheapest path by far.

---

## 2. Unverified — cheap to settle, expensive to get wrong

| # | Question | Why it matters |
|---|---|---|
| 2.1 | Does `GET /family-spaces/{id}/library` return **private** kinlooms? | If not, My Vault silently under-reports and its Private filter is permanently empty |
| 2.2 | Do list rows carry `visibility`? | Nothing in the codebase reads it off a list row — only off the detail endpoint. If absent, every Vault card reads as "published to Home" |
| 2.4 | ~~Does a subject-less conversation ground across the whole Space?~~ **Answered by Phase 3.** `LegacyBankConversationCreate` is a oneOf: `{ subject_member_id }` for a person, or `{ scope: "space", family_space_id }` for a Space. Space grounding is a first-class variant, not a mock. `mode: living\|sealed` is gone |
| 2.3 | Archival kinlooms (about account-less relatives) authored by the recorder? | SOW 4.1 requires it. `CreateKinloomPayload` has no author override, so it looks right — worth confirming against real data |

**2.1 and 2.2 are one test:** create a private kinloom, load `/vault`.
Appears with a Private chip → both fine. Appears with a Home chip → rows lack
`visibility`. Doesn't appear → the endpoint filters private out.

---

## 3. Operational

| # | Item |
|---|---|
| 3.1 | **Beta export before cutover — still unowned.** Clean-database cutover means this is the only irreversible item in the programme. The export that protects beta users must run on the *current* build; `exportDownloadUrl` keys to `familySpaceId`, which ceases to exist |
| 3.2 | Design-thread corrections (one home per person, My Home nav, 3 seats, no Circle UI, prototype-vs-brief sample data) — written, not yet applied to the artifact |
| 3.3 | Social Graph reference v1.1 — corrections drafted, not issued |
| 3.4 | Backend architecture notes — sent, confirmation outstanding |
| 3.5 | Only My Home has been viewed in a browser. Everything else is type-checked and building, not seen |

---

## 4. Open decisions

| # | Decision |
|---|---|
| 4.1 | Nav label: the nav item says **Manage Home**; the page eyebrow and tab say **Manage Family**, matching the design. One of the two has to move |
| 4.2 | Portrait stats row — design shows 3 stats (written / in Home / in Spaces); last two need 1.6 |
| 4.3 | Account menu's My Vault **meta count** — needs a count client-side; omitted |
| 4.4 | Composer keeps 3 internal sub-steps; the design's Write screen is one page |
| 4.5 | Batch import — one publish step for all drafts, or one each? |
| 4.6 | `status: 'published'` (finished writing) collides with publish-means-a-place. Rename one |
| 4.7 | Kinloom detail lives at `/library/[id]`; Library is now the joint Home view, so it wants a neutral route |
| 4.8 | Mobile nav is a drawer; the prototype uses a sticky bottom bar (brief permits either) |
| 4.9 | Record mode still parked (`available: false`) |
| 4.10 | Copy-rules sweep not done — existing screens still say "family space", "share", against the glossary |

---

## 5. Code cleanup

| # | Item |
|---|---|
| 5.1 | `.library-page*` rules orphaned by the Our Library rebuild |
| 5.2 | Eight `.chat-*` groups orphaned by the Legacy Bank re-skin: `chat-msg`, `chat-thread`, `chat-empty`, `chat-suggested`, `chat-input`, `chat-sources`, `chat-source-chip`, `listening-orb` |
| 5.3 | ~~`ScreenStub.tsx`~~ **deleted** — every nav destination is now a real screen. `.stub-page` stays: the `/portrait/me` and `/legacy-bank/me` resolvers use it for their can't-identify-you fallback |
| 5.4 | `.no-api` overlay, its `::after` tooltip and every `data-api-note` — review scaffolding, delete as each API lands |
| 5.4b | **Two** localStorage keys — `kinloom-featured-home-v1` and `kinloom-featured-space-v1` — the Featured stand-ins. Delete `load`/`save` in `FeaturedClient.tsx` when the API lands |
| 5.5 | `public/design-placeholder/` (6 images, 284 KB) — stock photos standing in for featured content. **Must not ship to anyone outside the team**: they read as real Kinloom content |
| 5.6 | Orphaned legacy routes still live but unlinked: `/family`, `/family/feed`, `/family/members`, `/family/tree`, `/legacy-bank` (index), `/legacy-bank/chat` |

---

## 6. Screens still to build

| # | Screen | Route | Blocked? |
|---|---|---|---|
| 6.1 | ~~Manage Family~~ **built** | `/home/manage` | — |
| 6.1b | ~~Featured on Home~~ **built, localStorage only** | `/home/manage/featured` | Selections never leave the browser — see 1.9–1.12 |
| 6.2 | ~~Family Tapestry~~ **built** | `/spaces/tapestry` | Shows the same rows as Our Library until Homes and Spaces are separate records |
| 6.3 | ~~Family Tree~~ **built, structurally empty** | `/spaces/tree` | Renders one root node. Needs Homes + `lineage_edges` before there is a tree to draw |
| 6.4 | ~~Family Legacy Bank~~ **built** | `/spaces/legacy-bank` | Wired to the real agent with no subject member. Whether the backend actually grounds a subject-less conversation across the whole Space is unverified — see 2.4 |
| 6.5 | ~~Manage Family Space~~ **built** | `/spaces/manage` | Lists one Home — itself. Needs Homes joining Spaces |
| 6.5b | ~~Featured on the Tapestry~~ **built, localStorage only** | `/spaces/manage/featured` | Space-scoped twin of Featured on Home |
| 6.6 | Add a home to a Family Space | — | Yes |
| 6.7 | Talk / Import re-skin (chrome only, agent logic untouched) | `/create/talk`, `/create/import` | No |

---

## 7. QA watch-list

Things that are intentional but will look like bugs, plus behaviour that
changed underneath existing features. Walk this list before filing.

### 7a. Deliberate deviations from the design

| # | Deviation | Why |
|---|---|---|
| 7.1 | Count lines read `1–12 of 34`; the design shows `9 of 34` | Pagination was added to Vault and Library, so a range carries more information than a bare count |
| 7.2 | Page sizes differ per screen — My Vault 20, Our Library 12 | Library cards carry images. No shared constant; both are local to their page |
| 7.3 | Our Library keeps type / search / date filters the screenshot doesn't show, and search also matches **author name** | SOW 5.1 specifies "filterable by type and member", and the design's own markup has a filter row behind a display toggle. Removing working filters would have been a regression |
| 7.4 | Portrait stats show *kinlooms* + *born*; the design shows written / in Home / in Spaces | The last two need the publications table (1.6) |
| 7.5 | Legacy Bank has no ListeningOrb or typing dots | The design marks the assistant with a label and an italic "Reading …" line instead |
| 7.6 | Legacy Bank log auto-scrolls to the newest turn | The design gives the log a fixed max-height; without this, new answers arrive below the fold |
| 7.7 | Composer keeps its three internal sub-steps (Prompt → Compose → Tag & save); the design's Write screen is one page | Collapsing them means restructuring media upload, tagging and the save path together — deliberately not bundled into a re-skin. Also 4.4 |
| 7.8 | Mobile nav is a drawer, not a sticky bottom bar | The brief permits either. Also 4.8 |
| 7.8b | Tapestry has **no quotation cards**. The design's mosaic alternates image / quote / audio shapes; without `featured_quote` nothing can be identified as a quote, so the rhythm is flatter than the design |
| 7.8c | Tapestry's home chip shows the **Family Space** name on every card. The design shows which *Home* each piece came from — needs Homes to exist (1.6) |
| 7.8d | Tapestry and Our Library render the **same rows**. There is one container, so "published to the Space" and "published to the Home" are the same set |
| 7.8e | Family Tree renders a **single node** — the one container — with no bands below it and an empty tray. The layout (bands, connectors, cards, tray, two-parent support) is complete and data-driven off one `homes` array; there is one Home to place |
| 7.8f | Tree node counts use the Space's member list and whole library, because one container stands in for both Home and Space |
| 7.8g | Family Legacy Bank's grounding list is grouped by **person**, not by Home. The design lists each Home with its published count |
| 7.8h | Manage Family Space lists **one Home — the container itself**. `Edit lineage` and `Leave this Family Space` are marked, not wired |
| 7.8i | Its seat panel reads `1 home` with an empty bar: SOW 3.1 caps a Space at 20 Homes but nothing exposes the setting |
| 7.8j | Featured §1 offered nothing even when photos existed — it filtered on a resolved thumbnail rather than `has_photo`. **Fixed**; see §8 |
| 7.9 | Featured card kinds are only **Photograph / Voice / Written** — no Film or Quotation | Nothing detects video, and there is no quote field (1.4) |

### 7b. Behaviour that changed under existing features — re-test these

| # | Change | What to exercise |
|---|---|---|
| 7.10 | `MembersClient` list re-skinned. Icon-only Edit/Remove became labelled buttons; **View now goes to `/portrait/{id}`**, not `/family/{id}`. All handlers and modals untouched | Invite, add member, edit member, remove member, revoke invitation — all five, as owner and as non-owner |
| 7.11 | Composer drafts now save `visibility: 'private'`; the create-context default is no longer applied. The publish step sets the audience | Abandon a draft mid-compose and confirm it is private, not family-visible |
| 7.12 | Composer save redirects to `/create/publish?k=…` instead of the kinloom detail | Both the normal save and the "continue without media" path |
| 7.13 | `/legacy-bank/history/[conversation]` renders the same re-skinned thread | Replay an old conversation and check bubbles, sources and markdown |
| 7.14 | **Our Library no longer filters by author** — this is the point of the screen | With two members publishing, confirm both appear. With one member it will still look like My Vault |
| 7.15 | `/family/members` is orphaned from the nav but still live, and now renders the new card styling | Confirm it isn't linked from anywhere user-facing |

### 7c. Known cosmetic defects, fixed by a backend item

| # | Defect | Cleared by |
|---|---|---|
| 7.16 | **Featured preview shows the chosen kinloom's *title* inside quote marks** as the quotation — it reads as if the title is the quote | 1.4 `featured_quote` |
| 7.17 | Seats bar renders empty at 0% — there is no denominator to fill it against | 1.x seat limit (SOW 2.2) |
| 7.18 | Featured section 2 offers every kinloom rather than only those carrying a quotation | 1.4 |
| 7.19 | Home / Family Space names are the same string everywhere — there is one container | 1.6 and the Home entity |

### 7d. Must not reach users

| # | Item |
|---|---|
| 7.20 | The `.no-api` red outlines and hover notes are visible in the running app. Review scaffolding — strip before any user-facing release (5.4) |
| 7.21 | `public/design-placeholder/` stock photography reads as real Kinloom content (5.5) |
| 7.22 | Featured on Home selections are per-browser `localStorage` and silently do nothing for anyone else in the home (5.4b) |

---

## 8. Media URLs — the one gap Phase 3 does not close

**Symptom:** add a photo to a kinloom and it still won't appear as a
thumbnail — in the Featured picker, Our Library, the Tapestry mosaic, or
the Home band strip.

**Cause:** list payloads carry *capability* flags but no media URL. Every
list-shaped schema has `has_photo` / `has_audio` / `has_video` and no
`media`. Only three schemas in the whole Phase 3 API carry media at all:

| Schema | Media? | Used by |
|---|---|---|
| `HomeFeaturedMediaCard` | ✅ `media: MediaItem { url, duration_seconds, expires_at }` | `Home.featured.hero`, `.voice` |
| `KinloomDetail` | ✅ `media: array<MediaItem>` | `GET /kinlooms/{id}` |
| `TapestryLeadCard` | ✅ `media` | Tapestry lead item |
| `KinloomCard` | ❌ | `featured.lately`, Our Library, Tapestry grid |
| **`HomeFeaturedCandidate`** | ❌ | **the Featured picker** |
| `VaultItem` | ❌ | My Vault |

The old MVP list endpoint has the same shape — `LibraryRow.photos` /
`.photo` are optional fields inherited from `Partial<Kinloom>` and are not
populated. Which is why every pre-existing screen used `has_photo` to draw
an *icon*, never an image.

### 8.1 — Backend ask

> `HomeFeaturedCandidate` and `KinloomCard` need a thumbnail: a `media`
> item, or at minimum a media id. Without one, the "What opens the page"
> selector cannot show what you are choosing between, and the Tapestry
> mosaic and Our Library cards render text-only.

**Verified exhaustively** against every schema in the spec: no
`thumbnail`, `cover`, `preview` or `image` field exists anywhere. `media`
appears only on `KinloomDetail`, `HomeFeaturedMediaCard` and
`TapestryLeadCard`; `url` only on `MediaItem` / `MediaUrl`. None of the
list endpoints take an `include`-style parameter.

So the only route to a cover is `GET /kinlooms/{id}` → `media[0].url`:
**one full detail call per card** — 12 a page on Our Library, more on the
Tapestry. `GET /media/{id}/url` does not help, because a card exposes no
media id to pass it.

Lowest-cost fix: a single nullable `thumbnail_url` on `KinloomCard` and
`HomeFeaturedCandidate`. That one field covers Our Library, the Tapestry
grid, `featured.lately` and the Featured picker.

**Precedent worth citing:** `TapestryLeadCard` already carries `media` —
the accommodation was made once for the mosaic's lead item; the same
reasoning applies to every other card in it.

### 8.2 — Where it bites, and what each screen does meanwhile

| Screen | Element | Behaviour until 8.1 |
|---|---|---|
| Featured on Home / Tapestry | §1 *What opens the page* | **Fixed** — now filters on `kind === 'photograph'` (i.e. `has_photo`), not on a resolved URL. Photo kinlooms are selectable; the tile is a plain block |
| Featured | §3 *A voice in the family* | Correct already — filters on `has_audio`, which is in the payload. Empty here means the home genuinely has no recordings |
| Featured | *How Home Will Open* preview | Hero tile is a dashed placeholder; the title still renders. Fills in once a thumbnail exists |
| My Home | hero + voice | **Unaffected** — `featured.hero/.voice` are `HomeFeaturedMediaCard` and do carry `media` |
| My Home | band photo strip | Blocked — `featured.lately` is `KinloomCard` |
| Our Library | card images | Blocked |
| Family Tapestry | mosaic images | Blocked except the lead card (`TapestryLeadCard` has `media`) |
| My Vault | — | No images by design |

### 8.3 — Ordering note

Don't let this hold up wiring. Every affected screen degrades to a
text-only card, which is a layout the designs already account for
(`hasImg` is conditional throughout). Wire the data, then add thumbnails
when 8.1 lands.

