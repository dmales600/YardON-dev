(()=>{'use strict';
if(window.__YARDON_MYYARD_OPERATIONS_V1__)return;
window.__YARDON_MYYARD_OPERATIONS_V1__=true;

let snap=null,busy=false,tab='plan',lastKey='';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
function role(){let r=String(window.currentSession?.app_role||window.currentSession?.role||document.body?.dataset?.yardivoRole||'').toLowerCase().trim();if(r==='zalihe'||r.includes('zalih'))r='inventory';if(r==='prijam')r='reception';if(r==='voditelj'||r==='management')r='manager';return r}
function allowed(){return ['admin','manager','inventory','reception'].includes(role())}
function date(){return String(document.querySelector('#myYard .myy-date')?.value||'').slice(0,10)||new Date().toLocaleDateString('sv-SE')}
function warehouse(){let w='';try{w=String(window.YardivoAppStateV583?.warehouse?.()||window.activeWarehouse||'')}catch(_){}return w&&w!=='ALL'?w:''}
function dockNum(v){const n=Number(String(v||'').replace(/\D/g,''));return Number.isFinite(n)&&n>0?n:null}
function terminal(v){return ['COMPLETED','REJECTED','CANCELLED','CANCELED','REVOKED','EXPIRED'].includes(String(v||'').toUpperCase())}
function time(v){return String(v||'').slice(0,5)||'—'}
function fmtState(v){return String(v||'OPEN').replaceAll('_',' ')}
function ensureStyle(){
 if($('yardonMyYardOpsStyle'))return;
 const s=document.createElement('style');s.id='yardonMyYardOpsStyle';s.textContent=`
 #myYard .yardon-myyard-ops{margin:14px 0 0;border:1px solid var(--border,#dbe5ef);border-radius:16px;background:var(--panel,#fff);overflow:hidden}
 #myYard .ymyo-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 15px;border-bottom:1px solid var(--border,#e5eaf0)}
 #myYard .ymyo-head h3{margin:0;font-size:14px}#myYard .ymyo-head p{margin:4px 0 0;color:var(--muted,#718096);font-size:10px}
 #myYard .ymyo-badge{white-space:nowrap;font-size:9px;font-weight:900;padding:6px 9px;border-radius:999px;background:rgba(37,99,235,.09);border:1px solid rgba(37,99,235,.22)}
 #myYard .ymyo-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;padding:12px 14px 4px}
 #myYard .ymyo-kpi{border:1px solid var(--border,#e2e8f0);border-radius:11px;padding:10px;background:rgba(100,116,139,.03)}#myYard .ymyo-kpi small{display:block;font-size:8px;font-weight:900;color:var(--muted,#718096)}#myYard .ymyo-kpi b{display:block;font-size:19px;margin-top:4px}
 #myYard .ymyo-tabs{display:flex;gap:6px;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid var(--border,#e5eaf0)}
 #myYard .ymyo-tab{border:1px solid var(--border,#dbe5ef);background:transparent;border-radius:999px;padding:7px 10px;font-size:9px;font-weight:900;cursor:pointer}#myYard .ymyo-tab.active{background:#0f5fa8;color:#fff;border-color:#0f5fa8}
 #myYard .ymyo-body{padding:0 14px 14px;max-height:430px;overflow:auto}#myYard .ymyo-empty{padding:22px;text-align:center;color:var(--muted,#718096);font-size:10px}
 #myYard .ymyo-table{width:100%;border-collapse:collapse;font-size:10px}#myYard .ymyo-table th{font-size:8px;text-align:left;color:var(--muted,#718096);padding:9px 8px;border-bottom:1px solid var(--border,#e5eaf0);white-space:nowrap}#myYard .ymyo-table td{padding:9px 8px;border-bottom:1px solid var(--border,#eef2f6);vertical-align:top}
 #myYard .ymyo-pill{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:8px;font-weight:900;background:rgba(100,116,139,.11)}#myYard .ymyo-pill.ok{background:rgba(34,197,94,.12);color:#177b3b}#myYard .ymyo-pill.warn{background:rgba(245,158,11,.14);color:#9a5b00}#myYard .ymyo-pill.bad{background:rgba(239,68,68,.12);color:#b92a2a}
 #myYard .ymyo-parking{display:grid;grid-template-columns:repeat(7,minmax(58px,1fr));gap:6px;padding-top:12px}#myYard .ymyo-park{min-height:52px;border:1px dashed var(--border,#cbd5e1);border-radius:9px;display:grid;place-items:center;text-align:center;font-size:8px;font-weight:900}.ymyo-park.actual{border-style:solid;background:rgba(245,158,11,.10);border-color:rgba(245,158,11,.42)}.ymyo-park.pred{border-style:solid;background:rgba(59,130,246,.08);border-color:rgba(59,130,246,.34)}
 #myYard .ymyo-recs{display:grid;gap:8px;padding-top:12px}#myYard .ymyo-rec{border:1px solid var(--border,#dbe5ef);border-radius:10px;padding:10px}#myYard .ymyo-rec.warn{background:rgba(245,158,11,.06);border-color:rgba(245,158,11,.3)}#myYard .ymyo-rec.bad{background:rgba(239,68,68,.05);border-color:rgba(239,68,68,.28)}#myYard .ymyo-rec strong{display:block;font-size:10px}#myYard .ymyo-rec span{display:block;margin-top:3px;font-size:9px;color:var(--muted,#64748b)}
 #myYard .myy-park.yardon-pass-occupied{box-shadow:0 0 0 3px rgba(245,158,11,.32)!important}.myy-park.yardon-predicted{box-shadow:inset 0 0 0 2px rgba(59,130,246,.38)}#myYard .yardon-live-pass{position:absolute;z-index:4;left:2px;right:2px;bottom:2px;font-size:7px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:rgba(6,19,29,.88);color:#fff;padding:2px;border-radius:3px}#myYard .myy-park{position:relative}
 #myYard .myy-dock.yardon-pass-busy{box-shadow:0 0 0 3px rgba(34,197,94,.35)!important}#myYard .myy-dock.yardon-plan-dock{outline:2px dashed rgba(59,130,246,.42);outline-offset:2px}
 @media(max-width:850px){#myYard .ymyo-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}#myYard .ymyo-parking{grid-template-columns:repeat(4,minmax(52px,1fr))}}
 `;document.head.appendChild(s);
}
function ensure(){
 if(!allowed())return null;const view=$('myYard');if(!view)return null;ensureStyle();
 let box=$('yardonMyYardOps');if(box)return box;
 box=document.createElement('section');box.id='yardonMyYardOps';box.className='yardon-myyard-ops';box.innerHTML=`<div class="ymyo-head"><div><h3>✦ YARD OPERATIONS</h3><p>Plan rampi, stvarno stanje, parking queue i AI promjene u istom My Yard prikazu.</p></div><span class="ymyo-badge">CHAT · SMS OFF</span></div><div class="ymyo-kpis" id="ymyoKpis"></div><div class="ymyo-tabs"><button class="ymyo-tab active" data-ymyo="plan">PLAN RAMPI</button><button class="ymyo-tab" data-ymyo="live">LIVE</button><button class="ymyo-tab" data-ymyo="parking">PARKING & QUEUE</button><button class="ymyo-tab" data-ymyo="ai">AI PROMJENE</button><button class="ymyo-tab" data-ymyo="chat">CHAT / UPUTE</button></div><div class="ymyo-body" id="ymyoBody"><div class="ymyo-empty">Učitavanje operativnog stanja…</div></div>`;
 const shell=view.querySelector('.myy-shell')||view;const stage=view.querySelector('.myy-stage');if(stage)stage.insertAdjacentElement('afterend',box);else shell.appendChild(box);
 box.addEventListener('click',e=>{const b=e.target.closest?.('[data-ymyo]');if(!b)return;tab=b.dataset.ymyo;box.querySelectorAll('[data-ymyo]').forEach(x=>x.classList.toggle('active',x===b));render()});
 return box;
}
async function callSnapshot(){
 const body={action:'snapshot',date:date(),warehouse:warehouse()};
 if(window.YardivoSupplierService?.call)return await window.YardivoSupplierService.call('yardivo-ai-operations',body);
 const c=await window.YardivoAuth?.client?.();if(!c)throw new Error('Auth nije spreman.');const {data,error}=await c.functions.invoke('yardivo-ai-operations',{body});if(error)throw error;if(data?.ok===false)throw new Error(data.error||'AI Operations nije dostupan.');return data?.data??data;
}
function planRows(){const w=warehouse();return (snap?.plan||[]).filter(x=>!w||String(x.warehouse)===w).sort((a,b)=>String(a.time).localeCompare(String(b.time)))}
function passes(){const w=warehouse();return (snap?.passes||[]).filter(x=>(!w||String(x.warehouse)===w)&&!terminal(x.state))}
function recommendations(){
 const out=[];for(const x of planRows()){
   if(x.plan_issue==='NO_CAPACITY'||x.plan_issue==='NO_ACTIVE_RAMPS')out.push({kind:'bad',title:x.supplier+' · nema kapaciteta',body:x.time+' · potreban ručni plan'});
   else if(x.parking_risk)out.push({kind:'warn',title:x.supplier+' · očekivano čekanje '+Number(x.shift_minutes||0)+' min',body:(x.predicted_parking||'parking queue')+' → '+(x.planned_dock?'R'+x.planned_dock:'rampa TBD')+' u '+(x.planned_start||x.time)});
 }
 for(const p of passes()){
   if(p.parking_slot){const x=planRows().find(z=>String(z.id)===String(p.announcement_id)||String(z.supplier_delivery_id||'')===String(p.supplier_delivery_id||''));out.push({kind:'warn',title:(p.supplier_name||p.vehicle_plate||'Kamion')+' · '+p.parking_slot,body:x?.planned_dock?p.parking_slot+' → plan R'+x.planned_dock+' · '+(x.planned_start||''):'Čeka dodjelu slobodne kompatibilne rampe'});}
 }
 return out.slice(0,50);
}
function renderKpis(){const k=$('ymyoKpis'),s=snap?.summary||{},p=passes(),park=p.filter(x=>x.parking_slot).length;if(!k)return;k.innerHTML=[['NAJAVE',s.total??planRows().length],['AI RASPORED',s.assigned??0],['LIVE KAMIONI',p.length],['NA PARKINGU',park],['ISKORIŠTENOST',(s.utilization_pct??0)+'%']].map(x=>`<div class="ymyo-kpi"><small>${esc(x[0])}</small><b>${esc(x[1])}</b></div>`).join('')}
function renderPlan(){const rows=planRows();return rows.length?`<table class="ymyo-table"><thead><tr><th>TERMIN</th><th>DOBAVLJAČ</th><th>PALETE</th><th>PLANIRANA RAMPA</th><th>AI START</th><th>RIZIK</th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${esc(time(x.time))}</b></td><td>${esc(x.supplier)}</td><td>${esc(x.pallets||0)}</td><td>${x.planned_dock?'R'+esc(x.planned_dock):'—'}</td><td>${esc(x.planned_start||'—')}–${esc(x.planned_end||'—')}</td><td>${x.plan_issue==='NO_CAPACITY'?'<span class="ymyo-pill bad">NEMA KAPACITETA</span>':x.parking_risk?'<span class="ymyo-pill warn">PARKING '+esc(x.shift_minutes)+'m</span>':'<span class="ymyo-pill ok">OK</span>'}</td></tr>`).join('')}</tbody></table>`:'<div class="ymyo-empty">Nema najava za odabrani datum.</div>'}
function renderLive(){const p=passes();return p.length?`<table class="ymyo-table"><thead><tr><th>DOBAVLJAČ / VOZILO</th><th>STANJE</th><th>PARKING</th><th>STVARNA / DODIJELJENA RAMPA</th><th>ZADNJA UPUTA</th></tr></thead><tbody>${p.map(x=>`<tr><td><b>${esc(x.supplier_name||'—')}</b><br>${esc(x.vehicle_plate||'')}</td><td><span class="ymyo-pill ${x.state==='PROCEED_DOCK'?'ok':x.state==='PARKING'||x.state==='WAITING_DOCK'?'warn':''}">${esc(fmtState(x.state))}</span></td><td>${esc(x.parking_slot||'—')}</td><td>${esc(x.dock||'—')}</td><td>${esc(x.last_instruction||'—')}</td></tr>`).join('')}</tbody></table>`:'<div class="ymyo-empty">Nema aktivnih Delivery Pass vozila za ovaj dan.</div>'}
function renderParking(){const actual=new Map(),pred=new Map();passes().forEach(p=>{if(p.parking_slot)actual.set(String(p.parking_slot).toUpperCase(),p)});planRows().forEach(x=>{if(x.predicted_parking&&!actual.has(String(x.predicted_parking).toUpperCase()))pred.set(String(x.predicted_parking).toUpperCase(),x)});let h='<div class="ymyo-parking">';for(let i=1;i<=42;i++){const k='P'+i,a=actual.get(k),p=pred.get(k);h+=`<div class="ymyo-park ${a?'actual':p?'pred':''}"><div><b>${k}</b><br><small>${a?esc(a.supplier_name||a.vehicle_plate||'ZAUZETO'):p?esc(p.supplier)+' · PLAN':'SLOBODNO'}</small></div></div>`}return h+'</div>'}
function renderAI(){const rec=recommendations(),ds=(snap?.decisions||[]).slice().sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));return `<div class="ymyo-recs">${rec.length?rec.map(x=>`<div class="ymyo-rec ${esc(x.kind)}"><strong>${esc(x.title)}</strong><span>${esc(x.body)}</span></div>`).join(''):'<div class="ymyo-empty">Nema aktivnih AI upozorenja.</div>'}${ds.slice(0,30).map(x=>`<div class="ymyo-rec"><strong>${esc(x.supplier||'AI promjena')} · ${esc(x.status||'PRIJEDLOG')}</strong><span>${esc(x.reason||'')} ${x.old||x.newSlot?' · '+esc([x.old?.time,x.old?.dock?'R'+x.old.dock:'','→',x.newSlot?.time,x.newSlot?.dock?'R'+x.newSlot.dock:''].filter(Boolean).join(' ')):''}</span></div>`).join('')}</div>`}
function renderChat(){const p=passes();return `<div class="ymyo-recs"><div class="ymyo-rec"><strong>Komunikacija trenutno ide kroz YardOn chat</strong><span>Infobip / SMS nije uključen. Driver Delivery Pass i Prijam chat ostaju aktivni kanal.</span></div>${p.length?p.map(x=>`<div class="ymyo-rec ${x.parking_slot?'warn':''}"><strong>${esc(x.supplier_name||x.vehicle_plate||'Kamion')} · ${esc(fmtState(x.state))}</strong><span>${esc(x.last_instruction||'Nema nove upute.')}${x.parking_slot?' · Parking '+esc(x.parking_slot):''}${x.dock?' · '+esc(x.dock):''}</span></div>`).join(''):'<div class="ymyo-empty">Nema aktivnih razgovora / uputa vezanih uz Delivery Pass.</div>'}</div>`}
function render(){if(!snap)return;ensure();renderKpis();const body=$('ymyoBody');if(!body)return;body.innerHTML=tab==='plan'?renderPlan():tab==='live'?renderLive():tab==='parking'?renderParking():tab==='ai'?renderAI():renderChat();syncMarkers()}
function syncMarkers(){
 const view=$('myYard');if(!view||!snap)return;
 view.querySelectorAll('.myy-park').forEach(el=>{el.classList.remove('yardon-pass-occupied','yardon-predicted');el.querySelector('.yardon-live-pass')?.remove()});
 view.querySelectorAll('.myy-dock').forEach(el=>el.classList.remove('yardon-pass-busy','yardon-plan-dock'));
 const pmap=new Map();passes().forEach(p=>{if(p.parking_slot)pmap.set(String(p.parking_slot).toUpperCase(),p)});
 pmap.forEach((p,k)=>{const el=view.querySelector(`.myy-park[data-parking="${CSS.escape(k)}"]`);if(!el)return;el.classList.add('yardon-pass-occupied','occupied');const s=document.createElement('span');s.className='yardon-live-pass';s.textContent=p.vehicle_plate||p.supplier_name||'LIVE';el.appendChild(s);el.title=(p.supplier_name||'')+' · '+(p.last_instruction||'')});
 planRows().forEach(x=>{if(x.predicted_parking&&!pmap.has(String(x.predicted_parking).toUpperCase()))view.querySelector(`.myy-park[data-parking="${CSS.escape(String(x.predicted_parking).toUpperCase())}"]`)?.classList.add('yardon-predicted');if(x.planned_dock)view.querySelectorAll('.myy-dock')[Number(x.planned_dock)-1]?.classList.add('yardon-plan-dock')});
 passes().forEach(p=>{const n=dockNum(p.dock);if(n&&['PROCEED_DOCK','DOCK','RECEIVING'].includes(String(p.state||'').toUpperCase()))view.querySelectorAll('.myy-dock')[n-1]?.classList.add('yardon-pass-busy')});
}
async function refresh(force=false){
 if(!allowed())return;const view=ensure();if(!view||busy)return;const key=date()+'|'+warehouse();if(!force&&snap&&key===lastKey){render();return}busy=true;const body=$('ymyoBody');if(body)body.innerHTML='<div class="ymyo-empty">Učitavanje planiranih rampi, parkinga i live stanja…</div>';
 try{snap=await callSnapshot();lastKey=key;render()}catch(e){if(body)body.innerHTML='<div class="ymyo-empty">My Yard Operations nije dostupan: '+esc(e?.message||e)+'</div>'}finally{busy=false}
}
function visible(){return $ ('myYard')?.classList.contains('active')}
document.addEventListener('change',e=>{if(e.target?.matches?.('#myYard .myy-date'))setTimeout(()=>refresh(true),40)},true);
window.addEventListener('yardivo:view-opened',e=>{if(e.detail?.view==='myYard')setTimeout(()=>refresh(true),80)});
window.addEventListener('yardivo:context-changed',()=>{if(visible())setTimeout(()=>refresh(true),80)});
window.addEventListener('yardivo:data-synced',()=>{if(visible())setTimeout(()=>refresh(true),120)});
window.addEventListener('yardivo:supplier-canonical-updated',()=>{if(visible())setTimeout(()=>refresh(true),100)});
window.addEventListener('load',()=>setTimeout(()=>{if(visible())refresh(true)},1000),{once:true});
setTimeout(()=>{if(visible())refresh(true)},300);
window.YardOnMyYardOperationsV1={refresh:()=>refresh(true),snapshot:()=>snap,syncMarkers};
})();