const test=require('node:test'),assert=require('node:assert/strict'),{collectEnquiry}=require('../assets/js/contact.js');
const valid={name:'Synthetic scientist',email:'test@example.invalid',institution:'TEST',country:'Test',interest:'Scientific collaboration',message:'Synthetic enquiry',consent:true};
test('collects structured direct-intake fields without generating an email draft',()=>{const result=collectEnquiry(valid);assert.equal(result.email,valid.email);assert.equal(result.message,valid.message);assert.equal(result.consent,true);assert.equal(result.website,'');assert.equal(result.subject,undefined);assert.equal(result.body,undefined);});
test('requires contact consent and complete fields',()=>{assert.throws(()=>collectEnquiry({...valid,consent:false}));assert.throws(()=>collectEnquiry({...valid,name:''}));});
test('rejects an invalid email',()=>assert.throws(()=>collectEnquiry({...valid,email:'not-an-email'})));
test('preserves structured text rather than interpolating it into mail headers',()=>assert.equal(collectEnquiry({...valid,institution:'Synthetic\nInstitution'}).institution,'Synthetic\nInstitution'));
