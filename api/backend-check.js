'use strict';
const security=require('../server/security');
const {database,transaction}=require('../server/database');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_GIT_COMMIT_REF!=='vercel-agent/anti-cheat-continue')return res.status(404).end();
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!security.sameOrigin(req))return res.status(403).json({error:'Origin rejected'});
 if(!process.env.HARDLE_DATABASE_URL||!process.env.HARDLE_SESSION_SECRET||!process.env.SUPABASE_URL||!process.env.SUPABASE_PUBLISHABLE_KEY)return res.status(503).json({status:'configuration_missing'});
 try{
 const db=database();
 const check=await db.query("select current_user='hardle_validator' as restricted_role, to_regprocedure('hardle_private.start_session(text,text)') is not null as sessions, to_regprocedure('hardle_private.take_rate_limit(text,integer)') is not null as rate_limits, to_regprocedure('hardle_private.ensure_puzzle(text,jsonb,jsonb)') is not null as puzzles, to_regprocedure('hardle_private.previous_answers(text)') is not null as previous_answers");
 const c=check.rows[0];
 if(!c.restricted_role)return res.status(503).json({status:'wrong_database_role'});
 if(!c.sessions||!c.rate_limits||!c.puzzles||!c.previous_answers)return res.status(503).json({status:'database_functions_missing'});
 // Persistent global limit: no secret values or internal SQL errors are returned.
 const limited=await db.query('select hardle_private.take_rate_limit($1,$2) as allowed',['preview-backend-check',10]);
 if(!limited.rows[0]?.allowed){res.setHeader('Retry-After','60');return res.status(429).json({status:'please_wait'})}
 const helper=await db.query("select to_regprocedure('hardle_private.isolation_test_fixture()') is not null as installed");
 if(helper.rows[0]?.installed){
 const client=await db.connect();
 let passed=false;
 try{
 await client.query('begin');
 await client.query("set local statement_timeout='8000ms'");
 const fixture=await client.query('select * from hardle_private.isolation_test_fixture()');
 const {player_a,player_b}=fixture.rows[0];
 for(const [own,other] of [[player_a,player_b],[player_b,player_a]]){
 await client.query("select set_config('hardle.player_id',$1,true)",[own]);
 const visible=await client.query('select player_id from hardle_private.sessions where player_id=any($1::text[])',[[own,other]]);
 if(visible.rows.length!==1||visible.rows[0].player_id!==own)throw Error('Isolation verification failed');
 }
 passed=true;
 }finally{try{await client.query('rollback')}finally{client.release()}}
 if(passed)return res.json({status:'isolation_verified',secureGameplayEnabled:false});
 }
 const isolation=await transaction(async client=>{
 await client.query("select set_config('hardle.player_id',$1,true)",['guest:preview-isolation-check']);
 const rows=await client.query("select count(*)::integer as visible from hardle_private.sessions where player_id<>$1",['guest:preview-isolation-check']);
 return rows.rows[0]?.visible===0;
 });
 if(!isolation)return res.status(503).json({status:'isolation_check_failed'});
 return res.json({status:'database_connected',secureGameplayEnabled:false,message:'Database connection and functions checked; no other-player sessions visible to test identity. This does not prove isolation if no other sessions exist. Game migration is still incomplete.'});
 }catch(error){console.error('Backend readiness check failed',{code:error.code||'CONNECTION_FAILURE'});return res.status(503).json({status:'database_check_failed',message:'Check the preview server logs for a sanitized error code.'})}
};
