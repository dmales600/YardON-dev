
(()=>{'use strict';
if(window.__YARDIVO_QR_ROLE_CONTROL_V586__)return;
window.__YARDIVO_QR_ROLE_CONTROL_V586__=true;

const KEY='yardivo_qr_scan_cfg_v583';
const PUB='sb_publishable_f3daeEDsH7zNSiFR5QluaQ_AP4Ptjzz';
const SYNC='https://ldzwgdwzolbvjxyznlry.supabase.co/functions/v1/yardivo-sync';
const SCANNER='./scanner/';

function role(){
  let r=String(window.currentSession?.app_role||window.currentSession?.role||'').toLowerCase().trim();
  if(r==='porta'||r==='portir')r='gate';
  if(r==='prijam')r='reception';
  return r;
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function masterData(){
  try{if(typeof master==='function')return master()||{locations:[],warehouses:[]}}catch(_){}
  try{return JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')||{locations:[],warehouses:[]}}catch(_){return {locations:[],warehouses:[]}}
}
function whName(id){const w=(masterData().warehouses||[]).find(x=>String(x.id)===String(id));return String(w?.name||id||'—')}
function locName(id){const l=(masterData().locations||[]).find(x=>String(x.id)===String(id));return String(l?.name||id||'—')}
function headerWarehouse(){
  const v=String(document.getElementById('globalWarehouse')?.value||window.activeWarehouse||'').trim();
  return v&&v!=='ALL'?v:'';
}
function readCfg(){
  const defaults={enabled:true,byWarehouse:{}};
  let raw='';
  try{raw=window.safeStorage?.getItem?.(KEY) ?? localStorage.getItem(KEY) ?? ''}catch(_){}
  if(!raw)return defaults;
  try{
    const p=JSON.parse(raw);
    if(!p||typeof p!=='object')return defaults;
    return {...defaults,...p,byWarehouse:(p.byWarehouse&&typeof p.byWarehouse==='object')?p.byWarehouse:{}};
  }catch(_){return defaults}
}
function writeCfg(c){
  const raw=JSON.stringify(c);
  try{localStorage.setItem(KEY,raw)}catch(_){}
  try{window.safeStorage?.setItem?.(KEY,raw)}catch(_){}
}
function enabledFor(warehouseId,targetRole){
  const wh=String(warehouseId||headerWarehouse()).trim();
  const rr=targetRole==='gate'?'gate':'reception';
  const c=readCfg(),v=c.byWarehouse?.[wh];

  /* New authoritative per-role values. */
  if(v&&typeof v==='object'&&typeof v[rr]==='boolean')return v[rr];
  if(v&&typeof v==='object'&&v.roles&&typeof v.roles[rr]==='boolean')return v.roles[rr];

  /* Backward compatibility with the old warehouse-wide switch. */
  if(typeof v==='boolean')return v;
  if(v&&typeof v==='object'&&typeof v.enabled==='boolean')return v.enabled;
  return c.enabled!==false;
}
window.yardivoQrRoleEnabledV586=enabledFor;

/* Old receiving code calls this name. From now on it means PRIJAM access for the selected/header warehouse. */
window.yardivoQrMobileEnabled=function(warehouseId){
  return enabledFor(String(warehouseId||headerWarehouse()),'reception');
};
window.yardivoManualReceivingStatusAllowed=function(){
  return !enabledFor(headerWarehouse(),'reception');
};
window.receivingCanEdit=function(){
  let can=false;
  try{can=typeof canChangeReceptionStatus==='function'?!!canChangeReceptionStatus():['admin','reception'].includes(role())}catch(_){}
  return can&&!enabledFor(headerWarehouse(),'reception');
};

async function token(){
  const direct=String(window.__yardivoSupplierAccessToken||'').trim();if(direct)return direct;
  try{
    const c=await window.YardivoAuth?.client?.();
    let s=(await c?.auth?.getSession?.())?.data?.session||null;
    if(!s?.access_token)s=(await c?.auth?.refreshSession?.())?.data?.session||null;
    return String(s?.access_token||'');
  }catch(_){return''}
}
async function persist(c){
  const t=await token();if(!t)throw new Error('ONLINE PRIJAVA NIJE AKTIVNA.');
  const r=await fetch(SYNC,{
    method:'POST',
    headers:{apikey:PUB,Authorization:'Bearer '+t,'Content-Type':'application/json'},
    body:JSON.stringify({action:'set_state',key:KEY,value:JSON.stringify(c),clientId:'yardivo-qr-role-v586'})
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok||d?.ok===false)throw new Error(d?.error||('HTTP '+r.status));
  return d;
}
async function loadServerCfg(){
  const t=await token();if(!t)return;
  try{
    const r=await fetch(SYNC,{
      method:'POST',
      headers:{apikey:PUB,Authorization:'Bearer '+t,'Content-Type':'application/json'},
      body:JSON.stringify({action:'bootstrap',clientId:'yardivo-qr-role-read-v586'})
    });
    const d=await r.json().catch(()=>({}));if(!r.ok||d?.ok===false)return;
    const row=(Array.isArray(d?.state)?d.state:[]).find(x=>String(x?.key||'')===KEY&&!x?.deleted);
    if(row?.value_json){
      const p=JSON.parse(String(row.value_json));
      if(p&&typeof p==='object')writeCfg(p);
      refreshAll();
    }
  }catch(e){console.warn('QR role config load',e)}
}

/* ---------- ADMIN CARD ---------- */
function ensureAdmin(){
  const grid=document.querySelector('#settings .settings-grid');if(!grid)return null;
  let p=document.getElementById('yardivoQrRoleAdminV586');
  if(!p){
    p=document.createElement('section');p.className='panel';p.id='yardivoQrRoleAdminV586';
    p.innerHTML=`
      <div class="panel-head">
        <div>
          <h2>QR SCANNER · PORTA / PRIJAM</h2>
          <small>Admin · zasebno uključi ili isključi QR po skladištu i radnom mjestu</small>
        </div>
        <span class="master-sync-state ok">PO ULOZI</span>
      </div>
      <div class="yqr6-body">
        <div class="yqr6-grid">
          <label>LOKACIJA<select id="yqr6Location"></select></label>
          <label>SKLADIŠTE<select id="yqr6Warehouse"></select></label>
        </div>
        <div class="yqr6-role-grid">
          <div class="yqr6-role-card" id="yqr6GateCard">
            <div class="yqr6-role-head"><strong>PORTA</strong><span class="yqr6-state" id="yqr6GateState">—</span></div>
            <div class="yqr6-role-copy">Kontrolira QR skeniranje na Porti za odabrano skladište.</div>
            <button class="primary yqr6-toggle" id="yqr6GateToggle" type="button">—</button>
          </div>
          <div class="yqr6-role-card" id="yqr6ReceptionCard">
            <div class="yqr6-role-head"><strong>PRIJAM</strong><span class="yqr6-state" id="yqr6ReceptionState">—</span></div>
            <div class="yqr6-role-copy">Kad je OFF, Prijam nema QR skeniranje; koristi ručnu promjenu statusa.</div>
            <button class="primary yqr6-toggle" id="yqr6ReceptionToggle" type="button">—</button>
          </div>
        </div>
        <div class="yqr6-foot">
          PORTA i PRIJAM su neovisni. Npr. W201 može imati PORTA ON i PRIJAM OFF.
        </div>
      </div>`;
    grid.insertBefore(p,grid.firstChild);
    p.querySelector('#yqr6Location').addEventListener('change',renderWhOptions);
    p.querySelector('#yqr6Warehouse').addEventListener('change',renderRoleStates);
    p.querySelector('#yqr6GateToggle').addEventListener('click',()=>toggleRole('gate'));
    p.querySelector('#yqr6ReceptionToggle').addEventListener('click',()=>toggleRole('reception'));
  }
  return p;
}
function renderAdmin(){
  const p=ensureAdmin();if(!p)return;
  p.style.display=role()==='admin'?'block':'none';
  if(role()!=='admin')return;
  const d=masterData(),locs=(d.locations||[]).filter(x=>x&&x.active!==false&&x.id);
  const l=p.querySelector('#yqr6Location');
  const hw=(d.warehouses||[]).find(x=>String(x.id)===headerWarehouse());
  const wanted=String(l.value||hw?.location_id||locs[0]?.id||'');
  l.innerHTML=locs.map(x=>`<option value="${esc(x.id)}">${esc(locName(x.id))}</option>`).join('');
  if(locs.some(x=>String(x.id)===wanted))l.value=wanted;
  renderWhOptions();
  setTimeout(()=>{try{loadWallQrState()}catch(_){ }},0);
}
function renderWhOptions(){
  const p=ensureAdmin();if(!p||role()!=='admin')return;
  const d=masterData(),loc=String(p.querySelector('#yqr6Location').value||'');
  const rows=(d.warehouses||[]).filter(x=>x&&x.active!==false&&x.id&&String(x.location_id||'')===loc);
  const s=p.querySelector('#yqr6Warehouse'),wanted=String(s.value||headerWarehouse()||rows[0]?.id||'');
  s.innerHTML=rows.map(x=>`<option value="${esc(x.id)}">${esc(whName(x.id))}</option>`).join('');
  s.value=rows.some(x=>String(x.id)===wanted)?wanted:String(rows[0]?.id||'');
  renderRoleStates();
}
function renderRoleStates(){
  const p=ensureAdmin();if(!p||role()!=='admin')return;
  const wh=String(p.querySelector('#yqr6Warehouse').value||'');
  for(const rr of ['gate','reception']){
    const on=enabledFor(wh,rr);
    const cap=rr==='gate'?'Gate':'Reception';
    const st=p.querySelector('#yqr6'+cap+'State'),card=p.querySelector('#yqr6'+cap+'Card'),btn=p.querySelector('#yqr6'+cap+'Toggle');
    if(st){st.textContent=on?'ON':'OFF';st.className='yqr6-state'+(on?'':' off')}
    if(card)card.classList.toggle('off',!on);
    if(btn)btn.textContent=on?'ISKLJUČI':'UKLJUČI';
  }
}
async function toggleRole(rr){
  if(role()!=='admin')return;
  const p=ensureAdmin(),loc=String(p.querySelector('#yqr6Location').value||''),wh=String(p.querySelector('#yqr6Warehouse').value||'');
  if(!wh)return alert('Odaberi skladište.');

  const btn=p.querySelector(rr==='gate'?'#yqr6GateToggle':'#yqr6ReceptionToggle');
  const oldText=btn?.textContent||'';
  if(btn){btn.disabled=true;btn.textContent='SPREMAM…'}

  const serverCfg=async()=>{
    const t=await token();if(!t)throw new Error('ONLINE PRIJAVA NIJE AKTIVNA.');
    const r=await fetch(SYNC,{
      method:'POST',
      headers:{apikey:PUB,Authorization:'Bearer '+t,'Content-Type':'application/json'},
      body:JSON.stringify({action:'bootstrap',clientId:'yardivo-qr-role-verify-v587'})
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d?.ok===false)throw new Error(d?.error||('HTTP '+r.status));
    const row=(Array.isArray(d?.state)?d.state:[]).find(x=>String(x?.key||'')===KEY&&!x?.deleted);
    const cfg=row?.value_json?JSON.parse(String(row.value_json)):{enabled:true,byWarehouse:{}};
    return {...cfg,byWarehouse:(cfg?.byWarehouse&&typeof cfg.byWarehouse==='object')?cfg.byWarehouse:{}};
  };
  const valueFor=(cfg)=>{
    const v=cfg?.byWarehouse?.[wh];
    if(v&&typeof v==='object'&&typeof v[rr]==='boolean')return !!v[rr];
    if(v&&typeof v==='object'&&v.roles&&typeof v.roles[rr]==='boolean')return !!v.roles[rr];
    if(typeof v==='boolean')return v;
    if(v&&typeof v==='object'&&typeof v.enabled==='boolean')return !!v.enabled;
    return cfg?.enabled!==false;
  };

  let before=null;
  try{
    before=await serverCfg();
    writeCfg(before);
    const next=JSON.parse(JSON.stringify(before));
    next.byWarehouse=next.byWarehouse||{};
    const prev=next.byWarehouse[wh];
    let node=(prev&&typeof prev==='object'&&!Array.isArray(prev))?{...prev}:{};
    const oldBase=(typeof prev==='boolean')?prev:(node&&typeof node.enabled==='boolean'?node.enabled:before.enabled!==false);
    if(typeof node.gate!=='boolean')node.gate=oldBase;
    if(typeof node.reception!=='boolean')node.reception=oldBase;

    const wanted=!valueFor(before);
    node[rr]=wanted;
    node.location_id=loc;
    node.updated_at=new Date().toISOString();
    node.updated_by=String(window.currentSession?.username||window.currentSession?.user||'admin');
    next.byWarehouse[wh]=node;

    await persist(next);
    const verified=await serverCfg();
    if(valueFor(verified)!==wanted)throw new Error('SERVER NIJE POTVRDIO NOVU QR POSTAVKU.');

    writeCfg(verified);
    renderRoleStates();
    refreshAll();
    const label=rr==='gate'?'PORTA':'PRIJAM';
    window.showYmsToast?.('success',`${label} QR ${wanted?'UKLJUČEN':'ISKLJUČEN'}`,`${whName(wh)} · ${locName(loc)} · SERVER POTVRĐEN`);
  }catch(e){
    if(before)writeCfg(before);
    renderRoleStates();refreshAll();
    alert('QR postavka nije spremljena/potvrđena na serveru: '+String(e?.message||e));
  }finally{
    if(btn){btn.disabled=false;if(oldText)btn.textContent=oldText;renderRoleStates()}
  }
}

/* ---------- OPERATIONAL STATUS ---------- */
function openScanner(targetRole){
  const wh=headerWarehouse();
  if(!enabledFor(wh,targetRole)){
    alert(targetRole==='reception'
      ? 'QR scanner za PRIJAM je ISKLJUČEN. Unesi manualno status.'
      : 'QR scanner za PORTU je ISKLJUČEN. Koristi ručni unos na Porti.');
    return;
  }
  const q=new URLSearchParams({role:targetRole,warehouse:wh});
  window.open(SCANNER+'?'+q.toString(),'_blank','noopener');
}
function ensureReceivingStatus(){
  const note=document.getElementById('receivingPermissionNote');if(!note)return null;
  let b=document.getElementById('yardivoReceivingQrRoleV586');
  if(!b){
    b=document.createElement('div');b.id='yardivoReceivingQrRoleV586';
    b.innerHTML=`<div><div class="yqr6-op-title"></div><div class="yqr6-op-msg"></div></div><button class="primary" type="button">OTVORI QR SCANNER</button>`;
    note.insertAdjacentElement('afterend',b);
    b.querySelector('button').addEventListener('click',()=>openScanner('reception'));
  }
  return b;
}
function renderReceivingStatus(){
  const wh=headerWarehouse(),on=enabledFor(wh,'reception'),b=ensureReceivingStatus(),view=document.getElementById('receiving');
  if(!b)return;
  b.classList.toggle('off',!on);view?.classList.toggle('yardivo-reception-qr-off',!on);
  const title=b.querySelector('.yqr6-op-title'),msg=b.querySelector('.yqr6-op-msg'),btn=b.querySelector('button');
  if(on){
    title.textContent=`QR SCANNER PRIJAM · RADI · ${whName(wh)}`;
    msg.textContent='QR skeniranje je uključeno. Ručna promjena statusa je zaključana.';
    btn.disabled=false;btn.textContent='OTVORI QR SCANNER';
  }else{
    title.textContent=`QR SCANNER PRIJAM · NE RADI · ${whName(wh)}`;
    msg.textContent='NE RADI — unesi manualno status.';
    btn.disabled=true;btn.textContent='NE RADI';
  }
  const note=document.getElementById('receivingPermissionNote');
  if(note){
    if(on)note.textContent=`Prijam robe · ${whName(wh)} · QR scanner PRIJAM je UKLJUČEN. Status se mijenja QR skeniranjem.`;
    else note.textContent=`Prijam robe · ${whName(wh)} · QR scanner PRIJAM je ISKLJUČEN. Unesi manualno status u prozoru dobavljača.`;
  }
}
function ensureGateStatus(){
  const body=document.querySelector('.gate-panel .gate-body');if(!body)return null;
  let b=document.getElementById('yardivoGateQrRoleV586');
  if(!b){
    b=document.createElement('div');b.id='yardivoGateQrRoleV586';
    b.innerHTML=`<div><div class="yqr6-op-title"></div><div class="yqr6-op-msg"></div></div><button class="primary" type="button">OTVORI QR SCANNER</button>`;
    body.insertBefore(b,body.firstChild);
    b.querySelector('button').addEventListener('click',()=>openScanner('gate'));
  }
  return b;
}
function renderGateStatus(){
  const wh=headerWarehouse(),on=enabledFor(wh,'gate'),b=ensureGateStatus();if(!b)return;
  b.classList.toggle('off',!on);
  const title=b.querySelector('.yqr6-op-title'),msg=b.querySelector('.yqr6-op-msg'),btn=b.querySelector('button');
  if(on){
    title.textContent=`QR SCANNER PORTA · RADI · ${whName(wh)}`;
    msg.textContent='QR skeniranje na Porti je uključeno.';
    btn.disabled=false;btn.textContent='OTVORI QR SCANNER';
  }else{
    title.textContent=`QR SCANNER PORTA · NE RADI · ${whName(wh)}`;
    msg.textContent='NE RADI — koristi ručni unos na Porti.';
    btn.disabled=true;btn.textContent='NE RADI';
  }
}

/* Manual status guard uses PRIJAM specifically. */
const prevSetStatus=window.setReceivingAnnouncementStatus;
if(typeof prevSetStatus==='function'){
  window.setReceivingAnnouncementStatus=function(id,status,source='manual'){
    let wh=headerWarehouse();
    try{
      const a=(Array.isArray(window.announcements)?window.announcements:[]).find(x=>String(x?.id)===String(id));
      if(a?.warehouse)wh=String(a.warehouse);
    }catch(_){}
    if(source==='manual'&&enabledFor(wh,'reception')){
      alert(`QR scanner PRIJAM je UKLJUČEN za ${whName(wh)}. Ručna promjena statusa nije dopuštena.`);
      return;
    }
    return prevSetStatus.apply(this,arguments);
  };
}

function refreshAll(){
  renderAdmin();
  renderReceivingStatus();
  renderGateStatus();
  try{window.renderReceiving?.()}catch(_){}
}
window.YardivoQrRoleControlV586={enabledFor,render:refreshAll,openScanner,load:loadServerCfg};

document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-view="settings"],[data-home-target="settings"]'))setTimeout(renderAdmin,30);
  if(e.target.closest?.('[data-view="receiving"],[data-home-target="receiving"]'))setTimeout(renderReceivingStatus,30);
  if(e.target.closest?.('[data-view="checkin"],[data-home-target="checkin"]'))setTimeout(renderGateStatus,30);
},true);
document.addEventListener('change',e=>{
  if(e.target?.id==='globalWarehouse')setTimeout(refreshAll,20);
},true);
['yardivo:login','yardivo:data-synced','yardivo:master-data-changed'].forEach(ev=>{
  window.addEventListener(ev,()=>setTimeout(()=>{loadServerCfg();refreshAll()},80));
});
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{loadServerCfg();refreshAll()},350),{once:true});
}else{
  setTimeout(()=>{loadServerCfg();refreshAll()},180);
}
})();
