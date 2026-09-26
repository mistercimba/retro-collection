import { NextResponse } from "next/server";
import { dataMode, getStats } from "@/lib/data/collection-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json(
      {
        ok: true,
        provider: dataMode(),
        collection: {
          kept: stats.kept,
          sell: stats.sell,
          sold: stats.sold,
          review: stats.review,
          auditRecords: stats.auditRecords,
          platforms: stats.platforms.length,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Health check failed", error);
    return NextResponse.json(
      {
        ok: false,
        provider: dataMode(),
        error: "Collection data could not be loaded.",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
