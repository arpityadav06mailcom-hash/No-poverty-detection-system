async function api(url,options={}){const r=await fetch(url,{credentials:"include",...options});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.message||"Request failed");return d}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
