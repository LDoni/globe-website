#!/usr/bin/env python3
"""Scan project text for common credential forms. Not a complete secret audit."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
patterns=[r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',r'gh[pousr]_[A-Za-z0-9]{30,}',r'github_pat_[A-Za-z0-9_]{40,}',r'"private_key"\s*:\s*"[^"\n]+',r'AKIA[0-9A-Z]{16}']
failed=[]
for path in ROOT.rglob('*'):
 if any(x in {'.git','.venv','.local-data','_local_preview','_preview','_site','.quarto','renv','__pycache__','test-results'} for x in path.relative_to(ROOT).parts) or not path.is_file() or path.name=='check_security.py':continue
 try:text=path.read_text()
 except UnicodeError:continue
 if any(re.search(pattern,text) for pattern in patterns):failed.append(str(path.relative_to(ROOT)))
if failed:raise SystemExit('Potential credential values detected in: '+', '.join(failed))
print('PASS: no common credential signatures in project text')
