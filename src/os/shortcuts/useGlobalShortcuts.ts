"use client";
/** Global shortcut handler built from the catalogue (L9914). Lock / sign-in / power screens will gate it when ported (B-09). */
import { setKbMenu } from "@/os/keyboard/KbMenu";
import { useEffect } from "react";
import { useShell } from "@/os/state/shell";
import { allRows, comboMatches, loadCustom, parseCombo } from "./catalogue";
import { runRow, setSysMenu } from "./actions";
import { closeSearch } from "./Palette";
import { scApi } from "./ShortcutsPanel";
import { registerOsAction } from "@/os/actions";

registerOsAction("sysMenu", setSysMenu);
export const overlayGate: { blocked: () => boolean } = { blocked: () => false };

export function useGlobalShortcuts() {
  useEffect(() => {
    loadCustom();
    const h = (e: KeyboardEvent) => {
      if (overlayGate.blocked()) return;
      const st = useShell.getState();
      if (e.key === "Escape") { if (st.palOpen) { closeSearch(); return; } if (st.scOpen) { scApi.close(); return; } setKbMenu(false); setSysMenu(false); return; }
      if (!(e.ctrlKey || e.altKey || e.metaKey)) return;
      for (const r of allRows()) { if (r.display) continue; if (comboMatches(parseCombo(r.combo), e)) { e.preventDefault(); runRow(r); return; } }
    };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, []);
}
