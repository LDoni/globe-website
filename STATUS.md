# GLOBE verification and launch status

Updated 20 November 2026. Public URL: **https://globe-ocean.github.io/**. Primary source: **globe-ocean/globe-ocean.github.io**. Previous commits completed both Pages and the full R/Shiny CI; the latest design/data update is being deployed and is verified locally as below.

| Component | Executed verification |
| --- | --- |
| Quarto | Real 11-page render; public-output and local-link checks passed |
| Branding/navigation | Supplied transparent PNG, light background, five sticky navigation links; mobile/tablet/desktop checks passed |
| Station map | 30 public network points from editable CSV; search, category filters, popup, date selection and marker layer order verified; one background selector; no Niño rectangle |
| NOAA rasters | Official 1800×900 WMS PNGs for 17/18 Nov 2026 loaded in a real browser, with original legends; local Natural Earth coastlines and geographic EPSG:4326 projection |
| NOAA numerical data | 921 RONI seasons and both SST numeric grids independently matched official responses; missing values preserved |
| ERA5 | 17,488 dates per Niño region; all 69,952 cached rows matched original C3S/ECMWF CSV intakes |
| Interactive statistics | Four regions, date changes, absolute/anomaly curves, same-calendar-date ranks and comparison years verified against cached numeric rows |
| Browser | Chromium at 375, 768 and 1440 px: navigation, map controls, contact draft, charts, SVG export, sticky header and horizontal overflow checks passed |
| Python | 12 unit tests passed: provider schema/units/baselines, missing values, publication separation, atomic-update failure and rollback gates |
| Node | 4 contact tests and 6 partner-access security tests passed; all site scripts parse |
| R/Shiny | R parsing and station/privacy/module tests passed; real Shiny HTTP/WebSocket session and all four modules passed across three viewport sizes |
| renv | Complete 115-version lock; clean-library restore and exact version comparison passed. CRAN fallback handles a lagging CI binary mirror |
| News/publications | Actual isolated Quarto build with synthetic entries verified homepage, News and Resources listings; fixtures excluded from public artifact |
| GitHub | Pages and full R/Shiny CI passed on 9ed0d64 and a8606e8. Inspect Actions for the latest design/data commit |
| Cloudflare private workspace | Separate canary Pages project files, origin JWT checks and local security tests prepared; account authentication and partner allowlist still required |
| Sheets | Synthetic canonical/workbook-schema validation passed; real Sheet ID/read-only authentication not connected |
| shinyapps.io | No cloud deployment; actual account plan/usage verification and deployment credentials still required |
| Copernicus Marine | Live station extraction disabled; credentials and approved station–sea-cell mappings required |
| Join | Local email draft only; no server send and no delivery confirmation. Destination address not selected yet |

## Data publication and remaining limits

The public network is maintained through `data/network-stations.csv`; build-time validation generates the public GeoJSON. Display metadata remains distinct from `data/stations.csv`, the separate approved scientific-coordinate source used by extraction/Shiny station time series. The latter currently has no approved records. Workbook files, private contacts, notes and credentials are excluded from Git/deployment.

ERA5 rank compares the same calendar date across available years, not different seasons. Source quality/status and retrieval time are retained. The official CSV sampling notes identify 12 UTC SST; no daily-mean or forecast interpretation is silently substituted. NOAA RONI, daily ERA5, NOAA CRW and official ENSO forecasts remain separate. No ENSO status is classified from a single value.

Shiny is locally executable; Data Explorer remains an explicit future-results placeholder and station environmental measurements are not configured. Its global map retains the numerical display cache. The static public dashboard has the higher-resolution cached NOAA rendering and ERA5 interactivity.

The Cloudflare account file supplied by the owner contains only an account ID. Wrangler reports no authenticated session; its OAuth scopes cover Pages but not Access administration. Pages/Access configuration needs authorized credentials and the partner identities before live tests and confidential upload. No private document has been deployed, no paid service purchased and no subscription changed.

Local commands/addresses are documented in README: static preview on 127.0.0.1:8765 and Shiny on 127.0.0.1:8766 when started. Local browser tests can start their own temporary server with `GLOBE_START_SITE=true`.

Map-date update: large observation-date banner plus a separate UTC last-update label. Cached raster retrieval times now survive Git checkout/file timestamp changes; the regression test passed.

Visual update: a restrained ocean-grey page background with lighter reading surfaces replaces the plain white canvas.
