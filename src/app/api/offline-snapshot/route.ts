import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getCollectionGames } from "@/lib/data/collection-service";
import { GAME_ARTWORK } from "@/data/game-artwork";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const games = await getCollectionGames();
  const snapshot = {
    capturedAt: new Date().toISOString(),
    items: games.map((game) => ({
      collectionId: game.collectionId,
      title: game.title,
      platform: game.platform,
      region: game.region,
      edition: game.edition,
      completeness: game.audit?.completeness || game.overallStatus,
      condition: game.conditionGrade,
      auditStatus: game.audit?.auditStatus || "Sem auditoria registada",
      auditDate: game.audit?.auditDate || "",
      coverRef: GAME_ARTWORK[game.collectionId] || "",
      marketValueEur: game.marketValueEur,
    })),
  };

  return NextResponse.json(snapshot, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
