(()=>{'use strict';
if(window.__YARDON_SMART_CENTER_V1__)return;
window.__YARDON_SMART_CENTER_V1__=true;

const $=id=>document.getElementById(id);
let snapshot=null,activeTab='decisions',loading=false,lastWarehouse='',activityEvents=[],lastPopup='',backgroundBusy=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const role=()=>{let r=String(window.currentSession?.role||window.currentSession?.app_role||'').toLowerCase().trim();if(r==='zalihe'||r.includes('zalih'))r='inventory';if(r==='prijam')r='reception';if(r==='voditelj'||r==='management')r='manager';return r};
function aiEnabled(){
 try{
  if(window.YardOnAIAdminV1?.aiControlEnabled)return window.YardOnAIAdminV1.aiControlEnabled();
  const c=JSON.parse(localStorage.getItem('yardivo_auto_replan_cfg_v1')||'{}')||{};
  return c.enabled===true&&String(c.mode||'').toUpperCase()!=='PAUSED';
 }catch(_){return false}
}
const canView=()=>['admin','inventory','reception'].includes(role());
function applyVisibility(){
 // One visible SMART section. RoleVisibility owns menu permissions.
 // Do not hide the section when engine is paused: history must remain accessible.
 return canView();
}

const pad=n=>String(n).padStart(2,'0');
function localDate(add=0){const d=new Date();d.setDate(d.getDate()+add);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function mins(v){const m=String(v||'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):NaN}
function fmtDate(v){if(!v)return'—';try{return new Intl.DateTimeFormat('hr-HR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(v+'T12:00:00'))}catch(_){return v}}
function stateTerminal(v){return ['COMPLETED','REJECTED','CANCELLED','CANCELED','REVOKED'].includes(String(v||'').toUpperCase())}
function dockNum(v){const n=Number(String(v||'').replace(/\D/g,''));return Number.isFinite(n)&&n>0?n:null}
function warehouseName(id){return snapshot?.warehouses?.find(w=>String(w.id)===String(id))?.name||id||'—'}

async function invoke(body){
 if(!aiEnabled()&&!['smart_activity','preview_request','record_request_review'].includes(body?.action))throw new Error('YARD ON SMART je pauziran u postavkama.');
 const c=await window.YardivoAuth?.client?.();
 if(!c)throw new Error('Online prijava nije spremna.');
 const {data,error}=await c.functions.invoke('yardivo-ai-operations',{body});
 if(error)throw error;
 if(data?.ok===false)throw new Error(data.error||'YARD ON SMART nije dostupan.');
 return data?.data??data;
}

function shell(){
 if(!applyVisibility())return;
 const root=$('smartReplanning');if(!root)return;
 if(!$('yaioDate'))$('yaioControls').innerHTML=`
   <label>DATUM<input id="yaioDate" type="date"></label>
   <label>SKLADIŠTE<select id="yaioWarehouse"><option value="">Sva dostupna skladišta</option></select></label>
   <button class="primary" id="yaioRefresh" type="button">✦ IZRAČUNAJ PLAN</button>
   <span class="yaio-updated" id="yaioUpdated">Plan još nije izračunat.</span>`;
 if(!$('yaioTabs').children.length)$('yaioTabs').innerHTML=`
   <button class="yaio-tab" data-yaio-tab="plan" type="button">PLAN PO RAMPAMA</button>
   <button class="yaio-tab" data-yaio-tab="live" type="button">LIVE DANAS</button>
   <button class="yaio-tab" data-yaio-tab="parking" type="button">PARKING & QUEUE</button>
   <button class="yaio-tab active" data-yaio-tab="decisions" type="button">PRIJEDLOZI I POVIJEST</button>`;
 if(!$('yaioDate').value)$('yaioDate').value=localDate(1);
 bind();
}

let bound=false;
function bind(){
 if(bound)return;bound=true;
 document.addEventListener('click',e=>{
   const decision=e.target.closest?.('[data-yaio-decision-action]');
   if(decision){void resolveDecision(decision.dataset.yaioDecisionId||'',decision.dataset.yaioDecisionAction||'');return}
   const tab=e.target.closest?.('[data-yaio-tab]');
   if(tab){activeTab=tab.dataset.yaioTab||'plan';renderTabs();return}
   if(e.target.closest?.('#yaioRefresh')){void refresh(true);return}
 },true);
 document.addEventListener('change',e=>{
   if(e.target?.id==='yaioWarehouse'){lastWarehouse=e.target.value||'';void refresh(true)}
   if(e.target?.id==='yaioDate')void refresh(true);
 },true);
 window.addEventListener('yardivo:view-opened',e=>{
   if(e.detail?.view==='smartReplanning'){
     setTitle();
     shell();
     if(!snapshot)void refresh(false);else render();
   }
 });
 window.addEventListener('yardivo:login',()=>{snapshot=null;setTimeout(()=>{if($('smartReplanning')?.classList.contains('active'))void refresh(false)},120)});
 window.addEventListener('yardivo:data-synced',()=>{if($('smartReplanning')?.classList.contains('active'))setTimeout(()=>void refresh(false),100)});
}

function setTitle(){
 const t=$('pageTitle');if(t)t.textContent='YARD ON SMART';
}

async function loadActivity(){
 if(!canView())return [];
 const data=await invoke({action:'smart_activity'});
 activityEvents=Array.isArray(data?.events)?data.events:[];
 renderActivity();
 maybePopup();
 return activityEvents;
}
function statusLabel(code){
 return ({PENDING_INVENTORY:'ČEKA ODLUKU ZALIHA',APPROVED:'ODOBRENO',REJECTED:'ODBIJENO',
 AI_PLANNED:'POČETNA DODJELA',NO_SAFE_SLOT:'NEMA SIGURNOG TERMINA',
 APPLIED:'PROVEDENO',PENDING_SUPPLIER:'ČEKA DOBAVLJAČA'})[code]||String(code||'ZABILJEŽENO');
}
function slotText(x){
 if(!x)return '—';
 return [x.date||'',x.time||'',x.dock?'R'+x.dock:''].filter(Boolean).join(' · ')||'—';
}
function renderActivity(){
 const host=$('yardonSmartActivity');if(!host)return;
 const pending=activityEvents.filter(x=>x.status==='PENDING_INVENTORY');
 const body='<section class="yaio-card"><div class="yaio-card-head"><div><h3>SMART ZAPIS AKCIJA</h3><small>Svi bitni SMART prijedlozi, dodjele, odluke i vrijeme izvršenja, po dostupnim skladištima.</small></div><span class="yaio-pill">'+activityEvents.length+' zapisa · '+pending.length+' čeka</span></div>'+
 '<div class="ys-activity-list">'+(activityEvents.length?activityEvents.slice(0,150).map(e=>
 '<div class="ys-event"><div><strong>'+esc(e.supplier||e.problemType||'YARD ON SMART')+'</strong> · '+esc(statusLabel(e.status))+
 '<div><small>'+esc(e.reason||'')+'</small></div><div><small>'+esc(slotText(e.old))+' → '+esc(slotText(e.newSlot))+'</small></div>'+
 (e.resolvedBy?'<div><small>Odluka: '+esc(e.resolvedBy)+' · '+esc(e.resolvedAt?new Date(e.resolvedAt).toLocaleString('hr-HR'):'')+'</small></div>':'')+
 '</div><small>'+esc(e.at?new Date(e.at).toLocaleString('hr-HR'):'')+'</small></div>').join(''):'<div class="yaio-empty">Nema SMART aktivnosti. Nova baza je prazna dok se ne unesu najave.</div>')+'</div></section>';
 if(host.innerHTML!==body)host.innerHTML=body;
 const badge=$('yardonSmartPendingBadge');
 if(badge){
  const n=pending.length,v=n?String(n):'0',display=n?'inline-flex':'none';
  if(badge.textContent!==v)badge.textContent=v;
  if(badge.style.display!==display)badge.style.display=display;
 }
}
async function refresh(force=false){
 if(!canView()||loading)return;
 shell();
 const date=$('yaioDate')?.value||localDate(1),warehouse=$('yaioWarehouse')?.value||lastWarehouse||'';
 loading=true;
 const root=$('yaioBody'),state=$('yardonSmartEngineStatus');
 if(state)state.textContent=aiEnabled()?'SMART AKTIVAN · Izračun i prijedlozi prolaze kroz Supabase':'SMART PAUZIRAN · Povijest je dostupna, ali novi planovi se ne izračunavaju.';
 try{
   await loadActivity();
   if(!aiEnabled()){
     snapshot={date,warehouses:[],plan:[],passes:[],decisions:activityEvents,summary:{}};
     if(root)root.innerHTML='<div class="yaio-empty">SMART je trenutno pauziran. Admin ga može uključiti u Master postavkama.</div>';
     return;
   }
   if(root&&force)root.innerHTML='<div class="yaio-loader">YARD ON SMART računa operativni plan…</div>';
   const data=await invoke({action:'snapshot',date,warehouse});
   snapshot=data||{date,warehouses:[],plan:[],passes:[],decisions:[],summary:{}};
   lastWarehouse=warehouse;
   populateWarehouses();
   await loadActivity();
   render();
 }catch(e){
   if(root)root.innerHTML='<div class="yaio-error"><strong>SMART nije učitao plan.</strong><br>'+esc(e?.message||e)+'</div>';
   const u=$('yaioUpdated');if(u)u.textContent='Greška pri učitavanju.';
 }finally{loading=false}
}

async function resolveDecision(id,action){
 if(!id||!['approve','reject'].includes(action))return;
 if(role()!=='inventory')return alert('Samo Zalihe mogu odobriti ili odbiti SMART prijedlog.');
 const approve=action==='approve';
 if(!confirm(approve?'Odobriti predloženu promjenu rampe i termina?':'Odbiti predloženu promjenu?'))return;
 try{
   await invoke({action:approve?'approve_change':'reject_change',decision_id:id});
   await refresh(true);
 }catch(e){alert('SMART zahtjev nije obrađen:\n\n'+String(e?.message||e))}
}

function populateWarehouses(){
 const sel=$('yaioWarehouse');if(!sel||!snapshot)return;
 const keep=lastWarehouse||sel.value||'';
 sel.innerHTML='<option value="">Sva dostupna skladišta</option>'+
  (snapshot.warehouses||[]).map(w=>'<option value="'+esc(w.id)+'">'+esc(w.name||w.id)+'</option>').join('');
 if(keep&&[...sel.options].some(o=>o.value===keep))sel.value=keep;
}

function render(){
 if(!snapshot)return;
 const s=snapshot.summary||{},k=$('yaioKpis');
 if(k)k.innerHTML=[
   ['NAJAVE',s.total??0],
   ['RASPOREĐENE',s.assigned??0],
   ['PARKING RIZIK',s.waiting??0],
   ['BEZ KAPACITETA',s.no_capacity??0],
   ['ISKORIŠTENOST',String(s.utilization_pct??0)+'%']
 ].map(x=>'<div class="yaio-kpi"><small>'+esc(x[0])+'</small><strong>'+esc(x[1])+'</strong></div>').join('');
 const u=$('yaioUpdated');if(u)u.textContent='Izračunato '+new Date(snapshot.generated_at||Date.now()).toLocaleTimeString('hr-HR',{hour:'2-digit',minute:'2-digit'})+' · '+fmtDate(snapshot.date);
 renderTabs();
}

function renderTabs(){
 document.querySelectorAll('#yaioTabs [data-yaio-tab]').forEach(b=>b.classList.toggle('active',b.dataset.yaioTab===activeTab));
 const root=$('yaioBody');if(!root||!snapshot)return;
 if(activeTab==='plan')root.innerHTML=renderPlan();
 else if(activeTab==='live')root.innerHTML=renderLive();
 else if(activeTab==='parking')root.innerHTML=renderParking();
 else root.innerHTML=renderDecisions();
}

function selectedWarehouses(){
 const val=$('yaioWarehouse')?.value||'';
 return (snapshot?.warehouses||[]).filter(w=>!val||String(w.id)===String(val));
}
function rowsFor(w){return (snapshot?.plan||[]).filter(x=>String(x.warehouse)===String(w.id)).sort((a,b)=>String(a.time).localeCompare(String(b.time)))}

function renderRampBoard(w){
 const rows=rowsFor(w),ramps=w.ramps||[];
 if(!ramps.length)return '<div class="yaio-empty">'+esc(w.name||w.id)+' nema aktivno konfiguriranih rampi.</div>';
 const from=Math.min(...ramps.map(r=>mins(r.from)).filter(Number.isFinite));
 const to=Math.max(...ramps.map(r=>mins(r.to)).filter(Number.isFinite));
 if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from)return '<div class="yaio-empty">Radno vrijeme rampi nije potpuno konfigurirano.</div>';
 const marks=[];for(let m=from;m<=to;m+=60)marks.push(`${pad(Math.floor(m/60))}:${pad(m%60)}`);
 let h='<div class="yaio-time-axis"><div></div><div class="yaio-hours">'+marks.map(x=>'<span>'+x+'</span>').join('')+'</div></div><div class="yaio-ramp-board">';
 for(const r of ramps){
   const jobs=rows.filter(x=>Number(x.planned_dock)===Number(r.number));
   h+='<div class="yaio-ramp-row"><div class="yaio-ramp-name">R'+esc(r.number)+'</div><div class="yaio-track">';
   for(const x of jobs){
     const st=mins(x.planned_start),dur=Number(x.duration_minutes||30);
     const left=Math.max(0,Math.min(100,(st-from)/(to-from)*100));
     const width=Math.max(4,Math.min(100-left,dur/(to-from)*100));
     const cls=x.plan_issue==='NO_CAPACITY'?'problem':x.parking_risk?'wait':'';
     h+='<div class="yaio-job '+cls+'" style="left:'+left.toFixed(2)+'%;width:'+width.toFixed(2)+'%" title="'+esc(x.supplier)+' · '+esc(x.planned_start)+'–'+esc(x.planned_end)+'">'+
       '<strong>'+esc(x.supplier)+'</strong><span>'+esc(x.planned_start)+'–'+esc(x.planned_end)+(x.shift_minutes?' · +'+esc(x.shift_minutes)+'m':'')+'</span></div>';
   }
   h+='</div></div>';
 }
 return h+'</div>';
}

function statusPill(x){
 if(x.plan_issue==='NO_CAPACITY'||x.plan_issue==='NO_ACTIVE_RAMPS')return '<span class="yaio-pill bad">NEMA KAPACITETA</span>';
 if(x.parking_risk)return '<span class="yaio-pill warn">ČEKANJE '+esc(x.shift_minutes)+' min</span>';
 return '<span class="yaio-pill ok">PLAN OK</span>';
}

function renderPlan(){
 const ws=selectedWarehouses();
 if(!ws.length)return '<div class="yaio-empty">Nema dostupnih skladišta za ovaj account.</div>';
 return ws.map(w=>{
   const rr=rowsFor(w);
   return '<section class="yaio-card"><div class="yaio-card-head"><div><h3>'+esc(w.name||w.id)+' · '+esc(snapshot.date)+'</h3><small>AI predplan po rampama · dobavljač ne mora koristiti planiranu rampu kao konačnu dodjelu</small></div><span class="yaio-pill">'+rr.length+' najava</span></div>'+
   '<div class="yaio-map-scroll">'+renderRampBoard(w)+'</div>'+
   '<div class="yaio-table-wrap"><table class="yaio-table"><thead><tr><th>TERMIN</th><th>DOBAVLJAČ</th><th>PALETE</th><th>AI RAMPA</th><th>AI START</th><th>PARKING</th><th>STATUS PLANA</th></tr></thead><tbody>'+
   (rr.length?rr.map(x=>'<tr><td><strong>'+esc(x.time||'—')+'</strong></td><td>'+esc(x.supplier)+'</td><td>'+esc(x.pallets||0)+'</td><td>'+(x.planned_dock?'R'+esc(x.planned_dock):'—')+'</td><td>'+esc(x.planned_start||'—')+'–'+esc(x.planned_end||'—')+'</td><td>'+esc(x.predicted_parking||'—')+'</td><td>'+statusPill(x)+'</td></tr>').join(''):'<tr><td colspan="7"><div class="yaio-empty">Nema najava za odabrani datum.</div></td></tr>')+
   '</tbody></table></div></section>';
 }).join('');
}

function passFor(x){
 return (snapshot.passes||[]).find(p=>String(p.announcement_id)===String(x.id)||String(p.supplier_delivery_id||'')===String(x.supplier_delivery_id||''))||null;
}
function liveBusyDock(wh,dock){
 return (snapshot.passes||[]).find(p=>String(p.warehouse)===String(wh)&&dockNum(p.dock)===Number(dock)&&!p.completed_at&&!stateTerminal(p.state))||null;
}
function lateMinutes(x){
 if(snapshot.date!==localDate(0))return 0;
 const p=passFor(x);if(p?.checked_in_at||p?.completed_at)return 0;
 const dt=new Date(x.date+'T'+(x.time||'00:00')+':00');
 if(!Number.isFinite(dt.getTime()))return 0;
 return Math.max(0,Math.floor((Date.now()-dt.getTime())/60000));
}
function recommendations(){
 const out=[];
 for(const x of snapshot.plan||[]){
   const p=passFor(x),late=lateMinutes(x);
   if(x.plan_issue==='NO_CAPACITY'||x.plan_issue==='NO_ACTIVE_RAMPS'){
     out.push({kind:'bad',title:x.supplier+' · nema sigurnog kapaciteta',body:x.time+' · '+warehouseName(x.warehouse)+' · potreban ručni plan.'});
     continue;
   }
   if(late>=15){
     out.push({kind:'warn',title:x.supplier+' kasni '+late+' min',body:'Planiranu rampu R'+(x.planned_dock||'—')+' nemoj držati praznu. Nakon dolaska ponovo dodijeli prvu kompatibilnu slobodnu rampu.'});
   }
   if(x.current_dock&&x.planned_dock&&Number(x.current_dock)!==Number(x.planned_dock)){
     out.push({kind:'',title:x.supplier+' · predplan promjene rampe',body:'Postojeći plan R'+x.current_dock+' → AI predplan R'+x.planned_dock+' u '+x.planned_start+'.'});
   }
   if(x.parking_risk){
     out.push({kind:'warn',title:x.supplier+' · očekivano čekanje',body:'Termin '+x.time+' · '+(x.predicted_parking||'parking queue')+' oko '+x.shift_minutes+' min → R'+(x.planned_dock||'—')+' u '+x.planned_start+'.'});
   }
   if(p?.parking_slot&&x.planned_dock&&!p.completed_at){
     out.push({kind:'',title:x.supplier+' · '+p.parking_slot+' → R'+x.planned_dock,body:'Kamion je evidentiran na parkingu. AI plan ga vodi na R'+x.planned_dock+' prema raspoloživom planu.'});
   }
 }
 return out.slice(0,40);
}

function renderLive(){
 const ws=selectedWarehouses(),recs=recommendations();
 const docks=ws.map(w=>'<section class="yaio-card"><div class="yaio-card-head"><div><h3>'+esc(w.name||w.id)+' · LIVE RAMPE</h3><small>Stvarno stanje iz Gate/Self Gate podataka</small></div></div><div class="yaio-docks">'+
   ((w.ramps||[]).length?(w.ramps||[]).map(r=>{const p=liveBusyDock(w.id,r.number);return '<div class="yaio-dock '+(p?'busy':'free')+'"><strong>R'+esc(r.number)+'</strong><span class="yaio-pill '+(p?'warn':'ok')+'">'+(p?'ZAUZETO':'SLOBODNO')+'</span><small>'+(p?esc(p.supplier_name||p.vehicle_plate||'Kamion')+'<br>'+esc(p.state||'aktivno')+(p.parking_slot?'<br>Parking '+esc(p.parking_slot):''):'Spremna za sljedeću kompatibilnu isporuku')+'</small></div>'}).join(''):'<div class="yaio-empty">Nema aktivnih rampi.</div>')+
   '</div></section>').join('');
 return '<div class="yaio-live-grid"><div>'+docks+'</div><section class="yaio-card"><div class="yaio-card-head"><div><h3>AI PREPORUKE</h3><small>Prebacivanja, kašnjenja i parking → rampa</small></div><span class="yaio-pill">'+recs.length+'</span></div><div class="yaio-recs">'+
  (recs.length?recs.map(r=>'<div class="yaio-rec '+esc(r.kind)+'"><strong>'+esc(r.title)+'</strong><span>'+esc(r.body)+'</span></div>').join(''):'<div class="yaio-empty">Nema aktivnih preporuka za ovaj plan.</div>')+
  '</div></section></div>';
}

function renderParking(){
 const actual=new Map();
 for(const p of snapshot.passes||[]){
   if(p.parking_slot&&!p.completed_at&&!stateTerminal(p.state))actual.set(String(p.parking_slot),p);
 }
 const predicted=new Map();
 for(const x of snapshot.plan||[])if(x.predicted_parking&&!actual.has(x.predicted_parking))predicted.set(String(x.predicted_parking),x);
 const cap=Number(snapshot.parking?.capacity||42),spots=[];
 for(let i=1;i<=cap;i++){
   const k='P'+i,a=actual.get(k),p=predicted.get(k);
   spots.push('<div class="yaio-park '+(a?'occupied':p?'predicted':'')+'"><div><strong>'+k+'</strong><br><small>'+(a?esc(a.supplier_name||a.vehicle_plate||'ZAUZETO'):p?esc(p.supplier)+' · PLAN':'SLOBODNO')+'</small></div></div>');
 }
 const waiters=(snapshot.plan||[]).filter(x=>x.parking_risk);
 return '<section class="yaio-card"><div class="yaio-card-head"><div><h3>PARKING · P1–P'+cap+'</h3><small>Žuto = stvarno zauzeto · plavo = AI predviđeno čekanje</small></div></div>'+
  '<div class="yaio-parking-summary"><span>Kapacitet '+cap+'</span><span>Trenutno zauzeto '+actual.size+'</span><span>Slobodno '+Math.max(0,cap-actual.size)+'</span><span>Predviđeno čekanje '+waiters.length+'</span></div>'+
  '<div class="yaio-parking-grid">'+spots.join('')+'</div></section>'+
  '<section class="yaio-card"><div class="yaio-card-head"><div><h3>PREDVIĐENI PARKING QUEUE</h3><small>Tko bi prema planu mogao čekati prije rampe</small></div></div><div class="yaio-table-wrap"><table class="yaio-table"><thead><tr><th>TERMIN</th><th>DOBAVLJAČ</th><th>PARKING</th><th>ČEKANJE</th><th>NA RAMPU</th></tr></thead><tbody>'+
  (waiters.length?waiters.map(x=>'<tr><td>'+esc(x.time)+'</td><td><strong>'+esc(x.supplier)+'</strong></td><td>'+esc(x.predicted_parking||'QUEUE')+'</td><td>'+esc(x.shift_minutes||0)+' min</td><td>'+(x.planned_dock?'R'+esc(x.planned_dock)+' · '+esc(x.planned_start):'—')+'</td></tr>').join(''):'<tr><td colspan="5"><div class="yaio-empty">Plan trenutno ne predviđa čekanje na parkingu.</div></td></tr>')+
  '</tbody></table></div></section>';
}

function renderDecisions(){
 const ds=activityEvents.slice().sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));
 const canDecide=role()==='inventory';
 return '<section class="yaio-card"><div class="yaio-card-head"><div><h3>YARD ON SMART · PRIJEDLOZI I ODLUKE</h3><small>Zabilježene odluke za odabrani datum: vrijeme, izvršitelj, prethodno i novo stanje te odobrenje. Prijedlog nije isto što i izvršena promjena.</small></div><span class="yaio-pill">'+ds.length+'</span></div><div class="yaio-decisions">'+
 (ds.length?ds.map(x=>{
   const before=x.old?[x.old.date,x.old.time,x.old.dock?'R'+x.old.dock:''].filter(Boolean).join(' '):'—';
   const after=x.newSlot?[x.newSlot.date,x.newSlot.time,x.newSlot.dock?'R'+x.newSlot.dock:''].filter(Boolean).join(' '):'—';
   const pending=String(x.status||'')==='PENDING_INVENTORY';
   const actions=pending&&canDecide?'<div class="yaio-decision-actions"><button class="primary" type="button" data-yaio-decision-action="approve" data-yaio-decision-id="'+esc(x.id||'')+'">ODOBRI</button><button class="secondary" type="button" data-yaio-decision-action="reject" data-yaio-decision-id="'+esc(x.id||'')+'">ODBIJ</button></div>':'';
   return '<div class="yaio-decision"><div><strong>'+esc(x.supplier||'Dobavljač')+'</strong><br><small>'+esc(x.problemType||x.status||'AI')+'</small><br><small>'+esc(x.at?new Date(x.at).toLocaleString('hr-HR'):'Vrijeme nije zabilježeno')+' · '+esc(x.actor||'YARD ON SMART')+'</small></div><div><strong>'+esc(before)+' → '+esc(after)+'</strong><br><small>'+esc(x.reason||'')+'</small>'+(x.resolvedBy?'<br><small>Odluku donio: '+esc(x.resolvedBy)+' · '+esc(x.resolvedAt?new Date(x.resolvedAt).toLocaleString('hr-HR'):'')+'</small>':'')+'</div><div><span class="yaio-pill '+(['NO_SAFE_SLOT','REJECTED'].includes(x.status)?'bad':['PENDING_INVENTORY','PENDING_SUPPLIER'].includes(x.status)?'warn':'ok')+'">'+esc(statusLabel(x.status||'PRIJEDLOG'))+'</span>'+actions+'</div></div>';
 }).join(''):'<div class="yaio-empty">Nema spremljenih SMART prijedloga.</div>')+
 '</div></section>';
}

let popupSeen=new Set();
function maybePopup(){
 if(role()!=='inventory'||!aiEnabled()||document.getElementById('yardonSmartPopup'))return;
 const login=document.getElementById('loginOverlay');
 if(login&&login.getAttribute('aria-hidden')!=='true'&&getComputedStyle(login).display!=='none')return;
 const next=activityEvents.find(x=>x.status==='PENDING_INVENTORY'&&!popupSeen.has(String(x.id)));
 if(!next)return;
 lastPopup=String(next.id);popupSeen.add(lastPopup);
 const overlay=document.createElement('div');overlay.id='yardonSmartPopup';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','SMART prijedlog promjene');
 overlay.innerHTML='<div class="ys-modal"><h2>✦ YARD ON SMART predlaže promjenu</h2><p><strong>'+esc(next.supplier||'Dobavljač')+'</strong> · '+esc(next.warehouse||'')+'</p>'+
 '<div class="ys-reason"><strong>Razlog:</strong> '+esc(next.reason||'Promjena rasporeda zbog kapaciteta.')+'</div>'+
 '<div class="ys-slots"><div><small>POSTOJEĆI TERMIN</small><p><strong>'+esc(slotText(next.old))+'</strong></p></div><div><small>PREDLOŽENI TERMIN</small><p><strong>'+esc(slotText(next.newSlot))+'</strong></p></div></div>'+
 '<p><small>Prijedlog u '+esc(next.at?new Date(next.at).toLocaleString('hr-HR'):'')+'. Bez tvoje potvrde raspored ostaje nepromijenjen.</small></p>'+
 '<div class="ys-actions"><button type="button" data-smart-popup="later">Kasnije</button><button class="secondary" type="button" data-smart-popup="reject">Odbij</button><button class="primary" type="button" data-smart-popup="approve">Odobri promjenu</button></div></div>';
 document.body.appendChild(overlay);
 overlay.querySelectorAll('[data-smart-popup]').forEach(btn=>btn.addEventListener('click',async()=>{
  const choice=btn.dataset.smartPopup;
  if(choice==='later'){overlay.remove();return}
  overlay.querySelectorAll('button').forEach(x=>x.disabled=true);
  try{
   await invoke({action:choice==='approve'?'approve_change':'reject_change',decision_id:lastPopup});
   overlay.remove();
   await loadActivity();
   if($('smartReplanning')?.classList.contains('active'))await refresh(true);
  }catch(e){
   alert('SMART odluka nije spremljena: '+String(e?.message||e));
   overlay.querySelectorAll('button').forEach(x=>x.disabled=false);
  }
 }));
}
async function backgroundSmart(){
 if(backgroundBusy||!canView()||!aiEnabled()||document.visibilityState==='hidden')return;
 backgroundBusy=true;
 try{
   // Both dates are checked. The server deduplicates pending proposals.
   for(const date of [localDate(0),localDate(1)]){
     await invoke({action:'snapshot',date});
   }
   await loadActivity();
   if($('smartReplanning')?.classList.contains('active')&&!loading)await refresh(false);
 }catch(e){console.warn('YARD ON SMART background plan',String(e?.message||e))}
 finally{backgroundBusy=false}
}

let currentRequestPreview=null,reviewBusy=false;
function previewTarget(){
 const p=currentRequestPreview;
 return p?.candidate?{date:p.date,warehouse:p.warehouse,dock:p.candidate.dock,time:p.candidate.time}:null;
}
function clearRequestPreview(){
 currentRequestPreview=null;
 const panel=$('yardonSmartRequestReview');if(panel)panel.remove();
 try{window.renderDailyMap?.()}catch(_){}
}
function proposalCell(){
 const x=previewTarget();if(!x)return null;
 return [...document.querySelectorAll('#dailyMapBoard .dmv-cell')].find(el=>
  String(el.dataset.moveDate||'')===String(x.date)&&
  String(el.dataset.moveWarehouse||'')===String(x.warehouse)&&
  Number(el.dataset.moveDock)===Number(x.dock)&&
  String(el.dataset.moveTime||'')===String(x.time))||null;
}
function confirmablePreview(){
 const cell=proposalCell();
 return !!cell&&!cell.classList.contains('dmv-booked')&&!cell.classList.contains('dmv-blocked');
}
function showRequestPanel(preview,message=''){
 const board=$('dailyMapBoard');if(!board)return;
 let panel=$('yardonSmartRequestReview');
 if(!panel){panel=document.createElement('section');panel.id='yardonSmartRequestReview';panel.setAttribute('aria-live','polite');board.parentNode.insertBefore(panel,board)}
 const c=preview.candidate,canConfirm=!!c&&confirmablePreview();
 panel.innerHTML='<div class="ys-review-heading"><span class="ys-review-star">✦</span><div><strong>YARD ON SMART · PRIJEDLOG RAMPE</strong><small>'+esc(preview.supplier||'Dobavljač')+' · '+esc(preview.date)+' · '+esc(preview.time)+'</small></div><span class="ys-review-mode">NIJE KONAČNA DODJELA</span></div>'+
 '<div class="ys-review-summary">'+(c?'<div><small>Predložena rampa</small><strong>R'+esc(c.dock)+'</strong></div><div><small>Predloženi termin</small><strong>'+esc(c.time)+'–'+esc(c.end)+'</strong></div>':'<strong>NEMA SIGURNOG SLOBODNOG OKVIRA</strong>')+
 '<p>'+esc(preview.reason||'')+'</p></div>'+
 (message?'<p class="ys-review-warning">'+esc(message)+'</p>':'')+
 '<div class="ys-review-actions"><button type="button" data-smart-request="cancel">ZATVORI PREGLED</button>'+
 '<button type="button" data-smart-request="reject">ODBIJ ZAHTJEV</button>'+
 '<button type="button" class="primary" data-smart-request="approve" '+(canConfirm?'':'disabled')+'>✓ POTVRDI NAJAVU I POŠALJI QR</button></div>'+
 '<small>Rampa je predviđena prema trenutačnoj zauzetosti. Stvarna rampa može se promijeniti na dan isporuke. Potvrda ne rezervira fizičku rampu.</small>';
}
async function previewRequest(id){
 if(!['inventory','admin'].includes(role()))return;
 if(reviewBusy)return;
 reviewBusy=true;
 try{
  const preview=await invoke({action:'preview_request',delivery_id:String(id)});
  currentRequestPreview=preview;
  const nav=document.querySelector('.nav-btn[data-view="dailyMap"]');
  const home=document.querySelector('[data-home-target="dailyMap"]');
  if(nav)nav.click();else home?.click();
  const date=$('dailyMapDate'),warehouse=$('dailyMapWarehouseSelect');
  if(date)date.value=preview.date;
  if(warehouse){
   const option=[...warehouse.options].find(o=>o.value===String(preview.warehouse));
   if(option)warehouse.value=option.value;
  }
  window.renderDailyMap?.();
  showRequestPanel(preview);
  if(preview.candidate&&!confirmablePreview())
   showRequestPanel(preview,'Dnevna mapa ne potvrđuje da je predloženi okvir slobodan. Provjeri skladište i osvježi prijedlog.');
  $('yardonSmartRequestReview')?.scrollIntoView({behavior:'smooth',block:'center'});
 }catch(e){alert('SMART pregled nije moguć: '+String(e?.message||e))}
 finally{reviewBusy=false}
}
async function resolveRequestReview(choice){
 const p=currentRequestPreview;if(!p||reviewBusy)return;
 if(choice==='cancel'){clearRequestPreview();return}
 if(!['approve','reject'].includes(choice))return;
 if(!['inventory','admin'].includes(role()))return;
 reviewBusy=true;
 const panel=$('yardonSmartRequestReview');
 panel?.querySelectorAll('button').forEach(el=>el.disabled=true);
 try{
  if(choice==='approve'){
   if(!p.candidate||!confirmablePreview())throw new Error('Predložena rampa nije slobodna u Dnevnoj mapi.');
   const latest=await invoke({action:'preview_request',delivery_id:p.id});
   if(!latest.candidate||latest.date!==p.date||latest.warehouse!==p.warehouse||
      latest.candidate.dock!==p.candidate.dock||latest.candidate.time!==p.candidate.time)
    throw new Error('Zauzetost ili preporuka se promijenila. Ponovno otvori SMART pregled.');
   if(!window.confirm('Potvrditi dobavljačev zahtjev za '+p.date+' u '+p.time+'? R'+p.candidate.dock+' je samo predviđena rampa. QR će se poslati dobavljaču.'))return;
   await window.YardivoSupplierLiveSync.call('internal_update',{
    id:p.id,status:'confirmed',dock:null,smart_preview_ramp:Number(p.candidate.dock)
   });
   let qrOk=false,qrError='';
   try{
    if(!window.YardivoGateQrV583?.issueAfterSmartApproval)throw new Error('QR servis nije spreman.');
    await window.YardivoGateQrV583.issueAfterSmartApproval(p.id);
    qrOk=true;
   }catch(e){qrError=String(e?.message||e)}
   try{await invoke({action:'record_request_review',delivery_id:p.id,decision:'confirmed'})}catch(e){console.warn('SMART audit',e)}
   clearRequestPreview();
   await window.YardivoSupplierLiveSync?.pullInternal?.(true);
   if(!qrOk)alert('Najava je POTVRĐENA, ali QR nije poslan: '+qrError+'. Otvori Najave dobavljača i pošalji QR iz potvrđene najave.');
   else alert('Najava je potvrđena. QR je poslan dobavljaču. Predviđena rampa R'+p.candidate.dock+' može se promijeniti.');
  }else{
   const reason=window.prompt('Razlog odbijanja zahtjeva:','');
   if(reason===null)return;
   if(!reason.trim())throw new Error('Razlog odbijanja je obavezan.');
   if(!window.confirm('Odbiti dobavljačevu najavu?'))return;
   await window.YardivoSupplierLiveSync.call('internal_update',{id:p.id,status:'rejected',review_note:reason.trim()});
   try{await invoke({action:'record_request_review',delivery_id:p.id,decision:'rejected'})}catch(e){console.warn('SMART audit',e)}
   clearRequestPreview();
   await window.YardivoSupplierLiveSync?.pullInternal?.(true);
  }
  void loadActivity();
 }catch(e){alert('SMART odluka nije provedena: '+String(e?.message||e));if(currentRequestPreview)showRequestPanel(currentRequestPreview)}
 finally{reviewBusy=false;panel?.querySelectorAll('button').forEach(el=>el.disabled=false)}
}
document.addEventListener('click',e=>{
 const action=e.target.closest?.('[data-smart-request]');
 if(action){
  e.preventDefault();e.stopPropagation();
  void resolveRequestReview(action.dataset.smartRequest);return;
 }
 const b=e.target.closest?.('[data-yv-smart-preview]');
 if(b&&['inventory','admin'].includes(role())){
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  void previewRequest(b.dataset.yvSmartPreview);return;
 }
},true);

document.addEventListener('DOMContentLoaded',()=>{applyVisibility();shell()},{once:true});
window.addEventListener('load',()=>{applyVisibility();shell();if($('smartReplanning')?.classList.contains('active'))void refresh(false);void backgroundSmart()},{once:true});
window.addEventListener('yardivo:login',()=>{popupSeen.clear();activityEvents=[];setTimeout(()=>void backgroundSmart(),1500)});
window.addEventListener('yardivo:ai-admin-config',()=>{snapshot=null;applyVisibility();if($('smartReplanning')?.classList.contains('active'))void refresh(true)});
window.addEventListener('storage',e=>{if(e.key==='yardivo_auto_replan_cfg_v1'){snapshot=null;setTimeout(()=>{applyVisibility();if($('smartReplanning')?.classList.contains('active'))void refresh(true)},10)}});
setTimeout(shell,250);
setInterval(()=>{void backgroundSmart()},60000);
window.YardivoSmartReplanning={scanNow:()=>backgroundSmart(),render:render,logs:()=>activityEvents,applyState:()=>{applyVisibility();void backgroundSmart()}};
window.YardOnSmartCenter={refresh:()=>refresh(true),render,activity:()=>activityEvents,enabled:aiEnabled,previewRequest,previewTarget,clearRequestPreview};
})();
