
(function(){
'use strict';
function role(){
 let r='';try{r=String(currentSession?.role||'').toLowerCase().trim()}catch(e){}
 if(r==='zalihe'||r==='upravljanje zalihama')r='inventory';
 if(r==='prijam')r='reception';
 return r;
}
function allowed(){return ['admin','inventory','reception','gate'].includes(role())}
function normalize(v){
 return String(v||'').trim();
}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function fmtTs(v){
 if(!v)return '—';const d=new Date(v);return isNaN(d)?String(v):d.toLocaleString('hr-HR');
}
function anns(){try{return announcements||[]}catch(e){return []}}
function incs(){try{return incidents||[]}catch(e){return []}}

function renderEmpty(msg){
 const host=document.getElementById('orderSearchResult');
 if(host)host.innerHTML=`<div class="order-search-empty">${esc(msg)}</div>`;
}
function search(){
 if(!allowed())return renderEmpty('Nemaš ovlasti za ovu funkciju.');
 const input=document.getElementById('orderSearchInput');
 const order=normalize(input?.value||'');
 if(input)input.value=order;
 if(!order)return renderEmpty('Upiši broj ili tekst narudžbe.');

 const q=order.toLocaleLowerCase('hr-HR');
 const matches=anns().filter(a=>String(a.orderNumber||'').toLocaleLowerCase('hr-HR').includes(q));
 if(!matches.length)return renderEmpty(`Nije pronađena najava za narudžbu "${order}".`);

 const sorted=matches.slice().sort((x,y)=>String(y.date||'').localeCompare(String(x.date||''))||String(y.time||'').localeCompare(String(x.time||'')));
 const a=sorted[0];
 const relatedInc=incs().filter(i=>Number(i.announcementId||0)===Number(a.id)||(i.supplier&&a.supplier&&i.supplier===a.supplier&&i.date===a.date&&i.warehouse===a.warehouse));

 const timeline=[
   ['Najava',a.createdAt||`${a.date||''} ${a.time||''}`],
   ['Dvorište',a.yardArrivalAt||a.gateEnteredAt||a.enteredAt||''],
   ['Rampa',a.dockArrivalAt||a.atDockAt||a.dockAt||''],
   ['Zaprimljeno',a.receivedAt||a.completedAt||''],
   ['Odbijeno',a.rejectedAt||'']
 ];

 const host=document.getElementById('orderSearchResult');
 host.innerHTML=`<div class="order-search-card">
   <div class="order-search-head">
     <div><h2>${esc(a.orderNumber||order)}</h2><small>${esc(a.supplier||'—')} · Najava #${esc(a.id||'—')}${matches.length>1?` · ${matches.length} rezultata`:''}</small></div>
     <span class="order-chip">${esc(a.status||'—')}</span>
   </div>
   <div class="order-search-grid">
     <div class="order-search-kpi"><small>DOBAVLJAČ</small><strong>${esc(a.supplier||'—')}</strong></div>
     <div class="order-search-kpi"><small>DATUM / TERMIN</small><strong>${esc(a.date||'—')} · ${esc(a.time||'—')}</strong></div>
     <div class="order-search-kpi"><small>LOKACIJA</small><strong>${String(a.warehouse||'').startsWith('W2')?'Lokacija 2':'Lokacija 1'}</strong></div>
     <div class="order-search-kpi"><small>SKLADIŠTE</small><strong>${esc(a.warehouse||'—')}</strong></div>
     <div class="order-search-kpi"><small>RAMPA</small><strong>${esc(a.dock||'—')}</strong></div>
     <div class="order-search-kpi"><small>STATUS</small><strong>${esc(a.status||'—')}</strong></div>
     <div class="order-search-kpi"><small>TABLICE</small><strong>${esc(a.plannedPlate||a.vehiclePlate||a.plate||a.registration||'—')}</strong></div>
     <div class="order-search-kpi"><small>VOZAČ</small><strong>${esc(a.plannedDriver||a.driverNameCanonical||a.driver||a.driverName||'—')}</strong></div>
     <div class="order-search-kpi"><small>PALETE</small><strong>${Number(a.pallets||0)}</strong></div>
     <div class="order-search-kpi"><small>SKU</small><strong>${Number(a.sku||0)}</strong></div>
     <div class="order-search-kpi"><small>ODGOVORNA OSOBA</small><strong>${esc(a.responsible||a.owner||'—')}</strong></div>
     <div class="order-search-kpi"><small>TIP DOLASKA</small><strong>${a.arrivalType==='UNANNOUNCED'?'NENAJAVLJENI':'NAJAVLJENI'}</strong></div>
   </div>
   <div class="order-search-timeline">
     <h3>OPERATIVNI TIMELINE</h3>
     <div class="order-search-timeline-grid">
       ${timeline.map(x=>`<div class="order-search-step"><small>${x[0]}</small><strong>${fmtTs(x[1])}</strong></div>`).join('')}
     </div>
   </div>
   <div class="order-search-incidents">
     <h3>POVEZANI INCIDENTI</h3>
     ${relatedInc.length?relatedInc.map(i=>`<div class="ramp-supplier-item"><strong>${esc(i.reason||i.type||'Incident')}</strong><div class="meta">${esc(i.date||'—')} · ${esc(i.warehouse||'—')} · ${esc(i.severity||'—')} · ${esc(i.note||i.description||'')}</div></div>`).join(''):'<div class="overview-empty">Nema povezanih incidenata.</div>'}
   </div>
 </div>`;
}

document.getElementById('orderSearchBtn')?.addEventListener('click',search);
document.getElementById('orderSearchInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();search()}});
document.getElementById('orderSearchInput')?.addEventListener('change',e=>{
 e.target.value=String(e.target.value||'').trim();
});
document.addEventListener('click',e=>{
 if(e.target.closest('[data-view="orderSearch"],[data-home-target="orderSearch"]'))setTimeout(()=>{if(!allowed())renderEmpty('Nemaš ovlasti za ovu funkciju.')},20);
},true);

function homeCard(){
 const grid=document.getElementById('homeMenuGrid');
 if(!grid||!allowed()||grid.querySelector('[data-home-target="orderSearch"]'))return;
 const card=document.createElement('button');
 card.type='button';
 card.className='home-menu-card';
 card.dataset.homeTarget='orderSearch';
 card.innerHTML='<div class="home-menu-icon">⌕</div><h3>Traži po narudžbi</h3><p>Pronađi status i cijelu povijest po 6W broju.</p><div class="home-menu-open">OTVORI →</div>';
 grid.appendChild(card);
}
window.addEventListener('yardivo:login',()=>requestAnimationFrame(homeCard));
window.addEventListener('load',()=>setTimeout(homeCard,400));
window.YardivoOrderSearch={search,normalize};
})();
