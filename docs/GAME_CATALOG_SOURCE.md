# Canonical game catalog source

Last reviewed: 2026-10-15

The guided Add flow uses **IGDB** as the canonical identity/metadata source.

## Why IGDB

- the project already uses IGDB IDs and metadata in its maintained snapshot;
- production and preview already have server-side IGDB credentials;
- title search can be constrained to the platforms supported by this collection;
- IGDB exposes stable game IDs, platform identity, edition/version titles, cover IDs,
  release dates and descriptive metadata;
- the API is used only while adding/searching a game, not as a dependency for normal
  collection navigation.

Official API documentation: https://api-docs.igdb.com/

The app is a private, non-commercial personal collection tool. IGDB documents its API
as free for non-commercial usage under the Twitch Developer Service Agreement and
states that retrieved data may be retained.

## Runtime design

1. The browser calls the authenticated local route `/api/catalog/search`.
2. The server calls IGDB using `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET`.
3. For ordinary text search, the IGDB request is scoped **before its limit** to a selected platform or, when none is selected, supported **console** platforms (PC is explicit opt-in). IGDB game types for mods/forks/DLC/updates are excluded, and results without a recorded publishing company are not proposed as regular physical-collection candidates. This is a conservative **evidence threshold**, not proof of official licensing.
   When IGDB's full-text search fails on a partial multiword name (e.g. `pokemon hear`), one bounded fallback matches the last substantial word and then verifies all user-entered normalized word prefixes locally. Unrelated matches are not guessed.
   Explicit IGDB ID lookup is still available for records missing publisher metadata, but known mod/fork types are rejected; manual add remains the escape hatch for real missing games.
4. Search results are mapped only to the local supported-platform list.
5. The user must explicitly choose a result. Ambiguous results are never auto-selected.
6. On submit, the server resolves the selected IGDB game/platform again instead of
   trusting hidden title/platform fields from the browser.
7. The selected identity and a compact metadata snapshot are stored on the collection
   record so normal browsing does not need IGDB.
8. If a matching IGDB cover is available and the user did not change the edition, the
   cover bytes are copied once into the existing private Vercel Blob store. Browsing
   then serves that private stored copy.
9. If lookup or cover import fails, the existing explicit manual/placeholder behavior
   remains available. A failed external lookup never silently invents an identity.

Search responses are cached by Next for one day; selected identity lookups are cached
for seven days. OAuth tokens are held server-side only.

## Identifier support

The first implementation supports:

- title search;
- exact **IGDB ID** lookup, e.g. `IGDB: 1068` or `1068`.

IGDB external IDs primarily represent other digital/store services and are not a
reliable universal database of PAL retail barcodes or console product serials.
Therefore this flow does **not** pretend that arbitrary EAN/UPC/serial codes are
supported yet. A physical product code may still be recorded/audited separately when
known.

## Region / edition limits

- Platform identity comes from IGDB.
- IGDB version titles are used when present; otherwise the candidate is shown as
  `Standard`. These are **game database versions**, not an exhaustive register of country-specific physical boxes, launch bundles, SKU variants or included accessories.
- Region is deliberately left for the user to confirm because the chosen game identity
  alone is not enough to prove the exact physical PAL country release.
- If the user changes the edition from the selected catalog edition, automatic cover
  persistence is skipped so a Standard cover is not presented as a Platinum/Player's
  Choice/etc. cover.
- Canonical Add now allows a human-entered **Extras / acessórios que tens** field
  which is stored in the existing copy-specific `extras` field and can be edited
  from the copy detail. Example: Pokémon HeartGold/SoulSilver European original
  launch packs included the Pokéwalker accessory (Nintendo Europe announcement,
  https://www.nintendo.com/pt-pt/Noticias/2010/Novo-acessorio-Pokewalker-traz-Pokemon-para-o-mundo-real-252312.html).
  This is not proof that a particular used copy still includes it, nor grounds
  for inventing a separate IGDB title or region-specific box. The owner confirms
  actual included accessories and can record the precise packaging in Edition.

## Physical completeness

IGDB does not reliably describe every physical insert included in every regional
edition. The add flow therefore uses conservative platform profiles:

- cartridge/cardboard eras: cartucho + caixa + manual;
- DS/3DS: cartucho + caixa + manual/folhetos;
- classic disc systems: disco + caixa + manual/folhetos;
- Switch/PS5: media + caixa (manual is not assumed);
- PSP: UMD + caixa + manual;
- unknown platforms: only generic media + packaging.

Each base component can be **Tenho**, **Falta** or **Verificar depois**. Special-edition
extras are never fabricated; optional extras text records only what the owner says is actually present. Unknown answers mark the copy for later review.
