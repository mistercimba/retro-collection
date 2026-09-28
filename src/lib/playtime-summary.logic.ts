export type PlaytimeValues = {
  main: string | null | undefined;
  extras: string | null | undefined;
  completionist: string | null | undefined;
};

export type PlaytimeSummary = { category: "Main Story" | "Main + Extras" | "Completionist"; value: string } | null;

export function getBestPlaytime(values: PlaytimeValues | null | undefined): PlaytimeSummary {
  if (!values) return null;
  if (values.main?.trim()) return { category: "Main Story", value: values.main.trim() };
  if (values.extras?.trim()) return { category: "Main + Extras", value: values.extras.trim() };
  if (values.completionist?.trim()) return { category: "Completionist", value: values.completionist.trim() };
  return null;
}
