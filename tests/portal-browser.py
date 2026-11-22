"""Synthetic-only browser integration against tests/portal-preview.mjs."""
import asyncio,os,socket,subprocess,urllib.request,time
from pathlib import Path
from playwright.async_api import async_playwright
with socket.socket() as port_probe:
 port_probe.bind(('127.0.0.1',0));PORT=int(os.getenv('GLOBE_PORTAL_PORT',port_probe.getsockname()[1]))
BASE=f'http://127.0.0.1:{PORT}'
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch()
  partner=await browser.new_context(viewport={'width':1440,'height':1000})
  page=await partner.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_default_timeout(45000)
  await page.goto(BASE);await page.locator('#workspace:not([hidden])').wait_for()
  assert 'partner@example.invalid' in await page.locator('#identity').inner_text()
  catalogue=await (await page.request.get(BASE+'/api/workspace')).json()
  assert await page.locator('[data-station-options] option').count()==2*len(catalogue['stations'])+1
  assert await page.locator('#resource-list li').count()==1
  await page.fill('#resource-search','missing-resource');assert await page.locator('#resource-empty').is_visible()
  await page.fill('#resource-search','');await page.select_option('#resource-category','Report');assert await page.locator('#resource-empty').is_visible()
  await page.select_option('#resource-category','Protocol');assert await page.locator('#resource-list li').count()==1
  document=await page.request.get(BASE+'/documents/synthetic-protocol.txt');assert document.status==200 and 'Synthetic protocol' in await document.text()
  assert document.headers.get('cache-control')=='private, no-store'
  form=page.locator('#campaign-form');await form.locator('[name=title]').fill('Synthetic microbiome campaign')
  await form.locator('[name=start_date]').fill('2027-01-01');await form.locator('[name=end_date]').fill('2027-02-01')
  await form.locator('[name=station_ids]').select_option('GLOBE-001');await form.locator('[name=description]').fill('Synthetic integrated browser test only.')
  await form.locator('button').click();await form.locator('[data-result]').filter(has_text='Request saved').wait_for()
  assert await page.locator('#request-list article').count()==1
  await page.reload();await page.locator('#request-list article').wait_for();assert 'Synthetic microbiome campaign' in await page.locator('#request-list').inner_text()
  station=page.locator('#station-form');await station.locator('[name=station_ids]').select_option('GLOBE-001')
  await station.locator('[name=title]').fill('Synthetic station correction');await station.locator('[name=description]').fill('Please review the synthetic metadata.')
  await station.locator('[name=latitude]').fill('1.5');await station.locator('[name=longitude]').fill('179.5')
  await station.locator('button').click();await station.locator('[data-result]').filter(has_text='Request saved').wait_for()
  assert await page.locator('#request-list article').count()==2
  other=await browser.new_context(extra_http_headers={'X-Synthetic-User':'other@example.invalid'})
  otherpage=await other.new_page();await otherpage.goto(BASE);await otherpage.locator('#workspace:not([hidden])').wait_for();assert await otherpage.locator('#request-list article').count()==0
  coord=await browser.new_context(extra_http_headers={'X-Synthetic-User':'coordinator@example.invalid'})
  cp=await coord.new_page();await cp.goto(BASE);await cp.locator('#request-list article').nth(1).wait_for()
  card=cp.locator('#request-list article').filter(has_text='Synthetic microbiome campaign');await card.locator('textarea').fill('Coordination reviewed in synthetic test.')
  await card.get_by_role('button',name='Mark reviewed').click();await card.locator('.badge').filter(has_text='Coordination review complete').wait_for()
  await page.reload();await page.locator('#request-list').get_by_text('Coordination reviewed in synthetic test.').wait_for()
  for width in [375,768,1440]:
   await page.set_viewport_size({'width':width,'height':900})
   assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),f'Workspace overflow at {width}'
   await page.screenshot(path=f'test-results/partners-{width}.png',full_page=True)
  # Storage failure must retain entered data and must not report a successful save.
  await page.route('**/api/requests',lambda route:route.fulfill(status=503,json={'error':'Submissions are unavailable. Your request has not been saved.'}))
  await form.locator('[name=title]').fill('Synthetic failure');await form.locator('[name=start_date]').fill('2027-01-01');await form.locator('[name=end_date]').fill('2027-02-01');await form.locator('[name=description]').fill('Failure preservation test.')
  await form.locator('button').click();await form.locator('[data-result]').filter(has_text='has not been saved').wait_for();assert await form.locator('[name=title]').input_value()=='Synthetic failure'
  assert not errors,errors
  await browser.close();print('PASS: synthetic private workspace, persistent session reload, author isolation, coordinator review, station requests, failed-save handling and three viewport widths')
server=subprocess.Popen(['node','tests/portal-preview.mjs'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env={**os.environ,'GLOBE_PORTAL_PORT':str(PORT)})
try:
 for _ in range(100):
  try:urllib.request.urlopen(BASE,timeout=1).close();break
  except OSError:time.sleep(.1)
 Path('test-results').mkdir(exist_ok=True);asyncio.run(main())
finally:server.terminate();server.wait(timeout=5)
