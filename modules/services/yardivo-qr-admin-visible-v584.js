
(()=>{'use strict';
if(window.__YARDIVO_QR_ADMIN_VISIBLE_V584__)return;
window.__YARDIVO_QR_ADMIN_VISIBLE_V584__=true;
const KEY='yardivo_qr_scan_cfg_v583';
const PUB='sb_publishable_f3daeEDsH7zNSiFR5QluaQ_AP4Ptjzz';
const SYNC='https://ldzwgdwzolbvjxyznlry.supabase.co/functions/v1/yardivo-sync';

function role(){return String(window.currentSession?.app_role||window.currentSession?.role||'').toLowerCase()}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function md(){
  try{if(typeof master==='function')return master()||{locations:[],warehouses:[]}}catch(_){}
  try{return JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')||{locations:[],warehouses:[]}}catch(_){return {locations:[],warehouses:[]}}
}
function cfg(){
  try{
    const p=JSON.parse(localStorage.getItem(KEY)||'{}');
    return {enabled:p?.enabled!==false,byWarehouse:(p?.byWarehouse&&typeof p.byWarehouse==='object')?p.byWarehouse:{}};
  }catch(_){return {enabled:true,byWarehouse:{}}}
}
function whEnabled(id){
  if(typeof window.yardivoQrEnabledForWarehouseV583==='function')return !!window.yardivoQrEnabledForWarehouseV583(id);
  const c=cfg(),v=c.byWarehouse?.[String(id||'')];
  if(typeof v==='boolean')return v;if(v&&typeof v==='object'&&'enabled'in v)return !!v.enabled;return c.enabled!==false;
}
function nameLoc(id){const x=(md().locations||[]).find(a=>String(a.id)===String(id));return String(x?.name||id||'—')}
function nameWh(id){const x=(md().warehouses||[]).find(a=>String(a.id)===String(id));return String(x?.name||id||'—')}
function headerWh(){return String(document.getElementById('globalWarehouse')?.value||window.activeWarehouse||'').trim()}
async function tok(){
  const c=await window.YardivoAuth?.client?.();let s=(await c?.auth?.getSession?.())?.data?.session||null;
  if(!s?.access_token)s=(await c?.auth?.refreshSession?.())?.data?.session||null;
  return String(s?.access_token||'');
}
async function persist(c){
  const t=await tok();if(!t)throw new Error('Nema aktivne prijave');
  const r=await fetch(SYNC,{method:'POST',headers:{apikey:PUB,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({action:'set_state',key:KEY,value:JSON.stringify(c),clientId:'yardivo-qr-admin-v584'})});
  const d=await r.json().catch(()=>({}));if(!r.ok||d?.ok===false)throw new Error(d?.error||('HTTP '+r.status));
}
function ensure(){
  const grid=document.querySelector('#settings .settings-grid');if(!grid)return null;
  let p=document.getElementById('yardivoQrWarehouseAdminPanelV584');
  if(!p){
    p=document.createElement('section');p.className='panel';p.id='yardivoQrWarehouseAdminPanelV584';
    p.innerHTML=`<div class="panel-head"><div><h2>QR SCANNER · PO SKLADIŠTU</h2><small>Admin · uključi ili isključi QR scanner posebno za svako skladište</small></div><span class="master-sync-state ok" id="yvQrV584Badge">PO SKLADIŠTU</span></div>
      <div class="yvqr-v584-body">
        <div class="yvqr-v584-grid">
          <label>LOKACIJA<select id="yvQrV584Location"></select></label>
          <label>SKLADIŠTE<select id="yvQrV584Warehouse"></select></label>
          <div><small style="display:block;margin-bottom:6px;color:#8ba7bb;font-size:8px;font-weight:950">STATUS</small><div id="yvQrV584State" class="yvqr-v584-state">—</div></div>
          <button id="yvQrV584Toggle" class="primary" type="button">—</button>
        </div>
        <div style="margin-top:10px;color:#7f9cae;font-size:8px;line-height:1.55">
          QR ON: statusi u Prijamu robe mijenjaju se skeniranjem. QR OFF: Admin i Prijam dobivaju ručne statusne gumbove za odabrano skladište.
        </div>
      </div>`;
    grid.insertBefore(p,grid.firstChild);
    p.querySelector('#yvQrV584Location').addEventListener('change',renderWarehouses);
    p.querySelector('#yvQrV584Warehouse').addEventListener('change',renderState);
    p.querySelector('#yvQrV584Toggle').addEventListener('click',toggle);
  }
  return p;
}
function render(){
  const p=ensure();if(!p)return;
  p.style.display=role()==='admin'?'block':'none';
  if(role()!=='admin')return;
  const d=md(),locs=(d.locations||[]).filter(x=>x&&x.active!==false&&x.id);
  const l=p.querySelector('#yvQrV584Location'),wrow=(d.warehouses||[]).find(x=>String(x.id)===headerWh());
  const wanted=String(l.value||wrow?.location_id||locs[0]?.id||'');
  l.innerHTML=locs.map(x=>`<option value="${esc(x.id)}">${esc(nameLoc(x.id))}</option>`).join('');
  if(locs.some(x=>String(x.id)===wanted))l.value=wanted;
  renderWarehouses();
}
function renderWarehouses(){
  const p=ensure();if(!p||role()!=='admin')return;
  const d=md(),loc=String(p.querySelector('#yvQrV584Location').value||'');
  const rows=(d.warehouses||[]).filter(x=>x&&x.active!==false&&x.id&&String(x.location_id||'')===loc);
  const s=p.querySelector('#yvQrV584Warehouse'),wanted=String(s.value||headerWh()||rows[0]?.id||'');
  s.innerHTML=rows.map(x=>`<option value="${esc(x.id)}">${esc(nameWh(x.id))}</option>`).join('');
  s.value=rows.some(x=>String(x.id)===wanted)?wanted:String(rows[0]?.id||'');
  renderState();
}
function renderState(){
  const p=ensure();if(!p||role()!=='admin')return;
  const wh=String(p.querySelector('#yvQrV584Warehouse').value||''),on=whEnabled(wh);
  const st=p.querySelector('#yvQrV584State'),b=p.querySelector('#yvQrV584Toggle');
  st.textContent=on?'QR SCANNER · ON':'QR SCANNER · OFF';st.className='yvqr-v584-state '+(on?'on':'off');
  b.textContent=on?'ISKLJUČI QR':'UKLJUČI QR';
}
async function toggle(){
  const p=ensure();if(!p||role()!=='admin')return;
  const loc=String(p.querySelector('#yvQrV584Location').value||''),wh=String(p.querySelector('#yvQrV584Warehouse').value||'');if(!wh)return;
  const before=cfg(),next=JSON.parse(JSON.stringify(before));next.byWarehouse=next.byWarehouse||{};
  const enabled=!whEnabled(wh);
  next.byWarehouse[wh]={enabled,location_id:loc,updated_at:new Date().toISOString(),updated_by:String(window.currentSession?.username||window.currentSession?.user||'admin')};
  localStorage.setItem(KEY,JSON.stringify(next));try{window.safeStorage?.setItem?.(KEY,JSON.stringify(next))}catch(_){};renderState();
  try{
    await persist(next);
    try{window.showYmsToast?.('success',enabled?'QR SCANNER UKLJUČEN':'QR SCANNER ISKLJUČEN',`${nameWh(wh)} · ${nameLoc(loc)}`)}catch(_){}
    try{window.renderReceiving?.()}catch(_){}
  }catch(e){
    localStorage.setItem(KEY,JSON.stringify(before));try{window.safeStorage?.setItem?.(KEY,JSON.stringify(before))}catch(_){};renderState();alert('QR postavka nije spremljena: '+String(e?.message||e));
  }
}
window.yardivoRenderQrWarehouseAdminV584=render;
document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="settings"],[data-home-target="settings"]'))setTimeout(render,30)},true);
document.addEventListener('change',e=>{if(e.target?.id==='globalWarehouse')setTimeout(render,30)},true);
['yardivo:login','yardivo:data-synced','yardivo:master-data-changed'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(render,80)));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(render,300),{once:true});else setTimeout(render,150);
})();
