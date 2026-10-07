
(function(){
'use strict';
const BUILD='20260913-dev-v5.8.3-backend-runtime-hardened-final';
const MASTER='yardivo_master_data_registry_v583';
const CLEAN_EPOCH='yardivo_clean_epoch_v583';
let busy=false;
const EMPTY_ARRAY_KEYS=['yardivo_yms_announcements_v1','studenac_announcements','yardivo_announcements','yms_announcements','yardivo_yms_incidents_v1','yardivo_incidents','yardivo_live_notifications_v1','yardivo_master_notifications_v1','yardivo_notifications','yardivo_notifications_v1','yardivo_notifications_v2','yardivo_notifications_v583','yardivo_notification_history_v1','yardivo_notification_history_v583','studenac_notifications','yms_notifications','yardivo_epal_transactions_v1','yardivo_epal_initial_stock_v1','yms_trucks_v2','yardivo_auto_replan_log_v1','yardivo_supplier_scores_v1','yardivo_supabase_offline_queue_v1','yardivo_supabase_offline_queue_v2','yardivo_supplier_deliveries_v1','yardivo_supplier_requests_v1'];
const REMOVE_KEYS=['yardivo_dynamic_warehouses_v1','yardivo_ramp_config_v1','yardivo_ramp_capacity_v1','yardivo_ramp_hours_v1','yardivo_ramp_hours_v583','yardivo_reception_master_hours_v1','yardivo_capacity_config_v1','yardivo_detention_settings_v1','yardivo_ramp_master_v583','studenac_ramp_blocks','studenac_custom_holidays','studenac_holiday_overrides','yardivo_master_report_v1','yardivo_master_sheets_v1','yardivo_data_last_saved_at','studenac_active_warehouse','yardivo_active_warehouse','yardivo_last_location','yardivo_selected_location','yardivo_notification_seen_v5','yardivo_last_incident_notice','yardivo_supplier_scores_v1','yardivo_overview_qa_seed_v1'];
function norm(v){return String(v||'').trim().toLowerCase()}
function role(){return norm(window.currentSession?.role)}
function username(){return norm(window.currentSession?.username||window.currentSession?.user)}
function status(msg,kind=''){const el=document.getElementById('yardivoResetYardivoStatus');if(el){el.textContent=String(msg||'');el.dataset.kind=kind}}
function keeper(){const u=username();if(u!=='dujemales'||role()!=='admin')throw new Error('RESET može pokrenuti samo Admin dujemales.');return 'dujemales'}
function mount(){
 const settings=document.getElementById('settings');if(!settings)return;
 let card=document.getElementById('yardivoDevTotalResetV583');
 if(!card){card=document.createElement('section');card.id='yardivoDevTotalResetV583';card.innerHTML=`
 <div class="ydr-head"><div><h2>RESET YARDIVO</h2><p>Factory Zero briše poslovne podatke, konfiguraciju, Supplier/Gate podatke i sve Self Gate QR kodove/tokene. Prije izvršenja posebno biraš želiš li obrisati i korisničke accounte; Admin / Yard Manager dujemales se nikada ne briše. Nakon reseta struktura se gradi isključivo: Lokacija → Skladište → Rampe → radno vrijeme / kapacitet / EPAL.</p></div><span class="ydr-dev">YARDIVO DEV</span></div>
 <div class="ydr-checks"><span>0 LOKACIJA / SKLADIŠTA / RAMPI</span><span>0 NAJAVA / SUPPLIER NAJAVA / INCIDENATA</span><span>0 SELF GATE QR / GATE QR / SCANOVA / PALETA</span><span>0 NOTIFIKACIJA / POVIJESTI / CACHEA</span><span>ACCOUNTI: PO IZBORU · DUJEMALES OSTAJE</span><span>SMART: OFF / PAUSED</span></div>
 <div class="ydr-keep">ZAŠTIĆENI ACCOUNT: <strong id="yardivoResetKeeperLabel">TRENUTNI ADMIN</strong> + aktivna autentikacijska sesija.<br><span style="display:block;margin-top:6px;font-weight:800">Nakon reseta: prvo izradi Lokaciju u Master Data, zatim u QR postavkama klikni “IZRADI QR GATE ZA LOKACIJU”. QR se više ne stvara unaprijed.</span></div>
 <button type="button" id="yardivoResetYardivoBtn">RESET YARDIVO — VRATI SVE NA 0</button><div id="yardivoResetYardivoStatus" aria-live="polite"></div>`;settings.appendChild(card)}else if(settings.lastElementChild!==card)settings.appendChild(card);
 const label=document.getElementById('yardivoResetKeeperLabel');if(label)label.textContent=(username()||'trenutni Admin')+' · ADMIN';
 const btn=document.getElementById('yardivoResetYardivoBtn');if(btn&&!btn.dataset.bound){btn.dataset.bound='1';btn.addEventListener('click',resetYardivo)}
}
function preserveAuthStorage(){const out={local:{},session:{}};let activeKey='';try{activeKey=String(window.YardivoTabAuthV583?.storageKey||'')}catch(_){};for(const [name,st] of [['local',localStorage],['session',sessionStorage]]){try{for(let i=0;i<st.length;i++){const k=st.key(i);if(k&&(k===activeKey||/^yardivo-auth-/i.test(k)||/^sb-[a-z0-9_-]+-auth-token$/i.test(k)||/^supabase\.auth\./i.test(k)))out[name][k]=st.getItem(k)}}catch(_){}}return out}
function restoreAuthStorage(saved){for(const [name,vals] of Object.entries(saved||{})){const st=name==='session'?sessionStorage:localStorage;for(const [k,v] of Object.entries(vals||{})){try{if(v!=null)st.setItem(k,v)}catch(_){}}}}
function emptyMaster(){return {suppliers:[],locations:[],warehouses:[],responsible_people:[],smart:{enabled:false,mode:'PAUSED'},__factoryZeroV583:true,__cleanMasterFoundationV583:true,__resetYardivoV583:true,__masterUpdatedAtV583:new Date().toISOString()}}
function resetRuntimeArrays(){for(const n of ['announcements','incidents','notifications','notificationHistory','trucks','unannounced'])try{if(Array.isArray(window[n]))window[n].length=0}catch(_){};try{if(typeof announcements!=='undefined'&&Array.isArray(announcements))announcements.length=0;if(typeof incidents!=='undefined'&&Array.isArray(incidents))incidents.length=0;if(typeof notifications!=='undefined'&&Array.isArray(notifications))notifications.length=0}catch(_){}}
function localHardReset(keep){
 const auth=preserveAuthStorage(),m=emptyMaster();
 try{localStorage.clear()}catch(_){}
 try{sessionStorage.clear()}catch(_){}
 restoreAuthStorage(auth);
 try{
  localStorage.setItem(MASTER,JSON.stringify(m));
  localStorage.setItem('yardivo_master_boot_cache_v583',JSON.stringify(m));
  localStorage.setItem('yardivo_auto_replan_cfg_v1',JSON.stringify({enabled:false,mode:'PAUSED'}));
  localStorage.setItem('yardivo_qr_scan_cfg_v583',JSON.stringify({enabled:false}));
  localStorage.setItem('yardivo_ramp_qr_mobile_v1','0');
  localStorage.setItem(CLEAN_EPOCH,new Date().toISOString());
 }catch(_){}
 const session={user:keep,username:keep,role:'admin',app_role:'admin',location:'ALL',locations:[],warehouses:[],all_locations:true,all_warehouses:true,serverAuthorized:true};
 window.currentSession=session;try{if(typeof currentSession!=='undefined')currentSession=session}catch(_){}
 try{window.activeWarehouse='';if(typeof activeWarehouse!=='undefined')activeWarehouse=''}catch(_){}
 resetRuntimeArrays();
 try{window.YardivoNotificationsV583?.clear?.()}catch(_){}
 try{window.YardivoBrowserlessStorageV583?.purge?.()}catch(_){}
}
async function client(){const c=await window.YardivoAuth?.client?.();if(!c)throw new Error('ONLINE AUTH NIJE SPREMAN.');return c}
async function directInvoke(slug,body){
 const c=await client(),base=String(window.YardivoSupabaseClient?.base||'').replace(/\/$/,''),
 key=String(window.YardivoSupabaseClient?.publishableKey||'');
 if(!base||!key)throw new Error('SUPABASE KONFIGURACIJA NIJE UČITANA.');
 async function session(force=false){
  let s=null;
  try{s=(await (force?c.auth.refreshSession():c.auth.getSession()))?.data?.session||null}catch(_){}
  if(!s?.access_token&&!force){try{s=(await c.auth.refreshSession())?.data?.session||null}catch(_){}}
  if(!s?.access_token)throw new Error('ONLINE PRIJAVA NIJE AKTIVNA. Ponovno se prijavi.');
  return s;
 }
 async function call(token){
  const res=await fetch(base+'/functions/v1/'+slug,{method:'POST',cache:'no-store',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body||{})});
  const data=await res.json().catch(()=>({}));
  return {res,data};
 }
 let s=await session(false),out=await call(s.access_token);
 if(out.res.status===401){s=await session(true);out=await call(s.access_token)}
 if(!out.res.ok||out.data?.ok===false)throw new Error(String(out.data?.error||out.data?.message||('HTTP '+out.res.status)));
 return out.data;
}
async function adminInvoke(action,payload={}){const data=await directInvoke('yardivo-admin-users',{action,...payload});return data?.data??data}
async function factoryResetServer(deleteAccounts){const data=await directInvoke('yardivo-factory-reset',{confirm:'RESET YARDIVO',delete_accounts:deleteAccounts===true});if(!data?.ok)throw new Error(data?.error||'Server Factory Zero nije uspio.');return data}
async function deleteOtherUsers(keep){const res=await adminInvoke('list',{}),users=Array.isArray(res)?res:(Array.isArray(res?.users)?res.users:[]),k=users.find(u=>norm(u?.username)===keep&&norm(u?.app_role)==='admin'&&u?.active!==false);if(!k)throw new Error('Trenutni Admin nije pronađen na serveru.');const failed=[];let deleted=0;for(const u of users){if(!u?.auth_user_id||u.auth_user_id===k.auth_user_id)continue;try{await adminInvoke('delete',{auth_user_id:u.auth_user_id});deleted++}catch(e){failed.push(`${u.username||u.auth_user_id}: ${e?.message||e}`)}}if(failed.length)throw new Error('Nisu obrisani svi drugi korisnici: '+failed.join(' | '));return {deleted,keeper:k}}
function rerenderEmpty(){for(const n of ['render','renderAnnouncements','renderAnnouncementSchedule','renderDailyMap','renderWeeklyMap','renderReceiving','renderOverview','renderDashboard','renderRampe','renderDockOverview','renderCheckinPro','renderPlannerPro','renderSupplierProfiles'])try{if(typeof window[n]==='function')window[n]()}catch(_){};try{window.YardivoMasterFoundationV583?.render?.();window.dispatchEvent(new CustomEvent('yardivo:master-data-changed',{detail:{source:'reset-yardivo'}}));window.dispatchEvent(new CustomEvent('yardivo:context-changed',{detail:{location:'',warehouse:''}}))}catch(_){}}
async function verifyEmpty(keep,deleteAccounts){
 const checks={localAnnouncements:-1,localIncidents:-1,locations:-1,warehouses:-1,suppliers:-1,responsiblePeople:-1,qrEnabled:null,users:null};
 try{
  checks.localAnnouncements=JSON.parse(localStorage.getItem('yardivo_yms_announcements_v1')||'[]').length;
  checks.localIncidents=JSON.parse(localStorage.getItem('yardivo_yms_incidents_v1')||'[]').length;
  const m=JSON.parse(localStorage.getItem(MASTER)||'{}');
  checks.locations=(m.locations||[]).length;checks.warehouses=(m.warehouses||[]).length;checks.suppliers=(m.suppliers||[]).length;checks.responsiblePeople=(m.responsible_people||[]).length;
  checks.qrEnabled=JSON.parse(localStorage.getItem('yardivo_qr_scan_cfg_v583')||'{"enabled":false}').enabled===true;
 }catch(_){}
 try{const r=await adminInvoke('list',{}),u=Array.isArray(r)?r:(r?.users||[]);checks.users=u.map(x=>({username:norm(x.username),role:norm(x.app_role),active:x.active!==false}))}catch(_){}
 const admins=Array.isArray(checks.users)?checks.users.filter(x=>x.username===keep&&x.role==='admin'&&x.active):[];
 const userOk=deleteAccounts?(Array.isArray(checks.users)&&checks.users.length===1&&admins.length===1):admins.length===1;
 const dataOk=checks.localAnnouncements===0&&checks.localIncidents===0&&checks.locations===0&&checks.warehouses===0&&checks.suppliers===0&&checks.responsiblePeople===0&&checks.qrEnabled===false;
 return {ok:dataOk&&userOk,dataOk,userOk,checks}
}
async function resetYardivo(){
 if(busy)return;let keep;
 try{keep=keeper()}catch(e){alert(e.message);return}
 if(!confirm(`RESET YARDIVO — POTPUNI FACTORY ZERO\n\nBrišu se poslovni podaci: lokacije, skladišta, rampe, dobavljači, odgovorne osobe, najave, Supplier najave, incidenti, QR/Gate povijest, notifikacije, audit i app state.\n\nU sljedećem koraku biraš želiš li obrisati i korisničke accounte.\n\nAdmin / Yard Manager dujemales se NE BRIŠE.\n\nNastaviti?`))return;
 const deleteAccounts=confirm('ŽELIŠ LI OBRISATI SVE KORISNIČKE ACCOUNTE?\n\nDA = brišu se svi Auth/User accounti osim Admin / Yard Manager dujemales.\n\nNE = accounti ostaju, a poslovni sustav se svejedno vraća na 0.');
 const typed=prompt('Za konačnu potvrdu upiši točno:\nRESET YARDIVO');
 if(String(typed||'').trim().toUpperCase()!=='RESET YARDIVO')return;
 const btn=document.getElementById('yardivoResetYardivoBtn');busy=true;if(btn){btn.disabled=true;btn.textContent='RESETIRAM YARDIVO…'}
 try{
  status('1/5 · Provjeravam Admin / Yard Manager account dujemales…');
  const before=await adminInvoke('list',{}),users=Array.isArray(before)?before:(before?.users||[]);
  if(!users.some(u=>norm(u.username)===keep&&norm(u.app_role)==='admin'&&u.active!==false))throw new Error('Aktivni Admin dujemales nije pronađen. Ništa nije obrisano.');
  status('2/5 · Server Factory Zero briše poslovne podatke'+(deleteAccounts?' i druge korisničke accounte…':' · korisnički accounti ostaju…'));
  const server=await factoryResetServer(deleteAccounts);
  if(!server?.factoryZero||server?.deleteAccounts!==deleteAccounts||!Array.isArray(server?.app_state_keys)||server.app_state_keys.length!==4)throw new Error('Server nije potvrdio potpuni Factory Zero.');
  if(deleteAccounts&&server?.users!==1)throw new Error('Server nije potvrdio da je ostao samo Admin dujemales.');
  if(Number(server?.self_gate?.tokens)!==0||Number(server?.self_gate?.passes)!==0||Number(server?.self_gate?.events)!==0)throw new Error('Self Gate podaci nisu potpuno obrisani. Reset je zaustavljen radi sigurnosti.');
  status('3/5 · Čistim sav lokalni YARDIVO state i cache…');
  localHardReset(keep);
  status('4/5 · Vraćam prazan Master i SMART/QR na OFF…');
  rerenderEmpty();
  status('5/5 · Verificiram 0 poslovnih podataka'+(deleteAccounts?' i samo dujemales account…':'…'));
  const v=await verifyEmpty(keep,deleteAccounts);if(!v.ok)throw new Error('Factory Zero je pokrenut, ali završna verifikacija nije potpuno čista.');
  status(`✓ FACTORY ZERO · 0 POSLOVNIH PODATAKA · ${deleteAccounts?'SAMO DUJEMALES ACCOUNT':'ACCOUNTI SAČUVANI'}`,'ok');
  try{showYmsToast?.('success','YARDIVO FACTORY ZERO',deleteAccounts?'Sve je na 0. Ostao je samo Admin / Yard Manager dujemales.':'Sve je na 0. Korisnički accounti su sačuvani.')}catch(_){}
  alert(`YARDIVO je resetiran.\n\n0 lokacija\n0 skladišta\n0 dobavljača\n0 odgovornih osoba\n0 najava / incidenata / QR povijesti\nSMART OFF\nQR SCAN OFF\n\n${deleteAccounts?'Korisnici: obrisani svi osim Admin / Yard Manager dujemales.':'Korisnici: SAČUVANI.'}`);
 }catch(e){
  console.error('[RESET YARDIVO]',e);status('RESET NIJE ZAVRŠIO 100%: '+String(e?.message||e),'error');alert('RESET YARDIVO nije završio 100%:\n\n'+String(e?.message||e))
 }finally{busy=false;if(btn){btn.disabled=false;btn.textContent='RESET YARDIVO — VRATI SVE NA 0'}}
}
function ensureBottom(){mount();const s=document.getElementById('settings'),c=document.getElementById('yardivoDevTotalResetV583');if(s&&c&&s.lastElementChild!==c)s.appendChild(c)}
document.addEventListener('DOMContentLoaded',()=>setTimeout(ensureBottom,100));window.addEventListener('load',()=>setTimeout(ensureBottom,300),{once:true});['yardivo:login','yardivo:master-data-changed'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(ensureBottom,80)));document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="settings"],[data-home-target="settings"]'))setTimeout(ensureBottom,40)},true);
window.YardivoDevTotalResetV583={reset:resetYardivo,verify:()=>verifyEmpty(username()),mount:ensureBottom,keeper:()=>username(),build:BUILD};window.YARDIVO_DEV_BUILD=BUILD;
})();
