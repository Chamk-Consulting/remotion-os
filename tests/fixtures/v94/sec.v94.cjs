/* Extracted verbatim from Remotion OS v94 (L29327-L29476, v92 security of imports): the oracle for src/lib/security. */
const SEC_TAG_DROP="script,style,iframe,frame,frameset,object,embed,applet,link,meta,base,noscript,template,portal,foreignObject,form,input,button,textarea,select,option,dialog";
const SEC_URL_ATTR=new Set(["href","src","xlink:href","action","formaction","background","poster","data","cite","ping","lowsrc","dynsrc","longdesc","usemap","manifest","codebase","srcset"]);
function secUrl(v,img){const s=String(v??"");const n=s.replace(/[\u0000-\u0020\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g,"").toLowerCase();
  const m=/^([a-z][a-z0-9+.\-]*):/.exec(n);if(!m)return s;/* relative, #anchor, @placeholder */
  const p=m[1];if(p==="http"||p==="https")return s.replace(/["<>\s`]/g,c=>"%"+c.charCodeAt(0).toString(16).padStart(2,"0").toUpperCase());if(!img&&(p==="mailto"||p==="tel"))return s;
  if(p==="data"&&/^data:image\/(png|jpe?g|gif|webp|bmp|avif|svg\+xml)[;,]/.test(n))return s;if(p==="blob"&&img)return s;return ""}
function secCleanTree(root){if(!root||!root.querySelectorAll)return root;
  root.querySelectorAll(SEC_TAG_DROP).forEach(x=>{/* form controls: keep their text, drop the control */if(/^(form|button|dialog)$/i.test(x.localName))x.replaceWith(...x.childNodes);else x.remove()});
  root.querySelectorAll("animate,set,animateMotion,animateTransform").forEach(x=>{if(/href|xlink/i.test(x.getAttribute("attributeName")||""))x.remove()});
  root.querySelectorAll("*").forEach(el=>{[...el.attributes].forEach(a=>{const n=a.name.toLowerCase(),ln=(a.localName||n).toLowerCase();
    if(n.startsWith("on")||n==="srcdoc"||n==="is"||n==="formaction"||n==="action"){el.removeAttribute(a.name);return}
    if(SEC_URL_ATTR.has(n)||SEC_URL_ATTR.has(ln)){if(n==="srcset"||ln==="srcset"){el.removeAttribute(a.name);return}
      const img=/^(img|image|source|video|audio|picture)$/i.test(el.localName)&&ln==="src";const v=secUrl(a.value,img);if(v===""&&a.value!=="")el.removeAttribute(a.name)}
    else if(n==="style"&&/expression\s*\(|javascript:|-moz-binding|behavior\s*:/i.test(a.value))el.removeAttribute(a.name)})});
  return root}
function secClean(html){const tp=document.createElement("template");tp.innerHTML=String(html??"");secCleanTree(tp.content);return tp.innerHTML}
/* a template is inert: nothing in it loads or runs while it is cleaned */
const secFont=f=>f==null?f:String(f).replace(/[^\p{L}\p{N} _.\-]/gu,"").trim().slice(0,64)||null;
const secColor=c=>c==null||c===""?c:/^(#[0-9a-f]{3,8}|[a-z]{3,20}|(rgb|hsl)a?\([\d\s.,%/]+\))$/i.test(String(c).trim())?String(c).trim():null;
const secLang=l=>l==null?l:/^[a-z]{2}(-[a-z0-9]{2,8})?$/i.test(String(l))?String(l):null;
const SEC_URL_KEY=/^(src|img|image|url|href|link|logo|sig|signature|photo|avatar|file|poster)$/i;
function secDoc(d){const walk=(o,depth)=>{if(!o||typeof o!=="object"||depth>14)return;
    for(const k of Object.keys(o)){const v=o[k];
      if(typeof v==="string"){if(k==="html")o[k]=secClean(v);else if(SEC_URL_KEY.test(k))o[k]=secUrl(v,/^(src|img|image|logo|sig|signature|photo|avatar|poster)$/i.test(k));
        else if(/^(font|ff|family)$/i.test(k))o[k]=v.replace(/["'<>;{}\\()]/g,"").slice(0,120);else if(k==="lang"){o[k]=secLang(v)||""}else if(k==="dir"&&!/^(ltr|rtl|auto)$/.test(v))o[k]="auto"}
      else if(v&&typeof v==="object")walk(v,depth+1)}};
  try{walk(d,0);const S=d&&d.set;if(S){if(S.font!=null)S.font=secFont(S.font)||"Inter";["acc","hcol"].forEach(k=>{if(S[k]!=null&&S[k]!=="acc"){const c=secColor(S[k]);if(c==null)delete S[k];else S[k]=c}})}}catch(e){}return d}

function secCsv(c){if(c==null)return "";if(typeof c==="number")return String(c);const s=String(c);return /^[=+\-@\t\r]/.test(s)&&!/^[-+]?\d[\d\s.,]*%?$/.test(s)?"'"+s:s}
module.exports={secUrl,secCleanTree,secClean,secFont,secColor,secLang,secDoc,secCsv};
