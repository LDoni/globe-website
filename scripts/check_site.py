#!/usr/bin/env python3
"""Validate rendered links and ensure private material is absent from public output."""
import argparse,json,re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote,urlsplit
class Links(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.ids=set()
 def handle_starttag(self,tag,attrs):
    a=dict(attrs)
    if a.get('id'):self.ids.add(a['id'])
    if tag in ['a','script','img','link','iframe']:
      value=a.get('href') if tag in ['a','link'] else a.get('src')
      if value:self.links.append(value)
def check(root):
    root=Path(root).resolve();errors=[];pages=list(root.rglob('*.html'))
    if not pages:raise SystemExit('No rendered HTML files found')
    parsed={}
    for f in pages:
      parser=Links();parser.feed(f.read_text());parsed[f]=parser
    for f,parser in parsed.items():
      for url in parser.links:
        u=urlsplit(url)
        if u.scheme or u.netloc:continue
        path=(root/u.path.lstrip('/') if u.path.startswith('/') else f.parent/unquote(u.path)).resolve() if u.path else f
        if path.is_dir():path=path/'index.html'
        if not path.is_relative_to(root) or not path.exists():errors.append(f'{f.relative_to(root)}: broken local link {url}')
        elif u.fragment and path in parsed and unquote(u.fragment) not in parsed[path].ids:errors.append(f'{f.relative_to(root)}: missing anchor {url}')
    forbidden=[p for p in root.rglob('*') if p.is_file() and (p.suffix in ['.R','.Rmd','.qmd','.lock','.pem'] or any(part in ['private','.git','.github','docs','tests','config','shiny'] for part in p.relative_to(root).parts))]
    errors += [f'Private/source path in output: {p.relative_to(root)}' for p in forbidden]
    for path in [root/'data/stations.geojson',root/'data/stations.csv']:
      text=path.read_text()
      if re.search(r'contact_email|principal_contact|internal_notes|private@example',text):errors.append('Private fields in public station export')
    if errors:raise SystemExit('\n'.join(errors))
    print(f'PASS: {len(pages)} HTML pages; local links and public output checks')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('directory',nargs='?',default='_site');args=p.parse_args();check(args.directory)
