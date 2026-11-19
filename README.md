# GLOBE scientific website and ocean monitoring

A Global Initiative to Uncover Ocean Microbiome Responses to Super El Niño in a Warming World.

This release extends the supplied GLOBE starter into a public Quarto website, Leaflet network explorer, validated Google Sheets publication pipeline, cached NOAA integration and modular Shiny application. GLOBE is represented as an independent international collaboration. The Italian Omics Observatory Network is one participant.

**Release status (19 November 2026):** real Quarto render and Chromium interaction tests passed locally. Official NOAA SST and the full RONI series have been downloaded. R dependency restoration and Shiny verification are in progress. GitHub Pages publication is being prepared at the owner’s request. Read [STATUS.md](STATUS.md) for verified outcomes.

## Quick start

Use R 4.4.3, Quarto 1.8.27, Python 3.10+ and Node 22. The public website has no runtime R dependency; R is used for preprocessing and the separate Shiny application.

```bash
Rscript R/bootstrap.R
quarto preview
```

The initial `renv.lock` pins direct R dependencies only. The first bootstrap resolves and snapshots transitive packages. Retrieve `resolved-renv-lock` from the first successful CI run and commit it. Subsequent bootstraps restore that complete lock. Fully resolved, verified dependency reproducibility remains a release gate.

Build and test:

```bash
bash scripts/ci-check.sh
python3 tests/shiny-startup.py
python3 -m venv .venv
.venv/bin/pip install -r requirements-test.txt
.venv/bin/python -m playwright install chromium
python3 -m http.server 8765 --directory _site
# In another terminal:
.venv/bin/python tests/browser.py
```

If only Pandoc is installed, the same QMD bodies can be previewed without claiming a Quarto render:

```bash
python3 scripts/build_preview.py
python3 -m http.server 8765 --directory _preview
```

`python3 scripts/build_standalone_preview.py` creates a single HTML preview after the Pandoc build. It embeds only public caches. Esri basemap tiles require internet; without them the grid, Niño region, controls and station list still function. The standalone preview is a convenience artifact, not the production renderer.

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

The default map uses only the approved registry. Switch explicitly to the demo registry to inspect approximate starter points. Labels and category assignments are provisional transcriptions, not verified station metadata. Some starter coordinates are inland; they must never be used for extraction or sampling. The counts 29 stations and 23 countries are supplied project-scope figures, not inferred from the empty registry or validated from the demo.

`config/station-categories.json` preserves `incursion`, `pacific` and `reference` but marks the scientific categories unconfirmed. Until an approved original figure/definition is supplied, production accepts `unclassified` only. Once confirmed, set `confirmed: true` and review every station assignment.

The map has text search, category and basin filters, safe DOM-created popups, a keyboard-accessible equivalent station list, a Pacific-centered view and two separate modes. Mode A shows the network and the Niño 3.4 geographic boundary. Mode B renders only actual cached NOAA cells; no synthetic anomaly field is shipped. No arrow implies observed anomaly propagation.

See [Google Sheets schema and coordinator guide](docs/station-register.md).

## Monitoring

The RONI cache now contains 921 official NOAA seasons, refreshed on 19 November 2026. It is a timestamped cache, not a live feed. `R/process_ocean_data.R` refreshes the full official series after activation. An index value is never automatically labeled as the current ENSO advisory. Official forecast and diagnostic links are provided instead of unverified probabilities.

`python3 scripts/fetch_sst.py` requests a global NOAA anomaly grid at 2° display spacing by subsampling native 0.05° data. Up to 14 successfully retrieved dates are kept. This is global context, not a coastal station analysis. The first verified download contains 8,467 ocean cells for 18 November 2026. Missing and land cells remain absent.

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

[Deployment guide](docs/deployment.md) covers GitHub, Cloudflare Pages, Google and shinyapps.io. Build with GitHub Actions, upload only `_site` to Cloudflare Pages using Wrangler. This keeps hosting portable and avoids dependence on Quarto availability in Cloudflare's build image. Deployment remains disabled until the appropriate repository variables and secrets are set.

Google Sheets and NOAA updates run daily at 06:17 UTC when configured, plus manually. A bot push using `GITHUB_TOKEN` does not start another push workflow, so the refresh workflow explicitly calls the reusable deployment workflow. Shiny is deployed separately and does not self-update its local filesystem. After a cache update, manually run the Shiny deployment workflow; an authenticated scheduled redeployment can be enabled after checking account usage.

The restricted area is a public access-information page only. Private documents must go in a separate authenticated service, not this repository or build. See [Members Area security architecture](docs/members-security.md).

No paid plan changes, domain registration, account invitations or external publication have been performed.

## Scientific framing and contact update

The supplied project figure confirms a focus on resident and introduced Vibrio lineages, including pathogenic lineages, within a broader marine microbiome context. Homepage, About and Research now reflect that emphasis, while retaining the original official project title. Sampling frequency is described as planned in the supplied project text, without presenting expected responses as results.

The Join page is linked from the main navigation, homepage and partner page. It prepares an enquiry locally; an approved destination email is still required. See [contact form setup](docs/contact-form.md).
