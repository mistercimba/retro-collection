import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";
import { GoogleSheetsProvider, parsePlanTargets } from "./google-sheets-provider";
import type { RawSheetData } from "./types";

describe("workbook PLAN parsing", () => {
  it("parses the actual '<platform> PLAN' tab layout and preserves active/inactive state", () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("NES PLAN");
    sheet.getCell("A1").value = "NES — PLAN DE COLEÇÃO";
    sheet.getRow(73).values = ["Prioridade", "ID/alvo", "Jogo em falta", "Porque importa", "Versão / condição alvo", "Teto validado", "Estado", "Notas / pesquisa"];
    sheet.getRow(74).values = ["Alta", "NOVO", "The Legend of Zelda", "Pilar Nintendo", "PAL original; loose funcional", "", "PESQUISAR PREÇO", ""];
    sheet.getRow(75).values = ["Importação", "NOVO", "WarioWare: Twisted!", "Sem lançamento PAL", "US/AU/JP", "", "FORA DA BUYLIST PAL", ""];

    expect(parsePlanTargets(workbook)).toEqual([
      expect.objectContaining({ platform: "NES", title: "The Legend of Zelda", status: "PESQUISAR PREÇO" }),
      expect.objectContaining({ platform: "NES", title: "WarioWare: Twisted!", status: "FORA DA BUYLIST PAL" }),
    ]);
  });

  it("does not parse unrelated tables as PLAN targets", () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("COLLECTION").getRow(1).values = ["ID/alvo", "Jogo em falta"];
    expect(parsePlanTargets(workbook)).toEqual([]);
  });
});

describe("Google Sheets read refresh fallback", () => {
  it("shares the stale snapshot with every caller waiting on a failed refresh", async () => {
    vi.useFakeTimers();
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warningLog = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      vi.setSystemTime(new Date("2026-09-28T00:00:00Z"));
      const provider = new GoogleSheetsProvider();
      const load = vi.spyOn(provider as unknown as { load: () => Promise<RawSheetData> }, "load");
      const snapshot: RawSheetData = { collection: [{ Title: "Snapshot" }], audit: [] };
      load.mockResolvedValueOnce(snapshot);
      expect(await provider.read()).toBe(snapshot);

      vi.advanceTimersByTime(60_001);
      load.mockRejectedValueOnce(new Error("Google Sheets respondeu 503 ao ler COLLECTION!A1:Z1200."));
      const [first, second, third] = await Promise.all([provider.read(), provider.read(), provider.read()]);

      expect(first).toBe(snapshot);
      expect(second).toBe(snapshot);
      expect(third).toBe(snapshot);
      expect(load).toHaveBeenCalledTimes(2);
      expect(errorLog).toHaveBeenCalledWith("google_provider_refresh_failed", {
        errorName: "Error",
        upstreamStatus: "503",
        hasSnapshot: true,
      });
      expect(warningLog).toHaveBeenCalledWith("google_provider_stale_snapshot_served");
    } finally {
      errorLog.mockRestore();
      warningLog.mockRestore();
      vi.useRealTimers();
    }
  });
});
