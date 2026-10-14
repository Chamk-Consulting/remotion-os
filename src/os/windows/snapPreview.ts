/** osSnapShow (L20912): one `.os-snapv` element appended to <body> on first use, shown over the target zone. */
import { osSnapRect, type Zone } from "./geometry";
let el: HTMLDivElement | null = null;
export function snapPreview(z: Zone | null) {
  if (!el) { el = document.createElement("div"); el.className = "os-snapv"; el.setAttribute("aria-hidden", "true"); document.body.appendChild(el); }
  if (!z) { el.classList.remove("on"); return; }
  const r = osSnapRect(z); Object.assign(el.style, { left: r.l + "px", top: r.t + "px", width: r.w + "px", height: r.h + "px" }); el.classList.add("on");
}
