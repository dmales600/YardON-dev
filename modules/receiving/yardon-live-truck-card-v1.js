(function(){
'use strict';
if(window.__YARDON_LIVE_TRUCK_CARD_V1__)return;
window.__YARDON_LIVE_TRUCK_CARD_V1__=true;

const ROOT_ID='yardonLiveTruckCardsV1';
let structureKey='';

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function role(){
  let r='';try{r=String(window.currentSession?.app_role||window.currentSession?.role||document.body?.dataset?.yardivoRole||'').trim().toLowerCase()}catch(_){}
  if(r==='prijam')r='reception';
  if(r==='voditelj'||r==='management')r='manager';
  return r;
}
function allowed(){return role()==='reception'||role()==='manager'}
function rows(){
  try{
    if(Array.isArray(window.announcements))return window.announcements;
    const raw=localStorage.getItem('yardivo_yms_announcements_v1');
    const a=JSON.parse(raw||'[]');return Array.isArray(a)?a:[];
  }catch(_){return[]}
}
function normalizedStatus(a){
  try{
    const fn=window.normalizedPlanStatus||window.operationalPlanStatus;
    if(typeof fn==='function')return String(fn(a)||a?.status||'');
  }catch(_){}
  const s=String(a?.status||'').trim().toLowerCase();
  const map={arrival:'U dvorištu',dock:'Na rampi',receiving:'Zaprimanje',completed:'Zaprimljeno',rejected:'Odbijen'};
  return map[s]||String(a?.status||'');
}
function currentWarehouse(){
  const v=String(document.getElementById('globalWarehouse')?.value||window.activeWarehouse||'').trim();
  return v&&v!=='ALL'?v:'';
}
function isActive(a){
  return ['U dvorištu','Na rampi','Zaprimanje'].includes(normalizedStatus(a));
}
function scoped(a){
  const wh=currentWarehouse();
  return !wh||String(a?.warehouse||'')===wh;
}
function ts(v){const n=Date.parse(String(v||''));return Number.isFinite(n)?n:0}
function active(){
  return rows().filter(a=>a&&isActive(a)&&scoped(a)).sort((a,b)=>{
    const aa=ts(a.unloadStartedAt||a.dockArrivalAt||a.yardArrivalAt||a.firstArrivalAt||a.statusUpdatedAt);
    const bb=ts(b.unloadStartedAt||b.dockArrivalAt||b.yardArrivalAt||b.firstArrivalAt||b.statusUpdatedAt);
    return aa-bb;
  });
}
function fmtClock(v){
  const n=ts(v);if(!n)return '—';
  try{return new Date(n).toLocaleTimeString('hr-HR',{hour:'2-digit',minute:'2-digit'})}catch(_){return '—'}
}
function elapsedFrom(a){
  const st=normalizedStatus(a);
  const start=(st==='Na rampi'||st==='Zaprimanje')
    ? (a.unloadStartedAt||a.dockArrivalAt||a.dockAt||a.atDockAt)
    : (a.yardArrivalAt||a.firstArrivalAt||a.gateEnteredAt||a.gateInAt);
  const n=ts(start);return n?Math.max(0,Date.now()-n):0;
}
function fmtElapsed(ms){
  const sec=Math.floor(ms/1000),h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
  return h>0?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function plate(a){return a.arrivalPlate||a.plannedPlate||a.vehiclePlate||a.vehicle_plate||'—'}
function instruction(a){
  const st=normalizedStatus(a),dock=String(a.dock||a.dock_number||'').replace(/^R/i,'');
  if(st==='Na rampi'||st==='Zaprimanje')return dock?`RAMPA R${dock}`:'NA RAMPI';
  if(dock)return `IDE NA RAMPU R${dock}`;
  if(a.parking_slot||a.parkingSlot)return `PARKING ${a.parking_slot||a.parkingSlot}`;
  const raw=String(a.last_instruction||a.yardPosition||'').trim();
  return raw||'ČEKA DODJELU RAMPE';
}
function statusLabel(a){
  const st=normalizedStatus(a);
  if(st==='Na rampi'||st==='Zaprimanje')return 'ISKRCaj / PRIJAM';
  return 'U DVORIŠTU';
}
function ensureStyle(){
  if(document.getElementById('yardonLiveTruckCardsStyleV1'))return;
  const s=document.createElement('style');s.id='yardonLiveTruckCardsStyleV1';s.textContent=`
#${ROOT_ID}{position:fixed;right:18px;bottom:78px;z-index:2147482500;width:min(390px,calc(100vw - 24px));display:grid;gap:9px;pointer-events:none;font-family:inherit}
#${ROOT_ID}[hidden]{display:none!important}
.ylt-card{pointer-events:auto;background:rgba(7,17,24,.96);border:1px solid rgba(70,151,210,.4);border-left:4px solid #ff9f2d;border-radius:14px;box-shadow:0 18px 48px rgba(0,0,0,.38);padding:12px 13px;color:#ecf7ff;backdrop-filter:blur(14px)}
.ylt-card[data-phase="dock"]{border-left-color:#36d17c}
.ylt-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.ylt-title{min-width:0}.ylt-title small{display:flex;align-items:center;gap:7px;color:#8fb3c8;font-size:10px;font-weight:900;letter-spacing:.08em}.ylt-title strong{display:block;margin-top:3px;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ylt-live{width:7px;height:7px;border-radius:50%;background:#39d987;box-shadow:0 0 0 5px rgba(57,217,135,.1)}
.ylt-badge{font-size:10px;font-weight:950;letter-spacing:.05em;padding:6px 8px;border-radius:999px;background:rgba(255,159,45,.12);color:#ffbd70;white-space:nowrap}
.ylt-card[data-phase="dock"] .ylt-badge{background:rgba(54,209,124,.12);color:#6de6a4}
.ylt-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:11px}.ylt-cell{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06);border-radius:9px;padding:8px}.ylt-cell small{display:block;color:#7898aa;font-size:9px;font-weight:900;letter-spacing:.06em}.ylt-cell strong{display:block;margin-top:3px;font-size:12px}
.ylt-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding-top:9px;border-top:1px solid rgba(255,255,255,.08)}.ylt-foot span{font-size:11px;font-weight:850;color:#b8cad5}.ylt-elapsed{font-variant-numeric:tabular-nums;font-size:18px!important;color:#fff!important}
@media(max-width:600px){#${ROOT_ID}{right:10px;bottom:68px;width:calc(100vw - 20px)}.ylt-card{padding:10px 11px}.ylt-title strong{font-size:14px}.ylt-grid{grid-template-columns:1fr 1fr}}
`;document.head.appendChild(s);
}
function ensureRoot(){
  ensureStyle();
  let root=document.getElementById(ROOT_ID);
  if(!root){root=document.createElement('div');root.id=ROOT_ID;root.setAttribute('aria-live','polite');document.body.appendChild(root)}
  return root;
}
function card(a){
  const st=normalizedStatus(a),dockPhase=st==='Na rampi'||st==='Zaprimanje';
  const arrival=a.yardArrivalAt||a.firstArrivalAt||a.gateEnteredAt||a.gateInAt;
  const timerLabel=dockPhase?'VRIJEME NA RAMPI':'VRIJEME U DVORIŠTU';
  return `<article class="ylt-card" data-ylt-id="${esc(a.id)}" data-phase="${dockPhase?'dock':'yard'}">
    <div class="ylt-head"><div class="ylt-title"><small><i class="ylt-live"></i> LIVE KAMION</small><strong>${esc(a.supplier||'Dobavljač')}</strong></div><span class="ylt-badge">${esc(statusLabel(a))}</span></div>
    <div class="ylt-grid">
      <div class="ylt-cell"><small>TABLICE</small><strong>${esc(plate(a))}</strong></div>
      <div class="ylt-cell"><small>TERMIN</small><strong>${esc(a.time||a.requested_time||'—')}</strong></div>
      <div class="ylt-cell"><small>ULAZ U DVORIŠTE</small><strong>${esc(fmtClock(arrival))}</strong></div>
      <div class="ylt-cell"><small>TRENUTNO</small><strong>${esc(instruction(a))}</strong></div>
    </div>
    <div class="ylt-foot"><span>${timerLabel}</span><span class="ylt-elapsed" data-ylt-elapsed="${esc(a.id)}">${fmtElapsed(elapsedFrom(a))}</span></div>
  </article>`;
}
function structuralKey(list){
  return list.map(a=>[a.id,normalizedStatus(a),a.dock||'',a.parking_slot||a.parkingSlot||'',a.supplier||'',plate(a),a.time||'',a.yardArrivalAt||'',a.dockArrivalAt||'',a.unloadStartedAt||''].join('|')).join('||');
}
function refresh(force=false){
  const root=ensureRoot();
  if(!allowed()){root.hidden=true;structureKey='';return}
  const list=active(),key=structuralKey(list);
  root.hidden=!list.length;
  if(!list.length){if(root.innerHTML)root.innerHTML='';structureKey='';return}
  if(force||key!==structureKey){
    root.innerHTML=list.map(card).join('');
    structureKey=key;
  }else{
    for(const a of list){
      const el=root.querySelector(`[data-ylt-elapsed="${CSS.escape(String(a.id))}"]`);
      if(el)el.textContent=fmtElapsed(elapsedFrom(a));
    }
  }
}
['yardivo:receiving-status-changed','yardivo:data-synced','yardivo:server-change','yardivo:yard-ai-dispatched','yardivo:login','yardivo:context-changed']
  .forEach(ev=>window.addEventListener(ev,()=>setTimeout(()=>refresh(true),40)));
window.addEventListener('storage',()=>refresh(true));
document.addEventListener('DOMContentLoaded',()=>refresh(true),{once:true});
window.addEventListener('load',()=>setTimeout(()=>refresh(true),700),{once:true});
setInterval(()=>refresh(false),1000);

window.YardOnLiveTruckCardsV1={refresh:()=>refresh(true),active};
})();