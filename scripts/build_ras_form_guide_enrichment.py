#!/usr/bin/env python3
import json
import re
from datetime import UTC, date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
FORM = DATA / "form"
NOMS = DATA / "nominations" / "2026-09-01.json"
STRICT = FORM / "2026-09-15-unique-full-form.json"
STRICT_AUDIT = FORM / "2026-09-15-unique-form-audit.json"
CAPTURE = FORM / "2026-09-15-ras-browser-capture.json"
RATINGS = DATA / "ratings" / "2026-09-15-ras-public-peaks.json"
PROJECTED = DATA / "projected-field" / "2026-09-13.json"
OUT = FORM / "2026-09-15-ras-form-guide-enrichment.json"
AUDIT = FORM / "2026-09-15-ras-form-guide-audit.json"

PROJECTED_RAS_RESEARCH = {
    "Shockletz",
    "Vauban",
    "River Of Stars",
    "Soulcombe",
    "Highland Bling",
    "The Euphrates",
}


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def fixed_name(value):
    return (
        str(value or "")
        .replace("â€™", "'")
        .replace("’", "'")
        .replace("â€“", "-")
        .replace("â€”", "-")
        .replace("Â", "")
        .strip()
    )


def norm(value):
    return re.sub(r"[^a-z0-9]+", " ", fixed_name(value).lower()).strip()


def iso_from_ras_date(value):
    if not value:
        return None
    text = str(value).strip()
    for fmt in ("%d %b %Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            pass
    return None


def run_date(run):
    raw = run.get("date")
    if not raw:
        return None
    text = str(raw)[:10]
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def duplicate_dates(runs):
    seen = set()
    dupes = []
    for run in runs:
        d = run.get("date")
        if not d:
            continue
        if d in seen:
            dupes.append(d)
        seen.add(d)
    return dupes


def distance_evidence(runs, threshold):
    evidence = []
    for run in runs:
        try:
            distance = float(run.get("distanceM") or 0)
        except (TypeError, ValueError):
            distance = 0
        if distance >= threshold:
            evidence.append(
                {
                    "date": run.get("date"),
                    "race": run.get("race"),
                    "track": run.get("track"),
                    "distanceM": run.get("distanceM"),
                    "finish": run.get("finish"),
                    "source": run.get("source"),
                    "sourceUrl": run.get("sourceUrl"),
                }
            )
    return evidence


def campaign_history(runs):
    latest = run_date(runs[0]) if runs else None
    if not latest:
        return {"latestStartDate": None, "daysSinceLatestStartAtSnapshot": None, "currentCampaignStarts": 0}
    snapshot = date.fromisoformat("2026-09-15")
    current = []
    previous = None
    for run in runs:
        current_date = run_date(run)
        if not current_date:
            continue
        if previous and (previous - current_date).days > 70:
            break
        current.append(run)
        previous = current_date
    return {
        "latestStartDate": latest.isoformat(),
        "daysSinceLatestStartAtSnapshot": (snapshot - latest).days,
        "currentCampaignStarts": len(current),
    }


def rating_source_for(name, rating_doc):
    for source in rating_doc.get("sources", []):
        scope = source.get("scope", "")
        if norm(name) in norm(scope):
            return source.get("url")
    if name in rating_doc.get("ratings", {}):
        return rating_doc.get("sources", [{}])[0].get("url")
    return None


def field_access_states(record):
    states = []
    stack = [record]
    while stack:
        item = stack.pop()
        if isinstance(item, dict):
            if "accessState" in item:
                states.append(item.get("accessState"))
            stack.extend(item.values())
        elif isinstance(item, list):
            stack.extend(item)
    return states


def main():
    nominations = load(NOMS)
    strict = load(STRICT)
    strict_audit = load(STRICT_AUDIT)
    capture = load(CAPTURE)
    ratings = load(RATINGS)
    projected = load(PROJECTED)

    ratings_map = ratings.get("ratings", {})
    projected24 = [fixed_name(r["horse"]) for r in projected.get("projected24", [])]
    capture_records = {norm(k): v for k, v in capture.get("records", {}).items()}

    horses = {}
    rows = []
    duplicate_horse_dates = []
    projected_latest3_dupes = []
    unresolved_identity = []
    unresolved_form = []

    for nominee in nominations["horses"]:
        canonical = fixed_name(nominee["horse"])
        strict_key = nominee["horse"]
        strict_rec = strict.get("horses", {}).get(strict_key) or strict.get("horses", {}).get(canonical)
        runs = list((strict_rec or {}).get("runs", []))
        capture_rec = capture_records.get(norm(canonical), {})
        source_state = capture_rec.get("sourceState", "UNAVAILABLE")
        profile_url = (capture_rec.get("profile") or {}).get("sourceUrl")
        public_runs = capture_rec.get("publicProfileRuns") or []
        ras_value = ratings_map.get(canonical) or ratings_map.get(nominee["horse"])
        ras_source = rating_source_for(canonical, ratings)
        dupes = duplicate_dates(runs)
        duplicate_horse_dates.extend({"horse": canonical, "date": d} for d in dupes)
        if canonical in projected24 and duplicate_dates(runs[:3]):
            projected_latest3_dupes.append(canonical)
        form_resolved = len(runs) >= 8 or (bool((strict_rec or {}).get("careerComplete")) and len(runs) > 0)
        identity_resolved = source_state == "PUBLIC" and bool(profile_url)
        if not identity_resolved:
            unresolved_identity.append(canonical)
        if not form_resolved:
            unresolved_form.append(canonical)

        record = {
            "nominationNumber": nominee["nominationNumber"],
            "canonicalName": canonical,
            "nominationSourceName": nominee["horse"],
            "racingAndSports": {
                "sourceState": source_state,
                "profileId": (capture_rec.get("profile") or {}).get("profileId"),
                "profileUrl": profile_url,
                "search": capture_rec.get("search"),
                "access": capture_rec.get("access", {}),
                "identity": capture_rec.get("identity", {}),
                "summary": capture_rec.get("summary", {}),
                "currentNominations": capture_rec.get("currentNominations", []),
                "publicProfileRunHistory": {
                    "accessState": "PUBLIC" if public_runs else capture_rec.get("access", {}).get("detailedRunHistory", "UNAVAILABLE"),
                    "note": "R&S public profile exposes only the visible profile-form rows captured here; strict full-form baseline remains data/form/2026-09-15-unique-full-form.json.",
                    "runs": public_runs,
                },
                "ratings": {
                    **capture_rec.get("ratings", {}),
                    "rasEditorialPeak": {
                        "value": ras_value,
                        "namespace": "rasEditorialPeak",
                        "accessState": "PUBLIC" if ras_value is not None else "UNAVAILABLE_AUTH",
                        "sourceUrl": ras_source,
                        "note": "Stored only when an explicit Racing & Sports published peak rating already exists in data/ratings/2026-09-15-ras-public-peaks.json.",
                    },
                },
            },
            "canonicalFormBaseline": {
                "sourceFile": "data/form/2026-09-15-unique-full-form.json",
                "state": "COMPLETE"
                if len(runs) >= 8
                else ("CAREER_COMPLETE" if (strict_rec or {}).get("careerComplete") and runs else "UNRESOLVED"),
                "uniqueActualRuns": len(runs),
                "careerCompleteUnder8": bool((strict_rec or {}).get("careerComplete")) and len(runs) < 8,
                "duplicateDates": dupes,
                "runs": runs,
            },
            "stayingEvidence": {
                "2400mPlus": distance_evidence(runs, 2400),
                "2800mPlus": distance_evidence(runs, 2800),
                "3200mPlus": distance_evidence(runs, 3200),
            },
            "freshnessAndCampaign": campaign_history(runs),
        }
        horses[canonical] = record
        states = field_access_states(record)
        rows.append(
            {
                "nominationNumber": nominee["nominationNumber"],
                "horse": canonical,
                "identityResolved": identity_resolved,
                "formHistoryResolved": form_resolved,
                "canonicalUniqueActualRuns": len(runs),
                "careerCompleteUnder8": record["canonicalFormBaseline"]["careerCompleteUnder8"],
                "rasProfileCoverage": source_state == "PUBLIC",
                "publicProfileRunsCaptured": len(public_runs),
                "explicitRasRating": ras_value is not None,
                "ratingAccessState": "PUBLIC" if ras_value is not None else capture_rec.get("access", {}).get("ratings", "UNAVAILABLE_AUTH"),
                "loginGatedOrUnavailableFields": sum(1 for s in states if s in {"LOGIN_GATED", "UNAVAILABLE", "UNAVAILABLE_AUTH"}),
            }
        )

    explicit_ras = [r["horse"] for r in rows if r["explicitRasRating"]]
    unresolved_projected_ras = [
        h for h in sorted(PROJECTED_RAS_RESEARCH) if h not in explicit_ras and h in projected24
    ]
    login_unavailable_rating_count = sum(1 for r in rows if r["ratingAccessState"] != "PUBLIC")
    audit = {
        "snapshotDate": "2026-09-15",
        "observedAt": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "nominees": len(nominations["horses"]),
        "identityResolvedCount": sum(1 for r in rows if r["identityResolved"]),
        "formHistoryResolvedCount": sum(1 for r in rows if r["formHistoryResolved"]),
        "horsesWithAtLeast8UniqueStarts": sum(1 for r in rows if r["canonicalUniqueActualRuns"] >= 8),
        "certifiedFullCareerUnder8Count": sum(1 for r in rows if r["careerCompleteUnder8"]),
        "duplicateHorseDateCount": len(duplicate_horse_dates),
        "duplicateHorseDates": duplicate_horse_dates,
        "projected24Latest3PfrDuplicateDateCount": len(projected_latest3_dupes),
        "projected24Latest3PfrDuplicateDateHorses": projected_latest3_dupes,
        "horsesWithRacingAndSportsProfileCoverage": sum(1 for r in rows if r["rasProfileCoverage"]),
        "horsesWithExplicitRasRatingCoverage": len(explicit_ras),
        "loginGatedUnavailableRatingCount": login_unavailable_rating_count,
        "unresolvedIdentityIssues": unresolved_identity,
        "unresolvedFormIssues": unresolved_form,
        "unresolvedProjected24RasList": unresolved_projected_ras,
        "complete101": "YES" if not unresolved_identity and not unresolved_form and not duplicate_horse_dates else "NO",
        "rasComplete": "YES" if len(explicit_ras) == len(nominations["horses"]) else "NO",
        "strictFormAudit": {
            "complete": strict_audit.get("complete"),
            "careerComplete": strict_audit.get("careerComplete"),
            "resolved": strict_audit.get("resolved"),
            "partial": strict_audit.get("partial"),
            "zero": strict_audit.get("zero"),
        },
        "rows": rows,
    }
    enrichment = {
        "snapshotDate": "2026-09-15",
        "type": "racing-and-sports-form-guide-enrichment",
        "sourcePolicy": "R&S public browser session capture; no authentication bypass; login-gated ratings/full-form fields remain marked LOGIN_GATED or UNAVAILABLE_AUTH.",
        "sourceFiles": [
            "data/form/2026-09-15-ras-browser-capture.json",
            "data/form/2026-09-15-unique-full-form.json",
            "data/ratings/2026-09-15-ras-public-peaks.json",
        ],
        "auditFile": "data/form/2026-09-15-ras-form-guide-audit.json",
        "horses": horses,
    }

    OUT.write_text(json.dumps(enrichment, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    AUDIT.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: audit[k] for k in [
        "nominees",
        "identityResolvedCount",
        "formHistoryResolvedCount",
        "horsesWithAtLeast8UniqueStarts",
        "certifiedFullCareerUnder8Count",
        "duplicateHorseDateCount",
        "projected24Latest3PfrDuplicateDateCount",
        "horsesWithRacingAndSportsProfileCoverage",
        "horsesWithExplicitRasRatingCoverage",
        "loginGatedUnavailableRatingCount",
        "complete101",
        "rasComplete",
    ]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
