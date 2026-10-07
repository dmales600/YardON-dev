(function(){
'use strict';

const MASTER='yardivo_master_data_registry_v583';
const SMART='yardivo_auto_replan_cfg_v1';
const QR='yardivo_qr_scan_cfg_v583';
let busy=false;

function norm(v){return String(v||'').trim().toLowerCase()}
function session(){
  try{return window.currentSession||(typeof currentSession!=='undefined'?currentSession:null)||null}
  catch(_){return window.currentSession||null}
}
function isCanonicalAdmin(){
  const s=session()||{};
  return norm(s.username||s.user)==='dujemales'&&norm(s.app_role||s.role)==='admin';
}
function status(msg,kind=''){
  const el=document.getElementById('yardonResetStatus');
  if(!el)return;
  el.textContent=String(msg||'');
  el.dataset.kind=kind;
}
async function client(){
  const c=await window.YardivoAuth?.client?.();
  if(!c)throw new Error('ONLINE AUTH NIJE SPREMAN. Ponovno se prijavi kao dujemales.');
  return c;
}
async function invoke(body){
  const c=await client();
  const {data,error}=await c.functions.invoke('yardon-reset',{body});
  if(error)throw new Error(error.message||'RESET YARDON server nije dostupan.');
  if(!data?.ok)throw new Error(data?.error||'RESET YARDON nije uspio.');
  return data;
}
function preserveAuth(){
  const out={local:{},session:{}};
  for(const [name,st] of [['local',localStorage],['session',sessionStorage]]){
    try{
      for(let i=0;i<st.length;i++){
        const k=st.key(i);
        if(k&&(
          /^sb-[a-z0-9_-]+-auth-token$/i.test(k)||
          /^supabase\.auth\./i.test(k)
        )) out[name][k]=st.getItem(k);
      }
    }catch(_){}
  }
  return out;
}
function restoreAuth(saved){
  for(const [name,vals] of Object.entries(saved||{})){
    const st=name==='session'?sessionStorage:localStorage;
    for(const [k,v] of Object.entries(vals||{})){
      try{if(v!=null)st.setItem(k,v)}catch(_){}
    }
  }
}
function emptyMaster(){
  return {
    suppliers:[],
    locations:[],
    warehouses:[],
    responsible_people:[],
    smart:{enabled:false,mode:'PAUSED'},
    __yardonReset:true,
    __masterUpdatedAtV583:new Date().toISOString()
  };
}
function cleanAdminSession(){
  const old=session()||{};
  return {
    ...old,
    user:'dujemales',
    username:'dujemales',
    role:'admin',
    app_role:'admin',
    location:'ALL',
    locations:[],
    warehouses:[],
    all_locations:true,
    all_warehouses:true,
    supplier_id:null,
    supplier_name:null,
    responsible_person_id:null,
    responsible_person_name:null,
    serverAuthorized:true,
    rememberMe:true
  };
}
function clearLocalAfterServerPass(){
  const auth=preserveAuth();
  try{localStorage.clear()}catch(_){}
  try{sessionStorage.clear()}catch(_){}
  restoreAuth(auth);

  const m=emptyMaster();
  const s=cleanAdminSession();
  try{
    localStorage.setItem(MASTER,JSON.stringify(m));
    localStorage.setItem('yardivo_master_boot_cache_v583',JSON.stringify(m));
    localStorage.setItem(SMART,JSON.stringify({enabled:false,mode:'PAUSED'}));
    localStorage.setItem(QR,JSON.stringify({enabled:false}));
    localStorage.setItem('yardivo_ramp_qr_mobile_v1','0');
    localStorage.setItem('yardivo_remembered_session',JSON.stringify(s));
    sessionStorage.setItem('studenac_demo_session',JSON.stringify(s));
    localStorage.setItem('yardivo_clean_epoch_v583',new Date().toISOString());
  }catch(_){}

  try{
    window.currentSession=s;
    if(typeof currentSession!=='undefined')currentSession=s;
  }catch(_){window.currentSession=s}

  for(const n of ['announcements','incidents','notifications','notificationHistory','trucks','unannounced']){
    try{if(Array.isArray(window[n]))window[n].length=0}catch(_){}
  }
  try{
    if(typeof announcements!=='undefined'&&Array.isArray(announcements))announcements.length=0;
    if(typeof incidents!=='undefined'&&Array.isArray(incidents))incidents.length=0;
    if(typeof notifications!=='undefined'&&Array.isArray(notifications))notifications.length=0;
  }catch(_){}

  try{window.dispatchEvent(new CustomEvent('yardivo:master-data-changed',{detail:{source:'yardon-reset'}}))}catch(_){}
  try{window.dispatchEvent(new CustomEvent('yardivo:data-synced',{detail:{source:'yardon-reset',changed:true}}))}catch(_){}
}
function validateServerPass(data){
  if(data?.reset!=='YARDON')throw new Error('Server nije potvrdio RESET YARDON.');
  if(norm(data?.keptAdmin)!=='dujemales'||Number(data?.users)!==1)throw new Error('Server nije potvrdio da je ostao samo admin dujemales.');
  const verify=data?.verify||{};
  const dirty=Object.entries(verify).filter(([,v])=>Number(v)!==0);
  if(dirty.length)throw new Error('Server verifikacija nije 0: '+dirty.map(([k,v])=>k+'='+v).join(', '));
  if(!Array.isArray(data?.app_state_keys)||data.app_state_keys.length!==4)throw new Error('Server nije vratio čisti osnovni YardOn state.');
  const m=data?.master||{};
  if(Number(m.locations)!==0||Number(m.warehouses)!==0||Number(m.suppliers)!==0||Number(m.responsible_people)!==0){
    throw new Error('Master podaci nisu potpuno prazni.');
  }
}
async function runReset(){
  if(busy)return;
  if(!isCanonicalAdmin()){
    alert('RESET YARDON može pokrenuti samo Admin dujemales.');
    return;
  }

  if(!confirm(
    'RESET YARDON — POTPUNI RESET\n\n'+
    'Brišu se SVI YardOn podaci iz baze: accounti, dobavljači, lokacije, skladišta, rampe, najave, gate/self-gate podaci, chatovi, dokumenti, incidenti, audit i sva poslovna povijest.\n\n'+
    'OSTAJE SAMO ADMIN dujemales.\n\n'+
    'Ovo se ne može poništiti. Nastaviti?'
  ))return;

  const typed=prompt('Za konačnu potvrdu upiši točno:\nRESET YARDON');
  if(String(typed||'').trim().toUpperCase()!=='RESET YARDON'){
    status('Reset otkazan — potvrda nije bila točna.','');
    return;
  }

  const btn=document.getElementById('yardonResetBtn');
  busy=true;
  if(btn){btn.disabled=true;btn.textContent='RESETIRAM YARDON…'}

  try{
    status('1/4 · Provjeravam server, Admin account i podatke…');
    const pre=await invoke({confirm:'RESET YARDON',dry_run:true});
    if(!pre?.dryRun||norm(pre?.admin)!=='dujemales')throw new Error('Preflight provjera nije prošla.');

    status('2/4 · Brišem sve YardOn podatke i sve accounte osim dujemales…');
    const result=await invoke({confirm:'RESET YARDON'});

    status('3/4 · Verificiram da je baza stvarno na 0…');
    validateServerPass(result);

    status('4/4 · Čistim lokalni cache i ostavljam samo Admin sesiju…');
    clearLocalAfterServerPass();

    status('✓ RESET YARDON ZAVRŠEN · SVE JE NA 0 · OSTAO JE SAMO ADMIN DUJEMALES','ok');
    alert(
      'RESET YARDON je uspješno završen.\n\n'+
      'Svi poslovni podaci: 0\n'+
      'Dobavljači / lokacije / skladišta / rampe: 0\n'+
      'Najave / Gate / Self Gate / chat / dokumenti / incidenti / audit: 0\n'+
      'Korisnici: samo Admin dujemales\n'+
      'SMART: OFF\nQR: OFF'
    );
    setTimeout(()=>location.reload(),400);
  }catch(e){
    console.error('[RESET YARDON]',e);
    status('RESET NIJE IZVRŠEN: '+String(e?.message||e),'error');
    alert('RESET YARDON nije izvršen:\n\n'+String(e?.message||e));
  }finally{
    busy=false;
    if(btn){btn.disabled=false;btn.textContent='RESET YARDON'}
  }
}
function bind(){
  const btn=document.getElementById('yardonResetBtn');
  if(!btn)return;
  const allowed=isCanonicalAdmin();
  btn.disabled=!allowed;
  btn.title=allowed?'Potpuni reset YardOn baze':'Samo Admin dujemales';
  if(btn.dataset.yardonResetBound==='1')return;
  btn.dataset.yardonResetBound='1';
  btn.addEventListener('click',runReset);
}
document.addEventListener('DOMContentLoaded',bind,{once:true});
window.addEventListener('load',()=>setTimeout(bind,100),{once:true});
window.addEventListener('yardivo:login',()=>setTimeout(bind,50));
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-view="settings"],[data-home-target="settings"]'))setTimeout(bind,40);
},true);

window.YardOnReset={run:runReset,bind};
})();