
(function(){
'use strict';
const MENU_ID='yardivoSupplierContextMenuV583';
const MOBILE_ACTION='data-yv-mobile-supplier-actions';
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
function touchUi(){try{return window.matchMedia('(max-width: 900px), (pointer: coarse)').matches}catch(_){return window.innerWidth<=900}}
function rows(){try{return window.YardivoSupplierPlannerV580?.getRows?.()||[]}catch(_){return[]}}
function rowById(id){return rows().find(x=>String(x.id)===String(id))||null}
function ensure(){let m=document.getElementById(MENU_ID);if(m)return m;m=document.createElement('div');m.id=MENU_ID;m.setAttribute('role','menu');m.setAttribute('aria-label','Akcije najave dobavljača');document.body.appendChild(m);return m}
function close(){const m=document.getElementById(MENU_ID);if(m)m.classList.remove('open')}
function actionButton(label,cls,attrs,icon){const a=Object.entries(attrs||{}).map(([k,v])=>` ${k}="${esc(v)}"`).join('');return `<button type="button" class="${cls||''}"${a}>${icon?`<span>${icon}</span>`:''}<span>${esc(label)}</span></button>`}
function itemsFor(x){
 const s=String(x?.status||'').toLowerCase();let h='';
 if(s==='pending'){h+=actionButton('ODOBRI TERMIN','primary',{'data-v583-approve-request':x.id},'✓');h+=actionButton('PREDLOŽI DRUGI TERMIN','',{'data-v580-plan':x.id},'↔');h+=actionButton('ODBIJ','danger',{'data-v580-reject':x.id},'✕');h+=actionButton('IZBRIŠI NAJAVU','danger',{'data-v583-delete-supplier-request':x.id},'🗑')}
 else if(['revision_requested','proposal_sent'].includes(s)){h+=actionButton(s==='proposal_sent'?'IZMIJENI PRIJEDLOG':'PREDLOŽI DRUGI TERMIN','',{'data-v580-plan':x.id},'↔');h+=actionButton('ODBIJ','danger',{'data-v580-reject':x.id},'✕');h+=actionButton('IZBRIŠI NAJAVU','danger',{'data-v583-delete-supplier-request':x.id},'🗑')}
 else if(s==='reschedule_requested'){h+=actionButton('ODOBRI PROMJENU TERMINA','primary',{'data-v583-resolve-self-request':x.id,'data-decision':'approve'},'✓');h+=actionButton('ODBIJ PROMJENU','danger',{'data-v583-resolve-self-request':x.id,'data-decision':'reject'},'✕')}
 else if(s==='cancel_requested'){h+=actionButton('ODOBRI OTKAZIVANJE','danger',{'data-v583-resolve-self-request':x.id,'data-decision':'approve'},'✓');h+=actionButton('ZADRŽI NAJAVU','',{'data-v583-resolve-self-request':x.id,'data-decision':'reject'},'↩')}
 else if(s==='confirmed'){
  let meta=null;try{meta=window.YardivoGateQrV583?.qrMetaFromRow?.(x)||null}catch(_){meta=null}
  const rr=(x?.reschedule_request&&typeof x.reschedule_request==='object')?x.reschedule_request:null;
  if(rr?.status==='pending')h+=actionButton('ZAHTJEV ZA PROMJENU TERMINA','primary',{'data-v583-reschedule-review':x.id},'↻');
  if(meta?.qrUrl)h+=actionButton('OTVORI QR · GATE CHECK-IN','qr',{'data-yardivo-open-inventory-gate-qr':x.id},'▣');else h+=actionButton('POŠALJI QR ZA DOCK','qr',{'data-yardivo-send-gate-qr':x.id},'▣');
  h+=actionButton('PROMIJENI TERMIN','',{'data-v580-plan':x.id},'↔');h+=actionButton('UREDI PODATKE','',{'data-v583-edit-confirmed':x.id},'✎');h+=actionButton('ODBIJ','danger',{'data-v580-reject':x.id},'✕');h+=actionButton('IZBRIŠI NAJAVU','danger',{'data-v583-delete-supplier-request':x.id},'🗑');
 }
 return h;
}
function syncPlannerWarehouseFromMaster(id){
 const code=String(id||'').trim();if(!code)return null;
 let master={};
 try{master=window.YardivoMasterDataService?.read?.()||window.YardivoAppStateV583?.master?.()||JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')||{}}catch(_){master={}}
 const w=(Array.isArray(master.warehouses)?master.warehouses:[]).find(v=>v&&v.active!==false&&String(v.id)===code);if(!w)return null;
 const activeRamps=(Array.isArray(w.ramp_settings)?w.ramp_settings:[]).filter(r=>r&&r.active!==false&&Number(r.number)>0);
 const cfg={
  code,
  name:String(w.name||code),
  location_id:String(w.location_id||''),
  location:String((master.locations||[]).find(l=>String(l?.id||'')===String(w.location_id||''))?.name||w.location_id||''),
  ramps:activeRamps.length||Number(w.ramps)||0,
  receptionStart:String(w.reception_from||w.receptionStart||'06:00').slice(0,5),
  receptionEnd:String(w.reception_to||w.receptionEnd||'13:00').slice(0,5)
 };
 try{
  let target=null;
  if(typeof WAREHOUSES!=='undefined'&&WAREHOUSES)target=WAREHOUSES;
  else{window.WAREHOUSES=window.WAREHOUSES||{};target=window.WAREHOUSES}
  target[code]={...(target[code]||{}),...cfg};
 }catch(_){try{window.WAREHOUSES=window.WAREHOUSES||{};window.WAREHOUSES[code]={...(window.WAREHOUSES[code]||{}),...cfg}}catch(__){}}
 return cfg;
}
function openFor(x,clientX,clientY){
 if(!x||!canAct())return;syncPlannerWarehouseFromMaster(x.warehouse);const items=itemsFor(x);if(!items)return;const m=ensure();
 const supplier=x.supplier_name||x.supplier_username||'Dobavljač';
 const wh=(window.YardivoAppStateV583?.master?.()?.warehouses||[]).find?.(w=>String(w.id)===String(x.warehouse))?.name||x.warehouse||'';
 m.innerHTML=`<div class="yscm-head"><strong>${esc(supplier)}</strong><small>${esc(wh)} · ${esc(String(x.delivery_date||''))} ${esc(String(x.requested_time||'').slice(0,5))}</small></div>${items}`;
 m.classList.add('open');m.style.left='0px';m.style.top='0px';const r=m.getBoundingClientRect(),pad=10;
 const x0=Number.isFinite(clientX)?clientX:window.innerWidth/2,y0=Number.isFinite(clientY)?clientY:window.innerHeight/2;
 let left=Math.max(pad,Math.min(x0,window.innerWidth-r.width-pad)),top=Math.max(pad,Math.min(y0,window.innerHeight-r.height-pad));
 if(touchUi()){left=Math.max(pad,(window.innerWidth-r.width)/2);top=Math.max(pad,window.innerHeight-r.height-pad)}
 m.style.left=Math.round(left)+'px';m.style.top=Math.round(top)+'px';
}
function decorateRows(){
 const th=document.querySelector('#supplierRequests table thead tr th:nth-child(9)');if(th)th.textContent='';
 const actionsVisible=canAct(),mobile=touchUi();
 document.querySelectorAll('#supplierRequests #ysrBody tr[data-ysr-detail]').forEach(tr=>{
  const id=String(tr.dataset.ysrDetail||''),x=rowById(id);if(x)syncPlannerWarehouseFromMaster(x.warehouse);tr.title=canAct()?(mobile?'Dodirni AKCIJE za upravljanje najavom':'Klikni AKCIJE za upravljanje najavom'):'Klikni za detalje najave';
  const old=tr.querySelector('[data-yv-mobile-supplier-actions]');if(!actionsVisible||!x||!itemsFor(x)){old?.remove();return}if(old)return;
  const first=tr.querySelector('td');if(!first)return;const b=document.createElement('button');b.type='button';b.className='secondary yv-mobile-supplier-actions';b.setAttribute(MOBILE_ACTION,id);b.textContent='AKCIJE';b.style.cssText='display:block!important;min-height:44px;margin-top:8px;padding:8px 12px;font-size:12px;font-weight:900;touch-action:manipulation';first.appendChild(b);
 });
}
/* Native/mobile controls can emit change after the quantity input event. Re-kick the
   existing booking availability listener when warehouse + quantities are all ready. */
function stabilizeSupplierBooking(){
 const wh=document.getElementById('sbnWarehouseSelect'),p=document.getElementById('sbnPallets'),s=document.getElementById('sbnSku');
 if(!wh||!p||!s||wh.dataset.yvAvailabilityStable==='1')return;
 wh.dataset.yvAvailabilityStable='1';
 const kick=()=>{
  if(!String(wh.value||'').trim()||Number(p.value||0)<=0||Number(s.value||0)<=0)return;
  setTimeout(()=>p.dispatchEvent(new Event('input',{bubbles:true})),0);
 };
 ['input','change'].forEach(ev=>wh.addEventListener(ev,kick));
 [p,s].forEach(el=>el.addEventListener('change',()=>el.dispatchEvent(new Event('input',{bubbles:true}))));
}
document.addEventListener('contextmenu',e=>{const tr=e.target.closest?.('#supplierRequests #ysrBody tr[data-ysr-detail]');if(!tr||!canAct())return;const x=rowById(tr.dataset.ysrDetail);if(!x||!itemsFor(x))return;e.preventDefault();e.stopPropagation();openFor(x,e.clientX,e.clientY)},true);
document.addEventListener('click',e=>{
 const mobileBtn=e.target.closest?.('[data-yv-mobile-supplier-actions]');
 if(mobileBtn&&canAct()){const x=rowById(mobileBtn.getAttribute(MOBILE_ACTION));if(x&&itemsFor(x)){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const r=mobileBtn.getBoundingClientRect();openFor(x,r.left+r.width/2,r.bottom+8)}return}
 const m=document.getElementById(MENU_ID);if(!m?.classList.contains('open'))return;const b=e.target.closest?.('#'+MENU_ID+' button');
 if(b){const resolve=b.closest?.('[data-v583-resolve-self-request]');if(resolve){e.preventDefault();e.stopPropagation();const id=resolve.dataset.v583ResolveSelfRequest,decision=resolve.dataset.decision||'reject',row=rowById(id),actionLabel=decision==='approve'?'Potvrditi zahtjev dobavljača?':'Odbiti zahtjev dobavljača?';if(!confirm(actionLabel))return;b.disabled=true;window.YardivoSupplierLiveSync?.call?.('internal_resolve_supplier_request',{id,decision}).then(async()=>{try{await window.YardivoSupplierLiveSync?.pullInternal?.(true)}catch(_){};window.dispatchEvent(new CustomEvent('yardivo:supplier-request-updated',{detail:{id,source:'supplier-self-service-review'}}));try{window.showYmsToast?.('success','ZAHTJEV RIJEŠEN',row?.supplier_name||row?.supplier_username||'Dobavljač')}catch(_){}}).catch(err=>alert('Zahtjev nije moguće riješiti:\n'+String(err?.message||err))).finally(()=>{b.disabled=false;close()});return}setTimeout(close,0);return}
 if(!e.target.closest?.('#'+MENU_ID))close();
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
window.addEventListener('scroll',close,true);window.addEventListener('resize',()=>{close();decorateRows();stabilizeSupplierBooking()});
window.addEventListener('yardivo:supplier-request-updated',()=>setTimeout(decorateRows,80));window.addEventListener('yardivo:supplier-inbox-changed',()=>setTimeout(decorateRows,80));window.addEventListener('yardivo:login',()=>setTimeout(()=>{decorateRows();stabilizeSupplierBooking()},1800));window.addEventListener('load',()=>setTimeout(()=>{decorateRows();stabilizeSupplierBooking()},2800));
const mo=new MutationObserver(()=>decorateRows());window.addEventListener('load',()=>{const b=document.getElementById('ysrBody');if(b)mo.observe(b,{childList:true})});
setTimeout(stabilizeSupplierBooking,600);
window.YardivoSupplierContextActionsV583={close,openFor,rowById,refresh:decorateRows,syncPlannerWarehouseFromMaster};
})();
