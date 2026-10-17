# PROJECT_STATE.md — Current handoff

Last updated: 2026-10-16

This is the living project handoff. Read `AGENTS.md` first.

## Current status — 2026-10-16

**Latest merged `main` commit confirmed:** `cd643d4602ddc3c5833d52667c3ded7edc5a2ecb` (PR #87, 2026-10-16). Owner explicitly approved merging both #85 and #87. Pre-merge checks and Vercel Previews were green; **do not state post-merge production CI/READY without confirming fresh checks**. Neither PR modified private Collection/Wishlist Blob data.

### Completed — unified copy valuation presentation and physical profiles (#84; PR #85)
Owner approved; PR #85 squash-merged on 2026-10-16 as `0fe5ae48189b2bbfc2fb0373ad4cce39c490d9c6` and Issue #84 closed. Provenance-aware values are now selected consistently on game detail, same-title physical-copy panels, global lists, platform lists and platform totals. Priority: compatible PAL PriceCharting per-condition estimate, stored valuation snapshot, legacy value, unavailable. Date/source/condition context is surfaced; partial price coverage is shown on platform totals. Physical-copy profile drives CIB/Loose selection (e.g. Switch/PS5 don't require a manual). Unknown/mixed component states remain unpriced instead of assuming Loose. No private Blob writes, schema change or migration. Authenticated UI, real-device behavior and post-merge production QA have not been verified.

### Completed — private photo enlargement (#86; PR #87)
Owner approved; PR #87 squash-merged on 2026-10-16 as `cd643d4602ddc3c5833d52667c3ded7edc5a2ecb` and Issue #86 closed. Existing owned-copy photographs can be enlarged in a native dialog, navigated with arrow keys and controls, dismissed by Escape/close/click-outside. It uses the existing private photo route and does not change uploads, storage or collection contents. Authenticated visual/gallery QA was not performed. No new image service or schema change.

### Candidate — compact game detail UX (#90)
User authorized a fully compact `/game/[collectionId]` after reviewing screenshots: the current layout wastes space with a huge artwork hero, empty PriceCharting cards, single-copy block, and expanded empty photo / component blocks. Work on `ux/compact-game-detail-90` based on `feat/physical-copy-audit-88` is a separate **stacked PR** with base #89 branch. Changes must be presentation-only, preserve all actions and price provenance, and require Product Owner approval before any merge. Manual Preview against Resident Evil 4: Wii Edition (WII-0019) must be checked.

### Candidate — editable physical-copy audit (#88; related audit #83)
The Product Owner asked the team to continue implementation rather than stop at planning. Issue #88 implements a copy-specific physical audit editor (observed SKU/product code, optional EAN transcription, market/observed languages, component condition, tested functionality and evidence) on `feat/physical-copy-audit-88`. Existing audit data and legacy date formats are retained, the physical-completeness checklist stays separate, and records are not automatically marked Confirmed. Tests cover patches, no-op, field clearing and copy identity isolation. No production Blob mutation before a user saves a form after merge. Pending PR CI/Preview and explicit merge approval. F6 (purchase lot cost allocation) remains a conditional finding, not a confirmed bug.

### Completed — European catalog source audit (#81; PR #82)
PR #82 merged on 2026-10-15 at `940226a2d8236e519ed406a4eb8bcfe1c954c2b1`. Includes legacy regional filtering evidence fallback, nonexhaustive result messaging, regional year reporting and stale selections clearing. Synthetic 18-platform tests do not certify live IGDB coverage or PAL country-specific retail editions.

### Completed — European-only canonical Add (#79; PR #80)

PR #80 merged on 2026-10-15 at `f177e7b03b1141e55633b6536cb0994b052850db`. The shared predicate validates IGDB **Europe region 1 for the specific game and exact platform** at both catalog search and fresh canonical selection, including numeric IGDB IDs. EU records on another platform cannot admit imports on the selected platform. The normal search prefilters EU evidence before the result limit. This is not proof of PAL country edition, physical retail packaging or language, nor confirmation of the completeness of IGDB release metadata.

### Completed — Wishlist buying shortlist (#74; PR #75)

Owner approved merge on 2026-10-15; PR #75 merged at `02ea5089f6042d70e51d9bd19500b7dd5c2d02a9` and Issue #74 closed. `/want/buying` aggregates definitively missing, active, not-ordered Wishlist targets across consoles. Compare existing PriceCharting PAL and CeX buying references against the **same** requested Loose/CIB condition and a valid user-defined ceiling; distinguish within-ceiling, below-reference and incomplete data with source confidence/dates. Provide filters and marketplace search links. No live offers, "good deal" labels, threshold guesses, schema changes, notifications, purchases or private Blob writes. The owner explicitly approved the merge; no authenticated visual QA was performed, and the pre-merge CI/Preview are not a substitute for live user validation.

### Completed — IGDB search quality and physical extras (#76; PR #77)

Owner approved merge on 2026-10-15; PR #77 merged at `484dd74f558659208c70a0fb4db66ca1ac00c652` and Issue #76 closed. The IGDB search previously fetched 30 results before filtering the local platform; it now constrains eligible game types and platforms in the IGDB request, uses a larger upstream limit, and attempts a bounded locally verified partial-title recovery. Broad default catalog search excludes PC and uses publisher metadata as a conservative proxy for legitimate commercial software; explicitly chosen PC remains available, and an exact IGDB ID can bypass missing publisher metadata but not a known mod/fork category. The genuine published retail release/edition list cannot be guaranteed exhaustively by IGDB. Canonical owned-copy Add and copy-detail editing now support copy-specific physical extras, including an owner-confirmed Pokéwalker, without adding a database field or fabricating separate IGDB games. The receive action can accept extras, but the receipt UI was not extended in this PR.

CI and Vercel Preview passed on the feature candidate. **Not verified:** the exact authenticated production results for the reported Pokémon queries or all retail packaging variants. The app's `extras` field records what the owner confirms is present in the physical copy; do not infer package contents or edition from IGDB.

### Completed — contextual Wishlist suggestions (#52)

PR #72 merged on 2026-10-14, with explicit Product Owner approval; Issue #52 closed as completed. From `/want`, user-triggered suggestions prioritize gaps in authored Collection lists and verified IGDB relationships, grouped by console. Every suggested game has a recorded IGDB European release for the **exact** platform; this does not establish the physical edition/cover is PAL. Avoid existing Collection and Wishlist records, including sold/sell and in-transit/inactive states; allow an explicit user-authored list goal for a different console even when the same title is owned. For catalog discovery, apply the conservative global-title exclusion. User selection and confirmation are required. Fresh Blob/list references are revalidated before persisting accepted targets and forward history; no silent changes to existing priorities or schema. A catalog outage/insufficient evidence can legitimately yield zero suggestions.

### Closed with limits — mobile/laptop/offline audit (#68)

PR #69 merged on 2026-10-14 as `e74c9fa3e279c229e8744c421b12227c778b280e`, with production/CI PASS. It fixed Quick Add keyboard focus trap/restoration/step focus, mobile safe-area and dynamic-viewport layout, filter scroll locking and narrow-screen offline layout/image fallback. The six focus-helper tests passed in the validated PR.

At the Product Owner's explicit request, Issue #68 was closed as `not_planned` on 2026-10-14 so inaccessible real-device tests do not block more work. **Not tested:** authenticated 360/390/430 px and laptop visual/interactivity, virtual keyboard, physical offline navigation/network disconnection and reconnect/snapshot refresh. Do not claim these as visually or end-to-end verified. Reassess only on a reproducible bug or a new request with functional access. No private Collection/Wishlist Blob data was modified in this closing audit.

### Other recently completed work

- **#50 / PR #67:** Actionable Home, merged as `7f0faa2`; CI and production passed.
- **#62 / PRs #63–#66:** one-time Wishlist cleanup completed and verified by the owner, 291 resulting targets, seven approved operations, six persisted notes/history entries, six European cover assets. Do not rerun.
- **#70 / PR #71:** deployed cover-storage optimization, merged as `66c968739e8ed4e85a84f3aef3bdcb18693e8270`; previously measured 96.40 MB savings per build. No data or originals in git altered.
- Previous foundations: canonical Add (#53), CI consolidation (#55), acquisition (#56), components (#57), next objective (#58), cover fallback (#59) and artwork chooser (#61).

## Completed product work — manual resolution of ambiguous artwork

Issue #60 completed in merged PR #61 (historical implementation notes follow; branch `feat/manual-artwork-choice` is not active).

Implementation model:

- when known candidates exist, one is selected as the visual default using a conservative PAL preference: general Europe first, then UK, Portugal, Portugal/Spain or Spain, then other European PAL regions, with Australia/Oceania only as a later PAL fallback;
- a target exposes known ambiguous candidates by normalized title + platform, independent of targetId; region/edition are shown as context rather than used to hide the manual chooser;
- a full snapshot audit found **159 Wishlist artwork fallbacks**: 125 ambiguous (64 libretro-source + 61 LaunchBox-source) and 34 other mismatch/unconfirmed cases;
- the candidate registry materializes every current libretro ambiguity, rather than relying on user-reported examples;
- identical source images are deduplicated by Git blob SHA before runtime, so cases like DuckTales 2 (Europe/France/Germany labels pointing at the same image) collapse to one safe default;
- DuckTales 2 is covered by the same registry: its three European labels point to one identical Git blob, so it collapses to a single Europe default;
- Final Fantasy VIII still exposes two genuinely different PAL candidates: Europe/Australia and Spain;
- the Wishlist detail shows **Artwork ambíguo** and links to an explicit chooser only when at least two compatible candidates exist;
- until Mário makes a manual choice, the preferred candidate can be used directly as the displayed default; opening the chooser still exposes all alternatives with provenance;
- choosing a candidate persists an app-owned materialized cover into private Vercel Blob and saves a copy-specific Wishlist override with full provenance;
- each manual artwork selection uses a unique private Blob path, with fresh-read-aware failure cleanup so a failed write cannot overwrite the previous image;
- the persisted manual override has priority over static/reused/catalog artwork;
- removing a manual choice returns to the preferred automatic candidate;
- a manual choice is intentionally authoritative for that exact title/platform target, even if its free-text targetVersion is imperfect;
- removing/receiving/satisfying the Wishlist target also cleans up the private override Blob;
- History records manual artwork set/clear actions;
- candidate discovery is now reproducible via `npm run wishlist-artwork:candidates`; passing the existing LaunchBox index format materializes LaunchBox ambiguities too;
- remaining LaunchBox-only ambiguities and the 34 non-ambiguous gaps are explicitly part of the artwork audit, not something Mário is expected to discover manually.
- the candidate generator now audits every unresolved Wishlist artwork entry, not only `ambiguous-*`; known rejected Libretro sources stay rejected and LaunchBox is allowed to supply a single safe fallback candidate. Metroid NES is the first verified recovery path: the rejected Libretro Classic-Serie image remains blocked while the LaunchBox Europe front cover is used.
- candidate images are no longer hotlinked at runtime. A dedicated import workflow materializes the candidate registry once into committed files under `public/covers/wishlist-candidates/`; normal CI/build only verifies those app-owned files. Remote Libretro/LaunchBox URLs remain provenance/import inputs.
- first persisted candidate import completed on PR #61: 138/138 registry candidates are committed as app-owned image files, including the Metroid NES LaunchBox Europe cover. CI now checks that every registry candidate has a valid local file.
- follow-up audit after that first pass found **94 of the original 159 fallbacks still had zero materialized candidate**. The same import lane now builds a full supported-platform LaunchBox index and retries all of those unresolved targets using exact title/platform plus European front-cover constraints; unresolved results are persisted in `data/wishlist-artwork-candidate-audit.json` instead of being left for Mário to discover manually.
- materialized candidate filenames are now derived from the actual downloaded image bytes and recorded in `src/data/wishlist-artwork-candidate-files.ts`; runtime does not trust a remote filename extension (LaunchBox can label a JPEG payload as `.png`).
- candidate import/manual-choice image size guard is 10 MiB. The previous 3 MiB ceiling rejected valid high-resolution LaunchBox front covers; the guard remains bounded and image signatures are still validated.
- remaining-cover matching stays exact on game/platform identity but accepts exact LaunchBox alternate names even when the alias metadata is World/unlabelled; conservative slash-form titles may resolve only when their exact fragments/reordered form point to one unique LaunchBox game. This is intended to recover naming differences such as Crash Team Racing / CTR without introducing fuzzy guessing.
- user-approved curated Wishlist covers are persisted in `data/wishlist-artwork-curated.json` so future regeneration does not erase them. Curated entries may be disabled while an exact approved source cannot be materialized safely. Mole Mania (Game Boy) keeps the approved Germany/PAL MobyGames provenance but is currently disabled because CI receives HTTP 403 for that exact asset; it must not be silently replaced. Active approved curated cases currently include the PAL fronts for Turtles in Time, Yoshi's Island, Super Mario 3D World, Wendy: Every Witch Way and Valkyria Chronicles. Wendy now uses Retroplace's verified Europe release asset (CGB-BWGP-EUR); Valkyria Chronicles uses a PAL euro/fr physical-cover source from Retrogameshop. Mole Mania remains disabled because the exact approved Germany/PAL MobyGames asset still returns HTTP 403 to CI and must not be silently replaced.

PR #61 has merged; CI, materialization and production deployment were successful.

The repository-first operating workflow is defined in `AGENTS.md`: substantial requests should live in GitHub Issues so a new chat/agent can continue without depending on prior conversation history.

## Completed data maintenance — Wishlist cleanup (#62)

Issue #62 is closed as completed. PRs #63–#66 merged; the owner executed the guarded cleanup on 2026-10-13. The final read-only verification confirms 291 Wishlist entries, all seven operations, six persisted notes and history entries, Final Fantasy VIII unchanged, and six distinct European cover assets. Do not execute the one-time cleanup again.

The maintenance path is deliberately data-driven and conservative:

- `data/wishlist-maintenance-2026-10-08.json` records the exact approved remove / rename / split operations;
- `npm run wishlist:maintain` is dry-run by default and reads a fresh uncached `retro-collection/library.json` from the authorized private Blob environment;
- `--apply` requires an exact SHA-256 fingerprint from a reviewed dry-run and only writes when the whole plan has no blockers;
- an immutable private backup is stored before overwriting `retro-collection/library.json`, with rollback left manual;
- the dry-run lists exact IDs and titles affected; no write is performed by dry-run;
- ordered/in-transit targets block removal/splitting/renaming instead of silently cancelling or duplicating purchases;
- split targets block on Next Objective, manual artwork override, canonical catalog identity and price ceiling. Original nonempty notes are only accepted with a pre-reviewed exact source-note match and explicit per-destination preservation;
- exact duplicate Wishlist destinations and already-owned destinations block the operation;
- manual artwork overrides are guarded against accidental loss; the one-time live action did not delete potentially orphaned manual artwork assets;
- out-of-band Blob writes require a fresh deployment or an in-app mutation afterwards to invalidate any previous Next Data Cache snapshot;
- explicit exact title aliases preserve approved SNES PAL cover candidates after the two title corrections; PR #66 delivered six Europe PEGI post-split covers from committed app-owned assets.

Live cleanup executed by the Product Owner on 2026-10-13 through the guarded production form in PR #65. The owner then verified all seven operations, persisted notes/history, and the six local covers delivered through PR #66. Final Fantasy VIII remained the Next Objective. The old artwork fallback report is historical; do not regenerate live data from repo snapshots or rerun this maintenance plan.

## Current architecture

### Personal data

Source of truth: private Vercel Blob.

Structured library path:

`retro-collection/library.json`

Owned-copy photo bytes, when present:

`retro-collection/copy-photos/<collectionId>/...`

The app owns its mutable data:

- collection
- wishlist
- purchases
- valuations
- collection lists/goals
- history
- owned-copy photo metadata; photo bytes are separate private Blob objects

Google Sheets is legacy/migration context only.

Blob runtime behavior is intentionally strict:

- no silent snapshot reseed;
- missing Blob is an error;
- existing old Blob without history is backward-compatible as `history: []`;
- existing old Blob without collection lists is backward-compatible as `collectionLists: []`;
- existing old Blob without component-needs workflow is backward-compatible as `componentNeeds: []`;
- existing old Blob without Next objective is backward-compatible as `nextObjective: null`;
- normal reads use Next's persistent data cache across requests/deploys; successful writes expire that cache immediately;
- mutation read-modify-write still starts from an uncached Blob read.

### Metadata

Static/local at runtime.

Accepted baseline:

- 454/495
- 91.7%
- 41 unresolved accepted

Do not reopen enrichment work by default.

### Pricing

- PriceCharting: private GitHub snapshot
- FX: ECB USD->EUR runtime conversion
- graceful degradation if price/FX data is unavailable

### Artwork

Collection artwork is local/static at runtime.

Wishlist artwork is now also local/static at runtime after PR #28.

No external artwork fetch is required during normal app browsing.

## Product state

Implemented and in production:

- dashboard/home;
- console browsing;
- Collection/Wishlist tabs per platform;
- live search/filter/sort;
- collection CRUD;
- wishlist CRUD;
- wishlist -> purchased/in-transit -> received/verified -> collection flow;
- purchase/valuation handling;
- visible mutation history;
- submit/pending feedback;
- local Collection artwork;
- local Wishlist artwork;
- local metadata;
- PriceCharting/CeX/reference presentation;
- desktop sidebar + mobile nav.

Recent UI audit fixes in production:

1. returning from a game preserves platform list state and scroll;
2. sidebar/mobile nav follow Collection vs Wishlist tab;
3. Wishlist summary price follows requested condition;
4. max-price sorting behaves sensibly when ceilings are absent;
5. Wishlist price loading is distinct from unavailable price.

## Last visual audit

Audit date: 2026-10-01 (partial, browser-first)

Observed production at that time:

- 18 consoles
- 520 collection games
- 298 wishlist targets

Laptop viewport audited: 1363x936. Dashboard, Collection, Wishlist, platform
lists, both detail types, search/filter/sort, read-only form inspection, loading,
empty/unpriced states, active sidebar and list return/scroll were observed.

The audit found no blocker/data-loss issue.

Mobile narrow/wide and mobile navigation remain **unverified** because the
browser could not change viewport. The offline shell and authenticated snapshot
were observed, including a refreshed capture timestamp after online navigation.
A real network cut/reconnection and installed cache inspection remain pending;
code inspection confirms the SW only caches the offline shell. Do not mark
mobile or offline reconnect as PASS.

## UI audit follow-up — focused implementation

Branch: `fix/ui-audit-followup`, based on main `48a5159…`.

Implemented in this branch (production status follows the live PR/merge):

- UX-01: distinct accessible names for local search, filter and sort, adapted to
  Collection/Wishlist;
- UX-02: quick search preserves pathname and query string and uses existing
  scroll saving only on lists supporting restoration;
- UX-03: Wishlist Previous/Next shares query/filter/sort selection with the
  origin platform Wishlist list; validated fallback remains platform title order;
- UX-04: platform and overall aggregates are null when no values are known;
  mixed values sum known amounts, and a real zero remains zero;
- singular/plural game counts in the related dashboard/Collection/Wishlist/platform views.

No redesign, artwork/metadata/price enrichment or offline/reconnect changes.
Regression tests cover context/safe origins, Wishlist filtering and all supported
sort modes, and null/mixed/zero aggregate semantics. Browser verification and
quality/remote check results must be read from the final PR status, not inferred
from this implementation note.

## Completed — PR #28 Wishlist local artwork

PR:

`#28 — Add local wishlist artwork with edition requirements`

Merged with squash into `main`.

Final PR HEAD before merge:

`81f4f56710049a509c6bb87e99e04a2394d19436`

Squash merge commit:

`a4ed66a5fcaf5e29bc2f7ec5483d536d707bc48c`

Final verification:

- PR merged/closed;
- GitHub Actions: SUCCESS;
- Vercel production: SUCCESS.

### Final Wishlist artwork result

Wishlist targets:

- total: 298
- dedicated local artwork: 139
- reused Collection artwork: 0
- fallback/unresolved: 159
- coverage: 46.6%

All 144 imported image files remain in the repository:

- 139 active mappings;
- 5 retained-but-unassigned assets;
- no runtime external artwork requests;
- no new artwork was imported during the edition-identity correction.

Sources for the 144 retained files:

- libretro-thumbnails: 121
- LaunchBox: 23

Accuracy is intentionally prioritized over coverage.

### Edition requirement semantics

Wishlist artwork identity includes:

- targetId
- canonical platform
- normalized title
- region
- artwork edition requirement

Artwork edition requirement has three states:

1. **Explicit known edition**  
   Standard/original, Platinum, Nintendo Selects, Player's Choice, Greatest Hits,
   Black Label, Steelbook, Limited, Collector and Special Edition stay distinct.

2. **Any**  
   No edition requirement. Examples such as `PAL; CIB`, `PAL; loose`,
   `Físico europeu; completo` may use an already validated
   title/platform/region cover without claiming that the asset is Standard.

3. **Unknown**  
   An explicit but unrecognized named edition remains fallback rather than guessed.

Important behavior:

- Loose/CIB changes do not invalidate artwork when edition requirement is unchanged.
- Any -> Standard/Platinum/etc. changes identity.
- Standard -> Platinum/etc. changes identity.
- Any does **not** relabel an asset as Standard.
- Collection reuse follows the same safety rules and currently contributes 0 active mappings.
- rejected source assets remain blocked.

### Five retained assets intentionally not active

These explicitly request original/Standard and remain fallback because source edition review was not confident:

- The Legend of Zelda — NES
- The Firemen — SNES
- Space Station Silicon Valley — N64
- Final Fantasy I & II: Dawn of Souls — GBA
- The Legend of Zelda: Phantom Hourglass — DS

Do not weaken these matches just to raise coverage.

### Validation for PR #28

Final branch validation before merge:

- lint: PASS, with 3 existing warnings
- Vitest: 148 tests PASS
- Python tests: 6 PASS
- build: PASS
- GitHub Actions: SUCCESS
- Vercel preview: SUCCESS
- post-merge GitHub Actions: SUCCESS
- post-merge Vercel production: SUCCESS

## Wishlist artwork coverage by platform

| Platform | Total | Dedicated | Fallback | Coverage |
|---|---:|---:|---:|---:|
| Game Boy | 11 | 6 | 5 | 54.5% |
| Game Boy Color | 10 | 5 | 5 | 50% |
| GameBoy Advance | 17 | 11 | 6 | 64.7% |
| GameCube | 16 | 7 | 9 | 43.8% |
| NES | 20 | 12 | 8 | 60% |
| Nintendo 3DS | 28 | 13 | 15 | 46.4% |
| Nintendo 64 | 25 | 19 | 6 | 76% |
| Nintendo DS | 23 | 10 | 13 | 43.5% |
| Nintendo Switch | 20 | 3 | 17 | 15% |
| Nintendo Wii | 15 | 6 | 9 | 40% |
| Nintendo Wii U | 15 | 6 | 9 | 40% |
| Playstation | 21 | 7 | 14 | 33.3% |
| Playstation 2 | 27 | 17 | 10 | 63% |
| Playstation 3 | 18 | 5 | 13 | 27.8% |
| Playstation 5 | 12 | 3 | 9 | 25% |
| SNES | 20 | 9 | 11 | 45% |

## Documentation reconciliation

README and PROJECT_CHECKLIST now describe the app-owned private Blob library,
existing CRUD/purchases/valuations/history, static metadata/artwork, and the
GitHub PriceCharting snapshot with ECB FX. Completed PRs #26–#28 are no longer
future phases. Metadata and artwork enrichment are not an active roadmap.

`.env.example` contains the runtime setup only: Blob SDK credential,
APP_PASSWORD and optional PriceCharting settings. Google/IGDB/RAWG and
DATA_PROVIDER are limited to legacy/maintenance documentation. Runtime usages
were checked against the code and installed @vercel/blob 2.6.1 credential handling.
APP_PASSWORD is required operationally for a private deploy, but auth.ts currently
disables the gate if it is absent; documentation must not claim fail-closed behavior.

PR #29 (`docs/reconcile-current-architecture`) was merged with squash into main
as `48a5159c908173740d56f2641ea315217acfbf94`. It only changed documentation and
`.env.example`; no runtime logic changed.

## Known semantic debt

Legacy PLAN tabs explicitly documented:

`PLAN = prioridade pessoal, não wishlist.`

The migration used PLAN targets to seed the current Wishlist.

Do not silently remove/reclassify the 298 records based on that historical wording. If the user revisits Wishlist semantics, discuss the distinction first.

## Known technical caveats

- Blob updates are simple read-modify-write without optimistic concurrency/ETag. Acceptable for current single-user usage unless real races appear.
- Wishlist artwork coverage is incomplete by design; fallback is acceptable.
- Real-device authenticated mobile/laptop and network-cut offline E2E checks were waived when Issue #68 closed; they remain **unverified**, not passing.

## Completed migration milestones

### PR #26

Merged app-owned-library migration.

Key outcomes:

- Blob-only runtime library;
- no automatic stale snapshot fallback;
- app CRUD;
- purchase movement;
- mutation history;
- pending button feedback.

### PR #27

Merged priority UI audit fixes.

Application baseline after that PR:

`4456312a2f8ff3522d4c74feb118895404fd453c`

### PR #28

Merged local Wishlist artwork with edition-aware identity.

Production commit:

`a4ed66a5fcaf5e29bc2f7ec5483d536d707bc48c`

## Planning / next work

All pending, planned, blocked and deliberately deferred work is maintained in
[ROADMAP.md](ROADMAP.md). Do not duplicate the roadmap in this handoff.

Issues #50, #52, #60, #62, #68, #70, #74, #76 and #79 are closed. Issue #81 is the active European catalog audit; code changes remain unmerged pending new Product Owner approval. Wishlist buying shortlist (#75), search quality (#77) and Europe validation (#80) are merged. Real-device/authenticated browser checks remain unverified as in #68 and must not be reported PASS.

## Handoff prompt for a brand-new chat

A minimal new-chat prompt can be:

> Work on this GitHub repository: https://github.com/mistercimba/retro-collection
>
> You have direct access to the repository through the GitHub integration/extension available in this ChatGPT conversation. **Use that GitHub integration directly for repository inspection, branches, files, commits, PRs, checks and repository changes. Do not invent alternative access methods, ask me to paste repository files, tell me to run git commands for you, or switch to web scraping/browser GitHub unless the GitHub integration genuinely cannot perform a required operation.**
>
> Before doing anything, use the GitHub integration to read `AGENTS.md` and `PROJECT_STATE.md` from `main`. Read `ROADMAP.md` when the task involves choosing or planning future work. Treat them as the project handoff and current sources of truth.
>
> Then inspect the actual current repository state and any relevant open PR/branch before proposing or making changes. If the docs and current GitHub state disagree, trust the current repository state and report the discrepancy.
>
> Do not merge anything unless I explicitly approve the merge.

That should be enough to start without replaying old chat history.

## Completed storage optimization — Issue #70

Owner-authorized 2026-10-14. PR #71 merged with explicit owner approval as `66c968739e8ed4e85a84f3aef3bdcb18693e8270`. Branch `ops/cover-deployment-storage`. The prebuild pass bounds large JPEG/PNG covers to 1600 pixels, keeps local paths/formats/alpha and only writes smaller results. Originals remain in git; optimized bytes are build workspace outputs, not committed replacements. Measured 43 images: 568.21 MB to 471.81 MB, saving 96.40 MB per build. All 368 candidate files are referenced; no candidate removal is justified from static snapshots. Local lint (five existing warnings), 285 Vitest tests, cover storage test, candidate integrity and Next build passed. Node 24 in local environment; project CI remains Node 22. No Blob data mutation. Owner merge approval received and applied; the later `main` production deployment was confirmed READY.

Preview cleanup remains manual after merge: preserve production, rollback versions and latest previews of open PRs; remove only superseded/merged previews after checking aliases. No broad age-based automatic deletion was enabled.
