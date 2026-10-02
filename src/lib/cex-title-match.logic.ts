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
  /\s*\(\s*(?:com\s+cd|com\s+disco|with\s+disc|with\s+disk|sem\s+dlc|no\s+dlc|without\s+dlc|disney['’]s)\s*\)\s*/ig,
  /\s*\(\s*\d+\s+discos?\s*\)\s*/ig,
  /\s*\(\s*(?:no\s+manual|no\s+box|no\s+case|sem\s+manual|sem\s+caixa|solo\s+juego|juego\s+solo)\s*\)\s*/ig,
];

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

export function isCexPerfectGrade(value: string): boolean {
  return /(?:^|[,;:-]\s*)perfeito\s*$/i.test(String(value ?? "").trim());
}
