import {validateRequest} from '../partners-portal/functions/api/[[route]].js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {canonicalStationId} from '../partners-portal/public/station-ids.js';
import {validateSampling,samplingSummary} from '../partners-portal/public/sampling-schema.js';
const registry=JSON.parse(fs.readFileSync(new URL('../data/network-stations.geojson',import.meta.url)));
const {aliases}=JSON.parse(fs.readFileSync(new URL('../data/station-id-aliases.json',import.meta.url)));
test('all station aliases retain the number and resolve to an existing canonical station',()=>{
 const ids=new Set(registry.features.map(f=>f.properties.station_id));
 assert.equal(ids.size,registry.features.length);
 for(const [old,current] of Object.entries(aliases)){
  assert.equal(current,old.replace('GLOBE-','GLOBO-'));
  assert.equal(canonicalStationId(old),current);
  assert.equal(canonicalStationId(current),current);
  assert.ok(ids.has(current));
 }
 assert.ok([...ids].every(id=>/^GLOBO-\d{3}$/.test(id)));
});
test('historical workbook station codes join to canonical stations without changing sample IDs',()=>{
 const [old,current]=Object.entries(aliases)[0];
 const data=validateSampling({samples:[{sample_id:'ORIGINAL-SAMPLE',station_id:old}],extractions:[]},registry.features);
 assert.equal(data.samples[0].station_id,current);
 assert.equal(data.samples[0].sample_id,'ORIGINAL-SAMPLE');
 assert.equal(samplingSummary(data).by_station[0].station_id,current);
 assert.throws(()=>validateSampling({samples:[{sample_id:'S',station_id:'GLOBE-999'}],extractions:[]},registry.features),/Unknown station/);
});

test('historical station update requests retain their canonical station association',()=>{
 const [old,current]=Object.entries(aliases)[0];
 const request=validateRequest({type:'station_update',title:'Synthetic ID compatibility',description:'No coordinate change.',station_ids:[old]},new Set([current]));
 assert.deepEqual(request.station_ids,[current]);
});
