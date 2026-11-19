"""Start actual Shiny process and verify an HTTP response; no deployment credentials."""
import subprocess,time,urllib.request,os,sys
port=int(os.getenv('GLOBE_SHINY_PORT','8766'))
url=f'http://127.0.0.1:{port}'
proc=subprocess.Popen(['Rscript','-e',f'shiny::runApp("shiny/globe-monitoring",host="127.0.0.1",port={port},launch.browser=FALSE)'])
try:
 for _ in range(60):
  if proc.poll() is not None:raise RuntimeError('Shiny exited before startup')
  try:
   with urllib.request.urlopen(url,timeout=1) as response:
    body=response.read().decode();assert 'GLOBE Ocean Monitoring' in body;break
  except OSError:time.sleep(.5)
 else:raise RuntimeError('Shiny startup timeout')
 print('PASS: actual Shiny startup and HTTP response')
 if os.getenv('GLOBE_SHINY_BROWSER')=='true':
  subprocess.run([sys.executable,'tests/shiny-browser.py'],check=True,env={**os.environ,'GLOBE_SHINY_URL':url})
finally:
 proc.terminate()
 try:proc.wait(timeout=5)
 except subprocess.TimeoutExpired:proc.kill()
