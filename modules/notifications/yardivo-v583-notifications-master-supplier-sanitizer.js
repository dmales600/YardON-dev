
(()=>{'use strict';
if(window.__YARDIVO_NOTIFICATION_MASTER_SANITIZER__)return;
window.__YARDIVO_NOTIFICATION_MASTER_SANITIZER__=true;
function master(){try{return window.YardivoAppStateV583?.master?.()||JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')||{}}catch(_){return{}}}
function norm(v){return String(v||'').trim().toLowerCase()}
const CUT_KEY='yardivo_notification_clear_cutoff_v583';
function cutoffMs(){try{const t=Date.parse(localStorage.getItem(CUT_KEY)||'');return Number.isFinite(t)?t:0}catch(_){return 0}}
function eventMs(n){const t=Date.parse(String(n?.at||n?.createdAt||n?.updatedAt||n?.timestamp||''));return Number.isFinite(t)?t:0}
function afterCutoff(n){const c=cutoffMs();if(!c)return true;const t=eventMs(n);return !!t&&t>c}
function aliases(){
 const s=new Set();
 (Array.isArray(master().suppliers)?master().suppliers:[]).filter(x=>x&&x.active!==false).forEach(x=>{
  [x.id,x.name,x.supplier_code,x.code].forEach(v=>{const n=norm(v);if(n)s.add(n)});
 });
 return s;
}
function supplierLike(n){const e=String(n?.event||'').toUpperCase(),t=String(n?.title||'').toUpperCase();return !!(n?.supplier||n?.supplier_id||e.includes('SUPPLIER')||t.includes('DOBAVLJA'))}
function candidate(n){
 const d=[n?.supplier,n?.supplier_id,n?.supplier_name,n?.supplier_code].map(norm).find(Boolean);if(d)return d;
 const b=String(n?.body||'').trim();return b.includes('·')?norm(b.split('·')[0]):'';
}
function hasRetiredSupplierMention(n,active){
 const text=[n?.title,n?.body].map(x=>String(x||'')).join(' ');
 const rx=/\\bDobavljač\\s+(\\d{1,3})\\b/gi;let m;
 while((m=rx.exec(text))){
   const num=Number(m[1]);
   if(num>=1&&num<=262&&!active.has(norm('Dobavljač '+num))&&!active.has(norm('SUP'+String(num).padStart(3,'0'))))return true;
 }
 return false;
}
function clean(list){
 if(!Array.isArray(list))return [];
 const a=aliases();
 // Never purge notifications while Master data has not yet loaded.
 if(!a.size)return list.filter(afterCutoff);
 return list.filter(n=>{
   if(!afterCutoff(n)||hasRetiredSupplierMention(n,a))return false;
   if(!supplierLike(n))return true;
   const c=candidate(n);
   return !c||a.has(c);
 });
}
function storage(){
 let changed=false;
 for(const k of ['yardivo_live_notifications_v1','yardivo_notifications_v1','yardivoNotifications']){
  try{
    const r=localStorage.getItem(k);if(!r)continue;
    const p=JSON.parse(r);if(!Array.isArray(p))continue;
    const c=clean(p);
    if(c.length!==p.length){localStorage.setItem(k,JSON.stringify(c));changed=true}
  }catch(_){}
 }
 return changed;
}
function patch(){
 const N=window.YardivoNotifications;if(!N||N.__masterClean)return;N.__masterClean=true;
 if(typeof N.load==='function'){const o=N.load.bind(N);N.load=()=>clean(o())}
 if(typeof N.save==='function'){const o=N.save.bind(N);N.save=list=>o(clean(list))}
}
function run(){
 const changed=storage();
 patch();
 if(changed){try{window.YardivoNotifications?.render?.()}catch(_){}}
}
['yardivo:login','yardivo:data-synced','yardivo:master-data-changed','yardivo:notifications-changed'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(run,20)));
window.addEventListener('load',()=>setTimeout(run,700));setTimeout(run,100);
})();
