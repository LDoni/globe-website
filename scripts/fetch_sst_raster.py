#!/usr/bin/env python3
"""Cache official NOAA raster/legend at the same dates as the validated numeric cache."""
import datetime as dt,hashlib,json,os,struct,tempfile,urllib.parse,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def download(url):
 with urllib.request.urlopen(url,timeout=90) as r:b=r.read()
 if not b.startswith(b'\x89PNG\r\n\x1a\n'):raise ValueError('NOAA did not return a PNG')
 return b

def update():
 cfg=json.loads((ROOT/'config/ocean-products.json').read_text())['noaa'];path=ROOT/'data/monitoring/sst.json';cache=json.loads(path.read_text())
 for frame in cache['frames']:
  date=frame['observation_date'];image=path.parent/f'sst-anomaly-{date}.png';legend=path.parent/f'sst-legend-{date}.png'
  params=dict(service='WMS',version='1.3.0',request='GetMap',crs='CRS:84',bbox='0,-90,360,90',width=1800,height=900,layers=cfg['dataset_id']+':'+cfg['variable'],styles='',format='image/png',transparent='TRUE',bgcolor='0x808080',time=date+'T12:00:00Z')
  url=cfg['erddap']+'/wms/'+cfg['dataset_id']+'/request?'+urllib.parse.urlencode(params)
  retrieved_at=frame.get('raster_retrieved_at')
  if not image.exists() or not legend.exists() or frame.get('raster_numeric_retrieved_at')!=frame.get('retrieved_at'):
   png=download(url);key=download(frame['source_url'].replace('.csv?','.png?')+'&.legend=Only')
   if struct.unpack('>II',png[16:24])!=(1800,900):raise ValueError('Unexpected NOAA raster dimensions')
   # Validate both downloads before replacing either derivative asset.
   for target,content in [(image,png),(legend,key)]:
    fd,name=tempfile.mkstemp(prefix='.raster-',dir=target.parent)
    try:
     with os.fdopen(fd,'wb') as f:f.write(content)
     os.replace(name,target)
    finally:
     if os.path.exists(name):os.unlink(name)
   retrieved_at=dt.datetime.now(dt.timezone.utc).isoformat()
  # Git checkouts change file mtimes; only a real download advances this timestamp.
  frame.update(raster_url='data/monitoring/'+image.name+'?v='+hashlib.sha256(image.read_bytes()).hexdigest()[:12],legend_url='data/monitoring/'+legend.name+'?v='+hashlib.sha256(legend.read_bytes()).hexdigest()[:12],raster_numeric_retrieved_at=frame['retrieved_at'],raster_retrieved_at=retrieved_at,raster_source_url=url,raster_bounds=[[-90,0],[90,360]],raster_display_resolution_deg=.2,raster_method='Official NOAA ERDDAP WMS rendering of the native analysis; 1800 × 900 display pixels, geographic projection')
 fd,name=tempfile.mkstemp(prefix='.cache-',dir=path.parent)
 try:
  with os.fdopen(fd,'w') as f:json.dump(cache,f,indent=2,allow_nan=False);f.write('\n')
  os.replace(name,path)
 finally:
  if os.path.exists(name):os.unlink(name)
 print('NOAA rasters cached for',len(cache['frames']),'dates')
if __name__=='__main__':update()
