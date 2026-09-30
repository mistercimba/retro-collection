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
    /\b(europe|pal|portugal|united kingdom|uk|france|germany|spain|italy|netherlands|australia|usa|united states|japan|japanese|ntsc|north america|canada)\b/i.test(contents) ||
    /^(?:En|Fr|De|Es|It|Nl|Pt|Sv|No|Da|Fi|Pl|Hr|Ja|Ko|Zh|Ru)(?:,(?:En|Fr|De|Es|It|Nl|Pt|Sv|No|Da|Fi|Pl|Hr|Ja|Ko|Zh|Ru))*$/.test(contents)
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

// LaunchBox already links each front image to a game and platform. Both the game
// and its eligible image must be unique; no regional ranking or fuzzy aliases.
export function findExactLaunchboxMatch(target, games, sourcePlatform) {
  const title = normalizeArtworkTitle(target.title);
  const region = requestedArtworkRegion(target.targetVersion);
  const matches = games.filter((game) => game.platform === sourcePlatform && (
    normalizeArtworkTitle(game.title) === title ||
    game.alternates.some((alternate) => normalizeArtworkTitle(alternate.title) === title &&
      launchboxArtworkRegion(alternate.region) === region)
  ));
  if (matches.length !== 1) return {
    reason: matches.length > 1 ? "ambiguous-launchbox-games" : "no-exact-title-platform-match",
    candidateCount: matches.length,
  };
  const game = matches[0];
  const images = [...new Map(game.images
    .filter((item) => item.fileName && launchboxArtworkRegion(item.region) === region)
    .map((item) => [item.fileName, item])).values()];
  if (images.length !== 1) return {
    reason: images.length > 1 ? "ambiguous-launchbox-covers" : "region-mismatch",
    candidateCount: images.length,
  };
  return { game, image: images[0] };
}

export function launchboxArtworkRegion(region) {
  const value = normalizeArtworkTitle(region);
  if (["europe", "united kingdom", "great britain", "portugal", "france", "germany", "spain", "italy", "ireland", "netherlands", "belgium", "austria", "switzerland", "sweden", "denmark", "norway", "finland"].includes(value)) return "Europe";
  if (["north america", "united states", "usa"].includes(value)) return "US";
  if (value === "japan") return "Japan";
  return null;
}
