# Join the initiative contact form

The public form requests name, email, institution, country, proposed contribution, message and consent to be contacted. It prepares an email draft locally. It does not post personal data to a public API, store it in browser storage, save it in Git, or create a station record.

Set `contact_email` in `assets/site-config.json` to an approved destination address. Until this is set, the form supports drafting and explicitly states that nothing has been sent. Once configured, an `Open email draft` link opens the visitor's email application using `mailto:`. The visitor reviews and sends the email there. The website never claims receipt or delivery.

This initial portable implementation requires no additional account, paid service or server credentials. A later server-delivered contact form can replace this transport after selecting an authorized mail provider and recipient. No external message has been sent during development.

Before enabling the destination, confirm its publication, the responsible institution's privacy notice and retention policy. Do not request unpublished research results or confidential attachments through this enquiry form. An enquiry is not membership approval.

Pure draft-generation tests run with `node --test tests/contact.test.cjs`. Browser validation is included in `tests/browser.py`, and passed locally and against the public GitHub Pages site.

## Requested Cloudflare direct delivery (22 November 2026)

The project owner requested delivery to luigi.vezzulli@unige.it. Official Cloudflare pricing permits free sends to account-verified destination addresses on Workers Free; arbitrary-recipient sending requires Workers Paid and is outside the authorized scope. See https://developers.cloudflare.com/email-service/platform/pricing/ and https://developers.cloudflare.com/email-service/platform/limits/ .

The recipient must complete Cloudflare destination verification, and the sender must belong to an onboarded Email Routing domain. The current token sees zero DNS zones and cannot read Email Routing destination addresses. github.io and pages.dev hosting URLs are not project-owned email domains. A suitable existing domain and the Email Routing account/zone permissions are still needed; no domain was registered, paid plan enabled, destination verification email triggered or test message sent.

Keep the existing draft-only behavior until a real endpoint can send successfully. Future delivery must target only the fixed verified destination, use a domain-owned From address and visitor Reply-To, validate input and abuse protection, and confirm server acceptance only after the email provider accepts the message. Do not claim inbox delivery merely from a successful API call.

The existing draft recipient is now configured as the explicitly requested Luigi Vezzulli address. This still opens a local email draft and sends nothing automatically until an actual Cloudflare sending endpoint is enabled.
