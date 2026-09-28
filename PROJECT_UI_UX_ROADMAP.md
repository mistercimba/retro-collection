# Retro Collection — UI/UX Roadmap

**Status:** Active  
**Owner:** Worker / Codex  
**Product reviewer:** Mário  
**Scope:** UI/UX, navigation, accessibility, perceived performance, mobile usability and offline-readiness  
**Out of scope unless explicitly requested:** new data sources, spreadsheet schema changes, barcode features, analytics platforms, major backend rewrites, broad visual redesigns

---

## 1. Purpose

This roadmap turns the two UI/UX reviews of the production app into a concrete implementation plan.

The goal is **not** to redesign Retro Collection from scratch. The current product direction is good and should be preserved. The work here is about removing friction, making navigation more predictable, improving readability and accessibility, and making the app faster to use in real situations such as shops, fairs and collection audits.

The worker should treat this file as the source of truth for UI/UX work unless Mário explicitly changes priorities.

---

## 2. Product principles

### Preserve what already works

Keep:
- the Archive visual identity: dark green, cream/paper and lime accents;
- the editorial-style homepage;
- the current main information architecture: Home → Collection → Platform → Game, plus À procura and Para vender / Vendidos;
- bottom navigation on mobile;
- platform-first browsing;
- local covers;
- conservative data matching;
- compact market links;
- real collection data as the primary product value.

Do **not** turn the product into a generic dashboard.

### Optimize for real use

The app should make these tasks fast:

1. **Do I already own this game?**
2. **What condition/completeness is my copy in?**
3. **What am I looking for?**
4. **What is the maximum I want to pay?**
5. **What is this game worth approximately?**
6. **What do I want to sell?**
7. **Can I return to exactly where I was browsing?**

### Physical copy and game metadata must coexist

Do not force an artificial choice between:
- information about **Mário's physical copy**, and
- information about **the game itself**.

Both matter.

The detail page should expose the most useful summary information immediately while keeping condition/audit information close to the top.

### No fake certainty

Never invent:
- Metascore;
- playtime;
- market prices;
- platform matches;
- missing metadata;
- copy state.

When a source does not provide information, say so clearly.

---

## 3. Working rules for the worker

### Mário's role

Mário is the **production reviewer**, not the deployment operator.

Do not ask Mário to:
- run git commands;
- push branches;
- trigger workflows;
- inspect CI;
- merge PRs;
- manage Vercel;
- edit environment variables unless absolutely necessary.

The worker should handle the full technical workflow and ask Mário only to review behavior in production when needed.

### Implementation workflow

For every phase:

1. inspect the current implementation before changing it;
2. create a focused branch;
3. implement only the current phase;
4. add/update tests where practical;
5. run:
   - lint;
   - tests;
   - build;
   - `git diff --check`;
6. verify no unrelated files changed;
7. deploy to preview when useful;
8. merge to `main` only when the phase is internally green;
9. wait for Production deployment to reach success/READY;
10. report:
    - production SHA;
    - what changed;
    - what was validated;
    - any remaining limitations.

### Scope control

Do **not** combine multiple phases into one large redesign.

Avoid:
- broad visual rewrites;
- adding new product areas;
- speculative abstractions;
- fuzzy matching work unrelated to UI/UX;
- spreadsheet changes;
- new external services unless directly required by the phase.

---

# 4. Roadmap overview

| Phase | Priority | Goal | Status |
|---|---|---|---|
| Phase 1 | P0 | Immediate friction, navigation, labels, filters, accessibility, performance diagnosis | ◐ UX complete; PERF-01 partially diagnosed |
| Phase 2 | P1 | Lists, filters and browsing quality | ☐ Not started |
| Phase 3 | P1 | Game detail hierarchy and density | ☐ Not started |
| Phase 4 | P1 | Design consistency, accessibility and real mobile validation | ☐ Not started |
| Phase 5 | P1 strategic | Performance improvements and offline-read-only capability | ☐ Not started |
| Phase 6 | P2 | Polish and secondary UX improvements | ☐ Not started |

Do not start a later phase while earlier P0 work is incomplete unless there is a concrete blocker.

---

# 5. Phase 1 — Immediate friction and navigation

**Priority:** P0  
**Objective:** Remove issues that make simple tasks slower or misleading.

## UX-01 — Show the best available playtime in the game summary

### Problem

A game can show `Main Story: Não disponível` while another IGDB duration category exists lower on the page, e.g. `Main + Extras: 6 h`.

### Required behavior

The playtime summary card should show the **best available duration** in this order:

1. Main Story;
2. Main + Extras;
3. Completionist;
4. no data.

The card must label the category actually being shown.

Examples:
- `Main Story · 8 h`
- `Main + Extras · 6 h`
- `Completionist · 21 h`
- `Sem dados no IGDB`

### Acceptance criteria

- [x] The card never says "Main Story" when displaying a different category.
- [x] A secondary playtime value is promoted when Main Story is missing.
- [x] Missing data is clearly identified as a source limitation, not a matching error.
- [x] Existing IGDB matching behavior is unchanged.

---

## UX-02 — Genre filters must use individual genres

### Problem

Genre options currently appear as combinations such as `Racing, Sport, Arcade` instead of separate filter values.

### Required behavior

A game with `Racing, Sport, Arcade` must contribute to:
- Racing
- Sport
- Arcade

Filtering by any one of them should include the game.

### Acceptance criteria

- [x] Genre dropdown/chips contain individual genres only.
- [x] No combined genre strings appear as filter options.
- [x] Multi-genre games appear under every relevant genre.
- [x] Works on `/collection/games` and platform pages.
- [x] Existing search/sort behavior remains intact.

---

## UX-03 — Simplify Region / Variant filtering in À procura

### Problem

The current filter creates too many long, detailed variant strings.

### Required behavior

Separate broad filtering concepts from long descriptive variant text.

Preferred structure:

**Region**
- PAL
- NTSC-U
- NTSC-J
- Region free
- Unknown / other

**Variant**
- Standard
- Platinum
- Player's Choice
- Greatest Hits
- Limited
- Collector
- Steelbook
- Other relevant normalized categories

The original detailed requirement/variant text may still be shown inside the row/card.

### Acceptance criteria

- [x] Region filtering is concise.
- [x] Variant filtering uses normalized short labels.
- [x] Long descriptions are not used as dropdown option values.
- [x] Existing ambiguous-target behavior remains unchanged.
- [x] No source PLAN/Sheet data is modified.

---

## UX-04 — Accessible names for search and icon controls

### Required behavior

- every search field has a real `<label>` or `aria-label`;
- icon-only buttons have `aria-label`;
- placeholders remain optional hints, not the accessible name;
- error messages that require action use `role="alert"` or `aria-live`.

### Acceptance criteria

- [x] À procura search has an accessible name.
- [x] Collection search has an accessible name.
- [x] Quick Search has an accessible name.
- [x] Logout/icon-only controls have accessible labels.
- [x] No duplicate or misleading labels are introduced.

---

## UX-05 — Normalize product language

### Canonical user-facing vocabulary

| Internal concept | User-facing label |
|---|---|
| Collection | **Na coleção** |
| Wishlist / PLAN | **À procura** |
| Sell | **Para vender** |
| Sold | **Vendidos** |

`PLAN` remains a technical/source-data term only.

### Acceptance criteria

- [x] No visible `Collection`, `Sell`, `Sold` states remain where a Portuguese user-facing label should exist.
- [x] Navigation uses `Coleção`, `À procura`, `Para vender`.
- [x] Sell page uses `Para vender` and `Vendidos`.
- [x] Internal source terminology is not exposed unnecessarily.

---

## UX-06 — Contextual Back and persistent list state

### Problem

Opening a game from a platform page, filtered list, search, wantlist or sell list can lose:
- platform;
- query;
- filters;
- sort;
- scroll position.

### Required behavior

Persist list state in the URL where practical:
- search query;
- platform;
- genre;
- condition/completeness filters;
- review flag;
- sort;
- other relevant filters.

Game detail should provide:
1. contextual Back behavior;
2. stable breadcrumb/fallback navigation.

Example:

`Coleção / PlayStation 2 / Silent Hill`

### Acceptance criteria

- [x] Opening a game from a platform and going back preserves platform context.
- [x] Filters survive back/forward navigation.
- [x] Sort survives back/forward navigation.
- [x] Search survives back/forward navigation.
- [x] Browser scroll restoration works where supported.
- [x] Directly opening a game URL still provides a predictable route back to Collection.

---

## UX-07 — Make "A rever" actionable

Any Home/platform KPI indicating items requiring review should link to an already-filtered list.

Example:

`/collection/games?review=1`

### Acceptance criteria

- [x] Home → "A rever" reaches the relevant games in one interaction.
- [x] Platform-level review indicators filter within that platform.
- [x] The list clearly indicates that a review filter is active.

---

## PERF-01 — Diagnose the 8–10 second initial load

### Problem

One production review observed skeletons for approximately 8–10 seconds on Home and Collection pages.

Do not optimize blindly.

### Required work

Measure separately:
- cold load;
- warm load;
- Google Sheet fetch;
- local snapshot reads;
- PriceCharting access;
- IGDB/RAWG requests;
- server rendering;
- cache hit/miss behavior.

Determine whether latency is:
- systematic;
- cold-start related;
- external-data related;
- authentication related;
- cache related.

### Deliverable

Report:
- measured timings;
- root cause(s);
- low-risk fixes;
- whether the issue reproduces consistently.

### Acceptance criteria

- [x] No speculative architecture change before measurement.
- [x] At least Home and `/collection` are measured.
- [ ] External API calls are not unnecessarily blocking initial render (GitHub snapshot and ECB FX fetch remain on `/collection`'s server-render path; no refactor was made in this phase).
- [x] A target is proposed based on actual measurements.

### Phase 1 diagnostic notes

Production browser measurements before this phase, sampled with approximately 500 ms polling (content visible is approximate):

| Page | Cold navigation | Warm navigation | Content visible |
|---|---:|---:|---:|
| Home | 808 ms | 4,448 ms | 4,103 ms cold |
| `/collection` | 597 ms | 7,013 ms | 4,894 ms cold |

These do not isolate server-render, provider or external-request time. The warm samples were slower, so cold start alone does not explain the delay. Code-path inspection shows both pages await Google Sheets data; `/collection` additionally awaits the PriceCharting catalog snapshot and ECB FX data. Home does not request PriceCharting, IGDB or RAWG; list genre data comes from the committed IGDB snapshot. IGDB/RAWG are not called for these list routes. The Google Sheets provider has a 60-second in-process cache and coalesces concurrent reads; underlying Google fetches use 60/300-second revalidation, PriceCharting snapshot 3600 seconds and ECB FX 86400 seconds.

Vercel runtime-log access returned HTTP 403 in this environment. Per-stage timings, actual cache hit/miss events, cold-start duration, Google Sheet fetch duration and server-render duration therefore remain unmeasured. These numbers diagnose the visible delay's likely blocking dependencies but do not establish a single confirmed root cause. No speculative performance refactor was made. Proposed follow-up target for PERF-02: meaningful content within 3 seconds warm and 4 seconds cold on both routes, measured with server-side spans available.

---

## Phase 1 Definition of Done

- [x] duration summary is truthful/useful;
- [x] genre filtering is individual;
- [x] wantlist region/variant filtering is concise;
- [x] accessibility labels are fixed;
- [x] terminology is consistent;
- [x] list state survives navigation;
- [x] "A rever" is a one-click action;
- [ ] initial load has been measured and root-caused (browser timings and dependency paths recorded, but Vercel server/cache stage telemetry was inaccessible);
- [ ] production is green;
- [ ] Mário can validate everything from the production UI only.

---

# 6. Phase 2 — Lists, filters and browsing

**Priority:** P1  
**Objective:** Make large lists easier to understand and manipulate.

## UX-08 — Active filter chips

When filters are active, show removable chips.

Example:

`PAL ×   CIB ×   Racing ×   PS2 ×`

### Acceptance criteria

- [ ] Each active filter has a visible chip.
- [ ] A filter can be removed from its chip.
- [ ] Removing a chip updates the URL.
- [ ] Mobile and desktop remain usable.

---

## UX-09 — Show filtered result counts clearly

When filters are active, use:

`12 de 516 jogos`

instead of only:

`12 jogos`

### Acceptance criteria

- [ ] Total and filtered count are both visible.
- [ ] Count updates immediately with filters.

---

## UX-10 — Clearing filters must not reset sort

### Acceptance criteria

- [ ] `Limpar filtros` preserves sort.
- [ ] A separate explicit reset may reset everything if needed.
- [ ] Back/forward behavior remains predictable.

---

## UX-11 — Distinguish duplicate copies

Only when necessary, show a compact distinguishing marker such as:
- Collection ID;
- region;
- edition;
- condition;
- copy number.

### Acceptance criteria

- [ ] Duplicate titles can be distinguished without opening every copy.
- [ ] Unique titles do not gain unnecessary visual noise.

---

## UX-12 — Actionable empty states

When filters produce zero results:
- explain that no games match;
- offer **Limpar filtros** as the primary action.

### Acceptance criteria

- [ ] No dead-end empty state.
- [ ] Clear action restores results.

---

## UX-13 — Active desktop navigation

The desktop header should show the current section.

Examples:
- Collection active on `/collection`, `/collection/games`, `/platform/*`, `/game/*` when appropriate;
- À procura active on `/want`;
- Para vender active on `/sell`.

### Acceptance criteria

- [ ] Active state is visible but subtle.
- [ ] Uses Archive colors, not arbitrary blue.

---

# 7. Phase 3 — Game detail page

**Priority:** P1  
**Objective:** Improve hierarchy without throwing away the current useful summary.

Do **not** fully adopt a physical-copy-only first viewport.

## Target structure

1. Header / identity
2. Compact summary KPIs
3. Compact physical-copy status
4. Price and acquisition
5. Game/catalog information
6. Market actions
7. Technical details

---

## UX-14 — Keep useful top KPIs

Top summary:
- **Valor estimado**
- **Género**
- **Metascore**
- **Duração**

Do not restore `A tua avaliação` until the product has a meaningful personal rating field.

### Acceptance criteria

- [ ] Genre comes from validated metadata snapshot.
- [ ] Metascore remains explicitly RAWG/Metacritic.
- [ ] IGDB rating is never labelled as Metascore.
- [ ] Duration uses UX-01 logic.

---

## UX-15 — Add a compact physical-copy strip

Example:

`Completo · Muito Bom · Auditado 12/09/2026 · Sem componentes em falta`

If something is wrong:

`Incompleto · Bom · A rever · Falta manual`

### Acceptance criteria

- [ ] Completeness visible without scrolling far.
- [ ] Condition visible.
- [ ] Audit state/date visible.
- [ ] Missing components are immediately obvious.
- [ ] Does not create another tall card.

---

## UX-16 — Reduce vertical waste

Review:
- excessive padding;
- tall audit card;
- empty space in price card;
- repeated labels;
- information that can be compacted into rows.

### Acceptance criteria

- [ ] Catalog content appears earlier in a normal desktop viewport.
- [ ] No large empty blocks beside dense content.
- [ ] Mobile remains readable.

---

## UX-17 — Keep technical metadata secondary

Collection ID, internal IDs, long notes and maintenance metadata should remain available but not dominate the page.

Use collapsed/secondary technical sections where appropriate.

---

# 8. Phase 4 — Design consistency, accessibility and mobile

**Priority:** P1  
**Objective:** Close remaining polish gaps and verify real mobile behavior.

## UX-18 — Archive design tokens

Create/reuse central tokens/classes for:
- primary action;
- focus ring;
- active nav;
- selection;
- brand background;
- muted text.

### Acceptance criteria

- [ ] Login uses Archive palette.
- [ ] 404 uses Archive palette.
- [ ] Brand focus states no longer use unexplained blue.
- [ ] Text selection aligns with the design system.
- [ ] Semantic error colors remain semantic.

---

## UX-19 — Login polish and accessibility

Keep login simple.

Add:
- Archive styling;
- show/hide password;
- `autocomplete="current-password"`;
- `role="alert"` / `aria-live` for errors;
- concise private-collection context.

Do not over-design it.

---

## UX-20 — Operational metadata readability

Rule:
- 10 px: truly tertiary metadata only;
- 12 px or more: information needed to make a decision.

---

## UX-21 — Mobile dialog behavior

For mobile filter sheets and modal-like UI:
- focus trap;
- Escape closes where applicable;
- focus returns to trigger after closing;
- correct dialog semantics.

---

## UX-22 — Real mobile QA

Validate at minimum:
- 360 px;
- 390 px;
- 430 px.

Pages:
- Home;
- Collection;
- All games;
- Platform;
- Game detail;
- À procura;
- Para vender / Vendidos.

Check:
- bottom navigation;
- safe area;
- filter drawer;
- long titles;
- truncated metadata;
- market actions;
- hero height;
- horizontal overflow;
- tap targets;
- sticky/fixed UI;
- keyboard focus.

### Acceptance criteria

- [ ] No horizontal overflow.
- [ ] No clipped primary action.
- [ ] Navigation remains usable.
- [ ] Filter drawer works with keyboard/focus.
- [ ] Important metadata remains readable.

---

# 9. Phase 5 — Performance and offline-read-only

**Priority:** P1 strategic  
**Start only after PERF-01 has real measurements.**

## PERF-02 — Apply measured performance fixes

Possible areas:
- cache strategy;
- parallelizing non-blocking data;
- avoiding unnecessary external calls;
- more targeted loading boundaries;
- reducing cold-start work;
- using existing snapshots more aggressively.

Do not rewrite architecture unless measurements justify it.

### Suggested product target

**"Do I own this game?" ≤ 5 seconds from app open under normal conditions**

This is a product target, not a hard CI threshold.

---

## UX-23 — Offline read-only collection snapshot

### Offline MVP

After a successful authenticated session, locally cache a minimal read-only snapshot containing:
- title;
- platform;
- Collection ID;
- region;
- edition;
- completeness;
- condition;
- audit state;
- local cover reference;
- last known market value where already available.

Offline should support:
- collection search;
- platform browsing;
- basic game detail.

### Required UI

Show a discreet freshness indicator:

`Offline · dados de 28/09/2026 10:42`

### Security constraints

Never cache:
- password;
- Google credentials;
- service-account secrets;
- private API secrets.

### Explicit non-goals

Offline mode does **not** need to:
- refresh market prices;
- refresh RAWG;
- refresh IGDB;
- modify the Google Sheet;
- support writes.

---

# 10. Phase 6 — Polish and secondary improvements

**Priority:** P2  
**Only after previous phases are stable.**

## UX-24 — Wantlist shopping mode

Possible work:
- visually emphasize purchase ceiling;
- remove fake arrow affordance if card is not clickable;
- or make card genuinely navigable;
- make possible-copy match action clearer;
- keep priority chips consistent.

---

## UX-25 — Quick Search "view all"

If Quick Search has more than 10 results:

`Ver todos os resultados para "Mario"`

Optional:
- highlight why a result matched;
- local recent searches.

Recent-search history is not required for initial implementation.

---

## UX-26 — Contextual market actions

Possible default priorities:
- Collection: PriceCharting + Vinted
- Para vender: PriceCharting + CeX
- À procura: Vinted + OLX

Only implement if current links genuinely feel noisy.

---

## UX-27 — Loading skeleton refinement

Keep skeletons.

Improve them so each page's skeleton resembles its actual layout rather than using generic tall cards.

This is polish **after** actual loading performance has been addressed.

---

## UX-28 — Error and 404 polish

Errors should:
- use user language;
- offer recovery actions;
- keep technical digest/reference secondary.

Useful actions:
- Tentar novamente
- Voltar ao início
- Voltar à coleção

---

# 11. Explicit non-roadmap items

Do not introduce these as part of this roadmap unless Mário explicitly asks:

- barcode scanning/search;
- Supabase;
- user accounts;
- automatic marketplace scraping;
- major schema migration;
- analytics platform;
- social/sharing features;
- recommendation engine;
- fuzzy game matching;
- manual game metadata overrides;
- visual redesign from scratch;
- automatic buying/selling actions.

---

# 12. Success criteria

| Task | Goal |
|---|---|
| Confirm whether a game is owned | ≤ 5 s online under normal conditions |
| Return to previous filtered list | 0 filters lost |
| Find games requiring review | 1 interaction from Home |
| Identify physical copy state | visible in first viewport or immediately below |
| Find a genre subset | one simple genre filter |
| Find a wantlist target | ceiling/variant understandable with minimal interaction |
| Mobile browsing | no overflow, readable operational metadata |
| Offline lookup | basic collection lookup remains available after offline phase |

No complex analytics stack is required.

Manual repeatable task testing is sufficient for this personal app.

---

# 13. Worker reporting format

At the end of each roadmap phase, report using this format:

```text
Phase:
Production SHA:
Vercel status:

Implemented:
- ...

Validated:
- tests:
- lint:
- build:
- diff-check:
- mobile:
- production smoke:

Not changed:
- Google Sheet
- unrelated features
- data sources

Remaining limitations:
- ...

Ready for Mário to review in production:
- URL/page
- what to look for
```

Do not ask Mário to perform deployment or repository operations.

---

# 14. Current execution order

1. **Phase 1 — Immediate friction and navigation**
2. Production review by Mário
3. **Phase 2 — Lists and filters**
4. Production review by Mário
5. **Phase 3 — Game detail**
6. Production review by Mário
7. **Phase 4 — Design consistency + real mobile QA**
8. Production review by Mário
9. **Phase 5 — Performance/offline**, only with measured justification
10. **Phase 6 — Polish**, selectively

The worker must not treat the presence of later items as permission to implement them early.

---

# 15. Definition of completion

This roadmap is considered complete when:

- navigation preserves user context;
- terminology is consistent;
- filters are fast and understandable;
- genre filtering behaves correctly;
- list state is URL-addressable;
- accessibility basics are covered;
- game detail is compact and useful;
- mobile has been visually validated at real mobile widths;
- loading performance has been measured and improved where justified;
- offline read-only support has been evaluated/implemented based on measured need;
- remaining work is genuinely optional polish rather than core UX friction.

The final product should feel like a tool that disappears during use:

**search → confirm → inspect → go back → continue.**
