(function(){
'use strict';
if(window.__YARDIVO_ADMIN_MASTER_RESTORE_V11__)return;
window.__YARDIVO_ADMIN_MASTER_RESTORE_V11__=true;

function role(){let r='';try{r=String(window.currentSession?.app_role||window.currentSession?.role||'').trim().toLowerCase()}catch(_){}if(r==='voditelj'||r==='management')r='manager';return r}
function ensureAnchor(){
 if(role()!=='admin')return;
 const s=document.getElementById('settings');if(!s)return;
 let a=document.getElementById('yardivoAdminMasterQuickAnchorV11');
 if(!a){
   a=document.createElement('div');a.id='yardivoAdminMasterQuickAnchorV11';
   a.innerHTML='<div><strong>MASTER PODACI</strong><small>Lokacije, skladišta, rampe, kapaciteti i radna vremena.</small></div><button type="button" class="primary" data-yv-master-jump-v11>OTVORI MASTER PODATKE</button>';
   a.querySelector('[data-yv-master-jump-v11]')?.addEventListener('click',()=>{
     const launch=document.getElementById('yardivoMasterPopupLaunchV583');
     if(launch){launch.click();return}
     try{window.YardivoStableMasterV583?.render?.(true)}catch(_){}
     document.getElementById('yardivoStableMasterEditorV583')?.scrollIntoView?.({behavior:'smooth',block:'start'});
   });
 }
 const title=s.querySelector('.section-title');if(title&&a.previousElementSibling!==title)title.insertAdjacentElement('afterend',a);
}
function restore(){ensureAnchor()}
let timer=0;function schedule(ms=100){clearTimeout(timer);timer=setTimeout(restore,ms)}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="settings"],[data-home-target="settings"],#navSettings'))schedule(100)},true);
window.addEventListener('yardivo:login',()=>schedule(180));
window.addEventListener('yardivo:view-opened',e=>{if(e?.detail?.view==='settings')schedule(80)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(250),{once:true});else schedule(120);
window.YardivoAdminMasterRestoreV11={restore};
})();
