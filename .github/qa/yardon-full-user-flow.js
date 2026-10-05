const { chromium } = require('playwright');

const HOST='https://ldzwgdwzolbvjxyznlry.supabase.co';
const MASTER={
  locations:[{id:'LOC001',name:'QA Lokacija',active:true}],
  warehouses:[{
    id:'W001',name:'W201 Dugopolje',location_id:'LOC001',active:true,
    ramps:2,reception_from:'06:00',reception_to:'14:00',daily_pallet_capacity:400,
    ramp_settings:[
      {number:1,name:'Rampa 1',active:true,pallets_per_hour:30,max_pallets:200},
      {number:2,name:'Rampa 2',active:true,pallets_per_hour:30,max_pallets:200}
    ]
  }],
  suppliers:[{id:'SUP001',name:'QA Dobavljač',active:true}]
};
const state={deliveries:[],gateDecision:null,requests:[]};
const stamp=()=>new Date().toISOString();
const cors={
  'access-control-allow-origin':'*',
  'access-control-allow-headers':'authorization,apikey,content-type,x-client-info',
  'access-control-allow-methods':'GET,POST,PATCH,PUT,DELETE,OPTIONS'
};
const copy=x=>JSON.parse(JSON.stringify(x));

function deliveryByServer(id){return state.deliveries.find(x=>String(x.id)===String(id))}
function deliveryByClient(id){return state.deliveries.find(x=>String(x.client_id)===String(id))}
function updateDelivery(row,patch){Object.assign(row,patch,{updated_at:stamp()});return copy(row)}

async function routeBackend(context){
  await context.route(HOST+'/**',async route=>{
    const req=route.request();
    if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    const url=new URL(req.url());
    const fn=(url.pathname.split('/functions/v1/')[1]||'').split('/')[0];
    let body={};
    try{body=req.postDataJSON()||{}}catch(_){try{body=JSON.parse(req.postData()||'{}')}catch(__){body={}}}
    state.requests.push({fn,body:copy(body)});
    const ok=(data,status=200)=>route.fulfill({status,contentType:'application/json',headers:cors,body:JSON.stringify(data)});

    if(fn==='yardivo-user-scope'){
      return ok({ok:true,data:{
        app_role:'supplier',location:'LOC001',location_ids:['LOC001'],warehouse_ids:['W001'],
        locations:copy(MASTER.locations),warehouses:copy(MASTER.warehouses)
      }});
    }
    if(fn==='yardivo-supplier-availability'){
      return ok({ok:true,data:{closed_day:false,slots:[
        {ramp_number:1,ramp:'Rampa 1',start:'10:00',end:'10:30',occupied:false,selectable:true,recommended:true},
        {ramp_number:2,ramp:'Rampa 2',start:'10:00',end:'10:30',occupied:false,selectable:true,recommended:false}
      ]}});
    }
    if(fn==='yardivo-supplier-time-ops'||fn==='yardivo-supplier-deliveries'){
      const action=String(body.action||'');
      if(action==='upsert'){
        let row=deliveryByClient(body.client_id);
        if(!row){
          row={
            id:'DEL-001',client_id:String(body.client_id),supplier_username:'qa_supplier',supplier_name:'QA Dobavljač',
            location:String(body.location||'LOC001'),warehouse:String(body.warehouse||'W001'),
            order_number:String(body.order_number||''),delivery_date:String(body.delivery_date||''),
            requested_time:String(body.requested_time||''),dock:String(body.dock||''),
            pallets:Number(body.pallets||0),sku_count:Number(body.sku_count||0),
            vehicle_plate:String(body.vehicle_plate||''),trailer_plate:String(body.trailer_plate||''),
            driver_name:String(body.driver_name||''),driver_contact:String(body.driver_contact||''),
            delivery_note:String(body.delivery_note||''),note:String(body.note||''),review_note:'',
            status:'pending',created_at:stamp(),updated_at:stamp()
          };
          state.deliveries.push(row);
        }else updateDelivery(row,body);
        return ok({ok:true,data:copy(row)});
      }
      if(action==='list_mine'||action==='list_internal')return ok({ok:true,data:copy(state.deliveries)});
      if(action==='internal_update'){
        const row=deliveryByServer(body.id);
        if(!row)return ok({ok:false,error:'DELIVERY_NOT_FOUND'},404);
        const patch={...body};delete patch.action;delete patch.id;
        return ok({ok:true,data:updateDelivery(row,patch)});
      }
      if(action==='supplier_accept'){
        const row=deliveryByClient(body.client_id);
        if(!row)return ok({ok:false,error:'DELIVERY_NOT_FOUND'},404);
        return ok({ok:true,data:updateDelivery(row,{status:'confirmed'})});
      }
      if(action==='supplier_alternative'){
        const row=deliveryByClient(body.client_id);
        if(!row)return ok({ok:false,error:'DELIVERY_NOT_FOUND'},404);
        return ok({ok:true,data:updateDelivery(row,{status:'revision_requested',review_note:String(body.note||'')})});
      }
      if(action==='vehicle'){
        const row=deliveryByClient(body.client_id);
        if(!row)return ok({ok:false,error:'DELIVERY_NOT_FOUND'},404);
        const patch={...body};delete patch.action;
        return ok({ok:true,data:updateDelivery(row,patch)});
      }
      return ok({ok:true,data:{}});
    }
    if(fn==='yardivo-self-gate'){
      const action=String(body.action||'');
      const row=state.deliveries[0];
      if(action==='list_gate'){
        const waiting=row&&['confirmed','arrival'].includes(String(row.status))&&state.gateDecision!=='APPROVE';
        return ok({ok:true,rows:waiting?[{
          id:'GATE-001',state:'WAITING_GATE',supplier:row.supplier_name,warehouse:row.warehouse,
          announcement_id:row.id,announcement_ref:row.client_id,plate:row.vehicle_plate,driver:row.driver_name,
          delivery_date:row.delivery_date,requested_time:row.requested_time,dock:row.dock,parking_slot:'P1'
        }]:[]});
      }
      if(action==='gate_decide'){
        state.gateDecision=String(body.decision||'');
        if(row&&state.gateDecision==='APPROVE')updateDelivery(row,{status:'arrival'});
        return ok({ok:true,state:state.gateDecision==='APPROVE'?'PROCEED_DOCK':'REJECTED'});
      }
      return ok({ok:true});
    }
    if(fn==='yardivo-sync'){
      if(body.action==='bootstrap')return ok({ok:true,state:[{key:'yardivo_qr_scan_cfg_v583',deleted:false,value_json:JSON.stringify({enabled:false,byWarehouse:{W001:{enabled:false}}})}]});
      return ok({ok:true});
    }
    if(url.pathname.includes('/rest/v1/'))return ok([]);
    if(url.pathname.includes('/auth/v1/'))return ok({});
    return ok({ok:true,data:{}});
  });
  if(typeof context.routeWebSocket==='function')await context.routeWebSocket('wss://ldzwgdwzolbvjxyznlry.supabase.co/**',ws=>ws.close());
}

const sessions={
  supplier:{user:'qa_supplier',username:'qa_supplier',authUserId:'SUP-QA',role:'supplier',app_role:'supplier',location:'LOC001',warehouses:['W001'],serverAuthorized:true},
  inventory:{user:'qa_inventory',username:'qa_inventory',role:'inventory',app_role:'inventory',location:'LOC001',warehouses:['W001'],serverAuthorized:true},
  gate:{user:'qa_gate',username:'qa_gate',role:'gate',app_role:'gate',location:'LOC001',warehouses:['W001'],serverAuthorized:true},
  reception:{user:'qa_reception',username:'qa_reception',role:'reception',app_role:'reception',location:'LOC001',warehouses:['W001'],serverAuthorized:true}
};

async function makePage(browser,role){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await routeBackend(context);
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e.message||e)));
  await page.addInitScript(()=>{
    document.addEventListener('DOMContentLoaded',()=>{
      const keepAuthenticated=()=>{
        const overlay=document.getElementById('loginOverlay');
        if(overlay){overlay.style.setProperty('display','none','important');overlay.style.setProperty('pointer-events','none','important');overlay.setAttribute('aria-hidden','true')}
        const splash=document.getElementById('yardivoWelcomeSplash');
        if(splash){splash.style.setProperty('display','none','important');splash.style.setProperty('pointer-events','none','important')}
      };
      keepAuthenticated();
      const observer=new MutationObserver(keepAuthenticated);
      observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','aria-hidden']});
      window.__qaAuthOverlayObserver=observer;
    },{once:true});
  });
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(1500);
  await page.evaluate(({session,role,master})=>{
    window.__yardivoSupplierAccessToken='qa-token';
    localStorage.setItem('yardivo_master_data_registry_v583',JSON.stringify(master));
    localStorage.setItem('yardivo_qr_scan_cfg_v583',JSON.stringify({enabled:false,byWarehouse:{W001:{enabled:false}}}));
    localStorage.setItem('yardivo_ramp_qr_mobile_v1','0');
    localStorage.setItem('yardivo_active_warehouse','W001');
    localStorage.setItem('studenac_active_warehouse','W001');
    localStorage.setItem('yardivo_operational_warehouse_v1','W001');
    window.currentSession={...session};
    try{currentSession=window.currentSession}catch(_){}
    window.activeWarehouse='W001';
    try{activeWarehouse='W001'}catch(_){}
    try{
      if(window.YardivoAppStateV583){
        window.YardivoAppStateV583.master=()=>master;
        window.YardivoAppStateV583.location=()=> 'LOC001';
        window.YardivoAppStateV583.warehouse=()=> 'W001';
      }
    }catch(_){}
    try{if(window.YardivoMasterDataService)window.YardivoMasterDataService.read=()=>master}catch(_){}
    const gw=document.getElementById('globalWarehouse');
    if(gw){
      if(![...gw.options].some(o=>o.value==='W001'))gw.add(new Option('W201 Dugopolje','W001'));
      gw.value='W001';
    }
    document.documentElement.dataset.yardivoRole=role;
    document.body.dataset.yardivoRole=role;
    document.body.classList.remove('yardivo-role-switching','yardivo-prelogin');
    [...document.body.classList].filter(x=>/^yv-role-.*-v583$/.test(x)).forEach(x=>document.body.classList.remove(x));
    document.body.classList.add('yv-role-'+role+'-v583');
    document.documentElement.classList.add('yardivo-login-ready','yardivo-welcome-complete');
    const overlay=document.getElementById('loginOverlay');
    if(overlay){overlay.style.setProperty('display','none','important');overlay.style.setProperty('pointer-events','none','important');overlay.setAttribute('aria-hidden','true')}
    const splash=document.getElementById('yardivoWelcomeSplash');
    if(splash){splash.style.setProperty('display','none','important');splash.style.setProperty('pointer-events','none','important')}
    const shell=document.querySelector('.app-shell');
    if(shell){shell.style.setProperty('display','grid','important');shell.style.setProperty('visibility','visible','important')}
    window.dispatchEvent(new CustomEvent('yardivo:master-data-updated',{detail:{master}}));
    window.dispatchEvent(new CustomEvent('yardivo:login',{detail:{session:window.currentSession}}));
    window.dispatchEvent(new CustomEvent('yardivo:online-ready'));
    window.dispatchEvent(new CustomEvent('yardivo:context-changed',{detail:{warehouse:'W001',location:'LOC001'}}));
  },{session:sessions[role],role,master:MASTER});
  await page.waitForTimeout(900);
  return {context,page,errors};
}

async function showView(page,id){
  await page.evaluate(id=>{
    try{window.YardivoRoleStableFinal?.open?.(id)}catch(_){}
    try{window.openAppView?.(id)}catch(_){}
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    const el=document.getElementById(id);
    if(el){el.classList.add('active');el.classList.remove('role-hidden');el.removeAttribute('hidden');el.style.setProperty('display','block','important');el.style.setProperty('visibility','visible','important')}
    window.dispatchEvent(new CustomEvent('yardivo:view-opened',{detail:{view:id}}));
  },id);
  await page.waitForTimeout(180);
}

function critical(errors){return errors.filter(x=>!/rampInfo is not defined/i.test(x))}
function expect(cond,msg){if(!cond)throw new Error(msg)}

(async()=>{
  const browser=await chromium.launch({headless:true});
  const checkpoints=[];

  // 1) Supplier creates a real booking through the booking UI.
  {
    const {context,page,errors}=await makePage(browser,'supplier');
    page.on('dialog',async d=>{await d.accept()});
    await showView(page,'yardivoSupplierPortal');
    await page.locator('#yardivoSupplierPortal [data-ysp-view="new"]').click().catch(()=>{});
    await page.waitForTimeout(700);
    const day=page.locator('#sbnCalendar .sbn-day:not(.blank):not(.weekend):not([disabled])').first();
    await day.waitFor({state:'visible',timeout:8000});
    await day.click();
    await page.waitForFunction(()=>document.querySelectorAll('#sbnLocationSelect option').length>1,{timeout:8000});
    await page.selectOption('#sbnLocationSelect','LOC001');
    await page.waitForFunction(()=>[...document.querySelectorAll('#sbnWarehouseSelect option')].some(o=>o.value==='W001'&&!o.disabled),{timeout:8000});
    await page.selectOption('#sbnWarehouseSelect','W001');
    await page.fill('#sbnPallets','12');
    await page.fill('#sbnSku','4');
    await page.fill('#sbnOrder','PO-QA-001');
    await page.fill('#sbnPlate','ZG123QA');
    await page.fill('#sbnDriver','QA Vozač');
    await page.locator('#sbnPallets').dispatchEvent('input');
    await page.locator('#sbnSku').dispatchEvent('input');
    const slot=page.locator('#sbnMap .sbn-slot.free').first();
    await slot.waitFor({state:'visible',timeout:10000});
    await slot.click();
    await page.locator('#sbnSend').click();
    await page.waitForTimeout(500);
    expect(state.deliveries.length===1,'Supplier booking did not create exactly one server delivery');
    expect(state.deliveries[0].status==='pending','Supplier booking initial status is not pending');
    expect(state.deliveries[0].warehouse==='W001','Supplier booking warehouse mismatch');
    expect(state.deliveries[0].vehicle_plate==='ZG123QA','Supplier vehicle plate was not persisted');
    checkpoints.push('SUPPLIER_CREATED_PENDING');
    if(critical(errors).length)throw new Error('Supplier page errors: '+critical(errors).join(' | '));
    await context.close();
  }

  // 2) Inventory sees the same supplier request and proposes a dock/time.
  {
    const {context,page,errors}=await makePage(browser,'inventory');
    await showView(page,'supplierRequests');
    await page.evaluate(async()=>{await window.YardivoSupplierRequests?.load?.();window.YardivoSupplierRequests?.render?.()});
    const rowButton=page.locator('#ysrBody button[data-a="proposal"][data-id="DEL-001"]');
    await rowButton.waitFor({state:'visible',timeout:8000});
    const proposalDate=state.deliveries[0].delivery_date;
    const answers=[proposalDate,'10:00','R1'];
    page.on('dialog',async d=>{if(d.type()==='prompt')await d.accept(answers.shift()||'');else await d.accept()});
    await rowButton.click();
    await page.waitForTimeout(600);
    expect(state.deliveries[0].status==='proposal_sent','Inventory proposal did not set proposal_sent');
    expect(state.deliveries[0].dock==='R1','Inventory proposal did not assign R1');
    expect(String(state.deliveries[0].requested_time).slice(0,5)==='10:00','Inventory proposal did not assign 10:00');
    checkpoints.push('INVENTORY_PROPOSED_SLOT');
    if(critical(errors).length)throw new Error('Inventory page errors: '+critical(errors).join(' | '));
    await context.close();
  }

  // 3) Supplier sees Inventory proposal and accepts it through the portal button.
  {
    const {context,page,errors}=await makePage(browser,'supplier');
    page.on('dialog',async d=>{await d.accept()});
    await showView(page,'yardivoSupplierPortal');
    await page.evaluate(async()=>{await window.YardivoSupplierLiveSync?.pullSupplier?.()});
    await page.locator('#yardivoSupplierPortal [data-ysp-view="status"]').click();
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('yardivo:data-synced')));
    const accept=page.locator('[data-ysp-accept-proposal]').first();
    await accept.waitFor({state:'visible',timeout:8000});
    await accept.click();
    await page.waitForTimeout(700);
    expect(state.deliveries[0].status==='confirmed','Supplier acceptance did not set confirmed');
    checkpoints.push('SUPPLIER_CONFIRMED');
    if(critical(errors).length)throw new Error('Supplier confirmation page errors: '+critical(errors).join(' | '));
    await context.close();
  }

  // 4) Gate sees the confirmed truck and approves entry through Gate UI.
  {
    const {context,page,errors}=await makePage(browser,'gate');
    await showView(page,'checkin');
    await page.waitForTimeout(1200);
    const approve=page.locator('button[data-approve="GATE-001"]');
    await approve.waitFor({state:'visible',timeout:10000});
    await approve.click();
    await page.waitForTimeout(500);
    expect(state.gateDecision==='APPROVE','Gate did not record APPROVE');
    expect(state.deliveries[0].status==='arrival','Gate approval did not advance supplier delivery to arrival');
    checkpoints.push('GATE_APPROVED_ARRIVAL');
    if(critical(errors).length)throw new Error('Gate page errors: '+critical(errors).join(' | '));
    await context.close();
  }

  // 5) Reception pulls the same canonical delivery, moves it to dock and completes receiving via UI.
  {
    const {context,page,errors}=await makePage(browser,'reception');
    await page.evaluate(async()=>{
      localStorage.setItem('yardivo_qr_scan_cfg_v583',JSON.stringify({enabled:false,byWarehouse:{W001:{enabled:false}}}));
      localStorage.setItem('yardivo_ramp_qr_mobile_v1','0');
      await window.YardivoSupplierLiveSync?.pullInternal?.(true);
    });
    await showView(page,'receiving');
    await page.evaluate(()=>{try{renderReceiving()}catch(_){}});
    const receivingRow=page.locator('.receiving-row[data-receiving-announcement-id]').filter({hasText:'QA Dobavljač'}).first();
    await receivingRow.waitFor({state:'visible',timeout:8000});
    const mirrored=await page.evaluate(()=>{try{return announcements.find(x=>String(x.supplierDeliveryId||'')==='DEL-001')||null}catch(_){return null}});
    expect(!!mirrored,'Reception did not mirror confirmed/arrival supplier delivery');
    expect(String(mirrored.status)==='Stigao','Reception mirror did not start at Stigao for arrival');
    await receivingRow.click();
    const toDock=page.locator('#yardivoReceivingModal button[data-status="Na rampi"]');
    await toDock.waitFor({state:'visible',timeout:5000});
    expect(await toDock.isEnabled(),'Reception Na rampi button is unexpectedly disabled');
    await toDock.click();
    await page.waitForTimeout(900);
    expect(state.deliveries[0].status==='dock','Reception Na rampi did not sync supplier delivery to dock');
    const done=page.locator('#yardivoReceivingModal button[data-status="Zaprimljeno"]');
    await done.waitFor({state:'visible',timeout:5000});
    await done.click();
    await page.waitForTimeout(1000);
    expect(state.deliveries[0].status==='completed','Reception completion did not sync supplier delivery to completed');
    const localDone=await page.evaluate(()=>{try{return announcements.find(x=>String(x.supplierDeliveryId||'')==='DEL-001')?.status||''}catch(_){return''}});
    expect(localDone==='Zaprimljeno','Reception local announcement did not finish as Zaprimljeno');
    checkpoints.push('RECEPTION_COMPLETED');
    if(critical(errors).length)throw new Error('Reception page errors: '+critical(errors).join(' | '));
    await context.close();
  }

  // 6) Supplier sees final completed status in server-backed history.
  {
    const {context,page,errors}=await makePage(browser,'supplier');
    page.on('dialog',async d=>{await d.accept()});
    await showView(page,'yardivoSupplierPortal');
    await page.evaluate(async()=>{await window.YardivoSupplierLiveSync?.pullSupplier?.()});
    await page.locator('#yardivoSupplierPortal [data-ysp-view="history"]').click();
    await page.waitForTimeout(700);
    const text=await page.locator('#yspHistoryBody').innerText().catch(()=>page.locator('#yspHistoryList').innerText());
    expect(/ZAPRIMLJENO/i.test(text),'Supplier history does not show final ZAPRIMLJENO status');
    const mine=await page.evaluate(()=>window.YardivoSupplierLiveSync?.mineRows?.()||[]);
    expect(mine.some(x=>String(x.id)==='DEL-001'&&String(x.status)==='completed'),'Supplier server list does not expose completed row');
    checkpoints.push('SUPPLIER_SEES_COMPLETED');
    if(critical(errors).length)throw new Error('Supplier final page errors: '+critical(errors).join(' | '));
    await context.close();
  }

  await browser.close();
  const final=state.deliveries[0];
  expect(final&&final.status==='completed','Final canonical supplier delivery status is not completed');
  expect(state.deliveries.length===1,'Flow created duplicate supplier deliveries');
  console.log('YARDON_FULL_USER_FLOW_QA_PASS '+JSON.stringify({checkpoints,delivery:{id:final.id,client_id:final.client_id,status:final.status,warehouse:final.warehouse,dock:final.dock,time:final.requested_time,plate:final.vehicle_plate},gateDecision:state.gateDecision}));
})().catch(e=>{console.error('YARDON_FULL_USER_FLOW_QA_FAIL',e);process.exit(1)});
