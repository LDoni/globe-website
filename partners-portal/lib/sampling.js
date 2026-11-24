import {validateSampling,samplingSummary} from '../public/sampling-schema.js';
const json=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
export async function samplingCatalogue(kv){if(!kv)return[];const p=await kv.list({prefix:'sampling-meta:',limit:200});if(!p.list_complete)throw Error('Sampling catalogue capacity reached');return(await Promise.all(p.keys.filter(k=>k.name.startsWith('sampling-meta:')).map(k=>kv.get(k.name,'json')))).filter(Boolean).sort((a,b)=>b.updated_at.localeCompare(a.updated_at));}
export async function samplingApi(context,{email,isCoordinator}){
 const {request,env}=context,u=new URL(request.url),kv=env.GLOBO_WORKSPACE;if(!/^\/api\/sampling(\/|$)/.test(u.pathname))return null;if(!email)return json({error:'Access denied'},403);if(!kv)return json({error:'Shared storage unavailable.'},503);
 try{if(u.pathname==='/api/sampling'&&request.method==='POST'){
  if(!isCoordinator)return json({error:'Only coordinators can publish a sampling workbook.'},403);
  if(request.headers.get('Origin')!==u.origin)return json({error:'Request origin rejected.'},403);
  if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))return json({error:'JSON required.'},415);
  if(Number(request.headers.get('Content-Length'))>2*1024*1024)return json({error:'Sampling import exceeds 2 MB.'},413);
  const reader=request.body?.getReader();let size=0;const chunks=[];if(!reader)return json({error:'Empty import.'},400);try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>2*1024*1024){await reader.cancel();return json({error:'Sampling import exceeds 2 MB.'},413);}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let off=0;for(const c of chunks){bytes.set(c,off);off+=c.byteLength;}
  let b;try{b=JSON.parse(new TextDecoder().decode(bytes));}catch{return json({error:'Invalid import.'},400);}
  if(!b||Object.keys(b).some(k=>!['file_id','samples','extractions'].includes(k)))return json({error:'Unsupported import fields.'},400);
  if(typeof b.file_id!=='string'||!/^[a-f0-9-]{36}$/.test(b.file_id))return json({error:'Choose an uploaded XLSX workbook.'},400);
  const source=await kv.get('file-meta:'+b.file_id,'json');if(!source||!source.filename.toLowerCase().endsWith('.xlsx'))return json({error:'Upload the source XLSX workbook first.'},400);
  const response=await env.ASSETS.fetch(new URL('/data/network-stations.geojson',u));if(!response.ok)throw Error('Station catalogue unavailable');const stations=await response.json();let data;try{data=validateSampling(b,stations.features);}catch(e){return json({error:e.message},400);}
  const meta={id:b.file_id,file_id:b.file_id,title:source.title,filename:source.filename,updated_at:new Date().toISOString(),updated_by:email,...samplingSummary(data)};
  // One atomic KV value contains both provenance and validated rows. Metadata is a listing index.
  await kv.put('sampling-data:'+b.file_id,JSON.stringify({meta,...data}));await kv.put('sampling-meta:'+b.file_id,JSON.stringify(meta));return json({dataset:meta},201);
 }
 const match=u.pathname.match(/^\/api\/sampling\/([a-f0-9-]{36})$/);if(match&&request.method==='GET'){const dataset=await kv.get('sampling-data:'+match[1],'json');return dataset?json(dataset):json({error:'Workbook not found.'},404);}return json({error:'Not found.'},404);
 }catch{return json({error:'The sampling import could not be completed. Please reload before retrying.'},503);}
}
