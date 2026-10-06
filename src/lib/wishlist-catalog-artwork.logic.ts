import { normalizeWantlistVariant } from "./wantlist-facets.logic";
import { wishlistArtworkEditionRequirement } from "./wishlist-artwork.logic";

export function wishlistCatalogArtworkCompatible(targetVersion: string | undefined, catalogEdition: string): boolean {
  const requirement = wishlistArtworkEditionRequirement(targetVersion);
  if (requirement === "Unknown") return false;
  if (requirement === "Any") return true;
  const catalogVariant = normalizeWantlistVariant(catalogEdition);
  return catalogVariant !== "Other" && catalogVariant === requirement;
}
