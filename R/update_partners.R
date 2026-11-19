source('R/validate_stations.R')
update_partners <- function() {
  sheet <- Sys.getenv('GLOBE_SHEET_ID')
  if(!nzchar(sheet)) stop('GLOBE_SHEET_ID is required; existing registry preserved')
  if(tolower(Sys.getenv('GLOBE_SHEET_PUBLIC','false')) == 'true') {
    googlesheets4::gs4_deauth()
  } else {
    credentials <- Sys.getenv('GOOGLE_APPLICATION_CREDENTIALS')
    if(!nzchar(credentials) || !file.exists(credentials)) stop('Private sheet requires a service account credential file')
    googlesheets4::gs4_auth(path=credentials,scopes='https://www.googleapis.com/auth/spreadsheets.readonly')
  }
  x <- as.data.frame(googlesheets4::read_sheet(sheet,sheet=Sys.getenv('GLOBE_SHEET_TAB','stations'),col_types='c'),stringsAsFactors=FALSE)
  count <- publish_registry(x)
  message('Published ',count,' approved stations. Private columns excluded.')
}
if(sys.nframe()==0L) update_partners()
