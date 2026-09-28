"use client";

import { LogOut } from "lucide-react";

const SNAPSHOT_KEY = "retro-collection-offline-v1";

export function LogoutButton() {
  return (
    <form
      action="/logout"
      method="post"
      onSubmit={() => {
        try {
          localStorage.removeItem(SNAPSHOT_KEY);
        } catch {
          // Storage may be unavailable in a private browsing session.
        }
      }}
    >
      <button type="submit" className="icon-button" title="Terminar sessão" aria-label="Terminar sessão">
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}
