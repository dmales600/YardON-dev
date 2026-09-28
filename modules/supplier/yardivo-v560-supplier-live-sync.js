
(function(){
'use strict';

async function call(action,payload={}){
  if(!window.YardivoSupplierService?.deliveries)throw new Error('Supplier data service nije spreman.');
  return await window.YardivoSupplierService.deliveries(action,payload);
}
function role(){
  let r='';
  try{
    const s=(typeof currentSession!=='undefined'?currentSession:window.currentSession)||window.currentSession||{};
    r=String(s?.app_role||s?.role||'').trim().toLowerCase();
  }catch(e){r=String(window.currentSession?.app_role||window.currentSession?.role||'').trim().toLowerCase()}
  if(r==='management'||r==='voditelj')r='manager';
  if(r==='zalihe'||r==='upravljanje zalihama'||r.includes('zalih'))r='inventory';
  if(r==='prijam')r='reception';
  if(r==='porta'||r==='portir')r='gate';
  if(r==='dobavljac'||r==='dobavljač')r='supplier';
  return r;
}
function internal(){return ['admin','manager','inventory','reception'].includes(role())}
function supplier(){return role()==='supplier'}

function supplierRowFromLocal(row){
  return {
    client_id:String(row.id),
    location:String(row.location||''),
    warehouse:String(row.warehouse||'').toUpperCase(),
    order_number:String(row.order||'').toUpperCase(),
    delivery_date:row.date,
    requested_time:String(row.time||''),
    dock:String(row.dock||''),
    pallets:Number(row.pallets||0),
    sku_count:Number(row.skuCount||0),
    vehicle_plate:String(row.plate||'').toUpperCase(),
    trailer_plate:String(row.trailerPlate||'').toUpperCase(),
    driver_name:String(row.driver||''),
    driver_contact:String(row.driverContact||''),
    delivery_note:String(row.reference||''),
    note:String(row.note||''),
    document_name:String(row.documentName||''),
    document_mime:String(row.documentMime||''),
    document_base64:String(row.documentBase64||'')
  };
}

async function pushSupplierRow(row){
  const saved=await call('upsert',supplierRowFromLocal(row));
  return saved;
}
async function pushVehicle(row){
  return await call('vehicle',{
    client_id:String(row.id),
    vehicle_plate:String(row.plate||'').toUpperCase(),
    trailer_plate:String(row.trailerPlate||'').toUpperCase(),
    driver_name:String(row.driver||''),
    driver_contact:String(row.driverContact||'')
  });
}
async function pullSupplier(){
  if(!supplier())return;
  const rowsRaw=await call('list_mine');
  /* Supabase supplier_deliveries is authoritative for Supplier history.
     A browser-local cleanup timestamp must never hide a valid server row. */
  const rows=Array.isArray(rowsRaw)?rowsRaw:[];
  if(!Array.isArray(rows))return;
  __yardivoSupplierMineRows=rows;
  try{window.dispatchEvent(new CustomEvent('yardivo:supplier-mine-rows',{detail:{rows}}))}catch(_){}
  try{
    const api=window.YardivoSupplierPortal;
    const s=(typeof currentSession!=='undefined'?currentSession:window.currentSession)||{};
    const key='yardivo_supplier_portal_v549_'+String(s.authUserId||s.username||s.user||'supplier');
    const local=JSON.parse(localStorage.getItem(key)||'[]');
    const map=new Map((Array.isArray(local)?local:[]).map(x=>[String(x.id),x]));
    rows.forEach(x=>{
      const old=map.get(String(x.client_id))||{};
      const qrMeta=window.YardivoGateQrV583?.parseReviewNote?.(x.review_note||'')||null;
      const cleanReview=window.YardivoGateQrV583?.cleanReviewNote?.(x.review_note||'')??(x.review_note||'');
      map.set(String(x.client_id),{
        ...old,id:x.client_id,location:x.location||'',warehouse:x.warehouse,date:x.delivery_date,time:x.requested_time,
        order:x.order_number||'',pallets:x.pallets,skuCount:x.sku_count||0,
        plate:x.vehicle_plate||'',trailerPlate:x.trailer_plate||'',driver:x.driver_name||'',
        driverContact:x.driver_contact||'',reference:x.delivery_note||'',note:x.note||'',dock:x.dock||'',
        reviewNote:cleanReview,status:x.status||'pending',duration:Number(x.duration_minutes||0),proposedTime:x.proposed_time||'',proposedDock:x.proposed_dock||'',createdAt:x.created_at,updatedAt:x.updated_at,
        gateQrToken:qrMeta?.token||'',gateQrUrl:qrMeta?.qrUrl||'',gateQrIssuedAt:qrMeta?.issuedAt||''
      });
    });
    localStorage.setItem(key,JSON.stringify([...map.values()]));
    const activeSupplierView=document.querySelector('#yardivoSupplierPortal [data-ysp-view].active')?.dataset?.yspView||'';
    if(!window.__YARDIVO_SUPPLIER_HISTORY_STATUS_SERVER_AUTH_20260923__||activeSupplierView!=='status')api?.render?.();
  }catch(e){console.error('Supplier pull',e)}
}

function stableSupplierAnnouncementId(serverId){
  const s=String(serverId||'');
  let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return 700000000+(Math.abs(h>>>0)%199999999);
}
function mirrorInternal(x){
  try{
    if(typeof announcements==='undefined'||!Array.isArray(announcements)||typeof saveAnnouncements!=='function')return;
    const approved=['confirmed','arrival','dock','receiving','completed'].includes(String(x.status||'').toLowerCase());
    const existingIndex=announcements.findIndex(v=>String(v.supplierDeliveryId||'')===String(x.id));

    // Hydrate supplier PDF from canonical Supabase row for every authorized internal role.
    // This makes the PDF icon/viewer work on Dnevna/Tjedna mapa and Prijam on any device,
    // not only in the supplier browser that originally uploaded the file.
    try{
      const b64=String(x.document_base64||'').trim();
      const docId=String(x.client_id||x.id||'').trim();
      if(b64&&docId){
        const dataUrl='data:'+(String(x.document_mime||'application/pdf')||'application/pdf')+';base64,'+b64;
        const approxSize=Math.max(0,Math.floor((b64.length*3)/4)-(b64.endsWith('==')?2:(b64.endsWith('=')?1:0)));
        localStorage.setItem('yardivo_supplier_attachment_'+docId,JSON.stringify({
          name:String(x.document_name||'dokument.pdf'),
          type:String(x.document_mime||'application/pdf'),
          size:approxSize,
          dataUrl,
          uploadedAt:String(x.updated_at||x.created_at||new Date().toISOString())
        }));
      }
    }catch(e){console.warn('YARDIVO supplier PDF hydrate',e)}

    if(!approved){
      // Pending/revision/rejected supplier requests stay ONLY in "Najave dobavljača".
      // If a previously approved record is later rejected, remove it from operational maps.
      if(existingIndex>=0 && ['rejected'].includes(String(x.status||'').toLowerCase())){
        announcements.splice(existingIndex,1);
      }
      return;
    }

    const internalStatus={
      confirmed:'Najavljen',
      arrival:'Stigao',
      dock:'Na rampi',
      receiving:'Zaprimanje',
      completed:'Zaprimljeno'
    }[String(x.status||'').toLowerCase()]||'Najavljen';

    const base={
      supplierDeliveryId:x.id,
      supplierPortalId:x.client_id,
      supplierSource:'supplier_live',
      supplier:x.supplier_name||x.supplier_username||'Supplier',
      orderNumber:x.order_number||'',
      warehouse:x.warehouse,
      date:x.delivery_date,
      time:String(x.requested_time||'').slice(0,5),
      pallets:Number(x.pallets||0),
      sku:Number(x.sku_count||0),
      plannedPlate:x.vehicle_plate||'',
      trailerPlate:x.trailer_plate||'',
      plannedDriver:x.driver_name||'',
      driverContact:x.driver_contact||'',
      reference:x.delivery_note||'',
      supplierNote:x.note||'',
      dock:x.dock||'',
      status:internalStatus,
      supplierApprovalStatus:x.status,
      supplierReviewNote:x.review_note||'',
      hasAttachment:!!x.document_base64,
      attachmentName:x.document_name||'',
      attachmentSize:x.document_base64?Math.max(0,Math.floor((String(x.document_base64).length*3)/4)):0,
      attachmentDataUrl:x.document_base64?('data:'+(x.document_mime||'application/pdf')+';base64,'+x.document_base64):'',
      updatedAt:x.updated_at
    };
    if(existingIndex>=0)Object.assign(announcements[existingIndex],base);
    else announcements.push({
      id:stableSupplierAnnouncementId(x.id),
      createdAt:x.created_at,
      createdBy:'supplier:'+String(x.supplier_username||''),
      duration:Number(x.duration_minutes||60),
      responsible:'',
      ...base
    });
  }catch(e){console.error('Supplier internal mirror',e)}
}
let __yardivoInternalSupplierFingerprint='';
let __yardivoInternalSupplierRows=null;
let __yardivoSupplierMineRows=null;
function __yardivoSupplierRowsFingerprint(rows){
  try{return JSON.stringify((rows||[]).map(x=>[x.id,x.client_id,x.status,x.delivery_date,x.requested_time,x.dock,x.updated_at,x.pallets,x.sku_count,x.vehicle_plate,x.trailer_plate,x.driver_name,x.driver_contact,x.review_note]))}
  catch(_){return String(Date.now())}
}
async function pullInternal(force=false){
  if(!internal())return false;
  const rowsRaw=await call('list_internal');
  /* Supabase supplier_deliveries is authoritative. A browser-local cleanup timestamp
     may never hide a valid DB request. Legacy rows are filtered by current Master IDs. */
  let validWarehouseIds=null;
  try{
    const m=window.YardivoAppStateV583?.master?.()||JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');
    validWarehouseIds=new Set((Array.isArray(m?.warehouses)?m.warehouses:[]).filter(w=>w&&w.active!==false).map(w=>String(w.id||'').trim()).filter(Boolean));
  }catch(_){}
  const rows=(Array.isArray(rowsRaw)?rowsRaw:[]).filter(x=>!validWarehouseIds||!validWarehouseIds.size||validWarehouseIds.has(String(x?.warehouse||'').trim()));
  if(!Array.isArray(rows))return false;
  __yardivoInternalSupplierRows=rows;
  try{window.dispatchEvent(new CustomEvent('yardivo:supplier-internal-rows',{detail:{rows}}))}catch(_){}
  const fp=__yardivoSupplierRowsFingerprint(rows);
  if(!force && fp===__yardivoInternalSupplierFingerprint)return false;
  __yardivoInternalSupplierFingerprint=fp;
  const before=(()=>{try{return JSON.stringify((announcements||[]).filter(a=>a?.supplierSource==='supplier_live'))}catch(_){return''}})();
  rows.forEach(mirrorInternal);
  const after=(()=>{try{return JSON.stringify((announcements||[]).filter(a=>a?.supplierSource==='supplier_live'))}catch(_){return String(Date.now())}})();
  if(before!==after){
    try{saveAnnouncements()}catch(_){}
    try{
      const active=document.querySelector('.view.active')?.id||'';
      const map={announcements:'renderAnnouncements',dailyMap:'renderDailyMap',weeklyMap:'renderWeeklyMap',receiving:'renderReceiving',controlTower:'renderControlTower',controltower:'renderControlTower',dashboard:'renderDashboard'};
      const fn=map[active];if(fn&&typeof window[fn]==='function')window[fn]();
    }catch(_){}
    try{window.dispatchEvent(new CustomEvent('yardivo:data-synced',{detail:{source:'supplier',changed:true}}))}catch(_){}
    return true;
  }
  return false;
}

let __yardivoSupplierSyncBusy=false;
async function syncNow(){
  if(__yardivoSupplierSyncBusy||document.hidden||navigator.onLine===false)return false;
  __yardivoSupplierSyncBusy=true;
  try{
    if(supplier())return await pullSupplier();
    if(internal())return await pullInternal(false);
    return false;
  }catch(e){
    console.error('YARDIVO supplier live sync',e);
    return false;
  }finally{__yardivoSupplierSyncBusy=false}
}

window.YardivoSupplierLiveSync={
  call,pushSupplierRow,pushVehicle,pullSupplier,pullInternal,syncNow,
  busy:()=>__yardivoSupplierSyncBusy,
  internalRows:()=>Array.isArray(__yardivoInternalSupplierRows)?__yardivoInternalSupplierRows:null,
  mineRows:()=>Array.isArray(__yardivoSupplierMineRows)?__yardivoSupplierMineRows:null
};

let __yardivoSupplierSyncScheduleTimer=0;
function scheduleSync(delay=250){
  clearTimeout(__yardivoSupplierSyncScheduleTimer);
  __yardivoSupplierSyncScheduleTimer=setTimeout(()=>{__yardivoSupplierSyncScheduleTimer=0;syncNow()},Math.max(0,Number(delay)||0));
}
window.addEventListener('yardivo:login',()=>scheduleSync(350));
document.addEventListener('click',e=>{
  if(!supplier())return;
  const b=e.target.closest?.('#yardivoSupplierPortal [data-ysp-view="status"]');
  if(b)setTimeout(()=>pullSupplier().catch(err=>console.error('Supplier history refresh',err)),30);
},true);
window.addEventListener('load',()=>scheduleSync(750));
window.addEventListener('focus',()=>scheduleSync(500));
window.addEventListener('yardivo:server-change',()=>scheduleSync(450));
window.addEventListener('yardivo:context-changed',()=>scheduleSync(350));
/* Event-driven refresh is primary. This visible-tab pulse is only a five-minute
   safety fallback, preventing thousands of supplier Edge calls per open tab. */
window.__yardivoSupplierLiveSyncTimer&&clearInterval(window.__yardivoSupplierLiveSyncTimer);
window.__yardivoSupplierLiveSyncTimer=setInterval(()=>{
  if(document.hidden)return;
  if(!document.getElementById('ysrPlannerOverlay')?.classList.contains('open'))syncNow();
},300000);
})();
