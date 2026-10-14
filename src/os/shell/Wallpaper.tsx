"use client";
import { useLayoutEffect, useRef } from "react";
import { useShell } from "@/os/state/shell";
import { paint, sceneFor } from "./wallpaper";

/** Source drawWall (L7592): DPR ≤ 2, repaint 150 ms after resize, on theme change and on desktop change. */
export function Wallpaper() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const isDark = useShell((s) => s.isDark);
  const scene = useShell((s) => s.desks[s.wallDesk]?.s ?? s.wallDesk);
  // Layout effect: the new scene must be painted synchronously when a desktop slide starts (slideSpace clones the old one first).
  useLayoutEffect(() => {
    const draw = () => { const c = ref.current; if (!c) return; const d = Math.min(devicePixelRatio || 1, 2); c.width = innerWidth * d; c.height = innerHeight * d; paint(c, sceneFor(scene, isDark), c.width, c.height); };
    draw(); let tm: ReturnType<typeof setTimeout>;
    const on = () => { clearTimeout(tm); tm = setTimeout(draw, 150); };
    addEventListener("resize", on); return () => { removeEventListener("resize", on); clearTimeout(tm); };
  }, [isDark, scene]);
  return <canvas id="wall" aria-hidden="true" ref={ref} />;
}
