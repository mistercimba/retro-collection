const EDITION_NOISE = [
  "players choice", "nintendo selects", "greatest hits", "nes classics", "day one",
  "steelbook", "steel box", "limited edition", "collector edition", "collectors edition",
  "platinum", "essentials",
];

const PLATFORM_NOISE: Record<string, string[]> = {
  PS1: ["playstation", "ps1", "sony"],
  PS2: ["playstation 2", "playstation", "ps2", "sony"],
  PS3: ["playstation 3", "playstation", "ps3", "sony"],
  PS5: ["playstation 5", "playstation", "ps5", "sony"],
  NES: ["nintendo entertainment system", "nes", "nintendo"],
  SNES: ["super nintendo entertainment system", "super nintendo", "snes", "nintendo"],
  N64: ["nintendo 64", "n64", "nintendo"],
  GameCube: ["nintendo gamecube", "gamecube", "nintendo"],
  Wii: ["nintendo wii", "wii", "nintendo"],
  "Wii U": ["nintendo wii u", "wii u", "nintendo"],
  Switch: ["nintendo switch", "switch", "nintendo"],
  "Game Boy": ["nintendo game boy", "game boy", "gameboy", "nintendo"],
  GBC: ["nintendo game boy color", "game boy color", "gameboy color", "gbc", "nintendo"],
  GBA: ["nintendo game boy advance", "game boy advance", "gameboy advance", "gba", "nintendo"],
  DS: ["nintendo ds", "ds", "nintendo"],
  "3DS": ["nintendo 3ds", "3ds", "nintendo"],
  PSP: ["playstation portable", "psp", "sony"],
};

const SAFE_CEX_SUFFIXES = [
  /\s*[,;:-]\s*perfeito\s*$/i,
  /\s*[,;:-]\s*\+?\s*manual\s*[,;:-]\s*caixa\s*$/i,
  /\s*[,;:-]\s*sem\s+manual\s*[,;:-]\s*caixa\s*$/i,
  /\s*[,;:-]\s*sem\s+caixa\s*$/i,
  /\s*[,;:-]\s*caixa\s*$/i,
  /\s*[,;:-]\s*solo\s+juego\s*$/i,
  /\s*[,;:-]\s*juego\s+solo\s*$/i,
  /\s*[,;:-]\s*(?:disc|disk|game|cart|cartridge)\s+only\s*$/i,
];

const SAFE_CEX_PARENTHETICALS = [
  /\s*\(\s*(?:com\s+cd|com\s+disco|with\s+disc|with\s+disk)\s*\)\s*/ig,
  /\s*\(\s*\d+\s+discos?\s*\)\s*/ig,
  /\s*\(\s*(?:no\s+manual|no\s+box|no\s+case|sem\s+manual|sem\s+caixa|solo\s+juego|juego\s+solo)\s*\)\s*/ig,
];

export function normalizeCexTitle(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .toLocaleLowerCase("pt-PT")
    .replace(/player'?s\s+choice/g, "players choice")
    .replace(/steel\s*book/g, "steelbook")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripCexReferenceAnnotations(value: string): string {
  let text = String(value ?? "").replace(/\[[^\]]*(?:19|20)\d{2}[^\]]*\]/g, " ");
  for (const pattern of SAFE_CEX_PARENTHETICALS) text = text.replace(pattern, " ");
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of SAFE_CEX_SUFFIXES) {
      const next = text.replace(pattern, "").trim();
      if (next && next !== text) {
        text = next;
        changed = true;
      }
    }
  }
  return text.trim();
}

export function cexTitleIdentity(value: string, platform: string, candidate = false): string {
  let text = normalizeCexTitle(candidate ? stripCexReferenceAnnotations(value) : value);
  for (const phrase of EDITION_NOISE) {
    text = text.replace(new RegExp(`\\b${phrase.replace(/ /g, "\\s+")}\\b`, "g"), " ");
  }
  text = text.replace(/\b(?:caixa|box|edition|edicao|pal|game|jogo)\b/g, " ");
  for (const phrase of (PLATFORM_NOISE[platform] ?? []).sort((a, b) => b.length - a.length)) {
    text = text.replace(new RegExp(`\\b${normalizeCexTitle(phrase).replace(/ /g, "\\s+")}\\b`, "g"), " ");
  }
  return text.replace(/\bthe\b/g, " ").replace(/\s+/g, " ").trim();
}

export function isCexPerfectGrade(value: string): boolean {
  return /(?:^|[,;:-]\s*)perfeito\s*$/i.test(String(value ?? "").trim());
}
