# GLOBE partner workspace — canary only

Separate Cloudflare Pages project `globe-partners`. This directory contains a harmless access-test page and origin middleware, never confidential documents. It is not part of the public Quarto artifact. No Cloudflare deployment has occurred.

## Required account configuration

Authenticate the intended Cloudflare account and inspect its actual Access plan/seat allowance. Select an existing login provider or email one-time PIN and a named partner allowlist. Do not buy seats or change plans automatically.

Create the separate Pages project and Cloudflare Access application. Protect **both** `globe-partners.pages.dev` and `*.globe-partners.pages.dev`, including production, branch aliases and per-deployment URLs. The Pages preview-protection toggle alone does not cover production. If a custom hostname is added later, protect it too. Use the provider's actual returned hostname rather than assuming this project name is available.

Set these values in Cloudflare environment settings for **production and preview**:

- `CF_ACCESS_TEAM_DOMAIN`: the actual `https://TEAM.cloudflareaccess.com` issuer.
- `CF_ACCESS_AUD`: the actual Access application's audience tag.
- `GLOBE_PARTNER_EMAILS`: JSON array of explicitly authorized partner emails. Keep this value in Cloudflare settings, not Git.

Set Pages Functions to **Fail closed** in Settings > Runtime. `_routes.json` includes every route and excludes none. The middleware separately verifies the signed RS256 assertion, issuer, audience, expiration/activation and partner email. Anonymous requests, arbitrary identity headers, invalid signatures and missing configuration return 403, including direct asset/document paths. Requests to the key service use only the configured issuer.

From this directory, deploy only the harmless canary first using authenticated Wrangler:

```bash
npx wrangler pages deploy public --project-name globe-partners
```

The provider's deployment response supplies the real URLs. Verify every hostname anonymously, with an authenticated non-member, with an authorized partner and after removing that partner. Also test direct document paths using harmless canary files. Record outcomes before adding any confidential material in a **separate private source/deployment location**. Never commit private documents here or deploy `_site` as this workspace.

## Local verification

```bash
node tests/partners-access.test.mjs  # from the main repository root
```

The tests generate a temporary RSA key in memory and use synthetic identities. They verify signatures/claims, deny-by-default behavior, outside/removed members, key-service failure and route protection. These are local origin tests, not evidence that Cloudflare account policies or hostname protection have been configured.

Official references: [Pages production/preview Access configuration](https://developers.cloudflare.com/pages/platform/known-issues/), [JWT verification](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [Functions routing and fail closed](https://developers.cloudflare.com/pages/functions/routing/).
