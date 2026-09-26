import { NextResponse } from "next/server";
import { resolvePlatformArtwork } from "@/lib/artwork";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform")?.trim();

  if (!platform) return new NextResponse(null, { status: 400 });

  try {
    const image = await resolvePlatformArtwork(platform);
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
    console.error("Platform artwork lookup failed", error);
    return new NextResponse(null, { status: 502 });
  }
}
