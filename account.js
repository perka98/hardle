'use strict';
const $=id=>document.getElementById(id),config=window.HardleAccountConfig;let session=null;
try{session=JSON.parse(sessionStorage.getItem('hardle-auth-v1')||'null')}catch{}
async function request(path,body,token){const res=await fetch(config.url+path,{method:body?'POST':'GET',headers:{apikey:config.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await res.json();if(!res.ok)throw new Error(data.msg||data.error_description||data.message||'Request failed');return data}
function render(){const signed=!!session?.user;$('auth-panel').hidden=signed;$('signed-in').hidden=!signed;if(signed)$('identity').textContent='Signed in as '+(session.user.user_metadata?.username||session.user.email)}
async function authenticate(register){if(!$('auth-form').reportValidity())return;const username=$('username').value.trim();if(register&&!/^[A-Za-z0-9_]{3,24}$/.test(username)){$('message').textContent='Username must be 3–24 letters, numbers or underscores.';return}$('message').textContent='Please wait…';try{const data=await request(register?'/auth/v1/signup':'/auth/v1/token?grant_type=password',{email:$('email').value.trim(),password:$('password').value,...(register?{data:{username}}:{})});$('password').value='';if(data.access_token){session=data;sessionStorage.setItem('hardle-auth-v1',JSON.stringify(session));$('message').textContent='Signed in. Competitive score submission is not enabled yet.'}else $('message').textContent='Check your email to confirm your account, then sign in.';render()}catch(error){$('message').textContent=error.message}}
const registrationMode=new URLSearchParams(location.search).get('mode')==='register';
$('username').hidden=!registrationMode;
$('username-label').hidden=!registrationMode;
$('username').required=registrationMode;
const submitButton=$('auth-form').querySelector('button[type="submit"]');
submitButton.textContent=registrationMode?'Create account':'Sign in';
$('register').textContent=registrationMode?'Already registered? Sign in':'Register';
$('auth-form').onsubmit=e=>{e.preventDefault();authenticate(registrationMode)};
$('register').onclick=()=>{location.href=registrationMode?'/account?mode=signin':'/account?mode=register'};
$('sign-out').onclick=async()=>{try{if(session?.access_token)await request('/auth/v1/logout',{},session.access_token)}catch{}session=null;sessionStorage.removeItem('hardle-auth-v1');render();$('message').textContent='Signed out.'};
(async()=>{if(session?.access_token){try{session.user=await request('/auth/v1/user',null,session.access_token)}catch{session=null;sessionStorage.removeItem('hardle-auth-v1')}}render()})();

