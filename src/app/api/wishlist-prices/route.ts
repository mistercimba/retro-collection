import {NextRequest,NextResponse} from "next/server";
import {getWantlist} from "@/lib/data/collection-service";
import {getPricechartingGuides} from "@/lib/pricecharting-catalog";
import {getCexWishlistGuides} from "@/lib/cex-catalog";
import {buildWishlistBuyReferenceGuide} from "@/lib/wishlist-buy-reference.logic";
import {isAuthenticated} from "@/lib/auth";

export const dynamic="force-dynamic";

export async function GET(request:NextRequest){
 if(!(await isAuthenticated()))return NextResponse.json({error:"unauthorized"},{status:401});
 const platform=request.nextUrl.searchParams.get("platform")?.trim()??"";
 if(!platform)return NextResponse.json({prices:{},buyReferences:{}},{status:400});
 const targets=(await getWantlist()).filter(x=>x.platform===platform&&x.planState!=="inactive"&&x.matchState!=="acquired");
 const entries=targets.map(x=>({key:x.targetId+":"+x.title,platform:x.platform,title:x.title,edition:x.targetVersion}));
 const [guides,cexGuides]=await Promise.all([getPricechartingGuides(entries),getCexWishlistGuides(entries)]);
 const prices=Object.fromEntries(guides);
 const buyReferences=Object.fromEntries(entries.map(entry=>{
  const price=guides.get(entry.key)??{looseEur:null,cibEur:null,newEur:null,source:"Preço indisponível",date:"",productUrl:""};
  const cex=cexGuides.get(entry.key)??{source:"CeX Portugal indisponível",date:"",loose:{status:"unavailable" as const,reference:null},cib:{status:"unavailable" as const,reference:null}};
  return [entry.key,buildWishlistBuyReferenceGuide(price,cex)];
 }));
 return NextResponse.json({prices,buyReferences},{headers:{"Cache-Control":"private, max-age=60"}});
}
