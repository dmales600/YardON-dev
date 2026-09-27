
(function(){
'use strict';
if(window.__YARDIVO_INVENTORY_SUPPLIER_NOTIF_DELETE_20260923__)return;
window.__YARDIVO_INVENTORY_SUPPLIER_NOTIF_DELETE_20260923__=true;
let busy=false,lastSig='';

function role(){
  try{const s=window.currentSession||{};let r=String(s.app_role||s.role||'').toLowerCase().trim();if(r==='zalihe'||r==='upravljanje zalihama')r='inventory';return r}catch(_){return''}
}
function user(){
  try{const s=window.currentSession||{};return String(s.username||s.user||role()||'anonymous')}catch(_){return'anonymous'}
}
function inventory(){return role()==='inventory'}
function notifId(id){return 'SUPREQ-'+String(id)}
function notifications(){
  try{
    const a=window.YardivoNotifications?.load?.();
    if(Array.isArray(a))return a;
    const b=JSON.parse(localStorage.getItem('yardivo_live_notifications_v1')||'[]');
    return Array.isArray(b)?b:[];
  }catch(_){return[]}
}
function isUnreadSupplier(n){
  if(String(n?.event||'').toUpperCase()!=='SUPPLIER_REQUEST')return false;
  const rb=n?.readBy&&typeof n.readBy==='object'?n.readBy:{};
  return !rb[user()];
}
function pendingRows(){
  try{
    const rows=window.YardivoSupplierLiveSync?.internalRows?.();
    return Array.isArray(rows)?rows.filter(x=>String(x?.status||'').toLowerCase()==='pending'):[];
  }catch(_){return[]}
}
function syncSupplierBadge(){
  if(!inventory())return;
  const rows=pendingRows();
  const n=rows.length;
  const b=document.getElementById('supplierRequestsBadge');
  if(b){
    b.textContent=String(n);
    b.style.setProperty('display',n>0?'inline-flex':'none','important');
    b.setAttribute('aria-label',n+' novih Supplier najava koje čekaju obradu');
  }
  try{window.YardivoNotifications?.render?.()}catch(_){}
}
function removeLocalNotification(id){
  const target=String(id);
  const list=notifications().filter(n=>String(n?.id)!==notifId(target)&&String(n?.supplierDeliveryId||'')!==target);
  try{window.YardivoNotifications?.save?.(list)}catch(_){try{localStorage.setItem('yardivo_live_notifications_v1',JSON.stringify(list))}catch(__){}}
  syncSupplierBadge();
}
async function poll(){
  if(!inventory()||busy||document.hidden||!window.YardivoSupplierLiveSync?.call)return;
  busy=true;
  try{
    const rows=window.YardivoSupplierLiveSync.internalRows?.();
    if(!Array.isArray(rows))return;
    const sig=rows.map(x=>String(x.id)+':'+String(x.status)).sort().join('|');
    if(sig!==lastSig){
      lastSig=sig;
      try{window.dispatchEvent(new CustomEvent('yardivo:supplier-inbox-changed',{detail:{pending:rows.filter(x=>x.status==='pending').length}}))}catch(_){}
    }
    syncSupplierBadge();
  }catch(_){}
  finally{busy=false}
}
async function deleteRequest(id){
  if(!inventory()&&role()!=='admin')return;
  const x=window.YardivoSupplierContextActionsV583?.rowById?.(id)||null;
  const label=x?(String(x.supplier_name||x.supplier_username||'Dobavljač')+' · '+String(x.delivery_date||'')):'ovu najavu';
  if(!confirm('Trajno izbrisati '+label+'?'))return;
  if(!confirm('Potvrdi brisanje Supplier najave. Ova radnja se ne može poništiti.'))return;
  try{
    const result=await window.YardivoSupplierLiveSync.call('delete_internal',{id:String(id)});
    if(result?.status!=='cancelled'&&result?.tombstone!==true)throw new Error('Server nije potvrdio brisanje najave.');
    removeLocalNotification(id);
    try{await window.YardivoSupplierLiveSync.pullInternal?.(true)}catch(_){}
    try{await window.YardivoSupplierRequests?.load?.()}catch(_){}
    try{await window.YardivoSupplierPlannerV580?.refresh?.(true)}catch(_){}
    try{window.YardivoSupplierContextActionsV583?.close?.()}catch(_){}
    try{window.dispatchEvent(new CustomEvent('yardivo:supplier-request-updated',{detail:{id:String(id),deleted:true}}))}catch(_){}
    try{if(typeof showYmsToast==='function')showYmsToast('success','NAJAVA IZBRISANA','Supplier najava je uklonjena.',3200)}catch(_){}
    setTimeout(poll,80);
  }catch(e){alert('Brisanje najave nije uspjelo:\n'+(e?.message||e))}
}

document.addEventListener('contextmenu',e=>{
  const tr=e.target.closest?.('#supplierRequests #ysrBody tr[data-ysr-detail]');
  if(!tr||(!inventory()&&role()!=='admin'))return;
  const id=String(tr.dataset.ysrDetail||'');
  if(!id)return;
  setTimeout(()=>{
    const menu=document.getElementById('yardivoSupplierContextMenuV583');
    const x=window.YardivoSupplierContextActionsV583?.rowById?.(id)||null;
    const st=String(x?.status||'').toLowerCase();
    if(!menu?.classList.contains('open')||['arrival','dock','receiving','completed'].includes(st))return;
    if(menu.querySelector('[data-v583-delete-supplier-request]'))return;
    const b=document.createElement('button');
    b.type='button';b.className='danger';b.dataset.v583DeleteSupplierRequest=id;
    b.innerHTML='<span>🗑</span><span>IZBRIŠI NAJAVU</span>';
    menu.appendChild(b);
    const r=menu.getBoundingClientRect();
    if(r.bottom>window.innerHeight-10)menu.style.top=Math.max(10,window.innerHeight-r.height-10)+'px';
  },0);
},true);

document.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-v583-delete-supplier-request]');
  if(b){
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    void deleteRequest(b.dataset.v583DeleteSupplierRequest);
    return;
  }
},true);

window.addEventListener('yardivo:login',()=>setTimeout(poll,500));
window.addEventListener('yardivo:data-synced',()=>setTimeout(syncSupplierBadge,120));
window.addEventListener('yardivo:supplier-internal-rows',()=>setTimeout(poll,0));
window.addEventListener('yardivo:supplier-request-updated',()=>setTimeout(()=>window.YardivoSupplierLiveSync?.pullInternal?.(true),80));
window.addEventListener('focus',poll);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll()});
/* SupplierLiveSync is the sole list_internal polling owner. */
setInterval(syncSupplierBadge,3000);
setTimeout(poll,900);
window.YARDIVO_DEV_BUILD='20260927-dev-v5.8.3-supplier-canonical-notif-delete';
})();
