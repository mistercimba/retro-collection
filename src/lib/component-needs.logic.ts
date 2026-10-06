import type { CollectionGame, ComponentNeed, ComponentNeedKey, ComponentNeedStatus } from "./data/types";
import {
  derivePhysicalCopyStatus,
  physicalCopyNeedsReview,
  physicalCopyProfile,
  type PhysicalComponentKey,
  type PhysicalComponentState,
} from "./physical-copy-profile.logic";

export type ComponentNeedEntry = ComponentNeed & {
  title: string;
  platform: string;
  edition: string;
  inferred: boolean;
};

const activeStatuses = new Set<ComponentNeedStatus>(["missing", "found", "purchased"]);

const looseFriendlyCartridgePlatforms = new Set([
  "NES",
  "SNES",
  "Nintendo 64",
  "Game Boy",
  "Game Boy Color",
  "GameBoy Advance",
  "GameBoy + Color",
]);

export function shouldTrackBaseComponentInQueue(platform: string, componentKey: ComponentNeedKey): boolean {
  if (componentKey === "media" || componentKey === "custom") return true;
  return !looseFriendlyCartridgePlatforms.has(platform);
}

export function isActiveComponentNeedStatus(status: ComponentNeedStatus): boolean {
  return activeStatuses.has(status);
}

export function inferredComponentNeedId(collectionId: string, componentKey: PhysicalComponentKey): string {
  return "INFERRED:" + collectionId + ":" + componentKey;
}

export function libraryComponentState(value: string | undefined): PhysicalComponentState {
  const normalized = String(value ?? "").trim().toLocaleLowerCase("pt-PT");
  if (["yes", "sim", "present", "presente"].includes(normalized)) return "yes";
  if (["no", "não", "nao", "missing", "em falta", "absent", "ausente"].includes(normalized)) return "no";
  return "unknown";
}

export function componentLibraryValue(game: CollectionGame, key: PhysicalComponentKey): string {
  if (key === "media") return game.media;
  if (key === "box") return game.box;
  return game.manual;
}

export function activeComponentNeedsForCopy(needs: ComponentNeed[], collectionId: string): ComponentNeed[] {
  return needs.filter((need) => need.collectionId === collectionId && isActiveComponentNeedStatus(need.status));
}

export function buildComponentNeedEntries(
  collection: CollectionGame[],
  storedNeeds: ComponentNeed[],
): ComponentNeedEntry[] {
  const entries: ComponentNeedEntry[] = [];

  for (const game of collection) {
    if (game.keepStatus !== "Collection") continue;

    const gameNeeds = storedNeeds.filter((need) => need.collectionId === game.collectionId);
    const activeStored = gameNeeds.filter((need) =>
      isActiveComponentNeedStatus(need.status) &&
      shouldTrackBaseComponentInQueue(game.platform, need.componentKey)
    );

    for (const need of activeStored) {
      entries.push({
        ...need,
        title: game.title,
        platform: game.platform,
        edition: game.edition,
        inferred: false,
      });
    }

    const activeBaseKeys = new Set(
      activeStored
        .filter((need) => need.componentKey !== "custom")
        .map((need) => need.componentKey),
    );

    const sealed = game.sealed.trim().toLocaleLowerCase("pt-PT") === "yes";
    if (sealed) continue;

    for (const component of physicalCopyProfile(game.platform).components) {
      if (!shouldTrackBaseComponentInQueue(game.platform, component.key)) continue;
      if (activeBaseKeys.has(component.key)) continue;
      if (libraryComponentState(componentLibraryValue(game, component.key)) !== "no") continue;

      entries.push({
        id: inferredComponentNeedId(game.collectionId, component.key),
        collectionId: game.collectionId,
        componentKey: component.key,
        label: component.label,
        status: "missing",
        notes: "",
        createdAt: "",
        updatedAt: "",
        completedAt: "",
        title: game.title,
        platform: game.platform,
        edition: game.edition,
        inferred: true,
      });
    }
  }

  return entries.sort((a, b) =>
    a.platform.localeCompare(b.platform, "pt-PT") ||
    a.title.localeCompare(b.title, "pt-PT") ||
    a.collectionId.localeCompare(b.collectionId, "pt-PT") ||
    a.label.localeCompare(b.label, "pt-PT")
  );
}

export function buildComponentNeedHistory(
  collection: CollectionGame[],
  storedNeeds: ComponentNeed[],
): ComponentNeedEntry[] {
  const games = new Map(collection.map((game) => [game.collectionId, game]));
  return storedNeeds
    .filter((need) => !isActiveComponentNeedStatus(need.status))
    .map((need) => {
      const game = games.get(need.collectionId);
      return {
        ...need,
        title: game?.title ?? "Cópia removida",
        platform: game?.platform ?? "",
        edition: game?.edition ?? "",
        inferred: false,
      };
    })
    .sort((a, b) => (b.completedAt || b.updatedAt).localeCompare(a.completedAt || a.updatedAt));
}

export function recomputeCopyCompletion(
  game: CollectionGame,
  storedNeeds: ComponentNeed[],
): { overallStatus: string; needsReview: boolean } {
  const profile = physicalCopyProfile(game.platform);
  const states: Partial<Record<PhysicalComponentKey, PhysicalComponentState>> = {};
  for (const component of profile.components) {
    states[component.key] = libraryComponentState(componentLibraryValue(game, component.key));
  }

  const sealed = game.sealed.trim().toLocaleLowerCase("pt-PT") === "yes";
  const needsReview = sealed ? false : physicalCopyNeedsReview(profile, states);
  let overallStatus = derivePhysicalCopyStatus(profile, states, sealed);

  const customMissing = activeComponentNeedsForCopy(storedNeeds, game.collectionId)
    .some((need) => need.componentKey === "custom");
  if (customMissing && overallStatus !== "Needs review") overallStatus = "Incomplete";

  return { overallStatus, needsReview };
}

export function normalizeComponentNeedLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isBaseComponentKey(key: ComponentNeedKey): key is PhysicalComponentKey {
  return key === "media" || key === "box" || key === "manual";
}
