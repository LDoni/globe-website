// Real-host smoke tests. Authentication tokens, if supplied, stay in an external file.
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {readExternal,HOST} from './inspect_partner_cloudflare.mjs';
export function allowedHost(host){return typeof host==='string'&&/^(?:[a-z0-9][a-z0-9-]*\.)?globe-partners\.pages\.dev$/.test(host);}
export function denied(response){if([401,403].includes(response.status))return true;if(![301,302,303,307,308].includes(response.status))return false;try{return /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com\//.test(response.headers.get('location')||'');}catch{return false;}}
export async function probe(hostnames=[HOST],cookies={},fetcher=fetch){
 const report={checked_at:new Date().toISOString(),hosts:[],authenticated_tests:'not_run_missing_user_sessions'};
 const paths=['/','/api/workspace','/documents/access-canary.txt','/assets/globe.png'];
 for(const host of hostnames){if(!allowedHost(host))throw Error('Refusing to send authentication to a non-partner hostname');
  const result={host,anonymous:[],forged_identity:[],sessions:[]};
  for(const path of paths){const r=await fetcher('https://'+host+path,{redirect:'manual',signal:AbortSignal.timeout(15000)});result.anonymous.push({path,status:r.status,denied:denied(r),login_challenge:!!r.headers.get('location')?.includes('.cloudflareaccess.com/')});}
  for(const path of ['/api/workspace','/documents/access-canary.txt']){const r=await fetcher('https://'+host+path,{redirect:'manual',headers:{'Cf-Access-Authenticated-User-Email':'synthetic@example.invalid','Cf-Access-Jwt-Assertion':'not-a-signed-assertion'},signal:AbortSignal.timeout(15000)});result.forged_identity.push({path,status:r.status,denied:denied(r)});}
  for(const role of ['partner','coordinator','outsider','removed']){const token=cookies[host]?.[role];if(!token)continue;if(typeof token!=='string'||token.length>20000||!/^[-A-Za-z0-9_]+\.[-A-Za-z0-9_]+\.[-A-Za-z0-9_]+$/.test(token))throw Error('Invalid session token in the external session file');report.authenticated_tests='executed_for_supplied_sessions';for(const path of paths){const r=await fetcher('https://'+host+path,{redirect:'manual',headers:{Cookie:'CF_Authorization='+token},signal:AbortSignal.timeout(15000)});let pass=['outsider','removed'].includes(role)?denied(r):r.status===200;if(path==='/api/workspace'&&r.status===200){const value=await r.json();pass=pass&&value.user?.role===role&&value.submissions_available===true;}result.sessions.push({role,path,status:r.status,pass});}}
  report.hosts.push(result);
 }
 report.anonymous_denied=report.hosts.every(h=>[...h.anonymous,...h.forged_identity].every(r=>r.denied));
 report.login_challenges_present=report.hosts.every(h=>h.anonymous[0].login_challenge);
 report.all_supplied_sessions_pass=report.hosts.every(h=>h.sessions.every(s=>s.pass));
 report.authorization_complete=report.hosts.every(h=>['partner','coordinator','outsider','removed'].every(role=>h.sessions.some(s=>s.role===role)))&&report.all_supplied_sessions_pass;
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url))try{
 const hosts=process.env.GLOBE_PARTNER_HOSTS?JSON.parse(process.env.GLOBE_PARTNER_HOSTS):[HOST];
 const cookies=process.env.GLOBE_PARTNER_SESSION_FILE?JSON.parse(await readExternal(process.env.GLOBE_PARTNER_SESSION_FILE)):{};
 const report=await probe(hosts,cookies);console.log(JSON.stringify(report,null,2));
 if(!report.anonymous_denied||!report.all_supplied_sessions_pass)process.exitCode=1;
 else if(!report.login_challenges_present||!report.authorization_complete)process.exitCode=2;
}catch(e){console.error(e.message);process.exitCode=1;}
