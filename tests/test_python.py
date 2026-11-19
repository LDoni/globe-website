import importlib.util,json,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/f'{name}.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
sst=load('fetch_sst');cop=load('copernicus_stations')
class CacheTests(unittest.TestCase):
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
