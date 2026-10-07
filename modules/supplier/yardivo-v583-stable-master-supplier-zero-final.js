
(function(){
'use strict';
const BUILD='20260915-dev-v5.8.3-master-warehouse-dropdown-config-fix';
let configWarehouseId='';
let masterEditHoldUntil=0;
let draftWarehouseName='';
let draftWarehouseLocation='';
let draftLocationName='';
function holdMasterEdit(ms=700){masterEditHoldUntil=Math.max(masterEditHoldUntil,Date.now()+ms)}
function currentRole(){
 let r='';
 try{r=String(document.body?.dataset?.yardivoRole||document.documentElement?.dataset?.yardivoRole||window.currentSession?.app_role||window.currentSession?.role||'').trim().toLowerCase()}catch(_){}
 if(r==='voditelj')r='manager';
 return r;
}
function canManageRamps(){return ['admin','manager'].includes(currentRole())}
const MASTER='yardivo_master_data_registry_v583';
const CAP='yardivo_capacity_config_v1';
const HOURS='yardivo_reception_master_hours_v1';
const DET='yardivo_detention_settings_v1';
const RH='yardivo_ramp_hours_v583';
const RATE='yardivo_ramp_capacity_v1';
const RMETA='yardivo_ramp_master_v583';
const RCFG='yardivo_ramp_config_v1';
const EPAL='yardivo_epal_initial_stock_v1';
const SUPPLIER_CUTOFF='yardivo_supplier_zero_cutoff_v583_20260912_r3';

function jget(k,f={}){
 try{const x=JSON.parse(localStorage.getItem(k)||'null');return x&&typeof x==='object'?x:f}catch(_){return f}
}
function jset(k,v){localStorage.setItem(k,JSON.stringify(v))}
function clone(x){return JSON.parse(JSON.stringify(x))}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function master(){
 const d=jget(MASTER,null);
 return d&&Array.isArray(d.locations)&&Array.isArray(d.warehouses)&&Array.isArray(d.suppliers)?d:{locations:[],warehouses:[],suppliers:[]}
}
function next(prefix,arr){
 let n=0;for(const x of arr){const m=String(x?.id||'').match(/(\d+)$/);if(m)n=Math.max(n,+m[1]||0)}
 return prefix+String(n+1).padStart(3,'0')
}
function nextWh(arr){
 let n=0;for(const x of arr){const m=String(x?.id||'').match(/^W(\d+)$/i);if(m)n=Math.max(n,+m[1]||0)}
 return 'W'+String(n+1).padStart(3,'0')
}
function activeLocation(){
 try{return String(window.YardivoAppStateV583?.location?.()||window.currentSession?.location||'')}catch(_){return''}
}
function activeWarehouse(){
 try{return String(window.YardivoAppStateV583?.warehouse?.()||window.activeWarehouse||'')}catch(_){return''}
}
function locName(id,d=master()){return d.locations.find(x=>String(x.id)===String(id))?.name||'—'}
function commit(d,reason){
 d.__masterUpdatedAtV583=new Date().toISOString();
 d.__masterWriteTokenV583='SM-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);
 jset(MASTER,d);
 try{window.YardivoMasterDataV583?.save?.(clone(d))}catch(_){}
 try{window.YardivoSupabase?.flushQueue?.()}catch(_){}
 try{window.dispatchEvent(new CustomEvent('yardivo:master-data-changed',{detail:{source:'stable-master',reason}}))}catch(_){}
 refreshOperational();
}
function refreshOperational(){
 const f=['populateAnnouncementControls','renderDashboardSimple','renderWarehouseCards','renderRampe','renderDockOverview','renderDailyMap','renderWeeklyMap','renderOverview','renderPlannerPro','renderAnnouncementSchedule','renderReceiving'];
 f.forEach(n=>{try{if(typeof window[n]==='function')window[n]()}catch(_){}});
 try{window.YardivoUnifiedRampsV583?.refresh?.()}catch(_){}
 try{window.YardivoMyYard?.render?.()}catch(_){}
 try{window.YardivoMyYardWebGL?.refresh?.()}catch(_){}
 try{window.dispatchEvent(new CustomEvent('yardivo:context-changed',{detail:{source:'stable-master'}}))}catch(_){}
}

/* Supplier inbox is server-authoritative. Legacy date-cutoff quarantine retired in V5.8.3 final. */
(function installSupplierFetchQuarantine(){
  try{localStorage.removeItem(SUPPLIER_CUTOFF)}catch(_){}
  window.__YARDIVO_SUPPLIER_FETCH_QUARANTINE_V583__=false;
  window.YardivoSupplierZeroV583={cutoff:()=>0};
})();

function hardEmptySupplierUi(){
  /* Retired: pending Supplier requests must never be inferred from local operational announcements. */
  try{localStorage.removeItem(SUPPLIER_CUTOFF)}catch(_){}
  document.body.classList.remove('yardivo-supplier-zero');
}
function observeFreshSupplierRows(){
  /* Retired: Supabase list_internal is the only authority for Supplier inbox rows. */
  document.body.classList.remove('yardivo-supplier-zero');
}

/* ---------------- Stable Master CRUD ---------------- */
function addLocation(name){
 const n=String(name||'').trim();if(!n)return;
 const d=master(),id=next('LOC',d.locations);
 d.locations.push({id,name:n,active:true});draftLocationName='';commit(d,'location.add');
 /* Creating a location does not select it as runtime context. */
 render('operation');
}
function saveLocation(id){
 const input=document.querySelector(`[data-sm-loc-name="${id}"]`),n=String(input?.value||'').trim();if(!n)return;
 const d=master(),x=d.locations.find(v=>v.id===id);if(!x)return;x.name=n;commit(d,'location.update');render();
}
function deleteLocation(id){
 const d=master();if(d.warehouses.some(w=>w.location_id===id))return alert('Prvo obriši skladišta ove lokacije.');
 d.locations=d.locations.filter(x=>x.id!==id);commit(d,'location.delete');
 try{if(activeLocation()===id)window.YardivoAppStateV583?.setLocation?.('')}catch(_){}
 render('operation');
}
function addWarehouse(name,locationId){
 const n=String(name||'').trim(),loc=String(locationId||'').trim(),d=master();
 if(!n)return alert('Upiši naziv skladišta.');
 if(!loc||!d.locations.some(x=>String(x.id)===loc&&x.active!==false)){
  alert('Odaberi lokaciju kojoj skladište pripada.');
  return;
 }
 const id=nextWh(d.warehouses);
 d.warehouses.push({
  id,name:n,location_id:loc,ramps:0,ramp_settings:[],active:true,
  daily_pallet_capacity:null,reception_from:'',reception_to:'',
  detention_wait_min:null,detention_dock_min:null,epal_initial:null
 });
 commit(d,'warehouse.add');
 draftWarehouseName='';draftWarehouseLocation='';
 configWarehouseId=id;
 /* Keep Settings configuration local; do not mutate the global header context on create. */
 render('operation');
 setTimeout(()=>document.getElementById('smWarehouseConfiguration')?.scrollIntoView?.({behavior:'smooth',block:'start'}),40);
}
function saveWarehouseName(id){
 const n=String(document.querySelector(`[data-sm-wh-name="${id}"]`)?.value||'').trim();if(!n)return;
 const d=master(),w=d.warehouses.find(x=>x.id===id);if(!w)return;
 w.name=n;commit(d,'warehouse.update');render('operation');
}
function deleteWarehouse(id){
 const d=master();d.warehouses=d.warehouses.filter(x=>x.id!==id);commit(d,'warehouse.delete');
 for(const k of [CAP,HOURS,DET,RH,RATE,RMETA,RCFG,EPAL]){const o=jget(k,{});delete o[id];jset(k,o)}
 try{if(activeWarehouse()===id)window.YardivoAppStateV583?.setWarehouse?.('')}catch(_){}
 if(String(configWarehouseId)===String(id))configWarehouseId='';
 render('operation');
}
function cap(id){const w=master().warehouses.find(x=>String(x.id)===String(id));const v=w?.daily_pallet_capacity??jget(CAP,{})?.[id]?.warehousePallets;return v==null||v===''?null:Number(v)}
function whHours(id){const x=jget(HOURS,{})?.[id]||{};return{from:x.from||'',to:x.to||''}}
function detention(id){const x=jget(DET,{})?.[id]||{};return{wait:x.waitMin??'',dock:x.dockMin??''}}
function epal(id){const v=jget(EPAL,{})?.[id];return v==null||v===''?'':Number(v)}
function canonicalRamp(id,r){
 const w=master().warehouses.find(x=>String(x.id)===String(id));
 const rows=Array.isArray(w?.ramp_settings)?w.ramp_settings:[];
 return rows.find(x=>Number(x?.number)===Number(r))||null;
}
function rampMeta(id,r){
 const c=canonicalRamp(id,r),x=jget(RMETA,{})?.[id]?.[String(r)]||{};
 return{name:c?.name||x.name||`Rampa ${r}`,active:c?c.active!==false:x.active!==false}
}
function rampHours(id,r){
 const w=master().warehouses.find(x=>String(x.id)===String(id)),h=whHours(id);
 return{from:String(w?.reception_from||h.from||''),to:String(w?.reception_to||h.to||'')}
}
function rampRate(id,r){
 const c=canonicalRamp(id,r),v=c?.pallets_per_hour??jget(RATE,{})?.[id]?.[String(r)];
 return v==null||v===''?'':Number(v)
}
function rampMax(id,r){
 const c=canonicalRamp(id,r),v=c?.max_pallets??jget(CAP,{})?.[id]?.ramps?.[String(r)];
 return v==null||v===''?'':Number(v)
}
function saveWarehouseOps(id){
 const c=jget(CAP,{});c[id]=c[id]||{ramps:{}};
 const mdNow=master(),mwNow=mdNow.warehouses.find(x=>String(x.id)===String(id));
 const rampRows=Array.isArray(mwNow?.ramp_settings)?mwNow.ramp_settings:[];
 const rampCaps=rampRows.slice(0,Math.max(0,Number(mwNow?.ramps)||0)).map(x=>x?.max_pallets);
 const capValue=rampCaps.length&&rampCaps.every(v=>v!==null&&v!==''&&Number(v)>0)?rampCaps.reduce((a,v)=>a+Number(v),0):null;
 c[id].warehousePallets=capValue;c[id].ramps=c[id].ramps||{};jset(CAP,c);
 const from=document.querySelector(`[data-sm-wh-from="${id}"]`)?.value||'',to=document.querySelector(`[data-sm-wh-to="${id}"]`)?.value||'';
 const h=jget(HOURS,{});h[id]={from,to};jset(HOURS,h);
 const ep=jget(EPAL,{});const eTxt=String(document.querySelector(`[data-sm-epal="${id}"]`)?.value||'').trim();const epalValue=eTxt===''?null:Math.max(0,Math.floor(Number(eTxt)||0));ep[id]=epalValue;jset(EPAL,ep);
 const md=master(),mw=md.warehouses.find(x=>String(x.id)===String(id));
 if(mw){mw.daily_pallet_capacity=capValue;mw.reception_from=from;mw.reception_to=to;mw.epal_initial=epalValue;mw.ramp_settings=Array.isArray(mw.ramp_settings)?mw.ramp_settings:[];mw.ramp_settings.forEach(rr=>{if(rr){rr.from=from;rr.to=to}});commit(md,'warehouse.operational');}
 try{window.YardivoSupabase?.flushQueue?.()}catch(_){}
 refreshOperational();
 try{showYmsToast?.('success','SKLADIŠTE SPREMLJENO','Kapacitet, radno vrijeme i EPAL su spremljeni.')}catch(_){}
}
function changeRampCount(id,delta){
 const d=master(),w=d.warehouses.find(x=>x.id===id);if(!w)return;
 const oldCount=Math.max(0,Number(w.ramps)||0);
 const newCount=Math.max(0,Math.min(50,oldCount+delta));
 /* A newly added ramp inherits the warehouse reception window. Prefer the values
    currently visible in Settings so Admin does not have to save the warehouse
    before adding a ramp; then fall back to canonical/mirrored Master hours. */
 const liveFrom=String(document.querySelector(`[data-sm-wh-from="${id}"]`)?.value||'').trim();
 const liveTo=String(document.querySelector(`[data-sm-wh-to="${id}"]`)?.value||'').trim();
 const savedHours=whHours(id);
 const inheritedFrom=liveFrom||String(w.reception_from||savedHours.from||'').trim();
 const inheritedTo=liveTo||String(w.reception_to||savedHours.to||'').trim();
 w.ramps=newCount;
 w.ramp_settings=Array.isArray(w.ramp_settings)?w.ramp_settings.filter(x=>Number(x?.number)<=newCount):[];
 for(let r=1;r<=newCount;r++){
  if(!w.ramp_settings.some(x=>Number(x?.number)===r)){
   w.ramp_settings.push({number:r,name:`Rampa ${r}`,active:true,from:inheritedFrom,to:inheritedTo,pallets_per_hour:null,max_pallets:null});
  }
 }
 const configured=(Array.isArray(w.ramp_settings)?w.ramp_settings:[]).slice(0,newCount);
 const caps=configured.map(x=>x?.max_pallets);
 w.daily_pallet_capacity=caps.length&&caps.every(v=>v!==null&&v!==''&&Number(v)>0)?caps.reduce((a,v)=>a+Number(v),0):null;
 commit(d,'ramps.count');
 /* Compatibility mirrors only; Master remains authoritative. */
 const cfg=jget(RCFG,{});cfg[id]=cfg[id]||{count:0,locked:[]};cfg[id].count=newCount;cfg[id].locked=(cfg[id].locked||[]).filter(x=>Number(x)<=newCount);jset(RCFG,cfg);
 if(newCount>oldCount){const hh=jget(RH,{});hh[id]=hh[id]||{};for(let r=oldCount+1;r<=newCount;r++)hh[id][String(r)]={from:inheritedFrom,to:inheritedTo};jset(RH,hh)}
 try{window.YardivoRampConfig?.setCount?.(id,newCount)}catch(_){}
 render('operation');
}
function saveRamp(id,r){
 const pair=id+':'+r;
 const name=String(document.querySelector(`[data-sm-r-name="${pair}"]`)?.value||`Rampa ${r}`).trim()||`Rampa ${r}`;
 const active=document.querySelector(`[data-sm-r-active="${pair}"]`)?.value!=='0';
 const whNow=master().warehouses.find(x=>String(x.id)===String(id)),whh=whHours(id);
 const from=String(whNow?.reception_from||whh.from||'');
 const to=String(whNow?.reception_to||whh.to||'');
 const rt=String(document.querySelector(`[data-sm-r-rate="${pair}"]`)?.value||'').trim();
 const mx=String(document.querySelector(`[data-sm-r-max="${pair}"]`)?.value||'').trim();
 const palletsPerHour=rt===''?null:Math.max(1,Math.floor(Number(rt)||0));
 const maxPallets=mx===''?null:Math.max(1,Math.floor(Number(mx)||0));

 /* Canonical owner: warehouse.ramp_settings inside Master Data. */
 const d=master(),w=d.warehouses.find(x=>String(x.id)===String(id));if(!w)return;
 w.ramp_settings=Array.isArray(w.ramp_settings)?w.ramp_settings:[];
 const existing=w.ramp_settings.find(x=>Number(x?.number)===Number(r));
 const row={number:Number(r),name,active,from,to,pallets_per_hour:palletsPerHour,max_pallets:maxPallets};
 if(existing)Object.assign(existing,row);else w.ramp_settings.push(row);
 w.ramps=Math.max(Number(w.ramps)||0,Number(r)||0);
 const configured=(Array.isArray(w.ramp_settings)?w.ramp_settings:[]).slice(0,w.ramps);
 const caps=configured.map(x=>x?.max_pallets);
 w.daily_pallet_capacity=caps.length&&caps.every(v=>v!==null&&v!==''&&Number(v)>0)?caps.reduce((a,v)=>a+Number(v),0):null;
 commit(d,'ramp.operational');

 /* Compatibility mirrors for older modules until fully retired. */
 const meta=jget(RMETA,{});meta[id]=meta[id]||{};meta[id][String(r)]={name,active};jset(RMETA,meta);
 const hh=jget(RH,{});hh[id]=hh[id]||{};hh[id][String(r)]={from,to};jset(RH,hh);
 const rates=jget(RATE,{});rates[id]=rates[id]||{};rates[id][String(r)]=palletsPerHour;jset(RATE,rates);
 const c=jget(CAP,{});c[id]=c[id]||{warehousePallets:null,ramps:{}};c[id].ramps=c[id].ramps||{};c[id].ramps[String(r)]=maxPallets;c[id].warehousePallets=w.daily_pallet_capacity;jset(CAP,c);
 const cfg=jget(RCFG,{});cfg[id]=cfg[id]||{count:w.ramps,locked:[]};cfg[id].count=w.ramps;
 cfg[id].locked=(cfg[id].locked||[]).filter(x=>Number(x)!==Number(r));if(!active)cfg[id].locked.push(Number(r));jset(RCFG,cfg);
 try{window.YardivoRampConfig?.setLocked?.(id,r,!active)}catch(_){}
 try{window.YardivoSupabase?.flushQueue?.()}catch(_){}
 refreshOperational();
 try{showYmsToast?.('success','RAMPA SPREMLJENA',name)}catch(_){}
}
function toggleRampActive(id,r){
 if(!canManageRamps()){try{showYmsToast?.('warning','NEMA OVLAŠTENJA','Samo Admin i Voditelj mogu uključiti ili isključiti rampu.')}catch(_){}return}
 const d=master(),w=d.warehouses.find(x=>String(x.id)===String(id));if(!w)return;
 w.ramp_settings=Array.isArray(w.ramp_settings)?w.ramp_settings:[];
 let row=w.ramp_settings.find(x=>Number(x?.number)===Number(r));
 if(!row){row={number:Number(r),name:`Rampa ${r}`,active:true,from:'',to:'',pallets_per_hour:null,max_pallets:null};w.ramp_settings.push(row)}
 row.active=row.active===false?true:false;
 w.ramps=Math.max(Number(w.ramps)||0,Number(r)||0);
 commit(d,'ramp.toggle');
 const cfg=jget(RCFG,{});cfg[id]=cfg[id]||{count:w.ramps,locked:[]};cfg[id].count=w.ramps;cfg[id].locked=(cfg[id].locked||[]).filter(x=>Number(x)!==Number(r));if(row.active===false)cfg[id].locked.push(Number(r));jset(RCFG,cfg);
 try{window.YardivoRampConfig?.setLocked?.(id,r,row.active===false)}catch(_){}
 try{window.YardivoSupabase?.flushQueue?.()}catch(_){}
 refreshOperational();
 try{showYmsToast?.(row.active?'success':'warning',row.active?'RAMPA UKLJUČENA':'RAMPA ISKLJUČENA',`${row.name||`Rampa ${r}`} · ${w.name}`)}catch(_){}
 render('operation');
}

/* ---------------- Render only on explicit operations/navigation ---------------- */
function host(){
 const pane=document.getElementById('yardivoSettingsMasterPaneV583')||document.getElementById('settings');
 if(!pane)return null;
 let h=document.getElementById('yardivoStableMasterEditorV583');
 if(!h){h=document.createElement('section');h.id='yardivoStableMasterEditorV583';pane.prepend(h)}
 return h
}
function render(force=false){
 const h=host();if(!h)return;
 const a=document.activeElement;
 const typing=!!a?.closest?.('#yardivoStableMasterEditorV583')&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName||'');
 /* Only this module's explicit CRUD/navigation redraw may replace a focused
    Master form. Legacy callers still pass true; that must NOT bypass typing
    protection because it can erase characters between keystrokes. */
 const explicit=force==='operation';
 if(typing&&!explicit)return;
 if(!explicit&&Date.now()<masterEditHoldUntil)return;
 const d=master(),locs=d.locations.filter(x=>x.active!==false),whs=d.warehouses.filter(x=>x.active!==false);
 /* Settings Master configuration is intentionally independent from Header context. */
 if(configWarehouseId&&!whs.some(w=>String(w.id)===String(configWarehouseId)))configWarehouseId='';
 const selectedWh=whs.find(w=>String(w.id)===String(configWarehouseId))||null;
 const configHtml=selectedWh?(()=>{
      const w=selectedWh,cp=cap(w.id),hr=whHours(w.id),de=detention(w.id),n=Math.max(0,Number(w.ramps)||0),ep=epal(w.id);
      return `<article class="ysm-wh ysm-wh-selected">
       <div class="ysm-wh-head"><div><strong>${esc(w.name)}</strong><small>${esc(locName(w.location_id,d))}</small></div><span class="ysm-unknown">${cp==null?'KAPACITET NEPOZNAT':cp+' PALETA / DAN'}</span></div>
       <div class="ysm-config-path"><span>LOKACIJA</span><b>${esc(locName(w.location_id,d))}</b><i>→</i><span>SKLADIŠTE</span><b>${esc(w.name)}</b><i>→</i><span>RAMPE I OPERATIVA</span></div>
       <div class="ysm-sector"><h4>OPERATIVNI PODACI SKLADIŠTA</h4><div class="ysm-fields">
        <label>KAPACITET ZAPRIMANJA SKLADIŠTA<input data-sm-cap="${esc(w.id)}" type="number" readonly aria-readonly="true" placeholder="IZRAČUN IZ RAMPI" value="${cp??''}"><small class="ysm-cap-help">Automatski zbroj MAX PALETA svih konfiguriranih rampi.</small></label>
        <label>POČETNO STANJE EPAL<input data-sm-epal="${esc(w.id)}" type="number" min="0" placeholder="0 / NEPOZNAT" value="${ep}"></label>
        <label>RADNO VRIJEME PRIJAMA OD<input data-sm-wh-from="${esc(w.id)}" type="time" value="${esc(hr.from)}"><small>Primjenjuje se na svaku rampu ovog skladišta.</small></label>
        <label>RADNO VRIJEME PRIJAMA DO<input data-sm-wh-to="${esc(w.id)}" type="time" value="${esc(hr.to)}"><small>Primjenjuje se na svaku rampu ovog skladišta.</small></label>
       </div><button class="primary" data-sm-save-ops="${esc(w.id)}">SPREMI PODATKE SKLADIŠTA</button></div>
       <div class="ysm-sector ysm-ramp-management"><h4>UPRAVLJANJE RAMPAMA — ${esc(w.name)}</h4><p class="ysm-sector-help">Rampe koriste zajedničko <b>RADNO VRIJEME PRIJAMA SKLADIŠTA</b>. Za rampu uređuješ naziv, ON/OFF, palete/sat i maksimalni kapacitet; nema zasebnog radnog vremena po rampi.</p>
        <div class="ysm-ramp-tools"><button class="primary" data-sm-add-ramp="${esc(w.id)}">+ DODAJ RAMPU</button><button data-sm-rem-ramp="${esc(w.id)}" ${n?'':'disabled'}>− OBRIŠI ZADNJU RAMPU</button><span class="ysm-unknown">${n} ${n===1?'RAMPA':'RAMPI'}</span></div>
        ${n?Array.from({length:n},(_,i)=>i+1).map(r=>{const m=rampMeta(w.id,r),rh=rampHours(w.id,r),rate=rampRate(w.id,r),mx=rampMax(w.id,r);return `<div class="ysm-ramp ${m.active?'':'off'}">
         <label>NAZIV<input data-sm-r-name="${esc(w.id)}:${r}" value="${esc(m.name)}"></label>
         <label>STATUS<input type="hidden" data-sm-r-active="${esc(w.id)}:${r}" value="${m.active?'1':'0'}"><span class="ysm-ramp-state ${m.active?'on':'off'}">${m.active?'ON':'OFF'}</span>${canManageRamps()?`<button type="button" class="ysm-ramp-toggle ${m.active?'turn-off':'turn-on'}" data-sm-toggle-ramp="${esc(w.id)}:${r}">${m.active?'TURN OFF':'TURN ON'}</button>`:`<small class="ysm-role-note">Samo Admin / Voditelj</small>`}</label>
         <label>RADNO VRIJEME PRIJAMA<span class="ysm-shared-hours">${esc(rh.from||'—')} – ${esc(rh.to||'—')}</span><small>Vrijedi za sve rampe ovog skladišta.</small></label>
         <label>PALETA / SAT<input data-sm-r-rate="${esc(w.id)}:${r}" type="number" min="1" placeholder="NEPOZNAT" value="${rate}"></label>
         <label>MAX PALETA<input data-sm-r-max="${esc(w.id)}:${r}" type="number" min="1" placeholder="NEPOZNAT" value="${mx}"></label>
         <button data-sm-save-ramp="${esc(w.id)}:${r}">SPREMI PROMJENE RAMPE ${r}</button>
        </div>`}).join(''):'<div class="ysm-empty">Još nema rampi. Klikni <b>+ DODAJ RAMPU</b> da započneš konfiguraciju.</div>'}
       </div>
      </article>`
    })():`<div class="ysm-empty ysm-config-empty">${whs.length?'Odaberi skladište iznad. Nakon odabira ovdje uređuješ njegove rampe i ostale operativne podatke.':'Prvo napravi Lokaciju, zatim Skladište i poveži ga s tom lokacijom.'}</div>`;
 h.innerHTML=`
  <div class="ysm-head"><div><h2>MASTER PODACI</h2><p>Strukturu gradi redom: Lokacija → Skladište → Rampe i radno vrijeme → Kapacitet rampi → Dobavljači i odgovorne osobe. Master Data je jedini izvor za cijeli YARDIVO.</p></div><span class="ysm-live">YARDIVO MASTER</span></div>
  <div class="ysm-steps"><div class="ysm-step"><b>1</b><span><strong>LOKACIJA</strong><small>Dodaj fizičku lokaciju.</small></span></div><div class="ysm-step"><b>2</b><span><strong>SKLADIŠTE</strong><small>Poveži ga s lokacijom.</small></span></div><div class="ysm-step"><b>3</b><span><strong>RAMPE + PRIJAM</strong><small>Rampe koriste zajedničko vrijeme prijama.</small></span></div><div class="ysm-step"><b>4</b><span><strong>KAPACITET RAMPI</strong><small>Zbroj rampi daje kapacitet skladišta.</small></span></div><div class="ysm-step"><b>5</b><span><strong>PARTNERI I OSOBE</strong><small>Dobavljači i odgovorne osobe.</small></span></div></div>
  <div class="ysm-grid">
   <section class="ysm-card">
    <div class="ysm-card-kicker">KORAK 1</div><h3>LOKACIJE</h3><p>Prvo napravi stvarne lokacije. Bez lokacije nije moguće kreirati skladište.</p>
    <div class="ysm-list">${locs.length?locs.map(x=>`<div class="ysm-row"><input data-sm-loc-name="${esc(x.id)}" value="${esc(x.name)}"><div><button data-sm-save-loc="${esc(x.id)}">SPREMI</button> <button class="danger" data-sm-del-loc="${esc(x.id)}">OBRIŠI</button></div></div>`).join(''):'<div class="ysm-empty">Nema lokacija. Dodaj prvu lokaciju ispod.</div>'}</div>
    <div class="ysm-add"><input id="smNewLocation" placeholder="Naziv nove lokacije" value="${esc(draftLocationName)}"><button class="primary" data-sm-add-loc>DODAJ LOKACIJU</button></div>
   </section>
   <section class="ysm-card">
    <div class="ysm-card-kicker">KORAK 2</div><h3>SKLADIŠTA</h3><p>Upiši naziv skladišta i <b>obavezno odaberi lokaciju</b> kojoj pripada. YARDIVO neće sam pretpostaviti lokaciju.</p>
    <div class="ysm-list">${whs.length?whs.map(w=>`<div class="ysm-row"><div><input data-sm-wh-name="${esc(w.id)}" value="${esc(w.name)}"><small>${esc(locName(w.location_id,d))}</small></div><div><button data-sm-config-wh="${esc(w.id)}">KONFIGURIRAJ</button> <button data-sm-save-wh="${esc(w.id)}">SPREMI</button> <button class="danger" data-sm-del-wh="${esc(w.id)}">OBRIŠI</button></div></div>`).join(''):'<div class="ysm-empty">Nema skladišta. Prvo dodaj lokaciju, zatim skladište.</div>'}</div>
    <div class="ysm-warehouse-create">
      <label class="ysm-wh-name-field"><span>1 · NAZIV SKLADIŠTA</span><input id="smNewWarehouse" placeholder="npr. Glavno skladište" value="${esc(draftWarehouseName)}"></label>
      <label class="ysm-wh-location-field"><span>2 · ODABERI LOKACIJU <b>*</b></span><select id="smNewWarehouseLocation" ${locs.length?'':'disabled'} aria-label="Odaberi lokaciju za novo skladište"><option value="" ${draftWarehouseLocation?'':'selected'} disabled>— ODABERI LOKACIJU —</option>${locs.map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(draftWarehouseLocation)?'selected':''}>${esc(x.name)}</option>`).join('')}</select><small>${locs.length?`Odaberi jednu od ${locs.length} kreiranih lokacija. Skladište će biti vezano na taj location_id.`:'Prvo kreiraj lokaciju u Koraku 1.'}</small></label>
      <button class="primary" data-sm-add-wh ${draftWarehouseLocation?'':'disabled'}>DODAJ SKLADIŠTE</button>
    </div>
    ${locs.length?'<div class="ysm-hint">Skladište će biti trajno povezano s lokacijom koju ovdje odabereš.</div>':'<div class="ysm-hint warn">Za dodavanje skladišta prvo napravi barem jednu lokaciju u Koraku 1.</div>'}
   </section>
   <section class="ysm-card full" id="smWarehouseConfiguration">
    <div class="ysm-card-kicker">KORAK 3</div><h3>RAMPE I OPERATIVNI PODACI</h3>
    <p>Odaberi bilo koje Master skladište iz dropdowna ispod. Ovaj odabir je potpuno neovisan o lokaciji i skladištu u headeru. Uređuje se isključivo skladište odabrano ovdje. RADNO VRIJEME PRIJAMA je zajedničko radno vrijeme svih rampi tog skladišta; rampe nemaju zasebno radno vrijeme.</p>
    <div class="ysm-config-selector"><label>SKLADIŠTE ZA KONFIGURACIJU · SVA MASTER SKLADIŠTA<select id="smConfigWarehouse" ${whs.length?'':'disabled'}><option value="">— Odaberi skladište —</option>${whs.map(w=>`<option value="${esc(w.id)}" ${String(w.id)===String(configWarehouseId)?'selected':''}>${esc(locName(w.location_id,d))} → ${esc(w.name)}</option>`).join('')}</select></label></div>
    ${configHtml}
   </section>
  </div>`;
 hydrateMasterSelectors();
}
function hydrateMasterLocationSelect(){
 const sel=document.getElementById('smNewWarehouseLocation');if(!sel)return;
 const d=master(),rows=d.locations.filter(x=>x&&x.active!==false),wanted=String(draftWarehouseLocation||sel.value||'');
 const sig=JSON.stringify(rows.map(x=>[x.id,x.name]));
 if(sel.dataset.masterLocationSig!==sig){
  sel.innerHTML='<option value="" disabled>— ODABERI LOKACIJU —</option>'+rows.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
  sel.dataset.masterLocationSig=sig;
 }
 sel.disabled=!rows.length;
 sel.value=rows.some(x=>String(x.id)===wanted)?wanted:'';
 const btn=document.querySelector('#yardivoStableMasterEditorV583 [data-sm-add-wh]');if(btn)btn.disabled=!String(sel.value||'');
}
function hydrateMasterConfigWarehouseSelect(){
 const sel=document.getElementById('smConfigWarehouse');if(!sel)return;
 const d=master(),rows=d.warehouses.filter(x=>x&&x.active!==false),wanted=String(configWarehouseId||sel.value||'');
 const sig=JSON.stringify(rows.map(w=>[w.id,w.name,w.location_id,locName(w.location_id,d)]));
 if(sel.dataset.masterWarehouseSig!==sig){
  sel.innerHTML='<option value="">— Odaberi skladište —</option>'+rows.map(w=>`<option value="${esc(w.id)}">${esc(locName(w.location_id,d))} → ${esc(w.name)}</option>`).join('');
  sel.dataset.masterWarehouseSig=sig;
 }
 sel.disabled=!rows.length;
 sel.value=rows.some(w=>String(w.id)===wanted)?wanted:'';
}
function hydrateMasterSelectors(){hydrateMasterLocationSelect();hydrateMasterConfigWarehouseSelect()}
document.addEventListener('focusin',e=>{
 if(e.target?.id==='smNewWarehouseLocation')hydrateMasterLocationSelect();
 if(e.target?.id==='smConfigWarehouse')hydrateMasterConfigWarehouseSelect();
},true);
document.addEventListener('pointerdown',e=>{
 if(e.target?.id==='smNewWarehouseLocation')hydrateMasterLocationSelect();
 if(e.target?.id==='smConfigWarehouse')hydrateMasterConfigWarehouseSelect();
},true);

document.addEventListener('click',e=>{
 let b=e.target.closest?.('[data-sm-add-loc]');if(b){e.preventDefault();e.stopImmediatePropagation();addLocation(document.getElementById('smNewLocation')?.value);return}
 b=e.target.closest?.('[data-sm-save-loc]');if(b){e.preventDefault();e.stopImmediatePropagation();saveLocation(b.dataset.smSaveLoc);return}
 b=e.target.closest?.('[data-sm-del-loc]');if(b){e.preventDefault();e.stopImmediatePropagation();if(confirm('Obrisati lokaciju?'))deleteLocation(b.dataset.smDelLoc);return}
 b=e.target.closest?.('[data-sm-add-wh]');if(b){e.preventDefault();e.stopImmediatePropagation();addWarehouse(document.getElementById('smNewWarehouse')?.value,document.getElementById('smNewWarehouseLocation')?.value);return}
 b=e.target.closest?.('[data-sm-config-wh]');if(b){e.preventDefault();e.stopImmediatePropagation();configWarehouseId=String(b.dataset.smConfigWh||'');render('operation');setTimeout(()=>document.getElementById('smWarehouseConfiguration')?.scrollIntoView?.({behavior:'smooth',block:'start'}),20);return}
 b=e.target.closest?.('[data-sm-save-wh]');if(b){e.preventDefault();e.stopImmediatePropagation();saveWarehouseName(b.dataset.smSaveWh);return}
 b=e.target.closest?.('[data-sm-del-wh]');if(b){e.preventDefault();e.stopImmediatePropagation();if(confirm('Obrisati skladište?'))deleteWarehouse(b.dataset.smDelWh);return}
 b=e.target.closest?.('[data-sm-save-ops]');if(b){e.preventDefault();e.stopImmediatePropagation();saveWarehouseOps(b.dataset.smSaveOps);return}
 b=e.target.closest?.('[data-sm-add-ramp]');if(b){e.preventDefault();e.stopImmediatePropagation();changeRampCount(b.dataset.smAddRamp,1);return}
 b=e.target.closest?.('[data-sm-rem-ramp]');if(b){e.preventDefault();e.stopImmediatePropagation();if(confirm('Obrisati zadnju rampu?'))changeRampCount(b.dataset.smRemRamp,-1);return}
 b=e.target.closest?.('[data-sm-toggle-ramp]');if(b){e.preventDefault();e.stopImmediatePropagation();const [id,r]=b.dataset.smToggleRamp.split(':');toggleRampActive(id,Number(r));return}
 b=e.target.closest?.('[data-sm-save-ramp]');if(b){e.preventDefault();e.stopImmediatePropagation();const [id,r]=b.dataset.smSaveRamp.split(':');saveRamp(id,Number(r));return}
},true);
document.addEventListener('change',e=>{
 const locSel=e.target.closest?.('#smNewWarehouseLocation');
 if(locSel){
   draftWarehouseLocation=String(locSel.value||'');holdMasterEdit(5000);
   const btn=document.querySelector('#yardivoStableMasterEditorV583 [data-sm-add-wh]');
   if(btn)btn.disabled=!String(locSel.value||'').trim();
   return;
 }
 const sharedHours=e.target.closest?.('[data-sm-wh-from],[data-sm-wh-to]');
 if(sharedHours){
   const id=String(sharedHours.getAttribute('data-sm-wh-from')||sharedHours.getAttribute('data-sm-wh-to')||'');
   if(!id)return;
   holdMasterEdit(5000);
   const from=String(document.querySelector(`[data-sm-wh-from="${id}"]`)?.value||'');
   const to=String(document.querySelector(`[data-sm-wh-to="${id}"]`)?.value||'');
   const d=master(),w=d.warehouses.find(x=>String(x.id)===id);
   if(w){
     w.reception_from=from;w.reception_to=to;
     w.ramp_settings=Array.isArray(w.ramp_settings)?w.ramp_settings:[];
     w.ramp_settings.forEach(r=>{if(r){r.from=from;r.to=to}});
     const h=jget(HOURS,{});h[id]={from,to};jset(HOURS,h);
     const rh=jget(RH,{});rh[id]=rh[id]||{};for(let r=1;r<=Math.max(0,Number(w.ramps)||0);r++)rh[id][String(r)]={from,to};jset(RH,rh);
     commit(d,'warehouse.reception.shared-hours');
     document.querySelectorAll('#yardivoStableMasterEditorV583 .ysm-shared-hours').forEach(el=>{el.textContent=(from||'—')+' – '+(to||'—')});
     try{window.YardivoSupabase?.flushQueue?.()}catch(_){}
   }
   return;
 }
 const sel=e.target.closest?.('#smConfigWarehouse');if(!sel)return;
 configWarehouseId=String(sel.value||'');render('operation');
},true);

/* Only explicit navigation/real master changes when editor isn't being edited. */
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{render();hardEmptySupplierUi();observeFreshSupplierRows();document.getElementById('epalInitialSettings')?.remove()},90));
window.addEventListener('load',()=>setTimeout(()=>{render();hardEmptySupplierUi();observeFreshSupplierRows();document.getElementById('epalInitialSettings')?.remove()},260),{once:true});
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="settings"],[data-home-target="settings"]'))setTimeout(()=>{render();document.getElementById('epalInitialSettings')?.remove()},30)},true);
window.addEventListener('yardivo:login',()=>setTimeout(()=>{hardEmptySupplierUi();observeFreshSupplierRows();render()},80));
let externalRenderTimer=0;
function cancelExternalRender(){clearTimeout(externalRenderTimer);externalRenderTimer=0}
function scheduleExternalRender(ms=180){
 cancelExternalRender();
 externalRenderTimer=setTimeout(()=>{
  externalRenderTimer=0;
  if(document.activeElement?.closest?.('#yardivoStableMasterEditorV583'))return;
  if(Date.now()<masterEditHoldUntil)return;
  render();
 },ms);
}
window.addEventListener('yardivo:context-changed',e=>{if(e?.detail?.source==='stable-master')return;scheduleExternalRender(180)});
window.addEventListener('yardivo:master-data-changed',e=>{if(e?.detail?.source==='stable-master')return;scheduleExternalRender(180)});


/* Keep the Master form stable while the user is editing; no background redraw/flicker. */
document.addEventListener('pointerdown',e=>{if(e.target?.closest?.('#yardivoStableMasterEditorV583')){cancelExternalRender();holdMasterEdit(5000)}},true);
document.addEventListener('focusin',e=>{if(e.target?.closest?.('#yardivoStableMasterEditorV583')){cancelExternalRender();holdMasterEdit(5000)}},true);
document.addEventListener('input',e=>{if(e.target?.closest?.('#yardivoStableMasterEditorV583')){
 if(e.target.id==='smNewWarehouse')draftWarehouseName=String(e.target.value||'');
 if(e.target.id==='smNewLocation')draftLocationName=String(e.target.value||'');
 holdMasterEdit(5000)
}},true);
document.addEventListener('keydown',e=>{if(e.target?.closest?.('#yardivoStableMasterEditorV583'))holdMasterEdit(5000)},true);

/* Retire the old Settings ramp owner. It used legacy W101/W103 codes and must never be visible. */
function retireLegacyRampSettings(){
 const old=document.getElementById('receptionRampSettings');
 if(old)old.remove();
 const ghosts=document.querySelectorAll('#yardivoWarehouseConfigFinal,#yardivoSelectedWarehouseFinal');
 ghosts.forEach(el=>el.remove());
}
document.addEventListener('DOMContentLoaded',retireLegacyRampSettings);
window.addEventListener('load',retireLegacyRampSettings,{once:true});
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="settings"],[data-home-target="settings"]'))setTimeout(retireLegacyRampSettings,0)},true);
window.addEventListener('yardivo:master-data-changed',()=>setTimeout(retireLegacyRampSettings,0));
window.addEventListener('yardivo:context-changed',()=>setTimeout(retireLegacyRampSettings,0));

window.YardivoStableMasterV583={render,master,addLocation,addWarehouse,saveWarehouseOps,saveRamp,toggleRampActive,changeRampCount,build:BUILD};
window.YARDIVO_DEV_BUILD=BUILD;
})();
