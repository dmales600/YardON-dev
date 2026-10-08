'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
let passed=0;
function check(label,fn){fn();passed++;console.log('PASS '+label)}
const ui=read('modules/smart/yardon-smart-center-v1.js');
const map=read('modules/supplier/script-022.js');
const requests=read('modules/supplier/yardivo-v582-supplier-planner-canonical-fix.js');
const actions=read('modules/supplier/yardivo-v583-inventory-supplier-actions-fix-20260923.js');
const back=read('supabase/functions/yardivo-ai-operations/index.ts');
const supplier=read('supabase/functions/yardivo-supplier-time-ops/index.ts');
const qr=read('modules/supplier/yardivo-gate-qr-supplier-v583.js');
const alerts=read('modules/master-data/yardivo-v548-full-operational-notifications.js');
const index=read('index.html');
check('exactly one SMART page and zero old AI Operations page',()=>{
 assert.equal((index.match(/id="smartReplanning"/g)||[]).length,1);
 assert(!index.includes('id="aiOperations"'));
 assert(index.includes('src="modules/smart/yardon-smart-center-v1.js'));
});
check('supplier inbox has SMART icon before inventory confirms',()=>{
 assert(requests.includes('data-yv-smart-preview='));
 assert(!requests.includes('data-v583-approve-request='));
 assert(actions.includes('window.YardOnSmartCenter.previewRequest'));
});
check('preview is read-only, role and warehouse scoped, capacity checked',()=>{
 const start=back.indexOf('async function previewSupplierRequest('),end=back.indexOf('Deno.serve(',start);
 assert(start>0&&end>start);
 const scope=back.slice(start,end);
 for(const marker of ["allowedWarehouses(p,m)","canonicalSupplier(","rampList(w)","occupancy.some","candidates.sort","readOnly:true"])
  assert(scope.includes(marker),'missing '+marker);
 assert(!/\.insert\(|\.update\(|\.upsert\(|writeState\(/.test(scope),'preview cannot write to DB');
});
check('approval only from reviewed map, new slot checked twice',()=>{
 for(const marker of ['function confirmablePreview()','function proposalCell()',
  "action:'preview_request',delivery_id:p.id","latest.candidate.dock!==p.candidate.dock",
  "latest.candidate.time!==p.candidate.time","status:'confirmed',dock:null,smart_preview_ramp:Number(p.candidate.dock)",
  "window.YardivoGateQrV583.issueAfterSmartApproval(p.id)"])
 assert(ui.includes(marker),'missing '+marker);
});
check('alternate time is supplier proposal, QR blocked until accepted',()=>{
 assert(ui.includes("if(latest.candidate.time!==p.time)"));
 assert(ui.includes("status:'proposal_sent'"));
 assert(ui.includes('QR nije izdan.'));
 const idx=ui.indexOf("if(latest.candidate.time!==p.time)");
 const issue=ui.indexOf("issueAfterSmartApproval(p.id)",idx);
 assert(idx>0&&issue>idx);
 assert(ui.slice(idx,issue).includes('return;'));
});
check('gate QR remains protected by canonical service role/confirm',()=>{
 assert(qr.includes('async function issueAfterSmartApproval(id)'));
 assert(qr.includes("if(!['inventory','admin'].includes(role()))throw"));
 assert(qr.includes("await edge('issue',{announcementId})"));
 const gate=read('supabase/functions/yardivo-gate-pass/index.ts');
 assert(gate.includes('validateIssueAnnouncement(id)'));
});
check('supplier confirmation sends targeted written notification and provisional ramp',()=>{
 assert(supplier.includes("async function notifySupplierConfirmed(x:any,authUserId:any)"));
 assert(supplier.includes("targetSupplierAuthUserId:String(x.supplier_auth_user_id||'')"));
 assert(supplier.includes("await notifySupplierConfirmed(data,p.auth_user_id)"));
 assert(supplier.includes('SMART PREVIEW R'));
 assert(supplier.includes('rampa, nije konačna'));
});
check('Reception duplicate creation suppressed only for supplier mirror',()=>{
 assert(alerts.includes("if(s.supplierDeliveryId||String(s.id).startsWith('SUPDEL-'))return;"));
 assert(alerts.includes("push('ANNOUNCEMENT_NEWS'"),'operational events should stay');
});
check('daily map reconciles grid cells and highlights only provisional slot',()=>{
 assert(map.includes("key==='yvDailyMapSig'"));
 assert(map.includes('current.replaceWith(node)'));
 assert(map.includes('yv-smart-proposed-cell'));
 assert(map.includes('data-move-time'));
 assert(map.includes('previewTarget?.()'));
});
check('SMART history records approvals, rejections and alternate proposals',()=>{
 for(const marker of ['action==="record_request_review"','decision==="proposal_sent"',"problemType:\"SUPPLIER_REQUEST_REVIEW\"","await writeState(\"yardivo_ai_operations_plan_log_v1\""])
 assert(back.includes(marker),'missing '+marker);
});
console.log('YARDON_SMART_REQUEST_REVIEW_STATIC_QA_PASS '+passed+'/'+passed);
