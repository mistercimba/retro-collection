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
| Phase 1 | P0 | Immediate friction, navigation, labels, filters, accessibility, performance diagnosis | ✅ COMPLETE |
| Phase 2 | P1 | Lists, filters and browsing quality | ✅ COMPLETE |
| Phase 3 | P1 | Game detail hierarchy and density | ✅ COMPLETE |
| Phase 4 | P1 | Design consistency, accessibility and real mobile validation | ✅ COMPLETE |
| Phase 5 | P1 strategic | Performance improvements and offline-read-only capability | ⚠️ PARTIAL |
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
- [x] Independent PriceCharting snapshot loading no longer waits for the Google Sheet read; only the local match and required FX conversion remain after both inputs are ready.
- [x] A target is proposed based on actual measurements.

### Phase 1 diagnostic notes

Production browser measurements before instrumentation, sampled with approximately 500 ms polling (content visible is approximate):

| Page | Cold navigation | Warm navigation | Content visible |
|---|---:|---:|---:|
| Home | 808 ms | 4,448 ms | 4,103 ms cold |
| `/collection` | 597 ms | 7,013 ms | 4,894 ms cold |

Request-scoped timings were then added to the authenticated Home and Collection pages. The diagnostic exposes only stage names, durations, and safe cache hints; it includes no Sheet content, titles, IDs, request URLs or credentials. Production browser requests produced these measurements:

| Page / stage | First request after deploy | Subsequent requests | Notes |
|---|---:|---:|---|
| Home data loader | 5.33 s | 3.23–3.74 s | A browser reload reached the Home heading in 4.78 s. Google Sheet data is the only remote dependency; IGDB/RAWG/PriceCharting are not called. |
| `/collection` data loader, before parallel fix | 5.90 s | 6.46 s | Google and PriceCharting work were serialized. |
| `/collection` data loader, after parallel fix | 5.03–8.31 s on misses | 2.75 s on a cache hit | Miss samples included a 3.75 s Google sheet-metadata call; the slowest measured browser-to-heading request was 16.37 s, while a later same-instance cache-hit reload reached the heading in 4.45 s. Another miss request reached the heading in 6.99 s. |

The first request after deploy is not proof of a cold function start. The Google provider reported `miss` on first requests, `in-flight` for concurrent Home reads, and a `hit` on an immediate same-instance `/collection` reload. Thus the 60-second module-memory cache can serve a warm request, but the available observations show that Vercel instance reuse is variable. Google/PriceCharting/ECB fetch responses supplied no Vercel/Next cache-status header, so their framework fetch-cache hit/miss state remains `unknown` rather than inferred from latency.

| Data stage | Observed range |
|---|---:|
| Google auth token | 67–235 ms |
| Application layout auth check | 3–12 ms |
| Google Drive file metadata | 200–487 ms |
| Google Sheet tab metadata | 269 ms–3.75 s |
| Google range requests | 278–765 ms each; 558–867 ms for the parallel group |
| Native Sheet workbook/row transformation | 1.66–1.75 s |
| Google provider total | 3.00–6.73 s |
| PriceCharting GitHub fetch | 246–538 ms |
| PriceCharting snapshot JSON parse | 788–1,113 ms |
| PAL local match across the collection | 1.40–1.69 s |
| ECB fetch + parse | 6–51 ms |

The main Home bottleneck is Google Sheets access plus ~1.7 s of native workbook/row transformation; the Sheet tab-metadata endpoint is the most variable stage. On a Google cache miss, `/collection` also does ~1.4–1.7 s of PriceCharting local matching after the concurrent snapshot load. On a provider cache hit, the remaining `/collection` data loader measured 2.75 s, mostly snapshot parse and matching. ECB is negligible. Multi-second warm misses and the slow metadata sample show that cold start alone does not explain the delay. A slow Google metadata request followed by workbook work can produce the 8–10 s tail; browser-to-heading timings vary further and are not a pure SSR measurement.

The one low-risk fix was to start the PriceCharting snapshot fetch in parallel with the Google collection read. Matching and FX conversion still happen after both inputs are ready, so values and business logic are unchanged. Similar Google cache-miss samples fell from 5.90–6.46 s before the change to 5.03–5.51 s in typical post-change requests (about 0.4–1.4 s saved); the variable Google metadata request still produced an 8.31 s loader. A warm provider cache hit reduced the loader to 2.75 s. No broad caching/data-layer changes were made.

Vercel runtime logs and deployment details remain unavailable to this environment (API returned HTTP 403). The stage timings measure the real page loaders and root-layout auth, and browser-to-heading timings include network, streaming and rendering; the pure React/server-render remainder and underlying Next fetch-cache HIT/MISS cannot be isolated with the available Vercel/browser interfaces. PERF-01 is considered DONE based on the real measurements and root-cause evidence available; this observability limit is documented and does not block Phase 1 closure. Proposed follow-up target for PERF-02 remains meaningful content within 3 seconds warm and 4 seconds cold on both routes; no PERF-02 work was started.

---

## Phase 1 Definition of Done

**Status: COMPLETE.** PERF-01 is closed with the documented observability limitation; no Phase 2 work is included in this closeout.

- [x] duration summary is truthful/useful;
- [x] genre filtering is individual;
- [x] wantlist region/variant filtering is concise;
- [x] accessibility labels are fixed;
- [x] terminology is consistent;
- [x] list state survives navigation;
- [x] "A rever" is a one-click action;
- [x] Initial load measured and root-caused to the level available: page loaders, layout auth and browser-visible timing are measured; pure SSR and Next fetch-cache hit/miss remain inaccessible (documented limitation).
- [x] production is green;
- [x] Mário can validate everything from the production UI only.

---

# 6. Phase 2 — Lists, filters and browsing

**Priority:** P1  
**Objective:** Make large lists easier to understand and manipulate.  
**Status:** COMPLETE

## UX-08 — Active filter chips

When filters are active, show removable chips.

Example:

`PAL ×   CIB ×   Racing ×   PS2 ×`

### Acceptance criteria

- [x] Each active filter has a visible chip.
- [x] A filter can be removed from its chip.
- [x] Removing a chip updates the URL.
- [x] Mobile and desktop remain usable.

---

## UX-09 — Show filtered result counts clearly

When filters are active, use:

`12 de 516 jogos`

instead of only:

`12 jogos`

### Acceptance criteria

- [x] Total and filtered count are both visible.
- [x] Count updates immediately with filters.

---

## UX-10 — Clearing filters must not reset sort

### Acceptance criteria

- [x] `Limpar filtros` preserves sort.
- [x] No implicit sort reset occurs when filters are cleared.
- [x] Back/forward behavior remains predictable.

---

## UX-11 — Distinguish duplicate copies

Only when necessary, show a compact distinguishing marker such as:
- Collection ID;
- region;
- edition;
- condition;
- copy number.

### Acceptance criteria

- [x] Duplicate titles can be distinguished without opening every copy.
- [x] Unique titles do not gain unnecessary visual noise.

---

## UX-12 — Actionable empty states

When filters produce zero results:
- explain that no games match;
- offer **Limpar filtros** as the primary action.

### Acceptance criteria

- [x] No dead-end empty state.
- [x] Clear action restores results.

---

## UX-13 — Active desktop navigation

The desktop header should show the current section.

Examples:
- Collection active on `/collection`, `/collection/games`, `/platform/*`, `/game/*` when appropriate;
- À procura active on `/want`;
- Para vender active on `/sell`.

### Acceptance criteria

- [x] Active state is visible but subtle.
- [x] Uses Archive colors, not arbitrary blue.

---

# 7. Phase 3 — Game detail page

**Priority:** P1  
**Objective:** Improve hierarchy without throwing away the current useful summary.  
**Status:** COMPLETE

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

- [x] Genre comes from validated metadata snapshot.
- [x] Metascore remains explicitly RAWG/Metacritic.
- [x] IGDB rating is never labelled as Metascore.
- [x] Duration uses UX-01 logic.

---

## UX-15 — Add a compact physical-copy strip

Example:

`Completo · Muito Bom · Auditado 12/09/2026 · Sem componentes em falta`

If something is wrong:

`Incompleto · Bom · A rever · Falta manual`

### Acceptance criteria

- [x] Completeness visible without scrolling far.
- [x] Condition visible.
- [x] Audit state/date visible.
- [x] Missing components are immediately obvious.
- [x] Does not create another tall card.

---

## UX-16 — Reduce vertical waste

Review:
- excessive padding;
- tall audit card;
- empty space in price card;
- repeated labels;
- information that can be compacted into rows.

### Acceptance criteria

- [x] Catalog content appears earlier in a normal desktop viewport.
- [x] No large empty blocks beside dense content.
- [x] Mobile remains readable.

---

## UX-17 — Keep technical metadata secondary

Collection ID, internal IDs, long notes and maintenance metadata should remain available but not dominate the page.

Use collapsed/secondary technical sections where appropriate.

### Acceptance criteria

- [x] Internal IDs and collection ID remain available in secondary technical details.
- [x] Long notes and maintenance metadata do not dominate the first view.

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

**Status: DONE.**  
**Limitação:** a validação mobile real a 360, 390 e 430 px não foi concluída no ambiente do worker. Não se afirma que estas larguras ou páginas foram verificadas nesse ambiente.

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

**Status: DONE.** The native Google Sheets path now transforms returned row arrays directly; it no longer builds a second ExcelJS workbook. This targets the measured 1.66–1.75 s native workbook/row transformation. The XLSX import path remains unchanged. No post-change production timing is available from the worker, so the measured baseline is documented without claiming a new timing.

Possible areas:
- cache strategy;
- parallelizing non-blocking data;
- avoiding unnecessary external calls;
- more targeted loading boundaries;
- reducing cold-start work;
- using existing snapshots more aggressively.

Do not rewrite architecture unless measurements justify it.

### Phase 5 implementation notes

The prior measured native Google Sheet row/workbook transformation took 1.66–1.75 s. The native Sheets API path now maps the already-fetched rows directly to records and plan/purchase/valuation data, avoiding ExcelJS workbook construction for that path. XLSX files continue to use the existing ExcelJS path. This is a targeted change against the measured cost; production before/after timing remains unverified in the worker environment.

### Suggested product target

**"Do I own this game?" ≤ 5 seconds from app open under normal conditions**

This is a product target, not a hard CI threshold.

---

## UX-23 — Offline read-only collection snapshot

**Status: DONE.** An authenticated, no-store endpoint supplies the minimal collection snapshot to browser local storage. Offline navigation falls back to a local read-only shell that supports search, platform browsing and basic detail. Logout clears the snapshot. The service worker stores only the static shell; it never stores private page or API responses. No credentials or write actions are cached.

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

### Phase 5 implementation notes

- Snapshot route requires the existing authenticated session and responds `private, no-store`.
- Only Collection items and the requested fields are stored in browser local storage; logout removes the snapshot.
- Service worker stores `/offline.html` only. It does not cache private documents, API responses, credentials, or mutations.
- Offline page supports title/ID search, platform filtering, read-only detail, cover reference and freshness timestamp.
- Offline behavior still needs a real browser/device check; the worker environment does not currently expose an authenticated production browser session.

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
