#!/usr/bin/env python3
"""Small global NOAA SST anomaly cache. Standard library; last cache survives failure."""
import csv,datetime as dt,io,json,math,os,tempfile,urllib.parse,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def atomic_json(value,path):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    fd,name=tempfile.mkstemp(prefix='.cache-',dir=path.parent)
    try:
        with os.fdopen(fd,'w') as f:json.dump(value,f,indent=2,allow_nan=False);f.write('\n')
        os.replace(name,path)
    finally:
        if os.path.exists(name):os.unlink(name)
def fetch(url):
    with urllib.request.urlopen(url,timeout=90) as response:return response.read().decode('utf-8')
def parse_csv(text):
    rows=csv.reader(io.StringIO(text));header=next(rows);units=next(rows)
    if header!=['time','latitude','longitude','sea_surface_temperature_anomaly'] or units[-1]!='degree_C':raise ValueError('Unexpected NOAA columns or units')
    cells=[];times=set()
    for row in rows:
        if len(row)!=4:raise ValueError('Malformed NOAA row')
        timestamp,lat,lon,value=row;times.add(timestamp)
        lat,lon,value=map(float,(lat,lon,value))
        if not math.isfinite(lat) or not math.isfinite(lon) or not -90<=lat<=90 or not 0<=lon<360:raise ValueError('Invalid grid coordinate')
        if not math.isfinite(value):continue
        if not -15<=value<=15:raise ValueError('Unexpected SST anomaly range')
        cells.append({'lat':lat,'lon':lon if lon<=180 else lon-360,'value':value})
    if len(times)!=1 or not cells:raise ValueError('SST response must contain one date and nonempty ocean cells')
    observed=next(iter(times)).split('T')[0]
    if dt.date.fromisoformat(observed)>dt.datetime.now(dt.timezone.utc).date():raise ValueError('Future observation')
    return observed,cells

def update(observation_date=None):
    cfg=json.loads((ROOT/'config/ocean-products.json').read_text())['noaa'];base=cfg['erddap'];dataset=cfg['dataset_id']
    meta=json.loads(fetch(f'{base}/info/{dataset}/index.json'))['table'];columns=meta['columnNames'];data=[dict(zip(columns,row)) for row in meta['rows']]
    attrs={(r['Variable Name'],r['Attribute Name']):r['Value'] for r in data if r['Row Type']=='attribute'}
    if attrs.get((cfg['variable'],'units'))!='degree_C':raise ValueError('Upstream units changed')
    if attrs.get(('NC_GLOBAL','product_version'))!='3.1':raise ValueError('Product changed; baseline review required')
    observed=attrs[('NC_GLOBAL','time_coverage_end')];stamp=observed.split('T')[0]
    if dt.date.fromisoformat(stamp)>dt.datetime.now(dt.timezone.utc).date():raise ValueError('Future metadata timestamp')
    if observation_date:
        requested=dt.date.fromisoformat(observation_date)
        if not dt.date.fromisoformat(attrs[('NC_GLOBAL','time_coverage_start')].split('T')[0])<=requested<=dt.date.fromisoformat(stamp):raise ValueError('Requested date outside official coverage')
        observed=observation_date+'T'+observed.split('T')[1]
    # Index stride follows native array order (north to south, 0–360 east).
    query=f"{cfg['variable']}[({observed}):1:({observed})][0:{cfg['stride']}:3599][0:{cfg['stride']}:7199]"
    url=f'{base}/griddap/{dataset}.csv?'+urllib.parse.quote(query,safe='[]():,')
    expected=observed.split('T')[0];observed,cells=parse_csv(fetch(url))
    if observed!=expected:raise ValueError('Returned NOAA date differs from requested date')
    frame={'observation_date':observed,'source':'NOAA Coral Reef Watch','source_url':url,'metadata_url':f'{base}/info/{dataset}/index.html','product_id':dataset,'product_version':'3.1','units':'degree_C','baseline':cfg['baseline'],'baseline_url':cfg['baseline_url'],'retrieved_at':dt.datetime.now(dt.timezone.utc).isoformat(),'native_resolution_deg':cfg['native_resolution_deg'],'grid_spacing_deg':cfg['native_resolution_deg']*cfg['stride'],'method':'Native grid subsampling; no spatial averaging. Broad ocean context only.','cells':cells}
    path=ROOT/'data/monitoring/sst.json';previous=json.loads(path.read_text()) if path.exists() else {'frames':[]}
    frames={f['observation_date']:f for f in previous.get('frames',[])};frames[observed]=frame
    cache={'status':'available','frames':[frames[d] for d in sorted(frames,reverse=True)[:cfg['retain_frames']]]}
    atomic_json(cache,path);print(f'NOAA SST cache updated: {observed}; {len(cells)} cells')
if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--date',help='Optional YYYY-MM-DD within official product coverage');args=parser.parse_args();update(args.date)
