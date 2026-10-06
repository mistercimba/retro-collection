export type ArtworkCoverage = {
  total: number;
  safe: number;
  placeholder: number;
  percent: number;
};

export function summarizeArtworkCoverage(flags: readonly boolean[]): ArtworkCoverage {
  const total = flags.length;
  const safe = flags.filter(Boolean).length;
  return {
    total,
    safe,
    placeholder: total - safe,
    percent: total ? Number(((safe / total) * 100).toFixed(1)) : 0,
  };
}
