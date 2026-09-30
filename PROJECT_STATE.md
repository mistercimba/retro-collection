# PROJECT_STATE.md — Current handoff

Last updated: 2026-09-30

This is the living project handoff. Read `AGENTS.md` first.

## Current production baseline

Repository: `mistercimba/retro-collection`

Application-code baseline currently on `main` before this documentation-only handoff:

`4456312a2f8ff3522d4c74feb118895404fd453c`

That commit is:

`fix: address priority ui audit issues`

At last verification:

- GitHub Actions: SUCCESS
- Vercel production: SUCCESS

A documentation commit may place `main` after the SHA above without changing application behavior.

## Current architecture

### Personal data

Source of truth: private Vercel Blob

Path:

`retro-collection/library.json`

The app owns its mutable data:

- collection
- wishlist
- purchases
- valuations
- history

Google Sheets is legacy/migration context only.

Blob runtime behavior is intentionally strict:

- no silent snapshot reseed;
- missing Blob is an error;
- existing old Blob without history is backward-compatible as `history: []`.

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

Collection artwork is local/static.

Wishlist artwork has an active PR described below.

## Product state

Implemented and in production:

- dashboard/home;
- console browsing;
- Collection/Wishlist tabs per platform;
- live search/filter/sort;
- collection CRUD;
- wishlist CRUD;
- wishlist -> purchased -> collection flow;
- purchase/valuation handling;
- visible mutation history;
- submit/pending feedback;
- local Collection artwork;
- local metadata;
- PriceCharting/CeX/reference presentation;
- desktop sidebar + mobile nav.

Recent UI audit fixes now in production:

1. returning from a game preserves platform list state and scroll;
2. sidebar/mobile nav follow Collection vs Wishlist tab;
3. Wishlist summary price follows requested condition;
4. max-price sorting behaves sensibly when ceilings are absent;
5. Wishlist price loading is distinct from unavailable price.

## Last visual audit

Audit date: 2026-09-30

Observed production at that time:

- 18 consoles
- 520 collection games
- 298 wishlist targets

Desktop browser viewport available to the worker was 1363x936.

The audit found no blocker/data-loss issue.

Mobile and laptop layouts were **not fully audited** because the worker could not change viewport.

Do not claim mobile UX is fully verified.

## Active work — PR #28

PR:

`#28 — Add local artwork for wishlist games`

Branch:

`feature/wishlist-local-artwork`

Current PR head at last verification:

`81a7dc4eb923e552035daeb4ac5c46948e30c872`

State at last verification:

- open
- not draft
- mergeable
- GitHub Actions: SUCCESS
- Vercel: SUCCESS
- **NOT MERGED**

### PR #28 result so far

Wishlist targets:

- total: 298
- dedicated local artwork: 144
- reused Collection artwork: 0
- fallback/unresolved: 154
- coverage: 48.3%

Sources:

- libretro-thumbnails: 121
- LaunchBox: 23

Assets:

- 144 local cover files
- approximately 66.7 MB total
- average approximately 463 KB
- largest approximately 2.54 MB

Runtime external artwork requests:

- 0

The worker visually reviewed the retained dedicated assets and explicitly rejected several source images whose labels were wrong or whose edition/title variant was unsafe.

Examples of rejected problems included:

- Persona 3 FES Europe-labelled asset showing US ESRB artwork;
- Metal Gear Solid GBC and Resident Evil Gaiden GBC region mismatches;
- Trauma Center DS region mismatch;
- New Super Mario Bros. 2 3DS region mismatch;
- Kirby: Triple Deluxe Nintendo Selects vs requested original uncertainty;
- Wii U region/title-variant mismatches;
- NES Turtles II regional variant mismatch.

These rejections are intentionally conservative.

### Current review concern on PR #28

**Do not merge PR #28 blindly.**

The last human/agent review identified a design concern in dedicated artwork identity.

Current dedicated identity effectively distinguishes:

- targetId
- platform
- title
- region

All 144 legacy imported targets currently use `targetId = "NOVO"`.

The current manifest's imported targetVersion values are effectively only regional values such as:

- `Europe`
- `PAL Europe`

This can lose cover-relevant edition intent.

Example risk:

- Standard/original
- Platinum
- Nintendo Selects
- Player's Choice
- Greatest Hits
- Black Label
- Steelbook
- Limited/Special edition

can share title/platform/region but require different packaging artwork.

The app already has variant normalization concepts in:

`src/lib/wantlist-facets.logic.ts`

Before merging PR #28, decide one of these explicitly:

1. **fix the identity/manifest to include cover-relevant edition variant**, preserving the original full targetVersion; or
2. consciously accept the current limitation and merge as-is.

Preferred technical direction from the last review:

- keep region separate;
- normalize cover-relevant edition variant;
- do **not** treat Loose vs CIB as different cover artwork when edition is otherwise the same;
- if edition changes and no matching artwork exists, fallback rather than showing old edition artwork;
- re-key existing 144 assets without redownloading when safely possible.

The previous worker became unreliable during this final follow-up. A fresh chat/worker should pick up from this state rather than trusting uncommitted work from that session.

## PR #28 files/data worth reading first

- `data/wishlist-artwork-manifest.json`
- `data/wishlist-artwork-missing.json`
- `data/wishlist-artwork-rejections.json`
- `data/wishlist-artwork-report.json`
- `data/wishlist-artwork-validation.json`
- `src/data/wishlist-artwork.ts`
- `src/lib/wishlist-artwork.ts`
- `src/lib/wishlist-artwork.logic.ts`
- `scripts/import-wishlist-artwork.mjs`
- `scripts/wishlist-artwork-matcher.mjs`

## Wishlist artwork coverage by platform in PR #28

Last generated report:

| Platform | Total | Dedicated | Fallback | Coverage |
|---|---:|---:|---:|---:|
| GameBoy Advance | 17 | 12 | 5 | 70.6% |
| Game Boy Color | 10 | 5 | 5 | 50.0% |
| Game Boy | 11 | 6 | 5 | 54.5% |
| GameCube | 16 | 7 | 9 | 43.8% |
| NES | 20 | 13 | 7 | 65.0% |
| Nintendo 3DS | 28 | 13 | 15 | 46.4% |
| Nintendo 64 | 25 | 20 | 5 | 80.0% |
| Nintendo DS | 23 | 11 | 12 | 47.8% |
| Nintendo Switch | 20 | 3 | 17 | 15.0% |
| Nintendo Wii U | 15 | 6 | 9 | 40.0% |
| Nintendo Wii | 15 | 6 | 9 | 40.0% |
| Playstation 2 | 27 | 17 | 10 | 63.0% |
| Playstation 3 | 18 | 5 | 13 | 27.8% |
| Playstation 5 | 12 | 3 | 9 | 25.0% |
| Playstation | 21 | 7 | 14 | 33.3% |
| SNES | 20 | 10 | 10 | 50.0% |

Accuracy is intentionally prioritized over coverage.

## Known documentation debt

The current README and PROJECT_CHECKLIST contain old statements such as:

- Google Sheet is the source of truth;
- app is read-only;
- old provider/deploy architecture.

Those statements are historical and no longer authoritative.

Do not "fix" application architecture to match those documents.

A later documentation-only cleanup can reconcile them after active Wishlist artwork work is resolved.

## Known semantic debt

Legacy PLAN tabs explicitly documented:

`PLAN = prioridade pessoal, não wishlist.`

The migration used PLAN targets to seed the current Wishlist.

Do not silently remove/reclassify the 298 records based on that historical wording. If the user revisits Wishlist semantics, discuss the distinction first.

## Known technical caveats

- Blob updates are simple read-modify-write without optimistic concurrency/ETag. Acceptable for current single-user usage unless real races appear.
- Wishlist local artwork coverage is incomplete by design; fallback is acceptable.
- Collection reuse for Wishlist artwork should require safe title/platform/region/variant compatibility.
- README is stale.
- Mobile UI audit remains pending.

## Completed migration milestones

The large app-owned-library migration was merged.

Notable completed outcomes:

- Blob-only runtime library;
- no automatic stale snapshot fallback;
- app CRUD;
- purchase movement;
- history;
- navigation fixes;
- pending button feedback;
- local Wishlist artwork resolver groundwork;
- UI-audit priority fixes.

Historical migration PR:

- PR #26 — merged

Priority UI audit fixes:

- PR #27 — merged
- resulting application commit on main: `4456312a2f8ff3522d4c74feb118895404fd453c`

## Next recommended action

For a fresh worker/chat:

1. read `AGENTS.md`;
2. read this file;
3. inspect PR #28 and its current head;
4. verify the PR has not changed since this handoff;
5. resolve or consciously accept the cover-edition identity concern;
6. run lint/test/build;
7. verify GitHub Actions + Vercel;
8. review the final diff;
9. do **not** merge without explicit user approval.

After PR #28 is resolved, good next candidates are:

- finish a real mobile/laptop UI audit;
- reconcile stale README/PROJECT_CHECKLIST;
- optional image-size optimization for Wishlist covers, as a separate task;
- only then add new product features.

## Handoff prompt for a brand-new chat

A minimal new-chat prompt can be:

> Work on `mistercimba/retro-collection`. Before doing anything, read `AGENTS.md` and `PROJECT_STATE.md` from `main`. Treat them as the project handoff/current source of truth. Then inspect the relevant current code/PR before making changes. Do not merge anything unless I explicitly approve it.

That should be enough to start without replaying old chat history.
