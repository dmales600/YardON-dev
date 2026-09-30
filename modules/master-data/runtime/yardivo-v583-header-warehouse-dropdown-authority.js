(function(){
'use strict';
if(window.__YARDIVO_HEADER_WAREHOUSE_AUTHORITY_V2__)return;
window.__YARDIVO_HEADER_WAREHOUSE_AUTHORITY_V2__=true;
let repairing=false;
let observer=null;

function master(){
  try{return JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')||{}}catch(_){return{}}
}
function session(){try{return window.currentSession||null}catch(_){return null}}
function normRole(v){v=String(v||'').toLowerCase().trim();if(v==='porta'||v==='portir')return'gate';if(v==='prijam')return'reception';if(v==='zalihe'||v.includes('zalih'))return'inventory';if(v==='management'||v==='voditelj')return'manager';return v}
function role(){const s=session();return normRole(s?.app_role||s?.role||'')}
function activeLocation(){
  const s=session();
  const v=String(window.YardivoAppStateV583?.location?.()||s?.location||'').trim();
  return v==='ALL'?'':v;
}
function rows(){
  const d=master(),loc=activeLocation();
  const all=Array.isArray(d.warehouses)?d.warehouses.filter(w=>w&&w.active!==false&&w.id):[];
  return loc?all.filter(w=>String(w.location_id)===loc):all;
}
function esc(v){return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}
function label(w){return String(w?.name||w?.id||'')}
function canonical(){
  const sel=document.getElementById('globalWarehouse');
  const selected=String(sel?.value||'').trim();
  if(selected&&selected!=='ALL')return selected;
  const active=String(window.activeWarehouse||'').trim();
  if(active&&active!=='ALL')return active;
  try{
    const app=String(window.YardivoAppStateV583?.warehouse?.()||'').trim();
    if(app&&app!=='ALL')return app;
  }catch(_){}
  try{
    const saved=String(localStorage.getItem('studenac_active_warehouse')||'').trim();
    if(saved&&saved!=='ALL')return saved;
  }catch(_){}
  return '';
}
function setCanonical(id){
  id=String(id||'').trim();if(!id)return;
  try{window.activeWarehouse=id;if(typeof activeWarehouse!=='undefined')activeWarehouse=id}catch(_){window.activeWarehouse=id}
  try{if(localStorage.getItem('studenac_active_warehouse')!==id)localStorage.setItem('studenac_active_warehouse',id)}catch(_){}
  try{if(String(window.YardivoAppStateV583?.warehouse?.()||'')!==id)window.YardivoAppStateV583?.setWarehouse?.(id)}catch(_){}
}
function rebuild(sel,{force=false}={}){
  if(!sel||repairing)return false;
  const ws=rows();
  if(!ws.length)return false;
  repairing=true;
  try{
    const wanted=canonical();
    const html=ws.map(w=>`<option value="${esc(w.id)}">${esc(label(w))}</option>`).join('');
    const valid=ws.map(w=>String(w.id));
    const next=valid.includes(wanted)?wanted:(valid.includes(String(sel.value||''))?String(sel.value):valid[0]);
    let changed=false;
    if(force||sel.innerHTML!==html){sel.innerHTML=html;changed=true}
    if(sel.disabled){sel.disabled=false;changed=true}
    if(String(sel.value)!==next){sel.value=next;changed=true}
    setCanonical(next);
    if(sel.id==='globalWarehouse'){
      const info=document.getElementById('globalWarehouseInfo');
      const w=ws.find(x=>String(x.id)===next);
      const text=String(w?.name||next).toUpperCase();
      if(info&&info.textContent!==text)info.textContent=text;
    }
    return changed;
  }finally{repairing=false}
}
function sync(){
  // globalWarehouse is the single visible authority; ygcWarehouseSelect follows it.
  if(role()!=='gate')rebuild(document.getElementById('globalWarehouse'));
  rebuild(document.getElementById('ygcWarehouseSelect'));
}
function guardLegacyRefill(){
  let old=null;
  try{old=window.refill||((typeof refill==='function')?refill:null)}catch(_){old=window.refill}
  if(typeof old!=='function'||old.__yardonHeaderGuardV2)return;
  const guarded=function(sel){
    if(sel?.id==='globalWarehouse'){
      rebuild(sel);
      return sel;
    }
    return old.apply(this,arguments);
  };
  guarded.__yardonHeaderGuardV2=true;
  guarded.__legacyRefill=old;
  try{window.refill=guarded;if(typeof refill!=='undefined')refill=guarded}catch(_){window.refill=guarded}
}
function watch(){
  const sel=document.getElementById('globalWarehouse');if(!sel)return;
  observer?.disconnect?.();
  observer=new MutationObserver(()=>{
    if(repairing)return;
    requestAnimationFrame(()=>rebuild(sel));
  });
  observer.observe(sel,{childList:true,subtree:true,characterData:true});
}
function install(){guardLegacyRefill();sync();watch()}

['yardivo:login','yardivo:context-changed','yardivo:master-data-changed','yardivo:data-synced'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(install,0)));
document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));
window.addEventListener('load',()=>{setTimeout(install,40);setTimeout(install,500);setTimeout(install,1400)});
document.addEventListener('change',e=>{
  if(e.target?.id==='globalWarehouse'){
    const id=String(e.target.value||'').trim();if(id&&id!=='ALL')setCanonical(id);
    setTimeout(sync,0);
  }
},true);
window.YardivoHeaderWarehouseAuthorityV583={sync,rebuild,install};
})();
