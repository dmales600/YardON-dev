(function(){
'use strict';
if(window.__YARDIVO_SUPPLIER_HISTORY_TOMBSTONE_VOICE_20260924__)return;
window.__YARDIVO_SUPPLIER_HISTORY_TOMBSTONE_VOICE_20260924__=true;

const GHOST_SUPPLIER='dobavljac69';
const norm=v=>String(v??'').trim().toLowerCase();
const hasGhost=v=>norm(v).includes(GHOST_SUPPLIER);

function objectIsGhost(v){
 if(!v||typeof v!=='object')return false;
 const keys=['username','user','supplier','supplier_name','supplierName','name','email','code','supplier_code'];
 return keys.some(k=>v[k]!=null&&hasGhost(v[k]));
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
function scrubStorage(st){
 try{
   const keys=[];
   for(let i=0;i<st.length;i++){const k=st.key(i);if(k)keys.push(k)}
   keys.forEach(k=>{
     try{
       if(hasGhost(k)){st.removeItem(k);return}
       const raw=st.getItem(k);if(!raw||!hasGhost(raw))return;
       try{
         const parsed=JSON.parse(raw),clean=scrubJson(parsed);
         if(clean===undefined)st.removeItem(k);else st.setItem(k,JSON.stringify(clean));
       }catch(_){st.removeItem(k)}
     }catch(_){}
   });
 }catch(_){}
}
function removeGhostFromArray(arr,matcher){
 if(!Array.isArray(arr))return false;
 let changed=false;
 for(let i=arr.length-1;i>=0;i--){
   let hit=false;try{hit=matcher(arr[i])}catch(_){}
   if(hit){arr.splice(i,1);changed=true}
 }
 return changed;
}
function purgeGhostSupplier(){
 scrubStorage(localStorage);scrubStorage(sessionStorage);
 let annChanged=false;
 try{if(typeof suppliers!=='undefined')removeGhostFromArray(suppliers,x=>hasGhost(typeof x==='string'?x:(x?.name||x?.username||x?.supplier||'')))}catch(_){}
 try{if(typeof announcements!=='undefined')annChanged=removeGhostFromArray(announcements,x=>objectIsGhost(x)||hasGhost(x?.supplier))||annChanged}catch(_){}
 try{if(typeof incidents!=='undefined')removeGhostFromArray(incidents,x=>objectIsGhost(x)||hasGhost(x?.supplier))}catch(_){}
 try{if(typeof trucks!=='undefined')removeGhostFromArray(trucks,x=>objectIsGhost(x)||hasGhost(x?.supplier))}catch(_){}
 try{if(annChanged&&typeof saveAnnouncements==='function')saveAnnouncements()}catch(_){}
 try{
   document.querySelectorAll('option,tr,li,[data-username],[data-user],[data-supplier],[data-supplier-name],.supplier-card,.supplier-row').forEach(el=>{
     const txt=norm(el.textContent);
     const vals=[el.getAttribute?.('data-username'),el.getAttribute?.('data-user'),el.getAttribute?.('data-supplier'),el.getAttribute?.('data-supplier-name')].map(norm);
     if(txt===GHOST_SUPPLIER||txt.includes(GHOST_SUPPLIER)||vals.some(x=>x.includes(GHOST_SUPPLIER)))el.remove();
   });
 }catch(_){}
}

function warehouseCfg(id){
 try{return (typeof WAREHOUSES!=='undefined'&&WAREHOUSES)?WAREHOUSES[id]:null}catch(_){return null}
}
function toMinutes(v){
 const m=String(v||'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):NaN;
}
function hm(v){const n=Math.max(0,Math.round(Number(v)||0));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
function annRows(){try{return typeof announcements!=='undefined'&&Array.isArray(announcements)?announcements:[]}catch(_){return []}}
function editId(){try{return typeof editingAnnouncementId!=='undefined'?editingAnnouncementId:null}catch(_){return null}}
function activeRampCapacity(warehouse){
 const w=warehouseCfg(warehouse),count=Math.max(0,Number(w?.ramps)||0);let active=0;
 for(let n=1;n<=count;n++){
   let locked=false;try{locked=!!window.YardivoRampConfig?.isLocked?.(warehouse,n)}catch(_){}
   if(!locked)active++;
 }
 return active;
}
function timeOnlyCapacityOk(date,warehouse,time,duration,ignoreId=null){
 const w=warehouseCfg(warehouse),capacity=activeRampCapacity(warehouse),start=toMinutes(time),dur=Math.max(15,Number(duration)||15);
 if(!w||!capacity||!Number.isFinite(start))return {ok:false,reason:'Skladište nema aktivan prijamni kapacitet.'};
 const from=toMinutes(w.receptionStart||'06:00'),to=toMinutes(w.receptionEnd||'13:00');
 if(Number.isFinite(from)&&start<from)return {ok:false,reason:'Termin je prije početka prijama.'};
 if(Number.isFinite(to)&&start+dur>to)return {ok:false,reason:'Termin završava nakon radnog vremena prijama.'};
 const relevant=annRows().filter(a=>String(a?.warehouse||'')===String(warehouse)&&String(a?.date||'')===String(date)&&String(a?.id)!==String(ignoreId??'')).filter(a=>{
   const s=norm(a?.status);return !['odbijen','rejected','cancelled','canceled','otkazano','završeno','zaprimljeno'].includes(s);
 });
 for(let m=start;m<start+dur;m+=15){
   let occupied=0;
   for(const a of relevant){
     const s=toMinutes(a?.time),d=Math.max(15,Number(a?.duration)||15);
     if(Number.isFinite(s)&&m<s+d&&m+15>s)occupied++;
   }
   if(occupied>=capacity)return {ok:false,reason:`Kapacitet skladišta je popunjen oko ${hm(m)}. Odaberi drugo vrijeme.`};
 }
 return {ok:true,capacity};
}
function setMsg(kind,title,msg){try{if(typeof setAnnMessage==='function')setAnnMessage(kind,title,msg);else{const el=document.getElementById('annMessage');if(el)el.innerHTML=`<h3>${title}</h3><p>${msg}</p>`}}catch(_){} }
function toast(kind,title,msg){try{if(typeof showYmsToast==='function')showYmsToast(kind,title,msg)}catch(_){} }
function getDuration(pallets){try{return typeof unloadDuration==='function'?unloadDuration(pallets):60}catch(_){return 60}}
function orderValue(){
 try{if(typeof validateManualOrderNumber==='function'){const x=validateManualOrderNumber();if(!x?.ok)return null;return x.order||''}}catch(_){}
 return String(document.getElementById('annOrderNumber')?.value||'').trim();
}
function isClosedDay(date){
 try{if(typeof isWeekendIsoEarly==='function'&&isWeekendIsoEarly(date))return 'Subotom i nedjeljom nema prijama robe.'}catch(_){}
 try{if(typeof holidayNameEarly==='function'){const h=holidayNameEarly(date);if(h)return `${h} — nema prijama robe.`}}catch(_){}
 return '';
}
function ensureHistory(a){try{return typeof ensureChangeHistory==='function'?ensureChangeHistory(a):(a.changeHistory||(a.changeHistory=[]))}catch(_){return a.changeHistory||(a.changeHistory=[])} }
function saveAll(){
 try{if(typeof saveAnnouncements==='function')saveAnnouncements()}catch(_){}
 try{if(typeof renderAnnouncements==='function')renderAnnouncements()}catch(_){}
 try{if(typeof renderAnnouncementSchedule==='function')renderAnnouncementSchedule()}catch(_){}
 try{window.dispatchEvent(new CustomEvent('yardivo:data-synced'))}catch(_){}
}
function announcementNo(a){try{return typeof announcementNumber==='function'?announcementNumber(a):a.id}catch(_){return a.id}}
function ref(){try{return typeof yardivoGenerateAnnouncementRef==='function'?yardivoGenerateAnnouncementRef():('ANN-'+Date.now())}catch(_){return 'ANN-'+Date.now()} }
function currentUser(){try{return currentSession?.user||currentSession?.username||''}catch(_){return ''}}

function timeOnlyApplyAnnouncement(){
 const date=String(document.getElementById('annDate')?.value||''),warehouse=String(document.getElementById('annWarehouse')?.value||''),supplier=String(document.getElementById('annSupplier')?.value||'').trim();
 const time=String(document.getElementById('annTime')?.value||'').slice(0,5),responsible=String(document.getElementById('annResponsible')?.value||'').trim();
 const responsibleEl=document.getElementById('annResponsible');
 if(!date||!warehouse||!supplier){setMsg('bad','Nedostaju podaci','Odaberi datum, skladište i dobavljača.');return false}
 if(!responsible){responsibleEl?.classList.add('required-error');setMsg('bad','ODGOVORNA OSOBA JE OBAVEZNA','Odaberi odgovornu osobu prije spremanja najave.');toast('error','ODGOVORNA OSOBA JE OBAVEZNA','Najavu nije moguće spremiti bez odgovorne osobe.');responsibleEl?.focus();return false}
 responsibleEl?.classList.remove('required-error');
 if(!time){setMsg('bad','ODABERI VRIJEME','Kod najave se bira termin, ali ne i rampa.');document.getElementById('annTime')?.focus();return false}
 const closed=isClosedDay(date);if(closed){setMsg('bad','Nema prijama',closed);return false}
 const pallets=Number(document.getElementById('annPallets')?.value||0),sku=Number(document.getElementById('annSku')?.value||0),duration=getDuration(pallets),orderNumber=orderValue();
 if(orderNumber===null)return false;
 const capacity=timeOnlyCapacityOk(date,warehouse,time,duration,editId());
 if(!capacity.ok){setMsg('bad','TERMIN NEMA KAPACITETA',capacity.reason);return false}
 const id=editId();
 if(id){
   const a=annRows().find(x=>String(x.id)===String(id));if(!a)return false;
   const reason=String(document.getElementById('changeReason')?.value||''),note=String(document.getElementById('changeNote')?.value||'');
   const changedDate=String(a.date||'')!==date,changedTime=String(a.time||'').slice(0,5)!==time,changedWarehouse=String(a.warehouse||'')!==warehouse;
   if((changedDate||changedTime||changedWarehouse)&&!reason){setMsg('bad','Nedostaje razlog promjene','Odaberi razlog promjene postojeće najave.');return false}
   if(changedDate||changedTime||changedWarehouse){
     const changedAt=new Date().toISOString(),old={date:a.date,time:a.time,dock:a.dock,warehouse:a.warehouse};let countsAsLate=false;
     try{countsAsLate=typeof changeIsAdvance==='function'?!changeIsAdvance(old.date,old.time,changedAt):false}catch(_){}
     ensureHistory(a).push({changedAt,reason,note,oldDate:old.date,oldTime:old.time,oldDock:old.dock,oldWarehouse:old.warehouse,newDate:date,newTime:time,newDock:null,newWarehouse:warehouse,countsAsLate});
     if(!a.originalDate){a.originalDate=old.date;a.originalTime=old.time;a.originalDock=old.dock;a.originalWarehouse=old.warehouse}
     if(countsAsLate){a.hadLateReschedule=true;a.noShow=true;a.rescheduledAfterNoShow=true}else a.advanceReschedule=true;
   }
   Object.assign(a,{date,warehouse,supplier,pallets,sku,responsible,duration,time,dock:null,plannedDock:null,bookingMode:'TIME_ONLY',dockAssignmentState:'UNASSIGNED',orderNumber,updatedAt:new Date().toISOString()});
   saveAll();setMsg('good','NAJAVA PROMIJENJENA',`${supplier} · ${date} ${time} · rampa se dodjeljuje kasnije.`);toast('success',`NAJAVA #${announcementNo(a)} USPJEŠNO PROMIJENJENA`,`${supplier} · ${date} ${time} · bez ručne rampe`);
   try{if(typeof cancelEditAnnouncement==='function')cancelEditAnnouncement()}catch(_){}
   return true;
 }
 const created={id:Date.now(),date,warehouse,supplier,pallets,sku,responsible,duration,time,dock:null,plannedDock:null,bookingMode:'TIME_ONLY',dockAssignmentState:'UNASSIGNED',orderNumber,status:'U dolasku',createdAt:new Date().toISOString(),createdBy:currentUser(),announcementRef:ref()};
 annRows().push(created);saveAll();
 setMsg('good','NAJAVA USPJEŠNO SPREMLJENA',`Najava #${announcementNo(created)} · ${supplier} · ${date} ${time}. Rampa se dodjeljuje kasnije.`);toast('success',`NAJAVA #${announcementNo(created)} USPJEŠNO SPREMLJENA`,`${supplier} · ${date} ${time} · ${pallets} paleta · rampa TBD`);
 const t=document.getElementById('annTime');if(t)t.value='';
 return true;
}

function decorateTimeOnlyAnnouncementForm(){
 const form=document.getElementById('announcementForm');if(!form)return;
 form.dataset.yardonBookingMode='TIME_ONLY';
 const panel=form.closest('.panel');const sub=panel?.querySelector('.panel-head small');if(sub)sub.textContent='Odaberi datum, vrijeme i podatke isporuke — rampa se dodjeljuje kasnije u YardOnu';
 const dock=document.getElementById('annDock');if(dock){dock.value='';const label=dock.closest('label');if(label)label.style.display='none'}
 const recommendation=document.getElementById('annRecommendation');if(recommendation)recommendation.style.display='none';
 const primary=document.getElementById('saveRecommendedAnnouncement');if(primary){primary.textContent='SPREMI NAJAVU';primary.title='Najava se sprema bez fizičke rampe'}
 const details=form.querySelector('details.ann-advanced');if(details){details.open=true;const summary=details.querySelector('summary');if(summary){summary.textContent='VRIJEME TERMINA';summary.style.display='none'}}
 const time=document.getElementById('annTime');if(time){const label=time.closest('label');if(label){const text=[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);if(text)text.nodeValue='Vrijeme termina ';}if(time.options?.[0]&&time.options[0].value==='')time.options[0].textContent='Odaberi vrijeme...'}
 ['checkAnnouncement','saveManualAnnouncement','useRecommendation'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none'});
 const msg=document.getElementById('annMessage');if(msg&&!msg.dataset.yardonTimeOnly){msg.dataset.yardonTimeOnly='1';msg.className='notice-result info';msg.innerHTML='<h3>Najava bez rampe</h3><p>Odaberi vrijeme termina. Fizičku rampu nitko ne bira kod najave; YardOn je planira i dodjeljuje kasnije.</p>'}
}
function installTimeOnlyAnnouncementAuthority(){
 try{window.applyAnnouncementSlot=timeOnlyApplyAnnouncement}catch(_){}
 decorateTimeOnlyAnnouncementForm();
}

document.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{purgeGhostSupplier();installTimeOnlyAnnouncementAuthority()},100)});
window.addEventListener('load',()=>setTimeout(()=>{purgeGhostSupplier();installTimeOnlyAnnouncementAuthority()},250),{once:true});
['yardivo:login','yardivo:data-synced','yardivo:master-data-changed','yardivo:view-opened'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(()=>{purgeGhostSupplier();installTimeOnlyAnnouncementAuthority()},40)));
setInterval(()=>{purgeGhostSupplier();decorateTimeOnlyAnnouncementForm()},1000);
try{new MutationObserver(()=>{purgeGhostSupplier();decorateTimeOnlyAnnouncementForm()}).observe(document.documentElement,{childList:true,subtree:true})}catch(_){}
installTimeOnlyAnnouncementAuthority();
purgeGhostSupplier();
})();
