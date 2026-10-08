function clone(value) {
  return structuredClone(value);
}

function normalized(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function identityKey(title, platform) {
  return normalized(platform) + "::" + normalized(title);
}

function exactMatches(wishlist, match) {
  return wishlist.filter((target) =>
    target.title === match.title && target.platform === match.platform
  );
}

function isObjectiveFor(library, target) {
  // Legacy imported records can share targetId: "NOVO". Always compare the
  // same three fields used by the app's normal Next Objective resolver.
  return Boolean(
    library.nextObjective &&
    library.nextObjective.targetId === target.targetId &&
    library.nextObjective.title === target.title &&
    library.nextObjective.platform === target.platform
  );
}

function hasOrderedAcquisition(target) {
  return target.acquisition?.state === "ordered" || Boolean(target.acquisition?.purchaseId);
}

function ownedIdentityExists(library, title, platform) {
  const key = identityKey(title, platform);
  return library.collection.some((game) =>
    game.keepStatus === "Collection" && identityKey(game.title, game.platform) === key
  );
}

function wishlistIdentityExists(library, title, platform, excludedTarget = null) {
  const key = identityKey(title, platform);
  return library.wishlist.some((target) =>
    target !== excludedTarget && identityKey(target.title, target.platform) === key
  );
}

function pushBlocker(report, operationIndex, code, message, target) {
  report.blockers.push({
    operationIndex,
    code,
    message,
    targetId: target?.targetId ?? "",
    title: target?.title ?? "",
    platform: target?.platform ?? "",
  });
}

function analyzeOperation(library, operation, operationIndex, report) {
  const result = { operationIndex, type: operation.type, status: "planned", count: 0, note: "" };

  if (operation.type === "remove") {
    const matches = exactMatches(library.wishlist, operation.match);
    if (!matches.length) {
      result.status = "skipped";
      result.note = "already absent";
      return result;
    }
    if (matches.length !== 1) {
      pushBlocker(report, operationIndex, "ambiguous-source", "Expected exactly one source target.", matches[0]);
      result.status = "blocked";
      return result;
    }
    if (hasOrderedAcquisition(matches[0])) {
      pushBlocker(report, operationIndex, "ordered-target", "Target is purchased/in transit and must be inspected before removal.", matches[0]);
      result.status = "blocked";
      return result;
    }
    result.count = 1;
    return result;
  }

  if (operation.type === "remove-platform") {
    const matches = library.wishlist.filter((target) => target.platform === operation.platform);
    if (!matches.length) {
      result.status = "skipped";
      result.note = "platform already absent";
      return result;
    }
    for (const target of matches) {
      if (hasOrderedAcquisition(target)) {
        pushBlocker(report, operationIndex, "ordered-target", "A platform target is purchased/in transit and must be inspected before bulk removal.", target);
      }
    }
    if (report.blockers.some((item) => item.operationIndex === operationIndex)) {
      result.status = "blocked";
      return result;
    }
    result.count = matches.length;
    return result;
  }

  if (operation.type === "rename") {
    const matches = exactMatches(library.wishlist, operation.match);
    const destinationExists = wishlistIdentityExists(library, operation.title, operation.match.platform);
    if (!matches.length) {
      if (destinationExists) {
        result.status = "skipped";
        result.note = "already renamed";
        return result;
      }
      pushBlocker(report, operationIndex, "source-missing", "Rename source target was not found.");
      result.status = "blocked";
      return result;
    }
    if (matches.length !== 1) {
      pushBlocker(report, operationIndex, "ambiguous-source", "Expected exactly one rename source target.", matches[0]);
      result.status = "blocked";
      return result;
    }
    const target = matches[0];
    if (hasOrderedAcquisition(target)) {
      pushBlocker(report, operationIndex, "ordered-target", "Target is purchased/in transit and must be inspected before rename.", target);
    }
    if (wishlistIdentityExists(library, operation.title, target.platform, target)) {
      pushBlocker(report, operationIndex, "destination-duplicate", "Exact destination target already exists.", target);
    }
    if (ownedIdentityExists(library, operation.title, target.platform)) {
      pushBlocker(report, operationIndex, "destination-owned", "Exact destination game is already owned; inspect before keeping it on Wishlist.", target);
    }
    if (target.artworkOverride?.pathname) {
      pushBlocker(report, operationIndex, "manual-artwork-override", "Target has a manual artwork override that must be reviewed before rename.", target);
    }
    if (report.blockers.some((item) => item.operationIndex === operationIndex)) {
      result.status = "blocked";
      return result;
    }
    result.count = 1;
    return result;
  }

  if (operation.type === "split") {
    const matches = exactMatches(library.wishlist, operation.match);
    const allDestinationsExist = operation.titles.every((title) =>
      wishlistIdentityExists(library, title, operation.match.platform)
    );
    if (!matches.length) {
      if (allDestinationsExist) {
        result.status = "skipped";
        result.note = "already split";
        return result;
      }
      pushBlocker(report, operationIndex, "source-missing", "Split source target was not found and not all destinations exist.");
      result.status = "blocked";
      return result;
    }
    if (matches.length !== 1) {
      pushBlocker(report, operationIndex, "ambiguous-source", "Expected exactly one split source target.", matches[0]);
      result.status = "blocked";
      return result;
    }
    const target = matches[0];
    if (hasOrderedAcquisition(target)) {
      pushBlocker(report, operationIndex, "ordered-target", "Combined target is purchased/in transit and cannot be duplicated safely.", target);
    }
    if (isObjectiveFor(library, target)) {
      pushBlocker(report, operationIndex, "next-objective", "Combined target is the current Next Objective; choose which replacement should inherit it first.", target);
    }
    if (target.artworkOverride?.pathname) {
      pushBlocker(report, operationIndex, "manual-artwork-override", "Combined target has a manual artwork override; choose artwork per replacement first.", target);
    }
    if (target.catalog) {
      pushBlocker(report, operationIndex, "canonical-catalog", "Combined target has canonical catalog identity that cannot be duplicated to two games.", target);
    }
    if (target.priceCeilingEur !== null && target.priceCeilingEur !== undefined) {
      pushBlocker(report, operationIndex, "price-ceiling", "Combined target has a price ceiling; review it per replacement before splitting.", target);
    }
    if (String(target.notes ?? "").trim()) {
      pushBlocker(report, operationIndex, "notes", "Combined target has notes; review them per replacement before splitting.", target);
    }
    for (const title of operation.titles) {
      if (wishlistIdentityExists(library, title, target.platform, target)) {
        pushBlocker(report, operationIndex, "destination-duplicate", "Exact split destination already exists on Wishlist: " + title, target);
      }
      if (ownedIdentityExists(library, title, target.platform)) {
        pushBlocker(report, operationIndex, "destination-owned", "Exact split destination is already owned: " + title, target);
      }
    }
    if (report.blockers.some((item) => item.operationIndex === operationIndex)) {
      result.status = "blocked";
      return result;
    }
    result.count = operation.titles.length;
    return result;
  }

  pushBlocker(report, operationIndex, "unsupported-operation", "Unsupported maintenance operation.");
  result.status = "blocked";
  return result;
}

export function analyzeWishlistMaintenance(library, plan) {
  if (!library || library.schemaVersion !== 1 || !Array.isArray(library.wishlist)) {
    throw new Error("Invalid library payload.");
  }
  if (!plan || plan.schemaVersion !== 1 || !Array.isArray(plan.operations)) {
    throw new Error("Invalid maintenance plan.");
  }

  const report = {
    planId: plan.id ?? "",
    safeToApply: false,
    sourceWishlistCount: library.wishlist.length,
    operations: [],
    blockers: [],
  };

  report.operations = plan.operations.map((operation, index) =>
    analyzeOperation(library, operation, index, report)
  );
  report.safeToApply = report.blockers.length === 0;
  return report;
}

function historyId(state) {
  state.historyCounter += 1;
  return "H-" + state.nowMs + "-" + String(state.historyCounter).padStart(3, "0");
}

function addHistory(library, state, input) {
  library.history ??= [];
  library.history.unshift({
    id: historyId(state),
    at: state.nowIso,
    details: input.details ?? [],
    action: input.action,
    entityId: input.entityId,
    title: input.title,
    platform: input.platform,
    summary: input.summary,
  });
}

function nextTargetId(library, state) {
  while (true) {
    state.targetCounter += 1;
    const candidate = "APP-" + String(state.nowMs + state.targetCounter);
    if (!library.wishlist.some((target) => target.targetId === candidate)) return candidate;
  }
}

function clearObjectiveIfNeeded(library, state, target, summary) {
  if (!isObjectiveFor(library, target)) return;
  library.nextObjective = null;
  addHistory(library, state, {
    action: "objective.clear",
    entityId: target.targetId,
    title: target.title,
    platform: target.platform,
    summary,
  });
}

function collectOverrideCleanup(target, cleanupArtworkPaths) {
  const pathname = target.artworkOverride?.pathname;
  if (pathname && !cleanupArtworkPaths.includes(pathname)) cleanupArtworkPaths.push(pathname);
}

function removeTarget(library, state, target, cleanupArtworkPaths, summary) {
  clearObjectiveIfNeeded(library, state, target, "Próximo objetivo removido pela manutenção da Wishlist");
  collectOverrideCleanup(target, cleanupArtworkPaths);
  // Remove only the exact object selected by title/platform, not every row
  // with the shared legacy targetId.
  library.wishlist = library.wishlist.filter((item) => item !== target);
  addHistory(library, state, {
    action: "wishlist.remove",
    entityId: target.targetId,
    title: target.title,
    platform: target.platform,
    summary,
  });
}

export function applyWishlistMaintenance(library, plan, options = {}) {
  const analysis = analyzeWishlistMaintenance(library, plan);
  const original = clone(library);
  if (!analysis.safeToApply) {
    return {
      library: original,
      cleanupArtworkPaths: [],
      report: {
        ...analysis,
        applied: false,
        finalWishlistCount: original.wishlist.length,
      },
    };
  }

  const next = clone(library);
  const nowIso = options.nowIso ?? new Date().toISOString();
  const parsed = Date.parse(nowIso);
  const state = {
    nowIso,
    nowMs: Number.isFinite(parsed) ? parsed : Date.now(),
    targetCounter: 0,
    historyCounter: 0,
  };
  const cleanupArtworkPaths = [];

  for (const operation of plan.operations) {
    if (operation.type === "remove") {
      const target = exactMatches(next.wishlist, operation.match)[0];
      if (target) removeTarget(next, state, target, cleanupArtworkPaths, "Removido da wishlist por manutenção aprovada");
      continue;
    }

    if (operation.type === "remove-platform") {
      const targets = next.wishlist.filter((target) => target.platform === operation.platform);
      for (const target of targets) {
        removeTarget(next, state, target, cleanupArtworkPaths, "Removido da wishlist com a plataforma por manutenção aprovada");
      }
      continue;
    }

    if (operation.type === "rename") {
      const target = exactMatches(next.wishlist, operation.match)[0];
      if (!target) continue;
      const previousTitle = target.title;
      // Check the original exact identity before changing the title, so a
      // genuine Next Objective follows this approved rename.
      const wasObjective = isObjectiveFor(next, target);
      target.title = operation.title;
      if (wasObjective) {
        next.nextObjective = { ...next.nextObjective, title: operation.title };
      }
      addHistory(next, state, {
        action: "wishlist.edit",
        entityId: target.targetId,
        title: target.title,
        platform: target.platform,
        summary: "Título corrigido na wishlist",
        details: [previousTitle + " → " + operation.title],
      });
      continue;
    }

    if (operation.type === "split") {
      const source = exactMatches(next.wishlist, operation.match)[0];
      if (!source) continue;
      next.wishlist = next.wishlist.filter((target) => target !== source);
      addHistory(next, state, {
        action: "wishlist.remove",
        entityId: source.targetId,
        title: source.title,
        platform: source.platform,
        summary: "Target combinado substituído por entradas separadas",
        details: operation.titles,
      });

      for (const title of operation.titles) {
        const target = {
          platform: source.platform,
          priority: source.priority,
          targetId: nextTargetId(next, state),
          title,
          reason: source.reason,
          targetVersion: source.targetVersion,
          priceCeilingEur: null,
          status: source.status,
          notes: "",
        };
        next.wishlist.push(target);
        addHistory(next, state, {
          action: "wishlist.add",
          entityId: target.targetId,
          title: target.title,
          platform: target.platform,
          summary: "Adicionado ao separar target combinado",
          details: [source.title],
        });
      }
    }
  }

  return {
    library: next,
    cleanupArtworkPaths,
    report: {
      ...analysis,
      applied: true,
      finalWishlistCount: next.wishlist.length,
    },
  };
}


// Force an explicit, reviewed dry-run against exactly the same persisted Blob
// state. A stale report can never be used to approve a different snapshot.
export function hasConfirmedMaintenanceSnapshot(actualSha256, expectedSha256) {
  return typeof expectedSha256 === "string" &&
    /^[a-f0-9]{64}$/.test(expectedSha256) &&
    actualSha256 === expectedSha256;
}
