# PROJECT_STATE.md — Current handoff

Last updated: 2026-10-06

This is the living project handoff. Read `AGENTS.md` first.

## Current status

Current `main` baseline:

`ef940362b380bbabdc42c8625ca0bd4b3b342b6e`

Most recent merged work:

- PR #53 — canonical IGDB-backed Add flow, standardized copy fields, conservative cover persistence, Wishlist auto-removal and catalog state indicators;
- PR #55 — CI now runs once per PR candidate plus post-merge on `main`, with concurrency cancellation and documented push batching;
- PR #56 — universal acquisition flow with **Já tenho / A caminho / Wishlist**, including receipt verification and reused Wishlist purchase dialog;
- PR #57 — copy-specific **Para completar** queue, loose-friendly cartridge policy, console filters and incompleteness indicators;
- PR #58 — manual **Próximo objetivo** plus transparent suggestions from lists/series/Wishlist priority;
- PR #59 — deliberate shared artwork placeholder, compatible catalog-artwork fallback for new Wishlist targets and real artwork coverage reporting.

Verified before starting the current feature:

- PR #59 GitHub Actions: SUCCESS before merge;
- PR #59 merged as `ef940362b380bbabdc42c8625ca0bd4b3b342b6e`.

## Active product work — manual resolution of ambiguous artwork

Issue #60. Candidate branch: `feat/manual-artwork-choice`.

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

The candidate is being batched into one remote QA push under the CI/Vercel cost discipline.

The repository-first operating workflow is defined in `AGENTS.md`: substantial requests should live in GitHub Issues so a new chat/agent can continue without depending on prior conversation history.

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
- Mobile UI audit remains pending.

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

The current active product work is Issue #60 on `feat/manual-artwork-choice`.
After it lands, return to #50 (Home refocus) and #52 (Wishlist suggestions).
Real mobile/laptop QA remains retained in the roadmap.

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