
// ===== DOGRADNJA POSTOJEĆE VERZIJE – bez promjene dizajna =====
const YMS_STAGES=['Najavljen','Stigao','Čeka','Pozvan na rampu','Na rampi','Istovar u tijeku','Završeno','Izašao'];
let incidentPhotoData='';

function ymsToday(){return window.yardivoLocalDateV583()}
function ymsDT(d,t){return new Date(`${d}T${t}:00`)}
function ymsMinutes(a,b){return Math.round((b-a)/60000)}
function ymsStageIndex(a){return Math.max(0,YMS_STAGES.indexOf(a.status||'Najavljen'))}
function ymsStamp(a,key){if(!a[key])a[key]=new Date().toISOString()}
function ymsStageTime(a){
  const keys={'Najavljen':'createdAt','Stigao':'checkinAt','Čeka':'waitingAt','Pozvan na rampu':'calledAt','Na rampi':'dockAt','Istovar u tijeku':'unloadStartAt','Završeno':'finishedAt','Izašao':'checkoutAt'};
  const v=a[keys[a.status||'Najavljen']];if(!v)return'—';
  return formatDelay(Math.max(0,ymsMinutes(new Date(v),new Date())));
}
function ymsWorkflow(a){
  const idx=ymsStageIndex(a);
  return `<div class="workflow-wrap">${YMS_STAGES.map((s,i)=>`<span class="workflow-step ${i<idx?'done':i===idx?'current':''}">${s}</span>`).join('')}</div>`;
}

function ymsAlerts(){
  const now=new Date(),out=[];
  announcements.filter(whMatch).forEach(a=>{
    const d=delayMinutes(a);
    if(a.actualDate&&d>60)out.push({type:'danger',title:`Ozbiljno kašnjenje · ${a.supplier}`,msg:`Kašnjenje ${formatDelay(d)} prema najavi ${fmtPlan(a.date,a.time)}.`});
    if(a.status==='Čeka'&&a.waitingAt){const m=ymsMinutes(new Date(a.waitingAt),now);if(m>30)out.push({type:'warning',title:`Dugo čekanje · ${a.supplier}`,msg:`Kamion čeka ${formatDelay(m)}.`})}
    if(['Na rampi','Istovar u tijeku'].includes(a.status)){
      const st=a.unloadStartAt||a.dockAt;if(st){const m=ymsMinutes(new Date(st),now);if(m>Number(a.duration||0))out.push({type:'danger',title:`Prekoračen istovar · ${a.supplier}`,msg:`Na rampi ${m} min, planirano ${a.duration} min.`})}
    }
    const end=new Date(`${a.date}T23:59:59`);if(!a.actualDate&&now>end)out.push({type:'danger',title:`Dobavljač nije stigao · ${a.supplier}`,msg:`Najava ${fmtPlan(a.date,a.time)} nema evidentiran dolazak.`});
  });
  announcements.forEach((a,i)=>announcements.slice(i+1).forEach(b=>{
    if(a.date===b.date&&Number(a.dock)===Number(b.dock)&&overlaps(toMin(a.time),Number(a.duration),toMin(b.time),Number(b.duration)))
      out.push({type:'danger',title:`Konflikt termina · Rampa ${a.dock}`,msg:`${a.supplier} i ${b.supplier} se preklapaju.`});
  }));
  return out;
}
function renderYmsAlerts(){
  const list=ymsAlerts(),host=document.getElementById('operationsAlerts');
  document.getElementById('opsAlertCount').textContent=list.length;
  document.getElementById('opsAlertBadge').textContent=list.length;
  document.getElementById('opsLongWait').textContent=list.filter(x=>x.title.startsWith('Dugo čekanje')).length;
  document.getElementById('opsBigLate').textContent=list.filter(x=>x.title.startsWith('Ozbiljno kašnjenje')).length;
  document.getElementById('opsAtDock').textContent=announcements.filter(a=>['Na rampi','Istovar u tijeku'].includes(a.status)).length;
  document.getElementById('opsDoneToday').textContent=announcements.filter(a=>a.status==='Završeno'&&a.finishedAt?.slice(0,10)===ymsToday()).length;
  if(host)host.innerHTML=list.length?list.map((x,i)=>`<div class="alert-dynamic ${x.type}"><b>△</b><div><strong>${x.title}</strong><span>${x.msg}</span></div><time>${new Date().toLocaleTimeString('hr-HR',{hour:'2-digit',minute:'2-digit'})}</time></div>`).join(''):'<div class="notice-result good" style="margin:12px"><h3>NEMA UPOZORENJA</h3><p>Trenutno nema aktivnih operativnih alarma.</p></div>';
}

window.ymsNextStage=function(id){
  if(!canChangeReceptionStatus()){alert('Operativni status može mijenjati samo Prijam robe ili Admin.');return}
  const a=announcements.find(x=>x.id===id);if(!a)return;
  let idx=ymsStageIndex(a);if(idx>=YMS_STAGES.length-1)return;
  const next=YMS_STAGES[idx+1];a.status=next;
  const keys={'Stigao':'checkinAt','Čeka':'waitingAt','Pozvan na rampu':'calledAt','Na rampi':'dockAt','Istovar u tijeku':'unloadStartAt','Završeno':'finishedAt','Izašao':'checkoutAt'};
  if(keys[next])ymsStamp(a,keys[next]);
  if(next==='Stigao'&&!a.actualDate){const n=new Date();a.actualDate=ymsToday();a.actualTime=n.toTimeString().slice(0,5)}
  if(next==='Istovar u tijeku'){const n=new Date();a.unloadStartDate=ymsToday();a.unloadStartTime=n.toTimeString().slice(0,5)}
  if(next==='Završeno'){openUnloadDialog(id);return}
  saveAnnouncements();render();
}
function renderOperationsPro(){
  const body=document.getElementById('operationsTable');if(!body)return;
  const data=[...announcements].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  body.innerHTML=data.map(a=>`<tr><td><strong>${warehouseOptionLabel(a.warehouse||yardivoCanonicalWarehouseV583())}</strong></td><td><strong>${a.supplier}</strong></td><td>${fmtPlan(a.date,a.time)}</td><td>${a.arrivalPlate||a.plannedPlate||'—'}</td><td>Rampa ${a.dock}</td><td><span class="notice-pill ${['Završeno','Izašao'].includes(a.status)?'ok':'warn'}">${a.status||'Najavljen'}</span></td><td>${ymsStageTime(a)}</td><td>${ymsWorkflow(a)}</td><td>${canChangeReceptionStatus()?`<button class="action" onclick="ymsNextStage(${a.id})">${ymsStageIndex(a)<YMS_STAGES.length-1?'SLJEDEĆI STATUS':'GOTOVO'}</button>`:'<span class="muted">Samo Prijam</span>'}</td></tr>`).join('');
  renderYmsAlerts();
}


function syncAnnouncementIdentity(a){
  if(!a)return false;
  let changed=false;
  const plate=String(
    a.vehiclePlate||a.plannedPlate||a.arrivalPlate||a.plate||a.registration||''
  ).trim().toUpperCase();
  const driver=String(
    a.driverNameCanonical||a.plannedDriver||a.arrivalDriver||a.driver||a.driverName||''
  ).trim();

  if(plate && a.vehiclePlate!==plate){a.vehiclePlate=plate;changed=true}
  if(driver && a.driverNameCanonical!==driver){a.driverNameCanonical=driver;changed=true}

  // Keep legacy fields synced so every older screen reads the same values.
  if(plate && a.plannedPlate!==plate){a.plannedPlate=plate;changed=true}
  if(driver && a.plannedDriver!==driver){a.plannedDriver=driver;changed=true}

  if(a.firstArrivalAt || a.yardArrivalAt || a.actualDate){
    if(plate && a.arrivalPlate!==plate){a.arrivalPlate=plate;changed=true}
    if(driver && a.arrivalDriver!==driver){a.arrivalDriver=driver;changed=true}
  }
  return changed;
}
function syncAllAnnouncementIdentities(){
  let changed=false;
  announcements.forEach(a=>{if(syncAnnouncementIdentity(a))changed=true});
  if(changed)saveAnnouncements();
}

function effectivePlate(a){
  return String(a?.vehiclePlate||a?.plannedPlate||a?.arrivalPlate||a?.plate||a?.registration||'').trim();
}
function effectiveDriver(a){
  return String(a?.driverNameCanonical||a?.plannedDriver||a?.arrivalDriver||a?.driver||a?.driverName||'').trim();
}
function identityDisplayHtml(a){
  const p=effectivePlate(a),d=effectiveDriver(a);
  if(!p&&!d)return '<span class="identity-missing">NEDOSTAJU TABLICE / VOZAČ</span>';
  return `<span class="identity-chip">🚛 ${p||'—'} · 👤 ${d||'—'}</span>`;
}


function renderCheckinPro(){
  syncAllAnnouncementIdentities();
  const body=document.getElementById('checkinTable');if(!body)return;
  let migrated=false;
  announcements.forEach(a=>{
    if(!String(a.plannedPlate||'').trim()&&String(a.arrivalPlate||'').trim()){a.plannedPlate=String(a.arrivalPlate).trim().toUpperCase();migrated=true}
    if(!String(a.plannedDriver||'').trim()&&String(a.arrivalDriver||'').trim()){a.plannedDriver=String(a.arrivalDriver).trim();migrated=true}
  });
  if(migrated)saveAnnouncements();
  const today=window.yardivoLocalDateV583();
  const wh=activeWarehouse==='ALL'?yardivoCanonicalWarehouseV583():activeWarehouse;
  const q=(document.getElementById('checkinSearch')?.value||'').toLowerCase().trim();
  const f=document.getElementById('checkinFilter')?.value||'';
  const data=announcements
    .filter(a=>a.date===today&&(a.warehouse||yardivoCanonicalWarehouseV583())===wh)
    .filter(a=>!q||[a.supplier,effectivePlate(a),effectiveDriver(a)].join(' ').toLowerCase().includes(q))
    .filter(a=>!f||(f==='arrived'?hasPhysicallyArrived(a):!hasPhysicallyArrived(a)))
    .sort((a,b)=>String(a.time).localeCompare(String(b.time)));

  body.innerHTML=data.length?data.map(a=>{
    const plate=effectivePlate(a);
    const driver=effectiveDriver(a);
    return `<tr class="saved-${yardivoUnifiedStatusClass(a)}">
      <td>${warehouseOptionLabel(a.warehouse||yardivoCanonicalWarehouseV583())}</td>
      <td><strong>${a.supplier}</strong></td>
      <td>${a.date} ${a.time}</td>
      <td>Rampa ${a.dock}</td>
      <td>${a.pallets||0}</td>
      <td>${plate?`<strong class="gate-data-present">${plate}</strong>`:'<strong class="gate-data-missing">NEDOSTAJE</strong>'}</td>
      <td>${driver?`<strong class="gate-data-present">${driver}</strong>`:'<strong class="gate-data-missing">NEDOSTAJE</strong>'}</td>
      <td>${operationalPlanStatus(a)}${operationalDelayText(a)?`<br><small>${operationalDelayText(a)}</small>`:''}</td>
      <td><button class="action" onclick="prefillGateFromAnnouncement(${a.id})">${hasPhysicallyArrived(a)?'PREGLEDAJ':'PRIJAVI NA PORTI'}</button></td>
    </tr>`;
  }).join(''):'<tr><td colspan="9"><div class="overview-empty">Nema današnjih najava za odabrano skladište.</div></td></tr>';
}
function renderPlannerPro(){
  const host=document.getElementById('plannerProBoard');if(!host)return;
  const date=document.getElementById('plannerProDate')?.value||ymsToday();
  const wh=(activeWarehouse&&activeWarehouse!=='ALL'?activeWarehouse:yardivoCanonicalWarehouseV583()),w=WAREHOUSES[wh];
  if(!w?.ramps||!w.receptionStart||!w.receptionEnd){host.innerHTML=`<div class="smart-note warn">${whLabel(wh)} još nema definirane rampe i vrijeme prijama.</div>`;return}
  const ws=toMin(w.receptionStart),we=toMin(w.receptionEnd),count=Math.ceil((we-ws)/15),heads=Array.from({length:count},(_,i)=>hhmm(ws+i*15));
  let h=`<div class="smart-note" style="margin:12px"><strong>${whLabel(wh)}</strong> · ${w.ramps} rampi · ${w.receptionStart}–${w.receptionEnd}</div><div class="pro-schedule" style="grid-template-columns:66px repeat(${count},minmax(30px,1fr))"><div class="head">RAMPA</div>`+heads.map((t,i)=>`<div class="head">${i%2===0?t:''}</div>`).join('');
  for(let dock=1;dock<=w.ramps;dock++){
    h+=`<div class="ramp">R${dock}</div>`;
    for(let i=0;i<count;i++){
      const m=ws+i*15,a=announcements.find(x=>(x.warehouse||yardivoCanonicalWarehouseV583())===wh&&x.date===date&&Number(x.dock)===dock&&toMin(x.time)===m);
      if(a){const span=Math.max(1,Math.ceil(a.duration/15)),d=delayMinutes(a),cl=d>15?'late':a.status==='Čeka'?'waiting':['Na rampi','Istovar u tijeku'].includes(a.status)?'active':'';h+=`<div class="booked ${cl}" style="grid-column:span ${span}" title="${a.supplier}">${a.supplier}</div>`;i+=span-1}else h+='<div class="freecell"></div>';
    }
  }
  h+='</div>';host.innerHTML=h;
}

function supplierPerformancePro(name){
  const arrived=announcements.filter(a=>a.supplier===name&&a.actualDate),late=arrived.filter(a=>delayMinutes(a)>15),on=arrived.length-late.length;
  const avgLate=late.length?Math.round(late.reduce((s,a)=>s+delayMinutes(a),0)/late.length):0;
  const unloads=announcements.filter(a=>a.supplier===name&&a.unloadStartDate&&a.unloadEndDate).map(a=>ymsMinutes(ymsDT(a.unloadStartDate,a.unloadStartTime),ymsDT(a.unloadEndDate,a.unloadEndTime))).filter(x=>x>0&&x<300);
  const avgUnload=unloads.length?Math.round(unloads.reduce((x,y)=>x+y,0)/unloads.length):0;
  const inc=incidents.filter(i=>i.supplier===name),open=inc.filter(i=>i.status!=='Zatvoren').length,punctual=arrived.length?on/arrived.length*100:100,chg=supplierChangeStats(name),score=Math.max(0,Math.round(punctual-inc.length*4-open*2-chg.late*8));
  return{arrived:arrived.length,on,late:late.length,avgLate,avgUnload,inc:inc.length,score};
}
function renderOverview(){
  const arrived=announcements.filter(a=>whMatch(a)&&actualDateTime(a)),late=arrived.filter(a=>delayMinutes(a)>TOLERANCE_MIN),ontime=arrived.length-late.length;
  const lateM=late.map(delayMinutes),avgLate=lateM.length?Math.round(lateM.reduce((x,y)=>x+y,0)/lateM.length):0;
  const unloads=announcements.filter(a=>a.unloadStartDate&&a.unloadEndDate).map(a=>ymsMinutes(ymsDT(a.unloadStartDate,a.unloadStartTime),ymsDT(a.unloadEndDate,a.unloadEndTime))).filter(x=>x>0&&x<300);
  const avgUnload=unloads.length?Math.round(unloads.reduce((x,y)=>x+y,0)/unloads.length):0;
  const dates=new Set(announcements.map(a=>a.date)),booked=announcements.reduce((s,a)=>s+Number(a.duration||0),0),cap=Math.max(1,dates.size)*6*7*60;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  set('ovTotal',arrived.length);set('ovOnTime',arrived.length?Math.round(ontime/arrived.length*100)+'%':'0%');set('ovAvgDelay',formatDelay(avgLate));set('ovIncidents',incidents.length);set('ovAvgUnload',avgUnload+' min');set('ovDockUtil',Math.round(booked/cap*100)+'%');
  const q=(document.getElementById('overviewSearch')?.value||'').toLowerCase().trim();
  const names=[...new Set([...arrived.map(a=>a.supplier),...incidents.map(i=>i.supplier)])].filter(s=>s.toLowerCase().includes(q));
  const rows=names.map(s=>({s,...supplierPerformancePro(s)})).sort((a,b)=>b.score-a.score);
  const tbody=document.getElementById('supplierPerformance');
  if(tbody)tbody.innerHTML=rows.length?rows.map(r=>`<tr><td><strong>${r.s}</strong></td><td>${r.arrived}</td><td>${r.on}</td><td>${r.late}</td><td>${r.avgLate?formatDelay(r.avgLate):'—'}</td><td>${r.inc}</td><td><span class="score ${r.score>=90?'good':r.score>=70?'mid':'bad'}">${r.score}%</span><br><small style="color:#748ba0">Istovar: ${r.avgUnload?r.avgUnload+' min':'—'}</small></td></tr>`).join(''):'<tr><td colspan="7"><div class="overview-empty">Još nema dovoljno podataka.</div></td></tr>';
  const bars=document.getElementById('supplierBars');if(bars)bars.innerHTML=rows.length?rows.slice(0,10).map(r=>`<div class="supplier-bar"><div class="name">${r.s}</div><div class="bar-track"><div class="bar-fill" style="width:${r.score}%"></div></div><div class="bar-score">${r.score}%</div></div>`).join(''):'<div class="overview-empty">Nema podataka.</div>';
  const dh=document.getElementById('delayHistory');if(dh)dh.innerHTML=arrived.map(a=>{const m=delayMinutes(a);return`<tr><td><strong>${warehouseOptionLabel(a.warehouse||yardivoCanonicalWarehouseV583())}</strong></td><td><strong>${a.supplier}</strong></td><td>${fmtPlan(a.date,a.time)}</td><td>${fmtPlan(a.actualDate,a.actualTime)}</td><td><span class="delay-chip ${delayClass(m)}">${delayLabel(m)}</span></td><td>Rampa ${a.dock}</td><td>${a.pallets}</td><td>${a.sku}</td></tr>`}).join('');
}

function renderIncidents(){
  const table=document.getElementById('incidentTable');if(!table)return;
  const data=[...incidents].sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
  document.getElementById('incidentCount').textContent=`${data.length} incidenata`;
  const badge=document.getElementById('incidentBadge');if(badge){const active=data.filter(i=>i.status!=='Zatvoren').length;badge.textContent=active;badge.style.display=active?'inline-flex':'none'}
  table.innerHTML=data.length?data.map(i=>`<tr><td>${i.date}</td><td><strong>${i.supplier}</strong></td><td><span class="incident-chip">${i.type}</span></td><td>${i.severity}</td><td><span class="notice-pill ${i.status==='Zatvoren'?'ok':'warn'}">${i.status||'Otvoren'}</span></td><td>${i.pallets||0}</td><td>${i.sku||0}</td><td>${Number(i.value||0).toFixed(2)}</td><td>${i.owner||'—'}</td><td>${i.note||'—'}</td><td>${i.photo?`<img class="incident-evidence" src="${i.photo}">`:'—'}</td><td><button class="action" onclick="toggleIncidentStatus(${i.id})">STATUS</button> <button class="action" onclick="deleteIncident(${i.id})">OBRIŠI</button></td></tr>`).join(''):'<tr><td colspan="12"><div class="overview-empty">Nema evidentiranih incidenata.</div></td></tr>';
  const grouped={};data.forEach(i=>grouped[i.type]=(grouped[i.type]||0)+1);const max=Math.max(1,...Object.values(grouped)),sum=document.getElementById('incidentSummary');
  if(sum)sum.innerHTML=Object.keys(grouped).length?Object.entries(grouped).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="supplier-bar"><div class="name">${k}</div><div class="bar-track"><div class="bar-fill" style="width:${v/max*100}%"></div></div><div class="bar-score">${v}</div></div>`).join(''):'<div class="overview-empty">Nema incidenata.</div>';
}
window.toggleIncidentStatus=id=>{const i=incidents.find(x=>x.id===id);if(!i)return;i.status=i.status==='Otvoren'?'U obradi':i.status==='U obradi'?'Zatvoren':'Otvoren';saveIncidents();render()}
window.deleteIncident=id=>{incidents=incidents.filter(x=>x.id!==id);saveIncidents();render()}

function renderDailyReport(){
  const host=document.getElementById('dailyReport');if(!host)return;const date=document.getElementById('reportDate')?.value||ymsToday();
  const a=announcements.filter(x=>x.date===date),arr=a.filter(x=>x.actualDate),late=arr.filter(x=>delayMinutes(x)>yardivoDelayGraceMinutes()),inc=incidents.filter(x=>x.date===date);
  const unloads=a.filter(x=>x.unloadStartDate&&x.unloadEndDate).map(x=>ymsMinutes(ymsDT(x.unloadStartDate,x.unloadStartTime),ymsDT(x.unloadEndDate,x.unloadEndTime))).filter(x=>x>0&&x<300);
  const booked=a.reduce((s,x)=>s+Number(x.duration||0),0),util=Math.round(booked/(6*7*60)*100);
  host.innerHTML=`<div class="report-grid"><div class="report-stat"><small>PLANIRANO</small><strong>${a.length}</strong></div><div class="report-stat"><small>STIGLO</small><strong>${arr.length}</strong></div><div class="report-stat"><small>KAŠNJENJA</small><strong>${late.length}</strong></div><div class="report-stat"><small>NA VRIJEME</small><strong>${arr.length?Math.round((arr.length-late.length)/arr.length*100):0}%</strong></div><div class="report-stat"><small>PROSJ. KAŠNJENJE</small><strong>${late.length?formatDelay(Math.round(late.reduce((s,x)=>s+delayMinutes(x),0)/late.length)):'0 min'}</strong></div><div class="report-stat"><small>PROSJ. ISTOVAR</small><strong>${unloads.length?Math.round(unloads.reduce((x,y)=>x+y,0)/unloads.length):0} min</strong></div><div class="report-stat"><small>ISKORIŠTENOST RAMPI</small><strong>${util}%</strong></div><div class="report-stat"><small>INCIDENTI</small><strong>${inc.length}</strong></div></div><div class="smart-note">Ukupno planirano paleta: <strong>${a.reduce((s,x)=>s+Number(x.pallets||0),0)}</strong> · Ukupno SKU: <strong>${a.reduce((s,x)=>s+Number(x.sku||0),0)}</strong>.</div>`;
}
function exportDailyCsv(){
  const date=document.getElementById('reportDate').value,a=announcements.filter(x=>x.date===date),rows=[['Datum','Dobavljač','Planirano','Stvarni dolazak','Rampa','Palete','SKU','Status','Kašnjenje min']];
  a.forEach(x=>rows.push([x.date,x.supplier,x.time,x.actualDate?`${x.actualDate} ${x.actualTime}`:'',x.dock,x.pallets,x.sku,x.status||'Najavljen',delayMinutes(x)??'']));
  const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),aTag=document.createElement('a');aTag.href=url;aTag.download=`STUDENAC_YMS_${date}.csv`;aTag.click();URL.revokeObjectURL(url);
}

function renderSmartLearning(){
  const el=document.getElementById('annMessage');if(!el)return;
  const supplier=document.getElementById('annSupplier')?.value||'',p=Number(document.getElementById('annPallets')?.value||0),h=historicalUnloadDuration(supplier,p);
  if(h.source==='povijest'){
    const old=el.innerHTML;el.innerHTML=old+`<p style="margin-top:6px"><strong>Pametna procjena:</strong> koristi ${h.samples} sličnih stvarnih istovara za ovog dobavljača.</p>`;
  }
}

function openUnloadDialog(id){
  const a=announcements.find(x=>x.id===id);if(!a)return;const n=new Date();
  document.getElementById('unloadAnnouncementId').value=id;document.getElementById('unloadInfo').innerHTML=`<strong>${a.supplier}</strong> · Rampa ${a.dock} · planirano ${a.duration} min`;
  document.getElementById('unloadEndDate').value=ymsToday();document.getElementById('unloadEndTime').value=n.toTimeString().slice(0,5);document.getElementById('unloadDialog').showModal();
}
document.getElementById('closeUnload')?.addEventListener('click',()=>document.getElementById('unloadDialog').close());
document.getElementById('cancelUnload')?.addEventListener('click',()=>document.getElementById('unloadDialog').close());
document.getElementById('unloadForm')?.addEventListener('submit',e=>{
  e.preventDefault();const a=announcements.find(x=>x.id===Number(document.getElementById('unloadAnnouncementId').value));if(!a)return;
  if(!a.unloadStartDate){a.unloadStartDate=a.actualDate||ymsToday();a.unloadStartTime=a.actualTime||a.time}
  a.unloadEndDate=document.getElementById('unloadEndDate').value;a.unloadEndTime=document.getElementById('unloadEndTime').value;a.status='Završeno';ymsStamp(a,'finishedAt');saveAnnouncements();document.getElementById('unloadDialog').close();render();
});

// Nadogradi postojeći recordArrival modal s dodatnim podacima
const oldRecordArrival=window.recordArrival;
window.recordArrival=function(id){
  oldRecordArrival(id);const a=announcements.find(x=>x.id===id);if(!a)return;
  document.getElementById('arrivalPlate').value=a.arrivalPlate||a.plannedPlate||'';
  document.getElementById('arrivalDriver').value=a.arrivalDriver||a.plannedDriver||'';
  document.getElementById('arrivalTrailer').value=a.arrivalTrailer||a.plannedTrailer||'';
  document.getElementById('arrivalPhone').value=a.arrivalPhone||a.plannedPhone||'';
};

// Dodatni submit listener sprema registraciju i operativni status
document.getElementById('arrivalForm')?.addEventListener('submit',()=>{
  const a=announcements.find(x=>x.id===Number(document.getElementById('arrivalAnnouncementId').value));if(!a)return;
  a.arrivalPlate=document.getElementById('arrivalPlate').value.trim();
  a.arrivalDriver=document.getElementById('arrivalDriver').value.trim();
  a.arrivalTrailer=document.getElementById('arrivalTrailer').value.trim();
  a.arrivalPhone=document.getElementById('arrivalPhone').value.trim();
  a.status='Stigao';ymsStamp(a,'checkinAt');saveAnnouncements();
});

// Fotografija incidenta
document.getElementById('incPhoto')?.addEventListener('change',e=>{
  const f=e.target.files[0];incidentPhotoData='';document.getElementById('incPhotoPreview').innerHTML='';if(!f)return;
  if(f.size>750000){alert('Fotografija je prevelika za ovu lokalnu verziju. Koristi sliku manju od 750 KB.');e.target.value='';return}
  const r=new FileReader();r.onload=()=>{incidentPhotoData=r.result;document.getElementById('incPhotoPreview').innerHTML=`<img src="${incidentPhotoData}">`};r.readAsDataURL(f);
});

// Presretanje postojećeg incident submit-a: nakon starog unosa nadogradi zadnji incident novim poljima
document.getElementById('incidentForm')?.addEventListener('submit',()=>{
  setTimeout(()=>{
    const i=incidents[incidents.length-1];if(!i)return;
    i.owner=document.getElementById('incOwner')?.value?.trim()||i.owner||'';
    i.value=Number(document.getElementById('incValue')?.value||i.value||0);
    i.status=document.getElementById('incStatus')?.value||i.status||'Otvoren';
    i.photo=incidentPhotoData||i.photo||'';
    saveIncidents();incidentPhotoData='';document.getElementById('incPhotoPreview').innerHTML='';render();
  },0);
});


let gateMatchedAnnouncementId=null;
let gateMatchPassed=false;

function normalizePlate(v){
  return String(v||'').toUpperCase().replace(/[^A-Z0-9ČĆŽŠĐ]/g,'');
}
function normalizePerson(v){
  return String(v||'').trim().toLocaleLowerCase('hr-HR').replace(/\s+/g,' ');
}
function gateCurrentWarehouse(){
  return activeWarehouse==='ALL'?yardivoCanonicalWarehouseV583():activeWarehouse;
}
function findGateAppointment(plate,driver){
  const today=window.yardivoLocalDateV583(),wh=gateCurrentWarehouse();
  const np=normalizePlate(plate),nd=normalizePerson(driver);
  const todays=announcements.filter(a=>a.date===today&&(a.warehouse||yardivoCanonicalWarehouseV583())===wh&&!['Zaprimljeno','Odbijen'].includes(normalizedPlanStatus(a)));
  // First try exact plate + exact driver.
  let match=todays.find(a=>normalizePlate(effectivePlate(a))===np&&normalizePerson(effectiveDriver(a))===nd);
  if(match)return {a:match,plateMatch:true,driverMatch:true,exact:true};
  // Then find by either field so we can explain mismatch.
  match=todays.find(a=>normalizePlate(effectivePlate(a))===np)||todays.find(a=>normalizePerson(effectiveDriver(a))===nd);
  if(!match)return null;
  return {
    a:match,
    plateMatch:normalizePlate(effectivePlate(match))===np,
    driverMatch:normalizePerson(effectiveDriver(match))===nd,
    exact:false
  };
}
function renderGateAppointment(a){
  const host=document.getElementById('gateMatchedAppointment');if(!host)return;
  if(!a){host.classList.remove('show');host.innerHTML='';return}
  host.classList.add('show');
  host.innerHTML=`
    <div><small>DOBAVLJAČ</small><strong>${a.supplier}</strong></div>
    <div><small>PLANIRANO</small><strong>${a.time}</strong></div>
    <div><small>RAMPA</small><strong>R${a.dock}</strong></div>
    <div><small>NAJAVLJENE TABLICE</small><strong>${a.plannedPlate||'—'}</strong></div>
    <div><small>NAJAVLJENI VOZAČ</small><strong>${a.plannedDriver||'—'}</strong></div>
    <div><small>ODGOVORNA OSOBA</small><strong>${a.responsible||'—'}</strong></div>`;
}
function checkGateArrival(){
  const plate=document.getElementById('gatePlate')?.value||'';
  const driver=document.getElementById('gateDriver')?.value||'';
  const result=document.getElementById('gateMatchResult');
  const allow=document.getElementById('gateAllowEntryBtn');
  const override=document.getElementById('gateOverrideBox');
  gateMatchedAnnouncementId=null;gateMatchPassed=false;
  allow.disabled=true;override?.classList.remove('show');

  if(!plate.trim()||!driver.trim()){
    result.className='gate-match-result warn';
    result.innerHTML='<strong>NEDOSTAJU PODACI</strong><span>Upiši i registraciju i ime vozača.</span>';
    renderGateAppointment(null);return;
  }

  const found=findGateAppointment(plate,driver);
  if(!found){
    result.className='gate-match-result bad';
    result.innerHTML='<strong>NAJAVA NIJE PRONAĐENA</strong><span>Za današnji datum i ovo skladište nema najave s tim tablicama ili vozačem.</span>';
    renderGateAppointment(null);return;
  }

  gateMatchedAnnouncementId=found.a.id;
  renderGateAppointment(found.a);

  if(found.plateMatch&&found.driverMatch){
    gateMatchPassed=true;
    allow.disabled=false;
    result.className='gate-match-result good';
    result.innerHTML='<strong>✓ PODACI SE PODUDARAJU</strong><span>Registracija i vozač odgovaraju najavi. Ulaz može biti odobren.</span>';
  }else{
    const problems=[];
    if(!found.plateMatch)problems.push(`tablice: uneseno ${plate}, najavljeno ${effectivePlate(found.a)||'—'}`);
    if(!found.driverMatch)problems.push(`vozač: uneseno ${driver}, najavljeno ${effectiveDriver(found.a)||'—'}`);
    result.className='gate-match-result bad';
    result.innerHTML=`<strong>✕ PODACI SE NE PODUDARAJU</strong><span>${problems.join(' · ')}</span>`;
    if(canChangeReceptionStatus())override?.classList.add('show');
  }
}
function allowGateEntry(a,overrideReason=''){
  if(!a)return;
  const now=new Date();
  const plate=document.getElementById('gatePlate').value.trim();
  const driver=document.getElementById('gateDriver').value.trim();

  a.vehiclePlate=plate.toUpperCase();
  a.driverNameCanonical=driver;
  a.arrivalPlate=a.vehiclePlate;
  a.arrivalDriver=a.driverNameCanonical;
  a.plannedPlate=a.vehiclePlate;
  a.plannedDriver=a.driverNameCanonical;
  a.actualDate=isoLocal(now);
  a.actualTime=now.toTimeString().slice(0,5);
  a.firstArrivalAt=a.firstArrivalAt||now.toISOString();
  a.yardArrivalAt=now.toISOString();
  a.status='U dvorištu';
  a.gateCheckedAt=now.toISOString();
  a.gateCheckedBy=currentSession?.user||'';
  a.gateMatchOverride=!!overrideReason;
  a.gateOverrideReason=overrideReason||'';
  if(overrideReason){
    if(!Array.isArray(a.changeHistory))a.changeHistory=[];
    a.changeHistory.push({
      changedAt:now.toISOString(),
      type:'GATE_OVERRIDE',
      reason:overrideReason,
      note:`Porta: ${plate} · ${driver}`,
      changedBy:currentSession?.user||''
    });
  }
  saveAnnouncements();
  render();
  if(typeof renderAnnouncements==='function')renderAnnouncements();
  if(typeof renderAnnouncementSchedule==='function')renderAnnouncementSchedule();
  renderCheckinPro();
  renderYard();
  renderReceiving?.();
  renderDailyMap?.();
  renderWeeklyMap?.();

  const result=document.getElementById('gateMatchResult');
  result.className='gate-match-result good';
  result.innerHTML=`<strong>✓ ULAZ ODOBREN</strong><span>${a.supplier} · ${plate} · ${driver} je evidentiran U DVORIŠTU.</span>`;
  document.getElementById('gateAllowEntryBtn').disabled=true;
  document.getElementById('gateOverrideBox')?.classList.remove('show');
  showYmsToast?.('success','ULAZ U DVORIŠTE EVIDENTIRAN',`${a.supplier} · ${plate} · ${driver}`);
}
window.prefillGateFromAnnouncement=function(id){
  const a=announcements.find(x=>x.id===Number(id));if(!a)return;
  document.getElementById('gatePlate').value=effectivePlate(a);
  document.getElementById('gateDriver').value=effectiveDriver(a);
  checkGateArrival();
  document.querySelector('.gate-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
};

let gateLiveCheckTimer=null;
function scheduleGateLiveCheck(){
  clearTimeout(gateLiveCheckTimer);
  gateLiveCheckTimer=setTimeout(()=>{
    const plate=document.getElementById('gatePlate')?.value?.trim()||'';
    const driver=document.getElementById('gateDriver')?.value?.trim()||'';
    const result=document.getElementById('gateMatchResult');

    if(!plate && !driver){
      result.className='gate-match-result neutral';
      result.innerHTML='<strong>ČEKA PROVJERU</strong><span>Upiši registraciju i ime vozača.</span>';
      renderGateAppointment(null);
      return;
    }
    if(!plate || !driver){
      result.className='gate-match-result warn';
      result.innerHTML=`<strong>NEDOSTAJE ${!plate?'REGISTRACIJA':'IME VOZAČA'}</strong><span>Popuni oba podatka za automatsku provjeru.</span>`;
      renderGateAppointment(null);
      return;
    }
    checkGateArrival();
  },180);
}

document.getElementById('gateCheckBtn')?.addEventListener('click',checkGateArrival);

['gatePlate','gateDriver'].forEach(id=>{
  document.getElementById(id)?.addEventListener('keydown',e=>{
    if(e.key==='Enter'){
      e.preventDefault();
      clearTimeout(gateLiveCheckTimer);
      checkGateArrival();
    }
  });
});

document.getElementById('gatePlate')?.addEventListener('input',()=>{
  gateMatchPassed=false;
  document.getElementById('gateAllowEntryBtn').disabled=true;
  renderTruckHistory();
  scheduleGateLiveCheck();
});
document.getElementById('gateDriver')?.addEventListener('input',()=>{
  gateMatchPassed=false;
  document.getElementById('gateAllowEntryBtn').disabled=true;
  scheduleGateLiveCheck();
});
document.getElementById('gateAllowEntryBtn')?.addEventListener('click',()=>{
  if(!gateMatchPassed||!gateMatchedAnnouncementId)return;
  allowGateEntry(announcements.find(x=>x.id===gateMatchedAnnouncementId));
});
document.getElementById('gateOverrideBtn')?.addEventListener('click',()=>{
  if(!canChangeReceptionStatus()){alert('Samo Prijam ili Admin mogu ručno odobriti ulaz.');return}
  const reason=document.getElementById('gateOverrideReason')?.value||'';
  if(!reason){alert('Odaberi razlog ručnog odobrenja.');return}
  const a=announcements.find(x=>x.id===gateMatchedAnnouncementId);if(!a)return;
  if(!confirm(`Podaci se ne podudaraju s najavom.\n\nOdobriti ulaz za ${a.supplier} uz razlog: ${reason}?`))return;
  allowGateEntry(a,reason);
});

document.getElementById('checkinSearch')?.addEventListener('input',renderCheckinPro);
document.getElementById('checkinFilter')?.addEventListener('change',renderCheckinPro);
document.getElementById('plannerProDate')?.addEventListener('input',renderPlannerPro);
document.getElementById('reportDate')?.addEventListener('input',renderDailyReport);
document.getElementById('exportReportCsv')?.addEventListener('click',exportDailyCsv);
document.getElementById('annSupplier')?.addEventListener('change',()=>setTimeout(renderSmartLearning,0));
document.getElementById('annPallets')?.addEventListener('input',()=>setTimeout(renderSmartLearning,0));

// Proširi glavni render bez rušenja postojećih modula
const originalRender=render;
render=function(){
  originalRender();
  renderAnnouncements();
  updateWarehouseToolbar();renderWarehouseCards();renderCheckinPro();renderPlannerPro();renderOperationsPro();renderDailyReport();renderSmartLearning();renderRampBlocks();renderControlTower();renderCalendar();renderHeatmap();renderTruckHistory();renderChangeHistory();
};
document.getElementById('plannerProDate').value=ymsToday();
document.getElementById('reportDate').value=ymsToday();

// ===== NAPREDNI YMS MODULI =====
let rampBlocks=JSON.parse(safeStorage.getItem('studenac_ramp_blocks')||'[]');
function saveRampBlocks(){safeStorage.setItem('studenac_ramp_blocks',JSON.stringify(rampBlocks))}
function whAnnouncements(){return announcements.filter(whMatch)}
function isNoShow(a){
  /* Global Admin rule owns automatic NO-SHOW timing.
     This helper only respects an explicit/manual NO-SHOW marker/status. */
  const s=String(a?.status||'').toLocaleUpperCase('hr-HR');
  return !!a?.noShow || /NO.?SHOW|NIJE DOŠAO|NIJE DOSAO/.test(s);
}
function isRampBlocked(warehouse,date,dock,start,duration){
 return rampBlocks.some(b=>b.warehouse===warehouse&&b.date===date&&Number(b.dock)===Number(dock)&&overlaps(start,duration,toMin(b.from),toMin(b.to)-toMin(b.from)));
}

window.addRampBlock=function(){
 const wh=(activeWarehouse&&activeWarehouse!=='ALL'?activeWarehouse:yardivoCanonicalWarehouseV583()),date=document.getElementById('blockDate')?.value,dock=Number(document.getElementById('blockRamp')?.value),from=document.getElementById('blockFrom')?.value,to=document.getElementById('blockTo')?.value,reason=document.getElementById('blockReason')?.value||'Nedostupna';
 if(!date||!dock||!from||!to){alert('Odaberi datum, rampu i vrijeme.');return}
 rampBlocks.push({id:Date.now(),warehouse:wh,date,dock,from,to,reason});saveRampBlocks();render();
}
window.removeRampBlock=function(id){rampBlocks=rampBlocks.filter(x=>x.id!==id);saveRampBlocks();render()}
function renderRampBlocks(){
 const wh=(activeWarehouse&&activeWarehouse!=='ALL'?activeWarehouse:yardivoCanonicalWarehouseV583()),w=WAREHOUSES[wh],sel=document.getElementById('blockRamp');
 if(sel)sel.innerHTML=w?.ramps?Array.from({length:w.ramps},(_,i)=>`<option value="${i+1}">Rampa ${i+1}</option>`).join(''):'';
 const bd=document.getElementById('blockDate');if(bd&&!bd.value)bd.value=ymsToday();
 const host=document.getElementById('rampBlocks');if(host)host.innerHTML=rampBlocks.filter(x=>x.warehouse===wh).map(x=>`<div class="smart-note warn"><strong>R${x.dock}</strong> · ${x.date} ${x.from}–${x.to} · ${x.reason} <button class="mini-btn" onclick="removeRampBlock(${x.id})">Ukloni</button></div>`).join('')||'<div class="smart-note">Nema blokiranih rampi.</div>';
}
function renderControlTower(){
 const host=document.getElementById('controlKpis');if(!host)return;
 const a=whAnnouncements(),today=ymsToday(),td=a.filter(x=>x.date===today),arr=td.filter(actualDateTime),nos=td.filter(isNoShow),waiting=td.filter(x=>x.status==='Čeka'),dock=td.filter(x=>['Na rampi','Istovar u tijeku'].includes(x.status));
 host.innerHTML=[['DANAŠNJE NAJAVE',td.length],['STIGLI',arr.length],['ČEKAJU',waiting.length],['NA RAMPI',dock.length],['NO-SHOW',nos.length],['PALETE',td.reduce((s,x)=>s+Number(x.pallets||0),0)],['INCIDENTI',incidents.filter(x=>x.date===today).length],['BLOKIRANE RAMPE',rampBlocks.filter(x=>x.date===today&&(activeWarehouse==='ALL'||x.warehouse===activeWarehouse)).length]].map(x=>`<div class="control-card"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join('');
 const cap=document.getElementById('capacityBoard'),wh=(activeWarehouse&&activeWarehouse!=='ALL'?activeWarehouse:yardivoCanonicalWarehouseV583()),w=WAREHOUSES[wh];if(cap&&w?.receptionStart){let h='';for(let m=toMin(w.receptionStart);m<toMin(w.receptionEnd);m+=60){let p=td.filter(x=>toMin(x.time)>=m&&toMin(x.time)<m+60).reduce((s,x)=>s+Number(x.pallets||0),0),pct=Math.min(100,Math.round(p/(Math.max(1,w.ramps)*33)*100));h+=`<div style="margin-bottom:10px"><b>${hhmm(m)}–${hhmm(m+60)}</b> · ${p} paleta<div class="capacitybar"><i style="width:${pct}%"></i></div></div>`}cap.innerHTML=h}
 const nxt=document.getElementById('nextArrivals');if(nxt)nxt.innerHTML=[...a].filter(x=>new Date(`${x.date}T${x.time}:00`)>=new Date()).sort((x,y)=>(x.date+x.time).localeCompare(y.date+y.time)).slice(0,8).map(x=>`<div class="smart-note"><strong>${x.date} ${x.time}</strong> · ${x.warehouse||yardivoCanonicalWarehouseV583()} · ${x.supplier} · ${x.pallets} pal.</div>`).join('')||'<div class="smart-note">Nema budućih najava.</div>';
}

function easterDate(year){
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,
        f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,
        i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),
        month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
  return new Date(year,month-1,day);
}
function isoLocal(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function croatianHolidays(year){
  const easter=easterDate(year);
  const corpus=addDays(easter,60);
  const map={};
  const add=(m,d,name)=>map[`${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`]=name;
  add(1,1,'Nova godina');
  add(1,6,'Bogojavljenje / Sveta tri kralja');
  map[isoLocal(easter)]='Uskrs';
  map[isoLocal(addDays(easter,1))]='Uskrsni ponedjeljak';
  add(5,1,'Praznik rada');
  add(5,30,'Dan državnosti');
  map[isoLocal(corpus)]='Tijelovo';
  add(6,22,'Dan antifašističke borbe');
  add(8,5,'Dan pobjede i domovinske zahvalnosti i Dan hrvatskih branitelja');
  add(8,15,'Velika Gospa');
  add(11,1,'Svi sveti');
  add(11,18,'Dan sjećanja na žrtve Domovinskog rata i Dan sjećanja na žrtvu Vukovara i Škabrnje');
  add(12,25,'Božić');
  add(12,26,'Sveti Stjepan');
  return map;
}
function holidayName(iso){
  const y=Number(iso.slice(0,4));
  return croatianHolidays(y)[iso]||'';
}
function isWeekendIso(iso){
  const d=new Date(iso+'T00:00:00'),day=d.getDay();
  return day===0||day===6;
}

function renderCalendar(){
  const host=document.getElementById('calendarGrid');if(!host)return;
  let h='',base=new Date();base.setHours(0,0,0,0);
  for(let i=0;i<28;i++){
    const d=new Date(base);d.setDate(base.getDate()+i);
    const iso=isoLocal(d),weekend=isWeekendIso(iso),holiday=holidayName(iso);
    const a=(!weekend&&!holiday)?whAnnouncements().filter(x=>x.date===iso).sort((x,y)=>x.time.localeCompare(y.time)):[];
    const cls=holiday?'holiday':weekend?'weekend':'';
    h+=`<div class="calday ${cls}">
      <div class="daymeta"><b>${d.toLocaleDateString('hr-HR',{weekday:'short',day:'2-digit',month:'2-digit'})}</b><small>${iso}</small></div>
      ${holiday?`<span class="holiday-name">${holiday}</span>`:weekend?'<span class="weekend-name">VIKEND · NEMA PRIJAMA</span>':''}
      ${a.map(x=>`<div class="calitem">${x.time} · ${warehouseOptionLabel(x.warehouse||yardivoCanonicalWarehouseV583())} · ${x.supplier}<br>R${x.dock} · ${x.pallets} pal.</div>`).join('')}
    </div>`;
  }
  host.innerHTML=h;
}
function renderHeatmap(){
 const host=document.getElementById('heatmapBoard');if(!host)return;const a=whAnnouncements(),days=['Pon','Uto','Sri','Čet','Pet','Sub','Ned'];let h='<div class="heat"><div></div>'+days.map(x=>`<div><b>${x}</b></div>`).join('');
 for(let hour=6;hour<14;hour++){h+=`<div><b>${String(hour).padStart(2,'0')}:00</b></div>`;for(let day=1;day<=7;day++){let p=a.filter(x=>{let d=new Date(x.date+'T00:00:00'),wd=d.getDay()||7;return wd===day&&Number(String(x.time).slice(0,2))===hour}).reduce((s,x)=>s+Number(x.pallets||0),0),cl=p>100?'h4':p>65?'h3':p>32?'h2':p>0?'h1':'';h+=`<div class="${cl}">${p||'—'}</div>`}}host.innerHTML=h+'</div>';
}
function renderTruckHistory(){
  const host=document.getElementById('truckHistory');if(!host)return;
  const plate=(document.getElementById('gatePlate')?.value||'').trim().toUpperCase();
  if(!plate){host.textContent='Upiši registraciju na porti za prikaz povijesti.';return}
  const np=normalizePlate(plate);
  const a=announcements
    .filter(x=>normalizePlate(x.arrivalPlate||x.plannedPlate)===np)
    .sort((x,y)=>String(y.actualDate||y.date).localeCompare(String(x.actualDate||x.date)));
  host.innerHTML=a.length?a.slice(0,10).map(x=>`<div class="smart-note"><strong>${x.actualDate||x.date}</strong> · ${x.supplier} · ${warehouseOptionLabel(x.warehouse||yardivoCanonicalWarehouseV583())} · ${operationalPlanStatus(x)} ${operationalDelayText(x)?`· ${operationalDelayText(x)}`:''}</div>`).join(''):'Nema prethodnih dolazaka za ovu registraciju.';
}


const dailyMapDateInput=document.getElementById('dailyMapDate');if(dailyMapDateInput&&!dailyMapDateInput.value)dailyMapDateInput.value=ymsToday();
const dailyWhInput=document.getElementById('dailyMapWarehouseSelect');
if(dailyWhInput && activeWarehouse!=='ALL')dailyWhInput.value=activeWarehouse;
normalizeAnnouncements();
syncAllAnnouncementIdentities();


// ===== ADMIN RESET SVIH OPERATIVNIH PODATAKA =====
function canDeleteAllData(){
  return currentSession?.role==='admin';
}
function deleteAllOperationalData(){
  if(!canDeleteAllData()){
    alert('Samo Admin može obrisati sve najave.');
    return;
  }

  const first=confirm(
    'BRISANJE SVIH NAJAVA\n\n' +
    'Obrisat će se:\n' +
    '• sve aktivne i povijesne najave\n' +
    '• statusi najava i prijama\n' +
    '• promjene datuma, termina i rampi\n' +
    '• evidentirani dolasci\n' +
    '• tablice i vozači vezani uz najave\n\n' +
    'NE brišu se: dobavljači, incidenti, skladišta, rampe, praznici, postavke ni login.\n\n' +
    'Želiš li nastaviti?'
  );
  if(!first)return;

  const typed=prompt('Za konačnu potvrdu upiši: OBRISI SVE');
  if(typed===null)return;

  const normalized=typed
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'');

  if(normalized!=='OBRISI SVE'){
    alert('Nije uneseno "OBRISI SVE". Brisanje nije izvršeno.');
    return;
  }

  // Brišu se SAMO najave. Ostali moduli ostaju netaknuti.
  announcements=[];

  const announcementKeys=[
    'yardivo_yms_announcements_v1',
    'studenac_announcements',
    'yardivo_announcements',
    'yms_announcements'
  ];
  announcementKeys.forEach(k=>{
    try{safeStorage.removeItem(k)}catch(e){}
  });

  // Spremi praznu listu pod ključem koji koristi aplikacija.
  try{saveAnnouncements()}catch(e){}

  if(typeof editingAnnouncementId!=='undefined')editingAnnouncementId=null;
  if(typeof contextAnnouncementId!=='undefined')contextAnnouncementId=null;
  if(typeof currentAnnouncementDetailId!=='undefined')currentAnnouncementDetailId=null;

  // Osvježi sve prikaze koji koriste isti announcements niz.
  try{render()}catch(e){}
  try{renderAnnouncements()}catch(e){}
  try{renderAnnouncementSchedule()}catch(e){}
  try{renderDailyMap()}catch(e){}
  try{renderWeeklyMap()}catch(e){}
  try{renderWeeklyDeliveries()}catch(e){}
  try{renderReceiving()}catch(e){}
  try{renderOverview()}catch(e){}
  try{renderDashboardSimple()}catch(e){}
  try{refreshRecommendation()}catch(e){}

  if(typeof showYmsToast==='function'){
    showYmsToast('success','SVE NAJAVE SU OBRISANE','Dobavljači, incidenti, skladišta i postavke ostali su sačuvani.',4500);
  }else{
    alert('Sve najave su obrisane. Ostali podaci su sačuvani.');
  }
}
document.getElementById('deleteAllDataBtn')?.addEventListener('click',deleteAllOperationalData);


// ===== POČETNI IZBORNIK =====

function homeLocationChosen(){
  const id=String(currentSession?.location||'').trim();
  if(!id)return false;
  try{
    const raw=localStorage.getItem('yardivo_master_data_registry_v583');
    const d=raw?JSON.parse(raw):null;
    if(d&&Array.isArray(d.locations)){
      return d.locations.some(x=>x&&x.active!==false&&String(x.id)===id);
    }
  }catch(e){}
  try{
    const d=window.YardivoMasterDataV583?.all?.();
    if(d&&Array.isArray(d.locations)){
      return d.locations.some(x=>x&&x.active!==false&&String(x.id)===id);
    }
  }catch(e){}
  return false;
}
function updateHomeLocationUI(){
  const sel=document.getElementById('homeLocationSelect');
  const status=document.getElementById('homeLocationStatus');
  if(sel)sel.value=currentSession?.location||'';
  const bigLocation=document.getElementById('homeSelectedLocation');
  if(bigLocation){
    if(homeLocationChosen()){
      bigLocation.textContent=locationLabel(currentSession.location).toUpperCase();
      bigLocation.classList.add('selected');
    }else{
      bigLocation.textContent='ODABERI LOKACIJU';
      bigLocation.classList.remove('selected');
    }
  }
  const storageStatus=document.getElementById('homeStorageStatus');
  if(storageStatus){
    /* Canonical count is the live announcements dataset.
       Never read an old storage/cache array just to paint the Home counter. */
    let persisted=0,lastSaved='';
    try{
      const live=(typeof announcements!=='undefined'&&Array.isArray(announcements))
        ? announcements
        : (Array.isArray(window.announcements)?window.announcements:[]);
      persisted=live.length;
      if(persisted>0)lastSaved=safeStorage.getItem('yardivo_data_last_saved_at')||'';
    }catch(e){
      persisted=0;
      lastSaved='';
    }
    storageStatus.textContent=`SPREMLJENO: ${persisted} NAJAVA${persisted>0&&lastSaved?' · '+new Date(lastSaved).toLocaleTimeString('hr-HR',{hour:'2-digit',minute:'2-digit'}):''}`;
    storageStatus.classList.toggle('warn',persisted===0);
  }
  if(status){
    if(homeLocationChosen()){
      status.textContent=`Odabrano: ${locationLabel(currentSession.location)}`;
      status.classList.add('ready');
    }else{
      status.textContent='Lokacija nije odabrana';
      status.classList.remove('ready');
    }
  }
  document.querySelectorAll('#homeMenuGrid .home-menu-card').forEach(card=>{
    card.classList.toggle('locked',!homeLocationChosen());
  });
}
function persistCurrentSession(){
  try{
    if(currentSession?.rememberMe){
      safeStorage.setItem('yardivo_remembered_session',JSON.stringify(currentSession));
    }else{
      safeSessionStorage.setItem('studenac_demo_session',JSON.stringify(currentSession));
    }
  }catch(e){}
}
document.getElementById('homeLocationSelect')?.addEventListener('change',e=>{
  const location=e.target.value;
  currentSession.location=location||null;
  if(location){
    try{safeStorage.setItem('yardivo_last_location',location)}catch(e){}
    activeWarehouse=defaultWarehouseForLocation(location);
    try{safeStorage.setItem('studenac_active_warehouse',activeWarehouse)}catch(e){}
    syncWarehouseSelectorsToLoginLocation();
  }else{
    activeWarehouse='ALL';
  }
  persistCurrentSession();
  updateHomeLocationUI();
  const warning=document.getElementById('homeLocationWarning');
  warning?.classList.remove('show');
});
document.getElementById('homeLogoutBtn')?.addEventListener('click',()=>{
  try{saveAnnouncements()}catch(e){}
  try{
    safeSessionStorage.removeItem('studenac_demo_session');
    safeStorage.removeItem('yardivo_remembered_session');
  }catch(e){}
  currentSession=null;
  document.body.classList.remove('home-menu-mode');
  showLogin();
});

function openAppView(viewId){
  const target=document.getElementById(viewId);if(!target)return;

  // Svaka sekcija se uvijek otvara od samog vrha.
  // Posebno rješava Postavke i Prijavu dolaska nakon dugih stranica poput 3D Dvorišta.
  try{
    window.scrollTo(0,0);
    document.documentElement.scrollTop=0;
    document.body.scrollTop=0;
    document.querySelector('.main')?.scrollTo?.(0,0);
    document.querySelector('.content')?.scrollTo?.(0,0);
    target.scrollTop=0;
  }catch(e){
    window.scrollTo(0,0);
  }

  if(viewId!=='homeMenu' && !homeLocationChosen()){
    const warning=document.getElementById('homeLocationWarning');
    warning?.classList.add('show');
    document.getElementById('homeLocationSelect')?.focus();
    return;
  }
  document.body.classList.toggle('home-menu-mode',viewId==='homeMenu');
  if(viewId==='homeMenu')updateHomeLocationUI();
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  target.classList.add('active');
  requestAnimationFrame(()=>{
    try{
      window.scrollTo(0,0);
      document.documentElement.scrollTop=0;
      document.body.scrollTop=0;
      document.querySelector('.main')?.scrollTo?.(0,0);
      document.querySelector('.content')?.scrollTo?.(0,0);
      target.scrollTop=0;
    }catch(e){}
  });
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector(`[data-view="${viewId}"]`)?.classList.add('active');
  const pageTitle=document.getElementById('pageTitle');
  if(pageTitle){
    const nav=document.querySelector(`[data-view="${viewId}"]`);
    pageTitle.textContent=nav?nav.textContent.replace(/\d+/g,'').trim():'Početni izbornik';
  }
  if(viewId==='receiving'&&typeof renderReceiving==='function')renderReceiving();
  if(viewId==='checkin'&&typeof renderCheckinPro==='function')renderCheckinPro();
  if(viewId==='docks'&&typeof renderRampe==='function')renderRampe();
  if(viewId==='trucks'&&typeof renderTruckHistorySection==='function')renderTruckHistorySection();
  if(viewId==='dailyMap'&&typeof renderDailyMap==='function')renderDailyMap();
  if(viewId==='weeklyMap'&&typeof renderWeeklyMap==='function')renderWeeklyMap();
  if(viewId==='weeklyDeliveries'&&typeof renderWeeklyDeliveries==='function')renderWeeklyDeliveries();
  if(viewId==='analytics'&&typeof window.renderYardivoAnalytics==='function')window.renderYardivoAnalytics();
  if(viewId==='settings'){
    if(typeof renderHolidayAdmin==='function')renderHolidayAdmin();
    if(typeof enableDatePickers==='function')enableDatePickers();
  }
}
document.getElementById('homeMenuGrid')?.addEventListener('click',e=>{
  const card=e.target.closest('[data-home-target]');
  if(!card)return;
  openAppView(card.dataset.homeTarget);
});

// ===== DEMO LOGIN I ROLE =====
const DEMO_LOGIN={user:'admin',pass:'1234'};
currentSession=null;
try{
  const rememberedSession=JSON.parse(safeStorage.getItem('yardivo_remembered_session')||'null');
  const temporarySession=JSON.parse(safeSessionStorage.getItem('studenac_demo_session')||'null');
  currentSession=rememberedSession||temporarySession||null;
}catch(e){
  safeSessionStorage.removeItem('studenac_demo_session');
  safeStorage.removeItem('yardivo_remembered_session');
  currentSession=null;
}

function canChangeReceptionStatus(){
  const role=String(currentSession?.role||'').toLowerCase();
  return role==='admin'||role==='reception'||role==='prijam';
}

function locationLabel(code){
  const id=String(code||'').trim();
  if(!id)return 'LOKACIJA NIJE ODABRANA';
  try{
    const raw=localStorage.getItem('yardivo_master_data_registry_v583');
    const d=raw?JSON.parse(raw):null;
    const x=d?.locations?.find?.(v=>v&&v.active!==false&&String(v.id)===id);
    if(x?.name)return x.name;
  }catch(e){}
  try{
    const d=window.YardivoMasterDataV583?.all?.();
    const x=d?.locations?.find?.(v=>v&&v.active!==false&&String(v.id)===id);
    if(x?.name)return x.name;
  }catch(e){}
  return id;
}
function yardivoLoadDynamicWarehousesIntoSystem(){
  try{
    const d=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');
    if(!Array.isArray(d?.warehouses))return;
    if(typeof WAREHOUSES!=='undefined'&&WAREHOUSES){
      Object.keys(WAREHOUSES).forEach(k=>delete WAREHOUSES[k]);
      d.warehouses.filter(x=>x&&x.active!==false).forEach(w=>{
        const l=(d.locations||[]).find(x=>String(x.id)===String(w.location_id));
        WAREHOUSES[w.id]={
          code:w.id,location_id:w.location_id,location:l?.name||w.location_id,
          name:String(w.name||w.id),ramps:Math.max(0,Number(w.ramps)||0),
          receptionStart:String(w.reception_from||w.receptionStart||''),
          receptionEnd:String(w.reception_to||w.receptionEnd||'')
        };
      });
    }
  }catch(e){console.warn('YARDIVO master warehouse load',e)}
}
function allWarehousesForLocation(code){
  const id=String(code||'').trim();
  try{
    const raw=localStorage.getItem('yardivo_master_data_registry_v583');
    const d=raw?JSON.parse(raw):null;
    return Array.isArray(d?.warehouses)
      ? d.warehouses.filter(x=>x&&x.active!==false&&String(x.location_id)===id).map(x=>x.id)
      : [];
  }catch(e){}
  return [];
}
function warehousesForLocation(code){
  const all=allWarehousesForLocation(code);
  try{
    const s=(typeof currentSession!=='undefined'?currentSession:window.currentSession)||{};
    let r=String(s?.role||s?.app_role||'').trim().toLowerCase();
    if(r==='management'||r==='voditelj')r='manager';
    if(r==='zalihe'||r==='upravljanje zalihama')r='inventory';
    if(r==='prijam')r='reception';
    if(r==='porta'||r==='portir')r='gate';
    if(r==='admin')return all;
    const assigned=Array.isArray(s?.warehouses)
      ? [...new Set(s.warehouses.map(x=>String(x).trim().toUpperCase()).filter(Boolean))]
      : [];
    const sessionLoc=String(s?.location||'').trim().toUpperCase();
    const requestedLoc=String(code||'').trim().toUpperCase();
    const sameLocation=sessionLoc==='ALL'||sessionLoc===requestedLoc;
    if(!sameLocation||!assigned.length)return [];
    return all.filter(w=>assigned.includes(String(w).toUpperCase()));
  }catch(e){}
  return [];
}
function defaultWarehouseForLocation(code){
  const id=String(code||'').trim();
  try{
    const allowed=warehousesForLocation(id);
    if(allowed.length)return allowed[0];
    const r=String(currentSession?.role||window.currentSession?.role||'').trim().toLowerCase();
    return r==='admin'?'ALL':'';
  }catch(e){}
  return '';
}
function currentAllowedWarehouses(){
  return currentSession?.location?warehousesForLocation(currentSession.location):[];
}
function warehouseOptionLabel(code){
  const id=String(code||'').trim();
  if(!id)return '';
  if(id==='ALL')return 'Sva skladišta';
  try{
    const d=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');
    const row=(Array.isArray(d?.warehouses)?d.warehouses:[]).find(w=>w&&w.active!==false&&String(w.id)===id);
    if(row&&String(row.name||'').trim())return String(row.name).trim();
  }catch(_){ }
  try{
    yardivoLoadDynamicWarehousesIntoSystem();
    const w=WAREHOUSES?.[id];
    if(w&&String(w.name||'').trim())return String(w.name).trim();
  }catch(_){ }
  return 'Skladište';
}
function yardivoWarehouseLocationNameV583(code){
  const id=String(code||'').trim();
  if(!id||id==='ALL')return '';
  try{
    const d=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');
    const wh=(Array.isArray(d?.warehouses)?d.warehouses:[]).find(w=>w&&w.active!==false&&String(w.id)===id);
    const loc=(Array.isArray(d?.locations)?d.locations:[]).find(l=>l&&l.active!==false&&String(l.id)===String(wh?.location_id||''));
    if(loc&&String(loc.name||'').trim())return String(loc.name).trim();
  }catch(_){ }
  try{
    const locId=WAREHOUSES?.[id]?.location_id||WAREHOUSES?.[id]?.location||'';
    return window.YardivoDisplayNamesV583?.locationName?.(locId)||String(WAREHOUSES?.[id]?.locationName||'');
  }catch(_){ return ''; }
}
window.yardivoWarehouseLocationNameV583=yardivoWarehouseLocationNameV583;

function yardivoRefreshAllWarehouseUi(){
  yardivoLoadDynamicWarehousesIntoSystem();
  let d={locations:[],warehouses:[]};
  try{d=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')}catch(_){}
  const activeLocRaw=String(window.YardivoAppStateV583?.location?.()||window.currentSession?.location||'');
  const activeLoc=activeLocRaw==='ALL'?'':activeLocRaw;
  const currentWh=String(window.YardivoAppStateV583?.warehouse?.()||window.activeWarehouse||'');
  const activeRows=(d.warehouses||[]).filter(w=>w&&w.active!==false);
  const rowsFor=loc=>activeRows.filter(w=>!loc||String(w.location_id)===String(loc));
  const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const label=w=>`${w.name||w.id}`;
  function refill(sel,{location=null,includeAll=null,includePlaceholder=null}={}){
    if(!sel)return;
    const old=sel.value;
    const hadAll=[...sel.options].some(o=>o.value==='ALL');
    const hadPlaceholder=[...sel.options].some(o=>o.value==='');
    const loc=location===null?activeLoc:location;
    const rows=rowsFor(loc);
    let html='';
    if(includePlaceholder===true||(includePlaceholder===null&&hadPlaceholder))html+='<option value="">Odaberi skladište...</option>';
    if(includeAll===true||(includeAll===null&&hadAll))html+='<option value="ALL">Sva skladišta</option>';
    html+=rows.map(w=>`<option value="${esc(w.id)}">${esc(label(w))}</option>`).join('');
    sel.innerHTML=html;
    if([...sel.options].some(o=>o.value===old))sel.value=old;
    else if([...sel.options].some(o=>o.value===currentWh))sel.value=currentWh;
    else if(rows.length===1)sel.value=rows[0].id;
  }
  refill(document.getElementById('globalWarehouse'),{location:activeLoc,includePlaceholder:false,includeAll:false});
  ['warehouseFilter','annWarehouse','announcementWarehouse','savedWarehouseFilter','dailyMapWarehouseSelect','weeklyMapWarehouse','uaWarehouse']
    .forEach(id=>refill(document.getElementById(id),{location:activeLoc}));
  document.querySelectorAll('select').forEach(sel=>{
    /* Stable Master owns all selectors inside its editor. In particular
       #smNewWarehouseLocation is a LOCATION selector despite "Warehouse"
       appearing in its id, so global warehouse sync must never refill it. */
    if(sel.closest?.('#yardivoStableMasterEditorV583'))return;
    if(['loginRole','globalWarehouse','warehouseFilter','annWarehouse','announcementWarehouse','savedWarehouseFilter','dailyMapWarehouseSelect','weeklyMapWarehouse','uaWarehouse','ysaLocation','ywaLocation','yufLocation','muLocation'].includes(sel.id))return;
    if(/warehouse|sklad/i.test(String(sel.id||'')+' '+String(sel.name||'')))refill(sel,{location:activeLoc});
  });
  if(!currentWh&&rowsFor(activeLoc).length){
    const next=rowsFor(activeLoc)[0].id;
    try{window.YardivoAppStateV583?.setWarehouse?.(next)}catch(_){window.activeWarehouse=next}
  }
  try{renderWarehouseCards?.()}catch(_){};try{renderRampe?.()}catch(_){};try{renderDockOverview?.()}catch(_){};
  try{renderDailyMap?.()}catch(_){};try{renderWeeklyMap?.()}catch(_){};try{renderOverview?.()}catch(_){};
  try{yardivoRenderSupplierWarehousePicker?.()}catch(_){}
}
window.yardivoRefreshAllWarehouseUi=yardivoRefreshAllWarehouseUi;

function buildWarehouseOptionsForLocation(location,{includeAll=false,includePlaceholder=false}={}){
  const allowed=warehousesForLocation(location);
  let html='';
  if(includePlaceholder)html+='<option value="">Odaberi skladište...</option>';
  if(includeAll)html+='<option value="ALL">Sva skladišta</option>';
  html+=allowed.map(code=>`<option value="${code}">${warehouseOptionLabel(code)}</option>`).join('');
  return html;
}
function syncWarehouseSelectorsToLoginLocation(){
  if(!currentSession)return;
  const location=currentSession.location;
  if(!location)return;
  const allowed=warehousesForLocation(location);
  const fallback=defaultWarehouseForLocation(location);

  const globalSel=document.getElementById('warehouseFilter');
  if(globalSel){
    const previous=globalSel.value;
    globalSel.innerHTML=buildWarehouseOptionsForLocation(location,{includeAll:false});
    globalSel.value=allowed.includes(previous)?previous:fallback;
  }

  const annSel=document.getElementById('annWarehouse');
  if(annSel){
    const previous=annSel.value;
    annSel.innerHTML=buildWarehouseOptionsForLocation(location,{includePlaceholder:true});
    annSel.value=allowed.includes(previous)?previous:fallback;
  }

  const savedSel=document.getElementById('savedWarehouseFilter');
  if(savedSel){
    const previous=savedSel.value;
    savedSel.innerHTML=buildWarehouseOptionsForLocation(location,{includeAll:true});
    savedSel.value=(previous==='ALL'||allowed.includes(previous))?previous:'ALL';
  }

  const dailySel=document.getElementById('dailyMapWarehouseSelect');
  if(dailySel){
    const previous=dailySel.value;
    dailySel.innerHTML=buildWarehouseOptionsForLocation(location);
    dailySel.value=allowed.includes(previous)?previous:fallback;
  }

  // Rebuild any other warehouse selectors that contain known warehouse codes.
  document.querySelectorAll('select').forEach(sel=>{
    if(sel.closest?.('#yardivoStableMasterEditorV583'))return;
    if(['warehouseFilter','annWarehouse','savedWarehouseFilter','dailyMapWarehouseSelect','loginLocation','loginRole'].includes(sel.id))return;
    const values=Array.from(sel.options||[]).map(o=>o.value);
    const isWarehouseSelect=values.some(v=>/^W(101|103|104|201|203|204)$/.test(v));
    if(!isWarehouseSelect)return;
    const previous=sel.value;
    const includeAll=values.includes('ALL');
    const includePlaceholder=values.includes('');
    sel.innerHTML=buildWarehouseOptionsForLocation(location,{includeAll,includePlaceholder});
    if(previous==='ALL'&&includeAll)sel.value='ALL';
    else if(allowed.includes(previous))sel.value=previous;
    else if(includePlaceholder)sel.value='';
    else sel.value=fallback;
  });

  activeWarehouse=allowed.includes(activeWarehouse)?activeWarehouse:fallback;
  if(globalSel)globalSel.value=activeWarehouse;
  try{safeStorage.setItem('studenac_active_warehouse',activeWarehouse)}catch(e){}

  try{if(typeof refreshRecommendation==='function')refreshRecommendation()}catch(e){}
  try{if(typeof render==='function')render()}catch(e){}
}
function roleLabel(role){
  return {admin:'Admin',manager:'Voditelj',management:'Voditelj',inventory:'Upravljanje zalihama',reception:'Prijam',gate:'Porta'}[role]||role;
}
function allowedViewsForRole(role){
  const map={
    admin:[],
    inventory:['homeMenu','dashboard','aiOperations','weeklyMap','dailyMap','myYard','announcements','supplierRequests','weeklyDeliveries','overview','suppliers','calendar','heatmap','controltower','controlTower','plannerPro','incidents','incidentArchive','documentArchive','reports','settings','unannounced','epal','orderSearch'],
    reception:['homeMenu','aiOperations','receiving','dailyMap','weeklyMap','suppliers','myYard','operations','incidents','incidentArchive','documentArchive','settings','unannounced','epal','liveYard'],
    gate:['homeMenu','checkin','unannounced','myYard','docks'],
    manager:[],
    management:[]
  };
  if(role==='admin'){
    return [...new Set([
      'homeMenu',
      ...Array.from(document.querySelectorAll('.view[id]')).map(v=>v.id),
      ...Array.from(document.querySelectorAll('[data-view]')).map(v=>v.dataset.view).filter(Boolean),
      ...Array.from(document.querySelectorAll('[data-home-target]')).map(v=>v.dataset.homeTarget).filter(Boolean)
    ])];
  }
  if(role==='manager'||role==='management'){
    return ['homeMenu','dashboard','controlTower','myYard','suppliers','overview','dailyMap','weeklyMap'];
  }
  return map[role]||[];
}
function applyRoleAccess(){
  if(!currentSession)return;
  const allowed=allowedViewsForRole(currentSession.role);
  document.querySelectorAll('[data-home-target]').forEach(card=>card.style.display=allowed.includes(card.dataset.homeTarget)?'block':'none');

  document.querySelectorAll('[data-view]').forEach(btn=>{
    btn.classList.toggle('role-hidden',!allowed.includes(btn.dataset.view));
  });

  const active=document.querySelector('.view.active');
  if(active && !allowed.includes(active.id)){
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById('dashboard')?.classList.add('active');
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('active'));
    document.querySelector('[data-view="dashboard"]')?.classList.add('active');
  }

  const chip=document.getElementById('currentUserChip');
  const label=document.getElementById('currentUserLabel');
  if(chip)chip.style.display='flex';
  if(label)label.textContent=`${currentSession.user} · ${roleLabel(currentSession.role)}${currentSession.location?' · '+locationLabel(currentSession.location):''}`;
  const homeSub=document.getElementById('homeMenuSubtitle');if(homeSub)homeSub.textContent=currentSession.location?`${locationLabel(currentSession.location)} · odaberi sekciju u koju želiš ući`:'Odaberi lokaciju, zatim sekciju u koju želiš ući';
  syncWarehouseSelectorsToLoginLocation();
  const deleteBtn=document.getElementById('deleteAllDataBtn');if(deleteBtn)deleteBtn.style.display=String(currentSession.role||'').toLowerCase()==='admin'?'block':'none';
}
function showLogin(){
  document.body.classList.remove('home-menu-mode');
  const overlay=document.getElementById('loginOverlay');
  if(overlay)overlay.style.display='flex';
  const chip=document.getElementById('currentUserChip');
  if(chip)chip.style.display='none';
}
function enterApp(){
  document.body.classList.remove('yardivo-prelogin','yardivo-welcome-active');
  reloadAnnouncementsFromPersistentStorage();
  try{YardivoRoleAccessFinal?.apply?.()}catch(e){}
  try{applyRoleAccess()}catch(e){}
  const overlay=document.getElementById('loginOverlay');
  if(overlay)overlay.style.display='none';
  if(typeof render==='function')render();
  try{YardivoRoleAccessFinal?.apply?.()}catch(e){}
  openAppView('homeMenu');
  updateHomeLocationUI();
}
function doLogin(){
  const user=document.getElementById('loginUser')?.value.trim()||'';
  const pass=document.getElementById('loginPass')?.value||'';
  const role=document.getElementById('loginRole')?.value||'admin';
  const err=document.getElementById('loginError');

  if(true){
    if(err){
      err.innerHTML='Pogrešni podaci. Korisničko ime je <strong>admin1</strong>, a lozinka više nije lokalna.';
      err.style.borderColor='#7b3138';
      err.style.background='#2b1115';
      err.style.color='#ff9ba0';
    }
    return false;
  }

  const rememberMe=!!document.getElementById('rememberMe')?.checked;
  let lastLocation=null;
  try{lastLocation=safeStorage.getItem('yardivo_last_location')||null}catch(e){}
  currentSession={user:'admin1',role,location:lastLocation,loginAt:new Date().toISOString(),rememberMe};
  try{YardivoRoleAccessFinal?.apply?.()}catch(e){}

  // Najave se NIKAD ne inicijaliziraju ponovno pri loginu — učitavaju se iz trajnog spremišta.
  reloadAnnouncementsFromPersistentStorage();

  let savedWarehouse=null;
  try{savedWarehouse=safeStorage.getItem('studenac_active_warehouse')||null}catch(e){}
  const allowed=lastLocation?warehousesForLocation(lastLocation):[];
  activeWarehouse=(savedWarehouse&&allowed.includes(savedWarehouse))
    ? savedWarehouse
    : (lastLocation?defaultWarehouseForLocation(lastLocation):'ALL');
  try{safeStorage.setItem('studenac_active_warehouse',activeWarehouse)}catch(e){}
  try{
    if(rememberMe){
      safeStorage.setItem('yardivo_remembered_session',JSON.stringify(currentSession));
      safeSessionStorage.removeItem('studenac_demo_session');
    }else{
      safeStorage.removeItem('yardivo_remembered_session');
      safeSessionStorage.setItem('studenac_demo_session',JSON.stringify(currentSession));
    }
  }catch(e){}
  enterApp();
  return true;
}


document.getElementById('logoutBtn')?.addEventListener('click',()=>{
  // Logout briše SAMO autentikacijsku sesiju. Operativni podaci i zadnja lokacija ostaju.
  try{saveAnnouncements()}catch(e){}
  try{
    safeSessionStorage.removeItem('studenac_demo_session');
    safeStorage.removeItem('yardivo_remembered_session');
  }catch(e){}
  currentSession=null;
  showLogin();
});

// Inicijalizacija: YARDIVO uvijek ide Welcome -> Login.
// Ne ulazimo automatski u aplikaciju iz zapamćene sesije.
currentSession=null;
try{ safeSessionStorage.removeItem('studenac_demo_session'); }catch(e){}
/* Login is revealed exclusively by yardivo-welcome-splash-script after 100%. */
if(document.documentElement.classList.contains('yardivo-welcome-complete'))showLogin();


// ===== KALENDAR NA KLIK U CIJELI OKVIR DATUMA =====
function enableDatePickers(){
  document.querySelectorAll('input[type="date"]').forEach(input=>{
    input.style.cursor='pointer';
    if(input.dataset.calendarClickReady==='1')return;
    input.dataset.calendarClickReady='1';

    input.addEventListener('click',()=>{
      try{
        if(typeof input.showPicker==='function')input.showPicker();
      }catch(e){}
    });

    input.addEventListener('focus',()=>{
      input.style.cursor='pointer';
    });
  });
}
document.addEventListener('DOMContentLoaded',enableDatePickers);
setTimeout(enableDatePickers,0);setTimeout(renderHolidayAdmin,0);setTimeout(updateHolidayWarning,0);


setInterval(()=>{
  try{
    /* Stability hard-fix: never repaint six large screens just because one minute elapsed.
       Refresh only the currently visible operational view and defer noncritical alerts. */
    const active=document.querySelector('.view.active');
    const id=active?.id||active?.getAttribute?.('data-view')||'';
    const run=()=>{
      try{renderAfter14NoShowAlerts()}catch(_){}
      try{
        if((id==='dashboard'||id==='home')&&typeof renderDashboardSimple==='function')renderDashboardSimple();
        else if((id==='announcements'||id==='schedule')&&typeof renderAnnouncementSchedule==='function')renderAnnouncementSchedule();
        else if(id==='dailyMap'&&typeof renderDailyMap==='function')renderDailyMap();
        else if(id==='weeklyMap'&&typeof renderWeeklyMap==='function')renderWeeklyMap();
        else if(id==='receiving'&&typeof renderReceiving==='function')renderReceiving();
      }catch(_){}
    };
    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:1200});
    else setTimeout(run,120);
  }catch(e){}
},60000);

