
(function(){
'use strict';
const SLA_KEY='yardivo_detention_settings_v1';
const SCORE_KEY='yardivo_supplier_scores_v1';

function role(){
 let r='';try{r=String(currentSession?.role||'').toLowerCase().trim()}catch(e){}
 if(r==='zalihe'||r==='upravljanje zalihama')r='inventory';
 if(r==='prijam')r='reception';
 if(r==='porta'||r==='portir')r='gate';
 return r;
}
function allowed(){return ['admin','inventory','reception'].includes(role())}
function admin(){return role()==='admin'}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function anns(){try{return Array.isArray(announcements)?announcements:[]}catch(e){return []}}
function incs(){try{return Array.isArray(incidents)?incidents:[]}catch(e){return []}}
function whLoc(w){try{const m=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');return String((m.warehouses||[]).find(x=>x&&x.active!==false&&String(x.id)===String(w))?.location_id||'')}catch(_){return ''}}
function activeLoc(){try{return String(currentSession?.location||'')}catch(e){return ''}}
function scopeA(){const loc=activeLoc();const rows=anns();if(!loc||loc==='ALL'||String(currentSession?.role||'').toLowerCase()==='admin')return rows;return rows.filter(a=>!a.warehouse||whLoc(a.warehouse)===loc)}
function parseTs(v){if(!v)return null;const d=new Date(v);return isNaN(d)?null:d}
function scheduledTs(a){if(!a?.date)return null;const d=new Date(`${a.date}T${a.time||'00:00'}:00`);return isNaN(d)?null:d}
function mins(a,b){if(!a||!b)return null;return Math.max(0,Math.round((b-a)/60000))}
function fmt(m){return m==null?'—':`${m}m`}
function plate(a){return a.plannedPlate||a.vehiclePlate||a.plate||a.registration||'—'}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function settings(){
 let x={waitingWarn:30,waitingCritical:45,dockWarn:60,dockCritical:90,totalCritical:150,lateTolerance:15};
 try{x={...x,...JSON.parse(localStorage.getItem(SLA_KEY)||'{}')}}catch(e){}
 return x;
}
function saveSettings(x){localStorage.setItem(SLA_KEY,JSON.stringify(x))}

function timestamps(a){
 const scheduled=scheduledTs(a);
 const yard=parseTs(a.yardArrivalAt||a.gateEnteredAt||a.enteredAt||a.actualArrivalAt||a.arrivalAt);
 const dock=parseTs(a.dockArrivalAt||a.atDockAt||a.dockAt);
 const received=parseTs(a.receivedAt||a.completedAt||a.finishedAt);
 const rejected=parseTs(a.rejectedAt);
 const end=received||rejected;
 return {scheduled,yard,dock,end};
}
function metrics(a,now=new Date()){
 const t=timestamps(a),s=settings();
 const late=t.scheduled&&t.yard?Math.max(0,Math.round((t.yard-t.scheduled)/60000)):t.scheduled&&!t.yard&&a.date===today()?Math.max(0,Math.round((now-t.scheduled)/60000)):0;
 const waiting=t.yard?mins(t.yard,t.dock||t.end||now):null;
 const dock=t.dock?mins(t.dock,t.end||now):null;
 const dwell=t.yard?mins(t.yard,t.end||now):null;
 let level='ok',reason='';
 if((waiting!=null&&waiting>=s.waitingCritical)||(dock!=null&&dock>=s.dockCritical)||(dwell!=null&&dwell>=s.totalCritical)){level='bad';reason='DETENTION'}
 else if((waiting!=null&&waiting>=s.waitingWarn)||(dock!=null&&dock>=s.dockWarn)||late>s.lateTolerance){level='warn';reason=late>s.lateTolerance?'KAŠNJENJE':'SLA UPOZORENJE'}
 return {...t,late,waiting,dock,dwell,level,reason};
}
function statusKey(a){return String(a.status||'').toLocaleLowerCase('hr-HR')}
function isYard(a){const s=statusKey(a);return s.includes('dvori')||s==='u dvorištu'}
function isDock(a){const s=statusKey(a);return s.includes('ramp')}
function isDone(a){const s=statusKey(a);return s.includes('zaprim')||s.includes('odbij')||s.includes('zavr')}

function timelineHtml(a){
 const t=timestamps(a),s=statusKey(a);
 const steps=[
  ['Najava',!!t.scheduled],
  ['Porta',!!t.yard],
  ['Dvorište',!!t.yard],
  ['Rampa',!!t.dock],
  ['Završeno',!!t.end]
 ];
 let current=steps.findIndex(x=>!x[1]);if(current<0)current=steps.length-1;
 return `<div class="ct-timeline">${steps.map((x,i)=>`<span class="ct-step ${x[1]?'done':i===current?'current':''}">${x[0]}</span>`).join('')}</div>`;
}

function supplierScores(){
 const as=scopeA(),ins=incs().filter(i=>!i.warehouse||whLoc(i.warehouse)===activeLoc());
 const suppliers=new Set(as.map(a=>a.supplier).filter(Boolean));
 const rows=[];
 suppliers.forEach(name=>{
   const data=as.filter(a=>a.supplier===name),completed=data.filter(isDone);
   const lateCount=data.filter(a=>metrics(a).late>settings().lateTolerance).length;
   const noShow=data.filter(a=>String(a.status||'').toLowerCase().includes('no-show')||String(a.status||'').toLowerCase().includes('no show')).length;
   const unann=data.filter(a=>a.arrivalType==='UNANNOUNCED').length;
   const incidentCount=ins.filter(i=>i.supplier===name).length;
   const dwellVals=completed.map(a=>metrics(a).dwell).filter(v=>v!=null);
   const avgDwell=dwellVals.length?Math.round(dwellVals.reduce((x,y)=>x+y,0)/dwellVals.length):0;
   const detention=data.filter(a=>metrics(a).level==='bad').length;
   let score=100;
   if(data.length){
     score-=Math.min(25,lateCount/data.length*25);
     score-=Math.min(20,noShow/data.length*40);
     score-=Math.min(15,unann/data.length*30);
     score-=Math.min(20,incidentCount/Math.max(1,data.length)*35);
     score-=Math.min(20,detention/data.length*30);
   }
   if(avgDwell>settings().totalCritical)score-=5;
   score=Math.max(0,Math.round(score));
   rows.push({supplier:name,score,total:data.length,late:lateCount,noShow,unannounced:unann,incidents:incidentCount,detention,avgDwell});
 });
 rows.sort((a,b)=>a.score-b.score||b.total-a.total);
 try{
   const location=activeLoc();
   let prevObj=null;
   try{prevObj=JSON.parse(localStorage.getItem(SCORE_KEY)||'null')}catch(_){}
   const prevComparable=prevObj?JSON.stringify({location:prevObj.location||'',scores:Array.isArray(prevObj.scores)?prevObj.scores:[]}):'';
   const nextComparable=JSON.stringify({location,scores:rows});
   if(prevComparable!==nextComparable){
     localStorage.setItem(SCORE_KEY,JSON.stringify({updatedAt:new Date().toISOString(),location,scores:rows}));
   }
 }catch(e){}
 return rows;
}

function renderControlTower(){
 const view=document.getElementById('controlTower'),nav=document.querySelector('[data-view="controlTower"]');
 if(nav)nav.style.setProperty('display',allowed()?'flex':'none','important');
 if(!view||!allowed())return;
 const day=scopeA().filter(a=>a.date===today()),now=new Date();
 const ms=day.map(a=>({a,m:metrics(a,now)}));
 const yard=day.filter(isYard).length,dock=day.filter(isDock).length;
 const late=ms.filter(x=>x.m.late>settings().lateTolerance&&!isDone(x.a)).length;
 const detention=ms.filter(x=>x.m.level==='bad'&&!isDone(x.a)).length;
 const ua=day.filter(a=>a.arrivalType==='UNANNOUNCED').length;
 const incToday=incs().filter(i=>i.date===today()&&(!i.warehouse||whLoc(i.warehouse)===activeLoc())).length;
 const dwell=ms.map(x=>x.m.dwell).filter(v=>v!=null&&v>0);
 const avg=dwell.length?Math.round(dwell.reduce((a,b)=>a+b,0)/dwell.length):0;
 document.getElementById('ctTodayTotal').textContent=day.length;document.getElementById('ctYard').textContent=yard;document.getElementById('ctDock').textContent=dock;
 document.getElementById('ctLate').textContent=late;document.getElementById('ctDetention').textContent=detention;document.getElementById('ctUnannounced').textContent=ua;
 document.getElementById('ctIncidents').textContent=incToday;document.getElementById('ctAvgDwell').textContent=`${avg}m`;
 const badge=document.getElementById('ctCriticalBadge');const critical=detention+incToday;
 if(badge){badge.textContent=critical;badge.style.display=critical?'inline-flex':'none'}

 const live=document.getElementById('ctLiveBody');
 live.innerHTML=ms.sort((x,y)=>String(x.a.time||'').localeCompare(String(y.a.time||''))).map(({a,m})=>`<tr>
  <td>${esc(a.time||'—')}</td><td><strong>${esc(a.supplier||'—')}</strong>${a.orderNumber?`<br><span class="order-chip">${esc(a.orderNumber)}</span>`:''}</td>
  <td>${esc(plate(a))}</td><td>${esc(a.warehouse||'—')}</td><td>${esc(a.status||'—')}</td>
  <td>${fmt(m.waiting)}</td><td>${fmt(m.dock)}</td><td>${fmt(m.dwell)}</td>
  <td><span class="ct-sla ${m.level}">${m.reason||'OK'}</span></td><td>${timelineHtml(a)}</td></tr>`).join('')||'<tr><td colspan="10"><div class="overview-empty">Nema današnjih najava.</div></td></tr>';

 const crit=[];
 ms.forEach(({a,m})=>{
  if(m.level==='bad')crit.push({bad:true,title:`DETENTION · ${a.supplier}`,body:`${plate(a)} · ${a.warehouse||'—'} · čekanje ${fmt(m.waiting)} · rampa ${fmt(m.dock)} · dwell ${fmt(m.dwell)}`});
  else if(m.late>settings().lateTolerance&&!isDone(a))crit.push({bad:false,title:`KAŠNJENJE · ${a.supplier}`,body:`${plate(a)} · +${m.late} min od termina ${a.time||'—'}`});
  if(a.arrivalType==='UNANNOUNCED'&&a.approvalStatus==='PENDING')crit.push({bad:false,title:`NENAJAVLJENI · ${a.supplier}`,body:`${plate(a)} · čeka odobrenje`});
 });
 incs().filter(i=>i.date===today()&&(!i.warehouse||whLoc(i.warehouse)===activeLoc())).forEach(i=>crit.push({bad:true,title:`INCIDENT · ${i.supplier||'—'}`,body:`${i.warehouse||'—'} · ${i.reason||i.type||'Incident'} · ${i.severity||'—'}`}));
 const cl=document.getElementById('ctCriticalList');cl.innerHTML=crit.slice(0,20).map(x=>`<div class="ct-critical-item ${x.bad?'bad':''}"><strong>${esc(x.title)}</strong><span>${esc(x.body)}</span></div>`).join('')||'<div class="overview-empty">Nema kritičnih situacija.</div>';

 const codes=window.YardivoGlobalContextV583?.warehouseIds?.()||[];
 document.getElementById('ctWarehouseGrid').innerHTML=codes.map(w=>{
   const d=day.filter(a=>a.warehouse===w),onDock=d.filter(isDock).length,inYard=d.filter(isYard).length,det=d.filter(a=>metrics(a).level==='bad').length;
   return `<div class="ct-wh"><h3>${w} · ${esc(WAREHOUSES?.[w]?.name||'')}</h3><small>${activeLoc()==='DU'?'Lokacija 2':'Lokacija 1'}</small><div class="ct-wh-kpis"><div><small>DVORIŠTE</small><strong>${inYard}</strong></div><div><small>RAMPA</small><strong>${onDock}</strong></div><div><small>DETENTION</small><strong>${det}</strong></div></div></div>`;
 }).join('');

 const scores=supplierScores().slice(0,8);
 document.getElementById('ctSupplierRisk').innerHTML=scores.map(x=>`<div class="ct-supplier-row"><div><strong>${esc(x.supplier)}</strong><br><small>${x.total} isporuka · ${x.late} kasni · ${x.incidents} inc. · ${x.unannounced} nenaj.</small></div><div class="ct-score ${x.score>=85?'good':x.score>=70?'mid':'bad'}">${x.score}</div><div class="ct-score-bar"><i style="width:${x.score}%"></i></div></div>`).join('')||'<div class="overview-empty">Nema podataka za score.</div>';
}

function ensureSettings(){
 /* Dwell / Detention thresholds are no longer user-configurable.
    Control Tower may still measure dwell operationally, but Admin Settings
    now owns only the global delay/no-show rules. */
 const old=document.getElementById('detentionSettings');
 if(old)old.remove();
 const old2=document.getElementById('yardivoMasterDwellV583');
 if(old2)old2.remove();
}

function decorateSupplierProfile(){
 const title=document.querySelector('#supplierProfile .supplier-profile-title h2')?.textContent?.trim();
 if(!title)return;
 const x=supplierScores().find(s=>s.supplier===title);if(!x)return;
 const host=document.querySelector('#supplierProfile .supplier-profile-grid')||document.querySelector('#supplierProfile .panel-body');if(!host)return;
 let box=document.getElementById('supplierYardivoScore');
 if(!box){box=document.createElement('div');box.id='supplierYardivoScore';box.className='supplier-scorecard-extra';host.insertAdjacentElement('afterend',box)}
 box.innerHTML=`<div><small>YARDIVO SCORE</small><strong class="${x.score>=85?'reliability-good':x.score>=70?'reliability-mid':'reliability-bad'}">${x.score}/100</strong></div><div><small>KAŠNJENJA</small><strong>${x.late}</strong></div><div><small>NO-SHOW</small><strong>${x.noShow}</strong></div><div><small>INCIDENTI</small><strong>${x.incidents}</strong></div><div><small>NENAJAVLJENI</small><strong>${x.unannounced}</strong></div><div><small>AVG DWELL</small><strong>${x.avgDwell}m</strong></div>`;
}

document.getElementById('ctOpenSuppliers')?.addEventListener('click',()=>window.openAppView?.('suppliers'));
document.addEventListener('click',e=>{
 if(e.target.closest('[data-view="controlTower"],[data-home-target="controlTower"]'))setTimeout(renderControlTower,30);
 if(e.target.closest('[data-view="settings"],[data-home-target="settings"]'))setTimeout(ensureSettings,30);
 if(e.target.closest('[data-view="suppliers"],[data-home-target="suppliers"]'))setTimeout(decorateSupplierProfile,120);
},true);

function homeCard(){
 const grid=document.getElementById('homeMenuGrid');if(!grid)return;
 let card=grid.querySelector('[data-home-target="controlTower"]');
 if(!allowed()){if(card)card.style.setProperty('display','none','important');return}
 if(!card){card=document.createElement('div');card.className='home-menu-card';card.dataset.homeTarget='controlTower';card.setAttribute('role','button');card.setAttribute('tabindex','0');card.innerHTML='<div class="home-menu-icon">◉</div><h3>Control Tower</h3><p>Real-time SLA, dwell time i operativni rizici.</p><div class="home-menu-open">OTVORI →</div>';grid.appendChild(card)}
 card.style.setProperty('display','flex','important');card.onclick=()=>window.openAppView?.('controlTower');
}

window.addEventListener('load',()=>setTimeout(()=>{homeCard();ensureSettings();renderControlTower();decorateSupplierProfile()},500));
setInterval(()=>{if(allowed())renderControlTower();if(admin())ensureSettings()},5000);
window.YardivoControlTower={render:renderControlTower,metrics,supplierScores,settings};
})();
