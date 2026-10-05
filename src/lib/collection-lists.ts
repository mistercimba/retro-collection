import "server-only";
import { getLibrary } from "@/lib/library-store";
import { resolveCollectionList, type ResolvedCollectionList } from "@/lib/collection-lists.logic";

export async function getResolvedCollectionLists(): Promise<ResolvedCollectionList[]> {
  const library = await getLibrary();
  return library.collectionLists
    .map((list) => resolveCollectionList(list, library.collection))
    .sort((a, b) => a.list.name.localeCompare(b.list.name, "pt-PT"));
}

export async function getResolvedCollectionList(listId: string): Promise<ResolvedCollectionList | null> {
  const library = await getLibrary();
  const list = library.collectionLists.find((item) => item.id === listId);
  return list ? resolveCollectionList(list, library.collection) : null;
}
