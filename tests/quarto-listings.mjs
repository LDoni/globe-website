// Real Quarto integration, isolated from publishable source and production output.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'globo-listings-'));
for(const folder of ['pages','news','publications'])fs.mkdirSync(path.join(dir,folder));
for(const file of ['index.qmd','pages/news.qmd','pages/resources.qmd'])fs.copyFileSync(file,path.join(dir,file));
fs.writeFileSync(path.join(dir,'_quarto.yml'),'project:\n  type: website\nwebsite:\n  title: Synthetic integration fixture\nformat: html\n');
for(const [folder,slug,draft]of [['news','synthetic-announcement',false],['publications','synthetic-publication',false],['news','synthetic-draft',true]])fs.writeFileSync(path.join(dir,folder,slug+'.qmd'),`---\ntitle: ${slug}\nauthor: Synthetic test\ndate: 2026-11-23\ndraft: ${draft}\n---\n\nSynthetic fixture; never published.\n`);
execFileSync('quarto',['render'],{cwd:dir,stdio:'pipe'});
for(const [file,expected]of [['index.html','synthetic-announcement'],['pages/news.html','synthetic-announcement'],['pages/resources.html','synthetic-publication']]){const html=fs.readFileSync(path.join(dir,'_site',file),'utf8');assert.match(html,new RegExp('href="[^"\\n]*'+expected+'\\.html"'));assert.ok(!html.includes('href="../news/synthetic-draft.html"'));}
console.log('PASS: real Quarto homepage/news/publications lists include new entries and exclude drafts; fixtures remain outside repository: '+dir);
