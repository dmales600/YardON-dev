(()=>{'use strict';
if(window.__YARDIVO_SMART_OPERATIONAL_VISIBILITY_FINAL__)return;
window.__YARDIVO_SMART_OPERATIONAL_VISIBILITY_FINAL__=true;
const MASTER='yardivo_master_data_registry_v583',CFG='yardivo_auto_replan_cfg_v1';
function j(k){try{return JSON.parse(localStorage.getItem(k)||'{}')||{}}catch(_){return{}}}
function role(){
 let r=String(window.currentSession?.role||window.currentSession?.app_role||'').toLowerCase().trim();
 if(r==='zalihe'||r==='upravljanje zalihama')r='inventory';
 if(r==='prijam')r='reception';
 if(r==='management'||r==='voditelj')r='manager';
 return r;
}
function enabled(){
 const m=j(MASTER),c=j(CFG),s=(m.smart&&typeof m.smart==='object')?m.smart:c;
 return s?.enabled===true && String(s?.mode||'').toUpperCase()!=='PAUSED';
}
function canSee(){
 const r=role();
 if(['admin','inventory','reception'].includes(r))return true;
 if(r==='manager')return window.yardivoManagerSectionAllowed?.('smartReplanning')===true;
 return false;
}
function apply(){
 const on=enabled();
 document.documentElement.classList.toggle('yardivo-smart-on',on);
 document.documentElement.classList.toggle('yardivo-smart-off',!on);
 // The SMART service stays enabled, but its former navigation page is retired.
 const nav=document.querySelector('.nav-btn[data-view="smartReplanning"]');
 if(nav)nav.remove();
 const view=document.getElementById('smartReplanning');
 if(view){
   if(view.classList.contains('active'))window.YardivoRoleStableFinal?.open?.('homeMenu');
   view.remove();
 }
}

['yardivo:login','yardivo:data-synced','yardivo:master-data-changed','yardivo:smart-system-state']
 .forEach(ev=>window.addEventListener(ev,()=>setTimeout(apply,30)));
window.addEventListener('storage',e=>{if(e.key===MASTER||e.key===CFG)setTimeout(apply,10)});
document.addEventListener('click',e=>{
 if(e.target?.closest?.('#ysePower,#yardivoSmartToggleExactV583,#yseSave'))setTimeout(apply,160);
},true);
window.addEventListener('load',()=>setTimeout(apply,600));
setTimeout(apply,50);
window.YardivoSmartOperationalVisibilityV583={apply,enabled};
})();
