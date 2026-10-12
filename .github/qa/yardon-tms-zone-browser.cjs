'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:960}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<!doctype html><html><body><div class="app-shell"><aside class="sidebar"><nav class="nav"><button data-view="dailyMap" class="nav-btn">Mapa</button></nav></aside><div id="homeMenuGrid"></div><main class="main"><section class="view active" id="homeMenu"></section></main></div><select id="globalWarehouse"><option value="W001">W001</option></select><h1 id="pageTitle"></h1></body></html>');
 await page.evaluate(()=>{
  const rows={yardon_tms_zones:[],yardon_tms_stores:[],yardon_tms_trips:[],yardon_tms_pallets:[]};
  window.__tmsTestRows=rows;
  window.currentSession={role:'dispatcher',warehouses:['W001']};
  window.YardivoRoleVisibility={apply(){}};
  window.YardivoRoleStableFinal={open(id){
   document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
   window.dispatchEvent(new CustomEvent('yardivo:view-opened',{detail:{view:id}}));
  }};
  function query(table,mode,payload){
   const conditions=[];let selected=false,single=false;
   const b={
    select(){if(mode==='update')selected=true;return b},
    eq(k,v){conditions.push([k,v]);return b},
    is(k,v){conditions.push([k,v]);return b},
    order(){return b},single(){single=true;return b},
    then(resolve,reject){try{
     const arr=rows[table];let data=arr.filter(row=>conditions.every(([k,v])=>row[k]===v));
     if(mode==='insert'){
       const x=Array.isArray(payload)?payload:[payload];
       data=x.map(z=>({...z,id:crypto.randomUUID(),created_at:new Date().toISOString()}));
       arr.push(...data);
     }else if(mode==='update'){data.forEach(x=>Object.assign(x,payload));if(!selected)data=null;
     }else if(mode==='delete'){rows[table]=arr.filter(x=>!data.includes(x));data=null;
     }else data=data.map(x=>({...x}));
     return Promise.resolve({data:single?data?.[0]:data,error:null}).then(resolve,reject);
    }catch(e){return Promise.resolve({data:null,error:{message:e.message}}).then(resolve,reject)}}
   };return b;
  }
  window.YardivoAuth={client:async()=>({from:t=>({
   select(){return query(t,'read')},insert:x=>query(t,'insert',x),update:x=>query(t,'update',x),delete:()=>query(t,'delete')
  })})};
  window.__mapClick=null;
  const shape={addTo(){return this},on(){return this},setLatLngs(){return this},bindPopup(){return this}};
  window.L={
    map:()=>({setView(){return this},on(type,cb){if(type==='click')window.__mapClick=cb;return this},invalidateSize(){},remove(){}}),
    tileLayer:()=>({...shape}),polygon:()=>({...shape}),polyline:()=>({...shape}),circleMarker:()=>({...shape})
  };
 });
 await page.addScriptTag({path:'modules/tms/dispatcher-v1.js'});
 await page.addScriptTag({path:'modules/tms/tms-zone-planner-v2.js'});
 await page.evaluate(()=>window.YardivoRoleStableFinal.open('tmsSettings'));
 await page.waitForTimeout(1200);
 const debug=await page.evaluate(()=>({active:[...document.querySelectorAll('.view.active')].map(x=>x.id),host:document.querySelector('#tmsSettings .tms-live-host')?.innerHTML?.slice(0,2200)||null,allIds:[...document.querySelectorAll('section.view')].map(x=>x.id),hasAuth:!!window.YardivoAuth,hasPlanner:!!window.YardOnTMSPlanner,hasDispatcher:!!window.YardOnTMSDispatcher,selected:document.querySelector('#globalWarehouse')?.value}));
 console.log('TMS_BROWSER_DEBUG',JSON.stringify(debug),'errors',JSON.stringify(errors));
 await page.waitForSelector('#tmsGoogleMap',{timeout:8000});
 await page.waitForFunction(()=>typeof window.__mapClick==='function');
 await page.evaluate(()=>{
  window.__mapClick({latlng:{lat:44.2,lng:15.1}});
  window.__mapClick({latlng:{lat:44.6,lng:16.5}});
  window.__mapClick({latlng:{lat:43.6,lng:16.2}});
 });
 assert.equal((await page.locator('#tmsPointCount').textContent()).trim(),'3 točaka');
 await page.locator('#tmsZoneName').fill('Dalmacija');
 await page.locator('[data-tms-form="zone"] button[type="submit"]').click();
 await page.waitForFunction(()=>window.__tmsTestRows.yardon_tms_zones.length===1);
 await page.waitForSelector('#tmsStoreCoord');
 await page.locator('[data-tms-form="store"] input[name="code"]').fill('ST-001');
 await page.locator('[data-tms-form="store"] input[name="name"]').fill('Trgovina Split');
 await page.locator('[data-tms-form="store"] input[name="city"]').fill('Split');
 await page.locator('[data-tms-form="store"] button[type="submit"]').click();
 await page.waitForFunction(()=>window.__tmsTestRows.yardon_tms_stores.length===1);
 await page.evaluate(()=>window.YardivoRoleStableFinal.open('tmsRoutes'));
 await page.locator('[data-tms-form="pallets"] input[name="quantity"]').fill('3');
 await page.locator('[data-tms-form="pallets"] button[type="submit"]').click();
 await page.waitForFunction(()=>window.__tmsTestRows.yardon_tms_pallets.length===3);
 await page.locator('[data-tms-form="trip"] input[name="plate"]').fill('ZG 1234 AB');
 await page.locator('[data-tms-form="trip"] input[name="carrier"]').fill('Prijevoznik');
 await page.locator('[data-tms-form="trip"] input[name="capacity_pallets"]').fill('2');
 await page.locator('[data-tms-form="trip"] button[type="submit"]').click();
 await page.waitForFunction(()=>window.__tmsTestRows.yardon_tms_trips.length===1);
 await page.locator('[data-tms-pallet]').first().click();
 await page.locator('[data-tms-trip]').first().click();
 await page.waitForFunction(()=>window.__tmsTestRows.yardon_tms_pallets.some(x=>x.trip_id));
 assert.equal(await page.locator('.tms-loaded-pallet').count(),1,'Paleta mora biti prikazana na kamionu');
 await page.evaluate(()=>window.YardOnTMSPlanner.render('tmsRoutes'));
 await page.waitForSelector('.tms-loaded-pallet');
 assert.equal(await page.locator('.tms-loaded-pallet').count(),1,'Dodjela mora preživjeti ponovno učitavanje');
 assert.equal(await page.locator('.tms-pallet').count(),2,'Dodijeljena paleta više nije u banci');
 assert.equal(await page.locator('[data-tms-trip]').count(),1,'Kamion postoji desno');
 assert.deepEqual(errors,[],'Browser errors: '+errors.join('|'));
 console.log('YARDON_TMS_ZONE_BROWSER_QA_PASS',JSON.stringify({zones:1,stores:1,pallets:3,trucks:1,assigned:1}));
 await browser.close();
})().catch(e=>{console.error('YARDON_TMS_ZONE_BROWSER_QA_FAIL',e);process.exit(1)});
