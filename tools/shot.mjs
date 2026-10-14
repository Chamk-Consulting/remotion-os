// Dev helper: screenshot a URL (fixed clock, real fonts via local routing is not needed for same-origin target).
import { chromium } from '@playwright/test';
const [url, out, w = 1440, h = 900, scheme = 'light'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, colorScheme: scheme, reducedMotion: 'reduce' });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.clock.setFixedTime(new Date('2026-10-14T19:08:00+01:00'));
const LANG = process.env.LANG_SEED || ''; await p.addInitScript((l) => { try { if (!sessionStorage.getItem('__seeded')) { localStorage.clear(); if (l) localStorage.setItem('remotion-lang', l); sessionStorage.setItem('__seeded', '1'); } } catch {} }, LANG);
await p.goto(url); await p.waitForTimeout(3000); await p.screenshot({ path: out }); console.log('errors:', errs.slice(0, 5)); await b.close();
