export type IgdbRawGame = {
  id: number;
  name: string;
  summary?: string;
  first_release_date?: number;
  version_title?: string;
  version_parent?: number;
  cover?: { image_id?: string };
  genres?: Array<{ name?: string }>;
  platforms?: Array<{ id?: number; name?: string }>;
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
): CanonicalGameCandidate[] {
  const wantedPlatformId = platformFilter ? igdbPlatformId(platformFilter) : null;
  const candidates: CanonicalGameCandidate[] = [];

  for (const game of games) {
    if (!Number.isInteger(game.id) || !game.name?.trim()) continue;
    const supported = (game.platforms ?? [])
      .map((platform) => Number(platform.id))
      .filter((id) => platformById.has(id))
      .filter((id) => wantedPlatformId === null || id === wantedPlatformId);

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
        publishers: companyNames(game, "publisher"),
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
