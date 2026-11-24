import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest,validateRequest} from '../partners-portal/functions/api/[[route]].js';
const stations={features:[{properties:{station_id:'GLOBO-001',station_name:'Synthetic station',country:'Test'}}]};
function setup(){const rows=new Map();return {GLOBO_COORDINATOR_EMAILS:'["coordinator@example.invalid"]',GLOBO_WORKSPACE:{async list(){return{keys:[...rows.keys()].map(name=>({name})),list_complete:true};},async get(key){return rows.has(key)?JSON.parse(rows.get(key)):null;},async put(key,value){rows.set(key,value);}},ASSETS:{async fetch(url){return Response.json(new URL(url).pathname==='/resources.json'?[]:stations);}}};}
function context(env,path='/api/workspace',method='GET',body,email='partner@example.invalid',origin='https://workspace.invalid'){
 return{env,data:{partner:{email}},request:new Request('https://workspace.invalid'+path,{method,headers:{'Content-Type':'application/json',Origin:origin},...(body?{body:JSON.stringify(body)}:{})})};
}
const proposal={type:'campaign',title:'Synthetic ENSO campaign',description:'Coordinated microbiome sampling.',station_ids:['GLOBO-001'],start_date:'2027-01-01',end_date:'2027-02-01'};
test('missing verified identity cannot read or mutate the workspace',async()=>{const c=context(setup());c.data={};assert.equal((await onRequest(c)).status,403);});
test('saved proposals persist across calls and are private to their author and coordinators',async()=>{
 const env=setup(),created=await onRequest(context(env,'/api/requests','POST',proposal));assert.equal(created.status,201);const {request:saved}=await created.json();assert.equal(saved.created_by,'partner@example.invalid');assert.equal(saved.status,'submitted');
 const own=await(await onRequest(context(env))).json();assert.equal(own.requests.length,1);assert.equal(own.requests[0].id,saved.id);
 const outsider=await(await onRequest(context(env,'/api/workspace','GET',null,'other@example.invalid'))).json();assert.equal(outsider.requests.length,0);
 const coordinator=await(await onRequest(context(env,'/api/workspace','GET',null,'coordinator@example.invalid'))).json();assert.equal(coordinator.requests.length,1);assert.equal(coordinator.user.role,'coordinator');
});
test('only coordinators review requests and review does not mutate station data',async()=>{
 const env=setup(),saved=(await(await onRequest(context(env,'/api/requests','POST',proposal))).json()).request;
 const path='/api/requests/'+saved.id,review={status:'reviewed',review_note:'Synthetic coordination review'};
 assert.equal((await onRequest(context(env,path,'PATCH',review))).status,403);
 const response=await onRequest(context(env,path,'PATCH',review,'coordinator@example.invalid'));assert.equal(response.status,200);assert.equal((await response.json()).request.status,'reviewed');
 assert.equal((await onRequest(context(env,path,'PATCH',review,'coordinator@example.invalid'))).status,409);assert.equal(stations.features[0].properties.station_id,'GLOBO-001');
});
test('cross-origin writes, forged ownership and invalid fields are rejected',async()=>{
 const env=setup();assert.equal((await onRequest(context(env,'/api/requests','POST',proposal,undefined,'https://outsider.invalid'))).status,403);
 for(const body of [{...proposal,created_by:'coordinator@example.invalid'},{...proposal,end_date:'2026-01-01'},{...proposal,station_ids:['NOT-IN-NETWORK']},{...proposal,status:'reviewed'}])assert.equal((await onRequest(context(env,'/api/requests','POST',body))).status,400);
});
test('station requests require one known station and a valid coordinate pair',()=>{
 const body={type:'station_update',title:'Location review',description:'Synthetic correction',station_ids:['GLOBO-001'],latitude:1,longitude:179.5};
 assert.equal(validateRequest(body,new Set(['GLOBO-001'])).longitude,179.5);
 for(const bad of [{...body,station_ids:[]},{...body,latitude:91},{...body,longitude:null}])assert.throws(()=>validateRequest(bad,new Set(['GLOBO-001'])));
});
test('missing or failing persistence never confirms a successful save',async()=>{
 const env=setup();delete env.GLOBO_WORKSPACE;assert.equal((await onRequest(context(env,'/api/requests','POST',proposal))).status,503);
 assert.equal((await(await onRequest(context(env))).json()).submissions_available,false);
 env.GLOBO_WORKSPACE={put:async()=>{throw Error('Synthetic storage failure');}};assert.equal((await onRequest(context(env,'/api/requests','POST',proposal))).status,503);
});
