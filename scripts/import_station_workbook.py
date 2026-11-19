#!/usr/bin/env python3
"""Local workbook intake. Never approves coordinates or publishes private columns."""
import argparse,csv,io,json
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile
NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
FIELDS=['station_id','station_name','country','latitude','longitude','institution','category','ocean_basin','sampling_status','public_description','institution_url','coordinate_status','publication_status']
def read_stations(path):
 with ZipFile(path) as archive:
  strings=[]
  if 'xl/sharedStrings.xml' in archive.namelist():
   strings=[''.join(n.itertext()) for n in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('s:si',NS)]
  rows=[]
  for node in ET.fromstring(archive.read('xl/worksheets/sheet1.xml')).findall('s:sheetData/s:row',NS):
   row={}
   for cell in node:
    key=''.join(c for c in cell.attrib['r'] if c.isalpha());value=cell.find('s:v',NS);inline=cell.find('s:is',NS)
    text=value.text if value is not None else ''.join(inline.itertext()) if inline is not None else ''
    row[key]=strings[int(text)] if cell.attrib.get('t')=='s' else text
   rows.append(row)
  header=rows[0]
  if not {'station_id','map_label','publication_status','coordinate_status','latitude','longitude'} <= set(header.values()):raise ValueError('Workbook station schema missing required columns')
  return [{header[k]:v for k,v in row.items() if k in header} for row in rows[1:] if row.get('A')]
def canonical(row):
 category={'Incursion':'incursion','Pacific':'pacific','Reference':'reference'}.get(row.get('station_category'),'unclassified')
 region=row.get('ocean_region','')
 basin='Pacific' if 'Pacific' in region else 'Mediterranean' if 'Mediterranean' in region else 'Atlantic' if 'Atlantic' in region and 'Indian' not in region else 'Indian' if region in ['Indian Ocean','Persian Gulf','Red Sea'] else ''
 return dict(zip(FIELDS,[row.get('station_id',''),row.get('map_label',''),row.get('country',''),row.get('latitude',''),row.get('longitude',''),row.get('institution',''),category,basin,'unconfirmed','','',row.get('coordinate_status',''),row.get('publication_status','draft')]))
def intake(path,output):
 rows=read_stations(path);output.mkdir(parents=True,exist_ok=True)
 with (output/'stations-input.csv').open('w',newline='') as f:
  writer=csv.DictWriter(f,fieldnames=FIELDS);writer.writeheader();writer.writerows(canonical(r) for r in rows)
 features=[]
 for row in rows:
  if not row.get('map_latitude_approx') or not row.get('map_longitude_approx'):continue
  p=canonical(row);p['coordinate_status']='approximate; unverified';p['publication_status']='draft';p['public_description']='Preliminary partner location from the supplied workbook. Not an approved sampling coordinate.'
  features.append({'type':'Feature','geometry':{'type':'Point','coordinates':[float(row['map_longitude_approx']),float(row['map_latitude_approx'])]},'properties':{k:v for k,v in p.items() if k not in ['latitude','longitude']}})
 (output/'local-network.geojson').write_text(json.dumps({'type':'FeatureCollection','dataset_status':'local_preliminary_registry','features':features},indent=2)+'\n')
 print(f'Local intake: {len(rows)} rows; {sum(r.get("publication_status")=="approved" for r in rows)} approved; {len(features)} approximate preview points. No private columns exported.')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('workbook',type=Path);parser.add_argument('--output',type=Path,default=Path('.local-data'));args=parser.parse_args();intake(args.workbook,args.output)
