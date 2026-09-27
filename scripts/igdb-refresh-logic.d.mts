export interface IGDBCandidate {
  id: number;
  name: string;
  platforms?: { id: number; name: string }[];
}

export type IGDBMatchResult =
  | { status: "matched"; candidate: IGDBCandidate; candidates: IGDBCandidate[]; metadata?: Record<string, unknown> }
  | { status: "ambiguous"; candidate: null; candidates: IGDBCandidate[]; reason: string }
  | { status: "unmatched"; candidate: null; candidates: IGDBCandidate[]; reason: string };

export function normalizeIGDBTitle(value: string): string;
export function resolveCollectionPlatform(collectionId: string, platform: string, overrides?: Record<string, string>): string;
export function resolveIGDBMatch(title: string, platform: string, candidates: IGDBCandidate[], platformIds: Record<string, number>): IGDBMatchResult;
export function buildGameMetadataSnapshot(groups: { collectionIds: string[]; result: IGDBMatchResult; refreshedAt: string }[]): Record<string, Record<string, unknown>>;
