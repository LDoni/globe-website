// This handler is reached only after the origin JWT middleware.
import {collaboration,collaborationSnapshot} from '../../lib/collaboration.js';
import {samplingApi,samplingCatalogue} from '../../lib/sampling.js';
import {sharedSheet} from '../../lib/shared-sheet.js';
function json(value,status=200){return Response.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
function coordinators(env){try{const v=JSON.parse(env.GLOBE_COORDINATOR_EMAILS||'[]');return Array.isArray(v)?v.filter(e=>typeof e==='string').map(e=>e.trim().toLowerCase()):[];}catch{return [];}}
function text(v,max,required=true){if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw Error('Invalid text field');return v.trim();}
async function asset(context,path){const response=await context.env.ASSETS.fetch(new URL(path,context.request.url));if(!response.ok)throw Error('Workspace catalogue unavailable');return response.json();}
function validDate(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;}
export function validateRequest(body,stationIds){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Invalid request');
 const allowed=['type','title','description','station_ids','start_date','end_date','latitude','longitude'];
 if(Object.keys(body).some(k=>!allowed.includes(k)))throw Error('Unsupported request field');
 if(!['campaign','station_update'].includes(body.type))throw Error('Choose a request type');
 const result={type:body.type,title:text(body.title,160),description:text(body.description,6000)};
 if(!Array.isArray(body.station_ids)||body.station_ids.length>100||body.station_ids.some(id=>typeof id!=='string'||!stationIds.has(id)))throw Error('Choose valid stations');
 result.station_ids=[...new Set(body.station_ids)];
 if(body.type==='station_update'&&result.station_ids.length!==1)throw Error('Select one station');
 if(body.type==='campaign'){
  if(!validDate(body.start_date)||!validDate(body.end_date)||body.end_date<body.start_date)throw Error('Choose a valid campaign date range');
  result.start_date=body.start_date;result.end_date=body.end_date;
 }else if(body.latitude!==undefined||body.longitude!==undefined){
  if(!Number.isFinite(body.latitude)||!Number.isFinite(body.longitude)||Math.abs(body.latitude)>90||Math.abs(body.longitude)>180)throw Error('Coordinates must be valid decimal degrees');
  result.latitude=body.latitude;result.longitude=body.longitude;
 }
 return result;
}
export async function onRequest(context){
 const {request,env,data}=context;
 if(!data?.partner?.email)return json({error:'Access denied'},403);
 const email=data.partner.email,isCoordinator=coordinators(env).includes(email),url=new URL(request.url),path=url.pathname;
 try{
  const shared=await collaboration(context,{email,isCoordinator});if(shared)return shared;
  const sampling=await samplingApi(context,{email,isCoordinator});if(sampling)return sampling;
  if(request.method==='GET'&&path==='/api/workspace'){
   const [resources,stations]=await Promise.all([asset(context,'/resources.json'),asset(context,'/data/network-stations.geojson')]);
   const requests=[];let cursor;
   if(env.GLOBE_WORKSPACE){do{const page=await env.GLOBE_WORKSPACE.list({prefix:'request:',...(cursor?{cursor}:{})});for(const key of page.keys){const row=await env.GLOBE_WORKSPACE.get(key.name,'json');if(row&&(row.created_by===email||isCoordinator))requests.push(row);}cursor=page.list_complete?null:page.cursor;}while(cursor);}
   return json({user:{email,role:isCoordinator?'coordinator':'partner'},resources,stations:stations.features,requests:requests.sort((a,b)=>b.created_at.localeCompare(a.created_at)),submissions_available:Boolean(env.GLOBE_WORKSPACE),...await collaborationSnapshot(env.GLOBE_WORKSPACE),datasets:await samplingCatalogue(env.GLOBE_WORKSPACE),shared_sheet:sharedSheet(env)});
  }
  if(path==='/api/requests'||/^\/api\/requests\/[a-f0-9-]{36}$/.test(path)){
   if(!['POST','PATCH'].includes(request.method))return json({error:'Method not allowed'},405);
   if(request.headers.get('Origin')!==url.origin)return json({error:'Request origin rejected'},403);
   if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))return json({error:'JSON required'},415);
   if(Number(request.headers.get('Content-Length'))>20000)return json({error:'Request too large'},413);
   const raw=await request.text();if(new TextEncoder().encode(raw).length>20000)return json({error:'Request too large'},413);
   let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid JSON'},400);}
   if(!env.GLOBE_WORKSPACE)return json({error:'Submissions are unavailable. Your request has not been saved.'},503);
   if(request.method==='POST'&&path==='/api/requests'){
    const stations=await asset(context,'/data/network-stations.geojson');let fields;
    try{fields=validateRequest(body,new Set(stations.features.map(f=>f.properties.station_id)));}catch(e){return json({error:e.message},400);}
    const row={...fields,id:crypto.randomUUID(),created_by:email,created_at:new Date().toISOString(),status:'submitted'};
    await env.GLOBE_WORKSPACE.put('request:'+row.id,JSON.stringify(row));return json({request:row},201);
   }
   if(request.method==='PATCH'&&path!=='/api/requests'){
    if(!isCoordinator)return json({error:'Coordinator access required'},403);
    if(!body||Object.keys(body).some(k=>!['status','review_note'].includes(k))||!['reviewed','declined'].includes(body.status))return json({error:'Invalid review'},400);
    const row=await env.GLOBE_WORKSPACE.get('request:'+path.split('/').pop(),'json');if(!row)return json({error:'Request not found'},404);
    if(row.status!=='submitted')return json({error:'Request already reviewed'},409);
    let note;try{note=text(body.review_note||'',2000,false);}catch{return json({error:'Review note is too long'},400);}
    Object.assign(row,{status:body.status,review_note:note,reviewed_by:email,reviewed_at:new Date().toISOString()});
    await env.GLOBE_WORKSPACE.put('request:'+row.id,JSON.stringify(row));return json({request:row});
   }
   return json({error:'Method not allowed'},405);
  }
  return json({error:'Not found'},404);
 }catch{return json({error:'Workspace service unavailable. No successful save is confirmed.'},503);}
}
