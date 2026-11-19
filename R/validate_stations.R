# Source from the repository root. Private input is never written to disk.
public_station_fields <- c('station_id','station_name','country','latitude','longitude',
  'institution','category','ocean_basin','sampling_status','public_description',
  'institution_url','coordinate_status','publication_status')

validate_stations <- function(x, categories_file = 'config/station-categories.json') {
  required <- setdiff(public_station_fields, c('public_description','institution_url'))
  if (!is.data.frame(x) || !all(required %in% names(x)))
    stop('Station schema: required columns missing', call. = FALSE)
  # Avoid printing records or private fields in logs.
  for (k in names(x)) if (is.character(x[[k]])) x[[k]] <- trimws(x[[k]])
  if (anyNA(x$station_id) || any(!grepl('^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$', x$station_id)))
    stop('Station identifier missing or invalid', call. = FALSE)
  if (anyDuplicated(x$station_id)) stop('Duplicate station identifiers', call. = FALSE)
  if (anyNA(x$publication_status) || any(!x$publication_status %in% c('draft','approved','inactive')))
    stop('Invalid publication status', call. = FALSE)
  cfg <- jsonlite::read_json(categories_file, simplifyVector = FALSE)
  if (anyNA(x$category) || any(!x$category %in% names(cfg$categories)))
    stop('Invalid station category', call. = FALSE)
  for (k in c('latitude','longitude')) {
    original <- x[[k]]
    x[[k]] <- suppressWarnings(as.numeric(original))
    bad <- !is.na(original) & nzchar(as.character(original)) & !is.finite(x[[k]])
    if (any(bad)) stop('Invalid coordinate value', call. = FALSE)
  }
  if (any(abs(x$latitude) > 90, na.rm = TRUE) || any(abs(x$longitude) > 180, na.rm = TRUE))
    stop('Coordinate outside geographic bounds', call. = FALSE)
  ok <- x$publication_status == 'approved'
  for (k in required) if (any(is.na(x[[k]][ok])) || any(trimws(as.character(x[[k]][ok])) == ''))
    stop('Approved station missing an essential field', call. = FALSE)
  if (any(!x$coordinate_status[ok] %in% 'verified'))
    stop('Approved coordinates must be verified', call. = FALSE)
  if (!isTRUE(cfg$confirmed) && any(x$category[ok] != 'unclassified'))
    stop('Project categories await confirmation', call. = FALSE)
  if (any(!x$ocean_basin[ok] %in% c('Pacific','Atlantic','Indian','Mediterranean')))
    stop('Invalid ocean basin for approved station', call. = FALSE)
  if (any(!x$sampling_status[ok] %in% c('planned','active','completed','paused','unconfirmed')))
    stop('Invalid sampling status', call. = FALSE)
  for (k in setdiff(public_station_fields,names(x))) x[[k]] <- ''
  urls <- x$institution_url[ok]
  if (any(!is.na(urls) & nzchar(urls) & !grepl('^https://[^[:space:]]+$',urls)))
    stop('Institution URL must use HTTPS', call. = FALSE)
  public <- x[ok, public_station_fields, drop = FALSE]
  public <- public[order(public$station_id), , drop = FALSE]
  rownames(public) <- NULL
  public
}

station_geojson <- function(x) {
  features <- lapply(seq_len(nrow(x)), function(i) {
    props <- as.list(x[i, setdiff(public_station_fields,c('latitude','longitude')),drop=FALSE])
    props <- lapply(props,function(v) if(is.na(v)) '' else unname(v))
    list(type='Feature', geometry=list(type='Point',coordinates=unname(c(x$longitude[i],x$latitude[i]))), properties=props)
  })
  list(type='FeatureCollection',dataset_status='approved_registry',features=features)
}

publish_registry <- function(x, output_dir = 'data') {
  public <- validate_stations(x)
  dir.create(output_dir, recursive=TRUE, showWarnings=FALSE)
  staging <- tempfile('.registry-',tmpdir=output_dir)
  dir.create(staging)
  on.exit(unlink(staging,recursive=TRUE),add=TRUE)
  write.csv(public,file.path(staging,'stations.csv'),row.names=FALSE,na='')
  jsonlite::write_json(station_geojson(public),file.path(staging,'stations.geojson'),auto_unbox=TRUE,pretty=TRUE,na='null')
  # Both outputs are fully generated before touching the published pair.
  files <- c('stations.csv','stations.geojson')
  old <- lapply(files,function(f){path<-file.path(output_dir,f);if(file.exists(path)) readBin(path,'raw',n=file.info(path)$size) else NULL})
  success <- FALSE
  on.exit(if(!success) for(i in seq_along(files)) {
    path<-file.path(output_dir,files[i]);if(is.null(old[[i]])) unlink(path) else writeBin(old[[i]],path)
  },add=TRUE)
  for(f in files) if(!file.copy(file.path(staging,f),file.path(output_dir,f),overwrite=TRUE)) stop('Publishing failed')
  success <- TRUE
  invisible(nrow(public))
}

if (sys.nframe() == 0L) {
  x <- read.csv('data/stations.csv',stringsAsFactors=FALSE,check.names=FALSE)
  public <- validate_stations(x)
  actual <- jsonlite::read_json('data/stations.geojson',simplifyVector=FALSE)
  if(!identical(actual$features,station_geojson(public)$features)) stop('CSV and GeoJSON differ')
  message('Station registry valid: ',nrow(public),' approved records')
}
