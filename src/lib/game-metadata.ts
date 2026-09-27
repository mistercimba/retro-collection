import snapshot from "@/data/game-metadata.json";

export interface GameMetadata {
  matchStatus?: "matched" | "ambiguous" | "unmatched";
  matchReason?: string;
  candidates?: { id: number; name: string; platforms: string[] }[];
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
  refreshedAt: string;
  timeToBeat?: { main: string; extras: string; completionist: string };
}

const games = (snapshot as { games?: Record<string, GameMetadata> }).games ?? {};

export function getGameMetadata(collectionId: string): GameMetadata | null {
  return games[collectionId] ?? null;
}
