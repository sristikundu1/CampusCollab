import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/config/logger.js';
import { AuthenticationError } from '../../src/errors/application-error.js';
import { hashOpaqueToken } from '../../src/lib/crypto/opaque-token.js';

const USER='aaaaaaaaaaaaaaaaaaaaaaaa',SKILL='dddddddddddddddddddddddd';
const csrfSecret='test-csrf-secret-with-more-than-thirty-two-characters';
const config={nodeEnv:'test',clientUrl:'http://localhost:5173',trustProxy:false,isProduction:false,sessionCookieName:'campuscollab_session',sessionSecret:'test-session-secret-with-more-than-thirty-two-characters',csrfSecret,smtp:null,requireEmailVerification:false};
const authService={async authenticate(token){if(!token)throw new AuthenticationError();return{user:{_id:USER},session:{_id:SKILL}}}};
const logger=createLogger({level:'silent',environment:'test'});
async function run(work){const calls=[];const skillService={async list(){return[]},async create(userId,body){calls.push([String(userId),body]);return{created:true,skill:{id:SKILL,...body}}}};const app=createApp({config,logger,databaseReadiness:()=>({ready:true}),authService,skillService});const server=http.createServer(app);await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));try{await work(`http://127.0.0.1:${server.address().port}`,calls)}finally{await new Promise((resolve)=>server.close(resolve))}}
const headers={cookie:'campuscollab_session=token','x-csrf-token':hashOpaqueToken('token',csrfSecret),'content-type':'application/json'};

test('authenticated students can create a custom skill from session identity',()=>run(async(base,calls)=>{assert.equal((await fetch(`${base}/api/v1/skills`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Three.js',category:'Frontend'})})).status,401);const response=await fetch(`${base}/api/v1/skills`,{method:'POST',headers,body:JSON.stringify({name:'Three.js',category:'Frontend'})});assert.equal(response.status,201);assert.deepEqual(calls[0],[USER,{name:'Three.js',category:'Frontend'}])}));
test('custom skills reject identity and status spoofing',()=>run(async(base,calls)=>{for(const extra of [{createdByUserId:'bbbbbbbbbbbbbbbbbbbbbbbb'},{status:'ACTIVE'},{userId:'bbbbbbbbbbbbbbbbbbbbbbbb'}]){const response=await fetch(`${base}/api/v1/skills`,{method:'POST',headers,body:JSON.stringify({name:'Three.js',category:'Frontend',...extra})});assert.equal(response.status,422)}assert.equal(calls.length,0)}));
