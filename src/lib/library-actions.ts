"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { platformSlug } from "@/lib/data/platforms";
import type { CanonicalGameIdentity, CollectionGame, ComponentNeed, ComponentNeedKey, ComponentNeedStatus, LibraryData, LibraryHistoryAction, PurchaseRecord, WantTarget } from "@/lib/data/types";
import { getFreshLibrary, getLibrary, updateLibrary } from "@/lib/library-store";
import { deleteOwnedCopyPhoto } from "@/lib/owned-copy-photos";
import { resolveCanonicalGame } from "@/lib/igdb-catalog";
import { ensureCanonicalArtwork } from "@/lib/catalog-artwork";
import { wishlistTargetsSatisfiedByAddedGame } from "@/lib/wishlist-auto-remove.logic";
import { objectiveMatchesTarget } from "@/lib/next-objective.logic";
import { matchWantTarget } from "@/lib/data/wishlist-matching";
import { isOrderedWishlistTarget } from "@/lib/wishlist-acquisition.logic";
import { wishlistCatalogArtworkCompatible } from "@/lib/wishlist-catalog-artwork.logic";
import { wishlistArtworkCandidateById, resolveWishlistArtworkOverrideCandidate } from "@/lib/wishlist-artwork-candidates.logic";
import { deleteWishlistArtworkOverride, storeWishlistArtworkOverride } from "@/lib/wishlist-artwork-override";
import { shouldDeleteUncommittedWishlistArtwork } from "@/lib/wishlist-artwork-override.logic";
import {
  componentStateToLibraryValue,
  derivePhysicalCopyStatus,
  physicalCopyNeedsReview,
  physicalCopyProfile,
  type PhysicalComponentKey,
  type PhysicalComponentState,
} from "@/lib/physical-copy-profile.logic";
import {
  isActiveComponentNeedStatus,
  isBaseComponentKey,
  normalizeComponentNeedLabel,
  recomputeCopyCompletion,
} from "@/lib/component-needs.logic";

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

function clearObjectiveForTarget(
  library: LibraryData,
  target: Pick<WantTarget, "targetId" | "title" | "platform">,
  summary: string,
) {
  if (!objectiveMatchesTarget(library.nextObjective, target)) return;
  library.nextObjective = null;
  addHistory(library, {
    action: "objective.clear",
    entityId: target.targetId,
    title: target.title,
    platform: target.platform,
    summary,
  });
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

function setGameComponentState(game: CollectionGame, key: PhysicalComponentKey, state: PhysicalComponentState) {
  const value = componentStateToLibraryValue(state);
  if (key === "media") game.media = value;
  else if (key === "box") game.box = value;
  else game.manual = value;
}

function parseComponentState(form: FormData, key: PhysicalComponentKey): PhysicalComponentState {
  const raw = text(form, "component_" + key);
  return raw === "yes" || raw === "no" ? raw : "unknown";
}

function createComponentNeed(
  collectionId: string,
  componentKey: ComponentNeedKey,
  label: string,
  now: string,
): ComponentNeed {
  return {
    id: "CN-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    collectionId,
    componentKey,
    label,
    status: "missing",
    notes: "",
    createdAt: now,
    updatedAt: now,
    completedAt: "",
  };
}

function recomputeGameCompletion(library: LibraryData, game: CollectionGame) {
  const completion = recomputeCopyCompletion(game, library.componentNeeds ?? []);
  game.overallStatus = completion.overallStatus;
  game.needsReview = completion.needsReview;
}

function normalizedEdition(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function canonicalSelectionFromForm(form: FormData): Promise<CanonicalGameIdentity | undefined> {
  const requestedGameId = Number(text(form, "catalogGameId"));
  const requestedPlatformId = Number(text(form, "catalogPlatformId"));
  if (!Number.isSafeInteger(requestedGameId) || requestedGameId <= 0 || !Number.isSafeInteger(requestedPlatformId) || requestedPlatformId <= 0) return undefined;
  return (await resolveCanonicalGame(requestedGameId, requestedPlatformId)) ?? undefined;
}

async function canonicalWishlistSelectionWithArtwork(
  canonical: CanonicalGameIdentity | undefined,
  targetVersion: string,
): Promise<CanonicalGameIdentity | undefined> {
  if (!canonical || !wishlistCatalogArtworkCompatible(targetVersion, canonical.edition)) return canonical;
  if (canonical.artwork?.pathname) return canonical;
  try {
    const artwork = await ensureCanonicalArtwork(canonical);
    return artwork ? { ...canonical, artwork } : canonical;
  } catch (error) {
    console.warn("wishlist_catalog_artwork_import_failed", {
      gameId: canonical.sourceGameId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return canonical;
  }
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
    notes: text(form, "purchaseNotes") || text(form, "notes"),
    status: previous?.status,
    statusUpdatedAt: previous?.statusUpdatedAt,
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

    const nextEdition = text(form, "edition");
    const catalog = current.catalog && normalizedEdition(nextEdition) !== normalizedEdition(current.catalog.edition)
      ? { ...current.catalog, artwork: null }
      : current.catalog;
    const nextGame = {
      ...current,
      edition: nextEdition,
      catalog,
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
  revalidatePath("/complete");
  revalidatePath("/history");
}

export async function addCollectionGame(form: FormData) {
  await guard();

  const manual = text(form, "manualMode") === "1";
  let canonical = manual ? undefined : await canonicalSelectionFromForm(form);
  if (!manual && !canonical) throw new Error("Não foi possível confirmar a identidade selecionada no catálogo.");

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
  const wishlistOverridePathsToDelete: string[] = [];

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

    const fulfilledWishlistTargets = wishlistTargetsSatisfiedByAddedGame(library.wishlist, title, platform);
    if (fulfilledWishlistTargets.length) {
      const fulfilledTargets = new Set(fulfilledWishlistTargets);
      library.wishlist = library.wishlist.filter((target) => !fulfilledTargets.has(target));
      for (const target of fulfilledWishlistTargets) {
        if (target.artworkOverride?.pathname) wishlistOverridePathsToDelete.push(target.artworkOverride.pathname);
        clearObjectiveForTarget(library, target, "Próximo objetivo concluído ao adicionar o jogo à coleção");
        addHistory(library, {
          action: "wishlist.remove",
          entityId: target.targetId,
          title: target.title,
          platform: target.platform,
          summary: "Removido automaticamente da wishlist ao adicionar à coleção",
          details: [collectionId],
        });
      }
    }

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

  for (const pathname of wishlistOverridePathsToDelete) {
    await deleteWishlistArtworkOverride(pathname).catch(() => undefined);
  }
  revalidatePath("/");
  revalidatePath("/collection");
  revalidatePath("/complete");
  revalidatePath("/want");
  revalidatePath("/history");
  revalidatePath(`/platform/${platformSlug(platform)}`);
  if (created) redirect(`/game/${encodeURIComponent(created)}`);
}

export async function saveCopyComponents(form: FormData) {
  await guard();
  const collectionId = text(form, "collectionId");
  if (!collectionId) return;

  await updateLibrary((library) => {
    library.componentNeeds ??= [];
    const game = library.collection.find((item) => item.collectionId === collectionId);
    if (!game) return library;

    const profile = physicalCopyProfile(game.platform);
    const now = new Date().toISOString();
    const changedComponents: string[] = [];

    for (const component of profile.components) {
      const state = parseComponentState(form, component.key);
      const before = component.key === "media" ? game.media : component.key === "box" ? game.box : game.manual;
      setGameComponentState(game, component.key, state);
      const after = component.key === "media" ? game.media : component.key === "box" ? game.box : game.manual;
      if (before !== after) changedComponents.push(component.label);

      const active = library.componentNeeds.filter((need) =>
        need.collectionId === collectionId &&
        need.componentKey === component.key &&
        isActiveComponentNeedStatus(need.status)
      );

      if (state === "no") {
        if (!active.length) library.componentNeeds.push(createComponentNeed(collectionId, component.key, component.label, now));
      } else {
        for (const need of active) {
          need.status = state === "yes" ? "received" : "closed";
          need.updatedAt = now;
          need.completedAt = now;
        }
      }
    }

    recomputeGameCompletion(library, game);
    addHistory(library, {
      action: "collection.edit",
      entityId: game.collectionId,
      title: game.title,
      platform: game.platform,
      summary: "Checklist física atualizada",
      details: changedComponents.length ? changedComponents : [game.overallStatus],
    });
    return library;
  });

  revalidatePath("/game/" + encodeURIComponent(collectionId));
  revalidatePath("/complete");
  revalidatePath("/");
  revalidatePath("/collection");
  revalidatePath("/history");
}

export async function addMissingComponent(form: FormData) {
  await guard();
  const collectionId = text(form, "collectionId");
  const label = text(form, "label");
  const notes = text(form, "notes");
  if (!collectionId || !label) return;

  await updateLibrary((library) => {
    library.componentNeeds ??= [];
    const game = library.collection.find((item) => item.collectionId === collectionId);
    if (!game) return library;

    const normalized = normalizeComponentNeedLabel(label);
    const duplicate = library.componentNeeds.some((need) =>
      need.collectionId === collectionId &&
      need.componentKey === "custom" &&
      isActiveComponentNeedStatus(need.status) &&
      normalizeComponentNeedLabel(need.label) === normalized
    );
    if (duplicate) return library;

    const now = new Date().toISOString();
    const need = createComponentNeed(collectionId, "custom", label, now);
    need.notes = notes;
    library.componentNeeds.push(need);
    recomputeGameCompletion(library, game);

    addHistory(library, {
      action: "component.need.add",
      entityId: game.collectionId,
      title: game.title,
      platform: game.platform,
      summary: "Peça em falta adicionada: " + label,
      details: [game.edition, notes].filter(Boolean),
    });
    return library;
  });

  revalidatePath("/game/" + encodeURIComponent(collectionId));
  revalidatePath("/complete");
  revalidatePath("/");
  revalidatePath("/history");
}

export async function updateComponentNeedStatus(form: FormData) {
  await guard();
  const collectionId = text(form, "collectionId");
  const needId = text(form, "needId");
  const componentKeyRaw = text(form, "componentKey");
  const label = text(form, "label");
  const statusRaw = text(form, "status");
  const validKeys: ComponentNeedKey[] = ["media", "box", "manual", "custom"];
  const validStatuses: ComponentNeedStatus[] = ["missing", "found", "purchased", "received", "closed"];
  if (!collectionId || !validKeys.includes(componentKeyRaw as ComponentNeedKey) || !validStatuses.includes(statusRaw as ComponentNeedStatus)) return;

  const componentKey = componentKeyRaw as ComponentNeedKey;
  const status = statusRaw as ComponentNeedStatus;

  await updateLibrary((library) => {
    library.componentNeeds ??= [];
    const game = library.collection.find((item) => item.collectionId === collectionId);
    if (!game) return library;

    let need = library.componentNeeds.find((item) => item.id === needId && item.collectionId === collectionId);
    const now = new Date().toISOString();
    if (!need) {
      need = createComponentNeed(collectionId, componentKey, label || componentKey, now);
      library.componentNeeds.push(need);
    }

    need.status = status;
    need.updatedAt = now;
    need.completedAt = status === "received" || status === "closed" ? now : "";

    if (status === "received" && isBaseComponentKey(componentKey)) {
      setGameComponentState(game, componentKey, "yes");
      for (const duplicate of library.componentNeeds) {
        if (
          duplicate.id !== need.id &&
          duplicate.collectionId === collectionId &&
          duplicate.componentKey === componentKey &&
          isActiveComponentNeedStatus(duplicate.status)
        ) {
          duplicate.status = "closed";
          duplicate.updatedAt = now;
          duplicate.completedAt = now;
        }
      }
    }

    recomputeGameCompletion(library, game);

    const statusLabel =
      status === "found" ? "Encontrado" :
      status === "purchased" ? "Comprado" :
      status === "received" ? "Recebido" :
      status === "closed" ? "Fechado" : "Em falta";
    addHistory(library, {
      action: status === "closed" ? "component.need.close" : "component.need.status",
      entityId: game.collectionId,
      title: game.title,
      platform: game.platform,
      summary: need.label + " · " + statusLabel,
      details: [game.collectionId, game.edition].filter(Boolean),
    });
    return library;
  });

  revalidatePath("/game/" + encodeURIComponent(collectionId));
  revalidatePath("/complete");
  revalidatePath("/");
  revalidatePath("/collection");
  revalidatePath("/history");
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
    library.componentNeeds ??= [];
    const now = new Date().toISOString();
    for (const need of library.componentNeeds) {
      if (need.collectionId === id && isActiveComponentNeedStatus(need.status)) {
        need.status = "closed";
        need.updatedAt = now;
        need.completedAt = now;
      }
    }
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
  revalidatePath("/complete");
  revalidatePath("/history");
  if (platform) redirect(`/platform/${platformSlug(platform)}`);
  redirect("/collection");
}

export async function addWishlistGame(form: FormData) {
  await guard();
  let canonical = await canonicalSelectionFromForm(form);
  const title = canonical?.title ?? text(form, "title");
  const platform = canonical?.platform ?? text(form, "platform");
  if (!title || !platform) return;
  const targetVersion = text(form, "targetVersion") || [text(form, "region"), canonical?.edition].filter(Boolean).join(" · ");
  canonical = await canonicalWishlistSelectionWithArtwork(canonical, targetVersion);

  const target: WantTarget = {
    platform,
    priority: text(form, "priority") || "Média",
    targetId: "APP-" + Date.now(),
    title,
    reason: text(form, "reason"),
    targetVersion,
    priceCeilingEur: money(form, "priceCeilingEur"),
    status: "ACTIVE",
    notes: text(form, "notes"),
    catalog: canonical,
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
        : "Adicionado à wishlist · referência manual " + target.priceCeilingEur.toFixed(2) + " €",
      details: [target.priority, target.targetVersion, canonical ? "IGDB #" + canonical.sourceGameId : ""].filter(Boolean),
    });
    return library;
  });

  revalidatePath("/");
  revalidatePath("/want");
  revalidatePath("/history");
  revalidatePath("/platform/" + platformSlug(platform));
  redirect(wishlistDetailPath(target.targetId, target.platform, target.title));
}

export async function setWishlistArtworkOverride(form: FormData) {
  await guard();
  const targetId = text(form, "targetId");
  const title = text(form, "title");
  const platform = text(form, "platform");
  const candidateId = text(form, "candidateId");
  if (!targetId || !title || !platform || !candidateId) return;

  const snapshot = await getLibrary();
  const target = snapshot.wishlist.find((item) =>
    item.targetId === targetId && item.title === title && item.platform === platform
  );
  if (!target) return;
  const candidate = wishlistArtworkCandidateById(target, candidateId);
  if (!candidate) return;

  const nextOverride = await storeWishlistArtworkOverride(targetId, candidate);
  let previousPath = "";
  let applied = false;

  try {
    await updateLibrary((library) => {
      const current = library.wishlist.find((item) =>
        item.targetId === targetId && item.title === title && item.platform === platform
      );
      if (!current) return library;
      const currentCandidate = wishlistArtworkCandidateById(current, candidateId);
      if (!currentCandidate || currentCandidate.sourcePath !== candidate.sourcePath) return library;

      previousPath = current.artworkOverride?.pathname ?? "";
      current.artworkOverride = nextOverride;
      applied = true;
      addHistory(library, {
        action: "wishlist.artwork.set",
        entityId: current.targetId,
        title: current.title,
        platform: current.platform,
        summary: "Capa escolhida manualmente · " + currentCandidate.displayRegion,
        details: [currentCandidate.sourceRepo, currentCandidate.sourcePath].filter((value): value is string => Boolean(value)),
      });
      return library;
    });
  } catch (error) {
    // A save may throw after the Blob write succeeded but cache invalidation
    // failed. Check fresh persisted state before deleting the new asset.
    const fresh = await getFreshLibrary().catch(() => null);
    if (shouldDeleteUncommittedWishlistArtwork(fresh, nextOverride.pathname)) {
      await deleteWishlistArtworkOverride(nextOverride.pathname).catch(() => undefined);
    }
    throw error;
  }

  if (!applied) {
    await deleteWishlistArtworkOverride(nextOverride.pathname).catch(() => undefined);
    return;
  }
  if (previousPath && previousPath !== nextOverride.pathname) {
    await deleteWishlistArtworkOverride(previousPath).catch(() => undefined);
  }

  revalidatePath("/");
  revalidatePath("/want");
  revalidatePath("/history");
  revalidatePath("/search");
  revalidatePath("/platform/" + platformSlug(platform));
  revalidatePath("/wish/" + encodeURIComponent(targetId));
  redirect(wishlistDetailPath(targetId, platform, title));
}

export async function clearWishlistArtworkOverride(form: FormData) {
  await guard();
  const targetId = text(form, "targetId");
  const title = text(form, "title");
  const platform = text(form, "platform");
  let pathname = "";

  await updateLibrary((library) => {
    const current = library.wishlist.find((item) =>
      item.targetId === targetId && item.title === title && item.platform === platform
    );
    if (!current?.artworkOverride) return library;
    pathname = current.artworkOverride.pathname;
    delete current.artworkOverride;
    addHistory(library, {
      action: "wishlist.artwork.clear",
      entityId: current.targetId,
      title: current.title,
      platform: current.platform,
      summary: "Escolha manual de capa removida",
    });
    return library;
  });

  if (pathname) await deleteWishlistArtworkOverride(pathname).catch(() => undefined);
  revalidatePath("/");
  revalidatePath("/want");
  revalidatePath("/history");
  revalidatePath("/search");
  revalidatePath("/platform/" + platformSlug(platform));
  revalidatePath("/wish/" + encodeURIComponent(targetId));
  redirect(wishlistDetailPath(targetId, platform, title));
}

export async function setNextObjective(form: FormData) {
  await guard();
  const targetId = text(form, "targetId");
  const title = text(form, "title");
  const platform = text(form, "platform");
  if (!targetId || !title || !platform) return;

  await updateLibrary((library) => {
    const target = library.wishlist.find((item) =>
      item.targetId === targetId && item.title === title && item.platform === platform
    );
    if (!target) return library;

    const kept = library.collection.filter((game) => game.keepStatus === "Collection");
    const match = matchWantTarget(target, kept);
    if (isOrderedWishlistTarget(target) || match.planState !== "active" || match.matchState === "acquired") return library;
    if (objectiveMatchesTarget(library.nextObjective, target)) return library;

    const previous = library.nextObjective;
    library.nextObjective = {
      targetId: target.targetId,
      title: target.title,
      platform: target.platform,
      setAt: new Date().toISOString(),
    };
    addHistory(library, {
      action: "objective.set",
      entityId: target.targetId,
      title: target.title,
      platform: target.platform,
      summary: previous ? "Próximo objetivo trocado" : "Definido como Próximo objetivo",
      details: previous ? [previous.title, previous.platform] : [],
    });
    return library;
  });

  revalidatePath("/");
  revalidatePath("/want");
  revalidatePath("/history");
  revalidatePath("/wish/" + encodeURIComponent(targetId));
}

export async function clearNextObjective(form: FormData) {
  await guard();
  const requestedTargetId = text(form, "targetId");

  await updateLibrary((library) => {
    const current = library.nextObjective;
    if (!current) return library;
    if (requestedTargetId && current.targetId !== requestedTargetId) return library;

    library.nextObjective = null;
    addHistory(library, {
      action: "objective.clear",
      entityId: current.targetId,
      title: current.title,
      platform: current.platform,
      summary: "Próximo objetivo removido",
    });
    return library;
  });

  revalidatePath("/");
  revalidatePath("/want");
  revalidatePath("/history");
  if (requestedTargetId) revalidatePath("/wish/" + encodeURIComponent(requestedTargetId));
}

export async function editWishlistGame(form: FormData) {
  await guard();
  const targetId = text(form, "targetId");
  const title = text(form, "title");
  const platform = text(form, "platform");
  let staleArtworkPath = "";
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
    if (next.artworkOverride && !resolveWishlistArtworkOverrideCandidate(next)) {
      staleArtworkPath = next.artworkOverride.pathname;
      delete next.artworkOverride;
    }
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
  if (staleArtworkPath) await deleteWishlistArtworkOverride(staleArtworkPath).catch(() => undefined);
  revalidatePath("/");
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
  let artworkPath = "";
  await updateLibrary((library) => {
    const target = library.wishlist.find((item) =>
      item.targetId === targetId && item.title === title && item.platform === platform
    );
    if (target?.artworkOverride?.pathname) artworkPath = target.artworkOverride.pathname;
    if (target) clearObjectiveForTarget(library, target, "Próximo objetivo removido com o target da wishlist");
    if (target?.acquisition?.state === "ordered") {
      const purchaseIndex = library.purchases.findIndex((purchase) => purchase.purchaseId === target.acquisition?.purchaseId);
      if (purchaseIndex >= 0) {
        library.purchases[purchaseIndex] = {
          ...library.purchases[purchaseIndex],
          status: "cancelled",
          statusUpdatedAt: new Date().toISOString(),
        };
      }
    }
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
  if (artworkPath) await deleteWishlistArtworkOverride(artworkPath).catch(() => undefined);
  revalidatePath("/");
  revalidatePath("/want");
  revalidatePath("/history");
  revalidatePath(`/platform/${platformSlug(platform)}`);
  revalidatePath(`/wish/${encodeURIComponent(targetId)}`);
  redirect(`/platform/${platformSlug(platform)}?tab=wishlist`);
}

export async function purchaseWishlistGame(form: FormData) {
  await guard();
  let canonical = await canonicalSelectionFromForm(form);
  const requestedTargetId = text(form, "targetId");
  const title = canonical?.title ?? text(form, "title");
  const platform = canonical?.platform ?? text(form, "platform");
  if (!title || !platform) return;
  const requestedTargetVersion = text(form, "targetVersion") || [text(form, "region"), canonical?.edition].filter(Boolean).join(" · ");
  canonical = await canonicalWishlistSelectionWithArtwork(canonical, requestedTargetVersion);

  const paid = money(form, "paid");
  const source = text(form, "source");
  const date = text(form, "purchaseDate") || new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  let targetId = requestedTargetId;

  await updateLibrary((library) => {
    let index = requestedTargetId
      ? library.wishlist.findIndex((item) =>
          item.targetId === requestedTargetId && item.title === title && item.platform === platform
        )
      : -1;

    if (index < 0) {
      const existingActive = wishlistTargetsSatisfiedByAddedGame(library.wishlist, title, platform)[0];
      if (existingActive) index = library.wishlist.indexOf(existingActive);
    }

    if (index < 0) {
      targetId = "APP-" + Date.now();
      library.wishlist.push({
        platform,
        priority: text(form, "priority") || "Média",
        targetId,
        title,
        reason: text(form, "reason"),
        targetVersion: requestedTargetVersion,
        priceCeilingEur: null,
        status: "ACTIVE",
        notes: text(form, "wishlistNotes"),
        catalog: canonical,
      });
      index = library.wishlist.length - 1;
    }

    const target = library.wishlist[index];
    targetId = target.targetId;
    if (target.acquisition?.state === "ordered") return library;
    clearObjectiveForTarget(library, target, "Próximo objetivo concluído ao registar a compra");

    const purchaseId = "APP-" + Date.now();
    library.purchases.push({
      ...purchaseFromForm(form, purchaseId),
      date,
      source,
      status: "ordered",
      statusUpdatedAt: now,
    });
    library.wishlist[index] = {
      ...target,
      catalog: target.catalog ?? canonical,
      acquisition: {
        state: "ordered",
        purchaseId,
        orderedAt: now,
      },
    };

    addHistory(library, {
      action: "wishlist.purchase",
      entityId: target.targetId,
      title: target.title,
      platform: target.platform,
      summary: paid === null
        ? "Comprado · a caminho"
        : "Comprado por " + paid.toFixed(2) + " € · a caminho",
      details: [source, date, canonical ? "IGDB #" + canonical.sourceGameId : ""].filter(Boolean),
    });
    return library;
  });

  revalidatePath("/");
  revalidatePath("/want");
  revalidatePath("/history");
  revalidatePath("/platform/" + platformSlug(platform));
  if (targetId) revalidatePath("/wish/" + encodeURIComponent(targetId));
  if (targetId) redirect(wishlistDetailPath(targetId, platform, title));
}

export async function receiveWishlistPurchase(form: FormData) {
  await guard();
  const targetId = text(form, "targetId");
  const title = text(form, "title");
  const platform = text(form, "platform");
  const receivedDate = text(form, "receivedDate") || new Date().toISOString().slice(0, 10);
  let created = "";
  let artworkPath = "";

  await updateLibrary((library) => {
    const index = library.wishlist.findIndex((item) =>
      item.targetId === targetId && item.title === title && item.platform === platform
    );
    if (index < 0) return library;

    const target = library.wishlist[index];
    if (target.acquisition?.state !== "ordered" || !target.acquisition.purchaseId) return library;
    artworkPath = target.artworkOverride?.pathname ?? "";
    clearObjectiveForTarget(library, target, "Próximo objetivo concluído ao receber o jogo");

    const purchaseIndex = library.purchases.findIndex((purchase) => purchase.purchaseId === target.acquisition?.purchaseId);
    if (purchaseIndex < 0) throw new Error("A compra associada a este jogo não foi encontrada.");

    const purchase = library.purchases[purchaseIndex];
    const collectionId = nextId(target.platform, library.collection);
    const physical = physicalState(form, target.platform);
    const paid = purchase.totalPaidEur ?? purchase.itemPriceEur;
    created = collectionId;

    library.collection.push(blankGame({
      collectionId,
      title: target.title,
      platform: target.platform,
      edition: text(form, "edition") || "Standard",
      region: text(form, "region"),
      language: text(form, "language"),
      condition: text(form, "conditionGrade"),
      completeness: physical.completeness,
      acquiredDate: receivedDate,
      purchaseId: purchase.purchaseId,
      paid,
      notes: text(form, "notes"),
      canonical: target.catalog,
      physical,
    }));
    library.purchases[purchaseIndex] = {
      ...purchase,
      status: "received",
      statusUpdatedAt: new Date().toISOString(),
    };
    library.wishlist.splice(index, 1);

    addHistory(library, {
      action: "wishlist.receive",
      entityId: collectionId,
      title: target.title,
      platform: target.platform,
      summary: "Recebido · verificado e movido para a coleção",
      details: [physical.completeness, text(form, "conditionGrade"), purchase.source, purchase.date].filter(Boolean),
    });
    return library;
  });

  if (artworkPath) await deleteWishlistArtworkOverride(artworkPath).catch(() => undefined);
  revalidatePath("/");
  revalidatePath("/collection");
  revalidatePath("/complete");
  revalidatePath("/want");
  revalidatePath("/history");
  revalidatePath("/platform/" + platformSlug(platform));
  revalidatePath("/wish/" + encodeURIComponent(targetId));
  if (created) redirect("/game/" + encodeURIComponent(created));
}

export async function cancelWishlistPurchase(form: FormData) {
  await guard();
  const targetId = text(form, "targetId");
  const title = text(form, "title");
  const platform = text(form, "platform");

  await updateLibrary((library) => {
    const index = library.wishlist.findIndex((item) =>
      item.targetId === targetId && item.title === title && item.platform === platform
    );
    if (index < 0) return library;

    const target = library.wishlist[index];
    if (target.acquisition?.state !== "ordered") return library;

    const purchaseIndex = library.purchases.findIndex((purchase) => purchase.purchaseId === target.acquisition?.purchaseId);
    if (purchaseIndex >= 0) {
      library.purchases[purchaseIndex] = {
        ...library.purchases[purchaseIndex],
        status: "cancelled",
        statusUpdatedAt: new Date().toISOString(),
      };
    }

    delete library.wishlist[index].acquisition;
    addHistory(library, {
      action: "wishlist.purchase.cancel",
      entityId: target.targetId,
      title: target.title,
      platform: target.platform,
      summary: "Compra cancelada · voltou à wishlist",
    });
    return library;
  });

  revalidatePath("/");
  revalidatePath("/want");
  revalidatePath("/history");
  revalidatePath("/platform/" + platformSlug(platform));
  revalidatePath("/wish/" + encodeURIComponent(targetId));
  redirect(wishlistDetailPath(targetId, platform, title));
}
