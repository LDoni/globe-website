#!/usr/bin/env python3
"""Validate the public, editable map CSV and atomically generate its GeoJSON.
The approved scientific-coordinate register is never changed by this script.
"""
import csv,json,math,os,re,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
FIELDS={'station_id','station_name','country','country_iso2','latitude','longitude','institution','category','ocean_basin','sampling_status','coordinate_status','public_description','institution_url','map_visibility'}
def collection(rows):
 features=[];ids=set()
 for row in rows:
  if set(row)-FIELDS:raise ValueError('Network CSV contains unsupported columns; use only public map fields')
  row={k:(v or '').strip() for k,v in row.items()};identifier=row.get('station_id','')
  if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,63}',identifier) or identifier in ids:raise ValueError('Missing or duplicate network station ID')
  ids.add(identifier)
  visibility=row.get('map_visibility','public') or 'public'
  if visibility not in ['public','hidden']:raise ValueError('Invalid map visibility')
  row['sampling_status']=row.get('sampling_status') or 'unconfirmed'
  if row['sampling_status'] not in ['planned','confirmed','active','unconfirmed','paused','completed']:raise ValueError('Invalid sampling status')
  if visibility=='hidden':
   supplied=[row.get('latitude',''),row.get('longitude','')]
   if any(supplied):
    if not all(supplied):raise ValueError('Coordinate pairs are required')
    lat,lon=map(float,supplied)
    if not math.isfinite(lat) or not math.isfinite(lon) or abs(lat)>90 or abs(lon)>180:raise ValueError('Invalid network coordinates')
   continue
  if not all(row.get(k) for k in ['station_name','country','coordinate_status']):raise ValueError('Network station missing map metadata')
  lat,lon=float(row['latitude']),float(row['longitude'])
  if not math.isfinite(lat) or not math.isfinite(lon) or not -90<=lat<=90 or not -180<=lon<=180:raise ValueError('Invalid network coordinates')
  if row.get('category') not in ['unclassified','incursion','pacific','reference']:raise ValueError('Unknown network category')
  if row.get('country_iso2') and not re.fullmatch(r'[a-z]{2}',row['country_iso2']):raise ValueError('country_iso2 must be a lowercase two-letter ISO code')
  props={k:v for k,v in row.items() if k not in ['latitude','longitude','map_visibility']}
  props['publication_status']='network_display_only'
  features.append({'type':'Feature','geometry':{'type':'Point','coordinates':[lon,lat]},'properties':props})
 return {'type':'FeatureCollection','dataset_status':'public_partner_network','source':'GLOBE editable public map register','features':features}
def build(source=ROOT/'data/network-stations.csv',target=ROOT/'data/network-stations.geojson'):
 with Path(source).open(newline='') as f:result=collection(list(csv.DictReader(f)))
 target=Path(target);fd,temp=tempfile.mkstemp(prefix='.network-',dir=target.parent)
 try:
  with os.fdopen(fd,'w') as f:json.dump(result,f,indent=2,allow_nan=False);f.write('\n')
  os.replace(temp,target)
 finally:
  if os.path.exists(temp):os.unlink(temp)
 print('Public network map generated:',len(result['features']),'stations; approved scientific registry unchanged')
if __name__=='__main__':
 import argparse
 p=argparse.ArgumentParser();p.add_argument('--source',default=ROOT/'data/network-stations.csv',type=Path);p.add_argument('--target',default=ROOT/'data/network-stations.geojson',type=Path);a=p.parse_args();build(a.source,a.target)
