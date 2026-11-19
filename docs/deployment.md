# Deployment and account setup

No external account was authenticated during development. These instructions are executable setup steps, not evidence of a deployed service.

## GitHub

Create `globe-website` in the authorized GLOBE organization if one exists. Otherwise use the selected account; do not invent an organization. No GitHub connection is active here, and the available GitHub integration is disabled by the workspace administrator. The prepared directory has a local Git repository on `main`; no remote is configured.

The downloadable archive excludes Git history and build caches. If starting from that archive, first run `git init -b main`, `git add .` and `git commit -m "Initialize GLOBE website"`.

From an authenticated workstation:

```bash
gh auth login
gh repo create ACTUAL-OWNER/globe-website --public --source=. --remote=origin --push
```

Choose the real owner. If the remote already exists, add its URL instead of creating another repository. Check Actions results before enabling deployment. Keep public code and public metadata here; use a separate private repository/service for restricted content.

## Cloudflare Pages

Use a Pages Direct Upload project, built in GitHub Actions. Official reference: [Direct Upload with CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).

1. Authenticate Cloudflare on an authorized machine or use the dashboard. Create the Pages project `globe-website`, production branch `main`, initially using its assigned `pages.dev` hostname. No domain purchase is needed. No existing Cloudflare subscription must be changed.
2. Create a token scoped to the intended account with **Account / Cloudflare Pages / Edit**. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to GitHub Actions secrets. Do not put them in `.env` committed to Git or in public documents.
3. Configure GitHub environment `production` if desired, and repository variable `CLOUDFLARE_DEPLOY_ENABLED=true`. The deployment job stays off otherwise, while build validation can still run.
4. Run `Validate and deploy public website`. It bootstraps R, validates public data, runs R/Python/JavaScript checks, starts Shiny for an HTTP smoke test, renders Quarto, checks rendered links, runs browser behavior tests, and uploads `_site` before Wrangler deployment.
5. Record the actual returned production URL. Set `website.site-url` to it in `_quarto.yml`. Verify desktop/mobile rendering, external basemap tiles, links, security headers and data requests on that hostname.
6. Retrieve and commit the first resolved `renv.lock` artifact. Repeat the restore-based build before considering dependency reproducibility verified.

Only `_site` is deployed. `docs`, `R`, `shiny`, tests, configuration source, private directories and credential files must not appear in that output. The output checker detects accidental source/private inclusion. Public caches and approved/demo location exports are deliberately included.

A hostname reservation, external service availability or a future `.pages.dev` URL is not guaranteed until the real account provisions it. No temporary production URL has been fabricated.

## Google Sheets

See [station-register.md](station-register.md). Repository variables:

| Variable | Purpose |
| --- | --- |
| `GLOBE_SHEET_ID` | Real sheet ID; empty disables synchronization |
| `GLOBE_SHEET_TAB` | Default `stations` |
| `GLOBE_SHEET_PUBLIC` | Default `false`; use `true` only for an entirely public sheet |
| `MONITORING_REFRESH_ENABLED` | `true` enables NOAA cache jobs |
| `COPERNICUS_ENABLED` | Default off; enable only after product/grid/account validation |

For a private sheet add `GOOGLE_SERVICE_ACCOUNT_JSON` and grant that account read-only access. Test a synthetic draft, an approved entry with private columns, a malformed coordinate, an inactive row and an invalid duplicate in a dedicated test sheet before connecting the master register. Confirm the public CSV/GeoJSON never contain private fields. Observe that a failed run does not replace the live data.

The daily schedule is 06:17 UTC, currently 07:17 in Italy; GitHub scheduled jobs may start later than their nominal time. The manual action is also available. GitHub scheduling must be enabled on the default branch. Inactive repositories can have schedules disabled by GitHub; check Actions periodically.

The update workflow commits an explicit public-data allowlist and then calls the deployment workflow itself. If branch protection rejects bot writes, the workflow will fail without changing production. Either allow the narrowly scoped data updater under institutional policy, or adapt the commit step to a reviewed pull-request flow. Do not add a broad personal token just to bypass protection.

## Copernicus Marine

Obtain a real account and confirm acceptance of the relevant data-service terms. Add `COPERNICUSMARINE_SERVICE_USERNAME` and `COPERNICUSMARINE_SERVICE_PASSWORD` as GitHub secrets; the official Toolbox reads them from the environment. Do not store credentials in the Shiny bundle.

First confirm the product/dataset identifier in the current catalogue, test a small historical subset and review the returned mask, time axis and units. Validate the optional Python dependencies and freeze the resolved versions. Add manually reviewed, public-safe mapping review identifiers to `config/station-grid-mappings.csv`. Only then set `COPERNICUS_ENABLED=true`. No arbitrary nearest-sea-cell search or synthetic station values are used.

## shinyapps.io

The app is public and cache-only, so its initial functionality does not require Standard-only authentication. The actual account plan, remaining hours, settings and resource capacity remain **unverified**. Do not enable a plan-dependent feature until those are inspected in the account dashboard.

Official references: [plans](https://www.shinyapps.io/), [application resources](https://docs.posit.co/shinyapps.io/guide/applications/index.html), [account billing](https://docs.posit.co/shinyapps.io/guide/billing_and_account_management/).

| Capability from published documentation | Basic | Standard |
| --- | --- | --- |
| Included active hours/month | 500 | 2,000 |
| Built-in user authentication | Not included | Included |
| Maximum instance count | 3 | 5 |
| Default instance memory | 1,024 MB | 1,024 MB |

These are provider documentation figures, not a verification of the user's subscription or a capacity guarantee. Worker/instance settings and actual usage determine concurrency and cost exposure. Target one default-size instance initially; measure startup, resident memory and representative concurrent sessions before tuning. No paid upgrade has been made.

1. Inspect Account > Billing, current Usage, and the app's available instance/worker settings. Record actual plan and limits in the deployment record.
2. Configure `SHINYAPPS_ACCOUNT`, `SHINYAPPS_TOKEN`, `SHINYAPPS_SECRET` as GitHub secrets obtained securely from the account's Tokens page. Do not paste credentials into QMD or include them in app files.
3. Set repository variables `SHINY_ACCOUNT_VERIFIED=true` and `SHINY_DEPLOY_ENABLED=true` only after account checks. Configure environment `shiny-production`.
4. Run `Deploy public Shiny monitoring`. It verifies tests/startup and explicitly bundles only `app.R`, `modules/` and `cache/`. The cloud instance never receives Google or Copernicus credentials.
5. Inspect the real app URL and set `shiny_url` in `assets/site-config.json` to that HTTPS URL. The website then offers an external application link. A link is the default integration; there is no dependency on iframe support, third-party cookies or a Shiny authentication plan.

Shiny reads caches once per worker startup. A static website refresh does **not** refresh an existing shinyapps.io bundle. Redeploy the public Shiny app after approved cache updates. Do not schedule authenticated redeployment before checking account usage. Provider instance filesystems are ephemeral and not shared; they are never treated as the data source of record.

Portability: `Rscript R/prepare_shiny_cache.R`, then `shiny::runApp('shiny/globe-monitoring')`. No shinyapps.io APIs are used by the app itself. The site output can be served by any static web host. The preprocessing scripts remain ordinary R/Python commands, independent of Actions.

## Rollback

For the public site, redeploy a previous passing commit/build artifact or use Cloudflare's deployment rollback. For a bad public-data update, revert that commit and deploy after review. Sensitive information requires incident handling and history/cache review; reverting does not erase it. Shiny rollback is a redeployment of the previous tested source and cache bundle.
