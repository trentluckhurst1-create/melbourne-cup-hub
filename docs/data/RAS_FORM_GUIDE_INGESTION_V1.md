# Racing & Sports Form Guide Ingestion V1

Snapshot: 2026-09-15

## Purpose

Use publicly accessible Racing & Sports (R&S) horse profiles, race form guides and Enhanced Form as a primary factual enrichment source for the 101-horse Melbourne Cup nomination universe. Preserve the existing strict unique-start canonical history as the identity/deduplication authority.

## Public fields to capture when exposed

### Horse summary
- horse name / country / age / sex / colour
- sire / dam / damsire
- trainer
- career starts / wins / placings
- career win and place percentages
- total prizemoney
- winning-distance distribution
- course / distance / going / first-up / second-up / last-12-month summary records when exposed

### Run-level form
- finishing position
- beaten margin
- race date
- track/course
- race name / race type / class / Group-Listed status
- prizemoney
- distance
- surface and going / SOT
- jockey
- carried weight
- barrier
- starting price
- winner or runner-up reference

### Enhanced Form
Capture public R&S Enhanced Form fields only when the page exposes them without authentication, including the documented Rating-family fields (Est, LSR, 50d, BL3, 12m, Career and going-specific ratings) and other useful structured columns. Store these as R&S Enhanced Form metrics, not Timeform and not Hub PFR.

## Identity and duplicate rules

1. Nomination universe remains the official 101-horse snapshot.
2. A real start is unique by horse + calendar race date, with track/race used to resolve collisions.
3. Sort newest to oldest before selecting Latest 3.
4. Exclude scratchings, withdrawals, DNS/non-runners, trials and jump-outs.
5. Do not duplicate a run because R&S renders it more than once on a page.
6. Preserve genuine hurdle/jumps starts as actual starts but identify discipline so flat-only analytics can exclude them where appropriate.
7. R&S identity must be cross-checked against country/year/pedigree/trainer where names can collide.

## Rating separation

- `RAS`: only a figure explicitly identifiable as a Racing & Sports rating or published R&S rating.
- `R&S Enhanced Form`: preserve the source column name and meaning; never silently relabel it RAS peak.
- `PFR`: Hub-computed public form rating; remains independent.
- `Timeform`: separate protected/subscriber layer; never infer it from R&S.
- If an R&S page says `Log in to view all runs and ratings`, do not bypass it. Use only the public material available.

## Derived Hub fields after ingestion

From the normalized unique starts we can derive without altering source facts:
- latest 3 unique PFR
- current PFR
- peak PFR
- 2400m+ peak
- 2800m+ peak (`-` only when no qualifying start)
- 3200m record
- distance record bands
- going record bands
- Group/Listed record
- recency / days since last run
- trajectory
- campaign depth
- flat-only versus jumps-inclusive history

## Presentation

This phase is data acquisition/normalization only. Do not redesign the public Form Guide until the data layer is complete and the desired casual-fan presentation is specified.
