stations_ui <- function(id){ns<-NS(id);fluidPage(h2('Station explorer'),selectInput(ns('station'),'Approved station',choices=character()),textOutput(ns('status')),textOutput(ns('timestamps')),tableOutput(ns('metadata')),plotOutput(ns('history')),tableOutput(ns('environment')),
  p('Foundation SST analyses are not in-situ station measurements. Grid-cell location, distance, quality flags and product identity accompany each published series.'))}
stations_server <- function(id,registry,environment,metadata=list()) moduleServer(id,function(input,output,session){
  features<-registry$features
  choices<-if(length(features)) setNames(vapply(features,function(f)f$properties$station_id,character(1)),vapply(features,function(f)f$properties$station_name,character(1))) else character()
  updateSelectInput(session,'station',choices=choices)
  output$status<-renderText(if(!length(features)) 'No approved stations are available. Demonstration locations are excluded from environmental extraction.' else 'Select an approved station. Environmental observations appear only after product and coastal-grid review.')
  output$timestamps<-renderText(if(is.null(metadata$retrieved_at)) 'Last successful environmental update: not available' else paste('Last successful environmental update:',metadata$retrieved_at,'| Observation interval:',metadata$observation_start,'to',metadata$observation_end))
  selected<-reactive({req(input$station);idx<-which(vapply(features,function(f)f$properties$station_id==input$station,logical(1)));req(length(idx)==1);features[[idx]]})
  output$metadata<-renderTable({f<-selected();data.frame(station_id=f$properties$station_id,name=f$properties$station_name,country=f$properties$country,institution=f$properties$institution,latitude=f$geometry$coordinates[[2]],longitude=f$geometry$coordinates[[1]])})
  series<-reactive({req(input$station);validate(need(nrow(environment)>0,'Station environmental data have not been configured.'));x<-environment[environment$station_id==input$station,,drop=FALSE];validate(need(nrow(x)>0,'No approved environmental data for this station.'));x[order(x$date),,drop=FALSE]})
  output$history<-renderPlot({x<-series();plot(as.Date(x$date),x$sst_c,type='l',xlab='Observation date',ylab='Foundation SST (°C)',col='#087e83',lwd=2)})
  output$environment<-renderTable(series())
})
