'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
assert(!config.rewrites,'Do not rely on post-filesystem rewrites for private sources');
const filesystem=config.routes.findIndex(route=>route.handle==='filesystem');
assert(filesystem>0);
for(const path of ['/server/private/songs.json','/server/private/artists.json','/supabase/launch-install.sql','/tests/security.test.js','/checks/daily-fresh.cjs']){
 const index=config.routes.findIndex(route=>route.src&&new RegExp(route.src).test(path));
 assert(index>=0&&index<filesystem,'Private path must be denied before filesystem: '+path);
 assert.equal(config.routes[index].dest,'/api/private-resource');
}
const handler=require('../api/private-resource');
for(const method of ['GET','HEAD','POST']){let status;handler({method},{setHeader(){},status(code){status=code;return this},end(){}});assert.equal(status,404)}
console.log('Private catalogs SQL and test sources denied before static filesystem; handler returns 404');
