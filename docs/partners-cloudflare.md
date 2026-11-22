# Cloudflare partner deployment: verified state

Public hosting remains GitHub Pages at https://globe-ocean.github.io/. The private application is a separate Cloudflare Pages project, `globe-partners`, at https://globe-partners.pages.dev/. No public-site source, subscription or domain registration was changed by this private configuration.

## Verified on 22 November 2026

- Cloudflare reports a successful private build with root `partners-portal`, command `node ../scripts/build_partner_portal.mjs`, output `.build`, production branch `main`.
- The Zero Trust organization is active. Two self-hosted Access applications cover `globe-partners.pages.dev` and `*.globe-partners.pages.dev`. The wildcard covers per-deployment and branch hostnames.
- Both applications have only an exact-email Allow policy. One first coordinator is authorized; addresses are held outside Git and in encrypted Cloudflare environment secrets. No Everyone, email-domain-wide Allow or bypass rule was introduced.
- Both runtime environments have the correct issuer and their respective application audience, encrypted partner/coordinator lists and `fail_open=false`.
- Existing `GLOBE_WORKSPACE` KV namespaces are reused, with production and preview isolated. Previous harmless real-KV setup write/read checks passed. Real authenticated application persistence has not yet been tested.
- Across all eight observed hostnames, 48 anonymous and forged-identity requests to root, API, direct document canary and image returned HTTP 302 to the account's real Access login. An undeployed alias returning 404 is not counted as a security test.
- No valid production user session is available. Partner/coordinator login, authenticated outsider/removed-member denial, application submissions/reviews and persistence are **not yet production-verified**. No confidential documents may be uploaded yet.

## Login configuration and remaining authorization

The owner added the email One-time PIN provider manually. Its availability was verified through the API. Both GLOBE applications now allow **only that provider**, with exact-email membership still mandatory. A real user must still complete OTP login before authenticated application behavior can be verified. Do not use a bypass/service-token policy as a substitute for a participant login.

Creating a provider initially returned `HTTP 403 auth.forbidden`; this is now resolved by the owner’s dashboard configuration. **No additional API permissions are required for the current setup.** Access organization/identity-provider Write would be needed only to create or modify providers through the API in future.

Existing operational permissions: Cloudflare Pages Edit, Workers KV Storage Edit, Access Apps and Policies Edit, and Access organization/identity-provider Read. Credentials are read from external files or environment variables, never Git or chat. Billing subscription inspection was denied by the token; the account plan is owner-declared Zero Trust Free. No billing write was attempted.

Cloudflare's published [pricing table](https://www.cloudflare.com/plans/) specifies **50 users** on Free and up to 24 hours of standard log retention. GLOBE independently caps its normalized, deduplicated authorized-email register at 50, including coordinators. A 51st address is rejected without truncation or automatic enrollment; the origin fails closed for an oversized or invalid list. Coordinators must be a subset of partners. Any other Zero Trust applications in the same account may also consume account seats.

## Configuration and private data

The committed Wrangler file is local-only: no `pages_build_output_dir` override. Dashboard/API settings remain authoritative for production and preview bindings. Both environments use:

- `CF_ACCESS_TEAM_DOMAIN`: actual HTTPS Access issuer.
- `CF_ACCESS_AUD`: the respective Access application's audience tag.
- `GLOBE_PARTNER_EMAILS`: encrypted JSON list, at most 50 distinct approved addresses.
- `GLOBE_COORDINATOR_EMAILS`: encrypted JSON list, subset of the partner list.
- `GLOBE_WORKSPACE`: existing environment-specific KV binding.

The origin verifies RS256 signature, fixed issuer/audience, validity times and membership on every route, including direct assets/documents. API writes require same-origin JSON; reviews additionally require coordinator membership. Reviews do not change the public station register or approve scientific coordinates. KV is eventually consistent; production persistence tests must allow for that delay.

Keep confidential documents outside this public repository. The deployed catalogue is empty. Only `/documents/access-canary.txt`, a harmless test fixture, is available for direct-download testing. Do not stage real documents until real authorized and unauthorized sessions have passed live verification. See the [workspace README](../partners-portal/README.md) for separate artifact intake.

## Executable inspection and verification

```bash
CLOUDFLARE_ACCOUNT_ID_FILE=/path/outside/repo/account-id.txt \
CLOUDFLARE_API_TOKEN_FILE=/path/outside/repo/token.txt \
node scripts/inspect_partner_cloudflare.mjs

GLOBE_PARTNER_HOSTS='["globe-partners.pages.dev","ACTUAL_ALIAS.globe-partners.pages.dev"]' \
node scripts/check_partner_access.mjs

node --test tests/partners-access.test.mjs tests/partners-workspace.test.mjs \
  tests/partners-build.test.mjs tests/partners-cloudflare.test.mjs
(cd partners-portal && node ../scripts/build_partner_portal.mjs)
npx --yes wrangler@4.165.0 pages functions build partners-portal/functions \
  --outdir /tmp/globe-partner-worker --project-directory partners-portal
```

The audit lists actual deployment aliases, uses the supported Pages pagination limit and reports missing OTP explicitly. It prints no personal addresses or credentials. The HTTP probe reports absent user sessions as incomplete, even when all anonymous requests are blocked. For real role tests, `GLOBE_PARTNER_SESSION_FILE` can point to an external private JSON file with genuine `CF_Authorization` sessions keyed by exact hostname and role (`partner`, `coordinator`, `outsider`, `removed`). Never paste session JWTs into chat. The administrative API token cannot substitute for a login session.

The 26 local tests pass, including 50/51-user boundary checks, signed JWT rejection, request privacy, coordinator authorization, storage failure behavior and document-build path controls. Actual Pages Functions compilation passes. Synthetic browser and separate-process local-KV checks run in the dedicated private GitHub workflow; their success does not establish a real production login. Public deployment workflows ignore private-only and documentation-only changes.

Official references: [email OTP](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/), [Pages production/preview protection](https://developers.cloudflare.com/pages/platform/known-issues/), [assertion validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/).

Private release `07e19bf` was deployed successfully at https://f6d5bbc1.globe-partners.pages.dev/ and validated by [GitHub run 45057101524](https://github.com/globe-ocean/globe-ocean.github.io/actions/runs/45057101524). This run passed the security/configuration tests, exact build command, real worker compilation, local KV persistence and synthetic browser tests. The primary private URL remains https://globe-partners.pages.dev/. Subsequent documentation-only commits do not change the application code. A live follow of the production login redirect returned HTTP 200 from the real Access origin with the email PIN interface; this does not establish successful user authentication. Both remote policies were read back and matched the single privately authorized address exactly. The public homepage was byte-identical before and after this private release.
