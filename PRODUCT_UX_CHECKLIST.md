# Retro Collection — Product / UX checklist

Last updated: 2026-10-05

This file tracks the product and UX ideas that came out of the first screenshot/product review of the current app.

It is intentionally separate from `PROJECT_CHECKLIST.md`, which tracks architecture, migration and technical validation work.

## Legend

- [x] Done in production
- [~] Partially done / foundation exists
- [ ] Pending
- [>] Later / deliberately not a current priority

## Core collector workflow

- [x] **Global search across Collection + Wishlist**
  - Search both sources from the persistent app shell.
  - Make the source unmistakable for every result.
  - Show **Collection first, Wishlist second**, with alphabetical ordering inside each group.
  - Keep the typed query persistent while navigating.
  - Full "Ver todos" results use the same grouping.
  - Implemented in PR #32.

- [x] **Quick Add available everywhere**
  - Desktop action after the main navigation.
  - Visually distinct from Collection / Wishlist / Histórico, while staying inside the same design language.
  - Mobile action in the bottom navigation.
  - Fast form first: game, console, completeness, condition and paid price.
  - Optional purchase/copy details hidden under "Mais detalhes".
  - Uses the existing app-owned Blob mutation flow.
  - Implemented in PR #32.

- [ ] **Quick Add title lookup / smarter game selection**
  - Current Quick Add accepts free text.
  - Later improvement: suggest known game metadata while typing, without making the add flow slower or fragile.
  - Do not add fuzzy matching that can silently attach the wrong edition/platform.

## Home / dashboard

- [x] **Recently added**
  - Show recent app-recorded collection additions/purchases.
  - Link each row to the game.
  - Do not fabricate pre-history.
  - Implemented in PR #32.

- [x] **"Para completar" / attention queues**
  - Show games without a usable market value.
  - Show games marked for review.
  - Show games without a recorded purchase price.
  - Each count links directly to the affected games.
  - Filters are URL-backed and removable in the Collection browser.
  - Implemented in PR #33.

- [x] **Wishlist automatic buy reference — PriceCharting + CeX**
  - The old `priceCeilingEur` value is a legacy/manual reference, not a hard maximum and must not drive automatic "buy now" logic.
  - Buying conditions are intentionally limited to **Loose** and **CIB**; New/Sealed is not part of the buying-reference model.
  - For each condition, use the matching PriceCharting PAL value and, when there is one safe explicit CeX variant, the midpoint between CeX cash-buy and CeX sell price.
  - When both sources exist, the current first-pass reference is the arithmetic mean of PriceCharting and the CeX midpoint.
  - If only one trustworthy source exists, show it transparently as a lower-confidence reference rather than inventing a second source.
  - CeX variant matching must fail closed on ambiguity or wrong edition.
  - Web-visible CeX products remain usable as price references even when out of stock; stock availability is not required for this valuation use case.
  - A generic CeX product with no explicit Loose/CIB packaging may be used as a clearly labelled lower-specificity fallback; an ambiguous explicit condition match still fails closed.
  - Initial engine implemented in PR #35; formula remains intentionally transparent and can be tuned after reviewing more real examples.

- [ ] **Good-deal / buying-opportunity queue**
  - Later, use the calculated buy reference — not the legacy manual value — to surface attractive listings or asking prices.
  - Define the "good deal" threshold only after checking real examples against the first-pass formula.

- [>] **30-day collection value movement**
  - Only useful once there is trustworthy historical valuation data.
  - Do not fake a trend from a single current snapshot.

## Platform / collection lists

- [~] **Wishlist reference-match coverage**
  - Comprehensive static identity audit recorded in [docs/WISHLIST_REFERENCE_MATCH_AUDIT_2026-10-02.md](docs/WISHLIST_REFERENCE_MATCH_AUDIT_2026-10-02.md).
  - Shared matcher now covers CeX condition suffixes, Roman/Arabic numerals, joined words, safe source prefixes, shortened titles and verified regional aliases.
  - GBA CeX coverage is blocked only by upstream hunter PR #409 (`GBA Jogos` category alias) until it is merged and the shared catalog refreshes.
  - One-of targets remain deliberately unresolved rather than choosing a game silently.
  - PS3/PS5 PriceCharting coverage is separate source-snapshot debt, not a title-match bug.

- [x] **Better filters for real collector workflows**
  - Global Collection supports platform, completeness, condition, region, edition, genre and attention filters.
  - PR #36 added priority + **Loose/CIB/por definir** + **com/sem referência de compra** to the Wishlist.
  - Wishlist sorting now uses the calculated buy reference and the clearly-labelled legacy manual reference.
  - Filter/sort/search state remains URL-backed and detail navigation preserves the exact working set.
  - PR #36 is merged and production-verified.

- [x] **Show physical-copy summary in the list**
  - Show completeness + condition under the game metadata.
  - Example: `CIB · Excellent`.
  - Implemented in PR #32.

- [ ] **Reduce overly tall platform rows**
  - Original review suggested roughly 15–20% less vertical height while preserving readability and artwork usefulness.
  - Re-check visually before changing; do not compact blindly.

- [ ] **Improve secondary-label legibility where needed**
  - Re-check small grey labels for contrast/size on real laptop/mobile viewports.
  - Only change the labels that are actually hard to read.

- [ ] **Selectable right-side field on platform lists**
  - Potential options: current value, paid price, condition, region, purchase date.
  - Keep the default simple; this should not turn the list into a spreadsheet.

- [ ] **Show Wishlist count on console cards**
  - Example: `42 jogos · 22 wishlist`.
  - Keep current market value visible without overcrowding the card.

## Game detail / personal copy

- [x] **Paid price vs estimated value**
  - Show paid price.
  - Show estimated/current value when available.
  - Show the difference vs paid.
  - Do **not** label the difference as profit unless the item is actually sold.
  - Implemented in PR #32.

- [x] **Structured physical-audit information**
  - Surface existing structured data instead of burying everything in free-text notes.
  - Current fields include functional state, disc/cartridge, label, box, manual, completeness, product code, observed languages, missing components and audit notes.
  - Implemented in PR #32.

- [~] **Overall condition + component-level condition**
  - Overall condition already exists and is displayed.
  - Component audit data is displayed when present.
  - Editing the structured component audit directly in the app is still pending.

- [x] **Personal-copy photos**
  - PR #37 added private per-copy photos for front, back, disc/cartridge, manual/inserts and extras.
  - Photos use the existing private Vercel Blob store; `library.json` keeps only per-copy photo metadata/pathnames.
  - Large images are reduced client-side before upload; server validation accepts JPEG/PNG/WebP/AVIF up to 4 MB and caps each copy at 12 photos.
  - Upload/removal is authenticated and recorded in forward-only history; deleting a collection item also attempts to clean up its photo blobs.
  - Treat these as photos of the owned copy, not generic cover artwork.
  - PR #37 is merged and production-deployed; automated validation deliberately did not mutate the real Blob.

- [ ] **Click cover / photo for larger view**
  - Useful for cover inspection and, later, owned-copy photos.

- [ ] **Use wide desktop space better**
  - Consider an optional second column for collection information / market comparison / copy state.
  - Collapse cleanly on narrower screens.
  - Do not redesign the whole page just to fill empty space.

- [ ] **Contextual back navigation**
  - Prefer labels such as `← Nintendo DS`, `← Resultados da pesquisa`, etc. instead of generic `Voltar` where context is known.
  - Preserve the existing list state and scroll-restoration behavior.

- [ ] **Make market-reference precision explicit**
  - PriceCharting PAL/CIB/etc. is a market reference, not a guaranteed exact value for the specific owned copy.
  - Keep edition/condition/source/date visible enough that the user can understand what is being compared.

## Multiple copies

- [x] **Support more than one owned copy of the same game**
  - PR #38 added a purpose-built detail panel that groups exact title+platform copies, navigates between them and adds another copy without cloning copy-specific data.
  - Collection and Para vender records count as current physical copies; Sold stays historical.
  - PR #38 is merged and production-verified.

- [x] **Copy-level purchase, condition, value and photos**
  - The multi-copy panel surfaces independent paid price, estimated value, physical state and photo count for each copy.
  - Opening a copy keeps all editing and photo operations scoped to that `collectionId`.
  - No aggregate edit propagates from one physical copy to another.
  - PR #38 is merged and production-verified.

## Wishlist buying intelligence

- [~] **Priority**
  - Already supported: Alta / Média / Baixa / Grail.

- [~] **Legacy manual price reference**
  - Existing `priceCeilingEur` data is preserved for compatibility/history.
  - UI should call it **Referência manual**, not "maximum".
  - It does not enter the automatic PriceCharting + CeX calculation.

- [~] **Target version / condition**
  - Current `targetVersion` captures requirements such as PAL / CIB / edition in one field.
  - More structured fields can be considered later if real usage shows the free-form target is insufficient.

- [ ] **Explicit region field for wishlist targets**
  - Only split this from targetVersion if it materially improves filtering/matching.

- [ ] **Minimum acceptable completeness / condition as structured data**
  - Example: CIB, Good+.
  - Must integrate with pricing-condition logic rather than becoming decorative metadata.

- [ ] **Below-target-price filter / queue**
  - High-value buying workflow: quickly see which wanted games are currently at or below the user's ceiling.

## History

- [x] **Meaningful chronological history**
  - Collection add/edit/remove.
  - Wishlist add/edit/remove.
  - Wishlist purchase.
  - Forward-only by design; old history is not fabricated.

- [ ] **Price-change history**
  - Separate future feature.
  - Requires trustworthy stored historical valuations before charts/trends are worthwhile.

## Collection goals / lists

- [~] **Series / set completion goals**
  - Current branch adds user-defined target lists with automatic owned/target progress.
  - Ownership uses exact normalized title + platform against `Collection` records only; Sell/Sold do not inflate completion.
  - Examples such as Professor Layton, Pokémon, Castlevania DS or Zelda are data entered by the user, not hard-coded rules.
  - Keep partial until the Lists / Goals PR is merged and production-verified.

- [~] **Custom collection lists**
  - Current branch adds create/edit/delete list flows and add/remove explicit game targets.
  - The same primitive supports thematic lists such as PAL Nintendo-published, Resident Evil, Final Fantasy or Nintendo Selects.
  - List deletion never mutates Collection/Wishlist data; duplicate title+platform targets are ignored.
  - Keep partial until the Lists / Goals PR is merged and production-verified.

## Future unified collector hub

- [>] **Unify Collection + Retro Hunter + fairs/field hunting into one product**
  - Long-term direction only; do not merge architectures prematurely while the current Collection and Hunter workflows are still evolving.
  - Preserve three distinct jobs even if they eventually share one app:
    - **Collection** — what is owned, copy condition, purchase history, value and wishlist.
    - **Hunter** — what is currently appearing online and whether it is worth buying.
    - **Field / fairs** — physical hunting, recurring fairs/shops/routes, finds and on-the-spot buying reference.
  - Prefer one shared identity/pricing layer for games, variants, PriceCharting and CeX rather than duplicating matching logic across projects.
  - When this is revisited, design the information architecture first; repository consolidation is not automatically the same thing as a good unified product.

## Advanced views / statistics

- [>] **Advanced stats**
  - Interesting later, but lower priority than buying, auditing and collection-maintenance workflows.
  - Avoid adding charts just because data exists.

- [>] **Price-history charts**
  - Same rule: only after historical pricing is genuinely trustworthy and useful.

## Product principles from the original review

- [x] **Polish the existing visual identity instead of redesigning it**
  - Dark green + cream + lime identity stays.
  - Avoid pixel-font / neon retro clichés.

- [x] **Do not overfill the UI**
  - Avoid unnecessary gradients, badges, animations, charts and extra colours.
  - Utility should justify UI density.

- [x] **No gamification**
  - No collector levels, achievements, streaks or artificial engagement loops.
  - Collection goals are useful tracking, not rewards.

- [x] **Real collector utility first**
  - Search while shopping.
  - Add a purchase quickly.
  - Understand the exact copy owned.
  - Compare paid price with a market reference.
  - Know what data still needs attention.
  - Use the Wishlist to support real buying decisions.

## Original implementation priority

This preserves the order proposed in the first product review. Status reflects the current app.

1. [x] Great global search
2. [x] Quick Add
3. [x] Better physical-copy information
4. [x] Recently added
5. [x] Paid price vs current value
6. [x] Wishlist buying reference / priority
7. [x] Better filters
8. [x] Own-copy photos
9. [x] Multiple copies
10. [~] Lists / goals
11. [ ] Price history
12. [>] Advanced stats

## Maintenance rule

Update this file whenever one of these product items materially changes.

When work lands:
- change the checkbox/status;
- add the PR number where useful;
- note meaningful product decisions or intentional deferrals;
- do not mark an item complete merely because infrastructure exists;
- keep technically possible ideas marked pending until the actual user-facing workflow is usable.