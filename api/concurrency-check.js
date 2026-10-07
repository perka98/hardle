'use strict';
const crypto=require('node:crypto'),security=require('../server/security');
const {database,transaction}=require('../server/database'),{ensure}=require('../server/provision'),{submit}=require('../server/submissions');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(process.env.VERCEL_ENV!=='preview')return res.status(404).end();
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!security.sameOrigin(req))return res.status(403).json({error:'Origin rejected'});
 let player,db;
 try{
 db=database();
 const limit=await db.query('select hardle_private.take_rate_limit($1,$2) as allowed',['preview-concurrency-test',2]);
 if(!limit.rows[0]?.allowed)return res.status(429).json({status:'please_wait'});
 await ensure('djdle');
 const created=await db.query('select * from hardle_private.create_concurrency_test()');player=created.rows[0]?.player;
 if(!/^guest:concurrency-test-[0-9a-f-]{36}$/.test(player||''))throw Error('Invalid test fixture');
 const date=security.date();
 const puzzle=await db.query('select secret_solution from hardle_private.puzzles where puzzle_date=$1 and game=$2',[date,'djdle']);
 const guess=puzzle.rows[0]?.secret_solution?.answer;if(typeof guess!=='string')throw Error('Invalid test puzzle');
 const input={player,date,game:'djdle',guess,requestId:crypto.randomUUID()};
 const responses=await Promise.all([submit(input),submit(input)]);
 if(JSON.stringify(responses[0])!==JSON.stringify(responses[1]))throw Error('Replay mismatch');
 const duplicate=await Promise.allSettled([submit({...input,requestId:crypto.randomUUID()}),submit({...input,requestId:crypto.randomUUID()})]);
 if(duplicate.some(x=>x.status!=='rejected'||x.reason.message!=='Game completed'))throw Error('Completed round accepted another guess');
 await transaction(async client=>{
 await client.query("select set_config('hardle.player_id',$1,true)",[player]);
 const counts=await client.query('select (select count(*) from hardle_private.guesses g join hardle_private.sessions s on s.id=g.session_id where s.player_id=$1)::integer as guesses,(select count(*) from hardle_private.results where player_id=$1)::integer as results',[player]);
 if(counts.rows[0]?.guesses!==1||counts.rows[0]?.results!==1)throw Error('Duplicate award detected');
 });
 await db.query('select hardle_private.cleanup_concurrency_test($1)',[player]);player=null;
 return res.json({status:'concurrency_verified',message:'Concurrent replay: one guess and one result. Completed round rejects new requests. Test player removed.'});
 }catch(error){console.error('Preview concurrency test failed',{code:error.code||'TEST_FAILED'});return res.status(503).json({status:'concurrency_test_failed'})}
 finally{if(player&&db)try{await db.query('select hardle_private.cleanup_concurrency_test($1)',[player])}catch{console.error('Preview test cleanup failed',{code:'TEST_CLEANUP_FAILED'})}}
};
