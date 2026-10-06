import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { searchCanonicalGames } from "@/lib/igdb-catalog";
import { getLibrary } from "@/lib/library-store";
import { getCatalogLibraryState } from "@/lib/catalog-library-state.logic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const platform = url.searchParams.get("platform")?.trim() ?? "";
  const idLike = /^(?:igdb\s*[:#-]?\s*)?#?\d{1,9}$/i.test(query);
  if ((!idLike && query.length < 2) || query.length > 120) {
    return NextResponse.json({ results: [] });
  }

  try {
    const [results, library] = await Promise.all([
      searchCanonicalGames(query, platform),
      getLibrary(),
    ]);
    const annotated = results.slice(0, 24).map((candidate) => ({
      ...candidate,
      libraryState: getCatalogLibraryState(
        library.collection,
        library.wishlist,
        candidate.title,
        candidate.platform,
      ),
    }));
    return NextResponse.json({ source: "IGDB", results: annotated }, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (error) {
    console.error("catalog_search_failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "Não foi possível pesquisar o catálogo agora.", results: [] }, { status: 503 });
  }
}
