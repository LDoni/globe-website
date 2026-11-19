#!/usr/bin/env python3
"""Build a local-only preview of unapproved workbook locations after Quarto render."""
import shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'.local-data/local-network.geojson'
if not source.exists():raise SystemExit('Run import_station_workbook.py first')
target=ROOT/'_local_preview'
shutil.copytree(ROOT/'_site',target,dirs_exist_ok=True)
shutil.copy2(source,target/'data/local-network.geojson')
for path in target.rglob('*.html'):
    html=path.read_text()
    html=html.replace('<option value="approved">Approved stations</option>','<option value="local" selected>Local preview: workbook locations</option><option value="approved">Approved stations</option>')
    path.write_text(html)
print('Local-only workbook preview built in _local_preview; never upload this folder.')
