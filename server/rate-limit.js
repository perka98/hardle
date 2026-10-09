'use strict';
const crypto=require('node:crypto'),{database}=require('./database');
function bucket(scope,value){const secret=process.env.HARDLE_SESSION_SECRET;if(!secret)throw Error('Rate limiting not configured');return scope+':'+crypto.createHmac('sha256',secret).update(value).digest('hex')}
async function allow(req,player,action){
 const db=database(),ip=req.headers['x-vercel-forwarded-for'];
 const identityKey=bucket(action,player);
 if(typeof ip==='string'&&ip.length<=128){
 const result=await db.query('select hardle_private.take_rate_limit($1,$2) as identity_allowed,hardle_private.take_rate_limit($3,$4) as network_allowed',[identityKey,30,bucket('network',ip.split(',')[0].trim()),600]);
 return result.rows[0]?.identity_allowed===true&&result.rows[0]?.network_allowed===true;
 }
 const result=await db.query('select hardle_private.take_rate_limit($1,$2) as allowed',[identityKey,30]);
 return result.rows[0]?.allowed===true;
}
module.exports={allow};
