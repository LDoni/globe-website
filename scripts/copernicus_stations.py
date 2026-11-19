#!/usr/bin/env python3
"""Extract only reviewed station-grid mappings with the official Marine Toolbox.
Optional dependency group: requirements-copernicus.txt. No per-session downloads.
"""
import argparse,csv,datetime as dt,json,math,os,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def distance_km(lat1,lon1,lat2,lon2):
    p1,p2=map(math.radians,(lat1,lat2));a=math.sin((p2-p1)/2)**2+math.cos(p1)*math.cos(p2)*math.sin(math.radians(lon2-lon1)/2)**2
    return 6371*2*math.asin(min(1,math.sqrt(a)))
def run(start,end):
    import copernicusmarine
    import numpy as np
    import xarray as xr
    if not os.environ.get('COPERNICUSMARINE_SERVICE_USERNAME') or not os.environ.get('COPERNICUSMARINE_SERVICE_PASSWORD'):raise ValueError('Copernicus credentials required in environment')
    if not 0<=(end-start).days<=30 or end>dt.datetime.now(dt.timezone.utc).date():raise ValueError('Use a past interval no longer than 31 days')
    cfg=json.loads((ROOT/'config/ocean-products.json').read_text())['copernicus']
    features=json.loads((ROOT/'data/stations.geojson').read_text())['features'];stations={f['properties']['station_id']:f for f in features}
    mappings=list(csv.DictReader((ROOT/'config/station-grid-mappings.csv').open()));mappings=[m for m in mappings if m['approved'].lower()=='true']
    if not mappings:raise ValueError('No reviewed grid mappings; existing cache preserved')
    if len({m['station_id'] for m in mappings})!=len(mappings):raise ValueError('Duplicate grid mappings')
    records=[]
    with tempfile.TemporaryDirectory() as directory:
        for i,m in enumerate(mappings):
            if not m['reviewed_by'] or not m['review_date'] or m['station_id'] not in stations:raise ValueError('Unreviewed or unknown station mapping')
            f=stations[m['station_id']]
            if f['properties']['publication_status']!='approved' or f['properties']['coordinate_status']!='verified':raise ValueError('Station not approved')
            lon,lat=f['geometry']['coordinates'];glat,glon=float(m['grid_latitude']),float(m['grid_longitude'])
            if not -90<=glat<=90 or not -180<=glon<=180:raise ValueError('Invalid grid mapping coordinate')
            distance=distance_km(lat,lon,glat,glon)
            if distance>cfg['maximum_mapping_distance_km']:raise ValueError('Grid mapping beyond distance guardrail')
            filename=f'subset-{i}.nc'
            copernicusmarine.subset(dataset_id=cfg['dataset_id'],variables=[cfg['variable'],cfg['mask_variable'],cfg['uncertainty_variable']],minimum_longitude=glon,maximum_longitude=glon,minimum_latitude=glat,maximum_latitude=glat,coordinates_selection_method='nearest',start_datetime=str(start),end_datetime=str(end)+'T23:59:59',output_directory=directory,output_filename=filename,disable_progress_bar=True)
            with xr.open_dataset(Path(directory)/filename) as dataset:
                temp=dataset[cfg['variable']];mask=dataset[cfg['mask_variable']];error=dataset[cfg['uncertainty_variable']]
                if temp.attrs.get('units','').lower() not in ['k','kelvin']:raise ValueError('Unexpected temperature units')
                actual_lat=float(dataset['latitude'].values.ravel()[0]);actual_lon=float(dataset['longitude'].values.ravel()[0])
                if abs(actual_lat-glat)>.026 or abs(actual_lon-glon)>.026:raise ValueError('Returned cell does not match reviewed grid')
                for t in dataset.time.values:
                    value=float(temp.sel(time=t).values.squeeze());flag=int(mask.sel(time=t).values.squeeze());uncertainty=float(error.sel(time=t).values.squeeze())
                    if flag!=1 or not math.isfinite(value) or not 260<value<320 or not math.isfinite(uncertainty):raise ValueError('Land/ice/missing/invalid grid cell; cache preserved')
                    records.append({'station_id':m['station_id'],'date':str(np.datetime_as_string(t,unit='D')),'sst_c':round(value-273.15,4),'source':'Copernicus Marine / Met Office OSTIA','product_id':cfg['dataset_id'],'grid_latitude':actual_lat,'grid_longitude':actual_lon,'distance_km':round(distance_km(lat,lon,actual_lat,actual_lon),3),'quality_flag':'reviewed_mapping_sea','analysis_error_k':uncertainty})
    if not records:raise ValueError('No observations returned')
    out=ROOT/'data/monitoring/station-environment.csv'
    # Merge cache by station/date; replace once all reviewed stations pass.
    previous=list(csv.DictReader(out.open())) if out.exists() else []
    merged={(r['station_id'],r['date']):r for r in previous if r['station_id'] in stations}
    merged.update({(r['station_id'],r['date']):r for r in records})
    fd,tmp=tempfile.mkstemp(dir=out.parent,prefix='.station-')
    try:
        with os.fdopen(fd,'w') as f:
            writer=csv.DictWriter(f,fieldnames=list(records[0]));writer.writeheader();writer.writerows(merged[k] for k in sorted(merged))
        os.replace(tmp,out)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
    meta={'source':'Copernicus Marine / Met Office OSTIA','dataset_id':cfg['dataset_id'],'retrieved_at':dt.datetime.now(dt.timezone.utc).isoformat(),'observation_start':str(start),'observation_end':str(end),'mapping_review_required':True}
    (out.parent/'station-environment.meta.json').write_text(json.dumps(meta,indent=2)+'\n')
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--start',type=dt.date.fromisoformat,required=True);parser.add_argument('--end',type=dt.date.fromisoformat,required=True);args=parser.parse_args();run(args.start,args.end)
