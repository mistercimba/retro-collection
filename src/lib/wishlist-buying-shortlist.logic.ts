import type { WantListEntry } from "@/lib/data/types";
import {
  buildWishlistBuyReferenceGuide,
  targetBuyCondition,
  type CexWishlistGuide,
  type WishlistBuyCondition,
  type WishlistBuyConditionReference,
} from "./wishlist-buy-reference.logic";

export type BuyingTarget = Pick<
  WantListEntry,
  "targetId" | "title" | "platform" | "priority" | "targetVersion" |
  "priceCeilingEur" | "planState" | "matchState" | "acquisition"
>;

export type BuyingPriceGuide = {
  looseEur: number | null;
  cibEur: number | null;
  date: string;
};

export type BuyingGroup = "within-ceiling" | "below-reference" | "incomplete";
export type BuyingSort = "priority" | "difference-desc" | "reference-asc" | "platform";

export type BuyingRow = {
  key: string;
  targetId: string;
  title: string;
  platform: string;
  priority: string;
  targetVersion: string;
  condition: WishlistBuyCondition | null;
  ceilingEur: number | null;
  referenceEur: number | null;
  differenceEur: number | null;
  sourceCount: 0 | 1 | 2;
  pricechartingEur: number | null;
  cexMidpointEur: number | null;
  cexBasis: WishlistBuyConditionReference["cexBasis"];
  pricechartingDate: string;
  cexDate: string;
  group: BuyingGroup;
  missingReason: string;
  artworkSrc?: string | null;
};

const priorityRank: Record<string, number> = { grail: 0, alta: 1, media: 2, baixa: 3 };
const groupRank: Record<BuyingGroup, number> = { "within-ceiling": 0, "below-reference": 1, incomplete: 2 };
const missingCex: CexWishlistGuide = {
  source: "CeX indisponível",
  date: "",
  loose: { status: "unavailable", reference: null },
  cib: { status: "unavailable", reference: null },
  generic: { status: "unavailable", reference: null },
};

function money(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function rank(priority: string): number {
  const normalized = priority.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-PT");
  return priorityRank[normalized] ?? 9;
}

// A legacy targetId may be shared by several distinct games/consoles.
// Length-prefix all identity fields to keep the lookup collision-free.
export function wishlistBuyingKey(target: Pick<BuyingTarget, "targetId" | "platform" | "title">): string {
  return [target.targetId, target.platform, target.title].map((value) => String(value.length) + ":" + value).join("");
}

export function selectBuyingTargets<T extends BuyingTarget>(targets: readonly T[]): T[] {
  return targets.filter((target) =>
    target.planState === "active" &&
    target.matchState === "missing" &&
    target.acquisition?.state !== "ordered"
  );
}

export function buildWishlistBuyingRows(
  targets: readonly BuyingTarget[],
  priceGuides: ReadonlyMap<string, BuyingPriceGuide>,
  cexGuides: ReadonlyMap<string, CexWishlistGuide>,
): BuyingRow[] {
  return selectBuyingTargets(targets).map((target) => {
    const key = wishlistBuyingKey(target);
    const condition = targetBuyCondition(target.targetVersion);
    const ceilingEur = money(target.priceCeilingEur);
    const pc = priceGuides.get(key);
    const cex = cexGuides.get(key) ?? missingCex;
    const reference = condition ? buildWishlistBuyReferenceGuide({
      looseEur: money(pc?.looseEur),
      cibEur: money(pc?.cibEur),
    }, cex)[condition] : null;
    const referenceEur = money(reference?.valueEur);
    const differenceEur = referenceEur !== null && ceilingEur !== null
      ? Math.round((ceilingEur - referenceEur) * 100) / 100 : null;
    const group: BuyingGroup = differenceEur === null
      ? "incomplete" : differenceEur >= 0 ? "within-ceiling" : "below-reference";
    const missingReason = !condition
      ? "Define a condição alvo (Loose ou CIB) para comparar sem inventar uma edição."
      : referenceEur === null
        ? "Sem referência fiável para esta condição nas fontes disponíveis."
        : ceilingEur === null
          ? "Define um teto de compra para comparar com a referência."
          : "";
    return {
      key,
      targetId: target.targetId,
      title: target.title,
      platform: target.platform,
      priority: target.priority,
      targetVersion: target.targetVersion,
      condition,
      ceilingEur,
      referenceEur,
      differenceEur,
      sourceCount: reference?.sourceCount ?? 0,
      pricechartingEur: money(reference?.pricechartingEur),
      cexMidpointEur: money(reference?.cexMidpointEur),
      cexBasis: reference?.cexBasis ?? null,
      pricechartingDate: reference?.pricechartingEur != null ? pc?.date ?? "" : "",
      cexDate: reference?.cexMidpointEur != null ? cex.date : "",
      group,
      missingReason,
    };
  });
}

export function sortWishlistBuyingRows(rows: readonly BuyingRow[], sort: BuyingSort = "priority"): BuyingRow[] {
  return [...rows].sort((a, b) => {
    const category = groupRank[a.group] - groupRank[b.group];
    if (category) return category;
    if (sort === "reference-asc") {
      const difference = (a.referenceEur ?? Infinity) - (b.referenceEur ?? Infinity);
      if (difference) return difference;
    }
    if (sort === "difference-desc") {
      const difference = (b.differenceEur ?? -Infinity) - (a.differenceEur ?? -Infinity);
      if (difference) return difference;
    }
    if (sort === "platform") {
      const difference = a.platform.localeCompare(b.platform, "pt-PT");
      if (difference) return difference;
    }
    return rank(a.priority) - rank(b.priority)
      || a.platform.localeCompare(b.platform, "pt-PT")
      || a.title.localeCompare(b.title, "pt-PT")
      || a.key.localeCompare(b.key);
  });
}
