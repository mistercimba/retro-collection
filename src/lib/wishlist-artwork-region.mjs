// Collection metadata must name a region; unknown/generic NTSC is not inferred.
export function collectionWishlistArtworkRegion(region = "") {
  const normalized = region.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (/^pal(?: [ab])?$/.test(normalized) || normalized === "europe") return "Europe";
  if (["ntsc u", "us", "usa", "north america"].includes(normalized)) return "US";
  if (["ntsc j", "jp", "japan"].includes(normalized)) return "Japan";
  return null;
}
