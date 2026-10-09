'use strict';
// Reveal remaining counts only for letters confirmed by positive tile feedback.
function remainingLetters(answer,history){
 const discovered=new Set(),greens=new Set(),counts={};
 for(const letter of answer)counts[letter]=(counts[letter]||0)+1;
 for(const row of history){
  const word=row.guess.canonical,marks=row.feedback.feedback;
  for(let i=0;i<word.length;i++){
   if(marks[i]==='green'||marks[i]==='yellow')discovered.add(word[i]);
   if(marks[i]==='green')greens.add(i);
  }
 }
 for(const i of greens)counts[answer[i]]--;
 const letters=[];
 for(const letter of discovered)for(let i=0;i<(counts[letter]||0);i++)letters.push(letter);
 return letters;
}
module.exports={remainingLetters};
