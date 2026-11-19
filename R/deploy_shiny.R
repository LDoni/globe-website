# Run from repo root. Credentials are kept in the runner's rsconnect config only.
required <- c('SHINYAPPS_ACCOUNT','SHINYAPPS_TOKEN','SHINYAPPS_SECRET')
if(any(!nzchar(Sys.getenv(required)))) stop('shinyapps.io deployment credentials are required')
source('R/prepare_shiny_cache.R')
prepare_shiny_cache()
rsconnect::setAccountInfo(name=Sys.getenv('SHINYAPPS_ACCOUNT'),token=Sys.getenv('SHINYAPPS_TOKEN'),secret=Sys.getenv('SHINYAPPS_SECRET'))
app_dir <- 'shiny/globe-monitoring'
files <- c('app.R',file.path('modules',list.files(file.path(app_dir,'modules'))),file.path('cache',list.files(file.path(app_dir,'cache'))))
rsconnect::deployApp(app_dir,appName='globe-ocean-monitoring',account=Sys.getenv('SHINYAPPS_ACCOUNT'),appFiles=files,launch.browser=FALSE)
