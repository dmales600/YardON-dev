/**
 * YARD ON SMART — stable dock scheduling core (v1).
 * Pure, side-effect-free and deterministic. No database writes, AI calls or clock reads.
 * Existing confirmed assignments are protected reservations. Delayed assignments
 * produce suggestions only; applying a suggestion requires a separate approval.
 *
 * Times are local to the warehouse time zone. This module handles same-day shifts;
 * cross-midnight deliveries require explicit manual handling.
 */
const DEFAULT_ZONE='Europe/Zagreb';
const DAY=1440;
const CLOSED=new Set(['cancelled','canceled','rejected','completed','otkazano','završeno']);
const PHYSICAL=new Set(['arrived','arrival','checked_in','checked-in','gate','at_gate','on_dock','dock','receiving','unloading','stigao','na rampi','zaprimanje','zaprimljen']);
const pad=n=>String(n).padStart(2,'0');
export function minuteOf(value,date='',zone=DEFAULT_ZONE){
 if(value===null||value===undefined||value==='')return null;
 if(Number.isInteger(value)&&value>=0&&value<DAY)return value;
 const raw=String(value).trim();
 const time=raw.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
 if(time)return Number(time[1])*60+Number(time[2]);
 if(/^\d{4}-\d{2}-\d{2}T/.test(raw)){
  if(!/[zZ]|[+-]\d{2}:\d{2}$/.test(raw)){
   const m=raw.match(/^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)/);
   if(!m||date&&m[1]!==date)return null;
   return Number(m[2])*60+Number(m[3]);
  }
  const d=new Date(raw);
  if(!Number.isFinite(d.getTime()))return null;
  try{
   const parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
   const get=t=>parts.find(p=>p.type===t)?.value||'';
   if(date&&get('year')+'-'+get('month')+'-'+get('day')!==date)return null;
   return Number(get('hour'))*60+Number(get('minute'));
  }catch{return null}
 }
 return null;
}
export const clock=m=>Number.isInteger(m)&&m>=0&&m<DAY?pad(Math.floor(m/60))+':'+pad(m%60):'';
const round15=n=>Math.ceil(n/15)*15;
const rampNumber=x=>{const m=String(x??'').match(/^(?:R)?(\d+)$/i);return m?Number(m[1]):null};
const normalDate=x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x||''))?String(x):'';
const overlaps=(a,b)=>a.start<b.end&&b.start<a.end;
function normalizeRamp(r,warehouse,zone){
 const number=rampNumber(r?.number??r?.id);
 const open=minuteOf(r?.from??r?.open??warehouse?.reception_from??'06:00','',zone);
 const close=minuteOf(r?.to??r?.close??warehouse?.reception_to??'18:00','',zone);
 const rate=Number(r?.pallets_per_hour??33);
 if(!number||r?.active===false||open===null||close===null||close<=open||!Number.isFinite(rate)||rate<=0)return null;
 return {number,from:open,to:close,pallets_per_hour:rate};
}
function normalizeRamps(input,zone){
 let source=Array.isArray(input?.ramps)?input.ramps:Array.isArray(input?.ramp_settings)?input.ramp_settings:[];
 if(!source.length&&Number.isInteger(Number(input?.ramp_count))&&Number(input.ramp_count)<=60){
  source=Array.from({length:Math.max(0,Number(input.ramp_count))},(_,i)=>({number:i+1}));
 }
 const unique=new Map();
 for(const item of source){const ramp=normalizeRamp(item,input,zone);if(ramp)unique.set(ramp.number,ramp)}
 return [...unique.values()].sort((a,b)=>a.number-b.number);
}
function durationFor(job,ramp){
 const explicit=Number(job?.durationMinutes??job?.duration_minutes??0);
 if(Number.isFinite(explicit)&&explicit>0&&explicit<=DAY)return round15(explicit);
 const pallets=Number(job?.pallets??0),rate=ramp.pallets_per_hour;
 return round15(Math.max(15,(Number.isFinite(pallets)?Math.max(1,pallets):1)/rate*60));
}
function normalizedJobs(input,date,zone){
 const seen=new Set();
 const out=[];
 for(const original of Array.isArray(input)?input:[]){
  if(!original||normalDate(original.date??original.delivery_date??date)!==date)continue;
  const id=String(original.id??original.supplier_delivery_id??'').trim();
  if(!id||seen.has(id))continue;
  seen.add(id);
  const status=String(original.status??'').toLocaleLowerCase('hr-HR').trim();
  if(CLOSED.has(status))continue;
  const plannedDock=rampNumber(original.plannedDock??original.planned_dock);
  const plannedStart=minuteOf(original.plannedStart??original.planned_start,date,zone);
  const plannedEnd=minuteOf(original.plannedEnd??original.planned_end,date,zone);
  const requested=minuteOf(original.requestedTime??original.requested_time??original.time,date,zone);
  const eta=minuteOf(original.etaTime??original.eta_time,date,zone);
  out.push({...original,id,status,plannedDock,plannedStart,plannedEnd,requested,eta,physicallyStarted:PHYSICAL.has(status)||Boolean(original.checkedInAt||original.checked_in_at)});
 }
 return out.sort((a,b)=>(a.requested??DAY)-(b.requested??DAY)||a.id.localeCompare(b.id));
}
function earliestSlot(job,ramps,blocked,options){
 const after=Number(options.after),ignoreId=options.ignoreId||null;
 const preferred=job.plannedDock??rampNumber(job.preferredDock??job.dock);
 const result=[];
 for(const ramp of ramps){
  const len=durationFor(job,ramp);
  for(let start=round15(Math.max(ramp.from,after));start+len<=ramp.to;start+=15){
   if(start-after>options.maxShiftMinutes)break;
   const interval={start,end:start+len};
   if(blocked.some(b=>b.ramp===ramp.number&&b.id!==ignoreId&&overlaps(interval,b)))continue;
   const occupancy=blocked.filter(b=>b.ramp===ramp.number).length;
   result.push({ramp:ramp.number,start,end:start+len,durationMinutes:len,
    score:(start-after)*100+(ramp.number===preferred?0:12)+occupancy});
   break;
  }
 }
 result.sort((a,b)=>a.score-b.score||a.ramp-b.ramp);
 return result[0]||null;
}
function expose(job,code,slot=null,detail=''){
 return {id:job.id,supplier:job.supplier||'',requestedTime:clock(job.requested),
   status:code,plannedDock:slot?.ramp??job.plannedDock??null,
   plannedStart:slot?clock(slot.start):clock(job.plannedStart),
   plannedEnd:slot?clock(slot.end):clock(job.plannedEnd),
   durationMinutes:slot?.durationMinutes??null,reason:detail};
}
/**
 * @returns {{assignments:Array,proposals:Array,issues:Array,metrics:Object,date:string,mode:string}}
 */
export function planStableDay(input){
 const date=normalDate(input?.date);
 if(!date)throw new Error('INVALID_PLANNING_DATE');
 const zone=input?.timeZone||DEFAULT_ZONE,ramps=normalizeRamps(input,zone);
 const jobs=normalizedJobs(input?.deliveries,date,zone);
 const maxShiftMinutes=Math.max(0,Math.min(DAY,Number(input?.maxShiftMinutes??300)));
 const lateThresholdMinutes=Math.max(1,Number(input?.lateThresholdMinutes??15));
 const freezeMinutes=Math.max(0,Number(input?.freezeMinutes??120));
 const today=normalDate(input?.today??''),now=minuteOf(input?.nowTime??'',today,zone);
 const blocked=[],issues=[],assigned=new Map(),proposals=[];
 const findRamp=n=>ramps.find(r=>r.number===n);
 for(const job of jobs){
  if(job.plannedDock===null||job.plannedStart===null)continue;
  const ramp=findRamp(job.plannedDock);
  if(!ramp){issues.push({id:job.id,code:'ASSIGNED_RAMP_INACTIVE'});assigned.set(job.id,expose(job,'INVALID_EXISTING'));continue}
  const len=durationFor(job,ramp),end=job.plannedEnd??(job.plannedStart+len);
  if(end<=job.plannedStart||job.plannedStart<ramp.from||end>ramp.to){issues.push({id:job.id,code:'EXISTING_OUT_OF_HOURS'});assigned.set(job.id,expose(job,'INVALID_EXISTING'));continue}
  const interval={id:job.id,ramp:ramp.number,start:job.plannedStart,end};
  if(blocked.some(b=>b.ramp===interval.ramp&&overlaps(b,interval)))
   issues.push({id:job.id,code:'PREEXISTING_DOUBLE_BOOKING'});
  blocked.push(interval);
  assigned.set(job.id,expose(job,job.physicallyStarted?'LOCKED':'UNCHANGED',interval,'Existing assignment protected'));
 }
 // Propose moving only the delayed truck. The old slot remains reserved
 // for other jobs until Inventory explicitly approves the proposal.
 for(const job of jobs){
  if(job.plannedDock===null||job.plannedStart===null||job.eta===null||job.physicallyStarted)continue;
  if(job.eta-job.plannedStart<lateThresholdMinutes)continue;
  if(date===today&&now!==null&&job.plannedStart-now<=freezeMinutes){
   issues.push({id:job.id,code:'DELAY_NEAR_START_MANUAL_REVIEW'});
   continue;
  }
  const candidate=earliestSlot(job,ramps,blocked,{after:job.eta,ignoreId:job.id,maxShiftMinutes});
  if(!candidate){issues.push({id:job.id,code:'DELAY_NO_SAFE_ALTERNATIVE'});continue}
  if(candidate.ramp===job.plannedDock&&candidate.start===job.plannedStart)continue;
  const current=blocked.find(b=>b.id===job.id);
  const delta=Math.max(0,candidate.start-job.plannedStart);
  proposals.push({id:job.id,status:'PENDING_INVENTORY',type:'DELAY',old:{dock:job.plannedDock,start:clock(job.plannedStart),end:clock(current?.end)},
    proposed:{dock:candidate.ramp,start:clock(candidate.start),end:clock(candidate.end)},
    reason:'ETA kasni '+(job.eta-job.plannedStart)+' min; sigurni slobodni termin '+clock(candidate.start)+' na R'+candidate.ramp,
    delayMinutes:delta});
  // Prevent simultaneous proposals from offering the same free slot.
  // Original reservation is still occupied until approval.
  blocked.push({id:'proposed:'+job.id,ramp:candidate.ramp,start:candidate.start,end:candidate.end});
  const fixed=assigned.get(job.id);fixed.status='CHANGE_PROPOSED';fixed.reason='Change awaits Inventory approval';
 }
 for(const job of jobs){
  if(assigned.has(job.id))continue;
  if(job.physicallyStarted){issues.push({id:job.id,code:'ARRIVED_WITHOUT_ASSIGNED_SLOT'});assigned.set(job.id,expose(job,'MANUAL_REVIEW'));continue}
  if(job.requested===null){issues.push({id:job.id,code:'MISSING_REQUEST_TIME'});assigned.set(job.id,expose(job,'MANUAL_REVIEW'));continue}
  const after=Math.max(job.requested,job.eta??job.requested);
  if(date===today&&now!==null&&after-now<=freezeMinutes){
   issues.push({id:job.id,code:'LAST_MINUTE_MANUAL_REVIEW'});assigned.set(job.id,expose(job,'MANUAL_REVIEW'));continue;
  }
  const candidate=earliestSlot(job,ramps,blocked,{after,maxShiftMinutes});
  if(!candidate){issues.push({id:job.id,code:'NO_CAPACITY'});assigned.set(job.id,expose(job,'NO_CAPACITY'));continue}
  blocked.push({id:job.id,ramp:candidate.ramp,start:candidate.start,end:candidate.end});
  assigned.set(job.id,expose(job,'INITIAL_PROPOSAL',candidate,'Available slot; no existing deliveries moved'));
 }
 const assignments=jobs.map(j=>assigned.get(j.id));
 return {date,mode:'STABLE',timeZone:zone,assignments,proposals,issues,
  metrics:{total:jobs.length,preassigned:jobs.filter(j=>j.plannedDock!==null).length,
   initial:assignments.filter(x=>x.status==='INITIAL_PROPOSAL').length,
   unchanged:assignments.filter(x=>x.status==='UNCHANGED'||x.status==='LOCKED').length,
   changesPending:proposals.length,unassigned:assignments.filter(x=>x.status==='NO_CAPACITY'||x.status==='MANUAL_REVIEW'||x.status==='INVALID_EXISTING').length,
   ramps:ramps.length}};
}
export function planSevenDays({startDate,warehouses,...options}){
 const start=normalDate(startDate);
 if(!start)throw new Error('INVALID_PLANNING_DATE');
 const base=new Date(start+'T12:00:00Z');
 if(!Number.isFinite(base.getTime()))throw new Error('INVALID_PLANNING_DATE');
 const result=[];
 for(let day=0;day<7;day++){
  const date=new Date(base.getTime()+day*86400000).toISOString().slice(0,10);
  for(const warehouse of warehouses||[]){
   const deliveries=(warehouse.deliveries||[]).filter(x=>String(x.date??x.delivery_date??'')===date);
   result.push({warehouseId:warehouse.id,...planStableDay({...options,...warehouse,date,deliveries})});
  }
 }
 return {startDate:start,endDate:result.length?new Date(base.getTime()+6*86400000).toISOString().slice(0,10):start,days:result};
}
