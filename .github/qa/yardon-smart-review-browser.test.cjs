'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const HOST='http://127.0.0.1:4173/';
const uuid='e27a952f-367c-464f-96f5-162e29c26827';
async function runScenario(browser,proposedTime){
 const ctx=await browser.newContext({viewport:{width:1360,height:900}});
 await ctx.route('https://ldzwgdwzolbvjxyznlry.supabase.co/**',async route=>{
   const headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,apikey,content-type,x-client-info',
    'access-control-allow-methods':'GET,POST,PATCH,PUT,DELETE,OPTIONS'};
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
   return route.fulfill({status:401,headers,body:'{"message":"QA sandbox offline"}',contentType:'application/json'});
 });
 const page=await ctx.newPage();
 await page.goto(HOST,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.YardOnSmartCenter?.previewRequest,{timeout:14000});
 const result=await page.evaluate(async ({uuid,proposedTime})=>{
  const calls=[];
  window.currentSession={role:'inventory',app_role:'inventory',username:'qa_inventory',warehouses:['W001'],location:'LOC001'};
  try{currentSession=window.currentSession}catch(_){}
  document.getElementById('loginOverlay')?.style.setProperty('display','none','important');
  document.body.classList.remove('yardivo-prelogin');
  const date=document.getElementById('dailyMapDate'),warehouse=document.getElementById('dailyMapWarehouseSelect');
  if(!date||!warehouse)throw new Error('Daily Map selectors missing');
  if(![...warehouse.options].some(x=>x.value==='W001')){
   warehouse.add(new Option('QA W001','W001'));
  }
  let status='pending',issued=0;
  window.YardivoAuth=window.YardivoAuth||{};
  window.YardivoAuth.client=async()=>({functions:{invoke:async(name,args)=>{
   const action=args?.body?.action;calls.push(action);
   if(action==='preview_request')return {data:{ok:true,data:{
     id:uuid,date:'2026-10-08',time:'16:30',warehouse:'W001',supplier:'DOBAVLJAČ ABC',
     candidate:{dock:2,time:proposedTime,end:'17:00'},reason:'R2 je dostupna prema QA podacima.',provisional:true
   }}};
   if(action==='record_request_review'||action==='smart_activity')return {data:{ok:true,data:{events:[]}}};
   return {data:{ok:true,data:{}}};
  }}});
  window.YardivoSupplierLiveSync={
   call:async(action,args)=>{calls.push(action+':'+args?.status);if(action==='internal_update')status=args.status;return {id:uuid,status}},
   pullInternal:async()=>true
  };
  window.YardivoGateQrV583={issueAfterSmartApproval:async id=>{issued++;calls.push('qr:'+id);return {qrUrl:'https://example.org/qr',token:'qa'}}};
  window.confirm=()=>true;
  window.alert=()=>{};
  window.renderDailyMap=()=>{
    const board=document.getElementById('dailyMapBoard');
    board.innerHTML='<div class="daily-map-vertical-grid"><div class="dmv-cell yv-smart-proposed-cell" data-move-date="2026-10-08" data-move-warehouse="W001" data-move-dock="2" data-move-time="'+proposedTime+'">✦</div></div>';
  };
  await window.YardOnSmartCenter.previewRequest(uuid);
  const panel=document.getElementById('yardonSmartRequestReview');
  if(!panel)throw new Error('SMART review panel missing');
  const target=window.YardOnSmartCenter.previewTarget();
  if(!target||target.dock!==2||target.time!==proposedTime)throw new Error('SMART target mismatch');
  if(panel.querySelector('[data-smart-request="approve"]').disabled)throw new Error('Approve button unexpectedly disabled');
  panel.querySelector('[data-smart-request="approve"]').click();
  await new Promise(res=>setTimeout(res,180));
  return {status,issued,calls,notice:panel.textContent?.slice(0,140)};
 },{uuid,proposedTime});
 await ctx.close();
 return result;
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const normal=await runScenario(browser,'16:30');
  assert.equal(normal.status,'confirmed');
  assert.equal(normal.issued,1);
  assert(normal.calls.includes('record_request_review'));
  const alternate=await runScenario(browser,'17:15');
  assert.equal(alternate.status,'proposal_sent');
  assert.equal(alternate.issued,0);
  assert(alternate.calls.includes('record_request_review'));
  console.log('YARDON_SMART_MAP_REVIEW_BROWSER_QA_PASS',JSON.stringify({normal,alternate}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
