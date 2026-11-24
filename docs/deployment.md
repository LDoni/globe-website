# Deployment and account setup

The primary repository is [globe-ocean/globe-ocean.github.io](https://github.com/globe-ocean/globe-ocean.github.io), reusing the existing project and history. Its GitHub Pages hostname is [globe-ocean.github.io](https://globe-ocean.github.io/). The original [LDoni/globe-website](https://github.com/LDoni/globe-website) is retained; no repository was transferred or deleted. Make future content and data changes in the organization repository. `.github/workflows/deploy-pages.yml` uploads only rendered `_site`. Account credentials remain outside the project. See STATUS.md for deployment and browser verification.

## GitHub Pages

GitHub Pages is enabled with the Actions build type. Pushes to `main` run a Quarto build, output/security checks and browser tests before publishing. The NOAA data-refresh workflow calls Pages explicitly after its data commit. The website is static; Shiny runs separately. GitHub Pages does not apply the Cloudflare-specific `_headers` file; confidential material must never enter either public artifact.

The independent R/Shiny validation workflow verifies the complete application. See STATUS.md for observed run URLs. No personal token is committed or used by the scheduled data updater.

## Cloudflare Pages

The primary public website remains GitHub Pages. Existing Cloudflare projects are globo-ocean (optional public mirror) and globo-partners (private workspace). Do not migrate or change the public hostname for this work.

The private project uses Git integration: root partners-portal, framework None, command node ../scripts/build_partner_portal.mjs, output .build, production branch main. Its successful initial Cloudflare build and anonymous denial responses were verified on 22 November 2026. Access configuration and authorized requests still require account authorization. See [the executed partner audit and completion procedure](partners-cloudflare.md).

The private Wrangler file is local-only so the Pages dashboard remains authoritative for runtime KV bindings and secrets. Production and preview must use separate request stores, explicit email allowlists, correct issuer/audience and Fail closed. Confidential files stay outside Git and are not uploaded until real host/user tests pass.

The optional public Cloudflare deployment workflow retains its existing enable flag and deploys only _site to globo-ocean; it never deploys the private artifact. Its enable flag, secrets and public hosting configuration are not changed. Private-only and documentation-only commits do not trigger public GitHub Actions deployment. Manual/reusable public entry points and public data refresh remain available.

## Google Sheets

See [station-register.md](station-register.md). Repository variables:

| Variable | Purpose |
| --- | --- |
| `GLOBO_SHEET_ID` | Real sheet ID; empty disables synchronization |
| `GLOBO_SHEET_TAB` | Default `stations` |
| `GLOBO_SHEET_PUBLIC` | Default `false`; use `true` only for an entirely public sheet |
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

No subscription-dependent capability has been selected. Published plan examples are not a substitute for inspecting the actual account. The public cache-only app has been started locally and its four modules checked through a real browser/WebSocket session.

1. Inspect Account > Billing, current Usage, and the app's available instance/worker settings. Record actual plan and limits in the deployment record.
2. Configure `SHINYAPPS_ACCOUNT`, `SHINYAPPS_TOKEN`, `SHINYAPPS_SECRET` as GitHub secrets obtained securely from the account's Tokens page. Do not paste credentials into QMD or include them in app files.
3. Set repository variables `SHINY_ACCOUNT_VERIFIED=true` and `SHINY_DEPLOY_ENABLED=true` only after account checks. Configure environment `shiny-production`.
4. Run `Deploy public Shiny monitoring`. It verifies tests/startup and explicitly bundles only `app.R`, `modules/` and `cache/`. The cloud instance never receives Google or Copernicus credentials.
5. Inspect the real app URL and set `shiny_url` in `assets/site-config.json` to that HTTPS URL. The website then offers an external application link. A link is the default integration; there is no dependency on iframe support, third-party cookies or a Shiny authentication plan.

Shiny reads caches once per worker startup. A static website refresh does **not** refresh an existing shinyapps.io bundle. Redeploy the public Shiny app after approved cache updates. Do not schedule authenticated redeployment before checking account usage. Provider instance filesystems are ephemeral and not shared; they are never treated as the data source of record.

Portability: `Rscript R/prepare_shiny_cache.R`, then `shiny::runApp('shiny/globo-monitoring')`. No shinyapps.io APIs are used by the app itself. The site output can be served by any static web host. The preprocessing scripts remain ordinary R/Python commands, independent of Actions.

## Rollback

For the public site, redeploy a previous passing commit/build artifact or use Cloudflare's deployment rollback. For a bad public-data update, revert that commit and deploy after review. Sensitive information requires incident handling and history/cache review; reverting does not erase it. Shiny rollback is a redeployment of the previous tested source and cache bundle.
