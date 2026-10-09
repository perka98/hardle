'use strict';
// Existing game keys remain unchanged; only the active player's snapshot is loaded.
window.HardlePlayerStorage={
 gameKey(key){return /^hardle-(menu-result-|score-v2-|completed-|failed-|stats-v1$|(?:artist|djdle|orderdle)-stats-v1$|artist-daily-v1-|orderdle-age-v1-)/.test(key)},
 owner(session){return session?.user?.id?'user:'+session.user.id:'guest'},
 switchTo(owner){
  const marker='hardle-active-player-v1',prefix='hardle-player-snapshot-v1-';
  const previous=localStorage.getItem(marker);
  if(previous===owner)return;
  const snapshot={};const keys=[];
  for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(this.gameKey(key)){keys.push(key);snapshot[key]=localStorage.getItem(key)}}
  // Untagged legacy account data must never become guest data on logout.
  if(previous)localStorage.setItem(prefix+previous,JSON.stringify(snapshot));
  else if(owner==='guest'&&keys.length)localStorage.setItem(prefix+'legacy-unassigned',JSON.stringify(snapshot));
  if(!previous&&owner!=='guest'){localStorage.setItem(marker,owner);return}
  keys.forEach(key=>localStorage.removeItem(key));
  let stored={};try{stored=JSON.parse(localStorage.getItem(prefix+owner)||'{}')}catch{}
  for(const [key,value] of Object.entries(stored))if(this.gameKey(key)&&typeof value==='string')localStorage.setItem(key,value);
  localStorage.setItem(marker,owner);
 }
};
try{const session=JSON.parse(localStorage.getItem('hardle-auth-v1')||sessionStorage.getItem('hardle-auth-v1')||'null');window.HardlePlayerStorage.switchTo(window.HardlePlayerStorage.owner(session))}catch{}
window.addEventListener('storage',event=>{if(event.key==='hardle-auth-v1')location.reload()});
