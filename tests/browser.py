"""Browser behavior tests against a rendered Quarto site or Pandoc fallback.
Run: GLOBE_TEST_URL=http://127.0.0.1:8765 python tests/browser.py
Optional GLOBE_CHROMIUM_PATH for environments with a system browser.
"""
import asyncio,json,os,subprocess,sys,time,urllib.request,urllib.parse
from pathlib import Path
from playwright.async_api import async_playwright
BASE=os.getenv('GLOBE_TEST_URL','http://127.0.0.1:8765').rstrip('/')
async def main():
 async with async_playwright() as p:
  args={'headless':True}
  if os.getenv('GLOBE_CHROMIUM_PATH'):args['executable_path']=os.environ['GLOBE_CHROMIUM_PATH']
  browser=await p.chromium.launch(**args)
  page=await browser.new_page(viewport={'width':1440,'height':1000});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  # Basemap is an external service; behavior tests deliberately run without tiles.
  await page.route('https://server.arcgisonline.com/**',lambda route:route.abort())
  await page.goto(BASE+'/pages/network.html');await page.locator('[data-status]').filter(has_text='network stations').wait_for()
  registry=await page.evaluate('fetch(new URL("../data/network-stations.geojson",location.href)).then(r=>r.json())');expected=len(registry['features']);incursion=sum(f['properties']['category']=='incursion' for f in registry['features'])
  countries={f['properties']['country'] for f in registry['features']}
  assert await page.locator('[data-country-flags] li').count()==len(countries)
  await page.wait_for_function("[...document.querySelectorAll('[data-country-flags] img')].every(i=>i.complete&&i.naturalWidth>0)")
  await page.locator('.station-item').nth(expected-1).wait_for();assert await page.locator('.station-item').count()==expected
  await page.fill('[data-search]','Fiji');assert await page.locator('.station-item').count()>=1
  await page.locator('.station-item').first.click();await page.locator('.leaflet-popup-content').wait_for();assert 'Fiji' in await page.locator('.leaflet-popup-content').inner_text()
  await page.click('[data-reset]');await page.select_option('[data-category]','incursion');assert await page.locator('.station-item').count()==incursion
  await page.select_option('[data-map-view]','observed');status=(await page.locator('[data-status]').inner_text()).lower();assert any(t in status for t in ['unavailable','observed-data analysis','sst anomaly'])
  assert await page.locator('[data-map-date-banner]').is_visible()
  chosen=await page.locator('[data-date] option:checked').inner_text();assert await page.locator('[data-map-observation-date]').get_attribute('datetime')==chosen
  assert 'UTC' in await page.locator('[data-map-update-time]').inner_text()
  assert await page.locator('.leaflet-stationMarkers-pane path').count()==incursion
  if await page.locator('[data-date] option').count()>1:
   second=await page.locator('[data-date] option').nth(1).inner_text()
   await page.select_option('[data-date]','1');assert second in await page.locator('[data-status]').inner_text();assert await page.locator('[data-map-observation-date]').get_attribute('datetime')==second
  await page.select_option('[data-map-view]','network');assert 'network stations' in await page.locator('[data-status]').inner_text();assert await page.locator('[data-map-date-banner]').is_hidden()
  # Injected scientific cache tests the quantitative layer without pretending it is live data.
  fixture={'frames':[{'observation_date':'2024-01-01','source':'SYNTHETIC TEST FIXTURE','product_id':'TEST-ONLY','units':'degree_C','baseline':'test only','retrieved_at':'2024-01-02T00:00:00Z','grid_spacing_deg':2,'cells':[{'lat':0,'lon':-140,'value':1.25}]}]}
  await page.route('**/data/monitoring/sst.json',lambda route:route.fulfill(json=fixture))
  await page.reload();await page.select_option('[data-map-view]','observed');await page.locator('[data-status]').filter(has_text='SYNTHETIC TEST FIXTURE').wait_for()
  await page.unroute('**/data/monitoring/sst.json')
  # Verify private content is absent and every navigation target can open.
  for slug in ['index.html','pages/about.html','pages/research.html','pages/network.html','pages/people.html','pages/monitoring.html','pages/resources.html','pages/news.html','pages/members.html','pages/privacy.html','pages/join.html']:
   response=await page.goto(BASE+'/'+slug);assert response.status==200
   assert await page.locator('h1:visible').count()==1
  await page.goto(BASE+'/pages/join.html')
  await page.fill('#join-name','Synthetic test researcher');await page.fill('#join-email','test@example.invalid')
  await page.fill('#join-institution','TEST INSTITUTION');await page.fill('#join-country','Test country')
  await page.select_option('#join-interest',label='Scientific collaboration');await page.fill('#join-message','Synthetic browser validation only.')
  await page.check('[name=consent]');await page.click('[data-join-form] button[type=submit]')
  await page.locator('[data-join-draft]:not([hidden])').wait_for();assert 'TEST INSTITUTION' in await page.locator('[data-join-text]').inner_text()
  assert 'no message has been sent' in (await page.locator('[data-join-status]').inner_text()).lower()
  await page.fill('#join-message','Updated synthetic text');assert await page.locator('[data-join-draft]').is_hidden()
  await page.goto(BASE+'/pages/monitoring.html');await page.locator('[data-enso-summary] strong').wait_for();assert await page.locator('[data-enso-chart] svg').count()==1
  await page.select_option('[data-enso-view]','comparison');assert await page.locator('[data-enso-chart] path').count()==3
  assert await page.locator('[data-enso-years]').is_visible()
  async with page.expect_download() as download:
   await page.click('[data-enso-export]')
  exported=await download.value;assert exported.suggested_filename.endswith('.svg')
  await page.select_option('[data-enso-view]','timeline')
  # Independently compare the interactive ERA5 boxes with the official cached rows.
  for key,name in [('nino34','Niño 3.4'),('nino3','Niño 3'),('nino4','Niño 4'),('nino12','Niño 1+2')]:
   await page.select_option('[data-climate-region]',key)
   await page.locator('[data-climate-status]').filter(has_text=name+' · ERA5').wait_for()
   data=await page.evaluate('(key)=>fetch(new URL("../data/monitoring/pulse/"+key+".json",location.href)).then(r=>r.json())',key)
   row=data['records'][-1];peers=[r for r in data['records'] if r[0][5:]==row[0][5:] and r[1] is not None];rank=1+sum(r[1]>row[1] for r in peers)
   assert await page.locator('[data-climate-date]').input_value()==row[0]
   assert f"{row[1]:.2f}" in await page.locator('[data-climate-stat=temperature] strong').inner_text()
   assert f"{row[3]:.2f}" in await page.locator('[data-climate-stat=anomaly] strong').inner_text()
   assert (await page.locator('[data-climate-stat=rank] strong').inner_text()).startswith(str(rank))
   assert str(len(peers)) in await page.locator('[data-climate-stat=rank] strong').inner_text()
   previous=data['records'][-2];await page.fill('[data-climate-date]',previous[0]);await page.locator('[data-climate-date]').dispatch_event('change')
   assert f"{previous[1]:.2f}" in await page.locator('[data-climate-stat=temperature] strong').inner_text()
  await page.select_option('[data-climate-quantity]','absolute');assert await page.locator('[data-climate-chart] path').count()==4
  for width in [375,768,1440]:
   await page.set_viewport_size({'width':width,'height':900});await page.goto(BASE+'/index.html')
   await page.locator('[data-logo-motion-toggle]').wait_for()
   assert await page.locator('[data-network]').count()==0
   assert await page.locator('.network-overview img').count()==1
   await page.locator('[data-network-count]').filter(has_text=str(len(registry['features']))).wait_for()
   assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),f'Overflow at {width}'
   assert await page.locator('.coordinator-logos img').count()==3
   assert await page.locator('.coordinator-logos').is_visible()
   assert await page.evaluate("[...document.querySelectorAll('.coordinator-logos img')].every(i=>i.complete&&i.naturalWidth>0)")
   await page.locator('[data-logo-motion]').scroll_into_view_if_needed()
   await page.wait_for_function("document.querySelector('[data-logo-motion]').dataset.motion==='running'")
   assert (await page.locator('.hero h1').inner_text())=='A Global Initiative to Uncover Ocean Microbiome Responses to Super El Niño in a Warming World.'
   assert await page.locator('.logo-current-overlay image.ocean-color-field').count()==1
   positions=[];frames=[]
   for _ in range(3):
    positions.append(await page.locator('.ocean-color-field').evaluate('(e)=>new DOMMatrixReadOnly(getComputedStyle(e).transform).m41'))
    if width==1440:frames.append(await page.locator('[data-logo-motion]').screenshot())
    await page.wait_for_timeout(800)
   assert max(positions)-min(positions)>2,'Ocean colours must advance during normal playback'
   if width==1440:assert len(set(frames))>1,'Rendered colours must move in real elapsed time'
   await page.click('[data-logo-motion-toggle]');assert await page.locator('[data-logo-motion]').get_attribute('data-motion')=='paused'
   await page.wait_for_function("getComputedStyle(document.querySelector('.ocean-color-field')).animationPlayState==='paused'")
   await page.wait_for_timeout(150)  # Allow the compositor to commit the pause frame.
   paused=await page.locator('.ocean-color-field').evaluate('(e)=>getComputedStyle(e).transform')
   await page.wait_for_timeout(200)
   assert await page.locator('.ocean-color-field').evaluate('(e)=>getComputedStyle(e).transform')==paused
   await page.click('[data-logo-motion-toggle]');assert await page.locator('[data-logo-motion]').get_attribute('data-motion')=='running'
   await page.locator('.network-overview img').scroll_into_view_if_needed()
   await page.wait_for_function("document.querySelector('.network-overview img').naturalWidth===1600")
   assert 'Use the pause/play button' not in await page.locator('body').inner_text()
   await page.evaluate('scrollTo(0,800)');await page.wait_for_timeout(100);assert abs((await page.locator('header.site-nav').bounding_box())['y'])<=1
   await page.evaluate('scrollTo(0,0)')
   if width<850:
    await page.click('.menu-toggle');assert await page.locator('.menu-toggle').get_attribute('aria-expanded')=='true'
    await page.click('.menu-toggle')
   Path('test-results').mkdir(exist_ok=True);await page.screenshot(path=f'test-results/home-{width}.png',full_page=True)
   for slug in ['pages/network.html','pages/monitoring.html','pages/join.html']:
    await page.goto(BASE+'/'+slug)
    await page.wait_for_load_state('networkidle')
    assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),f'{slug}: overflow at {width}'
    if slug=='pages/monitoring.html':
     cache=await page.evaluate('fetch(new URL("../data/monitoring/enso.json",location.href)).then(r=>r.json())')
     years=int(await page.locator('[data-years]').input_value())
     expected=[r for r in cache['records'] if r['year']>=cache['records'][-1]['year']-years+1]
     actual=await page.locator('[data-enso-table] tbody tr').all_text_contents()
     assert len(actual)==len(expected)
     for text,row in zip(actual,expected):assert f"{row['value']:.2f}" in text
     await page.screenshot(path=f'test-results/monitoring-{width}.png',full_page=True)
  await page.emulate_media(reduced_motion='reduce');await page.goto(BASE+'/index.html')
  assert await page.locator('[data-logo-motion]').get_attribute('data-motion')=='off'
  assert await page.locator('[data-logo-motion-toggle]').is_visible()
  await page.locator('[data-logo-motion]').scroll_into_view_if_needed();await page.click('[data-logo-motion-toggle]')
  await page.wait_for_function("document.querySelector('[data-logo-motion]').dataset.motion==='running'")
  assert await page.locator('.ocean-color-field').evaluate('(e)=>getComputedStyle(e).animationPlayState')=='running'
  await page.click('[data-logo-motion-toggle]');assert await page.locator('[data-logo-motion]').get_attribute('data-motion')=='off'
  nojs=await browser.new_context(java_script_enabled=False)
  nojs_page=await nojs.new_page();await nojs_page.goto(BASE+'/pages/join.html');assert await nojs_page.locator('button[type=submit]').is_disabled()
  await nojs.close()
  assert not errors,errors
  await browser.close();print('PASS: map filters, popups, mode switching, synthetic observed layer, navigation, cache chart and three viewport widths')
server=None
try:
 if os.getenv('GLOBE_START_SITE')=='true':
  port=urllib.parse.urlsplit(BASE).port or 8765
  server=subprocess.Popen([sys.executable,'-m','http.server',str(port),'--bind','127.0.0.1','--directory','_site'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  for _ in range(50):
   try:
    urllib.request.urlopen(BASE+'/index.html',timeout=1).close();break
   except OSError:time.sleep(.1)
 asyncio.run(main())
finally:
 if server:
  server.terminate();server.wait(timeout=5)
