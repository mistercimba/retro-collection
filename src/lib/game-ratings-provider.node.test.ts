import { describe, expect, it, vi } from "vitest";
import { collectNewGameRatings, RatingsProviderFailure } from "./game-ratings-provider.node";

vi.mock("howlongtobeat-ts",()=>({
  HowLongToBeatService: class {
    search() {return Promise.resolve({success:false,kind:"http",status:404,error:"simulated"});}
  },
  toHours:(seconds:number)=>seconds/3600,
}));
describe("provider outage safety",()=>{
  it("stops maintenance immediately with a safe typed failure",async()=>{
    await expect(collectNewGameRatings("Nioh","Playstation 4",
      {hltb:true,metacritic:false,strict:true})).rejects.toBeInstanceOf(RatingsProviderFailure);
  });
  it("saves transient error status instead of a final lookup when adding a new game",async()=>{
    const result=await collectNewGameRatings("Nioh","Playstation 4",{hltb:true,metacritic:false});
    expect(result.hltb.status).toBe("error");
    expect(result.hltb.mainHours).toBeNull();
    expect(result.lookupVersion).toBe(2);
  });
});
