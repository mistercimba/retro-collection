"use client";

import { useEffect, useRef, useState } from "react";
import { parseListState, serializeListState, type ListState } from "@/lib/list-url-state.logic";

export function useUrlListState<T extends ListState>(defaults: T, initialSearch = "") {
  const [state, setState] = useState<T>(() => parseListState(initialSearch, defaults));
  const historyMode = useRef<"push" | "replace" | null>(null);

  useEffect(() => {
    const restoreFromUrl = () => {
      historyMode.current = "replace";
      setState(parseListState(window.location.search, defaults));
    };
    window.addEventListener("popstate", restoreFromUrl);
    return () => window.removeEventListener("popstate", restoreFromUrl);
  }, [defaults]);

  useEffect(() => {
    const search = serializeListState(state, defaults);
    const nextUrl = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const mode = historyMode.current ?? "replace";
    historyMode.current = null;
    if (nextUrl !== currentUrl) window.history[`${mode}State`](window.history.state, "", nextUrl);
  }, [defaults, state]);

  const update = <K extends keyof T>(key: K, value: T[K], mode: "push" | "replace" = "push") => {
    historyMode.current = mode;
    setState((current) => ({ ...current, [key]: value }));
  };
  const currentSearch = serializeListState(state, defaults);
  return { state, update, currentSearch };
}
