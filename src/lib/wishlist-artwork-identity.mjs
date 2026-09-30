import { normalizeWantlistVariant } from "./wantlist-variant.mjs";

const PLATFORM_ALIASES = {
  nes: "nes", "nintendo entertainment system": "nes",
  snes: "snes", "super nintendo": "snes", "super nintendo entertainment system": "snes",
  n64: "nintendo 64", "nintendo 64": "nintendo 64",
  gameboy: "game boy", "game boy": "game boy", "nintendo game boy": "game boy",
  "game boy color": "game boy color", "gameboy color": "game boy color", "nintendo game boy color": "game boy color",
  gba: "game boy advance", "gameboy advance": "game boy advance", "game boy advance": "game boy advance", "nintendo game boy advance": "game boy advance",
  gamecube: "gamecube", "nintendo gamecube": "gamecube",
  ds: "nintendo ds", "nintendo ds": "nintendo ds",
  "3ds": "nintendo 3ds", "nintendo 3ds": "nintendo 3ds",
  wii: "nintendo wii", "nintendo wii": "nintendo wii",
  "wii u": "nintendo wii u", "nintendo wii u": "nintendo wii u",
  switch: "nintendo switch", "nintendo switch": "nintendo switch",
  ps1: "playstation", playstation: "playstation", "sony playstation": "playstation",
  ps2: "playstation 2", "playstation 2": "playstation 2", "sony playstation 2": "playstation 2",
  ps3: "playstation 3", "playstation 3": "playstation 3", "sony playstation 3": "playstation 3",
  ps5: "playstation 5", "playstation 5": "playstation 5", "sony playstation 5": "playstation 5",
};

export function normalizeWishlistArtworkTitle(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an)\s+/, "");
}

export function normalizeWishlistArtworkPlatform(value) {
  const normalized = normalizeWishlistArtworkTitle(value);
  return PLATFORM_ALIASES[normalized] ?? normalized;
}

export function wishlistArtworkRegion(targetVersion = "") {
  const normalized = normalizeWishlistArtworkTitle(targetVersion);
  if (/\b(ntsc j|japan|japanese|japao|japones|jp)\b/.test(normalized)) return "Japan";
  if (/\b(ntsc u|usa|united states|north american|north america|norte americano|us)\b/.test(normalized)) return "US";
  return "Europe";
}

// A requirement is not the edition of an asset. Reuse the facet vocabulary for
// known editions; only region/condition/packaging descriptions mean Any.
// Unrecognized words remain Unknown instead of guessing a named edition away.
export function wishlistArtworkEditionRequirement(targetVersion = "") {
  const variant = normalizeWantlistVariant(targetVersion);
  if (variant !== "Other") return variant;
  const neutral = normalizeWishlistArtworkTitle(targetVersion)
    .replace(/\bconfirmar (edicao|variante)\b/g, "")
    .replace(/\b(pal|ntsc|j|u|europe|european|europeu|europeia|europa|eu|usa|us|jp|japan|japanese|japao|japones|north|american|america|united|states|fisico|fisica|physical|ps5|cib|loose|completo|completa|complete|bom|boa|estado|funcional|good|excellent|fair|mint|sealed|selado|selada|novo|nova|new|caixa|conteudo|manual|box|boxed|cartridge|cartucho|confirmar|com|sem|uk|microfone|opcional)\b/g, "")
    .trim();
  return neutral ? "Unknown" : "Any";
}

export function wishlistArtworkIdentity(target) {
  return JSON.stringify([
    target.targetId,
    normalizeWishlistArtworkPlatform(target.platform),
    normalizeWishlistArtworkTitle(target.title),
    wishlistArtworkRegion(target.targetVersion),
    wishlistArtworkEditionRequirement(target.targetVersion),
  ]);
}
