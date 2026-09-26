import { NextResponse } from "next/server";
import { resolveGameArtwork } from "@/lib/artwork";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim();
  const platform = searchParams.get("platform")?.trim();
  const region = searchParams.get("region")?.trim() || "PAL";
  const edition = searchParams.get("edition")?.trim() || "";
  const productCode = searchParams.get("productCode")?.trim() || "";

  if (!title || !platform) return new NextResponse(null, { status: 400 });

  try {
    const image = await resolveGameArtwork({
      title,
      platform,
      region,
      edition,
      productCode,
    });

    if (!image) {
      return new NextResponse(null, {
        status: 404,
        headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
      });
    }

    return NextResponse.redirect(image, {
      status: 307,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" },
    });
  } catch (error) {
    console.error("Game artwork lookup failed", error);
    return new NextResponse(null, { status: 502 });
  }
}
