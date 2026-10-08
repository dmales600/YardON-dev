(function(){
'use strict';

const CFG_KEY='yardivo_auto_replan_cfg_v1';
const MASTER_KEY='yardivo_master_data_registry_v583';
const DEFAULT_CFG={
  enabled:false,
  mode:'PAUSED',
  assistantEnabled:false,
  lateThreshold:20,
  horizonMinutes:240,
  maxShiftMinutes:240,
  scanSeconds:30,
  palletsPerHour:33,
  gapWeight:1.15
};

function role(){
  try{
    let r=String(window.currentSession?.app_role||window.currentSession?.role||'').toLowerCase().trim();
    if(r==='management'||r==='voditelj')r='manager';
    if(r==='zalihe'||r.includes('zalih'))r='inventory';
    if(r==='prijam')r='reception';
    if(r==='porta'||r==='portir')r='gate';
    return r;
  }catch(_){return''}
}
function cfg(){
  try{return {...DEFAULT_CFG,...(JSON.parse(localStorage.getItem(CFG_KEY)||'{}')||{})}}
  catch(_){return {...DEFAULT_CFG}}
}
function master(){
  try{return JSON.parse(localStorage.getItem(MASTER_KEY)||'{}')||{}}
  catch(_){return{}}
}
function aiControlEnabled(c=cfg()){
  return c.enabled===true&&String(c.mode||'').toUpperCase()!=='PAUSED';
}
function assistantEnabled(c=cfg()){
  return c.assistantEnabled===true;
}
function emit(c,reason){
  try{window.dispatchEvent(new CustomEvent('yardivo:ai-admin-config',{detail:{...c,reason:String(reason||'admin')}}))}catch(_){}
  try{window.dispatchEvent(new StorageEvent('storage',{key:CFG_KEY,newValue:JSON.stringify(c)}))}catch(_){}
}
function apply(c=cfg()){
  const ai=aiControlEnabled(c),assistant=assistantEnabled(c);
  document.documentElement.classList.toggle('yardivo-smart-on',ai);
  document.documentElement.classList.toggle('yardivo-smart-off',!ai);
  document.documentElement.classList.toggle('yardon-ai-control-on',ai);
  document.documentElement.classList.toggle('yardon-ai-control-off',!ai);
  document.documentElement.classList.toggle('yardon-assistant-on',assistant);
  document.documentElement.classList.toggle('yardon-assistant-off',!assistant);
  document.body?.classList.toggle('yv-assistant-disabled',!assistant);
  if(!assistant)document.body?.classList.remove('yv-assistant-open');
  try{window.YardivoSmartReplanning?.applyState?.()}catch(_){}
  try{window.YardivoSmartOperationalVisibilityV583?.apply?.()}catch(_){}
  // SMART Center owns one view; legacy AI Operations UI is retired.
  try{window.YardivoSmartAssistantV583?.applyAvailability?.()}catch(_){}
  render();
}
async function persist(next,reason){
  if(role()!=='admin')throw new Error('Samo Admin može mijenjati globalne AI postavke.');
  const c={...cfg(),...next};
  c.assistantEnabled=c.assistantEnabled===true;
  c.enabled=c.enabled===true;
  c.mode=c.enabled?(String(c.mode||'AUTO_SAFE').toUpperCase()==='PAUSED'?'AUTO_SAFE':String(c.mode||'AUTO_SAFE')):'PAUSED';
  c.updatedAt=new Date().toISOString();
  c.updatedBy=String(window.currentSession?.username||window.currentSession?.user||'admin');

  localStorage.setItem(CFG_KEY,JSON.stringify(c));

  const m=master();
  m.smart={
    ...(m.smart||{}),
    enabled:c.enabled,
    mode:c.mode,
    assistantEnabled:c.assistantEnabled,
    lateThreshold:c.lateThreshold,
    horizonMinutes:c.horizonMinutes,
    maxShiftMinutes:c.maxShiftMinutes,
    scanSeconds:c.scanSeconds,
    palletsPerHour:c.palletsPerHour,
    gapWeight:c.gapWeight
  };
  m.__masterUpdatedAtV583=c.updatedAt;
  localStorage.setItem(MASTER_KEY,JSON.stringify(m));
  try{
    if(window.YardivoMasterDataV583?.save)await Promise.resolve(window.YardivoMasterDataV583.save(m));
    else if(typeof window.putCloudState==='function')await Promise.resolve(window.putCloudState(MASTER_KEY,JSON.stringify(m)));
  }catch(e){console.warn('[YARDON AI SETTINGS] Master mirror save',e)}
  try{await window.YardivoSync?.syncNow?.()}catch(_){}
  emit(c,reason);
  apply(c);
  return c;
}
async function setAssistant(on){return persist({assistantEnabled:!!on},'assistant')}
async function setAIControl(on){return persist({enabled:!!on,mode:on?'AUTO_SAFE':'PAUSED'},'ai-control')}

function ensureStyle(){
  if(document.getElementById('yardonAiAdminSettingsStyle'))return;
  const s=document.createElement('style');s.id='yardonAiAdminSettingsStyle';
  s.textContent=`
#yardivoSmartAdminSettings .yai-admin-body{display:grid;gap:10px;padding:14px}
#yardivoSmartAdminSettings .yai-admin-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:18px;padding:14px;border:1px solid rgba(92,134,162,.28);border-radius:14px;background:rgba(11,29,42,.62)}
#yardivoSmartAdminSettings .yai-admin-copy strong{display:block;font-size:12px;letter-spacing:.02em}
#yardivoSmartAdminSettings .yai-admin-copy small{display:block;margin-top:5px;color:#7895a8;font-size:9px;line-height:1.45;max-width:760px}
#yardivoSmartAdminSettings .yai-switch{position:relative;width:54px;height:30px;display:inline-flex;flex:0 0 auto}
#yardivoSmartAdminSettings .yai-switch input{position:absolute;opacity:0;pointer-events:none}
#yardivoSmartAdminSettings .yai-switch span{position:absolute;inset:0;border-radius:999px;background:#273947;border:1px solid #426075;cursor:pointer;transition:.18s}
#yardivoSmartAdminSettings .yai-switch span:after{content:"";position:absolute;width:22px;height:22px;left:3px;top:3px;border-radius:50%;background:#b7c6ce;transition:.18s}
#yardivoSmartAdminSettings .yai-switch input:checked+span{background:#12613e;border-color:#2b9e6a}
#yardivoSmartAdminSettings .yai-switch input:checked+span:after{transform:translateX(24px);background:#e9fff4}
#yardivoSmartAdminSettings .yai-switch input:disabled+span{opacity:.45;cursor:wait}
#yardivoSmartAdminSettings .yai-admin-status{font-size:9px;font-weight:1000;letter-spacing:.04em}
#yardivoSmartAdminSettings .yai-admin-note{padding:0 14px 14px;color:#718da0;font-size:8px;line-height:1.45}
`;
  document.head.appendChild(s);
}
function render(){
  const c=cfg(),ai=aiControlEnabled(c),assistant=assistantEnabled(c);
  const at=document.getElementById('yardivoAiAssistantToggle');
  const ct=document.getElementById('yardivoAiControlToggle');
  const as=document.getElementById('yardivoAiAssistantStatus');
  const cs=document.getElementById('yardivoAiControlStatus');
  if(at)at.checked=assistant;
  if(ct)ct.checked=ai;
  if(as){as.textContent=assistant?'UKLJUČEN':'ISKLJUČEN';as.style.color=assistant?'#61d98c':'#ff7078'}
  if(cs){cs.textContent=ai?'UKLJUČENO':'ISKLJUČENO';cs.style.color=ai?'#61d98c':'#ff7078'}
}
function bindToggle(id,handler){
  const x=document.getElementById(id);if(!x||x.dataset.bound)return;
  x.dataset.bound='1';
  x.addEventListener('change',async e=>{
    const wanted=!!e.target.checked;
    e.target.disabled=true;
    try{await handler(wanted)}
    catch(err){alert(String(err?.message||err));render()}
    finally{e.target.disabled=false}
  });
}
function inject(){
  const root=document.querySelector('#settings .settings-grid');if(!root)return;
  let p=document.getElementById('yardivoSmartAdminSettings');
  if(role()!=='admin'){if(p)p.remove();return}
  ensureStyle();
  if(!p){
    p=document.createElement('section');p.className='panel';p.id='yardivoSmartAdminSettings';
    p.innerHTML=`
      <div class="panel-head"><div><h2>YARDON AI & ASSISTANT</h2><small>Globalna Admin kontrola. Ostale role ne mogu uključiti ove funkcije.</small></div></div>
      <div class="yai-admin-body">
        <div class="yai-admin-row">
          <div class="yai-admin-copy"><strong>YardOn Assistant</strong><small>Uključuje ili potpuno isključuje YardOn Assistant za sve korisnike i Manager Mobile. Kad Admin isključi Assistant, korisnici ga ne mogu sami ponovno uključiti.</small></div>
          <div><span class="yai-admin-status" id="yardivoAiAssistantStatus"></span><label class="yai-switch" title="Globalno uključi ili isključi YardOn Assistant"><input id="yardivoAiAssistantToggle" type="checkbox"><span></span></label></div>
        </div>
        <div class="yai-admin-row">
          <div class="yai-admin-copy"><strong>AI upravljanje YardOnom</strong><small>Kontrolira automatsku dodjelu rampi, parking prioritet, AI planiranje i prijedloge promjene termina. Kad je OFF, automatske AI odluke staju i AI Operations / Smart operativna sekcija se skriva.</small></div>
          <div><span class="yai-admin-status" id="yardivoAiControlStatus"></span><label class="yai-switch" title="Globalno uključi ili isključi AI upravljanje YardOnom"><input id="yardivoAiControlToggle" type="checkbox"><span></span></label></div>
        </div>
      </div>
      <div class="yai-admin-note">Promjena se sprema u zajednički YardOn server state i vrijedi za sve role i uređaje. Factory Reset vraća oba prekidača na OFF.</div>`;
    root.prepend(p);
  }else if(root.firstElementChild!==p){
    root.prepend(p);
  }
  bindToggle('yardivoAiAssistantToggle',setAssistant);
  bindToggle('yardivoAiControlToggle',setAIControl);
  render();
  setTimeout(()=>{
    try{
      if(window.YardivoSettingsHardFixV583?.category?.()==='yardon')window.YardivoSettingsHardFixV583.show('yardon');
    }catch(_){}
  },0);
}

document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-view="settings"],[data-home-target="settings"],#navSettings'))setTimeout(inject,30);
  if(e.target.closest?.('.yas-sidebar button[data-yas-section="yardon"]'))setTimeout(inject,0);
},true);
['yardivo:login','yardivo:data-synced'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(()=>{apply(cfg());inject()},80)));
window.addEventListener('storage',e=>{if(e.key===CFG_KEY||e.key===MASTER_KEY)setTimeout(()=>apply(cfg()),20)});
window.addEventListener('yardivo:ai-admin-config',()=>setTimeout(()=>apply(cfg()),0));
window.addEventListener('load',()=>setTimeout(()=>{apply(cfg());inject()},900),{once:true});
setTimeout(()=>apply(cfg()),60);

window.YardOnAIAdminV1={
  key:CFG_KEY,
  read:cfg,
  assistantEnabled,
  aiControlEnabled,
  setAssistant,
  setAIControl,
  apply,
  inject,
  render
};
window.YardivoSmartAdminSettings={
  inject,
  save:setAIControl,
  render,
  assistantEnabled,
  aiControlEnabled
};
})();
