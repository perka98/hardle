'use strict';
window.loadVerifiedGameStats=async function(game,statsId,distributionId){
 let session;try{session=JSON.parse(localStorage.getItem('hardle-auth-v1')||'null')}catch{return}
 const config=window.HardleAccountConfig;if(!session?.access_token||!config)return;
 const token=session.access_token;
 try{
 const response=await fetch(config.url+'/rest/v1/rpc/hardle_my_game_stats',{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({p_game:game}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)return;const data=await response.json();
 if(JSON.parse(localStorage.getItem('hardle-auth-v1')||'null')?.access_token!==token)return;
 if(!data||!['played','wins','streak','best','totalScore'].every(key=>Number.isFinite(Number(data[key]))))return;
 const target=document.getElementById(statsId);if(!target)return;
 target.replaceChildren();
 for(const [label,value] of [['Played',data.played],['Win %',data.played?Math.round(data.wins/data.played*100):0],['Streak',data.streak],['Best streak',data.best],['Score','…']]){const row=document.createElement('div'),b=document.createElement('b'),span=document.createElement('span');b.textContent=value;span.textContent=label;row.append(b,span);target.append(row)}
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const date=['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');await window.HardleScore.renderDailyTotal(target,date);
 const distribution=document.getElementById(distributionId);if(distribution&&Array.isArray(data.distribution)){distribution.replaceChildren();const max=Math.max(1,...data.distribution);data.distribution.slice(0,game==='djdle'?7:6).forEach((count,index)=>{const bar=document.createElement('div');if(game==='djdle'||game==='artist'){const column=document.createElement('span'),value=document.createElement('span'),label=document.createElement('span');column.className='distBar';column.style.setProperty('--bar-h',Math.max(4,Math.round(count/max*68))+'px');value.className='distCount';value.textContent=count;label.className='distLabel';label.textContent=index+1;column.append(value);bar.append(column,label)}else{bar.style.width=Math.max(12,count/max*100)+'%';bar.textContent=(index+1)+': '+count}distribution.append(bar)})}
 }catch{ /* Never replace server round score with unverified local totals. */ }
};
