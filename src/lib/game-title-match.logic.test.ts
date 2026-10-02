import { describe, expect, it } from "vitest";
import { editionsCompatible, isCompoundChoiceTitle, titleMatchRank } from "./game-title-match.logic";

describe("shared game title matching", () => {
  it("covers source naming differences without per-game aliases", () => {
    expect(titleMatchRank("Persona 4", "Shin Megami Tensei: Persona 4", "PS2")).not.toBeNull();
    expect(titleMatchRank("The Legend of Zelda: Ocarina of Time 3D", "Zelda Ocarina of Time 3D", "3DS")).not.toBeNull();
    expect(titleMatchRank("Castlevania III: Dracula's Curse", "Castlevania 3", "NES")).toBe(3);
    expect(titleMatchRank("SoulCalibur II", "Soul Calibur 2", "GameCube")).not.toBeNull();
    expect(titleMatchRank("WarioWare, Inc.: Minigame Mania", "Wario Ware Minigame Mania", "GBA")).not.toBeNull();
    expect(titleMatchRank("Shadow Man", "Shadowman", "N64")).not.toBeNull();
    expect(titleMatchRank("Dragon Quest VIII: Journey of the Cursed King", "Dragon Quest VIII: El Periplo Del Rey Maldito", "3DS")).toBe(0);
    expect(titleMatchRank("Sly 2: Band of Thieves", "Sly 2 Bando de Espertalhoes", "PS2")).toBe(0);
    expect(titleMatchRank("Mario & Luigi: Superstar Saga + Bowser's Minions", "Mario & Luigi: Superstar Saga + Secuaces De Bowser", "3DS")).toBe(0);
  });

  it("uses verified platform-scoped regional aliases instead of guessing", () => {
    expect(titleMatchRank("Survival Kids", "Stranded Kids", "GBC")).toBe(0);
    expect(titleMatchRank("Castlevania: Circle of the Moon", "Castlevania", "GBA")).toBe(0);
    expect(titleMatchRank("Maximo: Ghosts to Glory", "Maximo", "PS2")).toBe(0);
    expect(titleMatchRank("Mario & Luigi: Bowser's Inside Story", "Mario & Luigi: Viaje al Centro de Bowser", "DS")).toBe(0);
    expect(titleMatchRank("Survival Kids", "Stranded Kids", "Game Boy")).toBeNull();
  });

  it("accepts a unique shortened source title only when enough identity remains", () => {
    expect(titleMatchRank("Project Zero II: Crimson Butterfly", "Project Zero 2", "PS2")).toBe(3);
    expect(titleMatchRank("Dragon Quest IX: Sentinels of the Starry Skies", "Dragon Quest IX, Sentinels Of The Starry", "DS")).toBe(3);
    expect(titleMatchRank("Ratchet & Clank 2: Locked and Loaded", "Ratchet & Clank 2", "PS2")).toBe(3);
    expect(titleMatchRank("Professor Layton vs Phoenix Wright: Ace Attorney", "Professor Layton vs. Phoenix Wright", "3DS")).toBe(3);
    expect(titleMatchRank("Gran Turismo 2", "Gran Turismo 2: The Real Driving Simulator", "PS1")).toBe(3);
  });

  it("handles regional alternate-title notation and source ordering", () => {
    expect(titleMatchRank("Yoshi's Island / Super Mario World 2", "Super Mario World 2 Yoshi's Island", "SNES")).not.toBeNull();
    expect(titleMatchRank("Luigi's Mansion 2 / Dark Moon", "Luigi's Mansion 2: Dark Moon", "3DS")).not.toBeNull();
    expect(titleMatchRank("Crash Team Racing", "CTR: Crash Team Racing", "PS1")).not.toBeNull();
  });

  it("fails closed on broad franchise bases and explicit either-or targets", () => {
    expect(titleMatchRank("Castlevania: Circle of the Moon", "Castlevania", "GBA")).toBeNull();
    expect(titleMatchRank("Resident Evil 4", "Resident Evil", "PS5")).toBeNull();
    expect(titleMatchRank("Kingdom Hearts II", "Kingdom Hearts", "PS2")).toBeNull();
    expect(titleMatchRank("Onimusha 2: Samurai's Destiny", "Klonoa 2: Lunatea's Veil", "PS2")).toBeNull();
    expect(titleMatchRank("Metroid Prime Trilogy", "Metroid Prime 3: Corruption", "Wii")).toBeNull();
    expect(titleMatchRank("Mario Party 6", "Mario Golf 6", "GameCube")).toBeNull();
    expect(titleMatchRank("Pokemon Mystery Dungeon: Red Rescue Team", "Pokemon Mystery Dungeon: Blue Rescue Team", "GBA")).toBeNull();
    expect(isCompoundChoiceTitle("Pokémon Black 2 ou White 2")).toBe(true);
    expect(titleMatchRank("Pokémon Black 2 ou White 2", "Pokemon Black 2", "DS")).toBeNull();
    expect(titleMatchRank("Fire Emblem Fates (Birthright ou Conquest)", "Fire Emblem Fates Birthright", "3DS")).toBeNull();
  });

  it("keeps materially different editions separate", () => {
    expect(editionsCompatible("Crash Team Racing PAL original", "Crash Team Racing, + Manual, Caixa")).toBe(true);
    expect(editionsCompatible("Crash Team Racing PAL original", "Crash Team Racing Platinum Ed., + Manual, Caixa")).toBe(false);
    expect(editionsCompatible("Wipeout 3 Special Edition", "Wipeout 3, Special Ed., + Manual, Caixa")).toBe(true);
    expect(editionsCompatible("Super Metroid", "Super Metroid Big Box Ltd Ed. w/Guide Book")).toBe(false);
    expect(editionsCompatible("Project Zero 2", "Project Zero 2 [Promo Not For Resale]")).toBe(false);
    expect(editionsCompatible("Donkey Kong Country 2", "Donkey Kong Country 2 [Pirate Pak]")).toBe(false);
  });
});
