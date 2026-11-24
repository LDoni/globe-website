import importlib.util,json,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/f'{name}.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
sst=load('fetch_sst');cop=load('copernicus_stations');pulse=load('fetch_pulse');network=load('build_network_registry');raster=load('fetch_sst_raster')
class CacheTests(unittest.TestCase):
 def test_station_rename_preserves_metadata_and_rejects_alias_collisions(self):
    import csv
    with (ROOT/'data/network-stations.csv').open() as f:row=next(csv.DictReader(f))
    old={**row,'station_id':row['station_id'].replace('GLOBO-','GLOBE-')}
    self.assertEqual(network.collection([old]),network.collection([row]))
    with self.assertRaises(ValueError):network.collection([old,row])

 def test_cached_raster_preserves_actual_retrieval_time_after_checkout(self):
    import os
    from unittest.mock import patch
    with tempfile.TemporaryDirectory() as directory:
      root=Path(directory);(root/'config').mkdir();cache=root/'data/monitoring';cache.mkdir(parents=True)
      (root/'config/ocean-products.json').write_text(json.dumps({'noaa':{'erddap':'https://example.invalid','dataset_id':'TEST','variable':'anomaly'}}))
      timestamp='2024-01-02T12:05:00Z'
      frame={'observation_date':'2024-01-01','retrieved_at':'2024-01-02T12:00:00Z','raster_numeric_retrieved_at':'2024-01-02T12:00:00Z','raster_retrieved_at':timestamp}
      (cache/'sst.json').write_text(json.dumps({'frames':[frame]}))
      for name in ['sst-anomaly-2024-01-01.png','sst-legend-2024-01-01.png']:
        path=cache/name;path.write_bytes(b'SYNTHETIC CACHED IMAGE');os.utime(path,(2000000000,2000000000))
      with patch.object(raster,'ROOT',root),patch.object(raster,'download',side_effect=AssertionError('No download expected')):raster.update()
      self.assertEqual(json.loads((cache/'sst.json').read_text())['frames'][0]['raster_retrieved_at'],timestamp)
 def test_era5_columns_baseline_units_missing_and_consistency(self):
    raw='# Units: degC\n# Reference period: 1991-2020\ndate,sst,clim_1991_2020,anom_1991_2020,status\n2024-01-01,30,27,3,FINAL\n2024-01-02,NaN,27,NaN,PRELIMINARY\n'
    notes,rows=pulse.parse(raw);self.assertEqual(rows[0],['2024-01-01',30.,27.,3.,'FINAL']);self.assertIsNone(rows[1][1])
    for bad in [raw.replace('degC','K'),raw.replace('1991-2020','1981-2010'),raw.replace(',27,3,',',27,4,'),raw.replace('2024-01-02','2024-01-01')]:
      with self.assertRaises(ValueError):pulse.parse(bad)
 def test_public_network_display_does_not_approve_scientific_coordinates(self):
    row={'station_id':'TEST','station_name':'Synthetic partner','country':'Test','latitude':'1','longitude':'179.5','category':'unclassified','coordinate_status':'approximate','map_visibility':'public'}
    result=network.collection([row]);self.assertEqual(result['features'][0]['properties']['publication_status'],'network_display_only')
    self.assertEqual(result['features'][0]['geometry']['coordinates'],[179.5,1.])
    with self.assertRaises(ValueError):network.collection([row,row])
    with self.assertRaises(ValueError):network.collection([{**row,'longitude':'NaN'}])
    with self.assertRaises(ValueError):network.collection([{**row,'contact_email':'private@example.invalid'}])
 def test_network_operational_status_and_hidden_coordinates_are_validated(self):
    row={'station_id':'TEST','station_name':'Synthetic','country':'Test','latitude':'0','longitude':'179.9','category':'unclassified','coordinate_status':'verified','map_visibility':'public'}
    for status in ['planned','confirmed','active','unconfirmed']:
      out=network.collection([{**row,'sampling_status':status}]);self.assertEqual(out['features'][0]['properties']['sampling_status'],status)
    with self.assertRaises(ValueError):network.collection([{**row,'sampling_status':'invented'}])
    with self.assertRaises(ValueError):network.collection([{**row,'map_visibility':'hidden','longitude':'999'}])
 def test_noaa_units_missing_and_longitudes(self):
    raw='time,latitude,longitude,sea_surface_temperature_anomaly\nUTC,degrees_north,degrees_east,degree_C\n2024-01-01T12:00:00Z,10,350,1.5\n2024-01-01T12:00:00Z,11,2,NaN\n'
    date,cells=sst.parse_csv(raw);self.assertEqual(date,'2024-01-01');self.assertEqual(cells,[{'lat':10.,'lon':-10.,'value':1.5}])
    with self.assertRaises(ValueError):sst.parse_csv(raw.replace('degree_C','kelvin'))
    with self.assertRaises(ValueError):sst.parse_csv(raw.replace('350','999'))
 def test_atomic_json_failure_preserves_previous_cache(self):
    with tempfile.TemporaryDirectory() as directory:
      path=Path(directory)/'cache.json';path.write_text('{"old": true}')
      with self.assertRaises(ValueError):sst.atomic_json({'invalid':float('nan')},path)
      self.assertEqual(json.loads(path.read_text()),{'old':True})
 def test_production_has_no_demonstration_records(self):
    data=json.loads((ROOT/'data/stations.geojson').read_text());self.assertEqual(data['dataset_status'],'approved_registry')
    for f in data['features']:
      self.assertEqual(f['properties']['publication_status'],'approved');self.assertEqual(f['properties']['coordinate_status'],'verified');self.assertFalse(f['properties']['station_id'].startswith('DEMO-'))
      self.assertFalse({'contact_email','principal_contact','internal_notes'} & f['properties'].keys())
 def test_demo_is_separate(self):
    d=json.loads((ROOT/'data/demo/stations.geojson').read_text());self.assertEqual(len(d['features']),29);self.assertEqual(d['dataset_status'],'demonstration')
 def test_enso_order_dates_and_units(self):
    data=json.loads((ROOT/'data/monitoring/enso.json').read_text());self.assertEqual(data['units'],'degree_C')
    ends=[r['period_end'] for r in data['records']];self.assertEqual(ends,sorted(set(ends)));self.assertTrue(data['source_url'].startswith('https://www.cpc.ncep.noaa.gov/'))
 def test_distance(self):
    self.assertEqual(cop.distance_km(0,0,0,0),0);self.assertAlmostEqual(cop.distance_km(0,0,0,1),111.195,places=2)
    self.assertAlmostEqual(cop.distance_km(0,179.9,0,-179.9),22.239,places=2)
 def test_copernicus_gates_preserve_cache_without_optional_client(self):
    import datetime,os
    from unittest.mock import patch
    paths=[ROOT/'data/monitoring/station-environment.csv',ROOT/'data/monitoring/station-environment.meta.json']
    before=[p.read_bytes() for p in paths]
    day=datetime.date(2026,11,1)
    with patch.dict(os.environ,{},clear=True):
      with self.assertRaisesRegex(ValueError,'credentials'):cop.run(day,day)
    with patch.dict(os.environ,{'COPERNICUSMARINE_SERVICE_USERNAME':'SYNTHETIC','COPERNICUSMARINE_SERVICE_PASSWORD':'SYNTHETIC'},clear=True):
      with self.assertRaisesRegex(ValueError,'No reviewed'):cop.run(day,day)
    self.assertEqual(before,[p.read_bytes() for p in paths])
 def test_noaa_update_failure_preserves_live_cache(self):
    from unittest.mock import patch
    path=ROOT/'data/monitoring/sst.json';before=path.read_bytes()
    with patch.object(sst,'fetch',side_effect=OSError('Synthetic network failure')):
      with self.assertRaises(OSError):sst.update()
    self.assertEqual(before,path.read_bytes())
 def test_copernicus_pair_rolls_back_after_second_file_failure(self):
    from unittest.mock import patch
    with tempfile.TemporaryDirectory() as directory:
      a,b=Path(directory)/'series.csv',Path(directory)/'meta.json'
      a.write_text('old series');b.write_text('old metadata')
      replace=cop.os.replace;calls=0
      def failing_replace(source,target):
        nonlocal calls
        calls+=1
        if calls==2:raise OSError('Synthetic second replacement failure')
        return replace(source,target)
      with patch.object(cop.os,'replace',side_effect=failing_replace):
        with self.assertRaises(OSError):cop.publish_pair({a:'new series',b:'new metadata'})
      self.assertEqual(a.read_text(),'old series');self.assertEqual(b.read_text(),'old metadata')
if __name__=='__main__':unittest.main()
