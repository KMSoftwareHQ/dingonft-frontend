#!/usr/bin/env python3
"""Generate deterministic test data for the local object store.

Writes into dev/seed/<bucket>/ using the same key layout the server reads
from production buckets (extensionless JSON keys; <id>.png previews). The
output is committed, so this only needs re-running when fixtures change.
Requires Pillow (`pip install pillow`).
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seed")
B = lambda name: os.path.join(ROOT, f"dingo-nftc-0-{name}")

# --- fixture definitions --------------------------------------------------
# Ids are fake but shaped like Dingocoin addresses (D + base58) so routes look real.
NFTS = {
    "DdevNftAlpha1111111111111111111111": {
        "name": "Alpha Dingo",
        "description": "First test NFT: has a name and a description.",
        "color": (232, 93, 4),
    },
    "DdevNftBeta22222222222222222222222": {
        "name": "Beta Dingo",
        # no description -> og:description falls back to the address
        "color": (24, 120, 200),
    },
    "DdevNftGamma333333333333333333333": {
        # no name -> og:title falls back to the address
        "description": "Nameless test NFT.",
        "color": (46, 160, 67),
    },
}
COLLECTIONS = {
    "dev-dingos": {
        "handle": "dev-dingos",
        "name": "Dev Dingos",
        "description": "A test collection whose thumbnail is Alpha Dingo.",
        "thumbnail": "DdevNftAlpha1111111111111111111111",
    },
    "dev-nameless": {
        "handle": "dev-nameless",
        # no name -> og:title falls back to handle
        "thumbnail": "DdevNftGamma333333333333333333333",
    },
}
PROFILES = {
    "DdevOwnerWithAvatar4444444444444444": {
        "name": "Test Owner",
        "thumbnail": "DdevProfileAvatar555555555555555555",
    },
    "DdevOwnerNoAvatar66666666666666666": {
        "name": "Avatarless Owner",
        "thumbnail": None,  # -> og:image is empty string
    },
}
# Extra preview images that aren't NFT metadata (profile avatars).
EXTRA_PREVIEWS = {
    "DdevProfileAvatar555555555555555555": ("Avatar", (120, 60, 180)),
}

# --- helpers ----------------------------------------------------------------
def font(size):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # Pillow < 10.1
        return ImageFont.load_default()

def make_png(path, label, sub, color):
    img = Image.new("RGB", (600, 600), color)
    d = ImageDraw.Draw(img)
    # checker border so it's obviously a fixture
    for i in range(0, 600, 40):
        for edge in (0, 560):
            if (i // 40) % 2 == 0:
                d.rectangle([i, edge, i + 39, edge + 39], fill=(255, 255, 255))
                d.rectangle([edge, i, edge + 39, i + 39], fill=(255, 255, 255))
    d.text((300, 260), label, fill="white", font=font(56), anchor="mm")
    d.text((300, 330), sub, fill="white", font=font(20), anchor="mm")
    d.text((300, 380), "dingonft-link dev fixture", fill=(255, 255, 255, 180), font=font(18), anchor="mm")
    img.save(path, "PNG", optimize=True)

def write_json(bucket, key, obj):
    os.makedirs(B(bucket), exist_ok=True)
    with open(os.path.join(B(bucket), key), "w") as f:
        json.dump(obj, f, indent=2)
        f.write("\n")

# --- generate ---------------------------------------------------------------
os.makedirs(B("preview"), exist_ok=True)
os.makedirs(B("state"), exist_ok=True)  # unused by this server; created so all 5 buckets exist

for addr, spec in NFTS.items():
    meta = {k: v for k, v in spec.items() if k != "color"}
    write_json("meta", addr, meta)
    make_png(os.path.join(B("preview"), f"{addr}.png"), spec.get("name", "(no name)"), addr, spec["color"])

for handle, spec in COLLECTIONS.items():
    write_json("collection", handle, spec)

for owner, spec in PROFILES.items():
    write_json("profile", owner, spec)

for key, (label, color) in EXTRA_PREVIEWS.items():
    make_png(os.path.join(B("preview"), f"{key}.png"), label, key, color)

open(os.path.join(B("state"), ".keep"), "w").close()
print(f"fixtures written to {ROOT}")
