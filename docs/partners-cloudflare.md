# Cloudflare partner deployment: verified state and completion

Public hosting remains GitHub Pages at https://globe-ocean.github.io/. The partner application is a **separate** Pages project `globe-partners`; the optional public Cloudflare mirror is `globe-ocean`. No domain registration, subscription change or confidential upload is part of this setup.

## Observed on 22 November 2026

- GitHub's Cloudflare integration reports a successful build/deployment for `globe-partners` on the current main commit at inspection.
- https://globe-partners.pages.dev/ responds with the origin middleware's plain `403 Access denied`, not a login redirect. The API, image and direct-document paths are also denied anonymously and with forged identity headers.
- The checked deployment alias `d2058262.globe-partners.pages.dev` also denies those requests. `main.globe-partners.pages.dev` returned 404; it is not an authenticated-working alias.
- This is evidence of an active deployment and deny-by-default origin, **not proof that Access email policies, real user login, KV or confidential download work**.
- Wrangler is not authenticated. The supplied file contains an account ID only; GitHub repository secrets were empty at inspection. Real Access configuration and authorized production tests remain outstanding.

## Exact Git integration build

| Setting | Value |
| --- | --- |
| Project | `globe-partners` |
| Production branch | `main` |
| Framework | None |
| Root | `partners-portal` |
| Command | `node ../scripts/build_partner_portal.mjs` |
| Output | `.build` |
| Node | 22 (package allows 22–24) |

The builder resolves paths from its own file and is tested from this exact working directory. Only the partner artifact is built; `_site` is never deployed here. Git integration deploys the project; the independent `partners-portal.yml` workflow validates it. Its optional manual audit job reads configuration and endpoints, never mutates accounts or subscriptions.

**Wrangler configuration is deliberately local-only.** It omits `pages_build_output_dir`, so it cannot replace production bindings with an empty local configuration. Configure runtime bindings/secrets in the Pages dashboard/API for **both** production and preview. This follows [Cloudflare's configuration rules](https://developers.cloudflare.com/pages/functions/wrangler-configuration/).

## Required account authorization

Prefer a custom API token scoped to this Cloudflare account, not a Global API key. Minimum for the planned setup:

- Account / Cloudflare Pages / Edit (API: Pages Write).
- Account / Workers KV Storage / Edit.
- Account / Access: Apps and Policies / Edit.
- Account / Access: Organizations, Identity Providers, and Groups / Read to inspect an existing Zero Trust organization and login provider.

If no Zero Trust organization/login provider exists, its creation needs the corresponding Edit permission or account-owner setup in the dashboard; do not enroll/upgrade a paid plan automatically. No DNS or billing-write permission is required. Check the actual account entitlement/seat limit before invitations; no default plan is assumed.

Supply credentials through the provider's authentication system, environment or a private file **outside this repository**. Never paste credentials in chat, command arguments, issues or commits. `wrangler login` can cover Pages/KV but does not by itself grant the Access administration permissions above.

Private identity input can be an external JSON file with `partners` and `coordinators` arrays. Coordinators must also be listed as partners. Do not infer authorization from the workbook, national domain, public affiliations or GitHub membership.

## Runtime configuration and isolation

| Setting | Production and preview |
| --- | --- |
| `CF_ACCESS_TEAM_DOMAIN` | Actual HTTPS Zero Trust issuer |
| `CF_ACCESS_AUD` | Audience of the Access application protecting that environment |
| `GLOBE_PARTNER_EMAILS` | Secret containing JSON array of named permitted email addresses |
| `GLOBE_COORDINATOR_EMAILS` | Secret containing coordinator subset |
| `GLOBE_WORKSPACE` | Private KV binding; use different production and preview namespaces |
| Fail open | **False** in both environments |

Create/reuse only project-specific KV namespaces and bind them under the exact name `GLOBE_WORKSPACE`. Do not mix preview/test requests with production. KV is eventually consistent; the UI updates from confirmed save responses. The local synthetic browser store is an emulator, not evidence of live KV wiring.

Protect the **whole** production hostname and wildcard preview hostname with Access applications/policies. A single application can cover both if configured appropriately; otherwise use separate application audiences per environment. Include branch/deployment aliases and any future custom hostname. Configure an Allow policy listing only the named email addresses, with no Everyone, email-domain or Bypass rule. An existing account login provider or email one-time PIN can be used. Do not change account-wide policies on unrelated projects. See [Pages production and preview protection](https://developers.cloudflare.com/pages/platform/known-issues/).

The middleware separately validates RS256 signatures, issuer, audience, expiry and explicit membership. It protects every route, catches origin errors and applies cache/security headers to responses from Functions as well as assets. API writes require same-origin JSON and a verified identity. Coordinator review never changes scientific approvals or public station data.

## Executable inspection and tests

```bash
# Read-only API inspection; prints presence/booleans/counts, never addresses or tokens.
CLOUDFLARE_ACCOUNT_ID_FILE=/path/outside/repo/account-id.txt \
CLOUDFLARE_API_TOKEN_FILE=/path/outside/repo/cloudflare-token.txt \
node scripts/inspect_partner_cloudflare.mjs

# Live probes, using actual aliases returned by Cloudflare's deployment inventory.
GLOBE_PARTNER_HOSTS='["globe-partners.pages.dev","ACTUAL_ALIAS.globe-partners.pages.dev"]' \
node scripts/check_partner_access.mjs
```

The probe reports missing user sessions and missing login challenges explicitly; an origin 403 alone cannot make authorization testing pass. For authorized, outsider and removed-member tests, a **private external session file** can hold `CF_Authorization` JWTs keyed by exact hostname and role (`partner`, `coordinator`, `outsider`, `removed`). Set `GLOBE_PARTNER_SESSION_FILE` to that file. Sessions must be obtained through real login; the script never fabricates a production identity and never prints tokens, document bodies or partner data. It refuses to send sessions to unrelated hosts. User-session JWTs are distinct from the Cloudflare administrative API token.

Only after successful live partner/coordinator, outsider, removed-member, wrong-token and direct-path tests may confidential documents be staged. The harmless `/documents/access-canary.txt` route is available for these tests. Keep source documents outside the public repository and build their separate artifact only after live protection is verified. No real document has been uploaded in this work.

Local checks:

```bash
node tests/partners-access.test.mjs
node tests/partners-workspace.test.mjs
node tests/partners-build.test.mjs
node tests/partners-cloudflare.test.mjs
(cd partners-portal && node ../scripts/build_partner_portal.mjs)
npx --yes wrangler@4.165.0 pages functions build partners-portal/functions --outdir /tmp/globe-private-worker --project-directory partners-portal
node tests/partners-kv-persistence.mjs
.venv/bin/python tests/portal-browser.py
```

The KV test explicitly uses `--local` and synthetic data in a temporary namespace, reading it from a separate Wrangler process. Browser tests use ephemeral localhost ports, signed synthetic identities and a synthetic document. No local test is labeled as a successful live Access login.

The public deployment workflows ignore private-only changes and documentation-only changes. Their reusable/manual entry points remain available for authorized public releases and data refreshes. The optional public Cloudflare deployment remains separately gated; its target name is aligned to `globe-ocean`, not the private project.
