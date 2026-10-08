
(function(){
'use strict';
if(window.__YARDIVO_INVENTORY_SUPPLIER_NOTIF_DELETE_20260923__)return;
window.__YARDIVO_INVENTORY_SUPPLIER_NOTIF_DELETE_20260923__=true;
let busy=false,lastSig='',loginSession=null,liveRowsCache=null,pendingBaselineReady=false,loginAtMs=0;
let knownPendingIds=new Set();

function sessionSnapshot(){
  try{
    const live=window.currentSession||null;
    if(live?.role||live?.app_role)return live;
  }catch(_){}
  return loginSession||{};
}
function role(){
  try{const s=sessionSnapshot();let r=String(s.app_role||s.role||'').toLowerCase().trim();if(r==='zalihe'||r==='upravljanje zalihama')r='inventory';return r}catch(_){return''}
}
function user(){
  try{const s=sessionSnapshot();return String(s.username||s.user||role()||'anonymous')}catch(_){return'anonymous'}
}
function inventory(){return role()==='inventory'}
function notifId(id){return 'SUPREQ-'+String(id)}
function rowId(x){return String(x?.id||x?.supplier_delivery_id||x?.supplierDeliveryId||x?.client_id||'').trim()}
function rowTimeMs(x){
  for(const v of [x?.created_at,x?.createdAt,x?.submitted_at,x?.submittedAt,x?.updated_at,x?.updatedAt]){
    const t=Date.parse(String(v||''));if(Number.isFinite(t)&&t>0)return t;
  }
  return 0;
}
function supplierLabel(x){return String(x?.supplier_name||x?.supplier_username||x?.supplier||'Dobavljač').trim()||'Dobavljač'}
function notificationFromRow(x){
  const id=rowId(x),warehouse=String(x?.warehouse||'').trim().toUpperCase(),atRaw=x?.created_at||x?.createdAt||x?.submitted_at||x?.submittedAt||new Date().toISOString();
  const date=String(x?.delivery_date||x?.date||'').slice(0,10),time=String(x?.requested_time||x?.time||'').slice(0,5);
  const pallets=Number(x?.pallets||0),sku=Number(x?.sku_count||x?.skuCount||0);
  const parts=[supplierLabel(x),date,time,warehouse,pallets>0?pallets+' pal.':'',sku>0?sku+' SKU':''].filter(Boolean);
  return {
    id:notifId(id),
    event:'SUPPLIER_REQUEST',
    type:'blue',
    title:'NOVA NAJAVA DOBAVLJAČA',
    body:parts.join(' · '),
    warehouse,
    location:String(x?.location||x?.location_id||'').trim(),
    supplier:supplierLabel(x),
    supplierDeliveryId:id,
    // Visible reference is the supplier's NAJxxxxxx client ID; keep UUID for joins.
    publicAnnouncementId:String(x?.client_id||x?.clientId||'').trim(),
    announcementId:String(x?.announcement_id||x?.announcementId||'SUPDEL-'+id),
    roles:['admin','manager','inventory'],
    createdAt:String(atRaw||new Date().toISOString()),
    at:String(atRaw||new Date().toISOString()),
    readBy:{}
  };
}
function ingestPendingRow(x,announce){
  const id=rowId(x);if(!id||!String(x?.warehouse||'').trim())return false;
  const n=notificationFromRow(x);
  try{
    if(window.YardivoNotifications?.ingest)return !!window.YardivoNotifications.ingest(n,{announce:!!announce});
    const list=notifications().filter(v=>String(v?.id)!==String(n.id));
    list.push(n);localStorage.setItem('yardivo_live_notifications_v1',JSON.stringify(list));
    return true;
  }catch(_){return false}
}
function reconcilePendingNotifications(rows){
  if(!inventory()||!Array.isArray(rows))return;
  const pending=rows.filter(x=>String(x?.status||'').toLowerCase()==='pending'&&rowId(x));
  const nextIds=new Set(pending.map(rowId));
  if(!pendingBaselineReady){
    pendingBaselineReady=true;
    const cut=loginAtMs||Date.now();
    for(const x of pending){
      const id=rowId(x),created=rowTimeMs(x);
      const arrivedThisSession=!!created&&created>=cut-1500;
      ingestPendingRow(x,arrivedThisSession);
      knownPendingIds.add(id);
    }
    knownPendingIds=nextIds;
    return;
  }
  for(const x of pending){
    const id=rowId(x);
    if(!knownPendingIds.has(id))ingestPendingRow(x,true);
  }
  knownPendingIds=nextIds;
}
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
    if(Array.isArray(rows)){
      liveRowsCache=rows;
      return rows.filter(x=>String(x?.status||'').toLowerCase()==='pending');
    }
  }catch(_){}
  return Array.isArray(liveRowsCache)
    ? liveRowsCache.filter(x=>String(x?.status||'').toLowerCase()==='pending')
    : [];
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
    reconcilePendingNotifications(rows);
    if(sig!==lastSig){
      lastSig=sig;
      try{window.dispatchEvent(new CustomEvent('yardivo:supplier-inbox-changed',{detail:{pending:rows.filter(x=>String(x?.status||'').toLowerCase()==='pending').length}}))}catch(_){}
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

window.addEventListener('yardivo:login',e=>{
  loginSession=e?.detail?.session||window.currentSession||loginSession;
  loginAtMs=Date.now();pendingBaselineReady=false;knownPendingIds=new Set();lastSig='';
  try{
    const rows=window.YardivoSupplierLiveSync?.internalRows?.();
    if(Array.isArray(rows)){liveRowsCache=rows;reconcilePendingNotifications(rows)}
  }catch(_){}
  syncSupplierBadge();
  setTimeout(()=>{syncSupplierBadge();poll()},160);
  setTimeout(syncSupplierBadge,520);
});
window.addEventListener('yardivo:data-synced',()=>setTimeout(syncSupplierBadge,120));
window.addEventListener('yardivo:supplier-internal-rows',e=>{
  if(Array.isArray(e?.detail?.rows)){
    liveRowsCache=e.detail.rows;
    reconcilePendingNotifications(e.detail.rows);
  }
  syncSupplierBadge();
  setTimeout(poll,0);
});
window.addEventListener('yardivo:supplier-request-updated',()=>setTimeout(()=>window.YardivoSupplierLiveSync?.pullInternal?.(true),80));
window.addEventListener('yardivo:logout',()=>{loginSession=null;liveRowsCache=null;lastSig='';pendingBaselineReady=false;loginAtMs=0;knownPendingIds=new Set();});
window.addEventListener('focus',poll);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll()});
/* SupplierLiveSync is the sole list_internal polling owner. */
setInterval(syncSupplierBadge,3000);
setTimeout(poll,900);
window.YARDIVO_DEV_BUILD='20260927-dev-v5.8.3-supplier-canonical-notif-delete';
})();
