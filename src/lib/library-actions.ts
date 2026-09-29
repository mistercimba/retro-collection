"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { platformSlug } from "@/lib/data/platforms";
import type { CollectionGame, PurchaseRecord, WantTarget } from "@/lib/data/types";
import { updateLibrary } from "@/lib/library-store";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const money = (form: FormData, key: string) => {
  const raw = text(form, key).replace(",", ".");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
};

async function guard() {
  if (!(await isAuthenticated())) throw new Error("Não autenticado.");
}

function wishlistDetailPath(targetId: string, platform: string, title: string) {
  const params = new URLSearchParams({
    platform,
    title,
    from: `/platform/${platformSlug(platform)}?tab=wishlist`,
  });
  return `/wish/${encodeURIComponent(targetId)}?${params.toString()}`;
}

function nextId(platform: string, games: CollectionGame[]) {
  const same = games.filter((game) => game.platform === platform);
  const prefixes = same.map((game) => game.collectionId.match(/^([A-Z0-9]+)-\d+$/)?.[1]).filter(Boolean) as string[];
  const inferred = prefixes.sort((a, b) =>
    prefixes.filter((value) => value === b).length - prefixes.filter((value) => value === a).length,
  )[0];
  const fallback = platform.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 6) || "GAME";
  const prefix = inferred ?? fallback;
  const max = same.reduce((current, game) => {
    const match = game.collectionId.match(new RegExp(`^${prefix}-(\\d+)$`));
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

function blankGame(input: {
  collectionId: string;
  title: string;
  platform: string;
  edition: string;
  region: string;
  language: string;
  condition: string;
  completeness: string;
  acquiredDate: string;
  purchaseId: string;
  paid: number | null;
  notes: string;
}): CollectionGame {
  const complete = /cib|complete|completo/i.test(input.completeness);
  const loose = /loose|solto/i.test(input.completeness);
  return {
    collectionId: input.collectionId,
    catalogId: "",
    itemType: "Game",
    title: input.title,
    platform: input.platform,
    edition: input.edition || "Standard",
    region: input.region,
    language: input.language,
    media: "Yes",
    box: complete ? "Yes" : loose ? "No" : "",
    manual: complete ? "Yes" : loose ? "No" : "",
    extras: "",
    label: "",
    sealed: /sealed|selado/i.test(input.completeness) ? "Yes" : "No",
    overallStatus: input.completeness,
    conditionGrade: input.condition,
    keepStatus: "Collection",
    acquiredDate: input.acquiredDate,
    purchaseId: input.purchaseId,
    allocatedCostEur: input.paid,
    marketValueEur: null,
    cexCashEur: null,
    needsReview: false,
    migrationConfidence: "App",
    notes: input.notes,
    legacyName: input.title,
    audit: null,
  };
}

function purchaseFromForm(form: FormData, purchaseId: string, previous?: PurchaseRecord): PurchaseRecord {
  const paid = money(form, "paid");
  return {
    purchaseId,
    date: text(form, "purchaseDate"),
    source: text(form, "source"),
    seller: text(form, "seller"),
    listingUrl: text(form, "listingUrl"),
    itemPriceEur: paid,
    shippingEur: previous?.shippingEur ?? null,
    feesEur: previous?.feesEur ?? null,
    totalPaidEur: paid,
    bundleId: previous?.bundleId ?? "",
    notes: text(form, "purchaseNotes"),
  };
}

export async function editGame(form: FormData) {
  await guard();
  const id = text(form, "collectionId");
  if (!id) return;

  await updateLibrary((library) => {
    const index = library.collection.findIndex((game) => game.collectionId === id);
    if (index < 0) return library;

    const current = library.collection[index];
    const paid = money(form, "paid");
    const purchaseDate = text(form, "purchaseDate");
    const purchaseInput = Boolean(current.purchaseId) || paid !== null || purchaseDate || text(form, "source") || text(form, "seller") || text(form, "listingUrl") || text(form, "purchaseNotes");
    let purchaseId = current.purchaseId;

    if (purchaseInput) {
      const existingIndex = purchaseId ? library.purchases.findIndex((purchase) => purchase.purchaseId === purchaseId) : -1;
      if (!purchaseId) purchaseId = `APP-${Date.now()}`;
      const previous = existingIndex >= 0 ? library.purchases[existingIndex] : undefined;
      const nextPurchase = purchaseFromForm(form, purchaseId, previous);
      if (existingIndex >= 0) library.purchases[existingIndex] = nextPurchase;
      else library.purchases.push(nextPurchase);
    }

    library.collection[index] = {
      ...current,
      edition: text(form, "edition"),
      region: text(form, "region"),
      language: text(form, "language"),
      overallStatus: text(form, "overallStatus"),
      conditionGrade: text(form, "conditionGrade"),
      acquiredDate: purchaseDate || current.acquiredDate,
      purchaseId,
      allocatedCostEur: paid,
      notes: text(form, "notes"),
    };
    return library;
  });

  revalidatePath(`/game/${encodeURIComponent(id)}`);
  revalidatePath("/");
  revalidatePath("/collection");
}

export async function addCollectionGame(form: FormData) {
  await guard();
  const title = text(form, "title");
  const platform = text(form, "platform");
  if (!title || !platform) return;
  let created = "";

  await updateLibrary((library) => {
    const collectionId = nextId(platform, library.collection);
    const paid = money(form, "paid");
    const date = text(form, "purchaseDate");
    const hasPurchase = paid !== null || date || text(form, "source") || text(form, "seller") || text(form, "listingUrl");
    const purchaseId = hasPurchase ? `APP-${Date.now()}` : "";
    created = collectionId;

    if (hasPurchase) library.purchases.push(purchaseFromForm(form, purchaseId));

    library.collection.push(blankGame({
      collectionId,
      title,
      platform,
      edition: text(form, "edition"),
      region: text(form, "region"),
      language: text(form, "language"),
      condition: text(form, "conditionGrade"),
      completeness: text(form, "overallStatus"),
      acquiredDate: date,
      purchaseId,
      paid,
      notes: text(form, "notes"),
    }));
    return library;
  });

  revalidatePath("/");
  revalidatePath("/collection");
  revalidatePath(`/platform/${platformSlug(platform)}`);
  if (created) redirect(`/game/${encodeURIComponent(created)}`);
}

export async function removeCollectionGame(form: FormData) {
  await guard();
  const id = text(form, "collectionId");
  let platform = "";
  await updateLibrary((library) => {
    const game = library.collection.find((item) => item.collectionId === id);
    platform = game?.platform ?? "";
    const purchaseId = game?.purchaseId ?? "";
    library.collection = library.collection.filter((item) => item.collectionId !== id);
    library.valuations = library.valuations.filter((item) => item.collectionId !== id);
    if (purchaseId && !library.collection.some((item) => item.purchaseId === purchaseId)) {
      library.purchases = library.purchases.filter((item) => item.purchaseId !== purchaseId);
    }
    return library;
  });
  revalidatePath("/");
  revalidatePath("/collection");
  if (platform) redirect(`/platform/${platformSlug(platform)}`);
  redirect("/collection");
}

export async function addWishlistGame(form: FormData) {
  await guard();
  const title = text(form, "title");
  const platform = text(form, "platform");
  if (!title || !platform) return;
  const target: WantTarget = {
    platform,
    priority: text(form, "priority") || "Média",
    targetId: `APP-${Date.now()}`,
    title,
    reason: text(form, "reason"),
    targetVersion: text(form, "targetVersion"),
    priceCeilingEur: money(form, "priceCeilingEur"),
    status: "ACTIVE",
    notes: text(form, "notes"),
  };
  await updateLibrary((library) => {
    library.wishlist.push(target);
    return library;
  });
  revalidatePath("/want");
  revalidatePath(`/platform/${platformSlug(platform)}`);
  redirect(wishlistDetailPath(target.targetId, target.platform, target.title));
}

export async function editWishlistGame(form: FormData) {
  await guard();
  const targetId = text(form, "targetId");
  const title = text(form, "title");
  const platform = text(form, "platform");
  await updateLibrary((library) => {
    library.wishlist = library.wishlist.map((target) =>
      target.targetId === targetId && target.title === title && target.platform === platform
        ? {
            ...target,
            priority: text(form, "priority") || target.priority,
            targetVersion: text(form, "targetVersion"),
            priceCeilingEur: money(form, "priceCeilingEur"),
            reason: text(form, "reason"),
            notes: text(form, "notes"),
          }
        : target,
    );
    return library;
  });
  revalidatePath("/want");
  revalidatePath(`/platform/${platformSlug(platform)}`);
  revalidatePath(`/wish/${encodeURIComponent(targetId)}`);
  redirect(wishlistDetailPath(targetId, platform, title));
}

export async function removeWishlistGame(form: FormData) {
  await guard();
  const targetId = text(form, "targetId");
  const title = text(form, "title");
  const platform = text(form, "platform");
  await updateLibrary((library) => {
    library.wishlist = library.wishlist.filter((target) =>
      !(target.targetId === targetId && target.title === title && target.platform === platform),
    );
    return library;
  });
  revalidatePath("/want");
  revalidatePath(`/platform/${platformSlug(platform)}`);
  revalidatePath(`/wish/${encodeURIComponent(targetId)}`);
  redirect(`/platform/${platformSlug(platform)}?tab=wishlist`);
}

export async function purchaseWishlistGame(form: FormData) {
  await guard();
  const targetId = text(form, "targetId");
  const title = text(form, "title");
  const platform = text(form, "platform");
  const paid = money(form, "paid");
  const source = text(form, "source");
  const date = text(form, "purchaseDate") || new Date().toISOString().slice(0, 10);
  let created = "";

  await updateLibrary((library) => {
    const target = library.wishlist.find((item) => item.targetId === targetId && item.title === title && item.platform === platform);
    if (!target) return library;

    const collectionId = nextId(platform, library.collection);
    const purchaseId = `APP-${Date.now()}`;
    created = collectionId;

    library.collection.push(blankGame({
      collectionId,
      title: target.title,
      platform: target.platform,
      edition: text(form, "edition"),
      region: text(form, "region"),
      language: text(form, "language"),
      condition: text(form, "conditionGrade"),
      completeness: text(form, "overallStatus"),
      acquiredDate: date,
      purchaseId,
      paid,
      notes: text(form, "notes"),
    }));
    library.purchases.push({
      ...purchaseFromForm(form, purchaseId),
      date,
      source,
    });
    library.wishlist = library.wishlist.filter((item) =>
      !(item.targetId === targetId && item.title === title && item.platform === platform),
    );
    return library;
  });

  revalidatePath("/");
  revalidatePath("/collection");
  revalidatePath("/want");
  revalidatePath(`/platform/${platformSlug(platform)}`);
  if (created) redirect(`/game/${encodeURIComponent(created)}`);
}
