# Members Area: separate authorization boundary

The public `pages/members.qmd` is only access information. It contains no private files, links to unprotected private content or client-side password checks. The repository and deployed public cache contain no unpublished microbiological data.

## Initial option: Cloudflare Access

Use a separately controlled private origin/service and a private source repository. Protect all documents, download routes, attachments and API routes. Use named participant identities and an explicit allow policy; verify authorization as well as authentication. A valid identity outside the approved GLOBE group must not be admitted.

Cloudflare currently describes its free Access plan as suitable for teams under 50 users: [official plan information](https://www.cloudflare.com/sase/products/access/). Do not assume it will cover 100 members. Check the account's actual seats and limits before invitation. Purchasing seats or changing plans requires separate authorization.

For a private Pages project, a policy on a custom domain alone is insufficient. Inventory its production `pages.dev` hostname, custom hostname, branch aliases, per-deployment preview URLs, old deployments and any object-storage download URL. Apply protection to each reachable route, or disable public reachability. A Page is not made private merely by its source repository being private. Do not upload a sensitive document while protection is still being configured.

A preferable origin arrangement, where supported by existing institutional infrastructure, is an authenticated institutional document service with no public storage endpoint. If using a Worker/private bucket, verify Access JWT signatures and `iss`, `aud`, expiration and authorization at the origin as well; refuse requests when the token is missing or invalid. Disable `workers.dev` and preview endpoints or protect them equivalently. Do not rely on a supplied email header without cryptographic verification of the identity assertion. Keep the bucket private and never produce public document URLs.

The separate `partners-portal/` Pages canary and origin middleware are now prepared. Synthetic local tests cover signed assertions, expected issuer/audience, expiration, partner allowlists and fail-closed behavior. An initial Cloudflare Git deployment is now observed, with anonymous requests denied by the origin. Live Access policies, user login and KV remain unverified. See [the concrete deployment guide](../partners-portal/README.md); live account and hostname tests remain mandatory before confidential upload.

## Alternative for a larger group

Keep the public site's Members Area as a single link to an independently authenticated service. Candidate alternatives include an existing university/consortium OIDC or SAML-backed document service with group authorization, or another institutionally managed platform. Replacing that service changes only the target link, not the public website or scientific data pipeline. Avoid adding a self-hosted identity server unless a partner can operate it reliably.

Do not use shinyapps.io public app URLs to protect documents. Built-in Shiny authentication depends on the actual subscription, and a protected Shiny UI does not authorize an independent static file URL automatically. The public ocean dashboard and confidential research results have separate release and access policies.

## Acceptance tests before any sensitive upload

| Test | Required result |
| --- | --- |
| Anonymous request to every production, custom and preview hostname | Authentication challenge or denial; never private content |
| Anonymous direct file, attachment, API and object-storage request | Denied |
| Logged-in identity outside the GLOBE allow group | Denied |
| Authorized member | Access limited to assigned resources |
| Removed member, expired token and wrong-audience token | Denied after documented session/revocation policy |
| Invalid signature, missing assertion and spoofed identity header | Denied at the origin |
| Public Quarto artifact, repository history and preview artifact | No restricted documents, private contacts or secret values |
| Old/private staging deployments | Disabled or equivalently protected |

Test first with a harmless canary document and fresh anonymous browser sessions. Record hostname inventory, policy configuration, expected users/roles, test date, outcomes and reviewer. Only then authorize sensitive upload. Live authenticated tests remain outstanding because account authorization and named identities have not been supplied. Anonymous production and deployment-alias requests have been tested; see [the current audit](partners-cloudflare.md).
