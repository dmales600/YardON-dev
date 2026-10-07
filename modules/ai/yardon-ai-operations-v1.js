(()=>{'use strict';
if(window.__YARDON_AI_OPERATIONS_V1__)return;
window.__YARDON_AI_OPERATIONS_V1__=true;

const $=id=>document.getElementById(id);
let snapshot=null,activeTab='plan',loading=false,lastWarehouse='';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const role=()=>{let r=String(window.currentSession?.role||window.currentSession?.app_role||'').toLowerCase().trim();if(r==='zalihe'||r.includes('zalih'))r='inventory';if(r==='prijam')r='reception';if(r==='voditelj'||r==='management')r='manager';return r};
function aiEnabled(){
 try{
  if(window.YardOnAIAdminV1?.aiControlEnabled)return window.YardOnAIAdminV1.aiControlEnabled();
  const c=JSON.parse(localStorage.getItem('yardivo_auto_replan_cfg_v1')||'{}')||{};
  return c.enabled===true&&String(c.mode||'').toUpperCase()!=='PAUSED';
 }catch(_){return false}
}
const canView=()=>aiEnabled()&&['admin','manager','inventory','reception'].includes(role());
function applyVisibility(){
 const visible=canView();
 const nav=document.querySelector('.nav-btn[data-view="aiOperations"]');
 const home=document.querySelector('[data-home-target="aiOperations"]');
 for(const el of [nav,home])if(el){
  el.hidden=!visible;
  el.classList.toggle('role-hidden',!visible);
  if(visible)el.style.removeProperty('display');else el.style.setProperty('display','none','important');
 }
 const view=$('aiOperations');
 if(view&&!visible){
  view.classList.remove('active','manager-force-active');
  view.hidden=true;view.style.setProperty('display','none','important');
  if(document.querySelector('.view.active')===null)try{window.openAppView?.('homeMenu')}catch(_){}
 }else if(view&&visible){view.hidden=false;view.style.removeProperty('display')}
 return visible;
}
const pad=n=>String(n).padStart(2,'0');
function localDate(add=0){const d=new Date();d.setDate(d.getDate()+add);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function mins(v){const m=String(v||'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):NaN}
function fmtDate(v){if(!v)return'—';try{return new Intl.DateTimeFormat('hr-HR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(v+'T12:00:00'))}catch(_){return v}}
function stateTerminal(v){return ['COMPLETED','REJECTED','CANCELLED','CANCELED','REVOKED'].includes(String(v||'').toUpperCase())}
function dockNum(v){const n=Number(String(v||'').replace(/\D/g,''));return Number.isFinite(n)&&n>0?n:null}
function warehouseName(id){return snapshot?.warehouses?.find(w=>String(w.id)===String(id))?.name||id||'—'}

async function invoke(body){
 if(!aiEnabled())throw new Error('AI upravljanje YardOnom je isključeno od strane Admina.');
 const c=await window.YardivoAuth?.client?.();
 if(!c)throw new Error('Online prijava nije spremna.');
 const {data,error}=await c.functions.invoke('yardivo-ai-operations',{body});
 if(error)throw error;
 if(data?.ok===false)throw new Error(data.error||'AI Operations nije dostupan.');
 return data?.data??data;
}

function shell(){
 if(!applyVisibility())return;
 const root=$('aiOperations');if(!root)return;
 if(!$('yaioDate'))$('yaioControls').innerHTML=`
   <label>DATUM<input id="yaioDate" type="date"></label>
   <label>SKLADIŠTE<select id="yaioWarehouse"><option value="">Sva dostupna skladišta</option></select></label>
   <button class="primary" id="yaioRefresh" type="button">✦ IZRAČUNAJ PLAN</button>
   <span class="yaio-updated" id="yaioUpdated">Plan još nije izračunat.</span>`;
 if(!$('yaioTabs').children.length)$('yaioTabs').innerHTML=`
   <button class="yaio-tab active" data-yaio-tab="plan" type="button">PLAN PO RAMPAMA</button>
   <button class="yaio-tab" data-yaio-tab="live" type="button">LIVE DANAS</button>
   <button class="yaio-tab" data-yaio-tab="parking" type="button">PARKING & QUEUE</button>
   <button class="yaio-tab" data-yaio-tab="decisions" type="button">AI ODLUKE</button>`;
 if(!$('yaioDate').value)$('yaioDate').value=localDate(1);
 bind();
}

let bound=false;
function bind(){
 if(bound)return;bound=true;
 document.addEventListener('click',e=>{
   const tab=e.target.closest?.('[data-yaio-tab]');
   if(tab){activeTab=tab.dataset.yaioTab||'plan';renderTabs();return}
   if(e.target.closest?.('#yaioRefresh')){void refresh(true);return}
 },true);
 document.addEventListener('change',e=>{
   if(e.target?.id==='yaioWarehouse'){lastWarehouse=e.target.value||'';void refresh(true)}
   if(e.target?.id==='yaioDate')void refresh(true);
 },true);
 window.addEventListener('yardivo:view-opened',e=>{
   if(e.detail?.view==='aiOperations'){
     setTitle();
     shell();
     if(!snapshot)void refresh(false);else render();
   }
 });
 window.addEventListener('yardivo:login',()=>{snapshot=null;setTimeout(()=>{if($('aiOperations')?.classList.contains('active'))void refresh(false)},120)});
 window.addEventListener('yardivo:data-synced',()=>{if($('aiOperations')?.classList.contains('active'))setTimeout(()=>void refresh(false),100)});
}

function setTitle(){
 const t=$('pageTitle');if(t)t.textContent='AI Operations';
}

async function refresh(force=false){
 if(!applyVisibility()||loading)return;
 shell();
 const date=$('yaioDate')?.value||localDate(1);
 const warehouse=$('yaioWarehouse')?.value||lastWarehouse||'';
 loading=true;
 const root=$('yaioBody');if(root)root.innerHTML='<div class="yaio-loader">AI Operations učitava operativne podatke i računa plan…</div>';
 try{
   const data=await invoke({action:'snapshot',date,warehouse});
   snapshot=data||{date,warehouses:[],plan:[],passes:[],decisions:[],summary:{}};
   lastWarehouse=warehouse;
   populateWarehouses();
   render();
 }catch(e){
   snapshot=null;
   if(root)root.innerHTML='<div class="yaio-error"><strong>AI Operations nije uspio učitati plan.</strong><br>'+esc(e?.message||e)+'</div>';
   const u=$('yaioUpdated');if(u)u.textContent='Greška pri učitavanju.';
 }finally{loading=false}
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
 const ds=(snapshot.decisions||[]).slice().sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));
 return '<section class="yaio-card"><div class="yaio-card-head"><div><h3>AI ODLUKE I REPLAN</h3><small>Povijest Smart preporuka za odabrani datum</small></div><span class="yaio-pill">'+ds.length+'</span></div><div class="yaio-decisions">'+
 (ds.length?ds.map(x=>{
   const before=x.old?[x.old.date,x.old.time,x.old.dock?'R'+x.old.dock:''].filter(Boolean).join(' '):'—';
   const after=x.newSlot?[x.newSlot.date,x.newSlot.time,x.newSlot.dock?'R'+x.newSlot.dock:''].filter(Boolean).join(' '):'—';
   return '<div class="yaio-decision"><div><strong>'+esc(x.supplier||'Dobavljač')+'</strong><br><small>'+esc(x.problemType||x.status||'AI')+'</small></div><div><strong>'+esc(before)+' → '+esc(after)+'</strong><br><small>'+esc(x.reason||'')+'</small></div><span class="yaio-pill '+(['NO_SAFE_SLOT'].includes(x.status)?'bad':['PENDING_INVENTORY','PENDING_SUPPLIER'].includes(x.status)?'warn':'ok')+'">'+esc(x.status||'PRIJEDLOG')+'</span></div>';
 }).join(''):'<div class="yaio-empty">Nema spremljenih AI odluka za ovaj datum.</div>')+
 '</div></section>';
}

document.addEventListener('DOMContentLoaded',()=>{applyVisibility();shell();},{once:true});
window.addEventListener('load',()=>{applyVisibility();shell();if($('aiOperations')?.classList.contains('active'))void refresh(false)},{once:true});
window.addEventListener('yardivo:ai-admin-config',()=>{snapshot=null;applyVisibility();if(aiEnabled()&&$('aiOperations')?.classList.contains('active'))void refresh(true)});
window.addEventListener('storage',e=>{if(e.key==='yardivo_auto_replan_cfg_v1'){snapshot=null;setTimeout(()=>{applyVisibility();if(aiEnabled()&&$('aiOperations')?.classList.contains('active'))void refresh(true)},10)}});
setTimeout(shell,250);
window.YardOnAIOperations={refresh:()=>refresh(true),render:render,recommendations,applyVisibility,enabled:aiEnabled};
})();