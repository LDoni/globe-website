#!/usr/bin/env python3
"""Single-file navigation preview from rendered pages, with embedded public caches.
No alternate content sources. Scientific downloads are replaced by embedded caches;
external ocean basemap tiles still require internet. Not a production deployment.
"""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
def build(destination):
 pages={}
 for path in (ROOT/'_preview').rglob('*.html'):
    text=path.read_text();body=re.search(r'<body>(.*)</body>',text,re.S).group(1)
    body=re.sub(r'<script\b[^>]*>.*?</script>','',body,flags=re.S);body=re.sub(r'<link\b[^>]*>','',body)
    for image in (ROOT/'assets').rglob('*.svg'):
      import base64
      rel=image.relative_to(ROOT).as_posix();encoded='data:image/svg+xml;base64,'+base64.b64encode(image.read_bytes()).decode()
      body=body.replace('src="../'+rel+'"','src="'+encoded+'"').replace('src="'+rel+'"','src="'+encoded+'"')
    pages[path.relative_to(ROOT/'_preview').as_posix()]=body
 caches={}
 for path in [ROOT/'data/stations.geojson',ROOT/'data/demo/stations.geojson',*list((ROOT/'data/monitoring').glob('*.json')),ROOT/'assets/site-config.json']:
    caches[path.relative_to(ROOT).as_posix()]=json.loads(path.read_text())
 caches['data/stations.csv']=(ROOT/'data/stations.csv').read_text()
 def safe(obj):return json.dumps(obj).replace('</','<\\/')
 styles=(ROOT/'assets/css/styles.css').read_text()+'\n'+(ROOT/'assets/vendor/leaflet/leaflet.css').read_text()
 leaflet=(ROOT/'assets/vendor/leaflet/leaflet.js').read_text().replace('//# sourceMappingURL=leaflet.js.map','')
 scripts={name:(ROOT/'assets/js'/name).read_text().replace("new URL('../../', document.currentScript.src)","new URL('https://globo-preview.invalid/')").replace("new URL('../../',document.currentScript.src)","new URL('https://globo-preview.invalid/')") for name in ['network.js','monitoring.js','site.js','contact.js']}
 runtime='''
const PAGES=__PAGES__, CACHES=__CACHES__, SCRIPTS=__SCRIPTS__;
const nativeFetch=window.fetch.bind(window);
window.fetch=async(input,options)=>{const url=new URL(String(input),'https://globo-preview.invalid/');if(url.hostname==='globo-preview.invalid'){const path=url.pathname.replace(/^\\//,'');if(path in CACHES)return new Response(JSON.stringify(CACHES[path]),{status:200,headers:{'Content-Type':'application/json'}});return new Response('',{status:404});}return nativeFetch(input,options);};
function execute(code){const s=document.createElement('script');s.textContent=code;document.body.append(s);}
function route(){let key=location.hash.slice(1)||'index.html';if(key==='main-content')return;if(!(key in PAGES))key='index.html';document.body.innerHTML=PAGES[key];document.querySelectorAll('a[href]').forEach(a=>{const href=a.getAttribute('href');if(!href||href.startsWith('#')||/^(https?:|mailto:)/.test(href))return;const target=new URL(href,'https://globo-preview.invalid/'+key).pathname.slice(1);if(target in PAGES)a.href='#'+target;else if(target in CACHES){a.href=URL.createObjectURL(new Blob([typeof CACHES[target]==='string'?CACHES[target]:JSON.stringify(CACHES[target],null,2)],{type:target.endsWith('.csv')?'text/csv':'application/json'}));a.download=target.split('/').pop();}else if(target==='data/stations.csv'){a.href=URL.createObjectURL(new Blob(['station_id,station_name,country,latitude,longitude,institution,category,ocean_basin,sampling_status,public_description,institution_url,coordinate_status,publication_status\\n'],{type:'text/csv'}));a.download='stations.csv';}});execute(SCRIPTS['site.js']);if(document.querySelector('[data-join-form]'))execute(SCRIPTS['contact.js']);if(document.querySelector('[data-network]'))execute(SCRIPTS['network.js']);if(document.querySelector('[data-enso-summary]'))execute(SCRIPTS['monitoring.js']);document.title='GLOBO preview | '+key;window.scrollTo(0,0);}
window.addEventListener('hashchange',route);route();
'''.replace('__PAGES__',safe(pages)).replace('__CACHES__',safe(caches)).replace('__SCRIPTS__',safe(scripts))
 content='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GLOBO website preview</title><style>'+styles+'</style></head><body><script>'+leaflet+'</script><script>'+runtime+'</script></body></html>'
 Path(destination).write_text(content);print(f'Standalone preview: {destination} ({len(content)} characters)')
if __name__=='__main__':
 import sys
 build(sys.argv[1] if len(sys.argv)>1 else str(ROOT.parent/'globo-website-preview.html'))
