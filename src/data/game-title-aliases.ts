export type GameTitleAliasGroup = {
  platform: string;
  canonical: string;
  aliases: readonly string[];
};

/**
 * Verified regional/market title identities that cannot be derived safely from
 * generic token matching alone. Keep this list small, platform-scoped and
 * evidence-backed; it is identity data, not fuzzy-matching policy.
 */
export const GAME_TITLE_ALIAS_GROUPS: readonly GameTitleAliasGroup[] = [
  {
    platform: "GBC",
    canonical: "Survival Kids",
    aliases: ["Stranded Kids"],
  },
  {
    platform: "GBA",
    canonical: "Castlevania: Circle of the Moon",
    aliases: ["Castlevania"],
  },
  {
    platform: "PS2",
    canonical: "Maximo: Ghosts to Glory",
    aliases: ["Maximo"],
  },
  {
    platform: "PS2",
    canonical: "Sly 2: Band of Thieves",
    aliases: ["Sly 2: Bando de Espertalhões"],
  },
  {
    platform: "DS",
    canonical: "Mario & Luigi: Bowser's Inside Story",
    aliases: [
      "Mario & Luigi: Viaje al centro de Bowser",
      "Mario & Luigi: Voyage au centre de Bowser",
      "Mario & Luigi: Abenteuer Bowser",
      "Mario & Luigi: Viaggio al Centro di Bowser",
    ],
  },
  {
    platform: "3DS",
    canonical: "Dragon Quest VIII: Journey of the Cursed King",
    aliases: ["Dragon Quest VIII: El Periplo Del Rey Maldito"],
  },
  {
    platform: "3DS",
    canonical: "Mario & Luigi: Superstar Saga + Bowser's Minions",
    aliases: ["Mario & Luigi: Superstar Saga + Secuaces De Bowser"],
  },
];
