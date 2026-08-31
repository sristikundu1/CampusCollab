import dns from 'node:dns';
import mongoose from 'mongoose';
import { parseEnvironment } from '../src/config/env.js';
import { Bookmark } from '../src/modules/gigs/bookmark.model.js';
import { Gig } from '../src/modules/gigs/gig.model.js';
import { Session } from '../src/modules/auth/session.model.js';
import { User } from '../src/modules/auth/user.model.js';
import { VerificationChallenge } from '../src/modules/auth/verification-challenge.model.js';
import { PortfolioItem } from '../src/modules/profiles/portfolio-item.model.js';
import { Profile } from '../src/modules/profiles/profile.model.js';
import { UniversityAffiliation } from '../src/modules/university/university-affiliation.model.js';

const config=parseEnvironment();if(config.isProduction)throw new Error('Gig smoke test is disabled in production');
const base=`${config.apiUrl}/api/v1`,marker=Date.now(),word=`codexgig${marker}`;const emails=[`codex.gig.a.${marker}@bscse.uiu.ac.bd`,`codex.gig.b.${marker}@bscse.uiu.ac.bd`],password='LocalSmoke12345';
async function request(path,options={}){const response=await fetch(`${base}${path}`,options);const body=response.status===204?null:await response.json();return{response,body}}
async function register(email,name){const result=await request('/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,email,password,confirmPassword:password,primaryExperience:'OWNING_WORK'})});if(result.response.status!==201)throw new Error(`Registration failed: ${result.response.status}`)}
async function login(email){const result=await request('/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password,remember:false})});if(result.response.status!==200)throw new Error(`Login failed: ${result.response.status}`);return{cookie:result.response.headers.get('set-cookie'),csrf:result.body.data.csrfToken}}
const mutation=(auth,method,body)=>({method,headers:{cookie:auth.cookie,'x-csrf-token':auth.csrf,...body?{'content-type':'application/json'}:{}},...body?{body:JSON.stringify(body)}:{}});
let connected=false;
try{
  await register(emails[0],'Gig Smoke Owner');await register(emails[1],'Gig Smoke Viewer');const [owner,viewer]=await Promise.all([login(emails[0]),login(emails[1])]);const skillResult=await request('/skills?limit=2');const skill=skillResult.body.data.skills[0];
  const draftBody={title:`${word} responsive campus website`,description:'Build an accessible, responsive website for a student organization with clear deliverables.',category:'Web Development',skillRequirements:[{skillId:skill.id,level:'INTERMEDIATE',required:true}],workMode:'REMOTE',visibility:'PLATFORM',budget:{type:'UNPAID'},capacity:2};
  let result=await request('/gigs',mutation(owner,'POST',draftBody));if(result.response.status!==201||result.body.data.gig.status!=='DRAFT')throw new Error(`Create failed: ${result.response.status}`);const gigId=result.body.data.gig.id;
  result=await request(`/gigs/${gigId}`,mutation(viewer,'PATCH',{title:'Unauthorized replacement title'}));if(result.response.status!==404)throw new Error(`BOLA edit returned ${result.response.status}`);
  result=await request(`/gigs/${gigId}`,mutation(viewer,'DELETE'));if(result.response.status!==404)throw new Error(`BOLA delete returned ${result.response.status}`);
  result=await request(`/gigs/${gigId}`,mutation(owner,'PATCH',{ownerId:'bbbbbbbbbbbbbbbbbbbbbbbb'}));if(result.response.status!==422)throw new Error(`Ownership spoof returned ${result.response.status}`);
  result=await request(`/gigs/${gigId}:publish`,mutation(owner,'POST',{}));if(result.response.status!==200||result.body.data.gig.status!=='PUBLISHED')throw new Error(`Publish failed: ${result.response.status}`);
  const second=await request('/gigs',mutation(owner,'POST',{...draftBody,title:`${word} second paginated opportunity`}));const secondId=second.body.data.gig.id;await request(`/gigs/${secondId}:publish`,mutation(owner,'POST',{}));
  result=await request(`/gigs?q=${word}&skillId=${skill.id}&workMode=REMOTE&limit=1`);if(result.response.status!==200||result.body.data.gigs.length!==1||!result.body.meta.pagination.hasMore)throw new Error('Server search/filter pagination first page failed');const firstPageId=result.body.data.gigs[0].id;
  const nextCursor=encodeURIComponent(result.body.meta.pagination.nextCursor);result=await request(`/gigs?q=${word}&skillId=${skill.id}&workMode=REMOTE&limit=1&cursor=${nextCursor}`);if(result.response.status!==200||result.body.data.gigs.length!==1||result.body.data.gigs[0].id===firstPageId||![gigId,secondId].includes(result.body.data.gigs[0].id))throw new Error('Cursor pagination duplicated or omitted a gig');
  result=await request(`/gigs/${gigId}`);if(result.response.status!==401)throw new Error('Anonymous gig detail was not protected');
  result=await request(`/gigs/${gigId}`,{headers:{cookie:viewer.cookie}});if(result.response.status!==200||'version'in result.body.data.gig)throw new Error('Authenticated non-owner gig projection failed');
  result=await request(`/gigs/${gigId}/bookmark`,mutation(viewer,'POST'));if(result.response.status!==201)throw new Error(`Bookmark create failed: ${result.response.status}`);
  result=await request(`/gigs/${gigId}/bookmark`,mutation(viewer,'POST'));if(result.response.status!==200)throw new Error(`Duplicate bookmark was not idempotent: ${result.response.status}`);
  result=await request('/users/me/bookmarked-gigs',{headers:{cookie:viewer.cookie}});if(!result.body.data.gigs.some((gig)=>gig.id===gigId))throw new Error('Bookmark list omitted saved gig');
  result=await request(`/gigs/${gigId}`,mutation(owner,'PATCH',{description:'Updated owner-controlled description with enough detail for the published opportunity.'}));if(result.response.status!==200||result.body.data.gig.materialRevision!==1)throw new Error('Owner update/material revision failed');
  result=await request(`/gigs/${gigId}:close`,mutation(owner,'POST',{reasonCode:'SMOKE_COMPLETE'}));if(result.body.data.gig.status!=='CLOSED')throw new Error('Close transition failed');
  result=await request(`/gigs/${gigId}:publish`,mutation(owner,'POST',{}));if(result.response.status!==409)throw new Error('Invalid lifecycle transition was accepted');
  result=await request(`/gigs/${gigId}:archive`,mutation(owner,'POST',{}));if(result.body.data.gig.status!=='ARCHIVED')throw new Error('Archive transition failed');
  result=await request(`/gigs/${gigId}`,mutation(owner,'DELETE'));if(result.response.status!==204)throw new Error(`Permanent delete failed: ${result.response.status}`);
  process.stdout.write('Live gigs smoke test passed: create, ownership, spoof rejection, publish, search, filters, cursor pagination, authenticated detail privacy, bookmarks, edit, lifecycle, permanent delete, cleanup.\n');
}finally{
  if(config.mongodbDnsServers.length)dns.setServers(config.mongodbDnsServers);await mongoose.connect(config.mongodbUri,{dbName:config.mongodbDbName});connected=true;const users=await User.find({email:{$in:emails}}).select('_id').lean();const userIds=users.map((user)=>user._id);const gigs=await Gig.find({ownerId:{$in:userIds}}).select('_id').lean();const gigIds=gigs.map((gig)=>gig._id);if(userIds.length)await Promise.all([Bookmark.deleteMany({$or:[{userId:{$in:userIds}},{gigId:{$in:gigIds}}]}),Gig.deleteMany({ownerId:{$in:userIds}}),Session.deleteMany({userId:{$in:userIds}}),VerificationChallenge.deleteMany({userId:{$in:userIds}}),PortfolioItem.deleteMany({userId:{$in:userIds}}),Profile.deleteMany({userId:{$in:userIds}}),UniversityAffiliation.deleteMany({userId:{$in:userIds}})]);if(userIds.length)await User.deleteMany({_id:{$in:userIds},email:{$in:emails}});if(connected)await mongoose.disconnect();
}
