# Station register and coordinator workflow

Use one worksheet named `stations`, one header row, and one row per station. IDs must remain stable when names or affiliations change. Store the sheet ID as `GLOBE_SHEET_ID`; select the tab with `GLOBE_SHEET_TAB`.

| Column | Required for approval | Allowed content |
| --- | --- | --- |
| `station_id` | Yes | Unique letters/digits plus `_`, `-`, `.`; max 64 characters |
| `station_name` | Yes | Confirmed station name |
| `country` | Yes | Confirmed country label |
| `latitude` | Yes | WGS84 decimal latitude, −90 to 90 |
| `longitude` | Yes | WGS84 decimal longitude, −180 to 180 |
| `institution` | Yes | Confirmed affiliation approved for publication |
| `category` | Yes | `unclassified`; or `incursion`, `pacific`, `reference` after project definitions are confirmed |
| `ocean_basin` | Yes | `Pacific`, `Atlantic`, `Indian`, `Mediterranean` |
| `sampling_status` | Yes | `planned`, `active`, `completed`, `paused`, `unconfirmed` |
| `public_description` | No | Public scientific description; no private contact data |
| `institution_url` | No | HTTPS institutional URL |
| `coordinate_status` | Yes | `verified` for approved rows |
| `publication_status` | Yes | `draft`, `approved`, `inactive` |
| `principal_contact`, `contact_email`, `internal_notes` | Private optional input only | Accepted as input columns and never exported |

All IDs, publication states and category values are validated, including draft/inactive rows. Draft coordinates may be blank; supplied coordinates must still be numeric and within bounds. Every essential field must be present in approved rows. Invalid rows stop the publication batch. Error messages identify the type of failure without printing raw rows or private metadata.

## Publication steps

1. Add a new row as `draft`. Obtain the station's GPS coordinates and confirm affiliation, basin and scientific category with the responsible partner.
2. Review the public description and metadata. Only set `coordinate_status: verified` after checking the actual sampling location, not a town centroid.
3. An authorized coordinator changes the publication state to `approved` after public-release consent. Only coordinators should be able to edit this column; use sheet range protection and controlled editor permissions. The software does not verify consent itself.
4. The next daily workflow, or manual `Refresh approved partners and ocean cache`, reads the sheet through `googlesheets4`, validates the entire batch and generates a public CSV plus GeoJSON from an explicit field whitelist.
5. After successful checks, GitHub receives a public-data-only commit and the build/deployment workflow is called explicitly. The public website gets the new register only after the build succeeds.

Use `inactive` to remove a station from the current map. Previous public versions remain in Git history and caches; do not put confidential information in any public field expecting an inactive state to erase its history.

## Sheet authentication

Recommended: private Google Sheet, shared read-only with a dedicated Google service account. Enable Google Sheets API. Put the service-account JSON in the repository secret `GOOGLE_SERVICE_ACCOUNT_JSON`. The action writes it to a temporary file with restricted permissions, uses read-only Sheets scope, then deletes it even when a step fails. Never commit the JSON. No Google Drive-wide scope is requested.

A public read-only sheet avoids credentials only when **every sheet cell is public**, including hidden tabs and columns. Do not make the internal partner sheet public. If using a separate public-only export sheet, set repository variable `GLOBE_SHEET_PUBLIC=true`; `gs4_deauth()` will be used. Removing private fields from exported GeoJSON does not make private columns safe in a publicly accessible Sheet.

## Failure and review

Validation and serialization finish before published files are replaced. Local rollback restores both previous outputs if file publication fails. Workflow failures before the commit leave the repository and live website unchanged. GitHub Actions records a failed run and summary; maintainers can enable GitHub's own failed-workflow notifications. Raw sheet contents and credentials are not uploaded as diagnostic artifacts.

Tests use synthetic records and verify approval filtering, invalid metadata, private-column exclusion and byte-for-byte preservation after validation failure. A real Google Sheets connection has not yet been tested.
