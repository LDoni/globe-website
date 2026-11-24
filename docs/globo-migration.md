# GLOBO names and deferred hosting migration

Updated 24 November 2026. The owner requested the GLOBO name throughout the website, station identifiers, application paths, exports and runtime configuration. Public station IDs now use GLOBO-001 through GLOBO-030. Numeric suffixes, station coordinates, categories, operational status and scientific approval are unchanged.

`data/station-id-aliases.json` records the exact old/new correspondence. Python and R station ingestion normalize historical codes before duplicate detection. Sampling workbook validation accepts old station codes and stores their canonical GLOBO equivalents. Sample and extraction identifiers are not rewritten. Original owner workbooks and source documents remain preserved.

The Shiny source now lives in `shiny/globo-monitoring/`. Internal build/test variables and Cloudflare runtime bindings use `GLOBO_*`. Production and preview reuse their original, separate KV namespaces. New secret names were configured before deploying source; old cloud aliases remain temporarily available for rollback. No authorization was broadened and the 50-user ceiling remains enforced.

## Hosting stays unchanged

The owner explicitly deferred URL and GitHub organization changes. The active services remain:

- Public: https://globe-ocean.github.io/, source `globe-ocean/globe-ocean.github.io`.
- Private: https://globe-partners.pages.dev/, Cloudflare Pages project `globe-partners`.
- Join Worker: https://globo-contact.lapo-doni.workers.dev/.

These literal hosting/resource names are deliberately retained. Replacing them in text without migrating their actual providers would break links and authentication. No new organization, Pages project, Access application or domain was created. No services, subscriptions, private files or existing KV records were deleted.

`config/globo-migration.json` keeps the potential free-hosting targets for later review. `globo-ocean` was not an available authenticated organization when checked. `node scripts/prepare_globo_migration.mjs` can still produce an isolated review candidate under ignored `.local-data`; it never activates cloud changes. When hosting migration is resumed, verify organization ownership, canonical URLs, private production/wildcard-preview Access, Turnstile hostnames, Worker origins, PDF links and real authorized login before changing published links.
