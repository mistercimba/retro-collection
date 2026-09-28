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
