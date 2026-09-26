export type KeepStatus = "Collection" | "Sell" | "Sold" | string;

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
}

export interface PlatformStats {
  platform: string;
  slug: string;
  count: number;
  audited: number;
  review: number;
  marketValueEur: number;
}

export interface CollectionStats {
  kept: number;
  sell: number;
  sold: number;
  review: number;
  auditRecords: number;
  marketValueEur: number;
  platforms: PlatformStats[];
}

export interface RawSheetData {
  collection: Record<string, string>[];
  audit: Record<string, string>[];
}

export type ProviderMode = "google" | "mock";
