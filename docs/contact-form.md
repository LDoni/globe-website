# Direct Join enquiries — implementation and activation

The email-draft form has been replaced by a direct-submission client and Cloudflare Worker source. **The Worker is deployed; email sending is not activated.** The public page currently offers the coordination team's contact link while the form remains unavailable. No email has been sent during development.

The owner requires email delivery, not only a private inbox. `assets/site-config.json` therefore keeps `contact_endpoint` and `turnstile_site_key` null until a real transport is authorized and tested. An HTTP success is shown only after persistent intake and provider acceptance; this does not prove inbox delivery. A saved enquiry whose notification fails returns an explicit unconfirmed-delivery message and reference.

## Completed implementation

- `contact-service/`: strict structured-field validation, bounded JSON, exact origin, honeypot, server-verified Turnstile hostname/action and fixed recipients. No public enquiry read endpoint.
- Existing production workspace KV can be reused as `GLOBE_ENQUIRIES`; records use separate `join:` and `join-delivery:` prefixes. No second storage service is required. The private portal reads enquiries only for coordinators and the explicitly configured `GLOBE_CONTACT_REVIEWERS` list.
- Cloudflare native `SEND_EMAIL` or Gmail OAuth transport; fixed configured From/To and visitor Reply-To. No visitor-controlled recipient and no credentials in source. No paid transport is enabled.
- Browser tests use synthetic challenge/provider responses. Node tests exercise validation, denials, storage failure, notification failure and both email transports. Wrangler's real dry-run compiles the email entry point.

## Minimum remaining authorization

The owner updated the token on 24 November. These permissions are now verified through successful widget creation, Worker deployment and secret installation, with existing Pages/KV/Access permissions retained:

1. Account → Workers Scripts → Edit.
2. Account → Turnstile Sites → Edit.

Keep its account scope limited to the current account. If a new token is issued, save it in the existing external local credential file; never paste it in chat or commit it. The previous permission failures are resolved. Workers, workers.dev configuration and Turnstile APIs now return HTTP 200. Email Routing destination inspection still returns HTTP 403; no DNS zone is visible to this token.

One genuine mail authorization is also required:

- Cloudflare: an owned/authorized domain onboarded to Email Routing, sender on that domain, verified fixed destination and a `SEND_EMAIL` binding restricted to that destination. No project-owned DNS zone is currently visible. University mailbox ownership does not authorize university DNS. If this path is chosen, the token additionally needs the appropriate Email Routing account/zone configuration permissions and access to that zone.
- Gmail: a dedicated mailbox and owner-completed Google OAuth authorization for `gmail.send`, with client credentials and refresh token stored as Cloudflare secrets. A Gmail destination alone is insufficient. No password is required by this implementation.

Neither `github.io` nor `pages.dev` supplies a project email domain. No domain purchase, plan upgrade, email verification message or real delivery test is authorized by this document.

## Deployment sequence

Use an ignored external Wrangler configuration based on `contact-service/wrangler.example.toml`, retaining `CONTACT_ENABLED=false`. Bind the existing production KV, configure exact allowed public origin and hostname, and store Turnstile/mail secrets through Cloudflare. Create the Turnstile widget for the real public hostname. Validate fixed recipient authorization and delivery, then enable the service. Add the precise Worker origin to the public CSP connect-src, publish its endpoint/site key and run the real form and email-acceptance tests. Keep sender secrets and partner email lists outside Git.

The official provider rules must be rechecked at activation: [Cloudflare Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/), [limits](https://developers.cloudflare.com/email-service/platform/limits/) and [Gmail sending](https://developers.google.com/workspace/gmail/api/guides/sending). Never enable a paid feature to work around missing authorization.

## Executed deployment — 24 November 2026

The Worker is deployed at https://globo-contact.lapo-doni.workers.dev, using the existing production KV namespace as GLOBE_ENQUIRIES. Preview URLs are disabled. A managed Turnstile widget is configured only for globe-ocean.github.io, with no clearance escalation. Its secret is installed as a Cloudflare Worker secret. Credential/widget files are stored outside the repository in the owner’s private configuration directory.

CONTACT_ENABLED remains false. The public endpoint/site-key configuration remains null until a genuine sender is authorized and tested; the existing public contact fallback is preserved. No enquiry was stored and no message was sent. Eight actual endpoint probes passed: health and disabled intake correctly return 503, foreign or missing origins return 403, public inbox reads return 404, unsupported intake GET returns 405 and CORS preflights enforce the exact public origin. All 13 contact/client/mail Node tests passed. These tests establish fail-closed deployment, not successful email delivery.

The owner prefers avoiding a new mailbox. An existing mailbox may be used with its provider’s supported authorization, or an existing owned domain may be used with Cloudflare’s verified-destination sending. Cloudflare hosting URLs do not supply a sender domain. Gmail/UniGe authorization, a domain purchase and paid services have not been configured. Shiny publication is independent and optional for the currently functioning static maps/charts.
