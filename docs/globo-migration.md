# Prepared GLOBE → GLOBO migration

The owner authorized preparation on 23 November 2026. Existing public and private URLs remain active. No organization was renamed, custom domain purchased or production data moved.

`config/globo-migration.json` records the proposed free hosting targets:

- Public: `https://globo-ocean.github.io/`, repository `globo-ocean/globo-ocean.github.io`.
- Private: `https://globo-partners.pages.dev/`, separately protected production and wildcard previews.

These names are candidates, not reserved or deployed URLs. A custom email domain is a separate decision and requires domain ownership; neither hosting address supplies an email domain.

After committing source, run `node scripts/prepare_globo_migration.mjs`. It copies tracked files into ignored `.local-data/globo-migration`, changes visible Quarto/portal branding and hosting references, and emits `MIGRATION-REVIEW.json`. It refuses to overwrite a candidate and never writes to the live source, Git remotes or cloud configuration. Use a different ignored output path for a later candidate. The candidate is for review, not ready for automatic deployment.

Stable station/sample IDs, `GLOBE_*` environment bindings and existing KV records remain unchanged to preserve scientific joins and authorization. Historical documents and supplied raster/PDF assets are preserved. The supplied standalone GLOBO static PNG is now available at assets/images/globo-logo-static.png (2172 × 724, RGB with a white background). The candidate uses it in public headers, the hero and the private workspace. The previous GLOBE animation mask is removed only from the candidate, pending the matching animated GLOBO asset. Existing production branding is preserved until the coordinated switch.

## Activation gates

1. The owner creates or authorizes the new GitHub organization. The ordinary repository token does not create a GitHub organization. Verify actual name availability before publishing the URL.
2. Create the target repository and deploy the candidate public site. Test canonical links, all pages, maps, chart caches, navigation and logo at all viewport widths.
3. Create the replacement private Pages project using the existing source/build settings and KV namespaces. Set roles and Google URL securely, configure OTP-only exact-email Access for production and wildcard previews, and update issuer/audiences. Retain the 50-user ceiling. Never expose a private file during migration.
4. Verify anonymous/forged denial and real member/coordinator access, uploads, tickets, comments and existing-data persistence on the new origin.
5. Update the public protocol's tracker link, Turnstile hostnames, Worker allowed origin, contact endpoint and Google editor return links. Configure genuine email delivery before enabling Join.
6. Only after successful checks change canonical URLs, publish links and decide the old-site redirect strategy. Git repository redirects do not guarantee GitHub Pages redirects. Preserve the original services until this is verified.

The updated Cloudflare token now manages Workers and Turnstile. Owner Google authorization and replacement-host verification remain separate prerequisites. No paid features, seats or subscriptions are required by this preparation.
