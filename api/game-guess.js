'use strict';
const security=require('../server/security'),auth=require('../server/auth'),rateLimit=require('../server/rate-limit');
const {database}=require('../server/database'),{submit}=require('../server/submissions');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'})}
 if(!security.sameOrigin(req))return res.status(403).json({error:'Origin rejected'});
 let data;try{data=security.parseGuess(security.body(req))}catch{return res.status(400).json({error:'Invalid guess request'})}
 // Fail closed. Do not enable until database permissions, transactions and clients are audited.
 if(process.env.HARDLE_SECURE_GAMEPLAY_ENABLED!=='true')return res.status(503).json({error:'Secure gameplay is not enabled yet',code:'VALIDATOR_NOT_READY'});
 try{const identity=await auth.player(req,res),player=identity.player;if(!await rateLimit.allow(req,player,'guess')){res.setHeader('Retry-After','60');return res.status(429).json({error:'Please wait before guessing again'})}const result=await submit({player,userId:identity.userId,date:security.date(),...data});console.info('Secure guess result',{game:data.game,identityType:identity.userId?'account':'guest',completed:!!result.completed,replayOrAttempt:result.attempts});return res.status(200).json(result)}catch(error){if(error.message==='Invalid authentication')return res.status(401).json({error:'Please sign in again'});const publicErrors=['Session required','Game completed','Invalid order','Unrecognized guess','Duplicate guess','Incorrect word length'];if(publicErrors.includes(error.message))return res.status(409).json({error:error.message});console.error('Secure guess unavailable',{code:error.code||'BACKEND_UNAVAILABLE'});return res.status(503).json({error:'Secure game backend is unavailable'})}
};
