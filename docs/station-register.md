# Station register and coordinator workflow

Use one worksheet named `Stations`, one header row, and one row per station. IDs must remain stable when names or affiliations change. Store the sheet ID as `GLOBE_SHEET_ID`; select the tab with `GLOBE_SHEET_TAB`.

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


## Supplied workbook and future Google Sheet

The supplied local workbook has 30 rows, all `draft`, and separate schematic map coordinates. It is excluded from Git and deployment. Its 24 raw country labels are not substituted for the declared 23-country project scope without review.

```bash
python3 scripts/import_station_workbook.py GLOBE_sampling_stations.xlsx
# Validate the canonical intake without publishing it:
Rscript -e 'source("R/validate_stations.R"); print(nrow(validate_stations(read.csv(".local-data/stations-input.csv"))))'
quarto render
python3 scripts/build_workbook_preview.py
python3 -m http.server 8768 --directory _local_preview
```

`.local-data` and `_local_preview` are local-only and excluded from Git. Never deploy `_local_preview`. It contains unapproved schematic locations and is provided for coordinator review.

When the workbook is converted to Google Sheets, set `GLOBE_SHEET_ID` and use the `Stations` tab. Both the canonical schema above and the supplied workbook schema are accepted. `map_label` maps to `station_name`, and category labels are normalized. `latitude` and `longitude` must contain verified sampling coordinates before approval: `map_latitude_approx` and `map_longitude_approx` are never used as replacements. Ambiguous ocean regions require an explicit `ocean_basin`; institutions and category approval remain required. `notes`, `contact_name`, `contact_email` and schematic coordinate columns are excluded from the approved export.

Add partners as new rows with stable unique IDs; no station count or coordinate list is hard-coded in the map or Shiny modules. The declared initial scope is 30 stations; live approved counts and filters follow the published registry. The existing 29-point demo is a legacy demonstration and is not the workbook intake.

## Publication pipeline update — 23 November

`R/update_partners.R` publishes both approved scientific outputs and public network CSV/GeoJSON as one staged transaction. The map projection contains only a public field whitelist; private notes and contacts cannot pass through it. Failed validation or serialization preserves all four prior files. `sampling_status` supports planned, confirmed, active, paused, completed and unconfirmed. Missing status remains unconfirmed; no activity is inferred from map presence. Coordinates are validated for finite decimal-degree bounds, without granting environmental extraction approval.

Live synchronization remains unconfigured. The shared tracking workbook inspected for schema has no Stations, Samples or Extractions tab. Embedding that workbook does not connect the station pipeline or the sampling plots. Configure an approved Stations tab and private read authorization before enabling this source; never make the internal workbook public to bypass authentication. Until then GitHub's public network CSV remains the map source.
