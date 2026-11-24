// Direct Join intake. No public reads, arbitrary recipients, or simulated mail sends.
import {emailConfigured,sendMail} from './mail.mjs';
const fields=['name','email','institution','country','interest','message','consent','turnstile_token','website'];
const interests=['Coastal sampling station','Environmental monitoring','Scientific collaboration','General enquiry'];
function ready(env){return env.CONTACT_ENABLED==='true'&&Boolean(env.GLOBO_ENQUIRIES?.put)&&Boolean(env.TURNSTILE_SECRET_KEY)&&/^https:\/\/[a-z0-9.-]+$/.test(env.CONTACT_ALLOWED_ORIGIN||'')&&Boolean(env.CONTACT_TURNSTILE_HOSTNAME)&&emailConfigured(env);}
function response(request,env,body,status=200){const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin'};if(request.headers.get('Origin')===env.CONTACT_ALLOWED_ORIGIN){headers['Access-Control-Allow-Origin']=env.CONTACT_ALLOWED_ORIGIN;headers['Access-Control-Allow-Methods']='GET, POST, OPTIONS';headers['Access-Control-Allow-Headers']='Content-Type';}return new Response(JSON.stringify(body),{status,headers});}
async function payload(request){if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))throw Error('JSON required');const reader=request.body?.getReader();if(!reader)throw Error('Empty request');let length=0;const parts=[];try{for(;;){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>20000){await reader.cancel();throw Error('Request too large');}parts.push(value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(length);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.byteLength;}return JSON.parse(new TextDecoder().decode(bytes));}
export function validateEnquiry(body){if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).some(k=>!fields.includes(k)))throw Error('Unsupported form fields');const values={};for(const [key,max]of Object.entries({name:120,email:254,institution:200,country:100,interest:100,message:4000})){if(typeof body[key]!=='string'||!body[key].trim()||body[key].length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(body[key]))throw Error('Please complete the required fields');values[key]=body[key].trim();}if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)||/[\r\n]/.test(values.email))throw Error('Enter a valid email');if(body.consent!==true)throw Error('Contact consent is required');if(!interests.includes(values.interest))throw Error('Choose a contribution');if(body.website)throw Error('Please submit the form manually');if(typeof body.turnstile_token!=='string'||!body.turnstile_token||body.turnstile_token.length>2048)throw Error('Please complete the security check');return{...values,consent:true};}
export async function handle(request,env,fetcher=fetch,mailer=sendMail){
 const path=new URL(request.url).pathname,origin=request.headers.get('Origin');
 if(origin&&origin!==env.CONTACT_ALLOWED_ORIGIN)return response(request,env,{error:'Request origin rejected'},403);
 if(request.method==='OPTIONS')return response(request,env,{},origin===env.CONTACT_ALLOWED_ORIGIN?200:403);
 if(path==='/health'&&request.method==='GET')return response(request,env,{configured:ready(env),delivery:'email-and-private-inbox'},ready(env)?200:503);
 if(path!=='/api/join')return response(request,env,{error:'Not found'},404);
 if(request.method!=='POST')return response(request,env,{error:'Method not allowed'},405);
 if(origin!==env.CONTACT_ALLOWED_ORIGIN)return response(request,env,{error:'Request origin rejected'},403);
 if(!ready(env))return response(request,env,{error:'Online enquiries are not available yet. Please try again later.'},503);
 let input,values;try{input=await payload(request);values=validateEnquiry(input);}catch(e){return response(request,env,{error:e.message==='Request too large'?'Your enquiry is too long.':'Please check the form fields and security challenge.'},400);}
 try{
  const result=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:input.turnstile_token,...(request.headers.get('CF-Connecting-IP')?{remoteip:request.headers.get('CF-Connecting-IP')}:{})}),signal:AbortSignal.timeout(5000)});
  if(!result.ok||result.redirected)return response(request,env,{error:'Security verification is unavailable. Please try again.'},503);
  const check=await result.json();if(check.success!==true||check.hostname!==env.CONTACT_TURNSTILE_HOSTNAME||check.action!=='join')return response(request,env,{error:'Security check failed. Please try again.'},403);
  const id=crypto.randomUUID(),record={id,...values,submitted_at:new Date().toISOString(),status:'new'};
  await env.GLOBO_ENQUIRIES.put('join:'+id,JSON.stringify(record));
  try{await mailer(record,env,fetcher);await env.GLOBO_ENQUIRIES.put('join-delivery:'+id,JSON.stringify({status:'provider_accepted',updated_at:new Date().toISOString()}));}catch{try{await env.GLOBO_ENQUIRIES.put('join-delivery:'+id,JSON.stringify({status:'unconfirmed',updated_at:new Date().toISOString()}));}catch{}return response(request,env,{ok:false,saved:true,receipt:id,error:'Your enquiry was saved, but email delivery could not be confirmed. Reference: '+id},202);}
  return response(request,env,{ok:true,receipt:id,message:'Your enquiry has been received. The notification was accepted for delivery.'},201);
 }catch{return response(request,env,{error:'We could not confirm receipt. Please try again later.'},503);}
}
export default{fetch:handle};
