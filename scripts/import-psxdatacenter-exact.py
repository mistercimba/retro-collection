#!/usr/bin/env python3
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGETS_FILE = ROOT / "data" / "artwork-psxdatacenter-targets.json"
GAMES_FILE = ROOT / "data" / "artwork-games.json"
MISSING_FILE = ROOT / "data" / "artwork-missing.json"
MANIFEST_FILE = ROOT / "public" / "covers" / "manifest.json"
REPORT_FILE = ROOT / "data" / "artwork-psxdatacenter-report.json"
GENERATED_MODULE = ROOT / "src" / "data" / "game-artwork.ts"
COVERS_DIR = ROOT / "public" / "covers"

UA = "MarioRetroCollection/1.0"

def load_json(path, fallback):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError:
        return fallback

def fetch_text(url):
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read().decode("latin-1", errors="ignore")

def download(url, destination, referer=None):
    headers = {"User-Agent": UA, "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"}
    if referer:
        headers["Referer"] = referer
    request = urllib.request.Request(url, headers=headers)
    last = None
    for attempt in range(1, 5):
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                data = response.read()
            destination.write_bytes(data)
            return
        except Exception as exc:
            last = exc
            time.sleep(attempt)
    raise RuntimeError(f"download failed: {url}: {last}")

def find_exact_front_image(page_url, html, serial):
    serial_upper = serial.upper()
    html_upper = html.upper()
    if serial_upper not in html_upper:
        raise RuntimeError(f"{serial}: wrapper page does not contain the expected serial")
    if "FRONT COVER DOWNLOAD" not in html_upper:
        raise RuntimeError(f"{serial}: wrapper page is not a front-cover download page")
    if "PLATINUM FRONT COVER DOWNLOAD" in html_upper:
        raise RuntimeError(f"{serial}: refusing a Platinum wrapper for a Standard target")

    # Prefer an image whose filename explicitly carries the exact serial and F-ALL.
    candidates = re.findall(r'(?:src|href)\s*=\s*["\']([^"\']+\.(?:jpg|jpeg|png))["\']', html, flags=re.I)
    absolute = [urllib.parse.urljoin(page_url, candidate) for candidate in candidates]
    exact = [
        url for url in absolute
        if serial_upper in url.upper() and "-F-ALL." in url.upper()
    ]
    if exact:
        return exact[0]

    # PSXDataCenter's download wrapper convention is deterministic.
    parsed = urllib.parse.urlparse(page_url)
    if parsed.path.lower().endswith(".html"):
        derived = parsed._replace(path=parsed.path[:-5] + ".jpg").geturl()
        return derived

    raise RuntimeError(f"{serial}: could not locate the exact front-cover image")

targets = load_json(TARGETS_FILE, {})
games = load_json(GAMES_FILE, [])
missing_data = load_json(MISSING_FILE, {"entries": []})
manifest = load_json(MANIFEST_FILE, {"entries": {}})

games_by_id = {game["collectionId"]: game for game in games}
missing_ids = {entry["collectionId"] for entry in missing_data.get("entries", [])}

resolved = {}
skipped = []

COVERS_DIR.mkdir(parents=True, exist_ok=True)

for collection_id, target in targets.items():
    game = games_by_id.get(collection_id)
    if not game:
        skipped.append({"collectionId": collection_id, "reason": "not-in-current-games"})
        continue
    if collection_id not in missing_ids:
        skipped.append({"collectionId": collection_id, "reason": "already-has-artwork"})
        continue
    if game.get("platform") != target.get("platform"):
        raise RuntimeError(f"{collection_id}: platform mismatch between snapshot and target")
    if target.get("title") and target["title"].lower() not in game.get("title", "").lower() and game.get("title", "").lower() not in target["title"].lower():
        # Titles can differ in punctuation/localization; this is only a coarse guard.
        if collection_id not in {"PS1-0056", "PS2-0066"}:
            raise RuntimeError(f"{collection_id}: title mismatch between snapshot and target")

    page_url = target["page"]
    serial = target["serial"]
    image_url = target.get("image")
    if not image_url:
        html = fetch_text(page_url)
        image_url = find_exact_front_image(page_url, html, serial)

    if serial.upper() not in image_url.upper() or "-F-ALL." not in image_url.upper():
        raise RuntimeError(f"{collection_id}: image URL is not the exact standard front for {serial}")

    relative = f"/covers/{collection_id}.jpg"
    destination = ROOT / "public" / relative.lstrip("/")

    for ext in [".png", ".jpeg", ".webp"]:
        old = COVERS_DIR / f"{collection_id}{ext}"
        try:
            old.unlink()
        except FileNotFoundError:
            pass

    download(image_url, destination, page_url)

    resolved[collection_id] = {
        "file": relative,
        "source": "psxdatacenter",
        "serial": serial,
        "regionName": "PAL",
        "matchedBy": "exact-physical-serial",
        "sourcePage": page_url,
        "sourceImage": image_url,
        "matchScore": 1100,
    }

entries = dict(manifest.get("entries", {}))
entries.update(resolved)
entries = dict(sorted(entries.items(), key=lambda item: item[0]))

sources = list(dict.fromkeys([*(manifest.get("sources") or [manifest.get("source")]), "psxdatacenter"]))
sources = [source for source in sources if source]

manifest.update({
    "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "source": "local-artwork",
    "sources": sources,
    "entries": entries,
    "matched": len(entries),
    "missing": max(0, len(games) - len(entries)),
})

resolved_ids = set(resolved)
remaining = [
    entry for entry in missing_data.get("entries", [])
    if entry.get("collectionId") not in resolved_ids
]

with open(MANIFEST_FILE, "w", encoding="utf-8") as handle:
    json.dump(manifest, handle, indent=2, ensure_ascii=False)
    handle.write("\n")

with open(MISSING_FILE, "w", encoding="utf-8") as handle:
    output = dict(missing_data)
    output["generatedAt"] = manifest["generatedAt"]
    output["matched"] = len(entries)
    output["missing"] = len(remaining)
    output["entries"] = remaining
    json.dump(output, handle, indent=2, ensure_ascii=False)
    handle.write("\n")

artwork_map = {cid: entry["file"] for cid, entry in entries.items()}
with open(GENERATED_MODULE, "w", encoding="utf-8") as handle:
    handle.write("// Generated by the artwork importers. Do not edit by hand.\n")
    handle.write("export const GAME_ARTWORK: Record<string, string> = ")
    json.dump(artwork_map, handle, indent=2, ensure_ascii=False)
    handle.write(";\n")

with open(REPORT_FILE, "w", encoding="utf-8") as handle:
    json.dump({
        "generatedAt": manifest["generatedAt"],
        "source": "psxdatacenter",
        "resolved": len(resolved),
        "remaining": len(remaining),
        "entries": resolved,
        "skipped": skipped,
    }, handle, indent=2, ensure_ascii=False)
    handle.write("\n")

print(f"PSXDataCenter exact-serial covers added: {len(resolved)}")
print(f"Remaining without local artwork: {len(remaining)}")
