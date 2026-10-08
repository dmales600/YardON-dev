
(function(){
'use strict';

function role(){
  let r='';try{r=String(currentSession?.role||'').toLowerCase().trim()}catch(e){}
  if(r==='zalihe'||r==='upravljanje zalihama')r='inventory';
  if(r==='prijam')r='reception';
  if(r==='porta'||r==='portir')r='gate';
  return r;
}
function allowed(){return ['admin','inventory','reception','gate'].includes(role())}
function isGate(){return role()==='gate'}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function nowTime(){return new Date().toTimeString().slice(0,5)}
function currentLoc(){try{return currentSession?.location||'VG'}catch(e){return 'VG'}}
function warehouseCodes(){return window.YardivoGlobalContextV583?.warehouseIds?.()||[]}
function supplierNames(){
  const set=new Set();
  try{
    (suppliers||[]).forEach(s=>{
      if(typeof s==='string'&&s.trim())set.add(s.trim());
      else if(s&&typeof s==='object'){
        const n=s.name||s.supplier||s.supplierName||s.label||s.title;
        if(n)set.add(String(n).trim());
      }
    });
  }catch(e){}
  try{(announcements||[]).forEach(a=>a?.supplier&&set.add(String(a.supplier).trim()))}catch(e){}
  return [...set].filter(Boolean).sort((a,b)=>a.localeCompare(b,'hr'));
}
function populateForm(){
  const panel=document.getElementById('uaGateCreatePanel');
  if(panel)panel.style.display=isGate()?'block':'none';
  if(!isGate())return;
  const s=document.getElementById('uaGateSupplier');
  const w=document.getElementById('uaGateWarehouse');
  if(s){
    const cur=s.value;
    s.innerHTML='<option value="">Odaberi dobavljača...</option>'+supplierNames().map(n=>`<option value="${String(n).replace(/"/g,'&quot;')}">${n}</option>`).join('');
    if([...s.options].some(o=>o.value===cur))s.value=cur;
  }
  if(w){
    const cur=w.value;
    w.innerHTML=warehouseCodes().map(c=>`<option value="${c}">${typeof warehouseOptionLabel==='function'?warehouseOptionLabel(c):c}</option>`).join('');
    if([...w.options].some(o=>o.value===cur))w.value=cur;
  }
}
function addNotification(a){
  let list=[];
  try{list=JSON.parse(localStorage.getItem('yardivo_live_notifications_v1')||'[]')}catch(e){}
  list.unshift({
    id:Date.now()+Math.random(),at:new Date().toISOString(),type:'yellow',
    title:'NENAJAVLJENI KAMION',
    body:`${a.supplier} · ${a.plannedPlate} · ${a.warehouse}`,
    supplier:a.supplier,plate:a.plannedPlate,announcementId:a.id,warehouse:String(a.warehouse||'').toUpperCase(),location:/^W2/.test(String(a.warehouse||'').toUpperCase())?'DU':(/^W1/.test(String(a.warehouse||'').toUpperCase())?'VG':''),
    roles:['admin','reception'],event:'UNANNOUNCED_REQUEST'
  });
  localStorage.setItem('yardivo_live_notifications_v1',JSON.stringify(list.slice(0,300)));
}
function clearForm(){
  ['uaGatePlate','uaGateDriver','uaGateDocument','uaGateNote'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});
  ['uaGatePallets','uaGateSku'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='0'});
  const r=document.getElementById('uaGateReason');if(r)r.value='';
}
function refreshAll(){
  try{saveAnnouncements()}catch(e){}
  try{render?.()}catch(e){}
  try{renderAnnouncements?.()}catch(e){}
  try{renderReceiving?.()}catch(e){}
  try{renderDailyMap?.()}catch(e){}
  try{renderWeeklyMap?.()}catch(e){}
  try{renderOverview?.()}catch(e){}
  try{YardivoOverviewMaster?.render?.()}catch(e){}
  try{renderUnannouncedComplete?.()}catch(e){}
  try{YardivoUnannouncedSection?.render?.()}catch(e){}
}
function create(){
  if(!isGate())return;
  const supplier=document.getElementById('uaGateSupplier')?.value?.trim()||'';
  const warehouse=document.getElementById('uaGateWarehouse')?.value||'';
  const plate=document.getElementById('uaGatePlate')?.value?.trim().toUpperCase()||'';
  const driver=document.getElementById('uaGateDriver')?.value?.trim()||'';
  const reason=document.getElementById('uaGateReason')?.value||'';
  const doc=document.getElementById('uaGateDocument')?.value?.trim()||'';
  const pallets=Math.max(0,Math.floor(Number(document.getElementById('uaGatePallets')?.value||0)));
  const sku=Math.max(0,Math.floor(Number(document.getElementById('uaGateSku')?.value||0)));
  const note=document.getElementById('uaGateNote')?.value?.trim()||'';

  if(!supplier||!warehouse||!plate||!driver||!reason){
    alert('Upiši dobavljača, skladište, tablice, vozača i razlog dolaska.');
    return;
  }
  const dup=(announcements||[]).find(a=>a.arrivalType==='UNANNOUNCED'&&a.approvalStatus==='PENDING'&&String(a.plannedPlate||'').toUpperCase()===plate);
  if(dup){alert('Za ove tablice već postoji nenajavljeni zahtjev koji čeka odobrenje.');return}

  const now=new Date();
  const user=currentSession?.user||currentSession?.username||'Porta';
  const rec={
    id:Date.now(),date:today(),time:nowTime(),warehouse,dock:'',
    supplier,pallets,sku,responsible:'',status:'Čeka odobrenje Prijama',
    plannedPlate:plate,vehiclePlate:plate,plate,registration:plate,
    plannedDriver:driver,driverNameCanonical:driver,driver,driverName:driver,
    orderNumber:doc,
    arrivalType:'UNANNOUNCED',adHoc:true,approvalStatus:'PENDING',
    approvalRequestedBy:user,approvalRequestedRole:'gate',requestCreatedAt:now.toISOString(),approvalFlow:'RECEPTION_THEN_GATE',
    unannouncedReason:reason,unannouncedDocument:doc,unannouncedNote:note,
    createdAt:now.toISOString(),updatedAt:now.toISOString(),updatedBy:user,
    changeHistory:[{changedAt:now.toISOString(),type:'UNANNOUNCED_REQUEST',reason,note:'Nenajavljeni dolazak unesen u sekciji Nenajavljeni dolasci',changedBy:user}]
  };
  announcements.push(rec);
  addNotification(rec);
  clearForm();
  refreshAll();
  try{showYmsToast?.('success','NENAJAVLJENI DOLAZAK POSLAN',`${supplier} · ${plate}`)}catch(e){}
}

function forceAccess(){
  if(!window.currentSession)return;
  // Canonical RoleVisibility governs the menu. This module owns only Gate form content.
  const panel=document.getElementById('uaGateCreatePanel');
  if(panel){
    const display=role()==='gate'?'block':'none';
    if(panel.style.display!==display)panel.style.display=display;
  }
}

document.getElementById('uaGateSubmit')?.addEventListener('click',create);
document.addEventListener('click',e=>{
  if(e.target.closest('[data-view="unannounced"],[data-home-target="unannounced"]')){
    setTimeout(()=>{forceAccess();populateForm();try{renderUnannouncedComplete?.()}catch(err){}},30);
  }
},true);
window.addEventListener('load',()=>setTimeout(()=>{forceAccess();populateForm()},500));
['yardivo:login','yardivo:data-synced','yardivo:master-data-changed','yardivo:context-changed']
 .forEach(ev=>window.addEventListener(ev,()=>requestAnimationFrame(()=>{forceAccess();if(isGate())populateForm()})));

window.YardivoUnannouncedGateV2={create,populateForm,refreshAll};
})();
