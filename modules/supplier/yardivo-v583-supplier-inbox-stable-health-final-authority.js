
(()=>{'use strict';
if(window.__YARDIVO_SUPPLIER_INBOX_STABLE_HEALTH_FINAL__)return;
window.__YARDIVO_SUPPLIER_INBOX_STABLE_HEALTH_FINAL__=true;

let busy=false,lastFp='',healBusy=false;

function role(){
 let r=String(window.currentSession?.role||window.currentSession?.app_role||'').toLowerCase().trim();
 if(r==='zalihe'||r==='upravljanje zalihama')r='inventory';
 if(r==='management'||r==='voditelj')r='manager';
 return r;
}
function allowed(){return ['admin','inventory','manager'].includes(role())}
function whName(id){
 try{
   const m=window.YardivoAppStateV583?.master?.()||JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')||{};
   return String((m.warehouses||[]).find(x=>String(x.id)===String(id))?.name||id||'');
 }catch(_){return String(id||'')}
}
function dateHr(v){try{return new Date(String(v)+'T12:00:00').toLocaleDateString('hr-HR')}catch(_){return String(v||'')}}
function tm(v){return String(v||'').slice(0,5)}
function ensureUi(){
 try{window.YardivoSupplierRequests?.ensureUi?.()}catch(_){}
 const nav=document.querySelector('.nav-btn[data-view="supplierRequests"]');
 /* Visibility belongs to YardivoRoleStableFinal. Never repaint display/hidden here. */
 const view=document.getElementById('supplierRequests');
 if(view){
   view.classList.add('yv583-inbox-stable');
   view.querySelectorAll('.ysr-flow-info,.ysr-scope-note,.yv583-live-scope-note').forEach(x=>x.remove());
 }
 return {nav,view};
}
function fp(rows){try{return JSON.stringify((rows||[]).map(x=>[
 x.id,x.status,x.updated_at,x.warehouse,x.delivery_date,x.requested_time,x.review_note||x.reviewNote||''
]))}catch(_){return String(Date.now())}}
function paintBadge(){
 /* Retired: badge ownership belongs to
    yardivo-v583-inventory-supplier-notif-delete-20260923.js. */
}
function notify(){
 /* Retired: Supplier Edge/sync notification state is canonical.
    This renderer must never synthesize local SUPPLIER_REQUEST notifications. */
}
async function loadRows(){
 const live=window.YardivoSupplierLiveSync;
 if(!live)throw new Error('Supplier backend nije spreman.');
 let rows=live.internalRows?.();
 if(!Array.isArray(rows)){
   await live.pullInternal?.(true);
   rows=live.internalRows?.();
 }
 return Array.isArray(rows)?rows:[];
}
async function refresh(force=false){
 if(!allowed()||busy)return;
 busy=true;
 try{
   ensureUi();
   const rows=await loadRows();
   const next=fp(rows);
   if(force||next!==lastFp){
     lastFp=next;
     let rendered=false;
     try{
       if(window.YardivoSupplierPlannerV580?.renderRows){
         window.YardivoSupplierPlannerV580.renderRows(rows,true);
         rendered=true;
       }
     }catch(_){}
     if(!rendered){
       try{window.YardivoSupplierRequests?.render?.(rows)}catch(_){}
     }
     /* Notification generation is owned by canonical notification sync. */
   }
   paintBadge(rows);
 }catch(e){
   console.error('[YARDIVO Supplier Inbox]',e);
 }finally{busy=false}
}
async function healOnline(){
 if(role()==='supplier'||healBusy||!window.currentSession?.serverAuthorized)return;
 const api=window.YardivoSync;
 if(!api?.recover||!api?.status)return;
 if(api.status()?.ready)return;
 healBusy=true;
 try{
   await api.recover();
 }catch(e){
   console.warn('[YARDIVO ONLINE HEAL]',e);
 }finally{healBusy=false}
}
function bind(){
 const {nav}=ensureUi();
 if(nav&&!nav.dataset.yvStableFinal){nav.dataset.yvStableFinal='1';/* RoleStableFinal owns click/open/refresh. */}
}
window.addEventListener('yardivo:login',()=>setTimeout(()=>{bind();healOnline()},120));
window.addEventListener('yardivo:supplier-internal-rows',()=>setTimeout(()=>{bind();refresh(false)},0));
window.addEventListener('yardivo:supplier-request-updated',()=>setTimeout(()=>{bind();window.YardivoSupplierLiveSync?.pullInternal?.(true);healOnline()},120));
window.addEventListener('yardivo:gate-qr-issued',()=>setTimeout(()=>{bind();window.YardivoSupplierLiveSync?.pullInternal?.(true);healOnline()},120));
/* Global data sync may happen frequently. It must not repaint identical Supplier rows/buttons. */
window.addEventListener('yardivo:data-synced',()=>setTimeout(()=>{bind();refresh(false);healOnline()},120));
window.addEventListener('focus',()=>setTimeout(()=>{refresh(false);healOnline()},120));
window.addEventListener('load',()=>setTimeout(()=>{bind();refresh(true);healOnline()},900));
setTimeout(()=>{bind();refresh(true);healOnline()},450);

window.YardivoSupplierInboxStableFinalV583={refresh,healOnline};
window.YARDIVO_DEV_BUILD='20260918-dev-v5.8.3-supplier-inbox-stable-supabase-health-fixed-final';
})();
