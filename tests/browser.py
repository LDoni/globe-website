"""Browser behavior tests against a rendered Quarto site or Pandoc fallback.
Run: GLOBO_TEST_URL=http://127.0.0.1:8765 python tests/browser.py
Optional GLOBO_CHROMIUM_PATH for environments with a system browser.
"""
import asyncio,json,os,subprocess,sys,time,urllib.request,urllib.parse
from pathlib import Path
from playwright.async_api import async_playwright
BASE=os.getenv('GLOBO_TEST_URL','http://127.0.0.1:8765').rstrip('/')
async def main():
 async with async_playwright() as p:
  args={'headless':True}
  if os.getenv('GLOBO_CHROMIUM_PATH'):args['executable_path']=os.environ['GLOBO_CHROMIUM_PATH']
  browser=await p.chromium.launch(**args)
  page=await browser.new_page(viewport={'width':1440,'height':1000});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  # Avoid contacting production intake/Turnstile during generic navigation tests.
  await page.route('**/assets/site-config.json',lambda route:route.fulfill(json={'shiny_url':None,'contact_email':'luigi.vezzulli@unige.it','contact_endpoint':None,'turnstile_site_key':None}))
  # Basemap is an external service; behavior tests deliberately run without tiles.
  await page.route('https://server.arcgisonline.com/**',lambda route:route.abort())
  await page.goto(BASE+'/pages/network.html');await page.locator('[data-status]').filter(has_text='network stations').wait_for()
  assert await page.locator('.coordination-team h3').all_text_contents()==['Jaime Martinez-Urtaza','Luigi Vezzulli','Salvador Almagro-Moreno']
  assert await page.locator('.coordination-team .card p').all_text_contents()==['Jaime.Martinez.Urtaza[AT]uab.cat','luigi.vezzulli[AT]unige.it','salvador.almagromoreno[AT]stjude.org']
  assert await page.locator('.coordination-institution img').evaluate_all("imgs=>imgs.map(i=>i.getAttribute('src'))")==['../assets/images/partners/uab.png','../assets/images/partners/unige.png','../assets/images/partners/st-jude.svg']
  await page.wait_for_function("[...document.querySelectorAll('.coordination-institution img')].every(i=>i.complete&&i.naturalWidth>0)")
  assert await page.locator('.coordination-team .card').evaluate_all("cards=>cards.every(c=>getComputedStyle(c).textAlign==='center')")
  assert await page.evaluate("document.querySelector('.coordination-team').compareDocumentPosition(document.querySelector('.participating-countries')) & Node.DOCUMENT_POSITION_FOLLOWING")
  registry=await page.evaluate('fetch(new URL("../data/network-stations.geojson",location.href)).then(r=>r.json())');expected=len(registry['features']);incursion=sum(f['properties']['category']=='incursion' for f in registry['features'])
  countries={f['properties']['country'] for f in registry['features']}
  assert await page.locator('[data-country-flags] li').count()==len(countries)
  await page.wait_for_function("[...document.querySelectorAll('[data-country-flags] img')].every(i=>i.complete&&i.naturalWidth>0)")
  await page.locator('.station-item').nth(expected-1).wait_for();assert await page.locator('.station-item').count()==expected
  assert await page.locator('.leaflet-stationMarkers-pane path').evaluate_all("paths=>paths.length>0&&paths.every(p=>p.getAttribute('stroke')==='#000000'&&Number(p.getAttribute('stroke-width'))>=1.8&&Number(p.getAttribute('fill-opacity'))>=.5)")
  await page.fill('[data-search]','Fiji');assert await page.locator('.station-item').count()>=1
  await page.locator('.station-item').first.click();await page.locator('.leaflet-popup-content').wait_for();assert 'Fiji' in await page.locator('.leaflet-popup-content').inner_text()
  await page.click('[data-reset]');await page.select_option('[data-category]','incursion');assert await page.locator('.station-item').count()==incursion
  await page.select_option('[data-sampling-status]','active');expected_active=sum(f['properties'].get('sampling_status')=='active' for f in registry['features'] if f['properties']['category']=='incursion');assert await page.locator('.station-item').count()==expected_active
  await page.select_option('[data-sampling-status]','');assert await page.locator('.station-item').count()==incursion
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
  # Join is unavailable until the real service is configured; synthetic routes
  # exercise the direct transport without sending any real enquiry.
  join_mode={'enabled':False,'fail':False};submitted=[]
  async def contact_config(route):
   await route.fulfill(json={'shiny_url':None,'contact_email':'luigi.vezzulli@unige.it','contact_endpoint':'https://join.synthetic.workers.dev/api/join' if join_mode['enabled'] else None,'turnstile_site_key':'synthetic-site-key' if join_mode['enabled'] else None})
  async def contact_worker(route):
   headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'}
   if route.request.method=='OPTIONS':await route.fulfill(status=200,headers=headers);return
   if route.request.url.endswith('/health'):await route.fulfill(status=200,headers=headers,json={'configured':True});return
   submitted.append(route.request.post_data_json)
   if join_mode['fail']:await route.fulfill(status=503,headers=headers,json={'error':'Could not confirm receipt.'})
   else:await route.fulfill(status=201,headers=headers,json={'ok':True,'receipt':'synthetic-receipt'})
  await page.route('**/assets/site-config.json',contact_config)
  await page.route('https://join.synthetic.workers.dev/**',contact_worker)
  await page.route('https://challenges.cloudflare.com/turnstile/**',lambda route:route.fulfill(content_type='text/javascript',body="window.turnstile={render:function(e,o){window.syntheticChallenge=o;o.callback('synthetic-token');return 'widget';},reset:function(){window.syntheticChallenge.callback('synthetic-token-next');}};"))
  await page.goto(BASE+'/pages/join.html');await page.locator('[data-join-availability]').filter(has_text='not available').wait_for();assert await page.locator('[data-join-form]').is_hidden()
  join_mode['enabled']=True
  await page.reload();await page.locator('[data-join-form]:not([hidden])').wait_for()
  for selector,value in [('#join-name','Synthetic test researcher'),('#join-email','test@example.invalid'),('#join-institution','TEST INSTITUTION'),('#join-country','Test country'),('#join-message','Synthetic browser validation only.')]:await page.fill(selector,value)
  await page.select_option('#join-interest',label='Scientific collaboration');await page.check('[name=consent]');await page.click('[data-join-form] button[type=submit]')
  await page.locator('[data-join-status]').filter(has_text='synthetic-receipt').wait_for()
  assert submitted[0]['email']=='test@example.invalid' and submitted[0]['consent'] is True
  assert await page.locator('[data-join-draft]').count()==0
  assert 'email sent' not in (await page.locator('[data-join-status]').inner_text()).lower()
  join_mode['fail']=True
  for selector,value in [('#join-name','Synthetic retry'),('#join-email','retry@example.invalid'),('#join-institution','TEST INSTITUTION'),('#join-country','Test country'),('#join-message','Keep this unsent form.')]:await page.fill(selector,value)
  await page.select_option('#join-interest',label='Scientific collaboration');await page.check('[name=consent]');await page.click('[data-join-form] button[type=submit]')
  await page.locator('[data-join-status]').filter(has_text='Could not confirm receipt').wait_for();assert await page.locator('#join-message').input_value()=='Keep this unsent form.'
  await page.goto(BASE+'/pages/monitoring.html');assert await page.locator('[data-network]').count()==0;await page.locator('[data-enso-summary] strong').wait_for();assert await page.locator('[data-enso-chart] svg').count()==1
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
  for width in [375,768,1024,1440]:
   await page.set_viewport_size({'width':width,'height':900});await page.goto(BASE+'/index.html')
   await page.locator('[data-logo-motion]').wait_for()
   assert await page.locator('[data-logo-motion-toggle]').count()==0
   assert await page.locator('.monitor-band, [data-enso-summary]').count()==0
   assert await page.locator('script[src$="assets/js/monitoring.js"]').count()==0
   headline=page.locator('.world-news-card h3 a[href^="https://"]')
   assert await headline.is_visible()
   assert len(await headline.inner_text())>100
   assert await headline.get_attribute('href')=='https://www.dailymail.com/sciencetech/article-16314697/Super-El-Nino-MEGA-temperatures-skyrocket.html'
   assert await headline.evaluate('(e)=>getComputedStyle(e).webkitLineClamp') in ['none','']
   world=await page.locator('.world-news').bounding_box();updates=await page.locator('.project-news').bounding_box()
   if width>850:assert world['x']+world['width']<=updates['x']
   else:assert world['y']+world['height']<=updates['y']
   home_text=await page.locator('#main-content').inner_text()
   assert 'PEOPLE & PARTNERS' not in home_text and 'The oceanographic context' not in home_text

   assert await page.locator('[data-network]').count()==0
   assert await page.locator('.network-overview img').count()==1
   assert 'globo-sampling-network.png' in await page.locator('.network-overview img').get_attribute('src')
   assert await page.locator('.network-overview').evaluate('(e)=>e.getBoundingClientRect().top') < await page.locator('.stats').evaluate('(e)=>e.getBoundingClientRect().top')
   await page.locator('[data-network-count]').filter(has_text=str(len(registry['features']))).wait_for()
   assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),f'Overflow at {width}'
   assert await page.locator('.nav-links a[href="https://globe-partners.pages.dev/"]').count()==1
   assert await page.locator('.coordinator-logos img').count()==3
   assert [s.rsplit('/',1)[-1] for s in await page.locator('.coordinator-logos img').evaluate_all('(imgs)=>imgs.map(i=>i.src)')]==['unige.png','uab.png','st-jude.svg']
   boxes=await page.locator('.coordinator-logos a').evaluate_all('(links)=>links.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))')
   assert max(b['width'] for b in boxes)-min(b['width'] for b in boxes)<2
   assert max(b['height'] for b in boxes)-min(b['height'] for b in boxes)<2
   middle=await page.locator('.coordinator-logos a').nth(1).bounding_box()
   assert abs(middle['x']+middle['width']/2-width/2)<2,f'Institutional logos not centered at {width}'
   assert await page.locator('.nav-links a').first.evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)')>=16
   if width>=851:
    brand=await page.locator('.brand').bounding_box();first_logo=await page.locator('.coordinator-logos a').first.bounding_box()
    assert brand['x']+brand['width']<=first_logo['x'],f'Brand and institutions overlap at {width}'
   assert await page.locator('.coordinator-logos').is_visible()
   assert await page.evaluate("[...document.querySelectorAll('.coordinator-logos img')].every(i=>i.complete&&i.naturalWidth>0)")
   await page.locator('[data-logo-motion]').scroll_into_view_if_needed()
   await page.wait_for_function("document.querySelector('[data-logo-motion]').dataset.motion==='running'")
   assert (await page.locator('.hero h1').inner_text())=='A Global Initiative to Uncover Ocean Microbiome Responses to Super El Niño in a Warming World.'
   assert await page.locator('.logo-current-overlay').count()==0
   video=page.locator('.hero-logo-video');assert await video.count()==1
   assert await video.evaluate('(v)=>v.autoplay&&v.muted&&v.loop&&v.playsInline&&!v.controls')
   assert await video.evaluate('(v)=>v.videoWidth===480&&v.videoHeight===480')
   positions=[];frames=[]
   if width==1440:
    await page.locator('[data-logo-motion]').evaluate("root=>{const probe=document.createElement('div');probe.dataset.currentProbe='';probe.style.cssText='position:absolute;left:42%;top:42%;width:13%;height:20%;pointer-events:none';root.append(probe)}")
   for _ in range(3):
    positions.append(await video.evaluate('(v)=>v.currentTime'))
    if width==1440:frames.append(await page.locator('[data-current-probe]').screenshot())
    await page.wait_for_timeout(800)
   assert max(positions)-min(positions)>.6,'Supplied logo video must advance during normal playback'
   if width==1440:
    assert len(set(frames))>1,'Warm currents in the first O must visibly move, independently of the second O'
    Path('test-results').mkdir(exist_ok=True)
    for i,frame in enumerate(frames):Path(f'test-results/first-o-flow-{i}.png').write_bytes(frame)
    await page.locator('[data-current-probe]').evaluate('(e)=>e.remove()')
    await video.evaluate('(v)=>{v.pause();v.currentTime=5}')
    await page.wait_for_function("!document.querySelector('.hero-logo-video').seeking")
    await page.locator('.microbe-disc').evaluate("e=>e.style.animationPlayState='paused'")
    effect=await video.get_attribute('style')
    await video.evaluate("v=>v.style.filter='none'")
    await page.locator('[data-logo-motion]').screenshot(path='test-results/currents-before.png')
    await video.evaluate('(v,effect)=>v.setAttribute("style",effect)',effect)
    await page.locator('[data-logo-motion]').screenshot(path='test-results/currents-after.png')
    await video.evaluate('(v)=>v.play()')
    await page.locator('.microbe-disc').evaluate("e=>e.style.animationPlayState=''")
   disc=page.locator('.microbe-disc')
   assert await disc.evaluate('(e)=>getComputedStyle(e).animationDuration')=='72s'
   assert await disc.evaluate('(e)=>getComputedStyle(e).animationIterationCount')=='infinite'
   assert await page.locator('.microbe-disc img').evaluate('(i)=>i.complete&&i.naturalWidth===2172')
   globe_box=await page.locator('.current-orbit').bounding_box()
   assert abs(globe_box['width']-globe_box['height'])<1,'Globe crop must stay circular at every viewport'
   angle1=await disc.evaluate('(e)=>{const m=new DOMMatrixReadOnly(getComputedStyle(e).transform);return Math.atan2(m.m12,m.m11)*180/Math.PI;}')
   await page.wait_for_timeout(800)
   angle2=await disc.evaluate('(e)=>{const m=new DOMMatrixReadOnly(getComputedStyle(e).transform);return Math.atan2(m.m12,m.m11)*180/Math.PI;}')
   assert .5<(angle2-angle1)%360<12,'Second O must rotate slowly and continuously'
   # Letter pixels and the crop corner must equal the PNG even with opaque black video.
   await video.evaluate('(v)=>{v.pause();v.currentTime=5}')
   await page.wait_for_function("!document.querySelector('.hero-logo-video').seeking")
   await disc.evaluate("e=>e.style.animationPlayState='paused'")
   await page.wait_for_timeout(100)
   await page.locator('[data-logo-motion]').evaluate("root=>{for(const [name,box] of Object.entries({letters:'left:0;top:0;width:35%;height:100%',b:'left:59%;top:0;width:14%;height:100%',corner:'left:36.003683%;top:19.337017%;width:2.2099448%;height:6.6298343%'})){const e=document.createElement('div');e.dataset.opacityProbe=name;e.style.cssText='position:absolute;pointer-events:none;'+box;root.append(e)}}")
   await video.evaluate("v=>v.style.visibility='hidden'")
   png_letters=[await page.locator(f'[data-opacity-probe={name}]').screenshot() for name in ['letters','b','corner']]
   await video.evaluate("v=>{v.style.visibility='';v.style.background='black'}")
   opaque_letters=[await page.locator(f'[data-opacity-probe={name}]').screenshot() for name in ['letters','b','corner']]
   assert png_letters==opaque_letters,f'Opaque video must leave letters and outside-globe corners equal to the PNG at {width}px'
   Path('test-results').mkdir(exist_ok=True)
   await page.locator('[data-logo-motion]').screenshot(path=f'test-results/opaque-video-black-{width}.png')
   await page.locator('[data-opacity-probe]').evaluate_all('(nodes)=>nodes.forEach(e=>e.remove())')
   await video.evaluate("v=>{v.style.background='';return v.play()}")
   await disc.evaluate("e=>e.style.animationPlayState=''")
   await page.locator('.network-overview img').scroll_into_view_if_needed()
   await page.wait_for_function("document.querySelector('.network-overview img').naturalWidth===1743")
   assert 'Use the pause/play button' not in await page.locator('body').inner_text()
   await page.evaluate('scrollTo(0,800)');await page.wait_for_timeout(100);assert abs((await page.locator('header.site-nav').bounding_box())['y'])<=1
   await page.evaluate('scrollTo(0,0)')
   if width<850:
    await page.click('.menu-toggle');assert await page.locator('.menu-toggle').get_attribute('aria-expanded')=='true'
    await page.click('.menu-toggle')
   Path('test-results').mkdir(exist_ok=True);await page.screenshot(path=f'test-results/home-{width}.png',full_page=True)
   await page.locator('.world-news-card').screenshot(path=f'test-results/world-news-{width}.png')
   for slug in ['pages/network.html','pages/monitoring.html','pages/join.html','pages/protocol.html']:
    await page.goto(BASE+'/'+slug)
    await page.wait_for_load_state('networkidle')
    assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),f'{slug}: overflow at {width}'
    if slug in ['pages/network.html','pages/join.html']:
     assert await page.locator('.project-email a').get_attribute('href')=='mailto:globo-initiative@googlegroups.com'
     assert await page.locator('.project-email a').is_visible()
    if slug=='pages/network.html':
     preview=page.locator('.observatory-preview')
     assert await preview.locator('h3').inner_text()=='Italian Omics Observatory Network of Marine Biodiversity'
     assert await preview.locator('.observatory-image').get_attribute('href')=='https://www.marineomics.it/'
     await preview.scroll_into_view_if_needed()
     await page.wait_for_function("document.querySelector('.observatory-preview img').complete&&document.querySelector('.observatory-preview img').naturalWidth>0")
     await preview.screenshot(path=f'test-results/marineomics-{width}.png',style='header.site-nav{visibility:hidden}')
     assert await page.locator('[data-country-flags] img').first.evaluate('(i)=>i.getBoundingClientRect().width') >= (40 if width<=550 else 48)
     station_ids=await page.evaluate("fetch(new URL('../data/network-stations.geojson',location.href)).then(r=>r.json()).then(d=>d.features.map(f=>f.properties.station_id))")
     assert all(s.startswith('GLOBO-') for s in station_ids)
    if slug=='pages/protocol.html':
     assert await page.locator('.protocol-document iframe,.protocol-document embed,.protocol-document object').count()==0
     sheet=page.locator('.protocol-sheet img')
     await sheet.wait_for()
     await page.wait_for_function("document.querySelector('.protocol-sheet img').complete&&document.querySelector('.protocol-sheet img').naturalWidth>0")
     box=await sheet.bounding_box();assert abs(box['height']/box['width']-1135/720)<.01
     assert await sheet.evaluate('(i)=>getComputedStyle(i).height!=="0px"&&i.parentElement.scrollHeight<=i.parentElement.clientHeight+1')
     pdf=await page.request.get(BASE+'/assets/documents/globo-sampling-protocol.pdf');assert pdf.status==200
     assert await page.locator('.protocol-document a[download]').count()==1
     await sheet.scroll_into_view_if_needed()
     await sheet.screenshot(path=f'test-results/protocol-{width}.png',style='header.site-nav{visibility:hidden}')
    body=await page.locator('body').inner_text()
    assert 'Reading the two map modes' not in body
    assert 'Interactive Shiny application' not in body
    assert 'Please do not include unpublished results' not in body
    if slug=='pages/monitoring.html':
     cache=await page.evaluate('fetch(new URL("../data/monitoring/enso.json",location.href)).then(r=>r.json())')
     years=int(await page.locator('[data-years]').input_value())
     expected=[r for r in cache['records'] if r['year']>=cache['records'][-1]['year']-years+1]
     actual=await page.locator('[data-enso-table] tbody tr').all_text_contents()
     assert len(actual)==len(expected)
     for text,row in zip(actual,expected):assert f"{row['value']:.2f}" in text
     await page.screenshot(path=f'test-results/monitoring-{width}.png',full_page=True)
  await page.emulate_media(reduced_motion='reduce');await page.goto(BASE+'/index.html')
  assert await page.locator('[data-logo-motion]').get_attribute('data-motion')=='running'
  assert await page.locator('[data-logo-motion-toggle]').count()==0
  assert await page.locator('.microbe-disc').evaluate('(e)=>getComputedStyle(e).animationPlayState')=='running'
  await page.locator('[data-logo-motion]').scroll_into_view_if_needed()
  await page.wait_for_function("document.querySelector('[data-logo-motion]').dataset.motion==='running'")
  video=page.locator('.hero-logo-video');assert await video.evaluate('(v)=>!v.paused&&v.muted&&v.loop')
  reduced_positions=[]
  for _ in range(3):
   reduced_positions.append(await video.evaluate('(v)=>v.currentTime'))
   await page.wait_for_timeout(800)
  assert max(reduced_positions)-min(reduced_positions)>.6,'Requested continuous video must also run under reduced-motion media'
  await video.evaluate('(v)=>{v.currentTime=v.duration-.2}')
  await page.wait_for_function('document.querySelector(".hero-logo-video").currentTime<1.5&&!document.querySelector(".hero-logo-video").paused')
  # A fresh context prevents media-cache reuse from bypassing the failure fixture.
  late_context=await browser.new_context()
  late_page=await late_context.new_page()
  async def already_playing_script(route):
   await late_page.locator('.hero-logo-video').evaluate('(v)=>{v.muted=true;return v.play()}')
   await route.continue_()
  await late_page.route('**/assets/js/logo-video.js*',already_playing_script)
  await late_page.goto(BASE+'/index.html')
  await late_page.wait_for_function("document.querySelector('[data-logo-motion]').dataset.motion==='running'")
  assert await late_page.locator('.hero-logo-video').is_visible()
  await late_context.close()
  backup_context=await browser.new_context()
  backup_page=await backup_context.new_page()
  await backup_page.route('**/assets/videos/globo-currents-globe.mp4',lambda route:route.abort())
  await backup_page.goto(BASE+'/index.html')
  await backup_page.wait_for_function("document.querySelector('[data-logo-motion]').dataset.motion==='running'")
  assert await backup_page.locator('.hero-logo-video').evaluate("v=>v.currentSrc.endsWith('globo-currents-globe.webm')&&!v.paused")
  await backup_context.close()
  failed_media=await browser.new_context();failed_page=await failed_media.new_page()
  await failed_page.route('**/assets/videos/globo-currents-globe.*',lambda route:route.abort())
  async def delayed_logo_script(route):
   await asyncio.sleep(.3);await route.continue_()
  await failed_page.route('**/assets/js/logo-video.js*',delayed_logo_script)
  await failed_page.goto(BASE+'/index.html');await failed_page.wait_for_function("document.querySelector('[data-logo-motion]').dataset.motion==='fallback'")
  assert await failed_page.locator('.hero-art').is_visible();assert await failed_page.locator('.hero-art').evaluate('(i)=>i.complete&&i.naturalWidth===2172')
  assert not await failed_page.locator('.hero-logo-video').is_visible()
  await failed_media.close()
  nojs=await browser.new_context(java_script_enabled=False)
  nojs_page=await nojs.new_page();await nojs_page.goto(BASE+'/pages/join.html');assert await nojs_page.locator('button[type=submit]').is_disabled()
  await nojs.close()
  assert not errors,errors
  await browser.close();print('PASS: map filters, popups, mode switching, synthetic observed layer, navigation, cache chart and four viewport widths')
server=None
try:
 if os.getenv('GLOBO_START_SITE')=='true':
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
