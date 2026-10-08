'use strict';
/* Contract: index.html is the only browser runtime loader. This manifest must
   never claim stale historical scripts, hashes, or byte sizes as active assets. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const index=fs.readFileSync('index.html','utf8');
const m=JSON.parse(fs.readFileSync('app/module-manifest.json','utf8'));
const norm=url=>url.replace(/^\.\//,'').split('?')[0];
const allScripts=[...index.matchAll(/<script\b([^>]*)>/gi)].map(x=>{
 const attr=x[1],src=attr.match(/\bsrc=["']([^"']+)/)?.[1];
 return src?src:null;
}).filter(Boolean);
const remote=url=>/^(https?:)?\/\//.test(url);
const external=allScripts.filter(x=>!remote(x)).map(norm);
const vendor=allScripts.filter(remote);
const css=[...index.matchAll(/<link\b([^>]*rel=["']stylesheet["'][^>]*)>/gi)]
 .map(x=>x[1].match(/\bhref=["']([^"']+)/)?.[1])
 .filter(x=>x&&!/^https?:\/\//.test(x)).map(norm);
assert.equal(new Set(external).size,external.length,'Duplicate external JS load');
assert.equal(m.script_count,external.length,'Stale local module count');
assert.equal(m.third_party_script_count,vendor.length,'Stale vendor module count');
assert.deepEqual(m.third_party_scripts.map(x=>x.url),vendor,'Manifest CDN scripts differ from live index');
assert.deepEqual(m.scripts.map(x=>x.path),external,'Manifest differs from active index script order');
assert.equal(new Set(m.scripts.map(x=>x.path)).size,m.scripts.length);
assert.deepEqual(m.css.files,css,'Manifest CSS files do not match index');
assert(m.scripts.every(x=>!('sha256' in x)&&!('bytes' in x)),'Stale content metadata present');
const retired=['modules/services/yardivo-total-operational-wipe-v2-20260901-js.js',
 'modules/supplier/phase2-207-yardivo-factory-zero-ui-v583.js',
 'modules/supplier/phase2-309-yardivo-manager-single-view-hard-lock-v5.js'];
for(const path of retired)assert(!external.includes(path),'Retired module still loaded: '+path);
for(const path of [...external,...css])assert(fs.existsSync(path),'Missing runtime asset: '+path);
const changed=['modules/supplier/yardivo-control-tower-module.js',
 'modules/services/yardivo-epal-module.js',
 'modules/services/yardivo-order-search-module.js',
 'modules/master-data/script-024.js',
 'modules/auth/role-visibility.js'];
for(const path of changed){
 const original=[...index.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)/gi)]
  .map(x=>x[1]).find(x=>norm(x)===path);
 assert(original?.includes('?v=20261008-'),'Changed module missing release cache version: '+path);
}
console.log('YARDON_ACTIVE_MANIFEST_QA_PASS scripts='+external.length+' css='+css.length);
