# GLOBO visual assets

The active static wordmark is `globo-logo-static.png`. The original full-wordmark video, `../videos/globo-logo-currents.webm`, is preserved as the source. The homepage loads only the opaque first-globe derivatives, `globo-currents-globe.mp4` (266,913 bytes) or `globo-currents-globe.webm` (162,004 bytes). The homepage uses `globo-sampling-network.png`, the owner-supplied 1743 × 902 illustration. These are distinct from quantitative NOAA layers and the editable station map.

The earlier transparent wordmark (`globo-logo-transparent.png`), 1600 × 491 overview (`globo-network-overview.jpg`) and Pacific illustration (`pacific-globo.svg`) are retained as legacy source assets; they are not used by the current homepage. Original supplied files remain preserved outside release inputs.

The first O has a small selective warm-colour enhancement and plays at 1.12×. Each browser selects a compatible opaque format; it no longer downloads the complete original wordmark video. Inline SVG filter definitions affect warm pixels; the PNG-based second O keeps its independent 72-second orbit. Public browser preview artifacts provide same-frame before/after comparisons.

Mobile transparency fix: crop the original media at x=782, y=140, width=480, height=480, without resizing, and encode without alpha (YUV420P; MP4/H.264 baseline level 3 or WebM/VP9). Both retain 12 fps and 18 seconds. The first-globe circle sits at 36.003683% left, 19.337017% top, 22.099448% width and 66.298343% height of the original 2172 × 724 wordmark. Its circular overflow clip hides the opaque video corners. Letters are rendered solely by the PNG; tests compare them and a crop corner with the PNG-only reference under forced-black video at four widths. Unsupported or failed MP4 must still allow the working WebM alternative.

Verification after the iPhone/Safari report: actual production WebKit/iPhone 13 emulation selected the MP4, rendered moving warm-current pixels and preserved PNG letter/corner pixels under forced-black video. A fresh unmodified playback session crossed a natural loop boundary. The screenshot is retained locally as `test-results/iphone-webkit-opaque.png`; no physical iPhone test is claimed.

## Marine Omics network preview — 26 November 2026

Network links to the Italian Omics Observatory Network below “A network for shared scientific initiatives”. The locally cached preview is the site's own Open Graph map, retrieved from https://www.marineomics.it/wp-content/uploads/2025/09/Maps-Italian-Osservatory_traspartente-1-922x1024.png on 26 November 2026. Its original 922 × 1024 PNG is stored unchanged at `assets/images/partners/marineomics-observatories.png` (SHA-256 `f18d869012043e6f4cb7c6a1f73b7ad1ab6b0eb5f3c3cd12359bca3f4be7d589`). The card links to https://www.marineomics.it/ through a single Explore link; the owner requested removal of the visible map-credit caption. Source attribution is retained here. Its four observatory names follow that site's mission description. This preview is not imported into the scientific station register and does not change coordinates or approval status.

## Full protocol display without a browser PDF frame

The public protocol PDF has one 720 × 1135 pt page. Protocol displays the whole page as an image with proportional, uncropped height and native page scrolling. No PDF plugin, iframe, toolbar or additional JavaScript viewer is loaded. The unchanged PDF remains available for download, and a separate accessible link opens the private Sampling Tracker. On phones, normal browser pinch zoom is available; text embedded in this image is not selectable.

The responsive JPEGs at widths 1080 and 2160 are deterministic renders of `assets/documents/globo-sampling-protocol.pdf` (SHA-256 `82363159eeee6858db20524d3c0331c4c60cc6a243db4ab99717ae885a16e3d2`). They preserve the complete artwork, including its lower shipping section. When the source PDF changes, check its page count and regenerate both assets with Poppler:

```bash
pdfinfo assets/documents/globo-sampling-protocol.pdf
pdftocairo -jpeg -jpegopt quality=95,optimize=y -singlefile -scale-to-x 1080 -scale-to-y -1 assets/documents/globo-sampling-protocol.pdf assets/images/protocol/sampling-protocol-1080
pdftocairo -jpeg -jpegopt quality=95,optimize=y -singlefile -scale-to-x 2160 -scale-to-y -1 assets/documents/globo-sampling-protocol.pdf assets/images/protocol/sampling-protocol-2160
```

These commands apply to the current single-page protocol. If it becomes multi-page, render and include every page in order rather than keeping `-singlefile`. Poppler is an authoring tool here; it is not a new site runtime or CI dependency.
