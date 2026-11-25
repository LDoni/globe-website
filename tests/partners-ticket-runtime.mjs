// Synthetic-only ticket requests in actual workerd, with durable local KV across restarts.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=fileURLToPath(new URL('..',import.meta.url));
let wrangler;
for(const dir of (process.env.PATH||'').split(path.delimiter)){
 try{const file=await fs.realpath(path.join(dir,'wrangler'));if(file.includes('/wrangler/')){wrangler=file;break;}}catch{}
}
if(!wrangler){
 if(process.env.GLOBO_TICKET_RUNTIME_IN_WRANGLER)throw Error('Pinned Wrangler runtime unavailable');
 const env={...process.env,GLOBO_TICKET_RUNTIME_IN_WRANGLER:'true',WRANGLER_SEND_METRICS:'false'};
 for(const key of ['CLOUDFLARE_API_TOKEN','CLOUDFLARE_API_KEY','CLOUDFLARE_EMAIL'])delete env[key];
 const code=await new Promise((resolve,reject)=>{const p=spawn('npx',['--offline','--no-install','--package=wrangler@4.165.0','-c','node tests/partners-ticket-runtime.mjs'],{cwd:root,env,stdio:'inherit'});p.once('error',reject);p.once('close',resolve);});
 process.exit(code??1);
}
const require=createRequire(wrangler),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
const storage=await fs.mkdtemp(path.join(os.tmpdir(),'globo-ticket-workerd-'));
const author='author@example.invalid',other='other@example.invalid',coordinator='coordinator@example.invalid';
const auth={CF_ACCESS_TEAM_DOMAIN:'https://synthetic-ticket-test.cloudflareaccess.com',CF_ACCESS_AUD:'SYNTHETIC-TICKET-AUDIENCE',GLOBO_PARTNER_EMAILS:JSON.stringify([author,other,coordinator]),GLOBO_COORDINATOR_EMAILS:JSON.stringify([coordinator])};
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'SYNTHETIC',alg:'RS256',use:'sig'};
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const tokens={};for(const email of [author,other,coordinator,'outsider@example.invalid']){const now=Math.floor(Date.now()/1000),body=encode({alg:'RS256',kid:jwk.kid})+'.'+encode({iss:auth.CF_ACCESS_TEAM_DOMAIN,aud:[auth.CF_ACCESS_AUD],exp:now+600,nbf:now-1,email});tokens[email]=body+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(body))).toString('base64url');}
const middleware=await fs.readFile(new URL('../partners-portal/functions/_middleware.js',import.meta.url),'utf8');
const app=await fs.readFile(new URL('../partners-portal/lib/collaboration.js',import.meta.url),'utf8');
const script=(middleware+'\n'+app).replace(/^export /gm,'')+`\nexport default {async fetch(request,env){
 const fixture=JSON.parse(env.TEST_FIXTURE);
 const partner=await identity(request,fixture.auth,async()=>Response.json({keys:[fixture.jwk]}));
 if(!partner)return new Response('Access denied',{status:403});
 return await collaboration({request,env},{email:partner.email,isCoordinator:JSON.parse(fixture.auth.GLOBO_COORDINATOR_EMAILS).includes(partner.email)})||new Response('Not found',{status:404});
}};`;
const start=()=>new Miniflare(convertV4MiniflareOptions({modules:true,compatibilityDate:'2026-11-19',bindings:{TEST_FIXTURE:JSON.stringify({auth,jwk})},kvNamespaces:{GLOBO_WORKSPACE:'synthetic-ticket-persistence-only'},resourcePersistencePath:storage,script}));
let runtime=start();
const call=(url,method='GET',body,email=author)=>runtime.dispatchFetch('http://localhost'+url,{method,headers:{Origin:'http://localhost','Content-Type':'application/json',...(email?{'Cf-Access-Jwt-Assertion':tokens[email]}:{})},...(body?{body:JSON.stringify(body)}:{})});
try{
 assert.equal((await call('/api/tickets','GET',null,null)).status,403);
 assert.equal((await call('/api/tickets','GET',null,'outsider@example.invalid')).status,403);
 const response=await call('/api/tickets','POST',{title:'Synthetic native ticket',description:'Local workerd test only. No real partner data.'});assert.equal(response.status,201);
 const {ticket}=await response.json();assert.equal(ticket.created_by,author);
 const url='/api/tickets/'+ticket.id;
 const comments=await Promise.all([call(url+'/comments','POST',{body:'Synthetic author comment'},author),call(url+'/comments','POST',{body:'Synthetic second-partner comment'},other)]);assert.ok(comments.every(r=>r.status===201));
 assert.equal((await call(url+'/status','PATCH',{status:'resolved'},other)).status,403);
 assert.equal((await call(url+'/status','PATCH',{status:'resolved'},coordinator)).status,200);
 await runtime.dispose();runtime=start();
 const restored=await call(url,'GET',null,other);let data=await restored.json();assert.equal(restored.status,200,JSON.stringify(data));assert.equal(data.ticket.status,'resolved');assert.equal(data.comments.length,2);assert.deepEqual(new Set(data.comments.map(c=>c.created_by)),new Set([author,other]));
 const listing=await(await call('/api/tickets','GET',null,other)).json();assert.ok(listing.tickets.some(t=>t.id===ticket.id&&t.status==='resolved'));
 await new Promise(resolve=>setTimeout(resolve,1100));
 assert.equal((await call(url+'/status','PATCH',{status:'open'},author)).status,200);
 data=await(await call(url)).json();assert.equal(data.ticket.status,'open');assert.equal(data.comments.length,2);
 await new Promise(resolve=>setTimeout(resolve,1100));
 assert.equal((await call(url+'/status','PATCH',{status:'resolved'},author)).status,200);
 console.log('PASS: actual workerd signed-user ticket creation, concurrent cross-member comments, role denial, resolve/reopen/history and native local KV persistence after runtime restart');
}finally{await runtime.dispose();}
