// Extracts the shell's static tables (shortcut catalogue, category / menu / palette icons) by EXECUTING the source lines,
// so nothing is retyped. Output: src/os/shortcuts/data.json. Usage: node tools/extract-shell-data.mjs
import fs from "node:fs"; import vm from "node:vm";
const L = fs.readFileSync("../source/Remotion_Desktop.html", "utf8").split("\n");
const take = (a, b) => L.slice(a - 1, b).join("\n");
const code = [take(8392, 8403), take(8524, 8555), take(8691, 8700), take(8819, 8823)].join("\n") + "\n;({MI,SC_CATS,CAT_IC,KEYTXT,SI,PI})";
const out = vm.runInNewContext(code, {});
fs.writeFileSync("src/os/shortcuts/data.json", JSON.stringify(out));
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Array.isArray(v) ? v.length : Object.keys(v).length])));
