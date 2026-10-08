
(function(){
'use strict';
if(window.__YARDIVO_UNANNOUNCED_LOCATION_FLICKER_FIX_V583__)return;
window.__YARDIVO_UNANNOUNCED_LOCATION_FLICKER_FIX_V583__=true;

function master(){
  try{
    const d=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');
    if(Array.isArray(d.locations)&&Array.isArray(d.warehouses))return d;
  }catch(_){}
  return {locations:[],warehouses:[]};
}
function locationState(){
  const d=master();
  const id=String(window.currentSession?.location||'').trim();
  const x=d.locations.find(v=>v&&v.active!==false&&String(v.id)===id);
  return x?{id:String(x.id),name:String(x.name||x.id)}:{id:'',name:''};
}
function unannouncedRows(){
  try{
    const a=Array.isArray(window.announcements)?window.announcements:
      (typeof announcements!=='undefined'&&Array.isArray(announcements)?announcements:[]);
    return a.filter(x=>x&&(x.arrivalType==='UNANNOUNCED'||x.unannounced===true));
  }catch(_){return[]}
}
function pendingCount(){
  return unannouncedRows().filter(x=>{
    const st=String(x.approvalStatus||x.status||'').toUpperCase();
    return !/APPROVED|REJECTED|ODOBREN|ODBIJEN|CLOSED|ZATVOREN/.test(st);
  }).length;
}
function dedupeUnannouncedUi(){
  const nav=[...document.querySelectorAll('.nav-btn[data-view="unannounced"]')];
  nav.forEach((el,i)=>{
    if(i===0)el.removeAttribute('data-yardivo-duplicate-unannounced');
    else el.setAttribute('data-yardivo-duplicate-unannounced','1');
  });
  const cards=[...document.querySelectorAll('#homeMenuGrid [data-home-target="unannounced"]')];
  cards.forEach((el,i)=>{
    if(i===0)el.removeAttribute('data-yardivo-duplicate-unannounced');
    else el.setAttribute('data-yardivo-duplicate-unannounced','1');
  });
}
function paintUnannounced(){
  dedupeUnannouncedUi();
  const n=pendingCount();
  document.querySelectorAll('#unannouncedNavBadge').forEach((b,i)=>{
    const value=i===0&&n>0?String(n):'';
    if(b.textContent!==value)b.textContent=value;
    const visible=i===0&&n>0;
    const display=visible?'inline-flex':'none';
    if(b.style.getPropertyValue('display')!==display||b.style.getPropertyPriority('display')!=='important')
      b.style.setProperty('display',display,'important');
    const visibility=visible?'visible':'hidden';
    if(b.style.getPropertyValue('visibility')!==visibility||b.style.getPropertyPriority('visibility')!=='important')
      b.style.setProperty('visibility',visibility,'important');
    const opacity=visible?'1':'0';
    if(b.style.getPropertyValue('opacity')!==opacity||b.style.getPropertyPriority('opacity')!=='important')
      b.style.setProperty('opacity',opacity,'important');
  });
}

function paintLocation(){
  const loc=locationState();
  const txt=loc.id?loc.name:'Lokacija nije odabrana';

  /* Global topbar context from Executive module. */
  const ygc=document.getElementById('ygcLocation');
  if(ygc&&ygc.textContent!==txt)ygc.textContent=txt;

  /* Known dashboard/header location labels. */
  [
    'dashboardLocation','dashLocation','currentLocation','selectedLocation',
    'activeLocation','dashboardLocationLabel'
  ].forEach(id=>{
    const el=document.getElementById(id);
    if(el&&el.textContent!==txt)el.textContent=txt;
  });

  document.querySelectorAll(
    '#dashboard [data-location-label],#dashboard .location-label,#dashboard .dashboard-location'
  ).forEach(el=>{
    if(!el.children.length&&el.textContent!==txt)el.textContent=txt;
  });
}
function refresh(){
  paintUnannounced();
  paintLocation();
}
[
 'yardivo:login','yardivo:data-synced','yardivo:master-data-changed',
 'yardivo:context-changed','yardivo:notifications-changed'
].forEach(ev=>window.addEventListener(ev,()=>requestAnimationFrame(refresh)));

document.addEventListener('change',e=>{
  if(e.target?.id==='homeLocationSelect'||e.target?.id==='globalWarehouse'||e.target?.id==='ygcWarehouseSelect'){
    requestAnimationFrame(refresh);
  }
},true);
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-view="dashboard"],[data-home-target="dashboard"],[data-view="unannounced"],[data-home-target="unannounced"]')){
    requestAnimationFrame(refresh);
  }
},true);
document.addEventListener('DOMContentLoaded',refresh,{once:true});
window.addEventListener('load',refresh,{once:true});

window.YardivoUnannouncedBadgeV583={count:pendingCount,refresh:paintUnannounced};
window.YardivoHeaderLocationV583={state:locationState,refresh:paintLocation};
window.YARDIVO_DEV_BUILD='20260911-dev-v5.8.3-unannounced-location-flicker-fix';
})();
