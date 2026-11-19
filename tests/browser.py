"""Browser behavior tests against a rendered Quarto site or Pandoc fallback.
Run: GLOBE_TEST_URL=http://127.0.0.1:8765 python tests/browser.py
Optional GLOBE_CHROMIUM_PATH for environments with a system browser.
"""
import asyncio,json,os
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
  await page.select_option('[data-registry]','approved');await page.locator('[data-status]').filter(has_text='No approved').wait_for()
  await page.select_option('[data-registry]','network');await page.locator('.station-item').nth(expected-1).wait_for();assert await page.locator('.station-item').count()==expected
  await page.fill('[data-search]','Fiji');assert await page.locator('.station-item').count()==1
  await page.locator('.station-item').click();await page.locator('.leaflet-popup-content').wait_for();assert 'approximate' in await page.locator('.leaflet-popup-content').inner_text()
  await page.click('[data-reset]');await page.select_option('[data-category]','incursion');assert await page.locator('.station-item').count()==incursion
  await page.click('[data-mode="observed"]');status=(await page.locator('[data-status]').inner_text()).lower();assert any(t in status for t in ['unavailable','observed-data analysis'])
  assert await page.locator('.leaflet-stationMarkers-pane path').count()==incursion
  await page.uncheck('[data-show-stations]');assert await page.locator('.leaflet-stationMarkers-pane path').count()==0
  await page.check('[data-show-stations]');assert await page.locator('.leaflet-stationMarkers-pane path').count()==incursion
  if await page.locator('[data-date] option').count()>1:
   second=await page.locator('[data-date] option').nth(1).inner_text()
   await page.select_option('[data-date]','1');assert second in await page.locator('[data-status]').inner_text()
  await page.click('[data-mode="network"]');assert 'network stations' in await page.locator('[data-status]').inner_text()
  # Injected scientific cache tests the quantitative layer without pretending it is live data.
  fixture={'frames':[{'observation_date':'2024-01-01','source':'SYNTHETIC TEST FIXTURE','product_id':'TEST-ONLY','units':'degree_C','baseline':'test only','retrieved_at':'2024-01-02T00:00:00Z','grid_spacing_deg':2,'cells':[{'lat':0,'lon':-140,'value':1.25}]}]}
  await page.route('**/data/monitoring/sst.json',lambda route:route.fulfill(json=fixture))
  await page.reload();await page.click('[data-mode="observed"]');await page.locator('[data-status]').filter(has_text='SYNTHETIC TEST FIXTURE').wait_for()
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
  for width in [375,768,1440]:
   await page.set_viewport_size({'width':width,'height':900});await page.goto(BASE+'/index.html')
   await page.locator('[data-status]').filter(has_text='network stations').wait_for()
   assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),f'Overflow at {width}'
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
  assert not errors,errors
  await browser.close();print('PASS: map filters, popups, mode switching, synthetic observed layer, navigation, cache chart and three viewport widths')
asyncio.run(main())
