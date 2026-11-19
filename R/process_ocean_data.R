# NOAA RONI pipeline. Downloads once per scheduled job, never per Shiny session.
atomic_json <- function(object,path) {
  dir.create(dirname(path),recursive=TRUE,showWarnings=FALSE)
  temp <- tempfile('.cache-',tmpdir=dirname(path));on.exit(unlink(temp),add=TRUE)
  jsonlite::write_json(object,temp,auto_unbox=TRUE,pretty=TRUE,na='null')
  if(!file.rename(temp,path)) stop('Cache replacement failed')
}
parse_roni <- function(path,today=Sys.Date()) {
  x <- read.table(path,header=TRUE,stringsAsFactors=FALSE)
  if(!identical(names(x),c('SEAS','YR','ANOM')) || nrow(x)<1) stop('Unexpected NOAA schema')
  seasons <- c('DJF','JFM','FMA','MAM','AMJ','MJJ','JJA','JAS','ASO','SON','OND','NDJ')
  if(any(!x$SEAS %in% seasons)||any(!is.finite(x$ANOM))||any(abs(x$ANOM)>10)||any(x$YR<1950)||any(x$YR>as.integer(format(today,'%Y')))) stop('Invalid NOAA data')
  key <- x$YR*12+match(x$SEAS,seasons)
  if(anyDuplicated(key)||is.unsorted(key,strictly=TRUE)) stop('NOAA seasons duplicated or unordered')
  lapply(seq_len(nrow(x)),function(i){
    month <- match(x$SEAS[i],seasons); centre <- as.Date(sprintf('%04d-%02d-01',x$YR[i],month))
    start <- seq(centre,by='-1 month',length.out=2)[2]
    end <- seq(centre,by='1 month',length.out=3)[3]-1
    if(end>today) stop('NOAA seasonal period extends into future')
    list(season=x$SEAS[i],year=x$YR[i],value=x$ANOM[i],period_start=as.character(start),period_end=as.character(end))
  })
}
process_enso <- function() {
  options(timeout=90)
  url <- 'https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt'
  tmp <- tempfile();on.exit(unlink(tmp),add=TRUE)
  download.file(url,tmp,quiet=TRUE,mode='wb')
  records <- parse_roni(tmp)
  object <- list(index='RONI',source='NOAA Climate Prediction Center',source_url=url,
    definition='Three-month relative Niño 3.4 SST anomaly; see source definition for product revisions',
    definition_url='https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/',
    baseline='1991–2020 (current CPC definition; confirm upon upstream product changes)',units='degree_C',
    retrieved_at=format(Sys.time(),'%Y-%m-%dT%H:%M:%SZ',tz='UTC'),records=records)
  atomic_json(object,'data/monitoring/enso.json')
  message('NOAA RONI cache updated; ',length(records),' seasons')
}
if(sys.nframe()==0L) process_enso()
