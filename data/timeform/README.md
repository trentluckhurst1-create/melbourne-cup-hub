# Timeform data layer

Timeform is the canonical comparative rating source for Melbourne Cup Hub.

## Why one rating source
All runners should be compared on the same Timeform scale rather than mixing Racing Post Ratings, official ratings, local ratings and ad-hoc conversions. Timeform Master Ratings are treated as the primary cross-jurisdiction class benchmark.

## Required horse record
Each official Melbourne Cup nominee should ultimately contain:
- horse
- currentMasterRating
- ratingAsOf
- source = Timeform
- importedByUser = true
- lastRuns (target up to 8)
  - date
  - race
  - track
  - country
  - distance
  - going
  - class/group
  - finish
  - fieldSize
  - weight
  - performanceRating
  - timefigure (when legitimately available)
- peakRating12m
- peakRatingCareer (when available)
- last3Average
- last5Average
- trend

## Usage policy
Timeform subscriber information is licensed/copyright material. Do not scrape Timeform and do not publish subscriber-only ratings or commentary to the public site without the appropriate licence/permission. The Hub may accept user-supplied Timeform data for the user's own analysis. Public-facing views should remain empty/restricted until publication rights are confirmed.

## Modelling principle
Timeform is the common CLASS scale, not the entire Melbourne Cup prediction. Cup analysis should separately model current form trajectory, 3200m suitability, likely pace/map, going, track, weight, age, preparation, travel and veterinary/campaign information.
