'use strict';
// Not loaded by the existing games until migration and backend verification are complete.
let sessionRefreshInFlight=null;
async function verifiedGameSession(){
 let session=null;try{session=JSON.parse((typeof localStorage!=='undefined'?localStorage.getItem('hardle-auth-v1'):sessionStorage.getItem('hardle-auth-v1'))||'null')}catch{}
 if(!session?.access_token)return session;
 if(!Number.isFinite(session.expires_at)||session.expires_at*1000>Date.now()+60000)return session;
 if(!session.refresh_token||!window.HardleAccountConfig)throw Error('Please sign in again');
 if(!sessionRefreshInFlight){
 const previousToken=session.access_token,config=window.HardleAccountConfig;
 sessionRefreshInFlight=(async()=>{
 const response=await fetch(config.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Please sign in again');const next=await response.json();
 if(!next.access_token||!next.user?.id)throw Error('Please sign in again');
 const current=JSON.parse(localStorage.getItem('hardle-auth-v1')||'null');
 if(current?.access_token!==previousToken)throw Error('Login changed. Reload the game.');
 localStorage.setItem('hardle-auth-v1',JSON.stringify(next));return next;
 })().finally(()=>{sessionRefreshInFlight=null});
 }
 return sessionRefreshInFlight;
}
window.HardleSecureGame=class {
 constructor(game){if(!['daily','artist','djdle','orderdle'].includes(game))throw Error('Invalid game');this.game=game;this.fresh=typeof location!=='undefined'&&typeof URLSearchParams!=='undefined'&&new URLSearchParams(location.search).get('testRound')==='new';this.pending=null;this.state=null;this.inFlight=null}
 async request(path,data){const session=await verifiedGameSession();const headers={'Content-Type':'application/json'};if(session?.access_token)headers.Authorization='Bearer '+session.access_token;const response=await fetch(path,{method:'POST',credentials:'same-origin',headers,body:JSON.stringify(data),signal:AbortSignal.timeout(12000)});let body;try{body=await response.json()}catch{throw Error('Game server returned an invalid response')}if(!response.ok){const error=Error(body.error||'Game server unavailable');error.status=response.status;throw error}return body}
 async start(){this.state=await this.request(this.fresh?'/api/preview-game':'/api/game-session',this.fresh?{game:this.game,action:'start'}:{game:this.game});return this.state}
 async guess(value){if(!this.state)throw Error('Start a server session before guessing');if(this.inFlight){if(JSON.stringify(this.pending?.guess)!==JSON.stringify(value))throw Error('Wait for the pending guess');return this.inFlight}if(this.state?.completed)throw Error('Game completed');if(this.pending&&JSON.stringify(this.pending.guess)!==JSON.stringify(value))throw Error('Retry the pending guess before entering another');if(!this.pending)this.pending={game:this.game,guess:JSON.parse(JSON.stringify(value)),requestId:crypto.randomUUID()};this.inFlight=this.request(this.fresh?'/api/preview-game':'/api/game-guess',this.fresh?{...this.pending,action:'guess',roundId:this.state.roundId}:this.pending);try{const result=await this.inFlight;this.pending=null;this.state={...this.state,...result};return result}catch(error){if([400,401,403,409].includes(error.status))this.pending=null;throw error}finally{this.inFlight=null}}
};
