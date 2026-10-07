
(function(){
'use strict';

const ACCESS_PREFIX='yardivo_manager_access_';
const SECTION_LABELS={
 dashboard:'Dashboard',
 receiving:'Prijam',
 announcements:'Najave',
 dailyMap:'Dnevna mapa',
 weeklyMap:'Tjedna mapa',
 suppliers:'Dobavljači',
 overview:'Pregled',
 incidents:'Incidenti',
 incidentArchive:'Arhiva incidenata',
 settings:'Postavke',
 checkin:'Check-in',
 myYard:'My Yard',
 docks:'Rampe',
 operations:'Operacije',
 reports:'Izvještaji',
 controlTower:'Control Tower',
 controltower:'Control Tower',
 orderSearch:'Pretraga narudžbi',
 unannounced:'Nenajavljeni dolasci',
 epal:'EPAL',
 liveYard:'Live Yard',
 yardivoWarRoom:'War Room',
 smartReplanning:'Smart Replanning',
 aiOperations:'AI Operations',
 notifications:'Notifikacije',
 warnings:'Upozorenja',
 calendar:'Kalendar',
 heatmap:'Heatmap',
 yardivoMyAnnouncements:'Moje najave',
 weeklyDeliveries:'Tjedne isporuke',
 plannerPro:'Planner Pro'
};

function isAdmin(){
  return String(window.currentSession?.role||'').trim().toLowerCase()==='admin';
}
function aiControlEnabled(){try{const c=JSON.parse(localStorage.getItem('yardivo_auto_replan_cfg_v1')||'{}')||{};return c.enabled===true&&String(c.mode||'').toUpperCase()!=='PAUSED'}catch(_){return false}}
function esc(s){
  return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
async function invoke(action,payload={}){
  const c=await window.YardivoAuth?.client?.();
  if(!c)throw new Error('ONLINE AUTH NIJE SPREMAN.');
  const {data,error}=await c.functions.invoke('yardivo-admin-users',{body:{action,...payload}});
  if(error)throw error;
  if(data?.error)throw new Error(data.error);
  if(data && Object.prototype.hasOwnProperty.call(data,'data'))return data.data;
  return data||{};
}
function allWh(loc){
  try{
    const d=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');
    return (d.warehouses||[]).filter(w=>w&&w.active!==false&&(!loc||loc==='ALL'||String(w.location_id)===String(loc))).map(w=>w.id);
  }catch(_){return[]}
}
function locationName(loc){
  return loc==='DU'?'Lokacija 2':loc==='VG'?'Lokacija 1':'Sve lokacije';
}
function selectedWarehouses(){
  return [...document.querySelectorAll('#ymWarehouseGrid input[name="ymWarehouse"]:checked')].map(x=>x.value);
}
function selectedSections(){
  return [...document.querySelectorAll('#ymSectionGrid input[name="ymSection"]:checked')].map(x=>x.value);
}
function adminSectionCatalog(){
  const map=new Map();
  const skip=new Set(['homeMenu','home','login']);

  // CANONICAL SOURCE: Admin sidebar navigation only.
  // Internal views/modals/detail pages are intentionally excluded.
  document.querySelectorAll('.sidebar [data-view], .nav [data-view]').forEach(el=>{
    const id=String(el.dataset.view||'').trim();
    if(!id||skip.has(id)||map.has(id))return;

    let label='';
    const explicit=el.querySelector('[data-label],.nav-label,.label');
    if(explicit)label=String(explicit.textContent||'').trim();
    if(!label){
      const clone=el.cloneNode(true);
      clone.querySelectorAll('.nav-badge,[data-badge],b.badge,.badge').forEach(x=>x.remove());
      label=String(clone.textContent||'').replace(/\s+/g,' ').trim();
    }
    label=label
      .replace(/^[^A-Za-zÀ-ž0-9]+/,'')
      .replace(/\s+\d+\s*$/,'')
      .trim();

    map.set(id,{id,label:label||SECTION_LABELS[id]||id,source:'admin-nav'});
  });

  // Safety fallback for builds where sidebar is rendered after this modal opens.
  if(!map.size){
    const canonical=[
      ['dashboard','Nadzorna ploča'],
      ['controlTower','Control Tower'],
      ['checkin','Prijava dolaska'],
      ['docks','Rampe'],
      ['suppliers','Dobavljači'],
      ['orderSearch','Traži po narudžbi'],
      ['announcements','Unos najave'],
      ['receiving','Prijam robe'],
      ['dailyMap','Dnevna mapa'],
      ['weeklyMap','Tjedna mapa'],
      ['overview','Overview'],
      ['incidents','Incidenti'],
      ['operations','Notifikacije'],
      ['unannounced','Nenajavljeni dolasci'],
      ['epal','Stanje europaleta'],
      ['reports','Izvještaji'],
      ['settings','Postavke']
    ];
    canonical.forEach(([id,label])=>map.set(id,{id,label,source:'canonical-admin-nav'}));
  }

  return [...map.values()];
}
function sectionIds(){return adminSectionCatalog().map(x=>x.id)}
function renderWarehouses(){
  const host=document.getElementById('ymWarehouseGrid');
  const loc=document.getElementById('ymLocation')?.value||'VG';
  if(!host)return;
  const rows=loc==='ALL'?[...new Set([...allWh('VG'),...allWh('DU')])]:allWh(loc);
  host.innerHTML=rows.map(w=>{
    const wh=String(w);
    const place=wh.startsWith('W2')?'Lokacija 2':'Lokacija 1';
    return `<label><input name="ymWarehouse" type="checkbox" value="${esc(wh)}"><span><strong>${esc(wh)}</strong>${loc==='ALL'?`<br><small>${place}</small>`:''}</span></label>`;
  }).join('');
  const all=document.getElementById('ymAllWarehouses');
  if(all)all.checked=false;
}
function renderSections(){
  const host=document.getElementById('ymSectionGrid');if(!host)return;
  const rows=adminSectionCatalog();
  host.innerHTML=rows.map(x=>
    `<label title="${esc(x.id)}"><input name="ymSection" type="checkbox" value="${esc(x.id)}"><span>${esc(x.label)}</span></label>`
  ).join('');
  const count=document.getElementById('ymSectionCount');
  if(count)count.textContent=`${rows.length} sekcija dostupno Adminu`;
}
function ensureModal(){
  if(document.getElementById('yardivoManagerCreateModal'))return;
  document.body.insertAdjacentHTML('beforeend',`
  <div id="yardivoManagerCreateModal" aria-hidden="true">
    <div class="ym-modal" role="dialog" aria-modal="true" aria-labelledby="ymTitle">
      <div class="ym-head">
        <div><h2 id="ymTitle">NOVI VODITELJ</h2><small>Admin dodjeljuje lokaciju, skladišta i sekcije.</small></div>
        <button type="button" class="action ym-close" id="ymClose">×</button>
      </div>

      <section class="ym-step">
        <div class="ym-step-title">1 · OSNOVNI PODACI</div>
        <div class="ym-grid">
          <label>Ime i prezime<input id="ymName" autocomplete="off"></label>
          <label>Username<input id="ymUsername" autocomplete="off"></label>
          <label>Lozinka<input id="ymPassword" type="password" autocomplete="new-password"></label>
          <label>Potvrda lozinke<input id="ymPassword2" type="password" autocomplete="new-password"></label>
        </div>
      </section>

      <section class="ym-step">
        <div class="ym-step-title">2 · LOKACIJA I SKLADIŠTA</div>
        <label>Dodijeljena lokacija
          <select id="ymLocation">
            <option value="VG">Lokacija 1</option>
            <option value="DU">Lokacija 2</option>
            <option value="ALL">Sve lokacije</option>
          </select>
        </label>
        <label style="display:flex;flex-direction:row;align-items:center;gap:8px;margin-top:10px">
          <input id="ymAllWarehouses" type="checkbox" style="width:auto"> <strong>SVA SKLADIŠTA U ODABRANOJ LOKACIJI</strong>
        </label>
        <div id="ymWarehouseGrid"></div>
      </section>

      <section class="ym-step">
        <div class="ym-step-title">3 · DODIJELJENE SEKCIJE <small id="ymSectionCount" style="opacity:.7;margin-left:8px"></small></div><div style="font-size:11px;opacity:.72;margin:-2px 0 10px">Prikazane su samo stvarne top-level sekcije koje Admin ima u glavnoj navigaciji.</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px">
          <button type="button" class="action" id="ymAllSections">OZNAČI SVE</button>
          <button type="button" class="action" id="ymNoSections">PONIŠTI SVE</button>
        </div>
        <div id="ymSectionGrid"></div>
      </section>

      <div class="ym-actions">
        <button type="button" class="action" id="ymCancel">ODUSTANI</button>
        <button type="button" class="primary" id="ymCreate">KREIRAJ VODITELJA</button>
      </div>
    </div>
  </div>`);

  document.getElementById('ymLocation').onchange=renderWarehouses;
  document.getElementById('ymAllWarehouses').onchange=e=>{
    document.querySelectorAll('#ymWarehouseGrid input[name="ymWarehouse"]').forEach(x=>x.checked=e.target.checked);
  };
  document.getElementById('ymWarehouseGrid').addEventListener('change',()=>{
    const boxes=[...document.querySelectorAll('#ymWarehouseGrid input[name="ymWarehouse"]')];
    const all=document.getElementById('ymAllWarehouses');
    if(all)all.checked=boxes.length>0&&boxes.every(x=>x.checked);
  });
  document.getElementById('ymAllSections').onclick=()=>document.querySelectorAll('#ymSectionGrid input[name="ymSection"]').forEach(x=>x.checked=true);
  document.getElementById('ymNoSections').onclick=()=>document.querySelectorAll('#ymSectionGrid input[name="ymSection"]').forEach(x=>x.checked=false);
  document.getElementById('ymClose').onclick=closeModal;
  document.getElementById('ymCancel').onclick=closeModal;
  document.getElementById('yardivoManagerCreateModal').addEventListener('click',e=>{
    if(e.target.id==='yardivoManagerCreateModal')closeModal();
  });
  document.getElementById('ymCreate').onclick=createManager;
}
function openModal(){
  if(!isAdmin())return alert('Samo Admin može kreirati Voditelja.');
  ensureModal();renderWarehouses();renderSections();
  const m=document.getElementById('yardivoManagerCreateModal');
  m.classList.add('open');m.setAttribute('aria-hidden','false');
  setTimeout(()=>document.getElementById('ymName')?.focus(),20);
}
function closeModal(){
  const m=document.getElementById('yardivoManagerCreateModal');
  if(m){m.classList.remove('open');m.setAttribute('aria-hidden','true')}
}
async function persistAccess(username,profile){
  const key=ACCESS_PREFIX+username;
  localStorage.setItem(key,JSON.stringify(profile));
  // Existing online-sync interceptor sees yardivo_manager_access_* and sends it to yardivo_app_state.
  try{await window.YardivoSupabase?.flush?.()}catch(_){}
}
async function createManager(){
  if(!isAdmin())return;
  const name=(document.getElementById('ymName')?.value||'').trim();
  const username=(document.getElementById('ymUsername')?.value||'').trim().toLowerCase();
  const password=document.getElementById('ymPassword')?.value||'';
  const password2=document.getElementById('ymPassword2')?.value||'';
  const location=document.getElementById('ymLocation')?.value||'VG';
  const warehouses=selectedWarehouses();
  const sections=selectedSections();

  if(!name)return alert('Upiši ime i prezime Voditelja.');
  if(!/^[a-z0-9._-]{3,40}$/.test(username))return alert('Username mora imati najmanje 3 znaka.');
  if(password.length<8)return alert('Lozinka mora imati najmanje 8 znakova.');
  if(password!==password2)return alert('Lozinke se ne podudaraju.');
  if(fixedRole!=='admin'&&!all_warehouses&&!warehouses.length)return alert('Odaberi barem jedno skladište ili SVA SKLADIŠTA.');
  
  if(!sections.length)return alert('Odaberi barem jednu sekciju.');

  const btn=document.getElementById('ymCreate');
  btn.disabled=true;btn.textContent='KREIRAM...';
  try{
    await invoke('create',{username,password,role:'manager',location,warehouses});
    await persistAccess(username,{
      version:1,
      username,
      displayName:name,
      role:'manager',
      location,
      warehouses,
      sections,
      updatedAt:new Date().toISOString(),
      updatedBy:String(window.currentSession?.username||window.currentSession?.user||'admin')
    });
    closeModal();
    try{window.YardivoRoleStableFinal?.apply?.()}catch(_){}
    try{showYmsToast?.('success','VODITELJ KREIRAN',`${name} · ${locationName(location)} · ${warehouses.join(', ')}`)}catch(_){}
    // refresh server profile list if its function is present in the original module via button re-entry
    setTimeout(()=>document.querySelector('[data-view="settings"],[data-home-target="settings"]')?.dispatchEvent(new Event('click',{bubbles:true})),50);
  }catch(e){
    alert('Kreiranje Voditelja nije uspjelo: '+String(e?.message||e));
  }finally{
    btn.disabled=false;btn.textContent='KREIRAJ VODITELJA';
  }
}
function installLaunch(){
  if(!isAdmin())return;
  const panel=document.getElementById('masterUserAdmin');
  if(!panel||document.getElementById('ymManagerLaunch'))return;
  const head=panel.querySelector('.panel-head')||panel.firstElementChild;
  const b=document.createElement('button');
  b.id='ymManagerLaunch';b.type='button';b.className='primary';
  b.textContent='＋ NOVI VODITELJ · DODIJELI LOKACIJU, SKLADIŠTA I SEKCIJE';
  b.onclick=openModal;
  head?.insertAdjacentElement('afterend',b);

  // Selecting Voditelj in the legacy form routes Admin to the new dedicated window.
  const role=document.getElementById('muRole');
  if(role){
    role.addEventListener('change',()=>{
      if(role.value==='manager'){
        role.value='inventory';
        openModal();
      }
    });
  }
}
function managerAccess(){
  try{
    const u=String(window.currentSession?.username||window.currentSession?.user||'').trim().toLowerCase();
    const raw=u?localStorage.getItem(ACCESS_PREFIX+u):'';
    return raw?JSON.parse(raw):null;
  }catch(_){return null}
}
function enforceManagerAssignment(){
  const r=String(window.currentSession?.role||'').toLowerCase();
  if(r!=='manager')return;
  const a=managerAccess();
  const defaults=['dashboard','controlTower','aiOperations','analytics','myYard','suppliers','overview','dailyMap','weeklyMap'];
  const sections=(Array.isArray(a?.sections)&&a.sections.length)?a.sections:defaults;
  const allowed=new Set(['homeMenu',...sections]);
  document.body.dataset.yardivoManagerSections='ready';
  document.documentElement.dataset.yardivoManagerSections='ready';
  document.querySelectorAll('[data-view]').forEach(el=>{
    const ok=allowed.has(el.dataset.view)&&(el.dataset.view!=='aiOperations'||aiControlEnabled());
    el.classList.toggle('role-hidden',!ok);
    if(ok){
      el.style.removeProperty('display');el.style.removeProperty('visibility');
      el.removeAttribute('hidden');el.removeAttribute('aria-disabled');
    }else el.style.setProperty('display','none','important');
  });
  document.querySelectorAll('[data-home-target]').forEach(el=>{
    const ok=allowed.has(el.dataset.homeTarget)&&(el.dataset.homeTarget!=='aiOperations'||aiControlEnabled());
    el.classList.toggle('role-hidden',!ok);
    if(ok){
      el.style.removeProperty('display');el.style.removeProperty('visibility');
      el.removeAttribute('hidden');el.removeAttribute('aria-disabled');
      el.style.removeProperty('pointer-events');
    }else el.style.setProperty('display','none','important');
  });
}
function refresh(){
  installLaunch();
  if(String(window.currentSession?.role||'').toLowerCase()==='manager'){
    try{window.YardivoRoleStableFinal?.apply?.()}catch(_){}
    enforceManagerAssignment();
  }
}
window.YardivoManagerAssignmentV583={open:openModal,apply:enforceManagerAssignment,access:managerAccess};

window.addEventListener('yardivo:login',()=>setTimeout(refresh,120));
window.addEventListener('yardivo:data-synced',()=>setTimeout(refresh,30));
window.addEventListener('yardivo:ai-admin-config',()=>setTimeout(refresh,0));
window.addEventListener('load',()=>setTimeout(refresh,1200));
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-view="settings"],[data-home-target="settings"]'))setTimeout(installLaunch,120);
  if(String(window.currentSession?.role||'').toLowerCase()==='manager'&&e.target.closest?.('[data-view],[data-home-target]')){
    setTimeout(enforceManagerAssignment,0);
  }
},true);
/* stability: admin launch is load/click driven */
})();
