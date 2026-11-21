// Build a separate, Access-protected artifact. Never part of the public Quarto site.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const portal=path.join(root,'partners-portal'),target=path.join(portal,'.build');
const output=process.env.GLOBE_PARTNER_BUILD_DIR?path.resolve(process.env.GLOBE_PARTNER_BUILD_DIR):target;
await fs.mkdir(output,{recursive:true});
// Refuse to reuse a document-bearing artifact: stale private files must not survive a rebuild.
try{const old=await fs.readdir(path.join(output,'documents'));if(old.length)throw Error('Build output already contains documents. Choose a new GLOBE_PARTNER_BUILD_DIR for a fresh build.');}catch(e){if(e.code!=='ENOENT')throw e;}
if(output!==target){try{if((await fs.readdir(output)).length)throw Error('Choose an empty build directory');}catch(e){if(e.code!=='ENOENT')throw e;}}
await fs.mkdir(output,{recursive:true});await fs.cp(path.join(portal,'public'),output,{recursive:true});
await fs.mkdir(path.join(output,'data'),{recursive:true});await fs.copyFile(path.join(root,'data/network-stations.geojson'),path.join(output,'data/network-stations.geojson'));
const resources=[];
if(process.env.GLOBE_PRIVATE_CONTENT_DIR){
 const source=await fs.realpath(process.env.GLOBE_PRIVATE_CONTENT_DIR);
 if(source===root||source.startsWith(root+path.sep))throw Error('Private documents must live outside the public repository');
 const manifest=JSON.parse(await fs.readFile(path.join(source,'resources.json'),'utf8'));
 if(!Array.isArray(manifest))throw Error('Resource manifest must be an array');
 const seen=new Set();await fs.mkdir(path.join(output,'documents'),{recursive:true});
 for(const row of manifest){
  if(!row||!['Protocol','Campaign','Report','Coordination'].includes(row.category)||typeof row.title!=='string'||!row.title.trim()||row.title.length>200||typeof row.description!=='string'||row.description.length>2000||!/^\d{4}-\d{2}-\d{2}$/.test(row.updated)||typeof row.file!=='string')throw Error('Invalid resource metadata');
  const file=await fs.realpath(path.resolve(source,row.file));if(!file.startsWith(source+path.sep))throw Error('Resource path escapes private content directory');
  const name=path.basename(file);if(!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,120}\.(pdf|txt|csv|xlsx|docx|png|jpg|json)$/i.test(name)||seen.has(name))throw Error('Unsupported or duplicate resource file');
  if(!(await fs.stat(file)).isFile())throw Error('Resource must be a file');
  seen.add(name);await fs.copyFile(file,path.join(output,'documents',name));resources.push({title:row.title,description:row.description,category:row.category,updated:row.updated,path:'/documents/'+name});
 }
}
await fs.writeFile(path.join(output,'resources.json'),JSON.stringify(resources,null,2)+'\n');
console.log('Separate partner artifact:',output,'· resources:',resources.length,'· public station catalogue copied; no scientific approvals changed');
