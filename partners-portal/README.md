# GLOBO partner workspace

The private Cloudflare Pages application at https://globe-partners.pages.dev/ is separate from public GitHub Pages. Production and wildcard previews require email one-time PIN, an exact-email Access policy and a verified origin JWT. Three participants are configured privately, including one coordinator; the owner confirmed that real production login opens after the Workers redirect-mode fix. The configuration rejects more than 50 distinct participants. No confidential content or partner-address list is committed.

## Short partner instructions

The English [quick guide](public/guide.html) is available through **Quick guide** in the workspace header and at https://globe-partners.pages.dev/guide.html after authentication. It covers sign-in, the shared workbook, tickets, comments, resolution/history and owner-only ticket deletion. The guide contains no partner identities or confidential documents and uses the same Access/origin guard as the rest of the portal.

## Retained private file backend

Documents & files and Upload file have been removed from the interface at the owner’s request. Existing stored files and protected endpoints remain preserved. The following describes the retained backend, not an available menu.

### File storage

Coordinators can open **Documents & files → Upload file**, choose a file, enter its title/category/description and upload. All authorized members can search and download it. Supported formats: XLSX, DOCX, PDF, CSV, TXT, PNG and JPEG; maximum 10 MiB each. Files use the existing private GLOBO_WORKSPACE KV binding, not the public repository or Quarto output. Downloads require the same authenticated membership as the workspace and are sent as attachments with no-store/nosniff headers. Executable/HTML/SVG uploads, invalid filenames, mislabeled signatures, empty files and oversized bodies are rejected.

The library checks a 200-file/250-MiB application budget per environment; concurrent uploads and KV eventual consistency mean this is a capacity check, not an atomic global quota. Provider Free account limits remain authoritative. No R2, subscription upgrade or paid seat was enabled. Failed multi-key uploads may leave inaccessible binary objects without a catalogue entry; no automatic deletion job is used.

## Tickets

Ticket deletion is restricted server-side to a single email configured through the encrypted Pages secret `GLOBO_TICKET_ADMIN_EMAIL`. Without it, deletion is denied to everyone, including coordinators. Membership/JWT verification remains mandatory. The owner confirms the action in the browser; deletion writes a private `ticket-deleted:<id>` tombstone with identity and timestamp. Deleted tickets disappear from lists/snapshots and direct reads, comments and status changes return 404. Original records/comments remain privately stored for recovery; no irreversible purge occurs. KV eventual consistency also applies to deletion visibility.

Every authorized member can create, read and comment on all tickets. Authors and coordinators can mark them Resolved or reopen them. Resolved conversations remain available through the status filter, search and pagination. Each comment has a unique immutable key to avoid overwriting concurrent replies. Ticket status uses a separate current-state key; it never deletes the ticket or its comments. Drafts are retained on failed writes and are kept separately when switching conversations during a session. Sign-in identifies comment authors server-side; client-supplied authors/roles are rejected.

The former campaign and station-update forms/review cards are removed from the interface. Their existing stored records and legacy API are retained; nothing was deleted or republished to the scientific station register.

## Retained sampling backend

Sampling overview, workbook import and Join enquiries are removed from the workspace interface at the owner’s request. Their private records and protected backend endpoints remain stored; no records were deleted. The following describes the retained sampling data format, not an available workspace menu.

`Samples`: sample_id and station_id are required; collection_date, latitude, longitude and material are optional. `Extractions`: extraction_id and matching sample_id are required; extraction_date, dna_concentration_ng_ul, dna_yield_ng and method are optional. Multiple extractions may refer to one sample. Dates use YYYY-MM-DD or genuine Excel serial dates. Numeric cells preserve raw precision; blanks stay null. Coordinates must be a valid pair of recorded decimal degrees. Formulas, duplicate IDs, unknown stations, orphan extractions and impossible dates are rejected. A workbook supports at most 5,000 combined rows and a 2-MiB normalized payload.

The browser parses XLSX locally using vendored SheetJS CE 0.20.3; no workbook is sent to an external parser. The server revalidates the normalized records and binds them to an existing uploaded XLSX. This is a coordinator-published interpretation of that workbook, not an independently server-reparsed or scientifically approved dataset. The original file remains available. Individual workbooks are selected separately to avoid double-counting revisions. The overview shows samples, DNA extractions and distinct samples with extractions, with station bars and a table. Missing coordinates/dates are counted, never inferred. Publishing here does not change public stations or authorize environmental extraction.

## Build and tests

```bash
node scripts/build_partner_portal.mjs
node --test tests/partners-access.test.mjs tests/partners-workspace.test.mjs \
  tests/partners-cloudflare.test.mjs tests/partners-build.test.mjs \
  tests/partners-collaboration.test.mjs tests/partners-shared-sheet.test.mjs
node tests/partners-runtime.mjs
node tests/partners-ticket-runtime.mjs
node tests/partners-kv-persistence.mjs
.venv/bin/python tests/portal-browser.py
node tests/portal-preview.mjs
# http://127.0.0.1:8790 — synthetic identities and documents only, never deploy.
```

The browser test uses a real synthetic XLSX and exercises shared comments, resolved history, permissions, binary download, preview/publish/counts, failed-save drafts and 375/768/1440 px. The runtime regression uses actual workerd; no fake login code is deployed. Local tests do not establish successful authenticated production submissions or downloads.

## Cloudflare configuration

Pages root `partners-portal`; build `node ../scripts/build_partner_portal.mjs`; output `.build`; production branch `main`. Wrangler is local-only: do not add pages_build_output_dir without migrating every dashboard binding. Both environments retain Fail closed, issuer CF_ACCESS_TEAM_DOMAIN, respective audience CF_ACCESS_AUD, encrypted GLOBO_PARTNER_EMAILS/GLOBO_COORDINATOR_EMAILS, and separate existing GLOBO_WORKSPACE namespaces. Coordinators must be in the partner list. The token and real role register stay outside Git. Email OTP is the only selected provider; no broad email-domain or Everyone rules are allowed.

KV Free has account-wide limits, including 1 GB storage, 100,000 daily reads and 1,000 daily writes. Same-key writes are limited to one per second. It is eventually consistent: another session/region can briefly show an earlier state; use Refresh after propagation. Quota/storage errors return errors and never claim successful persistence. See [official limits](https://developers.cloudflare.com/kv/platform/limits/) and [the deployment audit](../docs/partners-cloudflare.md).

Externally staged document manifests remain supported by the separate builder, with path/type validation. Keep their sources outside the public repo, use a fresh external artifact directory, and verify real authorized/unauthorized direct-download behavior before confidential intake. No confidential document was uploaded by the agent. The owner manages any subsequent real document uploads through the authenticated interface.

## Shared Google workbook

The owner-supplied Google workbook is linked and embedded through the authenticated workspace. Its clean URL is configured outside Git as the encrypted Pages secret GLOBO_PARTNER_SHEET_URL in both environments. The API exposes it only after JWT/membership verification. The iframe uses the private Google edit URL, never Publish to web/pubhtml, and the parent CSP permits frames only from docs.google.com. An Open in Google Sheets button supports top-level Google sign-in when browser cookie/frame restrictions prevent embedded editing.

Google Drive permissions are a separate boundary: Cloudflare does not restrict the direct Google URL. The initial anonymous XLSX export succeeded (HTTP 200), so the owner must set General access to Restricted and add the three named participants as Editors before claiming partner-only Google access. The Google Drive connector is admin-disabled and no connected document session exists; the agent could not inspect or change Google ACLs. No Google credentials or document content are committed. Google sign-in/editor permission remains necessary even after Cloudflare login.

Uploaded files and sampling previews remain independent of the live shared Google workbook. Automatic private Google-to-plot synchronization requires authorized Google read access and an agreed sample/extraction schema; it is not silently enabled by embedding the editor. The XLSX import/template workflow is retained in source and backend but removed from the workspace interface.

## Retained direct-enquiry backend

The Join enquiry inbox is removed from the interface. Its protected backend remains restricted to coordinators and explicitly designated reviewers. Additional named reviewers require the encrypted environment list GLOBO_CONTACT_REVIEWERS; ordinary partners receive HTTP 403. This is separate from shared tickets, which remain available to all authorized participants. Intake and notification delivery status use separate KV keys to respect the per-key write limit. No real public intake is enabled until the Worker, Turnstile and genuine mail sender are configured. See [contact setup](../docs/contact-form.md).
