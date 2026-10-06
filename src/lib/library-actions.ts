"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { platformSlug } from "@/lib/data/platforms";
import type { CanonicalGameIdentity, CollectionGame, LibraryData, LibraryHistoryAction, PurchaseRecord, WantTarget } from "@/lib/data/types";
import { updateLibrary } from "@/lib/library-store";
import { deleteOwnedCopyPhoto } from "@/lib/owned-copy-photos";
import { resolveCanonicalGame } from "@/lib/igdb-catalog";
import { ensureCanonicalArtwork } from "@/lib/catalog-artwork";
import {
  componentStateToLibraryValue,
  derivePhysicalCopyStatus,
  physicalCopyNeedsReview,
  physicalCopyProfile,
  type PhysicalComponentKey,
  type PhysicalComponentState,
} from "@/lib/physical-copy-profile.logic";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const money = (form: FormData, key: string) => {
  const raw = text(form, key).replace(",", ".");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
};

function addHistory(
  library: LibraryData,
  input: {
    action: LibraryHistoryAction;
    entityId: string;
    title: string;
    platform: string;
    summary: string;
    details?: string[];
  },
) {
  library.history ??= [];
  library.history.unshift({
    id: `H-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    details: input.details ?? [],
    ...input,
  });
}

function changed(label: string, before: unknown, after: unknown, details: string[]) {
  const left = before === null || before === undefined ? "" : String(before).trim();
  const right = after === null || after === undefined ? "" : String(after).trim();
  if (left !== right) details.push(label);
}

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

type PhysicalAddState = {
  media: string;
  box: string;
  manual: string;
  sealed: string;
  completeness: string;
  needsReview: boolean;
};

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
  canonical?: CanonicalGameIdentity;
  physical?: PhysicalAddState;
}): CollectionGame {
  const complete = /cib|complete|completo/i.test(input.completeness);
  const loose = /loose|solto/i.test(input.completeness);
  return {
    collectionId: input.collectionId,
    catalogId: input.canonical ? `IGDB:${input.canonical.sourceGameId}` : "",
    itemType: "Game",
    title: input.title,
    platform: input.platform,
    edition: input.edition || "Standard",
    region: input.region,
    language: input.language,
    media: input.physical?.media ?? "Yes",
    box: input.physical?.box ?? (complete ? "Yes" : loose ? "No" : ""),
    manual: input.physical?.manual ?? (complete ? "Yes" : loose ? "No" : ""),
    extras: "",
    label: "",
    sealed: input.physical?.sealed ?? (/sealed|selado/i.test(input.completeness) ? "Yes" : "No"),
    overallStatus: input.physical?.completeness ?? input.completeness,
    conditionGrade: input.condition,
    keepStatus: "Collection",
    acquiredDate: input.acquiredDate,
    purchaseId: input.purchaseId,
    allocatedCostEur: input.paid,
    marketValueEur: null,
    cexCashEur: null,
    needsReview: input.physical?.needsReview ?? false,
    migrationConfidence: input.canonical ? "App · canonical IGDB" : "App · manual",
    notes: input.notes,
    legacyName: input.title,
    catalog: input.canonical,
    photos: [],
    audit: null,
  };
}

function physicalState(form: FormData, platform: string): PhysicalAddState {
  const profile = physicalCopyProfile(platform);
  const sealed = text(form, "sealed") === "yes";
  const states: Partial<Record<PhysicalComponentKey, PhysicalComponentState>> = {};
  for (const component of profile.components) {
    const raw = text(form, `component_${component.key}`);
    states[component.key] = raw === "yes" || raw === "no" ? raw : "unknown";
  }
  return {
    media: componentStateToLibraryValue(states.media),
    box: componentStateToLibraryValue(states.box),
    manual: componentStateToLibraryValue(states.manual),
    sealed: sealed ? "Yes" : "No",
    completeness: derivePhysicalCopyStatus(profile, states, sealed),
    needsReview: sealed ? false : physicalCopyNeedsReview(profile, states),
  };
}

function normalizedEdition(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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
    const previousPurchase = current.purchaseId
      ? structuredClone(library.purchases.find((purchase) => purchase.purchaseId === current.purchaseId))
      : undefined;
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

    const nextGame = {
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
    const details: string[] = [];
    changed("edição", current.edition, nextGame.edition, details);
    changed("região", current.region, nextGame.region, details);
    changed("idioma", current.language, nextGame.language, details);
    changed("completude", current.overallStatus, nextGame.overallStatus, details);
    changed("condição", current.conditionGrade, nextGame.conditionGrade, details);
    changed("notas", current.notes, nextGame.notes, details);
    const nextPurchase = purchaseId ? library.purchases.find((purchase) => purchase.purchaseId === purchaseId) : undefined;
    changed("preço pago", previousPurchase?.totalPaidEur ?? current.allocatedCostEur, nextPurchase?.totalPaidEur ?? paid, details);
    changed("data de compra", previousPurchase?.date ?? current.acquiredDate, nextPurchase?.date ?? purchaseDate, details);
    changed("origem da compra", previousPurchase?.source, nextPurchase?.source, details);
    changed("vendedor", previousPurchase?.seller, nextPurchase?.seller, details);
    changed("link do anúncio", previousPurchase?.listingUrl, nextPurchase?.listingUrl, details);
    changed("notas da compra", previousPurchase?.notes, nextPurchase?.notes, details);

    library.collection[index] = nextGame;
    if (details.length) {
      addHistory(library, {
        action: "collection.edit",
        entityId: current.collectionId,
        title: current.title,
        platform: current.platform,
        summary: `Alterado: ${details.join(", ")}`,
        details,
      });
    }
    return library;
  });

  revalidatePath(`/game/${encodeURIComponent(id)}`);
  revalidatePath("/");
  revalidatePath("/collection");
  revalidatePath("/history");
}

export async function addCollectionGame(form: FormData) {
  await guard();

  const manual = text(form, "manualMode") === "1";
  const requestedGameId = Number(text(form, "catalogGameId"));
  const requestedPlatformId = Number(text(form, "catalogPlatformId"));
  let canonical: CanonicalGameIdentity | undefined;

  if (!manual && Number.isSafeInteger(requestedGameId) && Number.isSafeInteger(requestedPlatformId)) {
    canonical = (await resolveCanonicalGame(requestedGameId, requestedPlatformId)) ?? undefined;
    if (!canonical) throw new Error("Não foi possível confirmar a identidade selecionada no catálogo.");
  }

  const title = canonical?.title ?? text(form, "title");
  const platform = canonical?.platform ?? text(form, "platform");
  if (!title || !platform) return;

  const edition = text(form, "edition") || canonical?.edition || "Standard";
  if (canonical) {
    const catalogEditionStillMatches = normalizedEdition(edition) === normalizedEdition(canonical.edition);
    if (catalogEditionStillMatches && canonical.coverImageId) {
      try {
        canonical = { ...canonical, artwork: await ensureCanonicalArtwork(canonical) };
      } catch (error) {
        console.warn("catalog_artwork_import_failed", {
          gameId: canonical.sourceGameId,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }
  }

  const physical = canonical ? physicalState(form, platform) : undefined;
  let created = "";

  await updateLibrary((library) => {
    const collectionId = nextId(platform, library.collection);
    const paid = money(form, "paid");
    const date = text(form, "purchaseDate");
    const hasPurchase = paid !== null || date || text(form, "source") || text(form, "seller") || text(form, "listingUrl");
    const purchaseId = hasPurchase ? `APP-${Date.now()}` : "";
    created = collectionId;

    if (hasPurchase) library.purchases.push(purchaseFromForm(form, purchaseId));

    const completeness = physical?.completeness ?? text(form, "overallStatus");
    library.collection.push(blankGame({
      collectionId,
      title,
      platform,
      edition,
      region: text(form, "region"),
      language: text(form, "language"),
      condition: text(form, "conditionGrade"),
      completeness,
      acquiredDate: date,
      purchaseId,
      paid,
      notes: text(form, "notes"),
      canonical,
      physical,
    }));
    addHistory(library, {
      action: "collection.add",
      entityId: collectionId,
      title,
      platform,
      summary: paid === null ? "Adicionado à coleção" : `Adicionado à coleção · ${paid.toFixed(2)} €`,
      details: [
        completeness,
        text(form, "conditionGrade"),
        canonical ? `IGDB #${canonical.sourceGameId}` : "Identidade manual",
      ].filter(Boolean),
    });
    return library;
  });

  revalidatePath("/");
  revalidatePath("/collection");
  revalidatePath("/history");
  revalidatePath(`/platform/${platformSlug(platform)}`);
  if (created) redirect(`/game/${encodeURIComponent(created)}`);
}

export async function removeCollectionGame(form: FormData) {
  await guard();
  const id = text(form, "collectionId");
  let platform = "";
  let photoPaths: string[] = [];
  await updateLibrary((library) => {
    const game = library.collection.find((item) => item.collectionId === id);
    platform = game?.platform ?? "";
    const purchaseId = game?.purchaseId ?? "";
    photoPaths = game?.photos?.map((photo) => photo.pathname) ?? [];
    library.collection = library.collection.filter((item) => item.collectionId !== id);
    library.valuations = library.valuations.filter((item) => item.collectionId !== id);
    if (purchaseId && !library.collection.some((item) => item.purchaseId === purchaseId)) {
      library.purchases = library.purchases.filter((item) => item.purchaseId !== purchaseId);
    }
    if (game) {
      addHistory(library, {
        action: "collection.remove",
        entityId: game.collectionId,
        title: game.title,
        platform: game.platform,
        summary: "Removido da coleção",
      });
    }
    return library;
  });
  for (const pathname of photoPaths) {
    try {
      await deleteOwnedCopyPhoto(pathname);
    } catch (error) {
      console.warn("Could not remove owned-copy photo blob after deleting collection item.", error);
    }
  }
  revalidatePath("/");
  revalidatePath("/collection");
  revalidatePath("/history");
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
    addHistory(library, {
      action: "wishlist.add",
      entityId: target.targetId,
      title: target.title,
      platform: target.platform,
      summary: target.priceCeilingEur === null
        ? "Adicionado à wishlist"
        : `Adicionado à wishlist · referência manual ${target.priceCeilingEur.toFixed(2)} €`,
      details: [target.priority, target.targetVersion].filter(Boolean),
    });
    return library;
  });
  revalidatePath("/want");
  revalidatePath("/history");
  revalidatePath(`/platform/${platformSlug(platform)}`);
  redirect(wishlistDetailPath(target.targetId, target.platform, target.title));
}

export async function editWishlistGame(form: FormData) {
  await guard();
  const targetId = text(form, "targetId");
  const title = text(form, "title");
  const platform = text(form, "platform");
  await updateLibrary((library) => {
    const index = library.wishlist.findIndex((target) =>
      target.targetId === targetId && target.title === title && target.platform === platform
    );
    if (index < 0) return library;
    const current = library.wishlist[index];
    const next = {
      ...current,
      priority: text(form, "priority") || current.priority,
      targetVersion: text(form, "targetVersion"),
      priceCeilingEur: money(form, "priceCeilingEur"),
      reason: text(form, "reason"),
      notes: text(form, "notes"),
    };
    const details: string[] = [];
    changed("prioridade", current.priority, next.priority, details);
    changed("versão alvo", current.targetVersion, next.targetVersion, details);
    changed("referência manual", current.priceCeilingEur, next.priceCeilingEur, details);
    changed("motivo", current.reason, next.reason, details);
    changed("notas", current.notes, next.notes, details);
    library.wishlist[index] = next;
    if (details.length) {
      addHistory(library, {
        action: "wishlist.edit",
        entityId: current.targetId,
        title: current.title,
        platform: current.platform,
        summary: `Alterado: ${details.join(", ")}`,
        details,
      });
    }
    return library;
  });
  revalidatePath("/want");
  revalidatePath("/history");
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
    const target = library.wishlist.find((item) =>
      item.targetId === targetId && item.title === title && item.platform === platform
    );
    library.wishlist = library.wishlist.filter((item) =>
      !(item.targetId === targetId && item.title === title && item.platform === platform),
    );
    if (target) {
      addHistory(library, {
        action: "wishlist.remove",
        entityId: target.targetId,
        title: target.title,
        platform: target.platform,
        summary: "Removido da wishlist",
      });
    }
    return library;
  });
  revalidatePath("/want");
  revalidatePath("/history");
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
    addHistory(library, {
      action: "wishlist.purchase",
      entityId: collectionId,
      title: target.title,
      platform: target.platform,
      summary: paid === null
        ? "Comprado · movido da wishlist para a coleção"
        : `Comprado por ${paid.toFixed(2)} € · movido para a coleção`,
      details: [source, text(form, "overallStatus"), text(form, "conditionGrade")].filter(Boolean),
    });
    return library;
  });

  revalidatePath("/");
  revalidatePath("/collection");
  revalidatePath("/want");
  revalidatePath("/history");
  revalidatePath(`/platform/${platformSlug(platform)}`);
  if (created) redirect(`/game/${encodeURIComponent(created)}`);
}