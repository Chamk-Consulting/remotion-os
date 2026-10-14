// Extracts the notification-centre and account-menu tables by EXECUTING the source lines (functions are dropped from
// NC_KIND: their behaviour is ported in code). Output: src/os/notifications/data.json, src/os/account/data.json.
import fs from "node:fs"; import vm from "node:vm";
const L = fs.readFileSync("../source/Remotion_Desktop.html", "utf8").split("\n");
const take = (a, b) => L.slice(a - 1, b).join("\n");
const ctx = { t: (k) => k, toast: () => {}, installUpdate: () => {} };
const nc = vm.runInNewContext([take(9927, 9965), take(10185, 10185)].join("\n") + "\n;({NI,NC_KIND,PRI,PRI_KEY,CATS,TODAY_EVENTS})", ctx);
for (const k in nc.NC_KIND) delete nc.NC_KIND[k].run;
fs.writeFileSync("src/os/notifications/data.json", JSON.stringify(nc));
const acc = vm.runInNewContext([take(10200, 10222), take(10245, 10263)].join("\n") + "\n;({AI,ACCOUNTS,STATUSES,PROFILES,UNI,ORG_UNITS})", {});
fs.writeFileSync("src/os/account/data.json", JSON.stringify(acc));
console.log(Object.keys(nc), Object.keys(acc));
