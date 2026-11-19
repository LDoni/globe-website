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
if __name__=='__main__':unittest.main()
