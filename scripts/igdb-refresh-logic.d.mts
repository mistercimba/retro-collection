export interface IGDBCandidate {
  id: number;
  name: string;
  platforms?: { id: number; name?: string }[];
}

export type IGDBAliasResult<T extends IGDBCandidate = IGDBCandidate> = { name: string; game: T };
export type IGDBMatchResult<T extends IGDBCandidate = IGDBCandidate> =
  | { status: "matched"; candidate: T; candidates: T[]; metadata?: Record<string, unknown>; matchMethod?: "title" | "alias"; relevantAliases?: IGDBAliasResult<T>[] }
  | { status: "ambiguous"; candidate: null; candidates: T[]; reason: string; relevantAliases?: IGDBAliasResult<T>[] }
  | { status: "unmatched"; candidate: null; candidates: T[]; reason: string; relevantAliases?: IGDBAliasResult<T>[] };

export function normalizeIGDBTitle(value: string): string;
export function canonicalIGDBTitle(value: string): string;
export function isIGDBTitleEquivalent(left: string, right: string): boolean;
export function findIGDBTitleCandidates<T extends { name: string; platforms?: { id: number }[] }>(title: string, candidates: T[], platformId?: number): T[];
export function resolveCollectionPlatform(collectionId: string, platform: string, overrides?: Record<string, string>): string;
export function resolveIGDBMatch<T extends IGDBCandidate>(title: string, platform: string, candidates: T[], platformIds: Record<string, number>): IGDBMatchResult<T>;
export function resolveIGDBMatchWithAliases<T extends IGDBCandidate>(title: string, platform: string, candidates: T[], aliases: IGDBAliasResult<T>[], platformIds: Record<string, number>): IGDBMatchResult<T>;
export function buildGameMetadataSnapshot(groups: { collectionIds: string[]; result: IGDBMatchResult; refreshedAt: string }[]): Record<string, Record<string, unknown>>;
