# GLOBE verification and launch status

Updated 21 November 2026. Public URL: **https://globe-ocean.github.io/**. Primary source: **globe-ocean/globe-ocean.github.io**. Previous commits completed both Pages and the full R/Shiny CI; the latest design/data update is being deployed and is verified locally as below.

| Component | Executed verification |
| --- | --- |
| Quarto | Real 11-page render; public-output and local-link checks passed |
| Branding/navigation | Supplied transparent PNG with animated ocean colours, supplied UniGe mark, light background and five sticky links; mobile/tablet/desktop checks passed |
| Station map | 30 public network points from editable CSV; search, category filters, popup, date selection and marker layer order verified; one background selector; no Niño rectangle |
| NOAA rasters | Official 1800×900 WMS PNGs for 17/18 Nov 2026 loaded in a real browser, with original legends; local Natural Earth coastlines and geographic EPSG:4326 projection |
| NOAA numerical data | 921 RONI seasons and both SST numeric grids independently matched official responses; missing values preserved |
| ERA5 | 17,488 dates per Niño region; all 69,952 cached rows matched original C3S/ECMWF CSV intakes |
| Interactive statistics | Four regions, date changes, absolute/anomaly curves, same-calendar-date ranks and comparison years verified against cached numeric rows |
| Browser | Chromium at 375, 768 and 1440 px: navigation, map controls, contact draft, charts, SVG export, sticky header and horizontal overflow checks passed |
| Python | 12 unit tests passed: provider schema/units/baselines, missing values, publication separation, atomic-update failure and rollback gates |
| Node | 4 contact, 7 partner-access, 6 workspace API and 2 private-build tests passed; all site scripts parse |
| R/Shiny | R parsing and station/privacy/module tests passed; real Shiny HTTP/WebSocket session and all four modules passed across three viewport sizes |
| renv | Complete 115-version lock; clean-library restore and exact version comparison passed. CRAN fallback handles a lagging CI binary mirror |
| News/publications | Actual isolated Quarto build with synthetic entries verified homepage, News and Resources listings; fixtures excluded from public artifact |
| GitHub | Pages and full R/Shiny CI passed on 9ed0d64 and a8606e8. Inspect Actions for the latest design/data commit |
| Cloudflare private workspace | Separate workspace implemented and tested locally with synthetic identities/documents; Access authentication, allowlists and KV binding still required |
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

Branding update (20 November): homepage SVG currents within the supplied PNG's O,
with pause and reduced-motion support and no preview instruction paragraph. Original
UAB, DISTAV/UniGe and St. Jude marks appear alongside GLOBE in the sticky header;
mobile uses a compact second row. Network flags derive from the public register's
country/country_iso2 fields, including future countries via local flag assets.
Institutional sources and flag licence are included with the assets. The supplied
workbook currently has 24 distinct country labels, while the declared project
scope remains 23; this discrepancy is retained here for coordinator reconciliation.
The scientific coordinate register remains unchanged.

This branding update passed a real 11-page Quarto render, 12 Python unit tests,
4 contact and 6 partner-access Node tests, credential/public-output checks and
Chromium tests at 375/768/1440 px. Browser checks include flag image loading,
three institutional marks, motion pause/play, reduced motion, sticky navigation,
map controls and climate statistics. Mobile screenshot was visually inspected.

## 21 November 2026 update

Scientific presentation now centres on the marine microbiome, using the original
full project title as the homepage heading. Vibrio remains a targeted research
component. The supplied colour UniGe logo replaces the DISTAV header mark.
The hero now animates the original ocean colours through a feathered open-water
SVG displacement mask, with pause/offscreen/reduced-motion handling.

The private workspace now has document/protocol search, campaign proposals,
station-change requests and coordinator review. Signed origin identities determine
request ownership and coordinator permissions; request storage requires a private
Cloudflare KV binding. No request changes scientific approvals or the public map.
A separate builder accepts only explicitly listed documents from outside this
public repository. Cloudflare is not authenticated (the supplied file still has
only an account ID); no real private deployment or confidential upload occurred.
Live Access plan/seats, allowlists, storage binding and hostname tests remain
necessary. Local tests use synthetic identities/documents and emulated storage.

The 21 November changes passed a real 11-page Quarto render and public browser checks at 375/768/1440 px. The private workspace passed synthetic browser integration at the same sizes (document filters/download, campaign/station submission, reload persistence, author isolation, coordinator review and failed-write preservation), seven Access/middleware tests, six API tests and two private-document build tests. Twelve scientific-cache Python tests also passed. SVG colour-frame rendering is verified separately. No live Cloudflare authentication has been tested.
