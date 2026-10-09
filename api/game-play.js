'use strict';
const rateLimit=require('../server/rate-limit');
const security=require('../server/security');
const auth=require('../server/auth');
const {database}=require('../server/database');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'})}
 if(!security.sameOrigin(req))return res.status(403).json({error:'Origin rejected'});
 let data;try{data=security.body(req);if(Object.keys(data).some(k=>k!=='game')||!['daily','artist','djdle','orderdle'].includes(data.game))throw Error()}catch{return res.status(400).json({error:'Invalid request'})}
 if(process.env.HARDLE_SECURE_GAMEPLAY_ENABLED!=='true')return res.status(503).json({error:'Secure gameplay is not enabled yet',code:'VALIDATOR_NOT_READY'});
 try{
  const identity=await auth.player(req,res),player=identity.player;
  if(!await rateLimit.allow(req,player,'play')){res.setHeader('Retry-After','60');return res.status(429).json({error:'Please wait before starting again'})}
  const db=database();
  const result=await db.query('select hardle_private.start_play($1,$2) as play_started_at',[player,data.game]);
  const started=result.rows[0]?.play_started_at;
  if(!started)throw Error('Session required');
  return res.status(200).json({playStartedAt:started});
 }catch(error){
  if(error.message==='Invalid authentication')return res.status(401).json({error:'Please sign in again'});
  if(error.message==='Session required')return res.status(409).json({error:error.message});
  console.error('Secure play unavailable',{code:error.code||'BACKEND_UNAVAILABLE'});
  return res.status(503).json({error:'Secure game backend is unavailable'});
 }
};