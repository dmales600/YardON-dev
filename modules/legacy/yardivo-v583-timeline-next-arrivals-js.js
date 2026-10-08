
(()=>{'use strict';
if(window.__YV_TIMELINE_NEXT_ARRIVALS__)return;window.__YV_TIMELINE_NEXT_ARRIVALS__=true;
let naTimer=0,tlTimer=0;
const q=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=()=>Array.isArray(window.announcements)?window.announcements:(Array.isArray(window.deliveries)?window.deliveries:[]);
function masterSupplierAllowed(a){
  const name=String(supplier(a)||'').trim().toLocaleLowerCase('hr-HR');if(!name)return false;
  try{
    const d=window.YardivoAppStateV583?.master?.()||JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')||{};
    const rows=Array.isArray(d.suppliers)?d.suppliers:[];
    return rows.some(x=>x&&x.active!==false&&[x.name,x.id,x.supplier_code,x.code].some(v=>String(v||'').trim().toLocaleLowerCase('hr-HR')===name));
  }catch(_){return false}
}
function todayISO(){const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function dt(a){const date=a?.date||a?.deliveryDate||a?.plannedDate||a?.scheduledDate;const time=a?.time||a?.deliveryTime||a?.plannedTime||a?.scheduledTime;if(!date||!time)return null;const d=new Date(`${date}T${String(time).slice(0,5)}:00`);return Number.isNaN(d.getTime())?null:d}
function supplier(a){return a?.supplierName||a?.supplier||a?.supplier_name||a?.companyName||a?.vendorName||'DOBAVLJAČ'}
function pallets(a){const v=a?.pallets??a?.palletCount??a?.plannedPallets??a?.epal??a?.quantityPallets;return Number.isFinite(Number(v))?Number(v):null}
function plate(a){return a?.plannedPlate||a?.plate||a?.vehiclePlate||a?.truckPlate||''}
function warehouse(a){return a?.warehouseName||a?.warehouse||a?.warehouseCode||''}
function dock(a){const v=a?.dock??a?.dockNo??a?.ramp??a?.rampNo??a?.assignedDock;return v?String(v):''}
function status(a){return String(a?.status||a?.deliveryStatus||'').toLowerCase()}
function closed(a){const s=status(a);return /completed|rejected|cancel|otkazan|zaprim|odbij|završ/.test(s)}
function scopeAllowed(a){try{const s=window.currentSession||window.session||{};if(s?.all_warehouses||s?.allWarehouses)return true;const scope=Array.isArray(s?.warehouses)?s.warehouses:[];if(!scope.length)return true;const wid=String(a?.warehouseId||a?.warehouse_id||a?.warehouse||'');return !wid||scope.includes(wid)}catch(_){return true}}
function todayItems(){const t=todayISO();return arr().filter(a=>masterSupplierAllowed(a)&&scopeAllowed(a)&&!closed(a)&&((a?.date||a?.deliveryDate||a?.plannedDate||a?.scheduledDate)===t)&&dt(a)).sort((x,y)=>dt(x)-dt(y))}
function fmtTime(d){return d?`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`:'—'}
function relative(d){const min=Math.round((d-Date.now())/60000);if(min<-15)return `kasni ${Math.abs(min)} min`;if(min<0)return 'vrijeme dolaska';if(min<60)return `za ${min} min`;const h=Math.floor(min/60),m=min%60;return `za ${h} h${m?` ${m} min`:''}`}
function ensure(){
 if(!q('yardivoNextArrivalsZone')){const z=document.createElement('div');z.id='yardivoNextArrivalsZone';document.body.appendChild(z)}
 if(!q('yardivoTodayTimelineZone')){const z=document.createElement('div');z.id='yardivoTodayTimelineZone';document.body.appendChild(z)}
 if(!q('yardivoNextArrivals')){const n=document.createElement('section');n.id='yardivoNextArrivals';n.innerHTML='<div class="yv-pop-head" data-yv-expand="next"><div class="yv-pop-head-copy"><strong>NEXT ARRIVALS</strong><small id="yvNaSub">Sljedeći dolasci danas</small></div><div class="yv-pop-actions"><span class="yv-pop-badge"><i></i> LIVE</span><button class="yv-pop-close" type="button" aria-label="Zatvori">×</button></div></div><div class="yv-na-body" id="yvNaBody"></div>';document.body.appendChild(n)}
 if(!q('yardivoTodayTimeline')){const t=document.createElement('section');t.id='yardivoTodayTimeline';t.innerHTML='<div class="yv-pop-head" data-yv-expand="timeline"><div class="yv-pop-head-copy"><strong>TODAY TIMELINE</strong><small id="yvTlSub">Dnevni tok dolazaka i heat opterećenja</small></div><div class="yv-pop-actions"><span class="yv-pop-badge"><i></i> TODAY</span><button class="yv-pop-close" type="button" aria-label="Zatvori">×</button></div></div><div class="yv-tl-body" id="yvTlBody"></div>';document.body.appendChild(t)}
 bind();renderAll();
}
function bind(){const nz=q('yardivoNextArrivalsZone'),np=q('yardivoNextArrivals'),tz=q('yardivoTodayTimelineZone'),tp=q('yardivoTodayTimeline');if(!nz||!np||!tz||!tp||np.dataset.bound)return;np.dataset.bound='1';
 const openN=()=>{clearTimeout(naTimer);document.body.classList.add('yv-nextarrivals-open');renderNext()};const closeN=()=>{clearTimeout(naTimer);naTimer=setTimeout(()=>document.body.classList.remove('yv-nextarrivals-open','yv-nextarrivals-expanded'),100)};
 nz.addEventListener('pointerenter',openN,{passive:true});np.addEventListener('pointerenter',()=>clearTimeout(naTimer),{passive:true});np.addEventListener('pointerleave',closeN,{passive:true});
 nz.addEventListener('click',e=>{e.preventDefault();openN()});nz.addEventListener('pointerdown',()=>openN(),{passive:true});
 const openT=()=>{clearTimeout(tlTimer);document.body.classList.add('yv-timeline-open');renderTimeline()};const closeT=()=>{clearTimeout(tlTimer);tlTimer=setTimeout(()=>document.body.classList.remove('yv-timeline-open','yv-timeline-expanded'),100)};
 tz.addEventListener('pointerenter',openT,{passive:true});tp.addEventListener('pointerenter',()=>clearTimeout(tlTimer),{passive:true});tp.addEventListener('pointerleave',closeT,{passive:true});
 tz.addEventListener('click',e=>{e.preventDefault();openT()});tz.addEventListener('pointerdown',()=>openT(),{passive:true});
 np.querySelector('.yv-pop-head').addEventListener('click',e=>{if(e.target.closest('.yv-pop-close'))return;document.body.classList.add('yv-nextarrivals-open');document.body.classList.toggle('yv-nextarrivals-expanded');renderNext()});
 tp.querySelector('.yv-pop-head').addEventListener('click',e=>{if(e.target.closest('.yv-pop-close'))return;document.body.classList.add('yv-timeline-open');document.body.classList.toggle('yv-timeline-expanded');renderTimeline()});
 np.querySelector('.yv-pop-close').onclick=e=>{e.stopPropagation();document.body.classList.remove('yv-nextarrivals-open','yv-nextarrivals-expanded')};tp.querySelector('.yv-pop-close').onclick=e=>{e.stopPropagation();document.body.classList.remove('yv-timeline-open','yv-timeline-expanded')};
}
function renderNext(){const body=q('yvNaBody'),sub=q('yvNaSub');if(!body)return;const now=new Date();const items=todayItems().filter(a=>dt(a)>=new Date(now.getTime()-6*60*60*1000));const max=document.body.classList.contains('yv-nextarrivals-expanded')?10:5;if(sub)sub.textContent=items.length?`${items.length} aktivnih dolazaka danas · klikni header za veći prikaz`:'Nema aktivnih dolazaka danas';if(!items.length){body.innerHTML='<div class="yv-na-empty">Nema sljedećih najavljenih dolazaka u tvom scopeu.</div>';return}body.innerHTML='<div class="yv-na-list">'+items.slice(0,max).map(a=>{const d=dt(a),mins=Math.round((d-Date.now())/60000),cls=mins<-15?' late':mins<=30?' arriving':'';const meta=[plate(a),pallets(a)!=null?`${pallets(a)} pal`:'' ,warehouse(a),dock(a)?`R${dock(a).replace(/^R/i,'')}`:''].filter(Boolean).join(' · ');return `<div class="yv-na-card${cls}"><div class="yv-na-truck"></div><div class="yv-na-main"><b>${esc(supplier(a))}</b><span>${esc(meta||'Najavljeni dolazak')}</span></div><div class="yv-na-time"><b>${fmtTime(d)}</b><small>${esc(relative(d))}</small></div></div>`}).join('')+'</div>'}
function renderTimeline(){
 const body=q('yvTlBody'),sub=q('yvTlSub');if(!body)return;
 const items=todayItems();
 let start=6*60,end=18*60;
 if(items.length){
   const mins=items.map(a=>dt(a).getHours()*60+dt(a).getMinutes());
   start=Math.min(start,Math.floor(Math.min(...mins)/60)*60);
   end=Math.max(end,(Math.ceil(Math.max(...mins)/60)+1)*60);
 }
 start=Math.max(0,start);end=Math.min(24*60,Math.max(start+360,end));
 const slots=Math.max(1,Math.ceil((end-start)/60));
 const counts=Array(slots).fill(0),pals=Array(slots).fill(0);
 items.forEach(a=>{
   const d=dt(a),m=d.getHours()*60+d.getMinutes(),i=Math.max(0,Math.min(slots-1,Math.floor((m-start)/60)));
   counts[i]++;
   pals[i]+=Math.max(0,Number(pallets(a)||0));
 });
 const maxCount=Math.max(0,...counts),maxPals=Math.max(0,...pals);
 const load=counts.map((c,i)=>{
   const nc=maxCount?c/maxCount:0,np=maxPals?pals[i]/maxPals:0;
   return Math.round((nc*.55+np*.45)*100);
 });
 const peak=Math.max(0,...load),peakIdx=peak?load.indexOf(peak):-1;
 const hh=i=>String(Math.floor((start+i*60)/60)%24).padStart(2,'0')+':00';
 const busiest=peakIdx>=0?`${hh(peakIdx)}–${hh(peakIdx+1)} · ${counts[peakIdx]} najava · ${pals[peakIdx]} paleta`:'nema opterećenja';
 if(sub)sub.textContent=`Peak hour: ${busiest} · linija kombinira broj najava i palete`;

 const W=900,H=190,PX=34,PY=20,base=H-34,plotH=H-58;
 const x=i=>PX+(slots<=1?0:i*(W-2*PX)/(slots-1));
 const y=v=>base-(Math.max(0,Math.min(100,v))/100)*plotH;
 const pts=load.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
 const areaPts=`${PX},${base} ${pts} ${x(slots-1).toFixed(1)},${base}`;
 const grid=[25,50,75,100].map(v=>`<line x1="${PX}" y1="${y(v)}" x2="${W-PX}" y2="${y(v)}" class="yv-peak-grid"/><text x="5" y="${y(v)+3}" class="yv-peak-y">${v}%</text>`).join('');
 const ticks=Array.from({length:slots},(_,i)=>i).filter(i=>i===0||i===slots-1||i%Math.max(1,Math.ceil(slots/6))===0)
   .map(i=>`<text x="${x(i)}" y="${H-8}" text-anchor="middle" class="yv-peak-x">${hh(i)}</text>`).join('');
 const dots=load.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="${i===peakIdx?5:3}" class="${i===peakIdx?'yv-peak-dot hot':'yv-peak-dot'}"><title>${hh(i)} · ${counts[i]} najava · ${pals[i]} paleta · opterećenje ${v}%</title></circle>`).join('');
 const peakLabel=peakIdx>=0?`<g class="yv-peak-callout"><line x1="${x(peakIdx)}" y1="${y(load[peakIdx])}" x2="${x(peakIdx)}" y2="${Math.max(18,y(load[peakIdx])-34)}"/><text x="${x(peakIdx)}" y="${Math.max(14,y(load[peakIdx])-39)}" text-anchor="middle">PEAK · ${counts[peakIdx]} NAJAVA · ${pals[peakIdx]} PAL</text></g>`:'';

 const rows=items.map(a=>`<div class="yv-tl-minirow"><b>${fmtTime(dt(a))}</b>${esc(supplier(a))}${pallets(a)!=null?` · ${pallets(a)} pal`:''}${dock(a)?` · R${esc(dock(a).replace(/^R/i,''))}`:''}</div>`).join('');
 body.innerHTML=`<div class="yv-tl-summary"><b>${items.length} dolazaka danas · ${pals.reduce((a,b)=>a+b,0)} paleta</b><span>Peak hour: ${esc(busiest)}</span></div>
 <div class="yv-peak-chart">
   <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Today Timeline opterećenje po satima">
     ${grid}
     <polygon points="${areaPts}" class="yv-peak-area"></polygon>
     <polyline points="${pts}" class="yv-peak-line"></polyline>
     ${dots}${peakLabel}${ticks}
   </svg>
 </div>
 <div class="yv-tl-legend"><span><i></i> kombinirano opterećenje</span><span class="mid">55% broj najava</span><span class="hot">45% palete</span></div>
 <div class="yv-tl-expanded-list">${rows||'<div class="yv-tl-minirow">Nema dolazaka danas.</div>'}</div>`;
}
function renderAll(){renderNext();renderTimeline()}
function boot(){ensure();['yardivo:data-synced','yardivo:master-data-changed','yardivo:session-ready','yardivo:yard-ai-dispatched','yardivo:receiving-status-changed','yardivo:context-changed'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(renderAll,20)));document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderAll()});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
