
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
    s.src='modules/operations/yardon-ai-plan-map-authority-v1.js?v=20261008-mapstable1';
    (document.head||document.documentElement).appendChild(s);
  }
}catch(_){}

function refreshVisibleMapStatus(){
  if(document.hidden)return;
  try{window.YardivoDailyMapLiveStatus?.refresh?.()}catch(_){}
}
if(window.__yardivoMapLiveDelayTimerV1)clearInterval(window.__yardivoMapLiveDelayTimerV1);
/* Live delay/status updates must never rebuild the whole map. */
window.__yardivoMapLiveDelayTimerV1=setInterval(refreshVisibleMapStatus,30000);
window.addEventListener('focus',refreshVisibleMapStatus);
})();
