(()=>{'use strict';
if(window.__YARDON_AI_PLAN_MAP_AUTHORITY_V1__)return;
window.__YARDON_AI_PLAN_MAP_AUTHORITY_V1__=true;

const REMOVED='dobavljac69';
const norm=v=>String(v??'').trim().toLowerCase();
const removed=v=>norm(v).includes(REMOVED);
const dockNo=v=>{const n=Number(String(v??'').replace(/\D/g,''));return Number.isFinite(n)&&n>0?n:null};
const role=()=>{let r=norm(window.currentSession?.app_role||window.currentSession?.role);if(r==='zalihe'||r.includes('zalih'))r='inventory';if(r==='prijam')r='reception';if(r==='voditelj'||r==='management')r='manager';return r};
function aiEnabled(){
 try{
  if(window.YardOnAIAdminV1?.aiControlEnabled)return window.YardOnAIAdminV1.aiControlEnabled();
  const c=JSON.parse(localStorage.getItem('yardivo_auto_replan_cfg_v1')||'{}')||{};
  return c.enabled===true&&String(c.mode||'').toUpperCase()!=='PAUSED';
 }catch(_){return false}
}
const internal=()=>aiEnabled()&&['admin','manager','inventory','reception'].includes(role());
const rows=()=>{try{return typeof announcements!=='undefined'&&Array.isArray(announcements)?announcements:[]}catch(_){return[]}};
const plannedNo=a=>dockNo(a?.aiPlannedDock||a?.plannedDock||a?.planned_dock);
const actualNo=a=>dockNo(a?.dock);

function scrub(v){
 if(v==null)return v;
 if(typeof v==='string')return removed(v)?undefined:v;
 if(Array.isArray(v))return v.map(scrub).filter(x=>x!==undefined&&!removed(x?.name||x?.supplier||x?.username||x?.supplier_name));
 if(typeof v==='object'){
  if(removed(v?.name||v?.supplier||v?.username||v?.supplier_name||v?.supplier_code||v?.code))return undefined;
  const out={};for(const [k,val] of Object.entries(v)){if(removed(k))continue;const c=scrub(val);if(c!==undefined)out[k]=c}return out;
 }
 return v;
}
function purgeGhost(){
 try{
  const stores=[localStorage,sessionStorage];
  for(const st of stores){const ks=[];for(let i=0;i<st.length;i++){const k=st.key(i);if(k)ks.push(k)}for(const k of ks){try{if(removed(k)){st.removeItem(k);continue}const raw=st.getItem(k);if(!raw||!removed(raw))continue;try{const clean=scrub(JSON.parse(raw));if(clean===undefined)st.removeItem(k);else st.setItem(k,JSON.stringify(clean))}catch(_){st.removeItem(k)}}catch(_){}}}
 }catch(_){}
 try{const m=window.YardivoAppStateV583?.master?.();if(Array.isArray(m?.suppliers)){for(let i=m.suppliers.length-1;i>=0;i--)if(removed(m.suppliers[i]?.name||m.suppliers[i]?.username||m.suppliers[i]?.code||m.suppliers[i]?.supplier_code))m.suppliers.splice(i,1)}}catch(_){}
 try{if(typeof suppliers!=='undefined'&&Array.isArray(suppliers)){for(let i=suppliers.length-1;i>=0;i--)if(removed(typeof suppliers[i]==='string'?suppliers[i]:(suppliers[i]?.name||suppliers[i]?.username||'')))suppliers.splice(i,1)}}catch(_){}
 try{if(typeof incidents!=='undefined'&&Array.isArray(incidents)){for(let i=incidents.length-1;i>=0;i--)if(removed(incidents[i]?.supplier))incidents.splice(i,1)}}catch(_){}
 try{if(typeof announcements!=='undefined'&&Array.isArray(announcements)){let changed=false;for(let i=announcements.length-1;i>=0;i--)if(removed(announcements[i]?.supplier)){announcements.splice(i,1);changed=true}if(changed&&typeof saveAnnouncements==='function')saveAnnouncements()}}catch(_){}
 try{document.querySelectorAll('option,tr,li,[data-supplier],[data-supplier-name],.supplier-card,.supplier-row,.overview-chart-col,.ranking-row,.supplier-bar').forEach(el=>{if(removed(el.textContent)||removed(el.getAttribute?.('data-supplier'))||removed(el.getAttribute?.('data-supplier-name'))||removed(el.getAttribute?.('data-overview-supplier')))el.remove()})}catch(_){}
}

function applyInternalRows(serverRows){
 if(!Array.isArray(serverRows))return;
 const byId=new Map(serverRows.map(x=>[String(x?.id||''),x]));
 for(const a of rows()){
  const x=byId.get(String(a?.supplierDeliveryId||''));if(!x)continue;
  a.plannedDock=x.planned_dock||a.plannedDock||null;
  a.aiPlannedDock=x.planned_dock||a.aiPlannedDock||null;
  a.aiPlannedStart=x.planned_start||a.aiPlannedStart||null;
  a.aiPlannedEnd=x.planned_end||a.aiPlannedEnd||null;
  a.aiPlanUpdatedAt=x.planned_at||a.aiPlanUpdatedAt||null;
  a.aiPlanSource=x.planning_source||a.aiPlanSource||null;
 }
}
function applyPlan(plan){
 if(!Array.isArray(plan))return;
 const local=rows();
 for(const p of plan){
  const a=local.find(x=>String(x?.supplierDeliveryId||'')===String(p?.supplier_delivery_id||'')||String(x?.id||'')===String(p?.id||''));
  if(!a)continue;
  a.plannedDock=p.planned_dock?('R'+p.planned_dock):null;
  a.aiPlannedDock=a.plannedDock;
  a.aiPlannedStart=p.planned_start||null;
  a.aiPlannedEnd=p.planned_end||null;
  a.aiPlanUpdatedAt=new Date().toISOString();
  a.aiPlanSource='AI_OPERATIONS';
 }
}

const inflight=new Map(),lastCall=new Map();
async function planDay(date,warehouse,force=false){
 if(!internal()||!date||!warehouse||warehouse==='ALL')return null;
 const key=String(date)+'|'+String(warehouse),now=Date.now();
 if(inflight.has(key))return inflight.get(key);
 if(!force&&now-(lastCall.get(key)||0)<12000)return null;
 lastCall.set(key,now);
 const p=(async()=>{
  try{
   const c=await window.YardivoAuth?.client?.();if(!c?.functions?.invoke)return null;
   const {data,error}=await c.functions.invoke('yardivo-ai-operations',{body:{action:'plan_day',date:String(date),warehouse:String(warehouse)}});
   if(error)throw error;if(data?.ok===false)throw new Error(data.error||'AI plan nije dostupan.');
   const out=data?.data??data;applyPlan(out?.plan||[]);
   try{await window.YardivoSupplierLiveSync?.pullInternal?.(true)}catch(_){}
   return out;
  }catch(e){console.warn('YardOn AI plan day',e);return null}
  finally{inflight.delete(key)}
 })();inflight.set(key,p);return p;
}
function currentDaily(){
 const date=document.getElementById('dailyMapDate')?.value||window.yardivoLocalDateV583?.()||'';
 let warehouse=document.getElementById('dailyMapWarehouseSelect')?.value||'';
 if(!warehouse||warehouse==='ALL'){try{warehouse=String(window.YardivoAppStateV583?.warehouse?.()||window.activeWarehouse||'')}catch(_){}}
 return {date,warehouse};
}
function maybePlanVisible(force=false){
 if(!internal())return;
 const d=document.getElementById('dailyMap');if(!d?.classList.contains('active')&&!d?.classList.contains('manager-force-active'))return;
 const {date,warehouse}=currentDaily();if(!date||!warehouse||warehouse==='ALL')return;
 const needs=rows().some(a=>String(a?.date||'')===String(date)&&String(a?.warehouse||'')===String(warehouse)&&!actualNo(a)&&!plannedNo(a)&&!['odbijen','rejected','cancelled','canceled','zaprimljeno','completed'].includes(norm(a?.status)));
 if(needs||force)void planDay(date,warehouse,force).then(out=>{if(out&&typeof window.renderDailyMap==='function')window.renderDailyMap()});
}
function scheduleFromRows(serverRows){
 if(!internal()||!Array.isArray(serverRows))return;
 applyInternalRows(serverRows);
 const today=window.yardivoLocalDateV583?.()||new Date().toISOString().slice(0,10),todo=new Map();
 for(const x of serverRows){const st=norm(x?.status),d=String(x?.delivery_date||'').slice(0,10),w=String(x?.warehouse||'');if(d>=today&&['confirmed','arrival','dock','receiving'].includes(st)&&!dockNo(x?.planned_dock)&&w)todo.set(d+'|'+w,{d,w})}
 let delay=200;for(const x of [...todo.values()].slice(0,6)){setTimeout(()=>void planDay(x.d,x.w,true).then(out=>{if(out&&document.getElementById('dailyMap')?.classList.contains('active'))window.renderDailyMap?.()}),delay);delay+=250}
}

function withPlannedDock(fn,ctx,args){
 const swapped=[];
 for(const a of rows()){if(actualNo(a))continue;const p=plannedNo(a);if(!p)continue;swapped.push([a,a.dock]);a.dock=p}
 try{return fn.apply(ctx,args)}finally{for(const [a,d] of swapped)a.dock=d}
}
function decorateDaily(){
 try{
  document.querySelectorAll('#dailyMapBoard [data-announcement-id]').forEach(el=>{
   const id=String(el.getAttribute('data-announcement-id')||''),a=rows().find(x=>String(x?.id||'')===id);if(!a)return;
   const actual=actualNo(a),planned=plannedNo(a);
   if(actual&&(a.aiAssignedDock||a.aiAssignedAt)){
     el.classList.add('yardon-ai-assigned-dock');el.title='YardOn AI je dodijelio stvarnu rampu R'+actual;
     if(!el.querySelector('.yardon-ai-assigned-badge')){const b=document.createElement('span');b.className='yardon-ai-assigned-badge';b.textContent='AI DODIJELIO · R'+actual;el.appendChild(b)}
     return;
   }
   if(actual||!planned)return;
   el.setAttribute('draggable','false');el.classList.add('yardon-ai-planned-dock');el.title='AI plan · R'+planned+' · stvarna rampa dodjeljuje se po dolasku';
   if(!el.querySelector('.yardon-ai-plan-badge')){const b=document.createElement('span');b.className='yardon-ai-plan-badge';b.textContent='AI PLAN · R'+planned;el.appendChild(b)}
  });
 }catch(_){}
}
function injectStyle(){if(document.getElementById('yardonAiPlanMapStyleV1'))return;const s=document.createElement('style');s.id='yardonAiPlanMapStyleV1';s.textContent='.yardon-ai-planned-dock{outline:1px solid rgba(59,130,246,.65)!important;cursor:default!important}.yardon-ai-plan-badge,.yardon-ai-assigned-badge{display:inline-flex;margin-top:5px;padding:3px 6px;border-radius:999px;font-size:7px;font-weight:1000;letter-spacing:.05em}.yardon-ai-plan-badge{background:rgba(37,99,235,.18);border:1px solid rgba(59,130,246,.35);color:#8fc7ff}.yardon-ai-assigned-dock{outline:2px solid rgba(34,197,94,.7)!important}.yardon-ai-assigned-badge{background:rgba(34,197,94,.16);border:1px solid rgba(34,197,94,.4);color:#86efac}';document.head.appendChild(s)}

function wrap(name,kind){
 const f=window[name];if(typeof f!=='function'||f.__yardonAiPlanWrapped)return false;
 const w=function(...args){purgeGhost();if(kind==='daily'){const r=withPlannedDock(f,this,args);decorateDaily();setTimeout(()=>maybePlanVisible(false),0);return r}const r=f.apply(this,args);purgeGhost();return r};w.__yardonAiPlanWrapped=true;w.__yardonOriginal=f;window[name]=w;return true;
}
function install(){injectStyle();purgeGhost();wrap('renderDailyMap','daily');wrap('renderDailyRampCapacity','daily');wrap('renderOverview','ghost');wrap('renderSuppliers','ghost');wrap('populateSuppliers','ghost')}

window.addEventListener('yardivo:supplier-internal-rows',e=>scheduleFromRows(e?.detail?.rows||[]));
window.addEventListener('yardivo:view-opened',e=>{install();if(e?.detail?.view==='dailyMap')setTimeout(()=>maybePlanVisible(true),120);if(e?.detail?.view==='overview')setTimeout(purgeGhost,0)});
window.addEventListener('yardivo:data-synced',()=>{install();purgeGhost();if(aiEnabled())setTimeout(()=>maybePlanVisible(false),80)});
window.addEventListener('yardivo:ai-admin-config',()=>{if(aiEnabled())setTimeout(()=>maybePlanVisible(true),80)});
document.addEventListener('DOMContentLoaded',()=>setTimeout(install,40),{once:true});
window.addEventListener('load',()=>{install();setTimeout(()=>maybePlanVisible(false),200)},{once:true});
install();let tries=0;const t=setInterval(()=>{install();if(++tries>40)clearInterval(t)},500);
window.YardOnAiPlanMapAuthorityV1={planDay,purgeGhost,applyPlan,applyInternalRows,enabled:aiEnabled};
})();
