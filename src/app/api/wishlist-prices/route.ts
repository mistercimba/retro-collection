import {NextRequest,NextResponse} from "next/server";
import {getWantlist} from "@/lib/data/collection-service";
import {getPricechartingGuides} from "@/lib/pricecharting-catalog";

export const dynamic="force-dynamic";

export async function GET(request:NextRequest){
 const platform=request.nextUrl.searchParams.get("platform")?.trim()??"";
 if(!platform)return NextResponse.json({prices:{}},{status:400});
 const targets=(await getWantlist()).filter(x=>x.platform===platform&&x.planState!=="inactive"&&x.matchState!=="acquired");
 const guides=await getPricechartingGuides(targets.map(x=>({key:x.targetId+":"+x.title,platform:x.platform,title:x.title,edition:x.targetVersion})));
 return NextResponse.json({prices:Object.fromEntries(guides)},{headers:{"Cache-Control":"private, max-age=60"}});
}
