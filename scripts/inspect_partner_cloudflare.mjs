// Read-only, sanitized inspection. No account/config mutation and no secret output.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const HOST='globe-partners.pages.dev';
export const MAX_PARTNERS=50;
export const REQUIRED_PERMISSIONS=['Cloudflare Pages: Edit','Workers KV Storage: Edit','Access: Apps and Policies: Edit','Access: Organizations, Identity Providers, and Groups: Write (to configure email OTP)'];
export async function readExternal(file){const real=await fs.realpath(file);if(real===ROOT||real.startsWith(ROOT+path.sep))throw Error('Credentials and identities must be outside the public repository');return fs.readFile(real,'utf8');}
export function validateRoles(value){
 if(!value||!Array.isArray(value.partners)||!value.partners.length||!Array.isArray(value.coordinators))throw Error('Private role file needs nonempty partners and a coordinators array');
 const normalize=list=>list.map(x=>{if(typeof x!=='string'||!/^[^\s@*]+@[^\s@*]+\.[^\s@*]+$/.test(x))throw Error('Invalid address in private role file');return x.trim().toLowerCase();});
 const partners=[...new Set(normalize(value.partners))],coordinators=[...new Set(normalize(value.coordinators))];
 if(partners.length>MAX_PARTNERS)throw Error('GLOBE permits at most 50 authorized users; no addresses were added');
 if(coordinators.some(x=>!partners.includes(x)))throw Error('Coordinators must also be authorized partners');return{partners,coordinators};
}
function domains(app){return [app.domain,...(app.self_hosted_domains||[]),...(app.destinations||[]).filter(x=>x.type==='public').map(x=>x.uri)].filter(x=>typeof x==='string').map(x=>x.replace(/^https?:\/\//,'').replace(/\/$/,''));}
export function restrictedPolicy(policies){
 const allows=policies.filter(p=>p.decision==='allow');
 const valid=allows.length>0&&!policies.some(p=>['bypass','non_identity'].includes(p.decision))&&allows.every(p=>Array.isArray(p.include)&&p.include.length&&p.include.every(r=>r&&Object.keys(r).length===1&&typeof r.email?.email==='string'&&/^[^\s@*]+@[^\s@*]+\.[^\s@*]+$/.test(r.email.email)));
 return valid&&new Set(allows.flatMap(p=>p.include.map(r=>r.email.email.toLowerCase()))).size<=MAX_PARTNERS;
}
export function summarize(project,applications){
 const build=project.build_config||{},configs=project.deployment_configs||{};
 const result={project:project.name,hostname:project.subdomain||HOST,build_config_correct:build.root_dir==='partners-portal'&&build.build_command==='node ../scripts/build_partner_portal.mjs'&&build.destination_dir==='.build'&&project.production_branch==='main',latest_deployment:project.latest_deployment?{url:project.latest_deployment.url,status:project.latest_deployment.latest_stage?.status}:null,environments:{}};
 for(const [name,host]of [['production',HOST],['preview','*.'+HOST]]){const env=configs[name]||{},app=applications.find(a=>a.type==='self_hosted'&&domains(a).includes(host));result.environments[name]={fail_closed:env.fail_open===false,kv_bound:Boolean(env.kv_namespaces?.GLOBE_WORKSPACE?.namespace_id),secrets_present:['GLOBE_PARTNER_EMAILS','GLOBE_COORDINATOR_EMAILS'].every(k=>env.env_vars?.[k]?.type==='secret_text'),issuer_present:Boolean(env.env_vars?.CF_ACCESS_TEAM_DOMAIN),audience_present:Boolean(env.env_vars?.CF_ACCESS_AUD),access_application_found:Boolean(app),email_only_policy:app?restrictedPolicy(app.policies||[]):false,audience_matches:app&&env.env_vars?.CF_ACCESS_AUD?.value?app.aud===env.env_vars.CF_ACCESS_AUD.value:null};}
 const a=configs.production?.kv_namespaces?.GLOBE_WORKSPACE?.namespace_id,b=configs.preview?.kv_namespaces?.GLOBE_WORKSPACE?.namespace_id;
 result.storage_isolated=Boolean(a&&b&&a!==b);return result;
}
export async function inspect(env=process.env,fetcher=fetch){
 const token=env.CLOUDFLARE_API_TOKEN||(env.CLOUDFLARE_API_TOKEN_FILE?(await readExternal(env.CLOUDFLARE_API_TOKEN_FILE)).trim():'');
 const account=env.CLOUDFLARE_ACCOUNT_ID||(env.CLOUDFLARE_ACCOUNT_ID_FILE?(await readExternal(env.CLOUDFLARE_ACCOUNT_ID_FILE)).trim():'');
 if(!token||!/^[a-f0-9]{32}$/i.test(account))return{authenticated:false,required_permissions:REQUIRED_PERMISSIONS,error:'Provide account-scoped authorization through the environment or files outside the repository. No credentials were read from GitHub or printed.'};
 if(!/^[A-Za-z0-9_-]{20,512}$/.test(token))throw Error('Invalid API token format; supply the token through a private file or environment');
 async function get(suffix){const r=await fetcher('https://api.cloudflare.com/client/v4/accounts/'+account+suffix,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(20000)});const value=await r.json();if(!r.ok||value.success!==true){if((value.errors||[]).some(e=>String(e.message).includes('access.api.error.not_enabled')))throw Error('Cloudflare Access is not enabled in this account; activate Access/Zero Trust before configuring applications');throw Error('Cloudflare inspection rejected: HTTP '+r.status+'; verify the account and token permissions');}return value.result;}
 async function list(endpoint){const rows=[],size=endpoint.endsWith('/deployments')?25:100;for(let page=1;page<=100;page++){const batch=await get(endpoint+'?per_page='+size+'&page='+page);if(!Array.isArray(batch))throw Error('Unexpected Cloudflare list response');rows.push(...batch);if(batch.length<size)return rows;}throw Error('Cloudflare list exceeds inspection limit; review pagination');}
 const project=await get('/pages/projects/globe-partners'),apps=await list('/access/apps');
 for(const app of apps.filter(a=>domains(a).some(d=>[HOST,'*.'+HOST].includes(d))))app.policies=await get('/access/apps/'+encodeURIComponent(app.id)+'/policies');
 const org=await get('/access/organizations'),deployments=await list('/pages/projects/globe-partners/deployments'),idps=await list('/access/identity_providers');
 const otp=idps.filter(x=>x.type==='onetimepin').map(x=>x.id);
 const otpOnly=host=>{const app=apps.find(a=>domains(a).includes(host));return Boolean(app?.allowed_idps?.length&&app.allowed_idps.every(id=>otp.includes(id)));};
 const report={authenticated:true,checked_at:new Date().toISOString(),...summarize(project,apps),organization_configured:Boolean(org.auth_domain),email_otp_available:otp.length>0,email_otp_enforced:otpOnly(HOST)&&otpOnly('*.'+HOST),max_authorized_users:MAX_PARTNERS,hostnames:[...new Set([HOST,...deployments.flatMap(d=>[d.url,...(d.aliases||[])])].map(x=>{try{return new URL(x.includes('://')?x:'https://'+x).hostname;}catch{return '';}}).filter(x=>x===HOST||x.endsWith('.'+HOST)))]};
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url))try{const report=await inspect();console.log(JSON.stringify(report,null,2));if(!report.authenticated)process.exitCode=2;}catch(e){console.error(e.message);process.exitCode=1;}
