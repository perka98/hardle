'use strict';
const client=new window.HardleSecureGame('orderdle');
const status=document.getElementById('status'),people=document.getElementById('people'),submit=document.getElementById('submit'),retry=document.getElementById('retry'),result=document.getElementById('result');
let items=[],busy=false,completed=false;
function render(){
 people.replaceChildren();
 items.forEach((item,index)=>{
  const row=document.createElement('li'),name=document.createElement('span');name.textContent=item.name;row.append(name);
  for(const [label,offset] of [['↑',-1],['↓',1]]){const button=document.createElement('button');button.textContent=label;button.setAttribute('aria-label','Move '+item.name+(offset<0?' up':' down'));button.disabled=busy||completed||index+offset<0||index+offset>=items.length;button.onclick=()=>{[items[index],items[index+offset]]=[items[index+offset],items[index]];render()};row.append(button)}
  people.append(row);
 });
 submit.disabled=busy||completed||items.length!==5;
}
function showResult(data){
 completed=!!data.completed;

 if(completed){result.textContent=(data.won?'Correct!':'Round completed.')+' Score: '+data.score+(Array.isArray(data.answer)?' · Correct order: '+data.answer.map(person=>person.name+' ('+person.birthDate+')').join(' → '):'');status.textContent='Your result is saved by the server.'}
 render();
}
async function start(){
 busy=true;retry.hidden=true;status.textContent='Connecting to the secure game server…';render();
 try{
  const state=await client.start(),payload=state.public_payload;
  if(!Array.isArray(payload?.items)||payload.items.length!==5||new Set(payload.items.map(x=>x.id)).size!==5||payload.items.some(x=>typeof x.id!=='string'||typeof x.name!=='string'))throw Error('Invalid server puzzle');
  items=payload.items.map(x=>({id:x.id,name:x.name}));completed=!!state.completed;
  status.textContent='Ready — one server-validated attempt.';
  if(completed)showResult({...state.result,completed:true});
 }catch(error){items=[];status.textContent=error.message;retry.hidden=false}
 finally{busy=false;render()}
}
submit.onclick=async()=>{
 if(busy||completed)return;
 busy=true;render();status.textContent='Checking your order…';
 try{showResult(await client.guess(items.map(x=>x.id)))}
 catch(error){status.textContent=error.message+' — retry the same order.'}
 finally{busy=false;render();if(client.pending){submit.textContent='Retry this order';people.querySelectorAll('button').forEach(button=>button.disabled=true)}else submit.textContent='Check order'}
};
retry.onclick=start;
start();
