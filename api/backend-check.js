'use strict';
const security=require('../server/security');
const {database}=require('../server/database');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(process.env.VERCEL_ENV!=='preview')return res.status(404).end();
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!security.sameOrigin(req))return res.status(403).json({error:'Origin rejected'});
 if(!process.env.HARDLE_DATABASE_URL||!process.env.HARDLE_SESSION_SECRET||!process.env.SUPABASE_URL||!process.env.SUPABASE_PUBLISHABLE_KEY)return res.status(503).json({status:'configuration_missing'});
 try{
 const db=database();
 const check=await db.query("select current_user='hardle_validator' as restricted_role, to_regprocedure('hardle_private.start_session(text,text)') is not null as sessions, to_regprocedure('hardle_private.take_rate_limit(text,integer)') is not null as rate_limits, to_regprocedure('hardle_private.ensure_puzzle(text,jsonb,jsonb)') is not null as puzzles");
 const c=check.rows[0];
 if(!c.restricted_role)return res.status(503).json({status:'wrong_database_role'});
 if(!c.sessions||!c.rate_limits||!c.puzzles)return res.status(503).json({status:'database_functions_missing'});
 // Persistent global limit: no secret values or internal SQL errors are returned.
 const limited=await db.query('select hardle_private.take_rate_limit($1,$2) as allowed',['preview-backend-check',10]);
 if(!limited.rows[0]?.allowed){res.setHeader('Retry-After','60');return res.status(429).json({status:'please_wait'})}
 return res.json({status:'database_connected',secureGameplayEnabled:false,message:'Database connection and session functions checked. Game migration is still incomplete.'});
 }catch(error){console.error('Backend readiness check failed',{code:error.code||'CONNECTION_FAILURE'});return res.status(503).json({status:'database_check_failed',message:'Check the preview server logs for a sanitized error code.'})}
};
