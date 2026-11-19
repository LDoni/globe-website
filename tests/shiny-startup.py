"""Start actual Shiny process and verify an HTTP response; no deployment credentials."""
import subprocess,time,urllib.request
proc=subprocess.Popen(['Rscript','-e','shiny::runApp("shiny/globe-monitoring",host="127.0.0.1",port=8766,launch.browser=FALSE)'])
try:
 for _ in range(60):
  if proc.poll() is not None:raise RuntimeError('Shiny exited before startup')
  try:
   with urllib.request.urlopen('http://127.0.0.1:8766',timeout=1) as response:
    body=response.read().decode();assert 'GLOBE Ocean Monitoring' in body;break
  except OSError:time.sleep(.5)
 else:raise RuntimeError('Shiny startup timeout')
 print('PASS: actual Shiny startup and HTTP response')
finally:
 proc.terminate()
 try:proc.wait(timeout=5)
 except subprocess.TimeoutExpired:proc.kill()
