#!/usr/bin/env python3
import json
import os
import re
import shutil
import sys
import tempfile
import time
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GAMES_FILE = ROOT / "data" / "artwork-games.json"
MISSING_FILE = ROOT / "data" / "artwork-missing.json"
MANIFEST_FILE = ROOT / "public" / "covers" / "manifest.json"
REPORT_FILE = ROOT / "data" / "artwork-launchbox-report.json"
GENERATED_MODULE = ROOT / "src" / "data" / "game-artwork.ts"
COVERS_DIR = ROOT / "public" / "covers"

METADATA_URL = "https://gamesdb.launchbox-app.com/Metadata.zip"
IMAGE_BASE = "https://images.launchbox-app.com/"

PAL_REGIONS = {
    "europe",
    "united kingdom",
    "great britain",
    "australia",
    "portugal",
    "france",
    "germany",
    "spain",
    "italy",
    "ireland",
    "netherlands",
    "belgium",
    "austria",
    "switzerland",
    "sweden",
    "denmark",
    "norway",
    "finland",
}

PLATFORM_ALIASES = {
    "NES": {"nintendo entertainment system", "nintendo entertainment system nes"},
    "SNES": {"super nintendo entertainment system", "super nintendo snes"},
    "Nintendo 64": {"nintendo 64"},
    "GameCube": {"nintendo gamecube", "gamecube"},
    "Nintendo Wii": {"nintendo wii", "wii"},
    "Nintendo Wii U": {"nintendo wii u", "wii u"},
    "Nintendo Switch": {"nintendo switch", "switch"},
    "Game Boy": {"nintendo game boy", "game boy"},
    "Game Boy Color": {"nintendo game boy color", "game boy color"},
    "GameBoy + Color": {"nintendo game boy", "game boy"},
    "GameBoy Advance": {"nintendo game boy advance", "game boy advance"},
    "Nintendo DS": {"nintendo ds"},
    "Nintendo 3DS": {"nintendo 3ds"},
    "Playstation": {"sony playstation", "sony playstation 1", "playstation"},
    "Playstation 2": {"sony playstation 2", "playstation 2"},
    "Playstation 3": {"sony playstation 3", "playstation 3"},
    "Playstation 5": {"sony playstation 5", "playstation 5"},
    "PSP": {"sony psp", "sony playstation portable", "playstation portable"},
    "PC": {"windows", "microsoft windows", "pc"},
}

SPECIAL_TERMS = [
    "platinum",
    "greatest hits",
    "player s choice",
    "players choice",
    "essentials",
    "not for resale",
    "demo",
    "beta",
    "prototype",
    "promo",
    "bundle",
]

ROMAN = {
    "i": "1", "ii": "2", "iii": "3", "iv": "4", "v": "5",
    "vi": "6", "vii": "7", "viii": "8", "ix": "9", "x": "10",
}


def ascii_text(value):
    value = "" if value is None else str(value)
    return "".join(
        ch for ch in unicodedata.normalize("NFD", value)
        if unicodedata.category(ch) != "Mn"
    ).lower()


def normalize(value):
    value = ascii_text(value).replace("&", " and ").replace("’", "").replace("'", "")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def canonical(value):
    value = normalize(value)
    value = re.sub(r"\bversion\b", " ", value)
    value = re.sub(r"\bclassic nes series\b", " ", value)
    value = re.sub(r"\bnes classics\b", " ", value)
    value = re.sub(r"\bspider man\b", "spiderman", value)
    value = re.sub(r"\bwarioware\b", "wario ware", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def strip_article(value):
    return re.sub(r"^(the|a|an)\s+", "", canonical(value))


def number_signature(value):
    tokens = canonical(value).split()
    out = []
    for token in tokens:
        if token.isdigit():
            out.append(token)
        elif token in ROMAN:
            out.append(ROMAN[token])
    return tuple(out)


def exact_title_match(requested, candidate):
    if not requested or not candidate:
        return False
    if number_signature(requested) and number_signature(requested) != number_signature(candidate):
        return False
    return canonical(requested) == canonical(candidate) or strip_article(requested) == strip_article(candidate)


def edition_compatible(remote_name, local_edition):
    remote = normalize(remote_name)
    edition = normalize(local_edition)
    present = [term for term in SPECIAL_TERMS if term in remote]
    if not present:
        return True
    if not edition or edition == "standard":
        # A title like Pokémon Platinum is not a "Platinum" budget edition;
        # only treat the term as an edition marker when it appears in brackets
        # or alongside edition-like words.
        bracketed = normalize(" ".join(re.findall(r"[\[(]([^\])]+)[\])]", str(remote_name))))
        explicit = [term for term in SPECIAL_TERMS if term in bracketed]
        if not explicit:
            explicit = [term for term in ["greatest hits", "player s choice", "players choice", "essentials", "not for resale", "demo", "beta", "prototype", "promo", "bundle"] if term in remote]
        return not explicit
    return any(term in edition or edition in term for term in present)


def platform_matches(local_platform, remote_platform):
    remote = normalize(remote_platform)
    aliases = {normalize(v) for v in PLATFORM_ALIASES.get(local_platform, {local_platform})}
    return remote in aliases


def region_priority(region, game):
    region_norm = normalize(region)
    product = normalize(game.get("productCode", ""))
    language = normalize(game.get("language", ""))

    hints = []
    if "ukv" in product:
        hints += ["united kingdom", "great britain"]
    if "fra" in product:
        hints += ["france"]
    if "noe" in product or "ger" in product:
        hints += ["germany"]
    if "spa" in product or "esp" in product:
        hints += ["spain"]
    if "ita" in product:
        hints += ["italy"]
    if "aus" in product:
        hints += ["australia"]
    if "portugu" in language or re.search(r"\bpt\b", language):
        hints += ["portugal"]
    if "english" in language or "ingles" in language:
        hints += ["united kingdom", "great britain"]

    if region_norm in hints:
        return 100
    if region_norm == "europe":
        return 90
    if region_norm in {"united kingdom", "great britain"}:
        return 80
    if region_norm == "australia":
        return 70
    return 60


def download(url, destination):
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "MarioRetroCollection/1.0"},
    )
    last_error = None
    for attempt in range(1, 5):
        try:
            with urllib.request.urlopen(request, timeout=90) as response, open(destination, "wb") as out:
                shutil.copyfileobj(response, out)
            return
        except Exception as exc:
            last_error = exc
            time.sleep(attempt)
    raise RuntimeError(f"download failed: {url}: {last_error}")


def load_json(path, fallback):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError:
        return fallback


def image_extension(filename):
    suffix = Path(filename).suffix.lower()
    return ".jpg" if suffix == ".jpeg" else suffix if suffix in {".jpg", ".png", ".webp"} else ".jpg"


games = load_json(GAMES_FILE, [])
missing_data = load_json(MISSING_FILE, {"entries": []})
manifest = load_json(MANIFEST_FILE, {"entries": {}})

games_by_id = {game["collectionId"]: game for game in games}
missing_ids = {entry["collectionId"] for entry in missing_data.get("entries", [])}

if not missing_ids:
    print("No missing artwork to resolve.")
    sys.exit(0)

COVERS_DIR.mkdir(parents=True, exist_ok=True)

with tempfile.TemporaryDirectory(prefix="launchbox-artwork-") as tmp:
    tmp_path = Path(tmp)
    zip_path = tmp_path / "Metadata.zip"
    xml_path = tmp_path / "Metadata.xml"

    print("Downloading LaunchBox metadata dump...")
    download(METADATA_URL, zip_path)

    print("Extracting Metadata.xml...")
    with zipfile.ZipFile(zip_path) as archive:
        member = next((name for name in archive.namelist() if name.endswith("Metadata.xml")), None)
        if not member:
            raise RuntimeError("Metadata.xml not found in LaunchBox Metadata.zip")
        with archive.open(member) as src, open(xml_path, "wb") as dst:
            shutil.copyfileobj(src, dst)

    target_platforms = {games_by_id[cid]["platform"] for cid in missing_ids if cid in games_by_id}
    names_by_platform = {
        platform: {
            canonical(games_by_id[cid]["title"])
            for cid in missing_ids
            if cid in games_by_id and games_by_id[cid]["platform"] == platform
        }
        for platform in target_platforms
    }

    games_meta = {}
    candidate_ids = set()

    print("Indexing exact title/platform matches...")
    for event, elem in ET.iterparse(xml_path, events=("end",)):
        if elem.tag == "Game":
            dbid = elem.findtext("DatabaseID")
            name = elem.findtext("Name") or ""
            platform = elem.findtext("Platform") or ""
            if dbid:
                for local_platform in target_platforms:
                    if not platform_matches(local_platform, platform):
                        continue
                    if canonical(name) in names_by_platform.get(local_platform, set()) or strip_article(name) in {strip_article(v) for v in names_by_platform.get(local_platform, set())}:
                        games_meta[dbid] = {"name": name, "platform": platform, "alternates": []}
                        candidate_ids.add(dbid)
                        break
            elem.clear()
        elif elem.tag == "GameAlternateName":
            dbid = elem.findtext("DatabaseID")
            if dbid in games_meta:
                alt = elem.findtext("AlternateName") or ""
                region = elem.findtext("Region") or ""
                games_meta[dbid]["alternates"].append({"name": alt, "region": region})
            elem.clear()
        else:
            elem.clear()

    images_by_id = {dbid: [] for dbid in candidate_ids}
    print(f"Indexing Europe/PAL front covers for {len(candidate_ids)} candidate games...")
    for event, elem in ET.iterparse(xml_path, events=("end",)):
        if elem.tag == "GameImage":
            dbid = elem.findtext("DatabaseID")
            if dbid in images_by_id:
                image_type = elem.findtext("Type") or ""
                region = elem.findtext("Region") or ""
                filename = elem.findtext("FileName") or ""
                if image_type == "Box - Front" and normalize(region) in PAL_REGIONS and filename:
                    images_by_id[dbid].append({
                        "filename": filename,
                        "region": region,
                        "type": image_type,
                    })
            elem.clear()
        else:
            elem.clear()

    resolved = {}
    review = []

    for cid in sorted(missing_ids):
        game = games_by_id.get(cid)
        if not game:
            continue

        candidates = []
        for dbid, meta in games_meta.items():
            if not platform_matches(game["platform"], meta["platform"]):
                continue

            matched_name = None
            if exact_title_match(game["title"], meta["name"]):
                matched_name = meta["name"]
            else:
                for alt in meta["alternates"]:
                    if exact_title_match(game["title"], alt["name"]):
                        matched_name = alt["name"]
                        break

            if not matched_name:
                continue
            if not edition_compatible(meta["name"], game.get("edition", "")):
                continue

            images = images_by_id.get(dbid, [])
            if not images:
                continue

            best_image = max(images, key=lambda image: region_priority(image["region"], game))
            score = 1000 + region_priority(best_image["region"], game)
            if canonical(game["title"]) == canonical(meta["name"]):
                score += 50

            candidates.append({
                "databaseId": dbid,
                "name": meta["name"],
                "matchedName": matched_name,
                "platform": meta["platform"],
                "image": best_image,
                "score": score,
            })

        candidates.sort(key=lambda item: item["score"], reverse=True)
        if not candidates:
            continue

        best = candidates[0]
        runner = candidates[1] if len(candidates) > 1 else None
        if runner and runner["score"] == best["score"] and normalize(runner["name"]) != normalize(best["name"]):
            review.append({
                "collectionId": cid,
                "title": game["title"],
                "platform": game["platform"],
                "reason": "ambiguous-launchbox-match",
                "candidates": candidates[:4],
            })
            continue

        filename = best["image"]["filename"]
        ext = image_extension(filename)
        relative = f"/covers/{cid}{ext}"
        destination = ROOT / "public" / relative.lstrip("/")

        for old_ext in [".jpg", ".jpeg", ".png", ".webp"]:
            old = COVERS_DIR / f"{cid}{old_ext}"
            if old != destination:
                try:
                    old.unlink()
                except FileNotFoundError:
                    pass

        download(IMAGE_BASE + filename, destination)

        resolved[cid] = {
            "file": relative,
            "source": "launchbox",
            "launchboxDatabaseId": int(best["databaseId"]),
            "launchboxTitle": best["name"],
            "matchedName": best["matchedName"],
            "platformName": best["platform"],
            "regionName": best["image"]["region"],
            "imageType": best["image"]["type"],
            "sourceImage": IMAGE_BASE + filename,
            "matchScore": best["score"],
            "matchedBy": "exact-title-platform-pal-region",
        }

    manifest_entries = dict(manifest.get("entries", {}))
    manifest_entries.update(resolved)
    manifest_entries = dict(sorted(manifest_entries.items(), key=lambda item: item[0]))

    sources = list(dict.fromkeys([*(manifest.get("sources") or [manifest.get("source")]), "launchbox"]))
    sources = [source for source in sources if source]

    manifest.update({
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "local-artwork",
        "sources": sources,
        "entries": manifest_entries,
        "matched": len(manifest_entries),
        "missing": max(0, len(games) - len(manifest_entries)),
    })

    resolved_ids = set(resolved)
    remaining_missing = [
        entry for entry in missing_data.get("entries", [])
        if entry.get("collectionId") not in resolved_ids
    ]

    with open(MANIFEST_FILE, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    with open(MISSING_FILE, "w", encoding="utf-8") as handle:
        output = dict(missing_data)
        output["generatedAt"] = manifest["generatedAt"]
        output["matched"] = len(manifest_entries)
        output["missing"] = len(remaining_missing)
        output["entries"] = remaining_missing
        json.dump(output, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    artwork_map = {cid: entry["file"] for cid, entry in manifest_entries.items()}
    with open(GENERATED_MODULE, "w", encoding="utf-8") as handle:
        handle.write("// Generated by the artwork importers. Do not edit by hand.\n")
        handle.write("export const GAME_ARTWORK: Record<string, string> = ")
        json.dump(artwork_map, handle, indent=2, ensure_ascii=False)
        handle.write(";\n")

    report = {
        "generatedAt": manifest["generatedAt"],
        "source": "launchbox",
        "inputMissing": len(missing_ids),
        "resolved": len(resolved),
        "remaining": len(remaining_missing),
        "review": review,
        "entries": resolved,
    }
    with open(REPORT_FILE, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    print(f"LaunchBox PAL exact-title covers added: {len(resolved)}")
    print(f"Remaining without local artwork: {len(remaining_missing)}")
    if review:
        print(f"Ambiguous LaunchBox matches left for review: {len(review)}")
