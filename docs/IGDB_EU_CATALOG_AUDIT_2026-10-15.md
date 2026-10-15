# IGDB European catalog — cross-platform source audit (2026-10-15)

**Issue:** #81 · **Baseline:** `main` `f177e7b03b1141e55633b6536cb0994b052850db` (PR #80).
**Scope:** canonical Quick Add search, exact-IGDB-ID selection and server-side re-resolution.
**Nature of this audit:** **source/static regression audit**, not a completed live IGDB dataset or authenticated visual audit.

## Verified baseline behavior

- A single platform-independent predicate requires `release_dates.platform` to equal the **selected** IGDB platform ID and `release_dates.release_region` (or deprecated `region`) to equal **1 = Europe**.
- Mapping is reused by text search and fresh ID resolution; the same rule also underpins Wishlist suggestions.
- Current search also excludes some game categories (mods/forks/DLC) and requires a recorded publisher for ordinary text search. These signals do **not** prove official licensing, a physical PAL pressing, specific country artwork, language or edition.
- A broad catalog search excludes PC by default; PC is an **explicit** supported option, so the audit matrix includes it.
- Tests use **synthetic release-date fixtures** to verify behavior in every supported platform, **not** downloaded live IGDB records.

## Supported-platform matrix

The regression test iterates the actual `CATALOG_PLATFORMS` registry rather than hardcoding a separate list. The 18 supported identities at this checkpoint:

| Family | Platform IDs (IGDB) |
| --- | --- |
| Nintendo home consoles | NES 18, SNES 19, Nintendo 64 4, GameCube 21, Wii 5, Wii U 41, Switch 130 |
| Nintendo handhelds | Game Boy 33, Game Boy Color 22, Game Boy Advance 24, Nintendo DS 20, Nintendo 3DS 37 |
| PlayStation | PlayStation 7, PlayStation 2 8, PlayStation 3 9, PlayStation 5 167, PSP 38 |
| Explicit PC option | PC 6 |

Each platform runs the same scenarios:
1. Its own platform + Europe 1: **eligible**.
2. Its own platform + North America 2, Australia 3, Japan 5, or Worldwide 8: **excluded**.
3. No region records: **excluded**.
4. Europe 1 on **another** supported platform, USA 2 on requested platform: **excluded** for requested platform and not incorrectly added via multi-platform mapping.
5. Direct numeric/IGDB ID: **must still pass** the platform-specific predicate; no unverified-ID bypass.
6. Broad vs explicitly selected console: PC stays excluded from broad discovery but can be selected explicitly, with the **same regional requirements**.
7. Current and deprecated EU fields, conflicting fields, version identities and dated/undated release records are individually covered.

## Source-backed findings and changes proposed for #81

| Finding | Evidence in source | Targeted change |
| --- | --- | --- |
| Old query returns stale clickable cards during debounce/loading | Quick Add only reset `results` when the user query became too short; cards were mapped unconditionally even during `loading` | Clear result cards and metadata immediately on query/platform changes and show buttons only after `loaded` |
| Global first-release year is presented alongside Europe-only search results | Candidate `firstReleaseDate` uses game's global `first_release_date` even when EU platform release is years later | Request release-date timestamp and label **Europe year for exact platform** when known; otherwise label Europe confirmation without inventing a year. Keep global `firstReleaseDate` in canonical metadata. |
| Legacy EU metadata can produce false negatives | Region predicate accepts `release_dates.region=1`, but search upstream restricted to `release_dates.release_region=1`; the requested IGDB payload omitted old `region` | Request both fields. Keep proven modern field as primary query, add **at most one best-effort legacy-region retry** for sufficiently specific, otherwise empty text searches. If the legacy query fails, log and preserve the safe empty result; never relax the exact game+platform filter. |
| Large search results silently capped | Route used `results.slice(0,24)` with no indication more mapped matches existed; upstream IGDB additionally caps each query at 100 | Return a `truncated` boolean and display a prominent instruction to refine by title/console. Do **not** imply complete catalog coverage or add expensive per-console requests on every keystroke. |
| Canonical project handoff remained stale after #80 | `ROADMAP.md` and `PROJECT_STATE.md` still describe #79/PR #80 as active | Reconcile in the same audit PR. |

## Residual limitations — NOT VERIFIED / no false claims

- **No live IGDB calls with project credentials** were executed. The desktop device is offline and the authenticated browser executor has no usable balance; production Quick Add remains inaccessible for read-only browser QA in this session.
- Synthetic fixtures prove application logic but **cannot quantify real-world false positives, coverage, edition availability, misclassified fan-games, IGDB publishing evidence or regional metadata completeness**. In particular, a multi-platform title with an EU record can still be wrong upstream, and some physical PAL releases lack IGDB region records.
- The deprecated `release_dates.region` retry is guarded and optional; whether IGDB still accepts that field in live APICalypse queries **has not been validated**. It only runs when a sufficiently specific ordinary search otherwise yields zero accepted results. Records mixed into a non-empty current-field search may still be missing if they have exclusively deprecated metadata.
- A European *game/platform* release, even with a known date, is **not evidence that a physical PAL box, retail barcode, printed manual, cover language or Pokéwalker bundle exists**. Owner must confirm physical attributes.
- The first 100 IGDB query matches remain an upstream capped candidate set, and the UI shows at most 24; pagination/true exhaustive catalog lookup is **out of scope**, because a high-cost many-console API fan-out on every keystroke would hurt responsiveness.
- The project has not independently verified that every historical game is correctly classified as a physically released, commercial EU title. Do not call this a complete physical PAL audit.
- This audit has not performed any live Collection, Wishlist, Purchase or private Blob mutations.

## Follow-up trigger

If a real PAL game is missing, obtain its **exact IGDB game ID + platform + (if known) retailer/edition evidence** and diagnose the upstream release records, without hardcoding a whitelist of specific games into the canonical pipeline. For physical-only confirmation, add a trustworthy structured source first rather than inferring from cover art or the existence of a European digital download.

**External field definitions:** https://api-docs.igdb.com/ — `games`, `release_dates`, `release_region`, deprecated `region`, APICalypse filters/pagination.
