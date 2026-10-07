
(function(){
'use strict';
if(window.__YARDIVO_GLOBAL_MASTER_CONTEXT_NAMES_V583__)return;
window.__YARDIVO_GLOBAL_MASTER_CONTEXT_NAMES_V583__=true;
const MASTER='yardivo_master_data_registry_v583';
const TECH=/^W\\d{3,}$/i;
const LEGACY=/^(W101|W103|W104|W201|W202|W203|W204)$/i;
function read(){try{const d=JSON.parse(localStorage.getItem(MASTER)||'{}');return {locations:Array.isArray(d.locations)?d.locations:[],warehouses:Array.isArray(d.warehouses)?d.warehouses:[],suppliers:Array.isArray(d.suppliers)?d.suppliers:[]}}catch(_){return{locations:[],warehouses:[],suppliers:[]}}}
function locations(){return read().locations.filter(x=>x&&x.active!==false)}
function warehouses(){return read().warehouses.filter(x=>x&&x.active!==false)}
function wh(id){return warehouses().find(x=>String(x.id)===String(id))||null}
function loc(id){return locations().find(x=>String(x.id)===String(id))||null}
function activeWarehouseId(){
 const a=String(window.activeWarehouse||window.YardivoAppStateV583?.warehouse?.()||'');
 if(wh(a))return a;
 const l=activeLocationId();
 return ''; // no implicit first-warehouse selection
}
function activeLocationId(){
 const s=String(window.currentSession?.location||'');
 if(loc(s))return s;
 const a=String(window.activeWarehouse||'');
 const w=wh(a);
 return w?.location_id||''; // no implicit first-location selection
}
function warehouseIds(){
 const l=activeLocationId();
 return warehouses().filter(w=>!l||String(w.location_id)===String(l)).map(w=>String(w.id));
}
function warehouseName(id){return wh(id)?.name||''}
function locationName(id){return loc(id)?.name||''}
function syncRegistry(){
 try{
  if(typeof WAREHOUSES==='object'&&WAREHOUSES){
   Object.keys(WAREHOUSES).forEach(k=>{if(LEGACY.test(k)&&!wh(k))delete WAREHOUSES[k]});
   warehouses().forEach(w=>{
    const l=loc(w.location_id);
    WAREHOUSES[w.id]={...(WAREHOUSES[w.id]||{}),name:w.name,label:w.name,location:w.location_id,locationName:l?.name||'',ramps:Number(w.ramps)||0};
   });
  }
 }catch(_){}
}
function sanitizeSelect(sel){
 if(sel?.closest?.('#yardivoStableMasterEditorV583'))return;
 const ids=new Set(warehouseIds());
 [...sel.options].forEach(o=>{
  const v=String(o.value||'').trim();
  if(!TECH.test(v))return;
  const w=wh(v);
  if(!w){o.remove();return}
  if(!ids.has(v)){o.remove();return}
  o.textContent=w.name||v;
 });
 const a=activeWarehouseId();
 if(a&&[...sel.options].some(o=>o.value===a)){
  const selected=String(sel.value||'');
  if(!selected||LEGACY.test(selected)||!wh(selected))sel.value=a;
 }
}
function replaceTechnicalText(root){
 const map=new Map(warehouses().map(w=>[String(w.id),String(w.name||w.id)]));
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){
  const p=n.parentElement;if(!p||p.closest('script,style,textarea,option'))return NodeFilter.FILTER_REJECT;
  return /\\bW\\d{3,}\\b/i.test(n.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
 }});
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 nodes.forEach(n=>{
  n.nodeValue=(n.nodeValue||'').replace(/\\bW\\d{3,}\\b/gi,code=>{
   if(map.has(code))return map.get(code);
   return LEGACY.test(code)?'':code;
  }).replace(/\\s{2,}/g,' ');
 });
}
function removeLegacyGhosts(root){
 root.querySelectorAll('select option').forEach(o=>{const v=String(o.value||o.textContent||'').trim();if(LEGACY.test(v)&&!wh(v))o.remove()});
 root.querySelectorAll('[data-warehouse],[data-warehouse-id]').forEach(el=>{
  const v=String(el.dataset.warehouse||el.dataset.warehouseId||'');
  if(LEGACY.test(v)&&!wh(v))el.remove();
 });
 ['.ct-wh','.warehouse-card','.warehouse-item','.wh-card','.ramp-warehouse-card'].forEach(q=>root.querySelectorAll(q).forEach(el=>{
  const m=(el.textContent||'').match(/\\bW(?:101|103|104|201|202|203|204)\\b/i);
  if(m&&!wh(m[0]))el.remove();
 }));
}
function paintContext(){
 syncRegistry();
 const root=document.querySelector('.view.active')||document.querySelector('.view[style*="block"]')||document.body;
 document.querySelectorAll('select').forEach(sanitizeSelect);
 removeLegacyGhosts(root);
 replaceTechnicalText(root);
 const top=document.querySelector('.topbar');if(top)replaceTechnicalText(top);
 const a=activeWarehouseId(),l=activeLocationId();
 document.documentElement.dataset.yardivoWarehouse=a;
 document.documentElement.dataset.yardivoLocation=l;
}
function queue(){requestAnimationFrame(()=>requestAnimationFrame(paintContext))}
['yardivo:context-changed','yardivo:master-data-changed','yardivo:data-synced','yardivo:login'].forEach(e=>window.addEventListener(e,queue));
document.addEventListener('DOMContentLoaded',()=>setTimeout(paintContext,80));
window.addEventListener('load',()=>setTimeout(paintContext,220),{once:true});
document.addEventListener('click',e=>{if(e.target.closest?.('.nav-btn,[data-view],[data-home-target]'))setTimeout(paintContext,30)},true);
document.addEventListener('change',e=>{if(e.target.matches?.('#globalWarehouse,#globalLocation,#yardivoStableContextV583 select,[id*=Warehouse],[id*=Location]'))setTimeout(paintContext,20)},true);
window.YardivoGlobalContextV583={read,locations,warehouses,warehouseIds,activeWarehouseId,activeLocationId,warehouseName,locationName,paint:paintContext};
})();
