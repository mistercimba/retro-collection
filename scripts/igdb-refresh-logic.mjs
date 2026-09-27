export function normalizeIGDBTitle(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\[(?:platinum|classics|greatest hits|player's choice|nintendo selects|limited edition|special edition)[^\]]*\]/g, " ")
    .replace(/\((?:platinum|classics|greatest hits|player's choice|nintendo selects|limited edition|special edition)[^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

export function resolveCollectionPlatform(collectionId, platform, overrides = {}) {
  return overrides[collectionId] ?? platform;
}

export function resolveIGDBMatch(title, platform, candidates, platformIds) {
  const exact = candidates.filter((candidate) => normalizeIGDBTitle(candidate.name) === normalizeIGDBTitle(title));
  const onPlatform = exact.filter((candidate) => candidate.platforms?.some((entry) => entry.id === platformIds[platform]));
  if (onPlatform.length === 1) return { status: "matched", candidate: onPlatform[0], candidates: onPlatform };
  if (onPlatform.length > 1) return { status: "ambiguous", candidate: null, candidates: onPlatform, reason: "multiple-exact-platform-matches" };
  return {
    status: "unmatched",
    candidate: null,
    candidates: exact,
    reason: exact.length ? "exact-title-platform-mismatch" : "no-exact-match",
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
