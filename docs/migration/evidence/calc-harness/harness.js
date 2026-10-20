const fs=require('fs');const src=fs.readFileSync(process.argv[2]||__dirname+'/ca_core.js','utf8');
const store={};
const g={lang:"en",L4:s=>{const p=String(s).split("|");return p[1]||p[0]},t:(k)=>k,
localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},
document:{addEventListener(){},documentElement:{dir:"ltr"},createElement:()=>({style:{},setAttribute(){}}),querySelector:()=>null,activeElement:null},
nf:n=>new Intl.NumberFormat("en-GB").format(n),TextEncoder,TextDecoder,addEventListener(){},matchMedia:()=>({matches:false}),OSW:{},toast(){},console,Intl,Math,Date,JSON,BigInt,Number,String,Object,Array,Set,Map,Error,RegExp,setTimeout,clearTimeout,isFinite,isNaN,parseFloat,parseInt};
const vm=require('vm');const ctx=vm.createContext(g);
vm.runInContext(src+"\n;globalThis.__x={CA_T,CA_SECS,caEval,caFmt,CA_FN,CA_UD,CA_CONSTS,caSt};",ctx);
module.exports=ctx;
if(require.main===module){const {CA_T}=ctx.__x;for(const d of Object.values(CA_T)){const n=g.L4(d.n||"");console.log([d.id,d.sec,n,d.hidden?"hidden":"",d.page?"custom-page":"generic",(d.f||[]).length+"f",(d.ex||[]).length+"ex",d.lim?"lim":"",d.mount?"mount":""].join("\t"))}}
