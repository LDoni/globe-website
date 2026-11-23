// Local synthetic integration harness. Never deploy this file or its synthetic identity.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {onRequest as gate} from '../partners-portal/functions/_middleware.js';
import {onRequest as api} from '../partners-portal/functions/api/[[route]].js';
import {memoryKV} from './partners-memory-kv.mjs';
export async function startPreview(port=0){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../partners-portal/.build');
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'SYNTHETIC',alg:'RS256',use:'sig'};
 const users=['partner@example.invalid','other@example.invalid','coordinator@example.invalid'];
 const env={CF_ACCESS_TEAM_DOMAIN:'https://local-synthetic.cloudflareaccess.com',CF_ACCESS_AUD:'LOCAL-TEST',GLOBE_PARTNER_EMAILS:JSON.stringify(users),GLOBE_COORDINATOR_EMAILS:JSON.stringify([users[2]]),GLOBE_WORKSPACE:memoryKV()};
 async function assets(request){const url=new URL(request.url||request);if(url.pathname==='/resources.json')return Response.json([{title:'Synthetic sampling protocol',description:'Browser test document only.',category:'Protocol',updated:'2026-11-21',path:'/documents/synthetic-protocol.txt'}]);if(url.pathname==='/documents/synthetic-protocol.txt')return new Response('Synthetic protocol only. No real project procedure.',{headers:{'Content-Type':'text/plain'}});const name=decodeURIComponent(url.pathname)==='/'?'index.html':decodeURIComponent(url.pathname).slice(1),file=path.resolve(root,name);if(!file.startsWith(root+path.sep))return new Response('Denied',{status:403});try{const content=await fs.readFile(file),ext=path.extname(file),type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/json','.png':'image/png','.txt':'text/plain'}[ext]||'application/octet-stream';return new Response(content,{headers:{'Content-Type':type,'X-Content-Type-Options':'nosniff'}});}catch{return new Response('Not found',{status:404});}}
 env.ASSETS={fetch:assets};const realFetch=globalThis.fetch;
 globalThis.fetch=(input,...args)=>String(input)===env.CF_ACCESS_TEAM_DOMAIN+'/cdn-cgi/access/certs'?Promise.resolve(Response.json({keys:[jwk]})):realFetch(input,...args);
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const server=http.createServer(async(req,res)=>{try{
  const email=users.includes(req.headers['x-synthetic-user'])?req.headers['x-synthetic-user']:users[0],header=encode({alg:'RS256',kid:'SYNTHETIC'}),body=encode({iss:env.CF_ACCESS_TEAM_DOMAIN,aud:[env.CF_ACCESS_AUD],email,exp:Math.floor(Date.now()/1000)+300}),token=header+'.'+body;
  const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(token));
  const headers=new Headers(Object.entries(req.headers).filter(([,v])=>typeof v==='string'));headers.set('Cf-Access-Jwt-Assertion',token+'.'+Buffer.from(signature).toString('base64url'));
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const request=new Request('http://127.0.0.1:'+server.address().port+req.url,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});
  const context={env,request,data:{}};context.next=()=>new URL(request.url).pathname.startsWith('/api/')?api(context):assets(request);
  const response=await gate(context);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Synthetic preview failed');}});
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 return{server,env,url:'http://127.0.0.1:'+server.address().port,close:async()=>{await new Promise(resolve=>server.close(resolve));globalThis.fetch=realFetch;}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const preview=await startPreview(Number(process.env.GLOBE_PORTAL_PORT||8790));console.log('SYNTHETIC WORKSPACE PREVIEW ONLY — no real users or private documents:',preview.url);}
