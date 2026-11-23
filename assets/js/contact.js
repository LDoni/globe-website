'use strict';
(() => {
 function buildEnquiry(values){
  const fields=['name','email','institution','country','interest','message'];
  const x=Object.fromEntries(fields.map(k=>[k,String(values[k]||'').trim()]));
  if(fields.some(k=>!x[k])||values.consent!==true)throw new Error('Complete the required fields and contact consent.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email))throw new Error('Enter a valid email address.');
  return {subject:'GLOBE | Join the initiative | '+x.institution.replace(/[\r\n]/g,' '),body:`Name: ${x.name}\nEmail: ${x.email}\nInstitution: ${x.institution}\nCountry: ${x.country}\nProposed contribution: ${x.interest}\n\n${x.message}`};
 }
 if(typeof module==='object'&&module.exports){module.exports={buildEnquiry};return;}
 const ROOT=new URL('../../',document.currentScript.src);
 async function config(){const r=await fetch(new URL('assets/site-config.json',ROOT),{cache:'no-cache'});if(!r.ok)throw new Error('Contact settings unavailable');return r.json();}
 document.querySelectorAll('[data-join-form]').forEach(async form=>{
  const status=form.querySelector('[data-join-status]'),draft=form.querySelector('[data-join-draft]'),text=form.querySelector('[data-join-text]'),mail=form.querySelector('[data-join-mail]');
  let recipient=null;
  try{const settings=await config();if(typeof settings.contact_email==='string'&&/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(settings.contact_email))recipient=settings.contact_email;}catch(e){/* Keep the no-delivery state visible. */}
  if(recipient)status.textContent='';
  function clearDraft(){draft.hidden=true;mail.hidden=true;mail.removeAttribute('href');text.textContent='';}
  form.addEventListener('input',clearDraft);
  form.addEventListener('submit',event=>{
   event.preventDefault();if(!form.reportValidity())return;
   try{
    const values=Object.fromEntries(new FormData(form));values.consent=form.elements.consent.checked;
    const enquiry=buildEnquiry(values);text.textContent=enquiry.body;draft.hidden=false;
    if(recipient){mail.href='mailto:'+recipient+'?subject='+encodeURIComponent(enquiry.subject)+'&body='+encodeURIComponent(enquiry.body);mail.hidden=false;status.textContent='Email draft prepared. Select “Open email draft”, then send it from your email application. No message has been sent by this website.';}
    else{mail.hidden=true;status.textContent='Your enquiry is ready to preview. Delivery is not enabled yet; no message has been sent.';}
   }catch(error){clearDraft();status.textContent=error.message;}
  });
  // Native form submission must remain unavailable when JavaScript/settings fail.
  form.querySelector('button[type="submit"]').disabled=false;
 });
})();
