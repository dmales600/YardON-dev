
(function(){
'use strict';

const LOG_KEY='yardivo_auto_replan_log_v1';
const CFG_KEY='yardivo_auto_replan_cfg_v1';
const NOTIF_KEY='yardivo_live_notifications_v1';
const DEFAULT_CFG={enabled:false,mode:'PAUSED',lateThreshold:20,horizonMinutes:240,maxShiftMinutes:240,scanSeconds:30,palletsPerHour:33,gapWeight:1.15};
let selectedLogId=null,lastScanAt=0,scanBusy=false,lastSignature='';

function role(){let r='';try{r=String(currentSession?.role||'').toLowerCase().trim()}catch(e){}if(r==='prijam')r='reception';if(r==='zalihe'||r==='upravljanje zalihama')r='inventory';if(r==='management'||r==='voditelj')r='manager';if(r==='porta'||r==='portir')r='gate';return r}
function canManage(){return ['admin','inventory'].includes(role())}
function canView(){
 const r=role();
 if(r==='manager')return window.yardivoManagerSectionAllowed?.('smartReplanning')===true;
 return ['admin','inventory','reception'].includes(r);
}
function user(){try{return currentSession?.username||currentSession?.user||role()||'YARDIVO'}catch(e){return role()||'YARDIVO'}}
function loadCfg(){try{return {...DEFAULT_CFG,...JSON.parse(localStorage.getItem(CFG_KEY)||'{}')}}catch(e){return {...DEFAULT_CFG}}}
function applySmartUiState(c=loadCfg()){
 const on=!!c.enabled && c.mode!=='PAUSED';
 document.documentElement.classList.toggle('yardivo-smart-off',!on);
 document.documentElement.classList.toggle('yardivo-smart-on',on);
 // Navigation is permanently owned by the application shell, not SMART.
 if(!on){
   document.getElementById('yardivoAutoReplanAlertStack')?.replaceChildren();
 }
 return on;
}
function saveCfg(c){
 localStorage.setItem(CFG_KEY,JSON.stringify(c));
 applySmartUiState(c);
}
function logs(){try{const a=JSON.parse(localStorage.getItem(LOG_KEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
function saveLogs(a){localStorage.setItem(LOG_KEY,JSON.stringify(a.slice(-1000)))}
function A(){try{return window.YardivoPlanningMasterAnnouncements?.()||[]}catch(e){return[]}}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function min(t){try{return toMin(t)}catch(e){const x=String(t||'').split(':').map(Number);return (x[0]||0)*60+(x[1]||0)}}
function hh(m){try{return hhmm(m)}catch(e){return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`}}
function isoDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function floor15(m){return Math.ceil(m/15)*15}
function nowParts(){const d=new Date();return {date:isoDate(d),minutes:d.getHours()*60+d.getMinutes(),dateObj:d}}
function cfgWh(w){try{return WAREHOUSES?.[w]||null}catch(e){return null}}
function immutable(a){const s=String(a?.status||'').toLowerCase();return !!(a?.yardArrivalAt||a?.dockArrivalAt||a?.receivedAt||a?.rejectedAt||/dvori|rampi|zaprim|odbij|zavr|izašao|izasao/.test(s))}
function plannedMs(a){const d=new Date(`${a.date}T${a.time}:00`);return d.getTime()}
function lateMinutes(a){if(immutable(a))return 0;const p=plannedMs(a);if(!Number.isFinite(p))return 0;return Math.max(0,Math.floor((Date.now()-p)/60000))}
function isLocked(w,d){try{return !!window.YardivoRampConfig?.isLocked?.(w,d)}catch(e){return false}}
function isBlocked(w,date,dock,start,dur){try{return !!isRampBlocked(w,date,dock,start,dur)}catch(e){return false}}
function hasConflict(a){
 const w=a.warehouse||yardivoCanonicalWarehouseV583(),start=min(a.time),dur=Math.max(15,Number(a.duration||15));
 if(isLocked(w,Number(a.dock)))return {type:'RAMP_CLOSED',reason:`Rampa R${a.dock} je zatvorena / nedostupna.`};
 if(isBlocked(w,a.date,Number(a.dock),start,dur))return {type:'RAMP_BLOCKED',reason:`Rampa R${a.dock} je blokirana u terminu ${a.time}.`};
 const dock=Number(a.dock);
 const conflict=dock>0?A().find(b=>b.id!==a.id&&(b.warehouse||yardivoCanonicalWarehouseV583())===w&&b.date===a.date&&Number(b.dock)>0&&Number(b.dock)===dock&&typeof overlaps==='function'&&overlaps(start,dur,min(b.time),Number(b.duration||15))):null;
 if(conflict)return {type:'SLOT_CONFLICT',reason:`Termin se preklapa s ${conflict.supplier||'drugom najavom'} na R${dock}.`};
 return null;
}
function workingDay(date){
 try{if(typeof isWeekendIsoEarly==='function'&&isWeekendIsoEarly(date))return false}catch(e){}
 try{if(typeof holidayNameEarly==='function'&&holidayNameEarly(date))return false}catch(e){}
 return true;
}
function addDate(date,days){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return isoDate(d)}
function loadAt(date,w,start,dur){
 try{return typeof slotWarehouseLoad==='function'?slotWarehouseLoad(date,w,start,dur):0}catch(e){return 0}
}
function rampLoad(date,w,dock){
 try{return typeof rampDayLoad==='function'?rampDayLoad(date,w,dock):0}catch(e){return 0}
}
function gapPenalty(date,w,dock,start,dur,aId){
 const same=A().filter(b=>String(b.id)!==String(aId)&&(b.warehouse||yardivoCanonicalWarehouseV583())===w&&b.date===date&&Number(b.dock)===Number(dock)&&!immutable(b));
 let prevEnd=null,nextStart=null;
 for(const b of same){const bs=min(b.time),bd=Math.max(15,Number(b.duration||15)),be=bs+bd;if(be<=start&&(prevEnd===null||be>prevEnd))prevEnd=be;if(bs>=start+dur&&(nextStart===null||bs<nextStart))nextStart=bs}
 const before=prevEnd===null?60:Math.max(0,start-prevEnd),after=nextStart===null?60:Math.max(0,nextStart-(start+dur));
 return Math.min(120,before+after);
}
function candidateList(a,problem){
 const w=a.warehouse||yardivoCanonicalWarehouseV583(),wc=cfgWh(w);if(!wc)return[];
 const rate=Math.max(1,Number(loadCfg().palletsPerHour||33));
 const modelDur=Math.max(15,Math.ceil(((Number(a.pallets||0)/rate)*60)/15)*15||15);
 const dur=Math.max(15,Number(a.duration||modelDur)),now=nowParts(),base=min(a.time),out=[];
 const maxShift=loadCfg().maxShiftMinutes;
 for(let dayOffset=0;dayOffset<=1;dayOffset++){
   const date=addDate(a.date,dayOffset);if(!workingDay(date))continue;
   const ws=min(wc.receptionStart),we=min(wc.receptionEnd);
   let earliest=ws;
   if(date===now.date)earliest=Math.max(earliest,floor15(now.minutes+10));
   if(problem.type==='RAMP_CLOSED'||problem.type==='RAMP_BLOCKED'||problem.type==='SLOT_CONFLICT')earliest=Math.max(earliest,dayOffset===0?base:ws);
   if(problem.type==='LATE')earliest=Math.max(earliest,floor15(now.minutes+10));
   for(let start=earliest;start+dur<=we;start+=15){
     const shift=(dayOffset*1440)+(start-base);
     if(dayOffset===0&&shift>maxShift)break;
     for(let dock=1;dock<=Number(wc.ramps||1);dock++){
       if(isLocked(w,dock))continue;
       if(isBlocked(w,date,dock,start,dur))continue;
       let free=false;try{free=typeof isSlobodna==='function'?isSlobodna(date,dock,start,dur,a.id,w):true}catch(e){free=false}
       if(!free)continue;
       const sameDock=dock===Number(a.dock),sameTime=start===base,sameDate=date===a.date;
       if(sameDock&&sameTime&&sameDate)continue;
       const delayPenalty=Math.max(0,shift)*1.35;
       const rampPenalty=rampLoad(date,w,dock)*.14;
       const congestion=loadAt(date,w,start,dur)*.8;
       const dockChange=sameDock?0:10;
       const nextDay=dayOffset?240:0;
       const compactGap=gapPenalty(date,w,dock,start,dur,a.id)*Math.max(0,Number(loadCfg().gapWeight||1.15));
       const score=delayPenalty+rampPenalty+congestion+dockChange+nextDay+compactGap;
       out.push({date,time:hh(start),start,dock,score,shift,warehouseLoad:congestion,rampLoad:rampPenalty});
     }
   }
 }
 return out.sort((x,y)=>x.score-y.score||x.shift-y.shift||x.dock-y.dock);
}
function detect(a){
 if(immutable(a))return null;
 const cfg=loadCfg(),late=lateMinutes(a),conf=hasConflict(a);
 if(conf)return {...conf,late};
 if(late>=cfg.lateThreshold)return {type:'LATE',late,reason:`Dobavljač kasni ${late} min u odnosu na planirani termin ${a.time}.`};
 return null;
}
function confidence(problem,c){
 let v=98;
 if(problem.type==='LATE')v-=Math.min(15,Math.floor((problem.late||0)/20));
 if(c.shift>120)v-=8;
 if(c.shift>240)v-=8;
 if(c.dock!==0)v-=0;
 return Math.max(70,Math.min(99,v));
}
function notification(targets,title,body,a,log){
 let arr=[];try{arr=JSON.parse(localStorage.getItem(NOTIF_KEY)||'[]');if(!Array.isArray(arr))arr=[]}catch(e){}
 const now=new Date().toISOString();
 arr.push({id:'AUTO-'+log.id,event:'AUTO_REPLAN',title,body,at:now,createdAt:now,roles:targets,readBy:{},supplier:a.supplier||'',announcementId:a.id,plate:a.plannedPlate||a.arrivalPlate||'',warehouse:String(a.warehouse||'').toUpperCase(),location:/^W2/.test(String(a.warehouse||'').toUpperCase())?'DU':(/^W1/.test(String(a.warehouse||'').toUpperCase())?'VG':''),autoReplanLogId:log.id});
 localStorage.setItem(NOTIF_KEY,JSON.stringify(arr));
 try{putCloudState?.(NOTIF_KEY,JSON.stringify(arr))}catch(e){}
 try{YardivoNotifications?.render?.()}catch(e){}
}
function refreshAll(){
 try{saveAnnouncements()}catch(e){}
 try{render?.()}catch(e){}
 try{renderAnnouncements?.()}catch(e){}
 try{renderAnnouncementSchedule?.()}catch(e){}
 try{renderDailyMap?.()}catch(e){}
 try{renderWeeklyMap?.()}catch(e){}
 try{renderReceiving?.()}catch(e){}
 try{renderOverview?.()}catch(e){}
 try{renderControlTower?.()}catch(e){}
 try{YardivoLiveYard?.render?.()}catch(e){}
}
function applyReplan(a,problem,c){
 const now=new Date().toISOString(),conf=confidence(problem,c);
 const old={date:a.date,time:a.time,dock:Number(a.dock)};
 const existing=logs().find(l=>String(l.announcementId)===String(a.id)&&['PENDING_INVENTORY','PENDING_SUPPLIER'].includes(l.status));
 if(existing)return existing;
 const log={
   id:Date.now()+'-'+Math.random().toString(36).slice(2,7),
   at:now,
   announcementId:a.id,
   supplierDeliveryId:a.supplierDeliveryId||'',
   supplier:a.supplier||'',
   warehouse:a.warehouse||yardivoCanonicalWarehouseV583(),
   old,
   newSlot:{date:c.date,time:c.time,dock:c.dock},
   problemType:problem.type,
   reason:problem.reason,
   lateMinutes:problem.late||0,
   confidence:conf,
   score:Math.round(c.score),
   mode:'SMART_APPROVAL',
   status:'PENDING_INVENTORY',
   acknowledgedBy:[],
   orderNumber:a.orderNumber||''
 };
 const ls=logs();ls.push(log);saveLogs(ls);
 try{window.YardivoTermProvenance?.record?.({announcementId:a.id,supplierDeliveryId:a.supplierDeliveryId||'',supplier:a.supplier||'',warehouse:a.warehouse||'',initiatedByType:'YARDIVO_SMART',initiatedBy:'YARDIVO SMART',status:'PENDING_INVENTORY',before:old,after:{date:c.date,time:c.time,dock:c.dock},reason:problem.reason,responsibility:'YARDIVO_SMART'})}catch(_){}
 const msg=`${a.supplier||'Dobavljač'} · Inicirao: YARDIVO SMART · ${old.date} ${old.time} R${old.dock} → ${c.date} ${c.time} R${c.dock}. ${problem.reason} Potrebna je potvrda Upravljanja zalihama.`;
 notification(['admin','inventory'],'YARDIVO SMART · NOVI PRIJEDLOG TERMINA',msg,a,log);
 showAlert(log);
 selectedLogId=log.id;renderSection();
 return log;
}
function alertStack(){let s=document.getElementById('yardivoAutoReplanAlertStack');if(!s){s=document.createElement('div');s.id='yardivoAutoReplanAlertStack';document.body.appendChild(s)}return s}
function showAlert(log){
 if(!currentSession?.role||!canView())return;
 const s=alertStack(),x=document.createElement('div');x.className='srp-alert '+(log.problemType==='RAMP_CLOSED'?'critical':log.problemType==='LATE'?'warn':'');
 x.dataset.logId=log.id;
 x.innerHTML=`<h3>⚡ YARDIVO SMART PRIJEDLOG</h3><p><strong>${esc(log.supplier)}</strong> · ${esc(log.reason)}</p>
 <div class="change"><div class="box"><small>PRIJE</small><strong>${esc(log.old.date)} ${esc(log.old.time)} · R${log.old.dock}</strong></div><div class="arr">→</div><div class="box"><small>NOVO</small><strong>${esc(log.newSlot.date)} ${esc(log.newSlot.time)} · R${log.newSlot.dock}</strong></div></div>
 <div class="foot"><small>Smart izračun · čeka potvrdu zaliha · ${new Date(log.at).toLocaleString('hr-HR')} · confidence ${log.confidence}%</small><button type="button">OK</button></div>`;
 x.querySelector('button').onclick=()=>{ack(log.id);x.remove()};
 s.appendChild(x);
}
function ack(id){
 const ls=logs(),l=ls.find(x=>String(x.id)===String(id));if(!l)return;
 l.acknowledgedBy=Array.isArray(l.acknowledgedBy)?l.acknowledgedBy:[];
 const u=user();if(!l.acknowledgedBy.some(x=>x.user===u))l.acknowledgedBy.push({user:u,at:new Date().toISOString(),role:role()});
 saveLogs(ls);renderSection();
}
function signature(){
 try{return JSON.stringify({a:A().map(x=>[x.id,x.date,x.time,x.dock,x.status,x.yardArrivalAt,x.dockArrivalAt,x.receivedAt,x.rejectedAt]),b:typeof rampBlocks!=='undefined'?rampBlocks:[],r:window.YardivoRampConfig?.get?.()||{}})}catch(e){return String(Date.now())}
}
function scan(force=false){
 const cfg=loadCfg();if(scanBusy||!cfg.enabled||!currentSession?.role)return;
 const now=Date.now();if(!force&&now-lastScanAt<Math.max(10000,cfg.scanSeconds*1000))return;
 scanBusy=true;lastScanAt=now;
 try{
   const horizon=now+cfg.horizonMinutes*60000;
   const candidates=A().filter(a=>!immutable(a)&&plannedMs(a)<=horizon&&plannedMs(a)>now-6*60*60*1000).sort((a,b)=>plannedMs(a)-plannedMs(b));
   let applied=0;
   for(const a of candidates){
     const problem=detect(a);if(!problem)continue;
     const opts=candidateList(a,problem);if(!opts.length){
       const already=logs().some(l=>String(l.announcementId)===String(a.id)&&l.status==='NO_SAFE_SLOT'&&Date.now()-new Date(l.at).getTime()<60*60*1000);
       if(!already){
         const l={id:Date.now()+'-NO-'+a.id,at:new Date().toISOString(),announcementId:a.id,supplier:a.supplier||'',warehouse:a.warehouse||yardivoCanonicalWarehouseV583(),old:{date:a.date,time:a.time,dock:Number(a.dock)},newSlot:null,problemType:problem.type,reason:problem.reason,status:'NO_SAFE_SLOT',confidence:0,acknowledgedBy:[]};
         const ls=logs();ls.push(l);saveLogs(ls);
         notification(['admin','manager','inventory','reception'],'YARDIVO · NEMA SIGURNOG TERMINA',`${a.supplier||'Dobavljač'} · ${problem.reason} Nije pronađen siguran slobodan termin.`,a,l);
       }
       continue;
     }
     if(cfg.mode==='AUTO_SAFE'){applyReplan(a,problem,opts[0]);applied++;if(applied>=8)break}
   }
 }finally{scanBusy=false;lastSignature=signature();renderSection()}
}
function inject(){
 // SMART is the active planning engine, not a separate application page.
 // The legacy menu/view must never be recreated by the five-second scan loop.
 const nav=document.querySelector('.nav-btn[data-view="smartReplanning"]');
 if(nav)nav.remove();
 const view=document.getElementById('smartReplanning');
 if(view){
   if(view.classList.contains('active'))window.YardivoRoleStableFinal?.open?.('homeMenu');
   view.remove();
 }
}

let bound=false;
function bind(){if(bound)return;bound=true;
 document.addEventListener('click',e=>{
   const row=e.target.closest('[data-srp-log]');if(row){selectedLogId=row.dataset.srpLog;renderSection();return}
 });
 document.getElementById('srpScanNow')?.addEventListener('click',()=>scan(true));
 document.getElementById('srpMode')?.addEventListener('change',e=>{const c=loadCfg();c.enabled=e.target.value!=='PAUSED';c.mode=e.target.value==='PAUSED'?'PAUSED':'AUTO_SAFE';saveCfg(c);renderSection()});
 document.getElementById('srpLate')?.addEventListener('change',e=>{const c=loadCfg();c.lateThreshold=Number(e.target.value);saveCfg(c);renderSection()});
}
function renderSection(){
 const c=loadCfg();
 if(!applySmartUiState(c))return;
 if(!document.getElementById('smartReplanning'))return;
 const ls=logs().slice().sort((a,b)=>String(b.at).localeCompare(String(a.at))),td=isoDate(new Date());
 document.getElementById('srpMode').value=c.enabled?'AUTO_SAFE':'PAUSED';document.getElementById('srpLate').value=String(c.lateThreshold);
 document.getElementById('srpEngineText').textContent=c.enabled?'SMART ON · AUTOMATSKA ANALIZA':'REPLANNING · PAUZIRAN';
 document.getElementById('srpToday').textContent=ls.filter(x=>x.at?.slice(0,10)===td&&x.newSlot).length;
 document.getElementById('srpLateKpi').textContent=ls.filter(x=>x.at?.slice(0,10)===td&&x.problemType==='LATE'&&x.newSlot).length;
 document.getElementById('srpRampKpi').textContent=ls.filter(x=>x.at?.slice(0,10)===td&&['RAMP_CLOSED','RAMP_BLOCKED','SLOT_CONFLICT'].includes(x.problemType)&&x.newSlot).length;
 document.getElementById('srpNoSlot').textContent=ls.filter(x=>x.at?.slice(0,10)===td&&x.status==='NO_SAFE_SLOT').length;
 const host=document.getElementById('srpList');
 host.innerHTML=ls.length?ls.map(l=>`<article class="srp-row" data-srp-log="${esc(l.id)}"><div class="top"><h4>${esc(l.supplier||'Dobavljač')} · ${esc(l.problemType)}</h4><time>${new Date(l.at).toLocaleString('hr-HR')}</time></div><div class="srp-reason">${esc(l.reason)}</div>${l.newSlot?`<div class="srp-change"><span class="srp-slot">${esc(l.old.date)} ${esc(l.old.time)} · R${l.old.dock}</span><span class="srp-arrow">→</span><span class="srp-slot">${esc(l.newSlot.date)} ${esc(l.newSlot.time)} · R${l.newSlot.dock}</span></div>`:''}<div class="srp-chips"><span class="srp-chip ${['SUPPLIER_ACCEPTED','APPLIED'].includes(l.status)?'auto':(['PENDING_INVENTORY','PENDING_SUPPLIER'].includes(l.status)?'warn':'critical')}">${esc(({PENDING_INVENTORY:'ČEKA ZALIHE',PENDING_SUPPLIER:'ČEKA DOBAVLJAČA',SUPPLIER_ACCEPTED:'DOBAVLJAČ PRIHVATIO',NO_SAFE_SLOT:'NEMA SIGURNOG TERMINA'})[l.status]||l.status)}</span>${l.confidence?`<span class="srp-chip">confidence ${l.confidence}%</span>`:''}${l.lateMinutes?`<span class="srp-chip warn">kasni ${l.lateMinutes} min</span>`:''}<span class="srp-chip">${(l.acknowledgedBy||[]).length} potvrda OK</span></div></article>`).join(''):'<div class="srp-empty">YARDIVO Smart još nema prijedloga.</div>';
 const l=ls.find(x=>String(x.id)===String(selectedLogId));
 const d=document.getElementById('srpDetail');
 if(!l){d.innerHTML='<div class="srp-empty">Odaberi automatsku preporuku.</div>';return}
 d.innerHTML=`<h2>${esc(l.supplier)}</h2><p>${esc(l.reason)}</p><div class="srp-detail-grid"><div><small>VRIJEME ODLUKE</small><strong>${new Date(l.at).toLocaleString('hr-HR')}</strong></div><div><small>STATUS</small><strong>${esc(l.status)}</strong></div><div><small>STARI TERMIN</small><strong>${esc(l.old.date)} ${esc(l.old.time)} · R${l.old.dock}</strong></div><div><small>NOVI TERMIN</small><strong>${l.newSlot?`${esc(l.newSlot.date)} ${esc(l.newSlot.time)} · R${l.newSlot.dock}`:'Nije pronađen'}</strong></div><div><small>POUZDANOST</small><strong>${l.confidence||0}%</strong></div><div><small>ALGORITAM SCORE</small><strong>${l.score??'—'}</strong></div></div><div class="srp-note"><strong>Smart approval workflow:</strong><br>YARDIVO je provjerio kompatibilne rampe, ON/OFF stanje, blokade, postojeće najave, radno vrijeme, kapacitet i trajanje istovara. Smart samo predlaže. Najava se ne mijenja dok Zalihe ne potvrde prijedlog i dobavljač ga potom ne prihvati.</div><div class="srp-action-row">${l.status==='PENDING_INVENTORY'&&['admin','inventory'].includes(role())?`<button class="primary" data-smart-inventory-approve="${esc(l.id)}">POTVRDI I POŠALJI DOBAVLJAČU</button>`:''}<button class="secondary" onclick="YardivoSmartReplanning.scanNow()">PONOVNO IZRAČUNAJ</button></div>`;
}
function wrapRampTriggers(){
 try{
   if(typeof window.addRampBlock==='function'&&!window.addRampBlock.__srp){
     const f=window.addRampBlock;window.addRampBlock=function(){const o=f.apply(this,arguments);setTimeout(()=>scan(true),150);return o};window.addRampBlock.__srp=true;
   }
 }catch(e){}
 try{
   const api=window.YardivoRampConfig;
   if(api&&!api.__srp){
     const sl=api.setLocked;api.setLocked=function(){const o=sl.apply(this,arguments);setTimeout(()=>scan(true),150);return o};api.__srp=true;
   }
 }catch(e){}
}
const oldOpen=window.openAppView;
if(typeof oldOpen==='function'&&!oldOpen.__srp){
 const wrapped=function(v){const o=oldOpen.apply(this,arguments);if(v==='smartReplanning')setTimeout(renderSection,0);return o};wrapped.__srp=true;window.openAppView=wrapped;
}
window.addEventListener('load',()=>setTimeout(()=>{
 const c=loadCfg();applySmartUiState(c);
 if(!c.enabled||c.mode==='PAUSED')return;
 inject();wrapRampTriggers();lastSignature=signature();scan(true)
},1800));
setInterval(()=>{
 if(!currentSession?.role)return;
 if(!applySmartUiState(loadCfg()))return;
 inject();wrapRampTriggers();
 const sig=signature();if(sig!==lastSignature){lastSignature=sig;scan(true)}else scan(false);
},5000);

window.YardivoSmartReplanning={scanNow:()=>scan(true),render:renderSection,logs,applyState:()=>applySmartUiState(loadCfg())};
})();
