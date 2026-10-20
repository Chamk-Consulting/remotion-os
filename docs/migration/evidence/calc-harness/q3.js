const ctx=require('./harness.js');const vm=require('vm');
vm.runInContext("caUnitsBuild()",ctx);
const out=vm.runInContext(`(()=>{const L=s=>L4(s||"");const o=[];for(const d of Object.values(CA_T)){if(d.page)continue;const v=caVals(d);let r,err=null;try{r=d.run(caCtx(d,v))}catch(e){err=(e.k||e.message)+(e.x?":"+e.x:"")}
o.push({id:d.id,fields:(d.f||[]).map(f=>f.k+":"+(f.ty||"num")+(f.cat?"["+f.cat+"]":"")).join(","),modes:(d.f||[]).filter(f=>f.ty==="seg"||f.ty==="sel").map(f=>f.k+"="+f.o.map(x=>x[0]).join("/")).join(" ; "),warnTop:d.warnTop?L(d.warnTop).slice(0,160):"",main:r&&r.main?L(r.main[0])+" = "+r.main[1]+(r.main[2]?" "+r.main[2]:""):"",rows:r&&r.rows?r.rows.length:0,table:!!(r&&r.table),svg:!!(r&&r.svg),warn:r&&r.warn?r.warn.length:0,err,null:r==null&&!err,desc:L(d.d).slice(0,200)})}return JSON.stringify(o)})()`,ctx);
for(const t of JSON.parse(out))console.log(JSON.stringify(t));
