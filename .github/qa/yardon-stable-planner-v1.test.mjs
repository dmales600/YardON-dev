import test from 'node:test';
import assert from 'node:assert/strict';
import {planStableDay,planSevenDays,minuteOf} from '../../supabase/functions/_shared/yardon-stable-planner-v1.mjs';
const date='2026-10-15';
const ramps=()=>[1,2,3].map(number=>({number,from:'06:00',to:'22:00',pallets_per_hour:30}));
const job=(id,time,extra={})=>({id:String(id),date,requestedTime:time,pallets:15,durationMinutes:30,...extra});
const run=(deliveries,override={})=>planStableDay({date,ramps:ramps(),deliveries,today:'2026-10-08',nowTime:'12:00',...override});
function assertNoOverlaps(assignments){
 for(let ramp=1;ramp<=3;ramp++){
  const slots=assignments.filter(x=>x.plannedDock===ramp&&x.plannedStart&&x.plannedEnd)
    .map(x=>({id:x.id,start:minuteOf(x.plannedStart),end:minuteOf(x.plannedEnd)}))
    .sort((a,b)=>a.start-b.start);
  for(let i=1;i<slots.length;i++)
   assert(slots[i-1].end<=slots[i].start,'overlap on ramp '+ramp+' ('+slots[i-1].id+' / '+slots[i].id+')');
 }
}
test('30 shipments on 3 ramps fit without overlaps',()=>{
 const shipments=Array.from({length:30},(_,i)=>job(i+1,'08:00',{durationMinutes:30}));
 const result=run(shipments,{maxShiftMinutes:480});
 assert.equal(result.assignments.length,30);
 assert.equal(result.metrics.initial,30);
 assert.equal(result.metrics.unassigned,0);
 assert.equal(result.metrics.ramps,3);
 assertNoOverlaps(result.assignments);
});
test('stable repeat is deterministic and idempotent',()=>{
 const input=Array.from({length:30},(_,i)=>job(i+1,'09:00'));
 assert.deepEqual(run(input),run(input));
});
test('one late delivery proposes one change and never shuffles fixed bookings',()=>{
 const input=[
  job('ABC','10:00',{plannedDock:'R1',plannedStart:'10:00',plannedEnd:'10:30',etaTime:'10:45'}),
  job('DEF','10:30',{plannedDock:'R1',plannedStart:'10:30',plannedEnd:'11:00'}),
  job('GHI','10:00',{plannedDock:'R2',plannedStart:'10:00',plannedEnd:'10:30'}),
  job('JKL','11:00',{plannedDock:'R3',plannedStart:'11:00',plannedEnd:'11:30'})
 ];
 const result=run(input);
 assert.equal(result.proposals.length,1);
 assert.equal(result.proposals[0].id,'ABC');
 assert.equal(result.proposals[0].status,'PENDING_INVENTORY');
 assert.equal(result.proposals[0].proposed.start,'10:45');
 for(const id of ['DEF','GHI','JKL']){
  const before=input.find(x=>x.id===id),after=result.assignments.find(x=>x.id===id);
  assert.equal(after.status,'UNCHANGED');
  assert.equal(after.plannedDock,Number(before.plannedDock.slice(1)));
  assert.equal(after.plannedStart,before.plannedStart);
 }
});
test('already checked-in truck is never moved even if ETA is late',()=>{
 const result=run([job('gate','10:00',{plannedDock:1,plannedStart:'10:00',plannedEnd:'10:30',etaTime:'11:30',status:'receiving'})]);
 assert.equal(result.proposals.length,0);
 assert.equal(result.assignments[0].status,'LOCKED');
});
test('confirmed reservation stays blocked until change is approved',()=>{
 const input=[
  job('late','10:00',{plannedDock:1,plannedStart:'10:00',plannedEnd:'10:30',etaTime:'10:45'}),
  job('new','10:00')
 ];
 const result=run(input);
 assert.equal(result.proposals.length,1);
 const item=result.assignments.find(x=>x.id==='new');
 assert(!(item.plannedDock===1&&item.plannedStart==='10:00'),'old unapproved slot was reused');
});
test('no active ramps gives explicit no capacity without guessing',()=>{
 const result=run([job(1,'09:00')],{ramps:[]});
 assert.equal(result.metrics.unassigned,1);
 assert.equal(result.assignments[0].status,'NO_CAPACITY');
 assert.equal(result.assignments[0].plannedDock,null);
});
test('invalid times are flagged for human review',()=>{
 const result=run([job(1,'25:88')]);
 assert.equal(result.assignments[0].status,'MANUAL_REVIEW');
 assert(result.issues.some(x=>x.code==='MISSING_REQUEST_TIME'));
});
test('arrival and 2-hour freeze protect last-minute schedule',()=>{
 const result=planStableDay({date,ramps:ramps(),deliveries:[
  job('arrived','11:30',{status:'arrived'}),
  job('late','10:00',{plannedDock:1,plannedStart:'10:00',plannedEnd:'10:30',etaTime:'12:30'})
 ],today:date,nowTime:'09:00',freezeMinutes:120});
 assert.equal(result.proposals.length,0);
 assert(result.issues.some(x=>x.code==='DELAY_NEAR_START_MANUAL_REVIEW'));
 assert(result.issues.some(x=>x.code==='ARRIVED_WITHOUT_ASSIGNED_SLOT'));
});
test('cancelled, completed and rejected jobs are excluded',()=>{
 const result=run([job(1,'10:00',{status:'cancelled'}),job(2,'10:00',{status:'completed'}),job(3,'10:00',{status:'rejected'}),job(4,'10:00')]);
 assert.equal(result.metrics.total,1);
 assert.equal(result.assignments[0].id,'4');
});
test('use Europe/Zagreb time zone for UTC delivery timestamps',()=>{
 assert.equal(minuteOf('2026-10-15T08:00:00Z',date,'Europe/Zagreb'),600);
 assert.equal(minuteOf('2026-10-15T23:00:00Z',date,'Europe/Zagreb'),null);
});
test('seven-day horizon plans each warehouse per day separately',()=>{
 const w={id:'W001',ramps:ramps(),deliveries:[job('first','09:00'),{...job('last','10:00'),date:'2026-10-21'}]};
 const seven=planSevenDays({startDate:date,warehouses:[w]});
 assert.equal(seven.days.length,7);
 assert.equal(seven.days[0].date,'2026-10-15');
 assert.equal(seven.days[6].date,'2026-10-21');
 assert.equal(seven.days[0].metrics.total,1);
 assert.equal(seven.days[6].metrics.total,1);
 assert.equal(seven.days.filter(d=>d.metrics.total===0).length,5);
});
test('never move planned truck to an inactive ramp',()=>{
 const result=run([job('existing','10:00',{plannedDock:'R9',plannedStart:'10:00',plannedEnd:'10:30'})]);
 assert.equal(result.proposals.length,0);
 assert(result.issues.some(x=>x.code==='ASSIGNED_RAMP_INACTIVE'));
});
test('existing invalid overlapping reservations are warned, not secretly reallocated',()=>{
 const input=[job(1,'09:00',{plannedDock:1,plannedStart:'09:00',plannedEnd:'10:00'}),job(2,'09:30',{plannedDock:1,plannedStart:'09:30',plannedEnd:'10:30'})];
 const result=run(input);
 assert.equal(result.proposals.length,0);
 assert(result.issues.some(x=>x.code==='PREEXISTING_DOUBLE_BOOKING'));
 assert.equal(result.assignments[0].plannedStart,'09:00');
 assert.equal(result.assignments[1].plannedStart,'09:30');
});

test('two delayed trucks never receive the same proposed ramp slot',()=>{
 const input=[
  job('late-A','10:00',{plannedDock:1,plannedStart:'10:00',plannedEnd:'10:30',etaTime:'11:00'}),
  job('late-B','10:00',{plannedDock:2,plannedStart:'10:00',plannedEnd:'10:30',etaTime:'11:00'}),
  job('reserved','11:00',{plannedDock:1,plannedStart:'11:00',plannedEnd:'11:30'})
 ];
 const result=run(input);
 assert.equal(result.proposals.length,2);
 const proposed=result.proposals.map(p=>({id:p.id,ramp:p.proposed.dock,
  start:minuteOf(p.proposed.start),end:minuteOf(p.proposed.end)}));
 for(let i=0;i<proposed.length;i++)for(let j=i+1;j<proposed.length;j++){
  const a=proposed[i],b=proposed[j];
  assert(!(a.ramp===b.ramp&&a.start<b.end&&b.start<a.end),'Two proposed slots conflict');
 }
});
