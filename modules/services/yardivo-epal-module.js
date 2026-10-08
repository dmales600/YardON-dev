
(function(){
'use strict';
const KEY='yardivo_epal_transactions_v1';

function role(){
  let r='';try{r=String(currentSession?.role||'').toLowerCase().trim()}catch(e){}
  if(r==='zalihe'||r==='upravljanje zalihama')r='inventory';
  if(r==='prijam')r='reception';
  if(r==='porta'||r==='portir')r='gate';
  return r;
}
function allowed(){return ['admin','inventory','reception'].includes(role())}
function canEdit(){return ['admin','inventory','reception'].includes(role())}
function nowUser(){try{return currentSession?.username||currentSession?.user||currentSession?.name||''}catch(e){return ''}}
function localDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch(e){return []}}
function save(rows){localStorage.setItem(KEY,JSON.stringify(rows))}
function locationForWarehouse(wh){try{const m=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');const w=(m.warehouses||[]).find(x=>x&&x.active!==false&&String(x.id)===String(wh));return w?String(w.location_id||''):''}catch(_){return ''}}
function locName(loc){try{const m=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');return String((m.locations||[]).find(x=>String(x.id)===String(loc))?.name||loc||'Sve lokacije')}catch(_){return String(loc||'Sve lokacije')}}
function epalMaster(){try{const d=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');return {locations:Array.isArray(d.locations)?d.locations:[],warehouses:Array.isArray(d.warehouses)?d.warehouses:[],suppliers:Array.isArray(d.suppliers)?d.suppliers:[]}}catch(_){return {locations:[],warehouses:[],suppliers:[]}}}
function epalScope(){
  const d=epalMaster(),r=role();
  if(r!=='reception')return {
    locations:d.locations.filter(x=>x&&x.active!==false),
    warehouses:d.warehouses.filter(x=>x&&x.active!==false)
  };
  let locIds=[],whIds=[];
  try{
    locIds=Array.isArray(currentSession?.locations)?currentSession.locations.map(String).filter(Boolean):[];
    const oneLoc=String(currentSession?.location||'').trim();
    if(oneLoc&&oneLoc!=='ALL'&&!locIds.includes(oneLoc))locIds.push(oneLoc);
    whIds=Array.isArray(currentSession?.warehouses)?currentSession.warehouses.map(String).filter(Boolean):[];
    const oneWh=String(currentSession?.warehouse||'').trim();
    if(oneWh&&oneWh!=='ALL'&&!whIds.includes(oneWh))whIds.push(oneWh);
  }catch(_){}
  const wset=new Set(whIds),lset=new Set(locIds);
  d.warehouses.filter(w=>w&&w.active!==false&&wset.has(String(w.id))).forEach(w=>{
    if(w.location_id)lset.add(String(w.location_id));
  });
  return {
    locations:d.locations.filter(x=>x&&x.active!==false&&lset.has(String(x.id))),
    warehouses:d.warehouses.filter(x=>x&&x.active!==false&&wset.has(String(x.id)))
  };
}
function currentMasterLocation(){
  const d=epalMaster();
  const valid=new Set(d.locations.filter(x=>x&&x.active!==false).map(x=>String(x.id)));
  let a='';try{a=String(window.YardivoAppStateV583?.location?.()||'')}catch(_){}
  if(valid.has(a))return a;
  let b='';try{b=String(currentSession?.location||'')}catch(_){}
  if(valid.has(b))return b;
  if(b==='ALL'||String(currentSession?.role||'').toLowerCase()==='admin')return 'ALL';
  return d.locations.filter(x=>x&&x.active!==false)[0]?.id||'ALL';
}
function warehouseName(code){const w=epalMaster().warehouses.find(x=>x&&x.active!==false&&String(x.id)===String(code));return String(w?.name||code||'')}
function allAnnouncements(){try{return Array.isArray(announcements)?announcements:[]}catch(e){return []}}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function supplierList(){
  const set=new Set();
  try{(suppliers||[]).forEach(x=>x&&set.add(x))}catch(e){}
  allAnnouncements().forEach(a=>a.supplier&&set.add(a.supplier));
  return [...set].sort((a,b)=>a.localeCompare(b,'hr'));
}
function warehouseList(loc=selectedLocation()){
  const d=epalMaster(),scope=epalScope();
  const base=role()==='reception'?scope.warehouses:d.warehouses.filter(w=>w&&w.active!==false);
  return base.filter(w=>w&&w.active!==false&&(loc==='ALL'||String(w.location_id)===String(loc)));
}
function selectedLocation(){
  const v=document.getElementById('epalLocationFilter')?.value||'CURRENT';
  return v==='CURRENT'?currentMasterLocation():v;
}
function updateLocationFilter(){
  const sel=document.getElementById('epalLocationFilter');if(!sel)return;
  const d=epalMaster(),old=sel.value||'CURRENT',cur=currentMasterLocation(),scope=epalScope();
  if(role()==='reception'){
    const rows=scope.locations;
    const wanted=rows.some(x=>String(x.id)===String(old))?String(old):
      (rows.some(x=>String(x.id)===String(cur))?String(cur):String(rows[0]?.id||''));
    const sig=JSON.stringify(rows.map(x=>[String(x.id),String(x.name||x.id)]));
    if(sel.dataset.yvEpalScopeSig!==sig){
      sel.innerHTML=rows.map(x=>`<option value="${esc(x.id)}">${esc(x.name||x.id)}</option>`).join('');
      sel.dataset.yvEpalScopeSig=sig;
    }
    if(wanted&&sel.value!==wanted)sel.value=wanted;
    sel.disabled=rows.length<=1;
    return;
  }
  const curName=cur==='ALL'?'Sve lokacije':String(d.locations.find(x=>String(x.id)===String(cur))?.name||'Trenutna lokacija');
  sel.innerHTML=`<option value="CURRENT">Trenutna lokacija · ${esc(curName)}</option>`+d.locations.filter(x=>x&&x.active!==false).map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')+'<option value="ALL">Sve lokacije</option>';
  if([...sel.options].some(o=>o.value===old))sel.value=old;else sel.value='CURRENT';
  sel.disabled=false;
}
function filteredTransactions(){
  const loc=selectedLocation(),wh=document.getElementById('epalWarehouseFilter')?.value||'ALL',q=(document.getElementById('epalSupplierSearch')?.value||'').trim().toLocaleLowerCase('hr-HR');
  return load().filter(t=>(loc==='ALL'||t.location===loc)&&(wh==='ALL'||t.warehouse===wh)&&(!q||String(t.supplier||'').toLocaleLowerCase('hr-HR').includes(q)));
}
function balances(){
  const map=new Map();
  filteredTransactions().forEach(t=>{
    const k=`${t.supplier}|||${t.location}|||${t.warehouse}`;
    if(!map.has(k))map.set(k,{supplier:t.supplier,location:t.location,warehouse:t.warehouse,received:0,returned:0,lastAt:''});
    const x=map.get(k);
    x.received+=Number(t.received||0);x.returned+=Number(t.returned||0);
    if(String(t.createdAt||'')>String(x.lastAt||''))x.lastAt=t.createdAt;
  });
  return [...map.values()].map(x=>({...x,balance:x.received-x.returned})).sort((a,b)=>b.balance-a.balance||a.supplier.localeCompare(b.supplier,'hr'));
}
function updateWarehouseFilter(){
  updateLocationFilter();
  const loc=selectedLocation(),sel=document.getElementById('epalWarehouseFilter');if(!sel)return;
  const current=sel.value,rows=warehouseList(loc);
  if(role()==='reception'){
    const sig=JSON.stringify(rows.map(w=>[String(w.id),String(w.name||w.id)]));
    if(sel.dataset.yvEpalScopeSig!==sig){
      sel.innerHTML=rows.map(w=>`<option value="${esc(w.id)}">${esc(w.name||w.id)}</option>`).join('');
      sel.dataset.yvEpalScopeSig=sig;
    }
    const wanted=rows.some(w=>String(w.id)===String(current))?String(current):String(rows[0]?.id||'');
    if(wanted&&sel.value!==wanted)sel.value=wanted;
    sel.disabled=rows.length<=1;
    return;
  }
  sel.innerHTML='<option value="ALL">Sva skladišta</option>'+rows.map(w=>`<option value="${esc(w.id)}">${esc(w.name)}</option>`).join('');
  if([...sel.options].some(o=>o.value===current))sel.value=current;else sel.value='ALL';
  sel.disabled=false;
}
function render(){
  const view=document.getElementById('epal');
  if(!view||!allowed())return;
  // RoleVisibility owns this navigation and page visibility.
  updateWarehouseFilter();
  const tx=filteredTransactions(),bal=balances(),today=localDate();
  const debtSuppliers=bal.filter(x=>x.balance>0).length;
  const debt=bal.reduce((s,x)=>s+Math.max(0,x.balance),0);
  const inToday=tx.filter(x=>x.date===today).reduce((s,x)=>s+Number(x.received||0),0);
  const outToday=tx.filter(x=>x.date===today).reduce((s,x)=>s+Number(x.returned||0),0);

  document.getElementById('epalKpiSuppliersDebt').textContent=debtSuppliers;
  document.getElementById('epalKpiDebt').textContent=debt;
  document.getElementById('epalKpiInToday').textContent=inToday;
  document.getElementById('epalKpiOutToday').textContent=outToday;

  const badge=document.getElementById('epalDebtBadge');
  if(badge){
    const value=String(debtSuppliers),display=debtSuppliers?'inline-flex':'none';
    if(badge.textContent!==value)badge.textContent=value;
    if(badge.style.display!==display)badge.style.display=display;
  }

  const bb=document.getElementById('epalBalanceBody');
  bb.innerHTML=bal.length?bal.map(x=>{
    const cls=x.balance>0?'debt':x.balance<0?'credit':'ok';
    const txt=x.balance>0?`DUG ${x.balance}`:x.balance<0?`PREPLAĆENO ${Math.abs(x.balance)}`:'0';
    return `<tr><td><strong>${esc(x.supplier)}</strong></td><td>${locName(x.location)}</td><td>${esc(warehouseName(x.warehouse))}</td><td>${x.received}</td><td>${x.returned}</td><td><span class="epal-saldo ${cls}">${txt}</span></td><td>${x.lastAt?new Date(x.lastAt).toLocaleString('hr-HR'):'—'}</td><td><button class="action" onclick="YardivoEPAL.openForSupplier('${encodeURIComponent(x.supplier)}','${x.warehouse}')">NOVI ZAPIS</button></td></tr>`;
  }).join(''):'<tr><td colspan="8"><div class="overview-empty">Nema EPAL evidencije za odabrani filter.</div></td></tr>';

  const hb=document.getElementById('epalHistoryBody');
  hb.innerHTML=tx.slice().sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,200).map(t=>{
    const diff=Number(t.received||0)-Number(t.returned||0),cls=diff>0?'debt':diff<0?'credit':'ok';
    return `<tr><td>${t.createdAt?new Date(t.createdAt).toLocaleString('hr-HR'):'—'}</td><td>${esc(t.supplier)}</td><td>${esc(warehouseName(t.warehouse))}</td><td>${t.announcementId||'—'}</td><td>${t.received||0}</td><td>${t.returned||0}</td><td><span class="epal-saldo ${cls}">${diff>0?'+'+diff:diff}</span></td><td>${esc(t.note||'—')}</td><td>${esc(t.createdBy||'—')}</td></tr>`;
  }).join('')||'<tr><td colspan="9"><div class="overview-empty">Nema transakcija.</div></td></tr>';
}
function populateDialog(){
  const supplier=document.getElementById('epalSupplier'),wh=document.getElementById('epalWarehouse'),ann=document.getElementById('epalAnnouncement');
  supplier.innerHTML='<option value="">Odaberi dobavljača...</option>'+supplierList().map(s=>`<option>${esc(s)}</option>`).join('');
  const loc=selectedLocation(),whs=warehouseList(loc);
  wh.innerHTML='<option value="">Odaberi skladište...</option>'+whs.map(w=>`<option value="${esc(w.id)}">${esc(w.name)}</option>`).join('');
  const recent=allAnnouncements().filter(a=>a.supplier&&a.date).slice().sort((a,b)=>String(b.date+b.time).localeCompare(String(a.date+a.time))).slice(0,200);
  ann.innerHTML='<option value="">Bez povezane najave</option>'+recent.map(a=>`<option value="${a.id}">${a.date} ${a.time||''} · ${esc(a.supplier)} · ${esc(a.warehouse||'')}</option>`).join('');
  document.getElementById('epalDate').value=localDate();
  document.getElementById('epalReceived').value=0;document.getElementById('epalReturned').value=0;document.getElementById('epalNote').value='';
  updateLiveBalance();
}
function openDialog(){
  if(!canEdit())return;
  populateDialog();document.getElementById('epalDialog').showModal();
}
function openForSupplier(encoded,wh){
  openDialog();
  const supplier=decodeURIComponent(encoded);
  const s=document.getElementById('epalSupplier');if([...s.options].some(o=>o.value===supplier))s.value=supplier;
  const w=document.getElementById('epalWarehouse');if([...w.options].some(o=>o.value===wh))w.value=wh;
}
function syncFromAnnouncement(){
  const id=Number(document.getElementById('epalAnnouncement')?.value||0);if(!id)return;
  const a=allAnnouncements().find(x=>Number(x.id)===id);if(!a)return;
  const s=document.getElementById('epalSupplier');if([...s.options].some(o=>o.value===a.supplier))s.value=a.supplier;
  const w=document.getElementById('epalWarehouse');if([...w.options].some(o=>o.value===a.warehouse))w.value=a.warehouse;
  document.getElementById('epalDate').value=a.date||localDate();
  // Default received EPAL from pallets if user explicitly entered europallet count on announcement in future.
  if(Number(a.epalReceived||0)>0)document.getElementById('epalReceived').value=Number(a.epalReceived);
  updateLiveBalance();
}
function updateLiveBalance(){
  const r=Math.max(0,Number(document.getElementById('epalReceived')?.value||0)),o=Math.max(0,Number(document.getElementById('epalReturned')?.value||0)),d=r-o,el=document.getElementById('epalLiveBalance');
  el.className='epal-live-balance '+(d>0?'debt':d<0?'credit':'');
  el.textContent=d>0?`Nakon ovog zapisa mi dugujemo dobavljaču ${d} EPAL više.`:d<0?`Vraćeno je ${Math.abs(d)} EPAL više nego što je primljeno u ovom zapisu.`:'Razlika ovog zapisa: 0 EPAL';
}
function submit(e){
  e.preventDefault();
  if(!canEdit())return;
  const supplier=document.getElementById('epalSupplier').value,warehouse=document.getElementById('epalWarehouse').value,date=document.getElementById('epalDate').value;
  const received=Math.max(0,Math.floor(Number(document.getElementById('epalReceived').value||0))),returned=Math.max(0,Math.floor(Number(document.getElementById('epalReturned').value||0)));
  if(!supplier||!warehouse||!date)return alert('Odaberi dobavljača, skladište i datum.');
  if(received===0&&returned===0)return alert('Upiši barem primljene ili vraćene EPAL palete.');
  const rows=load(),id=Date.now(),announcementId=Number(document.getElementById('epalAnnouncement').value||0)||null;
  const rec={id,date,createdAt:new Date().toISOString(),supplier,warehouse,location:locationForWarehouse(warehouse),received,returned,balanceDelta:received-returned,announcementId,note:document.getElementById('epalNote').value.trim(),createdBy:nowUser()};
  rows.push(rec);save(rows);

  // If linked to an announcement, keep an easy EPAL reference on that announcement too.
  if(announcementId){
    const a=allAnnouncements().find(x=>Number(x.id)===announcementId);
    if(a){
      a.epalReceived=(Number(a.epalReceived||0)+received);
      a.epalReturned=(Number(a.epalReturned||0)+returned);
      a.epalBalance=Number(a.epalReceived||0)-Number(a.epalReturned||0);
      a.epalLastUpdatedAt=rec.createdAt;
      try{saveAnnouncements()}catch(e){}
    }
  }

  document.getElementById('epalDialog').close();
  render();
  try{showYmsToast?.('success','EPAL ZAPIS SPREMLJEN',`${supplier} · +${received} / -${returned} EPAL`)}catch(e){}
}

document.getElementById('epalNewTransactionBtn')?.addEventListener('click',openDialog);
document.getElementById('epalDialogClose')?.addEventListener('click',()=>document.getElementById('epalDialog').close());
document.getElementById('epalDialogCancel')?.addEventListener('click',()=>document.getElementById('epalDialog').close());
document.getElementById('epalForm')?.addEventListener('submit',submit);
document.getElementById('epalAnnouncement')?.addEventListener('change',syncFromAnnouncement);
document.getElementById('epalReceived')?.addEventListener('input',updateLiveBalance);
document.getElementById('epalReturned')?.addEventListener('input',updateLiveBalance);
document.getElementById('epalLocationFilter')?.addEventListener('change',()=>{updateWarehouseFilter();render()});
document.getElementById('epalWarehouseFilter')?.addEventListener('change',render);
document.getElementById('epalSupplierSearch')?.addEventListener('input',render);

document.addEventListener('click',e=>{if(e.target.closest('[data-view="epal"],[data-home-target="epal"]'))setTimeout(render,20)},true);

function homeCard(){
  const grid=document.getElementById('homeMenuGrid');if(!grid)return;
  let card=grid.querySelector('[data-home-target="epal"]');
  if(!allowed()){if(card)card.style.setProperty('display','none','important');return}
  if(!card){
    card=document.createElement('div');card.className='home-menu-card';card.dataset.homeTarget='epal';card.setAttribute('role','button');card.setAttribute('tabindex','0');
    card.innerHTML='<div class="home-menu-icon">▦</div><h3>Stanje europaleta</h3><p>Saldo EPAL paleta po dobavljaču i skladištu.</p><div class="home-menu-open">OTVORI →</div>';
    grid.appendChild(card);
  }
  card.style.setProperty('display','flex','important');card.onclick=()=>window.openAppView?.('epal');
}

let last='';
setInterval(()=>{
  let u='';try{u=String(currentSession?.username||currentSession?.user||'')}catch(e){}
  const sig=u+'|'+role();
  if(sig!==last){last=sig;homeCard();render()}
  else if(allowed())render();
},4000);
window.addEventListener('load',()=>setTimeout(()=>{homeCard();render()},400));

window.YardivoEPAL={render,open:openDialog,openForSupplier,transactions:load,balances};
})();
