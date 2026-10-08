(function(){
'use strict';

function annDate(){return document.getElementById('annDate')?.value||''}
function annWarehouse(){return document.getElementById('annWarehouse')?.value||''}
function expandedOpen(){return document.getElementById('yardivoExpandedSchedule')?.classList.contains('open')}

function syncOperationalSelection(){
  const d=annDate(),w=annWarehouse();
  if(d)try{window.YardivoOperationalSync?.setDate?.(d)}catch(_){}
  if(w)try{window.YardivoOperationalSync?.setWarehouse?.(w)}catch(_){}
}
function refreshMaps(){
  const active=document.querySelector('.view.active')?.id||'';
  if(active==='announcements'){
    try{renderAnnouncementSchedule?.()}catch(e){console.warn('Announcement map',e)}
    if(expandedOpen())try{window.YardivoExpandedSchedule?.render?.()}catch(e){console.warn('Expanded map',e)}
  }else if(active==='dailyMap'){
    try{renderDailyMap?.()}catch(e){console.warn('Daily map',e)}
  }else if(active==='weeklyMap'){
    try{renderWeeklyMap?.()}catch(e){console.warn('Weekly map',e)}
  }
}
function syncAndRefresh(){
  syncOperationalSelection();
  setTimeout(refreshMaps,0);
}

/* The map beside Unos najava is now the operational date/warehouse source when
   the user changes those fields. Daily/Weekly/My Yard receive the same selection. */
['annDate','annWarehouse'].forEach(id=>{
  const el=document.getElementById(id);
  if(!el)return;
  el.addEventListener('change',syncAndRefresh,true);
  el.addEventListener('input',()=>{
    if(id==='annDate'&&el.value)syncAndRefresh();
  },true);
});

/* Any field that changes the preview/slot redraws both the small and expanded
   map from the same announcements array and status engine. */
['annDock','annTime','annPallets','annSupplier'].forEach(id=>{
  document.getElementById(id)?.addEventListener('change',()=>{
    try{renderAnnouncementSchedule?.()}catch(_){}
    if(expandedOpen())try{window.YardivoExpandedSchedule?.render?.()}catch(_){}
  },true);
});

/* After a save/reschedule/status/data sync, all representations are redrawn
   from canonical announcements. */
window.addEventListener('yardivo:data-synced',e=>{
  const source=String(e?.detail?.source||'');
  /* Core and Supplier sync already refresh the active view once. */
  if(source==='online-v2'||source==='supplier')return;
  refreshMaps();
});
window.addEventListener('yardivo:overview-refresh',()=>{
  if(expandedOpen())try{window.YardivoExpandedSchedule?.render?.()}catch(_){}
});
document.addEventListener('click',e=>{
  if(e.target.closest?.('#saveManualAnnouncement,#useRecommendation,#checkAnnouncement')){
    setTimeout(refreshMaps,80);
  }
},true);

window.YardivoAnnouncementMapSync={refresh:refreshMaps,sync:syncAndRefresh};
})();
