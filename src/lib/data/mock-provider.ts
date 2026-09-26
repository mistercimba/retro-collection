import type { CollectionDataProvider } from "./provider";
import type { RawSheetData } from "./types";

const c = (id: string, title: string, platform: string, overrides: Record<string, string> = {}) => ({
  "Collection ID": id,
  "Catalog ID": `${platform}-${title}`.toUpperCase().replace(/[^A-Z0-9]+/g, "-"),
  "Item Type": "Game",
  Title: title,
  Platform: platform,
  Edition: "Standard",
  Region: "PAL",
  Language: "English",
  Media: "Yes",
  Box: "Yes",
  Manual: "Yes",
  Extras: "No",
  Label: "Yes",
  Sealed: "No",
  "Overall Status": "CIB",
  "Condition Grade": "Good",
  "Keep Status": "Collection",
  "Acquired Date": "",
  "Purchase ID": "",
  "Allocated Cost EUR": "",
  "Market Value EUR": "35,00",
  "CeX Cash EUR": "18,00",
  "Needs Review": "No",
  "Migration Confidence": "High",
  Notes: "",
  "Legacy Name": title,
  ...overrides,
});

const a = (id: string, title: string, platform: string, overrides: Record<string, string> = {}) => ({
  "Collection ID": id,
  Title: title,
  "Localized / Label Title": title,
  Platform: platform,
  "Product Code": "PAL-DEMO",
  Region: "PAL",
  "Release Market": "Europe",
  "Audit Status": "Confirmed",
  "Audit Date": "26/09/2026",
  Completeness: "CIB",
  "Functional Status": "Working",
  "Media Condition": "Good",
  "Label Condition": "Good",
  "Box Condition": "Good",
  "Manual Condition": "Good",
  "Packaging / Sleeve": "Standard case",
  "Observed Languages": "English",
  "Missing Components": "None",
  "Evidence Basis": "Mock demonstration data",
  Sources: "",
  "Audit Notes": "Dados de demonstração — liga a Google Sheet para veres a coleção real.",
  ...overrides,
});

export class MockProvider implements CollectionDataProvider {
  async read(): Promise<RawSheetData> {
    const collection = [
      c("N64-0001", "Super Mario 64", "Nintendo 64", { "Overall Status": "Loose", Box: "No", Manual: "No", "Market Value EUR": "24,00" }),
      c("N64-0002", "The Legend of Zelda: Ocarina of Time", "Nintendo 64", { "Overall Status": "Loose", Box: "No", Manual: "No", "Market Value EUR": "38,00" }),
      c("GC-0004", "Pokémon Colosseum", "GameCube", { "Market Value EUR": "82,00" }),
      c("GC-0006", "Eternal Darkness: Sanity's Requiem", "GameCube", { Manual: "No", "Overall Status": "Incomplete", "Needs Review": "Yes", "Market Value EUR": "72,00" }),
      c("WII-0001", "The Legend of Zelda: Twilight Princess", "Nintendo Wii", { "Market Value EUR": "16,00" }),
      c("NDS-0014", "The Legend of Zelda: Spirit Tracks", "Nintendo DS", { "Market Value EUR": "54,00" }),
      c("3DS-0008", "The Legend of Zelda: A Link Between Worlds", "Nintendo 3DS", { "Market Value EUR": "18,00" }),
      c("PS1-0049", "Rayman", "Playstation", { "Market Value EUR": "20,00" }),
      c("PS1-0073", "Vanishing Point", "Playstation", { Media: "No", "Overall Status": "Incomplete", "Condition Grade": "Fair", "Market Value EUR": "8,00" }),
      c("PS2-0077", "Silent Hill 2", "Playstation 2", { Manual: "No", "Overall Status": "Incomplete", "Needs Review": "Yes", "Market Value EUR": "86,00", "CeX Cash EUR": "45,00" }),
      c("PS2-0038", "Jak 3", "Playstation 2", { "Market Value EUR": "9,00" }),
      c("PS5-0001", "Class of Heroes 3 Remaster", "Playstation 5", { Sealed: "Yes", "Overall Status": "Sealed", "Condition Grade": "Mint", "Market Value EUR": "32,00" }),
      c("PS2-0040", "Jak 3", "Playstation 2", { Edition: "Platinum", "Keep Status": "Sell", "Market Value EUR": "6,00", "CeX Cash EUR": "2,00" }),
      c("PSP-0008", "Grand Theft Auto: Chinatown Wars", "PSP", { "Keep Status": "Sell", Extras: "Yes", "Overall Status": "CIB + map", "Market Value EUR": "18,00" }),
      c("PSP-0002", "Myst", "PSP", { "Keep Status": "Sell", "Market Value EUR": "6,10", "CeX Cash EUR": "2,00" }),
      c("PSP-0001", "LEGO Star Wars II: The Original Trilogy", "PSP", { Edition: "Platinum", "Keep Status": "Sold", "Market Value EUR": "4,29" }),
    ];
    const audit = collection.filter((row) => row["Collection ID"] !== "PS1-0073").map((row) => a(row["Collection ID"], row.Title, row.Platform, row.Manual === "No" ? { "Missing Components": "Manual", Completeness: "Incomplete" } : {}));
    return { collection, audit };
  }
}
