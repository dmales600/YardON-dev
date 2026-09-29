
(function(){
'use strict';
if(window.__YARDIVO_MANAGER_SINGLE_VIEW_HARD_LOCK_V5__)return;
window.__YARDIVO_MANAGER_SINGLE_VIEW_HARD_LOCK_V5__=true;

const ALLOWED=new Set(['homeMenu','dashboard','controlTower','aiOperations','analytics','myYard','suppliers','overview','dailyMap','weeklyMap']);

function role(){
  let r='';
  try{r=String(window.currentSession?.role||window.currentSession?.app_role||document.body?.dataset?.yardivoRole||'').trim().toLowerCase()}catch(_){}
  if(r==='management'||r==='voditelj')r='manager';
  return r;
}
function currentView(){
  let id=String(document.body?.dataset?.managerView||'').trim();
  if(!ALLOWED.has(id)){
    const active=[...document.querySelectorAll('.view.active,.view.manager-force-active')].find(v=>ALLOWED.has(String(v.id)));
    id=active?.id||'homeMenu';
  }
  return ALLOWED.has(id)?id:'homeMenu';
}
let repairing=false;
function lock(id=currentView()){
  if(role()!=='manager'||repairing)return;
  repairing=true;
  try{
    if(!ALLOWED.has(id))id='homeMenu';
    document.body.dataset.yardivoRole='manager';
    document.body.dataset.managerView=id;
    document.body.classList.toggle('home-menu-mode',id==='homeMenu');

    document.querySelectorAll('.view').forEach(v=>{
      const on=String(v.id)===id;
      v.classList.toggle('active',on);
      v.classList.toggle('manager-force-active',on);
      v.style.setProperty('display',on?'block':'none','important');
      if(on)v.removeAttribute('hidden');
    });

    document.querySelectorAll('.nav-btn[data-view]').forEach(b=>{
      b.classList.toggle('active',String(b.dataset.view||'')===id);
    });

    const titles={
      homeMenu:'Početni izbornik',
      dashboard:'Nadzorna ploča',
      controlTower:'Control Tower',
      analytics:'Analytics',
      myYard:'My Yard',
      suppliers:'Dobavljači',
      overview:'Overview dobavljača',
      dailyMap:'Dnevna mapa',
      weeklyMap:'Tjedna mapa'
    };
    const title=document.getElementById('pageTitle');
    if(title)title.textContent=titles[id]||'YARDIVO';
  }finally{
    repairing=false;
  }
}

function schedule(){
  queueMicrotask(()=>lock());
}

/* The manager authority already changes data-manager-view.
   We only repair visual state if any legacy code later touches view classes/styles. */
const obs=new MutationObserver(records=>{
  if(role()!=='manager'||repairing)return;
  if(records.some(r=>{
    const el=r.target instanceof Element?r.target:r.target?.parentElement;
    return el?.matches?.('.view,#homeMenu')||el?.closest?.('.view,#homeMenu');
  }))schedule();
});

function init(){
  if(role()!=='manager')return;
  lock();
  try{obs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','style','hidden']})}catch(_){}
}

['yardivo:login','yardivo:view-opened','yardivo:data-synced','yardivo:context-changed'].forEach(ev=>{
  window.addEventListener(ev,()=>setTimeout(lock,0));
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('load',()=>setTimeout(init,0),{once:true});

window.YardivoManagerSingleViewV5={lock,currentView};
})();
