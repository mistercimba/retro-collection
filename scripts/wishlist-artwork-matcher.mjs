import path from "node:path";

export function normalizeArtworkTitle(value) {
  return String(value ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/&/g, " and ").replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()
    .replace(/^(the|a|an)\s+/, "");
}

export function requestedArtworkRegion(targetVersion = "") {
  const value = normalizeArtworkTitle(targetVersion);
  if (/\b(ntsc j|japan|japanese|japao|japones|jp)\b/.test(value)) return "Japan";
  if (/\b(ntsc u|usa|united states|north american|north america|norte americano|us)\b/.test(value)) return "US";
  return "Europe";
}

export function sourceArtworkRegion(filePath) {
  const base = path.posix.basename(filePath);
  const groups = [...base.matchAll(/\(([^)]*)\)/g)].map((match) => normalizeArtworkTitle(match[1]));
  const joined = groups.join(" ");
  const europe = /\b(europe|pal|portugal|united kingdom|great britain|uk|france|germany|spain|italy|netherlands|australia|ireland|belgium|sweden|norway|denmark|finland|austria|switzerland)\b/.test(joined);
  const us = /\b(usa|united states|ntsc u|north america|canada)\b/.test(joined);
  const japan = /\b(japan|japanese|ntsc j)\b/.test(joined);
  if (Number(europe) + Number(us) + Number(japan) !== 1) return null;
  if (europe) return "Europe";
  if (us) return "US";
  return "Japan";
}

export function sourceArtworkTitle(filePath) {
  let title = path.posix.basename(filePath).replace(/\.[^.]+$/, "");
  title = title.replace(/\s*\(([^)]*)\)/g, (group, contents) =>
    /\b(europe|pal|portugal|united kingdom|uk|france|germany|spain|italy|netherlands|australia|usa|united states|japan|japanese|ntsc|north america|canada)\b/i.test(contents)
      ? " "
      : group,
  );
  title = title.replace(/^(.*?),\s*The$/i, "The $1").replace(/^(.*?),\s*A$/i, "A $1");
  return title.replace(/\s+/g, " ").trim();
}

export function findExactSourceMatches(target, candidates) {
  const title = normalizeArtworkTitle(target.title);
  const region = requestedArtworkRegion(target.targetVersion);
  return candidates.filter((candidate) =>
    normalizeArtworkTitle(candidate.title) === title && candidate.region === region,
  );
}
