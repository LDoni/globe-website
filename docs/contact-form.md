# Join contact service — current deployment

The direct-submission client, Cloudflare Worker and Google notification relay are deployed and configured. **Public intake remains disabled pending confirmation of the group's restricted conversation visibility.** The existing coordination email link remains available while Worker health reports inactive.

## Verified on 24 November 2026

- The owner-authorized Google version-2 deployment rejects unsigned/bad-signature requests, accepts a correctly signed non-sending diagnostic, and confirms MailApp authorization and available quota.
- Google accepted one clearly labeled TEST notification to globo-initiative@googlegroups.com. The owner confirmed receipt. Provider acceptance and actual receipt are recorded separately.
- A real workerd runtime successfully signed and fetched the Google non-sending diagnostic, including the Content Service redirect. No additional test email was sent by that runtime check.
- The existing production KV passed a real write/read check using a non-personal fixture with 60-second expiry, outside the enquiry prefix.
- Twenty-two contact/client/Worker/Google tests and the public browser suite pass. GitHub Pages 45376660150 and full R/Shiny/site validation 45376660198 succeeded. The public endpoint/site key and CSP origin are published; an inactive health check keeps the form unavailable.

## Runtime

Public site: https://globe-ocean.github.io/. Worker: https://globo-contact.lapo-doni.workers.dev. A managed Turnstile widget is limited to the actual public hostname and action join. Preview Worker URLs are disabled.

The Worker validates bounded structured fields, consent, exact origin, honeypot and the real Turnstile response/hostname/action. It stores no challenge token or visitor IP in the enquiry. The existing production workspace KV is reused as GLOBE_ENQUIRIES, with separate join: and join-delivery: prefixes. There is no public enquiry read route. Only coordinators and named reviewers access the workspace inbox.

Notifications use the owner's existing Google account through a send-only Apps Script relay. The Google deployment URL, HMAC signing key, fixed recipient and sender are Cloudflare secrets. The owner account and local credentials stay outside Git. No new mailbox, domain, paid service or plan upgrade was created. The relay has only script.send_mail scope, a fixed group recipient, signed timestamped requests, quota checks and safe error codes. Its replay cache is best effort, not durable exactly-once delivery.

A success receipt requires both private intake and provider acceptance. A stored enquiry with an unconfirmed notification returns an explicit saved/unconfirmed reference. No success message claims inbox delivery, membership or station approval.

## Remaining activation check

The owner confirmed test receipt. Before enabling collection of real names/emails, confirm that Google Groups conversation visibility is restricted to members and that membership is controlled by the coordinators. Google group permissions are separate from Cloudflare Access and the agent has no authenticated Groups administration scope. Portal membership remains an explicit named-email list, capped at 50; group membership never adds portal users.

After confirmation, set CONTACT_ENABLED=true in the private external Wrangler configuration and deploy the Worker. Verify production health, exact-origin preflight, denial of foreign origins and invalid challenges, and real public widget/form behavior. A genuine end-to-end web submission still needs a valid production Turnstile challenge; no test key or bypass is deployed. Confirm its private persistence and Google notification without publishing contact fields in logs.

The public fallback remains the previously approved coordinator mailbox. The group is the fixed automatic notification destination; publishing it as a general mailto destination additionally requires accepting outside senders.

## Tools and references

`node scripts/check_google_mail.mjs` performs only non-sending checks; `--send-test` adds one explicit synthetic notification. Credentials/URL files remain outside the repository. The alternative direct Gmail OAuth and native Cloudflare mail adapters are retained but are not selected. No Email Routing permission or custom sender domain is needed for the chosen Google route.

[Google setup](google-mail-setup.md), [Google web apps](https://developers.google.com/apps-script/guides/web), [MailApp](https://developers.google.com/apps-script/reference/mail/mail-app), [Google quotas](https://developers.google.com/apps-script/guides/services/quotas), [Turnstile CSP](https://developers.cloudflare.com/turnstile/reference/content-security-policy/).
