
(function(){
'use strict';
const KEY='yardivo_live_notifications_v1';
const CUT_KEY='yardivo_notification_clear_cutoff_v583';
const SEEN='yardivo_notification_seen_v5';
let fp='',authSession=null;

function sessionSnapshot(){
  try{
    const live=window.currentSession||null;
    if(live?.role||live?.app_role)return live;
  }catch(_){}
  return authSession||null;
}

function sessionActive(){
  try{
    const s=sessionSnapshot();
    return !!(s?.role||s?.app_role);
  }catch(e){return false}
}
function welcomeActive(){
  const s=document.getElementById('yardivoWelcomeSplash');
  return !!s && getComputedStyle(s).display!=='none' && !s.classList.contains('hide');
}
function loginActive(){
  const l=document.getElementById('loginOverlay')||document.getElementById('loginScreen');
  return !!l && getComputedStyle(l).display!=='none';
}
function authLifecycleActive(){
  try{return !!(authSession?.role||authSession?.app_role)}catch(_){return false}
}
function prelogin(){
  if(authLifecycleActive())return false;
  return welcomeActive()||loginActive()||!sessionActive();
}
function setPhaseClasses(){
  document.body.classList.toggle('yardivo-prelogin',prelogin());
  document.body.classList.toggle('yardivo-welcome-active',welcomeActive());
}
function role(){
  let r='';try{const s=sessionSnapshot()||{};r=String(s.role||s.app_role||'').toLowerCase().trim()}catch(e){}
  if(r==='prijam')r='reception';if(r==='porta'||r==='portir')r='gate';if(r==='zalihe'||r==='upravljanje zalihama')r='inventory';
  return r;
}
function usr(){try{const s=sessionSnapshot()||{};return String(s.username||s.user||role()||'anonymous')}catch(e){return'anonymous'}}
function clearCutoffMs(){
  try{
    const raw=localStorage.getItem(CUT_KEY)||'';
    const t=Date.parse(raw);
    return Number.isFinite(t)?t:0;
  }catch(e){return 0}
}
function notificationTimeMs(n){
  const raw=n?.at||n?.createdAt||n?.updatedAt||n?.timestamp||n?.timeStamp||'';
  const t=Date.parse(String(raw||''));
  return Number.isFinite(t)?t:0;
}
function afterClearCutoff(n){
  const cut=clearCutoffMs();
  if(!cut)return true;
  const t=notificationTimeMs(n);
  /* Untimestamped legacy rows are older/ambiguous after a user delete-all; do not resurrect them. */
  return !!t && t>cut;
}
function semanticDock(v){
  const raw=String(v??'').trim().toUpperCase();
  if(!raw)return'';
  const m=raw.replace(/RAMPA/g,'').replace(/^R+/,'').trim().match(/\d+/);
  if(!m)return'';
  const n=Number(m[0]);
  return Number.isFinite(n)&&n>0?String(n):'';
}
function semanticWarehouse(v){
  const raw=String(v??'').trim().toUpperCase();
  if(!raw)return'';
  try{
    const m=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');
    const rows=Array.isArray(m?.warehouses)?m.warehouses:[];
    const hit=rows.find(w=>String(w?.id||'').toUpperCase()===raw||String(w?.name||w?.code||'').toUpperCase()===raw);
    return String(hit?.id||raw).toUpperCase();
  }catch(e){return raw}
}
function isNotificationNoise(n){
  if(String(n?.event||'').toUpperCase()!=='ANNOUNCEMENT_NEWS')return false;
  if(n?.field==='dock'){
    const from=semanticDock(n?.from),to=semanticDock(n?.to);
    const rawTo=String(n?.to??'').trim().toUpperCase();
    if(!to&&/^(?:R|RAMPA\s*)?0+$/.test(rawTo))return true;
    return from===to;
  }
  if(n?.field==='warehouse')return semanticWarehouse(n?.from)===semanticWarehouse(n?.to);
  return false;
}
function filterCleared(a){
  if(!Array.isArray(a))return[];
  const map=new Map();
  for(const n of a.filter(afterClearCutoff).filter(n=>!isNotificationNoise(n))){
    const id=String(n?.id||'').trim();
    if(!id)continue;
    const prev=map.get(id);
    const t=notificationTimeMs(n),pt=prev?notificationTimeMs(prev):-1;
    if(!prev||t>=pt)map.set(id,n);
  }
  return [...map.values()];
}
function load(){try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return filterCleared(a)}catch(e){return[]}}
function save(a){
  const clean=filterCleared(a);
  localStorage.setItem(KEY,JSON.stringify(clean));
  try{if(typeof putCloudState==='function')putCloudState(KEY,JSON.stringify(clean))}catch(e){}
}
function notificationSectionAllowed(){
  const r=role();
  if(r!=='manager')return true;
  // Notifikacije are the "operations" section in the current YARDIVO navigation.
  const fn=window.yardivoManagerSectionAllowed;
  return typeof fn==='function' ? fn('operations')===true : false;
}
function eventAllowedForRole(n,r){
  if(r==='admin')return true;
  if(r==='manager')return notificationSectionAllowed();

  const e=String(n?.event||'').toUpperCase();

  // Zalihe: supplier requests + operational announcement flow + incidents/replanning.
  if(r==='inventory')return true;

  // Prijam: ne prima supplier request koji čeka odluku Zaliha.
  // Nakon odobrenja prima operativnu obavijest "NOVA NAJAVA".
  if(r==='reception'){
    const txt=String((n?.title||'')+' '+(n?.body||'')).toUpperCase();
    if(e==='SUPPLIER_REQUEST')return false;
    if(/ZAHTJEV ZA NAJAVU|NOVI ZAHTJEV DOBAVLJAČA|NOVI ZAHTJEV DOBAVLJACA/.test(txt))return false;
    return true;
  }

  // Porta notification center stays disabled by role UI.
  if(r==='gate')return false;
  return false;
}
function assignedWarehouses(){
  try{
    const s=sessionSnapshot()||{};
    const a=Array.isArray(s.warehouses)?s.warehouses:[];
    return [...new Set(a.map(x=>String(x||'').trim().toUpperCase()).filter(Boolean))];
  }catch(e){return[]}
}
function activeWh(){
  let w='';
  try{
    if(typeof getActiveWarehouse==='function')w=getActiveWarehouse();
    else if(typeof activeWarehouse!=='undefined')w=activeWarehouse;
    else w=localStorage.getItem('yardivo_active_warehouse');
  }catch(e){}
  w=String(w||'').toUpperCase().trim();
  return (w==='SVA'?'ALL':w);
}
function locationOfWarehouse(w){
  w=String(w||'').toUpperCase();
  return /^W2/.test(w)?'DU':/^W1/.test(w)?'VG':'';
}
function resolvedWarehouse(n){
  let wh=String(n?.warehouse||'').toUpperCase().trim();
  if(wh)return wh;

  /* First try linked canonical announcement. */
  if(n?.announcementId){
    try{
      const a=(Array.isArray(announcements)?announcements:[])
        .find(x=>String(x.id)===String(n.announcementId));
      wh=String(a?.warehouse||'').toUpperCase().trim();
      if(wh)return wh;
    }catch(e){}
  }

  /* Then try Supplier delivery rows known to the current client. */
  if(n?.supplierDeliveryId){
    try{
      const sid=String(n.supplierDeliveryId);
      const candidates=[];
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i)||'';
        if(!/^yardivo_supplier_portal_v549_|yardivo_supplier/i.test(k))continue;
        try{
          const x=JSON.parse(localStorage.getItem(k)||'[]');
          if(Array.isArray(x))candidates.push(...x);
        }catch(_){}
      }
      const row=candidates.find(x=>String(x?.id||x?.supplierDeliveryId||'')===sid);
      wh=String(row?.warehouse||'').toUpperCase().trim();
      if(wh)return wh;
    }catch(e){}
  }
  return '';
}

/*
 Appointment / announcement notifications are the ONLY global category for Inventory.
 Everything concerning physical truck movement is strictly active-warehouse scoped.
*/
function notificationClass(n){
  const e=String(n?.event||'').toUpperCase().trim();
  const title=String(n?.title||'').toUpperCase();
  const body=String(n?.body||'').toUpperCase();

  const operationalEvents=new Set([
    'YARD_ARRIVAL','DOCK_ARRIVAL','RECEIVED','REJECTED','YARD_DEPARTURE',
    'GATE_ARRIVAL','GATE_ENTRY','DOCK','ARRIVAL','DEPARTURE','INCIDENT','OPERATIONAL'
  ]);
  if(operationalEvents.has(e))return'OPERATIONAL';

  const announcementEvents=new Set([
    'SUPPLIER_REQUEST','SMART_APPROVAL','TERM_PROVENANCE','AUTO_REPLAN',
    'ANNOUNCEMENT','ANNOUNCEMENT_CREATED','ANNOUNCEMENT_UPDATED','ANNOUNCEMENT_NEWS',
    'SUPPLIER_PROPOSAL','SUPPLIER_ACCEPT','SUPPLIER_REJECT','RESCHEDULE',
    'TERM_CHANGE','TERM_PROPOSAL'
  ]);
  if(announcementEvents.has(e))return'ANNOUNCEMENT';

  /* Legacy notifications with meaningful text classification. */
  if(/KAMION|DVORIŠT|DVORIST|RAMPI|ZAPRIMLJEN|ODBIJEN|IZLAZ|IZAŠAO|IZASAO|DOLAZAK|ODLAZAK|INCIDENT/.test(title+' '+body))
    return'OPERATIONAL';

  if(/NAJAV|TERMIN|DOBAVLJAČ.*PRIJEDLOG|DOBAVLJAC.*PRIJEDLOG|SMART.*PRIJEDLOG|PROMJEN[AU].*TERMIN|ZAHTJEV.*TERMIN/.test(title+' '+body))
    return'ANNOUNCEMENT';

  return'OTHER';
}
function warehouseMatchesActive(n){
  const wh=resolvedWarehouse(n);
  const aw=activeWh();

  /* A concrete warehouse is mandatory for warehouse-scoped notifications. */
  if(!wh)return false;
  if(!aw||aw==='ALL')return false;
  return wh===aw;
}
function visible(n){
  const r=role();
  if(!eventAllowedForRole(n,r))return false;

  const cls=notificationClass(n);
  const wh=resolvedWarehouse(n);

  /*
   Inventory exception:
   - appointment/announcement workflow from ALL warehouses
   - operational / physical movement only active warehouse
  */
  if(r==='inventory'&&cls==='ANNOUNCEMENT'){
    return !!wh; // still require meaningful warehouse context
  }

  /*
   All roles, including Admin, are warehouse-strict for the notification center.
   No active warehouse = no warehouse notification leakage.
  */
  return warehouseMatchesActive(n);
}
function map(n){if(!n.readBy||typeof n.readBy!=='object')n.readBy={};return n.readBy}
function isRead(n){return !!map(n)[usr()]}
function all(){return load().filter(visible)}
function unreadList(){return all().filter(n=>!isRead(n))}
function unreadCount(){return unreadList().length}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function fmt(v){if(!v)return'';const d=new Date(v);return isNaN(d)?String(v):d.toLocaleString('hr-HR')}

function markRead(id,rerender=true){
  const a=load(),n=a.find(x=>String(x.id)===String(id));if(!n)return null;
  if(!isRead(n)){map(n)[usr()]=new Date().toISOString();save(a)}
  if(rerender)render();
  return n;
}
function markAll(){
  const a=load(),u=usr(),now=new Date().toISOString();
  a.forEach(n=>{if(visible(n))map(n)[u]=now});save(a);render();
}

function syncBadges(){
  const n=prelogin()?0:unreadCount();
  [document.getElementById('notifCount'),document.getElementById('opsAlertBadge')].filter(Boolean).forEach(b=>{
    const value=String(n),display=n>0?'inline-flex':'none';
    if(b.textContent!==value)b.textContent=value;
    if(b.style.getPropertyValue('display')!==display||b.style.getPropertyPriority('display')!=='important')
      b.style.setProperty('display',display,'important');
  });
  return n;
}

function reader(){
  let m=document.getElementById('yardivoNotifReaderV5');if(m)return m;
  m=document.createElement('div');m.id='yardivoNotifReaderV5';
  m.innerHTML='<div class="y5-reader" role="dialog" aria-modal="true"><div class="y5-reader-head"></div><div class="y5-reader-body"></div></div>';
  document.body.appendChild(m);
  m.onclick=e=>{if(e.target===m)closeReader()};
  return m;
}
function field(k,v){return v===undefined||v===null||v===''?'':`<div class="y5-reader-field"><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`}
function displayAnnouncementId(n){
  // Supplier-facing client_id is the public reference; SUPDEL-UUID is internal only.
  const explicit=[n?.publicAnnouncementId,n?.clientId,n?.client_id,n?.bookingNumber]
    .map(x=>String(x||'').trim()).find(x=>/^NAJ[0-9]{6}$/i.test(x));
  if(explicit)return explicit.toUpperCase();
  const sid=String(n?.supplierDeliveryId||'').trim(),raw=String(n?.announcementId||'').trim();
  if(/^NAJ[0-9]{6}$/i.test(raw))return raw.toUpperCase();
  try{
    const live=window.YardivoSupplierLiveSync?.internalRows?.()||[];
    const hit=live.find(x=>String(x?.id||'')===sid||String(x?.id||'')===raw.replace(/^SUPDEL-/,''));
    const client=String(hit?.client_id||'').trim();
    if(/^NAJ[0-9]{6}$/i.test(client))return client.toUpperCase();
  }catch(_){}
  // Do not misrepresent a technical UUID as a supplier-facing booking number.
  return '—';
}

function openReader(id,mark=true){
  const n=load().find(x=>String(x.id)===String(id));if(!n)return;
  if(mark)markRead(id,false);
  const m=reader(),h=m.querySelector('.y5-reader-head'),b=m.querySelector('.y5-reader-body');
  h.innerHTML=`<div><h3>${esc(n.title||'Notifikacija')}</h3><small>${fmt(n.at||n.createdAt)}</small></div><button type="button" class="y5-reader-close">×</button>`;
  b.innerHTML=`<div class="y5-reader-message">${esc(n.body||'')}</div><div class="y5-reader-grid">${field('Skladište',resolvedWarehouse(n))}${field('Kategorija',notificationClass(n)==='ANNOUNCEMENT'?'NAJAVA / TERMIN':notificationClass(n)==='OPERATIONAL'?'OPERATIVA':'OSTALO')}${field('Tip',n.event)}${field('Dobavljač',n.supplier)}${field('Tablice',n.plate)}${field('Broj najave',displayAnnouncementId(n))}${field('Status','PROČITANO')}</div>`;
  h.querySelector('.y5-reader-close').onclick=closeReader;
  m.classList.add('open');document.body.style.overflow='hidden';
  render();
}
function closeReader(){document.getElementById('yardivoNotifReaderV5')?.classList.remove('open');document.body.style.overflow=''}

function renderBell(){
  const list=document.getElementById('notifList');if(!list)return;
  if(prelogin()){
    if(list.innerHTML!=='')list.innerHTML='';
    list.dataset.y5BellFp='';
    return;
  }
  const a=unreadList().sort((x,y)=>String(y.at||y.createdAt||'').localeCompare(String(x.at||x.createdAt||''))).slice(0,20);
  const bellFp=JSON.stringify(a.map(n=>[
    String(n.id),String(n.title||''),String(n.body||''),resolvedWarehouse(n),String(n.at||n.createdAt||'')
  ]));
  if(list.dataset.y5BellFp===bellFp)return;

  list.innerHTML=a.length?a.map(n=>{const wh=resolvedWarehouse(n);return `<div class="notif-item y5-unread" data-y5-bell="${esc(n.id)}"><div class="notif-ico">🔔</div><div><strong>${esc(n.title||'Notifikacija')}</strong><p>${wh?`<span class="y5-notif-wh">${esc(wh)}</span> `:''}${esc(n.body||'')}</p></div><span class="notif-time">${fmt(n.at||n.createdAt)}</span></div>`}).join(''):'<div class="notif-empty">Nema novih notifikacija za odabrani kontekst.</div>';
  list.dataset.y5BellFp=bellFp;
  list.querySelectorAll('[data-y5-bell]').forEach(el=>el.onclick=e=>{
    e.preventDefault();e.stopPropagation();
    const id=el.dataset.y5Bell;
    openReader(id,true);
    list.dataset.y5BellFp='';
    renderBell();
  });
}

function operationsRoot(){
  return document.getElementById('operations')||document.querySelector('[data-view-section="operations"]');
}
function renderHistory(){
  const r=operationsRoot();if(!r)return;
  let host=document.getElementById('yardivoNotificationHistory');
  if(!host){host=document.createElement('div');host.id='yardivoNotificationHistory';r.appendChild(host)}
  if(prelogin()){
    if(host.innerHTML!=='')host.innerHTML='';
    host.dataset.y5HistoryFp='';
    return;
  }
  const a=all().sort((x,y)=>String(y.at||y.createdAt||'').localeCompare(String(x.at||x.createdAt||'')));
  const historyFp=JSON.stringify(a.map(n=>[
    String(n.id),String(n.title||''),String(n.body||''),String(n.event||''),
    String(n.supplier||''),resolvedWarehouse(n),isRead(n),String(n.at||n.createdAt||'')
  ]));
  const summary=unreadCount()+'|'+a.length+'|'+historyFp;
  if(host.dataset.y5HistoryFp===summary)return;

  host.innerHTML=`<div class="y5-notif-toolbar"><strong>${unreadCount()} nepročitanih · ${a.length} ukupno</strong><button type="button" class="action" data-y5-all>OZNAČI SVE PROČITANO</button></div>`+
    (a.length?a.map(n=>`<article class="y5-history-card ${isRead(n)?'read':'unread'}" data-y5-history="${esc(n.id)}"><div class="y5-history-head"><strong>${esc(n.title||'Notifikacija')}</strong><small>${fmt(n.at||n.createdAt)}</small></div><div class="y5-history-body">${esc(n.body||'')}</div><div class="y5-history-meta">${n.event?`<span class="y5-chip">${esc(notificationClass(n)==='ANNOUNCEMENT'?'NAJAVA / TERMIN':notificationClass(n)==='OPERATIONAL'?'OPERATIVA':'OSTALO')}</span>`:''}${n.supplier?`<span class="y5-chip">Dobavljač: ${esc(n.supplier)}</span>`:''}${resolvedWarehouse(n)?`<span class="y5-chip">${esc(resolvedWarehouse(n))}</span>`:''}<span class="y5-chip">${isRead(n)?'PROČITANO':'NOVO'}</span></div></article>`).join(''):'<div class="notif-empty">Nema notifikacija.</div>');
  host.dataset.y5HistoryFp=summary;
  host.querySelector('[data-y5-all]')?.addEventListener('click',markAll);
  host.querySelectorAll('[data-y5-history]').forEach(el=>el.onclick=()=>openReader(el.dataset.y5History,true));
}

function seen(){try{return new Set(JSON.parse(sessionStorage.getItem(SEEN)||'[]'))}catch(e){return new Set()}}
function saveSeen(s){sessionStorage.setItem(SEEN,JSON.stringify([...s].slice(-300)))}
function toast(n){
  if(prelogin())return; // absolutely no toast on Welcome or Login
  let st=document.getElementById('yardivoToastStack');if(!st){st=document.createElement('div');st.id='yardivoToastStack';document.body.appendChild(st)}
  const ua=String(n.event||'').toUpperCase()==='UNANNOUNCED_REQUEST';
  const t=document.createElement('div');t.className='y5-toast'+(ua?' ua':'');
  t.innerHTML=`<strong>${esc(ua?'NENAJAVLJEN DOBAVLJAČ':(n.title||'Nova notifikacija'))}</strong><span>${esc(n.body||'')}</span><small>${fmt(n.at||n.createdAt||new Date().toISOString())}</small>`;
  t.onclick=()=>{openReader(n.id,true);t.classList.add('out');setTimeout(()=>t.remove(),250);if(ua)setTimeout(()=>{document.querySelector('[data-view="unannounced"],[data-home-target="unannounced"]')?.click()},80)};
  st.appendChild(t);
  try{window.dispatchEvent(new CustomEvent('yardivo:visible-toast',{detail:{notification:n,source:'notification-center'}}))}catch(_){}
  setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),250)},ua?4500:3000);
}
function baselineVisible(){
  if(prelogin())return;
  const s=seen();
  all().forEach(n=>s.add(String(n.id)));
  saveSeen(s);
}
function ingest(n,{announce=true}={}){
  if(!n||!n.id)return false;
  const list=load();
  const id=String(n.id);
  /* Silent/baseline ingest must never replay later as a "new" popup. */
  if(!announce){
    const s=seen();s.add(id);saveSeen(s);
  }
  const next=[...list.filter(x=>String(x?.id)!==id),n];
  save(next);
  render();
  if(announce&&visible(n)&&!prelogin()){
    const s=seen();
    if(!s.has(id)){
      s.add(id);saveSeen(s);toast(n);
    }
  }
  return true;
}
function checkNew(){
  if(prelogin())return;
  const s=seen();
  unreadList().filter(n=>!s.has(String(n.id))).sort((a,b)=>String(a.at||a.createdAt||'').localeCompare(String(b.at||b.createdAt||''))).forEach(n=>{s.add(String(n.id));toast(n)});
  saveSeen(s);
}
function fingerprint(){return JSON.stringify(load().map(n=>[n.id,n.readBy,n.at,n.createdAt]))}
function render(){
  setPhaseClasses();
  const lab=document.getElementById('notifRoleLabel');
  if(lab){
    const aw=activeWh(),r=role();
    lab.textContent=(r==='inventory')
      ? `Najave: sva skladišta · Operativa: ${aw&&aw!=='ALL'?aw:'odaberi skladište'}`
      : `Skladište: ${aw&&aw!=='ALL'?aw:'odaberi skladište'}`;
  }
  syncBadges();
  renderBell();
  renderHistory();
  fp=fingerprint();
}

/* Disable legacy notification renderer and use existing actual bell/panel DOM. */
window.renderNotificationCenter=renderBell;
const bell=document.getElementById('notifBell'),panel=document.getElementById('notifPanel');
if(bell){
  bell.onclick=null;
  bell.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();
    if(prelogin())return;
    if(role()==='manager'&&!notificationSectionAllowed())return;
    renderBell();
    panel?.classList.toggle('open');
  },true);
}
document.getElementById('notifClose')?.addEventListener('click',()=>panel?.classList.remove('open'),true);

/* Capture old operations navigation and refresh detailed history. */
document.addEventListener('click',e=>{
  if(e.target.closest('[data-view="operations"],[data-home-target="operations"]'))setTimeout(renderHistory,30);
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeReader()});

/* Welcome/Login phase tracking: no toast and no bell there. */
window.addEventListener('load',()=>{
  setPhaseClasses();
  setTimeout(()=>{
    setPhaseClasses();
    render();
    if(!prelogin())checkNew();
  },700);
});
function commitAuthSession(e){
  authSession=e?.detail?.session||window.currentSession||authSession;
}
window.addEventListener('yardivo:login',e=>{
  commitAuthSession(e);
  try{sessionStorage.removeItem(SEEN)}catch(_){}
  setTimeout(()=>{
    setPhaseClasses();
    render();
    /* Existing unread notifications remain visible in the center/badge, but are
       baseline history for this login and must not replay as a burst of "new" toasts. */
    baselineVisible();
  },220);
});
window.addEventListener('yardivo:session-ready',e=>{
  commitAuthSession(e);
  setTimeout(()=>{setPhaseClasses();render();baselineVisible()},80);
});
['yardivo:data-synced','yardivo:online-ready'].forEach(ev=>window.addEventListener(ev,()=>{
  setTimeout(()=>{
    if(prelogin())return;
    render();
    checkNew();
  },120);
}));
/* Server-authoritative state writes emit this immediately in the active tab.
   This is the fast path for every new notification: update bell + show one
   transient right-side popup without waiting for the periodic fingerprint poll. */
window.addEventListener('yardivo:memory-state-changed',e=>{
  if(String(e?.detail?.key||'')!==KEY)return;
  setTimeout(()=>{if(prelogin())return;render();checkNew()},0);
});
window.addEventListener('storage',e=>{
  if(String(e?.key||'')!==KEY)return;
  setTimeout(()=>{if(prelogin())return;render();checkNew()},0);
});
window.addEventListener('yardivo:logout',()=>{
  authSession=null;
  try{sessionStorage.removeItem(SEEN)}catch(_){}
  try{document.getElementById('yardivoToastStack')?.replaceChildren()}catch(_){}
  try{panel?.classList.remove('open')}catch(_){}
  setPhaseClasses();
  syncBadges();
});
setInterval(()=>{
  setPhaseClasses();
  if(prelogin()){syncBadges();return}
  const now=fingerprint();
  if(now!==fp){render();checkNew()}else syncBadges();
},1200);

window.addEventListener('yardivo:warehouse-changed',()=>{
  panel?.classList.remove('open');
  setTimeout(()=>{
    render();
    /* Only toast notifications that become newly relevant AFTER this warehouse selection. */
    const s=seen();all().filter(isRead).forEach(n=>s.add(String(n.id)));saveSeen(s);
  },30);
});
document.addEventListener('change',e=>{
  const el=e.target;
  if(!el)return;
  const id=String(el.id||'').toLowerCase(),name=String(el.name||'').toLowerCase();
  if(id.includes('warehouse')||name.includes('warehouse'))setTimeout(render,50);
},true);

window.YardivoNotifications={
  load,save,ingest,markRead,markAllRead:markAll,unreadCount,render,open:openReader,
  visible,notificationClass,resolvedWarehouse,activeWarehouse:activeWh,
  visibleAll:all
};
})();
