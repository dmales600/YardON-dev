
(()=>{'use strict';
if(window.__YARDIVO_SUPPLIER_BOOKING_REBUILT_CLEAN__)return;window.__YARDIVO_SUPPLIER_BOOKING_REBUILT_CLEAN__=true;
const $=id=>document.getElementById(id);
const SCOPE='yardivo-user-scope';
const AVAIL='yardivo-supplier-availability';
const DELIV='yardivo-supplier-deliveries';
let scope=null,scopeLocations=[],scopeWarehouses=[],month=new Date(),date='',loc='',wh='',availability=null,choice=null,recommended=null,pdf=null,timer=0,initRunning=false,initDone=false;

function sessionRole(){
 try{return String(window.currentSession?.role||window.currentSession?.app_role||'').toLowerCase().trim()}catch(_){return''}
}
function supplierSessionActive(){
 return sessionRole()==='supplier' && !!window.currentSession?.serverAuthorized;
}

async function edge(functionName,body){
 if(!window.YardivoSupplierService?.call)throw new Error('Supplier data service nije spreman.');
 return await window.YardivoSupplierService.call(functionName,body||{});
}
function status(t){if($('sbnStatus'))$('sbnStatus').textContent=t}
function empty(title,text){$('sbnMap').innerHTML='<div class="sbn-empty"><strong>'+title+'</strong><span>'+text+'</span></div>'}
async function profileScope(){
 try{
   const c=await window.YardivoAuth?.client?.();
   const p=c?await window.YardivoAuth?.profile?.(c):null;
   if(!p||String(p.role||'').toLowerCase()!=='supplier')return null;
   const m=masterData(),ml=Array.isArray(m.locations)?m.locations:[],mw=Array.isArray(m.warehouses)?m.warehouses:[];
   const whIds=new Set((Array.isArray(p.warehouses)?p.warehouses:[]).map(String));
   const whs=mw.filter(w=>w&&w.active!==false&&whIds.has(String(w.id)));
   const locIds=new Set(whs.map(w=>String(w.location_id||'')).filter(Boolean));
   const pLoc=String(p.location||'').trim();if(pLoc&&pLoc!=='ALL')locIds.add(pLoc);
   const locs=ml.filter(l=>l&&l.active!==false&&locIds.has(String(l.id)));
   return normalizeBookingScope({app_role:'supplier',location:pLoc,locations:locs,location_ids:[...locIds],warehouses:whs,warehouse_ids:[...whIds]});
 }catch(_){return null}
}
function localScope(){
 const cached=window.__YARDIVO_SUPPLIER_CANONICAL_SCOPE_V583||window.YardivoServerScopeV583;
 if(cached&&String(cached.app_role||'').toLowerCase()==='supplier'){
   const n=normalizeBookingScope(cached);if(n.locations.length&&n.warehouses.length)return n;
 }
 const s=window.currentSession||window.__YARDIVO_SESSION__||{};
 let m={};try{m=window.YardivoAppStateV583?.master?.()||JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')||{}}catch(_){}
 const whIds=new Set();
 [...(Array.isArray(s.warehouses)?s.warehouses:[]),...(Array.isArray(s.warehouse_ids)?s.warehouse_ids:[])].forEach(x=>{const id=String(typeof x==='object'?(x?.id||''):x||'').trim();if(id)whIds.add(id)});
 const oneWh=String(s.warehouse||s.warehouse_id||'').trim();if(oneWh)whIds.add(oneWh);
 const whs=(Array.isArray(m.warehouses)?m.warehouses:[]).filter(w=>w&&w.active!==false&&whIds.has(String(w.id)));
 const locIds=new Set();
 whs.forEach(w=>String(w.location_id||'').trim()&&locIds.add(String(w.location_id)));
 [...(Array.isArray(s.locations)?s.locations:[]),...(Array.isArray(s.location_ids)?s.location_ids:[])].forEach(x=>{const id=String(typeof x==='object'?(x?.id||''):x||'').trim();if(id&&id!=='ALL')locIds.add(id)});
 const oneLoc=String(s.location||s.location_id||'').trim();if(oneLoc&&oneLoc!=='ALL')locIds.add(oneLoc);
 const locs=(Array.isArray(m.locations)?m.locations:[]).filter(l=>l&&l.active!==false&&locIds.has(String(l.id)));
 return {app_role:'supplier',locations:locs,warehouses:whs};
}
function masterData(){
 let m={};try{m=window.YardivoAppStateV583?.master?.()||JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')||{}}catch(_){}
 return m&&typeof m==='object'?m:{};
}
function normalizeBookingScope(raw){
 raw=raw||{};
 const m=masterData(),ml=Array.isArray(m.locations)?m.locations:[],mw=Array.isArray(m.warehouses)?m.warehouses:[];
 const whIds=new Set(),locIds=new Set(),whMap=new Map(),locMap=new Map();

 (Array.isArray(raw.warehouses)?raw.warehouses:[]).forEach(x=>{
   if(x&&typeof x==='object'){const id=String(x.id||'').trim();if(id){whIds.add(id);whMap.set(id,{id,name:String(x.name||id),location_id:String(x.location_id||''),active:x.active!==false})}}
   else{const id=String(x||'').trim();if(id)whIds.add(id)}
 });
 (Array.isArray(raw.warehouse_ids)?raw.warehouse_ids:[]).forEach(x=>{const id=String(x||'').trim();if(id)whIds.add(id)});
 const oneWh=String(raw.warehouse||raw.warehouse_id||'').trim();if(oneWh)whIds.add(oneWh);

 (Array.isArray(raw.locations)?raw.locations:[]).forEach(x=>{
   if(x&&typeof x==='object'){const id=String(x.id||'').trim();if(id){locIds.add(id);locMap.set(id,{id,name:String(x.name||id),active:x.active!==false})}}
   else{const id=String(x||'').trim();if(id&&id!=='ALL')locIds.add(id)}
 });
 (Array.isArray(raw.location_ids)?raw.location_ids:[]).forEach(x=>{const id=String(x||'').trim();if(id&&id!=='ALL')locIds.add(id)});
 const oneLoc=String(raw.location||raw.location_id||'').trim();if(oneLoc&&oneLoc!=='ALL')locIds.add(oneLoc);

 whIds.forEach(id=>{
   if(!whMap.has(id)){
     const w=mw.find(x=>x&&x.active!==false&&String(x.id)===id);
     if(w)whMap.set(id,{id,name:String(w.name||id),location_id:String(w.location_id||''),active:true});
   }
 });
 whMap.forEach(w=>{if(w.location_id)locIds.add(String(w.location_id))});
 locIds.forEach(id=>{
   if(!locMap.has(id)){
     const l=ml.find(x=>x&&x.active!==false&&String(x.id)===id);
     locMap.set(id,{id,name:String(l?.name||id),active:l?.active!==false});
   }
 });

 return {
   ...raw,
   app_role:String(raw.app_role||'supplier'),
   locations:[...locMap.values()].filter(x=>x.active!==false),
   warehouses:[...whMap.values()].filter(x=>x.active!==false)
 };
}
function commitScope(raw){
 scope=normalizeBookingScope(raw);
 scopeLocations=Array.isArray(scope.locations)?scope.locations.slice():[];
 scopeWarehouses=Array.isArray(scope.warehouses)?scope.warehouses.slice():[];
 return scope;
}
function locations(){return scopeLocations}
function warehouses(){return scopeWarehouses}
async function refreshScopeForStep2(){
 let last=null;
 /* 1) Server scope is authoritative. */
 for(let i=0;i<4;i++){
   try{
     const fresh=await edge(SCOPE,{});
     const normalized=commitScope(fresh);
     if(String(normalized?.app_role||'').toLowerCase()==='supplier'&&locations().length&&warehouses().length)return normalized;
     last=new Error('Supplier nema dodijeljenu lokaciju ili skladište.');
   }catch(e){last=e}
   await new Promise(r=>setTimeout(r,180+i*140));
 }
 /* 2) Auth profile is the next trusted source and survives page reloads. */
 const prof=await profileScope();
 if(prof?.locations?.length&&prof?.warehouses?.length)return commitScope(prof);
 /* 3) Current session + already-synced Master is the final UI fallback.
       Availability/send still revalidate scope on the server. */
 const fallback=localScope();
 if(fallback?.locations?.length&&fallback?.warehouses?.length)return commitScope(fallback);
 if(scope&&locations().length&&warehouses().length)return scope;
 throw last||new Error('Supplier dodjela nije dostupna.');
}
function populateLocationSelect(){
 const sel=$('sbnLocationSelect');if(!sel)return;
 const rows=locations().filter(x=>x&&String(x.id||'').trim());
 sel.innerHTML='<option value="">Odaberi lokaciju...</option>';
 rows.forEach(x=>sel.add(new Option(String(x.name||x.id),String(x.id))));
 sel.disabled=!rows.length;
 if(rows.length){sel.removeAttribute('disabled');sel.style.pointerEvents='auto';sel.style.opacity='1'}
}
function warehouseBookingState(id){
 const m=masterData(),all=Array.isArray(m.warehouses)?m.warehouses:[],mw=all.find(x=>x&&x.active!==false&&String(x.id)===String(id));
 /* If local Master is not hydrated yet, do not false-block the user.
    The availability Edge Function remains the final authority. */
 if(!mw)return {known:false,bookable:true,reason:''};
 const rf=String(mw.reception_from||'').slice(0,5),rt=String(mw.reception_to||'').slice(0,5);
 const schedule=/^([01]\d|2[0-3]):[0-5]\d$/.test(rf)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(rt)&&rt>rf;
 const ramps=(Array.isArray(mw.ramp_settings)?mw.ramp_settings:[]).filter(r=>r&&r.active!==false&&Number(r.number)>0&&Number(r.pallets_per_hour)>0);
 const bookable=schedule&&ramps.length>0;
 return {known:true,bookable,reason:!schedule?'radno vrijeme nije definirano':(!ramps.length?'nema aktivnih konfiguriranih rampi':'')};
}
function ensureWarehouseScopeNote(){
 const sel=$('sbnWarehouseSelect');if(!sel||$('sbnScopeWarehouseNote'))return;
 const host=sel.closest('label')||sel.parentElement;if(!host)return;
 const n=document.createElement('small');n.id='sbnScopeWarehouseNote';
 n.style.cssText='display:block;margin-top:7px;color:#7890a4;font-size:9px;line-height:1.45';
 n.textContent='Prikazuju se skladišta dodijeljena ovom Supplier accountu.';
 host.appendChild(n);
}
function populateWarehouseSelect(){
 ensureWarehouseScopeNote();
 const sel=$('sbnWarehouseSelect');if(!sel)return;
 const rows=warehouses().filter(x=>x&&String(x.location_id||'')===String(loc));
 sel.innerHTML='<option value="">Odaberi skladište...</option>';
 let usable=0;
 rows.forEach(x=>{
   const st=warehouseBookingState(x.id),label=String(x.name||x.id)+(st.known&&!st.bookable?' · NIJE KONFIGURIRANO':'');
   const o=new Option(label,String(x.id));o.disabled=st.known&&!st.bookable;
   if(!o.disabled)usable++;
   sel.add(o);
 });
 sel.disabled=!loc||!rows.length||usable===0;
 if(loc&&rows.length&&usable>0){sel.removeAttribute('disabled');sel.style.pointerEvents='auto';sel.style.opacity='1'}
 try{sbnSelectSyncLastWh=String(sel.value||'')}catch(_){}
 const note=$('sbnScopeWarehouseNote');
 if(note){
   const blocked=rows.filter(x=>{const st=warehouseBookingState(x.id);return st.known&&!st.bookable});
   note.textContent=blocked.length
     ? 'Skladišta označena “NIJE KONFIGURIRANO” nemaju radno vrijeme i/ili aktivne rampe u Master podacima te se ne mogu odabrati za najavu.'
     : 'Prikazuju se skladišta dodijeljena ovom Supplier accountu.';
 }
}
function contextReady(){return !!date&&!!loc&&!!wh}
function qtyReady(){return Number($('sbnPallets')?.value)>0&&Number($('sbnSku')?.value)>0}
function hm(v){const [h,m]=String(v||'').slice(0,5).split(':').map(Number);return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:NaN}
function fmt(d){try{return new Date(d+'T12:00:00').toLocaleDateString('hr-HR')}catch(_){return d}}
function resetChoice(){choice=null;$('sbnChoice').textContent='TERMIN NIJE ODABRAN';$('sbnSend').disabled=true}
function drawCalendar(){
 const g=$('sbnCalendar');if(!g)return;
 const names=['PON','UTO','SRI','ČET','PET','SUB','NED'];g.innerHTML=names.map(x=>'<div class="sbn-dow">'+x+'</div>').join('');
 $('sbnMonth').textContent=month.toLocaleDateString('hr-HR',{month:'long',year:'numeric'});
 const first=(new Date(month.getFullYear(),month.getMonth(),1).getDay()+6)%7;
 for(let i=0;i<first;i++)g.insertAdjacentHTML('beforeend','<button class="sbn-day blank"></button>');
 const today=new Date();today.setHours(0,0,0,0);const n=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
 for(let d=1;d<=n;d++){
  const x=new Date(month.getFullYear(),month.getMonth(),d),iso=x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'),weekend=x.getDay()===0||x.getDay()===6;
  const b=document.createElement('button');b.type='button';b.className='sbn-day'+(weekend?' weekend':'')+(iso===date?' selected':'')+(x.getTime()===today.getTime()?' today':'');b.textContent=d;b.disabled=x<today;
  b.onclick=()=>selectDate(iso);g.appendChild(b);
 }
}
async function selectDate(iso){
 date=iso;loc='';wh='';availability=null;resetChoice();drawCalendar();
 $('sbnScopeStep').hidden=false;$('sbnQtyStep').hidden=true;$('sbnMapStep').hidden=true;$('sbnExtra').hidden=true;
 const ls=$('sbnLocationSelect'),ws=$('sbnWarehouseSelect');
 if(ls){ls.innerHTML='<option value="">Učitavam lokacije...</option>';ls.disabled=true}
 if(ws){ws.innerHTML='<option value="">Prvo odaberi lokaciju...</option>';ws.disabled=true}
 status('UČITAVAM LOKACIJE');
 try{
   await refreshScopeForStep2();
   populateLocationSelect();
   status('ODABERI LOKACIJU · '+locations().length+' LOK. · '+warehouses().length+' SKL.');
 }catch(e){
   if(ls){ls.innerHTML='<option value="">Lokacija nije dostupna</option>';ls.disabled=true}
   status('DODJELA NIJE DOSTUPNA');
   alert('Lokacija/skladište nije moguće učitati: '+String(e?.message||e));
 }
 setTimeout(()=>$('sbnScopeStep').scrollIntoView({behavior:'smooth',block:'center'}),50);
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderLocations(){populateLocationSelect()}
function renderWarehouses(){populateWarehouseSelect()}
async function loadAvailability(){
 clearTimeout(timer);resetChoice();recommended=null;$('sbnRecommend').disabled=true;
 if(!contextReady()||!qtyReady())return;
 timer=setTimeout(async()=>{
  status('RAČUNAM TERMINE');empty('Učitavam dnevnu mapu…','Provjeravam radno vrijeme i zauzetost rampi.');
  try{
   availability=await edge(AVAIL,{location_id:loc,warehouse_id:wh,delivery_date:date,pallets:Number($('sbnPallets').value),sku_count:Number($('sbnSku').value)});
   renderMap();status(availability?.closed_day?'NERADNI DAN':'ODABERI TERMIN');
   setTimeout(()=>$('sbnMapStep').scrollIntoView({behavior:'smooth',block:'center'}),70);
  }catch(e){
 const msg=String(e?.message||e),code=String(e?.code||'');
 if(code==='WAREHOUSE_RAMPS_INCOMPLETE'||/aktivnih rampi|konfiguriran.*ramp/i.test(msg)){
   empty('Skladište nema konfigurirane aktivne rampe','Admin treba u Master podacima definirati aktivne rampe i kapacitet paleta/sat za odabrano skladište.');
   status('SKLADIŠTE NIJE KONFIGURIRANO');
 }else if(code==='WAREHOUSE_SCHEDULE_INCOMPLETE'||/vrijeme prijama/i.test(msg)){
   empty('Radno vrijeme prijama nije definirano','Admin treba u Master podacima definirati vrijeme prijama za odabrano skladište.');
   status('SKLADIŠTE NIJE KONFIGURIRANO');
 }else{
   empty('Mapa termina nije dostupna',msg);status('PROVJERI PODATKE');
 }
}
 },250);
}
function renderMap(){
 const d=availability||{},slots=Array.isArray(d.slots)?d.slots:[],box=$('sbnMap');
 $('sbnMapSub').textContent=(warehouses().find(x=>String(x.id)===wh)?.name||wh)+' · '+fmt(date);
 if(!slots.length){empty('Nema termina','Za odabrani dan nema dostupnih slotova.');return}
 const times=[...new Set(slots.map(x=>String(x.start||'')))].filter(Boolean).sort();
 const ramps=[...new Map(slots.map(x=>[String(x.ramp_number),{n:Number(x.ramp_number),name:String(x.ramp||('Rampa '+x.ramp_number))}])).values()].sort((a,b)=>a.n-b.n);
 const by=new Map(slots.map(x=>[String(x.ramp_number)+'|'+String(x.start),x]));
 let h='<table class="sbn-grid"><thead><tr><th>RAMPA</th>'+times.map(t=>'<th>'+t+'</th>').join('')+'</tr></thead><tbody>';
 for(const r of ramps){h+='<tr><th class="ramp">'+r.name+'</th>';for(const t of times){const x=by.get(String(r.n)+'|'+t);if(!x){h+='<td></td>';continue}if(x.occupied)h+='<td><button class="sbn-slot busy" disabled>'+(x.closed_day?'NERADNI':'ZAUZETO')+'</button></td>';else h+='<td><button class="sbn-slot free" data-ramp="'+r.n+'" data-start="'+x.start+'" data-end="'+x.end+'" data-name="'+r.name+'">SLOBODNO</button></td>'}h+='</tr>'}h+='</tbody></table>';box.innerHTML=h;
 if(d.closed_day){$('sbnRecText').textContent='Skladište ne radi na odabrani dan.';$('sbnRecommend').disabled=true;return}
 recommended=slots.find(x=>x&&x.recommended&&!x.occupied)||null;
 if(recommended){const dur=Math.max(15,hm(recommended.end)-hm(recommended.start));$('sbnRecText').textContent=(recommended.ramp||('Rampa '+recommended.ramp_number))+' · '+recommended.start+'–'+recommended.end+' · '+dur+' min';$('sbnRecommend').disabled=false}else{$('sbnRecText').textContent='Nema slobodne preporuke.'}
 box.querySelectorAll('.sbn-slot.free').forEach(b=>b.onclick=()=>{box.querySelectorAll('.sbn-slot.selected,.sbn-slot.suggested').forEach(x=>x.classList.remove('selected','suggested'));b.classList.add('selected');choice={ramp:Number(b.dataset.ramp),dock:'R'+b.dataset.ramp,start:b.dataset.start,end:b.dataset.end,name:b.dataset.name};$('sbnChoice').textContent='ODABRANO · '+choice.name+' · '+choice.start+'–'+choice.end;$('sbnSend').disabled=false;status('SPREMNO ZA SLANJE')});
}
function showRecommendation(){
 if(!recommended)return;const q='.sbn-slot.free[data-ramp="'+recommended.ramp_number+'"][data-start="'+recommended.start+'"]',b=$('sbnMap').querySelector(q);if(!b)return;$('sbnMap').querySelectorAll('.sbn-slot.suggested').forEach(x=>x.classList.remove('suggested'));b.classList.add('suggested');b.scrollIntoView({behavior:'smooth',block:'center',inline:'center'});setTimeout(()=>b.classList.remove('suggested'),6000);
}
function bindPdf(){
 $('sbnPdfBtn').onclick=()=>$('sbnPdf').click();
 $('sbnPdf').onchange=()=>{const f=$('sbnPdf').files?.[0];pdf=null;if(!f){$('sbnPdfName').textContent='Nije odabran dokument · max 1.5 MB';return}if((f.type!=='application/pdf'&&!/\.pdf$/i.test(f.name))||f.size>1572864){alert('PDF mora biti PDF datoteka do 1.5 MB.');$('sbnPdf').value='';return}const r=new FileReader();r.onload=()=>{pdf={document_name:f.name,document_mime:'application/pdf',document_base64:String(r.result||'').split(',').pop()||''};$('sbnPdfName').textContent=f.name+' · '+Math.ceil(f.size/1024)+' KB'};r.readAsDataURL(f)};
}
async function send(){
 if(!choice||!contextReady()||!qtyReady())return;
 const btn=$('sbnSend');btn.disabled=true;btn.textContent='ŠALJEM...';status('ŠALJEM U ZALIHE');
 try{
  const fresh=await edge(AVAIL,{location_id:loc,warehouse_id:wh,delivery_date:date,pallets:Number($('sbnPallets').value),sku_count:Number($('sbnSku').value)});
  const ok=(fresh.slots||[]).find(x=>x.selectable&&Number(x.ramp_number)===choice.ramp&&String(x.start)===choice.start);if(!ok)throw new Error('Termin više nije slobodan. Osvježi mapu.');
  const client='SUP-'+(crypto.randomUUID?.()||Date.now());
  await edge(DELIV,{action:'upsert',client_id:client,location:loc,warehouse:wh,delivery_date:date,requested_time:choice.start,pallets:Number($('sbnPallets').value),sku_count:Number($('sbnSku').value),dock:choice.dock,order_number:String($('sbnOrder').value||'').trim(),vehicle_plate:String($('sbnPlate').value||'').trim(),trailer_plate:String($('sbnTrailer').value||'').trim(),driver_name:String($('sbnDriver').value||'').trim(),driver_contact:String($('sbnDriverContact').value||'').trim(),delivery_note:String($('sbnReference').value||'').trim(),note:String($('sbnNote').value||'').trim(),...(pdf||{})});
  alert('Najava je poslana u Zalihe.');resetAll();window.dispatchEvent(new CustomEvent('yardivo:supplier-request-updated',{detail:{source:'supplier-booking-rebuilt'}}));
 }catch(e){alert('Najava nije poslana: '+String(e?.message||e));status('GREŠKA PRI SLANJU')}
 finally{btn.textContent='POŠALJI NAJAVU U ZALIHE';if(choice)btn.disabled=false}
}
function resetAll(){
 date='';loc='';wh='';availability=null;choice=null;recommended=null;pdf=null;
 if($('sbnLocationSelect')){$('sbnLocationSelect').innerHTML='<option value="">Odaberi lokaciju...</option>';$('sbnLocationSelect').disabled=false}
 if($('sbnWarehouseSelect')){$('sbnWarehouseSelect').innerHTML='<option value="">Prvo odaberi lokaciju...</option>';$('sbnWarehouseSelect').disabled=true}
 ['sbnPallets','sbnSku','sbnOrder','sbnReference','sbnPlate','sbnTrailer','sbnDriver','sbnDriverContact','sbnNote'].forEach(id=>{if($(id))$(id).value=''});$('sbnScopeStep').hidden=true;$('sbnQtyStep').hidden=true;$('sbnMapStep').hidden=true;$('sbnExtra').hidden=true;$('sbnSend').disabled=true;$('sbnPdf').value='';$('sbnPdfName').textContent='Nije odabran dokument · max 1.5 MB';drawCalendar();status('ODABERI DATUM')
}
async function init(){
 if(!supplierSessionActive()){
   status('ČEKA PRIJAVU');
   return false;
 }
 if(initRunning||initDone)return true;
 initRunning=true;
 drawCalendar();bindPdf();status('UČITAVAM DODJELU');
 let last=null;
 for(let i=0;i<5;i++){
  try{commitScope(await edge(SCOPE,{}));if(String(scope?.app_role||'').toLowerCase()==='supplier'&&locations().length&&warehouses().length)break}catch(e){last=e}
  await new Promise(r=>setTimeout(r,250+i*150));
 }
 if(!scope||!locations().length||!warehouses().length){
  const fallback=localScope();
  if(fallback.locations.length&&fallback.warehouses.length)commitScope(fallback);
 }
 if(!scope||!locations().length||!warehouses().length){
   status('DODJELA NIJE DOSTUPNA');
   initRunning=false;
   if(supplierSessionActive())alert(String(last?.message||'Admin nije dodijelio lokaciju/skladište.'));
   return false;
 }
 status('ODABERI DATUM');
 initDone=true;
 initRunning=false;
 return true;
}

function applyLocationSelection(){
 const sel=$('sbnLocationSelect');if(!sel)return;
 const next=String(sel.value||'');
 if(next===loc&&next)return;
 loc=next;wh='';resetChoice();
 $('sbnQtyStep').hidden=true;$('sbnMapStep').hidden=true;$('sbnExtra').hidden=true;
 populateWarehouseSelect();
 status(loc?'ODABERI SKLADIŠTE':'ODABERI LOKACIJU');
}
function applyWarehouseSelection(){
 const sel=$('sbnWarehouseSelect');if(!sel)return;
 const next=String(sel.value||'');
 const st=next?warehouseBookingState(next):{known:false,bookable:true,reason:''};
 if(next&&st.known&&!st.bookable){
   sel.value='';wh='';resetChoice();
   $('sbnQtyStep').hidden=true;$('sbnMapStep').hidden=true;$('sbnExtra').hidden=true;
   status('SKLADIŠTE NIJE KONFIGURIRANO');
   empty('Najava za ovo skladište trenutno nije moguća.',st.reason+'. Admin treba dovršiti Master konfiguraciju skladišta.');
   return;
 }
 wh=next;resetChoice();
 const ready=!!loc&&!!wh;
 $('sbnQtyStep').hidden=!ready;
 $('sbnMapStep').hidden=!ready;
 $('sbnExtra').hidden=!ready;
 if(ready){
   status('SKLADIŠTE ODABRANO · UNESI PALETE I SKU');
   empty('Dnevna mapa je spremna za izračun.','Unesi broj paleta i SKU, zatim će se prikazati slobodni zeleni termini.');
   setTimeout(()=>{try{$('sbnQtyStep').scrollIntoView({behavior:'smooth',block:'center'});$('sbnPallets')?.focus()}catch(_){}},60);
 }else{
   status('ODABERI SKLADIŠTE');
 }
}
$('sbnPrev').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);drawCalendar()};
$('sbnNext').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);drawCalendar()};
['input','change'].forEach(ev=>$('sbnLocationSelect').addEventListener(ev,applyLocationSelection));
['input','change'].forEach(ev=>$('sbnWarehouseSelect').addEventListener(ev,applyWarehouseSelection));

/* Native select events can behave differently across browser/OS pickers.
   While Step 2 is visible, synchronize the actual selected values so the flow
   advances even if a browser does not emit the expected event sequence. */
let sbnSelectSyncLastLoc='',sbnSelectSyncLastWh='';
setInterval(()=>{
 const step=$('sbnScopeStep');if(!step||step.hidden)return;
 const ls=$('sbnLocationSelect'),ws=$('sbnWarehouseSelect');if(!ls||!ws)return;
 const lv=String(ls.value||''),wv=String(ws.value||'');
 if(lv!==sbnSelectSyncLastLoc){
   sbnSelectSyncLastLoc=lv;
   if(lv!==loc)applyLocationSelection();
 }
 if(wv!==sbnSelectSyncLastWh){
   sbnSelectSyncLastWh=wv;
   if(wv!==wh)applyWarehouseSelection();
 }
},180);
$('sbnPallets').addEventListener('input',loadAvailability);$('sbnSku').addEventListener('input',loadAvailability);
$('sbnRecommend').onclick=showRecommendation;$('sbnReset').onclick=resetAll;$('sbnSend').onclick=send;
$('sbnFullscreen').onclick=()=>{const m=$('sbnMapStep'),on=!m.classList.contains('fullscreen');m.classList.toggle('fullscreen',on);document.body.classList.toggle('sbn-fullscreen',on);$('sbnFullscreen').textContent=on?'× ZATVORI':'⛶ POVEĆAJ MAPU'};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('sbnMapStep')?.classList.contains('fullscreen')){$('sbnMapStep').classList.remove('fullscreen');document.body.classList.remove('sbn-fullscreen');$('sbnFullscreen').textContent='⛶ POVEĆAJ MAPU'}});
function scheduleSupplierInit(delay=120){
 setTimeout(()=>{
   if(!supplierSessionActive())return;
   void init().catch(e=>{
     initRunning=false;
     console.error('YardOn supplier booking init',e);
   });
 },delay);
}

/* Supplier booking is owned by an authenticated Supplier session only.
   Never call Supplier Edge/Auth from Welcome or the generic Login screen. */
window.addEventListener('yardivo:login',e=>{
 const s=e?.detail?.session||window.currentSession||{};
 if(String(s?.role||s?.app_role||'').toLowerCase().trim()==='supplier')scheduleSupplierInit(120);
});
window.addEventListener('yardivo:session-ready',()=>scheduleSupplierInit(120));
setTimeout(()=>scheduleSupplierInit(0),350);
window.YARDIVO_DEV_BUILD='20260928-v1.0-supplier-auth-guard';
})();
