#!/usr/bin/env python3
"""Official public C3S/ECMWF ERA5 daily Niño-region data; no account required."""
import csv,datetime as dt,io,json,math,os,tempfile,urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE='https://sites.ecmwf.int/data/climatepulse/timeseries/csv/daily/'
REGIONS={'nino34':'Niño 3.4','nino3':'Niño 3','nino4':'Niño 4','nino12':'Niño 1+2'}
def parse(text):
 metadata='\n'.join(line for line in text.splitlines() if line.startswith('#'))
 if '# Units: degC' not in metadata or '# Reference period: 1991-2020' not in metadata:raise ValueError('ERA5 units or baseline changed')
 reader=csv.DictReader(io.StringIO('\n'.join(line for line in text.splitlines() if not line.startswith('#'))))
 required={'date','sst','clim_1991_2020','anom_1991_2020','status'}
 if not required<=set(reader.fieldnames or []):raise ValueError('Unexpected ERA5 CSV schema')
 rows=[];last=''
 for row in reader:
  day=dt.date.fromisoformat(row['date'])
  if day>dt.datetime.now(dt.timezone.utc).date() or row['date']<=last:raise ValueError('Future, duplicate or unordered ERA5 date')
  values=[]
  for key in ['sst','clim_1991_2020','anom_1991_2020']:
   value=float(row[key]) if row[key].strip() else float('nan');values.append(value if math.isfinite(value) else None)
  temperature,climatology,anomaly=values
  if any(v is not None and not -3<=v<=45 for v in [temperature,climatology]) or anomaly is not None and not -15<=anomaly<=15:raise ValueError('Unexpected ERA5 temperature range')
  if all(v is not None for v in values) and abs(temperature-climatology-anomaly)>.0003:raise ValueError('ERA5 anomaly does not match supplied climatology')
  if row['status'] not in ['FINAL','PRELIMINARY']:raise ValueError('Unknown ERA5 quality status')
  rows.append([row['date'],*values,row['status']]);last=row['date']
 if not rows or not any(r[1] is not None for r in rows):raise ValueError('Empty ERA5 observations')
 return metadata,rows

def retrieve(region):
 url=BASE+f'timeseries_era5_sst_daily_{region}.csv'
 with urllib.request.urlopen(url,timeout=90) as response:text=response.read().decode()
 metadata,records=parse(text)
 return region,{'source':'Copernicus Climate Change Service / ECMWF','product':'ERA5','region':REGIONS[region],'units':'degree_C','baseline':'1991–2020','source_url':url,'product_doi':'https://doi.org/10.24381/cds.adbb2d47','retrieved_at':dt.datetime.now(dt.timezone.utc).isoformat(),'provider_notes':metadata,'columns':['date','sst_c','climatology_c','anomaly_c','status'],'records':records}

def update():
 # Validate every regional response before replacing any previous cache.
 with ThreadPoolExecutor(max_workers=4) as executor:results=list(executor.map(retrieve,REGIONS))
 directory=ROOT/'data/monitoring/pulse';directory.mkdir(parents=True,exist_ok=True)
 for region,cache in results:
  fd,name=tempfile.mkstemp(prefix='.era5-',dir=directory)
  try:
   with os.fdopen(fd,'w') as f:json.dump(cache,f,separators=(',',':'),allow_nan=False);f.write('\n')
   os.replace(name,directory/(region+'.json'))
  finally:
   if os.path.exists(name):os.unlink(name)
  print(REGIONS[region],len(cache['records']),'dates; latest',cache['records'][-1][0])
if __name__=='__main__':update()
