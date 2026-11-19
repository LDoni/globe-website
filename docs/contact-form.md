# Join the initiative contact form

The public form requests name, email, institution, country, proposed contribution, message and consent to be contacted. It prepares an email draft locally. It does not post personal data to a public API, store it in browser storage, save it in Git, or create a station record.

Set `contact_email` in `assets/site-config.json` to an approved destination address. Until this is set, the form supports drafting and explicitly states that nothing has been sent. Once configured, an `Open email draft` link opens the visitor's email application using `mailto:`. The visitor reviews and sends the email there. The website never claims receipt or delivery.

This initial portable implementation requires no additional account, paid service or server credentials. A later server-delivered contact form can replace this transport after selecting an authorized mail provider and recipient. No external message has been sent during development.

Before enabling the destination, confirm its publication, the responsible institution's privacy notice and retention policy. Do not request unpublished research results or confidential attachments through this enquiry form. An enquiry is not membership approval.

Pure draft-generation tests run with `node --test tests/contact.test.cjs`. Browser validation is included in `tests/browser.py`, and passed locally and against the public GitHub Pages site.
