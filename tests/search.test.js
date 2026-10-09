'use strict';
const assert=require('node:assert/strict'),Module=require('node:module'),original=Module._load;
Module._load=function(id,parent,...rest){if(parent?.filename.endsWith('/api/secure-search.js')){if(id==='../server/auth')return {player:async()=>({player:'test'})};if(id==='../server/rate-limit')return {allow:async()=>true}}return original.call(this,id,parent,...rest)};
const handler=require('../api/secure-search');Module._load=original;
const response=()=>({status(n){this.code=n;return this},setHeader(){},json(body){this.body=body;return this}});
(async()=>{
 const req={method:'POST',headers:{origin:'https://hardle.app',host:'hardle.app'},body:{game:'daily',query:'a'}};
 process.env.HARDLE_SECURE_GAMEPLAY_ENABLED='true';
 const res=response();await handler(req,res);assert(Array.isArray(res.body.items));assert(res.body.items.length<=12);assert(res.body.items.length>0);
 for(const item of res.body.items)assert.deepEqual(Object.keys(item).sort(),['artist','id','title']);
 const invalid=response();await handler({...req,body:{...req.body,answer:true}},invalid);assert.equal(invalid.code,400);
 process.env.HARDLE_SECURE_GAMEPLAY_ENABLED='false';const disabled=response();await handler(req,disabled);assert.equal(disabled.code,503);
 console.log('Daily search returns bounded names/IDs only and stays disabled behind security gate');
})().catch(error=>{console.error(error);process.exitCode=1});
