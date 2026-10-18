# Retro Collection — Roadmap

Last updated: 2026-10-16

This is the **single source of truth for future work** on Mário's Retro Collection.

Use:
- `README.md` for product overview, setup and runtime architecture;
- `AGENTS.md` for stable engineering/worker rules;
- `PROJECT_STATE.md` for the current production/active-work handoff;
- this file for pending, planned and deliberately deferred work;
- `docs/` for dated audits and historical evidence.

Do not create another roadmap/checklist file. Update this one instead.

## Status legend

- **NOW** — current priority / should be considered next.
- **NEXT** — worthwhile after NOW is stable.
- **LATER** — valid idea, deliberately not a current priority.
- **BLOCKED** — useful but waiting on data/upstream work.

## Current focus

### In-app ratings maintenance (#94)
User approved a no-terminal way to enrich existing HLTB/RAWG values. A page at `/maintenance/ratings`, linked from History, is read-only by default and requires deliberate confirmation before performing real updates. A private backup is created first; requests are run incrementally with 2–3 s pauses and source identification. Revisions abort if the library changes externally. Preview deployments are read-only. No real collection enrichment is performed as part of the release; the owner must opt in.


### NOW — Ratings existentes: script manual protegido (#92; stacked on #91)
Extensão pedida: `scripts/enrich-catalog.ts` com dry-run, backup, pausas 2–3 s por operação externa, consulta só campos em falta, SHA pre/post para evitar sobrescrever mudanças concorrentes, gravação única no Blob privado após revisão. Não executar automaticamente; aprovação explícita dos PRs e execução manual pelo owner. A cache Next expirará em até 5 min após escrita externa.

### NOW — One-time HLTB / RAWG Metacritic ratings (#92; stacked on #91)
PR in progress: query HLTB Main Story and RAWG platform-specific Metacritic on **new** game adds only; persist optional values and source IDs in the private library. Existing games stay untouched (no automatic backfill); do not label the IGDB metadata snapshot as HLTB or Metacritic. Server provider failures must not block adds. PR stacked on #91/#89, requires explicit owner merge approval. External values subject to upstream availability and attribution.


### COMPLETED — Valuations consistent across collection views (#84; PR #85)
Owner approved; PR #85 merged on 2026-10-16 as `0fe5ae48189b2bbfc2fb0373ad4cce39c490d9c6`, Issue #84 closed. The copy-detail, other physical-copy panels, global lists, platform lists and platform totals now use a provenance-aware valuation order (PriceCharting PAL/condition reference, recorded valuation, legacy recorded value, otherwise unavailable). Totals identify partial price coverage. Switch/PS5 and other platform-specific physical completeness rules are respected when selecting Loose/CIB; unknown/mixed contents are not confidently priced. Pre-merge CI and Vercel Preview passed. Authenticated visual QA and final production CI/deployment status are separate verification steps.

### COMPLETED — Owned-copy photo enlargement (#86; PR #87)
Owner approved; PR #87 merged on 2026-10-16 as `cd643d4602ddc3c5833d52667c3ded7edc5a2ecb`, Issue #86 closed. An accessible native photo dialog enlarges existing private owned-copy images with previous/next buttons, arrow keys and Escape. No storage/data migration; the existing private image API remains the sole source. Pre-merge CI and Preview passed; authenticated real-device gallery QA was not performed.

### NOW — Compact copy-first game detail (#90; stacked on #89)
User-approved overhaul of `/game/[collectionId]`: compact cover/metadata, primary copy facts, prices without empty price boxes, unobtrusive single-copy add, and collapsible empty photo/completion panels. Preserves full-edit, photo, provenance and duplicate-copy interactions. PR is stacked on #89 until that physical-audit PR merges; do not merge either without Product Owner approval. Screenshot feedback of Resident Evil 4: Wii Edition (WII-0019) initiated work. Manual Preview UX remains to be confirmed.

### NOW — Editable per-copy physical archive (#88; audit #83)
PR candidate under development/review: edit existing copy-specific audit data with SKU, optional observed EAN, PAL country/market, physical condition and evidence. Keep prior audit records and historical dates; never infer retail PAL identities from IGDB. This is an application feature, not a migration of production Blob data. Do not merge without Product Owner approval.

### NEXT — Further archive polish
After real authenticated testing of the per-copy audit editor, consider structured archive browse/filter affordances and conservative validation of observed retail SKU evidence. No automated edition verification without defensible sources; physical completeness remains managed by the existing component checklist.

### COMPLETED — 18-platform European catalog source audit (#81; PR #82)
PR #82 merged into `main` on 2026-10-15 as `940226a2d8236e519ed406a4eb8bcfe1c954c2b1`. Deterministic source audit, not live authenticated IGDB coverage or proof of a physical PAL SKU.

### COMPLETED — European-only canonical Add (#79; PR #80)

PR #80 merged on 2026-10-15 as `f177e7b03b1141e55633b6536cb0994b052850db`, CI SUCCESS / Vercel production READY. The mapper requires `release_dates.platform === selectedPlatformId` and Europe region 1 for **each game+console**, both in search and server-side identity confirmation. Upstream ordinary searches filter Europe before the result cap. Publisher, generic global release date and a different console's European release do **not** suffice. Worldwide/NA/JP/AU-only records and missing region evidence are excluded. A European game release record is not retail PAL SKU/cover proof. Live authenticated examples remain to be checked when access is available.

### COMPLETED — Contextual Wishlist suggestions (#52)

Issue #52 closed as completed. PR #72 merged into `main` as `9440def0fb2ac7b2bd53f11c8abc0813de60126c` on 2026-10-14; GitHub Actions SUCCESS and Vercel production READY.

User-triggered suggestions in `/want` prioritize gaps in explicit Collection lists and catalog-verified candidates, grouped by console. All candidates must have an IGDB Europe release for their exact platform (`release_region=1`); this confirms a European platform release, **not** a specific physical PAL edition. Suggestions conservatively exclude existing Collection/Wishlist records, including ordered/inactive targets; user-authored list gaps can legitimately request another platform for a title already owned. Users select/ignore candidates and explicitly confirm additions, with fresh Blob/list revalidation and no automatic insertions or priority rewrites. Zero suggestions is a valid result. Broader franchise discovery remains a possible later improvement, not an active task.

### COMPLETED — Actionable Home (#50)

PR #67 merged into `main` at `7f0faa2`; GitHub Actions and Vercel production PASS. Compact Home implemented with one Next Objective, grouped physical-copy tasks, received/ordered states, recent additions, console browsing and exact-identity handling for legacy `NOVO` entries.

The associated mobile/laptop/offline audit (#68) was later closed with the unexecuted real-device verification explicitly waived; do not treat automated checks as proof of visual or network-cut behavior.

### COMPLETED — Wishlist cleanup (#62)

PRs #63–#66 merged. Owner applied and verified 291 Wishlist records, all seven planned operations, Final Fantasy VIII unchanged, six of six persisted notes and history entries, and six distinct European local cover assets. Issue #62 is closed. Do not re-run the one-time cleanup.

### COMPLETED — Manual resolution of ambiguous artwork (#60)

When the artwork pipeline has multiple plausible covers, choose a sensible default but let Mário change it explicitly. Treat this as a collection-wide audit problem, not a per-example fix.

Implementation direction: materialize the known ambiguity set, deduplicate identical image bytes, and use a conservative PAL default order: **Europe** → **United Kingdom** → **Portugal** → **Portugal/Spain or Spain** → other European PAL regions → Australia/Oceania as a later PAL fallback. Expose a chooser only when genuinely different alternatives remain, store any manual choice in private Blob, persist the override on the exact Wishlist target, and allow returning to the automatic default.

Coverage rule: audit every current Wishlist fallback, including non-ambiguous mismatch/unconfirmed cases. A known-bad source remains rejected; when a secondary source has one safe exact European front cover, use it as the automatic fallback instead of leaving the placeholder.

PR #61 merged on 2026-10-08 with **152 of 159 original fallbacks covered** and 379 materialized candidates. Seven remaining fallbacks were accounted for by Mole Mania's blocked approved cover and Wishlist removals/splits later completed in #62. The implemented pipeline preserves exact title/platform identity, accepts exact LaunchBox alternate names and conservative slash-title equivalents, applies the PAL preference above, and keeps genuinely unresolved or one-of identities explicit in the generated audit report.

Runtime rule: candidate source URLs are discovery/provenance only. A dedicated import step materializes candidates into committed files under `public/covers/wishlist-candidates/`; normal CI/build verifies the files and detail pages/chooser never hotlink Libretro/LaunchBox.

Artwork gaps/deliberate fallback (#48) are complete and merged in PR #59.

## Product roadmap

### CLOSED / WAIVED — Real mobile/laptop QA (#68)

Issue #68 was closed on 2026-10-14 with state reason `not_planned`, per explicit Product Owner instruction to skip inaccessible checks rather than block the project. The focused code repairs from PR #69 are already on `main` (`e74c9fa3`): modal keyboard focus trap/restore and step focus, dynamic viewport/safe-area adjustments, mobile filter scroll locking and narrow-screen/offline layout and image fallback fixes. CI and Vercel production passed.

**Not performed / not verified:** authenticated visual and interaction checks at 360/390/430 px and laptop, keyboard/virtual-keyboard on real devices, and actual network cut/reconnect with offline snapshot refresh. The remote desktop was offline and the authenticated browser executor unavailable. Do **not** report E2E/mobile/offline QA as PASS; revisit only for a reproducible bug or new explicit test request with usable access.

### NEXT — Small UI/UX polish

Only change after visual verification:
- reduce overly tall platform rows if they still waste space;
- improve secondary-label legibility where needed;
- open cover artwork larger for inspection (owned-copy photo viewer completed in #87);
- use wide desktop space better on game detail where useful;
- improve contextual back labels while preserving return state;
- make market-reference precision/source/condition/date explicit enough;
- finish Archive consistency on login/404/focus/selection;
- keep operational information readable;
- verify dialog focus trap, Escape and focus return.

### NEXT — Collection browsing improvements

- Selectable right-side field on platform lists: value, paid price, condition, region or purchase date.
- Show Wishlist count on console cards if it remains readable.
- Structured editing of component-level physical condition/audit data.

### COMPLETED — Wishlist buying shortlist (#74; PR #75)

Merged as `02ea5089f6042d70e51d9bd19500b7dd5c2d02a9` on 2026-10-15. A read-only cross-platform buying shortlist at `/want/buying` is entered explicitly from the Wishlist. Compare a user-defined price ceiling to the calculated PriceCharting PAL/CeX reference **only for explicitly requested Loose/CIB**, and group into reference inside ceiling, ceiling below reference, or insufficient data. Show source breakdown/dates and CeX generic ambiguity warnings, filter by console/priority, open exact Wishlist targets and existing manual marketplace searches. Do not include ordered/acquired/inactive/ambiguous targets; no writes or new integrations.

**A reference is not a live listing**. The difference between ceiling and reference is not an observed saving or verified deal. Do not call any target a "good deal" from this calculation.

### COMPLETED — Physical IGDB catalog search and copy extras (#76; PR #77)

Merged as `484dd74f558659208c70a0fb4db66ca1ac00c652` on 2026-10-15. IGDB search now constrains console/platform and game type before the upstream result limit; default search omits PC and requires evidence of a publisher for ordinary searches. Partial multiword matches use conservative, locally verified word-prefix recovery. Known mods/forks are excluded; explicit ID lookup retains its documented escape hatch. Canonical Add and the copy detail support manually verified physical extras in the existing copy-specific `extras` field (e.g., Pokéwalker), without inventing separate PAL catalog records.

**QA limitation:** CI and pre-merge previews succeeded; the live authenticated IGDB result counts, specific retail edition coverage, and real-device interaction have not been independently verified. Some fan games may still have publisher metadata or misleading categories, so the filter is conservative, not an authenticity guarantee.

### NEXT — Evaluate genuine buying opportunities

Follow-up ideas after this first phase:
- Evaluate real listing prices/condition/shipping against the correct reference before any actual opportunity/deal ranking.
- Calibrate thresholds using real examples; do not hardcode discount percentages without evidence.
- Introduce explicit region or minimum physical completeness fields only if those meaningfully improve matching/filtering.
- A genuine below-reference listing queue requires a trustworthy live listing input.

### LATER — Price history and trends

Requires trustworthy stored historical valuations. Potential outcomes: price-change history, 30-day collection value movement and price-history charts. Do not fake trends from one current snapshot.

### LATER — Advanced collection statistics

Only after core collector/buying/audit workflows are strong. Avoid charts merely because data exists.

### LATER — Unified collector hub

Potentially bring Collection, Retro Hunter and physical field/fair hunting into one coherent product while preserving three jobs:
- **Collection** — owned copy state, purchase history, value and Wishlist;
- **Hunter** — online listings and buying decisions;
- **Field / fairs** — shops/fairs/routes, finds and on-the-spot buying reference.

Design information architecture first and prefer a shared identity/pricing layer. Repository consolidation is not automatically product consolidation.

## Blocked / external debt

### BLOCKED — Wishlist reference coverage

See `docs/WISHLIST_REFERENCE_MATCH_AUDIT_2026-10-02.md`.

Remaining source debt:
- GBA CeX coverage depends on the upstream Retro Hunter `GBA Jogos` fix and refreshed catalog;
- PriceCharting PAL snapshot currently lacks PS3/PS5 coverage;
- the former one-of Wishlist targets are now separate entries with choose-one notes, but the app does not enforce mutually exclusive purchases; do not mistake them for six mandatory purchases.

Accuracy beats coverage. Do not guess.

## Optional maintenance

- PR #71 already reduces oversized deployed cover images (measured saving 96.40 MB per build); consider further image optimization only if measurement justifies it, while preserving identity, quality and provenance.
- Metadata/artwork enrichment is not active by default; current unresolved/fallback coverage is accepted unless Mário explicitly reopens it.

## Completed product foundations

Do not reintroduce these as future phases:
- global Collection + Wishlist search and full results;
- Quick Add;
- recently added and Home attention queues;
- paid price vs estimated value;
- structured physical-copy information;
- universal acquisition state (owned / purchased-in-transit / wanted);
- URL-backed filtering and preserved list/scroll context;
- local Collection/Wishlist artwork;
- PriceCharting and CeX-backed references;
- private owned-copy photos;
- multiple independent physical copies;
- forward-only mutation history;
- custom Collection lists/goals;
- offline read-only Collection snapshot (runtime source checks passed; real offline/reconnect E2E not verified);
- opt-in, European-release-verified contextual Wishlist suggestions;
- persistent cross-request library/pricing caching and streamed/deferred initial-load work;
- contextual market actions;
- page-shaped loading skeletons;
- error/404 recovery.

## Product principles / guardrails

- Polish the existing dark-green / cream / lime identity; no redesign from scratch.
- Utility before decoration; no gratuitous UI density.
- No gamification.
- Exact/conservative identity matching beats fuzzy coverage.
- Missing data is better than confidently wrong data.
- Personal-copy data stays copy-specific.
- Do not fabricate history or historical prices.
- Do not add infrastructure merely to replace a working simple architecture.
- Barcode scanning, user accounts, marketplace scraping, social features, recommendation engines, automatic buying/selling, Supabase and major schema migrations are non-roadmap unless Mário explicitly asks.

## Success criteria

| Workflow | Goal |
|---|---|
| Open app / confirm ownership | Fast enough while shopping; target ≤ 5 s normally |
| Return from detail | Search/filter/sort/scroll preserved |
| Find attention items | One interaction from Home |
| Understand owned copy | Key copy state visible immediately |
| Evaluate Wishlist target | Version/condition/reference clear without fake certainty |
| Mobile browsing | No overflow or clipped primary actions |
| Offline lookup | Basic Collection lookup available after authenticated sync |

## Maintenance rule

When work lands, update this roadmap and `PROJECT_STATE.md`. Do not create another checklist/roadmap file for the same work.
