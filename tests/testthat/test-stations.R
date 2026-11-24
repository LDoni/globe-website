withr::local_dir(normalizePath('../..'))
fixture <- function() data.frame(station_id='TEST-1',station_name='Synthetic validation fixture',country='Test country',latitude=10,longitude=20,institution='Synthetic institution',category='unclassified',ocean_basin='Atlantic',sampling_status='planned',public_description='TEST ONLY',institution_url='https://example.org',coordinate_status='verified',publication_status='approved',principal_contact='PRIVATE PERSON',contact_email='private@example.invalid',internal_notes='CONFIDENTIAL')
test_that('workbook-style Sheets rows never promote approximate coordinates or private notes',{
  x<-data.frame(station_id='TEST-WORKBOOK',map_label='Synthetic partner',country='Test',latitude='',longitude='',map_latitude_approx=10,map_longitude_approx=20,institution='',station_category='Pacific',ocean_region='North Pacific',sampling_status='Not confirmed',coordinate_status='Schematic / unverified',publication_status='draft',notes='PRIVATE',contact_name='PRIVATE',contact_email='private@example.invalid')
  expect_equal(nrow(validate_stations(x)),0)
  x$publication_status<-'approved'
  expect_error(validate_stations(x),'essential')
  x$latitude<-10;x$longitude<-20;x$institution<-'Synthetic institution';x$station_category<-'unclassified';x$coordinate_status<-'verified'
  out<-validate_stations(x)
  expect_equal(nrow(out),1)
  expect_false(any(c('notes','contact_name','contact_email','map_latitude_approx') %in% names(out)))
})
test_that('only approved records and whitelisted fields are exported',{
  x<-fixture();draft<-x;draft$station_id<-'TEST-DRAFT';draft$publication_status<-'draft';draft$latitude<-NA
  out<-validate_stations(rbind(x,draft));expect_equal(nrow(out),1);expect_identical(names(out),public_station_fields)
  serialized<-jsonlite::toJSON(station_geojson(out),auto_unbox=TRUE)
  expect_false(grepl('PRIVATE|CONFIDENTIAL|private@example',serialized));expect_equal(station_geojson(out)$features[[1]]$geometry$coordinates,c(20,10))
})
test_that('invalid identifiers, coordinates, categories and states fail closed',{
  x<-fixture();expect_error(validate_stations(rbind(x,x)),'Duplicate')
  for(k in c('latitude','longitude')){bad<-x;bad[[k]]<-1000;expect_error(validate_stations(bad),'bounds')}
  bad<-x;bad$latitude<-'not numeric';expect_error(validate_stations(bad),'coordinate')
  bad<-x;bad$station_id<-NA;expect_error(validate_stations(bad),'identifier')
  bad<-x;bad$institution<-'';expect_error(validate_stations(bad),'essential')
  bad<-x;bad$publication_status<-'public';expect_error(validate_stations(bad),'publication')
  bad<-x;bad$category<-'unknown';expect_error(validate_stations(bad),'category')
  bad<-x;bad$category<-'incursion';expect_error(validate_stations(bad),'confirmation')
  bad<-x;bad$coordinate_status<-'approximate';expect_error(validate_stations(bad),'verified')
  bad<-x;bad$institution_url<-'javascript:alert(1)';expect_error(validate_stations(bad),'HTTPS')
})
test_that('failed validation preserves previous CSV and GeoJSON byte for byte',{
  path<-tempfile();dir.create(path);on.exit(unlink(path,recursive=TRUE))
  publish_registry(fixture(),path)
  before<-lapply(list.files(path,full.names=TRUE),readBin,what='raw',n=1e6)
  bad<-fixture();bad$latitude<-999;expect_error(publish_registry(bad,path))
  after<-lapply(list.files(path,full.names=TRUE),readBin,what='raw',n=1e6)
  expect_identical(before,after)
})
test_that('empty registry and inactive stations publish valid empty collection',{
  x<-fixture();x$publication_status<-'inactive';out<-validate_stations(x);expect_equal(nrow(out),0)
  expect_identical(station_geojson(out)$features,list())
  expect_true(all(validate_stations(read.csv('data/stations.csv'))$publication_status == 'approved'))
})
test_that('approved Sheets updates stage canonical and visible network outputs together',{
  path<-tempfile();dir.create(path);on.exit(unlink(path,recursive=TRUE))
  x<-fixture();x$sampling_status<-'confirmed';x$country_iso2<-'gb'
  publish_registry(x,path,publish_network=TRUE)
  expect_setequal(list.files(path),c('stations.csv','stations.geojson','network-stations.csv','network-stations.geojson'))
  out<-jsonlite::read_json(file.path(path,'network-stations.geojson'),simplifyVector=FALSE)
  expect_equal(out$features[[1]]$properties$sampling_status,'confirmed')
  expect_equal(out$features[[1]]$properties$country_iso2,'gb')
  expect_false(grepl('PRIVATE|CONFIDENTIAL|private@example',paste(readLines(file.path(path,'network-stations.csv')),collapse='')))
  before<-lapply(list.files(path,full.names=TRUE),readBin,what='raw',n=1e6)
  bad<-x;bad$latitude<-91;expect_error(publish_registry(bad,path,publish_network=TRUE),'bounds')
  after<-lapply(list.files(path,full.names=TRUE),readBin,what='raw',n=1e6)
  expect_identical(before,after)
})

test_that('legacy station IDs normalize without changing coordinates or approval',{
  x <- fixture(); x$station_id <- 'GLOBE-007'
  out <- validate_stations(x)
  expect_equal(out$station_id,'GLOBO-007')
  expect_equal(out$latitude,x$latitude)
  expect_equal(out$coordinate_status,x$coordinate_status)
  current <- x; current$station_id <- 'GLOBO-007'
  expect_error(validate_stations(rbind(x,current)),'Duplicate')
})

test_that('legacy-ID Sheets publication retains matching country flag metadata',{
  x <- fixture(); x$station_id <- 'GLOBE-007'; x$country_iso2 <- 'it'
  output <- tempfile('renamed-register-')
  withr::defer(unlink(output,recursive=TRUE))
  publish_registry(x,output_dir=output,publish_network=TRUE)
  network <- read.csv(file.path(output,'network-stations.csv'))
  expect_equal(network$station_id,'GLOBO-007')
  expect_equal(network$country_iso2,'it')
})
