import { NextResponse } from "next/server";
import { authEnabled, isAuthenticated } from "@/lib/auth";
import { getFreshLibrary } from "@/lib/library-store";
import { buildCollectionWishlistExport } from "@/lib/collection-wishlist-export.logic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
} as const;

export async function GET() {
  // Most pages permit no-password development mode. Export must not:
  // fail closed on unprotected previews and local builds.
  if (!authEnabled()) {
    return new Response(null, { status: 404, headers: NO_STORE_HEADERS });
  }
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { error: "Não autenticado." },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const library = await getFreshLibrary();
    const exportedAt = new Date().toISOString();
    const payload = buildCollectionWishlistExport(library, exportedAt);
    const filename = "retro-collection-audit-" + exportedAt.slice(0, 10) + ".json";
    return NextResponse.json(payload, {
      headers: {
        ...NO_STORE_HEADERS,
        "Content-Disposition": 'attachment; filename="' + filename + '"',
      },
    });
  } catch {
    // A private Blob failure must not leak credentials or library content.
    console.error("collection_wishlist_export_failed", { code: "LIBRARY_UNAVAILABLE" });
    return NextResponse.json(
      { error: "Não foi possível exportar a coleção neste momento." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
