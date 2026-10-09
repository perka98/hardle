'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
async function run(fail){
 let saved=JSON.stringify({access_token:'expired',refresh_token:'refresh-test',expires_at:1}),calls=[];
 const ctx={window:{HardleAccountConfig:{url:'https://auth.example',key:'public-test'}},localStorage:{getItem:()=>saved,setItem:(k,v)=>{saved=v}},sessionStorage:{getItem:()=>null},AbortSignal,JSON,fetch:async(path,opts)=>{calls.push({path,opts});if(path.includes('refresh_token'))return {ok:!fail,json:async()=>({access_token:'new-test',user:{id:'verified-test'},expires_at:9999999999})};assert.equal(opts.headers.Authorization,'Bearer new-test');return {ok:true,json:async()=>({completed:false})}}};
 vm.runInNewContext(fs.readFileSync('secure-game-client.js','utf8'),ctx);
 const game=new ctx.window.HardleSecureGame('daily');
 if(fail){await assert.rejects(game.start(),/sign in/);assert.equal(calls.length,1);assert.equal(JSON.parse(saved).access_token,'expired')}
 else{await game.start();assert.equal(calls.length,2);assert.equal(JSON.parse(saved).access_token,'new-test')}
}
(async()=>{await run(false);await run(true);console.log('Expired account session refreshes before gameplay; failed refresh sends no guest game request')})().catch(e=>{console.error(e);process.exitCode=1});
