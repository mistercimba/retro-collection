export type SelectOption = { value: string; label: string };

export const REGION_OPTIONS: SelectOption[] = [
  { value: "PAL", label: "PAL" },
  { value: "NTSC-U/C", label: "NTSC-U/C" },
  { value: "NTSC-J", label: "NTSC-J" },
  { value: "Region Free", label: "Region Free" },
  { value: "Unknown", label: "Desconhecida" },
];

export const LANGUAGE_OPTIONS: SelectOption[] = [
  { value: "English", label: "Inglês" },
  { value: "Portuguese", label: "Português" },
  { value: "Spanish", label: "Espanhol" },
  { value: "French", label: "Francês" },
  { value: "German", label: "Alemão" },
  { value: "Italian", label: "Italiano" },
  { value: "Japanese", label: "Japonês" },
  { value: "Multi-language", label: "Multi-idioma" },
  { value: "Unknown", label: "Desconhecido" },
];

export const CONDITION_OPTIONS: SelectOption[] = [
  { value: "Mint", label: "Mint" },
  { value: "Near Mint", label: "Near Mint" },
  { value: "Excellent", label: "Excellent" },
  { value: "Good", label: "Good" },
  { value: "Fair", label: "Fair" },
  { value: "Poor", label: "Poor" },
  { value: "Unknown", label: "Desconhecida" },
];

export function withExistingOption(options: SelectOption[], value: string | number | undefined): SelectOption[] {
  const normalized = String(value ?? "").trim();
  if (!normalized || options.some((option) => option.value === normalized)) return options;
  return [{ value: normalized, label: normalized }, ...options];
}
