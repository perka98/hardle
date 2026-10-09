'use strict';
const crypto=require('node:crypto');
function pick(items,date,game,secret){if(!secret||secret.length<32)throw Error('Private puzzle seed required');if(!items.length)throw Error('Puzzle pool empty');const hash=crypto.createHmac('sha256',secret).update('hardle:v2:'+date+':'+game).digest();return items[hash.readUInt32BE(0)%items.length]}
function pickDjdle(items,date,secret){
 const groups=[
  {min:3,max:5,weight:15},
  {min:6,max:6,weight:15},
  {min:7,max:7,weight:20},
  {min:8,max:8,weight:15},
  {min:9,max:9,weight:15},
  {min:10,max:10,weight:7},
  {min:11,max:12,weight:8},
  {min:13,max:Infinity,weight:5}
 ].map(group=>({...group,items:items.filter(item=>item.normalized.length>=group.min&&item.normalized.length<=group.max)})).filter(group=>group.items.length);
 const total=groups.reduce((sum,group)=>sum+group.weight,0);
 if(!total)throw Error('DJdle pool empty');
 const roll=crypto.createHmac('sha256',secret).update('hardle:djdle-length:v1:'+date).digest().readUInt32BE(0)%total;
 let cursor=0,chosenGroup=groups[groups.length-1];
 for(const group of groups){cursor+=group.weight;if(roll<cursor){chosenGroup=group;break}}
 const hash=crypto.createHmac('sha256',secret).update('hardle:djdle-item:v1:'+date+':'+chosenGroup.min+'-'+chosenGroup.max).digest();
 return chosenGroup.items[hash.readUInt32BE(0)%chosenGroup.items.length];
}
function build({game,date,pool,secret,words=[],previousAnswers=[]}){
 const excluded=new Set(previousAnswers);
 const eligible=pool.filter(item=>!excluded.has(game==='djdle'?item.normalized:item.id));
 if(!eligible.length)throw Error('No non-repeating puzzle available');
 const chosen=game==='djdle'?pickDjdle(eligible,date,secret):pick(game==='daily'?eligible.filter(x=>x.audio||x.anonymousAudio):eligible,date,game,secret);
 if(game==='artist')return {publicPayload:{maxAttempts:6,clues:[chosen.clues[0]]},solution:{answer:chosen.id,accepted:pool.map(x=>x.id),reveal:{name:chosen.name,clues:chosen.clues},clues:chosen.clues,names:Object.fromEntries(pool.map(x=>[x.id,x.name]))}};
 if(game==='djdle')return {publicPayload:{maxAttempts:7,length:chosen.normalized.length},solution:{answer:chosen.normalized,accepted:[...new Set([...words,...pool.map(x=>x.normalized)])],reveal:{name:chosen.name}}};
 if(game==='daily'&&!chosen.audio&&!chosen.anonymousAudio)throw Error('Playable audio required');
 if(game==='daily')return {publicPayload:{maxAttempts:6,audio:chosen.audio||chosen.anonymousAudio,clipStart:chosen.title==='Pennywise'?180:20+(crypto.createHmac('sha256',secret).update('clip:'+date+':'+chosen.id).digest().readUInt32BE(0)%61)},solution:{answer:chosen.id,accepted:pool.map(x=>x.id),reveal:{title:chosen.title,artist:chosen.artist,country:chosen.country,genre:chosen.genre,year:chosen.year},catalog:pool}};
 if(game==='orderdle'){const ranked=eligible.map(x=>({...x,rank:crypto.createHmac('sha256',secret).update(date+':'+x.id).digest('hex')})).sort((a,b)=>a.rank.localeCompare(b.rank));const dates=new Set(),selected=ranked.filter(x=>{if(dates.has(x.birthDate))return false;dates.add(x.birthDate);return true}).slice(0,5);if(selected.length!==5)throw Error('Insufficient unique birth dates');const answer=[...selected].sort((a,b)=>b.birthDate.localeCompare(a.birthDate));return {publicPayload:{maxAttempts:1,items:selected.map(x=>({id:x.id,name:x.name}))},solution:{answer:answer.map(x=>x.id),reveal:answer.map(x=>({name:x.name,birthDate:x.birthDate}))}}}
 throw Error('Invalid game');
}
module.exports={pick,build};
