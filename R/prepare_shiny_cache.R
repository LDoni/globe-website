prepare_shiny_cache <- function() {
  destination <- 'shiny/globe-monitoring/cache'
  dir.create(destination,recursive=TRUE,showWarnings=FALSE)
  files <- c('data/monitoring/enso.json','data/monitoring/sst.json','data/stations.geojson','data/monitoring/station-environment.csv','data/monitoring/station-environment.meta.json')
  if(!all(file.exists(files))) stop('Required public cache missing')
  for(f in files) if(!file.copy(f,file.path(destination,basename(f)),overwrite=TRUE)) stop('Could not stage Shiny cache')
}
if(sys.nframe()==0L) prepare_shiny_cache()
