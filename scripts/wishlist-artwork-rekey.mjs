import { wishlistArtworkIdentity, wishlistArtworkEditionRequirement } from "../src/lib/wishlist-artwork-identity.mjs";
import { normalizeWantlistVariant } from "../src/lib/wantlist-variant.mjs";

// Existing title/platform/region matches satisfy Any; explicit editions require
// proven cover metadata. A regional export is not evidence of Standard.
export function rekeyWishlistArtwork(targets, previousEntries) {
  const entries = {};
  const missing = [];
  const unassignedEntries = {};
  const byBase = new Map();
  for (const entry of Object.values(previousEntries)) {
    const base = JSON.stringify(JSON.parse(wishlistArtworkIdentity(entry)).slice(0, 4));
    byBase.set(base, [...(byBase.get(base) ?? []), entry]);
  }
  for (const target of targets) {
    const key = wishlistArtworkIdentity(target);
    const base = JSON.stringify(JSON.parse(key).slice(0, 4));
    const variant = wishlistArtworkEditionRequirement(target.targetVersion);
    const candidates = byBase.get(base) ?? [];
    const matches = candidates.filter((entry) => {
      const coverVariant = normalizeWantlistVariant(entry.coverVariant ?? entry.targetVersion ?? "");
      return variant === "Any" || (variant !== "Unknown" && coverVariant !== "Other" && coverVariant === variant);
    });
    if (matches.length === 1) {
      entries[key] = {
        ...matches[0], targetId: target.targetId, title: target.title,
        platform: target.platform, targetVersion: target.targetVersion,
        coverVariant: normalizeWantlistVariant(matches[0].coverVariant ?? matches[0].targetVersion ?? ""),
      };
      delete entries[key].unresolvedReason;
    }
    else if (candidates.length) {
      const reason = variant === "Unknown" ? "target-artwork-edition-unconfirmed" : matches.length > 1 ? "ambiguous-artwork-edition" : "source-artwork-edition-unconfirmed";
      missing.push({ target, reason });
      for (const entry of candidates) unassignedEntries[entry.file] = {
        ...entry, targetId: target.targetId, title: target.title, platform: target.platform,
        coverVariant: normalizeWantlistVariant(entry.coverVariant ?? entry.targetVersion ?? ""),
        targetVersion: target.targetVersion, unresolvedReason: reason,
      };
    }
  }
  return { entries, missing, unassignedEntries };
}
