# GLOBE verification status

Updated 19 November 2026. Work in progress; this file records executed checks.

| Component | Actual status |
| --- | --- |
| Website | Real Quarto 1.11.9 render of 11 pages passed; generated links and public-output checks passed |
| Browser | Chromium tests passed: 29 demo points, search, category, popup, modes, synthetic quantitative fixture, all pages, Join draft, RONI chart; screenshots at 375, 768 and 1440 px |
| Python | Six unit tests passed |
| Node | Contact draft test suite passed |
| NOAA SST | Live official download succeeded: 18 November 2026, 8,467 cells; missing/land values omitted |
| NOAA RONI | Live official refresh succeeded: 921 seasons; full series and provenance cached |
| R / renv | R 4.3.3 present; bootstrap corrected to refresh a previously failed CRAN index; full dependency installation still running |
| Shiny | Four module sources supplied; actual startup and browser sessions still pending dependency installation |
| Station register | Approved register empty; demo registry remains separate and approximate |
| Google Sheets | Synthetic R pipeline tests pending installation; live Sheet authentication not configured |
| Copernicus | Extraction disabled; no account or approved station–cell mapping supplied |
| GitHub | Authorized LDoni/globe-website exists and is initially empty; push/Pages workflow being prepared |
| Cloudflare / shinyapps.io | No authenticated deployment; actual shinyapps.io plan not verified |
| Join | Local email draft only; approved recipient still required; no message sent |
| Restricted material | No private documents included in repository or static artifact |

Local static preview: http://127.0.0.1:8765 (while the server is running).

Corrections so far: CRAN empty-index caching, missing content directories in the entry generator, empty Quarto listings causing browser exceptions, browser assumptions about hidden generated titles and available NOAA data. A generated Quarto title is hidden by the established theme; each page has one visible h1.

Remaining release work: finish/restore the complete renv lock, run R tests and real Shiny startup/module browser checks, verify native content listings with isolated synthetic entries, complete responsive scientific-chart checks, observe GitHub Actions and the public hostname. Authentication is required for Cloudflare, Sheets and shinyapps.io; actual station metadata and reviewed mappings require coordinator approval. No purchases or subscription changes.
