// One read-only external lookup for explicit provider QA (no personal data).
import { collectNewGameRatings } from "../src/lib/game-ratings-provider.node";

async function main() {
  const result=await collectNewGameRatings("Hades","PC",{hltb:true,metacritic:false,strict:true});
  console.log("HLTB_SMOKE",JSON.stringify({status:result.hltb.status,mainHours:result.hltb.mainHours}));
  if(!result.hltb.mainHours)throw new Error("HowLongToBeat returned no Main Story duration for Hades");
}
main().catch(error=>{console.error("HLTB_SMOKE_FAILED",error instanceof Error?error.message:String(error));process.exitCode=1;});
