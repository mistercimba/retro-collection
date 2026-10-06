# Retro Collection — Roadmap

Last updated: 2026-10-06

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

### NOW — Artwork gaps and deliberate fallback (#48)

Make missing artwork look intentional and keep new catalog-backed additions from regressing into blank/unknown covers.

Implementation direction: preserve the conservative static mappings, use one shared placeholder whenever no safe cover exists, persist canonical artwork for compatible catalog-backed Wishlist mutations, and expose real current coverage in the health endpoint. Accuracy remains more important than forcing 100% coverage; ambiguous region/edition candidates stay unresolved.

The single Next objective (#51) is complete and merged in PR #58.

## Product roadmap

### NEXT — Real mobile/laptop QA

Validate Home, Collection, platform/game detail, Wishlist, Lists, Sell/Sold, search, history, login/error/404, dialogs, forms and filters.

Check 360/390/430 px where practical, laptop layout, overflow, clipped actions, bottom navigation/safe area, long titles, secondary metadata, keyboard/focus and loading/error states.

Also validate the existing offline flow: authenticated snapshot, offline lookup, freshness indicator, network cut/reconnect and snapshot refresh after reconnect.

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
- one-of Wishlist targets remain unresolved until alternatives can be represented safely.

Accuracy beats coverage. Do not guess.

## Optional maintenance

- Evaluate reducing Wishlist image sizes while preserving identity, quality and provenance.
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
- offline read-only Collection snapshot;
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
