
(function(){
'use strict';

const I18N={
  hr:{
    supplierPortal:'SUPPLIER PORTAL',navNew:'NAJAVA',navHistory:'POVIJEST NAJAVA',
    navStatus:'STANJE NAJAVE I ISPORUKE',navSettings:'POSTAVKE',logout:'ODJAVA',
    newPage:'Nova najava',newSub:'Pošaljite zahtjev za termin dostave u dodijeljeno skladište.',
    historyPage:'Povijest najava',historySub:'Pregled svih prethodno poslanih najava.',
    statusPage:'Stanje najave i isporuke',statusSub:'Pratite potvrdu termina i tijek aktivne isporuke.',
    settingsPage:'Postavke',settingsSub:'Odaberite hrvatski ili engleski jezik.',
    kpiWarehouses:'DODIJELJENA SKLADIŠTA',kpiActive:'AKTIVNE NAJAVE',kpiPending:'ČEKA POTVRDU',kpiDone:'ZAVRŠENE',
    newTitle:'Nova najava dostave',newHelp:'Unesite podatke o planiranoj isporuci. Termin postaje operativan nakon potvrde.',
    location:'LOKACIJA',warehouse:'SKLADIŠTE',orderNo:'BROJ NARUDŽBE / PO',deliveryDate:'DATUM DOSTAVE',time:'ŽELJENI TERMIN',
    plate:'REGISTRACIJA VOZILA',driver:'VOZAČ',pallets:'BROJ PALETA',reference:'REFERENCA / OTPREMNICA',note:'NAPOMENA',
    submitInfo:'Dobavljač može odabrati samo skladišta koja mu je dodijelio Admin. Poslani termin mora potvrditi operativni tim.',
    clear:'OČISTI',send:'POŠALJI NAJAVU',historyTitle:'Povijest najava',
    historyHelp:'Pregled svih najava koje ste poslali kroz Supplier portal.',id:'ID',dateTerm:'DATUM / TERMIN',
    status:'STATUS',dock:'RAMPA',statusTitle:'Stanje najave i isporuke',
    statusHelp:'Pratite potvrdu termina i operativni status svake aktivne isporuke.',
    settingsTitle:'Postavke',settingsHelp:'Prilagodite jezik sučelja i veličinu teksta Supplier portala.',
    language:'JEZIK SUČELJA',languageHelp:'Promjena jezika primjenjuje se odmah.',
    pending:'Čeka potvrdu',confirmed:'Potvrđeno',done:'Završeno',noHistory:'Još nema poslanih najava.',
    noActive:'Nema aktivnih isporuka.',created:'Najava je spremljena u Supplier portalu.',
    required:'Obavezno unesi broj narudžbe 6W..., skladište, datum, termin i broj paleta.',orderInvalid:'Broj narudžbe mora počinjati s 6W.',palletsInvalid:'Broj paleta mora biti najmanje 1.',vehicleSaved:'Podaci o vozilu i vozaču su spremljeni.',dockUnknown:'Nije dodijeljena',
    stepRequest:'Najava',stepConfirmed:'Potvrda',stepArrival:'Dolazak',stepDock:'Rampa',stepReceiving:'Zaprimanje',stepDone:'Završeno',vehicleDriver:'VOZILO / VOZAČ',textSize:'VELIČINA TEKSTA',textSizeHelp:'Povećaj ili smanji tekst kroz cijeli Supplier portal.'
  },
  en:{
    supplierPortal:'SUPPLIER PORTAL',navNew:'ANNOUNCEMENT',navHistory:'ANNOUNCEMENT HISTORY',
    navStatus:'ANNOUNCEMENT & DELIVERY STATUS',navSettings:'SETTINGS',logout:'LOG OUT',
    newPage:'New announcement',newSub:'Request a delivery appointment for an assigned warehouse.',
    historyPage:'Announcement history',historySub:'Review all previously submitted announcements.',
    statusPage:'Announcement & delivery status',statusSub:'Track appointment confirmation and active delivery progress.',
    settingsPage:'Settings',settingsSub:'Choose Croatian or English.',
    kpiWarehouses:'ASSIGNED WAREHOUSES',kpiActive:'ACTIVE ANNOUNCEMENTS',kpiPending:'AWAITING CONFIRMATION',kpiDone:'COMPLETED',
    newTitle:'New delivery announcement',newHelp:'Enter the planned delivery details. The appointment becomes operational after confirmation.',
    location:'LOCATION',warehouse:'WAREHOUSE',orderNo:'PURCHASE ORDER / PO',deliveryDate:'DELIVERY DATE',time:'REQUESTED TIME',
    plate:'VEHICLE REGISTRATION',driver:'DRIVER',pallets:'NUMBER OF PALLETS',reference:'REFERENCE / DELIVERY NOTE',note:'NOTE',
    submitInfo:'Suppliers can select only warehouses assigned by Admin. The requested appointment must be confirmed by the operations team.',
    clear:'CLEAR',send:'SUBMIT ANNOUNCEMENT',historyTitle:'Announcement history',
    historyHelp:'Review all announcements submitted through the Supplier portal.',id:'ID',dateTerm:'DATE / TIME',
    status:'STATUS',dock:'DOCK',statusTitle:'Announcement & delivery status',
    statusHelp:'Track appointment confirmation and the operational status of each active delivery.',
    settingsTitle:'Settings',settingsHelp:'Customize the Supplier portal language and text size.',
    language:'INTERFACE LANGUAGE',languageHelp:'The language change is applied immediately.',
    pending:'Awaiting confirmation',confirmed:'Confirmed',done:'Completed',noHistory:'No announcements have been submitted yet.',
    noActive:'No active deliveries.',created:'Announcement saved in the Supplier portal.',
    required:'Enter a 6W... purchase order, warehouse, date, time and pallet count.',orderInvalid:'Purchase order must start with 6W.',palletsInvalid:'Pallet count must be at least 1.',vehicleSaved:'Vehicle and driver details were saved.',dockUnknown:'Not assigned',
    stepRequest:'Request',stepConfirmed:'Confirmed',stepArrival:'Arrival',stepDock:'Dock',stepReceiving:'Receiving',stepDone:'Completed',vehicleDriver:'VEHICLE / DRIVER',textSize:'TEXT SIZE',textSizeHelp:'Increase or decrease text across the entire Supplier portal.'
  }
};

let lang='hr';
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function session(){
  try{return (typeof currentSession!=='undefined'?currentSession:window.currentSession)||{}}
  catch(e){return window.currentSession||{}}
}
function role(){return String(session().role||'').toLowerCase()}
function storageKey(){
  const s=session();
  return 'yardivo_supplier_portal_v549_'+String(s.authUserId||s.username||s.user||'supplier');
}
function languageKey(){
  const s=session();
  return 'yardivo_supplier_language_v549_'+String(s.authUserId||s.username||s.user||'supplier');
}
function loadRows(){
  try{
    const x=JSON.parse(localStorage.getItem(storageKey())||'[]');
    return Array.isArray(x)?x:[];
  }catch(e){return[]}
}
function saveRows(rows){
  localStorage.setItem(storageKey(),JSON.stringify(rows.slice(-300)));
}
function t(k){return I18N[lang]?.[k]||I18N.hr[k]||k}
function labelStatus(v){
  const s=String(v||'').toLowerCase();
  if(s==='completed'||s==='završeno'||s==='zavrseno')return t('done');
  if(s==='confirmed'||s==='potvrđeno'||s==='potvrdeno')return t('confirmed');
  if(s==='revision_requested')return lang==='en'?'Correction requested':'Vraćeno na doradu';
  if(s==='rejected')return lang==='en'?'Rejected':'Odbijeno';
  if(s==='arrival')return lang==='en'?'Arrived':'Stigao';
  if(s==='dock')return lang==='en'?'At dock':'Na rampi';
  if(s==='receiving')return lang==='en'?'Receiving':'Zaprimanje';
  return t('pending');
}
function whLabel(code){
  try{
    const m=supplierMaster();
    const w=(Array.isArray(m.warehouses)?m.warehouses:[]).find(x=>String(x?.id||'').toUpperCase()===String(code||'').toUpperCase());
    return String(w?.name||'Skladište');
  }catch(e){return 'Skladište'}
}
function setLang(next){
  lang=next==='en'?'en':'hr';
  try{localStorage.setItem(languageKey(),lang)}catch(e){}
  document.querySelectorAll('#yardivoSupplierPortal [data-i18n]').forEach(el=>{
    const k=el.getAttribute('data-i18n');
    if(I18N[lang]?.[k])el.textContent=I18N[lang][k];
  });
  document.querySelectorAll('#yardivoSupplierPortal [data-lang]').forEach(b=>{
    b.classList.toggle('active',b.dataset.lang===lang);
  });
  const active=document.querySelector('#yardivoSupplierPortal .ysp-nav button.active')?.dataset.yspView||'new';
  setPageText(active);
  render();
}
function setPageText(view){
  const map={
    new:['newPage','newSub'],
    history:['historyPage','historySub'],
    status:['statusPage','statusSub'],
    settings:['settingsPage','settingsSub']
  };
  const pair=map[view]||map.new;
  document.getElementById('yspTitle').textContent=t(pair[0]);
  document.getElementById('yspSubtitle').textContent=t(pair[1]);
}
function show(view){
  document.querySelectorAll('#yardivoSupplierPortal [data-ysp-view]').forEach(b=>b.classList.toggle('active',b.dataset.yspView===view));
  document.querySelectorAll('#yardivoSupplierPortal [data-ysp-section]').forEach(s=>s.classList.toggle('active',s.dataset.yspSection===view));
  setPageText(view);
  render();
}
function supplierMaster(){
  try{const m=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');return {locations:Array.isArray(m.locations)?m.locations:[],warehouses:Array.isArray(m.warehouses)?m.warehouses:[]}}
  catch(_){return {locations:[],warehouses:[]}}
}
function currentLocations(){
  const s=session(),m=supplierMaster();
  const assignedWh=new Set((Array.isArray(s.warehouses)?s.warehouses:[]).map(x=>String(x||'').trim().toUpperCase()).filter(Boolean));
  const allowedWh=m.warehouses.filter(w=>w&&w.active!==false&&(String(s.location||'').toUpperCase()==='ALL'||assignedWh.has(String(w.id||'').toUpperCase())));
  const allowedLocIds=new Set(allowedWh.map(w=>String(w.location_id||'')).filter(Boolean));
  if(String(s.location||'').toUpperCase()!=='ALL'&&s.location)allowedLocIds.add(String(s.location));
  return m.locations.filter(l=>l&&l.active!==false&&allowedLocIds.has(String(l.id||'')));
}
function currentWarehouses(locationId){
  const s=session(),m=supplierMaster();
  const assigned=new Set((Array.isArray(s.warehouses)?s.warehouses:[]).map(x=>String(x).trim().toUpperCase()).filter(Boolean));
  return m.warehouses.filter(w=>w&&w.active!==false&&(!locationId||String(w.location_id||'')===String(locationId))&&(String(s.location||'').toUpperCase()==='ALL'?assigned.has(String(w.id||'').toUpperCase()):assigned.has(String(w.id||'').toUpperCase()))).map(w=>String(w.id||'').toUpperCase()).filter(Boolean);
}
function renderLocations(){
  const el=document.getElementById('yspLocation');if(!el)return;
  const keep=el.value;const rows=currentLocations();
  el.innerHTML='<option value="">— ODABERI LOKACIJU —</option>'+rows.map(l=>`<option value="${escapeHtml(l.id)}">${escapeHtml(l.name||l.id)}</option>`).join('');
  if(keep&&rows.some(l=>String(l.id)===keep))el.value=keep;
  else if(rows.length===1)el.value=String(rows[0].id);
}
function renderWarehouses(){
  const el=document.getElementById('yspWarehouse'); if(!el)return;
  const locationId=document.getElementById('yspLocation')?.value||'';
  const keep=el.value;
  if(!locationId){el.disabled=true;el.innerHTML='<option value="">— PRVO ODABERI LOKACIJU —</option>';return}
  const rows=currentWarehouses(locationId);
  el.disabled=!rows.length;
  el.innerHTML='<option value="">— ODABERI SKLADIŠTE —</option>'+rows.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(whLabel(c))}</option>`).join('');
  if(keep&&rows.includes(String(keep).toUpperCase()))el.value=keep;
  else if(rows.length===1)el.value=rows[0];
}
async function hydrateSupplierMaster(){
  try{if(window.YardivoSupabase?.fastPull)await window.YardivoSupabase.fastPull()}catch(_){}
  renderLocations();renderWarehouses();
}

function renderHistory(){
  const body=document.getElementById('yspHistoryBody'); if(!body)return;
  const rows=loadRows().slice().reverse();
  if(!rows.length){
    body.innerHTML=`<tr><td colspan="7"><div class="ysp-empty">${escapeHtml(t('noHistory'))}</div></td></tr>`;
    return;
  }
  body.innerHTML=rows.map(x=>`
    <tr>
      <td><strong>${escapeHtml(window.YardivoAnnouncementNumberV583?.displayId?.(x.id)||x.id)}</strong></td>
      <td>${escapeHtml(x.date)} · ${escapeHtml(x.time)}</td>
      <td>${escapeHtml(whLabel(x.warehouse))}</td>
      <td>${escapeHtml(x.order||'—')}</td>
      <td><span class="status ${String(x.status).toLowerCase()==='completed'?'done':'wait'}">${escapeHtml(labelStatus(x.status))}</span></td>
      <td>${escapeHtml(x.dock||t('dockUnknown'))}</td>
      <td><button type="button" class="btn-secondary" data-ysp-edit-vehicle="${escapeHtml(x.id)}">${escapeHtml(x.plate||x.driver?'UREDI':'NAKNADNO DODAJ')}</button>${window.YardivoGateQrV583?.supplierButtons?.(x)||''}</td>
    </tr>`).join('');
}
function progressIndex(x){
  const s=String(x.status||'').toLowerCase();
  if(s==='completed')return 5;
  if(s==='receiving')return 4;
  if(s==='dock')return 3;
  if(s==='arrival')return 2;
  if(s==='confirmed')return 1;
  return 0;
}
function renderStatus(){
  const host=document.getElementById('yspStatusList');if(!host)return;
  const deliveries=loadRows().slice();
  if(!deliveries.length){host.innerHTML='<div class="ysph-empty">Još nema najava ni isporuka u YardOn bazi.</div>';return}
  const labels=['NAJAVA','POTVRDA','DOLAZAK','RAMPA','ZAPRIMANJE','ZAVRŠENO'];
  host.innerHTML=deliveries.map(x=>{
    const idx=progressIndex(x.status);
    const qr=x.qrUrl?'<div class="ysps-qr-live"><div class="ysps-qr-canvas" data-yv-server-qr-canvas="'+esc(x.id)+'"></div><div class="ysps-qr-copy"><strong>▣ QR DOCK JE SPREMAN</strong><p>Ovaj QR Dock pošalji vozaču za potvrdu na Docku / Prijamu. Gate Check-In se radi posebnim QR-om na ulazu.</p><div class="ysps-qr-actions"><button type="button" class="btn-primary" data-yv-server-qr-open="'+esc(x.id)+'">OTVORI QR</button><button type="button" class="btn-secondary" data-yv-server-qr-pdf="'+esc(x.id)+'">PREUZMI QR · PDF</button></div></div></div>':'<div class="ysps-noqr">QR Dock još nije izdan od strane YardOn zaliha.</div>';
    const editable=!terminal.has(statusKey(x.status));
    const editor=editable?'<details class="ysps-edit"><summary>UREDI VOZILO / VOZAČA</summary><div class="ysps-edit-grid">'+
      '<label>REGISTRACIJA VOZILA<input data-yv-supplier-plate="'+esc(x.id)+'" value="'+esc(x.plate)+'" placeholder="npr. ZG1234AB"></label>'+
      '<label>REGISTRACIJA PRIKOLICE<input data-yv-supplier-trailer="'+esc(x.id)+'" value="'+esc(x.trailer)+'"></label>'+
      '<label>IME I PREZIME VOZAČA<input data-yv-supplier-driver="'+esc(x.id)+'" value="'+esc(x.driver)+'"></label>'+
      '<label>KONTAKT VOZAČA<input data-yv-supplier-contact="'+esc(x.id)+'" value="'+esc(x.driverContact)+'"></label>'+
      '</div><div class="ysps-edit-actions"><button type="button" class="btn-primary" data-yv-supplier-save-vehicle="'+esc(x.id)+'">SPREMI PODATKE</button></div></details>':
      '<div class="ysps-terminal-note">Isporuka je zaključena. Podaci vozila više se ne mijenjaju kroz Supplier portal.</div>';
    return '<article class="ysps-card">'+
      '<div><div class="ysps-title"><strong>'+esc(window.YardivoAnnouncementNumberV583?.displayId?.(x.id)||x.id)+' · '+esc(x.order||'BEZ PO')+'</strong><span class="ysph-status '+statusClass(x.status)+'">'+esc(statusLabel(x.status))+'</span></div>'+
      '<div class="ysps-grid">'+
        '<div class="ysps-fact"><small>SKLADIŠTE</small><b>'+esc(whLabel(x.warehouse))+'</b></div>'+
        '<div class="ysps-fact"><small>DATUM / TERMIN</small><b>'+esc(x.date||'—')+' · '+esc(x.time||'—')+'</b></div>'+
        '<div class="ysps-fact"><small>RAMPA</small><b>'+esc(x.dock?(/^R/i.test(x.dock)?x.dock:'R'+x.dock):'NIJE DODIJELJENA')+'</b></div>'+
        '<div class="ysps-fact"><small>PALETE / SKU</small><b>'+esc(x.pallets)+' / '+esc(x.sku)+'</b></div>'+
        '<div class="ysps-fact"><small>VOZILO</small><b>'+esc(x.plate||'—')+(x.trailer?' · '+esc(x.trailer):'')+'</b></div>'+
        '<div class="ysps-fact"><small>VOZAČ</small><b>'+esc(x.driver||'—')+(x.driverContact?' · '+esc(x.driverContact):'')+'</b></div>'+
      '</div>'+(x.review?'<div class="ysps-review" style="margin-top:10px">YardOn: '+esc(x.review)+'</div>':'')+editor+'</div>'+
      '<div class="ysps-side">'+qr+'<div class="ysps-timeline">'+labels.map((l,i)=>'<div class="ysps-step '+(i<=idx?'done':'')+'"><i></i>'+l+'</div>').join('')+'</div></div>'+
    '</article>'
  }).join('');
  requestAnimationFrame(()=>{
    host.querySelectorAll('[data-yv-server-qr-canvas]').forEach(el=>{
      const x=rowByRawId(el.dataset.yvServerQrCanvas);
      if(x?.qrUrl)renderQrInto(el,x.qrUrl,260)
    })
  })
}
function renderKpis(){
  const rows=loadRows();
  document.getElementById('yspKpiWh').textContent=currentWarehouses().length;
  document.getElementById('yspKpiActive').textContent=rows.filter(x=>String(x.status).toLowerCase()!=='completed').length;
  document.getElementById('yspKpiPending').textContent=rows.filter(x=>String(x.status).toLowerCase()==='pending').length;
  document.getElementById('yspKpiDone').textContent=rows.filter(x=>String(x.status).toLowerCase()==='completed').length;
}
function render(){
  renderLocations();renderWarehouses();renderHistory();renderStatus();renderKpis();
}
function clearForm(){
  ['yspOrder','yspDate','yspTime','yspDock','yspPlate','yspTrailerPlate','yspDriver','yspDriverContact','yspPallets','yspSkuCount','yspReference','yspNote'].forEach(id=>{
    const e=document.getElementById(id); if(e)e.value='';
  });
}
function upsertCanonicalYardivoFromSupplier(row){
  try{
    if(typeof announcements==='undefined'||!Array.isArray(announcements)||typeof saveAnnouncements!=='function')return;
    const found=announcements.find(a=>String(a.supplierPortalId||'')===String(row.id));
    const s=session();
    const supplierName=String(s.supplier_name||s.supplierName||s.username||s.user||'Supplier');
    const base={
      supplierPortalId:row.id,
      supplierSource:'supplier_portal',
      supplier:supplierName,
      date:row.date,
      time:row.time,
      warehouse:row.warehouse,
      orderNumber:row.order,
      pallets:Number(row.pallets||0),
      plannedPlate:row.plate||'',
      plannedDriver:row.driver||'',
      reference:row.reference||'',
      supplierNote:row.note||'',
      status:(()=>{
        const s=String(row.status||'').toLowerCase();
        if(s==='completed')return 'Zaprimljeno';
        if(s==='rejected')return 'Odbijen';
        if(s==='dock'||s==='receiving')return 'Na rampi';
        if(s==='arrival')return 'U dvorištu';
        if(s==='confirmed')return 'U dolasku';
        return 'Čeka potvrdu';
      })(),
      supplierRequestedAt:row.createdAt,
      updatedAt:new Date().toISOString()
    };
    if(found)Object.assign(found,base);
    else{
      announcements.push({
        id:Date.now()+Math.floor(Math.random()*1000),
        dock:'',
        responsible:'',
        duration:60,
        sku:0,
        createdAt:row.createdAt,
        createdBy:String(s.username||s.user||'supplier'),
        ...base
      });
    }
    saveAnnouncements();
    try{render?.()}catch(_){}
  }catch(e){console.error('Supplier→YardOn mirror',e)}
}

async function reviseRequest(id){
  const rows=loadRows();
  const x=rows.find(r=>String(r.id)===String(id)); if(!x)return;
  if(String(x.status||'').toLowerCase()!=='revision_requested')return;

  const date=prompt(lang==='en'?'Delivery date (YYYY-MM-DD):':'Datum dostave (YYYY-MM-DD):',x.date||'');if(date===null)return;
  const time=prompt(lang==='en'?'Requested time (HH:MM):':'Željeni termin (HH:MM):',x.time||'');if(time===null)return;
  const palletsText=prompt(lang==='en'?'Pallet count:':'Broj paleta:',String(x.pallets||''));if(palletsText===null)return;
  const skuText=prompt(lang==='en'?'SKU count:':'Broj SKU-ova:',String(x.skuCount||''));if(skuText===null)return;
  const orderNo=prompt(lang==='en'?'Purchase order (optional):':'Broj narudžbe (opcionalno):',x.order||'');if(orderNo===null)return;
  const pallets=Number(palletsText),skuCount=Number(skuText);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time)||!Number.isInteger(pallets)||pallets<1||!Number.isInteger(skuCount)||skuCount<1){
    alert(lang==='en'?'Check date, time, pallet count and SKU count.':'Provjeri datum, termin, broj paleta i broj SKU-ova.');
    return;
  }
  try{
    const server=await window.YardivoSupplierLiveSync.call('resubmit',{
      client_id:String(x.id),warehouse:String(x.warehouse||'').toUpperCase(),
      delivery_date:date,requested_time:time,pallets,sku_count:skuCount,
      order_number:String(orderNo||'').trim().toUpperCase()
    });
    x.date=server.delivery_date||date;
    x.time=String(server.requested_time||time).slice(0,5);
    x.pallets=server.pallets||pallets;
    x.skuCount=server.sku_count||skuCount;
    x.order=server.order_number||'';
    x.status=server.status||'pending';
    x.reviewNote='';
    x.updatedAt=server.updated_at||new Date().toISOString();
    saveRows(rows);render();
    alert(lang==='en'?'Announcement resubmitted.':'Najava je ponovno poslana na odobrenje.');
  }catch(e){alert((lang==='en'?'Resubmission failed:\\n':'Ponovno slanje nije uspjelo:\\n')+(e?.message||e))}
}

async function editVehicle(id){
  const rows=loadRows();
  const x=rows.find(r=>String(r.id)===String(id)); if(!x)return;
  const plate=prompt(lang==='en'?'Vehicle registration (optional):':'Registracija vozila (opcionalno):',x.plate||'');
  if(plate===null)return;
  const driver=prompt(lang==='en'?'Driver (optional):':'Vozač (opcionalno):',x.driver||'');
  if(driver===null)return;
  x.plate=String(plate||'').trim().toUpperCase();
  x.driver=String(driver||'').trim();
  x.updatedAt=new Date().toISOString();
  try{
    if(window.YardivoSupplierLiveSync?.pushVehicle)await window.YardivoSupplierLiveSync.pushVehicle(x);
  }catch(e){
    alert((lang==='en'?'Update was not sent to YardOn:\n':'Promjena nije poslana u YardOn:\n')+(e?.message||e));
    return;
  }
  saveRows(rows);
  upsertCanonicalYardivoFromSupplier(x);
  render();
  alert(t('vehicleSaved'));
}


async function supplierAttachmentFromInput(){
  const f=document.getElementById('yspAttachment')?.files?.[0];
  if(!f)return null;
  if(f.type!=='application/pdf'&&!/\.pdf$/i.test(f.name||''))throw new Error('Dopušten je PDF dokument.');
  if(f.size>1572864)throw new Error('ERROR · PDF je veći od 1,5 MB.');
  const dataUrl=await new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(String(r.result||''));
    r.onerror=()=>reject(new Error('PDF nije moguće pročitati.'));
    r.readAsDataURL(f);
  });
  return {name:String(f.name||'dokument.pdf'),type:'application/pdf',size:Number(f.size||0),dataUrl,uploadedAt:new Date().toISOString()};
}
function supplierAttachmentKey(id){return 'yardivo_supplier_attachment_'+String(id||'')}
async function submit(){
  const locationId=document.getElementById('yspLocation')?.value||'';
  const warehouse=document.getElementById('yspWarehouse')?.value||'';
  const order=document.getElementById('yspOrder')?.value.trim().toUpperCase()||'';
  const date=document.getElementById('yspDate')?.value||'';
  const time=document.getElementById('yspTime')?.value||'';
  const dock=document.getElementById('yspDock')?.value||'';
  const pallets=Number(document.getElementById('yspPallets')?.value||0);
  const skuCount=Number(document.getElementById('yspSkuCount')?.value||0);
  const missing=[];
  if(!locationId)missing.push('LOKACIJA');
  if(!warehouse)missing.push('SKLADIŠTE');
  if(!date)missing.push('DATUM DOSTAVE');
  if(!time||!dock)missing.push('TERMIN I RAMPA');
  if(!Number.isInteger(pallets)||pallets<1)missing.push('BROJ PALETA');
  if(!Number.isInteger(skuCount)||skuCount<1)missing.push('BROJ SKU-OVA');
  if(missing.length){
    alert((lang==='en'?'Please complete: ':'Molim popuni: ')+missing.join(', '));
    const ids={LOKACIJA:'yspLocation',SKLADIŠTE:'yspWarehouse','DATUM DOSTAVE':'yspDate','BROJ PALETA':'yspPallets','BROJ SKU-OVA':'yspSkuCount'};
    document.getElementById(ids[missing[0]])?.focus?.();
    return;
  }
  const allowed=currentWarehouses(locationId);
  if(!allowed.includes(String(warehouse).toUpperCase())){
    alert(lang==='en'?'This warehouse is not assigned to your account.':'Ovo skladište nije dodijeljeno vašem accountu.');return;
  }
  const langNow=lang;
  const confirmed=window.confirm(langNow==='en'
    ?'Send this announcement to YardOn?'
    :'POSLATI NAJAVU U YardOn?');
  if(!confirmed)return;

  let attachment=null;
  try{attachment=await supplierAttachmentFromInput()}catch(e){alert(e?.message||e);return}
  const rows=loadRows(),now=new Date();
  const usedIds=new Set(rows.map(x=>String(x?.id||'').toUpperCase()));
  let id='';
  for(let attempt=0;attempt<30&&!id;attempt++){
    let n=0;
    try{const a=new Uint32Array(1);crypto.getRandomValues(a);n=100000+(a[0]%900000)}catch(_){n=100000+Math.floor(Math.random()*900000)}
    const candidate='NAJ'+String(n).padStart(6,'0');
    if(!usedIds.has(candidate))id=candidate;
  }
  if(!id)id='NAJ'+String(100000+(Date.now()%900000));
  const row={
    id,warehouse,date,time,status:'pending',dock,order,pallets,skuCount,
    plate:document.getElementById('yspPlate')?.value.trim().toUpperCase()||'',
    trailerPlate:document.getElementById('yspTrailerPlate')?.value.trim().toUpperCase()||'',
    driver:document.getElementById('yspDriver')?.value.trim()||'',
    driverContact:document.getElementById('yspDriverContact')?.value.trim()||'',
    reference:document.getElementById('yspReference')?.value.trim()||'',
    attachmentName:attachment?.name||'',
    attachmentSize:attachment?.size||0,
    hasAttachment:!!attachment,
    note:document.getElementById('yspNote')?.value.trim()||'',createdAt:now.toISOString()
  };
  try{
    if(window.YardivoSupplierLiveSync?.pushSupplierRow){
      const serverRow=await window.YardivoSupplierLiveSync.pushSupplierRow(row);
      if(serverRow?.id)row.serverId=serverRow.id;
    }
  }catch(e){
    /* A network/client response error can happen after the Edge Function has already
       committed the delivery. Verify authoritative server state before telling the
       supplier that the announcement failed. */
    let verified=null;
    try{
      const mine=await window.YardivoSupplierLiveSync?.call?.('list_mine');
      if(Array.isArray(mine)){
        verified=mine.find(x=>String(x?.client_id||'')===String(row.id));
      }
    }catch(_){}
    if(verified){
      if(verified.id)row.serverId=verified.id;
    }else{
      alert((lang==='en'?'Announcement was not sent to YardOn:\n':'Najava nije poslana u YardOn:\n')+(e?.message||e));
      return;
    }
  }
  rows.push(row);saveRows(rows);try{window.dispatchEvent(new CustomEvent('yardivo:supplier-request-updated',{detail:{id:row.serverId||row.id,warehouse:row.warehouse,source:'supplier-submit'}}))}catch(_){};
  if(attachment){
    localStorage.setItem(supplierAttachmentKey(id),JSON.stringify(attachment));
    try{await window.YardivoSupabase?.flush?.()}catch(_){}
  }
  clearForm();render();
  try{
    if(typeof showYmsToast==='function')showYmsToast('success',lang==='en'?'ANNOUNCEMENT SENT':'NAJAVA POSLANA',lang==='en'?'Announcement was sent to YardOn.':'Najava je uspješno poslana u YardOn.',3200);
  }catch(_){}
  show('history');
}
function open(){
  if(role()!=='supplier')return false;
  const p=document.getElementById('yardivoSupplierPortal'); if(!p)return false;
  const s=session();
  try{lang=localStorage.getItem(languageKey())==='en'?'en':'hr'}catch(e){lang='hr'}
  document.body.setAttribute('data-yardivo-role','supplier');
  p.style.display='block';
  p.setAttribute('aria-hidden','false');
  document.getElementById('yspUser').textContent=String(s.username||s.user||'Dobavljač');
  const __ym=supplierMaster();
  const __loc=(Array.isArray(__ym.locations)?__ym.locations:[]).find(x=>String(x?.id||'')===String(s.location||''));
  const __whNames=currentWarehouses().map(id=>whLabel(id)).filter(Boolean);
  document.getElementById('yspScope').textContent=(String(s.location||'').toUpperCase()==='ALL'?'SVE LOKACIJE':String(__loc?.name||'Lokacija'))+' · '+(__whNames.length?__whNames.join(', '):'Skladišta');
  setLang(lang);
  show('new');
  setTimeout(()=>hydrateSupplierMaster(),60);
  return true;
}
function close(){
  const p=document.getElementById('yardivoSupplierPortal');
  if(p){p.style.display='none';p.setAttribute('aria-hidden','true')}
}

document.addEventListener('click',e=>{
  const nav=e.target.closest?.('#yardivoSupplierPortal [data-ysp-view]');
  if(nav){show(nav.dataset.yspView);return}
  const lb=e.target.closest?.('#yardivoSupplierPortal [data-lang]');
  if(lb){setLang(lb.dataset.lang);return}
  const evb=e.target.closest?.('#yardivoSupplierPortal [data-ysp-edit-vehicle]');
  if(evb){editVehicle(evb.dataset.yspEditVehicle);return}
  const rb=e.target.closest?.('#yardivoSupplierPortal [data-ysp-revise]');
  if(rb){reviseRequest(rb.dataset.yspRevise);return}
},true);

document.getElementById('yspLocation')?.addEventListener('change',()=>{const w=document.getElementById('yspWarehouse');if(w)w.value='';renderWarehouses();try{window.dispatchEvent(new Event('change'))}catch(_){}});
document.getElementById('yspSend')?.addEventListener('click',submit);
document.getElementById('yspClear')?.addEventListener('click',clearForm);
document.getElementById('yspLogout')?.addEventListener('click',()=>{
  try{document.getElementById('logoutBtn')?.click()}catch(e){}
  close();
  location.reload();
});
window.addEventListener('yardivo:login',()=>setTimeout(open,80));
window.addEventListener('load',()=>{if(role()==='supplier')setTimeout(open,200)});


let yspRescheduleTarget=null;
function ensureSupplierRescheduleModal(){
  let m=document.getElementById('yspRescheduleRequestV583');if(m)return m;
  m=document.createElement('div');m.id='yspRescheduleRequestV583';
  m.innerHTML=`<div class="ysp-rsr-card" role="dialog" aria-modal="true"><div class="ysp-rsr-head"><div><small>ZAHTJEV DOBAVLJAČA</small><h2>ZATRAŽI PROMJENU TERMINA</h2></div><button type="button" data-ysp-rsr-close>×</button></div><div class="ysp-rsr-body"><div class="ysp-rsr-current"><small>TRENUTNO POTVRĐEN TERMIN</small><strong id="yspRsrCurrent">—</strong></div><div class="ysp-rsr-grid"><label>NOVI DATUM<input type="date" id="yspRsrDate"></label><label>ŽELJENO VRIJEME<input type="time" id="yspRsrTime" step="900"></label></div><label class="ysp-rsr-reason">RAZLOG PROMJENE<textarea id="yspRsrReason" rows="3" maxlength="500"></textarea></label><div class="ysp-rsr-note">Postojeći potvrđeni termin ostaje važeći dok Upravljanje zalihama ne odobri promjenu.</div><div class="ysp-rsr-actions"><button type="button" class="btn-secondary" data-ysp-rsr-close>ODUSTANI</button><button type="button" class="btn-primary" data-ysp-rsr-send>POŠALJI ZAHTJEV</button></div></div></div>`;
  document.body.appendChild(m);
  m.addEventListener('click',e=>{e.stopPropagation();if(e.target===m||e.target.closest('[data-ysp-rsr-close]'))closeSupplierRescheduleModal();if(e.target.closest('[data-ysp-rsr-send]'))submitSupplierRescheduleRequest()});
  return m;
}
function closeSupplierRescheduleModal(){document.getElementById('yspRescheduleRequestV583')?.classList.remove('open');yspRescheduleTarget=null}
function openSupplierRescheduleRequest(id){
  const rows=loadRows(),x=rows.find(r=>String(r.id)===String(id));if(!x)return;
  if(String(x.status||'').toLowerCase()!=='confirmed')return alert('Promjenu termina možeš zatražiti samo za potvrđenu aktivnu najavu.');
  if(x.rescheduleRequest?.status==='pending')return alert('Za ovu najavu već postoji zahtjev koji čeka odluku Upravljanja zalihama.');
  yspRescheduleTarget=x;const m=ensureSupplierRescheduleModal();
  m.querySelector('#yspRsrCurrent').textContent=`${x.date||'—'} · ${x.time||'—'}${x.dock?' · '+x.dock:''}`;
  m.querySelector('#yspRsrDate').value=x.date||'';m.querySelector('#yspRsrTime').value=x.time||'';m.querySelector('#yspRsrReason').value='';
  m.classList.add('open');
}
async function submitSupplierRescheduleRequest(){
  const x=yspRescheduleTarget;if(!x)return;
  const m=ensureSupplierRescheduleModal(),date=m.querySelector('#yspRsrDate').value,time=m.querySelector('#yspRsrTime').value,reason=m.querySelector('#yspRsrReason').value.trim();
  if(!date||!/^\d{2}:\d{2}$/.test(time))return alert('Odaberi novi datum i željeno vrijeme.');
  if(date===x.date&&time===x.time)return alert('Odaberi termin koji se razlikuje od trenutno potvrđenog.');
  if(!reason)return alert('Upiši razlog zahtjeva za promjenu termina.');
  const req={status:'pending',requestedAt:new Date().toISOString(),fromDate:x.date,fromTime:x.time,fromDock:x.dock||'',requestedDate:date,requestedTime:time,reason,requestedBy:(window.YardivoRescheduleAudit?.supplierActorLabel?.()||'Dobavljač'),initiatedByType:'SUPPLIER'};
  try{window.YardivoTermProvenance?.record?.({supplierDeliveryId:x.id||'',supplier:x.supplier||x.supplierName||'',warehouse:x.warehouse||'',initiatedByType:'SUPPLIER',initiatedBy:req.requestedBy,status:'PENDING_INVENTORY',before:{date:req.fromDate,time:req.fromTime,dock:req.fromDock},after:{date:req.requestedDate,time:req.requestedTime,dock:req.fromDock},reason:req.reason,responsibility:'SUPPLIER_REQUEST'})}catch(_){};
  const marker=`[YARDIVO_RESCHEDULE_REQUEST:${btoa(unescape(encodeURIComponent(JSON.stringify(req))))}]`;
  const clean=String(x.note||'').replace(/\n?\[YARDIVO_RESCHEDULE_REQUEST:[^\]]+\]/g,'').trim();
  try{
    await window.YardivoSupplierLiveSync.call('upsert',{
      client_id:String(x.id),warehouse:String(x.warehouse||'').toUpperCase(),order_number:String(x.order||'').toUpperCase(),
      delivery_date:x.date,requested_time:x.time||null,pallets:Number(x.pallets||0),sku_count:Number(x.skuCount||0),
      vehicle_plate:String(x.plate||'').toUpperCase(),trailer_plate:String(x.trailerPlate||'').toUpperCase(),
      driver_name:String(x.driver||''),driver_contact:String(x.driverContact||''),delivery_note:String(x.reference||''),
      note:(clean?clean+'\n':'')+marker
    });
    x.rescheduleRequest=req;x.updatedAt=new Date().toISOString();
    const rows=loadRows(),i=rows.findIndex(r=>String(r.id)===String(x.id));if(i>=0)rows[i]={...rows[i],rescheduleRequest:req,updatedAt:x.updatedAt,note:(clean?clean+'\n':'')+marker};
    saveRows(rows);render();closeSupplierRescheduleModal();
    try{
      const actor=window.YardivoRescheduleAudit?.supplierActorLabel?.()||'Dobavljač';
      showYmsToast?.('success','ZAHTJEV POSLAN',`Upravljanje zalihama mora odobriti novi termin. · ${actor}`);
      window.YardivoRescheduleAudit?.push?.('ZAHTJEV ZA PROMJENU TERMINA',`${x.supplier||x.supplier_name||'Dobavljač'} traži ${date} ${time}`,{
        actor,type:'supplier_reschedule_request',supplierDeliveryId:x.id||'',warehouse:x.warehouse||'',
        before:{date:x.date,time:x.time,dock:x.dock||''},after:{date,time}
      });
    }catch(_){}
  }catch(e){alert('Zahtjev za promjenu termina nije poslan:\\n'+(e?.message||e))}
}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-ysp-request-reschedule]');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openSupplierRescheduleRequest(b.dataset.yspRequestReschedule)},true);

window.YardivoSupplierPortal={open,close,render,setLanguage:setLang,editVehicle,reviseRequest,mirrorToYardivo:upsertCanonicalYardivoFromSupplier,submitV561:submit,requestReschedule:openSupplierRescheduleRequest};
})();
