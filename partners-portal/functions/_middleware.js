// Cloudflare Access at the edge is mandatory. This validates the signed assertion
// again at the origin and restricts access to a separately configured email list.
const decoder = new TextDecoder();
function decode(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid encoding');
  return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0));
}
export async function identity(request, env, fetchKeys=fetch, now=Math.floor(Date.now()/1000)) {
  const issuer=(env.CF_ACCESS_TEAM_DOMAIN||'').replace(/\/$/,'');
  const audience=env.CF_ACCESS_AUD;
  let emails;
  try { emails=JSON.parse(env.GLOBE_PARTNER_EMAILS||'[]'); } catch { return false; }
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer) || !audience || !Array.isArray(emails) || !emails.length || emails.some(e=>typeof e!=='string')) return false;
  const token=request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || token.length>20000) return false;
  try {
    const parts=token.split('.');if(parts.length!==3)return false;
    const header=JSON.parse(decoder.decode(decode(parts[0])));
    const claims=JSON.parse(decoder.decode(decode(parts[1])));
    if(header.alg!=='RS256'||typeof header.kid!=='string')return false;
    if(claims.iss!==issuer || !Array.isArray(claims.aud) || !claims.aud.includes(audience))return false;
    if(!Number.isFinite(claims.exp)||claims.exp<=now || (claims.nbf!==undefined&&(!Number.isFinite(claims.nbf)||claims.nbf>now)))return false;
    if(typeof claims.email!=='string'||!emails.map(e=>e.trim().toLowerCase()).includes(claims.email.trim().toLowerCase()))return false;
    const response=await fetchKeys(issuer+'/cdn-cgi/access/certs',{redirect:'error'});
    if(!response.ok)return false;
    const jwks=await response.json();
    const jwk=jwks.keys?.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
    if(!jwk)return false;
    const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))return false;
    return {email:claims.email.trim().toLowerCase()};
  } catch { return false; }
}
export async function authorized(...args){return Boolean(await identity(...args));}
export async function onRequest(context) {
  const partner=await identity(context.request,context.env);
  if(!partner)return new Response('Access denied',{status:403,headers:{'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'}});
  context.data.partner=partner;
  const upstream=await context.next();
  const response=new Response(upstream.body,upstream);
  response.headers.set('Cache-Control','private, no-store');
  response.headers.set('Vary','Cookie, Cf-Access-Jwt-Assertion');
  return response;
}
