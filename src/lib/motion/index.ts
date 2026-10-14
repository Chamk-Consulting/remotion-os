"use client";
/**
 * Motion utilities (ADR-07). Source mechanisms are kept: Web Animations API with the same durations and easings,
 * gated by the source's reduced-motion rule `lkRM()` (L8897) = OS setting OR the lock-screen "reduce motion" preference.
 */
export const EASE = {
  spring: "cubic-bezier(.2,1.25,.35,1)", // --spring
  ease: "cubic-bezier(.22,.8,.24,1)", // --ease
  pop: "cubic-bezier(.2,1,.3,1)",
  overshoot: "cubic-bezier(.2,1.3,.3,1)",
  exit: "cubic-bezier(.4,0,1,1)",
  space: "cubic-bezier(.72,0,.24,1)", // desktop slide 820 ms
} as const;

/** Source lkRM(): user setting in `remotion-lk.rm` or prefers-reduced-motion. */
export function reducedMotion(): boolean {
  try {
    const s = JSON.parse(localStorage.getItem("remotion-lk") || "{}");
    if (s && s.rm) return true;
  } catch {}
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** el.animate() that becomes a no-op under reduced motion (same gate as every source call site). */
export function animate(el: Element | null | undefined, keyframes: Keyframe[] | PropertyIndexedKeyframes, opts: KeyframeAnimationOptions) {
  if (!el || reducedMotion() || typeof (el as HTMLElement).animate !== "function") return null;
  return (el as HTMLElement).animate(keyframes, opts);
}

/** View Transition wrapper with the source fallback (L7662, L10428). */
export function withViewTransition(update: () => void, rootClass?: string) {
  const d = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
  if (d.startViewTransition && !reducedMotion()) {
    if (rootClass) document.documentElement.classList.add(rootClass);
    d.startViewTransition(update).finished.finally(() => rootClass && document.documentElement.classList.remove(rootClass));
    return true;
  }
  update();
  return false;
}
