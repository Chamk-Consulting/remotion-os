/**
 * Pre-paint script (runs in <head> before first paint). Reproduces the source boot exactly:
 * - language: remotion-lang validated against the 4 languages, else "en" (L7506) → <html lang dir> (L7981–L7982)
 * - theme: remotion-theme "light"|"dark", else auto = [data-theme] or prefers-color-scheme (L10418–L10422) → html.dark|.light
 */
export const PREPAINT = `(function(){try{var d=document.documentElement,D={en:"ltr",fr:"ltr",de:"ltr",ar:"rtl"},l=null;try{l=localStorage.getItem("remotion-lang")}catch(e){}if(!D[l])l="en";d.lang=l;d.dir=D[l];var s=null;try{s=localStorage.getItem("remotion-theme")}catch(e){}var h=d.getAttribute("data-theme");var k=s==="dark"||(s!=="light"&&(h?h==="dark":matchMedia("(prefers-color-scheme: dark)").matches));d.classList.add(k?"dark":"light")}catch(e){}})();`;
