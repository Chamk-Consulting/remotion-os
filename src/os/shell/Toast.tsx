"use client";
import { useEffect, useRef } from "react";
import { useShell } from "@/os/state/shell";
import { useI18n } from "@/lib/i18n/I18nProvider";

/**
 * Source toast (L7597: 1.6 s) and toastUndo (L10067: 4.5 s, Undo button, `.act`). As in the source, hiding only removes
 * the `show` class: the text stays in place while the toast fades out.
 * Also hosts the global `[data-t]` click toast ("X opened", L7598).
 */
export function Toast() {
  const toast = useShell((s) => s.toast);
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current; if (!toast || !el) return;
    el.classList.add("show"); if (toast.undo) el.classList.add("act"); else el.classList.remove("act");
    const id = setTimeout(() => el.classList.remove("show", "act"), toast.undo ? 4500 : 1600);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const h = (e: MouseEvent) => { const b = (e.target as Element).closest?.("[data-t]") as HTMLElement | null; if (b) useShell.getState().showToast(t("opened", { x: t(b.dataset.t!) })); };
    document.addEventListener("click", h); return () => document.removeEventListener("click", h);
  }, [t]);
  return (
    <div className="toast" id="toast" role="status" ref={ref}>
      {toast?.msg}{toast?.undo ? <button type="button" onClick={() => { toast.undo!(); ref.current?.classList.remove("show", "act"); }}>{t("undo")}</button> : null}
    </div>
  );
}
