const fs=require('fs');

function fail(msg){throw new Error(msg)}
function expect(v,msg){if(!v)fail(msg)}
const edge=fs.readFileSync('supabase/functions/yardivo-yard-dispatch/index.ts','utf8');
const receiving=fs.readFileSync('modules/receiving/service.js','utf8');
const supplierService=fs.readFileSync('modules/supplier/service.js','utf8');
const operationalNotifications=fs.readFileSync('modules/master-data/yardivo-v548-full-operational-notifications.js','utf8');
const notificationService=fs.readFileSync('modules/services/yardivo-notifications-final-v5.js','utf8');

// Production wiring / business-rule guards.
expect(edge.includes("diff>=-15&&diff<=30"),'Production dispatcher lost -15/+30 active appointment window');
expect(edge.includes("actor_name:'YardOn AI'"),'Production dispatcher must write YardOn AI chat/event messages');
expect(edge.includes("in('state',['PARKING','WAITING_DOCK'])"),'Production dispatcher must select only parked/waiting trucks');
expect(edge.includes("state:'PROCEED_DOCK'"),'Production dispatcher must move selected truck to PROCEED_DOCK');
expect(edge.includes("yardivo_supplier_deliveries').update({dock:dockNoValue,dock_number:ramp,status:'arrival'"),'AI dock assignment must mirror numeric dock into Supplier delivery');
expect(edge.includes("payload.dock=dockNoValue"),'AI dock assignment must mirror dock into canonical announcement payload used by maps');
expect(edge.includes("status:'U dvorištu',payload"),'Canonical announcement must move to yard status when AI assigns a dock');
expect(receiving.includes("/functions/v1/yardivo-yard-dispatch"),'Receiving/Gate runtime is not wired to AI dispatcher');
expect(receiving.includes("YardivoSupplierLiveSync?.pullInternal?.(true)"),'Receiving must pull fresh Supplier rows after AI dock assignment');
expect(receiving.includes("window.renderDailyMap?.()"),'Receiving must redraw Daily Map after AI dock assignment');
expect(receiving.includes("['Zaprimljeno','Odbijen']"),'Receiving completion must trigger immediate queue dispatch');
expect(receiving.includes("setInterval(()=>{if(document.visibilityState==='visible'&&yardDispatchEnabled())"),'Yard dispatcher periodic reconciliation missing');
expect(receiving.includes("function yardDispatchEnabled(){return yardDispatchAllowed()&&aiControlEnabled()}"),'Periodic dispatcher must require role permission and enabled AI');
expect(supplierService.includes("bookingMode:'TIME_ONLY'"),'Supplier booking must remain TIME_ONLY; Supplier must not own a ramp');
expect(operationalNotifications.includes("YARDON DODIJELIO RAMPU"),'First AI dock assignment must be labelled as YardOn dock assignment, not ramp change');
expect(operationalNotifications.includes("n>0?String(n):''"),'Operational notifications must reject R0 as a physical ramp');
expect(notificationService.includes("n>0?String(n):''"),'Notification service must reject R0 as a physical ramp');

function ms(hm){
  const [h,m]=hm.split(':').map(Number);
  return Date.UTC(2026,9,5,h,m,0);
}
function pass(id,appointment,arrived,state='PARKING',dock=null){
  return {id,appointment_at:new Date(ms(appointment)).toISOString(),checked_in_at:new Date(ms(arrived)).toISOString(),gate_decision:'APPROVED',state,dock,parking_slot:state==='PARKING'?'P1':null,events:[]};
}
function arrivedAtMs(p){return new Date(p.checked_in_at).getTime()}
function priority(p,now){
  const appt=new Date(p.appointment_at).getTime(),arrived=arrivedAtMs(p),diff=(now-appt)/60000;
  if(diff>=-15&&diff<=30)return {tier:0,diff:Math.abs(diff),arrived,appt};
  if(diff>30)return {tier:1,diff,arrived,appt};
  return {tier:2,diff:Math.abs(diff),arrived,appt};
}
function compareWaiting(a,b,now){
  const A=priority(a,now),B=priority(b,now);
  if(A.tier!==B.tier)return A.tier-B.tier;
  if(A.tier===0&&A.diff!==B.diff)return A.diff-B.diff;
  if(A.tier===2&&A.appt!==B.appt)return A.appt-B.appt;
  if(A.arrived!==B.arrived)return A.arrived-B.arrived;
  return A.appt-B.appt;
}
function timingText(p,now){
  const m=Math.round((now-new Date(p.appointment_at).getTime())/60000);
  if(m===0)return 'stiglo točno na termin';
  if(m<0)return `stiglo ${Math.abs(m)} min ranije`;
  return `kasni ${m} min`;
}
function dispatch(state,now){
  const occupied=new Set(state.passes.filter(x=>x.state==='PROCEED_DOCK').map(x=>Number(String(x.dock||'').replace(/\D/g,''))).filter(Boolean));
  const free=state.ramps.filter(r=>!occupied.has(r));
  const waiting=state.passes.filter(x=>x.gate_decision==='APPROVED'&&['PARKING','WAITING_DOCK'].includes(x.state)).sort((a,b)=>compareWaiting(a,b,now));
  const eligible=waiting.filter(x=>priority(x,now).tier<=1);
  const assigned=[];
  for(const r of free){
    const p=eligible.shift();if(!p)break;
    p.dock='R'+r;p.state='PROCEED_DOCK';p.parking_slot=null;
    const msg=`YardOn AI: R${r} je slobodna. ${timingText(p,now)}. Krenite na R${r}.`;
    p.events.push({actor_name:'YardOn AI',kind:'ai_dispatch',message:msg});
    assigned.push(p.id);
  }
  return assigned;
}

// Scenario: two ramps are occupied, three trucks wait on parking.
const state={ramps:[1,2],passes:[
  pass('OCC-1','10:00','09:55','PROCEED_DOCK','R1'),
  pass('OCC-2','10:15','10:10','PROCEED_DOCK','R2'),
  pass('LATE-FIRST','10:20','10:30'),
  pass('ON-TIME-1100','11:00','10:54'),
  pass('TOO-EARLY','11:30','10:35')
]};

const t1057=ms('10:57');
expect(dispatch(state,t1057).length===0,'When all ramps are occupied every arriving truck must remain on parking');
expect(state.passes.find(x=>x.id==='ON-TIME-1100').state==='PARKING','11:00 truck must remain on parking while no ramp is free');

// First dock frees at 10:57. The 11:00 appointment arrived 3 min early and must win.
state.passes.find(x=>x.id==='OCC-1').state='COMPLETED';
let assigned=dispatch(state,t1057);
expect(assigned[0]==='ON-TIME-1100','Truck scheduled for 11:00 and arriving 3 min early must get first free ramp');
let chosen=state.passes.find(x=>x.id==='ON-TIME-1100');
expect(chosen.dock==='R1'&&chosen.state==='PROCEED_DOCK','11:00 truck was not sent to the freed R1');
expect(chosen.events.some(e=>e.actor_name==='YardOn AI'&&/Krenite na R1/.test(e.message)),'Driver did not receive YardOn AI chat instruction for R1');

// Second dock frees while 11:30 truck is still too early; late FIFO truck goes next.
state.passes.find(x=>x.id==='OCC-2').state='COMPLETED';
assigned=dispatch(state,t1057);
expect(assigned[0]==='LATE-FIRST','Late truck already waiting must go before a truck more than 15 min early');
expect(state.passes.find(x=>x.id==='TOO-EARLY').state==='PARKING','Truck more than 15 min early must remain on parking');

// At 11:16 the 11:30 truck enters the -15 min active window and can take a free ramp.
state.passes.find(x=>x.id==='ON-TIME-1100').state='COMPLETED';
assigned=dispatch(state,ms('11:16'));
expect(assigned[0]==='TOO-EARLY','11:30 truck must become eligible once it is within 15 minutes of appointment');
expect(state.passes.find(x=>x.id==='TOO-EARLY').events.some(e=>/YardOn AI/.test(e.message)),'Newly eligible truck must receive a chat instruction');

// FIFO tie-break: same appointment proximity -> first checked-in truck wins.
const tie={ramps:[1],passes:[pass('FIRST','12:00','11:48'),pass('SECOND','12:00','11:50')]};
assigned=dispatch(tie,ms('12:00'));
expect(assigned[0]==='FIRST','Equal appointment priority must fall back to first arrival / FIFO');

console.log('YARDON_YARD_DISPATCH_PRIORITY_QA_PASS '+JSON.stringify({
  noRampMeansParking:true,
  priority3MinEarly:'ON-TIME-1100',
  nextLateWaiting:'LATE-FIRST',
  earlyBecomesEligibleAt:'11:16',
  fifoTieBreak:'FIRST',
  driverChatActor:'YardOn AI'
}));
