export function normalizeIGDBTitle(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\[(?:platinum|classics|greatest hits|player's choice|nintendo selects|limited edition|special edition)[^\]]*\]/g, " ")
    .replace(/\((?:platinum|classics|greatest hits|player's choice|nintendo selects|limited edition|special edition)[^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

export function canonicalIGDBTitle(value) {
  return normalizeIGDBTitle(value).replace(/[^a-z0-9]/g, "");
}

export function isIGDBTitleEquivalent(left, right) {
  const leftNormalized = normalizeIGDBTitle(left);
  const rightNormalized = normalizeIGDBTitle(right);
  if (leftNormalized && leftNormalized === rightNormalized) return true;
  const leftCanonical = canonicalIGDBTitle(left);
  return Boolean(leftCanonical && leftCanonical === canonicalIGDBTitle(right));
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

export function resolveIGDBMatchWithAliases(title, platform, candidates, aliases, platformIds) {
  const direct = resolveIGDBMatch(title, platform, candidates, platformIds);
  if (direct.status === "matched") return { ...direct, matchMethod: "title", relevantAliases: [] };

  const platformId = platformIds[platform];
  const relevantAliases = aliases.filter((alias) => isIGDBTitleEquivalent(title, alias.name));
  const directPlatformMatches = findIGDBTitleCandidates(title, candidates, platformId)
    .filter((candidate) => candidate.platforms?.some((entry) => entry.id === platformId));
  const aliasPlatformMatches = relevantAliases
    .map((alias) => alias.game)
    .filter((candidate) => candidate.platforms?.some((entry) => entry.id === platformId));
  const uniquePlatformGames = [...new Map([...directPlatformMatches, ...aliasPlatformMatches].map((candidate) => [candidate.id, candidate])).values()];

  if (uniquePlatformGames.length === 1) {
    const candidate = uniquePlatformGames[0];
    const resolvedByAlias = aliasPlatformMatches.some((match) => match.id === candidate.id);
    return {
      status: "matched",
      candidate,
      candidates: [candidate],
      matchMethod: resolvedByAlias ? "alias" : "title",
      relevantAliases,
    };
  }
  if (uniquePlatformGames.length > 1) {
    return { status: "ambiguous", candidate: null, candidates: uniquePlatformGames, reason: "multiple-title-platform-matches", relevantAliases };
  }

  const allCandidates = [...new Map([
    ...direct.candidates,
    ...relevantAliases.map((alias) => alias.game),
  ].map((candidate) => [candidate.id, candidate])).values()];
  return {
    status: "unmatched",
    candidate: null,
    candidates: allCandidates,
    reason: allCandidates.length ? "title-platform-mismatch" : direct.reason,
    relevantAliases,
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
