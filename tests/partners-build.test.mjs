import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
async function fixture(){const temp=await fs.mkdtemp(path.join(os.tmpdir(),'globe-private-test-')),source=path.join(temp,'source'),output=path.join(temp,'output');await fs.mkdir(source);await fs.writeFile(path.join(source,'protocol.txt'),'Synthetic protocol.');return{temp,source,output};}
const entry={title:'Synthetic procedure',description:'Test-only content',category:'Protocol',updated:'2026-11-21',file:'protocol.txt'};
function build(f){return spawnSync(process.execPath,['scripts/build_partner_portal.mjs'],{cwd:root,env:{...process.env,GLOBE_PRIVATE_CONTENT_DIR:f.source,GLOBE_PARTNER_BUILD_DIR:f.output},encoding:'utf8'});}
test('private build copies only manifest-approved documents into a separate artifact',async()=>{
 const f=await fixture();await fs.writeFile(path.join(f.source,'internal-notes.txt'),'Must not be copied.');await fs.writeFile(path.join(f.source,'resources.json'),JSON.stringify([entry]));
 const result=build(f);assert.equal(result.status,0,result.stderr);const manifest=JSON.parse(await fs.readFile(path.join(f.output,'resources.json'),'utf8'));assert.equal(manifest[0].path,'/documents/protocol.txt');assert.deepEqual(await fs.readdir(path.join(f.output,'documents')),['protocol.txt']);assert.notEqual(build(f).status,0,'Refuse to silently reuse document-bearing output');
});
test('private build rejects a symlink that escapes the source and executable resources',async()=>{
 for(const mode of ['escape','extension']){const f=await fixture();await fs.writeFile(path.join(f.temp,'outside.txt'),'Unapproved');await fs.symlink(path.join(f.temp,'outside.txt'),path.join(f.source,'escape.txt'));await fs.writeFile(path.join(f.source,'page.html'),'<script>unsafe</script>');await fs.writeFile(path.join(f.source,'resources.json'),JSON.stringify([{...entry,file:mode==='escape'?'escape.txt':'page.html'}]));assert.notEqual(build(f).status,0);}
});
