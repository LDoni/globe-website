# Members Area: separate authorization boundary

The public `pages/members.qmd` is only access information. It contains no private files, links to unprotected private content or client-side password checks. The repository and deployed public cache contain no unpublished microbiological data.

## Configured Cloudflare Access

Use a separately controlled private origin/service and a private source repository. Protect all documents, download routes, attachments and API routes. Use named participant identities and an explicit allow policy; verify authorization as well as authentication. A valid identity outside the approved GLOBE group must not be admitted.

Cloudflare's [published pricing table](https://www.cloudflare.com/plans/) specifies 50 users for Zero Trust Free. GLOBE rejects more than 50 distinct authorized email addresses, including coordinators, without automatic enrollment or truncation. Check the account's actual seats and limits before invitation. Purchasing seats or changing plans requires separate authorization.

For a private Pages project, a policy on a custom domain alone is insufficient. Inventory its production `pages.dev` hostname, custom hostname, branch aliases, per-deployment preview URLs, old deployments and any object-storage download URL. Apply protection to each reachable route, or disable public reachability. A Page is not made private merely by its source repository being private. Do not upload a sensitive document while protection is still being configured.

A preferable origin arrangement, where supported by existing institutional infrastructure, is an authenticated institutional document service with no public storage endpoint. If using a Worker/private bucket, verify Access JWT signatures and `iss`, `aud`, expiration and authorization at the origin as well; refuse requests when the token is missing or invalid. Disable `workers.dev` and preview endpoints or protect them equivalently. Do not rely on a supplied email header without cryptographic verification of the identity assertion. Keep the bucket private and never produce public document URLs.

The separate `partners-portal/` deployment has production and wildcard-preview Access applications, email one-time PIN, exact-email Allow policies, encrypted role lists, matching issuer/audiences, Fail closed and isolated existing KV stores. Anonymous and forged requests redirect to Access. Synthetic tests cover signed assertions, issuer/audience, expiration, membership, privacy and roles. The owner confirmed successful real login after the Workers-specific JWKS fetch correction. New file/ticket/sampling operations have passed synthetic browser/API tests; their authenticated production operations remain unverified. See [the concrete deployment guide](../partners-portal/README.md); live account and hostname tests remain mandatory before confidential upload.

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

Test first with a harmless canary document and fresh anonymous browser sessions. Record hostname inventory, policy configuration, expected users/roles, test date, outcomes and reviewer. Only then authorize sensitive upload. Three named participants and one coordinator are configured outside Git. The owner confirmed successful real login; authenticated submission/review and outsider/removed-member tests remain outstanding. Denial references contain only static check names, never emails or credentials. Anonymous production and deployment-alias requests have been tested; see [the current audit](partners-cloudflare.md).
