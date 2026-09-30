(function(){
'use strict';
if(window.__YARDIVO_RECEIVING_HEADER_WAREHOUSE_QR_V583__)return;
window.__YARDIVO_RECEIVING_HEADER_WAREHOUSE_QR_V583__=true;

const CFG_KEY='yardivo_qr_scan_cfg_v583';
function userRole(){let r=String(window.currentSession?.app_role||window.currentSession?.role||'').toLowerCase();if(r==='prijam')r='reception';return r}
function masterData(){try{if(typeof master==='function')return master()||{locations:[],warehouses:[]}}catch(_){}try{return JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')||{locations:[],warehouses:[]}}catch(_){return{locations:[],warehouses:[]}}}
function warehouseName(id){return String((masterData().warehouses||[]).find(x=>String(x.id)===String(id))?.name||id||'—')}
function headerWarehouseId(){
 const header=String(document.getElementById('globalWarehouse')?.value||'').trim();
 if(header&&header!=='ALL')return header;
 try{const state=String(window.YardivoAppStateV583?.warehouse?.()||'').trim();if(state&&state!=='ALL')return state}catch(_){}
 const active=String(window.activeWarehouse||'').trim();return active&&active!=='ALL'?active:'';
}
window.receivingWarehouseValue=headerWarehouseId;

function localCfg(){
 const out={enabled:true,byWarehouse:{}};
 try{
  const raw=window.safeStorage?.getItem?.(CFG_KEY)??localStorage.getItem(CFG_KEY);
  if(!raw)return out;const p=JSON.parse(raw);if(!p||typeof p!=='object')return out;
  return {...out,...p,byWarehouse:(p.byWarehouse&&typeof p.byWarehouse==='object')?p.byWarehouse:{}};
 }catch(_){return out}
}
function qrEnabledForWarehouse(warehouseId){
 const id=String(warehouseId||headerWarehouseId()).trim();
 try{if(typeof window.yardivoQrRoleEnabledV586==='function')return !!window.yardivoQrRoleEnabledV586(id,'reception')}catch(_){}
 const c=localCfg(),v=c.byWarehouse?.[id];
 if(v&&typeof v==='object'&&typeof v.reception==='boolean')return v.reception;
 if(v&&typeof v==='object'&&v.roles&&typeof v.roles.reception==='boolean')return !!v.roles.reception;
 if(typeof v==='boolean')return v;
 if(v&&typeof v==='object'&&typeof v.enabled==='boolean')return v.enabled;
 return c.enabled!==false;
}
window.yardivoQrEnabledForWarehouseV583=qrEnabledForWarehouse;
/* v586 owns the authoritative public compatibility names once loaded. */
if(typeof window.yardivoQrMobileEnabled!=='function')window.yardivoQrMobileEnabled=warehouseId=>qrEnabledForWarehouse(warehouseId);
window.receivingCanEdit=function(){
 let roleAllowed=false;try{roleAllowed=typeof canChangeReceptionStatus==='function'?!!canChangeReceptionStatus():['admin','reception'].includes(userRole())}catch(_){}
 return roleAllowed&&!qrEnabledForWarehouse(headerWarehouseId());
};
window.yardivoManualReceivingStatusAllowed=()=>!qrEnabledForWarehouse(headerWarehouseId());

function postProcessReceiving(){
 const wh=headerWarehouseId(),qrOn=qrEnabledForWarehouse(wh),note=document.getElementById('receivingPermissionNote');
 if(note){
  const next=!wh?'Prijam robe · odaberi skladište u headeru.':qrOn?`Prijam robe · ${warehouseName(wh)} · QR scanner je UKLJUČEN. Status se mijenja QR skeniranjem.`:['admin','reception'].includes(userRole())?`Prijam robe · ${warehouseName(wh)} · QR scanner je ISKLJUČEN. Ručni gumbovi za status su dostupni.`:`Pregled prijama · ${warehouseName(wh)} · tvoja uloga može samo pregledavati statuse.`;
  if(note.textContent!==next)note.textContent=next;
 }
 if(qrOn){
  document.querySelectorAll('#receivingList .receiving-status-actions').forEach(box=>{
   box.classList.add('yv-qr-locked');
   const html='<div class="receiving-qr-locked-note">QR SCANNER UKLJUČEN · ručna promjena statusa je zaključana.</div>';
   if(box.innerHTML!==html)box.innerHTML=html;
  });
 }
}
const originalRenderReceiving=window.renderReceiving;
if(typeof originalRenderReceiving==='function'&&!originalRenderReceiving.__yardonQrPostProcess){
 const wrapped=function(){const r=originalRenderReceiving.apply(this,arguments);postProcessReceiving();return r};
 wrapped.__yardonQrPostProcess=true;window.renderReceiving=wrapped;
}
function refreshReceiving(){try{if(typeof window.renderReceiving==='function')window.renderReceiving();else postProcessReceiving()}catch(e){console.warn('Receiving refresh',e)}}

/* Legacy API is render-only. Server config is loaded by QR Role v586 once per login. */
window.yardivoLoadQrScanSetting=function(){try{window.YardivoQrRoleControlV586?.render?.()}catch(_){}};
window.renderQrMobileAdminSetting=function(){try{window.YardivoQrRoleControlV586?.render?.()}catch(_){}};

window.addEventListener('yardivo:context-changed',e=>{if(e?.detail?.warehouse!==undefined)setTimeout(refreshReceiving,0)});
document.addEventListener('change',e=>{if(e.target?.id==='globalWarehouse'||e.target?.id==='receivingDate')setTimeout(refreshReceiving,0)},true);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="receiving"],[data-home-target="receiving"]'))setTimeout(refreshReceiving,40)},true);
window.addEventListener('yardivo:login',()=>setTimeout(postProcessReceiving,120));
window.addEventListener('yardivo:master-data-changed',()=>setTimeout(postProcessReceiving,80));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(postProcessReceiving,300),{once:true});else setTimeout(postProcessReceiving,120);
})();
