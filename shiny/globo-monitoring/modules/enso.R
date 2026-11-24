enso_ui <- function(id){ns<-NS(id);fluidPage(
  h2('ENSO overview'),textOutput(ns('latest')),textOutput(ns('timestamps')),
  p('RONI is a three-month relative Niño 3.4 index. It is not a station temperature or an ENSO advisory. Recent values may be revised.'),
  sliderInput(ns('years'),'Most recent years',min=1,max=80,value=10,step=1),
  plotOutput(ns('trend')),tableOutput(ns('table')),
  h3('Official assessment and forecasts'),
  p(a('NOAA diagnostic discussion',href='https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.html'), ' · ',
    a('Official RONI outlook',href='https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/outlook/')),
  p('NOAA adopted RONI operationally in February 2026. Historical ONI and weekly Niño indices have different definitions; they are not merged here.'),textOutput(ns('provenance')))}
enso_server <- function(id,cache) moduleServer(id,function(input,output,session){
  rows <- cache$records
  selected <- reactive({
    validate(need(length(rows)>0,'ENSO cache unavailable. Consult NOAA CPC.'))
    df<-do.call(rbind,lapply(rows,function(r)data.frame(season=r$season,year=r$year,value=r$value,date=as.Date(r$period_end))))
    df[df$year>=max(df$year)-(if(is.null(input$years)) 10 else input$years)+1,,drop=FALSE]
  })
  output$latest<-renderText({validate(need(length(rows)>0,'No cached observations'));r<-rows[[length(rows)]];sprintf('Latest cached RONI: %s %s, %.2f °C',r$season,r$year,r$value)})
  output$timestamps<-renderText({validate(need(length(rows)>0,'Not retrieved'));r<-rows[[length(rows)]];paste('Observation period:',r$period_start,'to',r$period_end,'| Last successful retrieval:',cache$retrieved_at,cache$snapshot_note)})
  output$trend<-renderPlot({x<-selected();plot(x$date,x$value,type='l',col='#087e83',lwd=2,xlab='Season ending',ylab='RONI (°C)',ylim=range(c(-.5,.5,x$value)));abline(h=c(-.5,.5),lty=2,col='gray70');abline(h=0,col='gray70')})
  output$table<-renderTable({tail(selected(),12)})
  output$provenance<-renderText(paste(cache$source,cache$definition,'Reference:',cache$baseline))
})
