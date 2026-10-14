/**
 * showView (L8452): sliding sub-views inside a `.kbm-vp` (keyboard, system and account menus). Operates on the DOM like
 * the source — React renders the views' contents but never the `hidden` attribute.
 */
export function showView(vp: HTMLElement | null, name: string, dir: number, instant: boolean) {
  if (!vp) return;
  const views = [...vp.querySelectorAll<HTMLElement>(".kbm-view")], next = vp.querySelector<HTMLElement>(`[data-view="${name}"]`), prev = views.find((x) => !x.hidden);
  if (!next || prev === next) return;
  if (instant || !prev || matchMedia("(prefers-reduced-motion: reduce)").matches) { views.forEach((x) => (x.hidden = x !== next)); vp.style.height = ""; return; }
  const d = dir * (document.documentElement.dir === "rtl" ? -1 : 1), h0 = vp.offsetHeight;
  prev.style.position = "absolute"; prev.style.inset = "0 0 auto 0"; next.hidden = false;
  const h1 = next.offsetHeight;
  vp.style.height = h0 + "px"; void vp.offsetHeight; vp.style.height = h1 + "px";
  prev.animate([{ transform: "none", opacity: 1 }, { transform: `translateX(${-d * 40}px)`, opacity: 0 }], { duration: 200, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }).finished.then(() => { prev.hidden = true; prev.style.position = prev.style.inset = ""; prev.getAnimations().forEach((x) => x.cancel()); });
  next.animate([{ transform: `translateX(${d * 52}px)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 440, easing: "cubic-bezier(.2,1.1,.3,1)", delay: 60, fill: "backwards" });
  setTimeout(() => { vp.style.height = ""; }, 520);
  setTimeout(() => next.querySelector("button")?.focus({ preventScroll: true }), 80);
}
/** placeMenu (L8756): under the anchor, clamped to the viewport, caret position in --cx. */
export function placeMenu(menu: HTMLElement, btn: Element, shift: (w: number) => number) {
  const r = btn.getBoundingClientRect(), w = menu.offsetWidth, cx = r.left + r.width / 2;
  const left = Math.min(Math.max(8, cx - shift(w)), innerWidth - w - 8);
  menu.style.left = left + "px"; menu.style.top = r.bottom + 12 + "px";
  menu.style.setProperty("--cx", Math.min(Math.max(22, cx - left), w - 22) + "px");
}
