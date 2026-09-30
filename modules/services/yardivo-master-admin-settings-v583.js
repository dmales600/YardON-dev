(function(){
'use strict';
if(window.__YARDIVO_MASTER_ADMIN_SETTINGS_V583__)return;
window.__YARDIVO_MASTER_ADMIN_SETTINGS_V583__=true;

/* Compatibility authority only.
   Admin Settings and Master Data are intentionally separate surfaces now:
   - YardivoSettingsHardFixV583 owns the Settings Control Center.
   - YardivoMasterPopupOnlyV583 / YardivoStableMasterV583 own Master Data.
   This module must never move Settings children between panes. */
function openMaster(){
  const launch=document.getElementById('yardivoMasterPopupLaunchV583');
  if(launch){launch.click();return}
  try{window.YardivoMasterPopupOnlyV583?.refresh?.()}catch(_){}
  try{window.YardivoStableMasterV583?.render?.(true)}catch(_){}
}
function show(tab){
  if(String(tab||'').toLowerCase()==='master'){openMaster();return}
  try{window.YardivoSettingsHardFixV583?.show?.('general')}catch(_){}
}
function cleanupLegacyShell(){
  const nav=document.getElementById('yardivoMasterAdminSettingsV583');
  if(nav)nav.style.setProperty('display','none','important');
  const settings=document.getElementById('settings');
  const adminPane=document.getElementById('yardivoSettingsAdminPaneV583');
  if(settings&&adminPane){
    [...adminPane.children].forEach(el=>{
      if(el.id==='yardivoSettingsMasterPaneV583')return;
      settings.querySelector('.settings-grid')?.appendChild(el);
    });
    if(!adminPane.children.length)adminPane.remove();
  }
}
let timer=0;
function refresh(){clearTimeout(timer);timer=setTimeout(()=>{cleanupLegacyShell();try{window.YardivoSettingsHardFixV583?.refresh?.()}catch(_){}},100)}
document.addEventListener('click',e=>{if(e.target?.closest?.('[data-view="settings"],[data-home-target="settings"],#navSettings'))refresh()},true);
window.addEventListener('yardivo:login',()=>setTimeout(refresh,180));
window.addEventListener('yardivo:view-opened',e=>{if(e?.detail?.view==='settings')refresh()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,240),{once:true});else setTimeout(refresh,120);
window.YardivoSettingsMasterAdminV583={show,refresh,active:()=> 'admin'};
})();
