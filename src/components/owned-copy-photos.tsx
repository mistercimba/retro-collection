"use client";

import { useRef, useState } from "react";
import { Camera, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import type { OwnedCopyPhoto, OwnedCopyPhotoKind } from "@/lib/data/types";
import { MAX_OWNED_COPY_PHOTOS, OWNED_COPY_PHOTO_KIND_OPTIONS, ownedCopyPhotoLabel } from "@/lib/owned-copy-photos.logic";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const CLIENT_RESIZE_THRESHOLD = 1.5 * 1024 * 1024;
const CLIENT_MAX_DIMENSION = 1800;

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function preparePhoto(file: File): Promise<File> {
  if (!ACCEPTED_TYPES.has(file.type)) throw new Error("Usa uma imagem JPEG, PNG, WebP ou AVIF.");
  if (file.size <= CLIENT_RESIZE_THRESHOLD) return file;

  const image = await loadImage(file);
  const scale = Math.min(1, CLIENT_MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem.");
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  if (!blob) throw new Error("Não foi possível otimizar a imagem.");
  const base = file.name.replace(/\.[^.]+$/, "").slice(0, 120) || "foto";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

export function OwnedCopyPhotos({
  collectionId,
  title,
  photos,
}: {
  collectionId: string;
  title: string;
  photos: OwnedCopyPhoto[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<OwnedCopyPhotoKind>("front");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const limitReached = photos.length >= MAX_OWNED_COPY_PHOTOS;

  async function uploadPhoto(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const source = fileRef.current?.files?.[0];
    if (!source || busy || limitReached) return;
    setBusy(true);
    setError("");
    try {
      const file = await preparePhoto(source);
      const form = new FormData();
      form.set("collectionId", collectionId);
      form.set("kind", kind);
      form.set("file", file);
      const response = await fetch("/api/copy-photos", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível guardar a foto.");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível guardar a foto.");
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto(photo: OwnedCopyPhoto) {
    if (removing || !window.confirm(`Remover a foto “${ownedCopyPhotoLabel(photo.kind)}” desta cópia?`)) return;
    setRemoving(photo.id);
    setError("");
    try {
      const response = await fetch(
        `/api/copy-photos/${encodeURIComponent(photo.id)}?collectionId=${encodeURIComponent(collectionId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Não foi possível remover a foto.");
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível remover a foto.");
    } finally {
      setRemoving(null);
    }
  }

  return <section className="collection-panel p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <h2 className="text-sm font-black text-slate-950">Fotos da minha cópia</h2>
        <p className="mt-1 text-xs text-slate-500">Fotos reais desta cópia — não artwork genérico.</p>
      </div>
      <span className="text-[11px] font-semibold text-slate-400">{photos.length}/{MAX_OWNED_COPY_PHOTOS}</span>
    </div>

    {photos.length > 0 ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((photo) => <figure key={photo.id} className="overflow-hidden rounded-2xl border border-[#e2ddd2] bg-[#faf8f2]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/copy-photos/${encodeURIComponent(photo.id)}?collectionId=${encodeURIComponent(collectionId)}`}
          alt={`${ownedCopyPhotoLabel(photo.kind)} — ${title}`}
          className="aspect-[4/3] w-full bg-slate-100 object-cover"
          loading="lazy"
        />
        <figcaption className="flex items-center justify-between gap-2 p-2.5">
          <span className="truncate text-xs font-bold text-slate-700">{ownedCopyPhotoLabel(photo.kind)}</span>
          <button
            type="button"
            onClick={() => removePhoto(photo)}
            disabled={Boolean(removing)}
            aria-label={`Remover foto ${ownedCopyPhotoLabel(photo.kind)}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </figcaption>
      </figure>)}
    </div> : <div className="mt-4 rounded-2xl border border-dashed border-[#d8d2c5] bg-[#faf8f2] p-5 text-center">
      <Camera className="mx-auto h-7 w-7 text-slate-300" />
      <p className="mt-2 text-sm font-bold text-slate-700">Ainda não há fotos desta cópia.</p>
      <p className="mt-1 text-xs text-slate-500">Podes começar pela frente, verso ou pelo disco/cartucho.</p>
    </div>}

    <form onSubmit={uploadPhoto} className="mt-4 grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)_auto]">
      <select
        aria-label="Tipo de foto da cópia"
        value={kind}
        onChange={(event) => setKind(event.target.value as OwnedCopyPhotoKind)}
        className="field-input"
        disabled={busy || limitReached}
      >
        {OWNED_COPY_PHOTO_KIND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <input
        ref={fileRef}
        aria-label="Escolher foto da cópia"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        required
        disabled={busy || limitReached}
        className="field-input file:mr-3 file:rounded-lg file:border-0 file:bg-[#e5eadf] file:px-3 file:py-1.5 file:text-xs file:font-black file:text-[#17382e]"
      />
      <button
        type="submit"
        disabled={busy || limitReached}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#17382e] px-4 text-sm font-black text-white disabled:opacity-50"
      >
        <Upload className="h-4 w-4" />{busy ? "A guardar…" : "Adicionar foto"}
      </button>
    </form>
    <p className="mt-2 text-[11px] text-slate-400">Imagens grandes são reduzidas no browser antes do upload. JPEG, PNG, WebP ou AVIF.</p>
    {limitReached && <p className="mt-2 text-xs font-semibold text-amber-700">Atingiste o limite de fotos desta cópia.</p>}
    {error && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">{error}</p>}
  </section>;
}
