import type { CollectionGame } from "@/lib/data/types";

type CopyIdentityItem = Pick<CollectionGame, "collectionId" | "title" | "platform" | "keepStatus" | "acquiredDate">;

function normalizeCopyIdentityPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .replace(/\s+/g, " ")
    .trim();
}

export function collectionCopyIdentity(item: Pick<CopyIdentityItem, "title" | "platform">): string {
  return `${normalizeCopyIdentityPart(item.platform)}|${normalizeCopyIdentityPart(item.title)}`;
}

export function selectPhysicalCopies<T extends CopyIdentityItem>(
  items: readonly T[],
  current: Pick<CopyIdentityItem, "collectionId" | "title" | "platform">,
): T[] {
  const identity = collectionCopyIdentity(current);
  return items
    .filter((item) =>
      collectionCopyIdentity(item) === identity
      && (item.keepStatus !== "Sold" || item.collectionId === current.collectionId)
    )
    .sort((a, b) => {
      const leftDate = a.acquiredDate.trim();
      const rightDate = b.acquiredDate.trim();
      if (leftDate !== rightDate) {
        if (!leftDate) return 1;
        if (!rightDate) return -1;
        return leftDate.localeCompare(rightDate);
      }
      return a.collectionId.localeCompare(b.collectionId, "pt-PT");
    });
}
