# Melbourne Cup Hub data architecture

This directory stores structured, timestamped race intelligence.

## Core datasets
- `nominations/` — official nomination snapshots and status changes
- `horses/` — canonical horse dossiers
- `weights/` — predicted weights, official handicap declarations and penalties
- `order-of-entry/` — ballot/order snapshots and qualification status
- `markets/` — bookmaker/exchange snapshots and derived implied probabilities
- `timeform/` — user-supplied subscription ratings only
- `form/` — past performance and lead-up run records
- `leadups/` — Australian and international Cup lead-up races
- `news/` — source-linked news and stable intelligence
- `historical/` — historical Melbourne Cup benchmark data
- `race-day/` — final field, barriers, weather, track, scratchings and race-day state

## Data rules
1. Never silently overwrite changing facts. Preserve dated snapshots.
2. Every public fact should carry source, source URL where appropriate, and observed timestamp.
3. Subscription-only Timeform data is entered/imported from user-authorised material and is not scraped from protected pages.
4. Horse names are normalised to a canonical ID so news, markets, form, ratings and weights all join to the same horse.
5. Derived analysis must be distinguishable from official/source data.
