import type { WantTarget } from "./data/types";

export function isOrderedWishlistTarget(
  target: Pick<WantTarget, "acquisition">,
): boolean {
  return target.acquisition?.state === "ordered" && Boolean(target.acquisition.purchaseId);
}

export function wishlistOrderPurchaseId(
  target: Pick<WantTarget, "acquisition">,
): string {
  return isOrderedWishlistTarget(target) ? target.acquisition?.purchaseId ?? "" : "";
}
