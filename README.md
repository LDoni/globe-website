# GLOBO scientific website and ocean monitoring

A Global Initiative to Uncover Ocean Microbiome Responses to Super El Niño in a Warming World.

This release extends the supplied GLOBO starter into a public Quarto website, Leaflet network explorer, validated Google Sheets publication pipeline, cached NOAA integration and modular Shiny application. GLOBO is represented as an independent international collaboration. The Italian Omics Observatory Network is one participant.

**Release status (24 November 2026):** the public site is published at **https://globe-ocean.github.io/** from `globe-ocean/globe-ocean.github.io`. Real Quarto, R/Shiny, Python/Node and browser checks have passed. The public site includes official ERA5 interactive charts, historical-rank boxes and cached high-resolution NOAA maps. The 21 November update broadens the microbiome framing, restores the original project title, adds the supplied UniGe mark and animates the original ocean colours. The separate partner workspace is deployed with exact-email Cloudflare Access policies on production and wildcard previews, isolated KV stores and a 50-user ceiling. Email OTP is enforced on both private applications. A Workers-specific login verification error has been corrected and tested in actual workerd; authenticated production operations still require verification; see [the deployment audit](docs/partners-cloudflare.md). Deployment outcomes are recorded in [STATUS.md](STATUS.md).

Join direct submission is active with a real Turnstile challenge, private KV persistence and Google group notifications. The owner completed a real public submission; storage and provider acceptance were checked separately. Group conversations are restricted to members (owner confirmed). Individual member mailbox delivery depends on their Google Groups subscription. Network includes the published coordination team above participating countries. See [contact service verification](docs/contact-form.md).

Station identifiers now use **GLOBO-001 … GLOBO-030**. Historical station codes are accepted during import through the [identifier correspondence](data/station-id-aliases.json); scientific metadata and approval status are unchanged. Shiny is now in `shiny/globo-monitoring/`, and runtime variables use `GLOBO_*`. The owner deferred URL/organization changes, so the current public and private hosts remain active. Network flags are enlarged for desktop and mobile. See [migration status](docs/globo-migration.md).

## Quick start

Partners: the protected [quick guide](https://globe-partners.pages.dev/guide.html) explains sign-in, shared workbooks, documents, ticket discussions and resolved-ticket history. See [workspace verification](STATUS.md) for the distinction between automated local tests and authenticated production checks.

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
GLOBO_SHINY_BROWSER=true .venv/bin/python tests/shiny-startup.py
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
Rscript -e 'shiny::runApp("shiny/globo-monitoring",host="127.0.0.1",port=8766)'
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
| `shiny/globo-monitoring/` | Portable Shiny app, modules and public cache |
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

## Homepage news

The homepage separates curated external media coverage (News from the world, with a visible linked headline and publisher) from automatically generated GLOBO Project updates. The monitoring teaser and People & Partners column have been removed from the homepage. Official monitoring remains in its dedicated page. Coordination names use Martinez-Urtaza and Almagro-Moreno.

## News and publications

Create a draft QMD entry:

```bash
python3 scripts/new_content.py news campaign-update --title 'Approved campaign update' --author 'Approved author' --date 2026-11-19 --category 'Sampling campaign'
python3 scripts/new_content.py publication paper-slug --title 'Approved paper title' --author 'Approved authors' --date 2026-11-19 --category 'Publication'
```

Edit the file and remove `draft: true` only after authorization. Standard Quarto metadata support dates, authors, categories, descriptions, image paths, external links and DOI links in the body. New entries use the existing page layout. The homepage lists the three latest public news entries; the news and resource pages list all matching public entries. No invented announcement or publication is shipped. RSS can be enabled with `feed: true` in the news listing after the actual `website.site-url` is configured; it is not enabled against a fabricated domain.

For a publication add a link such as `https://doi.org/ACTUAL-DOI`. Store only approved imagery with appropriate rights. The current site uses the owner-supplied transparent GLOBO wordmark and scientific network illustration; the GLOBO rebrand is prepared separately. The schematic globo is not used as a quantitative map.

## Deployment and account connections

[Deployment guide](docs/deployment.md) covers GitHub, Cloudflare Pages, Google and shinyapps.io. Build with GitHub Actions, upload only `_site` to Cloudflare Pages using Wrangler. This keeps hosting portable and avoids dependence on Quarto availability in Cloudflare's build image. The optional public Cloudflare deployment workflow remains gated. GitHub Pages is the active public host; the separate Cloudflare partner project is deployed through its Git integration.

Google Sheets and NOAA updates run daily at 06:17 UTC when configured, plus manually. A bot push using `GITHUB_TOKEN` does not start another push workflow, so the refresh workflow explicitly calls the reusable deployment workflow. Shiny is deployed separately and does not self-update its local filesystem. After a cache update, manually run the Shiny deployment workflow; an authenticated scheduled redeployment can be enabled after checking account usage.

The public Members page links to the separate Cloudflare Access-protected workspace. Private documents belong in that authenticated service, not this public repository or Quarto build. See [Members Area security architecture](docs/members-security.md).

GitHub Pages publication was authorized and completed. No paid plan changes, domain registration or account invitations have been performed.

## Scientific framing and contact update

The current scientific framing focuses broadly on marine microbiome responses to Super El Niño in a warming world. Homepage, About, Research, Join and shared footers reflect this scope; Vibrio, including potentially pathogenic lineages, remains one targeted research component. The homepage uses only the original full project title. Sampling frequency is described as planned in the supplied project text, without presenting expected responses as results.

The Join page uses a direct-submission client. Its Worker and email transports are implemented and tested locally, but sending remains disabled pending Cloudflare permissions, Turnstile and a genuine sender authorization. The page offers a manual contact link while unavailable. See [contact form setup](docs/contact-form.md).


## Current partner register and Climate Pulse

The initial scope is now 30 stations. The supplied XLSX is a local intake file, excluded from Git. See [the workbook/Sheets workflow](docs/station-register.md) for repeatable import and the separate local preview of its unapproved approximate locations. Adding approved rows to the connected Sheet updates station lists, filters and maps automatically.

GLOBO is a free and independent network of scientists, open to new partners and proposals for coordinated sampling during exceptional ocean events. Participation and campaign planning are agreed with the relevant teams.

The monitoring page includes a year-comparison RONI chart, pointer readout and SVG export. It links to the official C3S/ECMWF Climate Pulse application for ERA5 analyses. Climate Pulse currently sends `frame-ancestors 'self'` and `X-Frame-Options: SAMEORIGIN`, so it is linked rather than embedded. NOAA RONI and ERA5 indicators retain separate definitions and attribution.


## Add or update network stations on GitHub

Edit [`data/network-stations.csv`](https://github.com/globe-ocean/globe-ocean.github.io/edit/main/data/network-stations.csv), preserving its header and stable IDs. Add one row per partner with map latitude/longitude, category and display metadata. Commit the edit to `main`: Pages validates the CSV, regenerates `data/network-stations.geojson`, runs browser checks and deploys. Invalid input stops the build, leaving the last valid website online. Set `map_visibility` to `hidden` to hide a point. This is a public map register: contacts and internal notes belong in the private intake, not this file. Coordinate verification details remain in each station record; this map register never modifies the separate approved scientific-coordinate registry.

When Google Sheets is connected, configure it as the single authoritative source for this same map register; avoid simultaneous edits in two sources. Live Sheets authentication is still pending.


## Official ERA5 interactive monitoring

The daily Niño 3.4, Niño 3, Niño 4 and Niño 1+2 panels use the public CSVs distributed by C3S/ECMWF for Climate Pulse. Each cached region has 17,488 dates from 1979 through 17 November 2026. GLOBO provides the interactive rendering, year comparisons, date selection and statistics; the original Climate Pulse app remains linked. All 69,952 rows were compared with independent original CSV intakes. The CSV notes identify 12 UTC SST values; their full sampling and quality notes are retained.

Rank is calculated from actual SST values on the same calendar date across available years; equal values share a rank. Missing values are not filled. Daily ERA5 SST/anomalies, seasonal NOAA RONI, NOAA CRW gridded anomalies, official forecasts and optional Copernicus Marine station extraction are distinct products.

Refresh with `python3 scripts/fetch_pulse.py`; refresh raster derivatives after NOAA data with `python3 scripts/fetch_sst_raster.py`. The daily update workflow runs these when monitoring refresh is enabled.

The SST map displays its observation date prominently above the map, with the last successful data/raster download time shown separately in UTC. Selecting another date updates both labels. Cached raster timestamps are preserved when files are checked out or reused.

## Coordinators, flags and homepage motion

The sticky header includes the original UAB, University of Genoa and St. Jude institutional marks (sources in assets/images/partners/README.md). The supplied GLOBO static PNG is used in public and private headers. The homepage animates only the first globe, using opaque 480 × 480 crops at native source resolution: MP4/H.264 with WebM/VP9 fallback, derived from the preserved original 18-second video. A circular container prevents black video backgrounds from reaching the letters or the surrounding page. The letters remain part of the static PNG; the second O keeps its independent 72-second orbit. Currents play continuously at 1.12×, muted and inline without controls, with the PNG as failed-media fallback. Browser checks cover actual changing frames, early playback, loop restart, format fallback and byte-identical PNG letter/corner pixels under simulated opaque-black video at four viewport widths. No scientific data is synthesized.

Network country flags are derived from public station rows, using country and lowercase country_iso2. Edit data/network-stations.csv on GitHub to add partners; the Pages build regenerates the map and flags. Flag SVGs are vendored locally, including additional countries for future growth. The current workbook contains 24 distinct country labels; the separately declared project scope remains 23 countries until reconciled by the coordinators. Hidden rows are excluded. No scientific extraction approval is inferred.

## Private partner workspace

The separate partners-portal application provides coordinator file uploads, shared tickets with member comments and retained resolved conversations, and validated Excel-based sampling/DNA plots by station. The former campaign and station-update forms are removed from its interface. Build and local synthetic preview instructions are in [partners-portal/README.md](partners-portal/README.md). A live Cloudflare origin is deployed and real isolated KV stores are bound. Exact-email Access policies cover three privately configured participants, including one coordinator; only email OTP is enabled on the private applications. The owner has confirmed real production login. New file/ticket/import operations are tested with synthetic data and await authenticated production verification; no confidential material has been uploaded.

## Cloudflare partner deployment — 22 November

The globo-partners Git integration build is successful. Production and wildcard previews redirect anonymous and forged requests to Cloudflare Access. Existing isolated KV stores, encrypted named-email role lists, matching issuer/audiences and email OTP are configured. Real authorized application requests remain to be tested. The private deployment remains separate from the public GitHub Pages site. Read [the executed audit, current configuration and required authorization](docs/partners-cloudflare.md). The dedicated private workflow builds/compiles and tests this application without publishing _site.

Homepage overview (22 November): the owner-supplied network illustration replaces the interactive sampling-map section. All Leaflet controls, station filters and quantitative NOAA layers remain on the Network page. The homepage still retrieves the station count from the editable public registry, without loading Leaflet.

The latest content cleanup removes the Network map-mode explanation, the undeployed Shiny application notice and the Join confidentiality note. Join sending is disabled until the direct endpoint and mail transport are configured and verified. Cloudflare-only free sending to the requested verified recipient is feasible with an existing onboarded routing domain; see docs/contact-form.md for the remaining requirements.

Current Access status: the organization is active and the owner-created One-time PIN provider is selected exclusively for both GLOBO applications. No additional API permission is needed for this configuration. The 50-user ceiling is enforced locally and at the origin; the owner has confirmed live login; authenticated new-feature write tests remain pending.

Partner workspace is now linked directly in the navigation of all public pages. For Excel: Upload file accepts .xlsx; the Sampling overview template supplies Samples/Extractions sheets, preview and private publication. See [the partner guide](partners-portal/README.md).

23 November update: larger institutional marks now appear Genoa / UAB / St. Jude in equal responsive boxes, the homepage network illustration is wider, and “The initial initiative” is corrected to “The initiative”. The private workspace embeds the owner-supplied Google workbook with an editor link; Google Restricted sharing and named Editor permissions are required separately from Cloudflare. The replacement name is confirmed as GLOBO. An isolated branding/URL migration candidate is prepared with `node scripts/prepare_globo_migration.mjs`; current hosted URLs remain active until replacement hosts and access restrictions are verified. See [the migration checklist](docs/globo-migration.md).

Header refinement: institutional marks are centered on the full viewport, independently of the left-hand GLOBO brand. Menu links use 16 px on desktop and 18 px on mobile, with four-width centering/overlap checks.

Desktop navigation is aligned to the right of the sticky header; the institutional logos remain independently centered.

## Historical implementation notes — 23–24 November

These notes describe earlier preparation stages and are superseded by the current release status above and STATUS.md.

The homepage uses the supplied GLOBO network illustration higher on the page. [Sampling protocol](pages/protocol.qmd) provides the supplied PDF; its Google tracker link now points to the authenticated portal, with identical rendered protocol graphics. Project objectives, sampling and molecular approaches are consolidated, and Monitoring links to the sole interactive map on Network. Sampling-status filters distinguish planned, confirmed and active records without inventing a status for existing rows.

The Sheets publication pipeline validates and stages the scientific registry and public map together, then publishes all four files or rolls back. Live Sheets synchronization is **not connected**: repository credentials/source configuration are absent, and the supplied shared workbook does not contain a Stations tab. The existing public map remains in use. Google Restricted sharing and Editor permissions still require owner verification.

The direct Join Worker compiles and has synthetic client/server/email tests. The Worker and Turnstile are deployed; genuine email delivery remains disabled pending sender authorization. No receipt is fabricated. The private coordination inbox is separate from shared partner tickets and is restricted by role. No confidential file has been uploaded.

Protocol is available directly in the main menu. Its page displays the PDF immediately below the title, without an intermediate resource page or required download click.

24 November contact deployment: the globo-contact Worker is online with the existing KV and a production Turnstile secret. Sending remains disabled pending an authorized sender; the public fallback remains available. Eight real endpoint security checks and 13 contact/mail tests passed. Shiny hosting is optional for the current browser-based maps/charts; its separate application remains locally verified.

The supplied standalone GLOBO static logo is staged for the migration candidate; the matching animation is awaited. A notification-only Google Apps Script relay is prepared and tested for the existing Gmail owner account, with a private local authorization guide and no Gmail-read permission. Owner Google authorization is still required; see docs/google-mail-setup.md.

24 November logo release: the supplied GLOBO animation and static wordmark replace the previous GLOBO mark. Public titles, visible project references and the private header now say GLOBO. Existing GitHub/Cloudflare URLs, station/sample IDs, KV records and authentication identifiers remain stable while replacement-host migration is pending.

Calmer logo update: the second O now rotates the original static PNG at one revolution per 72 seconds, inside a fixed circular window. The first O retains the supplied video and its original current speed. No extra video file is downloaded. Google readiness/security checks passed on the owner deployment, but the first delivery test was not confirmed and no group email was received; version-2 signed diagnostics are prepared and require an owner deployment update before another send test.

Join delivery verification: Google accepted the live TEST notification and the owner confirmed group receipt. The real workerd signing/redirect path and existing production KV write/read also passed. The public client is published but intake remains disabled pending confirmation that Google group conversations are restricted; a genuine web-form submission will be checked after activation. See docs/contact-form.md for the current state.
