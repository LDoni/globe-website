# GLOBE verification and launch status

Updated 20 November 2026. The organization-domain deployment is being finalized; outcomes below distinguish executed tests from configuration still required.

| Component | Verified outcome |
| --- | --- |
| Quarto website | Real 11-page render, public-output and local-link checks passed; supplied GLOBE logo integrated |
| Browser | Chromium: filters/search/popups, station overlay toggle and layer order, modes, RONI numerical table, year comparison and SVG export; responsive pages at 375/768/1440 px |
| Content lists | Actual isolated Quarto build with synthetic news/publication entries: homepage, News and Resources listings passed; fixtures excluded from public build |
| Python | 9 unit tests passed, including NOAA failure preservation, Copernicus credential/mapping gates, two-file rollback and antimeridian distance |
| Node | 4 enquiry-draft tests passed; website scripts parse |
| R | Station/schema/privacy tests, NOAA parsing and Shiny module tests passed; local testthat emits LC_ALL locale warnings without failures |
| Dependencies | Complete renv lock: 115 recorded versions; restore into a clean library and exact version comparison passed, including R recommended packages |
| NOAA | Official RONI: 921 seasons. SST: 18 Nov (8,467 cells) and 17 Nov (8,455 cells). First-frame cells and all RONI values independently matched a second live official response |
| Shiny | Real process and HTTP/WebSocket browser session passed with the restored library; all four modules load at three viewport widths |
| Workbook | 30 draft rows imported locally; no private fields exported, no approximate coordinates promoted. Separate local preview only |
| Google Sheets | Synthetic canonical and workbook-schema pipeline tests passed; live read-only authentication and real sheet ID not configured |
| GitHub | Previous LDoni Pages release and full CI passed. Organization root-domain repository created; final push/deployment verification pending |
| Cloudflare | Workflow retained and gated; account not authenticated, no deployment claimed |
| shinyapps.io | App bundle/deployment script prepared and gated; actual account, plan and usage not verified; no cloud Shiny URL |
| Copernicus | Adapter gates, geometry and rollback tested; live extraction disabled pending credentials and reviewed station–cell mappings |
| Join | Browser-verified local email draft; no server send or delivery confirmation. Approved recipient still needed |

## Addresses

- Intended primary site: https://globe-ocean.github.io/ (confirm final deployment below).
- Previous verified release: https://ldoni.github.io/globe-website/.
- Local public-site preview: http://127.0.0.1:8765/.
- Local Shiny dashboard: http://127.0.0.1:8766/.
- Local-only workbook preview: http://127.0.0.1:8768/ (start with documented helper; do not deploy this folder).

## Scientific and operational limits

The initial scope is 30 stations and the declared 23 countries. The workbook has 24 raw country labels requiring coordinator review; it does not redefine the approved country count. All its station rows are draft and its map coordinates are schematic. The approved public register remains empty; the separate 29-point legacy demo is explicitly approximate. An approval decision is required before publishing the workbook's preliminary coordinates.

The Shiny Data Explorer is a transparent future-results placeholder. Station Explorer correctly reports no approved stations or station measurements. No unpublished microbiological results, confidential documents, contacts, internal notes, XLSX intake files or credentials enter the public artifact. NOAA RONI, SST analyses and official forecasts remain distinct; no single-value ENSO classification is made.

Climate Pulse is linked as the official C3S/ECMWF ERA5 application. Its current `frame-ancestors 'self'` / `SAMEORIGIN` headers prohibit an external iframe. GLOBE's own year-comparison chart uses explicitly attributed NOAA RONI, with pointer inspection and SVG export. The supplied logo is branding, not a quantitative SST map.

For full operational launch, supply the Join recipient, connect the private Google Sheet, approve sampling coordinates/categories, authenticate Cloudflare if still wanted, and authenticate shinyapps.io with actual plan/usage verification. Copernicus additionally needs reviewed sea-cell mappings. No subscription changes, purchases, domain registrations or private-document publication occurred.
