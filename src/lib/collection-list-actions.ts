"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { collectionListTargetIdentity, hasCollectionListTarget } from "@/lib/collection-lists.logic";
import type { LibraryData, LibraryHistoryAction } from "@/lib/data/types";
import { updateLibrary } from "@/lib/library-store";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

async function guard() {
  if (!(await isAuthenticated())) throw new Error("Não autenticado.");
}

function addHistory(library: LibraryData, input: {
  action: LibraryHistoryAction; entityId: string; title: string; platform?: string; summary: string; details?: string[];
}) {
  library.history ??= [];
  library.history.unshift({
    id: `H-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    platform: input.platform ?? "",
    details: input.details ?? [],
    ...input,
  });
}

const listHref = (listId: string) => `/lists/${encodeURIComponent(listId)}`;
function revalidateLists(listId?: string) {
  revalidatePath("/lists"); revalidatePath("/"); revalidatePath("/history");
  if (listId) revalidatePath(listHref(listId));
}

export async function createCollectionList(form: FormData) {
  await guard();
  const name = text(form, "name");
  if (!name) return;
  const description = text(form, "description");
  const id = `LIST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await updateLibrary((library) => {
    library.collectionLists ??= [];
    library.collectionLists.push({ id, name, description, createdAt: new Date().toISOString(), targets: [] });
    addHistory(library, { action: "list.create", entityId: id, title: name, summary: "Lista criada", details: description ? [description] : [] });
    return library;
  });
  revalidateLists(id);
  redirect(listHref(id));
}

export async function editCollectionList(form: FormData) {
  await guard();
  const listId = text(form, "listId");
  const name = text(form, "name");
  if (!listId || !name) return;
  await updateLibrary((library) => {
    const list = library.collectionLists.find((item) => item.id === listId);
    if (!list) return library;
    const previousName = list.name;
    const previousDescription = list.description;
    list.name = name;
    list.description = text(form, "description");
    const details: string[] = [];
    if (previousName !== list.name) details.push("nome");
    if (previousDescription !== list.description) details.push("descrição");
    if (details.length) addHistory(library, { action: "list.edit", entityId: list.id, title: list.name, summary: `Alterado: ${details.join(", ")}`, details });
    return library;
  });
  revalidateLists(listId);
  redirect(listHref(listId));
}

export async function removeCollectionList(form: FormData) {
  await guard();
  const listId = text(form, "listId");
  if (!listId) return;
  await updateLibrary((library) => {
    const list = library.collectionLists.find((item) => item.id === listId);
    if (!list) return library;
    library.collectionLists = library.collectionLists.filter((item) => item.id !== listId);
    addHistory(library, { action: "list.remove", entityId: list.id, title: list.name, summary: `Lista removida · ${list.targets.length} ${list.targets.length === 1 ? "alvo" : "alvos"}` });
    return library;
  });
  revalidateLists();
  redirect("/lists");
}

export async function addCollectionListTarget(form: FormData) {
  await guard();
  const listId = text(form, "listId");
  const title = text(form, "title");
  const platform = text(form, "platform");
  if (!listId || !title || !platform) return;
  await updateLibrary((library) => {
    const list = library.collectionLists.find((item) => item.id === listId);
    if (!list || hasCollectionListTarget(list, { title, platform })) return library;
    const target = { id: `TARGET-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title, platform };
    list.targets.push(target);
    list.targets.sort((a, b) => a.platform.localeCompare(b.platform, "pt-PT") || a.title.localeCompare(b.title, "pt-PT"));
    addHistory(library, { action: "list.target.add", entityId: target.id, title: target.title, platform: target.platform, summary: `Adicionado à lista “${list.name}”`, details: [collectionListTargetIdentity(target)] });
    return library;
  });
  revalidateLists(listId);
  redirect(listHref(listId));
}

export async function removeCollectionListTarget(form: FormData) {
  await guard();
  const listId = text(form, "listId");
  const targetId = text(form, "targetId");
  if (!listId || !targetId) return;
  await updateLibrary((library) => {
    const list = library.collectionLists.find((item) => item.id === listId);
    const target = list?.targets.find((item) => item.id === targetId);
    if (!list || !target) return library;
    list.targets = list.targets.filter((item) => item.id !== targetId);
    addHistory(library, { action: "list.target.remove", entityId: target.id, title: target.title, platform: target.platform, summary: `Removido da lista “${list.name}”` });
    return library;
  });
  revalidateLists(listId);
  redirect(listHref(listId));
}
