
(function(){
'use strict';

const BASE='https://rskticdbiovvgyocpzoc.supabase.co';
const KEY='sb_publishable_NWRcS2n-8GxF8qL7wXbZ-Q_-jIyfGoy';
const EDGE=BASE+'/functions/v1/yardivo-sync';
const ANN_KEYS=new Set(['yardivo_yms_announcements_v1']);
const INC_KEYS=new Set(['yardivo_yms_incidents_v1']);
const STATE_EXACT=new Set(['yardivo_live_notifications_v1','yardivo_master_notifications_v1']);
const OBSOLETE_STATE_KEYS=new Set([
  'studenac_announcements','yardivo_announcements','yms_announcements','yardivo_incidents',
  'yardivo_supplier_deliveries_v1','yardivo_supplier_requests_v1',
  'yardivo_supabase_offline_queue_v1','yardivo_supabase_offline_queue_v2',
  'yardivo_supabase_sync_meta_v1','yardivo_supabase_sync_meta_v2'
]);
const CLIENT_KEY='yardivo_client_id_v1';

let accessToken='',refreshToken='',tokenExp=0,ready=false,applying=false,client=null;
let dirtyAnn=false,dirtyInc=false,pushing=false,pulling=false;
let realtimeChannel=null,realtimeStatus='OFF',realtimePullTimer=0,realtimeRetryTimer=0,realtimePendingSignal=false,lastRealtimePullAt=0,lastSuccessfulPullAt=0;
const dirtyState=new Map(),timers=new Map();
let annSnapshot=new Map(),incSnapshot=new Map();

const clientId=(()=>{
  let v='';try{v=localStorage.getItem(CLIENT_KEY)||''}catch(_){}
  if(!v){v='Y-'+Date.now()+'-'+Math.random().toString(36).slice(2);try{localStorage.setItem(CLIENT_KEY,v)}catch(_){}}
  return v;
})();

function status(text,cls,detail){
  if(window.YardivoDbStatusAuthorityV583?.set)return window.YardivoDbStatusAuthorityV583.set(text,cls,detail,'sync');
  const el=document.getElementById('yardivoDbStatus');if(!el)return;el.className=cls||'';el.textContent=text||'';el.title=detail||'';
}
function clearLegacyErrors(){
  try{
    const b=document.getElementById('yardivoSyncErrorBox');if(b)b.remove();
    for(const k of ['yardivo_supabase_offline_queue_v1','yardivo_supabase_offline_queue_v2','yardivo_supabase_sync_meta_v1','yardivo_supabase_sync_meta_v2'])localStorage.removeItem(k);
  }catch(_){}
}
function errorText(e){return String(e?.message||e||'Nepoznata greška')}
function showOnlineError(where,e){
  const msg=errorText(e);
  console.error('[YARDIVO ONLINE]',where,e);
  status('↻ ONLINE BAZA · PONOVNO SPAJAM','warn',where+' — '+msg);
}
function parseJwt(t){
  try{
    const raw=(t.split('.')[1]||'').replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(atob(raw+'='.repeat((4-raw.length%4)%4)))||{};
  }catch(_){return{}}
}
function setTokens(a,r){
  accessToken=String(a||'');refreshToken=String(r||'');
  tokenExp=Number(parseJwt(accessToken)?.exp||0)*1000;
}
async function refreshAccess(){
  if(!refreshToken)throw new Error('PONOVNA PRIJAVA POTREBNA.');
  const res=await fetch(BASE+'/auth/v1/token?grant_type=refresh_token',{
    method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},
    body:JSON.stringify({refresh_token:refreshToken})
  });
  const d=await res.json().catch(()=>({}));
  if(!res.ok||!d?.access_token)throw new Error(d?.message||d?.error_description||'Obnova prijave nije uspjela.');
  setTokens(d.access_token,d.refresh_token||refreshToken);
  if(client){
    await client.auth.setSession({access_token:accessToken,refresh_token:refreshToken});
    try{await window.YardivoRealtime?.setAuth?.(accessToken)}catch(_){}
  }
}
async function token(){
  if(!accessToken)throw new Error('YARDIVO_AUTH_REQUIRED');
  if(tokenExp&&Date.now()>tokenExp-60000)await refreshAccess();
  return accessToken;
}
async function edge(action,payload={}){
  const guard=window.YardivoSupabaseBudgetGuard;
  if(guard?.blocked?.())throw new Error('SUPABASE_LIMIT_402_BACKOFF');
  const t=await token();
  const res=await fetch(EDGE,{
    method:'POST',
    headers:{apikey:KEY,Authorization:'Bearer '+t,'Content-Type':'application/json'},
    body:JSON.stringify({action,clientId,...payload})
  });
  const d=await res.json().catch(()=>({}));
  if(res.status===402){
    try{guard?.block?.()}catch(_){}
    try{await stopRealtime()}catch(_){}
    throw new Error('SUPABASE_LIMIT_402_BACKOFF');
  }
  if(!res.ok||d?.ok===false)throw new Error(d?.error||('HTTP '+res.status));
  return d;
}
function stateKey(k){
  k=String(k||'');
  if(OBSOLETE_STATE_KEYS.has(k))return false;
  try{
    if(window.YardivoBrowserlessStorageV583?.isServerKey?.(k))return true;
  }catch(_){}
  return STATE_EXACT.has(k)||/^(yardivo_manager_access_|yardivo_supplier_attachment_|yardivo_unannounced_|yardivo_incident_|yardivo_pallet_|studenac_pallet_|yardivo_ramp_|yardivo_capacity_|yardivo_replanning_)/.test(k);
}
function currentSyncRole(){
  let r='';try{r=String(window.currentSession?.role||window.currentSession?.app_role||'').toLowerCase().trim()}catch(_){}
  if(r==='management'||r==='voditelj')r='manager';
  if(r==='zalihe'||r==='upravljanje zalihama')r='inventory';
  if(r==='prijam')r='reception';
  if(r==='porta'||r==='portir')r='gate';
  return r;
}
function canWriteStateKey(k){
  k=String(k||'');const r=currentSyncRole();
  if(r==='admin')return true;
  if(r==='manager'||r==='inventory')return /^(yardivo_yms_announcements|yardivo_yms_incidents|yardivo_live_notifications|yardivo_master_notifications|yardivo_notification|yardivo_supplier_|yardivo_unannounced_|yardivo_replanning_|yardivo_auto_replan_log|yms_trucks_)/.test(k);
  if(r==='reception')return /^(yardivo_yms_announcements|yardivo_yms_incidents|yardivo_live_notifications|yardivo_master_notifications|yardivo_notification|yardivo_incident_|yardivo_pallet_|yardivo_unannounced_|yms_trucks_)/.test(k);
  if(r==='gate')return /^(yardivo_yms_announcements|yardivo_live_notifications|yardivo_master_notifications|yardivo_notification|yardivo_unannounced_|yms_trucks_)/.test(k);
  return false;
}
function parseArray(v){try{const a=JSON.parse(v||'[]');return Array.isArray(a)?a:[]}catch(_){return[]}}
function idOf(x){return String(x?.id??x?.announcement_id??x?.incident_id??'').trim()}
function currentAnnouncements(){
  let v=null;
  try{v=localStorage.getItem('yardivo_yms_announcements_v1');if(v==null)v=localStorage.getItem('yardivo_yms_announcements_v1')}catch(_){}
  return parseArray(v);
}
function currentIncidents(){
  let v=null;try{v=localStorage.getItem('yardivo_yms_incidents_v1')}catch(_){}
  return parseArray(v);
}
function mapData(items){
  const m=new Map();for(const x of items||[]){const id=idOf(x);if(id)m.set(id,JSON.stringify(x))}
  return m;
}
function diff(snapshot,items){
  const now=mapData(items),upserts=[],deletes=[];
  for(const x of items||[]){const id=idOf(x);if(id&&snapshot.get(id)!==JSON.stringify(x))upserts.push(x)}
  for(const id of snapshot.keys())if(!now.has(id))deletes.push(id);
  return {now,upserts,deletes};
}
let renderAllQueued=false;
function renderAll(){
  if(renderAllQueued)return;
  renderAllQueued=true;
  requestAnimationFrame(()=>{
    renderAllQueued=false;
    const fns=['reloadAnnouncementsFromPersistentStorage','render','renderAnnouncements','renderAnnouncementSchedule','renderReceiving','renderDailyMap','renderWeeklyMap','renderOverview','renderIncidents','renderOperationsPro','renderControlTower','renderUnannounced','renderEpal'];
    for(const n of fns){try{if(typeof window[n]==='function')window[n]()}catch(_){} }
    try{window.YardivoNotifications?.render?.()}catch(_){}
    try{window.YardivoMyYard?.render?.()}catch(_){}
    /* WebGL refresh only when its view is actually visible. */
    try{
      const my=document.getElementById('myYard');
      if(my?.classList.contains('active'))window.YardivoMyYardWebGL?.refresh?.();
    }catch(_){}
  });
}
function bootstrapSignature(d){
  try{
    const a=Array.isArray(d?.announcements)?d.announcements:[];
    const i=Array.isArray(d?.incidents)?d.incidents:[];
    const st=Array.isArray(d?.state)?d.state:[];
    return JSON.stringify([a,i,st.map(r=>[r?.key,r?.value_json,r?.updated_at,r?.deleted])]);
  }catch(_){return String(Date.now())}
}
let lastBootstrapSignature='';
function applyBootstrap(d){
 const epoch=Date.parse(localStorage.getItem('yardivo_clean_epoch_v583')||'')||0;
 const rowTs=x=>{
   const direct=x?.created_at||x?.createdAt||x?.updated_at||x?.updatedAt||'';
   let payload=null;try{payload=typeof x?.payload==='string'?JSON.parse(x.payload):x?.payload}catch(_){}
   const nested=payload?.createdAt||payload?.created_at||payload?.updatedAt||payload?.updated_at||'';
   return Date.parse(direct||nested||'')||0;
 };
 const A0=Array.isArray(d?.announcements)?d.announcements:[];
 const I0=Array.isArray(d?.incidents)?d.incidents:[];
 const A=epoch?A0.filter(x=>rowTs(x)>=epoch):A0;
 const I=epoch?I0.filter(x=>rowTs(x)>=epoch):I0;
 const S=(Array.isArray(d?.state)?d.state:[]).filter(r=>{
   if(!r?.key||!stateKey(String(r.key)))return false;
   if(!epoch)return true;
   return (Date.parse(r?.updated_at||r?.created_at||'')||0)>=epoch;
 });
 applying=true;
 try{
  Storage.prototype.setItem.call(localStorage,'yardivo_yms_announcements_v1',JSON.stringify(A));
  Storage.prototype.setItem.call(localStorage,'yardivo_yms_incidents_v1',JSON.stringify(I));
  for(const r of S){
   if(r.deleted)Storage.prototype.removeItem.call(localStorage,String(r.key));
   else Storage.prototype.setItem.call(localStorage,String(r.key),String(r.value_json??''));
  }
 }finally{applying=false}
 annSnapshot=mapData(A);incSnapshot=mapData(I);
 dirtyAnn=false;dirtyInc=false;dirtyState.clear();
 lastBootstrapSignature=bootstrapSignature({announcements:A,incidents:I,state:S});
}
async function broadcastChange(reason='data-changed'){
  try{
    if(!realtimeChannel||realtimeStatus!=='SUBSCRIBED'){
      realtimePendingSignal=true;
      try{if(ready)await startRealtime()}catch(_){}
      return false;
    }
    realtimePendingSignal=false;
    const r=await realtimeChannel.send({
      type:'broadcast',event:'data-changed',
      payload:{source:clientId,reason:String(reason||'data-changed'),ts:Date.now()}
    });
    return r==='ok'||r==='OK'||r?.status==='ok'||r===undefined;
  }catch(e){
    console.warn('[YARDIVO REALTIME] broadcast nije poslan; polling fallback ostaje aktivan.',e);
    return false;
  }
}
function requestRealtimePull(payload){
  try{if(String(payload?.payload?.source||'')===clientId)return}catch(_){}
  /* X10 realtime target: remote changes should start refreshing in tens of ms,
     while still coalescing bursts from the same transaction. */
  const now=Date.now(),wait=Math.max(35,160-(now-lastRealtimePullAt));
  clearTimeout(realtimePullTimer);
  realtimePullTimer=setTimeout(async()=>{
    lastRealtimePullAt=Date.now();
    realtimePullTimer=0;
    try{
      if(!ready)return;
      if(pending())await flush();
      const ok=await pull();
      if(!ok){
        clearTimeout(realtimeRetryTimer);
        realtimeRetryTimer=setTimeout(async()=>{
          realtimeRetryTimer=0;
          try{if(ready&&!pending())await pull()}catch(_){}
        },5000);
      }
    }catch(e){console.warn('[YARDIVO REALTIME] instant refresh fallback.',e)}
  },wait);
}
async function startRealtime(){
  if(realtimeChannel)return realtimeChannel;
  const c=await getClient();
  if(!c)return null;
  try{if(accessToken)await window.YardivoRealtime?.setAuth?.(accessToken)}catch(_){}
  realtimeStatus='CONNECTING';
  const ch=await window.YardivoRealtime.connect({
    key:'core-sync',
    topic:'yardivo-live-sync-v583-fast',
    channelOptions:{config:{broadcast:{self:false,ack:false}}},
    setup(channel){
      channel.on('broadcast',{event:'data-changed'},requestRealtimePull);
      for(const table of ['yardivo_announcements','yardivo_incidents','yardivo_app_state']){
        channel.on('postgres_changes',{event:'*',schema:'public',table},(payload)=>{
          try{
            window.dispatchEvent(new CustomEvent('yardivo:server-change',{
              detail:{table,eventType:payload?.eventType||'',ts:Date.now()}
            }));
          }catch(_){}
          requestRealtimePull({payload:{source:'server:'+table,reason:'postgres-change',ts:Date.now()}});
        });
      }
    },
    onStatus(st){
      realtimeStatus=String(st||'').toUpperCase();
      if(realtimeStatus==='SUBSCRIBED'){
        console.info('[YARDIVO REALTIME] LIVE');
        if(realtimePendingSignal)setTimeout(()=>broadcastChange('pending-sync'),0);
      }else if(realtimeStatus==='CHANNEL_ERROR'||realtimeStatus==='TIMED_OUT'){
        console.warn('[YARDIVO REALTIME]',realtimeStatus,'— 60 s safety sync ostaje aktivan.');
      }
    }
  });
  realtimeChannel=ch;
  return ch;
}
async function stopRealtime(){
  realtimeChannel=null;
  realtimeStatus='OFF';
  clearTimeout(realtimePullTimer);clearTimeout(realtimeRetryTimer);
  try{await window.YardivoRealtime?.remove?.('core-sync')}catch(_){}
}
async function pull(){
  if(!ready||pulling||pushing||dirtyAnn||dirtyInc||dirtyState.size)return false;
  pulling=true;
  try{
    const d=await edge('bootstrap');
    const sig=bootstrapSignature(d);
    if(sig!==lastBootstrapSignature){
      applyBootstrap(d);
      renderAll();
      try{window.dispatchEvent(new CustomEvent('yardivo:data-synced',{detail:{source:'online-v2',changed:true}}))}catch(_){}
    }
    lastSuccessfulPullAt=Date.now();
    status('● ONLINE BAZA · ONLINE','ok');
    return true;
  }catch(e){
    showOnlineError('UČITAVANJE',e);
    return false
  }
  finally{pulling=false}
}
async function pushAnnouncements(){
  if(!ready||!dirtyAnn)return true;
  const items=currentAnnouncements(),d=diff(annSnapshot,items);
  if(d.upserts.length)await edge('upsert_announcements',{items:d.upserts});
  if(d.deletes.length)await edge('delete_announcements',{ids:d.deletes});
  annSnapshot=d.now;dirtyAnn=false;return true;
}
async function pushIncidents(){
  if(!ready||!dirtyInc)return true;
  const role=String(window.currentSession?.role||'').toLowerCase();
  if(role==='gate'){dirtyInc=false;return true}
  const items=currentIncidents(),d=diff(incSnapshot,items);
  if(d.upserts.length)await edge('upsert_incidents',{items:d.upserts});
  if(d.deletes.length)await edge('delete_incidents',{ids:d.deletes});
  incSnapshot=d.now;dirtyInc=false;return true;
}
async function pushState(){
  const changes=[];
  for(const [k,v] of [...dirtyState.entries()]){
    if(!canWriteStateKey(k)){dirtyState.delete(k);continue}
    changes.push(v===null?{op:'delete',key:k}:{op:'set',key:k,value:v});
  }
  if(!changes.length)return true;
  await edge('mutate_state',{changes});
  for(const ch of changes)dirtyState.delete(ch.key);
  return true;
}
async function flush(){
  if(!ready||pushing)return false;
  const hadChanges=pending()>0;
  pushing=true;
  try{
    await pushAnnouncements();await pushIncidents();await pushState();
    status('● ONLINE BAZA · SVE SPREMLJENO','ok');
    if(hadChanges)setTimeout(()=>broadcastChange('sync-flush'),0);
    return true;
  }catch(e){
    showOnlineError('SPREMANJE',e);
    return false
  }
  finally{pushing=false}
}
function schedule(kind,key,value){
  if(!ready||applying)return;
  if(kind==='ann')dirtyAnn=true;
  else if(kind==='inc')dirtyInc=true;
  else if(kind==='state')dirtyState.set(key,value);
  const bucket=kind==='ann'?'ann':kind==='inc'?'inc':'state:'+key;
  clearTimeout(timers.get(bucket));
  timers.set(bucket,setTimeout(()=>{timers.delete(bucket);flush()},kind==='state'?120:80));
}
function kindFor(k){
  if(ANN_KEYS.has(k))return'ann';
  if(INC_KEYS.has(k))return'inc';
  if(stateKey(k)&&canWriteStateKey(k))return'state';
  return'';
}

const nativeSet=Storage.prototype.setItem,nativeRemove=Storage.prototype.removeItem;
Storage.prototype.setItem=function(k,v){
  const key=String(k),next=String(v);
  let same=false;
  if(this===window.localStorage&&!applying){
    try{same=this.getItem(key)===next}catch(_){}
  }
  const r=nativeSet.apply(this,arguments);
  if(this===window.localStorage&&!applying&&!same){const kind=kindFor(key);if(kind)schedule(kind,key,next)}
  return r;
};
Storage.prototype.removeItem=function(k){
  const key=String(k),kind=this===window.localStorage?kindFor(key):'';
  let existed=false;
  if(this===window.localStorage&&!applying){try{existed=this.getItem(key)!==null}catch(_){}}
  const r=nativeRemove.apply(this,arguments);
  if(this===window.localStorage&&!applying&&kind&&existed){
    if(kind==='ann'){dirtyAnn=true;schedule('ann',key,'[]')}
    else if(kind==='inc'){dirtyInc=true;schedule('inc',key,'[]')}
    else schedule('state',key,null);
  }
  return r;
};

async function getClient(){
  if(!window.YardivoSupabaseClient?.client)throw new Error('Canonical Supabase client service nije učitan.');
  const c=await window.YardivoSupabaseClient.client();
  client=c;
  if(accessToken&&refreshToken){
    const {error}=await client.auth.setSession({access_token:accessToken,refresh_token:refreshToken});
    if(error)throw error;
  }
  return client;
}

async function factoryZeroServerResetIfPending(snapshot){
  const FLAG='yardivo_factory_zero_server_pending_v583_20260911_r2';
  let pendingZero=false;try{pendingZero=localStorage.getItem(FLAG)==='1'}catch(_){}
  if(!pendingZero)return snapshot;
  const rr=String(window.currentSession?.role||'').toLowerCase().trim();
  if(rr!=='admin')return {announcements:[],incidents:[],state:[]};

  const d=snapshot||await edge('bootstrap');
  const anns=Array.isArray(d?.announcements)?d.announcements:[];
  const incs=Array.isArray(d?.incidents)?d.incidents:[];
  const states=Array.isArray(d?.state)?d.state:[];

  const annIds=anns.map(idOf).filter(Boolean);
  const incIds=incs.map(idOf).filter(Boolean);
  if(annIds.length)await edge('delete_announcements',{ids:annIds});
  if(incIds.length)await edge('delete_incidents',{ids:incIds});
  for(const row of states){
    const k=String(row?.key||'');
    if(!k||resetPreserveUserKey(k))continue;
    try{await edge('delete_state',{key:k})}catch(e){console.warn('[YARDIVO FACTORY ZERO] state',k,e)}
  }
  try{localStorage.removeItem(FLAG)}catch(_){}
  try{window.dispatchEvent(new CustomEvent('yardivo:factory-zero-server-cleared'))}catch(_){}
  return await edge('bootstrap');
}

async function authenticate(a,r){
  setTokens(a,r);clearLegacyErrors();
  const claim=parseJwt(accessToken);
  if(!claim?.sub||claim?.is_anonymous===true)throw new Error('NEVAŽEĆA ONLINE PRIJAVA.');
  const c=await getClient();if(c)await c.auth.setSession({access_token:accessToken,refresh_token:refreshToken});
  let d=await edge('bootstrap');
  if(Number(d?.version||0)<7)throw new Error('ONLINE SYNC NIJE AŽURIRAN.');
  const serverUser=String(d?.user?.username||'').toLowerCase();
  const appUser=String(window.currentSession?.username||window.currentSession?.user||'').toLowerCase();
  if(!serverUser||serverUser!==appUser)throw new Error('ONLINE PROFIL SE NE PODUDARA S PRIJAVLJENIM KORISNIKOM.');
  d=await factoryZeroServerResetIfPending(d);
  applyBootstrap(d);ready=true;lastSuccessfulPullAt=Date.now();renderAll();status('● ONLINE BAZA · ONLINE','ok');
  try{await startRealtime()}catch(e){console.warn('[YARDIVO REALTIME] nije pokrenut; polling fallback ostaje aktivan.',e)}
  try{window.dispatchEvent(new CustomEvent('yardivo:data-synced',{detail:{source:'online-v2'}}))}catch(_){}
  return true;
}
async function syncNow(){return flush()}

/* Admin-only destructive server reset. Keeps user accounts/profiles intact. */
function resetPreserveUserKey(k){
  k=String(k||'');
  return /(?:^|_)(?:user|users|user_access|profile|profiles|auth)(?:_|$)/i.test(k)
      || k==='yardivo_master_users_v1'||k==='yardivo_users'||k==='yardivo_yms_users';
}
async function resetAllExceptUsers(){
  const rr=String(window.currentSession?.role||'').toLowerCase().trim();
  if(rr!=='admin')throw new Error('Samo Admin može izvršiti potpuni reset.');
  if(!ready)throw new Error('ONLINE BAZA NIJE SPREMNA. Ponovno se prijavi i pokušaj opet.');

  /* Finish any pending write first, then take authoritative server snapshot. */
  if(pending())await flush();
  const d=await edge('bootstrap');

  const anns=Array.isArray(d?.announcements)?d.announcements:[];
  const incs=Array.isArray(d?.incidents)?d.incidents:[];
  const states=Array.isArray(d?.state)?d.state:[];

  const annIds=anns.map(idOf).filter(Boolean);
  const incIds=incs.map(idOf).filter(Boolean);
  if(annIds.length)await edge('delete_announcements',{ids:annIds});
  if(incIds.length)await edge('delete_incidents',{ids:incIds});

  for(const row of states){
    const k=String(row?.key||'');
    if(!k||resetPreserveUserKey(k))continue;
    await edge('delete_state',{key:k});
  }

  /* Known normalized server tables that are not user tables.
     RLS may block direct cleanup; Edge cleanup above remains canonical. */
  try{
    const c=await getClient();
    if(c){
      for(const table of ['yardivo_audit_log']){
        try{
          const q=await c.from(table).delete().not('id','is',null);
          if(q?.error)console.warn('[YARDIVO RESET] '+table,q.error);
        }catch(e){console.warn('[YARDIVO RESET] '+table,e)}
      }
    }
  }catch(e){console.warn('[YARDIVO RESET] audit cleanup',e)}

  annSnapshot=new Map();incSnapshot=new Map();
  dirtyAnn=false;dirtyInc=false;dirtyState.clear();
  lastBootstrapSignature='';
  try{await broadcastChange('full-reset-except-users')}catch(_){}
  return {ok:true,announcements:annIds.length,incidents:incIds.length,state:states.filter(x=>x?.key&&!resetPreserveUserKey(x.key)).length};
}
async function fullDataSnapshot(){
 const rr=String(window.currentSession?.role||'').toLowerCase().trim();
 if(rr!=='admin')throw new Error('Samo Admin može izvesti kompletne podatke.');
 if(!ready)throw new Error('ONLINE BAZA NIJE SPREMNA.');
 if(pending())await flush();
 const d=await edge('bootstrap'),client=await getClient();let audit=[];
 try{if(client){const q=await client.from('yardivo_audit_log').select('*').order('created_at',{ascending:true});if(!q?.error&&Array.isArray(q?.data))audit=q.data}}catch(e){console.warn(e)}
 return {schema:'yardivo-full-data-v1',yardivoVersion:'YARDIVO DEV V5.8.3',exportedAt:new Date().toISOString(),source:'server',announcements:Array.isArray(d?.announcements)?d.announcements:[],incidents:Array.isArray(d?.incidents)?d.incidents:[],state:Array.isArray(d?.state)?d.state:[],audit_log:audit};
}
async function restoreFullData(p){
 const rr=String(window.currentSession?.role||'').toLowerCase().trim();
 if(rr!=='admin')throw new Error('Samo Admin može vratiti kompletne podatke.');
 if(!ready)throw new Error('ONLINE BAZA NIJE SPREMNA.');
 if(!p||p.schema!=='yardivo-full-data-v1')throw new Error('Neispravan YARDIVO backup.');
 await resetAllExceptUsers();
 const a=Array.isArray(p.announcements)?p.announcements:[],i=Array.isArray(p.incidents)?p.incidents:[],st=Array.isArray(p.state)?p.state:[];
 if(a.length)await edge('upsert_announcements',{rows:a});if(i.length)await edge('upsert_incidents',{rows:i});
 for(const row of st){const k=String(row?.key||'');if(!k||resetPreserveUserKey(k))continue;await edge('put_state',{key:k,value:row?.value??''})}
 try{await broadcastChange('full-data-restore')}catch(_){} await bootstrap();
 return {ok:true,announcements:a.length,incidents:i.length,state:st.length};
}
function online(){return ready}
function pending(){return Number(dirtyAnn)+Number(dirtyInc)+dirtyState.size}

clearLegacyErrors();
const syncApi={
  owner:'services/sync.js',
  authenticate,
  syncNow,
  flush,
  flushQueue:flush,
  pull,
  fastPull:pull,
  pending,
  client:getClient,
  realtime:startRealtime,
  realtimeStatus:()=>realtimeStatus,
  broadcastChange,
  online,
  status:()=>({ready:!!ready,pending:pending(),realtime:realtimeStatus,tokenExp}),
  recover:recoverCanonicalConnection,
  resetAllExceptUsers,
  fullDataSnapshot,
  restoreFullData
};
window.YardivoSync=syncApi;
window.YardivoSupabase=syncApi;
window.YardivoOnlineSync=syncApi;
try{
  window.YardivoServerStorageStatusV583={
    online:()=>!!ready,
    pending:()=>pending(),
    browserBusinessKeys:()=>window.YardivoBrowserlessStorageV583?.browserPersistentBusinessKeys?.()||[],
    memoryBusinessKeys:()=>window.YardivoBrowserlessStorageV583?.businessKeys?.()||[],
    verify:()=>({
      online:!!ready,
      pending:pending(),
      persistentBusinessKeys:window.YardivoBrowserlessStorageV583?.browserPersistentBusinessKeys?.()||[]
    })
  };
}catch(_){}

async function recoverCanonicalConnection(){
  if(ready){
    try{await startRealtime()}catch(_){}
    if(pending())return flush();
    if(realtimeStatus==='SUBSCRIBED')return true;
    if(lastSuccessfulPullAt&&Date.now()-lastSuccessfulPullAt<60000)return true;
    return pull();
  }
  try{
    const c=await getClient();
    let ss=(await c?.auth?.getSession?.())?.data?.session||null;
    if(!ss?.access_token){
      try{ss=(await c?.auth?.refreshSession?.())?.data?.session||null}catch(_){}
    }
    if(!ss?.access_token||!ss?.refresh_token)return false;
    return await authenticate(ss.access_token,ss.refresh_token);
  }catch(e){
    showOnlineError('VEZA',e);
    return false;
  }
}
window.addEventListener('online',()=>setTimeout(()=>{recoverCanonicalConnection()},250));
window.addEventListener('focus',()=>setTimeout(()=>{recoverCanonicalConnection()},150));
window.addEventListener('pagehide',()=>{stopRealtime().catch(()=>{})},{once:true});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(()=>{recoverCanonicalConnection()},180)});
/* Realtime/Broadcast is primary. The 60 s visible-tab pulse is only a
   fallback for mobile/Edge/server writes when Realtime is unavailable.
   Focus/visibility recovery is throttled above to avoid redundant bootstraps. */
window.__yardivoFastSafetySyncTimer&&clearInterval(window.__yardivoFastSafetySyncTimer);
window.__yardivoFastSafetySyncTimer=setInterval(()=>{
  if(!ready||document.hidden||navigator.onLine===false)return;
  if(window.YardivoSupabaseBudgetGuard?.blocked?.())return;
  if(pending()){flush();return}
  /* Realtime is authoritative while connected. When it is unavailable, use a
     low-frequency safety pull; focus/online recovery above still refreshes promptly. */
  if(realtimeStatus==='SUBSCRIBED')return;
  if(lastSuccessfulPullAt&&Date.now()-lastSuccessfulPullAt<240000)return;
  pull();
},900000);

window.YardivoRealtimeLatencyV583={
  targetMs:3000,
  realtimeStatus:()=>realtimeStatus,
  pending:()=>pending(),
  force:async()=>pending()?flush():pull(),
  broadcast:(reason='manual')=>broadcastChange(reason),
  status:()=>({
    ready:!!ready,
    realtime:realtimeStatus,
    pending:pending(),
    targetMs:3000,
    safetyPulseMs:900000,
    lastPullAt:lastRealtimePullAt||0
  })
};

window.addEventListener('load',()=>{clearLegacyErrors();if(!ready)status('● ONLINE BAZA · ČEKA PRIJAVU','')},{once:true});
})();
