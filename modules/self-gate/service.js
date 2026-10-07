
(()=>{'use strict';
if(window.__YARDIVO_SELF_GATE_PASS_V1__)return;
window.__YARDIVO_SELF_GATE_PASS_V1__=true;

const BASE='https://ldzwgdwzolbvjxyznlry.supabase.co';
const PUB='sb_publishable_f3daeEDsH7zNSiFR5QluaQ_AP4Ptjzz';
const EDGE=BASE+'/functions/v1/yardivo-self-gate';
const SELF_GATE_WEB='https://dmales600.github.io/YardON-dev/self-gate/';
const DP_RE=/\[\[YARDIVO_DELIVERY_PASS_V1:([A-Za-z0-9_-]+)\]\]/g;

function role(){let r=String(window.currentSession?.app_role||window.currentSession?.role||'').toLowerCase();if(r==='porta'||r==='portir')r='gate';if(r==='prijam')r='reception';return r}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function b64u(v){const a=new TextEncoder().encode(v);let s='';a.forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64u(v){v=String(v||'').replace(/-/g,'+').replace(/_/g,'/');v+='='.repeat((4-v.length%4)%4);return new TextDecoder().decode(Uint8Array.from(atob(v),c=>c.charCodeAt(0)))}
function dpMarker(meta){return '[[YARDIVO_DELIVERY_PASS_V1:'+b64u(JSON.stringify(meta))+']]'}
function dpMeta(v){let f=null;String(v||'').replace(DP_RE,(_,p)=>{try{f=JSON.parse(unb64u(p))}catch(_e){};return _});return f}
function cleanDp(v){return String(v||'').replace(DP_RE,'').replace(/\n{3,}/g,'\n\n').trim()}
async function token(){
  const direct=String(window.__yardivoSupplierAccessToken||'').trim();if(direct)return direct;
  const c=await window.YardivoAuth?.client?.();let s=(await c?.auth?.getSession?.())?.data?.session||null;
  if(!s?.access_token)s=(await c?.auth?.refreshSession?.())?.data?.session||null;
  if(!s?.access_token)throw new Error('ONLINE PRIJAVA NIJE AKTIVNA.');
  return s.access_token;
}
async function api(action,payload={}){
  const t=await token(),r=await fetch(EDGE,{method:'POST',headers:{apikey:PUB,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({action,...payload})});
  const d=await r.json().catch(()=>({}));if(!r.ok||d?.ok===false)throw new Error(d?.error||('SELF GATE HTTP '+r.status));return d;
}
function supplierRows(){
  try{
    const s=window.currentSession||{},key='yardivo_supplier_portal_v549_'+String(s.authUserId||s.username||s.user||'supplier');
    const a=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(a)?a:[];
  }catch(_){return[]}
}
function supplierRow(id){return supplierRows().find(x=>String(x.id)===String(id))||null}
function dockMeta(row){return window.YardivoGateQrV583?.qrMetaFromRow?.(row)||null}
function box(row){
  const dock=dockMeta(row);
  if(!dock?.qrUrl)return'';
  return `<div class="yvdp-box" style="grid-template-columns:1fr">
    <div class="yvdp-item">
      <div class="yvdp-title">QR ZA RAMPU · JEDINSTVEN ZA OVU NAJAVU</div>
      <button type="button" class="btn-primary" data-yvdp-dock="${esc(row.id)}">OTVORI QR ZA RAMPU</button>
      <div style="margin-top:7px;font-size:8px;color:#7897a8;line-height:1.45">
        Dobavljač ovaj QR prosljeđuje prijevozniku. QR vrijedi samo za ovu najavu.
      </div>
    </div>
  </div>`;
}
function installSupplierBox(){
  if(!window.YardivoGateQrV583)return;
  window.YardivoGateQrV583.supplierButtons=box;
}
function openDock(id){
  const row=supplierRow(id);if(!row)return alert('Najava nije pronađena.');
  window.YardivoGateQrV583?.openQr?.(row);
}


/* ADMIN - Self Gate QR managed per LOCATION */
function wallLocation(){
  return String(document.getElementById('yqr6Location')?.value||document.getElementById('globalLocation')?.value||'');
}
function publicWallUrl(rawUrl){
  let wallToken='';
  try{wallToken=new URL(String(rawUrl||'')).searchParams.get('wall')||''}catch(_){}
  if(!wallToken)throw new Error('SELF GATE WALL TOKEN NIJE PRONAĐEN.');
  return SELF_GATE_WEB+'?wall='+encodeURIComponent(wallToken);
}
function setWallButtons(exists,busy=false){
  const create=document.getElementById('ysgWallCreate');
  const open=document.getElementById('ysgWallOpen');
  const copy=document.getElementById('ysgWallCopy');
  const regen=document.getElementById('ysgWallRegenerate');
  if(create)create.disabled=!!busy||!!exists;
  if(open)open.disabled=!!busy||!exists;
  if(copy)copy.disabled=!!busy||!exists;
  if(regen)regen.disabled=!!busy||!exists;
}
async function copyTextSafe(text){
  const value=String(text||'');
  if(!value)return false;
  if(navigator.clipboard&&window.isSecureContext&&document.hasFocus()){
    try{await navigator.clipboard.writeText(value);return true}catch(_){}
  }
  let ta=null;
  try{
    ta=document.createElement('textarea');
    ta.value=value;
    ta.setAttribute('readonly','');
    ta.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(ta);
    ta.focus();ta.select();ta.setSelectionRange(0,value.length);
    return !!(document.execCommand&&document.execCommand('copy'));
  }catch(_){return false}
  finally{try{ta?.remove()}catch(_){}}
}
function ensureWallQrModal(){
  let m=document.getElementById('yardivoSelfGateWallQrModalV2');
  if(m)return m;
  m=document.createElement('div');
  m.id='yardivoSelfGateWallQrModalV2';
  m.style.cssText='position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;background:rgba(2,8,14,.82);padding:20px';
  m.innerHTML=`<div style="width:min(560px,96vw);background:#0b2030;border:1px solid #31556a;border-radius:18px;padding:20px;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,.5)">
    <div style="font-size:18px;font-weight:1000;margin-bottom:4px">YARDIVO SELF GATE QR</div>
    <div id="ysgWallQrModalLocation" style="font-size:10px;color:#8aa8b8;margin-bottom:14px"></div>
    <div id="ysgWallQrCanvas" style="display:inline-block;padding:14px;background:#fff;border-radius:14px;max-width:100%;overflow:auto"></div>
    <div id="ysgWallQrModalUrl" style="margin-top:12px;font-size:9px;color:#88a8ba;word-break:break-all"></div>
    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:16px">
      <button type="button" class="secondary" data-wall-qr-copy>KOPIRAJ LINK</button>
      <button type="button" class="secondary" data-wall-qr-open>OTVORI CHECK-IN</button>
      <button type="button" class="primary" data-wall-qr-close>ZATVORI</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  m.querySelector('[data-wall-qr-close]').onclick=()=>{m.style.display='none'};
  m.onclick=e=>{if(e.target===m)m.style.display='none'};
  return m;
}
async function showWallQr(publicUrl,locationName){
  const m=ensureWallQrModal(),canvas=m.querySelector('#ysgWallQrCanvas');
  if(!window.QRCode)throw new Error('QR biblioteka nije učitana. Osvježi stranicu i pokušaj ponovno.');
  canvas.innerHTML='';
  new QRCode(canvas,{text:publicUrl,width:360,height:360,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
  m.querySelector('#ysgWallQrModalLocation').textContent=String(locationName||wallLocation()||'');
  m.querySelector('#ysgWallQrModalUrl').textContent=publicUrl;
  m.querySelector('[data-wall-qr-copy]').onclick=async()=>{
    const ok=await copyTextSafe(publicUrl);
    if(ok)window.showYmsToast?.('success','SELF GATE LINK KOPIRAN',String(locationName||wallLocation()||''));
    else window.prompt('Kopiraj Self Gate link:',publicUrl);
  };
  m.querySelector('[data-wall-qr-open]').onclick=()=>window.open(publicUrl,'_blank','noopener');
  m.style.display='flex';
}
function ensureWallAdmin(){
  const root=document.getElementById('yardivoQrRoleAdminV586');if(!root||role()!=='admin')return;
  let b=document.getElementById('yardivoSelfGateAdminV1');
  if(!b){
    b=document.createElement('div');b.id='yardivoSelfGateAdminV1';
    b.innerHTML=`<div style="font-size:10px;font-weight:1000;margin-bottom:7px">SELF GATE QR · PO LOKACIJI</div>
      <div style="font-size:8px;color:#829faf;margin-bottom:9px;line-height:1.55">
        Odaberi LOKACIJU iznad i izradi jedan stalni Gate QR za cijelu lokaciju. QR se izrađuje samo jednom. PORTA QR ON/OFF određuje radi li Self Gate; ako je OFF status mora biti crven.
      </div>
      <div id="ysgWallState" style="margin-bottom:9px;padding:8px 10px;border:1px solid #334b59;border-radius:9px;font-size:8px;font-weight:1000;color:#9bb7c7">PROVJERA QR-a...</div>
      <div class="ysg-admin-row" style="flex-wrap:wrap">
        <button type="button" class="primary" id="ysgWallCreate">IZRADI QR GATE ZA LOKACIJU</button>
        <button type="button" class="secondary" id="ysgWallOpen">OTVORI QR</button>
        <button type="button" class="secondary" id="ysgWallCopy">KOPIRAJ LINK</button>
        <button type="button" class="danger" id="ysgWallRegenerate">REGENERIRAJ QR</button>
      </div>
      <div style="margin-top:7px;font-size:7.5px;color:#738d9b;line-height:1.45">
        REGENERIRAJ koristi samo ako stari QR treba poništiti — tada fizički stari QR više ne vrijedi.
      </div>
      <div class="ysg-url" id="ysgWallUrl"></div>`;
    root.querySelector('.yqr6-body')?.appendChild(b);
    b.querySelector('#ysgWallCreate').onclick=()=>createWallQr(false);
    b.querySelector('#ysgWallOpen').onclick=()=>wallLink(true);
    b.querySelector('#ysgWallCopy').onclick=()=>wallLink(false);
    b.querySelector('#ysgWallRegenerate').onclick=()=>createWallQr(true);
    document.getElementById('yqr6Location')?.addEventListener('change',()=>setTimeout(loadWallQrState,0));
  }
  loadWallQrState();
}
async function loadWallQrState(){
  if(role()!=='admin')return;
  const loc=wallLocation(),st=document.getElementById('ysgWallState');
  if(!loc||!st)return;
  setWallButtons(false,true);
  st.textContent='PROVJERA QR-a...';st.style.color='#9bb7c7';st.style.borderColor='#334b59';st.style.background='transparent';
  try{
    const d=await api('wall_token_status',{location:loc});
    const c=document.getElementById('ysgWallCreate');
    const u=document.getElementById('ysgWallUrl');
    if(!d.exists){
      st.textContent='QR NE POSTOJI · '+String(d.locationName||loc);
      st.style.color='#ff9ca4';st.style.borderColor='#9e3942';st.style.background='rgba(158,57,66,.10)';
      if(c)c.textContent='IZRADI QR GATE ZA LOKACIJU';
      if(u)u.textContent='';
      setWallButtons(false,false);
    }else if(d.enabled===false){
      st.textContent='QR POSTOJI · SELF GATE ISKLJUČEN · '+String(d.locationName||loc);
      st.style.color='#ff9ca4';st.style.borderColor='#9e3942';st.style.background='rgba(158,57,66,.10)';
      if(c)c.textContent='QR VEĆ POSTOJI';
      setWallButtons(true,false);
    }else{
      st.textContent='QR AKTIVAN · '+String(d.locationName||loc);
      st.style.color='#63ef98';st.style.borderColor='rgba(79,235,135,.35)';st.style.background='rgba(43,139,86,.10)';
      if(c)c.textContent='QR VEĆ POSTOJI';
      setWallButtons(true,false);
    }
  }catch(e){
    st.textContent='GREŠKA PROVJERE QR-a · '+String(e?.message||e);
    st.style.color='#ff9ca4';st.style.borderColor='#9e3942';
    setWallButtons(false,true);
  }
}
async function createWallQr(regenerate){
  const loc=wallLocation();if(!loc)return alert('Odaberi lokaciju.');
  if(regenerate&&!confirm('Regenerirati Self Gate QR za ovu lokaciju?\n\nStari fizički QR odmah prestaje vrijediti.'))return;
  const btn=document.getElementById(regenerate?'ysgWallRegenerate':'ysgWallCreate');
  const oldText=btn?.textContent||'';
  setWallButtons(!!regenerate,true);
  if(btn)btn.textContent=regenerate?'REGENERIRAM…':'IZRAĐUJEM…';
  try{
    const d=await api(regenerate?'wall_token_regenerate':'wall_token_create',{location:loc,...(regenerate?{confirm:true}:{})});
    const publicUrl=publicWallUrl(d.url);
    const u=document.getElementById('ysgWallUrl');if(u)u.textContent=publicUrl;
    await loadWallQrState();
    window.showYmsToast?.('success',regenerate?'SELF GATE QR REGENERIRAN':'SELF GATE QR SPREMAN',String(d.locationName||loc));
    await showWallQr(publicUrl,String(d.locationName||loc));
  }catch(e){
    alert('Self Gate QR nije izrađen:\n'+(e?.message||e));
    await loadWallQrState();
  }finally{
    if(btn&&oldText&&!btn.disabled)btn.textContent=oldText;
  }
}
async function wallLink(open){
  const loc=wallLocation();if(!loc)return alert('Odaberi lokaciju.');
  const btn=document.getElementById(open?'ysgWallOpen':'ysgWallCopy');
  const oldText=btn?.textContent||'';
  if(btn){btn.disabled=true;btn.textContent=open?'OTVARAM…':'KOPIRAM…'}
  try{
    const d=await api('wall_link',{location:loc});
    const publicUrl=publicWallUrl(d.url);
    const u=document.getElementById('ysgWallUrl');if(u)u.textContent=publicUrl;
    if(open){
      await showWallQr(publicUrl,String(d.locationName||loc));
    }else{
      const ok=await copyTextSafe(publicUrl);
      if(ok)window.showYmsToast?.('success','SELF GATE LINK KOPIRAN',String(d.locationName||loc));
      else window.prompt('Kopiraj Self Gate link:',publicUrl);
    }
  }catch(e){
    if(String(e?.message||e).includes('WALL_TOKEN_NOT_FOUND'))alert('QR još nije izrađen za ovu lokaciju. Klikni "IZRADI QR GATE ZA LOKACIJU".');
    else alert('Self Gate QR nije dostupan:\n'+(e?.message||e));
  }finally{
    if(btn){btn.disabled=false;btn.textContent=oldText}
  }
}
window.__YARDIVO_SELF_GATE_ADMIN_BUTTONS_V2__=true;

/* PORTA - Self Check-In queue */
function openUnannouncedGateForm(){
  const nav=document.querySelector('[data-view="unannounced"]');
  if(nav){nav.click();setTimeout(()=>document.getElementById('uaGateCreatePanel')?.scrollIntoView({behavior:'smooth',block:'start'}),100);return}
  const sec=document.getElementById('unannounced');if(sec){sec.scrollIntoView({behavior:'smooth',block:'start'})}
}
function ensureGatePanel(){
  const body=document.querySelector('.gate-panel .gate-body');if(!body)return null;
  let p=document.getElementById('yardivoGateSelfCheckinsV1');
  if(!p){
    p=document.createElement('div');p.id='yardivoGateSelfCheckinsV1';
    p.innerHTML=`<div class="ysg-today">
      <div class="ysg-today-title">
        <div><strong>DANAŠNJE NAJAVE DOLASKA</strong><div style="font-size:8px;color:#809dad;margin-top:3px">Porta unaprijed vidi sva najavljena vozila za danas</div></div>
        <button type="button" class="secondary" id="ysgTodayRefresh">OSVJEŽI</button>
      </div>
      <div id="ysgTodayRows"><div class="meta">Učitavanje današnjih najava...</div></div>
    </div>
    <div class="ysg-head">
      <div><strong>SELF GATE CHECK-IN</strong><div style="font-size:8px;color:#809dad">Valjane najave koje čekaju odluku Porte</div></div>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        <button type="button" class="secondary ysg-unannounced-btn" id="ysgUnannounced">+ NENAJAVLJENI DOLAZAK</button>
        <button type="button" class="secondary" id="ysgRefresh">OSVJEŽI</button>
      </div>
    </div>
    <div style="font-size:8px;color:#7894a4;margin-bottom:8px;line-height:1.45">Ako Self Gate / QR ne radi, na današnjoj najavi možeš ručno kliknuti <strong>PUSTI U DVORIŠTE</strong>. Ako vozač nema najavu, koristi Nenajavljeni dolazak.</div>
    <div id="ysgRows"><div class="meta">Učitavanje...</div></div>`;
    body.insertBefore(p,body.firstChild);
    p.querySelector('#ysgRefresh').onclick=loadGate;
    p.querySelector('#ysgTodayRefresh').onclick=loadGate;
    p.querySelector('#ysgUnannounced').onclick=openUnannouncedGateForm;
  }
  return p;
}

function gateTodayAnnouncementRows(){
  const today=window.yardivoLocalDateV583?.()||new Date().toISOString().slice(0,10);
  let wh=[];
  try{if(typeof allowedWarehouses==='function')wh=(allowedWarehouses()||[]).map(String)}catch(_){}
  try{
    if(!wh.length&&Array.isArray(currentSession?.warehouses))wh=currentSession.warehouses.map(String);
  }catch(_){}
  return (Array.isArray(announcements)?announcements:[])
    .filter(a=>{
      if(String(a.date||'')!==String(today))return false;
      if(String(a.arrivalType||'').toUpperCase()==='UNANNOUNCED')return false;
      const aw=String(a.warehouse||yardivoCanonicalWarehouseV583?.()||'');
      if(wh.length&&!wh.includes(aw))return false;
      const st=String(a.status||'').toLowerCase();
      return !/odbij|otkaz|cancel/.test(st);
    })
    .sort((a,b)=>String(a.time||'99:99').localeCompare(String(b.time||'99:99')));
}
function gateAnnouncementEntered(a){
  const st=String(a?.status||'').toLowerCase();
  return !!(a?.yardArrivalAt||a?.gateCheckedAt||a?.dockArrivalAt||a?.receivedAt||/u dvori|na rampi|zaprim|završ|zavrs/.test(st));
}
function renderGateTodayRows(){
  const host=document.getElementById('ysgTodayRows');if(!host)return;
  const rows=gateTodayAnnouncementRows();
  if(!rows.length){host.innerHTML='<div class="meta">Nema najavljenih dolazaka za danas.</div>';return}
  host.innerHTML=rows.map(a=>{
    const entered=gateAnnouncementEntered(a);
    const ref=typeof announcementNumber==='function'?announcementNumber(a):(a.announcementRef||a.id||'NAJAVA');
    const whId=String(a.warehouse||'');
    const whName=window.yardivoWarehouseNameV583?.(whId)||whId||'—';
    const locName=window.yardivoWarehouseLocationNameV583?.(whId)||'';
    const plate=typeof effectivePlate==='function'?(effectivePlate(a)||''):(a.plannedPlate||a.arrivalPlate||'');
    const driver=typeof effectiveDriver==='function'?(effectiveDriver(a)||''):(a.plannedDriver||a.arrivalDriver||'');
    const when=[a.time,a.dock?`Rampa ${a.dock}`:''].filter(Boolean).join(' · ');
    return `<div class="ysg-today-row ${entered?'entered':''}">
      <div class="topline">
        <div class="ref">${esc(ref)} · ${esc(a.supplier||'Dobavljač')}</div>
        <div class="ysg-today-status">${entered?'✓ U DVORIŠTU':'NAJAVLJEN'}</div>
      </div>
      <div class="subline">${esc(locName)}${locName?' · ':''}SKLADIŠTE ${esc(whName)} · ${esc(when||'Termin nije zadan')}<br>${plate?`Tablice: ${esc(plate)}`:'Tablice nisu unesene'}${driver?` · Vozač: ${esc(driver)}`:''}${a.orderNumber?` · Narudžba: ${esc(a.orderNumber)}`:''}</div>
      ${entered?'':`<button type="button" class="primary ysg-manual-yard" data-manual-yard="${esc(a.id)}">PUSTI U DVORIŠTE</button>`}
    </div>`;
  }).join('');
}
async function manualGateEnterAnnouncement(id){
  if(!['admin','gate'].includes(role()))return;
  const a=(Array.isArray(announcements)?announcements:[]).find(x=>String(x.id)===String(id));if(!a)return alert('Najava nije pronađena.');
  if(gateAnnouncementEntered(a)){renderGateTodayRows();return}
  const ref=typeof announcementNumber==='function'?announcementNumber(a):(a.announcementRef||a.id||'NAJAVA');
  if(!confirm(`Ručno pustiti vozilo u dvorište?\n\n${ref} · ${a.supplier||''}\n${window.yardivoWarehouseNameV583?.(a.warehouse)||a.warehouse||''}`))return;
  let backendWarning='';
  try{
    await api('manual_gate_enter',{announcementId:String(a.id),parkingSlot:'P1'});
  }catch(e){backendWarning=String(e?.message||e)}
  const now=new Date(),iso=now.toISOString();
  a.status='U dvorištu';
  a.gateCheckedAt=iso;
  a.gateCheckedBy=currentSession?.user||currentSession?.username||'Porta';
  a.yardArrivalAt=a.yardArrivalAt||iso;
  a.firstArrivalAt=a.firstArrivalAt||iso;
  a.actualDate=a.actualDate||window.yardivoLocalDateV583?.()||iso.slice(0,10);
  a.actualTime=a.actualTime||now.toTimeString().slice(0,5);
  a.updatedAt=iso;
  a.updatedBy=a.gateCheckedBy;
  a.changeHistory=Array.isArray(a.changeHistory)?a.changeHistory:[];
  a.changeHistory.push({changedAt:iso,type:'MANUAL_GATE_ENTRY',changedBy:a.gateCheckedBy,note:'Porta ručno pustila vozilo u dvorište'});
  try{saveAnnouncements()}catch(_){}
  try{renderAnnouncements?.();renderYard?.();renderReceiving?.();renderOverview?.()}catch(_){}
  renderGateTodayRows();
  try{window.showYmsToast?.('success','PUŠTEN U DVORIŠTE',`${ref} · ${a.supplier||''}`)}catch(_){}
  if(backendWarning)console.warn('YARDIVO manual gate backend sync:',backendWarning);
}

let gatePopupRow=null;
function gatePopupSeenKey(x){
  return 'yardivo_gate_popup_seen_v583_'+String(x?.id||'')+'_'+String(x?.state||'')+'_'+String(x?.vehicle_plate||'')+'_'+String(x?.driver_name||'')+'_'+String(x?.updated_at||'');
}
function ensureGateDecisionPopup(){
  let m=document.getElementById('yardivoGateEntryDecisionPopupV583');if(m)return m;
  m=document.createElement('div');m.id='yardivoGateEntryDecisionPopupV583';
  m.innerHTML='<div class="ygdp-card"><div class="ygdp-head"><div><div class="ygdp-title" id="ygdpTitle">DOZVOLA ZA ULAZAK</div><div class="ygdp-sub" id="ygdpSub"></div></div><button type="button" class="ygdp-close" data-ygdp-close>×</button></div><div class="ygdp-grid" id="ygdpGrid"></div><div class="ygdp-alert" id="ygdpAlert"></div><div class="ygdp-actions" id="ygdpActions"></div></div>';
  document.body.appendChild(m);
  m.querySelector('[data-ygdp-close]').onclick=()=>{m.classList.remove('open');gatePopupRow=null};
  return m
}
function showGateDecisionPopup(x){
  if(!x||x.state!=='WAITING_GATE'||!['admin','gate'].includes(role()))return;
  const key=gatePopupSeenKey(x);
  try{if(sessionStorage.getItem(key)==='1')return;sessionStorage.setItem(key,'1')}catch(_){}
  const complete=!!String(x.vehicle_plate||'').trim()&&!!String(x.driver_name||'').trim();
  const m=ensureGateDecisionPopup();gatePopupRow=x;
  m.classList.toggle('good',complete);m.classList.toggle('bad',!complete);
  m.querySelector('#ygdpTitle').textContent=complete?'DOZVOLA ZA ULAZAK':'ULAZ NIJE SPREMAN';
  const ref=String(x.announcement_ref||x.announcement_id||'NAJAVA');
  m.querySelector('#ygdpSub').textContent=(x.supplier_name||'Dobavljač')+' · '+ref+' · '+(x.warehouse_name||x.warehouse||'');
  m.querySelector('#ygdpGrid').innerHTML=
    '<div class="ygdp-fact"><small>REGISTRACIJA</small><b>'+esc(x.vehicle_plate||'NIJE UNESENA')+'</b></div>'+
    '<div class="ygdp-fact"><small>VOZAČ</small><b>'+esc(x.driver_name||'NIJE UNESEN')+'</b></div>'+
    '<div class="ygdp-fact"><small>NARUDŽBA</small><b>'+esc(x.order_number||'OPCIONALNO / NIJE UNESENA')+'</b></div>'+
    '<div class="ygdp-fact"><small>TERMIN</small><b>'+esc(x.appointment_at?new Date(x.appointment_at).toLocaleString('hr-HR'):'—')+'</b></div>';
  const alert=m.querySelector('#ygdpAlert'),actions=m.querySelector('#ygdpActions');
  if(complete){
    alert.textContent='Podaci su uredni. Portir može odobriti ulaz; nakon odobrenja status najave postaje U DVORIŠTU.';
    actions.innerHTML='<button type="button" class="reject" data-ygdp-reject>ODBIJ ULAZ</button><button type="button" class="approve" data-ygdp-approve>ODOBRI ULAZ</button>';
    actions.querySelector('[data-ygdp-approve]').onclick=async()=>{const id=String(x.id);m.classList.remove('open');gatePopupRow=null;await decide(id,'APPROVE')};
    actions.querySelector('[data-ygdp-reject]').onclick=async()=>{const id=String(x.id);m.classList.remove('open');gatePopupRow=null;await decide(id,'REJECT')};
  }else{
    const missing=[!String(x.vehicle_plate||'').trim()?'REGISTRACIJA':'',!String(x.driver_name||'').trim()?'IME VOZAČA':''].filter(Boolean).join(' + ');
    alert.textContent='Nedostaju obavezni podaci: '+missing+'. Ulaz se NE može odobriti. Pošalji zahtjev ZALIHAMA za dopunu.';
    actions.innerHTML='<button type="button" class="inventory" data-ygdp-inventory>ZAHTJEV ZALIHAMA</button>';
    actions.querySelector('[data-ygdp-inventory]').onclick=async()=>{
      const b=actions.querySelector('[data-ygdp-inventory]');b.disabled=true;b.textContent='ŠALJEM ZAHTJEV…';
      try{
        await api('gate_request_inventory',{id:String(x.id),reason:missing});
        b.textContent='ZAHTJEV POSLAN ZALIHAMA';
        window.showYmsToast?.('success','ZAHTJEV POSLAN ZALIHAMA',missing+' · '+(x.vehicle_plate||x.supplier_name||'Najava'));
      }catch(e){b.disabled=false;b.textContent='ZAHTJEV ZALIHAMA';alert(e?.message||e)}
    };
  }
  requestAnimationFrame(()=>m.classList.add('open'))
}
function maybeShowGateDecisionPopup(rows){
  const waiting=(Array.isArray(rows)?rows:[]).filter(x=>x&&x.state==='WAITING_GATE').sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||'')));
  for(const x of waiting){
    const key=gatePopupSeenKey(x);let seen=false;try{seen=sessionStorage.getItem(key)==='1'}catch(_){}
    if(!seen){showGateDecisionPopup(x);break}
  }
}

async function loadGate(){
  if(!['admin','gate'].includes(role()))return;
  const p=ensureGatePanel();if(!p)return;
  renderGateTodayRows();
  try{
    const d=await api('list_gate'),rows=d.rows||[],host=p.querySelector('#ysgRows');
    maybeShowGateDecisionPopup(rows);
    if(!rows.length){host.innerHTML='<div class="meta">Nema aktivnih uredno najavljenih Self Gate prijava. Za kamion bez najave klikni “+ NENAJAVLJENI DOLAZAK”.</div>';return}
    host.innerHTML=rows.map(x=>{
      const ref=String(x.announcement_ref||x.announcement_id||'').trim();
      const order=String(x.order_number||'').trim();
      const wh=String(x.warehouse_name||x.warehouse||'').trim();
      const loc=String(x.location_name||'').trim();
      const when=x.appointment_at?new Date(x.appointment_at).toLocaleString('hr-HR'):'Termin nije zadan';
      const dock=String(x.dock||'').trim();
      const destination=[loc,wh].filter(Boolean).join(' · ');
      return `<div class="ysg-row ${x.state==='PROCEED_DOCK'?'go':'wait'}">
        <div class="ysg-announced">✓ UREDNO NAJAVLJEN</div>
        <div class="ysg-mainline">${esc(ref||'NAJAVA')} · ${esc(x.supplier_name||'Dobavljač')} · ${esc(x.vehicle_plate||'BEZ TABLICA')}</div>
        <div class="ysg-destination">SKLADIŠTE: ${esc(wh||'—')}${loc?` · LOKACIJA: ${esc(loc)}`:''}${x.state==='PROCEED_DOCK'&&dock?` · DODIJELJENA RAMPA: ${esc(String(dock).replace(/^R/i,''))}`:''}</div>
        <div class="meta">Vozač: ${esc(x.driver_name||'nije upisan')} · Termin: ${esc(when)}${order?` · Narudžba: ${esc(order)}`:''}<br>${esc(x.last_instruction||'')}</div>
        ${x.state==='WAITING_GATE'?`<div class="ysg-actions"><input data-gmsg="${esc(x.id)}" placeholder="Dodatna poruka vozaču (opcionalno)"><button class="primary" data-approve="${esc(x.id)}">ODOBRI ULAZ</button><button class="danger" data-reject="${esc(x.id)}">ODBIJ ULAZ</button></div>`:`<div class="ysg-actions"><span class="meta">Rampa/parking dodjeljuju se automatski prema stanju dvorišta.</span></div>`}
      </div>`;
    }).join('');
  }catch(e){p.querySelector('#ysgRows').innerHTML='<div class="meta" style="color:#ff9ca4">Greška: '+esc(e?.message||e)+'</div>'}
}
async function decide(id,decision){
  const message=document.querySelector(`[data-gmsg="${CSS.escape(id)}"]`)?.value||'';
  try{
    await api('gate_decide',{id,decision,message});
    if(decision==='APPROVE'){
      try{await window.YardivoYardDispatch?.dispatch?.('',true)}catch(_){}
    }
    await loadGate();
    window.showYmsToast?.('success',decision==='APPROVE'?'ULAZ ODOBREN · YARDON ODREĐUJE ODREDIŠTE':'ULAZ ODBIJEN',decision==='APPROVE'?'Ako je rampa slobodna vozač dobiva rampu; inače prvo slobodno parking mjesto.':'YARDIVO Delivery Pass je ažuriran.')
  }catch(e){
    const msg=String(e?.message||e);
    if(/DRIVER_INFO_REQUIRED|Nedostaju podaci/i.test(msg)){
      try{await loadGate()}catch(_){}
      alert('ULAZ NIJE MOGUĆ. Nedostaju obavezni podaci vozača. Pošalji ZAHTJEV ZALIHAMA.');
    }else alert(msg)
  }
}
async function instruct(id){
  const dock=document.querySelector(`[data-dock="${CSS.escape(id)}"]`)?.value||'';
  const message=document.querySelector(`[data-imsg="${CSS.escape(id)}"]`)?.value||'';
  try{await api('instruction',{id,dock,message});await loadGate()}catch(e){alert(e?.message||e)}
}
document.addEventListener('click',e=>{
  const q=e.target.closest?.('[data-yvdp-dock]');if(q){e.preventDefault();openDock(q.dataset.yvdpDock);return}
  const my=e.target.closest?.('[data-manual-yard]');if(my){e.preventDefault();manualGateEnterAnnouncement(my.dataset.manualYard);return}
  const ap=e.target.closest?.('[data-approve]');if(ap){decide(ap.dataset.approve,'APPROVE');return}
  const rj=e.target.closest?.('[data-reject]');if(rj){decide(rj.dataset.reject,'REJECT');return}
  const ins=e.target.closest?.('[data-instruct]');if(ins){instruct(ins.dataset.instruct);return}
},true);

function boot(){
  installSupplierBox();ensureWallAdmin();
  if(['admin','gate'].includes(role())){ensureGatePanel();loadGate()}
  try{window.YardivoSupplierRequests?.render?.()}catch(_){}
  try{window.YardivoSupplierPlannerV580?.refresh?.(true)}catch(_){}
}
['yardivo:login','yardivo:data-synced','yardivo:supplier-request-updated','yardivo:delivery-pass-issued'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(boot,120)));
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-view="settings"],[data-home-target="settings"]'))setTimeout(ensureWallAdmin,40);
  if(e.target.closest?.('[data-view="checkin"],[data-home-target="checkin"]'))setTimeout(()=>{ensureGatePanel();loadGate()},40);
},true);
/* Event listeners are primary; 30 s is only a visible-tab safety fallback. */
setInterval(()=>{if(!document.hidden&&['admin','gate'].includes(role()))loadGate()},30000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,500),{once:true});else setTimeout(boot,300);

window.YardivoDeliveryPassV1={dpMeta,cleanDp,loadGate,wallLink};
})();
