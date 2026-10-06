import type { CollectionGame, CollectionList, WantListEntry } from "./data/types";
import { collectionListTargetIdentity, resolveCollectionList } from "./collection-lists.logic";
import { collectionCopyIdentity } from "./copy-groups.logic";
import { isOrderedWishlistTarget } from "./wishlist-acquisition.logic";

export type NextObjectiveSuggestion = {
  target: WantListEntry;
  reason: string;
  kind: "list-completion" | "series" | "priority";
  score: number;
};

const priorityScore: Record<string, number> = {
  grail: 90,
  alta: 65,
  média: 35,
  media: 35,
  baixa: 10,
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function seriesKey(title: string): string {
  const beforeSubtitle = title.split(":")[0] ?? title;
  const tokens = normalize(beforeSubtitle)
    .split(" ")
    .filter(Boolean)
    .filter((token) => !["the", "a", "an", "of", "and", "de", "da", "do"].includes(token));

  while (tokens.length > 1 && /^(?:\d+|[ivxlcdm]+)$/.test(tokens[tokens.length - 1])) tokens.pop();
  return tokens.length >= 2 ? tokens.slice(0, 3).join(" ") : "";
}

function activeTarget(target: WantListEntry) {
  return !isOrderedWishlistTarget(target) &&
    target.planState === "active" &&
    target.matchState !== "acquired";
}

export function suggestNextObjective(
  targets: WantListEntry[],
  collection: CollectionGame[],
  lists: CollectionList[],
  currentTargetId = "",
): NextObjectiveSuggestion | null {
  const active = targets.filter((target) => activeTarget(target) && target.targetId !== currentTargetId);
  if (!active.length) return null;

  const owned = collection.filter((game) => game.keepStatus === "Collection");
  const ownedSeries = new Map<string, number>();
  for (const game of owned) {
    const key = seriesKey(game.title);
    if (!key) continue;
    ownedSeries.set(key, (ownedSeries.get(key) ?? 0) + 1);
  }

  const listContext = new Map<string, { score: number; reason: string }>();
  for (const list of lists) {
    const resolved = resolveCollectionList(list, owned);
    if (!resolved.totalCount || resolved.ownedCount >= resolved.totalCount) continue;
    const missingCount = resolved.totalCount - resolved.ownedCount;
    for (const missing of resolved.targets.filter((target) => !target.ownedGame)) {
      const key = collectionListTargetIdentity(missing);
      const completesList = missingCount === 1;
      const score = completesList
        ? 500 + resolved.totalCount * 2
        : 170 + Math.round((resolved.ownedCount / resolved.totalCount) * 100);
      const reason = completesList
        ? `Completa a lista “${list.name}” (${resolved.ownedCount}/${resolved.totalCount})`
        : `Avança a lista “${list.name}” (${resolved.ownedCount}/${resolved.totalCount})`;
      const previous = listContext.get(key);
      if (!previous || score > previous.score) listContext.set(key, { score, reason });
    }
  }

  const ranked = active.map((target) => {
    const identity = collectionCopyIdentity(target);
    const list = listContext.get(identity);
    if (list) return { target, reason: list.reason, kind: "list-completion" as const, score: list.score + (priorityScore[normalize(target.priority)] ?? 0) };

    const key = seriesKey(target.title);
    const seriesOwned = key ? ownedSeries.get(key) ?? 0 : 0;
    if (seriesOwned >= 1) {
      return {
        target,
        reason: seriesOwned === 1
          ? "Continua uma série que já tens na coleção"
          : `Continua uma série com ${seriesOwned} jogos que já tens`,
        kind: "series" as const,
        score: 130 + Math.min(seriesOwned, 5) * 12 + (priorityScore[normalize(target.priority)] ?? 0),
      };
    }

    const priority = normalize(target.priority);
    return {
      target,
      reason: priority === "grail"
        ? "Está marcado como Grail na tua Wishlist"
        : priority === "alta"
          ? "É um alvo de prioridade alta na tua Wishlist"
          : "É um alvo ativo da tua Wishlist",
      kind: "priority" as const,
      score: priorityScore[priority] ?? 0,
    };
  });

  ranked.sort((a, b) =>
    b.score - a.score ||
    a.target.platform.localeCompare(b.target.platform, "pt-PT") ||
    a.target.title.localeCompare(b.target.title, "pt-PT")
  );

  const best = ranked[0];
  return best.score >= 35 ? best : null;
}
