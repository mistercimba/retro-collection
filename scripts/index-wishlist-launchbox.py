"""Build an offline front-cover index from the existing LaunchBox metadata source.

Only requested platforms are indexed. No fuzzy matching or image selection occurs here.
"""
import argparse
import hashlib
import json
import xml.etree.ElementTree as ET
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument("--metadata", required=True)
parser.add_argument("--platform", action="append", required=True)
parser.add_argument("--output", required=True)
args = parser.parse_args()
platforms = set(args.platform)
games = {}
alternates = {}
images = {}

with open(args.metadata, "rb") as handle:
    digest = hashlib.file_digest(handle, "sha256").hexdigest()

def records(archive):
    with archive.open("Metadata.xml") as stream:
        depth = 0
        for event, element in ET.iterparse(stream, events=("start", "end")):
            if event == "start":
                depth += 1
            else:
                if depth == 2:
                    yield element
                    element.clear()
                depth -= 1

with zipfile.ZipFile(args.metadata) as archive:
    for element in records(archive):
        database_id = element.findtext("DatabaseID")
        if element.tag == "Game" and element.findtext("Platform") in platforms:
            games[database_id] = {
                "databaseId": database_id,
                "title": element.findtext("Name") or "",
                "platform": element.findtext("Platform"),
            }
        elif element.tag == "GameAlternateName":
            alternates.setdefault(database_id, []).append({
                "title": element.findtext("AlternateName") or "",
                "region": element.findtext("Region") or "",
            })
    for element in records(archive):
        database_id = element.findtext("DatabaseID")
        if element.tag == "GameImage" and database_id in games and element.findtext("Type") == "Box - Front":
            images.setdefault(database_id, []).append({
                "fileName": element.findtext("FileName") or "",
                "region": element.findtext("Region") or "",
            })

for database_id, game in games.items():
    game["alternates"] = alternates.get(database_id, [])
    game["images"] = images.get(database_id, [])

with open(args.output, "w", encoding="utf-8") as handle:
    json.dump({
        "source": "https://gamesdb.launchbox-app.com/Metadata.zip",
        "metadataSha256": digest,
        "platforms": sorted(platforms),
        "games": list(games.values()),
    }, handle, ensure_ascii=False)
print(json.dumps({"platforms": sorted(platforms), "games": len(games), "metadataSha256": digest}))
