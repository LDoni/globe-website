import fs from 'node:fs/promises';
import test from 'node:test';import assert from 'node:assert/strict';
import {summarize,restrictedPolicy,validateRoles,inspect,HOST} from '../scripts/inspect_partner_cloudflare.mjs';
import {probe,allowedHost,denied} from '../scripts/check_partner_access.mjs';
test('inspection without credentials is explicit and cannot silently claim authentication',async()=>{const report=await inspect({},()=>{throw Error('Must not request API without credentials');});assert.equal(report.authenticated,false);assert.ok(report.required_permissions.length);});
test('private identity files require valid roles and coordinators inside the partner list',()=>{assert.deepEqual(validateRoles({partners:['partner@example.invalid'],coordinators:[]}).coordinators,[]);assert.throws(()=>validateRoles({partners:['partner@example.invalid'],coordinators:['outsider@example.invalid']}));});
test('the configuration accepts 50 distinct users and rejects a 51st without truncation',()=>{
 const partners=Array.from({length:50},(_,i)=>`partner${i}@example.invalid`);
 assert.equal(validateRoles({partners:[...partners,partners[0].toUpperCase()],coordinators:[partners[0]]}).partners.length,50);
 assert.throws(()=>validateRoles({partners:[...partners,'extra@example.invalid'],coordinators:[]}),/at most 50/);
 const policy=emails=>[{decision:'allow',include:emails.map(email=>({email:{email}}))}];
 assert.equal(restrictedPolicy(policy(partners)),true);
 assert.equal(restrictedPolicy(policy([...partners,'extra@example.invalid'])),false);
});
test('broad Access rules cannot pass the email-only policy check',()=>{assert.equal(restrictedPolicy([{decision:'allow',include:[{email:{email:'partner@example.invalid'}}]}]),true);for(const p of [[{decision:'allow',include:[{everyone:{}}]}],[{decision:'bypass',include:[{everyone:{}}]}],[{decision:'allow',include:[{email:{email:'*@example.invalid'}}]}],[]])assert.equal(restrictedPolicy(p),false);});
test('production and preview require their own coverage, secrets and isolated storage',()=>{
 const env={fail_open:false,env_vars:{CF_ACCESS_TEAM_DOMAIN:{type:'plain_text',value:'https://test.cloudflareaccess.com'},CF_ACCESS_AUD:{type:'plain_text',value:'AUD'},GLOBO_PARTNER_EMAILS:{type:'secret_text'},GLOBO_COORDINATOR_EMAILS:{type:'secret_text'}},kv_namespaces:{GLOBO_WORKSPACE:{namespace_id:'PROD'}}};
 const project={name:'globo-partners',production_branch:'main',build_config:{root_dir:'partners-portal',build_command:'node ../scripts/build_partner_portal.mjs',destination_dir:'.build'},deployment_configs:{production:env,preview:{...env,kv_namespaces:{GLOBO_WORKSPACE:{namespace_id:'PREVIEW'}}}}};
 const app={type:'self_hosted',domain:HOST,self_hosted_domains:['*.'+HOST],aud:'AUD',policies:[{decision:'allow',include:[{email:{email:'partner@example.invalid'}}]}]};const report=summarize(project,[app]);assert.equal(report.build_config_correct,true);assert.equal(report.storage_isolated,true);assert.equal(report.environments.preview.email_only_policy,true);assert.equal(summarize({...project,deployment_configs:{production:env,preview:env}},[app]).storage_isolated,false);
});
test('HTTP probes accept only real denials or a Cloudflare login challenge',async()=>{
 assert.equal(denied(new Response('',{status:200})),false);assert.equal(denied(new Response('',{status:302,headers:{location:'https://attacker.invalid/login'}})),false);assert.equal(allowedHost('globe-partners.pages.dev.attacker.invalid'),false);assert.equal(allowedHost('attacker.invalid/path.globe-partners.pages.dev'),false);assert.equal(allowedHost('main.globe-partners.pages.dev'),true);
 const report=await probe([HOST],{},async()=>new Response('Access denied',{status:403}));assert.equal(report.anonymous_denied,true);assert.equal(report.authorization_complete,false);assert.equal(report.login_challenges_present,false);
 let called=false;await assert.rejects(()=>probe(['attacker.invalid'],{},{async fetch(){called=true;}}));assert.equal(called,false);
});

test('every deployed route stays protected and Wrangler cannot override dashboard bindings',async()=>{
 const routes=JSON.parse(await fs.readFile(new URL('../partners-portal/public/_routes.json',import.meta.url),'utf8'));assert.deepEqual(routes.include,['/*']);assert.deepEqual(routes.exclude,[]);
 const config=await fs.readFile(new URL('../partners-portal/wrangler.toml',import.meta.url),'utf8');assert.equal(/^\s*pages_build_output_dir\s*=/m.test(config),false);
});

test('disabled account Access is diagnosed separately from missing permissions',async()=>{
 const fetcher=async url=>url.includes('/pages/projects/')?Response.json({success:true,result:{name:'globo-partners'}}):Response.json({success:false,errors:[{message:'access.api.error.not_enabled: Access is not enabled'}]},{status:403});
 await assert.rejects(()=>inspect({CLOUDFLARE_ACCOUNT_ID:'0'.repeat(32),CLOUDFLARE_API_TOKEN:'A'.repeat(40)},fetcher),/Access is not enabled/);
});

test('live inspection uses the Pages deployment page limit and reads every page',async()=>{
 const calls=[];
 const fetcher=async value=>{const url=new URL(value);calls.push(url);
  let result;
  if(url.pathname.endsWith('/deployments')){assert.equal(url.searchParams.get('per_page'),'25');result=url.searchParams.get('page')==='1'?Array.from({length:25},()=>({url:'https://hash.globe-partners.pages.dev'})):[];}
  else if(url.pathname.endsWith('/access/apps')||url.pathname.endsWith('/access/identity_providers'))result=[];
  else if(url.pathname.endsWith('/access/organizations'))result={auth_domain:'test.cloudflareaccess.com'};
  else result={name:'globo-partners'};
  return Response.json({success:true,result});
 };
 const result=await inspect({CLOUDFLARE_ACCOUNT_ID:'0'.repeat(32),CLOUDFLARE_API_TOKEN:'A'.repeat(40)},fetcher);
 assert.equal(result.organization_configured,true);
 assert.ok(result.hostnames.includes('hash.globe-partners.pages.dev'));
 assert.ok(calls.some(url=>url.pathname.endsWith('/deployments')&&url.searchParams.get('page')==='2'));
});
