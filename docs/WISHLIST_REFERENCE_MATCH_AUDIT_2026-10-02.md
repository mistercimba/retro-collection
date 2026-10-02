# Wishlist reference matching audit — 2026-10-02

This audit was triggered by real Wishlist rows showing `—` even when a matching CeX / PriceCharting product existed.

## Scope

The audit compares the current matching rules against the repository's latest static Wishlist artwork snapshot:

- `data/wishlist-artwork-manifest.json`
- `data/wishlist-artwork-missing.json`

Together they contain **298 unique platform + title targets**. This is an identity-regression audit, not a claim that the static artwork snapshot is byte-for-byte identical to the current mutable production Wishlist.

External reference snapshots inspected:

- CeX Portugal shared reference catalog from `mistercimba/vinted-retro-search`
- PriceCharting PAL snapshot from `mistercimba/vinted-retro-search`

## Defect classes found and addressed

### 1. CeX condition/completeness text was treated as part of the game title

Examples:

- `Persona 4 (Com CD), + Manual, Caixa`
- `Persona 4 (Com CD), Perfeito`
- `Persona 3 FES, + Manual, Caixa`
- `Castlevania - Aria of Sorrow, Sem Caixa`

Correction:

- strip only known CeX condition / completeness annotations before identity matching;
- keep the original row for condition classification and prices;
- prefer explicit CIB rows over `Perfeito`;
- never reinterpret `Sem Manual, Caixa` as CIB.

### 2. Safe source naming differences were too exact

Covered generically:

- Roman vs Arabic numerals: `II` ↔ `2`
- joined/split words: `SoulCalibur` ↔ `Soul Calibur`, `TimeSplitters` ↔ `Time Splitters`
- leading franchise/source prefixes: `Persona 4` ↔ `Shin Megami Tensei: Persona 4`
- leading Zelda article/franchise form: `The Legend of Zelda...` ↔ `Legend of Zelda...` / `Zelda...`
- safe shortened subtitles where enough identity remains
- acronym prefixes such as `CTR: Crash Team Racing`
- corporate suffix/split-word case: `WarioWare, Inc.: Minigame Mania` ↔ `Wario Ware Minigame Mania`

Matching remains unique-best and edition-aware.

### 3. Verified regional titles cannot be inferred safely

These are stored as platform-scoped identity data rather than one-off code branches:

- GBC: `Survival Kids` ↔ `Stranded Kids`
- GBA: `Castlevania: Circle of the Moon` ↔ PAL `Castlevania`
- PS2: `Maximo: Ghosts to Glory` ↔ `Maximo`
- PS2: `Sly 2: Band of Thieves` ↔ `Sly 2: Bando de Espertalhões`
- DS: `Mario & Luigi: Bowser's Inside Story` ↔ European localized titles such as `Viaje al centro de Bowser`
- 3DS: `Dragon Quest VIII: Journey of the Cursed King` ↔ `El Periplo Del Rey Maldito`
- 3DS: `Mario & Luigi: Superstar Saga + Bowser's Minions` ↔ `... + Secuaces De Bowser`

The alias list lives in `src/data/game-title-aliases.ts`.

### 4. Packaging-only parentheticals could block an otherwise valid CeX identity

Examples such as:

- `Mario Kart Wii (Cardboard Sleeve)`
- `Mario Kart Wii (Solo Jogo, Normal DVD Case)`

are normalized for identity only. Their distinct source rows are still kept distinct for price/condition handling, so ambiguity can still fail closed.

### 5. GBA was missing from the shared CeX catalog despite already being supported

Live CeX Portugal uses category **`GBA Jogos`**. The hunter allowlist recognized `GameBoy Advance Jogos` but not the real `GBA Jogos` category, so the category was discarded before the shared reference snapshot was built.

Upstream correction: `mistercimba/vinted-retro-search` PR **#409**.

After that PR is merged and a complete CeX refresh runs, GBA rows such as Aria of Sorrow can enter the same shared reference catalog as the other platforms.

## Deliberately not guessed

The following are not ordinary title-matching defects and must remain fail-closed until the product model handles them explicitly:

- one-of Wishlist targets such as `Pokémon Black 2 ou White 2`;
- `Pokémon Ultra Sun ou Ultra Moon`;
- `Fire Emblem Fates (Birthright ou Conquest)`;
- multiple CeX variants with different packaging but no safe condition-specific choice;
- games genuinely absent from a source.

The PriceCharting PAL snapshot currently has no PS3 or PS5 rows. That is **source coverage debt**, not a title matcher failure; the matcher must not manufacture prices for those platforms.

## Regression guardrails

Tests now cover representative positive and negative cases, including:

- Persona 3 / Persona 4;
- Zelda Ocarina / Tears of the Kingdom naming forms;
- Project Zero II standard vs promo;
- Donkey Kong Country 2 standard vs Big Box / Pirate Pak;
- regional aliases above;
- WarioWare punctuation/corporate suffixes;
- translated subtitles;
- false-positive controls such as `Mario Party 6` vs `Mario Golf 6` and Red vs Blue Rescue Team.

The rule remains: **accuracy beats coverage**. A missing reference is preferable to silently pricing the wrong game or edition.
