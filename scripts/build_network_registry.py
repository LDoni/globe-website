#!/usr/bin/env python3
"""Validate the public, editable map CSV and atomically generate its GeoJSON.
The approved scientific-coordinate register is never changed by this script.
"""
import csv,json,math,os,re,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
FIELDS={'station_id','station_name','country','latitude','longitude','institution','category','ocean_basin','sampling_status','coordinate_status','public_description','institution_url','map_visibility'}
def collection(rows):
 features=[];ids=set()
 for row in rows:
  if set(row)-FIELDS:raise ValueError('Network CSV contains unsupported columns; use only public map fields')
  row={k:(v or '').strip() for k,v in row.items()};identifier=row.get('station_id','')
  if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,63}',identifier) or identifier in ids:raise ValueError('Missing or duplicate network station ID')
  ids.add(identifier)
  visibility=row.get('map_visibility','public') or 'public'
  if visibility not in ['public','hidden']:raise ValueError('Invalid map visibility')
  if visibility=='hidden':continue
  if not all(row.get(k) for k in ['station_name','country','coordinate_status']):raise ValueError('Network station missing map metadata')
  lat,lon=float(row['latitude']),float(row['longitude'])
  if not math.isfinite(lat) or not math.isfinite(lon) or not -90<=lat<=90 or not -180<=lon<=180:raise ValueError('Invalid network coordinates')
  if row.get('category') not in ['unclassified','incursion','pacific','reference']:raise ValueError('Unknown network category')
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
if __name__=='__main__':build()
