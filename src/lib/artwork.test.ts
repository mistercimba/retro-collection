import { describe, expect, it } from "vitest";
import { buildPalArtworkSearch, scorePalArtworkCandidate } from "./artwork";

const request = {
  title: "Silent Hill 2",
  platform: "Playstation 2",
  region: "PAL",
  edition: "Standard",
  productCode: "SLES-50382",
};

function candidate(title: string, description = "") {
  return {
    index: 1,
    title,
    imageinfo: [
      {
        thumburl: "https://example.invalid/image.jpg",
        extmetadata: {
          ImageDescription: { value: description },
        },
      },
    ],
  };
}

describe("PAL artwork matching", () => {
  it("builds a title + console + PAL query", () => {
    const query = buildPalArtworkSearch(request);
    expect(query).toContain('"Silent Hill 2"');
    expect(query).toContain('"PlayStation 2"');
    expect(query).toContain("PAL");
  });

  it("accepts a PAL cover for the correct platform", () => {
    const score = scorePalArtworkCandidate(
      candidate("File:Silent Hill 2 PlayStation 2 PAL Europe cover.jpg"),
      request,
    );
    expect(score).toBeGreaterThan(0);
  });

  it("rejects an NTSC/USA image", () => {
    const score = scorePalArtworkCandidate(
      candidate("File:Silent Hill 2 PlayStation 2 USA NTSC cover.jpg"),
      request,
    );
    expect(score).toBe(-1000);
  });

  it("rejects the wrong platform even when it is PAL", () => {
    const score = scorePalArtworkCandidate(
      candidate("File:Silent Hill 2 Xbox PAL Europe cover.jpg"),
      request,
    );
    expect(score).toBe(-1000);
  });

  it("can use an exact PAL product code as strong evidence", () => {
    const score = scorePalArtworkCandidate(
      candidate("File:Silent Hill 2 SLES-50382 PAL disc.jpg"),
      request,
    );
    expect(score).toBeGreaterThan(250);
  });
});
