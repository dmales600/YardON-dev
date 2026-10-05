(function(){
'use strict';
if(window.YardivoReceivingService?.owner==='modules/receiving/service.js')return;

let installed=false;
let original=null;

function currentCfg(){
  try{
    const raw=window.safeStorage?.getItem?.('yardivo_qr_scan_cfg_v583') ?? localStorage.getItem('yardivo_qr_scan_cfg_v583');
    const parsed=JSON.parse(raw||'{}');
    return {
      enabled:parsed?.enabled!==false,
      byWarehouse:(parsed?.byWarehouse&&typeof parsed.byWarehouse==='object')?parsed.byWarehouse:{}
    };
  }catch(_){
    return {enabled:true,byWarehouse:{}};
  }
}

function enabledFor(warehouse){
  const cfg=currentCfg();
  const value=cfg.byWarehouse?.[String(warehouse||'')];
  if(typeof value==='boolean')return value;
  if(value&&typeof value==='object'&&Object.prototype.hasOwnProperty.call(value,'enabled'))return !!value.enabled;
  return cfg.enabled!==false;
}

function announcementFor(id){
  try{
    const list=Array.isArray(window.announcements)?window.announcements:(typeof announcements!=='undefined'&&Array.isArray(announcements)?announcements:[]);
    return list.find(x=>String(x?.id)===String(id))||null;
  }catch(_){return null}
}

function warehouseFor(id){
  let warehouse=String(document.getElementById('globalWarehouse')?.value||window.activeWarehouse||'');
  const row=announcementFor(id);
  if(row?.warehouse)warehouse=String(row.warehouse);
  return warehouse;
}

function warehouseName(id){
  try{
    const data=window.YardivoMasterDataService?.read?.()||{};
    return String((data.warehouses||[]).find(x=>String(x.id)===String(id))?.name||id||'odabrano skladište');
  }catch(_){return String(id||'odabrano skladište')}
}

function emit(id,status,source){
  try{
    window.dispatchEvent(new CustomEvent('yardivo:receiving-status-changed',{
      detail:{id:String(id??''),status:String(status??''),source:String(source||'manual'),ts:Date.now()}
    }));
  }catch(_){}
}

const SUPPLIER_STATUS={
  'U dvorištu':'arrival',
  'Na rampi':'dock',
  'Zaprimanje':'receiving',
  'Zaprimljeno':'completed',
  'Odbijen':'rejected'
};

async function syncSupplierStatus(id,status){
  const next=SUPPLIER_STATUS[String(status||'')];
  if(!next)return false;
  const row=announcementFor(id);
  const supplierDeliveryId=String(row?.supplierDeliveryId||'').trim();
  if(!supplierDeliveryId)return false;
  if(String(row?.status||'')!==String(status||''))return false;
  const api=window.YardivoSupplierLiveSync?.call;
  if(typeof api!=='function')return false;
  let lastError=null;
  for(let attempt=0;attempt<2;attempt++){
    try{
      await api('internal_update',{id:supplierDeliveryId,status:next});
      row.supplierApprovalStatus=next;
      return true;
    }catch(e){
      lastError=e;
      if(attempt===0)await new Promise(r=>setTimeout(r,350));
    }
  }
  console.warn('YARDIVO receiving supplier status sync failed',supplierDeliveryId,next,lastError);
  return false;
}

function install(){
  if(installed&&window.setReceivingAnnouncementStatus?.__yardivoReceivingOwner)return true;
  const current=window.setReceivingAnnouncementStatus;
  if(typeof current!=='function')return false;
  if(current.__yardivoReceivingOwner){installed=true;original=current.__yardivoReceivingOriginal||null;return true}

  original=current;
  function canonicalSetReceivingAnnouncementStatus(id,status,source='manual'){
    const wh=warehouseFor(id);
    if(source==='manual'&&enabledFor(wh)){
      alert(`QR scanner je UKLJUČEN za ${warehouseName(wh)}. Ručna promjena statusa nije dopuštena.`);
      return;
    }
    const result=original.apply(this,arguments);
    const after=()=>{
      emit(id,status,source);
      void syncSupplierStatus(id,status);
    };
    if(result&&typeof result.then==='function'){
      result.then(after).catch(()=>{});
    }else{
      after();
    }
    return result;
  }
  canonicalSetReceivingAnnouncementStatus.__yardivoReceivingOwner=true;
  canonicalSetReceivingAnnouncementStatus.__yardivoReceivingOriginal=original;
  window.setReceivingAnnouncementStatus=canonicalSetReceivingAnnouncementStatus;
  try{setReceivingAnnouncementStatus=canonicalSetReceivingAnnouncementStatus}catch(_){}
  installed=true;
  return true;
}

window.YardivoReceivingService={
  owner:'modules/receiving/service.js',
  install,
  enabledFor,
  warehouseFor,
  syncSupplierStatus,
  original:()=>original
};
window.yardivoReceivingQrEnabledForWarehouseV585=enabledFor;

install();
document.addEventListener('DOMContentLoaded',install,{once:true});
window.addEventListener('load',install,{once:true});
})();