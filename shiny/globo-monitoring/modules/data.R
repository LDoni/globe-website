data_ui <- function(id) fluidPage(h2('Data explorer'),p('Future module for approved GLOBO scientific results. No unpublished microbiological data are included in this deployment.'))
data_server <- function(id) moduleServer(id,function(input,output,session){invisible(NULL)})
