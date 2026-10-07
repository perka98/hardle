'use strict';
let statsRevision=0;
const $=id=>document.getElementById(id),config=window.HardleAccountConfig;let session=null;
try{session=JSON.parse(localStorage.getItem('hardle-auth-v1')||sessionStorage.getItem('hardle-auth-v1')||'null')}catch{}
if(session?.access_token){localStorage.setItem('hardle-auth-v1',JSON.stringify(session));sessionStorage.removeItem('hardle-auth-v1')}
window.addEventListener('storage',event=>{if(event.key==='hardle-auth-v1'){try{session=JSON.parse(localStorage.getItem('hardle-auth-v1')||'null')}catch{session=null}render()}});
async function request(path,body,token){const res=await fetch(config.url+path,{method:body?'POST':'GET',headers:{apikey:config.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const text=await res.text();const data=text?JSON.parse(text):null;if(!res.ok)throw new Error(data?.msg||data?.error_description||data?.message||'Request failed');return data}
function render(){loadVerifiedStats();loadVerifiedHistory();const signed=!!session?.user;$('auth-panel').hidden=signed;$('signed-in').hidden=!signed;if(signed){const meta=session.user.user_metadata||{};$('identity').textContent='Signed in as '+(meta.username||session.user.email);$('profile-name').value=meta.full_name||'';$('profile-country').value=meta.country||'';$('profile-dj').value=meta.favorite_dj||'';$('profile-track').value=meta.favorite_track||'';$('profile-bio').value=meta.bio||''}}
async function authenticate(register){if(!$('auth-form').reportValidity())return;const username=$('username').value.trim();if(register&&!/^[A-Za-z0-9_]{3,24}$/.test(username)){$('message').textContent='Username must be 3–24 letters, numbers or underscores.';return}$('message').textContent='Please wait…';try{const data=await request(register?'/auth/v1/signup':'/auth/v1/token?grant_type=password',{email:$('email').value.trim(),password:$('password').value,...(register?{data:{username}}:{})});$('password').value='';if(data.access_token){session=data;localStorage.setItem('hardle-auth-v1',JSON.stringify(session));sessionStorage.removeItem('hardle-auth-v1');const profileName=session.user?.user_metadata?.username;if(profileName){try{await request('/rest/v1/rpc/hardle_register_profile',{p_username:profileName},session.access_token)}catch{ $('message').textContent='Signed in. Leaderboard profile could not be registered; check your username.';render();return}}$('message').textContent='Signed in.'}else $('message').textContent='Check your email to confirm your account, then sign in.';render()}catch(error){$('message').textContent=error.message}}
$('auth-form').onsubmit=e=>{e.preventDefault();authenticate(false)};$('register').onclick=()=>authenticate(true);
$('sign-out').onclick=async()=>{try{if(session?.access_token)await request('/auth/v1/logout',{},session.access_token)}catch{}session=null;sessionStorage.removeItem('hardle-auth-v1');localStorage.removeItem('hardle-auth-v1');render();$('message').textContent='Signed out.'};
(async()=>{if(session?.access_token){try{session.user=await request('/auth/v1/user',null,session.access_token)}catch{session=null;sessionStorage.removeItem('hardle-auth-v1');localStorage.removeItem('hardle-auth-v1')}}render()})();

async function loadVerifiedStats(){
 const revision=++statsRevision;
 const panel=$('verified-stats-panel'),output=$('verified-stats');
 panel.hidden=!session?.access_token;
 if(panel.hidden){output.textContent='';return}
 output.textContent='Loading verified results…';
 try{const data=await request('/rest/v1/rpc/hardle_my_stats',{},session.access_token);
 if(revision!==statsRevision||!session?.access_token)return;
 if(!data||!['played','wins','totalScore','dailyScore'].every(key=>Number.isFinite(Number(data[key]))))throw Error('Invalid statistics');
 output.textContent='Games played: '+data.played+' · Wins: '+data.wins+' · Today: '+data.dailyScore+' · Total score: '+data.totalScore;
 }catch{if(revision===statsRevision)output.textContent='Verified statistics are not available yet.'}
}

async function loadVerifiedHistory(){
 const output=$('verified-history');output.replaceChildren();if(!session?.access_token)return;
 const token=session.access_token;
 try{const rows=await request('/rest/v1/rpc/hardle_my_history',{},token);if(session?.access_token!==token)return;if(!Array.isArray(rows))throw Error();
 for(const row of rows){const p=document.createElement('p');p.textContent=row.puzzle_date+' · '+row.game+' · '+row.score+' points · '+(row.won?'Win':'Completed');output.append(p)}
 if(!rows.length)output.textContent='No verified results yet.';
 }catch{output.textContent='Verified history is not available yet.'}
}

$('profile-form').onsubmit=async e=>{e.preventDefault();if(!session?.access_token)return;$('message').textContent='Saving profile…';const data={full_name:$('profile-name').value.trim(),country:$('profile-country').value,favorite_dj:$('profile-dj').value.trim(),favorite_track:$('profile-track').value.trim(),bio:$('profile-bio').value.trim()};try{const res=await fetch(config.url+'/auth/v1/user',{method:'PUT',headers:{apikey:config.key,'Authorization':'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({data})});const body=await res.json();if(!res.ok)throw new Error(body?.msg||body?.message||'Could not save profile');session.user=body;localStorage.setItem('hardle-auth-v1',JSON.stringify(session));$('message').textContent='Profile saved.';render()}catch(error){$('message').textContent=error.message}};
