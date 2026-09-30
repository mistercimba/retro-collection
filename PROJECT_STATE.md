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

Current edition-identity correction is being finalized on the existing PR branch.

The 21 existing commits were replayed linearly on `main`:
`7a4d1a9645f94d8c109037c9652e9d0047c3603f`.
No merge commit or cherry-picked handoff commit was introduced. The replay preserved
all application files and all 144 image blob objects; only the inherited handoff docs differ.
Use the live PR head and checks as the current SHA/deployment source of truth.
The PR remains open and must not be merged without explicit user approval.

### PR #28 result so far

Wishlist targets:

- total: 298
- dedicated local artwork: 102
- reused Collection artwork: 0
- fallback/unresolved: 196
- coverage: 34.2%

Sources for all 144 retained files: 121 libretro-thumbnails and 23 LaunchBox.
The generated report contains the source counts for the 102 active mappings.

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

### Edition identity correction

The dedicated identity now includes targetId, canonical platform, normalized title,
region, and the cover-relevant edition variant. Runtime and maintenance scripts
share the existing Wantlist facet normalization, extended with Nintendo Selects.
Loose/CIB condition changes retain identity. Standard, Black Label, Platinum,
Nintendo Selects, Player's Choice, Greatest Hits, Steelbook, Limited, Collector,
and Special Edition remain distinct. Unknown editions fall back.

The authorized read-only production browser session recovered the four permitted
fields for all 298 current targets. The full temporary export is not committed.
The manifest preserves the exact original targetVersion for the same 144 imported
records; no private library dump or full Wishlist export was added.

102 existing assets were visually checked for edition and re-keyed without importing
new covers. 42 existing files remain preserved in manifest.unassignedEntries and
are excluded from the runtime mapping:

- 37 targets do not name an edition (e.g. PAL/CIB or physical European copy);
- 5 files could not be accessed for a confident edition review: Final Fantasy I & II:
  Dawn of Souls (GBA), The Legend of Zelda (NES), Space Station Silicon Valley (N64),
  The Legend of Zelda: Phantom Hourglass (DS), and The Firemen (SNES).

For those five, GitHub Contents returned empty base64 content for files above 1 MB;
GitHub blob/fetch helpers rejected binary data, and a source retrieval returned HTTP 403.
They remain fallback rather than being stamped Standard without a visual check.
All 144 original image SHA-256 values, filenames, bytes and provenance are preserved.

Collection reuse also requires a confirmed coverVariant, independently of the physical
copy edition. Current reused coverage remains zero. Previously rejected sources stay blocked.
Re-key/report-only processing performs no source queries or image imports.

Validation: 123 Vitest tests in 24 files, 6 Python tests, lint with the three existing
warnings, and production build passed. Final remote CI/Vercel status must be checked
on the live correction HEAD before considering merge.

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
| Game Boy | 11 | 6 | 5 | 54.5% |
| Game Boy Color | 10 | 5 | 5 | 50% |
| GameBoy Advance | 17 | 11 | 6 | 64.7% |
| GameCube | 16 | 0 | 16 | 0% |
| NES | 20 | 12 | 8 | 60% |
| Nintendo 3DS | 28 | 13 | 15 | 46.4% |
| Nintendo 64 | 25 | 19 | 6 | 76% |
| Nintendo DS | 23 | 10 | 13 | 43.5% |
| Nintendo Switch | 20 | 0 | 20 | 0% |
| Nintendo Wii | 15 | 0 | 15 | 0% |
| Nintendo Wii U | 15 | 0 | 15 | 0% |
| Playstation | 21 | 7 | 14 | 33.3% |
| Playstation 2 | 27 | 10 | 17 | 37% |
| Playstation 3 | 18 | 0 | 18 | 0% |
| Playstation 5 | 12 | 0 | 12 | 0% |
| SNES | 20 | 9 | 11 | 45% |

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
5. review the edition-identity correction and conservative fallback report;
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

> Work on this GitHub repository: https://github.com/mistercimba/retro-collection
>
> You have direct access to the repository through the GitHub integration/extension available in this ChatGPT conversation. **Use that GitHub integration directly for repository inspection, branches, files, commits, PRs, checks and repository changes. Do not invent alternative access methods, ask me to paste repository files, tell me to run git commands for you, or switch to web scraping/browser GitHub unless the GitHub integration genuinely cannot perform a required operation.**
>
> Before doing anything, use the GitHub integration to read `AGENTS.md` and `PROJECT_STATE.md` from `main`. Treat them as the project handoff and current source of truth.
>
> Then inspect the actual current repository state and any relevant open PR/branch before proposing or making changes. If the docs and current GitHub state disagree, trust the current repository state and report the discrepancy.
>
> Do not merge anything unless I explicitly approve the merge.

That should be enough to start without replaying old chat history.

