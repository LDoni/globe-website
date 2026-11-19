library(shiny)
library(leaflet)
for(f in list.files('modules',pattern='\\.R$',full.names=TRUE)) source(f,local=TRUE)
read_cache <- function(name, fallback) {
  path <- file.path('cache',name)
  if(!file.exists(path)) return(fallback)
  tryCatch(jsonlite::read_json(path,simplifyVector=FALSE),error=function(e)fallback)
}
# Read once at process startup; no remote connections and no credentials in bundle.
enso <- read_cache('enso.json',list(records=list(),source='Unavailable',retrieved_at=NULL))
sst <- read_cache('sst.json',list(frames=list()))
stations <- read_cache('stations.geojson',list(features=list()))
environment <- if(file.exists('cache/station-environment.csv')) read.csv('cache/station-environment.csv',stringsAsFactors=FALSE) else data.frame()
environment_meta <- read_cache('station-environment.meta.json',list())
ui <- navbarPage('GLOBE Ocean Monitoring',id='tabs',
  header=tags$div(style='padding:12px 25px;background:#edf5f5;color:#17374b',
    'Public oceanographic data only. Cached analyses are distinct from official forecasts. No unpublished microbiological data.'),
  tabPanel('ENSO Overview',enso_ui('enso')),
  tabPanel('Global Ocean Conditions',ocean_ui('ocean')),
  tabPanel('Station Explorer',stations_ui('stations')),
  tabPanel('Data Explorer',data_ui('data')),
  footer=tags$div(style='padding:20px',tags$a(href='https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/','NOAA CPC'), ' · ',tags$a(href='https://marine.copernicus.eu/','Copernicus Marine'))
)
server <- function(input,output,session) {
  enso_server('enso',enso)
  ocean_server('ocean',sst)
  stations_server('stations',stations,environment,environment_meta)
  data_server('data')
}
shinyApp(ui,server)
