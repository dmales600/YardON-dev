(function(){
'use strict';
if(window.__YARDIVO_ADMIN_CLEANUP_V8__)return;
window.__YARDIVO_ADMIN_CLEANUP_V8__=true;

/* Cleanup is intentionally one-shot / event-scoped.
   Never observe the entire DOM: older builds recreated panels that this cleanup removed,
   which caused visible create/remove/create flicker in Admin Settings. */
const obsoleteIds=[
 'detentionSettings',
 'yardivoMasterDwellV583',
 'yardivoQrWarehouseSettings',
 'yardivoQrWarehouseSettingsV584',
 'yvQrWarehouseSettings',
 'yvQrWarehouseSettingsV584',
 'yardivoUnifiedSmartDbCardV583',
 'yardivoSmartVisibleFinalV583',
 'yardivoUnifiedSmartCardV583',
 'yardivoUnifiedSmartSwitchCardV583',
 'yardivoSmartToggleCardExactV583'
];

function txt(el){return String(el?.textContent||'').replace(/\s+/g,' ').trim().toUpperCase()}
function cleanup(){
 for(const id of obsoleteIds)document.getElementById(id)?.remove();

 document.querySelectorAll('.yse-master-note,[data-dwell-wh],[data-dwell-save],[data-dwell-wait],[data-dwell-dock]').forEach(e=>{
   const sec=e.closest('section,.panel,.settings-card,.card')||e;
   sec?.remove();
 });

 /* Keep canonical QR Role v586 and canonical Smart Engine cards.
    Remove only old/duplicate QR cards by exact legacy heading/id. */
 document.querySelectorAll('#settings section,#settings .panel,#settings .settings-card,#settings .card').forEach(el=>{
   if(el.id==='yardivoQrRoleAdminV586'||el.id==='yardivoSmartEngineSettingsV583')return;
   const t=txt(el);
   if(t.startsWith('DWELL / DETENTION'))el.remove();
   if(el.id==='yardivoQrWarehouseAdminPanelV584')el.dataset.yardonLegacyDuplicate='1';
 });

 /* Remove retired Smart recommendation navigation only; do not touch AI Operations. */
 document.querySelectorAll('[data-view],[data-home-target],.nav-btn,.home-menu-card,.home-card').forEach(el=>{
   const t=txt(el);
   const v=String(el.getAttribute?.('data-view')||el.getAttribute?.('data-home-target')||'').toLowerCase();
   if(v.includes('smartrecommend')||v.includes('smart-recommend')||t==='YARDIVO AUTOMATSKE PREPORUKE'||t.startsWith('YARDIVO AUTOMATSKE PREPORUKE '))el.remove();
 });
 document.querySelectorAll('[id*="smartRecommend" i],[id*="smart-recommend" i]').forEach(el=>el.remove());
}

let timer=0;
function schedule(ms=80){clearTimeout(timer);timer=setTimeout(cleanup,ms)}
document.addEventListener('click',e=>{
 if(e.target.closest?.('[data-view="settings"],[data-home-target="settings"],#navSettings'))schedule(120);
},true);
window.addEventListener('yardivo:login',()=>schedule(180));
window.addEventListener('yardivo:view-opened',e=>{if(e?.detail?.view==='settings')schedule(80)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(220),{once:true});else schedule(120);

window.YardivoAdminCleanupV8={apply:cleanup};
})();
