(function(){
'use strict';
if(window.__YARDIVO_SUPPLIER_HISTORY_TOMBSTONE_VOICE_20260924__)return;
window.__YARDIVO_SUPPLIER_HISTORY_TOMBSTONE_VOICE_20260924__=true;

const GHOST='dobavljac69';
const norm=v=>String(v??'').trim().toLowerCase();
const hasGhost=v=>norm(v).includes(GHOST);

function objectIsGhost(v){
 if(!v||typeof v!=='object')return false;
 return ['username','user','supplier','supplier_name','supplierName','name','email','code','supplier_code']
   .some(k=>v[k]!=null&&hasGhost(v[k]));
}
function scrubJson(v){
 if(v==null)return v;
 if(typeof v==='string')return hasGhost(v)?undefined:v;
 if(Array.isArray(v))return v.map(scrubJson).filter(x=>x!==undefined&&!objectIsGhost(x));
 if(typeof v==='object'){
   if(objectIsGhost(v))return undefined;
   const out={};
   Object.entries(v).forEach(([k,val])=>{
     if(hasGhost(k))return;
     const clean=scrubJson(val);
     if(clean!==undefined)out[k]=clean;
   });
   return out;
 }
 return v;
}

/* Permanent client tombstone. Old master/cache writers are allowed to run, but they
   can never persist dobavljac69 again. This is intentionally narrow: every other
   Storage write is passed through unchanged. */
function installStorageGhostGuard(){
 if(window.__YARDON_GHOST_SUPPLIER_STORAGE_GUARD_V1__)return;
 window.__YARDON_GHOST_SUPPLIER_STORAGE_GUARD_V1__=true;
 try{
   const nativeSet=Storage.prototype.setItem;
   Storage.prototype.setItem=function(key,value){
     try{
       if(hasGhost(key)){this.removeItem(key);return}
       if(typeof value==='string'&&hasGhost(value)){
         try{
           const clean=scrubJson(JSON.parse(value));
           if(clean===undefined){this.removeItem(key);return}
           value=JSON.stringify(clean);
         }catch(_){
           this.removeItem(key);return;
         }
       }
     }catch(_){}
     return nativeSet.call(this,key,value);
   };
 }catch(_){}
}
function scrubStorage(st){
 try{
   const keys=[];for(let i=0;i<st.length;i++){const k=st.key(i);if(k)keys.push(k)}
   keys.forEach(k=>{
     try{
       if(hasGhost(k)){st.removeItem(k);return}
       const raw=st.getItem(k);if(!raw||!hasGhost(raw))return;
       try{
         const clean=scrubJson(JSON.parse(raw));
         if(clean===undefined)st.removeItem(k);else st.setItem(k,JSON.stringify(clean));
       }catch(_){st.removeItem(k)}
     }catch(_){}
   });
 }catch(_){}
}
function removeFromArray(arr,matcher){
 if(!Array.isArray(arr))return false;
 let changed=false;
 for(let i=arr.length-1;i>=0;i--){let hit=false;try{hit=!!matcher(arr[i])}catch(_){}if(hit){arr.splice(i,1);changed=true}}
 return changed;
}
function purgeGhostSupplier(){
 scrubStorage(localStorage);scrubStorage(sessionStorage);
 let annChanged=false;
 try{if(typeof suppliers!=='undefined')removeFromArray(suppliers,x=>hasGhost(typeof x==='string'?x:(x?.name||x?.username||x?.supplier||'')))}catch(_){}
 try{if(typeof announcements!=='undefined')annChanged=removeFromArray(announcements,x=>objectIsGhost(x)||hasGhost(x?.supplier))||annChanged}catch(_){}
 try{if(typeof incidents!=='undefined')removeFromArray(incidents,x=>objectIsGhost(x)||hasGhost(x?.supplier))}catch(_){}
 try{if(typeof trucks!=='undefined')removeFromArray(trucks,x=>objectIsGhost(x)||hasGhost(x?.supplier))}catch(_){}
 try{if(annChanged&&typeof saveAnnouncements==='function')saveAnnouncements()}catch(_){}
 try{
   document.querySelectorAll('option,tr,li,[data-username],[data-user],[data-supplier],[data-supplier-name],.supplier-card,.supplier-row').forEach(el=>{
     const values=[el.textContent,el.getAttribute?.('data-username'),el.getAttribute?.('data-user'),el.getAttribute?.('data-supplier'),el.getAttribute?.('data-supplier-name')];
     if(values.some(hasGhost))el.remove();
   });
 }catch(_){}
}

function warehouseCfg(id){try{return typeof WAREHOUSES!=='undefined'?WAREHOUSES?.[id]:null}catch(_){return null}}
function toMin(v){const m=String(v||'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):NaN}
function hhmm(v){const n=Math.max(0,Math.round(Number(v)||0));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
function rows(){try{return typeof announcements!=='undefined'&&Array.isArray(announcements)?announcements:[]}catch(_){return []}}
function editingId(){try{return typeof editingAnnouncementId!=='undefined'?editingAnnouncementId:null}catch(_){return null}}
function activeRampCapacity(warehouse){
 const w=warehouseCfg(warehouse),count=Math.max(0,Number(w?.ramps)||0);let active=0;
 for(let n=1;n<=count;n++){
   let locked=false;try{locked=!!window.YardivoRampConfig?.isLocked?.(warehouse,n)}catch(_){}
   if(!locked)active++;
 }
 return active;
}
function timeCapacity(date,warehouse,time,duration,ignoreId){
 const w=warehouseCfg(warehouse),capacity=activeRampCapacity(warehouse),start=toMin(time),dur=Math.max(15,Number(duration)||15);
 if(!w||!capacity||!Number.isFinite(start))return {ok:false,reason:'Skladište nema aktivan prijamni kapacitet.'};
 const from=toMin(w.receptionStart||'06:00'),to=toMin(w.receptionEnd||'13:00');
 if(Number.isFinite(from)&&start<from)return {ok:false,reason:'Termin je prije početka prijama.'};
 if(Number.isFinite(to)&&start+dur>to)return {ok:false,reason:'Termin završava nakon radnog vremena prijama.'};
 const active=rows().filter(a=>String(a?.warehouse||'')===String(warehouse)&&String(a?.date||'')===String(date)&&String(a?.id)!==String(ignoreId??''))
   .filter(a=>!['odbijen','rejected','cancelled','canceled','otkazano','završeno','zaprimljeno'].includes(norm(a?.status)));
 for(let m=start;m<start+dur;m+=15){
   let used=0;
   for(const a of active){const s=toMin(a?.time),d=Math.max(15,Number(a?.duration)||15);if(Number.isFinite(s)&&m<s+d&&m+15>s)used++}
   if(used>=capacity)return {ok:false,reason:`Kapacitet skladišta je popunjen oko ${hhmm(m)}. Odaberi drugo vrijeme.`};
 }
 return {ok:true,capacity};
}
function setMsg(kind,title,msg){
 try{if(typeof setAnnMessage==='function')return setAnnMessage(kind,title,msg)}catch(_){}
 const el=document.getElementById('annMessage');if(el){el.className='notice-result '+kind;el.innerHTML=`<h3>${title}</h3><p>${msg}</p>`}
}
function toast(kind,title,msg){try{if(typeof showYmsToast==='function')showYmsToast(kind,title,msg)}catch(_){} }
function duration(pallets){try{return typeof unloadDuration==='function'?unloadDuration(pallets):60}catch(_){return 60}}
function orderNumber(){
 try{if(typeof validateManualOrderNumber==='function'){const x=validateManualOrderNumber();if(!x?.ok)return null;return x.order||''}}catch(_){}
 return String(document.getElementById('annOrderNumber')?.value||'').trim();
}
function closedReason(date){
 try{if(typeof isWeekendIsoEarly==='function'&&isWeekendIsoEarly(date))return 'Subotom i nedjeljom nema prijama robe.'}catch(_){}
 try{if(typeof holidayNameEarly==='function'){const h=holidayNameEarly(date);if(h)return `${h} — nema prijama robe.`}}catch(_){}
 return '';
}
function changeHistory(a){try{return typeof ensureChangeHistory==='function'?ensureChangeHistory(a):(a.changeHistory||(a.changeHistory=[]))}catch(_){return a.changeHistory||(a.changeHistory=[])} }
function saveAll(){
 try{if(typeof saveAnnouncements==='function')saveAnnouncements()}catch(_){}
 try{if(typeof renderAnnouncements==='function')renderAnnouncements()}catch(_){}
 try{if(typeof renderAnnouncementSchedule==='function')renderAnnouncementSchedule()}catch(_){}
 try{window.dispatchEvent(new CustomEvent('yardivo:data-synced'))}catch(_){}
}
function annNo(a){try{return typeof announcementNumber==='function'?announcementNumber(a):a.id}catch(_){return a.id}}
function newRef(){try{return typeof yardivoGenerateAnnouncementRef==='function'?yardivoGenerateAnnouncementRef():'ANN-'+Date.now()}catch(_){return 'ANN-'+Date.now()} }
function actor(){try{return currentSession?.user||currentSession?.username||''}catch(_){return ''}}

/* Canonical internal manual entry: TIME ONLY. Dock is always null here.
   Physical planning/assignment belongs to YardOn AI Operations / arrival flow. */
function timeOnlyApplyAnnouncement(){
 const date=String(document.getElementById('annDate')?.value||''),warehouse=String(document.getElementById('annWarehouse')?.value||''),supplier=String(document.getElementById('annSupplier')?.value||'').trim();
 const time=String(document.getElementById('annTime')?.value||'').slice(0,5),responsible=String(document.getElementById('annResponsible')?.value||'').trim(),responsibleEl=document.getElementById('annResponsible');
 if(!date||!warehouse||!supplier){setMsg('bad','Nedostaju podaci','Odaberi datum, skladište i dobavljača.');return false}
 if(!responsible){responsibleEl?.classList.add('required-error');setMsg('bad','ODGOVORNA OSOBA JE OBAVEZNA','Odaberi odgovornu osobu prije spremanja najave.');toast('error','ODGOVORNA OSOBA JE OBAVEZNA','Najavu nije moguće spremiti bez odgovorne osobe.');responsibleEl?.focus();return false}
 responsibleEl?.classList.remove('required-error');
 if(!time){setMsg('bad','ODABERI VRIJEME','Kod najave se bira termin, ali ne i rampa.');document.getElementById('annTime')?.focus();return false}
 const closed=closedReason(date);if(closed){setMsg('bad','Nema prijama',closed);return false}
 const pallets=Number(document.getElementById('annPallets')?.value||0),sku=Number(document.getElementById('annSku')?.value||0),dur=duration(pallets),order=orderNumber();
 if(order===null)return false;
 const capacity=timeCapacity(date,warehouse,time,dur,editingId());if(!capacity.ok){setMsg('bad','TERMIN NEMA KAPACITETA',capacity.reason);return false}
 const id=editingId();
 if(id){
   const a=rows().find(x=>String(x.id)===String(id));if(!a)return false;
   const reason=String(document.getElementById('changeReason')?.value||''),note=String(document.getElementById('changeNote')?.value||'');
   const changedDate=String(a.date||'')!==date,changedTime=String(a.time||'').slice(0,5)!==time,changedWarehouse=String(a.warehouse||'')!==warehouse;
   if((changedDate||changedTime||changedWarehouse)&&!reason){setMsg('bad','Nedostaje razlog promjene','Odaberi razlog promjene postojeće najave.');return false}
   if(changedDate||changedTime||changedWarehouse){
     const changedAt=new Date().toISOString(),old={date:a.date,time:a.time,dock:a.dock,warehouse:a.warehouse};let countsAsLate=false;
     try{countsAsLate=typeof changeIsAdvance==='function'?!changeIsAdvance(old.date,old.time,changedAt):false}catch(_){}
     changeHistory(a).push({changedAt,reason,note,oldDate:old.date,oldTime:old.time,oldDock:old.dock,oldWarehouse:old.warehouse,newDate:date,newTime:time,newDock:null,newWarehouse:warehouse,countsAsLate});
     if(!a.originalDate){a.originalDate=old.date;a.originalTime=old.time;a.originalDock=old.dock;a.originalWarehouse=old.warehouse}
     if(countsAsLate){a.hadLateReschedule=true;a.noShow=true;a.rescheduledAfterNoShow=true}else a.advanceReschedule=true;
   }
   Object.assign(a,{date,warehouse,supplier,pallets,sku,responsible,duration:dur,time,dock:null,plannedDock:null,bookingMode:'TIME_ONLY',dockAssignmentState:'UNASSIGNED',orderNumber:order,updatedAt:new Date().toISOString()});
   saveAll();setMsg('good','NAJAVA PROMIJENJENA',`${supplier} · ${date} ${time} · rampa se dodjeljuje kasnije.`);toast('success',`NAJAVA #${annNo(a)} USPJEŠNO PROMIJENJENA`,`${supplier} · ${date} ${time} · bez ručne rampe`);
   try{if(typeof cancelEditAnnouncement==='function')cancelEditAnnouncement()}catch(_){}
   return true;
 }
 const created={id:Date.now(),date,warehouse,supplier,pallets,sku,responsible,duration:dur,time,dock:null,plannedDock:null,bookingMode:'TIME_ONLY',dockAssignmentState:'UNASSIGNED',orderNumber:order,status:'U dolasku',createdAt:new Date().toISOString(),createdBy:actor(),announcementRef:newRef()};
 rows().push(created);saveAll();
 setMsg('good','NAJAVA USPJEŠNO SPREMLJENA',`Najava #${annNo(created)} · ${supplier} · ${date} ${time}. Rampa se dodjeljuje kasnije.`);toast('success',`NAJAVA #${annNo(created)} USPJEŠNO SPREMLJENA`,`${supplier} · ${date} ${time} · ${pallets} paleta · rampa TBD`);
 const t=document.getElementById('annTime');if(t)t.value='';
 return true;
}

function setText(el,value){if(el&&el.textContent!==value)el.textContent=value}
function decorateTimeOnlyForm(){
 const form=document.getElementById('announcementForm');if(!form)return;
 form.dataset.yardonBookingMode='TIME_ONLY';
 const sub=form.closest('.panel')?.querySelector('.panel-head small');setText(sub,'Odaberi datum, vrijeme i podatke isporuke — rampa se dodjeljuje kasnije u YardOnu');
 const dock=document.getElementById('annDock');if(dock){dock.value='';const label=dock.closest('label');if(label&&label.style.display!=='none')label.style.display='none'}
 const rec=document.getElementById('annRecommendation');if(rec&&rec.style.display!=='none')rec.style.display='none';
 const primary=document.getElementById('saveRecommendedAnnouncement');if(primary){setText(primary,'SPREMI NAJAVU');primary.title='Najava se sprema bez fizičke rampe'}
 const details=form.querySelector('details.ann-advanced');if(details){details.open=true;const summary=details.querySelector('summary');if(summary){setText(summary,'VRIJEME TERMINA');summary.style.display='none'}}
 const time=document.getElementById('annTime');if(time){const label=time.closest('label'),txt=label?[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE):null;if(txt&&txt.nodeValue!=='Vrijeme termina ')txt.nodeValue='Vrijeme termina ';if(time.options?.[0]&&time.options[0].value==='')setText(time.options[0],'Odaberi vrijeme...')}
 ['checkAnnouncement','saveManualAnnouncement','useRecommendation'].forEach(id=>{const el=document.getElementById(id);if(el&&el.style.display!=='none')el.style.display='none'});
 const msg=document.getElementById('annMessage');if(msg&&!msg.dataset.yardonTimeOnly){msg.dataset.yardonTimeOnly='1';msg.className='notice-result info';msg.innerHTML='<h3>Najava bez rampe</h3><p>Odaberi vrijeme termina. Fizičku rampu nitko ne bira kod najave; YardOn je planira i dodjeljuje kasnije.</p>'}
}
function installTimeOnlyAuthority(){try{window.applyAnnouncementSlot=timeOnlyApplyAnnouncement}catch(_){}decorateTimeOnlyForm()}

/* Supplier submit hardening. The rebuilt booking module still reads optional DOM
   fields directly. Keep those reads safe even if a field was removed by a later UI
   revision, and require an explicit user confirmation before any server call. */
function ensureSupplierSubmitFields(){
 const root=document.getElementById('sbnExtra')||document.body;
 const inputs=['sbnOrder','sbnReference','sbnPlate','sbnTrailer','sbnDriver','sbnDriverContact'];
 inputs.forEach(id=>{if(document.getElementById(id))return;const el=document.createElement('input');el.type='hidden';el.id=id;el.value='';root.appendChild(el)});
 if(!document.getElementById('sbnNote')){const el=document.createElement('textarea');el.id='sbnNote';el.hidden=true;el.value='';root.appendChild(el)}
}
function supplierSendSummary(){
 const selected=document.querySelector('#sbnMap .sbn-slot.selected');
 const map=String(document.getElementById('sbnMapSub')?.textContent||'').trim();
 const start=String(selected?.dataset?.start||'').trim(),end=String(selected?.dataset?.end||'').trim();
 const pallets=String(document.getElementById('sbnPallets')?.value||'').trim(),sku=String(document.getElementById('sbnSku')?.value||'').trim();
 const parts=[];if(map)parts.push(map);if(start)parts.push(end?`${start}–${end}`:start);if(pallets)parts.push(`${pallets} paleta`);if(sku)parts.push(`${sku} SKU`);
 return parts.join(' · ');
}
function supplierConfirmModal(){
 return new Promise(resolve=>{
   document.getElementById('yardonSupplierSendConfirm')?.remove();
   if(!document.getElementById('yardonSupplierSendConfirmStyle')){
     const style=document.createElement('style');style.id='yardonSupplierSendConfirmStyle';style.textContent=`
#yardonSupplierSendConfirm{position:fixed;inset:0;z-index:2147483000;background:rgba(8,14,22,.66);display:flex;align-items:center;justify-content:center;padding:20px}
#yardonSupplierSendConfirm .ysc-card{width:min(520px,100%);background:#101922;color:#eef6ff;border:1px solid rgba(122,169,214,.35);border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.48);padding:24px;font-family:inherit}
#yardonSupplierSendConfirm h3{margin:0 0 9px;font-size:18px;letter-spacing:.02em}
#yardonSupplierSendConfirm p{margin:0;color:#b8c8d8;line-height:1.55;font-size:13px}
#yardonSupplierSendConfirm .ysc-summary{margin-top:14px;padding:12px 14px;border-radius:11px;background:rgba(70,131,191,.12);border:1px solid rgba(100,162,222,.2);color:#e7f3ff;font-size:12px;font-weight:700}
#yardonSupplierSendConfirm .ysc-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px;flex-wrap:wrap}
#yardonSupplierSendConfirm button{border:0;border-radius:10px;padding:11px 16px;font:700 12px/1 inherit;cursor:pointer}
#yardonSupplierSendConfirm .ysc-cancel{background:#263442;color:#dbe8f5}
#yardonSupplierSendConfirm .ysc-confirm{background:#2f80ed;color:white}
#yardonSupplierSendConfirm button:focus-visible{outline:3px solid rgba(91,164,255,.5);outline-offset:2px}`;document.head.appendChild(style);
   }
   const overlay=document.createElement('div');overlay.id='yardonSupplierSendConfirm';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','yardonSupplierSendConfirmTitle');
   const card=document.createElement('div');card.className='ysc-card';
   const title=document.createElement('h3');title.id='yardonSupplierSendConfirmTitle';title.textContent='Potvrda slanja najave';
   const text=document.createElement('p');text.textContent='Želiš li poslati ovu najavu u Zalihe? Nakon potvrde najava će biti poslana.';
   const summary=supplierSendSummary();
   const summaryEl=document.createElement('div');summaryEl.className='ysc-summary';summaryEl.textContent=summary||'Provjeri unesene podatke prije potvrde.';
   const actions=document.createElement('div');actions.className='ysc-actions';
   const cancel=document.createElement('button');cancel.type='button';cancel.className='ysc-cancel';cancel.textContent='ODUSTANI';
   const confirm=document.createElement('button');confirm.type='button';confirm.className='ysc-confirm';confirm.textContent='POTVRDI NAJAVU';
   actions.append(cancel,confirm);card.append(title,text,summaryEl,actions);overlay.appendChild(card);document.body.appendChild(overlay);
   let done=false;
   const finish=value=>{if(done)return;done=true;document.removeEventListener('keydown',onKey,true);overlay.remove();resolve(value)};
   const onKey=e=>{if(e.key==='Escape'){e.preventDefault();finish(false)}};
   cancel.onclick=()=>finish(false);confirm.onclick=()=>finish(true);overlay.addEventListener('click',e=>{if(e.target===overlay)finish(false)});document.addEventListener('keydown',onKey,true);
   setTimeout(()=>confirm.focus(),0);
 });
}
function installSupplierSendGuard(){
 const btn=document.getElementById('sbnSend');if(!btn||btn.dataset.yardonConfirmGuard==='1')return;
 const original=btn.onclick;if(typeof original!=='function')return;
 btn.dataset.yardonConfirmGuard='1';
 btn.onclick=async function(e){
   ensureSupplierSubmitFields();
   const ok=await supplierConfirmModal();
   if(!ok){const s=document.getElementById('sbnStatus');if(s)s.textContent='SLANJE OTKAZANO';return false}
   ensureSupplierSubmitFields();
   try{return await original.call(this,e)}catch(err){
     const msg=String(err?.message||err||'Nepoznata greška');
     alert('Najava nije poslana: '+msg);
     const s=document.getElementById('sbnStatus');if(s)s.textContent='GREŠKA PRI SLANJU';
     return false;
   }
 };
}
function maintain(){purgeGhostSupplier();installTimeOnlyAuthority();installSupplierSendGuard()}

installStorageGhostGuard();
purgeGhostSupplier();
installTimeOnlyAuthority();
installSupplierSendGuard();
document.addEventListener('DOMContentLoaded',()=>setTimeout(maintain,80));
window.addEventListener('load',()=>setTimeout(maintain,180),{once:true});
['yardivo:login','yardivo:data-synced','yardivo:master-data-changed','yardivo:view-opened'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(maintain,30)));
/* Low-frequency safety net for legacy screens that re-render without emitting an event. */
setInterval(maintain,3000);
})();