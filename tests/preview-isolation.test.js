'use strict';
const assert=require('node:assert/strict');
const handlers=['preview-game'].map(name=>require('../api/'+name));
function response(){return {setHeader(){},status(code){this.code=code;return this},end(){this.ended=true;return this},json(){return this}}}
(async()=>{for(const [environment,branch] of [['production','vercel-agent/anti-cheat-continue'],['preview','main'],['development','vercel-agent/anti-cheat-continue']]){process.env.VERCEL_ENV=environment;process.env.VERCEL_GIT_COMMIT_REF=branch;for(const handler of handlers){const res=response();await handler({method:'POST',headers:{}},res);assert.equal(res.code,404);assert.equal(res.ended,true)}}console.log('All test helpers reject production and unrelated preview branches before database access')})().catch(error=>{console.error(error);process.exitCode=1});
