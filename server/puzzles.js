'use strict';
const crypto=require('node:crypto');
function pick(items,date,game,secret){if(!secret||secret.length<32)throw Error('Private puzzle seed required');if(!items.length)throw Error('Puzzle pool empty');const hash=crypto.createHmac('sha256',secret).update('hardle:v2:'+date+':'+game).digest();return items[hash.readUInt32BE(0)%items.length]}
function build({game,date,pool,secret,words=[],previousAnswers=[]}){
 const excluded=new Set(previousAnswers);
 const eligible=pool.filter(item=>!excluded.has(game==='djdle'?item.normalized:item.id));
 if(!eligible.length)throw Error('No non-repeating puzzle available');
 const chosen=pick(eligible,date,game,secret);
 if(game==='artist')return {publicPayload:{maxAttempts:6,clues:[chosen.clues[0]]},solution:{answer:chosen.id,accepted:pool.map(x=>x.id),reveal:{name:chosen.name},clues:chosen.clues}};
 if(game==='djdle')return {publicPayload:{maxAttempts:7,length:chosen.normalized.length},solution:{answer:chosen.normalized,accepted:[...new Set([...words,...pool.map(x=>x.normalized)])],reveal:{name:chosen.name}}};
 if(game==='daily'&&!chosen.audio&&!chosen.anonymousAudio)throw Error('Playable audio required');
 if(game==='daily')return {publicPayload:{maxAttempts:6,audio:chosen.audio||chosen.anonymousAudio},solution:{answer:chosen.id,accepted:pool.map(x=>x.id),reveal:{title:chosen.title,artist:chosen.artist},catalog:pool}};
 if(game==='orderdle'){const ranked=eligible.map(x=>({...x,rank:crypto.createHmac('sha256',secret).update(date+':'+x.id).digest('hex')})).sort((a,b)=>a.rank.localeCompare(b.rank));const dates=new Set(),selected=ranked.filter(x=>{if(dates.has(x.birthDate))return false;dates.add(x.birthDate);return true}).slice(0,5);if(selected.length!==5)throw Error('Insufficient unique birth dates');const answer=[...selected].sort((a,b)=>b.birthDate.localeCompare(a.birthDate));return {publicPayload:{maxAttempts:1,items:selected.map(x=>({id:x.id,name:x.name}))},solution:{answer:answer.map(x=>x.id),reveal:answer.map(x=>({name:x.name,birthDate:x.birthDate}))}}}
 throw Error('Invalid game');
}
module.exports={pick,build};
