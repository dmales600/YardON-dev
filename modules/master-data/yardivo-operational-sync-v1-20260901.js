
(function(){
'use strict';

const DATE_KEY='yardivo_operational_date_v1';
const WH_KEY='yardivo_operational_warehouse_v1';
let applying=false;

function todayLocal(){
  const d=new Date();
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||''))}
function sharedDate(){
  try{
    const x=localStorage.getItem(DATE_KEY);
    return validDate(x)?x:todayLocal();
  }catch(_){return todayLocal()}
}
function setSharedDate(v){
  if(!validDate(v))return;
  try{localStorage.setItem(DATE_KEY,v)}catch(_){}
}
function sharedWarehouse(){
  try{return localStorage.getItem(WH_KEY)||''}catch(_){return''}
}
function setSharedWarehouse(v){
  if(!v||v==='ALL')return;
  try{localStorage.setItem(WH_KEY,v)}catch(_){}
}
function optionExists(sel,value){
  return !!sel && [...sel.options].some(o=>o.value===value);
}
function weekForDate(iso){
  const d=new Date(iso+'T12:00:00');
  if(Number.isNaN(d.getTime()))return null;
  try{
    if(typeof isoWeekInfo==='function')return isoWeekInfo(d);
  }catch(_){}
  const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const day=x.getUTCDay()||7;x.setUTCDate(x.getUTCDate()+4-day);
  const y0=new Date(Date.UTC(x.getUTCFullYear(),0,1));
  return {year:x.getUTCFullYear(),week:Math.ceil((((x-y0)/86400000)+1)/7)};
}

let refreshQueued=false;
function refreshAll(){
  if(refreshQueued)return;
  refreshQueued=true;
  requestAnimationFrame(()=>{
    refreshQueued=false;
    const active=document.querySelector('.view.active')?.id||'';
    try{
      if(active==='receiving'&&typeof renderReceiving==='function')renderReceiving();
      else if(active==='dailyMap'&&typeof renderDailyMap==='function')renderDailyMap();
      else if(active==='weeklyMap'&&typeof renderWeeklyMap==='function')renderWeeklyMap();
      else if(active==='myYard'){
        window.YardivoMyYard?.render?.();
        window.YardivoMyYardWebGL?.refresh?.();
        window.YardivoWarRoomExactMyYard?.refresh?.();
      }
    }catch(e){console.warn('Operational view sync',e)}
  });
}

function applyDate(date,source){
  if(!validDate(date)||applying)return;
  applying=true;
  setSharedDate(date);
  try{
    /* My Yard */
    const my=document.querySelector('#myYard .myy-date');
    if(my && source!=='myYard' && my.value!==date){
      my.value=date;
      window.YardivoMyYard?.setDate?.(date);
    }

    /* Reception */
    const rec=document.getElementById('receivingDate');
    if(rec && source!=='receiving' && rec.value!==date)rec.value=date;

    /* Daily Map */
    const daily=document.getElementById('dailyMapDate');
    if(daily && source!=='dailyMap' && daily.value!==date)daily.value=date;

    /* Weekly Map: select the ISO week containing exactly the same date. */
    const wk=weekForDate(date);
    if(wk){
      try{weeklyMapSelection={year:wk.year,week:wk.week}}catch(_){}
      const sel=document.getElementById('weeklyMapWeek');
      const val=`${wk.year}-${wk.week}`;
      if(sel){
        const padded=`${wk.year}-${String(wk.week).padStart(2,'0')}`;
        if(optionExists(sel,val))sel.value=val;
        else if(optionExists(sel,padded))sel.value=padded;
      }
    }
  }finally{
    applying=false;
  }
  refreshAll();
}

function applyWarehouse(wh,source){
  if(!wh||wh==='ALL'||applying)return;
  applying=true;
  setSharedWarehouse(wh);
  try{
    /* Warehouse context ownership belongs to YardivoWarehouseSync. */
    try{
      if(window.YardivoWarehouseSync?.set)window.YardivoWarehouseSync.set(wh);
      else window.YardivoAppStateV583?.setWarehouse?.(wh);
    }catch(_){}
    const daily=document.getElementById('dailyMapWarehouseSelect');
    if(daily && source!=='dailyMap' && optionExists(daily,wh))daily.value=wh;
    const weekly=document.getElementById('weeklyMapWarehouse');
    if(weekly && source!=='weeklyMap' && optionExists(weekly,wh))weekly.value=wh;
  }finally{
    applying=false;
  }
  refreshAll();
}

/* Date changes in any operational view become the same selected operational date. */
document.addEventListener('change',e=>{
  const el=e.target;
  if(el?.matches?.('#myYard .myy-date'))return applyDate(el.value,'myYard');
  if(el?.id==='receivingDate')return applyDate(el.value,'receiving');
  if(el?.id==='dailyMapDate')return applyDate(el.value,'dailyMap');

  if(el?.id==='dailyMapWarehouseSelect')return applyWarehouse(el.value,'dailyMap');
  if(el?.id==='weeklyMapWarehouse')return applyWarehouse(el.value,'weeklyMap');

  if(el?.id==='weeklyMapWeek'){
    /* Weekly map remains a weekly navigator; selecting a week updates shared date
       to Monday so My Yard / Reception / Daily map show that exact week's first day. */
    const parts=String(el.value||'').split('-').map(Number);
    if(parts.length>=2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])){
      try{
        const mon=typeof mondayOfIsoWeek==='function'?mondayOfIsoWeek(parts[0],parts[1]):null;
        if(mon){
          const iso=typeof localIsoDate==='function'?localIsoDate(mon):
            [mon.getFullYear(),String(mon.getMonth()+1).padStart(2,'0'),String(mon.getDate()).padStart(2,'0')].join('-');
          applyDate(iso,'weeklyMap');
        }
      }catch(_){}
    }
  }
},true);

/* My Yard previous/next/today buttons change its internal state without a native change event.
   Read the final date after its own click handler and propagate it. */
document.addEventListener('click',e=>{
  if(e.target.closest?.('#myYard [data-day],#myYard [data-today]')){
    setTimeout(()=>{
      const v=document.querySelector('#myYard .myy-date')?.value;
      if(validDate(v))applyDate(v,'myYard');
    },0);
  }
},true);

/* When navigating between operational views, show the same date and warehouse. */
document.addEventListener('click',e=>{
  const nav=e.target.closest?.('[data-view],[data-home-target]');
  if(!nav)return;
  const view=nav.dataset.view||nav.dataset.homeTarget||'';
  if(!['myYard','receiving','dailyMap','weeklyMap'].includes(view))return;
  setTimeout(()=>{
    applyDate(sharedDate(),'navigation');
    const wh=sharedWarehouse();
    if(wh)applyWarehouse(wh,'navigation');
  },60);
},true);

/* Receiving setter ownership lives in modules/receiving/service.js. */
window.addEventListener('yardivo:receiving-status-changed',()=>setTimeout(refreshAll,0));
if(typeof window.setContextAnnouncementStatus==='function'){
  const originalContext=window.setContextAnnouncementStatus;
  window.setContextAnnouncementStatus=function(){
    const result=originalContext.apply(this,arguments);
    setTimeout(refreshAll,0);
    return result;
  };
}

/* Any completed Supabase synchronization refreshes all four consumers from the
   same announcements array, so none of the views keeps a stale status. */
window.addEventListener('yardivo:data-synced',e=>{
  /* Core/supplier sync already refreshes the active screen. Avoid a second full repaint. */
  const source=String(e?.detail?.source||'');
  if(source==='online-v2'||source==='supplier')return;
  refreshAll();
});
window.addEventListener('yardivo:welcome-complete',()=>{
  setTimeout(()=>{
    applyDate(sharedDate(),'startup');
    const wh=sharedWarehouse();
    if(wh)applyWarehouse(wh,'startup');
  },300);
},{once:true});

window.YardivoOperationalSync={
  date:sharedDate,
  setDate:d=>applyDate(d,'api'),
  warehouse:sharedWarehouse,
  setWarehouse:w=>applyWarehouse(w,'api'),
  refreshAll
};
})();
