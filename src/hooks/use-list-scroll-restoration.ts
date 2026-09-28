"use client";

import { useEffect } from "react";

const STORAGE_KEY = "retro-list-scroll";

export function saveListScrollPosition(href: string): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ href, y: window.scrollY }));
}

export function useListScrollRestoration(): void {
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    sessionStorage.removeItem(STORAGE_KEY);
    try {
      const position = JSON.parse(saved) as { href?: string; y?: number };
      if (position.href !== `${window.location.pathname}${window.location.search}` || typeof position.y !== "number") return;
      const y = position.y;
      requestAnimationFrame(() => window.scrollTo(0, y));
    } catch {
      // Ignore invalid session storage entries.
    }
  }, []);
}
