(()=>{'use strict';
if(window.__YARDON_SUPPLIER_SELF_SERVICE_V2__)return;
window.__YARDON_SUPPLIER_SELF_SERVICE_V2__=true;

const $=id=>document.getElementById(id);
const portal=()=>$('yardivoSupplierPortal');
const langKey=()=>{const s=window.currentSession||{};return 'yardivo_supplier_language_v549_'+String(s.authUserId||s.username||s.user||'supplier')};
const lang=()=>{try{return localStorage.getItem(langKey())==='en'?'en':'hr'}catch(_){return'hr'}};
const isSupplier=()=>String(window.currentSession?.role||window.currentSession?.app_role||'').toLowerCase()==='supplier';
const rows=()=>window.YardivoSupplierHistoryStatusServerV583?.rows?.()||[];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const T={
 hr:{
  navMessages:'PORUKE',navDocuments:'DOKUMENTI',navPerformance:'MOJ UČINAK',
  messagesTitle:'Poruke',messagesHelp:'Razgovor s YardOn timom. Poruku možete vezati uz konkretnu najavu.',
  documentsTitle:'Dokumenti',documentsHelp:'PDF dokumenti poslani uz vaše najave.',
  performanceTitle:'Moj učinak',performanceHelp:'Sažetak isporuka ovog Supplier accounta.',
  messagesPage:'Poruke',messagesSub:'Razgovor s YardOn timom i poruke vezane uz vaše najave.',
  documentsPage:'Dokumenti',documentsSub:'Pregled PDF dokumenata povezanih s vašim najavama.',
  performancePage:'Moj učinak',performanceSub:'Pregled aktivnosti i uspješnosti ovog Supplier accounta.',
  allMessages:'Sve poruke',chooseAnnouncement:'Odaberi najavu',writeMessage:'Napišite poruku...',send:'POŠALJI',
  noMessages:'Nema poruka.',loading:'Učitavanje…',open:'OTVORI',noDocuments:'Nema spremljenih PDF dokumenata.',
  announcement:'NAJAVA',date:'DATUM',warehouse:'SKLADIŠTE',document:'DOKUMENT',action:'AKCIJA',
  total:'UKUPNO NAJAVA',completed:'ZAVRŠENE',active:'AKTIVNE',issues:'ODBIJENE / OTKAZANE',completion:'STOPA ZAVRŠETKA',
  reschedule:'PROMIJENI TERMIN',cancel:'OTKAŽI NAJAVU',reason:'Razlog / napomena',requestSent:'Zahtjev je poslan Upravljanju zalihama.',
  cancelReason:'Upišite razlog otkazivanja.',resDate:'Željeni datum (YYYY-MM-DD), ostavite prazno ako se ne mijenja:',resTime:'Željeni termin (HH:MM), ostavite prazno ako se ne mijenja:',resDock:'Željena rampa (npr. R2), ostavite prazno ako se ne mijenja:',resNote:'Napomena za Upravljanje zalihama:',
  requestFailed:'Zahtjev nije poslan',docFailed:'Dokument nije moguće otvoriti.',
  pending:'ČEKA POTVRDU',confirmed:'POTVRĐENO',revision_requested:'VRAĆENO NA DORADU',proposal_sent:'PRIJEDLOG TERMINA',reschedule_requested:'ZAHTJEV ZA PROMJENU',cancel_requested:'ZAHTJEV ZA OTKAZIVANJE',rejected:'ODBIJENO',arrival:'U DVORIŠTU',dock:'NA RAMPI',receiving:'ZAPRIMANJE',completed:'ZAPRIMLJENO',cancelled:'OTKAZANO'
 },
 en:{
  navMessages:'MESSAGES',navDocuments:'DOCUMENTS',navPerformance:'MY PERFORMANCE',
  messagesTitle:'Messages',messagesHelp:'Conversation with the YardOn team. Messages can be linked to a specific announcement.',
  documentsTitle:'Documents',documentsHelp:'PDF documents submitted with your announcements.',
  performanceTitle:'My performance',performanceHelp:'Summary of deliveries for this Supplier account.',
  messagesPage:'Messages',messagesSub:'Conversation with the YardOn team and messages linked to your announcements.',
  documentsPage:'Documents',documentsSub:'PDF documents linked to your announcements.',
  performancePage:'My performance',performanceSub:'Activity and completion overview for this Supplier account.',
  allMessages:'All messages',chooseAnnouncement:'Choose announcement',writeMessage:'Write a message...',send:'SEND',
  noMessages:'No messages.',loading:'Loading…',open:'OPEN',noDocuments:'No PDF documents are available.',
  announcement:'ANNOUNCEMENT',date:'DATE',warehouse:'WAREHOUSE',document:'DOCUMENT',action:'ACTION',
  total:'TOTAL ANNOUNCEMENTS',completed:'COMPLETED',active:'ACTIVE',issues:'REJECTED / CANCELLED',completion:'COMPLETION RATE',
  reschedule:'CHANGE APPOINTMENT',cancel:'CANCEL ANNOUNCEMENT',reason:'Reason / note',requestSent:'Request sent to Inventory Management.',
  cancelReason:'Enter a cancellation reason.',resDate:'Requested date (YYYY-MM-DD), leave blank if unchanged:',resTime:'Requested time (HH:MM), leave blank if unchanged:',resDock:'Requested dock (e.g. R2), leave blank if unchanged:',resNote:'Note for Inventory Management:',
  requestFailed:'Request was not sent',docFailed:'Document could not be opened.',
  pending:'AWAITING CONFIRMATION',confirmed:'CONFIRMED',revision_requested:'CHANGES REQUESTED',proposal_sent:'APPOINTMENT PROPOSAL',reschedule_requested:'CHANGE REQUESTED',cancel_requested:'CANCELLATION REQUESTED',rejected:'REJECTED',arrival:'IN YARD',dock:'AT DOCK',receiving:'RECEIVING',completed:'RECEIVED',cancelled:'CANCELLED'
 }
};
const tr=k=>T[lang()]?.[k]||T.hr[k]||k;

function translateStatic(){
 const p=portal();if(!p||!isSupplier())return;
 p.querySelectorAll('[data-i18n]').forEach(el=>{const k=el.dataset.i18n;if(T[lang()]?.[k])el.textContent=tr(k)});
 const title=$('yspTitle'),sub=$('yspSubtitle'),active=p.querySelector('.ysp-nav [data-ysp-view].active')?.dataset.yspView||'new';
 const map={messages:['messagesPage','messagesSub'],documents:['documentsPage','documentsSub'],performance:['performancePage','performanceSub']};
 if(map[active]&&title&&sub){title.textContent=tr(map[active][0]);sub.textContent=tr(map[active][1])}
 // Supplier booking view: translate all user-facing fixed labels.
 const pairs=[
  ['SUPPLIER · NOVA NAJAVA','SUPPLIER · NEW ANNOUNCEMENT'],['Nova najava dostave','New delivery announcement'],
  ['Odaberi datum, zatim lokaciju i skladište, unesi količinu i izaberi slobodan termin.','Choose a date, then location and warehouse, enter quantity and select an available slot.'],
  ['ODABERI DATUM','CHOOSE DATE'],['Kalendar je prvi korak. Neradni dan se može pregledati, ali nema dostupnih termina.','The calendar is the first step. Closed days can be viewed but have no available slots.'],
  ['LOKACIJA I SKLADIŠTE','LOCATION AND WAREHOUSE'],['Prikazuju se samo opcije koje je Admin dodijelio ovom Supplier accountu.','Only locations and warehouses assigned to this Supplier account are shown.'],
  ['KOLIČINA','QUANTITY'],['Broj paleta određuje koliko dugo rampa mora biti rezervirana.','Pallet quantity determines the required dock reservation time.'],
  ['DNEVNA MAPA TERMINA','DAILY SLOT MAP'],['POVEĆAJ MAPU','EXPAND MAP'],['SLOBODNO','AVAILABLE'],['ZAUZETO / NERADNO','OCCUPIED / CLOSED'],['ODABRANO','SELECTED'],
  ['PREPORUČEN TERMIN','RECOMMENDED SLOT'],['PRIKAŽI PREPORUKU','SHOW RECOMMENDATION'],['TERMIN NIJE ODABRAN','NO SLOT SELECTED'],
  ['DODATNI PODACI · OPCIONALNO','ADDITIONAL DETAILS · OPTIONAL'],['Broj narudžbe','Purchase order'],['Referenca / dostavnica','Reference / delivery note'],
  ['Registracija vozila','Vehicle registration'],['Registracija prikolice','Trailer registration'],['Vozač','Driver'],['Kontakt vozača','Driver contact'],['Napomena','Note'],
  ['PRILOŽI PDF','ATTACH PDF'],['Nije odabran dokument · max 1.5 MB','No document selected · max 1.5 MB'],['OČISTI','CLEAR'],['POŠALJI NAJAVU U ZALIHE','SEND ANNOUNCEMENT TO INVENTORY'],
  ['Zaprimljene i odbijene narudžbe ovog Supplier računa.','Received and rejected orders for this Supplier account.'],
  ['NAJAVA','ANNOUNCEMENT'],['DATUM / TERMIN','DATE / TIME'],['SKLADIŠTE','WAREHOUSE'],['NARUDŽBA / PO','ORDER / PO'],['STATUS','STATUS'],['RAMPA','DOCK'],['VOZILO / QR DOCK','VEHICLE / QR DOCK']
 ];
 if(lang()==='en'){
  p.querySelectorAll('h2,h3,strong,small,p,span,button,label,summary,th,option,div').forEach(el=>{
   if(el.children.length&& !['BUTTON','LABEL','SUMMARY','TH','OPTION'].includes(el.tagName))return;
   const v=(el.textContent||'').trim();
   for(const [hr,en] of pairs){if(v===hr){el.textContent=en;break}}
  });
 }
 renderExtras();
}

function statusText(s){return tr(String(s||'pending').toLowerCase())}

function renderPerformance(){
 const root=$('yspPerformanceRoot');if(!root)return;
 const rr=rows(),terminal=new Set(['completed','rejected','cancelled','canceled']);
 const total=rr.length,completed=rr.filter(x=>x.status==='completed').length,issues=rr.filter(x=>['rejected','cancelled','canceled'].includes(x.status)).length,active=rr.filter(x=>!terminal.has(x.status)).length;
 const denom=completed+issues,rate=denom?Math.round(completed/denom*100):0;
 root.innerHTML='<div class="ysp-perf-grid">'+
  [[tr('total'),total],[tr('completed'),completed],[tr('active'),active],[tr('issues'),issues],[tr('completion'),rate+'%']]
  .map(x=>'<div class="ysp-perf-kpi"><small>'+esc(x[0])+'</small><strong>'+esc(x[1])+'</strong></div>').join('')+
  '</div>';
}

async function openDocument(id){
 try{
  const d=await window.YardivoSupplierService?.deliveries?.('supplier_get_document',{client_id:id});
  const base64=String(d?.document_base64||'');if(!base64)throw new Error('missing document');
  const binary=atob(base64),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  const blob=new Blob([bytes],{type:d.document_mime||'application/pdf'}),url=URL.createObjectURL(blob);
  window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch(e){alert(tr('docFailed')+'\n'+String(e?.message||e))}
}
function renderDocuments(){
 const root=$('yspDocumentsRoot');if(!root)return;
 const docs=rows().filter(x=>x.docName);
 if(!docs.length){root.innerHTML='<div class="ysph-empty">'+esc(tr('noDocuments'))+'</div>';return}
 root.innerHTML='<div class="data-wrap"><table class="ysp-table"><thead><tr><th>'+tr('announcement')+'</th><th>'+tr('date')+'</th><th>'+tr('warehouse')+'</th><th>'+tr('document')+'</th><th>'+tr('action')+'</th></tr></thead><tbody>'+
 docs.map(x=>'<tr><td><strong>'+esc(x.id)+'</strong></td><td>'+esc(x.date||'—')+'</td><td>'+esc(x.warehouse||'—')+'</td><td>'+esc(x.docName)+'</td><td><button type="button" class="btn-primary" data-ysp-doc-open="'+esc(x.id)+'">'+tr('open')+'</button></td></tr>').join('')+
 '</tbody></table></div>';
}

let selectedContext='';
async function renderMessages(){
 const root=$('yspMessagesRoot');if(!root)return;
 root.innerHTML='<div class="ysp-msg-tools"><select id="yspMsgContext"><option value="">'+tr('allMessages')+'</option>'+rows().map(x=>'<option value="'+esc(x.id)+'">'+esc(x.id)+' · '+esc(x.order||x.date||'')+'</option>').join('')+'</select></div><div id="yspMsgList" class="ysp-msg-list">'+tr('loading')+'</div><div class="ysp-msg-compose"><textarea id="yspMsgBody" rows="3" placeholder="'+esc(tr('writeMessage'))+'"></textarea><button type="button" class="btn-primary" id="yspMsgSend">'+tr('send')+'</button></div>';
 const sel=$('yspMsgContext');if(sel){sel.value=selectedContext;sel.onchange=()=>{selectedContext=sel.value;loadMessages()}}
 const send=$('yspMsgSend');if(send)send.onclick=sendMessage;
 await loadMessages();
}
async function loadMessages(){
 const list=$('yspMsgList');if(!list)return;
 try{
  const data=await window.YardivoSupplierService?.call?.('yardivo-help-chat',{action:'list_messages',context_id:selectedContext||''});
  const a=Array.isArray(data)?data:[];
  list.innerHTML=a.length?a.map(m=>'<div class="ysp-msg '+(String(m.sender_user_id)===String(window.currentSession?.authUserId)?'mine':'theirs')+'"><div>'+esc(m.body)+'</div><small>'+esc(m.sender_username||'YardOn')+' · '+new Date(m.created_at).toLocaleString(lang()==='en'?'en-GB':'hr-HR')+'</small></div>').join(''):'<div class="ysph-empty">'+tr('noMessages')+'</div>';
  list.scrollTop=list.scrollHeight;
 }catch(e){list.innerHTML='<div class="ysph-empty">'+esc(String(e?.message||e))+'</div>'}
}
async function sendMessage(){
 const body=String($('yspMsgBody')?.value||'').trim();if(!body)return;
 const btn=$('yspMsgSend');if(btn){btn.disabled=true}
 try{
  await window.YardivoSupplierService?.call?.('yardivo-help-chat',{action:'send',body,context_type:selectedContext?'supplier_delivery':null,context_id:selectedContext||null});
  $('yspMsgBody').value='';await loadMessages();
 }catch(e){alert(String(e?.message||e))}finally{if(btn)btn.disabled=false}
}

async function requestReschedule(id){
 const x=rows().find(r=>String(r.id)===String(id));if(!x)return;
 const d=prompt(tr('resDate'),x.date||'');if(d===null)return;
 const t=prompt(tr('resTime'),x.time||'');if(t===null)return;
 const dock=prompt(tr('resDock'),x.dock||'');if(dock===null)return;
 const note=prompt(tr('resNote'),'');if(note===null)return;
 try{
  await window.YardivoSupplierService?.deliveries?.('supplier_reschedule_request',{client_id:id,proposed_date:d.trim()||null,proposed_time:t.trim()||null,proposed_dock:dock.trim()||null,note:note.trim()});
  alert(tr('requestSent'));await window.YardivoSupplierHistoryStatusServerV583?.pull?.(true);
 }catch(e){alert(tr('requestFailed')+': '+String(e?.message||e))}
}
async function requestCancel(id){
 const note=prompt(tr('cancelReason'),'');if(note===null||!note.trim())return;
 if(!confirm((lang()==='en'?'Send cancellation request?':'Poslati zahtjev za otkazivanje?')))return;
 try{
  await window.YardivoSupplierService?.deliveries?.('supplier_cancel_request',{client_id:id,note:note.trim()});
  alert(tr('requestSent'));await window.YardivoSupplierHistoryStatusServerV583?.pull?.(true);
 }catch(e){alert(tr('requestFailed')+': '+String(e?.message||e))}
}
function decorateActions(){
 const p=portal();if(!p)return;
 p.querySelectorAll('[data-ysp-self-reschedule]').forEach(b=>b.textContent=tr('reschedule'));
 p.querySelectorAll('[data-ysp-self-cancel]').forEach(b=>b.textContent=tr('cancel'));
 p.querySelectorAll('.ysph-status').forEach(el=>{
  const txt=(el.textContent||'').trim().toUpperCase();
  const mapHr={'ČEKA POTVRDU':'pending','POTVRĐENO':'confirmed','VRAĆENO NA DORADU':'revision_requested','PRIJEDLOG TERMINA':'proposal_sent','ZAHTJEV ZA PROMJENU':'reschedule_requested','ZAHTJEV ZA OTKAZIVANJE':'cancel_requested','ODBIJENO':'rejected','U DVORIŠTU':'arrival','NA RAMPI':'dock','ZAPRIMANJE':'receiving','ZAPRIMLJENO':'completed','OTKAZANO':'cancelled'};
  const key=mapHr[txt];if(key&&lang()==='en')el.textContent=tr(key);
 });
}
function renderExtras(){if(!isSupplier())return;renderPerformance();renderDocuments();decorateActions();const active=portal()?.querySelector('[data-ysp-view].active')?.dataset.yspView;if(active==='messages'&&!$('yspMsgList'))renderMessages()}

document.addEventListener('click',e=>{
 const rs=e.target.closest?.('[data-ysp-self-reschedule]');if(rs){e.preventDefault();e.stopPropagation();requestReschedule(rs.dataset.yspSelfReschedule);return}
 const ca=e.target.closest?.('[data-ysp-self-cancel]');if(ca){e.preventDefault();e.stopPropagation();requestCancel(ca.dataset.yspSelfCancel);return}
 const doc=e.target.closest?.('[data-ysp-doc-open]');if(doc){e.preventDefault();openDocument(doc.dataset.yspDocOpen);return}
 const nav=e.target.closest?.('#yardivoSupplierPortal [data-ysp-view]');if(nav)setTimeout(()=>{translateStatic();if(nav.dataset.yspView==='messages')renderMessages()},20);
 const lb=e.target.closest?.('#yardivoSupplierPortal [data-lang]');if(lb)setTimeout(()=>{translateStatic();renderMessages();renderDocuments();renderPerformance()},30);
},true);

['yardivo:login','yardivo:supplier-mine-rows','yardivo:supplier-request-updated'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(translateStatic,120)));
const mo=new MutationObserver(()=>{if(isSupplier())setTimeout(()=>{decorateActions()},0)});
window.addEventListener('load',()=>{const p=portal();if(p)mo.observe(p,{childList:true,subtree:true});setTimeout(translateStatic,600)},{once:true});
setTimeout(translateStatic,300);
window.YardOnSupplierSelfServiceV2={render:translateStatic,requestReschedule,requestCancel,renderMessages,renderDocuments,renderPerformance};
})();