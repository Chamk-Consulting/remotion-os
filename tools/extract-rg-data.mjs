// Extracts the registration wizard's static tables (icons, flags, dial codes, professions, roles, demo organisation
// directory, identifier types, verification channels) by EXECUTING the source lines, so nothing is retyped.
// Output: src/os/register/data.json. Usage: node tools/extract-rg-data.mjs
import fs from "node:fs"; import vm from "node:vm";
const L = fs.readFileSync("../source/Remotion_Desktop.html", "utf8").split("\n");
const take = (a, b) => L.slice(a - 1, b).join("\n");
const end = (a) => { let i = a; while (!/^\s*\}?\]?;?\s*$/.test(L[i - 1]) || i === a) { if (/;\s*$/.test(L[i - 1]) && i !== a) break; if (i === a && /;\s*$/.test(L[i - 1]) && !/[{[]\s*$/.test(L[i - 1])) break; i++; } return i; };
const ranges = [9261, 9284, 9297, 9298, 9303, 9304, 9333, 9379, 9384, 9412, 9418, 9425, 9517, 9525, 9553, 9559].map((a) => take(a, end(a)));
const code = ranges.join("\n") + "\n;({RGI,FLAGS,DIAL,PROFESSIONS,STEP_KEYS,NEXT_KEYS,PW_LV,PFI,RG_ROLES,ORG_DIR,ID_TYPES,OI,VI,VCH,RVI,LANG_FLAG})";
const out = vm.runInNewContext(code, {});
fs.writeFileSync("src/os/register/data.json", JSON.stringify(out));
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Array.isArray(v) ? v.length : Object.keys(v).length])));
