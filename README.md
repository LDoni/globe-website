# GLOBE scientific website and ocean monitoring

A Global Initiative to Uncover Ocean Microbiome Responses to Super El Niño in a Warming World.

This release extends the supplied GLOBE starter into a public Quarto website, Leaflet network explorer, validated Google Sheets publication pipeline, cached NOAA integration and modular Shiny application. GLOBE is represented as an independent international collaboration. The Italian Omics Observatory Network is one participant.

**Release status (20 November 2026):** the public site is published at **https://globe-ocean.github.io/** from `globe-ocean/globe-ocean.github.io`. Real Quarto, R/Shiny, Python/Node and browser checks have passed. The current local update adds official ERA5 interactive charts, historical-rank boxes and cached high-resolution NOAA maps; deployment outcomes are recorded in [STATUS.md](STATUS.md).

## Quick start

Locally verified: R 4.3.3, Quarto 1.11.9, Python 3.12.3, Node 24.14.0 and Chromium 159. CI also verifies R 4.4.3, Quarto 1.8.27 and Node 22. The public website has no runtime R dependency; R is used for preprocessing and the separate Shiny application.

```bash
Rscript R/bootstrap.R
python3 scripts/build_network_registry.py
quarto preview --host 127.0.0.1 --port 8765
```

`renv.lock` contains resolved production and test dependencies. `R/bootstrap.R` restores it into an isolated project library. The bootstrap renews the CRAN index after offline failures and uses bundled libuv if development headers are unavailable.

Build and test:

```bash
bash scripts/ci-check.sh
python3 -m venv .venv
.venv/bin/pip install -r requirements-test.txt
.venv/bin/python -m playwright install chromium
python3 -m http.server 8765 --directory _site
# In another terminal:
.venv/bin/python tests/browser.py
GLOBE_SHINY_BROWSER=true .venv/bin/python tests/shiny-startup.py
```

If only Pandoc is installed, the same QMD bodies can be previewed without claiming a Quarto render:

```bash
python3 scripts/build_preview.py
python3 -m http.server 8765 --directory _preview
```

`python3 scripts/build_standalone_preview.py` creates a single HTML preview after the Pandoc build. It embeds only public caches. Esri basemap tiles require internet; without them the grid, Niño region, controls and station list still function. The standalone preview is a convenience artifact, not the production renderer.

Start the separate dashboard with:

```bash
Rscript R/prepare_shiny_cache.R
Rscript -e 'shiny::runApp("shiny/globe-monitoring",host="127.0.0.1",port=8766)'
```

The Data Explorer is an explicit future-results placeholder. Station Explorer correctly reports no approved stations; it displays no invented station measurements.

## Repository map

| Path | Purpose |
| --- | --- |
| `index.qmd`, `pages/` | Public English content and navigation |
| `news/`, `publications/` | Quarto-native entries; drafts stay unpublished |
| `assets/css`, `assets/js` | Shared visual theme and map/dashboard code |
| `assets/vendor/leaflet` | Vendored Leaflet 1.6.0 and license, no CDN dependency |
| `data/stations.csv`, `data/stations.geojson` | Approved public station registry; initially empty |
| `data/demo/` | 29 approximate starter points, never approved automatically |
| `data/monitoring/` | Small public processed ocean caches and provenance |
| `R/` | Validation, Sheets synchronization, NOAA preprocessing and Shiny deployment |
| `scripts/` | NOAA spatial cache, optional Copernicus extraction, build and QA helpers |
| `shiny/globe-monitoring/` | Portable Shiny app, modules and public cache |
| `config/` | Station categories, ocean product choice and reviewed grid mappings |
| `.github/workflows/` | Pull-request QA, deployment, daily refresh and Shiny deployment |
| `docs/` | Coordinator, deployment, scientific-source and security documentation |

## Map and station publication

The default map reads the public `data/network-stations.csv`, currently containing 30 locations from the supplied workbook. GitHub Actions regenerates its GeoJSON on every build; adding public rows updates counts, filters and markers without editing JavaScript. Coordinate provenance is retained in the source register. The separate `data/stations.csv` scientific registry remains approval-only and is the only station source used for environmental extraction. Public map display never grants scientific-coordinate approval. The declared initial country scope remains 23; the intake has 24 raw country labels for coordinator review.

`config/station-categories.json` preserves `incursion`, `pacific` and `reference` but marks the scientific categories unconfirmed. Until an approved original figure/definition is supplied, production accepts `unclassified` only. Once confirmed, set `confirmed: true` and review every station assignment.

The geographic Leaflet map uses local Natural Earth land polygons, a Pacific-centred view, station search/filters, safe popups and an equivalent station list. One selector switches between station-network and NOAA SST-anomaly backgrounds; stations remain visible. The official NOAA raster is displayed in EPSG:4326, matching its geographic bounds and avoiding a Mercator stretch. A cached numeric grid remains available as a fallback.

See [Google Sheets schema and coordinator guide](docs/station-register.md).

## Monitoring

The RONI cache now contains 921 official NOAA seasons, refreshed on 19 November 2026. It is a timestamped cache, not a live feed. `R/process_ocean_data.R` refreshes the full official series after activation. An index value is never automatically labeled as the current ENSO advisory. Official forecast and diagnostic links are provided instead of unverified probabilities.

`python3 scripts/fetch_sst.py` requests a global NOAA anomaly grid at 2° display spacing by subsampling native 0.05° data. Up to 14 successfully retrieved dates are kept. This is global context, not a coastal station analysis. The verified numeric caches cover 18 November (8,467 cells) and 17 November (8,455 cells) 2026. The main map uses cached official NOAA 1800×900 WMS rasters and their original legends; missing/land areas remain transparent.

The optional Copernicus adapter uses the official Marine Toolbox and a reviewed grid mapping. Install `requirements-copernicus.txt`, set credentials outside the repository, confirm mappings, then run:

```bash
python3 scripts/copernicus_stations.py --start YYYY-MM-DD --end YYYY-MM-DD
```

Use an available past interval of at most 31 days. No coordinates, grid mappings, uncertainty thresholds or site representativeness assessments are inferred. See [scientific data sources](docs/data-sources.md).

## News and publications

Create a draft QMD entry:

```bash
python3 scripts/new_content.py news campaign-update --title 'Approved campaign update' --author 'Approved author' --date 2026-11-19 --category 'Sampling campaign'
python3 scripts/new_content.py publication paper-slug --title 'Approved paper title' --author 'Approved authors' --date 2026-11-19 --category 'Publication'
```

Edit the file and remove `draft: true` only after authorization. Standard Quarto metadata support dates, authors, categories, descriptions, image paths, external links and DOI links in the body. New entries use the existing page layout. The homepage lists the three latest public news entries; the news and resource pages list all matching public entries. No invented announcement or publication is shipped. RSS can be enabled with `feed: true` in the news listing after the actual `website.site-url` is configured; it is not enabled against a fabricated domain.

For a publication add a link such as `https://doi.org/ACTUAL-DOI`. Store only approved imagery with appropriate rights. The site's provisional GLOBE wordmark and schematic ENSO globe are original local SVGs, not official branding or observed data. The schematic globe is not used as a quantitative map.

## Deployment and account connections

[Deployment guide](docs/deployment.md) covers GitHub, Cloudflare Pages, Google and shinyapps.io. Build with GitHub Actions, upload only `_site` to Cloudflare Pages using Wrangler. This keeps hosting portable and avoids dependence on Quarto availability in Cloudflare's build image. Cloudflare deployment remains disabled until its account secrets are supplied. GitHub Pages is active through a separate workflow, as subsequently requested by the owner.

Google Sheets and NOAA updates run daily at 06:17 UTC when configured, plus manually. A bot push using `GITHUB_TOKEN` does not start another push workflow, so the refresh workflow explicitly calls the reusable deployment workflow. Shiny is deployed separately and does not self-update its local filesystem. After a cache update, manually run the Shiny deployment workflow; an authenticated scheduled redeployment can be enabled after checking account usage.

The restricted area is a public access-information page only. Private documents must go in a separate authenticated service, not this repository or build. See [Members Area security architecture](docs/members-security.md).

GitHub Pages publication was authorized and completed. No paid plan changes, domain registration or account invitations have been performed.

## Scientific framing and contact update

The supplied project figure confirms a focus on resident and introduced Vibrio lineages, including pathogenic lineages, within a broader marine microbiome context. Homepage, About and Research now reflect that emphasis, while retaining the original official project title. Sampling frequency is described as planned in the supplied project text, without presenting expected responses as results.

The Join page is linked from the main navigation, homepage and partner page. It prepares an enquiry locally; an approved destination email is still required. See [contact form setup](docs/contact-form.md).


## Current partner register and Climate Pulse

The initial scope is now 30 stations. The supplied XLSX is a local intake file, excluded from Git. See [the workbook/Sheets workflow](docs/station-register.md) for repeatable import and the separate local preview of its unapproved approximate locations. Adding approved rows to the connected Sheet updates station lists, filters and maps automatically.

GLOBE is a free and independent network of scientists, open to new partners and proposals for coordinated sampling during exceptional ocean events. Participation and campaign planning are agreed with the relevant teams.

The monitoring page includes a year-comparison RONI chart, pointer readout and SVG export. It links to the official C3S/ECMWF Climate Pulse application for ERA5 analyses. Climate Pulse currently sends `frame-ancestors 'self'` and `X-Frame-Options: SAMEORIGIN`, so it is linked rather than embedded. NOAA RONI and ERA5 indicators retain separate definitions and attribution.


## Add or update network stations on GitHub

Edit [`data/network-stations.csv`](https://github.com/globe-ocean/globe-ocean.github.io/edit/main/data/network-stations.csv), preserving its header and stable IDs. Add one row per partner with map latitude/longitude, category and display metadata. Commit the edit to `main`: Pages validates the CSV, regenerates `data/network-stations.geojson`, runs browser checks and deploys. Invalid input stops the build, leaving the last valid website online. Set `map_visibility` to `hidden` to hide a point. This is a public map register: contacts and internal notes belong in the private intake, not this file. Coordinate verification details remain in each station record; this map register never modifies the separate approved scientific-coordinate registry.

When Google Sheets is connected, configure it as the single authoritative source for this same map register; avoid simultaneous edits in two sources. Live Sheets authentication is still pending.


## Official ERA5 interactive monitoring

The daily Niño 3.4, Niño 3, Niño 4 and Niño 1+2 panels use the public CSVs distributed by C3S/ECMWF for Climate Pulse. Each cached region has 17,488 dates from 1979 through 17 November 2026. GLOBE provides the interactive rendering, year comparisons, date selection and statistics; the original Climate Pulse app remains linked. All 69,952 rows were compared with independent original CSV intakes. The CSV notes identify 12 UTC SST values; their full sampling and quality notes are retained.

Rank is calculated from actual SST values on the same calendar date across available years; equal values share a rank. Missing values are not filled. Daily ERA5 SST/anomalies, seasonal NOAA RONI, NOAA CRW gridded anomalies, official forecasts and optional Copernicus Marine station extraction are distinct products.

Refresh with `python3 scripts/fetch_pulse.py`; refresh raster derivatives after NOAA data with `python3 scripts/fetch_sst_raster.py`. The daily update workflow runs these when monitoring refresh is enabled.
