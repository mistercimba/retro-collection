// One read-only external lookup for manual QA. Never import into runtime.
import { collectNewGameRatings } from "../src/lib/game-ratings-provider.node";
const result = await collectNewGameRatings("Hades", "PC", { hltb: true, metacritic: false, strict: true });
console.log("HLTB_SMOKE", JSON.stringify({ status: result.hltb.status, mainHours: result.hltb.mainHours }));
if (!result.hltb.mainHours) throw new Error("No HLTB main-story time for Hades");
