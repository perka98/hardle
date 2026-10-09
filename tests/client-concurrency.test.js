'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let calls=0,resolve;
const context={window:{},sessionStorage:{getItem:()=>null},crypto:{randomUUID:()=> 'request-id'},AbortSignal,JSON,fetch:async()=>{calls++;return new Promise(r=>{resolve=r})}};
vm.runInNewContext(fs.readFileSync('secure-game-client.js','utf8'),context);
(async()=>{
 const client=new context.window.HardleSecureGame('djdle');client.state={completed:false};
 const first=client.guess('SEFA'),second=client.guess('SEFA');
 await assert.rejects(client.guess('FRAW'),/pending guess/);
 assert.equal(calls,1);
 resolve({ok:true,json:async()=>({attempts:1,completed:false})});
 assert.equal((await first).attempts,1);assert.equal((await second).attempts,1);
 assert.equal(client.inFlight,null);assert.equal(client.pending,null);
 console.log('Concurrent identical taps share one request; different guesses blocked while pending');
})().catch(error=>{console.error(error);process.exitCode=1});
