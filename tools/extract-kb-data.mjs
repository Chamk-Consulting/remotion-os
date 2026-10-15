// Extracts the on-screen keyboard tables (layouts, key codes, accents, suggestion words, key icons) by EXECUTING the
// source lines L8007–L8035 (minus layoutName, which needs t()), so nothing is retyped. Output: src/os/keyboard/data.json.
import fs from "node:fs"; import vm from "node:vm";
const L = fs.readFileSync("../source/Remotion_Desktop.html", "utf8").split("\n");
const take = (a, b) => L.slice(a - 1, b).join("\n");
const code = [take(8007, 8013), take(8015, 8035)].join("\n") + "\n;({KB,LAYOUT_FOR,NUM,NUMS,FN,NUMC,R1C,R2C,R3C,VAR,WORDS,ICON})";
const out = vm.runInNewContext(code, {});
fs.writeFileSync("src/os/keyboard/data.json", JSON.stringify(out));
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Array.isArray(v) ? v.length : Object.keys(v).length])));
