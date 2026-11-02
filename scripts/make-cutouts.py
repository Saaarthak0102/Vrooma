#!/usr/bin/env python3
"""
scripts/make-cutouts.py
Removes car backgrounds using rembg to generate transparent webp/avif cutouts.

Prerequisites:
  pip install rembg[gpu] pillow
  or:
  pip install rembg pillow

Usage:
  python scripts/make-cutouts.py --input raw_photos/ --output public/images/cars/
"""

import os
import sys
import argparse
from pathlib import Path

def process_cutout(input_path: Path, output_path: Path):
    try:
        from rembg import remove
        from PIL import Image
    except ImportError:
        print("Error: rembg and pillow must be installed. Run: pip install rembg pillow")
        sys.exit(1)

    print(f"Processing cutout for: {input_path.name} -> {output_path.name}")
    with Image.open(input_path) as img:
        # Remove background with alpha matting for clean automotive silhouettes
        output = remove(img, alpha_matting=True, alpha_matting_foreground_threshold=240)
        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)
        # Save as optimized webp
        output.save(output_path, "WEBP", quality=92)
    print(f"Saved transparent cutout to: {output_path}")

def main():
    parser = argparse.ArgumentParser(description="Generate transparent automotive cutouts with rembg")
    parser.add_argument("--input", "-i", type=str, default="raw_images", help="Input image directory or file")
    parser.add_argument("--output", "-o", type=str, default="public/images/cars", help="Output directory")
    args = parser.parse_args()

    in_path = Path(args.input)
    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    if in_path.is_file():
        out_file = out_dir / f"{in_path.stem}.webp"
        process_cutout(in_path, out_file)
    elif in_path.is_dir():
        for file in in_path.glob("*.*"):
            if file.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]:
                out_file = out_dir / f"{file.stem}.webp"
                process_cutout(file, out_file)
    else:
        print(f"Note: Input path {in_path} does not exist yet. Please place high-res automotive studio shots here.")

if __name__ == "__main__":
    main()
