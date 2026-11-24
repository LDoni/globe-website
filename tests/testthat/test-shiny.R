withr::local_dir(normalizePath('../..'))
library(shiny)
source('shiny/globo-monitoring/modules/enso.R')
source('shiny/globo-monitoring/modules/stations.R')
test_that('ENSO module produces a cached summary without remote calls',{
 cache<-jsonlite::read_json('data/monitoring/enso.json',simplifyVector=FALSE)
 shiny::testServer(enso_server,args=list(cache=cache),{
   session$setInputs(years=3)
   expect_match(output$latest,'RONI')
   expect_match(output$timestamps,'Observation period')
   expect_true(nrow(selected())>0)
 })
})
test_that('station module supports an empty approved registry',{
 shiny::testServer(stations_server,args=list(registry=list(features=list()),environment=data.frame()),{
   expect_match(output$status,'No approved stations')
 })
})
