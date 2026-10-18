import { describe, expect, it } from "vitest";
import type { CollectionGame, LibraryHistoryEntry } from "./data/types";
import { compareHltbBackup, latestRepairReference, verifyRepairBackup } from "./hltb-repair-backup-diff.logic";

const backupPath="retro-collection/backups/hltb-id-repair-2026-10-18T19-35-53-214Z-23ddc95a-94be-4b8e-b380-a38544714e0a.json";
const game=(id:string,title:string,hours:number|null,externalId:string|null,keepStatus="Collection") =>
  ({collectionId:id,title,platform:"Game Boy",edition:"Standard",keepStatus,
    referenceRatings:{lookupVersion:2,fetchedAt:"2026-10-18",
      hltb:{mainHours:hours,gameId:externalId,status:hours?"matched":"error",lookupVersion:2},
      metacritic:{score:null,url:null,rawgUrl:null,status:"unavailable"}}}) as CollectionGame;
const castlevania=game("GBC-0053","Castlevania II: Belmont's Revenge",15.2,"10039");
const zelda=game("GBC-001","The Legend of Zelda: Oracle of Seasons",15,"10039");
const history:LibraryHistoryEntry={
  id:"H-1", at:"2026-10-18T19:35:54.000Z", action:"collection.audit",
  entityId:castlevania.collectionId,title:castlevania.title,platform:castlevania.platform,
  summary:"Referência HowLongToBeat incorreta removida para reverificação",
  details:["ID HLTB anterior: 10039","Tempo anterior não validado: 15.2 h",
    "Referência de controlo: The Legend of Zelda: Oracle of Seasons","Backup privado: "+backupPath],
};

describe("read-only HLTB repair backup diagnosis",()=>{
  it("uses only a validated backup recorded in the latest repair event",()=>{
    const ref=latestRepairReference([history]);
    expect(ref?.pathname).toBe(backupPath);
    expect(ref?.collectionId).toBe("GBC-0053");
    expect(()=>verifyRepairBackup([castlevania,zelda],ref!)).not.toThrow();
    expect(latestRepairReference([])).toBeNull();
    const newer={...history,id:"H-2",at:"2026-10-18T21:00:00Z",details:[...history.details.slice(0,3),"Backup privado: ../../any.json"]};
    expect(()=>latestRepairReference([history,newer])).toThrow();
  });
  it("rejects unrelated or corrupted backup content and inconsistent history",()=>{
    const ref=latestRepairReference([history])!;
    expect(()=>verifyRepairBackup([zelda],ref)).toThrow();
    expect(()=>verifyRepairBackup([game("GBC-0053",castlevania.title,14,"10039")],ref)).toThrow();
    expect(()=>verifyRepairBackup([game("GBC-0053",castlevania.title,15.2,"1571")],ref)).toThrow();
    expect(()=>latestRepairReference([{...history,details:["Backup privado: "+backupPath]}])).toThrow();
    expect(()=>latestRepairReference([{...history,details:[...history.details.slice(0,3),"Backup privado: https://example.com/foo.json"]}])).toThrow();
  });
  it("reports the real 330→329 delta when Preview's 331 is not the backup count",()=>{
    const before=[castlevania,zelda,...Array.from({length:328},(_,i)=>game("X-"+i,"Jogo "+i,10,String(i+2000)))];
    const after=before.map(g=>g.collectionId==="GBC-0053"?
      {...g,referenceRatings:{...g.referenceRatings!,hltb:{mainHours:null,gameId:null,status:"error" as const,lookupVersion:2}}}:g);
    const unchanged=JSON.stringify(before);
    const result=compareHltbBackup(before,after);
    expect(result).toMatchObject({beforeCount:330,afterCount:329,delta:-1});
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toMatchObject({collectionId:"GBC-0053",before:{hours:15.2,gameId:"10039"},after:{hours:null,gameId:null}});
    expect(JSON.stringify(before)).toBe(unchanged);
  });
  it("detects a genuine second lost rating and treats copies separately by ID",()=>{
    const before=[castlevania,zelda,game("GBC-0054",castlevania.title,12,"1571")];
    const after=[game("GBC-0053",castlevania.title,null,null),game("GBC-001",zelda.title,null,null),before[2]];
    const d=compareHltbBackup(before,after);
    expect(d).toMatchObject({beforeCount:3,afterCount:1,delta:-2});
    expect(d.changes.map(x=>x.collectionId)).toEqual(["GBC-0053","GBC-001"].sort((a,b)=>
      (before.find(x=>x.collectionId===a)!.title).localeCompare(before.find(x=>x.collectionId===b)!.title,"pt-PT")));
  });
  it("includes ownership changes, added/removed copies, and ID/status changes even when hours stay the same",()=>{
    const before=[game("1","A",10,"42"),game("2","B",10,"51"),game("3","C",null,null)];
    const after=[game("1","A",10,"43"),game("2","B",10,"51","Sold"),game("4","D",10,"60")];
    const diff=compareHltbBackup(before,after);
    expect(diff).toMatchObject({beforeCount:2,afterCount:2,delta:0});
    expect(diff.changes.map(x=>x.collectionId)).toEqual(["1","2","3","4"]);
    expect(()=>compareHltbBackup([before[0],before[0]],after)).toThrow();
  });
});
