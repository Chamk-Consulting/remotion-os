"use client";
/** On-screen keyboard `#kb` + `#kbPop` (source markup L7011–L7021, behaviour L8036–L8388). */
import { Fragment, useEffect, useLayoutEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LANGS, type Lang } from "@/lib/i18n/langs";
import { KeyboardMarkup } from "@/os/shell/generated/KeyboardMarkup";
import { buildKeys, keyAria, keyLabel, type Key } from "./layout";
import { bootKb, fitCase, floatToggle, installKb, kbOnLang, keyClickActivate, keyDown, moreSugg, padToggle, pickSugg, topDrag, useKb } from "./kb";
import { useShell } from "@/os/state/shell";

export function Keyboard() {
  const { t, lang } = useI18n();
  const k = useKb();
  const keysRef = useRef<HTMLDivElement | null>(null);
  // Source boot order: settings load at parse time, applyLang (L27213) builds keys and suggestions, then applyKbSet +
  // setKbPos (L10410). Later language changes run applyLang's keyboard part.
  const booted = useRef<Lang | null>(null);
  useLayoutEffect(() => {
    if (booted.current === null) { bootKb(lang); booted.current = lang; return; }
    if (booted.current !== lang) { booted.current = lang; kbOnLang(lang); }
  }, [lang]);
  useEffect(() => installKb(), []);

  const locale = LANGS[k.built.lang as Lang].locale;
  // refreshKeys (L8105): modifier classes are toggled on the live elements (they keep their transient down / pressed classes).
  useLayoutEffect(() => {
    const keys = buildKeys(k.built.layout, k.built.pad).keys;
    keysRef.current?.querySelectorAll<HTMLElement>(".key").forEach((el) => {
      const key = keys[+el.dataset.i!];
      const on = ({ shift: k.st.shift, ctrl: k.st.ctrl, alt: k.st.alt, altgr: k.st.altgr, fn: k.st.fn } as Record<string, boolean>)[key.t];
      el.classList.toggle("active", !!on);
      if (key.t === "caps") el.classList.toggle("lock-on", k.st.caps);
    });
  });

  const keyBtn = (key: Key, c: number) => {
    const a = keyAria(key, k.st, locale, t);
    return <button key={key.i} className={"key " + (key.cls || "")} style={{ ["--w" as string]: key.w || 1, ["--c" as string]: c }} data-i={key.i} data-code={key.code}
      aria-label={a ?? undefined} aria-pressed={key.t === "caps" ? k.st.caps : undefined} dangerouslySetInnerHTML={{ __html: keyLabel(key, k.st, locale, k.built.lang, t) }} />;
  };
  const rows = buildKeys(k.built.layout, k.built.pad).rows;

  const p = (id: string): Record<string, unknown> => {
    switch (id) {
      case "kb": return { onPointerDown: (e: React.PointerEvent) => { if (!(e.target as Element).closest("input")) e.preventDefault(); } };
      case "kbTop": return { onPointerDown: topDrag };
      case "kbFloat": return { onClick: floatToggle };
      case "kbMore": return { onClick: moreSugg };
      case "kbMic": return { onClick: () => useShell.getState().showToast(t("kbMic")) };
      case "kbPad": return { onClick: padToggle };
      case "kbSugg": return { onClick: (e: React.MouseEvent) => { const b = (e.target as Element).closest<HTMLElement>("[data-s]"); if (b) pickSugg(b.dataset.s!); } };
      case "kbKeys": return { ref: keysRef, onPointerDown: keyDown, onClick: keyClickActivate };
      default: return {};
    }
  };
  const slot = (id: string, fb: React.ReactNode): React.ReactNode => {
    switch (id) {
      // Source markup (L8264) has role="option" without aria-selected; kept identical (accessibility defects are in doc 12).
      // eslint-disable-next-line jsx-a11y/role-has-required-aria-props
      case "kbSugg": return k.sugg.list.map((x, i) => <button key={k.sugg.rev + ":" + i} role="option" className={i < 2 ? "hit" : ""} data-s={x} dir="auto">{fitCase(k.sugg.w, x)}</button>);
      case "kbKeys": return rows.map((row, r) => (
        <div key={k.epoch + ":" + r} className="kb-row" style={{ ["--r" as string]: r }}>
          {row.map((x, ci) => ("group" in x
            ? <div key={"g" + ci} className="arrows" style={{ ["--w" as string]: x.w }}>{keyBtn(x.keys[0], ci)}<div className="ud">{keyBtn(x.keys[1], ci + 1)}{keyBtn(x.keys[2], ci + 1)}</div>{keyBtn(x.keys[3], ci + 2)}</div>
            : <Fragment key={x.i}>{keyBtn(x, ci)}</Fragment>))}
        </div>));
      default: return fb;
    }
  };
  return <>
    <KeyboardMarkup t={t} p={p} s={slot} />
    <div className="kb-pop" id="kbPop" aria-hidden="true"></div>
  </>;
}
