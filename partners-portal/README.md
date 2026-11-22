# GLOBE partner workspace

Separate Cloudflare Pages application for authenticated participants, excluded from the public Quarto artifact. Implemented features:

- Search/filter documents and protocols, with authenticated direct downloads.
- Submit coordinated campaign proposals with dates and participating stations.
- Request station metadata/coordinate changes.
- Partners see their own submissions; coordinators see and review all submissions.
- A review is a coordination decision only. No request changes the public map, approves scientific coordinates or triggers environmental extraction.
- Failed/missing storage returns an error and never confirms a successful save.

**Deployment:** https://globe-partners.pages.dev is built successfully and protected by Cloudflare Access. Production and wildcard previews use exact-email allow policies, separate audiences, encrypted role lists, Fail closed and the existing isolated KV stores. One first coordinator is configured outside Git. Anonymous/forged requests are redirected to Access on all eight observed hostnames. The existing email OTP provider is now selected as the only login method for both applications; authenticated production operations remain unverified. No confidential documents are deployed. See [the current deployment audit](../docs/partners-cloudflare.md).

## Local verification and synthetic preview

From the repository root:

```bash
node scripts/build_partner_portal.mjs
node tests/partners-access.test.mjs
node tests/partners-workspace.test.mjs
.venv/bin/python tests/portal-browser.py
# Optional local preview; SYNTHETIC identities/data, no real confidential material:
node tests/portal-preview.mjs
# http://127.0.0.1:8790
```

The preview harness lives under tests, binds only to localhost and creates in-memory RSA keys, synthetic signed identities, a synthetic document and an emulated request store. It is **not** a production authentication method and is never included in deployment. Requests persist across browser reloads during that process; the synthetic store is cleared on restart. Production uses the Cloudflare KV binding below.

## Production configuration

Authenticate the intended Cloudflare account and inspect its existing Access plan/seat allowance and KV limits. Do not buy seats or change plans automatically. API authorization has now been supplied through an external private file. Pages, KV and Access application/policy operations work. The owner added email OTP in the dashboard after its creation was denied by the token; the existing provider is now selected for both applications. No further API permissions are required for the completed configuration. Credentials remain outside the repository.

The separate Pages project and its production/preview Access applications are configured. Protect **production** (`globe-partners.pages.dev`) **and previews** (`*.globe-partners.pages.dev`, including branch/per-deployment aliases). Use the hostname actually returned by Cloudflare. Preview protection alone does not protect production. Protect custom hostnames too if added later.

The committed Wrangler file is **local-only** (no pages_build_output_dir): production and preview bindings/secrets must stay in the Pages dashboard/API. Do not add that key without migrating every runtime binding. Configure these settings for both production and preview:

- `CF_ACCESS_TEAM_DOMAIN`: actual `https://TEAM.cloudflareaccess.com` issuer.
- `CF_ACCESS_AUD`: Access audience tag.
- `GLOBE_PARTNER_EMAILS`: encrypted JSON array of named partner email addresses, maximum **50 distinct users**, including coordinators. The origin rejects invalid or oversized lists entirely; never truncate or auto-enroll users.
- `GLOBE_COORDINATOR_EMAILS`: JSON array of authorized coordinator addresses (also present in the partner list).
- `GLOBE_WORKSPACE`: separate production and preview KV namespace bindings for request persistence. Configure the binding in Cloudflare, keeping identifiers/identities outside Git. KV is eventually consistent: a fresh browser session may briefly show an older request/review state. The active UI updates from confirmed write responses.

No public-domain-wide allow rules are assumed. Use an existing login provider or email one-time PIN and the named allowlist. Set Pages Functions to **Fail closed** in Settings > Runtime. The origin middleware verifies signed RS256 assertions, fixed issuer/audience, validity times and partner membership for **every route**, including document/static asset paths. API writes require same-origin JSON requests; coordinator review additionally checks the server-side coordinator list.

## Separate build and confidential document intake

Build a canary with **no real private documents first**:

```bash
node scripts/build_partner_portal.mjs
cd partners-portal
npx wrangler pages deploy .build --project-name globe-partners --branch main
```

The provider's deployment response supplies real URLs. Test each hostname anonymously, as an authenticated outsider, as a member/coordinator and after removing membership. Check direct document paths as well as the homepage. Record real outcomes before adding confidential content. The local synthetic tests do not establish that live Access policies protect these hostnames.

Keep document sources outside this public repository. A private source directory can contain `resources.json`:

```json
[{"title":"Sampling protocol","description":"Approved team procedure","category":"Protocol","updated":"2026-11-21","file":"sampling-protocol.pdf"}]
```

Supported categories: Protocol, Campaign, Report, Coordination. Files are explicitly allowlisted by manifest, with safe names/extensions and no escaping/symlink paths outside the source directory. Nothing is recursively uploaded. Build into a **fresh directory outside the public repository**:

```bash
GLOBE_PRIVATE_CONTENT_DIR=/path/to/private-content \
GLOBE_PARTNER_BUILD_DIR=/path/to/fresh-private-artifact \
node scripts/build_partner_portal.mjs
# From partners-portal, deploy that separate artifact only after live access verification.
```

The builder refuses an output already containing documents to prevent stale private files surviving a rebuild. It does not delete source/output documents. Requests with partner identity are stored only in the private KV binding. There are no document uploads, automated emails or scientific-data ingestion jobs in this interface.

Official references: [production/preview Access configuration](https://developers.cloudflare.com/pages/platform/known-issues/), [JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [Functions routing](https://developers.cloudflare.com/pages/functions/routing/).

Private-only changes run the dedicated partners-portal.yml validation workflow. Public GitHub Pages and optional public Cloudflare deployment ignore these changes. Live inspection scripts, minimum account token permissions and the harmless direct-document canary are documented in docs/partners-cloudflare.md.

Current activation status: the Access organization is active. The owner-created email one-time PIN provider is present and is the only permitted login method on both applications. Live user-session verification is pending.
