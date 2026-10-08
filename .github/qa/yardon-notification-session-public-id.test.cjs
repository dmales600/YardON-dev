'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('modules/services/yardivo-notifications-final-v5.js','utf8');
const supplierSrc=fs.readFileSync('modules/supplier/yardivo-v583-inventory-supplier-notif-delete-20260923.js','utf8');
function extract(start,end){
 const a=src.indexOf(start),b=src.indexOf(end,a);
 assert(a>=0&&b>a,'Missing source anchor '+start);
 return src.slice(a,b);
}
// Existing UUID-backed notification must show supplier's client_id, not SUPDEL UUID.
const displayCode=extract('function canonicalSupplierAnnouncementNumber(clientId){','\nfunction openReader(');
const formatterSrc=fs.readFileSync('modules/ui/runtime/phase5-323-yardivo-v583-announcement-number-display-20260923.js','utf8');
const validUUID='e27a952f-367c-464f-96f5-162e29c26827';
const realClientId='SUP-33ba5e99-c1a7-4202-8f96-74b1a53ec901';
// Start with the same canonical script that supplier STATUS uses.
const ctx={
 window:{YardivoSupplierLiveSync:{internalRows:()=>[{
   id:validUUID,client_id:realClientId,supplier_name:'DOBAVLJAČ ABC'}]}}
};
vm.runInNewContext(formatterSrc,ctx);
vm.runInNewContext(displayCode+';globalThis.showNumber=displayAnnouncementId;',ctx);
assert.equal(ctx.window.YardivoAnnouncementNumberV583.displayId(realClientId),'NAJ799593','supplier STATUS reference');
assert.equal(ctx.showNumber({publicAnnouncementId:realClientId}),'NAJ799593','new notification must use client_id hash');
assert.equal(ctx.showNumber({supplierDeliveryId:validUUID,announcementId:'SUPDEL-'+validUUID}),'NAJ799593','old notification must resolve via linked supplier delivery');
assert.equal(ctx.showNumber({publicAnnouncementId:'NAJ799593'}),'NAJ799593','already-public ID must be preserved');
assert.equal(ctx.showNumber({publicAnnouncementId:'NAJ123456'}),'NAJ123456','public IDs must not be rehashed');
assert.equal(ctx.showNumber({announcementId:'SUPDEL-00000000-0000-4000-8000-000000000000'}),'—','never hash the technical SUPDEL UUID');
assert(supplierSrc.includes('publicAnnouncementId:String(x?.client_id||x?.clientId'),'new supplier notification must carry real client_id');
assert(src.includes("field('Broj najave',displayAnnouncementId(n))"),'reader must show public booking number');
assert(src.includes("const number=canonicalSupplierAnnouncementNumber(hit?.client_id);"),'old notifications must canonicalize fetched client_id');
assert(src.includes("item.publicAnnouncementId=String(hit.client_id);"),'resolved client_id must be persisted for next opening');
// Logged-out history is recorded but never replayed as live speech.
const sessionCode=extract('function sessionFresh(n){','\nfunction ingest(');
const checkCode=extract('function checkNew(){','\nfunction fingerprint()');
const notifications=[
 {id:'before-login',at:'2026-10-08T14:00:00Z'},
 {id:'after-login',at:'2026-10-08T14:01:01Z'}
];
const state={sessionStartedAt:Date.parse('2026-10-08T14:01:00Z'),
 prelogin:()=>false,
 notificationTimeMs:n=>Date.parse(n.at),
 all:()=>notifications,
 unreadList:()=>notifications,
 seen:()=>new Set(state.known),
 saveSeen:s=>{state.known=[...s]},
 known:[],spoke:[],toast:n=>state.spoke.push(n.id)};
vm.runInNewContext(sessionCode+';'+checkCode+';globalThis.baseline=baselineVisible;globalThis.check=checkNew;',state);
state.baseline();state.check();
assert.deepEqual(state.spoke,['after-login'],'old notifications must never be voice/toast replayed');
assert(state.known.includes('before-login'),'old notification is baseline history');
state.check();assert.equal(state.spoke.length,1,'refresh must not replay same notification');
state.prelogin=()=>true;
state.known=[];
state.check();assert.equal(state.spoke.length,1,'logged out cannot speak');
assert(src.includes('if(!sessionFresh(n))return;'),'only live notifications may show toast');
console.log('YARDON_PUBLIC_NAJ_AND_SESSION_VOICE_QA_PASS');
