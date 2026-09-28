export function splitGenres(value: string): string[] {
  return [...new Set(value.split(",").map((genre) => genre.trim()).filter(Boolean))];
}

export function collectIndividualGenres(values: string[]): string[] {
  return [...new Set(values.flatMap(splitGenres))].sort((a, b) => a.localeCompare(b, "pt-PT"));
}
