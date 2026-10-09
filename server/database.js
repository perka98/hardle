'use strict';
const {Pool}=require('pg');let pool;
function database(){if(!process.env.HARDLE_DATABASE_URL)throw Error('Database is not configured');if(!pool)pool=new Pool({connectionString:process.env.HARDLE_DATABASE_URL,max:2,connectionTimeoutMillis:5000,idleTimeoutMillis:10000,ssl:{rejectUnauthorized:true,...(process.env.HARDLE_DATABASE_CA_CERT?{ca:process.env.HARDLE_DATABASE_CA_CERT.replace(/\\n/g,'\n')}:{})}});return pool}
async function transaction(work){const client=await database().connect();try{await client.query('begin');await client.query("set local statement_timeout='8000ms'");const result=await work(client);await client.query('commit');return result}catch(error){await client.query('rollback').catch(()=>{});throw error}finally{client.release()}}
module.exports={database,transaction};
