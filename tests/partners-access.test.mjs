import test from 'node:test';
import assert from 'node:assert/strict';
import {authorized,onRequest} from '../partners-portal/functions/_middleware.js';
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'TEST',alg:'RS256',use:'sig'};
const env={CF_ACCESS_TEAM_DOMAIN:'https://synthetic-test.cloudflareaccess.com',CF_ACCESS_AUD:'TEST-AUDIENCE',GLOBE_PARTNER_EMAILS:'["partner@example.invalid"]'};
const claims={iss:env.CF_ACCESS_TEAM_DOMAIN,aud:[env.CF_ACCESS_AUD],exp:2000,nbf:900,email:'partner@example.invalid'};
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
async function request(values={},header={alg:'RS256',kid:'TEST'}){const body=encode(header)+'.'+encode({...claims,...values});const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(body));return new Request('https://synthetic.invalid/private/file.pdf',{headers:{'Cf-Access-Jwt-Assertion':body+'.'+Buffer.from(sig).toString('base64url')}});}
const keys=async()=>Response.json({keys:[jwk]});
test('verified partner with signed expected issuer and audience is admitted',async()=>assert.equal(await authorized(await request(),env,keys,1000),true));
test('absent configuration and anonymous/spoofed email headers are denied',async()=>{
 assert.equal(await authorized(await request(),{},keys,1000),false);
 assert.equal(await authorized(new Request('https://synthetic.invalid',{headers:{'Cf-Access-Authenticated-User-Email':claims.email}}),env,keys,1000),false);
});
test('wrong audience, issuer, expired/future token and outside partner are denied',async()=>{
 for(const values of [{aud:['WRONG']},{iss:'https://wrong.cloudflareaccess.com'},{exp:999},{nbf:1001},{email:'outsider@example.invalid'}])assert.equal(await authorized(await request(values),env,keys,1000),false);
});
test('unsigned/unknown algorithm, key mismatch and invalid signature are denied',async()=>{
 assert.equal(await authorized(await request({}, {alg:'none',kid:'TEST'}),env,keys,1000),false);
 assert.equal(await authorized(await request({}, {alg:'RS256',kid:'WRONG'}),env,keys,1000),false);
 const original=await request();original.headers.set('Cf-Access-Jwt-Assertion',original.headers.get('Cf-Access-Jwt-Assertion').replace(/.$/,'!'));
 assert.equal(await authorized(original,env,keys,1000),false);
});
test('key service failure and removed partner fail closed',async()=>{
 assert.equal(await authorized(await request(),env,async()=>{throw new Error('Synthetic failure')},1000),false);
 assert.equal(await authorized(await request(),{...env,GLOBE_PARTNER_EMAILS:'[]'},keys,1000),false);
});
test('anonymous direct documents and assets never reach static origin',async()=>{
 for(const path of ['/','/private/file.pdf','/assets/document.pdf']){
  const result=await onRequest({request:new Request('https://synthetic.invalid'+path),env,next:()=>{throw new Error('Origin must not run')}});
  assert.equal(result.status,403);assert.equal(result.headers.get('Cache-Control'),'no-store');
 }
});

test('authenticated middleware preserves response body, status and verified identity',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=keys;
 try{const context={request:await request({exp:Math.floor(Date.now()/1000)+60,nbf:Math.floor(Date.now()/1000)-60}),env,data:{},next:async()=>Response.json({saved:true},{status:201})};const response=await onRequest(context);assert.equal(response.status,201);assert.deepEqual(await response.json(),{saved:true});assert.equal(context.data.partner.email,claims.email);assert.equal(response.headers.get('Cache-Control'),'private, no-store');}finally{globalThis.fetch=previous;}
});

test('authenticated direct document access keeps security headers; origin failures remain closed',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=keys;
 try{
  const {onRequest:canary}=await import('../partners-portal/functions/documents/access-canary.txt.js');
  const context={request:await request({exp:Math.floor(Date.now()/1000)+60,nbf:Math.floor(Date.now()/1000)-60}),env,data:{},next:canary};
  const document=await onRequest(context);assert.equal(document.status,200);assert.match(await document.text(),/access test only/);assert.equal(document.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');assert.match(document.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
  context.next=()=>{throw Error('Synthetic origin failure');};const denied=await onRequest(context);assert.equal(denied.status,503);assert.equal(await denied.text(),'Workspace unavailable');
 }finally{globalThis.fetch=previous;}
});
