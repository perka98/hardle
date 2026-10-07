'use strict';
const {transaction}=require('./database');
const {evaluate,normalize}=require('./rules');
const {isDeepStrictEqual}=require('node:util');
const songFeedback=require('./song-feedback');
// Requires reviewed database grants/RLS or a private server transaction function.
// Never called by current browser games. Authenticated identities must be verified upstream.
function createSubmit(runTransaction){return async function submit({player,userId=null,date,game,guess,requestId}){
 return runTransaction(async client=>{
  await client.query("select set_config('hardle.player_id',$1,true)",[player]);
  const session=await client.query('select * from hardle_private.sessions where player_id=$1 and puzzle_date=$2 and game=$3 for update',[player,date,game]);
  const s=session.rows[0];if(!s)throw Error('Session required');
  const replay=await client.query('select guess,feedback from hardle_private.guesses where session_id=$1 and request_id=$2',[s.id,requestId]);if(replay.rows.length){const canonical=game==='djdle'?normalize(guess):game==='orderdle'?guess:String(guess);if(!isDeepStrictEqual(replay.rows[0].guess?.canonical,canonical))throw Error('Request ID reused with a different guess');return replay.rows[0].feedback;}
  if(s.completed)throw Error('Game completed');
  const p=await client.query('select secret_solution from hardle_private.puzzles where puzzle_date=$1 and game=$2',[date,game]);const secret=p.rows[0]?.secret_solution;if(!secret)throw Error('Puzzle unavailable');
  const history=await client.query('select guess,feedback from hardle_private.guesses where session_id=$1 order by attempt',[s.id]);
  const previous=history.rows.map(r=>({canonical:r.guess.canonical,won:r.feedback.won}));
  const evaluated=evaluate({game,solution:secret.answer,guess,previous,accepted:new Set(secret.accepted||[])});
  if(game==='daily'){const guessed=secret.catalog.find(x=>x.id===evaluated.canonical),answer=secret.catalog.find(x=>x.id===secret.answer);if(!guessed||!answer)throw Error('Puzzle data invalid');evaluated.feedback=songFeedback.feedback(guessed,answer)}
  const response={feedback:evaluated.feedback,won:evaluated.won,attempts:evaluated.attempts,completed:evaluated.completed,score:evaluated.score};
  if(game==='daily'){const item=secret.catalog.find(x=>x.id===evaluated.canonical);response.guessed={title:item.title,artist:item.artist,country:item.country,genre:item.genre,year:item.year}}
  if(game==='artist')response.guessed={name:secret.names?.[evaluated.canonical]||'Previous artist guess'};
  if(game==='artist'&&!evaluated.completed)response.clues=secret.clues.slice(0,evaluated.attempts+1);
  if(evaluated.completed)response.answer=secret.reveal;
  await client.query('insert into hardle_private.guesses(session_id,attempt,request_id,guess,feedback) values($1,$2,$3,$4,$5)',[s.id,evaluated.attempts,requestId,{canonical:evaluated.canonical},response]);
  await client.query('update hardle_private.sessions set attempts=$2,completed=$3 where id=$1',[s.id,evaluated.attempts,evaluated.completed]);
  if(evaluated.completed){await client.query('insert into hardle_private.results(session_id,player_id,user_id,puzzle_date,game,score,won,attempts) values($1,$2,$3,$4,$5,$6,$7,$8)',[s.id,player,userId,date,game,evaluated.score,evaluated.won,evaluated.attempts]);if(Date.now()-new Date(s.started_at).getTime()<1000)await client.query('insert into hardle_private.review_flags(session_id,category,detail) values($1,$2,$3)',[s.id,'fast_completion',{elapsedMs:Date.now()-new Date(s.started_at).getTime()}])}
  return response;
 });
};}
const submit=createSubmit(transaction);
module.exports={submit,createSubmit};
