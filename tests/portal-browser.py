"""Synthetic-only integration: shared tickets, owner-only deletion."""
import asyncio,os,socket,subprocess,urllib.request,time
from pathlib import Path
from playwright.async_api import async_playwright
with socket.socket() as port_probe:
 port_probe.bind(('127.0.0.1',0));PORT=int(os.getenv('GLOBO_PORTAL_PORT',port_probe.getsockname()[1]))
BASE=f'http://127.0.0.1:{PORT}'
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch()
  partner=await browser.new_context(viewport={'width':1440,'height':1000})
  page=await partner.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(45000)
  await page.route('https://docs.google.com/**',lambda route:route.fulfill(status=200,content_type='text/html',body='<p>Synthetic shared workbook</p>'))
  await page.goto(BASE);await page.locator('#workspace:not([hidden])').wait_for()
  assert 'partner@example.invalid' in await page.locator('#identity').inner_text()
  assert await page.locator('#shared-workbook').is_visible()
  assert await page.locator('#shared-sheet-open').get_attribute('href')=='https://docs.google.com/spreadsheets/d/SYNTHETIC_TEST_ONLY/edit'
  assert await page.locator('#shared-sheet-frame').get_attribute('src')=='https://docs.google.com/spreadsheets/d/SYNTHETIC_TEST_ONLY/edit?rm=minimal'
  assert await page.locator('#shared-sheet-frame').get_attribute('referrerpolicy')=='no-referrer'
  assert await page.locator('#campaign-form,#station-form,#request-list').count()==0
  form=page.locator('#ticket-form');await page.locator('#tickets details summary').click()
  await form.locator('[name=title]').fill('Synthetic shared ticket');await form.locator('[name=description]').fill('Discussion visible to all test partners.')
  await form.locator('button').click();await form.locator('[data-result]').filter(has_text='Ticket saved').wait_for()
  assert await page.locator('#ticket-list article').count()==1
  await page.reload();await page.locator('#ticket-list article').wait_for();await page.locator('#ticket-list button').click();await page.locator('#comment-form').wait_for()
  comment=page.locator('#comment-form');await comment.locator('textarea').fill('First synthetic comment.');await comment.locator('button').click();await page.get_by_text('First synthetic comment.',exact=True).wait_for()
  other=await browser.new_context(extra_http_headers={'X-Synthetic-User':'other@example.invalid'})
  op=await other.new_page();await op.route('https://docs.google.com/**',lambda route:route.fulfill(status=200,content_type='text/html',body='<p>Synthetic shared workbook</p>'));await op.goto(BASE);await op.locator('#ticket-list button').click();await op.locator('#comment-form').wait_for()
  assert not await op.locator('#resolve-ticket').is_visible()
  await op.locator('#comment-form textarea').fill('Reply from another authorized partner.');await op.locator('#comment-form button').click();await op.get_by_text('Reply from another authorized partner.',exact=True).wait_for()
  coord=await browser.new_context(extra_http_headers={'X-Synthetic-User':'coordinator@example.invalid'})
  cp=await coord.new_page();await cp.route('https://docs.google.com/**',lambda route:route.fulfill(status=200,content_type='text/html',body='<p>Synthetic shared workbook</p>'));cp.on('pageerror',lambda e:errors.append(str(e)));await cp.goto(BASE);await cp.locator('#ticket-list button').click();await cp.locator('#resolve-ticket').click();await cp.locator('#detail-status').filter(has_text='Resolved').wait_for()
  await page.reload();await page.locator('#workspace:not([hidden])').wait_for();await page.locator('#detail-status').filter(has_text='Resolved').wait_for()
  assert await page.locator('#comment-list li').count()==2
  await page.select_option('#ticket-filter','resolved');assert await page.locator('#ticket-list article').count()==1
  await page.fill('#ticket-search','missing-ticket');assert await page.locator('#ticket-empty').is_visible();await page.fill('#ticket-search','')
  for view in [page,cp]:
   assert await view.locator('#coordination-inbox,#inbox-nav,#sampling,#documents,#upload-panel').count()==0
   assert not await view.locator('#delete-ticket').is_visible()
  for width in [375,768,1440]:
   await page.set_viewport_size({'width':width,'height':900})
   assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),f'Workspace overflow at {width}'
   await page.evaluate('scrollTo(0,0)')
   await page.screenshot(path=f'test-results/partners-{width}.png',full_page=True)
  # A rejected write preserves the draft and never claims success.
  await page.route('**/api/tickets',lambda route:route.fulfill(status=503,json={'error':'The ticket could not be saved.'}))
  await page.locator('#tickets details summary').click();await form.locator('[name=title]').fill('Synthetic failure');await form.locator('[name=description]').fill('Keep this draft on failure.');await form.locator('button').click();await form.locator('[data-result]').filter(has_text='could not be saved').wait_for();assert await form.locator('[name=title]').input_value()=='Synthetic failure'
  owner=await browser.new_context(extra_http_headers={'X-Synthetic-User':'owner@example.invalid'})
  admin=await owner.new_page();admin.on('pageerror',lambda e:errors.append(str(e)))
  await admin.route('https://docs.google.com/**',lambda route:route.fulfill(status=200,content_type='text/html',body='<p>Synthetic shared workbook</p>'))
  await admin.goto(BASE);await admin.locator('#ticket-list button').click();await admin.locator('#delete-ticket').wait_for()
  admin.once('dialog',lambda dialog:dialog.dismiss());await admin.locator('#delete-ticket').click();assert await admin.locator('#ticket-detail').is_visible()
  await admin.route('**/api/tickets/*',lambda route:route.fulfill(status=503,json={'error':'Deletion unavailable'}) if route.request.method=='DELETE' else route.continue_())
  admin.once('dialog',lambda dialog:dialog.accept());await admin.locator('#delete-ticket').click();await admin.locator('#detail-error').filter(has_text='Deletion unavailable').wait_for();assert await admin.locator('#ticket-detail').is_visible()
  await admin.unroute('**/api/tickets/*')
  ticket_url=admin.url
  admin.once('dialog',lambda dialog:dialog.accept());await admin.locator('#delete-ticket').click();await admin.locator('#status').filter(has_text='Ticket deleted.').wait_for()
  assert await admin.locator('#ticket-list article').count()==0
  assert not await admin.locator('#ticket-detail').is_visible()
  await page.unroute('**/api/tickets');await page.reload();await page.locator('#workspace:not([hidden])').wait_for();assert await page.locator('#ticket-list article').count()==0
  await admin.goto(ticket_url);await admin.locator('#detail-error').filter(has_text='Ticket not found.').wait_for()
  assert not errors,errors
  await browser.close();print('PASS: shared tickets, cross-member comments, resolution/history, failed-save draft, owner-only deletion (cancel/failure/success) and three widths')
server=subprocess.Popen(['node','tests/portal-preview.mjs'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env={**os.environ,'GLOBO_PORTAL_PORT':str(PORT)})
try:
 for _ in range(100):
  try:urllib.request.urlopen(BASE,timeout=1).close();break
  except OSError:time.sleep(.1)
 Path('test-results').mkdir(exist_ok=True);asyncio.run(main())
finally:server.terminate();server.wait(timeout=5)
