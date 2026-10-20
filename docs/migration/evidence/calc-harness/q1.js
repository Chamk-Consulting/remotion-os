const ctx=require('./harness.js');vm=require('vm');
const r=vm.runInContext(`(()=>{const o={};for(const k of CA_CATS){const c=CA_UD[k];o[k]={base:c.b,aff:!!c.aff,n:c.u.length,ids:c.u.map(r=>r[0]).join(",")}}return {units:o,consts:CA_CONSTS.map(c=>[c[0],c[1],c[5],c[7]].join(" ")),nconst:CA_CONSTS.length}})()`,ctx);
for(const k in r.units)console.log(k,JSON.stringify(r.units[k]));console.log(r.nconst);console.log(r.consts.join("\n"));
