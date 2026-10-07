'use strict';
const crypto=require('node:crypto'),security=require('../server/security'),auth=require('../server/auth'),limits=require('../server/rate-limit');
const {transaction}=require('../server/database'),{build}=require('../server/puzzles'),{evaluate}=require('../server/rules'),songFeedback=require('../server/song-feedback');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');if(process.env.VERCEL_ENV!=='preview')return res.status(404).end();if(req.method!=='POST'||!security.sameOrigin(req))return res.status(403).json({error:'Request rejected'});
 try{
 const data=security.body(req);if(!['daily','artist','djdle','orderdle'].includes(data.game)||!['start','guess'].includes(data.action)||Object.keys(data).some(k=>!['game','action','roundId','guess','requestId'].includes(k)))return res.status(400).json({error:'Invalid request'});
 const identity=await auth.player(req,res);if(!await limits.allow(req,identity.player,'preview-round'))return res.status(429).json({error:'Please wait'});
 const result=await transaction(async db=>{
 await db.query("select set_config('hardle.player_id',$1,true)",[identity.player]);
 if(data.action==='start'){
 const pool=require('../server/private/'+({daily:'songs',artist:'artists',djdle:'djs',orderdle:'order-people'}[data.game])+'.json');
 const latest=await db.query('select secret_solution from hardle_private.preview_rounds where player_id=$1 and game=$2 order by created_at desc limit 1',[identity.player,data.game]);
 const live=await db.query("select secret_solution from hardle_private.puzzles where game=$1 and puzzle_date=(now() at time zone 'Europe/Stockholm')::date",[data.game]);
 const exclusions=new Set();for(const row of [...latest.rows,...live.rows])for(const id of [].concat(row.secret_solution.answer||[]))exclusions.add(id);
 const words=data.game==='djdle'?require('../data/english-words.json').map(w=>w.toUpperCase().replace(/[^A-Z]/g,'')):[];
 const puzzle=build({game:data.game,date:crypto.randomUUID(),pool,secret:process.env.HARDLE_SESSION_SECRET,words,previousAnswers:[...exclusions]});
 const created=await db.query('insert into hardle_private.preview_rounds(player_id,game,public_payload,secret_solution) values($1,$2,$3,$4) returning id',[identity.player,data.game,puzzle.publicPayload,puzzle.solution]);
 return {roundId:created.rows[0].id,public_payload:puzzle.publicPayload,guesses:[],completed:false};
 }
 security.parseGuess({game:data.game,guess:data.guess,requestId:data.requestId});
 if(!/^[0-9a-f-]{36}$/.test(data.roundId||''))throw Error('Invalid round');
 const rows=await db.query('select * from hardle_private.preview_rounds where id=$1 and player_id=$2 and game=$3 for update',[data.roundId,identity.player,data.game]);const round=rows.rows[0];if(!round)throw Error('Round unavailable');
 const replay=round.guesses.find(g=>g.requestId===data.requestId);if(replay){if(JSON.stringify(replay.input)!==JSON.stringify(data.guess))throw Error('Request conflict');return replay.feedback}
 const secret=round.secret_solution;
 const evaluated=evaluate({game:data.game,solution:secret.answer,guess:data.guess,previous:round.guesses.map(g=>({canonical:g.guess.canonical,won:g.feedback.won})),accepted:new Set(secret.accepted||[])});
 const output={...evaluated};delete output.canonical;
 if(data.game==='daily'){const guessed=secret.catalog.find(x=>x.id===evaluated.canonical),answer=secret.catalog.find(x=>x.id===secret.answer);output.feedback=songFeedback.feedback(guessed,answer);output.guessed={title:guessed.title,artist:guessed.artist,country:guessed.country,genre:guessed.genre,year:guessed.year}}
 if(data.game==='artist'){output.guessed={name:secret.names?.[evaluated.canonical]};if(!evaluated.completed)output.clues=secret.clues.slice(0,evaluated.attempts+1)}
 if(evaluated.completed)output.answer=secret.reveal;
 round.guesses.push({requestId:data.requestId,input:data.guess,guess:{canonical:evaluated.canonical},feedback:output});
 await db.query('update hardle_private.preview_rounds set guesses=$2,completed=$3 where id=$1',[round.id,JSON.stringify(round.guesses),evaluated.completed]);return output;
 });return res.json(result);
 }catch(error){console.error('Preview round failed',{code:error.code||'TEST_ROUND_FAILED'});return res.status(409).json({error:'Test round unavailable or invalid guess'})}
};
