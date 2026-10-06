export type PhysicalComponentKey = "media" | "box" | "manual";
export type PhysicalComponentState = "yes" | "no" | "unknown";

export type PhysicalComponent = {
  key: PhysicalComponentKey;
  label: string;
};

export type PhysicalCopyProfile = {
  platform: string;
  components: PhysicalComponent[];
  note: string;
};

const cartridgeCardboard = new Set(["NES", "SNES", "Nintendo 64", "Game Boy", "Game Boy Color", "GameBoy Advance"]);
const cartridgePlastic = new Set(["Nintendo DS", "Nintendo 3DS"]);
const opticalManual = new Set(["GameCube", "Nintendo Wii", "Nintendo Wii U", "Playstation", "Playstation 2", "Playstation 3"]);
const modernNoManual = new Set(["Nintendo Switch", "Playstation 5"]);
const psp = new Set(["PSP"]);

export function physicalCopyProfile(platform: string): PhysicalCopyProfile {
  if (cartridgeCardboard.has(platform)) {
    return {
      platform,
      components: [
        { key: "media", label: "Cartucho" },
        { key: "box", label: "Caixa / embalagem" },
        { key: "manual", label: "Manual" },
      ],
      note: "Cartucho, caixa e manual são verificados separadamente. Inserts/mapas específicos ficam para revisão se não estiverem documentados.",
    };
  }
  if (cartridgePlastic.has(platform)) {
    return {
      platform,
      components: [
        { key: "media", label: "Cartucho" },
        { key: "box", label: "Caixa" },
        { key: "manual", label: "Manual / folhetos principais" },
      ],
      note: "A checklist cobre os componentes base; extras específicos da edição só são assumidos quando forem conhecidos.",
    };
  }
  if (opticalManual.has(platform)) {
    return {
      platform,
      components: [
        { key: "media", label: "Disco" },
        { key: "box", label: "Caixa" },
        { key: "manual", label: "Manual / folhetos principais" },
      ],
      note: "Disco, caixa e manual são verificados separadamente; discos/extras adicionais ficam para revisão quando aplicável.",
    };
  }
  if (modernNoManual.has(platform)) {
    return {
      platform,
      components: [
        { key: "media", label: platform === "Nintendo Switch" ? "Cartucho" : "Disco" },
        { key: "box", label: "Caixa" },
      ],
      note: "Não assumimos manual em lançamentos modernos. Conteúdo especial adicional deve ser verificado caso a caso.",
    };
  }
  if (psp.has(platform)) {
    return {
      platform,
      components: [
        { key: "media", label: "UMD" },
        { key: "box", label: "Caixa" },
        { key: "manual", label: "Manual / folhetos principais" },
      ],
      note: "UMD, caixa e manual são verificados separadamente.",
    };
  }
  return {
    platform,
    components: [
      { key: "media", label: "Suporte físico" },
      { key: "box", label: "Caixa / embalagem" },
    ],
    note: "Perfil genérico: só perguntamos pelos componentes base que conseguimos assumir com segurança.",
  };
}

export function derivePhysicalCopyStatus(
  profile: PhysicalCopyProfile,
  states: Partial<Record<PhysicalComponentKey, PhysicalComponentState>>,
  sealed: boolean,
): string {
  if (sealed) return "Sealed";
  const values = profile.components.map((component) => states[component.key] ?? "unknown");
  if (values.some((value) => value === "unknown")) return "Needs review";
  if (values.every((value) => value === "yes")) return "CIB";

  const media = states.media ?? "unknown";
  const nonMedia = profile.components.filter((component) => component.key !== "media");
  if (media === "yes" && nonMedia.length > 0 && nonMedia.every((component) => states[component.key] === "no")) {
    return "Loose";
  }
  return "Incomplete";
}

export function physicalCopyNeedsReview(
  profile: PhysicalCopyProfile,
  states: Partial<Record<PhysicalComponentKey, PhysicalComponentState>>,
) {
  return profile.components.some((component) => (states[component.key] ?? "unknown") === "unknown");
}

export function componentStateToLibraryValue(value: PhysicalComponentState | undefined) {
  return value === "yes" ? "Yes" : value === "no" ? "No" : "";
}
