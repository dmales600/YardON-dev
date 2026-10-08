
(function(){
'use strict';
const KEY='yardivo_yms_announcements_v1', LEG='yardivo_yms_announcements_v1';
const HOME={
 reception:new Set(['homeMenu','aiOperations','receiving','dailyMap','weeklyMap','suppliers','myYard','operations','incidents','incidentArchive','documentArchive','settings','unannounced','epal','liveYard']),
 inventory:new Set(['dashboard','aiOperations','yard','docks','announcements','supplierRequests','dailyMap','weeklyMap','suppliers','overview','incidents','incidentArchive','documentArchive','notifications','settings']),
 gate:new Set(['homeMenu','checkin','unannounced','myYard','docks'])
};
function role(){let r='';try{r=String(currentSession?.role||'').toLowerCase().trim()}catch(e){};if(r==='porta')r='gate';if(r==='prijam')r='reception';if(r==='zalihe'||r==='upravljanje zalihama')r='inventory';return r}
function aiControlEnabled(){try{const c=JSON.parse(localStorage.getItem('yardivo_auto_replan_cfg_v1')||'{}')||{};return c.enabled===true&&String(c.mode||'').toUpperCase()!=='PAUSED'}catch(_){return false}}
function load(){let best=[];for(const k of [KEY,LEG])try{const x=JSON.parse(localStorage.getItem(k)||'[]');if(Array.isArray(x)&&x.length>best.length)best=x}catch(e){};return best.length?best:(Array.isArray(announcements)?announcements:[])}
function save(list){const raw=JSON.stringify(list);localStorage.setItem(KEY,raw);localStorage.setItem(LEG,raw);if(Array.isArray(announcements))announcements.splice(0,announcements.length,...list)}
function P(a){return String(a?.plannedPlate||a?.vehiclePlate||a?.plate||a?.registration||a?.arrivalPlate||'').trim()}
function D(a){return String(a?.plannedDriver||a?.driverNameCanonical||a?.driver||a?.driverName||a?.arrivalDriver||'').trim()}
function NP(v){return String(v||'').toUpperCase().replace(/[^A-Z0-9ČĆŽŠĐ]/g,'')}
function ND(v){return String(v||'').trim().toLocaleLowerCase('hr-HR').replace(/\s+/g,' ')}
function localDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function allowedWarehouses(){try{const loc=currentSession?.location;if(loc&&typeof warehousesForLocation==='function')return warehousesForLocation(loc)||[]}catch(e){}return []}
function ready(v){const b=document.getElementById('gateAllowEntryBtn');if(!b)return;b.disabled=false;b.removeAttribute('disabled');b.dataset.ready=v?'1':'0';b.setAttribute('aria-disabled',v?'false':'true')}
let gateId=null, contextId=null;

function applyHome(){
 // Compatibility API only: Home card visibility has a single canonical owner.
 // Do not loop through cards or overwrite styles after each data sync.
 if(role()==='manager')window.YardivoManagerFinalV4?.syncMenu?.();
 else window.YardivoRoleVisibility?.apply?.();
}

window.refreshHomeMenuForCurrentRole=applyHome;

function driverOpen(id){
 if(!['admin','inventory'].includes(role()))return alert('Tablice i vozača mogu unositi samo Upravljanje zalihama ili Admin.');
 const a=load().find(x=>String(x.id)===String(id));if(!a)return alert('Najava nije pronađena.');
 const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v||''};
 set('driverAnnouncementId',a.id);set('plannedPlate',P(a));set('plannedDriver',D(a));set('plannedTrailer',a.plannedTrailer);set('plannedPhone',a.plannedPhone);
 const info=document.getElementById('driverAnnouncementInfo');if(info)info.innerHTML=`<strong>${a.supplier||'—'}</strong><br>${a.date||'—'} · ${a.time||'—'} · Rampa ${a.dock||'—'}`;
 const dlg=document.getElementById('driverAnnouncementDialog');if(dlg&&!dlg.open)dlg.showModal();
}
window.openDriverAnnouncement=driverOpen;
window.canAnnounceDriverData=()=>['admin','inventory'].includes(role());

function driverSave(){
 const id=document.getElementById('driverAnnouncementId')?.value,p=String(document.getElementById('plannedPlate')?.value||'').trim().toUpperCase(),d=String(document.getElementById('plannedDriver')?.value||'').trim();
 if(!p||!d)return alert('Upiši tablice i ime vozača.');
 const list=load(),a=list.find(x=>String(x.id)===String(id));if(!a)return alert('Najava nije pronađena.');
 Object.assign(a,{plannedPlate:p,vehiclePlate:p,plate:p,registration:p,plannedDriver:d,driverNameCanonical:d,driver:d,driverName:d,plannedTrailer:document.getElementById('plannedTrailer')?.value||'',plannedPhone:document.getElementById('plannedPhone')?.value||'',driverDataUpdatedAt:new Date().toISOString()});
 save(list);document.getElementById('driverAnnouncementDialog')?.close();
 try{renderAnnouncements?.();renderAnnouncementSchedule?.()}catch(e){}
}
document.getElementById('driverAnnouncementForm')?.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();driverSave()},true);

document.addEventListener('contextmenu',e=>{
 const block=e.target.closest('.booked[data-announcement-id]');if(!block)return;
 e.preventDefault();e.stopImmediatePropagation();
 contextId=block.dataset.announcementId;
 try{contextAnnouncementId=block.dataset.announcementId}catch(err){}
 const menu=document.getElementById('announcementContextMenu'),b=document.getElementById('ctxDriverAnnouncement');if(!menu)return;
 if(b){b.style.setProperty('display',window.canAnnounceDriverData()?'block':'none','important');b.disabled=false}
 menu.classList.add('open');menu.style.display='block';menu.style.left=Math.min(e.clientX,innerWidth-250)+'px';menu.style.top=Math.min(e.clientY,innerHeight-210)+'px';
},true);

function gateFind(p,d){const wh=allowedWarehouses(),td=localDate();return load().find(a=>String(a.date||'')===td&&(!wh.length||wh.includes(a.warehouse||yardivoCanonicalWarehouseV583()))&&NP(P(a))===NP(p)&&ND(D(a))===ND(d)&&!['Zaprimljeno','Odbijen'].includes(a.status))}
window.checkGateArrival=function(){
 const p=document.getElementById('gatePlate')?.value||'',d=document.getElementById('gateDriver')?.value||'',res=document.getElementById('gateMatchResult');
 gateId=null;ready(false);const a=gateFind(p,d);
 if(!a){if(res){res.className='gate-match-result bad';res.innerHTML='<strong>NAJAVA NIJE PRONAĐENA</strong><span>Provjeri tablice i ime vozača.</span>'}return null}
 gateId=a.id;ready(true);if(res){res.className='gate-match-result good';res.innerHTML='<strong>✓ PODACI SE PODUDARAJU</strong><span>Ulaz u dvorište može biti odobren.</span>'}return a;
};
window.allowGateEntry=function(a){
 if(!a)return false;const list=load(),x=list.find(v=>String(v.id)===String(a.id));if(!x)return false;const now=new Date();
 Object.assign(x,{status:'U dvorištu',gateCheckedAt:now.toISOString(),yardArrivalAt:now.toISOString(),actualDate:localDate(),actualTime:now.toTimeString().slice(0,5)});
 save(list);ready(false);gateId=null;try{renderYard?.();renderReceiving?.();renderRampe?.();renderAnnouncements?.()}catch(e){};return true;
};

window.canChangeReceptionStatus=()=>['admin','reception'].includes(role());
window.setReceivingManualStatus=function(id,status){
 if(!window.canChangeReceptionStatus()||!['Na rampi','Zaprimljeno','Odbijen'].includes(status))return;
 const list=load(),a=list.find(x=>String(x.id)===String(id));if(!a)return;a.status=status;a.statusUpdatedAt=new Date().toISOString();save(list);
 try{renderReceiving?.();renderYard?.();renderRampe?.();renderAnnouncements?.()}catch(e){}
};

function supplierNames(){const s=new Set();try{(suppliers||[]).forEach(x=>x&&s.add(String(x).trim()))}catch(e){};load().forEach(a=>a?.supplier&&s.add(String(a.supplier).trim()));try{(incidents||[]).forEach(i=>i?.supplier&&s.add(String(i.supplier).trim()))}catch(e){};return [...s].filter(Boolean).sort((a,b)=>a.localeCompare(b,'hr'))}
// Supplier renderer intentionally remains the original full master-list renderer.
window.renderSuppliers=renderSuppliers;

document.addEventListener('click',e=>{
 if(e.target.closest('#gateCheckBtn')){e.preventDefault();e.stopImmediatePropagation();window.checkGateArrival();return}
 if(e.target.closest('#gateAllowEntryBtn')){e.preventDefault();e.stopImmediatePropagation();if(e.target.closest('#gateAllowEntryBtn').dataset.ready==='1')window.allowGateEntry(load().find(x=>String(x.id)===String(gateId)));return}
 if(e.target.closest('#ctxDriverAnnouncement')){e.preventDefault();e.stopImmediatePropagation();document.getElementById('announcementContextMenu')?.classList.remove('open');driverOpen(contextId);return}
 const card=e.target.closest('#supplierGrid .supplier-click-card');if(card){e.preventDefault();e.stopImmediatePropagation();const idx=Number(card.dataset.supplierIndex);const name=card.dataset.supplierName||(Number.isInteger(idx)?suppliers[idx]:'')||card.querySelector('h3')?.textContent?.trim();if(name)openSupplierProfile(name);return}
 if(e.target.closest('[data-view="suppliers"],[data-home-target="suppliers"]'))setTimeout(()=>window.renderSuppliers(document.getElementById('supplierPretraži')?.value||''),20);
 setTimeout(applyHome,20);
},true);
document.getElementById('supplierPretraži')?.addEventListener('input',e=>window.renderSuppliers(e.target.value));
['gatePlate','gateDriver'].forEach(id=>document.getElementById(id)?.addEventListener('input',()=>{gateId=null;ready(false)},true));
window.addEventListener('load',()=>setTimeout(applyHome,100));
window.addEventListener('yardivo:ai-admin-config',()=>setTimeout(applyHome,0));
window.addEventListener('storage',e=>{if(e.key==='yardivo_auto_replan_cfg_v1')setTimeout(applyHome,0);if(e.key===KEY||e.key===LEG){try{renderAnnouncements?.();renderReceiving?.();renderYard?.()}catch(err){}}});
window.YardivoCleanCore={load,save,role,applyHome,driverOpen,driverSave,gateFind,supplierNames};
})();
