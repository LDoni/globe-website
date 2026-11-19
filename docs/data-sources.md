# Ocean data sources, definitions and provenance

Sources checked against official documentation on 19 November 2026. Product definitions and metadata can change; each successful retrieval records source and timestamp. No cached value is presented as a continuous real-time observation.

| Source/product | Implemented use | Frequency / interpretation |
| --- | --- | --- |
| [NOAA CPC RONI](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/) | Cached seasonal history and latest cached value | Monthly; CPC says updated by the 5th; recent estimates can be revised |
| [RONI ASCII series](https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt) | R preprocessing source; strict schema `SEAS YR ANOM` | Three-month seasons; year follows the central month |
| [RONI transition](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/announcement.php) | Definition documentation | Operational transition in February 2026 |
| [ENSO diagnostic discussion](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.html) | Official external assessment link | Monthly; do not infer advisory state from one index value |
| [Official RONI outlook](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/outlook/) | Official external forecast link | Second Thursday of month alongside discussion; overlapping seasonal forecasts |
| [Official ENSO probabilities](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/probabilities/) | Official external probabilities link | Issue date and definition belong to NOAA; no probabilities fabricated or manually copied |
| [NOAA OceanWatch SST anomaly metadata](https://oceanwatch.pifsc.noaa.gov/erddap/info/CRW_sst_anom_v1_0/index.html) | Spatial adapter and date cache | Daily native 0.05° analysis; global display subsampling at 2° |
| [NOAA CRW v3.1 climatology](https://coralreefwatch.noaa.gov/product/5km/description_climatology.php) | Explicit anomaly baseline | Derived from 1985–2012, adjusted to represent 1985–1990 plus 1993 |
| [Copernicus OSTIA product](https://data.marine.copernicus.eu/product/SST_GLO_SST_L4_NRT_OBSERVATIONS_010_001/description) | Selected foundation SST station product | Daily Level 4, 0.05°, satellite and in-situ analysis |
| [OSTIA data services](https://data.marine.copernicus.eu/product/SST_GLO_SST_L4_NRT_OBSERVATIONS_010_001/services) | Dataset `METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2` | Rolling recent coverage; verify date availability |
| [Marine Toolbox subset API](https://toolbox-docs.marine.copernicus.eu/en/stable/python-interface.html) | Optional subset extraction | Supported service client, no deprecated Motu/FTP automation |

## ENSO definitions

The current RONI documentation describes a three-month relative Niño 3.4 anomaly, accounting for mean tropical SST anomalies, using the 1991–2020 baseline and ERSSTv6. Retain the source and definition URL because operational versions change. RONI and ONI do not have identical definitions; older ONI climatologies also differ over time. This release does not merge them, plot one against the other's threshold as though equivalent, or translate a single seasonal value into a coupled ENSO event classification.

The initial snapshot contains only 2024–2026, as retrieved from NOAA during development. The R updater downloads the complete available ASCII series. A retrieval timestamp is the last successful fetch, not the date that the underlying ocean was observed. A season is explicitly expanded into its first/last calendar dates, including cross-year periods.

Weekly Niño 1+2, Niño 3, Niño 3.4 and Niño 4 processing, numeric diagnostic-summary parsing and automated forecast-probability ingestion are future extensions. Current official links provide access without conflating those quantities with RONI.

## SST anomaly map

The selected ERDDAP identifier retains `v1_0` in its name, while its metadata identifies the delivered suite as product version 3.1. The adapter checks `product_version == 3.1` and °C units before use; it refuses an upstream product-version change until the baseline is reviewed. Metadata and download URLs are retained. The source's historical text contains mixed legacy descriptions, so do not infer the baseline solely from its identifier.

Global maps are produced by selecting every 40th native pixel in each direction, yielding 2° spacing. No spatial mean is computed. Display rectangles are coarse sample-cell symbols and can overlap coastlines; they do not resolve coastlines or represent temperature measurements throughout their area. Missing/land pixels are not given a synthetic value. The map is for global context only. The station pipeline uses a different, native-resolution product.

The anomaly legend saturates outside ±3°C; numeric tooltip values retain the actual values. The initial cache contains no spatial observations because direct downloading is blocked in the development environment. Test fixtures use explicitly synthetic values inside test code only.

## Coastal station SST

OSTIA foundation SST estimates temperatures without diurnal warming. It is not automatically equivalent to a bottle sample's temperature, depth or sampling time. The NRT product has a rolling recent window, not a uniform multi-decade archive. Historical work will require a consistent reprocessed product and a reviewed treatment of any NRT/REP transition. The adapter does not splice products or compute a new anomaly baseline silently.

`config/station-grid-mappings.csv` starts empty. Each entry must refer to an approved, verified station and an explicitly reviewed sea grid cell. Review land/sea/ice/lake mask, local coastal geometry, actual cell coordinates, cell distance and analysis error. A 10 km guardrail catches obvious mapping mistakes; it is not evidence of station representativeness. The code rejects land, missing or invalid cells and stores analysis error plus actual cell distance; it does not search arbitrarily farther offshore for a plausible value.

Test the current Toolbox response, variable names, subset bounds and metadata with a real account before enabling the scheduled job. Python optional dependencies are version ranges until resolved and frozen in the first authenticated validation. The initial station environment cache has no fabricated observations.

## Attribution and basemap

Credit NOAA CPC, NOAA Coral Reef Watch and Copernicus Marine/Met Office with the product identifiers and available DOI. OSTIA product DOI: [10.48670/moi-00165](https://doi.org/10.48670/moi-00165). Follow each product's current citation terms when releasing a figure or dataset. Esri Ocean basemap attribution remains visible on the Leaflet map. Basemap tiles contain geography, not GLOBE scientific observations.
