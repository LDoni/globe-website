// Actual workerd regression: Node accepts redirect:error, Workers rejects it.
// Uses only synthetic signed identities and public test keys, never live sessions.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
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
 if(process.env.GLOBO_RUNTIME_TEST_IN_WRANGLER)throw Error('Pinned Wrangler runtime is unavailable');
 const env={...process.env,GLOBO_RUNTIME_TEST_IN_WRANGLER:'true',WRANGLER_SEND_METRICS:'false'};
 delete env.CLOUDFLARE_API_TOKEN;delete env.CLOUDFLARE_API_KEY;delete env.CLOUDFLARE_EMAIL;
 const code=await new Promise((resolve,reject)=>{const p=spawn('npx',['--offline','--no-install','--package=wrangler@4.165.0','-c','node tests/partners-runtime.mjs'],{cwd:root,env,stdio:'inherit'});p.once('error',reject);p.once('close',resolve);});
 process.exit(code??1);
}
const require=createRequire(wrangler),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
const source=await fs.readFile(new URL('../partners-portal/functions/_middleware.js',import.meta.url),'utf8');
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'SYNTHETIC',alg:'RS256',use:'sig'};
const env={CF_ACCESS_TEAM_DOMAIN:'https://synthetic-test.cloudflareaccess.com',CF_ACCESS_AUD:'TEST-AUDIENCE',GLOBO_PARTNER_EMAILS:'["partner@example.invalid"]'};
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const payload=encode({alg:'RS256',kid:jwk.kid})+'.'+encode({iss:env.CF_ACCESS_TEAM_DOMAIN,aud:[env.CF_ACCESS_AUD],exp:2000,nbf:900,email:'partner@example.invalid'});
const token=payload+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(payload))).toString('base64url');
const runtime=new Miniflare(convertV4MiniflareOptions({modules:true,compatibilityDate:'2026-11-19',bindings:{TEST_FIXTURE:JSON.stringify({env,jwk,token})},script:source+`
export default {async fetch(incoming,bindings){
 const fixture=JSON.parse(bindings.TEST_FIXTURE);
 let legacyRejected=false;try{new Request('https://synthetic.invalid',{redirect:'error'});}catch{legacyRejected=true;}
 const path=new URL(incoming.url).pathname;
 const request=new Request('https://synthetic.invalid/',{headers:{'Cf-Access-Jwt-Assertion':fixture.token}});
 const reasons=[];
 const member=await identity(request,fixture.env,async(url,options)=>{
  // The real Workers Request constructor must accept the actual fetch options.
  new Request(url,options);
  if(path==='/redirect')return new Response(null,{status:302,headers:{Location:'https://outside.invalid/keys'}});
  return Response.json({keys:[fixture.jwk]});
 },path==='/expired'?3000:1000,reason=>reasons.push(reason));
 return Response.json({legacyRejected,admitted:Boolean(member),reasons});
}};
`}));
try{
 const valid=await (await runtime.dispatchFetch('http://localhost/')).json();
 assert.equal(valid.legacyRejected,true,'The runtime must reproduce the unsupported redirect:error mode');
 assert.equal(valid.admitted,true,'A correctly signed allowed identity must pass in actual workerd');
 assert.deepEqual(valid.reasons,[]);
 const redirected=await (await runtime.dispatchFetch('http://localhost/redirect')).json();
 assert.equal(redirected.admitted,false);assert.deepEqual(redirected.reasons,['KEY_SERVICE']);
 const expired=await (await runtime.dispatchFetch('http://localhost/expired')).json();
 assert.equal(expired.admitted,false);assert.deepEqual(expired.reasons,['ASSERTION_TIME']);
 console.log('PASS: actual workerd reproduces redirect:error failure; fixed signed login passes; JWKS redirects and expired tokens remain denied');
}finally{await runtime.dispose();}
