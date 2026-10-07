
(function(){
'use strict';
let plannerRow=null, plannerDate='', calCursor=null, refreshing=false, lastRows=[], lastFingerprint='', plannerDurationCache=60, plannerOccupancyCache=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MONTH_NAMES=['Siječanj','Veljača','Ožujak','Travanj','Svibanj','Lipanj','Srpanj','Kolovoz','Rujan','Listopad','Studeni','Prosinac'];
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function human(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v||''))return '—';const [y,m,d]=v.split('-');return `${d}.${m}.${y}.`}
function stableId(serverId){const s=String(serverId||'');let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return 700000000+(Math.abs(h>>>0)%199999999)}
function dockNumber(v){const m=String(v??'').match(/\d+/);return m?Number(m[0]):0}
function normalizeTime(v){const m=String(v??'').match(/^(\d{1,2}):(\d{2})/);return m?String(m[1]).padStart(2,'0')+':'+m[2]:''}
function rowsFingerprint(rows){return JSON.stringify((rows||[]).map(x=>[x.id,x.client_id,x.status,x.delivery_date,x.requested_time,x.dock,x.updated_at,x.pallets,x.sku_count,x.vehicle_plate,x.driver_name,x.review_note]))}
function ensureModal(){
 if(document.getElementById('ysrPlannerOverlay'))return;
 const o=document.createElement('div');o.id='ysrPlannerOverlay';o.innerHTML=`<div id="ysrPlanner"><div class="ysrp-head"><div><h2>YARDIVO · PRIJEDLOG TERMINA</h2><p>Upravljanje zalihama · odabir datuma i termina prema kapacitetu skladišta</p></div><button class="ysrp-close" type="button" data-ysrp-close>×</button></div><div class="ysrp-body"><div class="ysrp-card"><h3>ZAHTJEV DOBAVLJAČA</h3><div id="ysrpFacts"></div></div><div class="ysrp-card"><h3>PLANIRANJE TERMINA</h3><div id="ysrpCalendar" class="ysrp-calendar"></div><div id="ysrpRecommendation" class="ysrp-recommend"></div><div class="ysrp-fields"><div class="ysrp-field"><label>TERMIN</label><select id="ysrpTime"></select></div><select id="ysrpDock" hidden aria-hidden="true" tabindex="-1" style="display:none!important"></select></div><div id="ysrpCheck" class="ysrp-check">Odaberi datum za provjeru kapaciteta.</div></div></div><div class="ysrp-actions"><button class="danger" type="button" data-ysrp-reject>ODBIJ ZAHTJEV</button><button class="wanted" type="button" data-ysrp-wanted>PRIHVATI ŽELJENI DATUM</button><button class="primary" type="button" data-ysrp-send>POŠALJI PRIJEDLOG DOBAVLJAČU</button></div></div>`;
 document.body.appendChild(o);
 o.addEventListener('click',async e=>{
   e.stopPropagation();
   if(e.target===o||e.target.closest('[data-ysrp-close]'))closePlanner();
   const d=e.target.closest('[data-ysrp-day]');if(d&&!d.disabled){plannerDate=d.dataset.ysrpDay;plannerOccupancyCache=null;calCursor=new Date(plannerDate+'T12:00:00');drawCalendar();requestAnimationFrame(()=>refreshPlanner());}
   if(e.target.closest('[data-ysrp-prev]')){calCursor=new Date(calCursor.getFullYear(),calCursor.getMonth()-1,1);drawCalendar();}
   if(e.target.closest('[data-ysrp-next]')){calCursor=new Date(calCursor.getFullYear(),calCursor.getMonth()+1,1);drawCalendar();}
   if(e.target.closest('[data-ysrp-wanted]')){plannerDate=plannerRow?.delivery_date||plannerDate;plannerOccupancyCache=null;calCursor=new Date(plannerDate+'T12:00:00');drawCalendar();requestAnimationFrame(()=>refreshPlanner(true));}
   if(e.target.closest('[data-ysrp-send]'))await sendProposal();
   if(e.target.closest('[data-ysrp-reject]'))await rejectPlanner();
 });
 let plannerChoiceRaf=0;
 function plannerChoiceChanged(e){
   // Planner controls are self-contained. Do not bubble into legacy global change handlers.
   e.stopPropagation();
   cancelAnimationFrame(plannerChoiceRaf);
   plannerChoiceRaf=requestAnimationFrame(()=>{plannerChoiceRaf=0;checkChoice()});
 }
 o.querySelector('#ysrpTime').addEventListener('change',plannerChoiceChanged);
 /* #ysrpDock is an internal compatibility node only. Inventory never selects a physical ramp. */
}
function facts(x){return `<div class="ysrp-facts"><div class="ysrp-fact"><small>DOBAVLJAČ</small><strong>${esc(x.supplier_name||x.supplier_username||'—')}</strong></div><div class="ysrp-fact"><small>SKLADIŠTE</small><strong>${esc(supplierWarehouseNameV583(x.warehouse))}</strong></div><div class="ysrp-fact"><small>PALETE</small><strong>${Number(x.pallets||0)}</strong></div><div class="ysrp-fact"><small>SKU</small><strong>${Number(x.sku_count||0)}</strong></div></div><div class="ysrp-wanted"><small>ŽELJENI DATUM DOBAVLJAČA</small><strong>${human(x.delivery_date)}</strong></div>`}
function openPlanner(x){
 ensureModal();
 plannerRow=x;
 plannerDate=x.delivery_date||iso(new Date());
 plannerDurationCache=computePlannerDuration();
 plannerOccupancyCache=null;
 calCursor=new Date(plannerDate+'T12:00:00');
 document.getElementById('ysrpFacts').innerHTML=facts(x);
 drawCalendar();
 /* Paint modal first; calculate slots after the opening frame so opening is instant. */
 document.getElementById('ysrPlannerOverlay').classList.add('open');
 const box=document.getElementById('ysrpRecommendation');
 if(box){box.className='ysrp-recommend';box.innerHTML='<small>YARDIVO PLANER</small><strong>Provjera slobodnih termina…</strong><p>Analiza raspoloživog kapaciteta skladišta.</p>'}
 requestAnimationFrame(()=>requestAnimationFrame(()=>{if(plannerRow)refreshPlanner()}));
}
function closePlanner(){document.getElementById('ysrPlannerOverlay')?.classList.remove('open');plannerRow=null;plannerOccupancyCache=null}
function drawCalendar(){const h=document.getElementById('ysrpCalendar');if(!h||!calCursor)return;const y=calCursor.getFullYear(),m=calCursor.getMonth(),first=new Date(y,m,1),offset=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate(),today=new Date();today.setHours(0,0,0,0);let grid='';for(let i=0;i<offset;i++)grid+='<div class="ysrp-empty"></div>';for(let n=1;n<=days;n++){const d=new Date(y,m,n),v=iso(d),past=d<today;grid+=`<button type="button" class="ysrp-day ${v===plannerDate?'sel ':''}${v===plannerRow?.delivery_date?'wanted':''}" data-ysrp-day="${v}" ${past?'disabled':''}>${n}</button>`}h.innerHTML=`<div class="ysrp-cal-head"><button type="button" data-ysrp-prev>‹</button><strong>${MONTH_NAMES[m]} ${y}</strong><button type="button" data-ysrp-next>›</button></div><div class="ysrp-week">${['PO','UT','SR','ČE','PE','SU','NE'].map(x=>`<span>${x}</span>`).join('')}</div><div class="ysrp-grid">${grid}</div>`}
function whConfig(){try{return (typeof WAREHOUSES!=='undefined'?WAREHOUSES:window.WAREHOUSES)?.[plannerRow?.warehouse]}catch(_){return null}}
function duration(){return Math.max(15,Number(plannerDurationCache)||60)}
function computePlannerDuration(){
  try{
    const pallets=Number(plannerRow?.pallets||0);
    if(typeof historicalUnloadDuration==='function'){
      const h=historicalUnloadDuration(String(plannerRow?.supplier_name||plannerRow?.supplier_username||''),pallets);
      return Math.max(15,Number(h?.duration)||60);
    }
    if(typeof baseUnloadDuration==='function')return Math.max(15,Number(baseUnloadDuration(pallets))||60);
  }catch(_){}
  return 60;
}
function rebuildPlannerOccupancy(){
  const wh=String(plannerRow?.warehouse||yardivoCanonicalWarehouseV583());
  const date=String(plannerDate||'');
  const rows=[];
  try{
    for(const a of (Array.isArray(announcements)?announcements:[])){
      if((a.warehouse||yardivoCanonicalWarehouseV583())!==wh||a.date!==date)continue;
      const start=typeof toMin==='function'?toMin(a.time):0;
      const dur=Math.max(15,Number(a.duration)||60);
      rows.push({dock:Number(a.dock)||0,start:Number(start)||0,duration:dur,pallets:Number(a.pallets)||0});
    }
  }catch(_){}
  plannerOccupancyCache={wh,date,rows};
  return plannerOccupancyCache;
}
function plannerCache(){
  if(!plannerOccupancyCache||plannerOccupancyCache.wh!==String(plannerRow?.warehouse||yardivoCanonicalWarehouseV583())||plannerOccupancyCache.date!==String(plannerDate||'')){
    return rebuildPlannerOccupancy();
  }
  return plannerOccupancyCache;
}
function plannerFree(dock,start,dur){
  const c=plannerCache(),w=whConfig();
  if(!w)return false;
  let ws=480,we=960;
  try{if(w.receptionStart&&typeof toMin==='function')ws=toMin(w.receptionStart);if(w.receptionEnd&&typeof toMin==='function')we=toMin(w.receptionEnd)}catch(_){}
  if(start<ws||start+dur>we)return false;
  try{if(typeof isRampBlocked==='function'&&isRampBlocked(c.wh,c.date,dock,start,dur))return false}catch(_){}
  for(const a of c.rows){
    if(a.dock!==Number(dock))continue;
    if(start<a.start+a.duration && a.start<start+dur)return false;
  }
  return true;
}
function recommendation(){
  try{
    const w=whConfig();if(!w?.ramps)return null;
    let ws=480,we=960;
    if(w.receptionStart&&typeof toMin==='function')ws=toMin(w.receptionStart);
    if(w.receptionEnd&&typeof toMin==='function')we=toMin(w.receptionEnd);
    const dur=duration(),c=plannerCache();
    let best=null;
    const rampLoads=new Map();
    for(const a of c.rows)rampLoads.set(a.dock,(rampLoads.get(a.dock)||0)+a.duration);
    for(let start=ws;start+dur<=we;start+=15){
      let warehouseLoad=0;
      for(const a of c.rows)if(start<a.start+a.duration&&a.start<start+dur)warehouseLoad+=a.pallets;
      for(let dock=1;dock<=Number(w.ramps);dock++){
        try{if(window.YardivoRampConfig?.isLocked?.(c.wh,dock))continue}catch(_){}
        if(!plannerFree(dock,start,dur))continue;
        const rampLoad=rampLoads.get(dock)||0;
        const score=((start-ws)*1.6)+(warehouseLoad*1.0)+(rampLoad*.12);
        if(!best||score<best.score)best={dock,start,time:(typeof hhmm==='function'?hhmm(start):String(Math.floor(start/60)).padStart(2,'0')+':'+String(start%60).padStart(2,'0')),warehouseLoad,rampLoad,score};
      }
    }
    return best;
  }catch(e){console.warn('YARDIVO planner recommendation',e);return null}
}
function populate(rec,forceRec){const w=whConfig(),t=document.getElementById('ysrpTime'),d=document.getElementById('ysrpDock');if(!t||!d)return;const oldT=forceRec?'':t.value;let start=480,end=960;try{if(w?.receptionStart&&typeof toMin==='function')start=toMin(w.receptionStart);if(w?.receptionEnd&&typeof toMin==='function')end=toMin(w.receptionEnd)}catch(_){}t.innerHTML=Array.from({length:Math.max(1,Math.ceil((end-start)/15))},(_,i)=>{const mins=start+i*15,hh=String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');return `<option value="${hh}">${hh}</option>`}).join('');d.innerHTML=rec?`<option value="${rec.dock}">${rec.dock}</option>`:'';d.hidden=true;d.setAttribute('aria-hidden','true');d.style.setProperty('display','none','important');if(rec)t.value=rec.time;else if([...t.options].some(o=>o.value===oldT))t.value=oldT}
function refreshPlanner(forceRec=false){const box=document.getElementById('ysrpRecommendation'),rec=recommendation();populate(rec,forceRec);if(rec){box.className='ysrp-recommend';box.innerHTML=`<small>✓ PREPORUKA YARDIVO</small><strong>${human(plannerDate)} · ${esc(rec.time)}</strong><p>Procjena istovara ${duration()} min. Kapacitet se provjerava interno; fizičku rampu YardOn dodjeljuje tek pri dolasku.</p>`}else{box.className='ysrp-recommend bad';box.innerHTML=`<small>NEMA AUTOMATSKE PREPORUKE</small><strong>${human(plannerDate)}</strong><p>Za ovaj datum nema slobodnog termina u kapacitetu skladišta.</p>`}checkChoice()}
function capacityDockForTime(time){const w=whConfig(),start=typeof toMin==='function'?toMin(time):0;if(!w?.ramps||!time)return 0;for(let dock=1;dock<=Number(w.ramps);dock++){try{if(window.YardivoRampConfig?.isLocked?.(String(plannerRow?.warehouse||''),dock))continue}catch(_){}if(plannerFree(dock,start,duration()))return dock}return 0}
function checkChoice(){const time=document.getElementById('ysrpTime')?.value,c=document.getElementById('ysrpCheck');if(!c)return false;if(!plannerDate||!time){c.className='ysrp-check bad';c.textContent='Odaberi datum i termin.';return false}const capacityDock=capacityDockForTime(time),free=capacityDock>0;c.className='ysrp-check '+(free?'good':'bad');c.textContent=free?`✓ DOBAR ODABIR · Termin ${time} ima raspoloživ kapacitet.`:`⚠ TERMIN JE POPUNJEN · Odaberi drugi termin ili YARDIVO preporuku.`;return free}
async function sendProposal(){if(!plannerRow||!checkChoice())return;const time=document.getElementById('ysrpTime').value,id=plannerRow.id;try{const actor=window.YardivoRescheduleAudit?.actorLabel?.()||'Upravljanje zalihama';await window.YardivoSupplierLiveSync.call('internal_update',{id,delivery_date:plannerDate,requested_time:time,dock:null,proposed_dock:null,planned_dock:null,status:'proposal_sent',review_note:`Promjenu termina inicirao: ${actor}. Dobavljač treba prihvatiti ili zatražiti drugi termin. Rampa se dodjeljuje pri dolasku.`});try{window.YardivoTermProvenance?.record?.({supplierDeliveryId:id,supplier:plannerRow.supplier_name||plannerRow.supplier_username||'',warehouse:plannerRow.warehouse||'',initiatedByType:'INVENTORY',initiatedBy:actor,approvedBy:actor,status:'PENDING_SUPPLIER',before:{date:plannerRow.delivery_date||'',time:String(plannerRow.requested_time||'').slice(0,5),dock:plannerRow.dock||''},after:{date:plannerDate,time,dock:''},reason:'Promjenu termina predložilo Upravljanje zalihama',responsibility:'WAREHOUSE'})}catch(_){}closePlanner();await quietLoad(false);try{window.dispatchEvent(new CustomEvent('yardivo:supplier-request-updated',{detail:{id}}))}catch(_){}}catch(e){alert('Prijedlog nije poslan:\n'+errorText(e))}}

async function approveSupplierRequest(id){
  const x=lastRows.find(r=>String(r.id)===String(id));
  if(!x)return alert('Supplier najava nije pronađena.');
  if(String(x.status||'').toLowerCase()!=='pending')return alert('Samo nova Supplier najava koja čeka potvrdu može se izravno odobriti.');
  const d=String(x.delivery_date||''),t=normalizeTime(x.requested_time);
  if(!d||!t)return alert('Najava nema potpun datum ili termin. Odaberi PREDLOŽI DRUGI TERMIN.');
  if(!confirm(`Odobriti najavu?\n\n${x.supplier_name||x.supplier_username||'Dobavljač'}\n${human(d)} · ${t}\n${Number(x.pallets||0)} pal. · ${Number(x.sku_count||0)} SKU\n\nRampa se dodjeljuje tek pri dolasku.`))return;
  const actor=window.YardivoRescheduleAudit?.actorLabel?.()||String((window.currentSession||{}).username||(window.currentSession||{}).user||'Upravljanje zalihama');
  try{
    await window.YardivoSupplierLiveSync.call('internal_update',{
      id:x.id,
      status:'confirmed',
      dock:null,
      proposed_dock:null,
      planned_dock:null,
      review_note:`Najavu i termin potvrdio: ${actor}. Rampa se dodjeljuje tek pri dolasku.`
    });
    try{await window.YardivoSupplierLiveSync.pullInternal?.()}catch(_){}
    await quietLoad(true);
    try{
      ['renderAnnouncements','renderAnnouncementSchedule','renderDailyMap','renderWeeklyMap','renderReceiving','renderOverview','renderControlTower','render'].forEach(n=>{
        try{if(typeof window[n]==='function')window[n]()}catch(_){}
      });
    }catch(_){}
    try{window.dispatchEvent(new CustomEvent('yardivo:supplier-request-updated',{detail:{id:x.id,status:'confirmed',source:'inventory-approve'}}))}catch(_){}
    try{window.dispatchEvent(new CustomEvent('yardivo:supplier-canonical-updated',{detail:{id:x.id}}))}catch(_){}
    try{
      if(typeof showYmsToast==='function')showYmsToast('success','NAJAVA POTVRĐENA','Najava je sada u Dnevnoj / Tjednoj mapi i Prijamu robe.',4200);
    }catch(_){}
  }catch(e){
    alert('Najavu nije moguće potvrditi:\n'+errorText(e));
  }
}
async function rejectPlanner(){if(!plannerRow)return;const id=plannerRow.id,note=prompt('Razlog odbijanja zahtjeva:','');if(note===null)return;if(!note.trim()){alert('Upiši razlog odbijanja.');return}if(!confirm('Potvrditi odbijanje Supplier zahtjeva?'))return;try{await window.YardivoSupplierLiveSync.call('internal_update',{id,status:'rejected',review_note:note.trim()});closePlanner();await quietLoad(false)}catch(e){alert('Odbijanje nije uspjelo:\n'+errorText(e))}}
function errorText(e){if(!e)return 'Nepoznata greška';if(typeof e==='string')return e;if(e.message&&typeof e.message==='string')return e.message;if(e.error?.message)return e.error.message;try{return JSON.stringify(e)}catch(_){return String(e)}}

function reconcileCanonical(rows){
  try{
    if(typeof announcements==='undefined'||!Array.isArray(announcements)||typeof saveAnnouncements!=='function')return false;
    let changed=false;
    const approved=new Set(['confirmed','arrival','dock','receiving','completed']);
    for(const x of rows||[]){
      const status=String(x.status||'').toLowerCase();
      const idx=announcements.findIndex(a=>String(a.supplierDeliveryId||'')===String(x.id));
      if(!approved.has(status)){
        if(status==='rejected'&&idx>=0){announcements.splice(idx,1);changed=true}
        continue;
      }
      const dock=dockNumber(x.dock);
      const internalStatus={confirmed:'Najavljen',arrival:'Stigao',dock:'Na rampi',receiving:'Zaprimanje',completed:'Zaprimljeno'}[status]||'Najavljen';
      const base={
        supplierDeliveryId:x.id,
        supplierPortalId:x.client_id,
        supplierSource:'supplier_live',
        supplier:x.supplier_name||x.supplier_username||'Supplier',
        orderNumber:x.order_number||'',
        warehouse:String(x.warehouse||'').toUpperCase(),
        date:String(x.delivery_date||''),
        time:normalizeTime(x.requested_time),
        pallets:Number(x.pallets||0),
        sku:Number(x.sku_count||0),
        plannedPlate:x.vehicle_plate||'',
        trailerPlate:x.trailer_plate||'',
        plannedDriver:x.driver_name||'',
        driverContact:x.driver_contact||'',
        reference:x.delivery_note||'',
        supplierNote:x.note||'',
        dock,
        status:internalStatus,
        supplierApprovalStatus:status,
        supplierReviewNote:x.review_note||'',
        updatedAt:x.updated_at||new Date().toISOString()
      };
      if(!base.date||!base.time)continue;
      if(idx>=0){
        const before=JSON.stringify(announcements[idx]);
        Object.assign(announcements[idx],base);
        if(before!==JSON.stringify(announcements[idx]))changed=true;
      }else{
        announcements.push({id:stableId(x.id),createdAt:x.created_at||new Date().toISOString(),createdBy:'supplier:'+String(x.supplier_username||''),duration:60,responsible:'',...base});
        changed=true;
      }
    }
    if(changed){
      saveAnnouncements();
      try{
        ['renderAnnouncements','renderAnnouncementSchedule','renderDailyMap','renderWeeklyMap','renderReceiving','renderOverview','renderControlTower','render'].forEach(n=>{
          try{if(typeof window[n]==='function')window[n]()}catch(_){}
        });
      }catch(_){}
      try{window.dispatchEvent(new CustomEvent('yardivo:supplier-canonical-updated'))}catch(_){}
    }
    return changed;
  }catch(e){console.error('YARDIVO supplier canonical reconcile',e);return false}
}
async function quietLoad(force=false){
  if(!window.currentSession?.serverAuthorized)return;
  if(!window.YardivoSupplierLiveSync?.call||refreshing)return;
  refreshing=true;
  const body=document.getElementById('ysrBody');
  if(body)body.classList.add('ysr-refreshing');
  try{
    const rows=await window.YardivoSupplierLiveSync.call('list_internal');
    if(!Array.isArray(rows))return;
    lastRows=rows;
    reconcileCanonical(rows);
    const scoped=supplierInboxRows(rows);
    const fp=rowsFingerprint(rows)+'|'+supplierInboxRole();
    if(force||fp!==lastFingerprint){
      lastFingerprint=fp;
      renderStable(rows,true);
    }else{
      updateCounters(scoped);
    }
    /* Badge is owned by SupplierInboxStableFinalV583. */
  }catch(e){console.error('YARDIVO quiet supplier refresh',e)}
  finally{refreshing=false;if(body)body.classList.remove('ysr-refreshing')}
}
function supplierRescheduleRequest(x){
  if(x?.reschedule_request&&typeof x.reschedule_request==='object')return x.reschedule_request;
  const m=String(x?.note||'').match(/\[YARDIVO_RESCHEDULE_REQUEST:([^\]]+)\]/);
  if(!m)return null;
  try{return JSON.parse(decodeURIComponent(escape(atob(m[1]))))}catch(_){return null}
}
function statusLabel(s){return ({pending:'ČEKA POTVRDU',revision_requested:'VRAĆENO NA DORADU',proposal_sent:'ČEKA ODGOVOR DOBAVLJAČA',confirmed:'ODOBRENO · U OPERATIVI',arrival:'STIGAO',dock:'NA RAMPI',receiving:'ZAPRIMANJE',completed:'ZAVRŠENO',rejected:'ODBIJENO'})[String(s||'').toLowerCase()]||String(s||'—').toUpperCase()}
function supplierInboxRole(){
 try{return String((window.currentSession||currentSession||{}).role||'').toLowerCase().trim()}catch(_){return String(window.currentSession?.role||'').toLowerCase().trim()}
}
function supplierInboxActiveWarehouse(){
 let w='';
 try{
   w=window.YardivoAppStateV583?.warehouse?.()||'';
   if(!w&&typeof activeWarehouse!=='undefined')w=activeWarehouse;
   if(!w)w=window.activeWarehouse||'';
 }catch(_){w=String(window.activeWarehouse||'')}
 w=String(w||'').trim();
 return /^(SVA|ALL)$/i.test(w)?'ALL':w;
}
function supplierInboxRows(rows){
 /* list_internal already enforces account warehouse scope on the server.
    Do NOT apply the Header warehouse again here: Admin must see all requests,
    and Inventory must see every request returned for its assigned warehouses. */
 return Array.isArray(rows)?rows:[];
}
function supplierWarehouseNameV583(id){
 try{const m=window.YardivoAppStateV583?.master?.()||JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');return String((m.warehouses||[]).find(w=>String(w.id)===String(id))?.name||id||'—')}catch(_){return String(id||'—')}
}
function updateCounters(rows){
 const today=window.yardivoLocalDateV583();
 [['ysrPending',rows.filter(x=>x.status==='pending').length],['ysrRevision',rows.filter(x=>x.status==='revision_requested').length],['ysrApproved',rows.filter(x=>['confirmed','arrival','dock','receiving','completed'].includes(x.status)).length],['ysrToday',rows.filter(x=>x.delivery_date===today).length]].forEach(([id,n])=>{const el=document.getElementById(id);if(el)el.textContent=n});
}
function renderStable(rows,force=false){
  const body=document.getElementById('ysrBody');if(!body)return;
  lastRows=Array.isArray(rows)?rows:lastRows;
  const scopedRows=supplierInboxRows(lastRows);
  updateCounters(scopedRows);
  const wh=document.getElementById('ysrWarehouseFilter');
  if(wh){
    wh.disabled=false;wh.title='';
    const old=wh.value,opts=[...new Set(scopedRows.map(x=>x.warehouse).filter(Boolean))].sort();
    const h='<option value="">Sva skladišta</option>'+opts.map(w=>`<option value="${esc(w)}">${esc(supplierWarehouseNameV583(w))}</option>`).join('');
    if(wh.innerHTML!==h){wh.innerHTML=h;if([...wh.options].some(o=>o.value===old))wh.value=old}
  }
  const fS=String(document.getElementById('ysrStatusFilter')?.value||'').toLowerCase().trim();
  const fW=String(document.getElementById('ysrWarehouseFilter')?.value||'').toUpperCase().trim();
  const q=(document.getElementById('ysrSearch')?.value||'').trim().toLowerCase();
  const filtered=scopedRows.filter(x=>{
   const rowWh=String(x.warehouse||'').toUpperCase().trim();
   const rowStatus=String(x.status||'').toLowerCase().trim();
   if(fW&&rowWh!==fW)return false;
   if(fS&&rowStatus!==fS)return false;
   if(q&&!`${x.supplier_name||''} ${x.supplier_username||''} ${x.order_number||''} ${x.id||''}`.toLowerCase().includes(q))return false;
   return true
 });
  const html=!filtered.length?'<tr><td colspan="9"><div class="ysr-empty">Nema Supplier najava za trenutno odabrano skladište / filter.</div></td></tr>':filtered.map(x=>`<tr data-ysr-detail="${esc(x.id)}"><td><strong>${esc(x.supplier_name||x.supplier_username||'—')}</strong><br><small>${esc(x.client_id||'')}</small></td><td><strong>${esc(supplierWarehouseNameV583(x.warehouse))}</strong></td><td>${human(x.delivery_date)}<br><strong>${x.requested_time?'Termin: '+esc(normalizeTime(x.requested_time)):'Termin nije dodijeljen'}</strong>${x.dock?'<br>Rampa: <strong>R'+esc(dockNumber(x.dock))+'</strong>':''}</td><td>${Number(x.pallets||0)} pal.<br>${Number(x.sku_count||0)} SKU</td><td>${esc(x.order_number||'—')}</td><td>${[x.vehicle_plate,x.trailer_plate,x.driver_name,x.driver_contact].filter(Boolean).map(esc).join('<br>')||'—'}</td><td><span class="ysr-status ${esc(x.status)}">${esc(statusLabel(x.status))}</span></td><td><div class="ysr-note">${esc(window.YardivoGateQrV583?.cleanReviewNote?.(x.review_note||'')||x.note||'—')}</div></td><td><div class="ysr-actions">${x.status==='pending'?`<button class="primary" data-v583-approve-request="${esc(x.id)}">ODOBRI TERMIN</button>`:''}${['pending','revision_requested','proposal_sent'].includes(x.status)?`<button class="secondary" data-v580-plan="${esc(x.id)}">${x.status==='proposal_sent'?'IZMIJENI PRIJEDLOG':'PREDLOŽI DRUGI TERMIN'}</button>`:''}${x.status==='pending'?`<button class="warn" data-a="revision" data-id="${esc(x.id)}">VRATI NA DORADU</button>`:''}${x.status==='confirmed'?(()=>{const rr=supplierRescheduleRequest(x);return `${rr?.status==='pending'?`<button class="primary" data-v583-reschedule-review="${esc(x.id)}">ZAHTJEV ZA PROMJENU TERMINA</button>`:'<span style="color:#79e3a4;font-weight:950;font-size:8px">✓ NAJAVA JE U DNEVNOJ / TJEDNOJ / PRIJAMU</span>'}${window.YardivoGateQrV583?.inventoryButton?.(x)||''}<button class="secondary" data-v583-edit-confirmed="${esc(x.id)}">UREDI PODATKE</button><button class="secondary" data-v580-plan="${esc(x.id)}">PROMIJENI TERMIN</button>`})():''}${!['completed','rejected'].includes(x.status)?`<button class="danger" data-v580-reject="${esc(x.id)}">ODBIJ</button>`:''}</div></td></tr>`).join('');
  if(force||body.dataset.v582Html!==html){
    body.innerHTML=html;
    body.dataset.v582Html=html;
  }
}
function patchPolling(){
  if(window.YardivoSupplierRequests){
    window.YardivoSupplierRequests.load=quietLoad;
    window.YardivoSupplierRequests.render=()=>renderStable(lastRows);
  }
  const refresh=document.getElementById('ysrRefresh');
  if(refresh&&!refresh.dataset.v582){refresh.dataset.v582='1';refresh.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();quietLoad(true)},true)}
  ['ysrStatusFilter','ysrWarehouseFilter'].forEach(id=>{
    const el=document.getElementById(id);
    if(el&&!el.dataset.v582){
      el.dataset.v582='1';
      el.addEventListener('input',()=>renderStable(lastRows,false),true);
      el.addEventListener('change',()=>renderStable(lastRows,false),true);
    }
  });
  const search=document.getElementById('ysrSearch');
  if(search&&!search.dataset.v582){search.dataset.v582='1';search.addEventListener('input',()=>renderStable(lastRows,false),true)}
  /* No background poll here. SupplierInboxStableFinalV583 is the single polling/data authority. */
  window.__yardivoSupplierV582Polling='owned-by-stable-final';
}
document.addEventListener('click',e=>{
  const a=e.target.closest?.('[data-v583-approve-request]');if(a){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();approveSupplierRequest(a.dataset.v583ApproveRequest);return}
  const p=e.target.closest?.('[data-v580-plan]');if(p){e.preventDefault();e.stopImmediatePropagation();const x=lastRows.find(r=>String(r.id)===String(p.dataset.v580Plan));if(x)openPlanner(x);return}
  const r=e.target.closest?.('[data-v580-reject]');if(r){e.preventDefault();e.stopImmediatePropagation();const x=lastRows.find(v=>String(v.id)===String(r.dataset.v580Reject));if(x){plannerRow=x;rejectPlanner()}}
},true);
window.addEventListener('load',()=>setTimeout(()=>{ensureModal();patchPolling();quietLoad(true)},2300));
window.addEventListener('yardivo:login',()=>setTimeout(()=>{patchPolling();quietLoad(true)},1200));
window.addEventListener('yardivo:supplier-inbox-changed',()=>setTimeout(()=>quietLoad(true),150));
window.addEventListener('yardivo:supplier-request-updated',()=>setTimeout(()=>quietLoad(true),150));
window.addEventListener('focus',()=>{const v=document.getElementById('supplierRequests');if(v?.classList.contains('active'))quietLoad(false)});
window.YardivoSupplierPlannerV580={open:openPlanner,refresh:quietLoad,renderRows:renderStable,reconcileCanonical,getRows:()=>lastRows.slice()};
})();
