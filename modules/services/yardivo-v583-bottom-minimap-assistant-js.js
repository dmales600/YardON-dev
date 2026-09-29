
(()=>{'use strict';
if(window.__YV_BOTTOM_MINIMAP_ASSISTANT__)return;
window.__YV_BOTTOM_MINIMAP_ASSISTANT__=true;

const ASSISTANT_PREF='ui_smart_assistant_v583';
let mmTimer=0,aiTimer=0;

function normRole(v){
  v=String(v||'').trim().toLowerCase();
  if(v==='prijam')return'reception';
  if(v==='porta'||v==='portir')return'gate';
  if(v==='zalihe'||v.includes('zalih'))return'inventory';
  if(v==='voditelj'||v==='management')return'manager';
  return v;
}
function session(){try{return window.currentSession||{}}catch(_){return{}}}
function role(){return normRole(session()?.app_role||session()?.role||'')}
function master(){try{return JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')}catch(_){return{}}}
function arr(){try{return Array.isArray(announcements)?announcements:[]}catch(_){return[]}}
function inc(){try{return Array.isArray(incidents)?incidents:[]}catch(_){return[]}}
function today(){try{return window.yardivoLocalDateV583?.()||new Date().toISOString().slice(0,10)}catch(_){return new Date().toISOString().slice(0,10)}}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function assistantEnabled(){try{return localStorage.getItem(ASSISTANT_PREF)!=='off'}catch(_){return true}}
function setAssistantEnabled(v){
  try{localStorage.setItem(ASSISTANT_PREF,v?'on':'off')}catch(_){}
  document.body.classList.toggle('yv-assistant-disabled',!v);
  if(!v)document.body.classList.remove('yv-assistant-open');
  updateSettingsAssistantStatus();
}
function ids(v){
  return Array.isArray(v)?v.map(x=>String(typeof x==='object'?(x?.id||''):x||'').trim()).filter(Boolean):[];
}
function allowedWarehouseIds(){
  const s=session(),r=role();
  if(r==='admin'||s?.all_warehouses===true)return null;
  const set=new Set(ids(s?.warehouses||s?.warehouse_ids));
  const one=String(s?.warehouse||s?.warehouse_id||'').trim();
  if(one&&one!=='ALL')set.add(one);
  return set;
}
function warehouseRows(){
  const d=master(),allowed=allowedWarehouseIds();
  let rows=(d.warehouses||[]).filter(w=>w&&w.active!==false);
  if(allowed)rows=rows.filter(w=>allowed.has(String(w.id)));
  return rows;
}
function whName(id){
  const w=(master().warehouses||[]).find(x=>String(x.id)===String(id));
  return w?.name||String(id||'—');
}
function locName(id){
  const x=(master().locations||[]).find(a=>String(a.id)===String(id));
  return x?.name||String(id||'—');
}
function state(a){
  const s=String(a?.status||'').toLowerCase();
  if(a?.receivedAt||a?.rejectedAt||/zaprim|odbij|zavr|izašao|izasao/.test(s))return'done';
  if(a?.dockArrivalAt||/rampi/.test(s))return'dock';
  if(a?.yardArrivalAt||/dvori|parking|parkiran|buffer|čeka|ceka/.test(s))return'yard';
  if(a?.gateCheckedAt||a?.gateEntryApprovedAt||a?.actualDate||a?.actualTime||/ulaz|port/.test(s))return'gate';
  return'incoming';
}
function scopedAnnouncements(){
  const allowed=allowedWarehouseIds();
  return arr().filter(a=>!allowed||allowed.has(String(a.warehouse||'')));
}
function currentWarehouse(){
  const s=session(),rows=warehouseRows(),candidate=String(
    document.getElementById('globalWarehouse')?.value||
    window.YardivoAppStateV583?.warehouse?.()||
    window.activeWarehouse||
    s?.warehouse||
    ''
  );
  if(rows.some(w=>String(w.id)===candidate))return candidate;
  return rows[0]?.id||'';
}
function rampCount(wid){
  const w=(master().warehouses||[]).find(x=>String(x.id)===String(wid));
  let n=Number(w?.ramps||w?.ramp_count||0);
  try{if(!n)n=Number(WAREHOUSES?.[wid]?.ramps||0)}catch(_){}
  return Math.max(1,n||1);
}

/* ---------------- MINI MAP ---------------- */
function ensureMiniMap(){
  if(document.getElementById('yardivoMiniMapDock'))return;
  const zone=document.createElement('div');zone.id='yardivoMiniMapZone';document.body.appendChild(zone);
  const dock=document.createElement('section');dock.id='yardivoMiniMapDock';
  dock.innerHTML=`<div class="yv-mm-head"><div><strong>MINI MY YARD</strong><small id="yvMmSubtitle"></small></div><button type="button" class="yv-mm-close">×</button></div><div class="yv-mm-canvas" id="yvMmCanvas"></div>`;
  document.body.appendChild(dock);
  zone.addEventListener('pointerenter',openMini,{passive:true});
  zone.addEventListener('mousemove',openMini,{passive:true});
  dock.addEventListener('pointerenter',openMini,{passive:true});
  dock.addEventListener('pointerleave',()=>{clearTimeout(mmTimer);mmTimer=setTimeout(()=>document.body.classList.remove('yv-minimap-open'),120)},{passive:true});
  dock.querySelector('.yv-mm-close').onclick=()=>document.body.classList.remove('yv-minimap-open');
  dock.addEventListener('click',e=>{
    const d=e.target.closest?.('[data-yv-mm-dock]');if(!d)return;
    openRampDetail(d.dataset.yvMmWh,Number(d.dataset.yvMmDock));
  });
}
function openMini(){
  clearTimeout(mmTimer);document.body.classList.add('yv-minimap-open');renderMiniMap();
}
function renderMiniMap(){
  const canvas=document.getElementById('yvMmCanvas');if(!canvas)return;
  const wid=currentWarehouse(),ramps=rampCount(wid),D=today();
  const list=scopedAnnouncements().filter(a=>String(a.warehouse||'')===String(wid)&&String(a.date||'')===D);
  const sub=document.getElementById('yvMmSubtitle');if(sub)sub.textContent=`${whName(wid)} · ${D}`;
  let h=`<div class="yv-mm-warehouse">${esc(whName(wid))}</div><div class="yv-mm-docks" style="grid-template-columns:repeat(${ramps},1fr)">`;
  for(let r=1;r<=ramps;r++){
    const a=list.find(x=>Number(x.dock)===r&&state(x)==='dock');
    h+=`<div class="yv-mm-dock ${a?'busy':''}" data-yv-mm-dock="${r}" data-yv-mm-wh="${esc(wid)}"><b>R${r}</b><span>${a?esc(a.supplier||'DOBAVLJAČ'):'SLOBODNA'}</span><em>${a?Number(a.pallets||0)+' pal':'FREE'}</em></div>`;
  }
  const parking=list.filter(a=>state(a)==='yard').length;
  h+=`</div><div class="yv-mm-bottom"><span>PARKING: ${parking}</span><span>NA RAMPI: ${list.filter(a=>state(a)==='dock').length}</span><span>${esc(locName((master().warehouses||[]).find(w=>String(w.id)===String(wid))?.location_id||''))}</span></div>`;
  canvas.innerHTML=h;
}
function ensureRampModal(){
  let m=document.getElementById('yardivoMiniRampModal');if(m)return m;
  m=document.createElement('div');m.id='yardivoMiniRampModal';
  m.innerHTML=`<div class="yv-mr-card"><div class="yv-mr-head"><strong id="yvMrTitle">RAMPA</strong><button type="button" class="yv-mr-close">×</button></div><div class="yv-mr-body" id="yvMrBody"></div></div>`;
  document.body.appendChild(m);
  m.querySelector('.yv-mr-close').onclick=()=>m.classList.remove('open');
  m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')});
  return m;
}
function openRampDetail(wid,ramp){
  const m=ensureRampModal(),D=today();
  const a=scopedAnnouncements().find(x=>String(x.warehouse||'')===String(wid)&&String(x.date||'')===D&&Number(x.dock)===Number(ramp)&&state(x)==='dock');
  document.getElementById('yvMrTitle').textContent=`${whName(wid)} · RAMPA R${ramp}`;
  const b=document.getElementById('yvMrBody');
  if(a){
    b.innerHTML=`<span class="yv-mr-status busy">ZAUZETA</span><div class="yv-mr-grid">
      <div><small>DOBAVLJAČ</small><strong>${esc(a.supplier||'—')}</strong></div>
      <div><small>PALETE</small><strong>${Number(a.pallets||0)}</strong></div>
      <div><small>TERMIN</small><strong>${esc(a.time||'—')}</strong></div>
      <div><small>STATUS</small><strong>${esc(a.status||'NA RAMPI')}</strong></div>
      <div><small>NARUDŽBA</small><strong>${esc(a.orderNumber||a.order||'—')}</strong></div>
      <div><small>REGISTRACIJA</small><strong>${esc(a.plannedPlate||a.arrivalPlate||'—')}</strong></div>
    </div>`;
  }else{
    b.innerHTML=`<span class="yv-mr-status free">SLOBODNA</span><div class="yv-mr-grid">
      <div><small>SKLADIŠTE</small><strong>${esc(whName(wid))}</strong></div>
      <div><small>RAMPA</small><strong>R${ramp}</strong></div>
      <div><small>DATUM</small><strong>${esc(D)}</strong></div>
      <div><small>STANJE</small><strong>NEMA AKTIVNOG KAMIONA</strong></div>
    </div>`;
  }
  m.classList.add('open');
}

/* ---------------- SMART ASSISTANT ---------------- */
function ensureAssistant(){
  if(document.getElementById('yardivoSmartAssistant'))return;
  const zone=document.createElement('div');zone.id='yardivoAssistantZone';document.body.appendChild(zone);
  const box=document.createElement('section');box.id='yardivoSmartAssistant';
  box.innerHTML=`<div class="yv-ai-head"><div><strong>YARDIVO SMART ASSISTANT</strong><small class="yv-ai-live"><i></i> LIVE YARDIVO DATA · SCOPE AWARE</small></div><button type="button" class="yv-ai-close">×</button></div>
    <div class="yv-ai-body" id="yardivoAssistantMessages"></div>
    <div class="yv-ai-inputbar"><textarea id="yardivoAssistantInput" placeholder="Napiši poruku YARDIVO Assistantu..."></textarea><button id="yardivoAssistantSend" type="button">POŠALJI</button></div>`;
  document.body.appendChild(box);
  zone.addEventListener('pointerenter',openAssistant,{passive:true});
  zone.addEventListener('mousemove',openAssistant,{passive:true});
  box.addEventListener('pointerenter',openAssistant,{passive:true});
  box.addEventListener('pointerleave',()=>{clearTimeout(aiTimer);aiTimer=setTimeout(()=>document.body.classList.remove('yv-assistant-open'),220)},{passive:true});
  box.querySelector('.yv-ai-close').onclick=()=>document.body.classList.remove('yv-assistant-open');
  box.querySelector('#yardivoAssistantSend').onclick=sendAssistant;
  box.querySelector('#yardivoAssistantInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAssistant()}});
}
function openAssistant(){
  if(!assistantEnabled())return;
  clearTimeout(aiTimer);
  document.body.classList.add('yv-assistant-open');
  setTimeout(()=>document.getElementById('yardivoAssistantInput')?.focus?.({preventScroll:true}),20);
}
function addMsg(kind,text){
  const m=document.getElementById('yardivoAssistantMessages');if(!m)return;
  const d=document.createElement('div');d.className='yv-ai-msg '+kind;d.textContent=text;m.appendChild(d);m.scrollTop=m.scrollHeight;
}
const aiConversation=[];
const YARDIVO_AI_EDGE='https://ldzwgdwzolbvjxyznlry.supabase.co/functions/v1/yardivo-ai';
const YARDIVO_AI_ANON='sb_publishable_f3daeEDsH7zNSiFR5QluaQ_AP4Ptjzz';

function aiContext(){
  const rows=warehouseRows(),todayRows=scopedToday();
  const compact=todayRows.slice(0,70).map(a=>({
    supplier:a.supplier||'',
    warehouse:whName(a.warehouse),
    warehouseId:a.warehouse||'',
    date:a.date||'',
    time:a.time||'',
    dock:a.dock||'',
    pallets:Number(a.pallets||0),
    status:a.status||state(a),
    phase:state(a),
    order:a.orderNumber||a.order||''
  }));
  const allowed=allowedWarehouseIds();
  const incidentRows=inc().filter(x=>!allowed||allowed.has(String(x.warehouse||x.warehouseId||''))).slice(0,20).map(x=>({
    warehouseId:x.warehouse||x.warehouseId||'',
    warehouse:whName(x.warehouse||x.warehouseId||''),
    title:x.title||x.type||'Incident',
    status:x.status||'',
    createdAt:x.createdAt||x.created_at||''
  }));
  return {
    language:'hr',
    role:role(),
    user:session()?.username||session()?.user||'',
    assignedWarehouses:rows.map(w=>({id:w.id,name:w.name||w.id,location:locName(w.location_id)})),
    today:today(),
    deliveries:compact,
    incidents:incidentRows
  };
}
async function aiAccessToken(){
  const direct=String(window.__yardivoSupplierAccessToken||'').trim();
  if(direct)return direct;
  const c=await window.YardivoAuth?.client?.();
  if(!c)throw new Error('YARDIVO Auth nije dostupan.');
  let ss=null;
  try{ss=(await c.auth.getSession())?.data?.session||null}catch(_){}
  if(!ss?.access_token){
    try{ss=(await c.auth.refreshSession())?.data?.session||null}catch(_){}
  }
  if(!ss?.access_token)throw new Error('ONLINE PRIJAVA NIJE AKTIVNA.');
  return ss.access_token;
}
async function realAiAnswer(q){
  const token=await aiAccessToken();
  const history=aiConversation.slice(-6);
  const r=await fetch(YARDIVO_AI_EDGE,{
    method:'POST',
    headers:{
      apikey:YARDIVO_AI_ANON,
      Authorization:'Bearer '+token,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      message:q,
      history,
      context:aiContext()
    })
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok||d?.ok===false||!d?.reply){
    const code=String(d?.error||'AI_ERROR');
    if(code==='AI_NOT_CONFIGURED')throw new Error('YARDIVO AI još nema konfiguriran AI provider.');
    if(code==='AUTH_REQUIRED'||code==='AUTH_INVALID')throw new Error('AI zahtijeva aktivnu YARDIVO prijavu.');
    throw new Error('YARDIVO AI trenutno nije dostupan.');
  }
  return String(d.reply).trim();
}
function sendAssistant(){
  const i=document.getElementById('yardivoAssistantInput');if(!i)return;
  const q=String(i.value||'').trim();if(!q)return;
  i.value='';
  ask(q);
}
async function ask(q){
  q=String(q||'').trim();
  if(!q)return;
  addMsg('user',q);
  const thinking=document.createElement('div');
  thinking.className='yv-ai-msg assistant';
  thinking.textContent='…';
  const box=document.getElementById('yardivoAssistantMessages');
  box?.appendChild(thinking);
  if(box)box.scrollTop=box.scrollHeight;
  try{
    const a=await realAiAnswer(q);
    aiConversation.push({role:'user',text:q},{role:'assistant',text:a});
    thinking.remove();
    addMsg('assistant',a);
  }catch(e){
    thinking.remove();
    addMsg('assistant',String(e?.message||'YARDIVO AI trenutno nije dostupan.'));
  }
}
function scopedToday(){
  const D=today();return scopedAnnouncements().filter(a=>String(a.date||'')===D);
}
function answer(raw){
  const q=String(raw||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const rows=warehouseRows(),todayRows=scopedToday();
  if(/skladist|warehouse|scope|dodijel/.test(q)){
    if(!rows.length)return'Nemate dodijeljeno nijedno aktivno skladište.';
    return 'Dodijeljena skladišta:\n'+rows.map(w=>`• ${w.name||w.id}${w.location_id?' · '+locName(w.location_id):''}`).join('\n');
  }
  if(/rampi|rampa|dock/.test(q)&&/(trenut|tko|sto|zauzet|na rampi)/.test(q)){
    const d=todayRows.filter(a=>state(a)==='dock');
    if(!d.length)return'Trenutno nema kamiona na rampi u vašem dodijeljenom scopeu.';
    return d.map(a=>`• ${whName(a.warehouse)} · R${a.dock||'—'} · ${a.supplier||'DOBAVLJAČ'} · ${Number(a.pallets||0)} pal`).join('\n');
  }
  if(/slobodn/.test(q)&&/ramp/.test(q)){
    const lines=[];
    rows.forEach(w=>{
      const n=rampCount(w.id),busy=new Set(todayRows.filter(a=>String(a.warehouse)===String(w.id)&&state(a)==='dock').map(a=>Number(a.dock)));
      const free=[];for(let r=1;r<=n;r++)if(!busy.has(r))free.push('R'+r);
      lines.push(`${w.name||w.id}: ${free.length?free.join(', '):'nema slobodnih rampi'}`);
    });
    return lines.length?lines.join('\n'):'Nema dodijeljenih skladišta.';
  }
  if(/palet/.test(q)){
    const total=todayRows.reduce((s,a)=>s+Number(a.pallets||0),0);
    const dock=todayRows.filter(a=>state(a)==='dock').reduce((s,a)=>s+Number(a.pallets||0),0);
    return `Danas u vašem scopeu: ${total} paleta ukupno u najavama.\nTrenutno na rampama: ${dock} paleta.`;
  }
  if(/parking|parkiran|dvorist|buffer|ceka/.test(q)){
    const p=todayRows.filter(a=>state(a)==='yard');
    if(!p.length)return'Trenutno nema kamiona na parkingu / buffer zoni u vašem scopeu.';
    return p.map(a=>`• ${a.supplier||'DOBAVLJAČ'} · ${whName(a.warehouse)} · ${Number(a.pallets||0)} pal · plan ${a.dock?'R'+a.dock:'bez rampe'}`).join('\n');
  }
  if(/incident/.test(q)){
    const allowed=allowedWarehouseIds();
    const rowsI=inc().filter(x=>!allowed||allowed.has(String(x.warehouse||x.warehouseId||'')));
    return rowsI.length?`Vidim ${rowsI.length} incidenta u vašem scopeu. Otvorite sekciju Incidenti za detaljan pregled.`:'Trenutno ne vidim evidentirane incidente u vašem scopeu.';
  }
  if(/danas|najav|dolaz/.test(q)){
    const active=todayRows.filter(a=>state(a)!=='done');
    return `Danas imate ${todayRows.length} najava u svom scopeu.\nAktivno: ${active.length} · parking: ${active.filter(a=>state(a)==='yard').length} · na rampi: ${active.filter(a=>state(a)==='dock').length}.`;
  }
  const supplierMatch=scopedAnnouncements().find(a=>String(a.supplier||'').toLowerCase()&&q.includes(String(a.supplier||'').toLowerCase()));
  if(supplierMatch){
    return `${supplierMatch.supplier}: ${whName(supplierMatch.warehouse)} · ${supplierMatch.date||'—'} ${supplierMatch.time||'—'} · ${Number(supplierMatch.pallets||0)} pal · R${supplierMatch.dock||'—'} · status ${supplierMatch.status||state(supplierMatch)}.`;
  }
  return `Mogu odgovoriti iz live YARDIVO podataka koje smijete vidjeti.\nProbajte: “Koja skladišta vidim?”, “Što je na rampi?”, “Koje su rampe slobodne?”, “Koliko je danas paleta?” ili “Tko je na parkingu?”.`;
}

/* ---------------- RIGHT SETTINGS TOGGLE ---------------- */
function ensureAssistantSetting(){
  const list=document.querySelector('#yardivoRightSettingsDrawer .yv-rs-list');
  if(!list||list.querySelector('[data-yv-setting="assistant"]'))return;
  const b=document.createElement('button');
  b.type='button';b.className='yv-rs-item';b.dataset.yvSetting='assistant';
  b.innerHTML=`<span class="yv-rs-icon">✦</span><span class="yv-rs-copy"><strong>YARDIVO SMART ASSISTANT</strong><small class="yv-rs-toggle-state" data-yv-assistant-setting-status></small></span><span class="yv-rs-arrow">›</span>`;
  list.appendChild(b);
  b.onclick=e=>{
    e.preventDefault();e.stopPropagation();
    setAssistantEnabled(!assistantEnabled());
  };
  updateSettingsAssistantStatus();
}
function updateSettingsAssistantStatus(){
  const on=assistantEnabled();
  document.body.classList.toggle('yv-assistant-disabled',!on);
  document.querySelectorAll('[data-yv-assistant-setting-status]').forEach(x=>{
    x.textContent=on?'UKLJUČEN':'ISKLJUČEN';x.classList.toggle('on',on);x.classList.toggle('off',!on);
  });
}

function ensure(){
  ensureMiniMap();ensureAssistant();ensureAssistantSetting();setAssistantEnabled(assistantEnabled());
}
window.addEventListener('yardivo:login',()=>setTimeout(()=>{ensure();renderMiniMap()},80));
window.addEventListener('yardivo:data-synced',()=>{if(document.body.classList.contains('yv-minimap-open'))renderMiniMap()});
window.addEventListener('yardivo:master-data-changed',()=>{ensureAssistantSetting();if(document.body.classList.contains('yv-minimap-open'))renderMiniMap()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('yardivoMiniRampModal')?.classList.remove('open')});
document.addEventListener('DOMContentLoaded',ensure,{once:true});
window.addEventListener('load',()=>setTimeout(ensure,300),{once:true});
setTimeout(ensure,250);

window.YardivoMiniMapV583={render:renderMiniMap,open:openMini};
window.YardivoSmartAssistantV583={ask,answer,enabled:assistantEnabled,setEnabled:setAssistantEnabled};
})();
