'use strict';
const assert=require('node:assert/strict');
const Module=require('node:module'),original=Module._load;
let response=['yesterday'],calls=[];
Module._load=function(id,parent,...rest){
 if(parent?.filename.endsWith('/server/provision.js')){
  if(id==='./database')return {database:()=>({query:async(sql,args)=>{calls.push({sql,args});return sql.startsWith('select 1')?{rows:[]}:{rows:[{answers:response}]}}})};
  if(id==='./puzzles')return {build:input=>{assert.deepEqual(input.previousAnswers,['yesterday']);return {solution:{},publicPayload:{}}}};
  if(id==='./private/artists.json')return [];
 }
 return original.call(this,id,parent,...rest);
};
const {ensure}=require('../server/provision');
Module._load=original;
process.env.HARDLE_SESSION_SECRET='test-only-secret'.repeat(3);
(async()=>{
 await ensure('artist');
 assert.match(calls[1].sql,/previous_answers/);assert.deepEqual(calls[1].args,['artist']);
 assert.match(calls[2].sql,/ensure_puzzle/);
 response=null;calls=[];
 await assert.rejects(ensure('artist'),/Invalid previous puzzle response/);
 assert.equal(calls.length,2);
 console.log('Provision passes persisted previous answers and fails closed on invalid response');
})().catch(error=>{console.error(error);process.exitCode=1});
