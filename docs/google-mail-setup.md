# Google account authorization for Join

The owner supplied an existing Gmail account and the public project group globo-initiative@googlegroups.com. The owner address stays outside Git. No new mailbox, domain, paid plan or OAuth client purchase is needed for the prepared Apps Script relay. The existing direct Gmail OAuth adapter is also retained.

## Prepared files and trust boundaries

- `contact-service/google-relay/Code.gs`: notification-only Google web app. Fixed group recipient, bounded fields, signed/timestamped payloads, replay cache, quota check and generic error responses. It never reads Gmail, accepts visitor-selected recipients, or exposes the relay key.
- `appsscript.json`: only `script.send_mail` scope. MailApp sends using the script owner's account, with GLOBO coordination as its display name and the visitor as Reply-To. The group is the recipient, not an automatically verified From alias.
- `google-relay.mjs`: Worker adapter signs each record with HMAC-SHA256 and accepts only the configured Google script URL and a Google content-service response. It confirms acceptance only on a matching signed request's receipt.
- The shared key and owner setup page are outside the repository under the owner's private `.config/globo-cloudflare` directory. The matching Worker secret is installed through Cloudflare. No password, Google token or real enquiry is committed.

Cloudflare retains Turnstile verification, exact-origin checks, private KV intake and role-restricted review. The relay receives only validated contact enquiries. Google authorization and quotas apply separately. The script's replay cache is best effort and is not a durable exactly-once guarantee. A successful send is provider acceptance, not proof of group-member inbox delivery. No production Google deployment or email test has been performed.

## Owner-only action

Open the private `GOOGLE-MAIL-SETUP.html` page in the local configuration directory. It contains the complete copyable source, manifest, properties and deployment steps. Sign in with the existing owner account, create the Google script, configure its private Script Properties, deploy the web app to execute as the owner, and personally authorize the send-email permission. The endpoint must accept requests from the Worker; the HMAC signature is the application authorization boundary. Keep the source project and Script Properties private.

Save only the resulting HTTPS `/exec` deployment URL in `/home/ldoni/globo-google-relay-url.txt`. No password, authorization code or secret needs to be sent in chat. The relay URL is not sufficient to send without the private signing key.

Verify that the intended coordinator is a subscribed group member. Automatic notifications need the owner account to be allowed to post; public email enquiries need external posting permission too. Keep conversations and membership details restricted. Google Groups membership does not alter Cloudflare Access membership.

Once owner authorization is complete, verify the actual deployed relay and group behavior, install GOOGLE_RELAY_URL securely and select `MAIL_TRANSPORT=google_apps_script`. Keep CONTACT_ENABLED=false until the end-to-end sending check is authorized and passes. Add the exact Worker origin to the public CSP and then publish the endpoint/site key. Do not replace an unavailable service with a fictitious receipt.

References: [Google web app deployment](https://developers.google.com/apps-script/guides/web), [MailApp](https://developers.google.com/apps-script/reference/mail/mail-app), [Google quotas](https://developers.google.com/apps-script/guides/services/quotas), [Content Service redirects](https://developers.google.com/apps-script/guides/content).

## Executable production checks

`node scripts/check_google_mail.mjs` reads the external deployment URL and signing-key files, checks readiness and verifies that unsigned and incorrectly signed requests are rejected. It sends no valid notification. Before owner deployment it exits explicitly with a waiting status, rather than claiming a successful test.

The owner requested an email test. After the owner completes Google authorization, `node scripts/check_google_mail.mjs --send-test` additionally submits one clearly labeled synthetic notification to the fixed project group. It records only a reference and provider acceptance, never credentials or the owner's address. Actual inbox receipt and coordinator group subscription still require confirmation by a group member. Sending remains opt-in and is not run just by opening the private setup guide or authorizing Google.
