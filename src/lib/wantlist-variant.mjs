// Shared implementation of the Wantlist edition facet for runtime and maintenance scripts.
export function normalizeWantlistVariant(value) {
  const text = value.replace(/[’‘]/g, "'").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en-US");
  if (/\bnintendo\s+selects\b/.test(text)) return "Nintendo Selects";
  if (/\bsteel\s?book\b/.test(text)) return "Steelbook";
  if (/\bplayer'?s\s+choice\b/.test(text)) return "Player's Choice";
  if (/\bgreatest\s+hits\b/.test(text)) return "Greatest Hits";
  if (/\bplatinum\b/.test(text)) return "Platinum";
  if (/\bcollector(?:'?s)?\b|\bcollectors?\s+edition\b/.test(text)) return "Collector";
  if (/\blimited\b/.test(text)) return "Limited";
  if (/\bblack\s+label\b/.test(text)) return "Black Label";
  if (/\bspecial\s+edition\b/.test(text)) return "Special Edition";
  if (/\bstandard\b|\boriginal\b/.test(text)) return "Standard";
  return "Other";
}

