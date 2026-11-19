#!/usr/bin/env python3
"""Pandoc fallback preview of the same QMD bodies. Not a Quarto render substitute."""
from pathlib import Path
import shutil, subprocess, re, html
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'_preview'
def build():
    OUT.mkdir(exist_ok=True)
    for folder in ['assets','data']:
        shutil.copytree(ROOT/folder,OUT/folder,dirs_exist_ok=True)
    for source in [ROOT/'index.qmd',*(ROOT/'pages').glob('*.qmd'),*(ROOT/'news').glob('**/*.qmd'),*(ROOT/'publications').glob('**/*.qmd')]:
        relative=source.relative_to(ROOT).with_suffix('.html'); destination=OUT/relative
        destination.parent.mkdir(parents=True,exist_ok=True)
        text=source.read_text();title=re.search(r'^title:\s*"?(.*?)"?$',text,re.M).group(1).strip('"')
        result=subprocess.run(['pandoc',str(source),'-f','markdown','-t','html5'],capture_output=True,text=True,check=True).stdout
        prefix='../'*(len(relative.parts)-1)
        destination.write_text(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="GLOBE international ocean microbiome initiative"><title>{html.escape(title)} | GLOBE</title><link rel="icon" href="{prefix}assets/favicon.svg"><link rel="stylesheet" href="{prefix}assets/css/styles.css"></head><body>{result}</body></html>')
    print(f'Preview created: {OUT}')
if __name__=='__main__':build()
