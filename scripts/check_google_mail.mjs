// Live Google relay checks. Credentials and owner identity stay outside Git.
// Sending is opt-in; without --send-test, no valid notification is submitted.
import {readExternal} from './inspect_partner_cloudflare.mjs';
import {sendGoogleRelay,validRelayUrl,requestGoogleRelay} from '../contact-service/google-relay.mjs';
const secure='/home/ldoni/.config/globo-cloudflare';
const file=process.env.GLOBO_GOOGLE_RELAY_URL_FILE||'/home/ldoni/globo-google-relay-url.txt';
async function response(url,options={}){
 let r=await fetch(url,{...options,redirect:'manual',signal:AbortSignal.timeout(18000)});
 if([302,303].includes(r.status)){let target;try{target=new URL(r.headers.get('Location'));}catch{throw Error('Google response unavailable');}if(target.protocol!=='https:'||target.hostname!=='script.googleusercontent.com'||target.username||target.password)throw Error('Google deployment requires sign-in or has an unexpected redirect; check web-app access settings');r=await fetch(target.href,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(18000)});}
 if(!r.ok)throw Error('Google endpoint returned HTTP '+r.status);try{return await r.json();}catch{throw Error('Google endpoint did not return the expected JSON; check the deployed version');}
}
try{
 const url=(await readExternal(file)).trim();if(!validRelayUrl(url))throw Error('Save only the Google web-app HTTPS deployment URL ending in /exec in the external URL file');
 const secret=(await readExternal(secure+'/google-relay-secret.txt')).trim();if(!/^[a-f0-9]{64}$/.test(secret))throw Error('Local signing key unavailable');
 const report={google_ready:false,unsigned_denied:false,wrong_signature_denied:false,test_email:'not_sent'};
 const ready=await response(url);if(ready.configured!==true||ready.service!=='GLOBO notifications')throw Error('Google relay is not enabled with its private Script Properties');report.google_ready=true;if(ready.version!==2)throw Error('Update the existing Google deployment to relay version 2 for signed, non-sending diagnostics. No further test email sent.');
 const post=body=>response(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 report.unsigned_denied=(await post({})).ok===false;
 report.wrong_signature_denied=(await post({timestamp:Math.floor(Date.now()/1000),payload:'{}',signature:'0'.repeat(64)})).ok===false;
 if(!report.unsigned_denied||!report.wrong_signature_denied)throw Error('Google relay failed authorization checks; sending remains disabled');
 const diagnostic=await requestGoogleRelay({operation:'check'},{GOOGLE_RELAY_URL:url,GOOGLE_RELAY_SECRET:secret});
 if(diagnostic.ok!==true||diagnostic.mail_authorized!==true)throw Error('Google signed diagnostic failed: '+(['SIGNATURE_INVALID','MAIL_AUTHORIZATION_REQUIRED','MAIL_QUOTA_EXHAUSTED','MAIL_PROVIDER_ERROR'].includes(diagnostic.code)?diagnostic.code:'UNCONFIRMED'));
 report.mail_authorized=true;report.quota_available=diagnostic.quota_available===true;
 if(process.argv.includes('--send-test')){
  if(!report.quota_available)throw Error('Google mail quota is exhausted. No test email sent.');
  const owner=JSON.parse(await readExternal(secure+'/join-google-owner.json'));
  if(!/^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(owner.owner||''))throw Error('Test reply address is not configured');
  const record={id:crypto.randomUUID(),name:'GLOBO delivery test',email:owner.owner,institution:'TEST — website email integration',country:'Not applicable — synthetic test',interest:'General enquiry',message:'TEST ONLY: verification of GLOBO website email delivery to the coordination group. This is not a real enquiry or scientific result. Please confirm receipt to the project owner. No confidential material is included.',consent:true,submitted_at:new Date().toISOString(),status:'test'};
  await sendGoogleRelay(record,{GOOGLE_RELAY_URL:url,GOOGLE_RELAY_SECRET:secret});
  report.test_email='provider_accepted_inbox_receipt_requires_member_confirmation';report.reference=record.id;
 }
 console.log(JSON.stringify(report,null,2));
}catch(error){if(error.code==='ENOENT')console.error('Waiting for owner Google authorization and the external /exec deployment URL file. No test email sent.');else console.error(error.message);process.exitCode=2;}
