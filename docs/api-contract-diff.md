# API contract diff — MVP → Phase 3 (Federated Containers)

The Phase 3 backend is live on a **different host**:

| | |
|---|---|
| Frontend points at | `https://kinloom-api-laravel-fz0wpjzb.on-forge.com/api` — "Heirloom API", 40 paths |
| Phase 3 backend | `https://kinloom-api-laravel-vycjbweb.on-forge.com` — **"Kinloom API", 65 paths** |

Set in [lib/server/api.ts](../lib/server/api.ts) (`SERVER_API_BASE`) and `.env.example`
(`KINLOOM_API_URL`).

**This is not a base-URL swap.** Of the 15 space-scoped endpoints the
frontend calls, **14 no longer exist**. Kinlooms move from the space to
the person, `visibility` becomes `publications`, and `member_id` becomes
`person_id`. Every screen is affected.

Two structural shifts explain most of it:

1. **Kinlooms belong to people, not spaces.** `/family-spaces/{id}/kinlooms/{id}` → `/kinlooms/{id}`.
2. **The Home is a real record.** Everything "about my household" moves from `/family-spaces/{id}/…` to `/family-homes/{id}/…`; the Space keeps only what federates homes.

---

## 1. Endpoint-level diff

### Gone — replaced

| Old | New | Note |
|---|---|---|
| `GET /family-spaces/{s}/home` | `GET /family-homes/{h}` | Returns the whole My Home screen in one call |
| `GET /family-spaces/{s}/library` | `GET /family-homes/{h}/library` | Now `types[] q from to person sort page per_page` |
| `GET /family-spaces/{s}/manage-members` | `GET /family-homes/{h}/manage` | Adds `seats`/`profiles` as `Meter {used,max}` |
| `GET /family-spaces/{s}/members/{m}/profile` | `GET /people/{member}` | Paginated |
| `GET /family-spaces/{s}/family-overview` | `GET /family-spaces/{s}/tapestry` | `facts` replaces the counts |
| `GET /family-spaces/{s}/family-feed` | `GET /family-spaces/{s}/tapestry` | Same screen, richer |
| `GET /family-spaces/{s}/family-tree` | `GET /family-spaces/{s}/tree` | **Tree of Homes**, not people |
| `GET /family-spaces/{s}/legacy-bank` | `GET /legacy-bank` | No longer space-scoped |
| `POST /family-spaces/{s}/kinlooms` | `POST /kinlooms` | |
| `GET/PATCH/DELETE /family-spaces/{s}/kinlooms/{k}` | `/kinlooms/{k}` | |
| `…/kinlooms/{k}/comments`, `/hold` | `/kinlooms/{k}/comments`, `/hold` | Un-nested |
| `POST /family-spaces/{s}/media*` | `/media`, `/media/upload-url`, `/media/{m}` | Keyed to the author's Vault |
| `GET /family-spaces/{s}/create-context/{slug}` | `GET /create-context/{typeSlug}` | |
| `POST /family-spaces/{s}/exports` | `POST /vault/exports` | Exports your Vault, not a space |
| `POST /family-spaces/{s}/members` | `POST /family-homes/{h}/profiles` | People without accounts |
| `PATCH/DELETE …/members/{m}` | `/family-homes/{h}/members/{m}` | |
| `…/onboarding/first-kinloom` | `POST /kinlooms` | Folded in |
| `/me/settings/notifications`, `/me/settings/privacy` | `PATCH /me/settings` | Merged |

### Survives by path — verify the shape

| Path | Note |
|---|---|
| `POST /family-spaces/{s}/invitations` | Now invites a **Home**, not a person |
| `GET/POST /legacy-bank/conversations` | Un-nested; takes `person` / `space` query params |
| `GET /me`, `GET /kinloom-types`, `POST /invitations/accept` | Shapes still changed — see §3 |

### New — no old counterpart

`/vault` · `/vault/exports` · `/reach` · `/kinlooms/{k}/publications` ·
`/family-homes/{h}` (+ `/featured`, `/featured/candidates`, `/invitations`, `/leave`, `/roles`, `/transfer`) ·
`/family-spaces` (POST) · `/family-spaces/{s}/homes/{h}` (+ `/approve`, `/lineage`) ·
`/family-spaces/{s}/featured` · `/leave` · `/successor` · `/transfer` ·
`/people/{m}` · `/people/{m}/legacy-bank/scope` · `/people/{m}/memorialization` ·
`/legacy/{m}` · `/me/plan` · `/me/legacy-contact` · `/invitations/{token}`

---

## 2. Screen-by-screen element map

**This is the section to walk the UI with.** Every element currently
rendering placeholder or degraded data, and the field that fixes it.

### My Home — `GET /family-homes/{h}` → `Home`

One call replaces the whole page. All nine red-outlined modules resolve here.

| Element on screen | Field |
|---|---|
| Family motto *(red)* | `motto` |
| "since" stat *(red)* | `established_year` |
| Hero film card *(red)* | `featured.hero` → `HomeFeaturedMediaCard.media` |
| Pull quote *(red)* | `featured.quote` → `KinloomQuoteCard` |
| Voice player *(red)* | `featured.voice` → `.media` |
| Where you left off *(red)* | `where_you_left_off: KinloomCard \| null` |
| Band photo strip *(red)* | `featured.lately: array<KinloomCard>` |
| Band media tallies *(red)* | `media_counts: { photos, recorded_voices, films }` |
| "in your home" / "kinlooms here" | `stats: { members, kinlooms_published_here }` |
| Your people strip | `people: array<PersonCard>` |
| Link out to Family Spaces | `spaces: array<SpaceSummary>` |
| — | `featured.is_automatic` drives *"Nothing chosen yet…"* |

### My Vault — `GET /vault`

Query: `audience · status · types[] · q · from · to · page · per_page`

| Element | Field |
|---|---|
| The four audience filters | `?audience=` — **server-side**; drop the client predicate |
| Range line, pagination | `meta: PageMeta` |
| Publication chips per card | `VaultItem.publications: array<PublicationSummary {type,id,name,when}>` |
| "In a Family Space" filter *(inert today)* | now matches — `type` distinguishes home vs space |
| Card date | `created_at`, and `occurred_label` for the human form |
| Drafts | `status` + `?status=` |
| Summary counts | `counts: { by_type, summary }` |

### Publish step — `GET/PUT /kinlooms/{k}/publications`, `GET /reach`

| Element | Field |
|---|---|
| Target rows *(Family Spaces group is empty today)* | `rooms: array<KinloomPublicationRoom {type,id,name,accounts,published_at,read_only}>` |
| Per-row member count | `rooms[].accounts` |
| Live reach line | `GET /reach?targets=` → `{ accounts, by_target }` |
| Commit | `PUT /kinlooms/{k}/publications` — replaces the `visibility` write |

### Composer — `POST /kinlooms`

| Element | Field |
|---|---|
| "When did this happen?" *(unsaved today)* | `occurred_label`, `occurred_year` |
| "Where?" *(unsaved today)* | **`place`** |
| Featured quote | `featured_quote` |
| Publish at save time | `publish: array<PublicationTarget>` — removes the separate PUT |
| Draft/published | `status` |

### Our Library — `GET /family-homes/{h}/library`

Query: `types[] · q · from · to · person · sort · page · per_page`.
Server-side filtering and paging replace the client-side versions.
Rows are `KinloomCard`.

### Family Tapestry — `GET /family-spaces/{s}/tapestry`

Query: `view · types[] · person · home · q · from · to · sort · page · per_page`

| Element | Field |
|---|---|
| Band facts | `facts: TapestryFacts` |
| Mosaic items | `data` |
| Pagination | `meta` |
| **Per-card Home chip** *(shows Space name today)* | the item's home |
| **People view** | `?view=` — server-side |
| Filter by Home | `?home=` |

### Family Tree — `GET /family-spaces/{s}/tree` → `SpaceTree`

| Element | Field |
|---|---|
| Generation bands *(one node today)* | `generations` |
| Connectors | `edges: array<SpaceTreeEdge>` |
| Tray *(empty today)* | `unplaced: array<SpaceTreeHome>` |
| Hide the tree inside a Circle | `has_lineage` |
| `Edit lineage` | `PUT /family-spaces/{s}/homes/{h}/lineage` |
| `Add a Family Home` | `POST /family-spaces/{s}/homes/{h}/approve` |

### Manage Family — `GET /family-homes/{h}/manage`

| Element | Field |
|---|---|
| **Seats bar** *(empty, no denominator)* | `seats: Meter { used, max }` |
| People without accounts | `profiles: Meter` |
| Member rows | `people: array<HomeMember>` |
| Pending invitations | `invitations: array<HomeInvitation>` |
| Owner-only controls | `viewer: HomeManageViewer` |
| Read-only home | `read_only` |

### Manage Family Space — `GET /family-spaces/{s}/manage`

| Element | Field |
|---|---|
| Home rows *(one today)* | `homes: array<SpaceHome>` |
| **Homes meter** *(empty)* | derive from `homes` + the Space's cap |
| Pending homes | `pending: array<SpacePendingHome>` |
| `Leave this Family Space` | `POST /family-spaces/{s}/leave` |
| Succession / transfer | `PUT /successor`, `POST /transfer` |

### Featured on Home / on the Tapestry — **localStorage today**

| Element | Field |
|---|---|
| Candidate cards | `GET /family-homes/{h}/featured/candidates` (Space twin exists) |
| Current selection | `GET …/featured` |
| Save | `PUT …/featured` |
| Revert to automatic | `DELETE …/featured` |
| "Choices are saved in this browser only" *(red)* | **delete it** — and `load`/`save` in `FeaturedClient.tsx` |

### Legacy Bank scope — `GET /people/{m}/legacy-bank/scope`, `/family-spaces/{s}/legacy-bank/scope`

| Element | Field |
|---|---|
| **Breakdown rows** *(rendered as `—`)* | `rows: array<{ kind: home\|spaces\|vault\|space, label, kinlooms }>` |
| Headline total | `kinlooms` |
| **"You can see N of M"** *(red, everywhere)* | derived from `rows` |
| Bank on/off | `enabled` |
| Voice / tense | `voice`, `tense` |

### Legacy Portrait — `GET /people/{m}` and `/legacy/{m}`

Featured quote and viewer-filtered counts both resolve. Memorialization:
`POST/DELETE /people/{m}/memorialization`.

### Legacy Bank chat — `/legacy-bank/conversations?person=&space=`

Un-nested. The `person` / `space` params make space-scoped grounding
explicit, which settles open question **2.4**.

---

## 3. Workarounds this removes

| Current workaround | Why it goes |
|---|---|
| `/portrait/me` and `/legacy-bank/me` resolver routes | `GET /me` returns **`person_id`** and **`home`**. The account menu builds its own links; delete both routes |
| `home.userSummary?.member_id \|\| activeSpace?.member_id` chain — in Vault, Library, Portrait, Bank, scope | Same |
| Client-side author filtering in the Vault | `/vault` is already person-scoped |
| Client-side filter/sort/paginate in Vault, Library, Tapestry | All server-side now |
| `visibility: 'family' \| 'private'` | Replaced by `publications` |
| `orNull` guards *(keep)* | Still wanted — permissions edges don't go away |

---

## 4. Sequencing

The SOW is explicit: *"The API changes in a single release coordinated with
the frontend rebuild, with no period of supporting the old and new models
side by side."* So this is one cutover, not a migration.

Suggested order — each step is independently verifiable:

1. **Types first.** Generate or hand-write the new schemas into `lib/`. They are properly named `$ref` components, unlike the old inferred ones.
2. **`/me` and the shell.** `person_id` + `home` unlock the account menu and delete the resolver routes.
3. **My Home.** One call, biggest visible payoff, clears nine red outlines.
4. **Vault → publish → composer.** The publication spine; clears the most QA items.
5. **Our Library, Tapestry, Tree.**
6. **Manage ×2, Featured ×2.** Featured deletes the localStorage stand-in.
7. **Scope + Portrait + Bank.** Clears the last viewer-filtered-count markers.
8. **Strip the scaffolding** — `.no-api`, `DataNotice` where it no longer applies, `public/design-placeholder/`.

**Before any of it:** confirm whether this host is the intended target or a
staging deploy, and whether the beta export has run. Phase 3 starts on a
clean database — see item 3.1 in [redesign-outstanding.md](redesign-outstanding.md).
