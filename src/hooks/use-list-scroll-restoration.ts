"use client";

import { useEffect } from "react";
import { resolveSavedListScroll } from "@/lib/list-scroll.logic";

const STORAGE_KEY = "retro-list-scroll";

export function saveListScrollPosition(href: string): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ href, y: window.scrollY }));
}

export function useListScrollRestoration(): void {
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    sessionStorage.removeItem(STORAGE_KEY);
    const y = resolveSavedListScroll(saved, `${window.location.pathname}${window.location.search}`);
    if (y !== null) requestAnimationFrame(() => window.scrollTo(0, y));
  }, []);
}
