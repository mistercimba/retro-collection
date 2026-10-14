# Retro Collection — Roadmap

Last updated: 2026-10-14

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

As of 2026-10-14 there are **no open GitHub Issues or PRs**. The latest feature (#52) has shipped. The next proposed scope is the Wishlist buying workflow below; it is **not** an approved implementation or an open Issue yet.

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

PR #61 merged on 2026-10-08 with **152 of 159 original fallbacks covered** and 379 materialized candidates. Seven remaining fallbacks were accounted for by Mole Mania's blocked approved cover and Wishlist removals/splits later completed in #62. The implemented pipeline keeps exact title/platform identity, accept exact LaunchBox alternate names and conservative slash-title equivalents, apply the PAL preference above, and keep genuinely unresolved or one-of identities explicit in the generated audit report.

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
- open cover/owned-copy photos larger for inspection;
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

### NEXT — Wishlist buying workflow

- Good-deal / buying-opportunity queue using the calculated PriceCharting + CeX buy reference.
- Define thresholds from real examples before automatic “good deal” claims.
- Explicit region field only if splitting it from `targetVersion` materially improves matching/filtering.
- Structured minimum completeness/condition only if it integrates with pricing/buying.
- Below-reference-price queue/filter once there is a trustworthy listing input.

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
