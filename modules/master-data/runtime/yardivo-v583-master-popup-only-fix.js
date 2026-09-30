(()=>{'use strict';
if(window.__YARDIVO_MASTER_POPUP_ONLY_FIX__)return;window.__YARDIVO_MASTER_POPUP_ONLY_FIX__=true;
function moveMasterIntoPopup(){
 const body=document.getElementById('yardivoMasterPopupBodyV583');if(!body)return;
 let pane=document.getElementById('yardivoSettingsMasterPaneV583');
 if(!pane){pane=document.createElement('div');pane.id='yardivoSettingsMasterPaneV583';body.appendChild(pane)}else if(pane.parentElement!==body)body.appendChild(pane);
 ['yardivoStableMasterEditorV583','yardivoMasterDataRegistryV583','yardivoMasterOperationalConfigV583'].forEach(id=>{const el=document.getElementById(id);if(el&&el.parentElement!==pane)pane.appendChild(el)});
 pane.classList.add('active');pane.style.setProperty('display','block','important');
 const nav=document.getElementById('yardivoMasterAdminSettingsV583');if(nav)nav.style.setProperty('display','none','important');
}
function cleanSettings(){moveMasterIntoPopup()}
let timer=0;function schedule(ms=80){clearTimeout(timer);timer=setTimeout(cleanSettings,ms)}
document.addEventListener('click',e=>{
 if(e.target?.closest?.('#yardivoMasterPopupLaunchV583'))setTimeout(()=>{cleanSettings();try{window.YardivoStableMasterV583?.render?.(true)}catch(_){}},0);
},true);
window.addEventListener('yardivo:login',()=>schedule(180));
window.addEventListener('yardivo:master-data-changed',()=>{if(document.getElementById('yardivoMasterPopupV583')?.classList.contains('open'))schedule(80)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(240),{once:true});else schedule(120);
window.YardivoMasterPopupOnlyV583={refresh:cleanSettings};
})();
