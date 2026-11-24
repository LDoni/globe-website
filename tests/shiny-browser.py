"""Browser acceptance tests against a running real Shiny process."""
import asyncio, os
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  page=await browser.new_page(viewport={"width":1440,"height":1000})
  errors=[]
  page.on("pageerror",lambda e:errors.append(str(e)))
  await page.route("https://server.arcgisonline.com/**",lambda r:r.abort())
  await page.goto(os.getenv("GLOBO_SHINY_URL","http://127.0.0.1:8766"))
  await page.locator("#enso-latest").filter(has_text="RONI").wait_for()
  await page.locator("#enso-trend img").wait_for()
  assert await page.locator("#enso-table tbody tr").count()>0
  await page.get_by_role("link",name="Global Ocean Conditions",exact=True).click()
  await page.locator("#ocean-map .leaflet-control-zoom").wait_for()
  await page.locator("#ocean-metadata").filter(has_text="NOAA").wait_for()
  assert await page.locator("#ocean-date option").count()>0
  if await page.locator("#ocean-date option").count()>1:
   second=await page.locator("#ocean-date option").nth(1).inner_text()
   await page.select_option("#ocean-date",index=1)
   await page.locator("#ocean-metadata").filter(has_text=second).wait_for()
  await page.get_by_role("link",name="Station Explorer",exact=True).click()
  await page.locator("#stations-status").filter(has_text="No approved stations").wait_for()
  await page.get_by_role("link",name="Data Explorer",exact=True).click()
  await page.get_by_role("heading",name="Data explorer",exact=True).wait_for()
  for width in [375,768,1440]:
   await page.set_viewport_size({"width":width,"height":900})
   await page.evaluate("Shiny.setInputValue('tabs','ENSO Overview')")
   await page.evaluate("document.querySelector('[data-value=\"ENSO Overview\"]').click()")
   await page.wait_for_function("document.documentElement.scrollWidth <= innerWidth+1",timeout=10000)
   Path("test-results").mkdir(exist_ok=True)
   await page.screenshot(path=f"test-results/shiny-{width}.png",full_page=True)
  assert not await page.locator('.shiny-output-error:not(.shiny-output-error-validation)').count()
  assert not errors,errors
  await browser.close()
  print("PASS: actual Shiny websocket session, four modules, NOAA plot/map and three viewport widths")
asyncio.run(main())
