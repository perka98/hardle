'use strict';const assert=require('node:assert/strict'),{build}=require('../server/puzzles');const common={date:'2026-10-07',secret:'private-seed-for-test-only-'.repeat(3)};const artist=build({...common,game:'artist',pool:[{id:'a',name:'Sefa',clues:['Age: 26','Label: Sefa Music','Active since: 2014','Country: NL','Genre: Frenchcore','First letter: S']}]});assert.deepEqual(artist.publicPayload,{maxAttempts:6,clues:['Age: 26']});assert(!JSON.stringify(artist.publicPayload).includes('Sefa'));const dj=build({...common,game:'djdle',pool:[{normalized:'SEFA',name:'Sefa'}],words:['FRAW']});assert.deepEqual(dj.publicPayload,{maxAttempts:7,length:4});assert(!JSON.stringify(dj.publicPayload).includes('SEFA'));const order=build({...common,game:'orderdle',pool:Array.from({length:8},(_,i)=>({id:'person'+i,name:'DJ '+i,birthDate:(1980+i)+'-01-01'}))});assert.equal(order.publicPayload.items.length,5);assert(!JSON.stringify(order.publicPayload).includes('birthDate'));assert.equal(order.solution.answer.length,5);assert.deepEqual(build({...common,game:'orderdle',pool:Array.from({length:8},(_,i)=>({id:'person'+i,name:'DJ '+i,birthDate:(1980+i)+'-01-01'}))}),order);console.log('Private puzzle determinism and minimal public payload tests passed');

const daily=build({...common,game:'daily',pool:[{id:'track1',title:'Example',artist:'DJ Example',audio:{soundcloud:'https://soundcloud.com/example/example'}}]});assert.equal(daily.publicPayload.audio.soundcloud,'https://soundcloud.com/example/example');assert(!Object.hasOwn(daily.publicPayload,'answer'));assert(!Object.hasOwn(daily.publicPayload,'title'));assert.equal(daily.solution.answer,'track1');console.log('Existing-media support checked; track identity remains discoverable from media URL by design.');

const people=Array.from({length:12},(_,i)=>({id:'p'+i,name:'DJ '+i,birthDate:(1980+i)+'-01-01'}));
let previous=[];
for(let day=0;day<100;day++){
 const date=new Date(Date.UTC(2026,9,7+day)).toISOString().slice(0,10);
 const puzzle=build({...common,date,game:'orderdle',pool:people,previousAnswers:previous});
 assert(puzzle.solution.answer.every(id=>!previous.includes(id)));
 previous=puzzle.solution.answer;
}
const artistPool=[{id:'a',name:'A',clues:['one']},{id:'b',name:'B',clues:['two']}];
assert.equal(build({...common,game:'artist',pool:artistPool,previousAnswers:['a']}).solution.answer,'b');
assert.equal(build({...common,game:'djdle',pool:[{normalized:'AAAA',name:'A'},{normalized:'BBBB',name:'B'}],previousAnswers:['AAAA']}).solution.answer,'BBBB');
assert.equal(build({...common,game:'daily',pool:[{id:'a',audio:{}},{id:'b',audio:{}}],previousAnswers:['a']}).solution.answer,'b');
assert.throws(()=>build({...common,game:'orderdle',pool:people,previousAnswers:people.map(p=>p.id)}),/No non-repeating/);
console.log('All-game previous-answer exclusions and 100 consecutive Orderdle rounds passed');
