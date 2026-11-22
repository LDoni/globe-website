// Cloudflare Access at the edge is mandatory. This validates the signed assertion
// again at the origin and restricts access to a separately configured email list.
const decoder = new TextDecoder();
function decode(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid encoding');
  return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0));
}
export async function identity(request, env, fetchKeys=fetch, now=Math.floor(Date.now()/1000),diagnose=()=>{}) {
  const deny=reason=>{diagnose(reason);return false;};
  const issuer=(env.CF_ACCESS_TEAM_DOMAIN||'').replace(/\/$/,'');
  const audience=env.CF_ACCESS_AUD;
  let emails;
  try { emails=JSON.parse(env.GLOBE_PARTNER_EMAILS||'[]'); } catch { return deny('CONFIGURATION'); }
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer) || !audience || !Array.isArray(emails) || !emails.length || emails.some(e=>typeof e!=='string')) return deny('CONFIGURATION');
  emails=[...new Set(emails.map(e=>e.trim().toLowerCase()))];
  if(emails.length>50 || emails.some(e=>! /^[^\s@*]+@[^\s@*]+\.[^\s@*]+$/.test(e)))return deny('MEMBERSHIP_CONFIGURATION');
  const token=request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || token.length>20000) return deny('MISSING_ASSERTION');
  try {
    const parts=token.split('.');if(parts.length!==3)return deny('ASSERTION_FORMAT');
    const header=JSON.parse(decoder.decode(decode(parts[0])));
    const claims=JSON.parse(decoder.decode(decode(parts[1])));
    if(header.alg!=='RS256'||typeof header.kid!=='string')return deny('ASSERTION_ALGORITHM');
    if(claims.iss!==issuer || !Array.isArray(claims.aud) || !claims.aud.includes(audience))return deny('ISSUER_OR_AUDIENCE');
    if(!Number.isFinite(claims.exp)||claims.exp<=now || (claims.nbf!==undefined&&(!Number.isFinite(claims.nbf)||claims.nbf>now)))return deny('ASSERTION_TIME');
    if(typeof claims.email!=='string'||!emails.map(e=>e.trim().toLowerCase()).includes(claims.email.trim().toLowerCase()))return deny('MEMBERSHIP');
    const response=await fetchKeys(issuer+'/cdn-cgi/access/certs',{redirect:'error',signal:AbortSignal.timeout(5000)});
    if(!response.ok)return deny('KEY_SERVICE');
    const jwks=await response.json();
    const jwk=jwks.keys?.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
    if(!jwk)return deny('SIGNING_KEY');
    const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))return deny('SIGNATURE');
    return {email:claims.email.trim().toLowerCase()};
  } catch { return deny('ASSERTION_VERIFICATION'); }
}
export async function authorized(...args){return Boolean(await identity(...args));}
function guarded(response,denied=false){
 const result=new Response(response.body,response);
 result.headers.set('Cache-Control',denied?'no-store':'private, no-store');
 result.headers.set('Vary',[result.headers.get('Vary'),'Cookie','Cf-Access-Jwt-Assertion'].filter(Boolean).join(', '));
 result.headers.set('X-Content-Type-Options','nosniff');
 result.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
 result.headers.set('Referrer-Policy','no-referrer');
 result.headers.set('Content-Security-Policy',"default-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
 return result;
}
export async function onRequest(context) {
 try{
  let reason='VERIFICATION';
  const partner=await identity(context.request,context.env,fetch,Math.floor(Date.now()/1000),value=>{reason=value;});
  if(!partner)return guarded(new Response('Access denied. Reference: GLOBE-AUTH-'+reason,{status:403,headers:{'Content-Type':'text/plain; charset=utf-8','X-GLOBE-Access-Reason':reason}}),true);
  context.data.partner=partner;
  return guarded(await context.next());
 }catch{return guarded(new Response('Workspace unavailable',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}),true);}
}
