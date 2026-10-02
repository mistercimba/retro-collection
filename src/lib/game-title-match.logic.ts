const STOPWORDS = new Set([
  "a", "an", "and", "the", "of", "de", "da", "do", "dos", "das", "para", "e", "o", "os", "as", "um", "uma",
]);

const ROMAN_NUMERALS = new Map<string, string>([
  ["ii", "2"], ["iii", "3"], ["iv", "4"], ["v", "5"], ["vi", "6"], ["vii", "7"], ["viii", "8"], ["ix", "9"],
  ["x", "10"], ["xi", "11"], ["xii", "12"], ["xiii", "13"], ["xiv", "14"], ["xv", "15"], ["xvi", "16"],
  ["xvii", "17"], ["xviii", "18"], ["xix", "19"], ["xx", "20"],
]);

const EDITION_PATTERNS: Record<string, RegExp> = {
  platinum: /\b(?:platinum|plat(?:inum)? edition)\b/,
  playersChoice: /\bplayers choice\b/,
  nintendoSelects: /\bnintendo selects\b/,
  essentials: /\bessentials\b/,
  greatestHits: /\bgreatest hits\b/,
  nesClassics: /\bnes classics\b/,
  dayOne: /\bday one\b/,
  limited: /\b(?:limited|ltd)\b/,
  collector: /\bcollectors?\b/,
  steel: /\bsteel(?:book| box)?\b/,
  special: /\bspecial edition\b/,
  bigBox: /\bbig box\b/,
  promo: /\b(?:promo|not for resale|press kit)\b/,
  bundle: /\b(?:bundle|combo pack|multi tap|pirate pak)\b/,
};

export type TitleMatchRank = 0 | 1 | 2 | 3 | 4 | 5;

export function normalizeGameTitle(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .toLocaleLowerCase("pt-PT")
    .replace(/player'?s\s+choice/g, "players choice")
    .replace(/steel\s*book/g, "steelbook")
    .replace(/\bspecial\s+ed\.?\b/g, "special edition")
    .replace(/\bplat\.?\s+ed\.?\b/g, "platinum edition")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceAlias(value: string, platform: string): string {
  let text = normalizeGameTitle(value)
    .replace(/^the legend of zelda\b/, "zelda")
    .replace(/^legend of zelda\b/, "zelda")
    .replace(/^shin megami tensei persona\b/, "persona");

  if (platform === "DS" && text.endsWith(" ds")) text = text.slice(0, -3).trim();
  return text;
}

function foldToken(token: string): string {
  const numbered = ROMAN_NUMERALS.get(token) ?? token;
  if (numbered.length > 4 && numbered.endsWith("s") && !/(?:ss|us|is|os)$/.test(numbered)) {
    return numbered.slice(0, -1);
  }
  return numbered;
}

function tokens(value: string, platform: string): string[] {
  let values = sourceAlias(value, platform).split(" ").filter(Boolean).map(foldToken);

  // Safe acronym expansion: "CTR Crash Team Racing" and similar source labels.
  if (values.length >= 4 && values[0].length >= 2 && values[0].length <= 5) {
    const initials = values.slice(1).filter((token) => !STOPWORDS.has(token)).map((token) => token[0]).join("");
    if (values[0] === initials) values = values.slice(1);
  }
  return values;
}

function meaningfulTokens(value: string, platform: string): string[] {
  return tokens(value, platform).filter((token) => !STOPWORDS.has(token));
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function tokenSignature(value: string, platform: string): string {
  return uniqueSorted(meaningfulTokens(value, platform)).join("|");
}

function compactSignature(value: string, platform: string): string {
  return meaningfulTokens(value, platform).join("");
}

function corporateCompactSignature(value: string, platform: string): string {
  return meaningfulTokens(value, platform).filter((token) => token !== "inc").join("");
}

function sharedWordStats(left: string, right: string, platform: string): { common: number; overlap: number } {
  const leftWords = wordSignature(left, platform);
  const rightWords = wordSignature(right, platform);
  const rightSet = new Set(rightWords);
  const common = leftWords.filter((token) => rightSet.has(token)).length;
  return { common, overlap: common / Math.max(leftWords.length, rightWords.length, 1) };
}

function numberSignature(value: string, platform: string): string {
  return meaningfulTokens(value, platform).filter((token) => /^\d+$/.test(token)).sort().join("|");
}

function wordSignature(value: string, platform: string): string[] {
  return uniqueSorted(meaningfulTokens(value, platform).filter((token) => !/^\d+$/.test(token)));
}

function isSubset(left: string[], right: string[]): boolean {
  const lookup = new Set(right);
  return left.every((token) => lookup.has(token));
}

function titleVariants(value: string): string[] {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  const variants = [raw];
  // A slash is frequently a regional/alternate title notation in the wishlist.
  if (/\s\/\s/.test(raw)) {
    variants.push(...raw.split(/\s+\/\s+/).map((part) => part.trim()).filter(Boolean));
  }
  return [...new Set(variants)];
}

export function isCompoundChoiceTitle(value: string): boolean {
  return /\b(?:ou|or)\b/i.test(String(value ?? ""));
}

export function titleMatchRank(query: string, candidate: string, platform: string): TitleMatchRank | null {
  if (!query || !candidate || isCompoundChoiceTitle(query)) return null;
  let best: TitleMatchRank | null = null;

  for (const queryVariant of titleVariants(query)) {
    for (const candidateVariant of titleVariants(candidate)) {
      const queryNormalized = sourceAlias(queryVariant, platform);
      const candidateNormalized = sourceAlias(candidateVariant, platform);
      if (queryNormalized === candidateNormalized) best = best === null ? 0 : Math.min(best, 0) as TitleMatchRank;

      const querySignature = tokenSignature(queryVariant, platform);
      const candidateSignature = tokenSignature(candidateVariant, platform);
      if (querySignature && querySignature === candidateSignature) {
        best = best === null ? 1 : Math.min(best, 1) as TitleMatchRank;
      }

      const queryCompact = compactSignature(queryVariant, platform);
      const candidateCompact = compactSignature(candidateVariant, platform);
      if (queryCompact.length >= 6 && queryCompact === candidateCompact) {
        best = best === null ? 1 : Math.min(best, 1) as TitleMatchRank;
      }

      // Some catalogues omit punctuation-bound corporate suffixes while also
      // splitting a stylised compound word (for example WarioWare, Inc. vs
      // Wario Ware). Only ignore "inc" when at least three other meaningful
      // tokens remain on both sides, avoiding broad one-word matches.
      const queryCorporateCompact = corporateCompactSignature(queryVariant, platform);
      const candidateCorporateCompact = corporateCompactSignature(candidateVariant, platform);
      const queryCorporateTokens = meaningfulTokens(queryVariant, platform).filter((token) => token !== "inc");
      const candidateCorporateTokens = meaningfulTokens(candidateVariant, platform).filter((token) => token !== "inc");
      if (
        Math.min(queryCorporateTokens.length, candidateCorporateTokens.length) >= 3
        && queryCorporateCompact.length >= 8
        && queryCorporateCompact === candidateCorporateCompact
      ) {
        best = best === null ? 1 : Math.min(best, 1) as TitleMatchRank;
      }

      const queryWords = wordSignature(queryVariant, platform);
      const candidateWords = wordSignature(candidateVariant, platform);
      if (queryWords.length >= 3 && queryWords.join("|") === candidateWords.join("|")) {
        best = best === null ? 2 : Math.min(best, 2) as TitleMatchRank;
      }

      const queryMeaningful = meaningfulTokens(queryVariant, platform);
      const candidateMeaningful = meaningfulTokens(candidateVariant, platform);
      const queryNumbers = numberSignature(queryVariant, platform);
      const candidateNumbers = numberSignature(candidateVariant, platform);
      const shorterLength = Math.min(queryMeaningful.length, candidateMeaningful.length);

      // Controlled subtitle/source-name fallback. Never allow a one-token base title
      // (e.g. "Castlevania") to inherit a specific sequel's price.
      if (
        queryNumbers === candidateNumbers
        && shorterLength >= 2
        && (isSubset(queryMeaningful, candidateMeaningful) || isSubset(candidateMeaningful, queryMeaningful))
      ) {
        best = best === null ? 3 : Math.min(best, 3) as TitleMatchRank;
      }

      // Some sources omit a sequel numeral while preserving a distinctive 3+ word
      // identity (e.g. Dragon Quest VIII / TimeSplitters 3). Require the non-number
      // identity to be exactly equal, so this cannot broaden to a franchise base.
      if (
        queryNumbers !== candidateNumbers
        && queryWords.length >= 3
        && queryWords.join("|") === candidateWords.join("|")
      ) {
        best = best === null ? 3 : Math.min(best, 3) as TitleMatchRank;
      }

      // Regional catalogue titles sometimes translate only the subtitle. If a
      // large distinctive core survives unchanged, accept it as a lower-ranked
      // candidate and still rely on the caller's unique-best rule.
      const shared = sharedWordStats(queryVariant, candidateVariant, platform);
      if (
        queryNumbers === candidateNumbers
        && shared.common >= 3
        && shared.overlap >= 0.67
      ) {
        best = best === null ? 4 : Math.min(best, 4) as TitleMatchRank;
      }

      // Numbered sequels can also have the whole subtitle translated (Sly 2,
      // Dragon Quest VIII, etc.). Require the same explicit sequel number and
      // the same leading franchise token. This is deliberately the weakest
      // rank so exact/subset/high-overlap candidates always win first.
      if (
        queryNumbers
        && queryNumbers === candidateNumbers
        && queryMeaningful[0] === candidateMeaningful[0]
      ) {
        best = best === null ? 5 : Math.min(best, 5) as TitleMatchRank;
      }
    }
  }

  return best;
}

export function editionFlags(value: string): Record<string, boolean> {
  const text = normalizeGameTitle(value);
  const flags = Object.fromEntries(Object.entries(EDITION_PATTERNS).map(([key, pattern]) => [key, pattern.test(text)]));
  flags.otherEdition = /\bedition\b/.test(text) && !Object.values(flags).some(Boolean);
  return flags;
}

export function editionsCompatible(expected: string, actual: string): boolean {
  const wanted = editionFlags(expected);
  const found = editionFlags(actual);
  return Object.keys(wanted).every((key) => wanted[key] === found[key]);
}

export function chooseUniqueBestTitleMatch<T>(
  query: string,
  platform: string,
  candidates: readonly T[],
  getTitle: (candidate: T) => string,
  getIdentity: (candidate: T) => string,
): T | null {
  const matches = candidates
    .map((candidate) => ({ candidate, rank: titleMatchRank(query, getTitle(candidate), platform) }))
    .filter((entry): entry is { candidate: T; rank: TitleMatchRank } => entry.rank !== null);
  if (!matches.length) return null;

  const bestRank = Math.min(...matches.map((entry) => entry.rank)) as TitleMatchRank;
  const best = matches.filter((entry) => entry.rank === bestRank);
  const unique = new Map<string, T>();
  for (const entry of best) unique.set(getIdentity(entry.candidate), entry.candidate);
  return unique.size === 1 ? [...unique.values()][0] : null;
}
