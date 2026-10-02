(()=>{'use strict';
if(window.__YARDIVO_MASTER_POPUP_ONLY_FIX__)return;window.__YARDIVO_MASTER_POPUP_ONLY_FIX__=true;
function adminInlineGrid(){
 return document.querySelector('#yardonAdminSettingsShell #yardonAdminSettingsMount .settings-grid')||document.querySelector('#settings .settings-grid');
}
function moveMasterInline(){
 const grid=adminInlineGrid();if(!grid)return false;
 let pane=document.getElementById('yardivoSettingsMasterPaneV583');
 if(!pane){pane=document.createElement('div');pane.id='yardivoSettingsMasterPaneV583'}
 if(pane.parentElement!==grid)grid.prepend(pane);
 ['yardivoStableMasterEditorV583','yardivoMasterDataRegistryV583','yardivoMasterOperationalConfigV583','yardivoMasterFoundationV583'].forEach(id=>{const el=document.getElementById(id);if(el&&el.parentElement!==pane)pane.appendChild(el)});
 pane.classList.add('active');pane.style.setProperty('display','block','important');
 const nav=document.getElementById('yardivoMasterAdminSettingsV583');if(nav)nav.style.setProperty('display','none','important');
 return true;
}
function moveMasterIntoPopup(){
 // New Admin Settings owns MASTER inline. Do not steal it into the legacy popup.
 if(document.getElementById('yardonAdminSettingsShell')&&moveMasterInline())return;
 const body=document.getElementById('yardivoMasterPopupBodyV583');if(!body)return;
 let pane=document.getElementById('yardivoSettingsMasterPaneV583');
 if(!pane){pane=document.createElement('div');pane.id='yardivoSettingsMasterPaneV583';body.appendChild(pane)}else if(pane.parentElement!==body)body.appendChild(pane);
 ['yardivoStableMasterEditorV583','yardivoMasterDataRegistryV583','yardivoMasterOperationalConfigV583','yardivoMasterFoundationV583'].forEach(id=>{const el=document.getElementById(id);if(el&&el.parentElement!==pane)pane.appendChild(el)});
 pane.classList.add('active');pane.style.setProperty('display','block','important');
 const nav=document.getElementById('yardivoMasterAdminSettingsV583');if(nav)nav.style.setProperty('display','none','important');
}
function cleanSettings(){moveMasterIntoPopup()}
let timer=0;function schedule(ms=80){clearTimeout(timer);timer=setTimeout(cleanSettings,ms)}
document.addEventListener('click',e=>{
 if(e.target?.closest?.('#yardivoMasterPopupLaunchV583'))setTimeout(()=>{cleanSettings();try{window.YardivoStableMasterV583?.render?.(true)}catch(_){}},0);
 if(e.target?.closest?.('#yardonAdminSettingsShell [data-yas-section="master"]'))setTimeout(()=>{moveMasterInline();try{window.YardivoStableMasterV583?.render?.(true)}catch(_){}},0);
},true);
window.addEventListener('yardivo:login',()=>schedule(180));
window.addEventListener('yardivo:master-data-changed',()=>schedule(80));
window.addEventListener('yardivo:view-opened',e=>{if(e?.detail?.view==='settings')schedule(30)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(240),{once:true});else schedule(120);
window.YardivoMasterPopupOnlyV583={refresh:cleanSettings,inline:moveMasterInline};
})();
