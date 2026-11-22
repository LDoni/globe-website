import fs from 'node:fs/promises';
import test from 'node:test';import assert from 'node:assert/strict';
import {summarize,restrictedPolicy,validateRoles,inspect,HOST} from '../scripts/inspect_partner_cloudflare.mjs';
import {probe,allowedHost,denied} from '../scripts/check_partner_access.mjs';
test('inspection without credentials is explicit and cannot silently claim authentication',async()=>{const report=await inspect({},()=>{throw Error('Must not request API without credentials');});assert.equal(report.authenticated,false);assert.ok(report.required_permissions.length);});
test('private identity files require valid roles and coordinators inside the partner list',()=>{assert.deepEqual(validateRoles({partners:['partner@example.invalid'],coordinators:[]}).coordinators,[]);assert.throws(()=>validateRoles({partners:['partner@example.invalid'],coordinators:['outsider@example.invalid']}));});
test('broad Access rules cannot pass the email-only policy check',()=>{assert.equal(restrictedPolicy([{decision:'allow',include:[{email:{email:'partner@example.invalid'}}]}]),true);for(const p of [[{decision:'allow',include:[{everyone:{}}]}],[{decision:'bypass',include:[{everyone:{}}]}],[{decision:'allow',include:[{email:{email:'*@example.invalid'}}]}],[]])assert.equal(restrictedPolicy(p),false);});
test('production and preview require their own coverage, secrets and isolated storage',()=>{
 const env={fail_open:false,env_vars:{CF_ACCESS_TEAM_DOMAIN:{type:'plain_text',value:'https://test.cloudflareaccess.com'},CF_ACCESS_AUD:{type:'plain_text',value:'AUD'},GLOBE_PARTNER_EMAILS:{type:'secret_text'},GLOBE_COORDINATOR_EMAILS:{type:'secret_text'}},kv_namespaces:{GLOBE_WORKSPACE:{namespace_id:'PROD'}}};
 const project={name:'globe-partners',production_branch:'main',build_config:{root_dir:'partners-portal',build_command:'node ../scripts/build_partner_portal.mjs',destination_dir:'.build'},deployment_configs:{production:env,preview:{...env,kv_namespaces:{GLOBE_WORKSPACE:{namespace_id:'PREVIEW'}}}}};
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
