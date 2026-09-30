(function(){
'use strict';
function removePanelContaining(el){const panel=el?.closest?.('section.panel,.panel,.settings-card,.card');if(panel)panel.remove()}
function cleanup(){
 document.getElementById('yardivoLightStyleSettings')?.remove();
 ['sheetUrl','sheetState','sheetSave','sheetTest','sheetPush'].forEach(id=>{const el=document.getElementById(id);if(el)removePanelContaining(el)});
 document.querySelectorAll('#settings section.panel,#settings .settings-card').forEach(panel=>{const t=String(panel.textContent||'').toLocaleUpperCase('hr-HR');if(t.includes('GOOGLE SHEETS')&&t.includes('CENTRALNA BAZA'))panel.remove();if(t.includes('IZGLED LIGHT MODEA'))panel.remove()});
}
let timer=0;function schedule(ms=100){clearTimeout(timer);timer=setTimeout(cleanup,ms)}
window.addEventListener('load',()=>schedule(350),{once:true});
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="settings"],[data-home-target="settings"]'))schedule(120)},true);
window.addEventListener('yardivo:view-opened',e=>{if(e?.detail?.view==='settings')schedule(80)});
window.addEventListener('yardivo:login',()=>schedule(180));
window.YardivoSettingsCleanup={run:cleanup};
})();
