
(function(){
'use strict';
const MENU_ID='yardivoSupplierContextMenuV583';
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function role(){
  let r='';
  try{r=String((window.currentSession||currentSession||{}).app_role||(window.currentSession||currentSession||{}).role||'').toLowerCase().trim()}
  catch(_){r=String(window.currentSession?.app_role||window.currentSession?.role||'').toLowerCase().trim()}
  if(r==='zalihe'||r==='upravljanje zalihama'||r.includes('zalih'))r='inventory';
  if(r==='voditelj'||r==='management')r='manager';
  if(r==='prijam')r='reception';
  if(r==='porta'||r==='portir')r='gate';
  if(r==='dobavljac'||r==='dobavljač')r='supplier';
  return r;
}
function canAct(){return ['inventory','admin'].includes(role())}
function rows(){try{return window.YardivoSupplierPlannerV580?.getRows?.()||[]}catch(_){return[]}}
function rowById(id){return rows().find(x=>String(x.id)===String(id))||null}
function qrMeta(x){try{return window.YardivoGateQrV583?.qrMetaFromRow?.(x)||null}catch(_){return null}}
function ensure(){
 let m=document.getElementById(MENU_ID);if(m)return m;
 m=document.createElement('div');m.id=MENU_ID;m.setAttribute('role','menu');m.setAttribute('aria-label','Akcije najave dobavljača');document.body.appendChild(m);return m;
}
function close(){const m=document.getElementById(MENU_ID);if(m)m.classList.remove('open')}
function actionButton(label,cls,attrs,icon){
 const a=Object.entries(attrs||{}).map(([k,v])=>` ${k}="${esc(v)}"`).join('');
 return `<button type="button" class="${cls||''}"${a}>${icon?`<span>${icon}</span>`:''}<span>${esc(label)}</span></button>`;
}
function itemsFor(x){
 const s=String(x?.status||'').toLowerCase();
 let h='';
 if(s==='pending'){
   h+=actionButton('ODOBRI TERMIN','primary',{'data-v583-approve-request':x.id},'✓');
   h+=actionButton('PREDLOŽI DRUGI TERMIN','',{'data-v580-plan':x.id},'↔');
   h+=actionButton('ODBIJ','danger',{'data-v580-reject':x.id},'✕');
   h+=actionButton('IZBRIŠI NAJAVU','danger',{'data-v583-delete-supplier-request':x.id},'🗑');
 }else if(['revision_requested','proposal_sent'].includes(s)){
   h+=actionButton(s==='proposal_sent'?'IZMIJENI PRIJEDLOG':'PREDLOŽI DRUGI TERMIN','',{'data-v580-plan':x.id},'↔');
   h+=actionButton('ODBIJ','danger',{'data-v580-reject':x.id},'✕');
   h+=actionButton('IZBRIŠI NAJAVU','danger',{'data-v583-delete-supplier-request':x.id},'🗑');
 }else if(s==='reschedule_requested'){
   h+=actionButton('ODOBRI PROMJENU TERMINA','primary',{'data-v583-resolve-self-request':x.id,'data-decision':'approve'},'✓');
   h+=actionButton('ODBIJ PROMJENU','danger',{'data-v583-resolve-self-request':x.id,'data-decision':'reject'},'✕');
 }else if(s==='cancel_requested'){
   h+=actionButton('ODOBRI OTKAZIVANJE','danger',{'data-v583-resolve-self-request':x.id,'data-decision':'approve'},'✓');
   h+=actionButton('ZADRŽI NAJAVU','',{'data-v583-resolve-self-request':x.id,'data-decision':'reject'},'↩');
 }else if(s==='confirmed'){
   let meta=null;try{meta=window.YardivoGateQrV583?.qrMetaFromRow?.(x)||null}catch(_){meta=null}
   const rr=(x?.reschedule_request&&typeof x.reschedule_request==='object')?x.reschedule_request:null;
   if(rr?.status==='pending')h+=actionButton('ZAHTJEV ZA PROMJENU TERMINA','primary',{'data-v583-reschedule-review':x.id},'↻');
   if(meta?.qrUrl)h+=actionButton('OTVORI QR · GATE CHECK-IN','qr',{'data-yardivo-open-inventory-gate-qr':x.id},'▣');
   else h+=actionButton('POŠALJI QR ZA DOCK','qr',{'data-yardivo-send-gate-qr':x.id},'▣');
   h+=actionButton('PROMIJENI TERMIN','',{'data-v580-plan':x.id},'↔');
   h+=actionButton('UREDI PODATKE','',{'data-v583-edit-confirmed':x.id},'✎');
   h+=actionButton('ODBIJ','danger',{'data-v580-reject':x.id},'✕');
   h+=actionButton('IZBRIŠI NAJAVU','danger',{'data-v583-delete-supplier-request':x.id},'🗑');
 }
 return h;
}
function openFor(x,clientX,clientY){
 if(!x||!canAct())return;
 const items=itemsFor(x);if(!items)return;
 const m=ensure();
 const supplier=x.supplier_name||x.supplier_username||'Dobavljač';
 const wh=(window.YardivoAppStateV583?.master?.()?.warehouses||[]).find?.(w=>String(w.id)===String(x.warehouse))?.name||x.warehouse||'';
 m.innerHTML=`<div class="yscm-head"><strong>${esc(supplier)}</strong><small>${esc(wh)} · ${esc(String(x.delivery_date||''))} ${esc(String(x.requested_time||'').slice(0,5))}</small></div>${items}`;
 m.classList.add('open');m.style.left='0px';m.style.top='0px';
 const r=m.getBoundingClientRect(),pad=10;
 let left=Math.max(pad,Math.min(clientX,window.innerWidth-r.width-pad));
 let top=Math.max(pad,Math.min(clientY,window.innerHeight-r.height-pad));
 m.style.left=left+'px';m.style.top=top+'px';
}
function cleanHeader(){
 const th=document.querySelector('#supplierRequests table thead tr th:nth-child(9)');
 if(th)th.textContent='';
 document.querySelectorAll('#supplierRequests #ysrBody tr[data-ysr-detail]').forEach(tr=>{
   tr.title=canAct()?'Desni klik za akcije najave':'Klikni za detalje najave';
 });
}
document.addEventListener('contextmenu',e=>{
 const tr=e.target.closest?.('#supplierRequests #ysrBody tr[data-ysr-detail]');
 if(!tr||!canAct())return;
 const x=rowById(tr.dataset.ysrDetail);if(!x||!itemsFor(x))return;
 e.preventDefault();e.stopPropagation();openFor(x,e.clientX,e.clientY);
},true);
document.addEventListener('click',e=>{
 const m=document.getElementById(MENU_ID);
 if(!m?.classList.contains('open'))return;
 const b=e.target.closest?.('#'+MENU_ID+' button');
 if(b){
   const resolve=b.closest?.('[data-v583-resolve-self-request]');
   if(resolve){
     e.preventDefault();e.stopPropagation();
     const id=resolve.dataset.v583ResolveSelfRequest,decision=resolve.dataset.decision||'reject';
     const row=rowById(id);
     const actionLabel=decision==='approve'?'Potvrditi zahtjev dobavljača?':'Odbiti zahtjev dobavljača?';
     if(!confirm(actionLabel))return;
     b.disabled=true;
     window.YardivoSupplierLiveSync?.call?.('internal_resolve_supplier_request',{id,decision})
       .then(async()=>{try{await window.YardivoSupplierLiveSync?.pullInternal?.(true)}catch(_){};window.dispatchEvent(new CustomEvent('yardivo:supplier-request-updated',{detail:{id,source:'supplier-self-service-review'}}));try{window.showYmsToast?.('success','ZAHTJEV RIJEŠEN',row?.supplier_name||row?.supplier_username||'Dobavljač')}catch(_){}})
       .catch(err=>alert('Zahtjev nije moguće riješiti:\n'+String(err?.message||err)))
       .finally(()=>{b.disabled=false;close()});
     return;
   }
   setTimeout(close,0);return
 }
 if(!e.target.closest?.('#'+MENU_ID))close();
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
window.addEventListener('scroll',close,true);window.addEventListener('resize',close);
window.addEventListener('yardivo:supplier-request-updated',()=>setTimeout(cleanHeader,80));
window.addEventListener('yardivo:supplier-inbox-changed',()=>setTimeout(cleanHeader,80));
window.addEventListener('yardivo:login',()=>setTimeout(cleanHeader,1800));
window.addEventListener('load',()=>setTimeout(cleanHeader,2800));
const mo=new MutationObserver(()=>cleanHeader());
window.addEventListener('load',()=>{const b=document.getElementById('ysrBody');if(b)mo.observe(b,{childList:true});});
window.YardivoSupplierContextActionsV583={close,openFor,rowById};
})();
