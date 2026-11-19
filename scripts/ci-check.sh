#!/usr/bin/env bash
set -euo pipefail
python3 scripts/build_network_registry.py
python3 scripts/check_security.py
python3 -m unittest discover -s tests -p 'test_python.py' -v
node --check assets/js/network.js
node --check assets/js/monitoring.js
node --check assets/js/site.js
node --check assets/js/contact.js
node --test tests/contact.test.cjs
node tests/partners-access.test.mjs
Rscript -e 'for (f in c(list.files("R",pattern="\\.R$",full.names=TRUE),list.files("shiny",pattern="\\.R$",full.names=TRUE,recursive=TRUE))) parse(f)'
Rscript tests/testthat.R
Rscript R/validate_stations.R
Rscript R/prepare_shiny_cache.R
quarto render
python3 scripts/check_site.py _site
