// Shared private files and append-only ticket conversations, using existing KV.
export const MAX_FILE_BYTES=10*1024*1024;
export const MAX_LIBRARY_BYTES=250*1024*1024;
const ID=/^\d{13}-[a-f0-9-]{36}$/;
const FILE_ID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const CATEGORIES=['Protocol','Report','Campaign','Coordination'];
const TYPES={pdf:'application/pdf',txt:'text/plain; charset=utf-8',csv:'text/csv; charset=utf-8',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg'};
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
class InputError extends Error{constructor(message,status=400){super(message);this.status=status;}}
function text(v,max,required=true){if(typeof v!=='string'||v.length>max||(required&&!v.trim())||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))throw new InputError('Please check the text fields.');return v.trim();}
function fields(v,allowed){if(!v||Array.isArray(v)||typeof v!=='object'||Object.keys(v).some(k=>!allowed.includes(k)))throw new InputError('Unsupported fields.');}
let lastTick=0;
function newId(){lastTick=Math.max(Date.now(),lastTick+1);return String(9999999999999-lastTick).padStart(13,'0')+'-'+crypto.randomUUID();}
function cursorValue(v){if(v===null)return undefined;if(typeof v!=='string'||v.length>2048||!v)throw new InputError('Invalid page cursor.');return v;}
async function bytes(request,limit){if(Number(request.headers.get('Content-Length'))>limit)throw new InputError('The file or request is too large.',413);const reader=request.body?.getReader();if(!reader)return new Uint8Array();let count=0;const parts=[];try{for(;;){const {done,value}=await reader.read();if(done)break;count+=value.byteLength;if(count>limit){await reader.cancel();throw new InputError('The file or request is too large.',413);}parts.push(value);}}finally{reader.releaseLock();}const result=new Uint8Array(count);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.byteLength;}return result;}
async function bodyJson(request){if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))throw new InputError('JSON required.',415);try{return JSON.parse(new TextDecoder().decode(await bytes(request,20000)));}catch(e){if(e instanceof InputError)throw e;throw new InputError('Invalid JSON.');}}
async function page(kv,prefix,cursor,limit=50){const result=await kv.list({prefix,limit,...(cursor?{cursor}:{})});return{keys:result.keys.filter(k=>k.name.startsWith(prefix)),cursor:result.list_complete?null:result.cursor||null};}
async function state(kv,id){return await kv.get('ticket-state:'+id,'json')||{status:'open'};}
async function ticketPage(kv,cursor){const p=await page(kv,'ticket:',cursor);const tickets=await Promise.all(p.keys.map(async k=>{const row=await kv.get(k.name,'json');return row?{...row,...await state(kv,row.id)}:null;}));return{tickets:tickets.filter(Boolean),cursor:p.cursor};}
async function files(kv){const result=[];let cursor;do{const p=await page(kv,'file-meta:',cursor,100);const rows=await Promise.all(p.keys.map(k=>kv.get(k.name,'json')));result.push(...rows.filter(Boolean));cursor=p.cursor;if(result.length>200)throw Error('Library listing limit exceeded');}while(cursor);return result.sort((a,b)=>b.created_at.localeCompare(a.created_at));}
export async function collaborationSnapshot(kv){if(!kv)return{files:[],tickets:[],ticket_cursor:null,file_max_bytes:MAX_FILE_BYTES};const [library,tickets]=await Promise.all([files(kv),ticketPage(kv)]);return{files:library,tickets:tickets.tickets,ticket_cursor:tickets.cursor,file_max_bytes:MAX_FILE_BYTES};}
function validateFile(name,content){if(typeof name!=='string'||name.length>180||/[\x00-\x1f\x7f/\\]/.test(name)||name==='.'||name==='..')throw new InputError('Please use a simple filename without folders.');const ext=name.split('.').pop().toLowerCase(),type=TYPES[ext];if(!type)throw new InputError('Supported files: PDF, DOCX, XLSX, CSV, TXT, PNG and JPEG.');if(!content.byteLength||content.byteLength>MAX_FILE_BYTES)throw new InputError('Choose a non-empty file up to 10 MB.',413);const start=new TextDecoder().decode(content.slice(0,8));if(ext==='pdf'&&!start.startsWith('%PDF-'))throw new InputError('This file is not a valid PDF.');if(['docx','xlsx'].includes(ext)&&!(content[0]===80&&content[1]===75&&content[2]===3&&content[3]===4))throw new InputError('This file is not a valid Office document.');if(ext==='png'&&!(content[0]===137&&start.slice(1,4)==='PNG'))throw new InputError('This file is not a valid PNG.');if(['jpg','jpeg'].includes(ext)&&!(content[0]===255&&content[1]===216&&content[2]===255))throw new InputError('This file is not a valid JPEG.');if(['txt','csv'].includes(ext)){try{if(new TextDecoder('utf-8',{fatal:true}).decode(content).includes('\0'))throw Error();}catch{throw new InputError('Text and CSV files must use UTF-8 encoding.');}}return type;}
export async function collaboration(context,{email,isCoordinator}){
 const {request,env}=context,url=new URL(request.url),path=url.pathname,kv=env.GLOBO_WORKSPACE;
 if(!/^\/api\/(tickets|files)(\/|$)/.test(path))return null;
 if(!email)return json({error:'Access denied'},403);
 try{
  if(!kv)throw new InputError('Shared storage is unavailable. Please try again later.',503);
  if(!['GET','HEAD'].includes(request.method)&&request.headers.get('Origin')!==url.origin)throw new InputError('Request origin rejected.',403);
  if(path==='/api/tickets'&&request.method==='GET')return json(await ticketPage(kv,cursorValue(url.searchParams.get('cursor'))));
  if(path==='/api/tickets'&&request.method==='POST'){
   const b=await bodyJson(request);fields(b,['title','description']);const row={id:newId(),title:text(b.title,160),description:text(b.description,6000),created_by:email,created_at:new Date().toISOString()};
   await kv.put('ticket:'+row.id,JSON.stringify(row));return json({ticket:{...row,status:'open'}},201);
  }
  const match=path.match(/^\/api\/tickets\/([^/]+)(?:\/(comments|status))?$/);
  if(match){const [,id,action]=match;if(!ID.test(id))throw new InputError('Ticket not found.',404);const row=await kv.get('ticket:'+id,'json');if(!row)throw new InputError('Ticket not found.',404);
   if(!action&&request.method==='GET'){
    const p=await page(kv,'ticket-comment:'+id+':',cursorValue(url.searchParams.get('cursor')));const comments=(await Promise.all(p.keys.map(k=>kv.get(k.name,'json')))).filter(Boolean).reverse();return json({ticket:{...row,...await state(kv,id)},comments,comment_cursor:p.cursor,can_resolve:isCoordinator||row.created_by===email});
   }
   if(action==='comments'&&request.method==='POST'){
    const b=await bodyJson(request);fields(b,['body']);const comment={id:newId(),body:text(b.body,6000),created_by:email,created_at:new Date().toISOString()};await kv.put('ticket-comment:'+id+':'+comment.id,JSON.stringify(comment));return json({comment},201);
   }
   if(action==='status'&&request.method==='PATCH'){
    if(!isCoordinator&&row.created_by!==email)throw new InputError('Only the ticket author or a coordinator can change its status.',403);
    const b=await bodyJson(request);fields(b,['status']);if(!['open','resolved'].includes(b.status))throw new InputError('Choose Open or Resolved.');const status={status:b.status,updated_by:email,updated_at:new Date().toISOString()};await kv.put('ticket-state:'+id,JSON.stringify(status));return json({ticket:{...row,...status}});
   }
   throw new InputError('Method not allowed.',405);
  }
  if(path==='/api/files'&&request.method==='POST'){
   if(!isCoordinator)throw new InputError('Only coordinators can upload shared files.',403);
   if(!(request.headers.get('Content-Type')||'').startsWith('multipart/form-data'))throw new InputError('Choose a file to upload.',415);
   const raw=await bytes(request,MAX_FILE_BYTES+16384);let form;try{form=await new Request(request.url,{method:'POST',headers:request.headers,body:raw}).formData();}catch{throw new InputError('Invalid file upload.');}
   for(const key of form.keys())if(!['file','title','description','category'].includes(key)||form.getAll(key).length!==1)throw new InputError('Unsupported upload fields.');
   const file=form.get('file');if(!file||typeof file.arrayBuffer!=='function')throw new InputError('Choose a file to upload.');
   const content=new Uint8Array(await file.arrayBuffer()),type=validateFile(file.name,content),category=form.get('category')||'Coordination';if(!CATEGORIES.includes(category))throw new InputError('Choose a file category.');
   const library=await files(kv);if(library.length>=200||library.reduce((n,f)=>n+f.size,0)+content.byteLength>MAX_LIBRARY_BYTES)throw new InputError('The shared library has reached its storage limit. Contact a coordinator.',409);
   const row={id:crypto.randomUUID(),filename:file.name,title:text(form.get('title')||file.name,160),description:text(form.get('description')||'',1000,false),category,type,size:content.byteLength,created_by:email,created_at:new Date().toISOString()};
   await kv.put('file-content:'+row.id,content);await kv.put('file-meta:'+row.id,JSON.stringify(row));return json({file:row},201);
  }
  const download=path.match(/^\/api\/files\/([^/]+)$/);
  if(download&&['GET','HEAD'].includes(request.method)){
   if(!FILE_ID.test(download[1]))throw new InputError('File not found.',404);const row=await kv.get('file-meta:'+download[1],'json');if(!row)throw new InputError('File not found.',404);
   const content=request.method==='HEAD'?null:await kv.get('file-content:'+row.id,'arrayBuffer');if(request.method==='GET'&&(!content||content.byteLength!==row.size))throw new InputError('The file is temporarily unavailable. Please try again.',503);
   const fallback=row.filename.replace(/[^A-Za-z0-9._-]/g,'_');return new Response(content,{headers:{'Content-Type':row.type,'Content-Length':String(row.size),'Content-Disposition':`attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(row.filename).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16))}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }
  throw new InputError('Not found.',404);
 }catch(e){return json({error:e instanceof InputError?e.message:'The workspace could not complete this operation. Please reload before retrying.'},e instanceof InputError?e.status:503);}
}
