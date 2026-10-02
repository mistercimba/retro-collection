export type KeepStatus = "Collection" | "Sell" | "Sold" | string;

export type OwnedCopyPhotoKind = "front" | "back" | "media" | "manual" | "extras";

export interface OwnedCopyPhoto {
  id: string;
  kind: OwnedCopyPhotoKind;
  pathname: string;
  contentType: string;
  originalName: string;
  uploadedAt: string;
}

export interface CollectionItem {
  collectionId: string;
  catalogId: string;
  itemType: string;
  title: string;
  platform: string;
  edition: string;
  region: string;
  language: string;
  media: string;
  box: string;
  manual: string;
  extras: string;
  label: string;
  sealed: string;
  overallStatus: string;
  conditionGrade: string;
  keepStatus: KeepStatus;
  acquiredDate: string;
  purchaseId: string;
  allocatedCostEur: number | null;
  marketValueEur: number | null;
  cexCashEur: number | null;
  needsReview: boolean;
  migrationConfidence: string;
  notes: string;
  legacyName: string;
  photos?: OwnedCopyPhoto[];
}

export interface AuditRecord {
  collectionId: string;
  title: string;
  localizedTitle: string;
  platform: string;
  productCode: string;
  region: string;
  releaseMarket: string;
  auditStatus: string;
  auditDate: string;
  completeness: string;
  functionalStatus: string;
  mediaCondition: string;
  labelCondition: string;
  boxCondition: string;
  manualCondition: string;
  packaging: string;
  observedLanguages: string;
  missingComponents: string;
  evidenceBasis: string;
  sources: string;
  auditNotes: string;
}

export interface CollectionGame extends CollectionItem {
  audit: AuditRecord | null;
  latestValuation?: ValuationSnapshot | null;
  purchase?: PurchaseRecord | null;
}

export interface PlatformStats {
  platform: string;
  slug: string;
  count: number;
  audited: number;
  review: number;
  marketValueEur: number | null;
}

export interface CollectionStats {
  kept: number;
  sell: number;
  sold: number;
  review: number;
  auditRecords: number;
  marketValueEur: number | null;
  platforms: PlatformStats[];
}

export interface RawSheetData {
  collection: Record<string, string>[];
  audit: Record<string, string>[];
  platformOverrides?: Record<string, string>;
  wantlist?: WantTarget[];
  purchases?: PurchaseRecord[];
  valuations?: ValuationSnapshot[];
}

export interface WantTarget {
  platform: string;
  priority: string;
  targetId: string;
  title: string;
  reason: string;
  targetVersion: string;
  priceCeilingEur: number | null;
  status: string;
  notes: string;
}

export interface WantListEntry extends WantTarget {
  ownedGame: CollectionGame | null;
  possibleMatch: CollectionGame | null;
  planState: "active" | "inactive" | "unknown";
  matchState: "acquired" | "missing" | "ambiguous";
  matchReason: string;
}

export interface PurchaseRecord {
  purchaseId: string;
  date: string;
  source: string;
  seller: string;
  listingUrl: string;
  itemPriceEur: number | null;
  shippingEur: number | null;
  feesEur: number | null;
  totalPaidEur: number | null;
  bundleId: string;
  notes: string;
}

export interface ValuationSnapshot {
  collectionId: string;
  catalogId: string;
  source: string;
  valueType: string;
  valueEur: number | null;
  snapshotDate: string;
  conditionBasis: string;
  notes: string;
}

export type LibraryHistoryAction =
  | "collection.add"
  | "collection.edit"
  | "collection.remove"
  | "collection.photo.add"
  | "collection.photo.remove"
  | "wishlist.add"
  | "wishlist.edit"
  | "wishlist.remove"
  | "wishlist.purchase";

export interface LibraryHistoryEntry {
  id: string;
  at: string;
  action: LibraryHistoryAction;
  entityId: string;
  title: string;
  platform: string;
  summary: string;
  details: string[];
}

export interface LibraryData {
  schemaVersion: 1;
  updatedAt: string;
  collection: CollectionGame[];
  wishlist: WantTarget[];
  purchases: PurchaseRecord[];
  valuations: ValuationSnapshot[];
  history: LibraryHistoryEntry[];
}

export type ProviderMode = "snapshot" | "google" | "mock";