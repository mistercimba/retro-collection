import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

from artwork_region_policy import validate_artwork_region


class ArtworkRegionPolicyTests(unittest.TestCase):
    def test_pal_art_is_allowed_for_ntsc_physical_copy_when_policy_is_pal(self):
        validate_artwork_region("PAL", "NTSC", "PAL")

    def test_ntsc_art_is_rejected_when_policy_is_pal(self):
        with self.assertRaisesRegex(ValueError, "PAL artwork policy rejects"):
            validate_artwork_region("NTSC", "NTSC", "PAL")

    def test_pal_b_copy_requires_a_pal_variant(self):
        validate_artwork_region("PAL-B", "PAL-B", "PAL")
        with self.assertRaisesRegex(ValueError, "PAL artwork policy rejects"):
            validate_artwork_region("World", "PAL-B", "PAL")

    def test_non_pal_artwork_keeps_physical_region_matching(self):
        validate_artwork_region("NTSC-U", "NTSC-U")
        with self.assertRaisesRegex(ValueError, "does not match"):
            validate_artwork_region("PAL", "NTSC-U")

    def test_every_curated_cover_respects_its_game_artwork_policy(self):
        targets = json.loads((ROOT / "data/artwork-curated-url-targets.json").read_text())
        games = {
            game["collectionId"]: game
            for game in json.loads((ROOT / "data/artwork-games.json").read_text())
        }
        for collection_id, target in targets.items():
            if collection_id.startswith("_"):
                continue
            game = games[collection_id]
            with self.subTest(collection_id=collection_id):
                validate_artwork_region(
                    target.get("region"),
                    game.get("region"),
                    game.get("artworkPolicy"),
                )

    def test_hunt_for_red_october_uses_curated_pal_noe_box_art(self):
        targets = json.loads((ROOT / "data/artwork-curated-url-targets.json").read_text())
        target = targets["GBC-0052"]
        self.assertEqual(target["region"], "PAL")
        self.assertEqual(target["artworkVariant"], "NOE / Europe")
        self.assertTrue(target["replaceExisting"])
        self.assertTrue(target["sourceImage"].endswith("/vizu/2654.jpg"))


if __name__ == "__main__":
    unittest.main()
