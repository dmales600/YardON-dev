
(function(){
  let applying=false;
  let queued=false;

  function role(){
    let r='';
    try{r=String(currentSession?.role||window.currentSession?.role||'').toLowerCase().trim()}catch(e){}
    if(r==='zalihe'||r==='upravljanje zalihama')r='inventory';
    if(r==='management'||r==='voditelj')r='manager';
    if(r==='prijam')r='reception';
    if(r==='porta'||r==='portir')r='gate';
    return r;
  }

  function selectedWarehouse(){
    const sel=document.getElementById('globalWarehouse');
    const selected=String(sel?.value||'').trim();
    if(selected&&selected!=='ALL')return selected;
    try{
      const canonical=String(window.YardivoAppStateV583?.warehouse?.()||'').trim();
      if(canonical&&canonical!=='ALL')return canonical;
    }catch(_){}
    const active=String(window.activeWarehouse||'').trim();
    return active&&active!=='ALL'?active:'';
  }

  function locationWarehouses(){
    try{
      const d=window.YardivoAppStateV583?.master?.()||{warehouses:[]};
      const loc=String(window.YardivoAppStateV583?.location?.()||'');
      return (d.warehouses||[]).filter(w=>w&&w.active!==false&&String(w.location_id)===loc).map(w=>String(w.id));
    }catch(_){return[]}
  }

  function setSelectValue(id,value,{notify=false}={}){
    const sel=document.getElementById(id);
    if(!sel)return false;
    if(![...sel.options].some(o=>o.value===value))return false;
    if(String(sel.value)===String(value))return false;
    sel.value=value;
    if(notify)sel.dispatchEvent(new Event('change',{bubbles:false}));
    return true;
  }

  function syncDependentSelectors(wh){
    // Header is authoritative. Dependent selectors follow silently so they do
    // not create change-event feedback loops and repeated full renders.
    setSelectValue('savedWarehouseFilter',wh);
    setSelectValue('dailyMapWarehouseSelect',wh);
    setSelectValue('weeklyMapWarehouse',wh);
    ['receivingWarehouse','receivingWarehouseSelect','receivingWarehouseFilter'].forEach(id=>setSelectValue(id,wh));
    setSelectValue('incWarehouse',wh);

    const ann=document.getElementById('annWarehouse');
    if(ann && [...ann.options].some(o=>o.value===wh) && !ann.dataset.userChanged && String(ann.value)!==String(wh))ann.value=wh;
  }

  function renderWarehouseAware(){
    // Do not call the global render() here. It redraws several unrelated views
    // and was a major source of visible flicker when changing/opening sections.
    const active=document.querySelector('.view.active')?.id||'';
    try{if(active==='announcements')renderAnnouncements?.()}catch(e){}
    try{if(active==='receiving')renderReceiving?.()}catch(e){}
    try{if(active==='dailyMap')renderDailyMap?.()}catch(e){}
    try{if(active==='weeklyMap')renderWeeklyMap?.()}catch(e){}
    try{if(active==='docks'||active==='ramps')renderRampe?.()}catch(e){}
    try{if(active==='myYard'||active==='yard')renderYard?.()}catch(e){}
    try{if(active==='overview')renderOverview?.()}catch(e){}
    try{if(active==='incidents')renderIncidents?.()}catch(e){}
    try{if(active==='controlTower')window.YardivoControlTower?.render?.()}catch(e){}
  }

  function setCanonicalWarehouse(wh){
    wh=String(wh||'').trim();
    if(!wh)return false;
    const previous=String(window.activeWarehouse||'').trim();
    try{window.activeWarehouse=wh;activeWarehouse=wh}catch(_){window.activeWarehouse=wh}
    try{if(safeStorage?.getItem?.('studenac_active_warehouse')!==wh)safeStorage?.setItem?.('studenac_active_warehouse',wh)}catch(_){}
    if(wh!=='ALL'){
      try{
        if(String(window.YardivoAppStateV583?.warehouse?.()||'')!==wh)window.YardivoAppStateV583?.setWarehouse?.(wh);
      }catch(_){}
    }
    return previous!==wh;
  }

  function applyGlobalWarehouse({render=true}={}){
    if(applying)return;
    const sel=document.getElementById('globalWarehouse');
    if(!sel)return;
    applying=true;
    try{
      if(role()==='gate'){
        setCanonicalWarehouse('ALL');
        const info=document.getElementById('globalWarehouseInfo');
        if(info){
          const n=window.YardivoAppStateV583?.locationName?.(window.YardivoAppStateV583?.location?.())||'LOKACIJA';
          const text='SVA SKLADIŠTA · '+String(n).toUpperCase();
          if(info.textContent!==text)info.textContent=text;
        }
        try{window.renderPortaSharedAnnouncements?.()}catch(e){}
        try{window.renderPortaVerifiedList?.()}catch(e){}
        try{renderCheckinPro?.()}catch(e){}
        return;
      }

      const wh=sel.value==='ALL'?selectedWarehouse():String(sel.value||'').trim();
      if(!wh)return;
      const changed=setCanonicalWarehouse(wh);

      const info=document.getElementById('globalWarehouseInfo');
      if(info){
        const label=(typeof whLabel==='function'?whLabel(wh):window.YardivoGlobalContextV583?.warehouseName?.(wh)||wh).toUpperCase();
        if(info.textContent!==label)info.textContent=label;
      }

      syncDependentSelectors(wh);
      if(render||changed)renderWarehouseAware();
    }finally{
      applying=false;
    }
  }

  function scheduleApply(opts){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      applyGlobalWarehouse(opts);
    });
  }

  const oldRenderIncidents=window.renderIncidents || (typeof renderIncidents==='function'?renderIncidents:null);
  window.renderIncidents=function(){
    const table=document.getElementById('incidentTable');
    if(!table)return oldRenderIncidents?.();

    const wh=role()==='gate'?null:selectedWarehouse();
    const data=[...incidents]
      .filter(i=>!wh || (i.warehouse||'')===wh)
      .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.id||0)-Number(a.id||0));

    const count=document.getElementById('incidentCount');
    if(count)count.textContent=`${data.length} ${data.length===1?'incident':'incidenata'} · ${wh||'sva skladišta'}`;

    const badge=document.getElementById('incidentBadge');
    if(badge){badge.textContent=data.length;badge.style.display=data.length?'inline-flex':'none'}

    table.innerHTML=data.length?data.map(i=>`<tr>
      <td>${i.date||'—'}</td>
      <td><strong>${i.supplier||'—'}</strong><br><small>${i.warehouse||'—'}</small></td>
      <td><span class="incident-chip">${i.type||i.reason||'—'}</span></td>
      <td>${i.severity||'—'}</td>
      <td>${i.pallets||0}</td><td>${i.sku||0}</td>
      <td>${i.note||'—'}</td>
      <td><button class="action" onclick="deleteIncident(${i.id})">OBRIŠI</button></td>
    </tr>`).join(''):'<tr><td colspan="8"><div class="overview-empty">Nema evidentiranih incidenata za odabrano skladište.</div></td></tr>';

    const grouped={};
    data.forEach(i=>{const k=i.type||i.reason||'Ostalo';grouped[k]=(grouped[k]||0)+1});
    const max=Math.max(1,...Object.values(grouped));
    const sum=document.getElementById('incidentSummary');
    if(sum)sum.innerHTML=Object.keys(grouped).length
      ? Object.entries(grouped).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="supplier-bar"><div class="name">${k}</div><div class="bar-track"><div class="bar-fill" style="width:${v/max*100}%"></div></div><div class="bar-score">${v}</div></div>`).join('')
      : '<div class="overview-empty">Nema incidenata za odabrano skladište.</div>';
  };
  try{renderIncidents=window.renderIncidents}catch(e){}

  const originalOverview=window.renderOverview || (typeof renderOverview==='function'?renderOverview:null);
  if(originalOverview){
    window.renderOverview=function(){
      if(role()==='gate')return originalOverview.apply(this,arguments);
      const wh=selectedWarehouse();
      const allAnnouncements=announcements;
      const allIncidents=incidents;
      const filteredA=allAnnouncements.filter(a=>(a.warehouse||yardivoCanonicalWarehouseV583())===wh);
      const filteredI=allIncidents.filter(i=>(i.warehouse||'')===wh);
      try{
        announcements=filteredA;
        incidents=filteredI;
        return originalOverview.apply(this,arguments);
      }finally{
        announcements=allAnnouncements;
        incidents=allIncidents;
      }
    };
    try{renderOverview=window.renderOverview}catch(e){}
  }

  document.getElementById('annWarehouse')?.addEventListener('change',e=>{e.target.dataset.userChanged='1'});

  document.getElementById('globalWarehouse')?.addEventListener('change',()=>{
    const ann=document.getElementById('annWarehouse');
    if(ann)delete ann.dataset.userChanged;
    scheduleApply({render:true});
  },true);

  document.addEventListener('click',e=>{
    if(e.target.closest('[data-view],[data-home-target]'))setTimeout(()=>scheduleApply({render:false}),25);
  },true);

  window.addEventListener('yardivo:login',()=>setTimeout(()=>scheduleApply({render:true}),50));
  window.addEventListener('yardivo:context-changed',()=>scheduleApply({render:true}));
  window.addEventListener('yardivo:master-data-changed',()=>setTimeout(()=>scheduleApply({render:true}),30));
  window.addEventListener('load',()=>setTimeout(()=>scheduleApply({render:true}),150));

  window.YardivoWarehouseSync={
    apply:applyGlobalWarehouse,
    selected:selectedWarehouse,
    gateWarehouses:locationWarehouses,
    set:setCanonicalWarehouse
  };
})();
