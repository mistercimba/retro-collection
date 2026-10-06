import "server-only";
import { unstable_cache } from "next/cache";
import type { CanonicalGameIdentity } from "@/lib/data/types";
import {
  escapeIgdbSearch,
  igdbPlatformId,
  mapIgdbCandidates,
  parseIgdbIdentifier,
  type CanonicalGameCandidate,
  type IgdbRawGame,
} from "@/lib/igdb-catalog.logic";

type TokenState = { value: string; expiresAt: number };
let tokenState: TokenState | null = null;

async function getToken(): Promise<string> {
  if (tokenState && tokenState.expiresAt > Date.now() + 60_000) return tokenState.value;
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("IGDB não está configurado.");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Twitch OAuth respondeu ${response.status}.`);
  const payload = await response.json() as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new Error("Twitch OAuth não devolveu access token.");
  tokenState = {
    value: payload.access_token,
    expiresAt: Date.now() + Math.max(60, Number(payload.expires_in ?? 3600)) * 1000,
  };
  return tokenState.value;
}

async function requestGames(body: string): Promise<IgdbRawGame[]> {
  const clientId = process.env.IGDB_CLIENT_ID;
  if (!clientId) throw new Error("IGDB não está configurado.");

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const token = await getToken();
    let response: Response;
    try {
      response = await fetch("https://api.igdb.com/v4/games", {
        method: "POST",
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "text/plain",
        },
        body,
        cache: "no-store",
      });
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
      continue;
    }

    if (response.status === 401 && attempt < 3) {
      tokenState = null;
      continue;
    }
    if ([429, 500, 502, 503, 504].includes(response.status) && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 350));
      continue;
    }
    if (!response.ok) throw new Error(`IGDB respondeu ${response.status}.`);
    const payload = await response.json();
    return Array.isArray(payload) ? payload as IgdbRawGame[] : [];
  }

  return [];
}

const fields = [
  "id",
  "name",
  "summary",
  "first_release_date",
  "version_title",
  "version_parent",
  "cover.image_id",
  "genres.name",
  "platforms.id",
  "platforms.name",
  "involved_companies.developer",
  "involved_companies.publisher",
  "involved_companies.company.name",
].join(",");

async function searchUncached(query: string, platform = ""): Promise<CanonicalGameCandidate[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const id = parseIgdbIdentifier(trimmed);
  const platformId = platform ? igdbPlatformId(platform) : null;
  const wherePlatform = platformId ? ` & platforms = (${platformId})` : "";

  const body = id
    ? `fields ${fields}; where id = ${id}${wherePlatform}; limit 10;`
    : `fields ${fields}; search "${escapeIgdbSearch(trimmed)}";${platformId ? ` where platforms = (${platformId});` : ""} limit 30;`;

  return mapIgdbCandidates(await requestGames(body), platform);
}

const cachedSearch = unstable_cache(
  searchUncached,
  ["igdb-canonical-search-v1"],
  { revalidate: 60 * 60 * 24 },
);

export async function searchCanonicalGames(query: string, platform = "") {
  return cachedSearch(query.trim(), platform.trim());
}

async function resolveUncached(gameId: number, platformId: number): Promise<CanonicalGameIdentity | null> {
  const games = await requestGames(`fields ${fields}; where id = ${gameId}; limit 1;`);
  const candidate = mapIgdbCandidates(games).find((item) =>
    item.gameId === gameId && item.platformId === platformId
  );
  if (!candidate) return null;
  return {
    source: "IGDB",
    sourceGameId: candidate.gameId,
    sourcePlatformId: candidate.platformId,
    title: candidate.title,
    platform: candidate.platform,
    edition: candidate.edition,
    summary: candidate.summary,
    firstReleaseDate: candidate.firstReleaseDate,
    genres: candidate.genres,
    developers: candidate.developers,
    publishers: candidate.publishers,
    coverImageId: candidate.coverImageId,
    selectedAt: new Date().toISOString(),
  };
}

const cachedResolve = unstable_cache(
  resolveUncached,
  ["igdb-canonical-resolve-v1"],
  { revalidate: 60 * 60 * 24 * 7 },
);

export async function resolveCanonicalGame(gameId: number, platformId: number) {
  if (!Number.isSafeInteger(gameId) || gameId <= 0 || !Number.isSafeInteger(platformId) || platformId <= 0) return null;
  return cachedResolve(gameId, platformId);
}
