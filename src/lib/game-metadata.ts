import type { CollectionGame } from "@/lib/data/types";
import snapshot from "@/data/game-metadata.json";

export type PlaytimeSnapshot = { main: string; extras: string; completionist: string };

export type MatchedGameMetadata = {
  matchStatus: "matched";
  source: string;
  sourceGameId: number;
  title: string;
  summary: string;
  firstReleaseDate: string;
  genres: string[];
  gameModes: string[];
  themes: string[];
  perspectives: string[];
  developers: string[];
  publishers: string[];
  aggregatedRating: number | null;
  aggregatedRatingCount: number;
  userRating: number | null;
  userRatingCount: number;
  playtime: PlaytimeSnapshot;
  reviewScore: number | null;
  reviewScoreSource: string;
  reviewScoreUrl: string;
  externalIds: Record<string, string | number>;
  refreshedAt: string;
};

export type UnresolvedGameMetadata = {
  matchStatus: "ambiguous" | "unmatched";
  source: string;
  matchReason?: string;
  candidates?: { id: number; name: string; platforms: string[] }[];
  refreshedAt: string;
};

export type GameMetadata = MatchedGameMetadata | UnresolvedGameMetadata;

type GameMetadataSnapshot = { games?: Record<string, GameMetadata> };
const games = (snapshot as unknown as GameMetadataSnapshot).games ?? {};

export function getGameMetadata(collectionId: string): GameMetadata | null {
  return games[collectionId] ?? null;
}


function normalizeMetadataTitle(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function findGameMetadataByTitle(title: string): MatchedGameMetadata | null {
  const wanted = normalizeMetadataTitle(title);
  if (!wanted) return null;
  const matches = Object.values(games).filter((entry): entry is MatchedGameMetadata =>
    entry.matchStatus === "matched" && normalizeMetadataTitle(entry.title) === wanted,
  );
  return matches.length === 1 ? matches[0] : null;
}


function catalogMetadata(game: CollectionGame): MatchedGameMetadata | null {
  const catalog = game.catalog;
  if (!catalog || catalog.source !== "IGDB") return null;
  return {
    matchStatus: "matched",
    source: "IGDB · identidade selecionada na app",
    sourceGameId: catalog.sourceGameId,
    title: catalog.title,
    summary: catalog.summary,
    firstReleaseDate: catalog.firstReleaseDate,
    genres: catalog.genres,
    gameModes: [],
    themes: [],
    perspectives: [],
    developers: catalog.developers,
    publishers: catalog.publishers,
    aggregatedRating: null,
    aggregatedRatingCount: 0,
    userRating: null,
    userRatingCount: 0,
    playtime: { main: "", extras: "", completionist: "" },
    reviewScore: null,
    reviewScoreSource: "indisponível",
    reviewScoreUrl: "",
    externalIds: { igdb: catalog.sourceGameId },
    refreshedAt: catalog.selectedAt,
  };
}

export function resolveGameMetadata(game: CollectionGame): GameMetadata | null {
  return getGameMetadata(game.collectionId) ?? catalogMetadata(game) ?? findGameMetadataByTitle(game.title);
}
