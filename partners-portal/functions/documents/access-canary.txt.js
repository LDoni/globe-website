// Harmless route for testing authenticated direct document access before any upload.
export function onRequest(){return new Response('GLOBO access test only. This is not a confidential project document.\n',{headers:{'Content-Type':'text/plain; charset=utf-8','Content-Disposition':'attachment; filename="access-canary.txt"'}});}
