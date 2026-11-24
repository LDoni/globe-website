ocean_ui <- function(id){ns<-NS(id);fluidPage(h2('Global ocean conditions'),
  p('NOAA gridded SST anomaly analysis. Display cells are subsampled for speed, not spatial averages. Coastal interpretation requires the native-resolution product.'),
  selectInput(ns('date'),'Observation date',choices=character()),textOutput(ns('metadata')),leafletOutput(ns('map'),height=530))}
ocean_server <- function(id,cache) moduleServer(id,function(input,output,session){
  frames<-cache$frames
  if(length(frames)) updateSelectInput(session,'date',choices=setNames(as.character(seq_along(frames)),vapply(frames,function(f)f$observation_date,character(1))))
  selected<-reactive({validate(need(length(frames)>0,'Observed SST anomaly cache is unavailable. No synthetic field is substituted.'));req(input$date);frames[[as.integer(input$date)]]})
  output$metadata<-renderText({f<-selected();paste(f$observation_date,f$source,f$product_id,'°C | baseline',f$baseline,'| retrieved',f$retrieved_at)})
  output$map<-renderLeaflet({f<-selected();validate(need(identical(f$units,'degree_C')&&nzchar(f$baseline),'Units or baseline missing'));validate(need(is.numeric(f$grid_spacing_deg)&&f$grid_spacing_deg>0&&f$grid_spacing_deg<=10,'Grid spacing invalid'));m<-leaflet(options=leafletOptions(preferCanvas=TRUE)) |> addProviderTiles(providers$Esri.OceanBasemap) |> setView(180,10,2);cells<-f$cells
    if(!length(cells)) return(m)
    x<-do.call(rbind,lapply(cells,as.data.frame));x$lon<-ifelse(x$lon<30,x$lon+360,x$lon)
    pal<-colorNumeric(c('#365b9a','#a5d2dd','#f6dfb8','#b84c43'),domain=c(-3,3),na.color='transparent');step<-f$grid_spacing_deg
    m |> addRectangles(lng1=x$lon-step/2,lat1=x$lat-step/2,lng2=x$lon+step/2,lat2=x$lat+step/2,stroke=FALSE,fillOpacity=.8,fillColor=pal(pmax(-3,pmin(3,x$value))),label=paste(round(x$value,2),'°C')) |> addLegend(pal=pal,values=c(-3,3),title='SST anomaly (°C)')
  })
})
