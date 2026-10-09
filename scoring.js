'use strict';
window.HardleScore={
  attempts(won,count){return won?([1000,850,700,550,400,250,100][count-1]||0):0},
  record(game,date,points){try{const key='hardle-score-v2-'+game+'-'+date;if(localStorage.getItem(key)!==null)return;localStorage.setItem(key,JSON.stringify({points:Math.max(0,Math.min(1000,points))}))}catch{}},
  total(game){let total=0;try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key.startsWith('hardle-score-v2-'+game+'-')){const row=JSON.parse(localStorage.getItem(key));if(Number.isFinite(row?.points))total+=row.points}}}catch{}return total},
  dailyTotal(date){try{const results=JSON.parse(localStorage.getItem('hardle-menu-result-'+date)||'{}');return Object.values(results).reduce((total,result)=>{const points=Number(result?.score);return total+(Number.isFinite(points)?Math.max(0,Math.min(1000,points)):0)},0)}catch{return 0}},
  async verifiedDailyTotal(date){
    let results={};try{results=JSON.parse(localStorage.getItem('hardle-menu-result-'+date)||'{}')}catch{}
    let session;try{session=JSON.parse(localStorage.getItem('hardle-auth-v1')||'null')}catch{}
    const config=window.HardleAccountConfig;
    if(session?.access_token&&config){
      const response=await fetch(config.url+'/rest/v1/rpc/hardle_my_history',{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw Error('Daily results unavailable');
      const history=await response.json();if(!Array.isArray(history))throw Error('Invalid daily results');
      if(JSON.parse(localStorage.getItem('hardle-auth-v1')||'null')?.access_token!==session.access_token)throw Error('Account changed');
      for(const row of history){if(row.puzzle_date===date&&typeof row.game==='string'&&Number.isFinite(Number(row.score)))results[row.game]={score:Number(row.score)}}
    }
    return Object.values(results).reduce((sum,result)=>{const points=Number(result?.score);return sum+(Number.isFinite(points)?Math.max(0,Math.min(1000,points)):0)},0);
  },
  totalAll(){let total=0;try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key.startsWith('hardle-score-v2-')){const row=JSON.parse(localStorage.getItem(key));if(Number.isFinite(row?.points))total+=row.points}}}catch{}return total}
};
