# Initial lock contains direct pins; the first R-enabled run resolves dependencies.
# Commit the resolved-renv-lock artifact to make subsequent builds restore exactly.
pins <- c('jsonlite@1.8.9','googlesheets4@1.1.1','shiny@1.9.1','leaflet@2.2.2','rsconnect@1.3.3','testthat@3.2.1','withr@3.0.2','PKI')
# Do not reuse a cached empty CRAN index after an offline attempt.
Sys.setenv(R_AVAILABLE_PACKAGES_CACHE_CONTROL_MAX_AGE='0')
options(repos=c(CRAN='https://cloud.r-project.org'),timeout=300)
# fs >= 2.0 can use its bundled libuv on machines without libuv development headers.
if(!nzchar(Sys.getenv('USE_BUNDLED_LIBUV'))) Sys.setenv(USE_BUNDLED_LIBUV='1')
if(!requireNamespace('renv',quietly=TRUE)) install.packages('renv',repos='https://cloud.r-project.org')
lock <- renv::lockfile_read('renv.lock')
bootstrap <- isTRUE(lock$GLOBE$Bootstrap)
if(!file.exists('renv/activate.R')) {
  renv::init(bare=TRUE,restart=FALSE)
  renv::lockfile_write(lock,'renv.lock')
}
if(bootstrap) {
  renv::install(pins)
  renv::snapshot(type='all',prompt=FALSE)
} else {
  renv::restore(prompt=FALSE)
}
