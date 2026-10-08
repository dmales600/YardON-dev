
(function(){'use strict';
const BASE='https://ldzwgdwzolbvjxyznlry.supabase.co';
const ANON='sb_publishable_f3daeEDsH7zNSiFR5QluaQ_AP4Ptjzz';
const EDGE=BASE+'/functions/v1/yardivo-gate-pass';
const MARK_RE=/\[\[YARDIVO_GATE_QR_V583:([A-Za-z0-9_-]+)\]\]/g;
let modalRow=null,pendingIssue=null;
function role(){try{return String(window.currentSession?.role||currentSession?.role||'').toLowerCase()}catch(_){return''}}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function b64urlText(v){const bytes=new TextEncoder().encode(v);let bin='';bytes.forEach(b=>bin+=String.fromCharCode(b));return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64urlText(v){v=String(v||'').replace(/-/g,'+').replace(/_/g,'/');v+='='.repeat((4-v.length%4)%4);const bin=atob(v),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return new TextDecoder().decode(bytes)}
function cleanReviewNote(v){return String(v||'').replace(MARK_RE,'').replace(/\n{3,}/g,'\n\n').trim()}
function parseReviewNote(v){let found=null;String(v||'').replace(MARK_RE,(_,p)=>{try{found=JSON.parse(unb64urlText(p))}catch(e){};return _});return found}
function marker(meta){return '[[YARDIVO_GATE_QR_V583:'+b64urlText(JSON.stringify(meta))+']]'}
function qrMetaFromRow(x){return x?.gateQrUrl?{token:x.gateQrToken||'',qrUrl:x.gateQrUrl,issuedAt:x.gateQrIssuedAt||'',supplierDeliveryId:String(x.id||'')}:parseReviewNote(x?.review_note||x?.reviewNote||'')}
function inventoryButton(x){
  if(!['inventory','admin'].includes(role())||String(x?.status||'').toLowerCase()!=='confirmed')return'';
  const meta=qrMetaFromRow(x);
  if(meta?.qrUrl){
    return `<div class="yardivo-inventory-qr-sent" data-qr-sent="${esc(x.id)}">
      <span class="yardivo-qr-sent-label">QR POSLAN</span>
      <button type="button" class="primary" data-yardivo-open-inventory-gate-qr="${esc(x.id)}">OTVORI QR</button>
    </div>`;
  }
  return `<button class="primary yardivo-gate-qr-send" data-yardivo-send-gate-qr="${esc(x.id)}"><span aria-hidden="true">▣</span> POŠALJI QR ZA DOCK</button>`;
}
function supplierButtons(x){
  const m=qrMetaFromRow(x);if(!m?.qrUrl)return'';
  return `<div class="yardivo-supplier-qr-actions"><button type="button" class="btn-primary" data-yardivo-open-gate-qr="${esc(x.id)}">OTVORI QR</button><button type="button" class="btn-secondary" data-yardivo-print-gate-qr="${esc(x.id)}">PREUZMI QR · PDF</button></div>`;
}
async function accessToken(){
  const raw=String(window.__yardivoSupplierAccessToken||'').trim();if(raw)return raw;
  const c=await window.YardivoAuth?.client?.();if(!c)throw new Error('YARDIVO Auth nije dostupan.');
  let ss=null;try{ss=(await c.auth.getSession())?.data?.session||null}catch(_){}
  if(!ss?.access_token){try{ss=(await c.auth.refreshSession())?.data?.session||null}catch(_){}}
  if(!ss?.access_token)throw new Error('ONLINE PRIJAVA NIJE AKTIVNA. Ponovno se prijavi.');
  return ss.access_token;
}
async function edge(action,payload={}){
  const token=await accessToken();
  const r=await fetch(EDGE,{method:'POST',headers:{apikey:ANON,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,...payload})});
  const d=await r.json().catch(()=>({}));if(!r.ok||d?.ok===false)throw new Error(d?.error||('Gate QR HTTP '+r.status));return d;
}
function canonicalForSupplier(id){try{return (Array.isArray(announcements)?announcements:[]).find(a=>String(a.supplierDeliveryId||'')===String(id))||null}catch(_){return null}}
function ensureIssuePreviewModal(){
  let m=document.getElementById('yardivoGateQrIssuePreviewV583');if(m)return m;
  m=document.createElement('div');m.id='yardivoGateQrIssuePreviewV583';
  m.innerHTML=`<div class="ygq-card">
    <img class="ygq-logo" alt="YARDIVO">
    <h2>QR DOCK</h2>
    <div class="ygq-sub">Pregled QR koda prije slanja dobavljaču</div>
    <div class="ygq-qr" id="yardivoGateQrIssueCanvasV583"></div>
    <div class="ygq-meta" id="yardivoGateQrIssueMetaV583"></div>
    <div class="ygq-warning">QR Dock još NIJE poslan dobavljaču. Klikom na POTVRDI QR Dock se odmah objavljuje u Stanje najave / Isporuke.</div>
    <div class="ygq-actions">
      <button type="button" data-ygq-issue-cancel>ODUSTANI</button>
      <button type="button" class="primary" data-ygq-issue-confirm>POTVRDI I POŠALJI DOBAVLJAČU</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  m.querySelector('[data-ygq-issue-cancel]').onclick=()=>{pendingIssue=null;m.classList.remove('open')};
  m.querySelector('[data-ygq-issue-confirm]').onclick=confirmPreparedIssue;
  return m;
}
function showPreparedIssue(row,ann,prepared){
  const m=ensureIssuePreviewModal(),meta={
    token:String(prepared.token||prepared.qrToken||''),
    qrUrl:String(prepared.qrUrl||prepared.gateUrl||''),
    announcementId:String(ann.id),
    supplierDeliveryId:String(row.id),
    issuedAt:''
  };
  if(!meta.token||!meta.qrUrl)throw new Error('Backend nije vratio pripremljeni QR.');
  pendingIssue={row,ann,meta};
  const logo=m.querySelector('.ygq-logo');logo.src=logoSrc();
  renderQr(document.getElementById('yardivoGateQrIssueCanvasV583'),meta.qrUrl,500);
  document.getElementById('yardivoGateQrIssueMetaV583').innerHTML=
    `<strong>${esc(row.supplier_name||row.supplier_username||'Dobavljač')}</strong><br>`+
    `${esc(row.delivery_date||'')} · ${esc(String(row.requested_time||'').slice(0,5))} · ${esc(warehouseBusinessName(row.warehouse))}${row.dock?' · '+esc(row.dock):''}<br>`+
    `${Number(row.pallets||0)} pal. · ${Number(row.sku_count||0)} SKU`;
  m.classList.add('open');
}
async function confirmPreparedIssue(){
  if(!pendingIssue)return;
  const {row,ann,meta}=pendingIssue,m=document.getElementById('yardivoGateQrIssuePreviewV583');
  const btn=m?.querySelector('[data-ygq-issue-confirm]');if(btn){btn.disabled=true;btn.textContent='ŠALJEM DOBAVLJAČU…'}
  try{
    const res=await edge('issue',{announcementId:String(ann.id),token:String(meta.token)});
    if(!res?.token||!res?.qrUrl)throw new Error('Backend nije aktivirao QR token.');
    const finalMeta={
      token:String(res.token),
      qrUrl:String(res.qrUrl),
      issuedAt:new Date().toISOString(),
      announcementId:String(ann.id),
      supplierDeliveryId:String(row.id)
    };
    const human=cleanReviewNote(row.review_note||'');
    row.review_note=(human?human+'\n':'')+marker(finalMeta);
    pendingIssue=null;m?.classList.remove('open');
    try{Promise.resolve(window.YardivoSupplierRequests?.load?.()).catch(()=>{})}catch(_){}
    try{Promise.resolve(window.YardivoSupplierPlannerV580?.refresh?.(true)).catch(()=>{})}catch(_){}
    try{window.dispatchEvent(new CustomEvent('yardivo:gate-qr-issued',{detail:{id:String(row.id),announcementId:String(ann.id),supplier:String(row.supplier_username||'')}}))}catch(_){}
    try{
      if(typeof showYmsToast==='function')showYmsToast('success','QR POSLAN DOBAVLJAČU','QR DOCK je objavljen u Stanje najave / Isporuke.',4200);
      else alert('QR DOCK je potvrđen i poslan dobavljaču.');
    }catch(_){}
  }catch(e){
    alert('QR nije moguće potvrditi / poslati:\n'+(e?.message||e));
  }finally{
    if(btn){btn.disabled=false;btn.textContent='POTVRDI I POŠALJI DOBAVLJAČU'}
  }
}
async function issue(id){
  if(!['inventory','admin'].includes(role()))return alert('QR DOCK može poslati Upravljanje zalihama ili Admin.');
  const rows=window.YardivoSupplierPlannerV580?.getRows?.()||[];
  let row=rows.find(x=>String(x.id)===String(id));
  if(!row){try{const a=await window.YardivoSupplierLiveSync.call('list_internal');row=(a||[]).find(x=>String(x.id)===String(id))}catch(_){}}
  if(!row||String(row.status||'').toLowerCase()!=='confirmed')return alert('QR se može poslati tek nakon potvrđene najave.');
  let ann=canonicalForSupplier(id);
  if(!ann)ann={id:'SUPDEL-'+String(id),status:'confirmed'};
  const st=String(ann.status||'').toLowerCase();
  if(!['najavljen','u dolasku','confirmed',''].includes(st))return alert('Vozilo je već u operativnom procesu. Novi QR Dock se više ne izdaje.');
  const btn=document.querySelector(`[data-yardivo-send-gate-qr="${CSS.escape(String(id))}"]`);
  if(btn){btn.disabled=true;btn.textContent='PRIPREMAM QR…'}
  try{
    const prepared=await edge('prepare',{announcementId:String(ann.id)});
    showPreparedIssue(row,ann,prepared);
  }catch(e){
    alert('QR nije moguće pripremiti:\n'+(e?.message||e));
  }finally{
    if(btn){btn.disabled=false;btn.textContent=qrMetaFromRow(row)?'POŠALJI NOVI QR ZA DOCK':'POŠALJI QR ZA DOCK'}
  }
}

function inventoryRow(id){
  const rows=window.YardivoSupplierPlannerV580?.getRows?.()||[];
  return rows.find(x=>String(x.id)===String(id))||null;
}
async function openInventoryQrById(id){
  let row=inventoryRow(id);
  if(!row){
    try{
      const a=await window.YardivoSupplierLiveSync.call('list_internal');
      row=(a||[]).find(x=>String(x.id)===String(id))||null;
    }catch(_){}
  }
  if(!row)return alert('Najava nije pronađena.');
  const meta=qrMetaFromRow(row);
  if(!meta?.qrUrl)return alert('QR još nije poslan dobavljaču.');
  return openQr(row);
}
function supplierRows(){
  try{const s=window.currentSession||currentSession||{};const key='yardivo_supplier_portal_v549_'+String(s.authUserId||s.username||s.user||'supplier');const a=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(a)?a:[]}catch(_){return[]}
}
function supplierRow(id){return supplierRows().find(x=>String(x.id)===String(id))||null}

function supplierQrNotificationKey(row,meta){return 'yardivo_supplier_qr_notified_v583_'+String(row?.id||'')+'_'+String(meta?.issuedAt||meta?.qrUrl||'')}
function pushSupplierQrNotification(row,meta){
  if(role()!=='supplier'||!row||!meta?.qrUrl)return;
  const k=supplierQrNotificationKey(row,meta);
  if(localStorage.getItem(k)==='1')return;
  localStorage.setItem(k,'1');
  const n={
    id:'SUPPLIER_QR-'+String(row.id)+'-'+String(meta.issuedAt||Date.now()),
    event:'SUPPLIER_QR_READY',
    type:'success',
    title:'STIGAO JE QR DOCK',
    body:`${warehouseBusinessName(row.warehouse)} · ${row.date||''} ${row.time||''} · QR je spreman u Stanje najave / Isporuke.`,
    at:new Date().toISOString(),createdAt:new Date().toISOString(),
    roles:['supplier'],supplierDeliveryId:String(row.id),readBy:{}
  };
  try{
    let list=window.YardivoNotifications?.load?.();
    if(!Array.isArray(list))list=JSON.parse(localStorage.getItem('yardivo_live_notifications_v1')||'[]');
    if(!Array.isArray(list))list=[];
    list.unshift(n);list=list.slice(0,300);
    if(window.YardivoNotifications?.save)window.YardivoNotifications.save(list);
    else localStorage.setItem('yardivo_live_notifications_v1',JSON.stringify(list));
    window.YardivoNotifications?.render?.();
  }catch(_){}
  try{
    if(typeof showYmsToast==='function')showYmsToast('success','STIGAO JE QR DOCK','Otvori Povijest najava i preuzmi QR.',5200);
  }catch(_){}
  try{window.dispatchEvent(new CustomEvent('yardivo:supplier-qr-ready',{detail:{id:String(row.id)}}))}catch(_){}
}
function scanSupplierQrNotifications(){
  if(role()!=='supplier')return;
  supplierRows().forEach(row=>{
    const meta=qrMetaFromRow(row);
    if(meta?.qrUrl)pushSupplierQrNotification(row,meta);
  });
}


function warehouseBusinessName(id){
  const raw=String(id||'').trim();
  if(!raw)return '';
  try{
    const m=window.YardivoAppStateV583?.master?.()||JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')||{};
    const w=(Array.isArray(m.warehouses)?m.warehouses:[]).find(x=>x&&String(x.id)===raw);
    return String(w?.name||raw);
  }catch(_){return raw}
}
function logoSrc(){return document.querySelector('img[alt="YARDIVO Yard Management System"]')?.src||''}
function ensureModal(){let m=document.getElementById('yardivoGateQrModalV583');if(m)return m;m=document.createElement('div');m.id='yardivoGateQrModalV583';m.innerHTML=`<div class="ygq-card"><img class="ygq-logo" alt="YARDIVO"><h2>YARDIVO GATE CHECK IN QR CODE</h2><div class="ygq-sub">Jedinstveni QR za Gate ulaz i potvrdu dolaska na rampu</div><div class="ygq-qr" id="yardivoGateQrCanvasV583"></div><div class="ygq-meta" id="yardivoGateQrMetaV583"></div><div class="ygq-actions"><button type="button" data-ygq-close>ZATVORI</button><button type="button" class="primary" data-ygq-pdf>OTVORI PDF / ISPRINTAJ</button></div></div>`;document.body.appendChild(m);m.querySelector('[data-ygq-close]').onclick=()=>m.classList.remove('open');m.onclick=e=>{if(e.target===m)m.classList.remove('open')};m.querySelector('[data-ygq-pdf]').onclick=()=>modalRow&&openPdf(modalRow);return m}
function renderQr(el,text,size=500){if(!window.QRCode)throw new Error('QR biblioteka nije učitana. Provjeri internet vezu.');el.innerHTML='';new QRCode(el,{text,width:size,height:size,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});return el.querySelector('canvas,img')}
function openQr(row){const meta=qrMetaFromRow(row);if(!meta?.qrUrl)return alert('QR još nije poslan.');const m=ensureModal();modalRow=row;const logo=m.querySelector('.ygq-logo');logo.src=logoSrc();const el=document.getElementById('yardivoGateQrCanvasV583');renderQr(el,meta.qrUrl,500);document.getElementById('yardivoGateQrMetaV583').innerHTML=`<strong>${esc(row.id||'')}</strong><br>${esc(row.date||'')} · ${esc(row.time||'')} · ${esc(warehouseBusinessName(row.warehouse))}${row.dock?' · '+esc(row.dock):''}<br>${esc(row.order||'')}`;m.classList.add('open')}
function qrPngData(meta){const holder=document.createElement('div');holder.style.cssText='position:fixed;left:-9999px;top:-9999px;width:700px;height:700px;background:#fff';document.body.appendChild(holder);const node=renderQr(holder,meta.qrUrl,700);let data='';if(node?.tagName==='CANVAS')data=node.toDataURL('image/png');else data=node?.src||'';holder.remove();return data}
function openPdf(row){
  const meta=qrMetaFromRow(row);if(!meta?.qrUrl)return alert('QR još nije poslan.');
  if(!window.jspdf?.jsPDF)return alert('PDF biblioteka nije učitana.');
  try{
    const {jsPDF}=window.jspdf,pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'}),W=210;
    pdf.setFillColor(255,255,255);pdf.rect(0,0,210,297,'F');
    const logo=logoSrc();if(logo){try{pdf.addImage(logo,'PNG',72,14,66,38,undefined,'FAST')}catch(_){}}
    pdf.setTextColor(20,31,39);pdf.setFont('helvetica','bold');pdf.setFontSize(16);pdf.text('YARDIVO GATE CHECK IN QR CODE',W/2,62,{align:'center'});
    pdf.setFont('helvetica','normal');pdf.setFontSize(8.5);pdf.setTextColor(92,108,118);pdf.text('ONE DELIVERY QR - Gate Check-In / Dock confirmation',W/2,68,{align:'center'});
    const png=qrPngData(meta);const qrMm=65,x=(W-qrMm)/2,y=78;pdf.addImage(png,'PNG',x,y,qrMm,qrMm,undefined,'FAST');
    pdf.setDrawColor(220,228,233);pdf.line(42,151,168,151);
    pdf.setTextColor(35,49,58);pdf.setFont('helvetica','bold');pdf.setFontSize(10);pdf.text(String(row.id||'YARDIVO DELIVERY'),W/2,160,{align:'center'});
    pdf.setFont('helvetica','normal');pdf.setFontSize(9);const lines=[`${row.date||''} ${row.time||''}`.trim(),`${warehouseBusinessName(row.warehouse)}${row.dock?' - '+row.dock:''}`.trim(),row.order?`Order: ${row.order}`:''].filter(Boolean);let yy=167;for(const line of lines){pdf.text(String(line),W/2,yy,{align:'center'});yy+=6}
    pdf.setFontSize(7.5);pdf.setTextColor(115,128,136);pdf.text('Show this QR at YARDIVO Gate and later at Reception/Dock.',W/2,194,{align:'center'});pdf.text('QR size: 65 mm',W/2,199,{align:'center'});
    const url=pdf.output('bloburl');window.open(url,'_blank','noopener');
  }catch(e){alert('PDF nije moguće otvoriti:\n'+(e?.message||e))}
}
async function openSupplierQrById(id,pdf=false){try{await window.YardivoSupplierLiveSync?.pullSupplier?.()}catch(_){}scanSupplierQrNotifications();let row=supplierRow(id);if(!row)return alert('Najava nije pronađena.');return pdf?openPdf(row):openQr(row)}
document.addEventListener('click',e=>{
  const send=e.target.closest?.('[data-yardivo-send-gate-qr]');if(send){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();issue(send.dataset.yardivoSendGateQr);return}
  const invOpen=e.target.closest?.('[data-yardivo-open-inventory-gate-qr]');if(invOpen){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openInventoryQrById(invOpen.dataset.yardivoOpenInventoryGateQr);return}
  const open=e.target.closest?.('[data-yardivo-open-gate-qr]');if(open){e.preventDefault();e.stopPropagation();openSupplierQrById(open.dataset.yardivoOpenGateQr,false);return}
  const print=e.target.closest?.('[data-yardivo-print-gate-qr]');if(print){e.preventDefault();e.stopPropagation();openSupplierQrById(print.dataset.yardivoPrintGateQr,true);return}
},true);
window.addEventListener('yardivo:login',()=>{if(role()==='supplier')setTimeout(async()=>{try{await window.YardivoSupplierLiveSync?.pullSupplier?.()}catch(_){}scanSupplierQrNotifications()},500)});
// SMART Review has already required an explicit Inventory approval. A second QR
// preview dialog is unnecessary for this path; the same authenticated Edge
// endpoint still checks the confirmed delivery and generates its own token.
async function issueAfterSmartApproval(id){
 if(!['inventory','admin'].includes(role()))throw new Error('Nema ovlasti za slanje QR koda.');
 const raw=String(id||'');
 if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(raw))throw new Error('Neispravan delivery ID.');
 const announcementId='SUPDEL-'+raw;
 const qr=await edge('issue',{announcementId});
 if(!qr?.qrUrl||!qr?.token)throw new Error('QR DOCK nije izdan.');
 await Promise.resolve(window.YardivoSupplierLiveSync?.pullInternal?.(true)).catch(()=>{});
 window.dispatchEvent(new CustomEvent('yardivo:gate-qr-issued',{detail:{
  id:raw,announcementId,sentAutomaticallyAfterSmart:true
 }}));
 return qr;
}
window.YardivoGateQrV583=Object.assign(window.YardivoGateQrV583||{},{
 issueAfterSmartApproval,
 qrMetaFromRow,
 parseReviewNote,
 cleanReviewNote,
 inventoryButton
});
window.YARDIVO_DEV_BUILD='20260908-dev-v5.8.3-notification-warehouse-scope-fix';
})();
