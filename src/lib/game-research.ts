import "server-only";
import { unstable_cache } from "next/cache";
import type { CollectionGame } from "@/lib/data/types";
import { formatPlaytime } from "@/lib/external-game-data.logic";
import { getGameMetadata, type MatchedGameMetadata } from "@/lib/game-metadata";
import { resolveCatalogResearch, type ResearchPlaytime } from "@/lib/game-research.logic";
import { getPricechartingEstimate, type PriceEstimate } from "@/lib/pricecharting-catalog";
import { findIGDBTitleCandidates } from "../../scripts/igdb-refresh-logic.mjs";

export type Research = {
  metadata: (MatchedGameMetadata & { timeToBeat: { main: string; extras: string; completionist: string } }) | null;
  metadataState: "matched" | "ambiguous" | "unmatched" | "not-configured" | "unavailable";
  metascore: { value: number | null; source: string; url: string };
  estimate: PriceEstimate;
};

const IGDB_PLATFORMS: Record<string, number> = { NES: 18, SNES: 19, "Nintendo 64": 4, GameCube: 21, "Nintendo Wii": 5, "Nintendo Wii U": 41, "Nintendo Switch": 130, "Game Boy": 33, "Game Boy Color": 22, "GameBoy Advance": 24, "Nintendo DS": 20, "Nintendo 3DS": 37, Playstation: 7, "Playstation 2": 8, "Playstation 3": 9, "Playstation 5": 167, PSP: 38, PC: 6 };
let tokenValue: string | null = null;
let tokenExpiresAt = 0;
async function igdbToken() {
  if (tokenValue && tokenExpiresAt > Date.now() + 60_000) return tokenValue;
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" });
  const response = await fetch("https://id.twitch.tv/oauth2/token", { method: "POST", body, cache: "no-store" });
  if (!response.ok) return null;
  const token = await response.json() as { access_token: string; expires_in: number };
  tokenValue = token.access_token;
  tokenExpiresAt = Date.now() + token.expires_in * 1000;
  return tokenValue;
}

async function igdbRequest<T>(endpoint: string, query: string, token: string, clientId: string): Promise<T[]> {
  const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, { method: "POST", headers: { "Client-ID": clientId, Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "text/plain" }, body: query, next: { revalidate: 86400 } });
  if (!response.ok) throw new Error(`IGDB respondeu ${response.status}.`);
  return response.json() as Promise<T[]>;
}

type Candidate = { id: number; name: string; summary?: string; first_release_date?: number; genres?: { name: string }[]; game_modes?: { name: string }[]; themes?: { name: string }[]; player_perspectives?: { name: string }[]; aggregated_rating?: number; aggregated_rating_count?: number; rating?: number; rating_count?: number; platforms?: { id: number }[]; involved_companies?: { developer?: boolean; publisher?: boolean; company?: { name: string } }[] };

const getCachedIgdbMetadata = unstable_cache(async (title: string, platformId: number, clientId: string) => {
  const token = await igdbToken();
  if (!token) throw new Error("IGDB token unavailable");
  const escaped = title.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  const candidates = await igdbRequest<Candidate>("games", `fields id,name,summary,first_release_date,genres.name,game_modes.name,themes.name,player_perspectives.name,aggregated_rating,aggregated_rating_count,rating,rating_count,platforms.id,involved_companies.developer,involved_companies.publisher,involved_companies.company.name; search "${escaped}"; limit 25;`, token, clientId);
  const titleMatches = findIGDBTitleCandidates(title, candidates, platformId);
  const matches = titleMatches.filter((candidate) => candidate.platforms?.some((entry) => entry.id === platformId));
  if (matches.length !== 1) return { metadata: null, metadataState: matches.length > 1 ? "ambiguous" as const : "unmatched" as const };
  const candidate = matches[0];
  const times = await igdbRequest<{ hastily?: number; normally?: number; completely?: number }>("game_time_to_beats", `fields hastily,normally,completely; where game_id = ${candidate.id}; limit 1;`, token, clientId);
  const companies = candidate.involved_companies ?? [];
  return { metadata: { matchStatus: "matched" as const, source: "IGDB", sourceGameId: candidate.id, title: candidate.name, summary: candidate.summary ?? "", firstReleaseDate: candidate.first_release_date ? new Date(candidate.first_release_date * 1000).toISOString().slice(0, 10) : "", genres: (candidate.genres ?? []).map((item) => item.name), gameModes: (candidate.game_modes ?? []).map((item) => item.name), themes: (candidate.themes ?? []).map((item) => item.name), perspectives: (candidate.player_perspectives ?? []).map((item) => item.name), developers: companies.filter((item) => item.developer).map((item) => item.company?.name ?? "").filter(Boolean), publishers: companies.filter((item) => item.publisher).map((item) => item.company?.name ?? "").filter(Boolean), aggregatedRating: candidate.aggregated_rating ?? null, aggregatedRatingCount: candidate.aggregated_rating_count ?? 0, userRating: candidate.rating ?? null, userRatingCount: candidate.rating_count ?? 0, refreshedAt: new Date().toISOString(), timeToBeat: { main: formatPlaytime(times[0]?.hastily), extras: formatPlaytime(times[0]?.normally), completionist: formatPlaytime(times[0]?.completely) } }, metadataState: "matched" as const };
}, ["igdb-metadata-v1"], { revalidate: 86400 });

const getCachedIgdbPlaytime = unstable_cache(async (sourceGameId: number, clientId: string): Promise<ResearchPlaytime> => {
  const token = await igdbToken();
  if (!token) throw new Error("IGDB token unavailable");
  const times = await igdbRequest<{ hastily?: number; normally?: number; completely?: number }>(
    "game_time_to_beats",
    `fields hastily,normally,completely; where game_id = ${sourceGameId}; limit 1;`,
    token,
    clientId,
  );
  return {
    main: formatPlaytime(times[0]?.hastily),
    extras: formatPlaytime(times[0]?.normally),
    completionist: formatPlaytime(times[0]?.completely),
  };
}, ["igdb-playtime-by-game-v1"], { revalidate: 86400 });

async function loadSnapshotPlaytime(sourceGameId: number): Promise<ResearchPlaytime> {
  const clientId = process.env.IGDB_CLIENT_ID;
  if (!clientId || !process.env.IGDB_CLIENT_SECRET) throw new Error("IGDB is not configured");
  return getCachedIgdbPlaytime(sourceGameId, clientId);
}

async function loadIgdb(game: CollectionGame): Promise<Pick<Research, "metadata" | "metadataState">> {
  if (!process.env.IGDB_CLIENT_ID || !process.env.IGDB_CLIENT_SECRET) return { metadata: null, metadataState: "not-configured" };
  const platformId = IGDB_PLATFORMS[game.platform];
  if (!platformId) return { metadata: null, metadataState: "unmatched" };
  try {
    return await getCachedIgdbMetadata(game.title, platformId, process.env.IGDB_CLIENT_ID);
  } catch {
    return { metadata: null, metadataState: "unavailable" };
  }
}

async function loadMetascore(game: CollectionGame) {
  const key = process.env.RAWG_API_KEY;
  if (!key || !process.env.APP_PASSWORD) return { value: null, source: key ? "Disponível apenas numa app protegida por password" : "Metascore indisponível", url: "" };
  const params = new URLSearchParams({ search: game.title, page_size: "40", key });
  let response: Response;
  try { response = await fetch(`https://api.rawg.io/api/games?${params}`, { next: { revalidate: 86400 } }); }
  catch { return { value: null, source: "RAWG temporariamente indisponível", url: "" }; }
  if (!response.ok) return { value: null, source: "Metascore indisponível", url: "" };
  let payload: { results?: { name: string; metacritic_url?: string; metacritic_platforms?: { metascore: number; url?: string; platform: { name: string } }[] }[] };
  try { payload = await response.json(); }
  catch { return { value: null, source: "RAWG temporariamente indisponível", url: "" }; }
  const platformNames: Record<string, string[]> = { Playstation: ["PlayStation"], "Playstation 2": ["PlayStation 2"], "Playstation 3": ["PlayStation 3"], "Playstation 5": ["PlayStation 5"], "Nintendo Switch": ["Nintendo Switch"], "Nintendo Wii": ["Wii"], "Nintendo Wii U": ["Wii U"], PC: ["PC"] };
  const aliases = platformNames[game.platform];
  if (!aliases) return { value: null, source: "Metascore indisponível para esta plataforma", url: "" };
  const results = findIGDBTitleCandidates(game.title, payload.results ?? []);
  if (results.length !== 1) return { value: null, source: "Metascore não disponível para correspondência segura", url: "" };
  const platformScores = (results[0].metacritic_platforms ?? []).filter((entry) => aliases.includes(entry.platform.name));
  if (platformScores.length !== 1 || !platformScores[0].metascore) return { value: null, source: "Metascore não disponível para esta plataforma", url: "" };
  return { value: platformScores[0].metascore, source: "RAWG / Metacritic", url: platformScores[0].url ?? results[0].metacritic_url ?? "https://www.metacritic.com/" };
}

export async function getGameResearch(game: CollectionGame): Promise<Research> {
  const [catalog, metascore, estimate] = await Promise.all([
    resolveCatalogResearch(getGameMetadata(game.collectionId), loadSnapshotPlaytime, () => loadIgdb(game)),
    loadMetascore(game),
    getPricechartingEstimate(game),
  ]);
  return { ...catalog, metascore, estimate };
}
