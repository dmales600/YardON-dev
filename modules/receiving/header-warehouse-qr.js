
(function(){
'use strict';
if(window.__YARDIVO_RECEIVING_HEADER_WAREHOUSE_QR_V583__)return;
window.__YARDIVO_RECEIVING_HEADER_WAREHOUSE_QR_V583__=true;

const CFG_KEY='yardivo_qr_scan_cfg_v583';
const PUB='sb_publishable_f3daeEDsH7zNSiFR5QluaQ_AP4Ptjzz';
const SYNC='https://ldzwgdwzolbvjxyznlry.supabase.co/functions/v1/yardivo-sync';

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function userRole(){return String(window.currentSession?.app_role||window.currentSession?.role||'').toLowerCase()}
function masterData(){
  try{
    if(typeof master==='function')return master()||{locations:[],warehouses:[]};
    return JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')||{locations:[],warehouses:[]};
  }catch(_){return {locations:[],warehouses:[]}}
}
function warehouseName(id){
  const w=(masterData().warehouses||[]).find(x=>String(x.id)===String(id));
  return String(w?.name||id||'—');
}
function locationName(id){
  const l=(masterData().locations||[]).find(x=>String(x.id)===String(id));
  return String(l?.name||id||'—');
}

/* HEADER IS THE SINGLE SOURCE OF TRUTH FOR RECEIVING WAREHOUSE */
function headerWarehouseId(){
  const header=String(document.getElementById('globalWarehouse')?.value||'').trim();
  if(header&&header!=='ALL')return header;
  try{
    const state=String(window.YardivoAppStateV583?.warehouse?.()||'').trim();
    if(state&&state!=='ALL')return state;
  }catch(_){}
  const active=String(window.activeWarehouse||'').trim();
  return active&&active!=='ALL'?active:'';
}
window.receivingWarehouseValue=headerWarehouseId;

function cfg(){
  let out={enabled:true,byWarehouse:{}};
  try{
    const raw=(window.safeStorage?.getItem?.(CFG_KEY) ?? localStorage.getItem(CFG_KEY));
    if(raw){
      const p=JSON.parse(raw);
      if(p&&typeof p==='object'){
        out={...out,...p};
        out.byWarehouse=(p.byWarehouse&&typeof p.byWarehouse==='object')?p.byWarehouse:{};
      }
    }
  }catch(_){}
  return out;
}
function saveLocalCfg(c){
  const raw=JSON.stringify(c);
  try{window.safeStorage?.setItem?.(CFG_KEY,raw)}catch(_){}
  try{localStorage.setItem(CFG_KEY,raw)}catch(_){}
}
function qrEnabledForWarehouse(warehouseId){
  const c=cfg(),id=String(warehouseId||'').trim();
  const v=c.byWarehouse?.[id];
  if(typeof v==='boolean')return v;
  if(v&&typeof v==='object'&&Object.prototype.hasOwnProperty.call(v,'enabled'))return !!v.enabled;
  return c.enabled!==false;
}
window.yardivoQrEnabledForWarehouseV583=qrEnabledForWarehouse;

/* Existing callers without an argument automatically use the header warehouse. */
window.yardivoQrMobileEnabled=function(warehouseId){
  return qrEnabledForWarehouse(String(warehouseId||headerWarehouseId()));
};

/* Manual receiving buttons ONLY when QR is OFF for the header warehouse. */
window.receivingCanEdit=function(){
  let roleAllowed=false;
  try{roleAllowed=typeof canChangeReceptionStatus==='function'?!!canChangeReceptionStatus():['admin','reception'].includes(userRole())}catch(_){}
  return roleAllowed && !qrEnabledForWarehouse(headerWarehouseId());
};
window.yardivoManualReceivingStatusAllowed=function(){
  return !qrEnabledForWarehouse(headerWarehouseId());
};

async function accessToken(){
  const direct=String(window.__yardivoSupplierAccessToken||'').trim();if(direct)return direct;
  try{
    const c=await window.YardivoAuth?.client?.();
    let s=(await c?.auth?.getSession?.())?.data?.session||null;
    if(!s?.access_token)s=(await c?.auth?.refreshSession?.())?.data?.session||null;
    return String(s?.access_token||'');
  }catch(_){return''}
}
async function persistCfg(c){
  const t=await accessToken();
  if(!t)throw new Error('ONLINE PRIJAVA NIJE AKTIVNA.');
  const r=await fetch(SYNC,{
    method:'POST',
    headers:{apikey:PUB,Authorization:'Bearer '+t,'Content-Type':'application/json'},
    body:JSON.stringify({action:'set_state',key:CFG_KEY,value:JSON.stringify(c),clientId:'yardivo-qr-per-warehouse-v583'})
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok||d?.ok===false)throw new Error(d?.error||('HTTP '+r.status));
  return d;
}

/* Load server-side QR map for every logged-in role because Receiving needs it too. */
async function loadCfgFromServer(){
  const t=await accessToken();if(!t)return;
  try{
    const r=await fetch(SYNC,{
      method:'POST',
      headers:{apikey:PUB,Authorization:'Bearer '+t,'Content-Type':'application/json'},
      body:JSON.stringify({action:'bootstrap',clientId:'yardivo-qr-per-warehouse-read-v583'})
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d?.ok===false)return;
    const row=(Array.isArray(d?.state)?d.state:[]).find(x=>String(x?.key||'')===CFG_KEY&&!x?.deleted);
    if(row?.value_json){
      let next=null;try{next=JSON.parse(String(row.value_json))}catch(_){}
      if(next&&typeof next==='object'){
        if(!next.byWarehouse)next.byWarehouse={};
        if(!Object.prototype.hasOwnProperty.call(next,'enabled'))next.enabled=true;
        saveLocalCfg(next);
        refreshReceiving();
        renderAdminPanel();
      }
    }
  }catch(e){console.warn('QR config load',e)}
}
window.yardivoLoadQrScanSetting=loadCfgFromServer;

/* Post-process Receiving generated by the existing renderer. */
function postProcessReceiving(){
  const wh=headerWarehouseId();
  const qrOn=qrEnabledForWarehouse(wh);
  const note=document.getElementById('receivingPermissionNote');
  if(note){
    if(!wh) note.textContent='Prijam robe · odaberi skladište u headeru.';
    else if(qrOn) note.textContent=`Prijam robe · ${warehouseName(wh)} · QR scanner je UKLJUČEN. Status se mijenja QR skeniranjem.`;
    else if(['admin','reception'].includes(userRole())) note.textContent=`Prijam robe · ${warehouseName(wh)} · QR scanner je ISKLJUČEN. Ručni gumbovi za status su dostupni.`;
    else note.textContent=`Pregled prijama · ${warehouseName(wh)} · tvoja uloga može samo pregledavati statuse.`;
  }
  if(qrOn){
    document.querySelectorAll('#receivingList .receiving-status-actions').forEach(box=>{
      box.classList.add('yv-qr-locked');
      box.innerHTML='<div class="receiving-qr-locked-note">QR SCANNER UKLJUČEN · ručna promjena statusa je zaključana.</div>';
    });
  }
}

/* Wrap renderer only for UI post-processing. The original data filter now calls our header-based receivingWarehouseValue(). */
const originalRenderReceiving=window.renderReceiving;
if(typeof originalRenderReceiving==='function'){
  window.renderReceiving=function(){
    const r=originalRenderReceiving.apply(this,arguments);
    postProcessReceiving();
    return r;
  };
}

function refreshReceiving(){
  try{
    if(typeof window.renderReceiving==='function')window.renderReceiving();
    else if(typeof renderReceiving==='function')renderReceiving();
  }catch(e){console.warn('Receiving refresh',e)}
}

/* Manual status guard ownership lives in modules/receiving/service.js. */

/* ADMIN: LOCATION -> WAREHOUSE -> QR ON/OFF */
function ensureAdminPanel(){
  const host=document.getElementById('qrMobileSettingsPanel');if(!host)return null;
  let box=document.getElementById('yardivoQrWarehouseAdminV583');
  if(!box){
    box=document.createElement('div');
    box.id='yardivoQrWarehouseAdminV583';
    box.innerHTML=`
      <div style="margin-bottom:10px">
        <strong style="font-size:11px">QR SCANNER PO SKLADIŠTU</strong>
        <div style="margin-top:4px;color:#819caf;font-size:8px;line-height:1.5">
          Odaberi lokaciju i skladište. QR ON = statusi kroz scanner. QR OFF = ručni statusni gumbovi u Prijamu robe.
        </div>
      </div>
      <div class="yvqr-grid">
        <label>LOKACIJA<select id="yvQrAdminLocation"></select></label>
        <label>SKLADIŠTE<select id="yvQrAdminWarehouse"></select></label>
        <div><small style="display:block;margin-bottom:5px;color:#8ba7bb;font-size:8px;font-weight:950">STATUS</small><div id="yvQrAdminState" class="yvqr-state">—</div></div>
        <button id="yvQrAdminToggle" class="primary yvqr-save" type="button">—</button>
      </div>`;
    (host.querySelector('.qr-mobile-setting-body')||host).appendChild(box);
    box.querySelector('#yvQrAdminLocation')?.addEventListener('change',renderWarehouseOptions);
    box.querySelector('#yvQrAdminWarehouse')?.addEventListener('change',renderAdminState);
    box.querySelector('#yvQrAdminToggle')?.addEventListener('click',toggleQrForSelectedWarehouse);
  }
  return box;
}
function activeLocations(){
  return (masterData().locations||[]).filter(x=>x&&x.active!==false&&x.id);
}
function warehousesForLocation(loc){
  return (masterData().warehouses||[]).filter(x=>x&&x.active!==false&&String(x.location_id||'')===String(loc||'')&&x.id);
}
function renderAdminPanel(){
  const host=document.getElementById('qrMobileSettingsPanel');
  if(host)host.style.display=userRole()==='admin'?'':'none';
  if(userRole()!=='admin')return;
  const box=ensureAdminPanel();if(!box)return;
  const locSel=box.querySelector('#yvQrAdminLocation');
  const rows=activeLocations();
  const headerWh=headerWarehouseId();
  const headerWhRow=(masterData().warehouses||[]).find(w=>String(w.id)===headerWh);
  const wantedLoc=String(locSel.value||headerWhRow?.location_id||window.currentSession?.location||rows[0]?.id||'');
  locSel.innerHTML=rows.map(x=>`<option value="${esc(x.id)}">${esc(locationName(x.id))}</option>`).join('');
  if(rows.some(x=>String(x.id)===wantedLoc))locSel.value=wantedLoc;
  renderWarehouseOptions();
}
function renderWarehouseOptions(){
  const box=ensureAdminPanel();if(!box||userRole()!=='admin')return;
  const loc=String(box.querySelector('#yvQrAdminLocation')?.value||'');
  const sel=box.querySelector('#yvQrAdminWarehouse');
  const rows=warehousesForLocation(loc);
  const current=String(sel.value||headerWarehouseId()||rows[0]?.id||'');
  sel.innerHTML=rows.map(w=>`<option value="${esc(w.id)}">${esc(warehouseName(w.id))}</option>`).join('');
  sel.value=rows.some(w=>String(w.id)===current)?current:String(rows[0]?.id||'');
  renderAdminState();
}
function renderAdminState(){
  const box=ensureAdminPanel();if(!box||userRole()!=='admin')return;
  const wh=String(box.querySelector('#yvQrAdminWarehouse')?.value||'');
  const on=qrEnabledForWarehouse(wh);
  const state=box.querySelector('#yvQrAdminState'),btn=box.querySelector('#yvQrAdminToggle');
  if(state){state.textContent=on?'QR SCANNER · ON':'QR SCANNER · OFF';state.className='yvqr-state '+(on?'on':'off')}
  if(btn){btn.textContent=on?'ISKLJUČI QR':'UKLJUČI QR';btn.dataset.next=on?'0':'1'}
  const badge=document.getElementById('qrMobileSettingsBadge');
  if(badge){badge.textContent='PO SKLADIŠTU';badge.className='master-sync-state ok'}
  const info=document.getElementById('qrMobileModeInfo');
  if(info)info.innerHTML='<strong>QR POSTAVKA JE PO SKLADIŠTU.</strong> Header određuje koje skladište Prijam robe prikazuje; ovdje Admin određuje koristi li to skladište QR ili ručne statuse.';
}
async function toggleQrForSelectedWarehouse(){
  if(userRole()!=='admin')return;
  const box=ensureAdminPanel(),loc=String(box.querySelector('#yvQrAdminLocation')?.value||''),wh=String(box.querySelector('#yvQrAdminWarehouse')?.value||'');
  if(!wh){alert('Odaberi skladište.');return}
  const before=cfg(),next=JSON.parse(JSON.stringify(before));
  next.byWarehouse=next.byWarehouse||{};
  const enabled=!qrEnabledForWarehouse(wh);
  next.byWarehouse[wh]={enabled,location_id:loc,updated_at:new Date().toISOString(),updated_by:String(window.currentSession?.user||window.currentSession?.username||'admin')};
  saveLocalCfg(next);renderAdminState();refreshReceiving();
  try{
    await persistCfg(next);
    try{window.showYmsToast?.('success',enabled?'QR SCANNER UKLJUČEN':'QR SCANNER ISKLJUČEN',`${warehouseName(wh)} · ${locationName(loc)}`)}catch(_){}
  }catch(e){
    saveLocalCfg(before);renderAdminState();refreshReceiving();
    alert('QR postavka nije spremljena na server: '+String(e?.message||e));
  }
}

/* Disable legacy global toggle behavior; compatibility call applies to selected warehouse only. */
window.yardivoSetQrMobileEnabled=function(enabled){
  if(userRole()!=='admin'){alert('Samo Admin može mijenjati QR scanner postavke.');return}
  const wh=String(document.getElementById('yvQrAdminWarehouse')?.value||headerWarehouseId());
  if(!wh){alert('Odaberi skladište.');return}
  const c=cfg();c.byWarehouse=c.byWarehouse||{};
  c.byWarehouse[wh]={enabled:!!enabled,updated_at:new Date().toISOString()};
  saveLocalCfg(c);persistCfg(c).then(()=>{renderAdminState();refreshReceiving()}).catch(e=>alert('QR postavka nije spremljena: '+String(e?.message||e)));
};
window.renderQrMobileAdminSetting=renderAdminPanel;

/* Header warehouse change must immediately re-filter Receiving. */
window.addEventListener('yardivo:context-changed',e=>{
  if(e?.detail?.warehouse!==undefined)setTimeout(refreshReceiving,0);
});
document.addEventListener('change',e=>{
  if(e.target?.id==='globalWarehouse')setTimeout(refreshReceiving,0);
  if(e.target?.id==='receivingDate')setTimeout(refreshReceiving,0);
},true);
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-view="receiving"],[data-home-target="receiving"]'))setTimeout(refreshReceiving,40);
  if(e.target.closest?.('[data-view="settings"],[data-home-target="settings"]'))setTimeout(renderAdminPanel,40);
},true);

['yardivo:login','yardivo:data-synced','yardivo:master-data-changed'].forEach(ev=>{
  window.addEventListener(ev,()=>setTimeout(()=>{loadCfgFromServer();renderAdminPanel();refreshReceiving()},80));
});
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{loadCfgFromServer();renderAdminPanel();refreshReceiving()},500),{once:true});
}else{
  setTimeout(()=>{loadCfgFromServer();renderAdminPanel();refreshReceiving()},250);
}
})();
