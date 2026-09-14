# Timeform data layer

Timeform is the canonical comparative rating source for Melbourne Cup Hub.

## Why one rating source
All runners should be compared on the same Timeform scale rather than mixing Racing Post Ratings, official ratings, local ratings and ad-hoc conversions. Timeform Master Ratings are treated as the primary cross-jurisdiction class benchmark.

## Required horse record
Each official Melbourne Cup nominee should ultimately contain:
- horse
- currentMasterRating
- masterRatingDisplay (preserves modifiers such as `p` when present)
- ratingAsOf
- source = Timeform
- importedByUser = true
- historyCompleteness
- disciplines (Flat / Hurdle / Chase kept separate)
- lastRuns / runs
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
  - ratingDisplay (preserves `+`, `p`, `?` exactly as supplied)
  - timefigure (when legitimately available)
- peakRating12m
- peakRatingCareer (when available)
- last3Average
- last5Average
- trend

## Manual authenticated capture
User-supplied authenticated screenshots may be transcribed into a private local JSON dataset. The current manual schema is `TF-MANUAL-1.0`.

Rules:
- never infer a value from a blank Timeform cell;
- preserve rating modifiers rather than converting them to plain numbers;
- keep Flat, Hurdle and Chase master ratings in separate namespaces;
- explicitly flag partial histories rather than treating them as complete;
- `NOT_FOUND` means no matching Timeform identity was found and no substitute rating is allowed;
- subscriber numerical values stay in the private local dataset and are not committed to this public repository.

The public status ledger may publish coverage counts and horse names requiring follow-up, but never subscriber-only numerical ratings.

## Usage policy
Timeform subscriber information is licensed/copyright material. Do not scrape Timeform and do not publish subscriber-only ratings or commentary to the public site without the appropriate licence/permission. The Hub may accept user-supplied Timeform data for the user's own analysis. Public-facing views should remain empty/restricted until publication rights are confirmed.

## Modelling principle
Timeform is the common CLASS scale, not the entire Melbourne Cup prediction. Cup analysis should separately model current form trajectory, 3200m suitability, likely pace/map, going, track, weight, age, preparation, travel and veterinary/campaign information.
