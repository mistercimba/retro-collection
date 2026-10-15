export type IgdbRawGame = {
  id: number;
  name: string;
  summary?: string;
  first_release_date?: number;
  version_title?: string;
  version_parent?: number;
  /** IGDB game_type supersedes the deprecated category enum. */
  game_type?: number;
  category?: number;
  cover?: { image_id?: string };
  genres?: Array<{ name?: string }>;
  platforms?: Array<{ id?: number; name?: string }>;
  release_dates?: Array<{
    platform?: number;
    release_region?: number | null;
    /** Legacy IGDB field; release_region takes precedence when both exist. */
    region?: number | null;
  }>;
  involved_companies?: Array<{
    developer?: boolean;
    publisher?: boolean;
    company?: { name?: string };
  }>;
};

export type CanonicalGameCandidate = {
  source: "IGDB";
  gameId: number;
  platformId: number;
  title: string;
  platform: string;
  edition: string;
  summary: string;
  firstReleaseDate: string;
  genres: string[];
  developers: string[];
  publishers: string[];
  coverImageId: string;
  coverUrl: string;
};

const PLATFORM_ENTRIES = [
  ["NES", 18],
  ["SNES", 19],
  ["Nintendo 64", 4],
  ["GameCube", 21],
  ["Nintendo Wii", 5],
  ["Nintendo Wii U", 41],
  ["Nintendo Switch", 130],
  ["Game Boy", 33],
  ["Game Boy Color", 22],
  ["GameBoy Advance", 24],
  ["Nintendo DS", 20],
  ["Nintendo 3DS", 37],
  ["Playstation", 7],
  ["Playstation 2", 8],
  ["Playstation 3", 9],
  ["Playstation 5", 167],
  ["PSP", 38],
  ["PC", 6],
] as const;

const platformById = new Map<number, string>(PLATFORM_ENTRIES.map(([name, id]) => [id, name]));
const idByPlatform = new Map<string, number>(PLATFORM_ENTRIES.map(([name, id]) => [name, id]));

export const CATALOG_PLATFORMS = PLATFORM_ENTRIES.map(([name]) => name);

// A broad physical-console search should not return PC fan projects. PC
// remains available when the user explicitly selects it in the dropdown.
const CONSOLE_PLATFORM_IDS = PLATFORM_ENTRIES.filter(([name]) => name !== "PC").map(([, id]) => id);

// IGDB's published game categories, excluding mods/forks, updates, DLC and packs.
// A category alone cannot prove an officially licensed retail release.
const CATALOG_GAME_TYPES = new Set([0, 3, 4, 8, 9, 10, 11]);
const CATALOG_GAME_TYPE_QUERY = [...CATALOG_GAME_TYPES].join(",");

/**
 * A platform appearing in games.platforms is not evidence of a European
 * launch. Worldwide (8), North America (2), Japan (5), Australia (3) and
 * other regions are NOT evidence of a European/PAL market release.
 *
 * This is a catalogue claim for game + platform, not proof that any specific
 * regional physical edition, case, cover or accessory exists.
 */
export function hasEuropeanReleaseOnPlatform(
  game: Pick<IgdbRawGame, "release_dates">,
  platformId: number,
): boolean {
  return Number.isSafeInteger(platformId) && platformId > 0 &&
    (game.release_dates ?? []).some((release) =>
      release.platform === platformId &&
      (release.release_region ?? release.region) === 1
    );
}

export function isCatalogGameType(game: Pick<IgdbRawGame, "game_type" | "category">): boolean {
  const kind = game.game_type ?? game.category;
  // Old/partial IGDB payloads can omit the category; publisher evidence is
  // checked separately for ordinary text searches.
  return kind === undefined || CATALOG_GAME_TYPES.has(kind);
}

export function normalizeCatalogSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT").replace(/[^a-z0-9]+/g, " ").trim();
}

export function catalogTitleMatchesQuery(title: string, query: string): boolean {
  const words = normalizeCatalogSearch(title).split(" ").filter(Boolean);
  const requested = normalizeCatalogSearch(query).split(" ").filter(Boolean);
  return requested.length > 0 && requested.every((word) => words.some((candidate) => candidate.startsWith(word)));
}

export function rankCatalogMatch(title: string, query: string): number {
  const normalizedTitle = normalizeCatalogSearch(title);
  const normalizedQuery = normalizeCatalogSearch(query);
  if (normalizedTitle === normalizedQuery) return 0;
  if (normalizedTitle.startsWith(normalizedQuery)) return 1;
  return catalogTitleMatchesQuery(title, query) ? 2 : 3;
}

/**
 * Server-side platform/type/publisher filtering MUST run before IGDB's limit.
 * The fallback looks for the unfinished final word, then requires every
 * requested word to match locally. It never guesses an unrelated title.
 */
export function buildCatalogSearchBodies(query: string, platform = ""): { primary: string; fallback: string | null } | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const id = parseIgdbIdentifier(trimmed);
  if (id) return { primary: `fields CATALOG_FIELDS; where id = ${id}; limit 1;`, fallback: null };
  const onePlatform = platform ? igdbPlatformId(platform) : null;
  if (platform && onePlatform === null) return null;
  const platforms = onePlatform === null ? CONSOLE_PLATFORM_IDS : [onePlatform];
  // Pre-filter Europe before IGDB's result cap. This alone is NOT sufficient:
  // a multi-platform game may have Europe on another platform, so the mapper
  // also requires an exact release_dates.platform + Europe pair.
  const where = `platforms = (${platforms.join(",")}) & game_type = (${CATALOG_GAME_TYPE_QUERY}) & involved_companies != null & release_dates.release_region = 1`;
  const primary = `fields CATALOG_FIELDS; search "${escapeIgdbSearch(trimmed)}"; where ${where}; limit 100;`;
  const words = normalizeCatalogSearch(trimmed).split(" ").filter(Boolean);
  const last = words.at(-1);
  const fallback = words.length >= 2 && last && last.length >= 3
    ? `fields CATALOG_FIELDS; where ${where} & name ~ *"${escapeIgdbSearch(last)}"*; limit 100;`
    : null;
  return { primary, fallback };
}

export function igdbPlatformId(platform: string): number | null {
  return idByPlatform.get(platform) ?? null;
}

export function parseIgdbIdentifier(query: string): number | null {
  const match = query.trim().match(/^(?:igdb\s*[:#-]?\s*)?#?(\d{1,9})$/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function escapeIgdbSearch(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').trim();
}

function dateFromUnix(value: number | undefined) {
  if (!value || !Number.isFinite(value)) return "";
  return new Date(value * 1000).toISOString().slice(0, 10);
}

function companyNames(
  game: IgdbRawGame,
  kind: "developer" | "publisher",
): string[] {
  return [...new Set(
    (game.involved_companies ?? [])
      .filter((entry) => Boolean(entry[kind]))
      .map((entry) => entry.company?.name?.trim() ?? "")
      .filter(Boolean),
  )];
}

export function igdbCoverUrl(imageId: string) {
  return imageId ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg` : "";
}

export function mapIgdbCandidates(
  games: IgdbRawGame[],
  platformFilter = "",
  options: { requirePublisher?: boolean; consolesOnly?: boolean } = {},
): CanonicalGameCandidate[] {
  const wantedPlatformId = platformFilter ? igdbPlatformId(platformFilter) : null;
  const candidates: CanonicalGameCandidate[] = [];

  for (const game of games) {
    if (!Number.isInteger(game.id) || !game.name?.trim() || !isCatalogGameType(game)) continue;
    const publishers = companyNames(game, "publisher");
    if (options.requirePublisher && publishers.length === 0) continue;
    const supported = (game.platforms ?? [])
      .map((platform) => Number(platform.id))
      .filter((id) => platformById.has(id))
      .filter((id) => !options.consolesOnly || id !== igdbPlatformId("PC"))
      .filter((id) => wantedPlatformId === null || id === wantedPlatformId)
      .filter((id) => hasEuropeanReleaseOnPlatform(game, id));

    for (const platformId of supported) {
      const platform = platformById.get(platformId);
      if (!platform) continue;
      const coverImageId = game.cover?.image_id?.trim() ?? "";
      candidates.push({
        source: "IGDB",
        gameId: game.id,
        platformId,
        title: game.name.trim(),
        platform,
        edition: game.version_title?.trim() || "Standard",
        summary: game.summary?.trim() ?? "",
        firstReleaseDate: dateFromUnix(game.first_release_date),
        genres: [...new Set((game.genres ?? []).map((genre) => genre.name?.trim() ?? "").filter(Boolean))],
        developers: companyNames(game, "developer"),
        publishers,
        coverImageId,
        coverUrl: igdbCoverUrl(coverImageId),
      });
    }
  }

  return candidates
    .filter((candidate, index, all) => all.findIndex((other) =>
      other.gameId === candidate.gameId && other.platformId === candidate.platformId
    ) === index)
    .sort((a, b) =>
      a.title.localeCompare(b.title, "pt-PT") ||
      a.platform.localeCompare(b.platform, "pt-PT") ||
      a.edition.localeCompare(b.edition, "pt-PT")
    );
}
