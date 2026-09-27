export function normalizeIGDBTitle(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\[(?:platinum|classics|greatest hits|player's choice|nintendo selects|limited edition|special edition)[^\]]*\]/g, " ")
    .replace(/\((?:platinum|classics|greatest hits|player's choice|nintendo selects|limited edition|special edition)[^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

export function canonicalIGDBTitle(value) {
  return normalizeIGDBTitle(value).replace(/[^a-z0-9]/g, "");
}

export function findIGDBTitleCandidates(title, candidates, platformId) {
  const normalizedTitle = normalizeIGDBTitle(title);
  const exactMatches = candidates.filter((candidate) => normalizeIGDBTitle(candidate.name) === normalizedTitle);
  if (platformId !== undefined) {
    const exactOnPlatform = exactMatches.filter((candidate) => candidate.platforms?.some((entry) => entry.id === platformId));
    if (exactOnPlatform.length) return exactOnPlatform;
  } else if (exactMatches.length) return exactMatches;

  const canonicalTitle = canonicalIGDBTitle(title);
  if (!canonicalTitle) return [];
  const canonicalMatches = candidates.filter((candidate) => canonicalIGDBTitle(candidate.name) === canonicalTitle);
  if (platformId !== undefined) {
    const canonicalOnPlatform = canonicalMatches.filter((candidate) => candidate.platforms?.some((entry) => entry.id === platformId));
    if (canonicalOnPlatform.length) return canonicalOnPlatform;
  }
  return exactMatches.length ? exactMatches : canonicalMatches;
}

export function resolveCollectionPlatform(collectionId, platform, overrides = {}) {
  return overrides[collectionId] ?? platform;
}

export function resolveIGDBMatch(title, platform, candidates, platformIds) {
  const titleMatches = findIGDBTitleCandidates(title, candidates, platformIds[platform]);
  const onPlatform = titleMatches.filter((candidate) => candidate.platforms?.some((entry) => entry.id === platformIds[platform]));
  if (onPlatform.length === 1) return { status: "matched", candidate: onPlatform[0], candidates: onPlatform };
  if (onPlatform.length > 1) return { status: "ambiguous", candidate: null, candidates: onPlatform, reason: "multiple-title-platform-matches" };
  return {
    status: "unmatched",
    candidate: null,
    candidates: titleMatches,
    reason: titleMatches.length ? "title-platform-mismatch" : "no-title-match",
  };
}

export function buildGameMetadataSnapshot(resolvedGroups) {
  const games = {};
  for (const { collectionIds, result, refreshedAt } of resolvedGroups) {
    const data = result.status === "matched"
      ? { matchStatus: "matched", ...result.metadata, refreshedAt }
      : {
          source: "IGDB",
          matchStatus: result.status,
          matchReason: result.reason,
          candidates: result.candidates.map((candidate) => ({ id: candidate.id, name: candidate.name, platforms: (candidate.platforms ?? []).map((entry) => entry.name) })),
          refreshedAt,
        };
    for (const collectionId of collectionIds) games[collectionId] = data;
  }
  return games;
}
