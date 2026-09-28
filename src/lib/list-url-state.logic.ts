import { displayPlatform, platformSlug } from "./data/platforms";

export type ListStateValue = string | boolean;
export type ListState = Record<string, ListStateValue>;

export function searchParamsToString(params: Record<string, string | string[] | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") search.set(key, value);
    else if (Array.isArray(value)) for (const entry of value) search.append(key, entry);
  }
  return search.toString();
}

export function parseListState<T extends ListState>(search: string, defaults: T): T {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const state = { ...defaults } as T;
  for (const key of Object.keys(defaults)) {
    const value = params.get(key);
    if (typeof defaults[key] === "boolean") {
      (state as Record<string, ListStateValue>)[key] = value === "1" || value === "true";
    } else if (value !== null) {
      (state as Record<string, ListStateValue>)[key] = value;
    }
  }
  return state;
}

export function serializeListState<T extends ListState>(state: T, defaults: T): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(defaults)) {
    const value = state[key];
    if (typeof value === "boolean") {
      if (value) params.set(key, "1");
    } else if (value && value !== defaults[key]) {
      params.set(key, value);
    }
  }
  return params.toString();
}

export function getSafeListReturnPath(value: string | string[] | undefined): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const url = new URL(value, "https://retro-collection.invalid");
    if (url.origin !== "https://retro-collection.invalid") return null;
    const allowed = url.pathname === "/collection" || url.pathname === "/collection/games" || url.pathname === "/want" || url.pathname === "/sell" || url.pathname === "/search" || /^\/platform\/[a-z0-9-]+$/.test(url.pathname);
    return allowed ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch {
    return null;
  }
}

export function listReturnLabel(path: string, platforms: string[]): string {
  let pathname = path;
  try {
    pathname = new URL(path, "https://retro-collection.invalid").pathname;
  } catch {
    return "Todos os jogos";
  }
  if (pathname === "/collection") return "Coleção";
  if (pathname === "/collection/games") return "Todos os jogos";
  if (pathname === "/want") return "À procura";
  if (pathname === "/sell") return "Para vender";
  if (pathname === "/search") return "Resultados da pesquisa";
  const match = pathname.match(/^\/platform\/([a-z0-9-]+)/);
  if (match) {
    const platform = platforms.find((item) => platformSlug(item) === match[1]);
    return platform ? displayPlatform(platform) : "Plataforma";
  }
  return "Todos os jogos";
}
