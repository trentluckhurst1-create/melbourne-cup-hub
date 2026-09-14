#!/usr/bin/env python3
"""
Collect public Racing & Sports profile/search pages for the Melbourne Cup universe.

This script intentionally does not bypass Cloudflare, login gates, paywalls, or
robots/access controls. If R&S returns a browser challenge or login requirement,
stop and use a normal browser/authenticated session that the user is entitled to
use, then rebuild enrichment with scripts/build_ras_form_guide_enrichment.py.

Optional:
  RAS_COOKIE="name=value; other=value" python scripts/collect_ras_public_capture.py
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NOMS = ROOT / "data" / "nominations" / "2026-09-01.json"
OUT = Path(os.environ.get("RAS_CAPTURE_OUT", ROOT / "data" / "form" / "2026-09-15-ras-http-search-capture.json"))
BASE = "https://www.racingandsports.com.au"


def fixed_name(value):
    return (
        str(value or "")
        .replace("â€™", "'")
        .replace("’", "'")
        .replace("Â", "")
        .strip()
    )


def norm(value):
    return re.sub(r"[^a-z0-9]+", " ", fixed_name(value).lower()).strip()


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self._href = None
        self._text = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self._href = dict(attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag == "a" and self._href:
            self.links.append({"href": urllib.parse.urljoin(BASE, self._href), "text": " ".join(" ".join(self._text).split())})
            self._href = None
            self._text = []


def request(url):
    headers = {
        "User-Agent": "Mozilla/5.0 MelbourneCupHubDataAudit/1.0",
        "Accept": "text/html,application/xhtml+xml",
    }
    cookie = os.environ.get("RAS_COOKIE")
    if cookie:
        headers["Cookie"] = cookie
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.status, response.read().decode("utf-8", errors="replace")


def fetch_public(url):
    try:
        status, html = request(url)
    except urllib.error.HTTPError as exc:
        html = exc.read().decode("utf-8", errors="replace")
        if exc.code in (401, 403) and ("Just a moment" in html or "cf_chl" in html):
            raise RuntimeError("R&S returned a Cloudflare/browser challenge. Do not bypass it; use a normal browser session.")
        if exc.code in (401, 403) and re.search(r"\blog\s*in\b", html, re.I):
            raise RuntimeError("R&S requested login. Authenticate normally, then rerun with an entitled session.")
        raise
    if status >= 400:
        raise RuntimeError(f"R&S returned HTTP {status}")
    return html


def search_horse(name):
    terms = [name]
    if "'" in name:
        terms.append(name.replace("'", ""))
    for term in terms:
        query = urllib.parse.urlencode(
            {
                "isMatchFront": "False",
                "isTargetBlank": "True",
                "searchTerm": term,
                "searchType": "H",
                "seachDiscipline": "T",
            }
        )
        url = f"{BASE}/AdvanceSearch/GetUniversalSearchResult?{query}"
        html = fetch_public(url)
        parser = LinkParser()
        parser.feed(html)
        candidates = [l for l in parser.links if "/thoroughbred/horse/" in l["href"]]
        exact = next((c for c in candidates if norm(c["text"].split(" Sire:")[0]) == norm(name)), None)
        if exact or candidates:
            return {"term": term, "searchUrl": url, "candidates": candidates, "selected": exact or candidates[0]}
        time.sleep(0.25)
    return {"term": name, "searchUrl": None, "candidates": [], "selected": None}


def main():
    nominations = json.loads(NOMS.read_text(encoding="utf-8"))
    capture = {
        "snapshotDate": "2026-09-15",
        "source": "Racing and Sports public HTTP capture",
        "records": {},
    }
    for nominee in nominations["horses"]:
        name = fixed_name(nominee["horse"])
        result = search_horse(name)
        selected = result.get("selected")
        capture["records"][name] = {
            "nominationNumber": nominee["nominationNumber"],
            "canonicalName": name,
            "originalCanonicalName": nominee["horse"],
            "sourceState": "PUBLIC" if selected else "UNAVAILABLE",
            "search": result,
            "profile": {"sourceUrl": selected["href"]} if selected else None,
            "access": {
                "profile": "PUBLIC" if selected else "UNAVAILABLE",
                "detailedRunHistory": "UNAVAILABLE_AUTH",
                "ratings": "UNAVAILABLE_AUTH",
                "authenticatedSessionDetected": bool(os.environ.get("RAS_COOKIE")),
            },
        }
        OUT.write_text(json.dumps(capture, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{nominee['nominationNumber']:03d} {name}: {capture['records'][name]['sourceState']}")
        time.sleep(0.5)


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(2)
