'use strict';
const assert=require('node:assert/strict'),{evaluate}=require('../server/rules');
for(const game of ['daily','artist','djdle']){
 const max=game==='djdle'?7:6,solution='AAAA',accepted=new Set(['AAAA','BBBB']);
 for(let attempt=1;attempt<=max;attempt++){
  const previous=Array.from({length:attempt-1},(_,i)=>({canonical:'MISS'+i,won:false}));
  const wrong=evaluate({game,solution,guess:'BBBB',previous,accepted});
  assert.equal(wrong.completed,attempt===max);assert.equal(wrong.score,attempt===max?0:null);
  assert.equal(wrong.attempts,attempt);
  const correct=evaluate({game,solution,guess:solution,previous,accepted});
  assert.equal(correct.completed,true);assert.equal(correct.score,[1000,850,700,550,400,250,100][attempt-1]);
 }
 for(const previous of [Array.from({length:max},()=>({won:false})),[{won:true}]])assert.throws(()=>evaluate({game,solution,guess:solution,previous,accepted}),/Game completed/);
}
const solution=['a','b','c','d','e'];
function permutations(items){if(!items.length)return [[]];return items.flatMap((x,i)=>permutations(items.filter((_,j)=>i!==j)).map(rest=>[x,...rest]))}
for(const guess of permutations(solution)){
 const data=evaluate({game:'orderdle',solution,guess,previous:[]});
 const count=guess.filter((id,i)=>id===solution[i]).length;
 assert.equal(data.score,count*200);assert.equal(data.won,count===5);assert.equal(data.completed,true);
 assert.throws(()=>evaluate({game:'orderdle',solution,guess,previous:[{canonical:guess,won:data.won}]}),/Game completed/);
}
console.log('All-game attempt limits, score scales, completion locks and 120 Orderdle permutations passed');
