'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let headers;
const ctx={window:{},localStorage:{getItem:()=>JSON.stringify({access_token:'test-token'})},sessionStorage:{getItem:()=>null},AbortSignal,JSON,fetch:async(path,options)=>{headers=options.headers;return {ok:true,json:async()=>({completed:false})}}};
vm.runInNewContext(fs.readFileSync('secure-game-client.js','utf8'),ctx);
(async()=>{await new ctx.window.HardleSecureGame('djdle').start();assert.equal(headers.Authorization,'Bearer test-token');console.log('New-tab game uses shared account token rather than guest identity')})().catch(e=>{console.error(e);process.exitCode=1});
