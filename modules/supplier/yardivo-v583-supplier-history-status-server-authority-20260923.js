
(()=>{'use strict';
if(window.__YARDIVO_SUPPLIER_HISTORY_STATUS_SERVER_AUTH_20260923__)return;
window.__YARDIVO_SUPPLIER_HISTORY_STATUS_SERVER_AUTH_20260923__=true;
const $=id=>document.getElementById(id);
let rows=[],busy=false,lastPull=0,lastFingerprint='';
const terminal=new Set(['completed','rejected','cancelled','canceled']);
function portal(){return $('yardivoSupplierPortal')}
function isSupplier(){try{return String((typeof currentSession!=='undefined'?currentSession:window.currentSession)?.role||'').toLowerCase()==='supplier'}catch(_){return false}}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function statusKey(v){return String(v||'pending').trim().toLowerCase()}
function statusLabel(v){
  const s=statusKey(v);
  return {pending:'ČEKA POTVRDU',confirmed:'POTVRĐENO',revision_requested:'VRAĆENO NA DORADU',proposal_sent:'PRIJEDLOG TERMINA',reschedule_requested:'ZAHTJEV ZA PROMJENU',cancel_requested:'ZAHTJEV ZA OTKAZIVANJE',rejected:'ODBIJENO',arrival:'U DVORIŠTU',dock:'NA RAMPI',receiving:'ZAPRIMANJE',completed:'ZAPRIMLJENO',cancelled:'OTKAZANO',canceled:'OTKAZANO'}[s]||String(v||'ČEKA POTVRDU').toUpperCase()
}
function statusClass(v){const s=statusKey(v);return ['completed','confirmed','arrival','dock','receiving'].includes(s)?'ok':['rejected','cancelled','canceled','cancel_requested'].includes(s)?'bad':'wait'}
function whLabel(code){
  try{
    const m=window.YardivoAppStateV583?.master?.()||JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');
    return String((m.warehouses||[]).find(w=>String(w?.id||'')===String(code||''))?.name||code||'—')
  }catch(_){return String(code||'—')}
}
function cleanReview(v){
  try{return window.YardivoGateQrV583?.cleanReviewNote?.(v)||String(v||'')}catch(_){return String(v||'')}
}
function qrMeta(x){
  try{return window.YardivoGateQrV583?.parseReviewNote?.(x.review_note||'')||null}catch(_){return null}
}
function rowByRawId(id){return rows.find(x=>String(x.id)===String(id)||String(x.serverId)===String(id))||null}
function renderQrInto(el,url,size=300){
  if(!el||!url)return;
  el.innerHTML='';
  if(!window.QRCode){el.textContent='QR modul nije učitan.';return}
  new QRCode(el,{text:url,width:size,height:size,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M})
}
function ensureQrModal(){
  let m=document.getElementById('yardivoSupplierQrCanonicalV583');if(m)return m;
  m=document.createElement('div');m.id='yardivoSupplierQrCanonicalV583';
  m.innerHTML='<div class="yvqc-card"><h2>YARDIVO QR DOCK</h2><div class="yvqc-sub">QR za konkretnu isporuku · koristi se na Docku / Prijamu</div><div class="yvqc-qr" id="yvqcQrCanvas"></div><div class="yvqc-meta" id="yvqcMeta"></div><div class="yvqc-actions"><button type="button" data-yvqc-close>ZATVORI</button><button type="button" class="primary" data-yvqc-pdf>PREUZMI QR · PDF</button></div></div>';
  document.body.appendChild(m);
  m.querySelector('[data-yvqc-close]').onclick=()=>m.classList.remove('open');
  m.onclick=e=>{if(e.target===m)m.classList.remove('open')};
  m.querySelector('[data-yvqc-pdf]').onclick=()=>{const id=m.dataset.rowId;downloadQrPdf(id)};
  return m
}
function openQrCanonical(id){
  const x=rowByRawId(id);if(!x?.qrUrl)return;
  const m=ensureQrModal();m.dataset.rowId=String(x.id);
  renderQrInto(document.getElementById('yvqcQrCanvas'),x.qrUrl,520);
  document.getElementById('yvqcMeta').innerHTML='<strong>'+esc(window.YardivoAnnouncementNumberV583?.displayId?.(x.id)||x.id)+'</strong><br>'+esc(x.date||'')+' · '+esc(x.time||'')+' · '+esc(whLabel(x.warehouse))+(x.dock?' · '+esc(/^R/i.test(x.dock)?x.dock:'R'+x.dock):'')+'<br>'+esc(x.order||'');
  m.classList.add('open')
}
function downloadQrPdf(id){
  const x=rowByRawId(id);if(!x?.qrUrl)return;
  if(!window.jspdf?.jsPDF){window.open(x.qrUrl,'_blank','noopener');return}
  try{
    const holder=document.createElement('div');holder.style.cssText='position:fixed;left:-9999px;top:-9999px;width:700px;height:700px;background:#fff';document.body.appendChild(holder);
    renderQrInto(holder,x.qrUrl,700);
    const node=holder.querySelector('canvas,img');const data=node?.tagName==='CANVAS'?node.toDataURL('image/png'):node?.src||'';holder.remove();
    const {jsPDF}=window.jspdf,pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    pdf.setTextColor(18,30,38);pdf.setFont('helvetica','bold');pdf.setFontSize(18);pdf.text('YARDIVO QR DOCK',105,24,{align:'center'});
    pdf.setFont('helvetica','normal');pdf.setFontSize(10);pdf.text(String(window.YardivoAnnouncementNumberV583?.displayId?.(x.id)||x.id),105,32,{align:'center'});
    if(data)pdf.addImage(data,'PNG',50,42,110,110);
    pdf.setFontSize(10);pdf.text((x.date||'')+' · '+(x.time||'')+' · '+whLabel(x.warehouse)+(x.dock?' · '+(/^R/i.test(x.dock)?x.dock:'R'+x.dock):''),105,163,{align:'center'});
    pdf.text('PO: '+(x.order||'—'),105,170,{align:'center'});
    pdf.save(String(window.YardivoAnnouncementNumberV583?.displayId?.(x.id)||x.id)+'-QR-DOCK.pdf')
  }catch(e){console.error(e);window.open(x.qrUrl,'_blank','noopener')}
}
function normalized(x){
  const parsed=qrMeta(x);
  const q={
    qrUrl:String(x.gate_qr_url||parsed?.qrUrl||''),
    token:String(x.gate_qr_token||parsed?.token||''),
    issuedAt:String(x.gate_qr_issued_at||parsed?.issuedAt||'')
  };
  return {
    id:String(x.client_id||x.id||'—'),
    serverId:String(x.id||''),
    warehouse:String(x.warehouse||''),
    date:String(x.delivery_date||'').slice(0,10),
    time:String(x.requested_time||'').slice(0,5),
    order:String(x.order_number||''),
    status:statusKey(x.effective_status||x.status),
    dock:String(x.dock||x.dock_number||''),
    plate:String(x.vehicle_plate||''),
    trailer:String(x.trailer_plate||''),
    driver:String(x.driver_name||''),
    driverContact:String(x.driver_contact||''),
    pallets:Number(x.pallets||0),
    sku:Number(x.sku_count||0),
    review:cleanReview(x.review_note),
    updatedAt:String(x.announcement_updated_at||x.updated_at||x.created_at||''),
    qrUrl:String(q.qrUrl||''),
    qrToken:String(q.token||''),
    qrIssuedAt:String(q.issuedAt||''),
    docName:String(x.document_name||''),
    docMime:String(x.document_mime||''),
    proposedDate:String(x.proposed_date||'').slice(0,10),
    proposedTime:String(x.proposed_time||'').slice(0,5),
    proposedDock:String(x.proposed_dock||'')
  }
}
function sortRows(a,b){
  const av=String(a.date||'')+'T'+String(a.time||'00:00'),bv=String(b.date||'')+'T'+String(b.time||'00:00');
  return bv.localeCompare(av)||String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))
}
async function pull(force=false){
  if(!isSupplier()||busy)return rows;
  if(!force&&Date.now()-lastPull<1800)return rows;
  busy=true;
  try{
    const live=window.YardivoSupplierLiveSync;
    if(force)await live?.pullSupplier?.();
    let raw=live?.mineRows?.();
    if(!Array.isArray(raw)){
      await live?.pullSupplier?.();
      raw=live?.mineRows?.();
    }
    if(Array.isArray(raw)){
      const next=raw.map(normalized).sort(sortRows);
      const fp=JSON.stringify(next.map(x=>[x.serverId,x.id,x.status,x.warehouse,x.date,x.time,x.dock,x.plate,x.trailer,x.driver,x.driverContact,x.pallets,x.sku,x.review,x.qrUrl,x.qrIssuedAt,x.docName,x.proposedDate,x.proposedTime,x.proposedDock,x.updatedAt]));
      rows=next;lastPull=Date.now();
      if(fp!==lastFingerprint){lastFingerprint=fp;renderAll()}
    }
    return rows
  }catch(e){
    console.error('Supplier server history/status',e);
    return rows
  }finally{busy=false}
}
function ensureHistoryNote(){
  const sec=portal()?.querySelector('[data-ysp-section="history"]');if(!sec)return;
  if(sec.querySelector('.ysp-server-note'))return;
  const card=sec.querySelector('.ysp-card');if(!card)return;
  const n=document.createElement('div');n.className='ysp-server-note';n.textContent='Povijest se učitava izravno iz YARDIVO baze. Ovdje su potvrđene, operativne, završene i odbijene najave. Najave koje čekaju potvrdu ostaju samo u Stanje najave / Isporuke.';card.insertBefore(n,card.querySelector('.data-wrap')||card.firstChild)
}
function renderHistory(){
  const body=$('yspHistoryBody');if(!body)return;ensureHistoryNote();
  const history=rows.filter(x=>['confirmed','arrival','dock','receiving','completed','rejected'].includes(statusKey(x.status)));
  if(!history.length){body.innerHTML='<tr><td colspan="7"><div class="ysph-empty">Još nema potvrđenih ili odbijenih najava.</div></td></tr>';return}
  body.innerHTML=history.map(x=>{
    const qr=!['cancelled','canceled'].includes(statusKey(x.status))&&x.qrUrl?'<span class="ysph-qr-ready">▣ QR STIGAO</span><br><button type="button" class="ysph-qr" data-yv-server-qr-open="'+esc(x.id)+'">OTVORI QR</button> <button type="button" class="ysph-qr" data-yv-server-qr-pdf="'+esc(x.id)+'">PREUZMI PDF</button>':'';
    return '<tr>'+
      '<td><span class="ysph-id">'+esc(window.YardivoAnnouncementNumberV583?.displayId?.(x.id)||x.id)+'</span><span class="ysph-sub">Ažurirano: '+esc(x.updatedAt?new Date(x.updatedAt).toLocaleString('hr-HR'):'—')+'</span></td>'+
      '<td><b>'+esc(x.date||'—')+'</b><span class="ysph-sub">'+esc(x.time||'—')+'</span></td>'+
      '<td>'+esc(whLabel(x.warehouse))+'</td>'+
      '<td>'+esc(x.order||'—')+'</td>'+
      '<td><span class="ysph-status '+statusClass(x.status)+'">'+esc(statusLabel(x.status))+'</span></td>'+
      '<td>'+esc(x.dock?(/^R/i.test(x.dock)?x.dock:'R'+x.dock):'NIJE DODIJELJENA')+'</td>'+
      '<td><div class="ysph-vehicle"><b>'+esc(x.plate||'—')+'</b><span class="ysph-sub">'+esc(x.driver||'Vozač nije unesen')+'</span>'+qr+'</div></td>'+
    '</tr>'
  }).join('')
}
function progressIndex(s){
  return {pending:0,revision_requested:0,proposal_sent:0,reschedule_requested:1,cancel_requested:1,confirmed:1,arrival:2,dock:3,receiving:4,completed:5}[statusKey(s)]??0
}
function renderStatus(){
  const host=$('yspStatusList');if(!host)return;
  const active=rows.filter(x=>!terminal.has(statusKey(x.status)));
  if(!active.length){host.innerHTML='<div class="ysph-empty">Nema aktivnih najava. Zaprimljene i odbijene narudžbe nalaze se u Povijesti najava.</div>';return}
  const labels=['NAJAVA','POTVRDA','DOLAZAK','RAMPA','ZAPRIMANJE','ZAVRŠENO'];
  host.innerHTML=active.map(x=>{
    const idx=progressIndex(x.status);
    const qr=x.qrUrl?'<div class="ysps-qr-live"><div class="ysps-qr-canvas" data-yv-server-qr-canvas="'+esc(x.id)+'"></div><div class="ysps-qr-copy"><strong>▣ QR DOCK JE SPREMAN</strong><p>Ovaj QR Dock pošalji vozaču za potvrdu na Docku / Prijamu. Gate Check-In se radi posebnim QR-om na ulazu.</p><div class="ysps-qr-actions"><button type="button" class="btn-primary" data-yv-server-qr-open="'+esc(x.id)+'">OTVORI QR</button><button type="button" class="btn-secondary" data-yv-server-qr-pdf="'+esc(x.id)+'">PREUZMI QR · PDF</button></div></div></div>':'<div class="ysps-noqr">QR Dock još nije izdan od strane YARDIVO zaliha.</div>';
    return '<article class="ysps-card">'+
      '<div><div class="ysps-title"><strong>'+esc(window.YardivoAnnouncementNumberV583?.displayId?.(x.id)||x.id)+' · '+esc(x.order||'BEZ PO')+'</strong><span class="ysph-status '+statusClass(x.status)+'">'+esc(statusLabel(x.status))+'</span></div>'+
      '<div class="ysps-grid">'+
        '<div class="ysps-fact"><small>SKLADIŠTE</small><b>'+esc(whLabel(x.warehouse))+'</b></div>'+
        '<div class="ysps-fact"><small>DATUM / TERMIN</small><b>'+esc(x.date||'—')+' · '+esc(x.time||'—')+'</b></div>'+
        '<div class="ysps-fact"><small>RAMPA</small><b>'+esc(x.dock?(/^R/i.test(x.dock)?x.dock:'R'+x.dock):'NIJE DODIJELJENA')+'</b></div>'+
        '<div class="ysps-fact"><small>PALETE / SKU</small><b>'+esc(x.pallets)+' / '+esc(x.sku)+'</b></div>'+
        '<div class="ysps-fact"><small>VOZILO</small><b>'+esc(x.plate||'—')+(x.trailer?' · '+esc(x.trailer):'')+'</b></div>'+
        '<div class="ysps-fact"><small>VOZAČ</small><b>'+esc(x.driver||'—')+(x.driverContact?' · '+esc(x.driverContact):'')+'</b></div>'+
      '</div><div class="ysps-card-actions"><button type="button" class="btn-secondary ysps-additional-btn" data-yv-supplier-additional="'+esc(x.id)+'">UNESI DODATNO</button>'+((['arrival','dock','receiving'].includes(statusKey(x.status)))?'':'<button type="button" class="btn-secondary" data-ysp-self-reschedule="'+esc(x.id)+'">PROMIJENI TERMIN</button><button type="button" class="btn-secondary ysp-danger-soft" data-ysp-self-cancel="'+esc(x.id)+'">OTKAŽI NAJAVU</button>')+'</div></div>'+
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
  const set=(id,v)=>{const e=$(id);if(e)e.textContent=String(v)};
  let wh=0;try{wh=(window.__YARDIVO_SUPPLIER_SCOPE_AUTHORITY_V583?.warehouses||[]).length}catch(_){}
  set('yspKpiWh',wh);
  set('yspKpiActive',rows.filter(x=>!terminal.has(statusKey(x.status))).length);
  set('yspKpiPending',rows.filter(x=>['pending','revision_requested'].includes(statusKey(x.status))).length);
  set('yspKpiDone',rows.filter(x=>statusKey(x.status)==='completed').length)
}
function renderAll(){if(!isSupplier())return;renderStatus();renderHistory();renderKpis();hideFloatingSupplierUi()}
function hideFloatingSupplierUi(){
  if(!isSupplier())return;
  document.querySelectorAll('body > div,body > section').forEach(el=>{
    if(el.id==='yardivoSupplierPortal')return;
    const cs=getComputedStyle(el),txt=(el.textContent||'').toUpperCase();
    const floating=['fixed','sticky'].includes(cs.position);
    if(floating&&txt.includes('ONLINE BAZA'))el.style.setProperty('display','none','important');
    if(floating&&(el.classList.contains('supplier-side-popup')||el.classList.contains('supplier-side-window')))el.style.setProperty('display','none','important')
  });
  const fs=$('yardivoSupplierRightMapFullscreenV583');if(fs)fs.style.setProperty('display','none','important')
}
function currentView(){return portal()?.querySelector('[data-ysp-view].active')?.dataset.yspView||''}

function ensureSupplierAdditionalModal(){
  let m=document.getElementById('yardivoSupplierAdditionalModalV583');if(m)return m;
  m=document.createElement('div');m.id='yardivoSupplierAdditionalModalV583';
  m.innerHTML='<div class="ysam-card"><div class="ysam-head"><div><h3>UNESI DODATNO</h3><small id="ysamRef">YARDIVO najava</small></div><button type="button" class="ysam-close" data-ysam-close>×</button></div><div class="ysam-body"><div class="ysam-grid"><label>REGISTRACIJA VOZILA<input id="ysamPlate" autocomplete="off" placeholder="npr. ST-1234"></label><label>REGISTRACIJA PRIKOLICE<input id="ysamTrailer" autocomplete="off" placeholder="opcionalno"></label><label>IME I PREZIME VOZAČA<input id="ysamDriver" autocomplete="off" placeholder="ime vozača"></label><label>KONTAKT VOZAČA<input id="ysamContact" autocomplete="off" placeholder="mobitel"></label></div><div class="ysam-note">Podaci se spremaju direktno u istu YARDIVO najavu i koriste ih Gate, Prijam i operativni status.</div></div><div class="ysam-actions"><button type="button" class="btn-secondary" data-ysam-close>ODUSTANI</button><button type="button" class="btn-primary" data-ysam-save>SPREMI PODATKE</button></div></div>';
  document.body.appendChild(m);
  m.querySelectorAll('[data-ysam-close]').forEach(b=>b.onclick=()=>m.classList.remove('open'));
  m.onclick=e=>{if(e.target===m)m.classList.remove('open')};
  m.querySelector('[data-ysam-save]').onclick=()=>saveSupplierAdditionalModal();
  return m
}
function openSupplierAdditional(id){
  const x=rowByRawId(id);if(!x)return;
  const m=ensureSupplierAdditionalModal();m.dataset.rowId=String(x.id);
  m.querySelector('#ysamRef').textContent=(window.YardivoAnnouncementNumberV583?.displayId?.(x.id)||x.id)+' · '+(x.order||'BEZ PO');
  m.querySelector('#ysamPlate').value=x.plate||'';
  m.querySelector('#ysamTrailer').value=x.trailer||'';
  m.querySelector('#ysamDriver').value=x.driver||'';
  m.querySelector('#ysamContact').value=x.driverContact||'';
  m.classList.add('open');
  setTimeout(()=>m.querySelector('#ysamPlate')?.focus(),40)
}
async function saveSupplierAdditionalModal(){
  const m=ensureSupplierAdditionalModal(),x=rowByRawId(m.dataset.rowId);if(!x)return;
  const btn=m.querySelector('[data-ysam-save]'),old=btn.textContent;
  const payload={client_id:String(x.id),vehicle_plate:String(m.querySelector('#ysamPlate').value||'').trim().toUpperCase(),trailer_plate:String(m.querySelector('#ysamTrailer').value||'').trim().toUpperCase(),driver_name:String(m.querySelector('#ysamDriver').value||'').trim(),driver_contact:String(m.querySelector('#ysamContact').value||'').trim()};
  btn.disabled=true;btn.textContent='SPREMAM…';
  try{
    await window.YardivoSupplierLiveSync?.call?.('vehicle',payload);
    m.classList.remove('open');
    await pull(true);
    try{window.showYmsToast?.('success','PODACI SPREMLJENI','Vozilo i vozač su povezani s YARDIVO najavom.')}catch(_){}
  }catch(err){
    alert('Spremanje podataka nije uspjelo:\n'+String(err?.message||err))
  }finally{btn.disabled=false;btn.textContent=old}
}
async function saveVehicleFromCard(id,btn){
  const x=rowByRawId(id);if(!x)return;
  const root=btn?.closest?.('.ysps-edit')||portal();
  const get=(attr)=>String(root?.querySelector?.('['+attr+'="'+CSS.escape(String(x.id))+'"]')?.value||'').trim();
  const payload={client_id:String(x.id),vehicle_plate:get('data-yv-supplier-plate').toUpperCase(),trailer_plate:get('data-yv-supplier-trailer').toUpperCase(),driver_name:get('data-yv-supplier-driver'),driver_contact:get('data-yv-supplier-contact')};
  const old=btn?.textContent||'SPREMI PODATKE';if(btn){btn.disabled=true;btn.textContent='SPREMAM…'}
  try{
    await window.YardivoSupplierLiveSync?.call?.('vehicle',payload);
    await pull(true);
    try{window.showYmsToast?.('success','PODACI SPREMLJENI','Vozilo i vozač su ažurirani u YARDIVO sustavu.')}catch(_){}
  }catch(err){
    if(btn){btn.disabled=false;btn.textContent=old}
    alert('Spremanje podataka nije uspjelo:\n'+String(err?.message||err))
  }
}
document.addEventListener('click',e=>{
  const additional=e.target.closest?.('[data-yv-supplier-additional]');
  if(additional){e.preventDefault();e.stopPropagation();openSupplierAdditional(additional.dataset.yvSupplierAdditional);return}
  const save=e.target.closest?.('[data-yv-supplier-save-vehicle]');
  if(save){e.preventDefault();e.stopPropagation();void saveVehicleFromCard(save.dataset.yvSupplierSaveVehicle,save);return}
  const open=e.target.closest?.('[data-yv-server-qr-open]');
  if(open){e.preventDefault();e.stopPropagation();openQrCanonical(open.dataset.yvServerQrOpen);return}
  const pdf=e.target.closest?.('[data-yv-server-qr-pdf]');
  if(pdf){e.preventDefault();e.stopPropagation();downloadQrPdf(pdf.dataset.yvServerQrPdf);return}
  const b=e.target.closest?.('#yardivoSupplierPortal [data-ysp-view]');
  if(b&&String(b.dataset.yspView||'')==='status')setTimeout(()=>pull(true),40)
},true);
['yardivo:login','yardivo:supplier-qr-ready'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(()=>{hideFloatingSupplierUi();pull(true)},180)));
window.addEventListener('yardivo:supplier-mine-rows',()=>setTimeout(()=>{hideFloatingSupplierUi();pull(false)},0));
window.addEventListener('yardivo:data-synced',()=>setTimeout(()=>{hideFloatingSupplierUi();renderAll()},180));
window.addEventListener('load',()=>setTimeout(()=>{hideFloatingSupplierUi();pull(false)},700),{once:true});
setTimeout(()=>{hideFloatingSupplierUi();pull(false)},250);
window.YardivoSupplierHistoryStatusServerV583={pull,render:renderAll,rows:()=>rows.slice()};
})();
