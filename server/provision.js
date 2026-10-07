'use strict';
const fs=require('node:fs'),path=require('node:path');const {build}=require('./puzzles'),{date}=require('./security'),{database}=require('./database');
let cachedWords;
async function ensure(game){
 if(!['daily','artist','djdle','orderdle'].includes(game))throw Error('Invalid game');
 const existing=await database().query("select 1 from hardle_private.puzzles where puzzle_date=(now() at time zone 'Europe/Stockholm')::date and game=$1 limit 1",[game]);
 if(existing.rows.length)return;
const seed=process.env.HARDLE_SESSION_SECRET;if(!seed)throw Error('Private seed unavailable');let pool,words=[];if(game==='artist')pool=require('./private/artists.json');else if(game==='djdle'){pool=require('./private/djs.json');words=cachedWords||(cachedWords=[...new Set(JSON.parse(fs.readFileSync(path.join(__dirname,'../data/english-words.json'),'utf8')).map(x=>x.toUpperCase().replace(/[^A-Z]/g,'')))])}else if(game==='orderdle')pool=require('./private/order-people.json');else if(game==='daily')pool=require('./private/songs.json');else throw Error('Invalid game');const previous=await database().query('select hardle_private.previous_answers($1) as answers',[game]);const previousAnswers=previous.rows[0]?.answers;if(!Array.isArray(previousAnswers))throw Error('Invalid previous puzzle response');const puzzle=build({game,date:date(),pool,secret:seed,words,previousAnswers});await database().query('select hardle_private.ensure_puzzle($1,$2,$3)',[game,puzzle.solution,puzzle.publicPayload])}
module.exports={ensure};
