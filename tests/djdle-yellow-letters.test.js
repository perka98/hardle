'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {wordMarks}=require('../server/rules');
const source=fs.readFileSync(require.resolve('../djdle-server.js'),'utf8');
const implementation=source.slice(source.indexOf('function rebuildYellowLetters(){'),source.indexOf('\nfunction render('));
function summary(answer,guesses){
 const context={guesses,feedbackRows:guesses.map(word=>wordMarks(word,answer)),yellowLetters:[]};
 vm.createContext(context);vm.runInContext(implementation+'\nrebuildYellowLetters();',context);
 return Array.from(context.yellowLetters).sort();
}
let passed=0;
function check(name,guesses,expected,answer='DEVIATION'){
 assert.deepEqual(summary(answer,guesses),expected.slice().sort(),name);passed++;console.log('PASS '+name);
}
check('D E T greens have no unresolved duplicates',['DEXXXTXX'],[]);
check('two yellow I occurrences are confirmed in one guess',['IIXXXXXX'],['I','I']);
check('previous duplicate survives one green',['IIXXXXXX','XXXIXXXX'],['I']);
check('both distinct I positions solved across guesses',['IIXXXXXX','XXXIXXXX','XXXXXXIX'],[]);
check('both I green together',['IIXXXXXX','XXXIXXIX'],[]);
for(const letter of ['A','T','I'])check('single yellow '+letter+' is only one entry',[letter+'XXXXXXX'],[letter]);
check('historical yellow then unique green does not invent duplicate',['AXXXXXXX','XXXXAXXX'],[]);
check('single yellow I then green does not invent second I',['IXXXXXXX','XXXIXXXX'],[]);
check('repeated letters across guesses are not summed',['IXXXXXXX','XIXXXXXX','XXIXXXXX'],['I']);
check('two confirmed occurrences minus one green in same guess',['IXXIXXXX'],['I']);
check('gray surplus duplicates do not inflate count',['IIIIIIII'],[]);
check('gray surplus with two yellows does not inflate count',['IIIXXIXX'],['I','I']);
check('repeated green position counted once',['IIXXXXXX','XXXIXXXX','XXXIXXXZ'],['I']);
check('gray absent letters never appear',['XXXXXXXX'],[]);
// Verify the same counting logic for every letter, including more than two copies.
for(const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'){
 const filler=letter==='X'?'Z':'X';
 const answer=filler+letter+filler+letter+filler+letter+filler+filler;
 const known=letter+filler+letter+filler+letter+filler+filler+filler;
 const one=filler+letter+filler+filler+filler+filler+filler+filler;
 const two=filler+letter+filler+letter+filler+filler+filler+filler;
 const all=answer;
 const count=words=>summary(answer,words).filter(x=>x===letter).length;
 assert.equal(count([known]),3);assert.equal(count([known,one]),2);
 assert.equal(count([known,one,two]),1);assert.equal(count([known,one,two,all]),0);
 passed++;
}
console.log(passed+' cases passed (including all A–Z).');
