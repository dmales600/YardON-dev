'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const src=fs.readFileSync('modules/services/yardivo-ai-voice-notifications-v583.js','utf8');
const on=new Map(),played=[],emitted=[],values=new Map(),session=new Map();
class Utterance { constructor(text){this.text=text;this.volume=1;this.lang='';this.rate=1;} }
class CustomEvent { constructor(type,opts){this.type=type;this.detail=opts?.detail;} }
const listen=(type,fn)=>on.set(type,[...(on.get(type)||[]),fn]);
const window={
 currentSession:{role:'inventory',username:'qa-inventory'},
 SpeechSynthesisUtterance:Utterance,
 speechSynthesis:{cancel:()=>{},speak:u=>played.push(u),getVoices:()=>[{lang:'hr-HR',name:'Hrvatski'}]},
 addEventListener:listen,
 dispatchEvent:e=>{emitted.push(e);(on.get(e.type)||[]).forEach(fn=>fn(e));}
};
const document={addEventListener:()=>{},documentElement:{dataset:{}}};
const context={window,document,localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v))},
 sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,String(v))},
 CustomEvent,console,setTimeout:()=>0,clearTimeout:()=>{},URL,Date,Map,Set,Audio:class{}};
vm.runInNewContext(src,context,{filename:'yardivo-ai-voice-notifications-v583.js'});
const voice=window.YardivoAIVoiceNotifications;
assert(voice,'voice service must initialize');
function toast(data){window.dispatchEvent(new CustomEvent('yardivo:visible-toast',{detail:{notification:data}}))}
const announcement={id:'SUPREQ-123',event:'SUPPLIER_REQUEST',title:'NOVA NAJAVA DOBAVLJAČA',
 supplier:'Konzum',warehouse:'W001',body:'Konzum · 2026-10-20 10:00 · rampa TBD',at:'2026-10-08T09:00:00Z'};
toast(announcement);
assert.equal(played.length,1,'local speech must be started synchronously in notification handler');
assert.equal(played[0].lang,'hr-HR');
assert.equal(played[0].text,'Nova najava dobavljača Konzum, dvadesetog desetog u 10 sati.');
assert(!played[0].text.includes('2026'),'voice should never read year');
assert.equal(emitted.filter(x=>x.type==='yardivo:voice-enqueued').length,1,'voice event should fire once');
assert(emitted.find(x=>x.type==='yardivo:voice-enqueued').detail.instant,'voice event should indicate instant');
toast(announcement);
assert.equal(played.length,1,'same notification cannot play twice');
assert.equal(voice.supplierSpeechText({supplier:'Podravka',body:'Podravka · 2026-10-21 09:30'}),
 'Nova najava dobavljača Podravka, dvadeset prvog desetog u 9 sati i 30 minuta.');
toast({...announcement,id:'SUPREQ-456',supplier:'Podravka',body:'Podravka · 2026-10-21 09:30'});
assert.equal(played.length,2);
assert(!played[1].text.includes('2026'));
const approved={id:'SUP-CONFIRMED-10',event:'ANNOUNCEMENT_CREATED',title:'NOVA NAJAVA',
 supplier:'Franck',body:'Franck · 2026-10-20 14:00'};
toast(approved);
assert.equal(played.length,3,'confirmed supplier announcement should also speak');
const operational={id:'GATE-001',event:'GATE_ARRIVAL',title:'DOLAZAK KAMIONA',
 body:'Kamion ABC stigao je na portu.',at:new Date().toISOString()};
toast(operational);
assert.equal(played.length,4,'every live operational notification must start local speech');
assert.match(played[3].text,/DOLAZAK KAMIONA/);
const incident={id:'INCIDENT-001',event:'INCIDENT',title:'NOVI INCIDENT',body:'Blokirana rampa.'};
toast(incident);
assert.equal(played.length,5,'incident notification must speak instantly');
assert.equal(emitted.filter(x=>x.type==='yardivo:voice-enqueued').length,5,'every live event must trigger exactly one voice event');
assert(emitted.filter(x=>x.type==='yardivo:voice-enqueued').every(x=>x.detail.instant===true));

assert.equal(played[2].text,'Nova najava dobavljača Franck, dvadesetog desetog u 14 sati.');
values.set('yardivo_notification_sound_mode_v2','off');
toast({...announcement,id:'SUPREQ-silent'});
assert.equal(played.length,5,'voice-off preference must be respected');
assert(!src.includes("if(role()==='inventory'&&ev==='SUPPLIER_REQUEST'){\n    forceRead(n)"),'supplier request must not bypass dedup');
console.log('YARDON_INSTANT_ALL_NOTIFICATIONS_VOICE_PASS: synchronous, Croatian date, no year, dedupe, supplier, operational, incident, muted setting');
