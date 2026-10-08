
(function(){
'use strict';

const KEY='yardivo_live_notifications_v1';
const SNAP='yardivo_full_news_snapshot_v548';
const TARGETS=['admin','manager','inventory','reception'];

function A(){try{return Array.isArray(announcements)?announcements:[]}catch(e){return[]}}
function safe(v){return v===undefined||v===null?'':String(v)}
function norm(v){return safe(v).trim()}
function masterRegistry(){
  try{
    const x=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');
    return x&&typeof x==='object'?x:{};
  }catch(e){return{}}
}
function normalizeDock(v){
  const raw=norm(v).toUpperCase();
  if(!raw)return'';
  const m=raw.replace(/RAMPA/g,'').replace(/^R+/,'').trim().match(/\d+/);
  if(!m)return'';
  const n=Number(m[0]);
  return Number.isFinite(n)&&n>0?String(n):'';
}
function normalizeWarehouse(v){
  const raw=norm(v).toUpperCase();
  if(!raw)return'';
  const rows=Array.isArray(masterRegistry().warehouses)?masterRegistry().warehouses:[];
  const hit=rows.find(w=>String(w?.id||'').toUpperCase()===raw||String(w?.name||w?.code||'').toUpperCase()===raw);
  return String(hit?.id||raw).toUpperCase();
}
function warehouseLabel(v){
  const id=normalizeWarehouse(v);
  const rows=Array.isArray(masterRegistry().warehouses)?masterRegistry().warehouses:[];
  const hit=rows.find(w=>String(w?.id||'').toUpperCase()===id);
  return norm(hit?.name||hit?.code||id)||'—';
}
function load(){
  try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}
  catch(e){return[]}
}
function save(q){
  q=q.slice(-1200);
  try{localStorage.setItem(KEY,JSON.stringify(q))}catch(e){}
  try{if(typeof putCloudState==='function')Promise.resolve(putCloudState(KEY,JSON.stringify(q))).catch(()=>{})}catch(e){}
  try{window.YardivoNotifications?.render?.()}catch(e){}
}
function loadSnap(){
  try{const x=JSON.parse(sessionStorage.getItem(SNAP)||'{}');return x&&typeof x==='object'?x:{}}
  catch(e){return{}}
}
function saveSnap(x){try{sessionStorage.setItem(SNAP,JSON.stringify(x))}catch(e){}}
function idOf(a){return norm(a?.id)}
function plate(a){return norm(a?.arrivalPlate||a?.plannedPlate||a?.vehiclePlate||a?.plate||a?.registration)}
function driver(a){return norm(a?.arrivalDriver||a?.plannedDriver||a?.driverNameCanonical||a?.driver||a?.driverName)}
function state(a){
  return {
    id:idOf(a),
    supplierDeliveryId:norm(a?.supplierDeliveryId||a?.supplierPortalId||''),
    supplier:norm(a?.supplier),
    orderNumber:norm(a?.orderNumber),
    date:norm(a?.date),
    time:norm(a?.time),
    actualDate:norm(a?.actualDate),
    actualTime:norm(a?.actualTime),
    warehouse:normalizeWarehouse(a?.warehouse),
    dock:normalizeDock(a?.dock),
    status:norm(a?.status||'Najavljen'),
    arrivalType:norm(a?.arrivalType),
    approvalStatus:norm(a?.approvalStatus),
    plate:plate(a),
    driver:driver(a),
    pallets:norm(a?.pallets),
    sku:norm(a?.sku),
    checkinAt:norm(a?.checkinAt),
    arrivalRecordedAt:norm(a?.arrivalRecordedAt),
    actualArrivalAt:norm(a?.actualArrivalAt||a?.arrivalAt),
    gateEnteredAt:norm(a?.gateEnteredAt||a?.enteredAt),
    yardArrivalAt:norm(a?.yardArrivalAt),
    dockArrivalAt:norm(a?.dockArrivalAt||a?.dockAt),
    unloadStartAt:norm(a?.unloadStartAt),
    receivedAt:norm(a?.receivedAt),
    rejectedAt:norm(a?.rejectedAt),
    finishedAt:norm(a?.finishedAt),
    checkoutAt:norm(a?.checkoutAt),
    waitingAt:norm(a?.waitingAt),
    calledAt:norm(a?.calledAt)
  };
}
function base(s){
  return `${s.supplier||'Dobavljač'}${s.orderNumber?' · '+s.orderNumber:''} · ${s.date||'—'} ${s.time||'—'} · ${warehouseLabel(s.warehouse)}${s.dock?' · R'+normalizeDock(s.dock):''}`;
}
function hash(v){
  let h=2166136261;
  v=safe(v);
  for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0).toString(16);
}
function push(event,title,body,s,extra={}){
  const marker=JSON.stringify([event,s.id,s.status,s.date,s.time,s.dock,s.approvalStatus,extra]);
  const id='NEWS-'+hash(marker);
  const q=load();
  if(q.some(n=>String(n.id)===id))return;
  const now=new Date().toISOString();
  q.push({
    id,event,title,body,at:now,createdAt:now,
    roles:[...TARGETS],readBy:{},
    announcementId:s.id,supplier:s.supplier,orderNumber:s.orderNumber,
    warehouse:s.warehouse,dock:s.dock,date:s.date,time:s.time,plate:s.plate,
    ...extra
  });
  save(q);
}
function diff(oldS,newS){
  const changes=[];
  const add=(k,label)=>{
    const from=oldS[k],to=newS[k];
    const same=k==='dock'
      ? normalizeDock(from)===normalizeDock(to)
      : k==='warehouse'
        ? normalizeWarehouse(from)===normalizeWarehouse(to)
        : from===to;
    if(!same)changes.push({k,label,from,to});
  };

  add('status','Status');
  add('approvalStatus','Odobrenje');
  add('date','Datum termina');
  add('time','Vrijeme termina');
  add('warehouse','Skladište');
  add('dock','Rampa');
  add('actualDate','Stvarni datum');
  add('actualTime','Stvarno vrijeme');
  add('plate','Registracija');
  add('driver','Vozač');
  add('pallets','Palete');
  add('sku','SKU');
  add('checkinAt','Prijava dolaska');
  add('arrivalRecordedAt','Evidentiran dolazak');
  add('actualArrivalAt','Stvarni dolazak');
  add('gateEnteredAt','Ulazak kroz portu');
  add('yardArrivalAt','Ulazak u dvorište');
  add('waitingAt','Čekanje');
  add('calledAt','Poziv na rampu');
  add('dockArrivalAt','Dolazak na rampu');
  add('unloadStartAt','Početak istovara');
  add('receivedAt','Zaprimanje robe');
  add('rejectedAt','Odbijanje');
  add('finishedAt','Završetak');
  add('checkoutAt','Izlazak');

  return changes;
}
function classify(c,s){
  if(c.k==='status'){
    const st=norm(s.status).toLowerCase();
    if(st.includes('na rampi'))return ['VOZILO NA RAMPI',`${base(s)} · status: ${c.from||'—'} → ${c.to||'—'}`];
    if(st.includes('dvori'))return ['DOLAZAK U DVORIŠTE',`${base(s)} · status: ${c.from||'—'} → ${c.to||'—'}`];
    if(st.includes('zaprim'))return ['ROBA ZAPRIMLJENA',`${base(s)} · status: ${c.from||'—'} → ${c.to||'—'}`];
    if(st.includes('odbij'))return ['DOSTAVA ODBIJENA',`${base(s)} · status: ${c.from||'—'} → ${c.to||'—'}`];
    if(st.includes('zavr'))return ['PROCES ZAVRŠEN',`${base(s)} · status: ${c.from||'—'} → ${c.to||'—'}`];
    if(st.includes('iza'))return ['IZLAZAK VOZILA',`${base(s)} · status: ${c.from||'—'} → ${c.to||'—'}`];
    return [`STATUS NAJAVE · ${s.status.toUpperCase()}`,`${base(s)} · ${c.from||'—'} → ${c.to||'—'}`];
  }
  if(c.k==='approvalStatus')return [`NENAJAVLJENI · ODLUKA`,`${base(s)} · odobrenje ${c.from||'—'} → ${c.to||'—'}`];
  if(c.k==='date'||c.k==='time')return ['PROMJENA TERMINA',`${base(s)} · ${c.label}: ${c.from||'—'} → ${c.to||'—'}`];
  if(c.k==='warehouse')return ['PROMJENA SKLADIŠTA',`${base(s)} · Skladište: ${warehouseLabel(c.from)} → ${warehouseLabel(c.to)}`];
  if(c.k==='dock'){
    const from=normalizeDock(c.from),to=normalizeDock(c.to);
    if(!from&&to)return ['YARDON DODIJELIO RAMPU',`${s.supplier||'Dobavljač'} · ${s.date||'—'} ${s.time||'—'} · ${warehouseLabel(s.warehouse)} · YardOn dodijelio rampu R${to}.`];
    if(from&&!to)return ['RAMPA OSLOBOĐENA',`${s.supplier||'Dobavljač'} · ${warehouseLabel(s.warehouse)} · prethodna rampa R${from} više nije dodijeljena.`];
    return ['PROMJENA RAMPE',`${base(s)} · Rampa: R${from} → R${to}`];
  }
  if(c.k==='gateEnteredAt')return ['ULAZAK KROZ PORTU',`${base(s)} · vozilo je ušlo kroz portu.`];
  if(c.k==='yardArrivalAt')return ['DOLAZAK U DVORIŠTE',`${base(s)} · vozilo je evidentirano u dvorištu.`];
  if(c.k==='checkinAt'||c.k==='arrivalRecordedAt'||c.k==='actualArrivalAt'||c.k==='actualDate'||c.k==='actualTime')return ['PRIJAVA DOLASKA',`${base(s)} · evidentiran stvarni dolazak.`];
  if(c.k==='waitingAt')return ['VOZILO ČEKA',`${base(s)} · vozilo je prešlo u čekanje.`];
  if(c.k==='calledAt')return ['POZVAN NA RAMPU',`${base(s)} · vozilo je pozvano na rampu.`];
  if(c.k==='dockArrivalAt')return ['VOZILO NA RAMPI',`${base(s)} · evidentiran dolazak na rampu.`];
  if(c.k==='unloadStartAt')return ['ISTOVAR ZAPOČEO',`${base(s)} · započeo je istovar.`];
  if(c.k==='receivedAt')return ['ROBA ZAPRIMLJENA',`${base(s)} · zaprimanje je evidentirano.`];
  if(c.k==='rejectedAt')return ['DOSTAVA ODBIJENA',`${base(s)} · odbijanje je evidentirano.`];
  if(c.k==='finishedAt')return ['PROCES ZAVRŠEN',`${base(s)} · obrada dostave je završena.`];
  if(c.k==='checkoutAt')return ['IZLAZAK VOZILA',`${base(s)} · vozilo je izašlo.`];
  if(c.k==='plate'||c.k==='driver')return ['PROMJENA PODATAKA DOLASKA',`${base(s)} · ${c.label}: ${c.from||'—'} → ${c.to||'—'}`];
  return ['PROMJENA NA NAJAVI',`${base(s)} · ${c.label}: ${c.from||'—'} → ${c.to||'—'}`];
}

let snap=loadSnap();
let initialized=Object.keys(snap).length>0;

function seed(){
  snap={};
  A().forEach(a=>{const s=state(a);if(s.id)snap[s.id]=s});
  saveSnap(snap);
  initialized=true;
}
function scan(){
  if(!window.currentSession?.role && typeof currentSession==='undefined')return;
  const next={};
  A().forEach(a=>{
    const s=state(a); if(!s.id)return;
    next[s.id]=s;
    const old=snap[s.id];

    if(initialized && !old){
      // Supplier confirmation is already emitted by the authoritative
      // Supabase supplier-time-ops service. Mirroring it into Daily Map
      // must not create a second "NOVA NAJAVA" for Reception.
      if(s.supplierDeliveryId||String(s.id).startsWith('SUPDEL-'))return;
      const ua=s.arrivalType.toUpperCase()==='UNANNOUNCED';
      push(
        ua?'UNANNOUNCED_CREATED':'ANNOUNCEMENT_CREATED',
        ua?'NENAJAVLJENI DOLAZAK':'NOVA NAJAVA',
        base(s)+(ua?' · zahtjev nenajavljenog dolaska.':' · kreirana nova najava.'),
        s
      );
      return;
    }

    if(initialized && old){
      let changes=diff(old,s);

      /* One physical event = one useful notification. */
      const statusChanged=changes.some(c=>c.k==='status');
      if(statusChanged){
        const st=norm(s.status).toLowerCase();
        const linked=st.includes('na rampi')?'dockArrivalAt'
          :st.includes('dvori')?'yardArrivalAt'
          :st.includes('zaprim')?'receivedAt'
          :st.includes('odbij')?'rejectedAt'
          :st.includes('zavr')?'finishedAt'
          :st.includes('iza')?'checkoutAt':'';
        if(linked)changes=changes.filter(c=>c.k!==linked);
      }

      const take=keys=>changes.filter(c=>keys.includes(c.k));
      const drop=keys=>{changes=changes.filter(c=>!keys.includes(c.k))};

      const term=take(['date','time']);
      if(term.length===2){
        push('ANNOUNCEMENT_NEWS','PROMJENA TERMINA',
          `${s.supplier||'Dobavljač'} · ${warehouseLabel(s.warehouse)}${s.dock?' · R'+normalizeDock(s.dock):''} · ${old.date||'—'} ${old.time||'—'} → ${s.date||'—'} ${s.time||'—'}`,
          s,{field:'term',from:`${old.date||''} ${old.time||''}`.trim(),to:`${s.date||''} ${s.time||''}`.trim()});
        drop(['date','time']);
      }

      const place=take(['warehouse','dock']);
      if(place.length===2){
        push('ANNOUNCEMENT_NEWS','PROMJENA SKLADIŠTA / RAMPE',
          `${s.supplier||'Dobavljač'} · ${s.date||'—'} ${s.time||'—'} · ${warehouseLabel(old.warehouse)}${old.dock?' · R'+normalizeDock(old.dock):''} → ${warehouseLabel(s.warehouse)}${s.dock?' · R'+normalizeDock(s.dock):''}`,
          s,{field:'warehouse_dock',from:`${normalizeWarehouse(old.warehouse)}|${normalizeDock(old.dock)}`,to:`${normalizeWarehouse(s.warehouse)}|${normalizeDock(s.dock)}`});
        drop(['warehouse','dock']);
      }

      changes.forEach(c=>{
        const [title,body]=classify(c,s);
        push('ANNOUNCEMENT_NEWS',title,body,s,{field:c.k,from:c.from,to:c.to});
      });
    }
  });
  snap=next;
  saveSnap(snap);
}

function start(){
  if(!initialized)seed();
  else scan();
}

window.addEventListener('load',()=>setTimeout(start,1200));
window.addEventListener('yardivo:login',()=>setTimeout(start,150));
window.addEventListener('yardivo:data-synced',()=>setTimeout(scan,100));
setInterval(scan,650);

window.YardivoFullOperationalNotificationsV548={
  scan,seed,targets:[...TARGETS]
};
})();
