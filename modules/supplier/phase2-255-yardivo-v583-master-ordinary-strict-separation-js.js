(()=>{'use strict';
function role(){try{return String(window.currentSession?.app_role||window.currentSession?.role||'').toLowerCase().trim()}catch(_){return''}}
function apply(){
 document.body.classList.toggle('yardivo-is-admin-v583',role()==='admin');
 const launch=document.getElementById('yardivoMasterPopupLaunchV583');
 if(launch){launch.hidden=role()!=='admin';launch.style.display=role()==='admin'?'':'none';if(role()==='admin')launch.textContent='MASTER PODACI'}
 try{window.YardivoSettingsHardFixV583?.refresh?.()}catch(_){}
}
let timer=0;function schedule(ms=100){clearTimeout(timer);timer=setTimeout(apply,ms)}
document.addEventListener('click',e=>{if(e.target?.closest?.('[data-home-target="settings"],[data-view="settings"],#navSettings,#yardivoMasterPopupLaunchV583'))schedule(100)},true);
window.addEventListener('yardivo:login',()=>schedule(180));
window.addEventListener('yardivo:view-opened',e=>{if(e?.detail?.view==='settings')schedule(80)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(220),{once:true});else schedule(120);
})();
