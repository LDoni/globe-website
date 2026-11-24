// Execute as the owner. Store the shared secret in Script Properties, never here.
function reply_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function configured_() { const p=PropertiesService.getScriptProperties(); return p.getProperty('GLOBO_ENABLED')==='true' && /^[a-f0-9]{64}$/.test(p.getProperty('GLOBO_RELAY_SECRET')||''); }
function doGet() { return reply_({configured:configured_(),service:'GLOBO notifications',version:2}); }
// Run once in the editor if Google needs the owner's send-email consent. Sends nothing.
function authorizeMail() { const quota=MailApp.getRemainingDailyQuota();console.log('Send-email authorization available; remaining quota positive: '+(quota>0)); }
function doPost(e) {
  let lock,verified=false,stage='request';
  try {
    if(!configured_())return reply_({ok:false,code:'SERVICE_DISABLED'});
    const raw=e&&e.postData&&e.postData.contents;
    if(typeof raw!=='string'||raw.length>24000)return reply_({ok:false,code:'INVALID_REQUEST'});
    const request=JSON.parse(raw),timestamp=Number(request.timestamp);
    if(!Number.isInteger(timestamp)||Math.abs(Date.now()/1000-timestamp)>300)return reply_({ok:false,code:'TIMESTAMP_INVALID'});
    if(typeof request.payload!=='string'||request.payload.length>16000||!/^[a-f0-9]{64}$/.test(request.signature||''))return reply_({ok:false,code:'INVALID_REQUEST'});
    const secret=PropertiesService.getScriptProperties().getProperty('GLOBO_RELAY_SECRET');
    const expected=Utilities.computeHmacSha256Signature(String(timestamp)+'\n'+request.payload,secret,Utilities.Charset.UTF_8).map(function(b){return((b+256)%256).toString(16).padStart(2,'0');}).join('');
    let difference=0;for(let i=0;i<64;i++)difference|=expected.charCodeAt(i)^request.signature.charCodeAt(i);
    if(difference)return reply_({ok:false,code:'SIGNATURE_INVALID'});
    verified=true;
    const entry=JSON.parse(request.payload);
    if(entry&&entry.operation==='check'&&Object.keys(entry).length===1){stage='quota';const quota=MailApp.getRemainingDailyQuota();return reply_({ok:true,operation:'check',mail_authorized:true,quota_available:quota>0});}
    if(!entry||typeof entry!=='object'||Array.isArray(entry)||Object.keys(entry).some(function(k){return!['id','name','email','institution','country','interest','message','consent','submitted_at','status'].includes(k);})||!/^[a-f0-9-]{36}$/.test(entry.id||''))return reply_({ok:false,code:'INVALID_ENQUIRY'});
    for(const pair of [['name',120],['email',254],['institution',200],['country',100],['interest',100],['message',4000]])if(typeof entry[pair[0]]!=='string'||!entry[pair[0]].trim()||entry[pair[0]].length>pair[1])return reply_({ok:false,code:'INVALID_ENQUIRY'});
    if(!/^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(entry.email)||entry.consent!==true)return reply_({ok:false,code:'INVALID_ENQUIRY'});
    stage='lock';lock=LockService.getScriptLock();if(!lock.tryLock(1000))return reply_({ok:false,code:'BUSY'});
    const cache=CacheService.getScriptCache();if(cache.get(entry.id)==='accepted')return reply_({ok:true,id:entry.id});
    stage='quota';if(MailApp.getRemainingDailyQuota()<1)return reply_({ok:false,code:'MAIL_QUOTA_EXHAUSTED'});
    stage='send';
    // Fixed recipient: callers cannot select a destination or sender.
    MailApp.sendEmail({to:'globo-initiative@googlegroups.com',replyTo:entry.email,name:'GLOBO coordination',subject:'GLOBO enquiry: '+entry.institution.replace(/[\r\n]/g,' ').slice(0,80),body:'Reference: '+entry.id+'\nName: '+entry.name+'\nEmail: '+entry.email+'\nInstitution: '+entry.institution+'\nCountry: '+entry.country+'\nContribution: '+entry.interest+'\n\n'+entry.message});
    try{cache.put(entry.id,'accepted',600);}catch(error){/* Provider acceptance is independent of the best-effort replay cache. */}
    return reply_({ok:true,id:entry.id});
  }catch(error){
    let code='INVALID_REQUEST';if(verified){const description=String(error&&error.message||'').toLowerCase();code=/authoriz|permission|autorizz/.test(description)?'MAIL_AUTHORIZATION_REQUIRED':/quota|limit/.test(description)?'MAIL_QUOTA_EXHAUSTED':stage==='quota'||stage==='send'?'MAIL_PROVIDER_ERROR':'RELAY_ERROR';}
    return reply_({ok:false,code:code});
  }finally{if(lock)try{lock.releaseLock();}catch(error){}}
}
