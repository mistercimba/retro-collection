import re


PAL_REGION = re.compile(r"^PAL(?:-[A-Z])?$")


def validate_artwork_region(target_region, game_region="", artwork_policy=""):
    target = str(target_region or "").strip().upper()
    physical = str(game_region or "").strip().upper()
    policy = str(artwork_policy or "").strip().upper()

    if not target:
        raise ValueError("curated target must explicitly declare its region")

    required = policy or physical
    if required == "PAL" or required.startswith("PAL-"):
        if not PAL_REGION.fullmatch(target):
            raise ValueError(f"PAL artwork policy rejects region {target}")
        return

    if physical and not (
        physical.startswith(target) or target.startswith(physical)
    ):
        raise ValueError(
            f"curated target region {target} does not match collection region {physical}"
        )
