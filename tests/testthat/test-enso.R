withr::local_dir(normalizePath('../..'))
test_that('NOAA seasonal dates cross year boundaries correctly',{
  tmp<-tempfile();on.exit(unlink(tmp));writeLines(c('SEAS YR ANOM','DJF 2024 1.13','NDJ 2024 -1.05'),tmp)
  r<-parse_roni(tmp,today=as.Date('2026-11-19'));expect_equal(r[[1]]$period_start,'2023-12-01');expect_equal(r[[1]]$period_end,'2024-02-29');expect_equal(r[[2]]$period_end,'2025-01-31')
})
test_that('bad NOAA schema and duplicate seasons are rejected',{
  tmp<-tempfile();on.exit(unlink(tmp));writeLines(c('SEAS YR ANOM','DJF 2024 1','DJF 2024 2'),tmp);expect_error(parse_roni(tmp),'duplicated')
  writeLines(c('DATE VALUE','2024 1'),tmp);expect_error(parse_roni(tmp),'schema')
})
