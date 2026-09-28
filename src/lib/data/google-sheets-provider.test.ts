import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parsePlanTargets } from "./google-sheets-provider";

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
