import {EmailMessage} from 'cloudflare:email';
import {handle} from './worker.mjs';
import {sendMail} from './mail.mjs';
export default{fetch(request,env){return handle(request,env,fetch,(record,settings,fetcher)=>sendMail(record,settings,fetcher,(from,to,raw)=>new EmailMessage(from,to,raw)));}};
