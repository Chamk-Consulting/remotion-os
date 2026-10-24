"use client";
/**
 * Transitions page rows added after v79 (v82 gestures, v83 hint, v84 overview, v87 last-fade note and measure, v88
 * compatibility check and export / import), in the HTML file's wrapper order (v94 L28923, L28958, L29077, L29184,
 * L29230). Strings for the switcher, overview and measure live here too so every module shares one copy.
 */
import { TR, trSt, trViewWraps } from "./transitions";

const lang = () => ({ fr: 0, en: 1, de: 2, ar: 3 } as Record<string, number>)[document.documentElement.lang] ?? 1;
export const L4 = (s: string) => { const p = s.split("|"); return p[lang()] || p[0]; };
export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const mk = (o: Record<string, string>) => (k: string) => L4(o[k] || k);

/* v80 switcher */
export const swW = mk({ title: "Applications ouvertes|Open apps|Geöffnete Apps|التطبيقات المفتوحة", none: "Aucune application ouverte|No open app|Keine geöffnete App|لا يوجد تطبيق مفتوح", min: "Réduite|Minimised|Minimiert|مصغرة", here: "Ce bureau|This desktop|Dieser Desktop|سطح المكتب هذا", hint: "Alt + ` pour avancer · Maj pour reculer · relâcher Alt pour ouvrir · Échap pour annuler|Alt + ` to move · Shift to go back · release Alt to open · Esc to cancel|Alt + ` weiter · Umschalt zurück · Alt loslassen zum Öffnen · Esc abbrechen|Alt + ` للتقدم · Shift للرجوع · حرر Alt للفتح · Esc للإلغاء" });
/* v81 */
export const trW7 = mk({ apps: "Applications ouvertes|Open apps|Geöffnete Apps|التطبيقات المفتوحة", slow: "Animations simplifiées : appareil lent|Simplified animations: slow device|Vereinfachte Animationen: langsames Gerät|حركة مبسطة: جهاز بطيء", settings: "Réglages|Settings|Einstellungen|الإعدادات" });
/* v82 gestures */
export const trW8 = mk({ gestures: "Gestes pour changer de bureau|Gestures to change desktop|Gesten zum Desktopwechsel|إيماءات تغيير سطح المكتب", pad: "Trackpad (actuel)|Trackpad (current)|Trackpad (aktuell)|لوحة اللمس (الحالي)", all: "Trackpad et tactile|Trackpad and touch|Trackpad und Touch|لوحة اللمس واللمس", off: "Désactivés|Off|Aus|معطّلة",
  hint8: "Trackpad : glissez à deux doigts sur le bureau. « Trackpad et tactile » ajoute l’écran tactile : un doigt sur téléphone, deux doigts sur tablette.|Trackpad: swipe with two fingers on the desktop. “Trackpad and touch” adds the touch screen: one finger on phones, two on tablets.|Trackpad: mit zwei Fingern auf dem Desktop wischen. „Trackpad und Touch“ ergänzt den Touchscreen: ein Finger auf Telefonen, zwei auf Tablets.|لوحة اللمس: اسحب بإصبعين على سطح المكتب. «لوحة اللمس واللمس» يضيف الشاشة اللمسية: إصبع واحد على الهاتف وإصبعان على اللوحي." });
/* v84 overview */
export const trWx = mk({ xpAll: "Afficher toutes les fenêtres|Show all windows|Alle Fenster anzeigen|عرض كل النوافذ", title: "Toutes les fenêtres|All windows|Alle Fenster|كل النوافذ",
  none: "Aucune fenêtre ouverte sur ce bureau|No open window on this desktop|Kein offenes Fenster auf diesem Desktop|لا توجد نافذة مفتوحة على سطح المكتب هذا",
  mins: "Réduites|Minimised|Minimiert|مصغرة", hint: "Cliquez une fenêtre pour l’ouvrir · flèches + Entrée · Échap pour fermer|Click a window to open it · arrows + Enter · Esc to close|Fenster anklicken zum Öffnen · Pfeile + Enter · Esc zum Schließen|انقر نافذة لفتحها · الأسهم + Enter · Esc للإغلاق",
  hintP: "Glissez une fenêtre sur un bureau pour l’y déplacer|Drag a window onto a desktop to move it there|Ziehen Sie ein Fenster auf einen Desktop, um es zu verschieben|اسحب نافذة إلى سطح مكتب لنقلها إليه",
  moved: "Fenêtre déplacée vers {d}|Window moved to {d}|Fenster verschoben nach {d}|نُقلت النافذة إلى {d}",
  overview: "Vue des bureaux|Desktop overview|Desktop-Übersicht|نظرة عامة على أسطح المكتب", desks: "Bureaux seulement (actuel)|Desktops only (current)|Nur Desktops (aktuell)|أسطح المكتب فقط (الحالي)", both: "Bureaux et fenêtres|Desktops and windows|Desktops und Fenster|أسطح المكتب والنوافذ",
  ovHint: "« Bureaux et fenêtres » étale aussi les fenêtres au-dessus du panneau des bureaux. Ctrl + Win + ↑ affiche toujours toutes les fenêtres.|“Desktops and windows” also spreads the windows above the desktop panel. Ctrl + Win + ↑ always shows all windows.|„Desktops und Fenster“ verteilt auch die Fenster über der Desktopleiste. Strg + Win + ↑ zeigt immer alle Fenster.|«أسطح المكتب والنوافذ» يوزّع النوافذ أيضًا فوق لوحة أسطح المكتب. Ctrl + Win + ↑ يعرض دائمًا كل النوافذ." });
/* v86 switcher close */
export const trW11 = mk({ close: "Fermer la fenêtre|Close window|Fenster schließen|إغلاق النافذة", hintDel: " · Suppr pour fermer| · Delete to close| · Entf zum Schließen| · Delete للإغلاق" });
/* v87 */
export const trW12 = mk({ last: "Dernier changement de bureau : fenêtres en fondu|Last desktop switch: windows faded|Letzter Desktopwechsel: Fenster überblendet|آخر تبديل لسطح المكتب: تلاشت النوافذ",
  r_setting: "réglage « Fondu »|“Fade” setting|Einstellung „Überblenden“|إعداد «تلاشٍ»", r_phone: "écran étroit (téléphone)|narrow screen (phone)|schmaler Bildschirm (Telefon)|شاشة ضيقة (هاتف)",
  r_appmode: "application en plein cadre|app in full-frame mode|App im Vollbildmodus|تطبيق في وضع ملء الإطار", r_dialog: "une boîte de dialogue était ouverte|a dialog was open|ein Dialog war geöffnet|كان مربع حوار مفتوحًا",
  r_big: "trop de grandes fenêtres|too many large windows|zu viele große Fenster|نوافذ كبيرة كثيرة", r_typing: "saisie en cours dans une fenêtre|typing in a window|Eingabe in einem Fenster|كتابة داخل نافذة",
  r_slow: "appareil lent : effet Classique pour cette session|slow device: Classic for this session|langsames Gerät: Klassisch für diese Sitzung|جهاز بطيء: الكلاسيكي لهذه الجلسة", r_moving: "une fenêtre était déplacée|a window was being moved|ein Fenster wurde verschoben|كانت نافذة تُنقل",
  measure: "Mesurer la fluidité de cet appareil|Measure smoothness on this device|Flüssigkeit auf diesem Gerät messen|قياس سلاسة الحركة على هذا الجهاز",
  measuring: "Mesure en cours…|Measuring…|Messung läuft…|جارٍ القياس…",
  smooth: "Fluide|Smooth|Flüssig|سلس", ok: "Correct|Acceptable|Akzeptabel|مقبول", choppy: "Saccadé : préférez Classique ou Fondu|Choppy: prefer Classic or Fade|Ruckelig: lieber Klassisch oder Überblenden|متقطع: يُفضّل الكلاسيكي أو التلاشي",
  fps: "images/s|frames/s|Bilder/s|إطار/ث", worst: "pire image|worst frame|schlechtestes Bild|أسوأ إطار",
  rmNone: "Animations réduites : rien à mesurer.|Reduced motion: nothing to measure.|Reduzierte Bewegung: nichts zu messen.|الحركة مخفّضة: لا شيء للقياس." });
/* v88 */
export const trW13 = mk({ diag: "Diagnostic de compatibilité|Compatibility check|Kompatibilitätsprüfung|فحص التوافق", exp: "Exporter les réglages|Export settings|Einstellungen exportieren|تصدير الإعدادات", imp: "Importer des réglages…|Import settings…|Einstellungen importieren…|استيراد الإعدادات…",
  ok: "OK|OK|OK|سليم", fb: "Repli|Fallback|Ersatz|بديل", miss: "Manquant|Missing|Fehlt|غير متوفر", copy: "Copier le rapport|Copy report|Bericht kopieren|نسخ التقرير", copied: "Rapport copié|Report copied|Bericht kopiert|تم نسخ التقرير",
  imported: "Réglages importés|Settings imported|Einstellungen importiert|تم استيراد الإعدادات", bad: "Fichier non reconnu : aucun réglage modifié|File not recognised: no setting changed|Datei nicht erkannt: nichts geändert|ملف غير معروف: لم يتغير أي إعداد",
  summary: "{ok} OK · {fb} repli · {miss} manquant|{ok} OK · {fb} fallback · {miss} missing|{ok} OK · {fb} Ersatz · {miss} fehlt|{ok} سليم · {fb} بديل · {miss} غير متوفر" });

const RESET = '<button class="kbm-item tr-reset"';
const beforeReset = (h: string, add: string) => { const j = h.indexOf(RESET); return j > 0 ? h.slice(0, j) + add + h.slice(j) : h + add; };
const rtl = () => (document.documentElement.dir === "rtl" ? -1 : 1);
let done = false;
/** Registers the rows once, after the v75–v79 ones. */
export function installTrSettings() {
  if (done) return; done = true;
  /* v82 · gestures */
  trViewWraps.push((h) => {
    const S = trSt(); const L = ["pad", "all", "off"], i = L.indexOf(S.gestures);
    return beforeReset(h, `<div class="kv tr-kv"><span>${esc(trW8("gestures"))}</span><div class="seg" role="radiogroup" aria-label="${esc(trW8("gestures"))}"><span class="thumb-ind" style="transform:translateX(${i * 100 * rtl()}%)"></span>${L.map((k) => `<button role="radio" aria-checked="${S.gestures === k}" data-trk="gestures" data-trv="${k}">${esc(trW8(k))}</button>`).join("")}</div></div><p class="tr-hint">${esc(trW8("hint8"))}</p>`);
  });
  /* v83 · the app-style hint says what really follows speed and calm */
  trViewWraps.push((h) => {
    const old = esc(L4("« Sobre » retire les rebonds dans les fenêtres d’applications (dossiers, agendas, documents). La vitesse s’applique aussi aux animations dans les applications.|“Calm” removes overshoot inside app windows (records, calendars, documents). Speed also applies to animations inside apps.|„Ruhig“ entfernt Nachschwingen in App-Fenstern. Die Geschwindigkeit gilt auch in Apps.|«هادئ» يزيل الارتداد داخل نوافذ التطبيقات. تنطبق السرعة أيضًا داخل التطبيقات."));
    const nu = esc(L4("« Sobre » retire les rebonds dans les applications et sur les fenêtres (ouverture, restauration). La vitesse s’applique aussi aux applications et aux fenêtres : ouverture, fermeture, réduction, agrandissement, ancrage.|“Calm” removes overshoot in apps and on windows (open, restore). Speed also applies to apps and windows: open, close, minimise, maximise, snap.|„Ruhig“ entfernt Nachschwingen in Apps und Fenstern (Öffnen, Wiederherstellen). Die Geschwindigkeit gilt auch für Apps und Fenster: Öffnen, Schließen, Minimieren, Maximieren, Andocken.|«هادئ» يزيل الارتداد في التطبيقات والنوافذ (الفتح، الاستعادة). تنطبق السرعة أيضًا على التطبيقات والنوافذ: الفتح، الإغلاق، التصغير، التكبير، الإرساء."));
    return h.split(old).join(nu);
  });
  /* v84 · desktop overview */
  trViewWraps.push((h) => {
    const S = trSt(); const L = ["desks", "both"], i = L.indexOf(S.overview);
    return beforeReset(h, `<div class="kv tr-kv"><span>${esc(trWx("overview"))}</span><div class="seg" role="radiogroup" aria-label="${esc(trWx("overview"))}"><span class="thumb-ind" style="width:calc((100% - 6px)/2);transform:translateX(${i * 100 * rtl()}%)"></span>${L.map((k) => `<button role="radio" aria-checked="${S.overview === k}" data-trk="overview" data-trv="${k}">${esc(trWx(k))}</button>`).join("")}</div></div><p class="tr-hint">${esc(trWx("ovHint"))}</p>`);
  });
  /* v87 · last automatic fade, measure */
  trViewWraps.push((h) => {
    const lw = TR.lastWhy;
    if (lw) {
      const note = `<p class="tr-note tr-why">${esc(trW12("last"))} — ${esc(trW12("r_" + lw.why))}.</p>`;
      const wHint = esc(L4("Fondu automatique sur téléphone, avec beaucoup de grandes fenêtres, ou pendant une saisie dans une fenêtre.|Automatic fade on phones, with many large windows, or while typing in a window.|Automatisches Überblenden auf Telefonen, bei vielen großen Fenstern oder während der Eingabe.|تلاشٍ تلقائي على الهاتف أو مع نوافذ كبيرة كثيرة أو أثناء الكتابة."));
      const k = h.indexOf(wHint); if (k > 0) { const e = h.indexOf("</p>", k) + 4; h = h.slice(0, e) + note + h.slice(e); } else h += note;
    }
    return beforeReset(h, `<button class="kbm-item tr-measure" data-trmeasure>${esc(trW12("measure"))}</button><p class="tr-hint tr-mres" aria-live="polite"></p>`);
  });
  /* v88 · compatibility check, export / import */
  trViewWraps.push((h) => beforeReset(h, `<div class="kbm-sep"></div><button class="kbm-item" data-trdiag>${esc(trW13("diag"))}</button><div class="tr-dres" aria-live="polite"></div><button class="kbm-item" data-trexp>${esc(trW13("exp"))}</button><button class="kbm-item" data-trimp>${esc(trW13("imp"))}</button><input type="file" accept="application/json,.json" class="tr-impf" hidden>`));
}
