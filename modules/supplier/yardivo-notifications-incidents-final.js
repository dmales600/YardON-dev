
(function(){
  const NOTIF_ROLES=new Set(['admin','inventory','reception','gate','supplier','manager']);

  function role(){
    let r='';
    try{r=String(currentSession?.role||window.currentSession?.role||'').toLowerCase().trim()}catch(e){}
    if(r==='zalihe'||r==='upravljanje zalihama')r='inventory';
    if(r==='management'||r==='voditelj')r='manager';
    if(r==='prijam')r='reception';
    if(r==='porta'||r==='portir')r='gate';
    return r;
  }

  function applyNotifAccess(){
    const r=role();
    if(document.body.dataset.ymsRole!==r)document.body.dataset.ymsRole=r;
    const show=r==='manager'
      ? window.yardivoManagerSectionAllowed?.('operations')===true
      : ['admin','inventory','reception'].includes(r);
    const grid=document.getElementById('homeMenuGrid');
    if(!grid||!show||grid.querySelector('[data-home-target="operations"]'))return;
    const card=document.createElement('button');
    card.className='home-menu-card';
    card.dataset.homeTarget='operations';
    card.type='button';
    card.innerHTML='<div class="home-menu-icon">🔔</div><h3>Notifikacije</h3><p>Operativne promjene, kašnjenja, ulasci, zaprimanja i incidenti.</p><div class="home-menu-open">OTVORI →</div>';
    grid.appendChild(card);
    // Navigation is delegated to YardivoRoleStableFinal; no onclick overrides.
  }

  function allAnnouncements(){
    try{reloadAnnouncementsFromPersistentStorage?.()}catch(e){}
    try{return Array.isArray(announcements)?announcements:[]}catch(e){return []}
  }

  function selectedAnnouncement(){
    const id=Number(document.getElementById('incAnnouncement')?.value||0);
    return id?allAnnouncements().find(a=>Number(a.id)===id):null;
  }

  function ensureIncidentLinkSummary(){
    const sel=document.getElementById('incAnnouncement');
    if(!sel)return null;
    let host=document.getElementById('incLinkedSummary');
    if(!host){
      host=document.createElement('div');
      host.id='incLinkedSummary';
      host.className='inc-linked-summary';
      host.style.display='none';
      sel.closest('label')?.insertAdjacentElement('afterend',host);
    }
    return host;
  }

  function syncIncidentFromAnnouncement(){
    const a=selectedAnnouncement();
    const owner=document.getElementById('incOwner');
    const supplier=document.getElementById('incSupplier');
    const wh=document.getElementById('incWarehouse');
    const host=ensureIncidentLinkSummary();

    if(!a){
      if(host)host.style.display='none';
      return;
    }

    // Requested automation: responsible person comes from the selected announcement.
    if(owner)owner.value=a.responsible||a.owner||a.responsiblePerson||'';
    if(supplier && a.supplier)supplier.value=a.supplier;
    if(wh && a.warehouse)wh.value=a.warehouse;

    if(host){
      const plate=a.plannedPlate||a.vehiclePlate||a.plate||a.registration||'—';
      host.innerHTML=`<strong>${a.supplier||'Najava'}</strong> · ${a.date||'—'} ${a.time||'—'} · R${a.dock||'—'} · ${plate}<br>Odgovorna osoba: <strong>${a.responsible||a.owner||a.responsiblePerson||'—'}</strong>`;
      host.style.display='block';
    }
  }

  function incidentCanCreate(){
    return role()==='admin'||role()==='reception';
  }

  function readPhoto(){
    return new Promise(resolve=>{
      const f=document.getElementById('incPhoto')?.files?.[0];
      if(!f)return resolve('');
      if(f.size>900000){alert('Fotografija je prevelika. Koristi sliku manju od 900 KB.');return resolve(null)}
      const r=new FileReader();r.onload=()=>resolve(r.result||'');r.onerror=()=>resolve(null);r.readAsDataURL(f);
    });
  }

  async function saveIncidentAuthoritative(){
    if(!incidentCanCreate()){
      alert('Incident mogu unijeti samo Prijam ili Admin.');
      return false;
    }

    const supplier=document.getElementById('incSupplier')?.value||'';
    const type=document.getElementById('incType')?.value||'';
    const date=document.getElementById('incDate')?.value||'';
    if(!date||!supplier||!type){
      alert('Odaberi datum, dobavljača i razlog incidenta.');
      return false;
    }

    const photo=await readPhoto();
    if(photo===null)return false;

    const announcementId=Number(document.getElementById('incAnnouncement')?.value||0)||null;
    const linked=announcementId?allAnnouncements().find(a=>Number(a.id)===announcementId):null;

    const rec={
      id:Date.now(),
      date,
      warehouse:document.getElementById('incWarehouse')?.value||linked?.warehouse||'',
      supplier,
      type,
      reason:type,
      severity:document.getElementById('incSeverity')?.value||'Srednja',
      status:document.getElementById('incStatus')?.value||'Otvoren',
      owner:document.getElementById('incOwner')?.value?.trim()||linked?.responsible||'',
      pallets:Number(document.getElementById('incPallets')?.value||0),
      sku:Number(document.getElementById('incSku')?.value||0),
      value:Number(document.getElementById('incValue')?.value||0),
      announcementId,
      note:document.getElementById('incNote')?.value?.trim()||'',
      photo,
      createdAt:new Date().toISOString(),
      createdBy:currentSession?.user||currentSession?.username||''
    };

    incidents.push(rec);
    saveIncidents();

    // Immediate live notification to Admin/Zalihe/Prijam.
    try{window.YardivoNotify?.incident?.(rec)}catch(e){}
    try{renderIncidents?.();renderOverview?.();renderNotificationCenter?.()}catch(e){}

    const form=document.getElementById('incidentForm');
    form?.reset();
    const d=document.getElementById('incDate');if(d)d.value=window.yardivoLocalDateV583();
    try{populateIncidentControls?.()}catch(e){}
    const preview=document.getElementById('incPhotoPreview');if(preview)preview.innerHTML='';
    const summary=document.getElementById('incLinkedSummary');if(summary)summary.style.display='none';

    try{showYmsToast?.('success','INCIDENT SPREMLJEN',`${supplier} · ${type}`)}catch(e){}
    return true;
  }

  // Authoritative incident submit. Capture phase prevents the old broken duplicate handlers.
  const form=document.getElementById('incidentForm');
  if(form){
    form.addEventListener('submit',e=>{
      e.preventDefault();
      e.stopImmediatePropagation();
      saveIncidentAuthoritative();
    },true);
  }

  document.getElementById('incAnnouncement')?.addEventListener('change',syncIncidentFromAnnouncement);
  document.getElementById('incAnnouncement')?.addEventListener('input',syncIncidentFromAnnouncement);

  // Keep notification access correct after every role/session change.
  window.addEventListener('yardivo:login',()=>setTimeout(applyNotifAccess,0));
  window.addEventListener('yardivo:view-opened',()=>applyNotifAccess());

  document.addEventListener('click',e=>{
    if(e.target.closest('[data-view="homeMenu"],[data-view="operations"],[data-home-target="operations"]'))setTimeout(applyNotifAccess,20);
    if(e.target.closest('[data-view="incidents"],[data-home-target="incidents"]'))setTimeout(()=>{
      syncIncidentFromAnnouncement();
      const f=document.getElementById('incidentForm');
      if(f)f.style.display=incidentCanCreate()?'':'none';
    },30);
  },true);

  window.addEventListener('load',()=>setTimeout(applyNotifAccess,100));
  window.YardivoIncidentFinal={save:saveIncidentAuthoritative,syncAnnouncement:syncIncidentFromAnnouncement};
  window.YardivoNotificationAccess={apply:applyNotifAccess,roles:[...NOTIF_ROLES]};
})();
