'use strict';
let statsRevision=0;
const $=id=>document.getElementById(id),config=window.HardleAccountConfig;let session=null;
try{session=JSON.parse(localStorage.getItem('hardle-auth-v1')||sessionStorage.getItem('hardle-auth-v1')||'null')}catch{}
if(session?.access_token){localStorage.setItem('hardle-auth-v1',JSON.stringify(session));sessionStorage.removeItem('hardle-auth-v1')}
window.addEventListener('storage',event=>{if(event.key==='hardle-auth-v1'){try{session=JSON.parse(localStorage.getItem('hardle-auth-v1')||'null')}catch{session=null}render()}});
async function request(path,body,token){const res=await fetch(config.url+path,{method:body?'POST':'GET',headers:{apikey:config.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const text=await res.text();const data=text?JSON.parse(text):null;if(!res.ok)throw new Error(data?.msg||data?.error_description||data?.message||'Request failed');return data}
function render(){loadVerifiedStats();loadVerifiedHistory();const signed=!!session?.user;$('auth-panel').hidden=signed;$('signed-in').hidden=!signed;$('sign-out-wrap').hidden=!signed;if(signed){const meta=session.user.user_metadata||{};let saved={};try{saved=JSON.parse(localStorage.getItem('hardle-profile-v1-'+session.user.id)||'{}')}catch{}const profile={...meta,...saved};if(session.access_token&&profile.avatar){request('/rest/v1/rpc/hardle_set_avatar',{p_avatar:profile.avatar},session.access_token).catch(()=>{})}$('identity').textContent=profile.username||session.user.email;setAvatarPreview(profile.avatar||'avatar-01.svg');$('profile-name').value=profile.full_name||'';
 const avatar=profile.avatar||'avatar-01.svg';
 const avatarInput=document.querySelector('input[name="profile-avatar"][value="'+CSS.escape(avatar)+'"]');
 document.querySelectorAll('input[name="profile-avatar"]').forEach(i=>i.checked=false); if(avatarInput)avatarInput.checked=true; else if(/^avatar-0[1-8]\.svg$/.test(avatar||''))document.querySelector('input[name="profile-avatar"][value="avatar-01.svg"]').checked=true; if(!/^avatar-0[1-8]\.svg$/.test(avatar||'')){const cp=$('custom-avatar-preview');if(cp)cp.src=config.url+'/storage/v1/object/public/hardle-avatars/'+encodeURIComponent(session.user.id)+'/avatar.'+(String(avatar).match(/\.(jpg|jpeg|png|webp|gif)$/i)?.[1]||'png'); } $('profile-country').value=profile.country||'';$('profile-dj').value=profile.favorite_dj||'';$('profile-track').value=profile.favorite_track||'';$('profile-bio').value=profile.bio||'';
 $('public-name').checked=profile.public_name!==false;$('public-country').checked=profile.public_country!==false;$('public-favorite-dj').checked=profile.public_favorite_dj!==false;$('public-favorite-track').checked=profile.public_favorite_track!==false;$('public-bio').checked=profile.public_bio!==false}}

function avatarSrc(value){if(/^avatar-0[1-8]\.svg$/.test(value||''))return '/data/avatars/'+value;if(/^custom\//.test(value||''))return config.url+'/storage/v1/object/public/hardle-avatars/'+value.replace(/^custom\//,'');return '/data/avatars/avatar-01.svg'}
function setAvatarPreview(value){const src=avatarSrc(value);const a=$('account-avatar'),b=$('profile-title-avatar'),c=$('custom-avatar-preview');if(a)a.src=src;if(b)b.src=src;if(c)c.src=src}
async function resizeAvatar(file){const bitmap=await createImageBitmap(file);const size=256;const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');const scale=Math.max(size/bitmap.width,size/bitmap.height);const w=bitmap.width*scale,h=bitmap.height*scale;ctx.drawImage(bitmap,(size-w)/2,(size-h)/2,w,h);bitmap.close();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.9));if(!blob)throw Error('Could not process image');return new File([blob],'avatar.jpg',{type:'image/jpeg'})}
$('custom-avatar').addEventListener('change',async()=>{const file=$('custom-avatar').files?.[0];$('avatar-error').textContent='';if(!file)return;if(file.size>5242880){$('avatar-error').textContent='Image must be 5 MB or smaller.';$('custom-avatar').value='';return}if(!file.type.startsWith('image/')){$('avatar-error').textContent='Please choose an image file.';$('custom-avatar').value='';return}try{const processed=await resizeAvatar(file);const reader=new FileReader();reader.onload=()=>{$('custom-avatar-preview').src=reader.result};reader.readAsDataURL(processed);$('message').textContent='Image selected and resized.'}catch(error){$('avatar-error').textContent=error.message;$('custom-avatar').value=''}});async function authenticate(register){if(!$('auth-form').reportValidity())return;const username=$('username').value.trim();
 if(register){
  const email=$('email').value.trim();
  try{
   const emailAvailable=await request('/rest/v1/rpc/hardle_signup_email_available',{p_email:email});
   if(!emailAvailable){$('message').textContent='Email is already registered.';return}
  }catch{}
 }if(register&&!/^[A-Za-z0-9_]{3,24}$/.test(username)){$('message').textContent='Username must be 3–24 letters, numbers or underscores.';return}$('message').textContent='Please wait…';try{const data=await request(register?'/auth/v1/signup':'/auth/v1/token?grant_type=password',{email:$('email').value.trim(),password:$('password').value,...(register?{data:{username}}:{})});$('password').value='';if(data.access_token){window.HardlePlayerStorage.switchTo(window.HardlePlayerStorage.owner(data));session=data;localStorage.setItem('hardle-auth-v1',JSON.stringify(session));sessionStorage.removeItem('hardle-auth-v1');const profileName=session.user?.user_metadata?.username;if(profileName){try{await request('/rest/v1/rpc/hardle_register_profile',{p_username:profileName},session.access_token)}catch{ $('message').textContent='Signed in. Leaderboard profile could not be registered; check your username.';render();return}}$('message').textContent='Signed in.';window.location.href='/'}else { $('message').textContent='Check your email to confirm your account, then sign in.'; $('resend-verification').hidden=false; render() }}catch(error){$('message').textContent=error.message}}
function setAuthMode(register){const form=$('auth-form');$('resend-verification').hidden=true;$('username-field').hidden=!register;form.dataset.mode=register?'register':'signin';form.querySelector('.authPrimary').textContent=register?'Create account':'Sign in';$('register').textContent=register?'Sign in':'Create account';$('message').textContent=''}
let usernameCheckTimer=null;
async function checkUsernameAvailability(){
 const input=$('username'), message=$('username-availability');
 if(!input||$('auth-form').dataset.mode!=='register')return true;
 const username=input.value.trim();
 if(!username){if(message)message.textContent='';return true}
 if(!/^[A-Za-z0-9_]{3,24}$/.test(username)){if(message)message.textContent='Username can only contain letters, numbers, and underscores';input.setCustomValidity('Invalid username');return false}
 try{
  const available=await request('/rest/v1/rpc/hardle_username_available',{p_username:username});
  if(message)message.textContent=available?'':'Username already taken or not allowed';
  input.setCustomValidity(available?'':'Username already taken or not allowed');
  return !!available;
 }catch{return true}
}
$('auth-form').onsubmit=e=>{e.preventDefault();authenticate($('auth-form').dataset.mode==='register')};$('auth-form').insertAdjacentHTML('beforeend','<button id="resend-verification" class="authSecondary" type="button" hidden>Resend verification email</button>');
$('resend-verification').onclick=async()=>{const email=$('email').value.trim();if(!email){$('message').textContent='Enter your email first.';return}$('resend-verification').disabled=true;$('message').textContent='Sending verification email…';try{await request('/auth/v1/resend',{type:'signup',email});$('message').textContent='Verification email sent. Check your inbox.'}catch(error){$('message').textContent=error.message}finally{$('resend-verification').disabled=false}};

$('username').addEventListener('blur',checkUsernameAvailability);
$('username').addEventListener('input',()=>{$('username').setCustomValidity('');const m=$('username-availability');if(m)m.textContent='';});
$('register').onclick=()=>setAuthMode($('auth-form').dataset.mode!=='register');
setAuthMode(new URLSearchParams(window.location.search).get('mode')==='register');
$('sign-out').onclick=async()=>{try{if(session?.access_token)await request('/auth/v1/logout',{},session.access_token)}catch{}session=null;sessionStorage.removeItem('hardle-auth-v1');localStorage.removeItem('hardle-auth-v1');window.HardlePlayerStorage.switchTo('guest');window.location.href='/'};
(async()=>{if(session?.access_token){try{session.user=await request('/auth/v1/user',null,session.access_token)}catch{session=null;sessionStorage.removeItem('hardle-auth-v1');localStorage.removeItem('hardle-auth-v1');window.HardlePlayerStorage.switchTo('guest')}}render();document.body.classList.remove('authPending')})();

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

$('profile-form').onsubmit=async e=>{e.preventDefault();if(!session?.access_token)return;$('message').textContent='Saving profile…';let avatar=document.querySelector('input[name="profile-avatar"]:checked')?.value||session.user.user_metadata?.avatar||'avatar-01.svg';const selectedFile=$('custom-avatar').files?.[0];let customFile=null;if(selectedFile){try{customFile=await resizeAvatar(selectedFile)}catch(error){$('avatar-error').textContent=error.message;$('message').textContent='';return}}if(customFile){const ext='jpg';avatar='custom/'+session.user.id+'/avatar.'+ext;try{const up=await fetch(config.url+'/storage/v1/object/hardle-avatars/'+session.user.id+'/avatar.'+ext,{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+session.access_token,'Content-Type':customFile.type,'x-upsert':'true'},body:customFile});if(!up.ok)throw Error('Could not upload avatar');}catch(error){$('message').textContent=error.message;return}}const data={full_name:$('profile-name').value.trim(),country:$('profile-country').value,favorite_dj:$('profile-dj').value.trim(),favorite_track:$('profile-track').value.trim(),bio:$('profile-bio').value.trim(),avatar,public_name:$('public-name').checked,public_country:$('public-country').checked,public_favorite_dj:$('public-favorite-dj').checked,public_favorite_track:$('public-favorite-track').checked,public_bio:$('public-bio').checked};try{const res=await fetch(config.url+'/auth/v1/user',{method:'PUT',headers:{apikey:config.key,'Authorization':'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({data})});const body=await res.json();if(!res.ok)throw new Error(body?.msg||body?.message||'Could not save profile');session.user=body;
 localStorage.setItem('hardle-profile-v1-'+session.user.id,JSON.stringify(data));
 localStorage.setItem('hardle-auth-v1',JSON.stringify(session));
 try{await request('/rest/v1/rpc/hardle_set_avatar',{p_avatar:avatar},session.access_token)}catch{}
 try{await request('/rest/v1/rpc/hardle_set_profile',{p_full_name:data.full_name,p_country:data.country,p_favorite_dj:data.favorite_dj,p_favorite_track:data.favorite_track,p_bio:data.bio,p_public_name:data.public_name,p_public_country:data.public_country,p_public_favorite_dj:data.public_favorite_dj,p_public_favorite_track:data.public_favorite_track,p_public_bio:data.public_bio},session.access_token)}catch{}$('message').textContent='';$('profile-saved').hidden=false;setTimeout(()=>$('profile-saved').hidden=true,2500);render()}catch(error){if(/invalid avatar/i.test(error.message||'')){$('avatar-error').textContent=error.message;$('message').textContent=''}else $('message').textContent=error.message}};
