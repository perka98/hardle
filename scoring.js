'use strict';
window.HardleScore={
  attempts(won,count){return won?([1000,850,700,550,400,250,100][count-1]||0):0},
  record(game,date,points){try{const key='hardle-score-v2-'+game+'-'+date;if(localStorage.getItem(key)!==null)return;localStorage.setItem(key,JSON.stringify({points:Math.max(0,Math.min(1000,points))}))}catch{}},
  total(game){let total=0;try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key.startsWith('hardle-score-v2-'+game+'-')){const row=JSON.parse(localStorage.getItem(key));if(Number.isFinite(row?.points))total+=row.points}}}catch{}return total}
};
