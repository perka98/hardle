'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let calls=[],fail=true;
const context={window:{},sessionStorage:{getItem:()=>null},crypto:{randomUUID:()=> 'test-request'},AbortSignal,JSON,fetch:async(path,options)=>{calls.push(JSON.parse(options.body));if(fail){fail=false;throw Error('Network interrupted')}return {ok:true,json:async()=>({completed:true,score:1000})}}};
vm.runInNewContext(fs.readFileSync('secure-game-client.js','utf8'),context);
(async()=>{
 const game=new context.window.HardleSecureGame('orderdle');game.state={completed:false};
 const order=['a','b','c','d','e'];
 await assert.rejects(game.guess(order),/Network interrupted/);
 order.reverse();
 assert.deepEqual(game.pending.guess,['a','b','c','d','e']);
 await assert.rejects(game.guess(order),/pending guess/);
 await game.guess(['a','b','c','d','e']);
 assert.deepEqual(calls[0],calls[1]);
 console.log('Changing UI order cannot mutate pending guess or retry payload');
})().catch(error=>{console.error(error);process.exitCode=1});
