export type ArtworkRegion = "Europe" | "US" | "Japan";
export type ArtworkSourceTarget = { title: string; targetVersion?: string };
export type LaunchboxGame = {
  databaseId: string;
  title: string;
  platform: string;
  alternates: { title: string; region: string }[];
  images: { fileName: string; region: string }[];
};
export function normalizeArtworkTitle(value: string): string;
export function requestedArtworkRegion(targetVersion?: string): ArtworkRegion;
export function sourceArtworkRegion(filePath: string): ArtworkRegion | null;
export function sourceArtworkTitle(filePath: string): string;
export function targetArtworkTitleVariants(title: string): string[];
export function findExactSourceMatches<T extends { title: string; region: ArtworkRegion | null }>(target: ArtworkSourceTarget, candidates: T[]): T[];
export function findLaunchboxGameMatches(target: ArtworkSourceTarget, games: LaunchboxGame[], sourcePlatform: string): LaunchboxGame[];
export function launchboxArtworkRegion(region: string): ArtworkRegion | null;
export function launchboxArtworkRegionScore(region: string): number;
export function rejectedArtworkSource<T extends { source: string; sourcePath: string; sourceRepo?: string; sourceCommit?: string }>(source: T, rejections: T[]): T | undefined;
export function findExactLaunchboxMatch(target: ArtworkSourceTarget, games: LaunchboxGame[], sourcePlatform: string):
  { game: LaunchboxGame; image: LaunchboxGame["images"][number]; reason?: never; candidateCount?: never } |
  { reason: string; candidateCount: number; game?: never; image?: never };
