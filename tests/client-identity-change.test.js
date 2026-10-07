'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let saved=null,calls=0;
const ctx={window:{},localStorage:{getItem:()=>saved},sessionStorage:{getItem:()=>null},crypto:{randomUUID:()=> 'request-id'},AbortSignal,JSON,fetch:async()=>{calls++;return {ok:true,json:async()=>({completed:false})}}};
vm.runInNewContext(fs.readFileSync('secure-game-client.js','utf8'),ctx);
(async()=>{
 const game=new ctx.window.HardleSecureGame('djdle');await game.start();saved=JSON.stringify({access_token:'test',user:{id:'account-a'}});
 await assert.rejects(game.guess('SEFA'),/Login changed/);assert.equal(calls,1);
 const accountGame=new ctx.window.HardleSecureGame('djdle');await accountGame.start();saved=null;
 await assert.rejects(accountGame.guess('SEFA'),/Login changed/);assert.equal(calls,2);
 console.log('Login/logout changes require reload before another guess; no cross-identity request sent');
})().catch(e=>{console.error(e);process.exitCode=1});
