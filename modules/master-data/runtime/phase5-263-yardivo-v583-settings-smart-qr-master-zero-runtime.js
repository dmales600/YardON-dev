(()=>{'use strict';
let timer=0;
function onSettings(){
 clearTimeout(timer);timer=setTimeout(()=>{
   try{window.YardivoSmartEngineSettingsV583?.render?.()}catch(_){}
   /* QR is owned by YardivoQrRoleControlV586; Master renders only when its popup is opened. */
 },120);
}
document.addEventListener('click',e=>{
 if(e.target?.closest?.('[data-view="settings"],[data-home-target="settings"],#navSettings,[data-settings-tab="general"]'))onSettings();
},true);
window.addEventListener('yardivo:view-opened',e=>{if(e?.detail?.view==='settings')onSettings()});
})();
