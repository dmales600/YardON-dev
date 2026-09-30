(function(){
'use strict';
if(window.__YARDIVO_SETTINGS_SINGLE_PAGE_V583__)return;
window.__YARDIVO_SETTINGS_SINGLE_PAGE_V583__=true;
/* Legacy compatibility only. Settings and Master Data are no longer a single DOM surface. */
function apply(){
 try{window.YardivoSettingsHardFixV583?.refresh?.()}catch(_){}
 const popup=document.getElementById('yardivoMasterPopupV583');
 if(popup?.classList.contains('open'))try{window.YardivoMasterPopupOnlyV583?.refresh?.()}catch(_){}
}
let timer=0;function schedule(ms=100){clearTimeout(timer);timer=setTimeout(apply,ms)}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="settings"],[data-home-target="settings"]'))schedule(100)},true);
window.addEventListener('yardivo:view-opened',e=>{if(e?.detail?.view==='settings')schedule(80)});
window.addEventListener('yardivo:login',()=>schedule(180));
window.YardivoSettingsSinglePageV583={refresh:apply};
})();
