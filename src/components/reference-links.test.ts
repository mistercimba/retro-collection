import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { OneTimeGameRatings } from "@/lib/data/types";
import { ReferenceLinks } from "./reference-links";

const ratings: OneTimeGameRatings = {
  fetchedAt: "2026-10-17T22:00:00Z",
  hltb: { mainHours: 15.5, gameId: "250", status: "matched" },
  metacritic: {
    score: 91, url: "https://www.metacritic.com/game/resident-evil-4-wii/",
    rawgUrl: "https://rawg.io/games/resident-evil-4-wii", status: "matched",
  },
};
describe("saved reference buttons", () => {
  it("displays stored, attributed HLTB Main Story and Metacritic scores", () => {
    const html = renderToStaticMarkup(createElement(ReferenceLinks, { title: "Resident Evil 4: Wii Edition", ratings }));
    expect(html).toContain("HowLongToBeat: 15,5 h");
    expect(html).toContain("Metacritic: 91");
    expect(html).toContain("howlongtobeat.com/game/250");
    expect(html).toContain("via RAWG");
  });
  it("uses normal search links for old games, missing data and errors", () => {
    const html = renderToStaticMarkup(createElement(ReferenceLinks, { title: "Resident Evil 4: Wii Edition" }));
    expect(html).toContain("HowLongToBeat");
    expect(html).not.toContain("HowLongToBeat:");
    expect(html).not.toContain("Metacritic:");
    expect(html).toContain("howlongtobeat.com/?q=Resident%20Evil%204%3A%20Wii%20Edition");
    expect(html).toContain("metacritic.com/search/Resident%20Evil%204%3A%20Wii%20Edition/");
    const blank = renderToStaticMarkup(createElement(ReferenceLinks, { title: "A", ratings: { ...ratings,
      hltb: { mainHours: null, gameId: null, status: "unavailable" },
      metacritic: { score: null, url: null, rawgUrl: null, status: "unmatched" },
    } }));
    expect(blank).not.toContain("Metacritic:");
  });
});
