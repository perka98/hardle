'use strict';
const rateLimit=require('../server/rate-limit');
const security=require('../server/security');
const auth=require('../server/auth');
const {ensure}=require('../server/provision');
const {database}=require('../server/database');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'})}
 if(!security.sameOrigin(req))return res.status(403).json({error:'Origin rejected'});
 let data;try{data=security.body(req);if(Object.keys(data).some(k=>k!=='game')||!['daily','artist','djdle','orderdle'].includes(data.game))throw Error()}catch{return res.status(400).json({error:'Invalid request'})}
 // Explicitly disabled until all endpoints and clients have passed the security gates.
 if(process.env.HARDLE_SECURE_GAMEPLAY_ENABLED!=='true')return res.status(503).json({error:'Secure gameplay is not enabled yet',code:'VALIDATOR_NOT_READY'});
 const started=Date.now();let authMs=0,limitMs=0,puzzleMs=0;
 try{const identity=await auth.player(req,res),player=identity.player,db=database();authMs=Date.now()-started;const limitStarted=Date.now();if(!await rateLimit.allow(req,player,'session')){res.setHeader('Retry-After','60');return res.status(429).json({error:'Please wait before trying again'})}limitMs=Date.now()-limitStarted;const puzzleStarted=Date.now();await ensure(data.game);puzzleMs=Date.now()-puzzleStarted;const session=await db.query('select * from hardle_private.start_session($1,$2)',[player,data.game]);if(data.game==='artist'&&Array.isArray(session.rows[0]?.guesses)){
 const names=new Map(require('../server/private/artists.json').map(item=>[item.id,item.name]));
 for(const previous of session.rows[0].guesses){const name=names.get(previous.guess?.canonical);if(name)previous.feedback={...previous.feedback,guessed:{name}}}
 }
 if(data.game==='daily'){
 const catalog=require('../server/private/songs.json');
 const names=new Map(catalog.map(item=>[item.id,item]));
 for(const previous of session.rows[0]?.guesses||[]){const item=names.get(previous.guess?.canonical);if(item)previous.feedback={...previous.feedback,guessed:{title:item.title,artist:item.artist,country:item.country,genre:item.genre,year:item.year}}}
 const result=session.rows[0]?.result;
 if(session.rows[0]?.completed&&result?.answer){const item=catalog.find(item=>item.title===result.answer.title&&item.artist===result.answer.artist);if(item)result.answer={...result.answer,country:item.country,genre:item.genre,year:item.year}}
 }
 res.setHeader('Server-Timing',`auth;dur=${authMs},limit;dur=${limitMs},puzzle;dur=${puzzleMs},total;dur=${Date.now()-started}`);console.info('Secure session timing',{game:data.game,identityType:identity.userId?'account':'guest',completed:!!session.rows[0]?.completed,authMs,limitMs,puzzleMs,totalMs:Date.now()-started});return res.status(200).json(session.rows[0])}
 catch(error){if(error.message==='Invalid authentication')return res.status(401).json({error:'Please sign in again'});console.error('Secure session unavailable',{code:error.code||'BACKEND_UNAVAILABLE'});return res.status(503).json({error:'Secure game backend is unavailable'})}
};
