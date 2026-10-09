'use strict';
const assert=require('node:assert/strict'),Module=require('node:module');
const correction=require('../server/artist-clue-correction');
const old=['Age: 46','Label: Art of Creation','Active since: 2005'];
const secret={answer:correction.artistId,clues:old,reveal:{name:'Noisecontrollers',clues:old}};
const snapshot={public_payload:{maxAttempts:6,clues:old.slice(0,1)},guesses:[{guess:{canonical:'artist-1'},feedback:{clues:old.slice(0,2),attempts:1,won:false}}],completed:false,result:null};
const saved=JSON.stringify(snapshot);
assert.equal(correction.solution(secret).clues[1],'Label: Spirit of Hardstyle');
assert.equal(secret.clues[1],'Label: Art of Creation');
assert.equal(correction.session(snapshot,'artist-1'),snapshot);
assert.deepEqual(correction.session(snapshot,secret.answer).public_payload.clues,old.slice(0,1));
assert.equal(correction.feedback({answer:secret.reveal,score:850}).answer.clues[1],'Label: Spirit of Hardstyle');
let identity;
const load=Module._load;
Module._load=function(id,parent,...args){
 if(parent?.filename.endsWith('/api/game-session.js')){
  if(id==='../server/auth')return {player:async()=>identity};
  if(id==='../server/rate-limit')return {allow:async()=>true};
  if(id==='../server/provision')return {ensure:async()=>{}};
  if(id==='../server/database')return {database:()=>({query:async sql=>({rows:sql.includes('start_session')?[JSON.parse(saved)]:[{secret_solution:secret}]})})};
 }
 return load.call(this,id,parent,...args);
};
const handler=require('../api/game-session');Module._load=load;
process.env.HARDLE_SECURE_GAMEPLAY_ENABLED='true';
(async()=>{
 for(const account of [false,true]){
  identity={player:account?'user:test':'guest:test',userId:account?'test':null};
  const res={setHeader(){},status(n){this.code=n;return this},json(body){this.body=body}};
  await handler({method:'POST',headers:{origin:'https://hardle.app',host:'hardle.app'},body:{game:'artist'}},res);
  assert.equal(res.code,200);assert.equal(res.body.guesses[0].feedback.clues[1],'Label: Spirit of Hardstyle');
  assert.equal(res.body.guesses[0].feedback.attempts,1);assert.equal(res.body.completed,false);
 }
 assert.equal(JSON.stringify(snapshot),saved);
 console.log('Guest/account session paths correct stale Noisecontrollers clues without resetting progress or revealing extra clues.');
})().catch(error=>{console.error(error);process.exitCode=1});
