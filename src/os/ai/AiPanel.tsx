"use client";
/**
 * `#ai` container (source L10562: created by script and inserted before `#scrim`). React renders it once with constant
 * props; the imperative island in ./ai.ts fills it and owns its classes / `hidden` from then on.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { registerOsAction } from "@/os/actions";
import { askAI, installAI, openAI, renderAI } from "./ai";
import "./form";

registerOsAction("ai", openAI);
registerOsAction("askAI", (it) => askAI(it));

export function AiPanel() {
  const { lang } = useI18n();
  useEffect(() => installAI(), []);
  // The language switch re-renders the whole panel (L7991, `window.__aiOn` is always set).
  const prev = useRef(lang);
  useLayoutEffect(() => { if (prev.current !== lang) { prev.current = lang; renderAI(); } }, [lang]);
  return <div className="ai" id="ai" hidden role="dialog" aria-labelledby="aiDlgT" />;
}
