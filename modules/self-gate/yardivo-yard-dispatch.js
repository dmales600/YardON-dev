(function(){
'use strict';
if(window.YardivoYardDispatch?.owner==='modules/self-gate/yardivo-yard-dispatch.js')return;

let running=false;
let lastRun=0;
let timer=0;

function role(){
  let r='';
  try{r=String(window.currentSession?.app_role||window.currentSession?.role||'').toLowerCase().trim()}catch(_){}
  if(r==='porta'||r==='portir')r='gate';
  if(r==='prijam')r='reception';
  return r;
}
function allowed(){return ['admin','gate','reception'].includes(role())}
async function token(){
  const direct=String(window.__yardivoSupplierAccessToken||'').trim();if(direct)return direct;
  const c=await window.YardivoAuth?.client?.();
  let s=(await c?.auth?.getSession?.())?.data?.session||null;
  if(!s?.access_token)s=(await c?.auth?.refreshSession?.())?.data?.session||null;
  if(!s?.access_token)throw new Error('ONLINE PRIJAVA NIJE AKTIVNA.');
  return s.access_token;
}
function config(){
  const base=String(window.YardivoSupabaseClient?.base||'https://ldzwgdwzolbvjxyznlry.supabase.co');
  const key=String(window.YardivoSupabaseClient?.publishableKey||'sb_publishable_f3daeEDsH7zNSiFR5QluaQ_AP4Ptjzz');
  return {base,key};
}
async function dispatch(warehouse='',force=false){
  if(!allowed()||running)return null;
  const now=Date.now();if(!force&&now-lastRun<1800)return null;
  running=true;lastRun=now;
  try{
    const {base,key}=config(),t=await token();
    const r=await fetch(base+'/functions/v1/yardivo-yard-dispatch',{
      method:'POST',
      headers:{apikey:key,Authorization:'Bearer '+t,'Content-Type':'application/json'},
      body:JSON.stringify({action:'dispatch',...(warehouse?{warehouse}: {})})
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d?.ok===false)throw new Error(d?.error||('YARD DISPATCH HTTP '+r.status));
    const assignments=(d.results||[]).flatMap(x=>x?.assignments||[]);
    if(assignments.length){
      try{window.dispatchEvent(new CustomEvent('yardivo:yard-ai-dispatched',{detail:{assignments,results:d.results||[]}}))}catch(_){}
      try{window.showYmsToast?.('success','YARDON AI · RAMPA DODIJELJENA',assignments.map(x=>String(x.dock||'')).filter(Boolean).join(', '),3600)}catch(_){}
    }
    return d;
  }catch(e){
    console.warn('YardOn AI yard dispatch',e);
    return null;
  }finally{running=false}
}
function warehouseForAnnouncement(id){
  try{
    const list=Array.isArray(window.announcements)?window.announcements:(typeof announcements!=='undefined'&&Array.isArray(announcements)?announcements:[]);
    return String(list.find(x=>String(x?.id)===String(id))?.warehouse||'');
  }catch(_){return''}
}
function schedule(warehouse='',delay=150,force=true){
  clearTimeout(timer);timer=setTimeout(()=>void dispatch(warehouse,force),delay);
}

window.addEventListener('yardivo:receiving-status-changed',e=>{
  const st=String(e?.detail?.status||'');
  if(!['Zaprimljeno','Odbijen'].includes(st))return;
  schedule(warehouseForAnnouncement(e?.detail?.id),120,true);
});
window.addEventListener('yardivo:login',()=>schedule('',900,true));
window.addEventListener('yardivo:master-data-changed',()=>schedule('',500,true));
window.addEventListener('focus',()=>schedule('',150,false));
document.addEventListener('click',e=>{
  if(!allowed())return;
  if(e.target?.closest?.('button[data-approve],button[data-gate-approve],[data-yv-manual-gate-enter]'))schedule('',700,true);
},true);
window.addEventListener('load',()=>{
  schedule('',1600,true);
  setInterval(()=>{if(document.visibilityState==='visible'&&allowed())void dispatch('',false)},5000);
});

window.YardivoYardDispatch={owner:'modules/self-gate/yardivo-yard-dispatch.js',dispatch,schedule,allowed};
})();
