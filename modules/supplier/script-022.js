
const suppliers=[];
const timeSlots=["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00"];
const docks=[{id:'R1',name:'Rampa 1'},{id:'R2',name:'Rampa 2'},{id:'R3',name:'Rampa 3'},{id:'R4',name:'Rampa 4'},{id:'R5',name:'Rampa 5'},{id:'R6',name:'Rampa 6'}];
const defaultTrucks=[];
let trucks=JSON.parse(safeStorage.getItem('yms_trucks_v2')||'null')||defaultTrucks;
const save=()=>safeStorage.setItem('yms_trucks_v2',JSON.stringify(trucks));
const cls=s=>s.replace(/\s/g,'');
const mins=t=>Math.max(0,Math.round((Date.now()-t)/60000));
const fmtMin=t=>String(mins(t)).padStart(2,'0')+':00';
const icons={blue:'▱',orange:'◷',green:'▥',purple:'⚙'};

function renderStats(){
  const onsite=trucks.filter(t=>t.status!=='Završeno').length;
  const waiting=trucks.filter(t=>t.status==='Na čekanju').length;
  const atdock=trucks.filter(t=>t.status==='Na rampi').length;
  const completed=trucks.filter(t=>t.status==='Završeno').length;
  const total=trucks.length;
  const processing=atdock;
  const avgMins=onsite?Math.round(trucks.filter(t=>t.status!=='Završeno').reduce((sum,t)=>sum+mins(t.entered),0)/Math.max(1,onsite)):0;
  const data=[
    ['DANAS DOLASCI',total,`/ planirano ${total}`,'blue'],
    ['NA ČEKANJU',waiting,'','orange'],
    ['NA RAMPI',atdock,'','green'],
    ['U OBRADI',processing,'','purple'],
    ['OTIŠLI',completed,'Danas','green'],
    ['PROSJEČNO ZADRŽAVANJE',avgMins?`${avgMins} min`:'0 min','Danas','blue']
  ];
  document.getElementById('stats').innerHTML=data.map(([l,v,n,c])=>`<div class="stat"><div class="stat-icon ${c}">${icons[c]}</div><div><div class="label">${l}</div><div class="value">${v}</div><div class="note ${n.includes('Priority')?'danger':n.includes('Zauzeta')?'success':''}">${n}</div></div></div>`).join('');
}
function renderDockOverview(){
  const d=document.getElementById('dockOverview');if(!d)return;
  let wh='';try{wh=String(window.YardivoAppStateV583?.warehouse?.()||window.activeWarehouse||'')}catch(_){}
  let master={warehouses:[]};try{master=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')}catch(_){}
  const w=(master.warehouses||[]).find(x=>x&&x.active!==false&&String(x.id)===wh);
  const n=Math.max(0,Number(w?.ramps)||0);
  if(!w){d.innerHTML='<div class="overview-empty">Odaberi skladište.</div>';return}
  if(!n){d.innerHTML='<div class="overview-empty">Za ovo skladište nema konfiguriranih rampi.</div>';return}
  d.innerHTML=Array.from({length:n},(_,i)=>{const rn=i+1,dock=`Rampa ${rn}`;const t=(Array.isArray(trucks)?trucks:[]).find(x=>String(x.warehouse||wh)===wh&&String(x.dock||'')===dock&&x.status==='Na rampi');return `<div class="dock-card ${t?'busy':'free'}"><h3>RAMPA ${rn}</h3><div class="dock-status">${t?'ZAUZETA':'SLOBODNA'}</div><div class="truckline">${t?`▱ &nbsp;<strong>${t.plate||'—'}</strong><span>${t.carrier||t.supplier||'—'}</span><span>${t.arrival||'--:--'}</span>`:'▥<span style="margin-top:9px">Slobodna</span>'}</div><div class="mode">${t?'ISTOVAR':'DOSTUPNA'}</div></div>`}).join('');
}
function renderTable(){
  const q=(document.getElementById('searchInput')?.value||'').toLowerCase();
  const data=trucks.filter(t=>[t.plate,t.carrier,t.supplier||'',t.trailer,t.status,t.location,t.dock].join(' ').toLowerCase().includes(q));
  document.getElementById('truckTable').innerHTML=data.map((t,i)=>`<tr><td>${i+1}</td><td>${t.arrival||'--:--'}</td><td><strong>${t.plate}</strong></td><td>${t.carrier}</td><td>${t.supplier||'-'}</td><td><span class="op">${i%3===0?'UTOVAR':'ISTOVAR'}</span></td><td>${t.dock?t.dock.replace('D',''): '-'}</td><td><span class="badge ${cls(t.status)}">${t.status.toUpperCase()}</span></td><td>${fmtMin(t.entered)}</td><td><span class="priority ${(t.priority||'Low').toLowerCase()}">${(t.priority||'Low').toUpperCase()}</span></td><td><button class="action" onclick="advance(${t.id})">SLJEDEĆE</button></td></tr>`).join('');
}
function renderPlanner(){
  const times=['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30'];
  let html='<div class="planner-grid"><div class="time">RAMPA</div>'+times.map(t=>`<div class="time">${t}</div>`).join('');
  const bars={1:[],2:[],3:[],4:[],5:[],6:[]};
  (Array.isArray(trucks)?trucks:[]).forEach(t=>{
    const r=Number((String(t.dock||'').match(/\d+/)||[])[0]||0);
    if(!bars[r])return;
    const at=String(t.arrival||'').slice(0,5);
    const c=times.indexOf(at)+1;
    if(c<1)return;
    const clsName=t.status==='Na rampi'?'red':t.status==='Na čekanju'?'blue':'green';
    bars[r].push([c,1,String(t.plate||t.supplier||'KAMION'),clsName]);
  });
  for(let r=1;r<=6;r++){
    html+=`<div class="dock-label">${String(r).padStart(2,'0')}</div>`;
    for(let c=1;c<=14;c++){
      const b=(bars[r]||[]).find(x=>x[0]===c);
      if(b){html+=`<div class="slotbar ${b[3]}" style="grid-column:span ${b[1]}">${b[2]}</div>`;c+=b[1]-1}
      else html+='<div></div>';
    }
  }
  html+='</div>';
  const host=document.getElementById('planner');if(host)host.innerHTML=html;
}
function renderCards(){const host=document.getElementById('truckCards');if(!host)return;host.innerHTML=trucks.map(t=>`<div class="card"><h3>${t.plate}</h3><span class="badge ${cls(t.status)}">${t.status}</span><div class="meta">Prijevoznik: ${t.carrier}<br>Dobavljač: ${t.supplier||'-'}<br>Prikolica: ${t.trailer||'-'}<br>Yard: ${t.location||'-'}<br>Dock: ${t.dock||'-'}<br>U sustavu: ${mins(t.entered)} min</div></div>`).join('')}
function renderSuppliers(q=''){const term=String(q||'').toLowerCase().trim();const data=suppliers.filter(s=>s.toLowerCase().includes(term));document.getElementById('supplierCount').textContent=`${data.length} / ${suppliers.length} dobavljača`;document.getElementById('supplierGrid').innerHTML=data.map(s=>{const idx=suppliers.indexOf(s),cnt=announcements.filter(a=>a.supplier===s).length,inc=incidents.filter(i=>i.supplier===s).length;return `<div class="card supplier-click-card supplier-card" role="button" tabindex="0" data-supplier-index="${idx}" data-supplier-name="${s.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"><h3>${s}</h3><div class="meta">Dobavljač #${String(idx+1).padStart(3,'0')}<br>Status: <span style="color:var(--green)">AKTIVAN</span><br>Najave: <strong>${cnt}</strong> · Incidenti: <strong>${inc}</strong></div><button type="button" class="supplier-info-btn" tabindex="-1">INFO I POVIJEST</button></div>`}).join('')}

// FIX KLIK DOBAVLJAČA - event delegation na stvarni supplierGrid
document.getElementById('supplierGrid')?.addEventListener('click',function(e){
  const card=e.target.closest('.supplier-click-card');
  if(!card)return;
  const idx=Number(card.dataset.supplierIndex);
  if(Number.isInteger(idx)&&suppliers[idx])openSupplierProfile(suppliers[idx]);
});
document.getElementById('supplierGrid')?.addEventListener('keydown',function(e){
  if(e.key!=='Enter'&&e.key!==' ')return;
  const card=e.target.closest('.supplier-click-card');
  if(!card)return;
  e.preventDefault();
  const idx=Number(card.dataset.supplierIndex);
  if(Number.isInteger(idx)&&suppliers[idx])openSupplierProfile(suppliers[idx]);
});

function populateSuppliers(){const el=document.getElementById('supplierSelect');if(!el)return;el.innerHTML='<option value="">Odaberi dobavljača...</option>'+suppliers.map(s=>`<option value="${s.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}">${s}</option>`).join('')}

function truckHistoryRecords(){
  const byPlate=new Map();
  announcements.forEach(a=>{
    const plate=(typeof effectivePlate==='function'?effectivePlate(a):(a.arrivalPlate||a.plannedPlate||'')).trim().toUpperCase();
    if(!plate)return;
    if(!byPlate.has(plate))byPlate.set(plate,[]);
    byPlate.get(plate).push(a);
  });
  return Array.from(byPlate.entries()).map(([plate,visits])=>{
    visits.sort((a,b)=>String(b.actualDate||b.date).localeCompare(String(a.actualDate||a.date))||String(b.actualTime||b.time).localeCompare(String(a.actualTime||a.time)));
    const drivers=[...new Set(visits.map(a=>typeof effectiveDriver==='function'?effectiveDriver(a):(a.arrivalDriver||a.plannedDriver||'')).filter(Boolean))];
    const suppliers=[...new Set(visits.map(a=>a.supplier).filter(Boolean))];
    const arrived=visits.filter(a=>hasPhysicallyArrived(a)||a.actualDate||a.yardArrivalAt);
    const visitCount=Math.max(arrived.length,visits.length);
    return {
      plate,
      visits,
      visitCount,
      drivers,
      suppliers,
      last:visits[0],
      returning:visitCount>1
    };
  }).sort((a,b)=>String(b.last?.actualDate||b.last?.date).localeCompare(String(a.last?.actualDate||a.last?.date)));
}
function renderTruckHistorySection(){
  const host=document.getElementById('truckCards');if(!host)return;
  const q=(document.getElementById('truckPretraži2')?.value||'').toLowerCase().trim();
  const filter=document.getElementById('truckVisitFilter')?.value||'ALL';
  const all=truckHistoryRecords();
  const data=all.filter(r=>{
    const hay=[r.plate,...r.drivers,...r.suppliers].join(' ').toLowerCase();
    if(q&&!hay.includes(q))return false;
    if(filter==='RETURNING'&&!r.returning)return false;
    if(filter==='FIRST'&&r.returning)return false;
    return true;
  });

  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  set('truckUniqueCount',all.length);
  set('truckReturningCount',all.filter(x=>x.returning).length);
  set('truckVisitCount',all.reduce((s,x)=>s+x.visitCount,0));

  if(!data.length){host.innerHTML='<div class="truck-history-empty">Nema registracija koje odgovaraju filteru.</div>';return}

  host.innerHTML=data.map(r=>{
    const a=r.last||{};
    const lastDate=a.actualDate||a.date||'—';
    const lastTime=a.actualTime||a.time||'—';
    const lastDriver=(typeof effectiveDriver==='function'?effectiveDriver(a):(a.arrivalDriver||a.plannedDriver||''))||'—';
    const recent=r.visits.slice(0,5).map(v=>`<div class="truck-history-visit">
      <span>${v.actualDate||v.date||'—'}</span>
      <span>${v.supplier||'—'}</span>
      <span>${operationalPlanStatus(v)}</span>
    </div>`).join('');
    return `<div class="truck-history-card ${r.returning?'returning':'first'}" onclick="openAnnouncementDetail(${a.id},'trucks')">
      <div class="truck-history-head">
        <div class="truck-history-plate">🚛 ${r.plate}</div>
        ${r.returning?`<span class="truck-return-badge">VEĆ DOLAZIO · ${r.visitCount}×</span>`:`<span class="truck-first-badge">PRVI DOLAZAK</span>`}
      </div>
      <div class="truck-history-main">
        <span>ZADNJI DOLAZAK <strong>${lastDate} ${lastTime}</strong></span>
        <span>VOZAČ <strong>${lastDriver}</strong></span>
        <span>DOBAVLJAČ <strong>${a.supplier||'—'}</strong></span>
      </div>
      <div class="truck-history-meta">
        <div><small>DOLAZAKA</small><strong>${r.visitCount}</strong></div>
        <div><small>VOZAČA</small><strong>${r.drivers.length}</strong></div>
        <div><small>DOBAVLJAČA</small><strong>${r.suppliers.length}</strong></div>
      </div>
      <div class="truck-history-visits">${recent}</div>
    </div>`;
  }).join('');
}
document.getElementById('truckPretraži2')?.addEventListener('input',renderTruckHistorySection);
document.getElementById('truckVisitFilter')?.addEventListener('change',renderTruckHistorySection);


function yardivoElapsedTimer(a){
  const st=(typeof operationalPlanStatus==='function'?operationalPlanStatus(a):(a.status||''));
  let raw=null,label='';
  if(st==='U dvorištu'){
    raw=a.yardInAt||a.yardArrivalAt||a.gateInAt||a.actualArrival||a.actualDateTime;
    label='ČEKA';
  }else if(st==='Na rampi'){
    raw=a.dockAt||a.rampAt||a.dockArrivalAt||a.yardInAt||a.yardArrivalAt;
    label='NA RAMPI';
  }
  if(!raw)return {html:'',minutes:0};
  let d=new Date(raw);
  if(isNaN(d) && a.actualDate && a.actualTime) d=new Date(`${a.actualDate}T${a.actualTime}:00`);
  if(isNaN(d))return {html:'',minutes:0};
  const m=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));
  const cls=m>=60?'danger':m>=30?'warn':'';
  const txt=`${label} ${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}m`;
  return {html:`<span class="yard-live-timer ${cls}">${txt}</span>`,minutes:m,text:txt};
}
function yardivoTruckModelHtml(){
  return `<div class="yard-truck-model3d">
    <div class="truck3d-trailer">
      <i class="truck3d-face front"></i><i class="truck3d-face back"></i>
      <i class="truck3d-face top"></i><i class="truck3d-face bottom"></i>
      <i class="truck3d-face left"></i><i class="truck3d-face right"></i>
    </div>
    <div class="truck3d-cab">
      <i class="truck3d-face front"></i><i class="truck3d-face back"></i>
      <i class="truck3d-face top"></i><i class="truck3d-face bottom"></i>
      <i class="truck3d-face left"></i><i class="truck3d-face right"></i>
      <i class="truck3d-window"></i><i class="truck3d-grille"></i>
    </div>
    <i class="truck3d-wheel w1"></i><i class="truck3d-wheel w2"></i><i class="truck3d-wheel w3"></i>
  </div>`;
}

function renderYard(){
  const host=document.getElementById('yardGrid');if(!host)return;
  const today=window.yardivoLocalDateV583();
  const wh=(typeof activeWarehouse!=='undefined'&&activeWarehouse&&activeWarehouse!=='ALL')?activeWarehouse:yardivoCanonicalWarehouseV583();
  const inYard=announcements.filter(a=>String(a.warehouse||'')===String(wh)&&a.date===today&&normalizedPlanStatus(a)==='U dvorištu')
    .sort((a,b)=>String(a.yardArrivalAt||a.actualTime||a.time).localeCompare(String(b.yardArrivalAt||b.actualTime||b.time)));
  const onDock=announcements.filter(a=>(a.warehouse||yardivoCanonicalWarehouseV583())===wh&&a.date===today&&normalizedPlanStatus(a)==='Na rampi');
  const occupied=new Set(onDock.map(a=>Number(a.dock)));
  const slots=Array.from({length:16},(_,i)=>`P${String(i+1).padStart(2,'0')}`);
  const used=new Set(inYard.map(a=>a.yardPosition).filter(Boolean));
  inYard.forEach(a=>{if(!a.yardPosition||!slots.includes(a.yardPosition)){a.yardPosition=slots.find(s=>!used.has(s))||slots[0];used.add(a.yardPosition)}});
  try{saveAnnouncements()}catch(e){}

  const map=new Map(inYard.map(a=>[a.yardPosition,a]));
  host.innerHTML=slots.map(slot=>{
    const a=map.get(slot);
    if(!a)return `<div class="yard-slot"><span class="yard-slot-id">${slot}</span></div>`;
    const plate=typeof effectivePlate==='function'?(effectivePlate(a)||'BEZ TABLICA'):(a.plannedPlate||a.arrivalPlate||'BEZ TABLICA');
    const blocked=occupied.has(Number(a.dock));
    return `<div class="yard-slot occupied" data-announcement-id="${a.id}" data-dock="${a.dock||''}" data-ramp-blocked="${blocked?'1':'0'}" onclick="openAnnouncementDetail(${a.id},'yard')" style="cursor:pointer">
      <span class="yard-slot-id">${slot}</span>
      ${yardivoTruckModelHtml()}
      <div class="live-semi-label ${blocked?'ramp-blocked':''}"><strong>${a.supplier}</strong><span>${plate}</span><span>${a.pallets||0} PALETA</span><em>→ RAMPA ${a.dock||'—'}</em>${blocked?'<span class="blocked-text">RAMPA ZAUZETA · ČEKAJ</span>':''}${yardivoElapsedTimer(a).html}</div>
    </div>`;
  }).join('');

  const md=(()=>{try{return window.YardivoStableMasterV583?.master?.()||JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')}catch(_){return {warehouses:[]}}})();
  const masterWh=(Array.isArray(md?.warehouses)?md.warehouses:[]).find(w=>w&&w.active!==false&&String(w.id)===String(wh));
  const dockCount=Math.max(0,Number(masterWh?.ramps??WAREHOUSES?.[wh]?.ramps)||0);
  const rampSettings=Array.isArray(masterWh?.ramp_settings)?masterWh.ramp_settings:[];
  const rampInfo=dock=>rampSettings.find(x=>Number(x?.number)===Number(dock))||{number:dock,name:`Rampa ${dock}`,active:true};
  const dockHost=document.getElementById('yardDockPreview');
  if(dockHost)dockHost.innerHTML=Array.from({length:dockCount},(_,i)=>{
    const n=i+1;
    const a=onDock.find(x=>Number(x.dock)===n);
    const plate=a?(typeof effectivePlate==='function'?(effectivePlate(a)||'—'):(a.plannedPlate||a.arrivalPlate||'—')):'';
    return `<div class="yard-dock-card ${a?'occupied':'free-ramp'}" data-dock="${n}">
      <div class="ramp3d"><i class="ramp3d-face r3-front"></i><i class="ramp3d-face r3-back"></i><i class="ramp3d-face r3-left"></i><i class="ramp3d-face r3-right"></i><i class="ramp3d-face r3-top"></i><i class="ramp-led"></i></div>
      ${a?'<span class="ramp-occupied-badge">ZAUZETO</span>':'<span class="ramp-free-badge">SLOBODNA</span>'}
      <strong>RAMPA ${n}</strong>
      ${a?`<div class="docked-semi3d"><div class="semi3d">
  <div class="trailer3d"><i class="box-face bf-front"></i><i class="box-face bf-back"></i><i class="box-face bf-top"></i><i class="box-face bf-bottom"></i><i class="box-face bf-left"></i><i class="box-face bf-right"></i></div>
  <div class="cab3d"><i class="box-face bf-front"></i><i class="box-face bf-back"></i><i class="box-face bf-top"></i><i class="box-face bf-bottom"></i><i class="box-face bf-left"></i><i class="box-face bf-right"></i><i class="cab-window"></i></div>
  <i class="wheel3d w1"></i><i class="wheel3d w2"></i><i class="wheel3d w3"></i>
</div></div><span class="dock-truck-name">${a.supplier}</span><span class="dock-truck-plate">${plate}</span>`:'<small>SLOBODNA</small>'}
    </div>`;
  }).join('');

  const panel=document.getElementById('yardRampStatePanel');
  if(panel)panel.innerHTML=Array.from({length:dockCount},(_,i)=>{
    const n=i+1,a=onDock.find(x=>Number(x.dock)===n);
    const plate=a?(typeof effectivePlate==='function'?(effectivePlate(a)||'—'):(a.plannedPlate||a.arrivalPlate||'—')):'';
    return `<div class="ramp-state-row ${a?'occupied-row':''}"><b>RAMPA ${n}</b>${a?`<div><span class="occupied-text">ZAUZETO</span><br><small>${a.supplier} · ${plate}</small></div><small>${a.pallets||0} pal.</small>`:`<span class="free">SLOBODNA</span><small>—</small>`}</div>`;
  }).join('');

  const list=document.getElementById('yardTruckList');
  if(list)list.innerHTML=inYard.length?`<div class="yard-current-list">${inYard.map(a=>{
    const plate=typeof effectivePlate==='function'?(effectivePlate(a)||'—'):(a.plannedPlate||a.arrivalPlate||'—');
    const driver=typeof effectiveDriver==='function'?(effectiveDriver(a)||'—'):(a.plannedDriver||a.arrivalDriver||'—');
    const entry=a.yardArrivalAt?new Date(a.yardArrivalAt).toLocaleTimeString('hr-HR',{hour:'2-digit',minute:'2-digit'}):(a.actualTime||'—');
    const blocked=occupied.has(Number(a.dock));
    return `<div class="yard-current-row" onclick="openAnnouncementDetail(${a.id},'yard')" style="cursor:pointer"><strong>${plate}</strong><span>${a.supplier}</span><span>${driver}</span><span>${a.pallets||0} pal.</span><span>ULAZ ${entry}</span><span>${a.yardPosition||'—'} → R${a.dock||'—'}${blocked?' · RAMPA ZAUZETA':''}</span></div>`;
  }).join('')}</div>`:'<div class="overview-empty">Trenutno nema kamiona sa statusom U DVORIŠTU.</div>';

  const occ=document.getElementById('yardOccupiedCount');if(occ)occ.textContent=inYard.length;
  const free=document.getElementById('yardFreeCount');if(free)free.textContent=Math.max(0,slots.length-inYard.length);
  const wait=document.getElementById('yardWaitingCount');if(wait)wait.textContent=inYard.length;
  const wl=document.getElementById('yardMapWarehouseLabel');if(wl)wl.textContent=typeof warehouseOptionLabel==='function'?warehouseOptionLabel(wh):wh;
  const dl=document.getElementById('yardMapDateLabel');if(dl)dl.textContent=today;
  requestAnimationFrame(()=>renderLive3DRoutes(inYard));
}
function renderLive3DRoutes(inYard){
  const layer=document.getElementById('yardRouteLayer');
  const ground=document.getElementById('yard3DGround') || (layer && layer.closest('.live3d-ground'));
  if(!layer||!ground)return;
  layer.innerHTML='';

  // X/Y računamo u lokalnim koordinatama samog poda.
  // Tako ruta ostaje zalijepljena za pod i pri zoomu/360° rotaciji.
  function pointInGround(el, xFactor, yFactor){
    let x=(el.offsetWidth||0)*xFactor;
    let y=(el.offsetHeight||0)*yFactor;
    let n=el;
    while(n && n!==ground){
      x += n.offsetLeft||0;
      y += n.offsetTop||0;
      n=n.offsetParent;
    }
    return {x,y};
  }

  inYard.forEach(a=>{
    const ramp=Number(a.dock);
    if(!Number.isFinite(ramp) || ramp<1)return;

    const truck=document.querySelector(`.yard-slot[data-announcement-id="${a.id}"]`);
    const dock=document.querySelector(`.yard-dock-card[data-dock="${ramp}"]`);
    if(!truck||!dock)return;

    // Polazište: donji/desni dio parkirnog mjesta kamiona.
    // Odredište: lijevi ulaz TOČNO one rampe koja je spremljena u najavi.
    const p1=pointInGround(truck,.62,.72);
    const p2=pointInGround(dock,.03,.50);

    const dx=p2.x-p1.x, dy=p2.y-p1.y;
    const len=Math.hypot(dx,dy);
    if(!Number.isFinite(len) || len<2)return;
    const angle=Math.atan2(dy,dx)*180/Math.PI;

    const line=document.createElement('div');
    line.className='neon-route';
    line.dataset.announcementId=String(a.id);
    line.dataset.targetDock=String(ramp);
    line.title=`${a.supplier} → RAMPA ${ramp}`;
    line.style.left=p1.x+'px';
    line.style.top=p1.y+'px';
    line.style.width=len+'px';
    line.style.transform=`translateY(-50%) rotate(${angle}deg)`;
    layer.appendChild(line);

    // 2D strelice leže na istoj ravnini poda i usmjerene su prema rampi.
    [0.22,0.42,0.62,0.82,0.96].forEach(f=>{
      const ar=document.createElement('div');
      ar.className='floor-arrow-marker';
      ar.style.left=(p1.x+dx*f)+'px';
      ar.style.top=(p1.y+dy*f)+'px';
      ar.style.transform=`translate(-50%,-50%) rotate(${angle}deg)`;
      layer.appendChild(ar);
    });
  });
}
function renderRampe(){
  const host=document.getElementById('dockGrid');if(!host)return;
  const today=window.yardivoLocalDateV583();
  const wh=(typeof activeWarehouse!=='undefined'&&activeWarehouse&&activeWarehouse!=='ALL')
    ? activeWarehouse
    : yardivoCanonicalWarehouseV583();

  const dockCount=WAREHOUSES?.[wh]?.ramps||0;
  const active=announcements
    .filter(a=>(a.warehouse||yardivoCanonicalWarehouseV583())===wh)
    .filter(a=>a.date===today)
    .filter(a=>normalizedPlanStatus(a)==='Na rampi');

  const byDock=new Map();
  active.forEach(a=>{
    const d=Number(a.dock);
    if(d>=1&&d<=dockCount&&!byDock.has(d))byDock.set(d,a);
  });

  host.innerHTML=Array.from({length:dockCount},(_,i)=>{
    const dock=i+1;
    const a=byDock.get(dock);

    const ri=rampInfo(dock),rampDisplay=String(ri?.name||`Rampa ${dock}`),isRampActive=ri?.active!==false;
    if(!a){
      return `<div class="dock-live-card ${isRampActive?'free':'yardivo-ramp-off'}" data-ramp-number="${dock}">
        <h3>${rampDisplay}</h3>
        ${isRampActive?`<div class="dock-live-free">
          <div class="icon">✓</div>
          <div>RAMPA TRENUTNO SLOBODNA</div>
          <small>Spremna za sljedeći kamion</small>
        </div>`:`<div class="dock-live-free yardivo-ramp-off-state">
          <div class="icon">⏻</div>
          <div>RAMPA JE ISKLJUČENA</div>
          <small>Ne koristi se za dodjelu termina dok je OFF.</small>
        </div>`}
      </div>`;
    }

    const plate=typeof effectivePlate==='function'
      ? (effectivePlate(a)||'BEZ TABLICA')
      : (a.plannedPlate||a.arrivalPlate||'BEZ TABLICA');
    const driver=typeof effectiveDriver==='function'
      ? (effectiveDriver(a)||'Vozač nije unesen')
      : (a.plannedDriver||a.arrivalDriver||'Vozač nije unesen');

    const dockTime=a.dockArrivalAt
      ? new Date(a.dockArrivalAt).toLocaleTimeString('hr-HR',{hour:'2-digit',minute:'2-digit'})
      : (a.actualTime||'—');

    return `<div class="dock-live-card busy" data-announcement-id="${a.id}" onclick="openAnnouncementDetail(${a.id},'docks')" style="cursor:pointer">
      <h3>${rampDisplay}</h3>
      <div class="dock-live-truck">
        <span class="dock-live-status">NA RAMPI</span>
        <div class="dock-live-identity">🚛 ${plate}</div>
        <div class="dock-live-driver">👤 ${driver}</div>
        <div class="dock-live-supplier">${a.supplier}</div>
        <div class="dock-live-meta">
          <div><small>PALETE</small><strong>${a.pallets||0}</strong></div>
          <div><small>DOLAZAK NA RAMPU</small><strong>${dockTime}</strong></div>
          <div><small>ODGOVORNA OSOBA</small><strong>${a.responsible||'—'}</strong></div>
        </div>
      </div>
    </div>`;
  }).join('');

  const busy=document.getElementById('dockBusyCount');if(busy)busy.textContent=active.length;
  const free=document.getElementById('dockFreeCount');if(free)free.textContent=Math.max(0,dockCount-active.length);
  const whLabel=document.getElementById('dockLiveWarehouseLabel');
  if(whLabel)whLabel.textContent=typeof warehouseOptionLabel==='function'?warehouseOptionLabel(wh):wh;
  const dateLabel=document.getElementById('dockLiveDateLabel');if(dateLabel)dateLabel.textContent=today;
}

// ===== JEDNOSTAVNA NADZORNA PLOČA =====
const DASH_STATUS_META={
  'U dolasku':{label:'U DOLASKU',color:'#126fc9',kpi:'blue'},
  'Na rampi':{label:'NA RAMPI',color:'#d18a09',kpi:'yellow'},
  'Zaprimljeno':{label:'ZAPRIMLJENO',color:'#147a38',kpi:'green'},
  'Odbijen':{label:'ODBIJENO',color:'#a72b35',kpi:'red'},
  'Kašnjenje':{label:'KAŠNJENJE',color:'#d18a09',kpi:'yellow'},
  'NO-SHOW':{label:'NO-SHOW',color:'#b96f00',kpi:'orange'},
  'NIJE DOŠAO':{label:'NIJE DOŠAO',color:'#8f454d',kpi:'red'},
  'Promijenjena nakon NO-SHOW':{label:'PROMIJENJENA',color:'#6f42c1',kpi:'purple'}
};

function dashboardWarehouse(){
  if(typeof activeWarehouse!=='undefined'&&activeWarehouse&&activeWarehouse!=='ALL')return activeWarehouse;
  return yardivoCanonicalWarehouseV583();
}
function dashboardTodayData(){
  const wh=dashboardWarehouse();
  const today=window.yardivoLocalDateV583();
  return announcements
    .filter(a=>(a.warehouse||yardivoCanonicalWarehouseV583())===wh&&a.date===today)
    .sort((a,b)=>String(a.time).localeCompare(String(b.time)));
}
function dashStatusOf(a){
  return typeof operationalPlanStatus==='function'?operationalPlanStatus(a):(a.status||'U dolasku');
}
function dashboardDataForDate(date,wh=dashboardWarehouse()){
  try{
    return announcements
      .filter(a=>(a.warehouse||yardivoCanonicalWarehouseV583())===wh&&a.date===date)
      .sort((a,b)=>String(a.time).localeCompare(String(b.time)));
  }catch(_){return []}
}
function dashboardPreviousDate(date){
  const d=new Date(date+'T12:00:00');
  d.setDate(d.getDate()-1);
  return d.toISOString().slice(0,10);
}
function dashboardDayInfo(date){
  try{
    if(typeof dayInfo==='function')return dayInfo(date)||{closed:false};
  }catch(_){}
  const d=new Date(date+'T12:00:00'),dow=d.getDay();
  return {closed:dow===0||dow===6,name:dow===0?'Nedjelja':dow===6?'Subota':'',kind:dow===0||dow===6?'weekend':''};
}
function dashboardMetrics(data){
  const counts={};
  data.forEach(a=>{const st=dashStatusOf(a);counts[st]=(counts[st]||0)+1});
  const cnt=st=>counts[st]||0;
  const attention=data.filter(a=>['Kašnjenje','NO-SHOW','Odbijen','Nije došao','NIJE DOŠAO'].includes(dashStatusOf(a))).length;
  return {
    trucks:data.reduce((sum,a)=>sum+truckCountForPallets(a.pallets),0),
    announcements:data.length,
    pallets:data.reduce((sum,a)=>sum+Number(a.pallets||0),0),
    waiting:cnt('U dolasku')+cnt('U dvorištu'),
    dock:cnt('Na rampi'),
    completed:cnt('Zaprimljeno'),
    attention
  };
}
function dashboardVsYesterday(todayValue,yesterdayValue,yesterdayInfo){
  if(yesterdayInfo?.closed){
    return {
      cls:'closed',
      html:`<span class="x">✕</span> NERADNI DAN`,
      note:yesterdayInfo.name?`Jučer · ${yesterdayInfo.name}`:'Jučer · neradni dan'
    };
  }
  const now=Number(todayValue)||0,prev=Number(yesterdayValue)||0;
  if(prev===0){
    if(now===0)return {cls:'same',html:'0%',note:'Jučer · 0'};
    return {cls:'new',html:'NOVO',note:'Jučer · 0'};
  }
  const pct=Math.round(((now-prev)/prev)*100);
  if(pct>0)return {cls:'up',html:`▲ ${Math.abs(pct)}%`,note:`Jučer · ${prev}`};
  if(pct<0)return {cls:'down',html:`▼ ${Math.abs(pct)}%`,note:`Jučer · ${prev}`};
  return {cls:'same',html:'0%',note:`Jučer · ${prev}`};
}
function renderDashboardSimple(){
  try{renderAfter14NoShowAlerts()}catch(e){}
  const root=document.getElementById('dashboard');if(!root)return;
  const wh=dashboardWarehouse();
  const data=dashboardTodayData();
  const today=window.yardivoLocalDateV583();
  const yesterday=dashboardPreviousDate(today);
  const yesterdayInfo=dashboardDayInfo(yesterday);
  const yesterdayData=dashboardDataForDate(yesterday,wh);
  const now=new Date();

  const metrics=dashboardMetrics(data);
  const yMetrics=dashboardMetrics(yesterdayData);
  const totalPal=metrics.pallets;
  const totalTrucks=metrics.trucks;

  const subtitle=document.getElementById('dashWarehouseSubtitle');
  if(subtitle)subtitle.textContent=`${whLabel(wh)} · današnji operativni pregled prijama`;
  const badge=document.getElementById('dashTodayBadge');
  if(badge)badge.textContent=new Date(today+'T12:00:00').toLocaleDateString('hr-HR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).toUpperCase();

  const counts={};
  data.forEach(a=>{const st=dashStatusOf(a);counts[st]=(counts[st]||0)+1});
  const cnt=st=>counts[st]||0;
  const attention=data.filter(a=>['Kašnjenje','NO-SHOW','Odbijen','Nije došao','NIJE DOŠAO'].includes(dashStatusOf(a)));
  const completed=metrics.completed;
  const waiting=metrics.waiting;

  const kpis=[
    ['NAJAVLJENO KAMIONA',metrics.trucks,yMetrics.trucks,'Planirani kamioni','blue'],
    ['PALETE',metrics.pallets,yMetrics.pallets,'Najavljeno danas',''],
    ['U ČEKANJU',metrics.waiting,yMetrics.waiting,'Dolazak / dvorište','yellow'],
    ['NA RAMPI',metrics.dock,yMetrics.dock,'Aktivan prijam','blue'],
    ['ZAPRIMLJENO',metrics.completed,yMetrics.completed,'Završeno danas','green'],
    ['TRAŽI PAŽNJU',metrics.attention,yMetrics.attention,'Kašnjenje / no-show / odbijeno',metrics.attention?'red':'green']
  ];
  const kpiHost=document.getElementById('dashPrimaryKpis');
  if(kpiHost)kpiHost.innerHTML=kpis.map(k=>{
    const vs=dashboardVsYesterday(k[1],k[2],yesterdayInfo);
    return `<div class="dash-clean-kpi ${k[4]}">
      <small>${k[0]}</small>
      <div class="dash-kpi-value-row"><strong>${k[1]}</strong><span class="dash-vs-yesterday ${vs.cls}">${vs.html}</span></div>
      <span>${k[3]}</span>
      <span class="dash-kpi-yesterday-note">${vs.note}</span>
    </div>`;
  }).join('');

  const statusSpec=[
    ['U dolasku','#3c8dd8'],
    ['U dvorištu','#6b8fa8'],
    ['Na rampi','#d6aa39'],
    ['Zaprimljeno','#36b76a'],
    ['Kašnjenje','#d18a29'],
    ['NO-SHOW','#db6e2e'],
    ['Odbijen','#df4a57']
  ];
  const total=Math.max(1,data.length);
  let acc=0;
  const stops=[];
  statusSpec.forEach(([s,color])=>{
    const n=cnt(s);
    if(!n)return;
    const from=acc/total*360;acc+=n;const to=acc/total*360;
    stops.push(`${color} ${from}deg ${to}deg`);
  });
  if(!stops.length)stops.push('#18303f 0deg 360deg');
  const donut=document.getElementById('dashStatusDonut');
  if(donut)donut.innerHTML=`<div class="dash-donut" style="background:conic-gradient(${stops.join(',')})"><div class="dash-donut-center"><strong>${data.length}</strong><small>DOLAZAKA</small></div></div>
    <div class="dash-donut-legend">${statusSpec.filter(([s])=>cnt(s)>0).map(([s,color])=>`<div class="dash-donut-row"><i style="background:${color}"></i><span>${s}</span><strong>${cnt(s)}</strong></div>`).join('')||'<div class="dash-empty">Nema današnjih najava.</div>'}</div>`;

  const hours=Array.from({length:17},(_,i)=>i+5);
  const hourCounts=hours.map(h=>data.filter(a=>Number(String(a.time||'00').slice(0,2))===h).length);
  const maxH=Math.max(1,...hourCounts);
  const hHost=document.getElementById('dashHourlyChart');
  if(hHost)hHost.innerHTML=hours.map((h,i)=>`<div class="dash-hour-col" title="${String(h).padStart(2,'0')}:00 · ${hourCounts[i]} dolazaka">
    <div class="dash-hour-value">${hourCounts[i]||''}</div>
    <div class="dash-hour-track"><div class="dash-hour-bar" style="height:${Math.max(hourCounts[i]?5:0,Math.round(hourCounts[i]/maxH*100))}%"></div></div>
    <div class="dash-hour-label">${String(h).padStart(2,'0')}</div>
  </div>`).join('');

  const cap=(typeof getWarehouseCapacity==='function'?getWarehouseCapacity(wh):null);
  const capKnown=Number.isFinite(Number(cap))&&Number(cap)>0;
  const pct=capKnown?Math.min(100,Math.round(totalPal/Number(cap)*100)):0,free=capKnown?Math.max(0,Number(cap)-totalPal):null;
  const capColor=!capKnown?'#71879a':pct>=90?'#df4a57':pct>=75?'#d67c2e':pct>=50?'#d2aa3d':'#36b76a';
  const capHost=document.getElementById('dashCapacitySimple');
  if(capHost)capHost.innerHTML=`<div class="dash-cap-ring" style="background:conic-gradient(${capColor} ${pct*3.6}deg,#142733 0deg)">
      <div class="inner"><strong>${capKnown?pct+'%':'—'}</strong><small>${capKnown?'OPTEREĆENJE':'KAPACITET NEPOZNAT'}</small></div>
    </div>
    <div class="dash-cap-metrics">
      <div><small>NAJAVLJENO</small><strong>${totalPal} pal.</strong></div>
      <div><small>SLOBODNO</small><strong>${capKnown?free+' pal.':'—'}</strong></div>
      <div><small>KAMIONA</small><strong>${totalTrucks}</strong></div>
      <div><small>KAPACITET</small><strong>${capKnown?Number(cap)+' pal.':'NEPOZNAT'}</strong></div>
    </div>`;

  const attHost=document.getElementById('dashAttentionList');
  const attCount=document.getElementById('dashAttentionCount');
  if(attCount)attCount.textContent=attention.length;
  if(attHost)attHost.innerHTML=attention.length?attention.map(a=>{
    const s=dashStatusOf(a),delay=typeof operationalDelayText==='function'?operationalDelayText(a):'';
    return `<div class="dash-attention-item">
      <strong>${a.time||'—'} · R${a.dock||'—'}</strong>
      <span>${a.supplier}</span>
      <span>${a.pallets||0} pal.</span>
      <span class="reason">${s}${delay?' · '+delay:''}</span>
    </div>`;
  }).join(''):'<div class="dash-empty">Nema stavki koje trenutno zahtijevaju pažnju.</div>';

  const minutesNow=now.getHours()*60+now.getMinutes();
  const upcoming=data.filter(a=>{
    const s=dashStatusOf(a);
    if(['Zaprimljeno','Odbijen'].includes(s))return false;
    const [hh,mm]=String(a.time||'00:00').split(':').map(Number);
    return hh*60+(mm||0)>=minutesNow-15;
  }).sort((a,b)=>String(a.time).localeCompare(String(b.time))).slice(0,6);

  const nextHost=document.getElementById('dashNextArrivals');
  if(nextHost)nextHost.innerHTML=upcoming.length?upcoming.map(a=>`<div class="dash-next-item">
    <strong>${a.time||'—'}</strong>
    <span>${a.supplier}</span>
    <span>R${a.dock||'—'} · ${a.pallets||0} pal.</span>
    <span class="dash-mini-pill status">${dashStatusOf(a)}</span>
  </div>`).join(''):'<div class="dash-empty">Nema više planiranih dolazaka za danas.</div>';
}

function render(){
  if(document.getElementById('dashboard'))renderDashboardSimple();
  if(document.getElementById('stats'))renderStats();
  if(document.getElementById('dockOverview'))renderDockOverview();
  if(document.getElementById('truckTable'))renderTable();
  if(document.getElementById('planner'))renderPlanner();
  if(typeof renderCards==='function')renderCards();
  if(document.getElementById('yardGrid'))renderYard();
  if(document.getElementById('dockGrid'))renderRampe();
  if(document.getElementById('supplierGrid'))renderSuppliers(document.getElementById('supplierPretraži')?.value||'');
  if(document.getElementById('announcementTable'))renderAnnouncements();
  if(document.getElementById('receivingList'))renderReceiving();
  if(document.getElementById('weeklyMapBoard'))renderWeeklyMap();
  if(document.getElementById('overview'))renderOverview();
  if(document.getElementById('incidentTable'))renderIncidents();
  renderAfter14NoShowAlerts();
}
window.advance=id=>{const t=trucks.find(x=>x.id===id);if(!t)return;const flow=['U dolasku','Na čekanju','Na rampi','Završeno'];const idx=flow.indexOf(t.status);t.status=flow[Math.min(idx+1,flow.length-1)];if(t.status==='Na čekanju'&&!t.location)t.location='Y'+String((id%20)+1).padStart(2,'0');if(t.status==='Na rampi'){t.location='';if(!t.dock)t.dock='Rampa '+String((id%6)+1)}if(t.status==='Završeno'){t.location='';t.dock=''}save();render()};

document.querySelector('.nav')?.addEventListener('click',e=>{
  const btn=e.target.closest('.nav-btn[data-view]');
  if(!btn)return;
  e.preventDefault();
  openAppView(btn.dataset.view);
});
document.getElementById('searchInput')?.addEventListener('input',renderTable);



// ===== LOKACIJE I SKLADIŠTA =====
const WAREHOUSES={};
let activeWarehouse=safeStorage.getItem('studenac_active_warehouse')||'ALL';
function whLabel(code){if(!code||code==='ALL')return 'Sva skladišta';try{return warehouseOptionLabel(code)||'Skladište'}catch(_){return 'Skladište'}}
function whMatch(a){return activeWarehouse==='ALL'||(a.warehouse||yardivoCanonicalWarehouseV583())===activeWarehouse}
function whRamps(code){return WAREHOUSES[code]?.ramps||0}
function whStart(code){return WAREHOUSES[code]?.receptionStart}
function whEnd(code){return WAREHOUSES[code]?.receptionEnd}

function renderWarehouseCards(){
 const host=document.getElementById('warehouseCards');if(!host)return;
 host.innerHTML=Object.values(WAREHOUSES).map(w=>{
   const c=announcements.filter(a=>(a.warehouse||yardivoCanonicalWarehouseV583())===w.code).length;
   return `<div class="warehouse-card ${activeWarehouse===w.code?'active':''}" onclick="setGlobalWarehouse('${w.code}')">
     <h3>${w.code} · ${w.name}</h3><small>${w.location}</small>
     <strong>${w.ramps?`${w.ramps} rampi`:'Broj rampi nije definiran'} · ${(()=>{const c=typeof getWarehouseCapacity==='function'?getWarehouseCapacity(w.code):null;return Number.isFinite(Number(c))&&Number(c)>0?Number(c)+' pal. kapacitet':'KAPACITET NEPOZNAT'})()}</strong>
     <small>${w.receptionStart?`Zaprimanje ${w.receptionStart}–${w.receptionEnd}`:'Vrijeme prijama nije definirano'} · ${c} najava</small>
   </div>`;
 }).join('');
}
window.setGlobalWarehouse=function(code){
 activeWarehouse=code;safeStorage.setItem('studenac_active_warehouse',code);
 const el=document.getElementById('globalWarehouse');if(el)el.value=code;
 render();
}
function updateWarehouseToolbar(){
 const s=document.getElementById('globalWarehouse'),info=document.getElementById('globalWarehouseInfo');
 if(s)s.value=activeWarehouse;if(info)info.textContent=activeWarehouse==='ALL'?'SVA SKLADIŠTA':whLabel(activeWarehouse).toUpperCase();
}
document.getElementById('globalWarehouse')?.addEventListener('change',e=>setGlobalWarehouse(e.target.value));

// ===== STUDENAC: dolasci, kašnjenja, overview i incidenti =====
let incidents=JSON.parse(safeStorage.getItem('yardivo_yms_incidents_v1')||'[]');
const saveIncidents=()=>safeStorage.setItem('yardivo_yms_incidents_v1',JSON.stringify(incidents));
let TOLERANCE_MIN=15;
function yardivoDelayGraceMinutes(){
  try{
    const v=Number(window.YardivoDelayRulesV1?.get?.().graceMinutes);
    if(Number.isFinite(v)&&v>=0)return v;
  }catch(_){}
  return Number.isFinite(Number(TOLERANCE_MIN))?Number(TOLERANCE_MIN):15;
}

function plannedDateTime(a){return new Date(`${a.date}T${a.time}:00`)}
function actualDateTime(a){return a.actualDate&&a.actualTime?new Date(`${a.actualDate}T${a.actualTime}:00`):null}
function delayMinutes(a){
  const actual=actualDateTime(a); if(!actual)return null;
  return Math.round((actual-plannedDateTime(a))/60000);
}
function formatDelay(m){
  if(m===null||m===undefined)return '—';
  const early=m<0, x=Math.abs(m), days=Math.floor(x/1440), hrs=Math.floor((x%1440)/60), mins=x%60;
  const parts=[]; if(days)parts.push(`${days} d`); if(hrs)parts.push(`${hrs} h`); if(mins||!parts.length)parts.push(`${mins} min`);
  return (early?'ranije ':'')+parts.join(' ');
}
function delayClass(m){if(m===null)return ''; if(m>TOLERANCE_MIN)return 'late'; if(m<0)return 'early'; return 'good'}
function delayLabel(m){if(m===null)return 'NIJE EVIDENTIRANO';if(m>TOLERANCE_MIN)return `KASNI ${formatDelay(m)}`;if(m<0)return `RANIJE ${formatDelay(m).replace('ranije ','')}`;return m>0?`NA VRIJEME (+${m} min)`:'TOČNO NA VRIJEME'}
function fmtPlan(date,time){return `${date.split('-').reverse().join('.')} · ${time}`}

function populateIncidentControls(){
  const s=document.getElementById('incSupplier');
  if(s)s.innerHTML='<option value="">Odaberi dobavljača...</option>'+suppliers.map(x=>`<option>${x}</option>`).join('');
  const date=document.getElementById('incDate');if(date&&!date.value)date.value=window.yardivoLocalDateV583();
  refreshIncidentAnnouncements();
}
function refreshIncidentAnnouncements(){
  const el=document.getElementById('incAnnouncement'); if(!el)return;
  const sup=document.getElementById('incSupplier')?.value||'';
  const list=announcements.filter(a=>!sup||a.supplier===sup).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  el.innerHTML='<option value="">Bez povezane najave</option>'+list.map(a=>`<option value="${a.id}">${a.date} ${a.time} · ${a.supplier} · Rampa ${a.dock}</option>`).join('');
}
document.getElementById('incSupplier')?.addEventListener('change',refreshIncidentAnnouncements);

const arrivalDialog=document.getElementById('arrivalDialog');
window.recordArrival=function(id){
  const a=announcements.find(x=>x.id===id);if(!a)return;
  document.getElementById('arrivalAnnouncementId').value=id;
  document.getElementById('arrivalPlanInfo').innerHTML=`<strong>${a.supplier}</strong><br>Originalna najava: <strong>${fmtPlan(a.date,a.time)}</strong> · Rampa ${a.dock}<br>${a.pallets} paleta · ${a.sku} SKU`;
  const now=new Date();
  document.getElementById('actualDate').value=a.actualDate||now.toISOString().slice(0,10);
  document.getElementById('actualTime').value=a.actualTime||now.toTimeString().slice(0,5);
  previewArrivalDelay();arrivalDialog.showModal();
}
function previewArrivalDelay(){
  const id=Number(document.getElementById('arrivalAnnouncementId')?.value),a=announcements.find(x=>x.id===id);
  if(!a)return;
  const d=document.getElementById('actualDate').value,t=document.getElementById('actualTime').value;if(!d||!t)return;
  const m=Math.round((new Date(`${d}T${t}:00`)-plannedDateTime(a))/60000);
  const el=document.getElementById('arrivalDelayPreview');
  if(m>TOLERANCE_MIN){el.className='notice-result bad';el.innerHTML=`<h3>KAŠNJENJE</h3><p>Dobavljač kasni <strong>${formatDelay(m)}</strong> u odnosu na originalnu najavu.</p>`}
  else if(m<0){el.className='notice-result info';el.innerHTML=`<h3>RANIJI DOLAZAK</h3><p>Dobavljač je došao <strong>${formatDelay(m).replace('ranije ','')}</strong> ranije.</p>`}
  else{el.className='notice-result good';el.innerHTML=`<h3>DOLAZAK NA VRIJEME</h3><p>Odstupanje je ${m} min, unutar tolerancije od ${TOLERANCE_MIN} min.</p>`}
}
['actualDate','actualTime'].forEach(id=>document.getElementById(id)?.addEventListener('input',previewArrivalDelay));
document.getElementById('closeArrival')?.addEventListener('click',()=>arrivalDialog.close());
document.getElementById('cancelArrival')?.addEventListener('click',()=>arrivalDialog.close());
document.getElementById('arrivalForm')?.addEventListener('submit',e=>{
  e.preventDefault();const id=Number(document.getElementById('arrivalAnnouncementId').value),a=announcements.find(x=>x.id===id);if(!a)return;
  a.actualDate=document.getElementById('actualDate').value;a.actualTime=document.getElementById('actualTime').value;
  a.arrivalRecordedAt=new Date().toISOString();saveAnnouncements();arrivalDialog.close();renderAnnouncements();renderOverview();
});


// ===== TJEDNE ISPORUKE PREGLED =====
function isoWeekInfo(date){
  const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
  const day=d.getUTCDay()||7;
  d.setUTCDate(d.getUTCDate()+4-day);
  const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const week=Math.ceil((((d-yearStart)/86400000)+1)/7);
  return {year:d.getUTCFullYear(),week};
}
function weeksInIsoYear(year){
  return isoWeekInfo(new Date(year,11,28)).week;
}
function mondayOfIsoWeek(year,week){
  const jan4=new Date(year,0,4,12,0,0);
  const jan4Day=jan4.getDay()||7;
  const monday=new Date(jan4);
  monday.setDate(jan4.getDate()-(jan4Day-1)+(week-1)*7);
  monday.setHours(12,0,0,0);
  return monday;
}
function localIsoDate(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
let selectedWeek=(()=>{
  const x=isoWeekInfo(new Date());
  return {year:x.year,week:x.week};
})();

function populateWeekSelector(){
  const sel=document.getElementById('weekSelector');if(!sel)return;
  const years=[selectedWeek.year-1,selectedWeek.year,selectedWeek.year+1];
  let html='';
  years.forEach(y=>{
    html+=`<optgroup label="${y}">`;
    for(let w=1;w<=weeksInIsoYear(y);w++){
      html+=`<option value="${y}-${w}" ${y===selectedWeek.year&&w===selectedWeek.week?'selected':''}>Week ${w} · ${y}</option>`;
    }
    html+='</optgroup>';
  });
  sel.innerHTML=html;
}
function moveSelectedWeek(delta){
  let monday=mondayOfIsoWeek(selectedWeek.year,selectedWeek.week);
  monday.setDate(monday.getDate()+delta*7);
  selectedWeek=isoWeekInfo(monday);
  populateWeekSelector();renderWeeklyDeliveries();
}
function weeklyWarehouseFilter(a){
  const wh=activeWarehouse||'ALL';
  return wh==='ALL'||(a.warehouse||yardivoCanonicalWarehouseV583())===wh;
}

// ===== DNEVNA MAPA =====
let dailyMapZoom=1;
function dailyMapDateValue(){
  return document.getElementById('dailyMapDate')?.value||window.yardivoLocalDateV583();
}
function setDailyMapDate(date){
  const el=document.getElementById('dailyMapDate');
  if(el)el.value=date;
  renderDailyMap();
}
function moveDailyMapDay(delta){
  const d=new Date(dailyMapDateValue()+'T12:00:00');
  d.setDate(d.getDate()+delta);
  setDailyMapDate(localIsoDate(d));
}
function applyDailyMapZoom(){
  const inner=document.getElementById('dailyMapInner');
  const label=document.getElementById('dailyZoomValue');
  if(inner)inner.style.transform=`scale(${dailyMapZoom})`;
  if(label)label.textContent=Math.round(dailyMapZoom*100)+'%';
}
function setDailyMapZoom(next){
  dailyMapZoom=Math.max(.65,Math.min(1.65,Math.round(next*100)/100));
  applyDailyMapZoom();
}
function dailyMapWarehouseCode(){
  const sel=document.getElementById('dailyMapWarehouseSelect');
  return sel?.value || ((activeWarehouse&&activeWarehouse!=='ALL'?activeWarehouse:yardivoCanonicalWarehouseV583()));
}


const DAILY_RECEIVING_CAPACITY_PALLETS=null;
let selectedDailyRamp=null;

function capacityBand(pct){
  if(pct>=90)return {cls:'cap-critical',label:'KRITIČNO'};
  if(pct>=75)return {cls:'cap-high',label:'VISOKO'};
  if(pct>=50)return {cls:'cap-mid',label:'SREDNJE'};
  return {cls:'cap-low',label:'NISKO'};
}
function renderDailyTotalCapacity(){
  const date=dailyMapDateValue();
  const wh=dailyMapWarehouseCode();
  const data=announcements.filter(a=>(a.warehouse||yardivoCanonicalWarehouseV583())===wh&&a.date===date);
  const used=data.reduce((s,a)=>s+Number(a.pallets||0),0);
  let total=null;
  try{
    const md=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');
    const w=(Array.isArray(md.warehouses)?md.warehouses:[]).find(x=>String(x?.id||'')===String(wh||''));
    if(w){
      const n=Math.max(0,Number(w.ramps)||0);
      const rs=(Array.isArray(w.ramp_settings)?w.ramp_settings:[]).filter(r=>r&&Number(r.number)>0&&Number(r.number)<=n);
      const caps=rs.map(r=>Number(r.max_pallets));
      if(rs.length&&caps.every(v=>Number.isFinite(v)&&v>0)) total=caps.reduce((a,b)=>a+b,0);
      else if(Number(w.daily_pallet_capacity)>0) total=Number(w.daily_pallet_capacity);
    }
  }catch(_){}
  const panel=document.getElementById('dailyTotalCapacity');if(!panel)return;
  const label=document.getElementById('dailyCapacityLabel');
  const totalEl=document.getElementById('dailyCapacityTotal');
  const usedEl=document.getElementById('dailyCapacityUsed');
  const freeEl=document.getElementById('dailyCapacityFree');
  const pctEl=document.getElementById('dailyCapacityPercent');
  const stateEl=document.getElementById('dailyCapacityState');
  const bar=document.getElementById('dailyCapacityBar');
  panel.classList.remove('cap-low','cap-mid','cap-high','cap-critical');
  if(!(Number(total)>0)){
    if(label)label.textContent='Kapacitet: NEPOZNAT';
    if(totalEl){totalEl.textContent='NEPOZNAT';totalEl.classList.add('unknown')}
    if(usedEl)usedEl.textContent=used+' pal.';
    if(freeEl){freeEl.textContent='—';freeEl.classList.add('unknown')}
    if(pctEl)pctEl.textContent='—';
    if(stateEl)stateEl.textContent='NEPOZNAT';
    if(bar)bar.style.width='0%';
    return;
  }
  const free=Math.max(0,total-used);
  const pct=Math.min(100,Math.round(used/total*100));
  const band=capacityBand(pct);
  panel.classList.add(band.cls);
  if(label)label.textContent='Kapacitet: '+total+' paleta / dan';
  if(totalEl){totalEl.textContent=total+' pal.';totalEl.classList.remove('unknown')}
  if(usedEl)usedEl.textContent=used+' pal.';
  if(freeEl){freeEl.textContent=free+' pal.';freeEl.classList.remove('unknown')}
  if(pctEl)pctEl.textContent=pct+'%';
  if(stateEl)stateEl.textContent=band.label;
  if(bar)bar.style.width=pct+'%';
}
function openDailyRampDetail(dock){
  selectedDailyRamp=Number(dock);
  renderDailyRampCapacity();
  const date=dailyMapDateValue(),wh=dailyMapWarehouseCode();
  const items=announcements.filter(a=>(a.warehouse||yardivoCanonicalWarehouseV583())===wh&&a.date===date&&Number(a.dock)===selectedDailyRamp)
    .sort((a,b)=>String(a.time).localeCompare(String(b.time)));
  const panel=document.getElementById('dailyRampDetailPanel');
  const list=document.getElementById('dailyRampDetailList');
  panel?.classList.add('show');
  document.getElementById('dailyRampDetailTitle').textContent=`RAMPA ${selectedDailyRamp} · NAJAVLJENI DOBAVLJAČI`;
  document.getElementById('dailyRampDetailSubtitle').textContent=`${date} · ${whLabel(wh)} · ${items.length} najava`;
  if(list)list.innerHTML=items.length?items.map(a=>`<div class="ramp-detail-row">
    <strong>${a.time}</strong>
    <strong>${a.supplier}</strong>
    <span>${a.pallets} pal.</span>
    <span>${truckCountForPallets(a.pallets)} kam.</span>
    <span>${a.sku} SKU</span>
    <span>${operationalPlanStatus(a)}</span>
  </div>`).join(''):'<div class="overview-empty">Nema dobavljača najavljenih na ovoj rampi.</div>';
}
window.openDailyRampDetail=openDailyRampDetail;
document.getElementById('dailyRampDetailClose')?.addEventListener('click',()=>{
  selectedDailyRamp=null;
  document.getElementById('dailyRampDetailPanel')?.classList.remove('show');
  renderDailyRampCapacity();
});

function renderDailyRampCapacity(){
  const host=document.getElementById('dailyRampCapacityBoard');if(!host)return;
  const date=dailyMapDateValue();
  const wh=dailyMapWarehouseCode();
  const sourceW=WAREHOUSES[wh]||{};
  const ramps=Math.max(0,Number(sourceW.ramps)||0);
  const receptionStart=sourceW.receptionStart||sourceW.reception_from||'';
  const receptionEnd=sourceW.receptionEnd||sourceW.reception_to||'';
  if(!ramps){host.innerHTML='<div class="ramp-supplier-empty">Nema konfiguriranih rampi za odabrano skladište.</div>';return}
  const totalMinutes=(receptionStart&&receptionEnd)?Math.max(1,toMin(receptionEnd)-toMin(receptionStart)):null;
  const data=announcements.filter(a=>(a.warehouse||yardivoCanonicalWarehouseV583())===wh&&a.date===date);

  host.innerHTML=Array.from({length:ramps},(_,idx)=>{
    const dock=idx+1;
    const items=data.filter(a=>Number(a.dock)===dock).sort((a,b)=>String(a.time).localeCompare(String(b.time)));
    const usedMinutes=items.reduce((s,a)=>s+Number(a.duration||0),0);
    const pct=Math.min(100,Math.round(usedMinutes/totalMinutes*100));
    const pallets=items.reduce((s,a)=>s+Number(a.pallets||0),0);
    const trucks=items.reduce((s,a)=>s+truckCountForPallets(a.pallets),0);

    return `<div class="ramp-capacity-card ${selectedDailyRamp===dock?'selected':''}" role="button" tabindex="0" onclick="openDailyRampDetail(${dock})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openDailyRampDetail(${dock})}">
      <h3>RAMPA ${dock}</h3>
      <div class="ramp-meta">${receptionStart}–${receptionEnd}</div>

      <div class="ramp-kpis">
        <div><small>ZAUZEĆE</small><strong>${pct}%</strong></div>
        <div><small>PALETE</small><strong>${pallets}</strong></div>
        <div><small>KAMIONI</small><strong>${trucks}</strong></div>
      </div>

      <div class="ramp-capacity-bar"><i style="width:${pct}%"></i></div>

      <div class="ramp-supplier-list">
        ${
          items.length
            ? items.map(a=>`<div class="ramp-supplier-item">
                <strong>${a.time} · ${a.supplier}</strong>
                <div class="meta">${a.pallets} pal. · ${truckCountForPallets(a.pallets)} kam. · ${operationalPlanStatus(a)}</div>
              </div>`).join('')
            : '<div class="ramp-supplier-empty">Nema najavljenih dobavljača</div>'
        }
      </div>
    </div>`;
  }).join('');
}

function renderDailyMap(){
  const host=document.getElementById('dailyMapBoard');if(!host)return;
  const date=dailyMapDateValue();
  const wh=dailyMapWarehouseCode();
  const sourceW=WAREHOUSES[wh]||{};
  const w={...sourceW};
  if(!Number(w.ramps))w.ramps=6;
  if(!w.receptionStart)w.receptionStart='06:00';
  if(!w.receptionEnd)w.receptionEnd='22:00';

  const heading=document.getElementById('dailyMapHeading');
  if(heading){
    const d=new Date(date+'T12:00:00');
    heading.textContent=`${d.toLocaleDateString('hr-HR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}`.toUpperCase();
  }
  const whBadge=document.getElementById('dailyMapWarehouse');
  if(whBadge)whBadge.textContent=whLabel(wh).toUpperCase();

  const all=announcements.filter(a=>(a.warehouse||yardivoCanonicalWarehouseV583())===wh&&a.date===date);
  const totalPal=all.reduce((s,a)=>s+Number(a.pallets||0),0);
  const totalTrucks=all.reduce((s,a)=>s+truckCountForPallets(a.pallets),0);
  const late=all.filter(a=>operationalPlanStatus(a)==='Kašnjenje').length;
  const noShow=all.filter(a=>operationalPlanStatus(a)==='NO-SHOW').length;
  const received=all.filter(a=>operationalPlanStatus(a)==='Zaprimljeno').length;

  renderDailyTotalCapacity();
  const summary=document.getElementById('dailyMapSummary');
  if(summary)summary.innerHTML=[
    ['NAJAVE',all.length],['PALETE',totalPal],['KAMIONI',totalTrucks],['KAŠNJENJA',late],['NO-SHOW',noShow],['ZAPRIMLJENO',received]
  ].map(x=>`<div class="control-card"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join('');

  if(typeof dayInfo==='function'){
    const info=dayInfo(date);
    if(info.closed){
      host.innerHTML=`<div class="overview-empty"><strong>PRIJAM NE RADI</strong><br>${info.name}</div>`;
      renderDailyRampCapacity(); return;
    }
  }

  // Vertical timeline: TIME goes downward; ramps stay as columns.
  const configuredStart=toMin(w.receptionStart);
  const configuredEnd=toMin(w.receptionEnd);
  const times=all.filter(a=>a.time).map(a=>toMin(a.time));
  const ws=Math.min(configuredStart,times.length?Math.min(...times):configuredStart);
  const latest=times.length?Math.max(...times)+60:configuredEnd;
  const we=Math.min(24*60,Math.max(configuredEnd,latest,22*60));
  const rows=Math.ceil((we-ws)/15);

  let out=`<div class="daily-map-vertical-grid" style="grid-template-columns:84px repeat(${w.ramps},minmax(145px,1fr))">`;
  out+='<div class="dmv-corner">VRIJEME</div>';
  for(let dock=1;dock<=w.ramps;dock++)out+=`<div class="dmv-ramp-head" role="button" tabindex="0" data-daily-ramp="${dock}" title="Klikni za detalje rampe">RAMPA ${dock}</div>`;

  for(let i=0;i<rows;i++){
    const m=ws+i*15, label=hhmm(m);
    out+=`<div class="dmv-time">${label}</div>`;
    for(let dock=1;dock<=w.ramps;dock++){
      const block=(typeof rampBlocks!=='undefined')?rampBlocks.find(b=>b.warehouse===wh&&b.date===date&&Number(b.dock)===dock&&m>=toMin(b.from)&&m<toMin(b.to)):null;
      const a=all.find(x=>Number(x.dock)===dock&&toMin(x.time)===m);
      if(a){
        out+=`<div class="dmv-cell dmv-booked ${operationalPlanClass(a)}" draggable="true" data-announcement-id="${a.id}" data-move-date="${date}" data-move-warehouse="${wh}" data-move-dock="${dock}" data-move-time="${label}" oncontextmenu="openAnnouncementContextMenu(event,${a.id})" title="Povuci za promjenu termina · Desni klik za opcije">
          <strong>${a.time} · ${a.supplier}</strong>
          <small>${a.pallets} pal. · ${truckCountForPallets(a.pallets)} kam.</small>
          ${(a.hasAttachment||a.attachmentDataUrl||window.YardivoSupplierAttachments?.has?.(a))?`<button type="button" class="yardivo-doc-icon" data-yardivo-doc="${a.id}" title="Otvori priloženi PDF dokument" aria-label="Otvori priloženi PDF dokument">📁</button>`:''}
          <span class="booking-status">${operationalPlanStatus(a).toUpperCase()}</span>
          ${yardivoMapDelayLabel(a)?`<span class="booking-delay-detail">${yardivoMapDelayLabel(a)}</span>`:''}
        </div>`;
      }else if(block){
        out+=`<div class="dmv-cell dmv-blocked" data-move-date="${date}" data-move-warehouse="${wh}" data-move-dock="${dock}" data-move-time="${label}" data-move-blocked="1" title="${block.reason||'Blokirano'}">BLOKIRANO</div>`;
      }else out+=`<div class="dmv-cell" data-move-date="${date}" data-move-warehouse="${wh}" data-move-dock="${dock}" data-move-time="${label}"></div>`;
    }
  }
  host.innerHTML=out+'</div>';
  renderDailyRampCapacity();
  // Vertical layout is intentionally not transformed by old horizontal zoom.
}
document.getElementById('dailyMapBoard')?.addEventListener('click',e=>{
  const block=e.target.closest('.dmv-booked[data-announcement-id],.booked[data-announcement-id]');
  if(!block)return;
  const id=Number(block.dataset.announcementId);
  const a=announcements.find(x=>x.id===id);
  if(a)openAnnouncementDetail(a.id,'dailyMap');
});

document.getElementById('dailyMapDate')?.addEventListener('change',()=>{selectedDailyRamp=null;document.getElementById('dailyRampDetailPanel')?.classList.remove('show');renderDailyMap();});
document.getElementById('dailyMapWarehouseSelect')?.addEventListener('change',()=>{selectedDailyRamp=null;document.getElementById('dailyRampDetailPanel')?.classList.remove('show');renderDailyMap();});
document.getElementById('dailyPrevDay')?.addEventListener('click',()=>moveDailyMapDay(-1));
document.getElementById('dailyNextDay')?.addEventListener('click',()=>moveDailyMapDay(1));
document.getElementById('dailyTodayBtn')?.addEventListener('click',()=>setDailyMapDate(window.yardivoLocalDateV583()));
document.getElementById('dailyZoomIn')?.addEventListener('click',()=>setDailyMapZoom(dailyMapZoom+.1));
document.getElementById('dailyZoomOut')?.addEventListener('click',()=>setDailyMapZoom(dailyMapZoom-.1));
document.getElementById('dailyZoomReset')?.addEventListener('click',()=>setDailyMapZoom(1));


// ===== TJEDNA MAPA =====
let weeklyMapSelection=(()=>{
  const x=isoWeekInfo(new Date());
  return {year:x.year,week:x.week};
})();

function weeklyMapAllowedWarehouses(){
  return typeof currentAllowedWarehouses==='function'
    ? currentAllowedWarehouses()
    : (window.YardivoGlobalContextV583?.warehouseIds?.()||[]);
}
function populateWeeklyMapWarehouse(){
  const sel=document.getElementById('weeklyMapWarehouse');if(!sel)return;
  const allowed=weeklyMapAllowedWarehouses();
  const previous=sel.value;
  sel.innerHTML=allowed.map(w=>`<option value="${w}">${warehouseOptionLabel(w)}</option>`).join('');
  sel.value=allowed.includes(previous)?previous:(activeWarehouse&&allowed.includes(activeWarehouse)?activeWarehouse:allowed[0]);
}
function populateWeeklyMapWeeks(){
  const sel=document.getElementById('weeklyMapWeek');if(!sel)return;
  let html='';
  [weeklyMapSelection.year-1,weeklyMapSelection.year,weeklyMapSelection.year+1].forEach(y=>{
    html+=`<optgroup label="${y}">`;
    for(let w=1;w<=weeksInIsoYear(y);w++){
      html+=`<option value="${y}-${w}" ${y===weeklyMapSelection.year&&w===weeklyMapSelection.week?'selected':''}>Week ${w} · ${y}</option>`;
    }
    html+='</optgroup>';
  });
  sel.innerHTML=html;
}
function moveWeeklyMap(delta){
  const monday=mondayOfIsoWeek(weeklyMapSelection.year,weeklyMapSelection.week);
  monday.setDate(monday.getDate()+delta*7);
  weeklyMapSelection=isoWeekInfo(monday);
  populateWeeklyMapWeeks();
  renderWeeklyMap();
}
function renderWeeklyMap(){
  const host=document.getElementById('weeklyMapBoard');if(!host)return;
  populateWeeklyMapWarehouse();
  populateWeeklyMapWeeks();

  const wh=document.getElementById('weeklyMapWarehouse')?.value||weeklyMapAllowedWarehouses()[0];
  const monday=mondayOfIsoWeek(weeklyMapSelection.year,weeklyMapSelection.week);
  const friday=new Date(monday);friday.setDate(friday.getDate()+4);

  const weekData=announcements.filter(a=>{
    const d=new Date((a.date||'')+'T12:00:00');
    return (a.warehouse||yardivoCanonicalWarehouseV583())===wh && d>=monday && d<=friday;
  });

  const totalPal=weekData.reduce((s,a)=>s+Number(a.pallets||0),0);
  const totalTrucks=weekData.reduce((s,a)=>s+truckCountForPallets(a.pallets),0);
  const totalNoShow=weekData.filter(a=>operationalPlanStatus(a)==='NO-SHOW').length;

  document.getElementById('weeklyMapSummary').innerHTML=[
    ['NAJAVA',weekData.length],
    ['PALETA',totalPal],
    ['KAMIONA',totalTrucks],
    ['NO-SHOW',totalNoShow]
  ].map(x=>`<div class="week-map-kpi"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join('');

  document.getElementById('weeklyMapHeading').textContent=`WEEK ${weeklyMapSelection.week} · ${weeklyMapSelection.year}`;
  document.getElementById('weeklyMapSubtitle').textContent=`${warehouseOptionLabel(wh)} · ${localIsoDate(monday)} – ${localIsoDate(friday)}`;

  const dayNames=['PONEDJELJAK','UTORAK','SRIJEDA','ČETVRTAK','PETAK'];
  let html='';

  for(let i=0;i<5;i++){
    const d=new Date(monday);d.setDate(monday.getDate()+i);
    const iso=localIsoDate(d);
    const info=typeof dayInfo==='function'?dayInfo(iso):{closed:false};
    const items=weekData.filter(a=>a.date===iso).sort((a,b)=>String(a.time).localeCompare(String(b.time)));
    const pal=items.reduce((s,a)=>s+Number(a.pallets||0),0);
    const trucks=items.reduce((s,a)=>s+truckCountForPallets(a.pallets),0);

    html+=`<div class="week-map-day" data-weekly-move-date="${iso}" data-weekly-move-warehouse="${wh}">
      <button class="week-map-day-head yardivo-week-day-open" type="button" data-week-day-open="${iso}" data-week-day-warehouse="${wh}" aria-label="Otvori detaljni pregled za ${dayNames[i]}">
        <h3>${dayNames[i]} · ${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.</h3>
        <small>${iso}${info.closed?' · '+info.name:''} · KLIKNI ZA CIJELI DAN</small>
      </button>
      <div class="week-day-load ${info.closed?'closed':''}">
        <div class="week-day-load-head">
          <span>OPTEREĆENOST DANA</span>
          <strong>${info.closed?'ZATVORENO':Math.min(100,Math.round((pal/(typeof getWarehouseCapacity==='function'?getWarehouseCapacity(wh):null))*100))+'%'}</strong>
        </div>
        <div class="week-day-load-bar"><i style="width:${info.closed?0:Math.min(100,Math.round((pal/(typeof getWarehouseCapacity==='function'?getWarehouseCapacity(wh):null))*100))}%"></i></div>
      </div>
      <div class="week-map-day-totals">
        <div><small>NAJAVA</small><strong>${info.closed?0:items.length}</strong></div>
        <div><small>PALETA</small><strong>${info.closed?0:pal}</strong></div>
        <div><small>KAMIONA</small><strong>${info.closed?0:trucks}</strong></div>
      </div>
      ${
        info.closed
        ? `<div class="week-map-holiday">${info.name}<br>PRIJAM NE RADI</div>`
        : `<div class="week-map-list">${
            items.length
            ? items.map(a=>{
                const status=operationalPlanStatus(a);
                return `<div class="week-map-item ${yardivoUnifiedStatusClass(a)}" draggable="true" data-announcement-id="${a.id}" title="Povuci na drugi dan · Desni klik za promjenu termina · Klikni za detalj najave">
                  <strong>${a.time} · ${a.supplier}</strong>
                  <div class="meta">R${a.dock} · ${a.pallets} pal. · ${truckCountForPallets(a.pallets)} kam. · ${a.sku} SKU</div>
                  ${(a.hasAttachment||a.attachmentDataUrl||window.YardivoSupplierAttachments?.has?.(a))?`<button type="button" class="yardivo-doc-icon" data-yardivo-doc="${a.id}" title="Otvori priloženi PDF dokument" aria-label="Otvori priloženi PDF dokument">📁</button>`:''}
                  <div class="statusline">${status}${yardivoMapDelayLabel(a)?' · '+yardivoMapDelayLabel(a):''}</div>
                </div>`;
              }).join('')
            : '<div class="week-map-empty">Nema najavljenih dobavljača</div>'
          }</div>`
      }
    </div>`;
  }

  host.innerHTML=html;
}


document.getElementById('weeklyMapBoard')?.addEventListener('click',e=>{
  const item=e.target.closest('.week-map-item[data-announcement-id]');
  if(item){
    const id=Number(item.dataset.announcementId);
    const a=announcements.find(x=>x.id===id);
    if(a)openAnnouncementDetail(a.id,'weeklyMap');
    return;
  }
  const day=e.target.closest('[data-week-day-open]');
  if(day){
    openWeeklyDayDrilldown(day.dataset.weekDayOpen,day.dataset.weekDayWarehouse);
  }
});

document.getElementById('weeklyMapWarehouse')?.addEventListener('change',renderWeeklyMap);
document.getElementById('weeklyMapWeek')?.addEventListener('change',e=>{
  const [year,week]=e.target.value.split('-').map(Number);
  weeklyMapSelection={year,week};
  renderWeeklyMap();
});
document.getElementById('weeklyMapPrev')?.addEventListener('click',()=>moveWeeklyMap(-1));
document.getElementById('weeklyMapNext')?.addEventListener('click',()=>moveWeeklyMap(1));
document.getElementById('weeklyMapCurrent')?.addEventListener('click',()=>{
  weeklyMapSelection=isoWeekInfo(new Date());
  renderWeeklyMap();
});

function renderWeeklyDeliveries(){
  const host=document.getElementById('weeklyDeliveriesBoard');if(!host)return;
  populateWeekSelector();
  const monday=mondayOfIsoWeek(selectedWeek.year,selectedWeek.week);
  const friday=new Date(monday);friday.setDate(monday.getDate()+4);
  const range=document.getElementById('weekRange');
  if(range)range.textContent=`Week ${selectedWeek.week} · ${localIsoDate(monday).split('-').reverse().join('.')} – ${localIsoDate(friday).split('-').reverse().join('.')}`;
  const whLabelEl=document.getElementById('weeklyWarehouseLabel');
  if(whLabelEl)whLabelEl.textContent=activeWarehouse==='ALL'?'Sva skladišta':whLabel(activeWarehouse);

  let html='',weekPal=0,weekTrucks=0,weekDeliveries=0;
  const dayNames=['Ponedjeljak','Utorak','Srijeda','Četvrtak','Petak'];

  for(let i=0;i<5;i++){
    const d=new Date(monday);d.setDate(monday.getDate()+i);
    const iso=localIsoDate(d);
    const holiday=typeof holidayName==='function'?holidayName(iso):'';
    const dayData=announcements
      .filter(a=>weeklyWarehouseFilter(a)&&a.date===iso)
      .sort((a,b)=>String(a.time).localeCompare(String(b.time)));

    const totalPal=dayData.reduce((s,a)=>s+Number(a.pallets||0),0);
    const totalTrucks=dayData.reduce((s,a)=>s+truckCountForPallets(a.pallets),0);
    weekPal+=totalPal;weekTrucks+=totalTrucks;weekDeliveries+=dayData.length;

    html+=`<div class="week-day ${holiday?'holiday':''}">
      <div class="week-day-head">
        <h3>${dayNames[i]} ${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.</h3>
        <small>${iso}${holiday?' · '+holiday:''}</small>
      </div>
      <div class="week-summary">
        <div><small>NAJAVA</small><strong>${holiday?0:dayData.length}</strong></div>
        <div><small>PALETA</small><strong>${holiday?0:totalPal}</strong></div>
        <div><small>KAMIONA</small><strong>${holiday?0:totalTrucks}</strong></div>
      </div>
      ${holiday
        ? `<div class="week-holiday">${holiday}<br>PRIJAM NE RADI</div>`
        : `<div class="week-deliveries">${
            dayData.length
              ? dayData.map(a=>`<div class="week-delivery">
                  <strong>${a.time} · ${a.supplier}</strong>
                  <div class="meta">${warehouseOptionLabel(a.warehouse||yardivoCanonicalWarehouseV583())} · Rampa ${a.dock} · ${a.pallets} pal. · ${a.sku} SKU</div>
                  <div style="margin-top:5px"><span class="truck-badge">${truckCountForPallets(a.pallets)} ${truckCountForPallets(a.pallets)===1?'kamion':'kamiona'}</span></div>
                </div>`).join('')
              : '<div class="week-empty">Nema najavljenih isporuka</div>'
          }</div>`
      }
    </div>`;
  }
  host.innerHTML=html;
  const totals=document.getElementById('weekTotals');
  if(totals)totals.textContent=`TJEDAN: ${weekDeliveries} najava · ${weekPal} paleta · ${weekTrucks} kamiona`;
}
document.getElementById('weekSelector')?.addEventListener('change',e=>{
  const [y,w]=e.target.value.split('-').map(Number);
  selectedWeek={year:y,week:w};renderWeeklyDeliveries();
});
document.getElementById('previousWeek')?.addEventListener('click',()=>moveSelectedWeek(-1));
document.getElementById('nextWeek')?.addEventListener('click',()=>moveSelectedWeek(1));



// ===== DETALJ KONKRETNE NAJAVE =====
let currentAnnouncementDetailId=null;
let announcementDetailReturnView='dailyMap';

function announcementStatusColor(a){
  const s=operationalPlanStatus(a);
  if(s==='Zaprimljeno')return '#147a38';
  if(s==='Odbijen')return '#a72b35';
  if(s==='NIJE DOŠAO')return '#8f454d';
  if(s==='NO-SHOW')return '#b96f00';
  if(s==='Kašnjenje')return '#d18a09';
  if(s==='Promijenjena nakon NO-SHOW')return '#6f42c1';
  if(s==='Na rampi')return '#d18a09';
  return '#126fc9';
}
window.openAnnouncementDetail=function(id,returnView){
  const a=announcements.find(x=>x.id===Number(id));if(!a)return;
  currentAnnouncementDetailId=a.id;
  announcementDetailReturnView=returnView||document.querySelector('.view.active')?.id||'dailyMap';

  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('announcementDetail')?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  const title=document.getElementById('pageTitle');if(title)title.textContent='Detalj najave';

  renderAnnouncementDetail();
}
function renderAnnouncementDetail(){
  syncAllAnnouncementIdentities();
  const a=announcements.find(x=>x.id===currentAnnouncementDetailId);if(!a)return;
  const status=operationalPlanStatus(a);
  const delay=operationalDelayText(a);
  const actual=(a.actualDate&&a.actualTime)?`${a.actualDate} ${a.actualTime}`:'—';
  const no=announcementNumber(a);

  document.getElementById('announcementDetailHero').innerHTML=`
    <div class="announcement-detail-head">
      <div>
        <h2>#${no} · ${a.supplier}</h2>
        <small>${warehouseOptionLabel(a.warehouse||yardivoCanonicalWarehouseV583())} · ${yardivoWarehouseLocationNameV583(a.warehouse||yardivoCanonicalWarehouseV583())}</small>
      </div>
      <span class="announcement-detail-status" style="background:${announcementStatusColor(a)}">${status.toUpperCase()}${delay?' · '+delay:''}</span>
    </div>

    <div class="announcement-detail-kpis">
      <div class="announcement-detail-kpi"><small>DATUM</small><strong>${a.date||'—'}</strong></div>
      <div class="announcement-detail-kpi"><small>PLANIRANO</small><strong>${a.time||'—'}</strong></div>
      <div class="announcement-detail-kpi"><small>RAMPA</small><strong>R${a.dock||'—'}</strong></div>
      <div class="announcement-detail-kpi"><small>PALETE</small><strong>${a.pallets||0}</strong></div>
      <div class="announcement-detail-kpi"><small>SKU</small><strong>${a.sku||0}</strong></div>
      <div class="announcement-detail-kpi"><small>ODGOVORNA OSOBA</small><strong>${a.responsible||'—'}</strong></div>
      <div class="announcement-detail-kpi"><small>KAMIONA</small><strong>${truckCountForPallets(a.pallets)}</strong></div>
      <div class="announcement-detail-kpi"><small>TRAJANJE</small><strong>${a.duration||0} min</strong></div>
      <div class="announcement-detail-kpi"><small>STVARNI DOLAZAK</small><strong>${actual}</strong></div>
    </div>

    <div class="announcement-detail-driver">
      <div><small>TABLICE</small><strong>${effectivePlate(a)||'Nisu unesene'}</strong></div>
      <div><small>VOZAČ</small><strong>${effectiveDriver(a)||'Nije unesen'}</strong></div>
      <div><small>PRIKOLICA</small><strong>${a.plannedTrailer||a.arrivalTrailer||'—'}</strong></div>
      <div><small>TELEFON</small><strong>${a.plannedPhone||a.arrivalPhone||'—'}</strong></div>
    </div>`;

  const history=a.changeHistory||[];
  const histHost=document.getElementById('announcementDetailHistory');
  histHost.innerHTML=history.length
    ? history.slice().reverse().map(c=>`<div class="announcement-history-item">
        <strong>${new Date(c.changedAt).toLocaleString('hr-HR')}</strong><br>
        ${c.oldDate} ${c.oldTime} · R${c.oldDock} → ${c.newDate} ${c.newTime} · R${c.newDock}<br>
        Razlog: ${c.reason||'—'}${c.note?` · ${c.note}`:''}<br>
        <span class="term-prov-line"><b>Promjenu inicirao:</b> ${window.YardivoTermProvenance?.initiatorLabel?.(c)||c.initiatedBy||c.changedBy||'—'}</span><br>
        ${c.approvedBy?`<span class="term-prov-line"><b>Odobrio:</b> ${c.approvedBy}</span><br>`:''}
        ${c.acceptedBy?`<span class="term-prov-line"><b>Prihvatio:</b> ${c.acceptedBy}</span><br>`:''}
        KPI: ${window.YardivoTermProvenance?.kpiLabel?.(c)|| (c.countsAsLate?'Stvarno kašnjenje / negativno':'Neutralno')}
      </div>`).join('')
    : '<div class="overview-empty">Nema promjena ove najave.</div>';

  const rel=supplierReliability(a.supplier),tot=supplierTotals(a.supplier);
  document.getElementById('announcementSupplierSummary').innerHTML=[
    ['POUZDANOST',`${rel.score}%`],
    ['UKUPNO NAJAVA',rel.total],
    ['UKUPNO PALETA',tot.pallets],
    ['KAŠNJENJA',rel.late],
    ['NO-SHOW',rel.noShows],
    ['INCIDENTI',rel.incidents]
  ].map(x=>`<div class="supplier-profile-kpi"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join('');

  const previous=announcements
    .filter(x=>x.supplier===a.supplier&&x.id!==a.id)
    .sort((x,y)=>(String(y.date)+String(y.time)).localeCompare(String(x.date)+String(x.time)));

  document.getElementById('announcementPreviousSubtitle').textContent=`${a.supplier} · ${previous.length} prethodnih najava`;
  document.getElementById('announcementPreviousDeliveries').innerHTML=previous.length
    ? `<table class="announcement-detail-table"><thead><tr><th>DATUM</th><th>SKLADIŠTE</th><th>VRIJEME</th><th>RAMPA</th><th>PALETE</th><th>KAMIONA</th><th>STATUS</th><th>KAŠNJENJE</th></tr></thead><tbody>${
        previous.map(x=>`<tr>
          <td>${x.date}</td><td>${warehouseOptionLabel(x.warehouse||yardivoCanonicalWarehouseV583())}</td><td>${x.time||'—'}</td><td>R${x.dock||'—'}</td>
          <td>${x.pallets||0}</td><td>${truckCountForPallets(x.pallets)}</td>
          <td>${operationalPlanStatus(x)}</td><td>${operationalDelayText(x)||'—'}</td>
        </tr>`).join('')
      }</tbody></table>`
    : '<div class="overview-empty">Nema prethodnih dolazaka za ovog dobavljača.</div>';

  const inc=incidents.filter(i=>i.supplier===a.supplier).sort((x,y)=>String(y.date).localeCompare(String(x.date)));
  document.getElementById('announcementSupplierIncidents').innerHTML=inc.length
    ? `<table class="announcement-detail-table"><thead><tr><th>DATUM</th><th>VRSTA</th><th>OZBILJNOST</th><th>STATUS</th><th>PALETE</th><th>SKU</th><th>OPIS</th></tr></thead><tbody>${
        inc.map(i=>`<tr><td>${i.date}</td><td>${i.type}</td><td>${i.severity}</td><td>${i.status||'Otvoren'}</td><td>${i.pallets||0}</td><td>${i.sku||0}</td><td>${i.note||'—'}</td></tr>`).join('')
      }</tbody></table>`
    : '<div class="overview-empty">Nema evidentiranih incidenata za ovog dobavljača.</div>';
}
document.getElementById('backFromAnnouncementDetail')?.addEventListener('click',()=>{
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById(announcementDetailReturnView)?.classList.add('active');
  const nav=document.querySelector(`[data-view="${announcementDetailReturnView}"]`);
  if(nav){document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));nav.classList.add('active')}
});

// ===== DOBAVLJAČ 360 PROFIL =====

// Klik na cijelu karticu dobavljača - fallback za sve postojeće kartice
document.addEventListener('click',e=>{
  const card=e.target.closest('.supplier-card');
  if(!card || !document.getElementById('suppliers')?.contains(card))return;
  if(card.dataset.supplierName){
    openSupplierProfile(card.dataset.supplierName);
    return;
  }
  const heading=card.querySelector('h3,strong');
  const name=heading?.textContent?.trim();
  if(name)openSupplierProfile(name);
});

let currentSupplierProfile=null;
let currentSupplierProfileTab='deliveries';

function supplierReliability(name){
  const all=announcements.filter(a=>a.supplier===name);
  const arrived=all.filter(a=>a.actualDate&&a.actualTime);
  const noShows=all.filter(a=>typeof isNoShow==='function'&&isNoShow(a)).length;
  const late=arrived.filter(a=>delayMinutes(a)>yardivoDelayGraceMinutes()).length;
  const advanceChanges=all.reduce((s,a)=>s+(a.changeHistory||[]).filter(c=>!c.countsAsLate).length,0);
  const negativeChanges=all.reduce((s,a)=>s+(a.changeHistory||[]).filter(c=>c.countsAsLate).length,0);
  const inc=incidents.filter(i=>i.supplier===name);
  const base=arrived.length?((arrived.length-late)/arrived.length)*100:100;
  const score=Math.max(0,Math.min(100,Math.round(base-noShows*12-negativeChanges*8-inc.length*4)));
  return {score,late,noShows,advanceChanges,negativeChanges,incidents:inc.length,arrived:arrived.length,total:all.length};
}
function supplierTotals(name){
  const a=announcements.filter(x=>x.supplier===name);
  const pallets=a.reduce((s,x)=>s+Number(x.pallets||0),0);
  const trucks=a.reduce((s,x)=>s+truckCountForPallets(x.pallets),0);
  const avgPallets=a.length?Math.round(pallets/a.length):0;
  return {pallets,trucks,avgPallets};
}
function supplierReliabilityClass(score){
  return score>=90?'reliability-good':score>=70?'reliability-mid':'reliability-bad';
}
window.openSupplierProfile=function(name){
  currentSupplierProfile=name;
  currentSupplierProfileTab='deliveries';
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('supplierProfile')?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('[data-view="suppliers"]')?.classList.add('active');
  const title=document.getElementById('pageTitle');if(title)title.textContent=`Dobavljač · ${name}`;
  renderSupplierProfile();
}
function renderSupplierProfile(){
  const name=currentSupplierProfile;if(!name)return;
  const rel=supplierReliability(name),tot=supplierTotals(name);
  document.getElementById('supplierProfileName').textContent=name;
  document.getElementById('supplierProfileSubtitle').textContent=`Supplier 360° · ${rel.total} najava`;
  document.getElementById('supplierProfileKpis').innerHTML=[
    ['POUZDANOST',`<span class="${supplierReliabilityClass(rel.score)}">${rel.score}%</span>`],
    ['UKUPNO NAJAVA',rel.total],
    ['UKUPNO PALETA',tot.pallets],
    ['UKUPNO KAMIONA',tot.trucks],
    ['KAŠNJENJA',rel.late],
    ['NO-SHOW',rel.noShows],
    ['INCIDENTI',rel.incidents],
    ['PROSJEK PALETA',tot.avgPallets]
  ].map(x=>`<div class="supplier-profile-kpi"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join('');
  document.querySelectorAll('[data-supplier-tab]').forEach(b=>b.classList.toggle('active',b.dataset.supplierTab===currentSupplierProfileTab));
  renderSupplierProfileContent();
}
function renderSupplierProfileContent(){
  const host=document.getElementById('supplierProfileContent');if(!host||!currentSupplierProfile)return;
  const name=currentSupplierProfile;

  if(currentSupplierProfileTab==='deliveries'){
    const data=announcements.filter(a=>a.supplier===name).sort((a,b)=>(String(b.date)+String(b.time)).localeCompare(String(a.date)+String(a.time)));
    host.innerHTML=data.length?`<table class="supplier-profile-table"><thead><tr><th>DATUM</th><th>SKLADIŠTE</th><th>PLANIRANO</th><th>STVARNI DOLAZAK</th><th>RAMPA</th><th>PALETE</th><th>KAMIONA</th><th>KAŠNJENJE</th><th>STATUS</th></tr></thead><tbody>${
      data.map(a=>{const d=delayMinutes(a);return `<tr><td>${a.date}</td><td>${warehouseOptionLabel(a.warehouse||yardivoCanonicalWarehouseV583())}</td><td>${a.time||'—'}</td><td>${a.actualDate&&a.actualTime?`${a.actualDate} ${a.actualTime}`:'—'}</td><td>R${a.dock||'—'}</td><td><strong>${a.pallets||0}</strong></td><td>${truckCountForPallets(a.pallets)}</td><td>${d!==null?delayLabel(d):'—'}</td><td>${typeof normalizedPlanStatus==='function'?normalizedPlanStatus(a):(a.status||'—')}</td></tr>`}).join('')
    }</tbody></table>`:'<div class="overview-empty">Nema evidentiranih najava za ovog dobavljača.</div>';
  }else if(currentSupplierProfileTab==='incidents'){
    const data=incidents.filter(i=>i.supplier===name).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    host.innerHTML=data.length?`<table class="supplier-profile-table"><thead><tr><th>DATUM</th><th>VRSTA</th><th>OZBILJNOST</th><th>STATUS</th><th>PALETE</th><th>SKU</th><th>ŠTETA €</th><th>OPIS</th></tr></thead><tbody>${
      data.map(i=>`<tr><td>${i.date}</td><td>${i.type}</td><td>${i.severity}</td><td>${i.status||'Otvoren'}</td><td>${i.pallets||0}</td><td>${i.sku||0}</td><td>${Number(i.value||0).toFixed(2)}</td><td>${i.note||'—'}</td></tr>`).join('')
    }</tbody></table>`:'<div class="overview-empty">Nema evidentiranih incidenata za ovog dobavljača.</div>';
  }else{
    const rows=[];
    announcements.filter(a=>a.supplier===name).forEach(a=>(a.changeHistory||[]).forEach(c=>rows.push(c)));
    rows.sort((a,b)=>String(b.changedAt).localeCompare(String(a.changedAt)));
    host.innerHTML=rows.length?`<table class="supplier-profile-table"><thead><tr><th>KADA</th><th>STARI TERMIN</th><th>NOVI TERMIN</th><th>RAZLOG</th><th>UTJECAJ NA KPI</th></tr></thead><tbody>${
      rows.map(c=>`<tr><td>${new Date(c.changedAt).toLocaleString('hr-HR')}</td><td>${c.oldDate} ${c.oldTime} · R${c.oldDock}</td><td>${c.newDate} ${c.newTime} · R${c.newDock}</td><td>${c.reason||'—'}${c.note?`<br><small>${c.note}</small>`:''}</td><td>${c.countsAsLate?'Negativno':'Neutralno'}</td></tr>`).join('')
    }</tbody></table>`:'<div class="overview-empty">Nema promjena termina za ovog dobavljača.</div>';
  }
}
document.querySelectorAll('[data-supplier-tab]').forEach(btn=>btn.addEventListener('click',()=>{
  currentSupplierProfileTab=btn.dataset.supplierTab;renderSupplierProfile();
}));
document.getElementById('backToSuppliers')?.addEventListener('click',()=>{
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('suppliers')?.classList.add('active');
});

function renderOverview(){
  const arrived=announcements.filter(a=>actualDateTime(a));
  const late=arrived.filter(a=>delayMinutes(a)>TOLERANCE_MIN);
  const ontime=arrived.filter(a=>delayMinutes(a)<=TOLERANCE_MIN);
  const lateMins=late.map(delayMinutes);
  const avg=lateMins.length?Math.round(lateMins.reduce((x,y)=>x+y,0)/lateMins.length):0;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};

  set('ovTotal',arrived.length);
  set('ovOnTime',arrived.length?Math.round(ontime.length/arrived.length*100)+'%':'0%');
  set('ovAvgDelay',formatDelay(avg));
  set('ovIncidents',incidents.length);
  set('ovChanges',announcements.reduce((s,a)=>s+((a.changeHistory||[]).length),0));

  const q=(document.getElementById('overviewSearch')?.value||'').toLowerCase().trim();
  const allSupplierNames=(()=>{
    try{
      const d=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');
      return Array.isArray(d.suppliers)
        ? d.suppliers.filter(x=>x&&x.active!==false&&String(x.name||'').trim()).map(x=>String(x.name).trim())
        : [];
    }catch(_){return []}
  })();

  const allRows=allSupplierNames.map(s=>{
    const all=announcements.filter(a=>a.supplier===s);
    const aa=arrived.filter(a=>a.supplier===s);
    const ll=aa.filter(a=>delayMinutes(a)>TOLERANCE_MIN);
    const oo=aa.length-ll.length;
    const av=ll.length?Math.round(ll.map(delayMinutes).reduce((x,y)=>x+y,0)/ll.length):0;
    const inc=incidents.filter(i=>i.supplier===s).length;
    const noShows=all.filter(a=>['NIJE DOŠAO','NO-SHOW','Nije došao','No-show'].includes(operationalPlanStatus(a))).length;
    const rejected=all.filter(a=>normalizedPlanStatus(a)==='Odbijen').length;
    const pallets=all.reduce((sum,a)=>sum+(Number(a.pallets)||0),0);
    const punctual=aa.length?oo/aa.length*100:100;
    const noShowPenalty=noShows*8;
    const incidentPenalty=inc*5;
    const rejectPenalty=rejected*4;
    const score=Math.max(0,Math.min(100,Math.round(punctual-incidentPenalty-noShowPenalty-rejectPenalty)));
    return {s,all,aa:aa.length,oo,ll:ll.length,av,inc,noShows,rejected,pallets,score};
  }).sort((a,b)=>b.score-a.score||b.aa-a.aa);

  const rows=allRows.filter(r=>r.s.toLowerCase().includes(q));

  const supplierCount=document.getElementById('overviewSupplierCount');
  if(supplierCount)supplierCount.textContent=`${allRows.length} dobavljača · kompletna lista`;

  const mainChart=document.getElementById('overviewSupplierChart');
  if(mainChart){
    const chartRows=[...allRows].sort((a,b)=>b.score-a.score||b.aa-a.aa);
    mainChart.innerHTML=chartRows.length?chartRows.map(r=>{
      const cls=r.score>=90?'good':r.score>=70?'mid':'bad';
      const safeName=String(r.s).replace(/"/g,'&quot;');
      return `<div class="overview-chart-col" data-overview-supplier="${safeName}" title="${safeName} · ${r.score}% pouzdanost">
        <div class="overview-chart-value">${r.score}%</div>
        <div class="overview-chart-bar-wrap"><div class="overview-chart-bar ${cls}" style="height:${Math.max(3,r.score)}%"></div></div>
        <div class="overview-chart-name">${r.s}</div>
      </div>`;
    }).join(''):'<div class="overview-chart-empty">Graf će se pojaviti čim postoje evidentirani dobavljači.</div>';

    mainChart.querySelectorAll('[data-overview-supplier]').forEach(el=>el.addEventListener('click',()=>{
      const supplier=el.dataset.overviewSupplier||'';
      const select=document.getElementById('overviewSupplierSelect');
      if(select){
        select.value=supplier;
        renderOverview();
        document.getElementById('overviewSupplierDetail')?.scrollIntoView({behavior:'smooth',block:'start'});
      }
    }));
  }

  const tbody=document.getElementById('supplierPerformance');
  if(tbody)tbody.innerHTML=rows.length?rows.map(r=>`<tr data-overview-row-supplier="${String(r.s).replace(/"/g,'&quot;')}" style="cursor:pointer"><td><strong>${r.s}</strong></td><td>${r.aa}</td><td>${r.oo}</td><td>${r.ll}</td><td>${r.av?formatDelay(r.av):'—'}</td><td>${r.inc}</td><td><span class="score ${r.score>=90?'good':r.score>=70?'mid':'bad'}">${r.score}%</span></td></tr>`).join(''):'<tr><td colspan="7"><div class="overview-empty">Još nema dovoljno evidentiranih dolazaka.</div></td></tr>';
  tbody?.querySelectorAll('[data-overview-row-supplier]').forEach(tr=>tr.addEventListener('click',()=>{
    const select=document.getElementById('overviewSupplierSelect');
    if(select){
      select.value=tr.dataset.overviewRowSupplier||'';
      renderOverview();
      document.getElementById('overviewSupplierDetail')?.scrollIntoView({behavior:'smooth',block:'start'});
    }
  }));

  const bars=document.getElementById('supplierBars');
  if(bars)bars.innerHTML=allRows.length?allRows.slice(0,10).map(r=>`<div class="supplier-bar"><div class="name" title="${r.s}">${r.s}</div><div class="bar-track"><div class="bar-fill" style="width:${r.score}%"></div></div><div class="bar-score">${r.score}%</div></div>`).join(''):'<div class="overview-empty">Podaci će se pojaviti nakon evidentiranja dolazaka.</div>';

  function rankingHtml(data,bad=false){
    return data.length?data.map((r,idx)=>`<div class="ranking-row">
      <div class="ranking-pos">${idx+1}</div>
      <div class="ranking-name" title="${r.s}">${r.s}</div>
      <div class="ranking-track"><div class="ranking-fill ${bad?'bad':''}" style="width:${Math.max(2,r.score)}%"></div></div>
      <div class="ranking-score">${r.score}%</div>
    </div>`).join(''):'<div class="overview-empty">Još nema podataka.</div>';
  }
  const best=document.getElementById('overviewBest10');
  if(best)best.innerHTML=rankingHtml(allRows.slice(0,10),false);
  const worst=document.getElementById('overviewWorst10');
  if(worst)worst.innerHTML=rankingHtml([...allRows].sort((a,b)=>a.score-b.score||b.aa-a.aa).slice(0,10),true);

  const select=document.getElementById('overviewSupplierSelect');
  if(select){
    const previous=select.value;
    const sorted=[...allSupplierNames].sort((a,b)=>a.localeCompare(b,'hr'));
    select.innerHTML='<option value="">Odaberi dobavljača...</option>'+sorted.map(s=>`<option value="${s.replace(/"/g,'&quot;')}">${s}</option>`).join('');
    if(sorted.includes(previous))select.value=previous;
  }

  const selected=select?.value||'';
  const detail=document.getElementById('overviewSupplierDetail');
  if(detail){
    if(!selected){
      detail.innerHTML='<div class="overview-empty">Odaberi dobavljača iz dropdowna za detaljnu analizu.</div>';
    }else{
      const r=allRows.find(x=>x.s===selected);
      if(!r){
        detail.innerHTML='<div class="overview-empty">Nema podataka za odabranog dobavljača.</div>';
      }else{
        const last=[...r.all].sort((a,b)=>String(b.actualDate||b.date).localeCompare(String(a.actualDate||a.date))||String(b.actualTime||b.time).localeCompare(String(a.actualTime||a.time))).slice(0,8);
        const statuses={};
        r.all.forEach(a=>{const st=operationalPlanStatus(a)||normalizedPlanStatus(a)||'Najavljeno';statuses[st]=(statuses[st]||0)+1});
        const scoreClass=r.score>=90?'':r.score>=70?'mid':'bad';
        detail.innerHTML=`<div class="supplier-detail-head">
          <div><h2>${r.s}</h2><p>${r.all.length} ukupnih najava · analitika kroz cijelu dostupnu povijest</p></div>
          <div class="supplier-score-big ${scoreClass}"><strong>${r.score}%</strong><small>POUZDANOST</small></div>
        </div>
        <div class="supplier-detail-kpis">
          <div><small>DOLASCI</small><strong>${r.aa}</strong></div>
          <div><small>NA VRIJEME</small><strong>${r.oo}</strong></div>
          <div><small>KAŠNJENJA</small><strong>${r.ll}</strong></div>
          <div><small>PROSJ. KAŠNJENJE</small><strong>${r.av?formatDelay(r.av):'—'}</strong></div>
          <div><small>NO-SHOW</small><strong>${r.noShows}</strong></div>
          <div><small>INCIDENTI</small><strong>${r.inc}</strong></div>
          <div><small>UKUPNO PALETA</small><strong>${r.pallets}</strong></div>
        </div>
        <div class="supplier-detail-bottom">
          <div class="supplier-detail-box"><h3>ZADNJIH 8 NAJAVA / DOLAZAKA</h3>
            ${last.length?last.map(a=>`<div class="supplier-history-row">
              <span>${a.actualDate||a.date||'—'} ${a.actualTime||a.time||''}</span>
              <strong>${warehouseOptionLabel(a.warehouse||yardivoCanonicalWarehouseV583())} · R${a.dock||'—'}</strong>
              <span>${a.pallets||0} pal.</span>
              <span>${operationalPlanStatus(a)}</span>
            </div>`).join(''):'<div class="overview-empty">Nema povijesti.</div>'}
          </div>
          <div class="supplier-detail-box"><h3>STATUSI</h3>
            ${Object.entries(statuses).sort((a,b)=>b[1]-a[1]).map(([st,n])=>`<div class="supplier-status-count"><span>${st}</span><strong>${n}</strong></div>`).join('')}
          </div>
        </div>`;
      }
    }
  }

  const hist=[...arrived].sort((a,b)=>(String(b.actualDate)+String(b.actualTime)).localeCompare(String(a.actualDate)+String(a.actualTime)));
  const dh=document.getElementById('delayHistory');
  if(dh)dh.innerHTML=hist.length?hist.map(a=>{const m=delayMinutes(a);return `<tr><td><strong>${a.supplier}</strong></td><td>${fmtPlan(a.date,a.time)}</td><td>${fmtPlan(a.actualDate,a.actualTime)}</td><td><span class="delay-chip ${delayClass(m)}">${delayLabel(m)}</span></td><td>Rampa ${a.dock}</td><td>${a.pallets}</td><td>${a.sku}</td></tr>`}).join(''):'<tr><td colspan="7"><div class="overview-empty">Nema evidentiranih stvarnih dolazaka.</div></td></tr>';
}


function renderChangeHistory(){
  const body=document.getElementById('changeHistoryTable');if(!body)return;
  const rows=[];
  announcements.filter(whMatch).forEach(a=>(a.changeHistory||[]).forEach(c=>rows.push({supplier:a.supplier,...c})));
  rows.sort((a,b)=>String(b.changedAt).localeCompare(String(a.changedAt)));
  body.innerHTML=rows.length?rows.map(c=>`<tr><td><strong>${c.supplier}</strong></td><td>${c.oldWarehouse||c.warehouse||'—'} → ${c.newWarehouse||c.warehouse||'—'}</td><td>${c.oldDate||c.fromDate||'—'} ${c.oldTime||c.fromTime||'—'} · R${c.oldDock||c.fromDock||'—'}</td><td>${c.newDate||c.toDate||'—'} ${c.newTime||c.toTime||'—'} · R${c.newDock||c.toDock||'—'}</td><td><strong>${window.YardivoTermProvenance?.initiatorLabel?.(c)||c.initiatedBy||c.changedBy||'—'}</strong></td><td>${c.approvedBy||'—'}</td><td>${c.acceptedBy||'—'}</td><td>${c.reason||'—'}${c.note?`<br><small>${c.note}</small>`:''}</td><td>${c.changedAt?new Date(c.changedAt).toLocaleString('hr-HR'):'—'}</td><td><span class="${c.countsAsLate?'change-negative':'change-neutral'}">${window.YardivoTermProvenance?.kpiLabel?.(c)||(c.countsAsLate?'Stvarno kašnjenje / negativno':'Neutralno')}</span></td></tr>`).join(''):'<tr><td colspan="10"><div class="overview-empty">Nema evidentiranih promjena najava.</div></td></tr>';
}

function renderIncidents(){
  const table=document.getElementById('incidentTable');if(!table)return;
  const data=[...incidents].sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
  document.getElementById('incidentCount').textContent=`${data.length} ${data.length===1?'incident':'incidenata'}`;
  const badge=document.getElementById('incidentBadge');if(badge){badge.textContent=data.length;badge.style.display=data.length?'inline-flex':'none'}
  table.innerHTML=data.length?data.map(i=>`<tr><td>${i.date}</td><td><strong>${i.supplier}</strong></td><td><span class="incident-chip">${i.type}</span></td><td>${i.severity}</td><td>${i.pallets||0}</td><td>${i.sku||0}</td><td>${i.note||'—'}</td><td><button class="action" onclick="deleteIncident(${i.id})">OBRIŠI</button></td></tr>`).join(''):'<tr><td colspan="8"><div class="overview-empty">Nema evidentiranih incidenata.</div></td></tr>';
  const grouped={};data.forEach(i=>grouped[i.type]=(grouped[i.type]||0)+1);
  const max=Math.max(1,...Object.values(grouped));const sum=document.getElementById('incidentSummary');
  if(sum)sum.innerHTML=Object.keys(grouped).length?Object.entries(grouped).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="supplier-bar"><div class="name">${k}</div><div class="bar-track"><div class="bar-fill" style="width:${v/max*100}%"></div></div><div class="bar-score">${v}</div></div>`).join(''):'<div class="overview-empty">Nema incidenata.</div>';
}
window.deleteIncident=id=>{incidents=incidents.filter(x=>x.id!==id);saveIncidents();renderIncidents();renderOverview()}
document.getElementById('incidentForm')?.addEventListener('submit',e=>{
  e.preventDefault();
  const supplier=document.getElementById('incSupplier').value,type=document.getElementById('incType').value;
  if(!supplier||!type)return;
  incidents.push({id:Date.now(),date:document.getElementById('incDate').value,supplier,type,severity:document.getElementById('incSeverity').value,pallets:Number(document.getElementById('incPallets').value||0),sku:Number(document.getElementById('incSku').value||0),announcementId:Number(document.getElementById('incAnnouncement').value)||null,note:document.getElementById('incNote').value.trim(),createdAt:new Date().toISOString()});
  saveIncidents();e.target.reset();document.getElementById('incDate').value=window.yardivoLocalDateV583();populateIncidentControls();renderIncidents();renderOverview();
});
document.getElementById('overviewSearch')?.addEventListener('input',renderOverview);

// ===== STUDENAC: najave i automatsko planiranje =====
function loadPersistedAnnouncements(){
  const keys=['yardivo_yms_announcements_v1'];
  let best=[];
  for(const k of keys){
    try{
      const raw=safeStorage.getItem(k);
      if(!raw||raw==='yardivo_yms_announcements_v1')continue;
      const parsed=JSON.parse(raw);
      if(Array.isArray(parsed)&&parsed.length>=best.length)best=parsed;
    }catch(e){}
  }
  // Self-heal both keys so every role reads the same dataset.
  if(best.length){
    try{
      const raw=JSON.stringify(best);
      safeStorage.setItem('yardivo_yms_announcements_v1',raw);
      safeStorage.setItem('yardivo_yms_announcements_v1',raw);
    }catch(e){}
  }
  return best;
}
let announcements=loadPersistedAnnouncements();
const saveAnnouncements=()=>{
  const raw=JSON.stringify(announcements);
  try{
    // One shared persistent store for ALL accounts/roles in this browser.
    safeStorage.setItem('yardivo_yms_announcements_v1',raw);
    safeStorage.setItem('yardivo_yms_announcements_v1',raw);
    safeStorage.setItem('yardivo_data_last_saved_at',new Date().toISOString());
  }catch(e){
    console.error('YARDIVO: spremanje najava nije uspjelo',e);
  }
};
function reloadAnnouncementsFromPersistentStorage(){
  const loaded=loadPersistedAnnouncements();
  if(Array.isArray(loaded))announcements=loaded;
  return announcements.length;
}

// ===== PRIJAM ROBE — koristi isti `announcements` kao Unos najave / Dnevna / Tjedna mapa =====

const YARDIVO_QR_MOBILE_SETTING_KEY='yardivo_ramp_qr_mobile_v1';
const YARDIVO_QR_SCAN_SETTING_KEY='yardivo_qr_scan_cfg_v583';

function yardivoQrMobileEnabled(warehouseId){
  const id=String(
    warehouseId||
    document.getElementById('globalWarehouse')?.value||
    activeWarehouse||
    ''
  ).trim();

  const serverRaw=safeStorage.getItem(YARDIVO_QR_SCAN_SETTING_KEY);
  if(serverRaw!==null&&serverRaw!==''){
    try{
      const x=JSON.parse(serverRaw);
      if(x&&typeof x==='object'){
        const v=x.byWarehouse?.[id];
        if(typeof v==='boolean')return v;
        if(v&&typeof v==='object'&&Object.prototype.hasOwnProperty.call(v,'enabled'))return !!v.enabled;
        if(Object.prototype.hasOwnProperty.call(x,'enabled'))return !!x.enabled;
      }
      if(typeof x==='boolean')return x;
    }catch(_){}
  }

  const raw=safeStorage.getItem(YARDIVO_QR_MOBILE_SETTING_KEY);
  if(raw===null||raw==='')return true;
  return raw==='1'||raw==='true'||raw==='on';
}
async function yardivoQrToken(){
  const raw=String(window.__yardivoSupplierAccessToken||'').trim();if(raw)return raw;
  try{
    const c=await window.YardivoAuth?.client?.();let ss=(await c?.auth?.getSession?.())?.data?.session||null;
    if(!ss?.access_token)ss=(await c?.auth?.refreshSession?.())?.data?.session||null;
    return String(ss?.access_token||'');
  }catch(_){return''}
}
async function yardivoPersistQrScanSetting(enabled){
  const t=await yardivoQrToken();if(!t)throw new Error('ONLINE PRIJAVA NIJE AKTIVNA.');
  const r=await fetch('https://ldzwgdwzolbvjxyznlry.supabase.co/functions/v1/yardivo-sync',{method:'POST',headers:{apikey:'sb_publishable_f3daeEDsH7zNSiFR5QluaQ_AP4Ptjzz',Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({action:'set_state',key:YARDIVO_QR_SCAN_SETTING_KEY,value:JSON.stringify({enabled:!!enabled}),clientId:'yardivo-qr-settings-v583'})});
  const d=await r.json().catch(()=>({}));if(!r.ok||d?.ok===false)throw new Error(d?.error||('HTTP '+r.status));return d;
}
async function yardivoLoadQrScanSetting(){
  if(String(currentSession?.role||'').toLowerCase()!=='admin')return;
  const t=await yardivoQrToken();if(!t)return;
  try{
    const r=await fetch('https://ldzwgdwzolbvjxyznlry.supabase.co/functions/v1/yardivo-sync',{method:'POST',headers:{apikey:'sb_publishable_f3daeEDsH7zNSiFR5QluaQ_AP4Ptjzz',Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({action:'bootstrap',clientId:'yardivo-qr-settings-read-v583'})});
    const d=await r.json();if(!r.ok||d?.ok===false)return;
    const row=(Array.isArray(d?.state)?d.state:[]).find(x=>String(x?.key||'')===YARDIVO_QR_SCAN_SETTING_KEY&&!x?.deleted);
    if(row){
      safeStorage.setItem(YARDIVO_QR_SCAN_SETTING_KEY,String(row.value_json||'{"enabled":true}'));
      let x={enabled:true};try{x=JSON.parse(String(row.value_json||'{}'))||x}catch(_){}
      safeStorage.setItem(YARDIVO_QR_MOBILE_SETTING_KEY,x.enabled===false?'0':'1');
      renderQrMobileAdminSetting();
    }
  }catch(_){}
}
async function yardivoSetQrMobileEnabled(enabled){
  if(String(currentSession?.role||'').toLowerCase()!=='admin'){
    alert('Samo Admin može mijenjati globalni QR SCAN ON / OFF.');
    return;
  }
  const before=yardivoQrMobileEnabled();
  safeStorage.setItem(YARDIVO_QR_MOBILE_SETTING_KEY,enabled?'1':'0');
  safeStorage.setItem(YARDIVO_QR_SCAN_SETTING_KEY,JSON.stringify({enabled:!!enabled}));
  renderQrMobileAdminSetting();
  if(typeof renderReceiving==='function')renderReceiving();
  try{
    await yardivoPersistQrScanSetting(enabled);
    try{showYmsToast?.('success',enabled?'QR SCAN UKLJUČEN':'QR SCAN ISKLJUČEN',enabled?'Porta i Prijam mogu koristiti mobilno ONE QR skeniranje.':'Mobilno QR skeniranje je zabranjeno. Generiranje i slanje QR-a dobavljaču ostaje aktivno.')}catch(_){}
  }catch(e){
    safeStorage.setItem(YARDIVO_QR_MOBILE_SETTING_KEY,before?'1':'0');
    safeStorage.setItem(YARDIVO_QR_SCAN_SETTING_KEY,JSON.stringify({enabled:before}));
    renderQrMobileAdminSetting();
    if(typeof renderReceiving==='function')renderReceiving();
    alert('QR SCAN postavka nije spremljena na server: '+String(e?.message||e));
  }
}
function renderQrMobileAdminSetting(){
  const panel=document.getElementById('qrMobileSettingsPanel');
  if(!panel)return;
  const isAdmin=currentSession?.role==='admin';
  const canManageQr=isAdmin;
  panel.style.display=canManageQr?'':'none';
  if(!canManageQr)return;
  const on=yardivoQrMobileEnabled();
  const toggle=document.getElementById('qrMobileEnabledToggle');
  const label=document.getElementById('qrMobileToggleLabel');
  const info=document.getElementById('qrMobileModeInfo');
  const badge=document.getElementById('qrMobileSettingsBadge');
  if(toggle)toggle.checked=on;
  if(label)label.textContent=on?'UKLJUČENO':'ISKLJUČENO';
  if(badge){badge.textContent=on?'ONE QR / MOBILE ON':'RUČNI NAČIN';badge.className='master-sync-state '+(on?'ok':'')}
  if(info){
    info.className='qr-mobile-mode '+(on?'on':'off');
    info.innerHTML=on
      ? '<strong>MOBILNO QR SKENIRANJE: ON.</strong> Porta i Prijam smiju skenirati QR mobitelom. Generiranje/slanje QR-a i ručni Prijam rade neovisno.'
      : '<strong>MOBILNO QR SKENIRANJE: OFF.</strong> Porta i Prijam pri pokušaju skeniranja dobivaju ERROR. Generiranje/slanje QR-a i ručni Prijam i dalje rade.';
  }
}
function yardivoManualReceivingStatusAllowed(status){
  return !yardivoQrMobileEnabled(receivingWarehouseValue());
}
const RECEIVING_STATUS_META={
  'U dolasku':{label:'U DOLASKU',color:'#1688ff'},
  'U dvorištu':{label:'U DVORIŠTU',color:'#ff8b22'},
  'Na rampi':{label:'NA RAMPI',color:'#f1c232'},
  'Zaprimljeno':{label:'ZAPRIMLJENO',color:'#21c66b'},
  'Odbijen':{label:'ODBIJENO',color:'#ff4d57'}
};
function receivingStatus(a){return normalizedPlanStatus(a)}
function receivingStatusMeta(a){return RECEIVING_STATUS_META[receivingStatus(a)]||RECEIVING_STATUS_META['U dolasku']}
function receivingCanEdit(){return canChangeReceptionStatus()&&!yardivoQrMobileEnabled(receivingWarehouseValue())}
function receivingDateValue(){return document.getElementById('receivingDate')?.value||window.yardivoLocalDateV583()}
function receivingWarehouseValue(){return activeWarehouse&&activeWarehouse!=='ALL'?activeWarehouse:defaultWarehouseForLocation(currentSession?.location||'VG')}
function receivingFilteredData(){
  const date=receivingDateValue(),wh=receivingWarehouseValue();
  const q=(document.getElementById('receivingSearch')?.value||'').toLowerCase().trim();
  const status=document.getElementById('receivingStatusFilter')?.value||'ALL';
  return announcements
    .filter(a=>a.date===date&&(a.warehouse||yardivoCanonicalWarehouseV583())===wh)
    .filter(a=>{
      const hay=[a.supplier,a.plannedPlate,a.plannedDriver,a.arrivalPlate,a.arrivalDriver,a.time].map(v=>String(v||'').toLowerCase()).join(' ');
      return !q||hay.includes(q);
    })
    .filter(a=>status==='ALL'||receivingStatus(a)===status)
    .sort((a,b)=>String(a.time).localeCompare(String(b.time)));
}
function renderReceiving(){
  syncAllAnnouncementIdentities();
  const host=document.getElementById('receivingList');if(!host)return;
  const data=receivingFilteredData();
  const allForDay=announcements.filter(a=>a.date===receivingDateValue()&&(a.warehouse||yardivoCanonicalWarehouseV583())===receivingWarehouseValue());
  const counts={'U dolasku':0,'U dvorištu':0,'Na rampi':0,'Zaprimljeno':0,'Odbijen':0};
  allForDay.forEach(a=>counts[receivingStatus(a)]++);
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};
  set('receivingKpiTotal',allForDay.length);set('receivingKpiComing',counts['U dolasku']);set('receivingKpiYard',counts['U dvorištu']);set('receivingKpiDock',counts['Na rampi']);set('receivingKpiDone',counts['Zaprimljeno']);set('receivingKpiRejected',counts['Odbijen']);
  const note=document.getElementById('receivingPermissionNote');
  if(note){
    if(receivingCanEdit()&&yardivoQrMobileEnabled()){
      note.textContent=`Prijam robe · ${receivingWarehouseValue()} · QR scanner je UKLJUČEN. Ručna promjena statusa je zaključana.`;
    }else if(receivingCanEdit()){
      note.textContent=`Prijam robe · ${receivingWarehouseValue()} · QR scanner je ISKLJUČEN. Otvori dobavljača za ručnu promjenu statusa.`;
    }else{
      note.textContent=`Pregled prijama · ${receivingWarehouseValue()} · tvoja uloga može samo pregledavati statuse.`;
    }
  }
  if(!data.length){host.innerHTML='<div class="receiving-empty">Nema najava za odabrani datum, skladište i filter.</div>';return}
  host.innerHTML=data.map(a=>{
    const meta=receivingStatusMeta(a),st=receivingStatus(a);
    return `<div class="receiving-row ${st==='Odbijen'?'status-odbijen':st==='NIJE DOŠAO'?'status-nije-dosao':''}" data-receiving-announcement-id="${a.id}" role="button" tabindex="0" title="Klikni za detalje najave" style="--receiving-color:${meta.color}">
      <div class="receiving-supplier">
        <strong>${a.supplier}</strong>
        <span class="receiving-status-pill" style="color:${meta.color}">${meta.label}</span>
        ${latenessLabel(a)?`<span class="${hasPhysicallyArrived(a)?'arrived-late-badge':'live-late-badge'}">${latenessLabel(a)}</span>`:''}
        ${a.orderNumber?`<div class="receiving-order-number">Po narudžbi br. <strong>${a.orderNumber}</strong></div>`:''}
      </div>
      <div class="receiving-cell"><small>TERMIN</small><strong>${a.time||'—'}</strong></div>
      <div class="receiving-cell"><small>RAMPA</small><strong>R${a.dock||'—'}</strong></div>
      <div class="receiving-cell"><small>PALETE</small><strong>${a.pallets||0}</strong></div>
      <div class="receiving-cell">
        <small>TABLICE / VOZAČ</small>
        <strong>${identityDisplayHtml(a)}</strong>
      </div>
    </div>`;
  }).join('');
}

function animateYardTruckToDock(a){
  if(!a?.id)return;
  const el=document.querySelector(`.yard-slot[data-announcement-id="${a.id}"]`);
  if(!el)return;
  el.classList.add('to-dock');
}

window.setReceivingAnnouncementStatus=function(id,status,source='manual'){
  if(!receivingCanEdit()){alert('Status može mijenjati samo Prijam robe ili Admin.');return}
  const a=announcements.find(x=>x.id===Number(id));if(!a)return;
  if(status==='Na rampi' && normalizedPlanStatus(a)==='U dvorištu')animateYardTruckToDock(a);
  a.status=status;
  if(status!=='U dvorištu' && a.yardPosition)a.yardPosition='';
  const now=new Date();
  if(['U dvorištu','Na rampi','Zaprimljeno'].includes(status) && !firstPhysicalArrivalDateTime(a)){
    a.actualDate=isoLocal(now);
    a.actualTime=now.toTimeString().slice(0,5);
    a.firstArrivalAt=now.toISOString();
  }
  if(status==='U dvorištu'&&!a.yardArrivalAt)a.yardArrivalAt=a.firstArrivalAt||now.toISOString();
  if(status==='Na rampi'){
    if(!a.actualDate){a.actualDate=isoLocal(now);a.actualTime=now.toTimeString().slice(0,5)}
    if(!a.dockArrivalAt)a.dockArrivalAt=a.firstArrivalAt||now.toISOString();
  }
  if(status==='Zaprimljeno'&&!a.receivedAt)a.receivedAt=now.toISOString();
  if(status==='Odbijen'&&!a.rejectedAt)a.rejectedAt=now.toISOString();
  a.statusUpdatedAt=now.toISOString();
  a.statusUpdatedBy=currentSession?.user||'';
  saveAnnouncements();
  render();
  renderReceiving();
  if(typeof renderDailyMap==='function')renderDailyMap();
  if(typeof renderYard==='function')setTimeout(renderYard,status==='Na rampi'?850:0);
  if(typeof renderRampe==='function')renderRampe();
  if(typeof renderWeeklyMap==='function')renderWeeklyMap();
  if(typeof renderAnnouncementSchedule==='function')renderAnnouncementSchedule();
};

(function initQrMobileAdminSetting(){
  const toggle=document.getElementById('qrMobileEnabledToggle');
  if(toggle){
    toggle.addEventListener('change',function(){
      if(String(currentSession?.role||'').toLowerCase()!=='admin'){
        this.checked=yardivoQrMobileEnabled();
        alert('Samo Admin može mijenjati globalni QR SCAN ON / OFF.');
        return;
      }
      const next=!!this.checked;
      const msg=next
        ? 'Uključiti mobilno QR skeniranje? Porta i Prijam smjet će skenirati QR mobitelom.'
        : 'Isključiti mobilno QR skeniranje? Porta i Prijam pri skeniranju će dobiti ERROR. Generiranje/slanje QR-a dobavljaču ostaje dostupno.';
      if(!confirm(msg)){this.checked=!next;return}
      yardivoSetQrMobileEnabled(next);
    });
  }
  setTimeout(renderQrMobileAdminSetting,0);
})();
(function initReceivingView(){
  const date=document.getElementById('receivingDate');
  if(date&&!date.value)date.value=window.yardivoLocalDateV583();
  date?.addEventListener('change',renderReceiving);
  document.getElementById('receivingSearch')?.addEventListener('input',renderReceiving);
  document.getElementById('receivingStatusFilter')?.addEventListener('change',renderReceiving);
})();

const slotMinutes=15, workStart=6*60, workEnd=13*60;
function hhmm(min){return String(Math.floor(min/60)).padStart(2,'0')+':'+String(min%60).padStart(2,'0')}
function toMin(s){if(!s)return null;const [h,m]=s.split(':').map(Number);return h*60+m}
function baseUnloadDuration(pallets){
  const p=Math.max(0,Number(pallets)||0);
  let rate=33;
  try{const c=JSON.parse(localStorage.getItem('yardivo_auto_replan_cfg_v1')||'{}');rate=Math.max(1,Number(c.palletsPerHour||33))}catch(_){}
  if(!p)return 15;
  return Math.max(15,Math.ceil(((p/rate)*60)/15)*15);
}

function historicalUnloadDuration(supplier,pallets){
  const hist=announcements.filter(a=>a.supplier===supplier&&a.unloadStartDate&&a.unloadEndDate&&Math.abs(Number(a.pallets)-Number(pallets))<=6)
    .map(a=>Math.round((new Date(`${a.unloadEndDate}T${a.unloadEndTime}:00`)-new Date(`${a.unloadStartDate}T${a.unloadStartTime}:00`))/60000))
    .filter(x=>x>0&&x<300);
  if(hist.length>=2){
    const avg=Math.round((hist.reduce((x,y)=>x+y,0)/hist.length)/15)*15;
    return {duration:Math.max(15,avg),source:'povijest',samples:hist.length};
  }
  return {duration:baseUnloadDuration(pallets),source:'model',samples:hist.length};
}
function unloadDuration(pallets){
  const supplier=document.getElementById('annSupplier')?.value||'';
  return historicalUnloadDuration(supplier,pallets).duration;
}
function overlaps(aStart,aDur,bStart,bDur){return aStart < bStart+bDur && bStart < aStart+aDur}
function isSlobodna(date,dock,start,duration,ignoreId=null,warehouse=null){
  const wh=warehouse||document.getElementById('annWarehouse')?.value||yardivoCanonicalWarehouseV583();
  const w=WAREHOUSES[wh];
  if(!date||!dock||start==null||!w?.ramps||!w.receptionStart||!w.receptionEnd)return false;
  const ws=toMin(w.receptionStart),we=toMin(w.receptionEnd);
  if(start<ws || start+duration>we)return false;
  if(typeof isRampBlocked==='function' && isRampBlocked(wh,date,dock,start,duration))return false;
  return !announcements.some(a=>a.id!==ignoreId && (a.warehouse||yardivoCanonicalWarehouseV583())===wh && a.date===date && Number(a.dock)===Number(dock) && overlaps(start,duration,toMin(a.time),Number(a.duration)));
}
let currentAnnouncementRecommendation=null;
let editingAnnouncementId=null;
function slotWarehouseLoad(date,warehouse,start,duration){
  // Procjena gužve: prosječan broj paleta koje se preklapaju s kandidatom.
  const overlapsList=announcements.filter(a=>(a.warehouse||yardivoCanonicalWarehouseV583())===warehouse&&a.date===date&&overlaps(start,duration,toMin(a.time),Number(a.duration)));
  return overlapsList.reduce((s,a)=>s+Number(a.pallets||0),0);
}
function rampDayLoad(date,warehouse,dock){
  return announcements.filter(a=>(a.warehouse||yardivoCanonicalWarehouseV583())===warehouse&&a.date===date&&Number(a.dock)===Number(dock)).reduce((s,a)=>s+Number(a.duration||0),0);
}
function recommendSlot(date,duration,warehouse=null,ignoreId=null){
  const wh=warehouse||document.getElementById('annWarehouse')?.value||yardivoCanonicalWarehouseV583(),w=WAREHOUSES[wh];
  if(!w||!w.ramps||!w.receptionStart||!w.receptionEnd)return null;
  const ws=toMin(w.receptionStart),we=toMin(w.receptionEnd),candidates=[];
  for(let start=ws;start+duration<=we;start+=slotMinutes){
    for(let dock=1;dock<=w.ramps;dock++){
      if(window.YardivoRampConfig?.isLocked?.(wh,dock))continue;
      if(!isSlobodna(date,dock,start,duration,ignoreId,wh))continue;
      const warehouseLoad=slotWarehouseLoad(date,wh,start,duration);
      const rampLoad=rampDayLoad(date,wh,dock);
      const startDelay=start-ws;
      // Raniji termin ima najveću težinu, zatim trenutna gužva i dnevno opterećenje rampe.
      const score=(startDelay*1.6)+(warehouseLoad*1.0)+(rampLoad*0.12);
      candidates.push({dock,start,time:hhmm(start),warehouseLoad,rampLoad,score});
    }
  }
  if(!candidates.length)return null;
  candidates.sort((a,b)=>a.score-b.score||a.start-b.start||a.rampLoad-b.rampLoad||a.dock-b.dock);
  return candidates[0];
}
function setAnnMessage(kind,title,msg){
  const el=document.getElementById('annMessage'); if(!el)return;
  el.className='notice-result '+kind; el.innerHTML=`<h3>${title}</h3><p>${msg}</p>`;
}
function populateAnnouncementControls(){
  const s=document.getElementById('annSupplier');
  if(s) s.innerHTML='<option value="">Odaberi dobavljača...</option>'+suppliers.map(x=>`<option>${x}</option>`).join('');
  const d=document.getElementById('annDock');
  if(d){const wh=document.getElementById('annWarehouse')?.value||activeWarehouse||yardivoCanonicalWarehouseV583();const n=WAREHOUSES?.[wh]?.ramps||0;d.innerHTML='<option value="">Automatski / preporuka</option>'+Array.from({length:n},(_,i)=>i+1).filter(x=>!(window.YardivoRampConfig?.isLocked?.(wh,x))).map(x=>`<option value="${x}">Rampa ${x}</option>`).join('');}
  const t=document.getElementById('annTime');
  if(t) t.innerHTML='<option value="">Automatski / preporuka</option>'+Array.from({length:28},(_,i)=>{const m=workStart+i*15;return `<option value="${hhmm(m)}">${hhmm(m)}</option>`}).join('');
  const date=document.getElementById('annDate');
  if(date && !date.value) date.value=window.yardivoLocalDateV583();
}

// ===== NERADNI DANI / BLAGDANI =====
const HR_HOLIDAYS_2026={
 '2026-01-01':'Nova godina',
 '2026-01-06':'Bogojavljenje / Sveta tri kralja',
 '2026-04-05':'Uskrs',
 '2026-04-06':'Uskrsni ponedjeljak',
 '2026-05-01':'Praznik rada',
 '2026-05-30':'Dan državnosti',
 '2026-06-04':'Tijelovo',
 '2026-06-22':'Dan antifašističke borbe',
 '2026-08-05':'Dan pobjede i domovinske zahvalnosti i Dan hrvatskih branitelja',
 '2026-08-15':'Velika Gospa',
 '2026-11-01':'Svi sveti',
 '2026-11-18':'Dan sjećanja na žrtve Domovinskog rata i žrtvu Vukovara i Škabrnje',
 '2026-12-25':'Božić',
 '2026-12-26':'Sveti Stjepan'
};
let holidayOverrides=JSON.parse(safeStorage.getItem('studenac_holiday_overrides')||'{}');
let customHolidays=JSON.parse(safeStorage.getItem('studenac_custom_holidays')||'{}');

function saveHolidaySettings(){
 safeStorage.setItem('studenac_holiday_overrides',JSON.stringify(holidayOverrides));
 safeStorage.setItem('studenac_custom_holidays',JSON.stringify(customHolidays));
}
function dayInfo(date){
 if(!date)return {closed:false};
 const d=new Date(date+'T12:00:00'),dow=d.getDay();
 if(dow===0||dow===6)return {closed:true,name:dow===0?'Nedjelja':'Subota',kind:'weekend'};
 if(customHolidays[date])return {closed:true,name:customHolidays[date],kind:'custom'};
 if(HR_HOLIDAYS_2026[date]){
   const isOpen=holidayOverrides[date]==='open';
   return {closed:!isOpen,name:HR_HOLIDAYS_2026[date],kind:'holiday',override:isOpen};
 }
 return {closed:false};
}
function updateHolidayWarning(){
 const date=document.getElementById('annDate')?.value;
 const box=document.getElementById('annHolidayWarning');if(!box)return;
 const info=dayInfo(date);
 if(info.closed){
   box.classList.add('show');
   box.innerHTML=`⛔ <strong>PRIJAM NE RADI:</strong> ${info.name}. Odaberi drugi datum.${info.kind==='holiday'?' Admin može promijeniti ovaj dan u Postavkama.':''}`;
 }else if(info.override){
   box.classList.add('show');
   box.style.borderColor='#287a47';box.style.background='#0d2c1a';box.style.color='#7fe39e';
   box.innerHTML=`✓ <strong>ADMIN IZNIMKA:</strong> ${info.name} — prijam je označen kao otvoren.`;
 }else{
   box.classList.remove('show');box.removeAttribute('style');box.innerHTML='';
 }
}
function renderHolidayAdmin(){
 const list=document.getElementById('holidayAdminList');if(!list)return;
 if(!['admin','manager','management'].includes(String(currentSession?.role||'').toLowerCase())){
   list.innerHTML='<div class="overview-empty">Nemate ovlast za promjenu neradnih dana.</div>';return;
 }
 let rows=Object.entries(HR_HOLIDAYS_2026).map(([date,name])=>{
   const open=holidayOverrides[date]==='open';
   return `<div class="holiday-row"><strong>${date}</strong><div>${name}<br><small>${open?'Prijam radi (Admin iznimka)':'Prijam ne radi'}</small></div><button class="action" onclick="toggleHolidayOpen('${date}')">${open?'POSTAVI NERADNO':'POSTAVI DA RADI'}</button></div>`;
 });
 rows=rows.concat(Object.entries(customHolidays).map(([date,name])=>`<div class="holiday-row"><strong>${date}</strong><div>${name}<br><small>Interni neradni dan</small></div><button class="action danger" onclick="removeCustomHoliday('${date}')">UKLONI</button></div>`));
 list.innerHTML=rows.join('');
}
window.toggleHolidayOpen=function(date){
 if(!['admin','manager','management'].includes(String(currentSession?.role||'').toLowerCase()))return;
 holidayOverrides[date]=holidayOverrides[date]==='open'?'closed':'open';
 saveHolidaySettings();renderHolidayAdmin();updateHolidayWarning();renderWeeklyDeliveries();renderDailyMap();updateSavedAnnouncementsToolbar();refreshRecommendation();
}
window.removeCustomHoliday=function(date){
 if(!['admin','manager','management'].includes(String(currentSession?.role||'').toLowerCase()))return;
 delete customHolidays[date];saveHolidaySettings();renderHolidayAdmin();updateHolidayWarning();refreshRecommendation();
}
document.getElementById('addCustomHoliday')?.addEventListener('click',()=>{
 if(!['admin','manager','management'].includes(String(currentSession?.role||'').toLowerCase())){alert('Nemate ovlast za promjenu neradnih dana.');return}
 const date=document.getElementById('customHolidayDate').value;
 const name=document.getElementById('customHolidayName').value.trim()||'Interni neradni dan';
 if(!date){alert('Odaberi datum.');return}
 customHolidays[date]=name;saveHolidaySettings();renderHolidayAdmin();updateHolidayWarning();refreshRecommendation();
});
document.getElementById('annDate')?.addEventListener('change',()=>{updateHolidayWarning();});


function isWeekendIsoEarly(dateStr){
  if(!dateStr)return false;
  const d=new Date(dateStr+'T12:00:00');
  const day=d.getDay();
  return day===0||day===6;
}

function holidayNameEarly(dateStr){
  try{
    const info=dayInfo(dateStr);
    return info&&info.kind==='holiday' ? info.name : '';
  }catch(e){return '';}
}
function refreshRecommendation(){
  updateHolidayWarning();
  const selectedDate=document.getElementById('annDate')?.value;
  const closedInfo=dayInfo(selectedDate);
  if(closedInfo.closed){
    recommendation=null;
    const title=document.getElementById('recTitle');if(title)title.textContent='Neradni dan';
    const detail=document.getElementById('recDetail');if(detail)detail.textContent=`${closedInfo.name} — prijam robe ne radi.`;
    const dock=document.getElementById('recDock');if(dock)dock.textContent='—';
    const slot=document.getElementById('recSlot');if(slot)slot.textContent='—';
    return;
  }
  const date=document.getElementById('annDate')?.value;
  const warehouse=document.getElementById('annWarehouse')?.value;
  const supplier=document.getElementById('annSupplier')?.value||'';
  const pallets=Number(document.getElementById('annPallets')?.value||0);
  const duration=unloadDuration(pallets);
  const w=WAREHOUSES[warehouse];
  const card=document.getElementById('annRecommendation');
  const title=document.getElementById('annRecommendationTitle');
  const info=document.getElementById('annRecommendationText');
  const dockSel=document.getElementById('annDock');
  const timeSel=document.getElementById('annTime');
  currentAnnouncementRecommendation=null;

  document.getElementById('annDuration').textContent=duration+' min';

  if(dockSel){
    const old=dockSel.value;
    dockSel.innerHTML='<option value="">Koristi preporuku</option>'+(w?.ramps?Array.from({length:w.ramps},(_,i)=>`<option value="${i+1}">Rampa ${i+1}</option>`).join(''):'');
    if([...dockSel.options].some(o=>o.value===old))dockSel.value=old;
  }
  if(timeSel){
    const old=timeSel.value,ws=w?.receptionStart?toMin(w.receptionStart):workStart,we=w?.receptionEnd?toMin(w.receptionEnd):workEnd;
    timeSel.innerHTML='<option value="">Koristi preporuku</option>'+Array.from({length:Math.max(0,Math.ceil((we-ws)/15))},(_,i)=>hhmm(ws+i*15)).map(x=>`<option value="${x}">${x}</option>`).join('');
    if([...timeSel.options].some(o=>o.value===old))timeSel.value=old;
  }

  if(date&&isWeekendIsoEarly(date)){
    document.getElementById('annRecDock').textContent='—';document.getElementById('annRecTime').textContent='—';
    if(card)card.className='ann-main-recommendation error';if(title)title.textContent='Vikend · nema prijama';if(info)info.textContent='Subotom i nedjeljom nema prijama robe.';
    renderAnnouncementSchedule();return null;
  }
  if(date&&holidayNameEarly(date)){
    document.getElementById('annRecDock').textContent='—';document.getElementById('annRecTime').textContent='—';
    if(card)card.className='ann-main-recommendation error';if(title)title.textContent='Državni praznik';if(info)info.textContent=holidayNameEarly(date)+' — nema prijama robe.';
    renderAnnouncementSchedule();return null;
  }
  if(!date||!warehouse||!supplier||!pallets){
    document.getElementById('annRecDock').textContent='—';document.getElementById('annRecTime').textContent='—';
    if(card)card.className='ann-main-recommendation';if(title)title.textContent='Unesi osnovne podatke';if(info)info.textContent='Odaberi datum, skladište, dobavljača i broj paleta.';
    renderAnnouncementSchedule();return null;
  }
  if(!w?.ramps){
    document.getElementById('annRecDock').textContent='—';document.getElementById('annRecTime').textContent='—';
    if(card)card.className='ann-main-recommendation error';if(title)title.textContent='Skladište još nije konfigurirano';if(info)info.textContent=`Za ${whLabel(warehouse)} još trebamo definirati broj rampi i vrijeme prijama.`;
    setAnnMessage('bad','Skladište nije konfigurirano',info.textContent);renderAnnouncementSchedule();return null;
  }

  const rec=recommendSlot(date,duration,warehouse,editingAnnouncementId);
  currentAnnouncementRecommendation=rec?{...rec,date,warehouse,supplier,pallets,duration}:null;
  if(rec){
    document.getElementById('annRecDock').textContent='Rampa '+rec.dock;
    document.getElementById('annRecTime').textContent=rec.time+' – '+hhmm(rec.start+duration);
    if(card)card.className='ann-main-recommendation ready';if(title)title.textContent=`Rampa ${rec.dock} · ${rec.time}`;
    if(info)info.innerHTML=`Slobodan termin za <strong>${supplier}</strong>. Procijenjeno trajanje: <strong>${duration} min</strong>. Opterećenje u tom terminu: <strong>${rec.warehouseLoad} već najavljenih paleta</strong>; dnevno opterećenje Rampe ${rec.dock}: <strong>${rec.rampLoad} min</strong>.`;
    setAnnMessage('good','Preporuka je slobodna',`Rampa ${rec.dock} · ${rec.time}–${hhmm(rec.start+duration)}.`);
  }else{
    document.getElementById('annRecDock').textContent='NEMA';document.getElementById('annRecTime').textContent='NEMA';
    if(card)card.className='ann-main-recommendation error';if(title)title.textContent='Nema slobodnog termina';if(info)info.textContent=`Za ${date} u ${whLabel(warehouse)} nema mjesta za termin od ${duration} min.`;
    setAnnMessage('bad','Nema slobodnog termina',info.textContent);
  }
  renderAnnouncementSchedule();return currentAnnouncementRecommendation;
}
function validateAnnouncement(){
  const closedInfo=dayInfo(document.getElementById('annDate')?.value);
  if(closedInfo.closed){setAnnMessage('bad','NERADNI DAN',`${closedInfo.name} — prijam robe ne radi.`);return false;}
  const date=document.getElementById('annDate').value;
  const warehouse=document.getElementById('annWarehouse').value;
  const pallets=Number(document.getElementById('annPallets').value);
  const duration=unloadDuration(pallets);
  const dock=Number(document.getElementById('annDock').value);
  const time=document.getElementById('annTime').value;
  const w=WAREHOUSES[warehouse];
  const rec=recommendSlot(date,duration,warehouse,editingAnnouncementId);

  if(!warehouse||!w?.ramps){setAnnMessage('bad','Odaberi konfigurirano skladište','Za preporuku je potreban broj rampi i vrijeme prijama.');return false}
  if(!dock&&!time){if(rec){setAnnMessage('good','Koristi se automatska preporuka',`Rampa ${rec.dock} · ${rec.time}–${hhmm(rec.start+duration)}.`);return true}return false}
  if(!dock||!time){setAnnMessage('bad','Nepotpun ručni odabir','Odaberi i rampu i vrijeme ili ostavi oba polja na preporuci.');return false}

  const start=toMin(time);
  if(!isSlobodna(date,dock,start,duration,editingAnnouncementId,warehouse)){
    const alt=rec?` Preporuka: Rampa ${rec.dock} u ${rec.time}.`:'';
    setAnnMessage('bad','TERMIN JE ZAUZET',`Rampa ${dock} u ${time} nije slobodna.${alt}`);
    return false;
  }
  setAnnMessage('good','DOBAR ODABIR',`Rampa ${dock} · ${time}–${hhmm(start+duration)} je slobodna.`);
  return true;
}


function ensureChangeHistory(a){if(!Array.isArray(a.changeHistory))a.changeHistory=[];return a.changeHistory}
function plannedMoment(a){return new Date(`${a.date}T${a.time}:00`)}
function changeIsAdvance(oldDate,oldTime,changedAt){
  return new Date(changedAt) < new Date(`${oldDate}T${oldTime}:00`);
}
function supplierChangeStats(name){
  const aa=announcements.filter(a=>a.supplier===name);
  let total=0,advance=0,late=0;
  aa.forEach(a=>(a.changeHistory||[]).forEach(c=>{total++; if(c.countsAsLate)late++; else advance++;}));
  return {total,advance,late};
}

function startEditAnnouncement(id){
  const a=announcements.find(x=>x.id===id);if(!a)return;
  editingAnnouncementId=id;
  document.getElementById('annDate').value=a.date;
  document.getElementById('annWarehouse').value=a.warehouse||yardivoCanonicalWarehouseV583();
  document.getElementById('annSupplier').value=a.supplier;
  document.getElementById('annPallets').value=a.pallets;
  document.getElementById('annSku').value=a.sku;
  const responsibleSelect=document.getElementById('annResponsible');if(responsibleSelect)responsibleSelect.value=a.responsible||'';
  const details=document.querySelector('#announcementForm .ann-advanced');if(details)details.open=true;
  refreshRecommendation();
  document.getElementById('annDock').value=String(a.dock);
  document.getElementById('annTime').value=a.time;
  const b=document.getElementById('editAnnouncementBanner');if(b)b.classList.add('active');const cb=document.getElementById('changeAnnouncementBox');if(cb)cb.classList.add('active');document.getElementById('changeReason').value='';document.getElementById('changeNote').value='';
  document.getElementById('editAnnouncementName').textContent=a.supplier;
  document.getElementById('editAnnouncementOldSlot').textContent=`· trenutno Rampa ${a.dock}, ${a.time}–${hhmm(toMin(a.time)+a.duration)}`;
  const orderInput=document.getElementById('annOrderSuffix');
  if(orderInput)orderInput.value=String(a.orderNumber||'');
  const btn=document.getElementById('saveRecommendedAnnouncement');if(btn)btn.textContent='SPREMI PREPORUČENU PROMJENU';
  const mb=document.getElementById('saveManualAnnouncement');if(mb)mb.textContent='SPREMI PROMJENU TERMINA';
  validateAnnouncement();
  renderAnnouncementSchedule();
  document.getElementById('announcements')?.scrollIntoView({behavior:'smooth',block:'start'});
}
window.startEditAnnouncement=startEditAnnouncement;

function cancelEditAnnouncement(){
  editingAnnouncementId=null;
  document.getElementById('editAnnouncementBanner')?.classList.remove('active');document.getElementById('changeAnnouncementBox')?.classList.remove('active');
  document.getElementById('annDock').value='';
  document.getElementById('annTime').value='';
  const orderInput=document.getElementById('annOrderSuffix');if(orderInput)orderInput.value='';
  const btn=document.getElementById('saveRecommendedAnnouncement');if(btn)btn.textContent='SPREMI PREPORUČENI TERMIN';
  const mb=document.getElementById('saveManualAnnouncement');if(mb)mb.textContent='SPREMI RUČNO ODABRANI TERMIN';
  refreshRecommendation();
}
document.getElementById('cancelEditAnnouncement')?.addEventListener('click',cancelEditAnnouncement);


function normalizeManualOrderNumber(){
  const input=document.getElementById('annOrderSuffix');
  if(!input)return '';
  const raw=String(input.value||'').trim();
  input.value=raw;
  return raw;
}
function validateManualOrderNumber(){
  return {ok:true,order:normalizeManualOrderNumber()};
}

function applyAnnouncementSlot(mode='auto'){
  const date=document.getElementById('annDate').value,warehouse=document.getElementById('annWarehouse').value,supplier=document.getElementById('annSupplier').value;
  const responsible=document.getElementById('annResponsible')?.value||'';
  const responsibleEl=document.getElementById('annResponsible');
  if(!responsible){
    responsibleEl?.classList.add('required-error');
    setAnnMessage('bad','ODGOVORNA OSOBA JE OBAVEZNA','Odaberi odgovornu osobu prije spremanja najave.');
    showYmsToast?.('error','ODGOVORNA OSOBA JE OBAVEZNA','Najavu nije moguće spremiti dok ne odabereš odgovornu osobu.');
    responsibleEl?.focus();
    return false;
  }
  responsibleEl?.classList.remove('required-error');
  if(isWeekendIsoEarly(date)){setAnnMessage('bad','Vikend','Subotom i nedjeljom nema prijama robe.');return false}
  const praznik=holidayNameEarly(date);if(praznik){setAnnMessage('bad','Državni praznik',`${praznik} — nema prijama robe.`);return false}
  const pallets=Number(document.getElementById('annPallets').value),sku=Number(document.getElementById('annSku').value),duration=unloadDuration(pallets);
  const orderCheck=validateManualOrderNumber();
  if(!orderCheck.ok)return false;
  const orderNumber=orderCheck.order;
  if(!warehouse||!WAREHOUSES[warehouse]?.ramps||!supplier)return false;

  let dock,time;
  if(mode==='manual'){
    dock=Number(document.getElementById('annDock').value);time=document.getElementById('annTime').value;
    if(!dock||!time){setAnnMessage('bad','Odaberi termin','Odaberi i rampu i vrijeme.');return false}
    if(!isSlobodna(date,dock,toMin(time),duration,editingAnnouncementId,warehouse)){
      const rec=recommendSlot(date,duration,warehouse,editingAnnouncementId);
      setAnnMessage('bad','TERMIN JE ZAUZET',`Rampa ${dock} u ${time} nije slobodna.${rec?` Preporuka: Rampa ${rec.dock} u ${rec.time}.`:''}`);return false;
    }
  }else{
    let rec=recommendSlot(date,duration,warehouse,editingAnnouncementId);
    if(!rec){setAnnMessage('bad','Nema slobodnog termina','Nema slobodne preporuke.');return false}
    dock=rec.dock;time=rec.time;
  }


  const duplicate=findDuplicateAnnouncement({
    date,warehouse,supplier,pallets,sku,
    ignoreId:editingAnnouncementId
  });
  if(duplicate){
    const no=announcementNumber(duplicate);
    setAnnMessage('bad','OVA NAJAVA JE VEĆ NAJAVLJENA',`Najava #${no} već postoji: ${supplier} · ${date} · ${pallets} paleta · ${sku} SKU · Rampa ${duplicate.dock} · ${duplicate.time}.`);
    showYmsToast('error','OVA NAJAVA JE VEĆ NAJAVLJENA',`Najava #${no} · ${supplier} · ${date} · ${pallets} paleta · ${sku} SKU · Rampa ${duplicate.dock} · ${duplicate.time}`);
    highlightAnnouncementOnPlan(duplicate.id);
    const saveBtn=document.getElementById('saveRecommendedAnnouncement');
    if(saveBtn){
      saveBtn.classList.add('duplicate-flash');
      setTimeout(()=>saveBtn.classList.remove('duplicate-flash'),1100);
    }
    return false;
  }

  if(editingAnnouncementId){
    const a=announcements.find(x=>x.id===editingAnnouncementId);if(!a)return false;
    const reason=document.getElementById('changeReason')?.value||'';
    const note=document.getElementById('changeNote')?.value||'';
    const changedDate=(a.date!==date),changedTime=(a.time!==time),changedDock=Number(a.dock)!==Number(dock),changedWarehouse=(a.warehouse||yardivoCanonicalWarehouseV583())!==warehouse;
    if((changedDate||changedTime||changedDock||changedWarehouse) && !reason){
      setAnnMessage('bad','Nedostaje razlog promjene','Odaberi razlog promjene postojeće najave.');
      return false;
    }
    if(changedDate||changedTime||changedDock||changedWarehouse){
      const changedAt=new Date().toISOString();
      const old={date:a.date,time:a.time,dock:a.dock,warehouse:a.warehouse||yardivoCanonicalWarehouseV583()};
      const countsAsLate=!changeIsAdvance(old.date,old.time,changedAt);
      ensureChangeHistory(a).push({
        changedAt,
        reason,
        note,
        oldDate:old.date,oldTime:old.time,oldDock:old.dock,oldWarehouse:old.warehouse,
        newDate:date,newTime:time,newDock:dock,newWarehouse:warehouse,
        countsAsLate
      });
      if(!a.originalDate){a.originalDate=old.date;a.originalTime=old.time;a.originalDock=old.dock;a.originalWarehouse=old.warehouse}
      if(countsAsLate){
        a.hadLateReschedule=true;
        a.noShow=true;
        a.rescheduledAfterNoShow=true;
      }else{
        a.advanceReschedule=true;
      }
    }
    a.date=date;a.warehouse=warehouse;a.supplier=supplier;a.pallets=pallets;a.sku=sku;a.responsible=responsible;a.duration=duration;a.dock=dock;a.time=time;
    a.orderNumber=orderNumber;
    a.updatedAt=new Date().toISOString();
    saveAnnouncements();
    renderAnnouncements();
    setAnnMessage('good','NAJAVA PROMIJENJENA',`${supplier}: Rampa ${dock} · ${date} ${time}–${hhmm(toMin(time)+duration)}.`);
    const edited=a;
    showYmsToast('success',`NAJAVA #${announcementNumber(edited)} USPJEŠNO PROMIJENJENA`,`${supplier} · ${date} ${time} · Rampa ${dock}`);
    cancelEditAnnouncement();
  }else{
    const created={id:Date.now(),date,warehouse,supplier,pallets,sku,responsible,duration,dock,time,orderNumber,status:'U dolasku',createdAt:new Date().toISOString(),createdBy:(currentSession?.user||currentSession?.username||''),announcementRef:yardivoGenerateAnnouncementRef()};
    announcements.push(created);
    saveAnnouncements();
    renderAnnouncements();
    setAnnMessage('good','NAJAVA USPJEŠNO SPREMLJENA',`Najava #${announcementNumber(created)} · ${supplier}: Rampa ${dock} · ${time}–${hhmm(toMin(time)+duration)}.`);
    showYmsToast('success',`NAJAVA #${announcementNumber(created)} USPJEŠNO SPREMLJENA`,`${supplier} · ${date} ${time} · ${pallets} paleta · Rampa ${dock}`);
    document.getElementById('annDock').value='';document.getElementById('annTime').value='';
    const orderInput=document.getElementById('annOrderSuffix');if(orderInput)orderInput.value='';
  }
  render();refreshRecommendation();return true;
}


function normalizeAnnouncements(){
  let changed=false;
  announcements.forEach(a=>{
    if(!a.status){a.status='Najavljen';changed=true}
    if(!a.warehouse){a.warehouse=yardivoCanonicalWarehouseV583()||'';changed=true}
    if(!Array.isArray(a.changeHistory)){a.changeHistory=[];changed=true}
    if(typeof a.responsible==='undefined'){a.responsible='';changed=true}
  });
  if(changed)saveAnnouncements();
}


let contextAnnouncementId=null;
window.openAnnouncementContextMenu=function(ev,id){
  ev.preventDefault();ev.stopPropagation();
  const a=announcements.find(x=>x.id===id);if(!a)return false;
  contextAnnouncementId=id;
  try{contextId=String(id)}catch(e){}
  const menu=document.getElementById('announcementContextMenu');
  document.getElementById('ctxAnnouncementTitle').textContent=`${a.supplier} · ${a.date} ${a.time} · R${a.dock}`;
  document.querySelectorAll('.reception-status-action').forEach(btn=>btn.style.display=canChangeReceptionStatus()?'block':'none');
  const drvBtn=document.getElementById('ctxDriverAnnouncement');if(drvBtn)drvBtn.style.display=canAnnounceDriverData()?'block':'none';
  menu.classList.add('open');
  menu.style.display='block';
  const pad=8,w=220,h=210;
  menu.style.left=Math.min(ev.clientX,window.innerWidth-w-pad)+'px';
  menu.style.top=Math.min(ev.clientY,window.innerHeight-h-pad)+'px';
  return false;
}
function closeAnnouncementContextMenu(){
  const menu=document.getElementById('announcementContextMenu');
  if(menu){
    menu.classList.remove('open','show','visible');
    menu.style.display='none';
    menu.style.left='';
    menu.style.top='';
  }
}
document.getElementById('ctxEditAnnouncement')?.addEventListener('click',()=>{
  const id=contextAnnouncementId;closeAnnouncementContextMenu();if(id!=null)startEditAnnouncement(id);
});
document.getElementById('ctxDriverAnnouncement')?.addEventListener('click',()=>{
  const id=contextAnnouncementId;closeAnnouncementContextMenu();if(id!=null)openDriverAnnouncement(id);
});
document.getElementById('ctxArrivalAnnouncement')?.addEventListener('click',()=>{
  const id=contextAnnouncementId;closeAnnouncementContextMenu();if(id!=null)recordArrival(id);
});
document.getElementById('ctxDeleteAnnouncement')?.addEventListener('click',(ev)=>{
  ev.preventDefault();ev.stopPropagation();
  const id=(contextAnnouncementId!=null?contextAnnouncementId:contextId);
  if(id!=null)window.deleteAnnouncement(id);
  else closeAnnouncementContextMenu();
});
document.addEventListener('click',closeAnnouncementContextMenu);
window.addEventListener('scroll',closeAnnouncementContextMenu,{passive:true});
document.getElementById('announcementContextMenu')?.addEventListener('click',e=>e.stopPropagation());
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAnnouncementContextMenu()});



function canAnnounceDriverData(){
  const role=String(currentSession?.role||'').toLowerCase();
  return role==='admin'||role==='inventory'||role==='zalihe';
}
let driverAnnouncementReturnView='announcements';
function driverDataText(a){
  if(!a.plannedPlate&&!a.plannedDriver)return 'Nije najavljeno';
  return `${a.plannedPlate||'—'} · ${a.plannedDriver||'—'}`;
}
window.openDriverAnnouncement=function(id){
  if(!canAnnounceDriverData()){
    alert('Tablice i podatke vozača može unositi Upravljanje zalihama ili Admin.');
    return;
  }
  const a=announcements.find(x=>x.id===id);if(!a)return;
  document.getElementById('driverAnnouncementId').value=id;
  document.getElementById('driverAnnouncementInfo').innerHTML=
    `<strong>${a.supplier}</strong><br>${a.date} · ${a.time} · Rampa ${a.dock}<br>${a.pallets} paleta · ${truckCountForPallets(a.pallets)} kamiona`;
  document.getElementById('plannedPlate').value=effectivePlate(a);
  document.getElementById('plannedDriver').value=effectiveDriver(a);
  document.getElementById('plannedTrailer').value=a.plannedTrailer||'';
  document.getElementById('plannedPhone').value=a.plannedPhone||'';
  {
    const activeSection=document.querySelector('.view.active:not(#homeMenu)');
    driverAnnouncementReturnView=activeSection?.id||'announcements';
    if(driverAnnouncementReturnView==='homeMenu')driverAnnouncementReturnView='announcements';
  }
  document.body.classList.remove('home-menu-mode');
  document.getElementById('driverAnnouncementDialog').showModal();
}
document.getElementById('closeDriverAnnouncement')?.addEventListener('click',()=>document.getElementById('driverAnnouncementDialog').close());
document.getElementById('cancelDriverAnnouncement')?.addEventListener('click',()=>document.getElementById('driverAnnouncementDialog').close());
document.getElementById('driverAnnouncementForm')?.addEventListener('submit',e=>{
  e.preventDefault();
  e.stopPropagation();
  if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();
  if(!canAnnounceDriverData())return;

  const a=announcements.find(x=>x.id===Number(document.getElementById('driverAnnouncementId').value));
  if(!a)return;

  const savedPlate=document.getElementById('plannedPlate').value.trim().toUpperCase();
  const savedDriver=document.getElementById('plannedDriver').value.trim();
  const savedTrailer=document.getElementById('plannedTrailer').value.trim();
  const savedPhone=document.getElementById('plannedPhone').value.trim();
  const oldVehicleDriver={plate:effectivePlate(a)||'',driver:effectiveDriver(a)||'',trailer:a.plannedTrailer||'',phone:a.plannedPhone||''};
  const vehicleDriverChanged=oldVehicleDriver.plate!==savedPlate||oldVehicleDriver.driver!==savedDriver||oldVehicleDriver.trailer!==savedTrailer||oldVehicleDriver.phone!==savedPhone;
  if(vehicleDriverChanged){
    if(!Array.isArray(a.changeHistory))a.changeHistory=[];
    a.changeHistory.push({
      type:'VEHICLE_DRIVER_CHANGE',
      changedAt:new Date().toISOString(),
      changedBy:(currentSession?.name||currentSession?.username||currentSession?.role||'Korisnik'),
      reason:'Dobavljač javio promjenu vozila / vozača',
      oldVehicleDriver,
      newVehicleDriver:{plate:savedPlate,driver:savedDriver,trailer:savedTrailer,phone:savedPhone}
    });
  }

  a.vehiclePlate=savedPlate;
  a.driverNameCanonical=savedDriver;
  a.plannedPlate=savedPlate;
  a.plannedDriver=savedDriver;

  if(hasPhysicallyArrived(a)){
    a.arrivalPlate=savedPlate;
    a.arrivalDriver=savedDriver;
  }

  a.plannedTrailer=savedTrailer;
  a.plannedPhone=savedPhone;
  a.driverDataUpdatedAt=new Date().toISOString();

  syncAnnouncementIdentity(a);
  saveAnnouncements();

  document.getElementById('driverAnnouncementDialog').close();

  // Osvježi samo komponente koje koriste podatke najave. NEMA globalnog render().
  try{if(typeof renderAnnouncements==='function')renderAnnouncements()}catch(e){}
  try{if(typeof renderAnnouncementSchedule==='function')renderAnnouncementSchedule()}catch(e){}
  try{if(typeof renderCheckinPro==='function')renderCheckinPro()}catch(e){}
  try{if(typeof renderReceiving==='function')renderReceiving()}catch(e){}
  try{if(typeof renderYard==='function')renderYard()}catch(e){}
  try{if(typeof renderDailyMap==='function')renderDailyMap()}catch(e){}
  try{if(typeof renderWeeklyMap==='function')renderWeeklyMap()}catch(e){}
  try{if(typeof renderDashboardSimple==='function')renderDashboardSimple()}catch(e){}

  // Vrati sekciju kroz isti router koji koristi cijela aplikacija.
  let returnView=driverAnnouncementReturnView||'announcements';
  if(returnView==='homeMenu'||!document.getElementById(returnView))returnView='announcements';
  document.body.classList.remove('home-menu-mode');
  if(typeof openAppView==='function'){
    openAppView(returnView);
  }else{
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById(returnView)?.classList.add('active');
    document.querySelectorAll('.nav-btn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===returnView));
  }

  showYmsToast?.(
    'success',
    'TABLICE I VOZAČ SPREMLJENI',
    `${a.supplier} · ${identityDisplayHtml(a)}`
  );
});


let ymsToastTimer=null;
function showYmsToast(type,title,message,timeout=3600){
  const el=document.getElementById('ymsToast');if(!el)return;
  clearTimeout(ymsToastTimer);
  el.className=`yms-toast ${type} show`;
  document.getElementById('ymsToastTitle').textContent=title;
  document.getElementById('ymsToastText').textContent=message;
  ymsToastTimer=setTimeout(()=>el.classList.remove('show'),timeout);
}

function yardivoGenerateAnnouncementRef(){
  const used=new Set((Array.isArray(announcements)?announcements:[]).map(a=>String(a?.announcementRef||'').trim().toUpperCase()));
  let max=0;
  used.forEach(ref=>{
    const m=/^NAJ(\d{6})$/.exec(ref);
    if(m)max=Math.max(max,Number(m[1])||0);
  });
  let n=max+1,ref='';
  do{
    ref='NAJ'+String(n).padStart(6,'0');
    n++;
  }while(used.has(ref));
  return ref;
}
function announcementNumber(a){
  if(!a)return '—';
  const current=String(a.announcementRef||'').trim().toUpperCase();
  if(!/^NAJ\d{6}$/.test(current))a.announcementRef=yardivoGenerateAnnouncementRef();
  return a.announcementRef;
}


function highlightAnnouncementOnPlan(id){
  const block=document.querySelector(`.schedule-grid .booked[data-announcement-id="${id}"]`);
  if(!block)return;
  block.classList.remove('duplicate-plan-highlight');
  // force reflow so repeated duplicate clicks replay the animation
  void block.offsetWidth;
  block.classList.add('duplicate-plan-highlight');
  block.scrollIntoView({behavior:'smooth',block:'center',inline:'center'});
  setTimeout(()=>block.classList.remove('duplicate-plan-highlight'),1200);
}

function findDuplicateAnnouncement({date,warehouse,supplier,pallets,sku,ignoreId=null}){
  return announcements.find(a=>
    a.id!==ignoreId &&
    String(a.date)===String(date) &&
    String(a.warehouse||yardivoCanonicalWarehouseV583())===String(warehouse) &&
    String(a.supplier||'').trim().toLowerCase()===String(supplier||'').trim().toLowerCase() &&
    Number(a.pallets||0)===Number(pallets||0) &&
    Number(a.sku||0)===Number(sku||0)
  )||null;
}

function truckCountForPallets(pallets){
  const p=Math.max(0,Number(pallets)||0);
  return p===0?0:Math.ceil(p/33);
}


let savedAnnouncementsMode='active';

function savedAnnouncementsToday(){
  return window.yardivoLocalDateV583();
}

function savedAnnouncementStatusValue(a){
  if(typeof isNoShow==='function'&&isNoShow(a))return 'NO-SHOW';
  return typeof normalizedPlanStatus==='function'?normalizedPlanStatus(a):(a.status||'U dolasku');
}
function savedAnnouncementMissingDriver(a){
  return !effectivePlate(a) || !effectiveDriver(a);
}

function savedAnnouncementsFilterData(){
  const today=savedAnnouncementsToday();
  const wh=document.getElementById('savedWarehouseFilter')?.value||'ALL';
  const q=(document.getElementById('savedSearchInput')?.value||'').toLowerCase().trim();
  const status=document.getElementById('savedStatusFilter')?.value||'ALL';

  return [...announcements]
    .filter(a=>{
      const byDate=savedAnnouncementsMode==='history'
        ? String(a.date)<today
        : String(a.date)>=today;

      const byWarehouse=wh==='ALL'||(a.warehouse||yardivoCanonicalWarehouseV583())===wh;

      const hay=[
        a.supplier,a.plannedPlate,a.plannedDriver,a.plannedTrailer,a.plannedPhone,
        a.arrivalPlate,a.arrivalDriver,a.date,a.time,a.warehouse
      ].map(x=>String(x||'').toLowerCase()).join(' ');
      const bySearch=!q||hay.includes(q);

      let byStatus=true;
      if(status==='MISSING_DRIVER')byStatus=savedAnnouncementMissingDriver(a);
      else if(status!=='ALL')byStatus=savedAnnouncementStatusValue(a)===status;

      return byDate&&byWarehouse&&bySearch&&byStatus;
    })
    .sort((a,b)=>{
      const av=String(a.date)+String(a.time), bv=String(b.date)+String(b.time);
      return savedAnnouncementsMode==='history' ? bv.localeCompare(av) : av.localeCompare(bv);
    });
}

function updateSavedAnnouncementsToolbar(){
  const active=document.getElementById('savedActiveTab');
  const history=document.getElementById('savedHistoryTab');
  active?.classList.toggle('active',savedAnnouncementsMode==='active');
  history?.classList.toggle('active',savedAnnouncementsMode==='history');
  const note=document.getElementById('savedModeNote');
  if(note)note.textContent=savedAnnouncementsMode==='history'
    ? 'Prikazuju se sve najave prije današnjeg datuma'
    : 'Prikazuju se današnje i buduće najave';
}
document.getElementById('savedActiveTab')?.addEventListener('click',()=>{
  savedAnnouncementsMode='active';updateSavedAnnouncementsToolbar();renderAnnouncements();
});
document.getElementById('savedHistoryTab')?.addEventListener('click',()=>{
  savedAnnouncementsMode='history';updateSavedAnnouncementsToolbar();renderAnnouncements();
});
document.getElementById('savedWarehouseFilter')?.addEventListener('change',renderAnnouncements);
document.getElementById('savedSearchInput')?.addEventListener('input',renderAnnouncements);
document.getElementById('savedStatusFilter')?.addEventListener('change',renderAnnouncements);

function renderAnnouncements(){
  syncAllAnnouncementIdentities();
  const body=document.getElementById('announcementTable');
  if(!body)return;

  updateSavedAnnouncementsToolbar();
  const data=savedAnnouncementsFilterData();

  const count=document.getElementById('announcementCount');
  if(count){
    const wh=document.getElementById('savedWarehouseFilter')?.value||'ALL';
    const whText=wh==='ALL'?'Sva skladišta':wh;
    count.textContent=`${data.length} ${data.length===1?'najava':'najava'} · ${whText}`;
  }
  const missingCount=data.filter(savedAnnouncementMissingDriver).length;
  const missingSummary=document.getElementById('missingDriverSummary');
  if(missingSummary){
    if(missingCount>0 && savedAnnouncementsMode==='active'){
      missingSummary.classList.add('show');
      missingSummary.innerHTML=`⚠ <strong>${missingCount}</strong> ${missingCount===1?'najava nema kompletne tablice/vozača':'najava nema kompletne tablice/vozača'}. Klikni filter <strong>Nedostaju tablice / vozač</strong> za brzi prikaz.`;
    }else{
      missingSummary.classList.remove('show');
      missingSummary.innerHTML='';
    }
  }


  if(!data.length){
    body.innerHTML=`<tr><td colspan="15"><div class="overview-empty">${savedAnnouncementsMode==='history'?'Nema povijesnih najava za odabrano skladište.':'Nema današnjih ni budućih najava za odabrano skladište.'}</div></td></tr>`;
    if(typeof renderAnnouncementSchedule==='function')renderAnnouncementSchedule();
    return;
  }

  body.innerHTML=data.map(a=>{
    const m=typeof delayMinutes==='function'?delayMinutes(a):null;
    const warehouse=a.warehouse||yardivoCanonicalWarehouseV583();
    const actual=(a.actualDate&&a.actualTime)?`${a.actualDate} ${a.actualTime}`:'—';
    const lateHtml=m!==null?`<span class="delay-chip ${delayClass(m)}">${delayLabel(m)}</span>`:'—';
    const noShow=(typeof isNoShow==='function'&&isNoShow(a));
    const opStatus=operationalPlanStatus(a);
    const delayDetail=operationalDelayText(a);
    const statusHtml=opStatus==='Promijenjena nakon NO-SHOW'
      ? `<span class="notice-pill" style="background:#6f42c1;border-color:#a77df0;color:#fff">PROMIJENJENA NAKON NO-SHOW</span>${delayDetail?`<br><small>${delayDetail}</small>`:''}`
      : opStatus==='NIJE DOŠAO'
      ? `<span class="notice-pill" style="background:#6b2a2f;border-color:#b55a62;color:#ffe9eb">NIJE DOŠAO</span>${delayDetail?`<br><small>${delayDetail}</small>`:''}`
      : opStatus==='NO-SHOW'
      ? `<span class="notice-pill" style="background:#b96f00;border-color:#e9a12b;color:#fff">NO-SHOW</span>${delayDetail?`<br><small>${delayDetail}</small>`:''}`
      : opStatus==='Kašnjenje'
      ? `<span class="notice-pill" style="background:#d18a09;border-color:#ffc04a;color:#fff">KAŠNJENJE</span>${delayDetail?`<br><small>${delayDetail}</small>`:''}`
      : `<span class="notice-pill ${['Zaprimljeno','Završeno','Izašao'].includes(a.status)?'ok':'warn'}">${a.status||'U dolasku'}</span>`;
    const changes=(a.changeHistory||[]).length?`<br><small>${a.changeHistory.length} promjena</small>`:'';

    return `<tr class=\"saved-${yardivoUnifiedStatusClass(a)}\">
      <td>${a.date||'—'}</td>
      <td><strong>${warehouse}</strong><br><small>${WAREHOUSES?.[warehouse]?.location||''}</small></td>
      <td><strong>${a.supplier||'—'}</strong></td>
      <td>${a.pallets??'—'}</td>
      <td><strong>${truckCountForPallets(a.pallets)}</strong></td>
      <td>${a.sku??'—'}</td>
      <td>${a.duration??'—'} min</td>
      <td>Rampa ${a.dock??'—'}</td>
      <td>${a.time||'—'}${a.time&&a.duration?`–${hhmm(toMin(a.time)+Number(a.duration))}`:''}</td>
      <td>${
  savedAnnouncementMissingDriver(a)
    ? `<span class="missing-driver-data">⚠ NEDOSTAJU TABLICE / VOZAČ</span><br><small>${effectivePlate(a)||'Tablice nisu upisane'} · ${effectiveDriver(a)||'Vozač nije upisan'}</small>`
    : `<span class="driver-data-ok">✓ PODACI KOMPLETNI</span><br><small>${effectivePlate(a)} · ${effectiveDriver(a)}</small>`
}</td>
      <td>${actual}</td>
      <td>${lateHtml}</td>
      <td>${statusHtml}${changes}${savedAnnouncementMissingDriver(a)?'<br><span class="missing-driver-data">NEDOSTAJU PODACI VOZAČA</span>':''}${savedAnnouncementsMode==='history'?'<br><span class="history-chip">POVIJEST</span>':''}</td>
      <td class="actions">
        ${canAnnounceDriverData()?`<button class="action" onclick="openDriverAnnouncement(${a.id})">${effectivePlate(a)||effectiveDriver(a)?'PROMIJENI PODATKE':'UNESI VOZILO / VOZAČA'}</button>`:''}
        <button class="action" onclick="startEditAnnouncement(${a.id})">UREDI TERMIN</button>
        <button class="action" onclick="recordArrival(${a.id})">${a.actualDate?'PROMIJENI DOLAZAK':'EVIDENTIRAJ DOLAZAK'}</button>
        <button class="action danger" onclick="deleteAnnouncement(${a.id})">OBRIŠI NAJAVU</button>
      </td>
    </tr>`;
  }).join('');

  if(typeof renderAnnouncementSchedule==='function')renderAnnouncementSchedule();
  if(typeof renderChangeHistory==='function')renderChangeHistory();renderHolidayAdmin();updateHolidayWarning();
}
window.deleteAnnouncement=id=>{
  const sid=String(id);
  const a=announcements.find(x=>String(x.id)===sid);
  if(!a){closeAnnouncementContextMenu();return false}
  if(!confirm(`Izbrisati najavu?

${a.supplier}
${a.date} · Rampa ${a.dock} · ${a.time}`)){closeAnnouncementContextMenu();return false}
  announcements=announcements.filter(x=>String(x.id)!==sid);
  if(typeof editingAnnouncementId!=='undefined'&&String(editingAnnouncementId)===sid&&typeof cancelEditAnnouncement==='function')cancelEditAnnouncement();
  try{
    const ov=document.getElementById('yardivoAnnouncementInfoOverlay');
    if(ov){ov.classList.remove('show');ov.style.display='none'}
  }catch(e){}
  closeAnnouncementContextMenu();
  try{contextAnnouncementId=null}catch(e){}
  try{contextId=null}catch(e){}
  saveAnnouncements();
  try{render()}catch(e){}
  try{renderAnnouncements?.()}catch(e){}
  try{renderAnnouncementSchedule?.()}catch(e){}
  try{renderReceiving?.()}catch(e){}
  try{renderDailyMap?.()}catch(e){}
  try{renderWeeklyMap?.()}catch(e){}
  try{renderOverview?.()}catch(e){}
  try{YardivoOverviewMaster?.render?.()}catch(e){}
  try{YardivoUnannouncedSection?.render?.()}catch(e){}
  try{renderUnannouncedComplete?.()}catch(e){}
  try{refreshRecommendation()}catch(e){}
  try{showYmsToast?.('success','NAJAVA IZBRISANA',`${a.supplier} · ${a.date} ${a.time}`)}catch(e){}
  return true;
};



function currentDelayMinutes(a){
  if(a.actualDate&&a.actualTime){
    const plan=new Date(`${a.date}T${a.time}:00`);
    const actual=new Date(`${a.actualDate}T${a.actualTime}:00`);
    return Math.max(0,Math.floor((actual-plan)/60000));
  }
  const plan=new Date(`${a.date}T${a.time}:00`);
  return Math.max(0,Math.floor((new Date()-plan)/60000));
}
function humanDelayLong(mins){
  mins=Math.max(0,Number(mins)||0);
  const days=Math.floor(mins/1440);
  mins%=1440;
  const hours=Math.floor(mins/60);
  const minutes=mins%60;
  const parts=[];
  if(days)parts.push(`${days} ${days===1?'DAN':'DANA'}`);
  if(hours)parts.push(`${hours} H`);
  if(!days && minutes)parts.push(`${minutes} MIN`);
  return parts.join(' ')||'0 MIN';
}
function originalMissedDelayText(a){
  if(!a.hadLateReschedule && !a.rescheduledAfterNoShow)return '';
  const history=(a.changeHistory||[]).filter(c=>c.countsAsLate);
  if(!history.length)return '';
  const last=history[history.length-1];
  const oldPlan=new Date(`${last.oldDate}T${last.oldTime}:00`);
  const changed=new Date(last.changedAt);
  const mins=Math.max(0,Math.floor((changed-oldPlan)/60000));
  return humanDelayLong(mins);
}
function operationalDelayText(a){
  const s=operationalPlanStatus(a);
  if(s==='NIJE DOŠAO')return `KASNI ${compactLateDuration(frozenOrLiveLateMinutes(a))}`;
  if(s==='NO-SHOW')return `KASNI ${compactLateDuration(frozenOrLiveLateMinutes(a))}`;
  const late=latenessLabel(a);
  if(late)return late;
  return '';
}



let LATE_GRACE_MINUTES=15;

function plannedArrivalDateTime(a){
  if(!a?.date||!a?.time)return null;
  const d=new Date(`${a.date}T${a.time}:00`);
  return Number.isNaN(d.getTime())?null:d;
}
function firstPhysicalArrivalDateTime(a){
  const candidates=[a.firstArrivalAt,a.yardArrivalAt,a.dockArrivalAt,a.receivedAt];
  for(const v of candidates){
    if(v){
      const d=new Date(v);
      if(!Number.isNaN(d.getTime()))return d;
    }
  }
  if(a.actualDate&&a.actualTime){
    const d=new Date(`${a.actualDate}T${a.actualTime}:00`);
    if(!Number.isNaN(d.getTime()))return d;
  }
  return null;
}
function frozenOrLiveLateMinutes(a,now=new Date()){
  const planned=plannedArrivalDateTime(a);if(!planned)return 0;
  const arrival=firstPhysicalArrivalDateTime(a);
  const end=arrival||now;
  return Math.max(0,Math.floor((end-planned)/60000));
}
function isActivelyLate(a,now=new Date()){
  if(hasPhysicallyArrived(a))return false;
  return frozenOrLiveLateMinutes(a,now)>=LATE_GRACE_MINUTES;
}
function compactLateDuration(mins){
  mins=Math.max(0,Math.floor(Number(mins)||0));
  const d=Math.floor(mins/1440);mins%=1440;
  const h=Math.floor(mins/60),m=mins%60;
  const out=[];
  if(d)out.push(`${d} ${d===1?'DAN':'DANA'}`);
  if(h)out.push(`${h} H`);
  if(m||!out.length)out.push(`${m} MIN`);
  return out.join(' ');
}
function latenessLabel(a,now=new Date()){
  const mins=frozenOrLiveLateMinutes(a,now);
  if(mins<LATE_GRACE_MINUTES)return '';
  return hasPhysicallyArrived(a)
    ? `KASNIO ${compactLateDuration(mins)}`
    : `KASNI ${compactLateDuration(mins)}`;
}

function hasPhysicallyArrived(a){
  const s=String(a.status||'').toLowerCase();
  return !!(
    a.actualDate || a.actualTime || a.yardArrivalAt || a.dockArrivalAt || a.receivedAt ||
    s.includes('dvori') || s.includes('rampi') || s.includes('zaprim') || s.includes('završ')
  );
}
function isAfter14NoShow(a,now=new Date()){
  if(!a?.date)return false;
  const today=isoLocal(now);
  if(a.date!==today)return false;
  if(hasPhysicallyArrived(a))return false;
  let noShowAt='14:00';
  try{noShowAt=String(window.YardivoDelayRulesV1?.get?.().noShowAt||'14:00')}catch(_){}
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(noShowAt))noShowAt='14:00';
  const cutoff=new Date(`${today}T${noShowAt}:00`);
  return now>=cutoff;
}
function exactDelayTextFromPlan(a,now=new Date()){
  return compactLateDuration(frozenOrLiveLateMinutes(a,now));
}
function todayAfter14NoShows(){
  const now=new Date();
  return announcements
    .filter(a=>isAfter14NoShow(a,now))
    .sort((a,b)=>String(a.time).localeCompare(String(b.time)));
}
function renderAfter14NoShowAlerts(){
  const data=todayAfter14NoShows();

  const panel=document.getElementById('after14NoShowPanel');
  const count=document.getElementById('after14NoShowCount');
  const list=document.getElementById('after14NoShowList');
  if(panel){
    panel.classList.toggle('show',data.length>0);
    if(count)count.textContent=`${data.length} ${data.length===1?'najava':'najava'}`;
    if(list)list.innerHTML=data.map(a=>`<div class="after14-alert-item">
      <b>${a.supplier}</b>
      <span>${a.time}</span>
      <span>R${a.dock||'—'}</span>
      <span class="no-show-after14-badge">NIJE DOŠAO · KASNI ${exactDelayTextFromPlan(a)}</span>
    </div>`).join('');
  }

  const ops=document.getElementById('after14OperationsList');
  if(ops){
    ops.innerHTML=data.length
      ? `<div class="after14-alert-list">${data.map(a=>`<div class="after14-alert-item">
          <b>${a.supplier}</b>
          <span>${a.date} ${a.time}</span>
          <span>R${a.dock||'—'}</span>
          <span class="no-show-after14-badge">NIJE DOŠAO · KASNI ${exactDelayTextFromPlan(a)}</span>
        </div>`).join('')}</div>`
      : `<div class="overview-empty">Nema današnjih NO-SHOW upozorenja nakon ${String(window.YardivoDelayRulesV1?.get?.().noShowAt||'14:00')}.</div>`;
  }

  const badge=document.getElementById('opsAlertBadge');
  if(badge)badge.textContent=data.length;
}

function operationalPlanStatus(a){
  // If a missed original slot was later rescheduled, keep it visibly purple.
  if(a.hadLateReschedule||a.rescheduledAfterNoShow)return 'Promijenjena nakon NO-SHOW';
  if(isAfter14NoShow(a))return 'NIJE DOŠAO';
  if(isNoShow(a))return 'NO-SHOW';
  if(!actualDateTime(a)){
    const plan=new Date(`${a.date}T${a.time}:00`);
    const mins=Math.floor((new Date()-plan)/60000);
    if(mins>=LATE_GRACE_MINUTES)return 'Kašnjenje';
  }
  return normalizedPlanStatus(a);
}

function yardivoUnifiedStatus(a){
  return operationalPlanStatus(a);
}
function yardivoMapDelayVisualClass(a){
  const s=yardivoUnifiedStatus(a);
  if(['NIJE DOŠAO','NO-SHOW','Zaprimljeno','Odbijen','Odbijeno','U dvorištu','Na rampi','Promijenjena nakon NO-SHOW'].includes(s))return '';
  if(typeof hasPhysicallyArrived==='function'&&hasPhysicallyArrived(a))return '';
  const mins=typeof frozenOrLiveLateMinutes==='function'?frozenOrLiveLateMinutes(a):0;
  if(!(mins>0))return '';
  let r={graceMinutes:15,orangeFrom:30,redFrom:60,criticalFrom:90};
  try{r={...r,...(window.YardivoDelayRulesV1?.get?.()||{})}}catch(_){}
  const grace=Number.isFinite(Number(r.graceMinutes))?Number(r.graceMinutes):15;
  const orange=Number.isFinite(Number(r.orangeFrom))?Number(r.orangeFrom):30;
  const red=Number.isFinite(Number(r.redFrom))?Number(r.redFrom):60;
  const critical=Number.isFinite(Number(r.criticalFrom))?Number(r.criticalFrom):90;
  if(mins<grace)return '';
  if(mins<orange)return 'yv-delay-level-1';
  if(mins<red)return 'yv-delay-level-2';
  if(mins<critical)return 'yv-delay-level-3';
  return 'yv-delay-level-4';
}
function yardivoUnifiedStatusClass(a){
  const s=yardivoUnifiedStatus(a);
  let base='status-u-dolasku';
  if(s==='Promijenjena nakon NO-SHOW')base='status-promijenjena';
  else if(s==='NIJE DOŠAO'||s==='NO-SHOW')base='status-nije-dosao status-no-show';
  else if(s==='Kasni'||s==='Kašnjenje')base='status-kasni';
  else if(s==='U dvorištu')base='status-u-dvorištu';
  else if(s==='Na rampi')base='status-na-rampi';
  else if(s==='Zaprimljeno')base='status-zaprimljeno';
  else if(s==='Odbijen'||s==='Odbijeno')base='status-odbijen';
  const delay=yardivoMapDelayVisualClass(a);
  return (base+(delay?' '+delay:'')).trim();
}
function yardivoStatusLegendHtml(){
  return `<div class="yardivo-status-legend">
    <span><i style="background:#0e5fa8"></i>U dolasku</span>
    <span><i style="background:#f2ae38"></i>Kasni</span>
    <span><i style="background:#a94f0d"></i>U dvorištu</span>
    <span><i style="background:#8b6d0a"></i>Na rampi</span>
    <span><i style="background:#126b34"></i>Zaprimljeno</span>
    <span><i style="background:#c61d2b"></i>NO-SHOW</span>
    <span><i style="background:#64151d"></i>Odbijeno</span>
    <span><i style="background:#6340a8"></i>Promijenjena</span>
  </div>`;
}

function operationalPlanClass(a){
  return yardivoUnifiedStatusClass(a);
}
function yardivoMapDelayLabel(a){
  try{
    const s=yardivoUnifiedStatus(a);
    if(['NIJE DOŠAO','NO-SHOW'].includes(s))return 'NO-SHOW';
    if(typeof hasPhysicallyArrived==='function'&&hasPhysicallyArrived(a))return operationalDelayText(a)||'';
    const m=typeof frozenOrLiveLateMinutes==='function'?frozenOrLiveLateMinutes(a):0;
    return m>0?`KASNI ${compactLateDuration(m)}`:(operationalDelayText(a)||'');
  }catch(_){return operationalDelayText(a)||''}
}

function normalizedPlanStatus(a){
  const s=String(a.status||'U dolasku').toLowerCase();
  if(s.includes('odbij'))return 'Odbijen';
  if(s.includes('zaprim')||s.includes('završ')||s.includes('izasao')||s.includes('izašao'))return 'Zaprimljeno';
  if(s.includes('dvori'))return 'U dvorištu';
  if(s.includes('rampi')||s.includes('dock'))return 'Na rampi';
  return 'U dolasku';
}
function statusClassForPlan(a){
  return 'status-'+normalizedPlanStatus(a).toLowerCase().replace(/\s+/g,'-');
}
window.setContextAnnouncementStatus=function(status){
  if(!canChangeReceptionStatus()){alert('Status dolaska i prijama može mijenjati samo Prijam robe ili Admin.');return}
  const id=contextAnnouncementId;
  const a=announcements.find(x=>x.id===id);if(!a)return;
  a.status=status;
  if(status!=='U dvorištu' && a.yardPosition)a.yardPosition='';
  if(status==='Na rampi'&&!a.actualDate){
    const now=new Date();a.actualDate=isoLocal(now);a.actualTime=now.toTimeString().slice(0,5);
  }
  a.statusUpdatedAt=new Date().toISOString();
  saveAnnouncements();closeAnnouncementContextMenu();render();if(typeof renderYard==='function')renderYard();if(typeof renderReceiving==='function')renderReceiving();refreshRecommendation();
}

function renderAnnouncementSchedule(){
  const host=document.getElementById('announcementSchedule');if(!host)return;
  const date=document.getElementById('annDate')?.value;
  const warehouse=document.getElementById('annWarehouse')?.value;
  const w=WAREHOUSES[warehouse];

  if(date&&isWeekendIsoEarly(date)){document.getElementById('annScheduleLabel').textContent=date+' · VIKEND';host.innerHTML='<div class="overview-empty">Subotom i nedjeljom nema prijama robe.</div>';return}
  if(date&&holidayNameEarly(date)){document.getElementById('annScheduleLabel').textContent=date+' · DRŽAVNI PRAZNIK';host.innerHTML=`<div class="overview-empty">${holidayNameEarly(date)} — nema prijama robe.</div>`;return}

  if(!date||!warehouse){
    document.getElementById('annScheduleLabel').textContent='Odaberi datum i skladište';
    host.innerHTML='<div class="overview-empty">Raspored će se prikazati nakon odabira datuma i skladišta.</div>';
    return;
  }
  if(!w?.ramps||!w.receptionStart||!w.receptionEnd){
    document.getElementById('annScheduleLabel').textContent=whLabel(warehouse);
    host.innerHTML='<div class="overview-empty">Za ovo skladište još nisu definirane rampe i vrijeme prijama.</div>';
    return;
  }

  const ws=toMin(w.receptionStart),we=toMin(w.receptionEnd),slots=Math.ceil((we-ws)/15);
  const previewDock=Number(document.getElementById('annDock')?.value||0),previewTime=document.getElementById('annTime')?.value||'';
  const previewStart=previewTime?toMin(previewTime):null;
  const previewDuration=Number(document.getElementById('annPallets')?.value)?unloadDuration(Number(document.getElementById('annPallets').value)):0;

  document.getElementById('annScheduleLabel').textContent=`${date} · ${whLabel(warehouse)} · ${w.receptionStart}–${w.receptionEnd}`;
  const heads=Array.from({length:slots},(_,i)=>hhmm(ws+i*15));
  let html=`<div class="schedule-grid" style="grid-template-columns:70px repeat(${slots},minmax(29px,1fr))"><div class="head">RAMPA</div>`+heads.map(x=>`<div class="head">${x}</div>`).join('');
  for(let dock=1;dock<=w.ramps;dock++){
    html+=`<div class="ramp">R${dock}</div>`;
    for(let i=0;i<slots;i++){
      const m=ws+i*15;
      const block=(typeof rampBlocks!=='undefined')?rampBlocks.find(b=>b.warehouse===warehouse&&b.date===date&&Number(b.dock)===dock&&m>=toMin(b.from)&&m<toMin(b.to)):null;
      const a=announcements.find(x=>(x.warehouse||yardivoCanonicalWarehouseV583())===warehouse&&x.date===date&&Number(x.dock)===dock&&toMin(x.time)===m);
      const isPreview=previewDock===dock&&previewStart===m&&isSlobodna(date,dock,m,previewDuration,editingAnnouncementId,warehouse);
      if(isPreview){
        const span=Math.max(1,Math.ceil(previewDuration/15));
        html+=`<div class="booked preview-booking" style="grid-column:span ${span}" title="Ručni odabir">PREGLED · R${dock}</div>`;i+=span-1;
      }else if(a){
        const span=Math.max(1,Math.ceil(a.duration/15));
        html+=`<div class="booked ${operationalPlanClass(a)}" draggable="true" data-announcement-id="${a.id}" data-move-date="${date}" data-move-warehouse="${warehouse}" data-move-dock="${dock}" data-move-time="${hhmm(m)}" oncontextmenu="openAnnouncementContextMenu(event,${a.id})" style="grid-column:span ${span}" title="Povuci za promjenu termina · Desni klik za opcije · ${a.supplier} · ${a.pallets} pal">${a.time} · ${a.supplier}<br><small>${truckCountForPallets(a.pallets)} kam.</small><span class="booking-status">${operationalPlanStatus(a).toUpperCase()}</span>${operationalDelayText(a)?`<span class="booking-delay-detail">${operationalDelayText(a)}</span>`:''}</div>`;i+=span-1;
      }else if(block){
        let span=Math.max(1,Math.ceil((toMin(block.to)-m)/15));
        html+=`<div class="booked blocked" data-move-date="${date}" data-move-warehouse="${warehouse}" data-move-dock="${dock}" data-move-time="${hhmm(m)}" data-move-blocked="1" style="grid-column:span ${span}" title="${block.reason}">BLOKIRANO</div>`;i+=span-1;
      }else html+=`<div class="freecell" data-move-date="${date}" data-move-warehouse="${warehouse}" data-move-dock="${dock}" data-move-time="${hhmm(m)}"></div>`;
    }
  }
  host.innerHTML=html+'</div>';
}
document.getElementById('checkAnnouncement')?.addEventListener('click',validateAnnouncement);
document.getElementById('useRecommendation')?.addEventListener('click',()=>{
  document.getElementById('annDock').value='';
  document.getElementById('annTime').value='';
  const rec=refreshRecommendation();
  if(rec)setAnnMessage('good','Koristi se preporuka',`Rampa ${rec.dock} · ${rec.time}–${hhmm(rec.start+rec.duration)}.`);
});
['annDate','annPallets','annSku'].forEach(id=>document.getElementById(id)?.addEventListener('input',refreshRecommendation));
document.getElementById('annWarehouse')?.addEventListener('change',refreshRecommendation);
document.getElementById('annSupplier')?.addEventListener('change',refreshRecommendation);
document.getElementById('annResponsible')?.addEventListener('change',e=>e.target.classList.remove('required-error'));
['annDock','annTime'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>{validateAnnouncement();renderAnnouncementSchedule()}));
document.getElementById('announcementForm')?.addEventListener('submit',e=>{
  e.preventDefault();
  applyAnnouncementSlot('auto');
});
document.getElementById('saveManualAnnouncement')?.addEventListener('click',()=>applyAnnouncementSlot('manual'));

function tick(){
  const n=new Date();
  const time=n.toLocaleTimeString('hr-HR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const clock=document.getElementById('clock');if(clock)clock.textContent=time;
  const terminalClock=document.getElementById('terminalClock');if(terminalClock)terminalClock.textContent=time.slice(0,5);
  const dateEl=document.getElementById('date');if(dateEl)dateEl.textContent=n.toLocaleDateString('hr-HR');
}
tick();setInterval(tick,1000);populateSuppliers();populateAnnouncementControls();populateIncidentControls();refreshRecommendation();
document.addEventListener('DOMContentLoaded',()=>{render();setInterval(render,180000);});

  