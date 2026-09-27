import unittest

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


if __name__ == "__main__":
    unittest.main()
