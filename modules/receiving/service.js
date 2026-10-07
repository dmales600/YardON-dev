(function(){
'use strict';
if(window.YardivoReceivingService?.owner==='modules/receiving/service.js')return;

let installed=false;
let original=null;
let yardDispatchRunning=false;
let yardDispatchLastRun=0;

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

function appRole(){
  let r='';
  try{r=String(window.currentSession?.app_role||window.currentSession?.role||'').toLowerCase().trim()}catch(_){}
  if(r==='porta'||r==='portir')r='gate';
  if(r==='prijam')r='reception';
  return r;
}
function yardDispatchAllowed(){return ['admin','gate','reception'].includes(appRole())}
function aiControlEnabled(){
  try{
    if(window.YardOnAIAdminV1?.aiControlEnabled)return window.YardOnAIAdminV1.aiControlEnabled();
    const c=JSON.parse(localStorage.getItem('yardivo_auto_replan_cfg_v1')||'{}')||{};
    return c.enabled===true&&String(c.mode||'').toUpperCase()!=='PAUSED';
  }catch(_){return false}
}
function yardDispatchEnabled(){return yardDispatchAllowed()&&aiControlEnabled()}
async function yardDispatchToken(){
  try{if(typeof window.YardivoSupplierService?.token==='function')return await window.YardivoSupplierService.token()}catch(_){}
  const direct=String(window.__yardivoSupplierAccessToken||'').trim();if(direct)return direct;
  const c=await window.YardivoAuth?.client?.();let s=(await c?.auth?.getSession?.())?.data?.session||null;
  if(!s?.access_token)s=(await c?.auth?.refreshSession?.())?.data?.session||null;
  if(!s?.access_token)throw new Error('ONLINE PRIJAVA NIJE AKTIVNA.');
  return s.access_token;
}
async function dispatchWaitingYard(warehouse='',force=false){
  if(!yardDispatchEnabled()||yardDispatchRunning)return null;
  const now=Date.now();if(!force&&now-yardDispatchLastRun<1800)return null;
  yardDispatchRunning=true;yardDispatchLastRun=now;
  try{
    const base=String(window.YardivoSupabaseClient?.base||'https://ldzwgdwzolbvjxyznlry.supabase.co');
    const key=String(window.YardivoSupabaseClient?.publishableKey||'sb_publishable_f3daeEDsH7zNSiFR5QluaQ_AP4Ptjzz');
    const t=await yardDispatchToken();
    const r=await fetch(base+'/functions/v1/yardivo-yard-dispatch',{
      method:'POST',
      headers:{apikey:key,Authorization:'Bearer '+t,'Content-Type':'application/json'},
      body:JSON.stringify({action:'dispatch',...(warehouse?{warehouse}: {})})
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d?.ok===false)throw new Error(d?.error||('YARD DISPATCH HTTP '+r.status));
    const assignments=(d.results||[]).flatMap(x=>x?.assignments||[]);
    if(assignments.length){
      try{await window.YardivoSupplierLiveSync?.pullInternal?.(true)}catch(_){}
      try{await window.YardivoSync?.pull?.()}catch(_){}
      try{window.renderReceiving?.()}catch(_){}
      try{window.renderDailyMap?.()}catch(_){}
      try{window.renderWeeklyMap?.()}catch(_){}
      try{window.dispatchEvent(new CustomEvent('yardivo:yard-ai-dispatched',{detail:{assignments,results:d.results||[]}}))}catch(_){}
      try{window.showYmsToast?.('success','YARDON AI · RAMPA DODIJELJENA',assignments.map(x=>String(x.dock||'')).filter(Boolean).join(', '),3600)}catch(_){}
    }
    return d;
  }catch(e){
    console.warn('YardOn AI yard dispatch',e);
    return null;
  }finally{yardDispatchRunning=false}
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
      if(['Zaprimljeno','Odbijen'].includes(String(status||'')))setTimeout(()=>void dispatchWaitingYard(wh,true),120);
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
  dispatchWaitingYard,
  original:()=>original
};
window.YardivoYardDispatch={owner:'modules/receiving/service.js',dispatch:dispatchWaitingYard,allowed:yardDispatchEnabled,aiControlEnabled};
window.yardivoReceivingQrEnabledForWarehouseV585=enabledFor;

install();
document.addEventListener('DOMContentLoaded',install,{once:true});
document.addEventListener('click',e=>{
  if(!yardDispatchEnabled())return;
  if(e.target?.closest?.('button[data-approve],button[data-gate-approve],[data-yv-manual-gate-enter]'))setTimeout(()=>void dispatchWaitingYard('',true),700);
},true);
window.addEventListener('yardivo:login',()=>setTimeout(()=>void dispatchWaitingYard('',true),900));
window.addEventListener('yardivo:ai-admin-config',()=>{if(aiControlEnabled())setTimeout(()=>void dispatchWaitingYard('',true),120)});
window.addEventListener('focus',()=>void dispatchWaitingYard('',false));
window.addEventListener('load',()=>{
  install();
  setTimeout(()=>void dispatchWaitingYard('',true),1600);
  setInterval(()=>{if(document.visibilityState==='visible'&&yardDispatchEnabled())void dispatchWaitingYard('',false)},5000);
},{once:true});
})();