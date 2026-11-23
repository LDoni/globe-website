# Project renaming estimate

Estimate: **4–8 working hours** for the public website, private workspace and hosted URLs, assuming one final replacement name, available free hosting names, owner access and supplied/reusable brand assets. Text-only replacement in the website is approximately 30–60 minutes including checks. This is an engineering estimate, not a quote for domains or paid services.

The replacement name is confirmed: **GLOBE → GLOBO**. This remains a migration estimate; the public branding, organization/repository and hosting identifiers have not been renamed. No rename, organization migration, project deletion, domain registration or subscription change has been performed.

| Work | Estimated effort |
| --- | --- |
| Content, visible project name, logo references and metadata | 0.5–1 hour |
| Repository paths, canonical URLs, navigation, workflow/configuration references | 1–2 hours |
| GitHub Pages/organization and Cloudflare project/Access URL migration | 1–2 hours |
| Authentication, previews, direct files, redirects/old links and browser regression checks | 1.5–3 hours |

The estimate assumes no framework or data model change. New hosting identifiers must be checked for availability before choosing them. A new custom domain would require separate owner authorization and DNS configuration; no purchase is included. If an organization name changes, owner intervention may be needed. Existing data stores and confidential files must be preserved, with the replacement private origin protected before use.

Git repository redirects should not be assumed to redirect the website: [GitHub organization renaming](https://docs.github.com/en/organizations/managing-organization-settings/renaming-an-organization) and [repository renaming](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository) have distinct consequences. Cloudflare Git integration and private Access host/audience mappings must be verified against the actual replacement deployment. Authentication, DNS or provider processing time is outside the working-hour estimate.
