const test=require('node:test');const assert=require('node:assert/strict');
const {buildEnquiry}=require('../assets/js/contact.js');
const valid={name:'Test researcher',email:'test@example.invalid',institution:'TEST INSTITUTION',country:'Test country',interest:'Scientific collaboration',message:'Synthetic test enquiry.',consent:true};
test('builds a draft from the supplied contact fields',()=>{const draft=buildEnquiry(valid);assert.equal(draft.subject,'GLOBE | Join the initiative | TEST INSTITUTION');assert.match(draft.body,/Email: test@example.invalid/);assert.match(draft.body,/Synthetic test enquiry/);});
test('requires explicit consent and complete fields',()=>{assert.throws(()=>buildEnquiry({...valid,consent:false}),/consent/);for(const field of ['name','email','institution','country','interest','message'])assert.throws(()=>buildEnquiry({...valid,[field]:'  '}),/required/);});
test('rejects an invalid email',()=>assert.throws(()=>buildEnquiry({...valid,email:'not-an-email'}),/valid email/));
test('removes line breaks from the email subject',()=>{const result=buildEnquiry({...valid,institution:'TEST\r\nOTHER'});assert.doesNotMatch(result.subject,/[\r\n]/);});
