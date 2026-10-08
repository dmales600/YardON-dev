
(function(){
'use strict';
if(window.__YARDIVO_MAP_LIVE_DELAY_REFRESH_V1__)return;
window.__YARDIVO_MAP_LIVE_DELAY_REFRESH_V1__=true;

/* YardOn 2026-09-30: daily-map authority for AI planned docks and stale supplier cleanup.
   Loaded here so legacy index ordering cannot bypass the new operational authority. */
try{
  if(!document.getElementById('yardon-ai-plan-map-authority-v1')){
    const s=document.createElement('script');
    s.id='yardon-ai-plan-map-authority-v1';
    s.src='modules/operations/yardon-ai-plan-map-authority-v1.js?v=20261008-ai-plan2';
    (document.head||document.documentElement).appendChild(s);
  }
}catch(_){}

function refreshVisibleMap(){
  if(document.hidden)return;
  const daily=document.getElementById('dailyMap');
  const weekly=document.getElementById('weeklyMap');
  try{
    if(daily?.classList.contains('active')||daily?.classList.contains('manager-force-active')){
      if(typeof renderDailyMap==='function')renderDailyMap();
    }else if(weekly?.classList.contains('active')||weekly?.classList.contains('manager-force-active')){
      if(typeof renderWeeklyMap==='function')renderWeeklyMap();
    }
  }catch(_){}
}
window.__yardivoMapLiveDelayTimerV1=setInterval(refreshVisibleMap,15000);
window.addEventListener('focus',refreshVisibleMap);
window.addEventListener('yardivo:data-synced',refreshVisibleMap);
})();
