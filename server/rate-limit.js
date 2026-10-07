'use strict';
const crypto=require('node:crypto'),{database}=require('./database');
function bucket(scope,value){const secret=process.env.HARDLE_SESSION_SECRET;if(!secret)throw Error('Rate limiting not configured');return scope+':'+crypto.createHmac('sha256',secret).update(value).digest('hex')}
async function allow(req,player,action){
 const db=database();const identity=await db.query('select hardle_private.take_rate_limit($1,$2) as allowed',[bucket(action,player),30]);
 if(!identity.rows[0]?.allowed)return false;
 // Only trust Vercel's overwritten client-IP header, never a body-supplied IP.
 // High limit accommodates shared networks. No bans or cheating verdicts based on IP.
 const ip=req.headers['x-vercel-forwarded-for'];
 if(typeof ip==='string'&&ip.length<=128){const network=await db.query('select hardle_private.take_rate_limit($1,$2) as allowed',[bucket('network',ip.split(',')[0].trim()),600]);if(!network.rows[0]?.allowed)return false}
 return true;
}
module.exports={allow};
