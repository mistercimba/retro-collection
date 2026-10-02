import type { OwnedCopyPhotoKind } from "@/lib/data/types";

export const MAX_OWNED_COPY_PHOTO_BYTES = 4 * 1024 * 1024;
export const MAX_OWNED_COPY_PHOTOS = 12;

export const OWNED_COPY_PHOTO_KIND_OPTIONS: readonly { value: OwnedCopyPhotoKind; label: string }[] = [
  { value: "front", label: "Frente" },
  { value: "back", label: "Verso" },
  { value: "media", label: "Disco / cartucho" },
  { value: "manual", label: "Manual / inserts" },
  { value: "extras", label: "Extras" },
];

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function isOwnedCopyPhotoKind(value: string): value is OwnedCopyPhotoKind {
  return OWNED_COPY_PHOTO_KIND_OPTIONS.some((option) => option.value === value);
}

export function ownedCopyPhotoLabel(kind: OwnedCopyPhotoKind): string {
  return OWNED_COPY_PHOTO_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? kind;
}

export function ownedCopyPhotoExtension(contentType: string): string | null {
  return EXTENSIONS[contentType] ?? null;
}

export function validateOwnedCopyPhotoFile(input: { type: string; size: number }): string | null {
  if (!ownedCopyPhotoExtension(input.type)) return "Usa uma imagem JPEG, PNG, WebP ou AVIF.";
  if (!Number.isFinite(input.size) || input.size <= 0) return "A imagem está vazia.";
  if (input.size > MAX_OWNED_COPY_PHOTO_BYTES) return "A imagem é demasiado grande. O limite após otimização é 4 MB.";
  return null;
}
