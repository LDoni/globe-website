export function validRelayUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='script.google.com'&&!u.username&&!u.password&&!u.search&&!u.hash&&/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname);}catch{return false;}}
export async function sendGoogleRelay(record,env,fetcher=fetch){
 if(!validRelayUrl(env.GOOGLE_RELAY_URL)||!/^[a-f0-9]{64}$/.test(env.GOOGLE_RELAY_SECRET||''))throw Error('Google relay is not configured');
 const timestamp=Math.floor(Date.now()/1000),payload=JSON.stringify(record),encoder=new TextEncoder(),key=await crypto.subtle.importKey('raw',encoder.encode(env.GOOGLE_RELAY_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']),digest=await crypto.subtle.sign('HMAC',key,encoder.encode(timestamp+'\n'+payload)),signature=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 const signal=AbortSignal.timeout(18000);
 let r=await fetcher(env.GOOGLE_RELAY_URL,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json'},body:JSON.stringify({timestamp,payload,signature}),signal});
 if([302,303].includes(r.status)){const url=new URL(r.headers.get('Location')||'');if(url.protocol!=='https:'||url.hostname!=='script.googleusercontent.com'||url.username||url.password)throw Error('Google relay redirected outside the content service');r=await fetcher(url.href,{method:'GET',redirect:'manual',signal});}
 if(!r.ok)throw Error('Google notification was not confirmed');let result;try{result=await r.json();}catch{throw Error('Google notification was not confirmed');}if(result.ok!==true||result.id!==record.id)throw Error('Google notification was not confirmed');
}
