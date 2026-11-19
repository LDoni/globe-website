#!/usr/bin/env python3
"""Create a Quarto-native public news or publication entry from the shared layout."""
import argparse,datetime,html,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main():
 p=argparse.ArgumentParser();p.add_argument('kind',choices=['news','publication']);p.add_argument('slug');p.add_argument('--title',required=True);p.add_argument('--author',required=True);p.add_argument('--date',type=datetime.date.fromisoformat,required=True);p.add_argument('--category',default='Project update');args=p.parse_args()
 if not re.fullmatch('[a-z0-9]+(?:-[a-z0-9]+)*',args.slug):p.error('Use a lowercase hyphenated slug')
 folder='news' if args.kind=='news' else 'publications';target=ROOT/folder/(args.slug+'.qmd')
 if target.exists():p.error('Entry already exists')
 target.parent.mkdir(parents=True,exist_ok=True)
 template=(ROOT/'pages/news.qmd').read_text();header=re.search(r'(<a class="skip".*?</header>)',template,re.S).group(1);footer=re.search(r'(<footer class="site-footer".*?</footer><script.*?</script>)',template,re.S).group(1)
 if args.kind=='publication':header=header.replace(' aria-current="page"','').replace('href="../pages/resources.html"','href="../pages/resources.html" aria-current="page"')
 meta='---\n'+''.join(f'{key}: {json.dumps(value)}\n' for key,value in {'title':args.title,'author':args.author,'date':str(args.date),'categories':[args.category],'draft':True}.items())+'---\n'
 content=f'''\n```{{=html}}\n{header}<div id="main-content"><section class="page-intro"><p class="eyebrow">{html.escape(args.category)}</p><h1>{html.escape(args.title)}</h1><p>{args.date} · {html.escape(args.author)}</p></section><section class="wrap prose">\n```\n\nWrite the approved text here. Remove `draft: true` only after public-release approval.\n\nFor publications add the DOI link and journal details. For images use an approved local file in assets/images, with alt text and attribution.\n\n```{{=html}}\n</section></div>{footer}\n```\n'''
 target.write_text(meta+content);print(target)
if __name__=='__main__':main()
