// Private runtime configuration; never expose a document URL in public source/config.
export function sharedSheet(env){
 try{if(!env.GLOBO_PARTNER_SHEET_URL)return null;const u=new URL(env.GLOBO_PARTNER_SHEET_URL);if(u.protocol!=='https:'||u.hostname!=='docs.google.com'||u.port||u.username||u.password||!/^\/spreadsheets\/d\/[A-Za-z0-9_-]{10,128}\/edit\/?$/.test(u.pathname))return null;const url='https://docs.google.com'+u.pathname.replace(/\/$/,'');return{url,embed_url:url+'?rm=minimal'};}catch{return null;}
}
