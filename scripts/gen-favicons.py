#!/usr/bin/env python3
"""Generate PNG favicons from SVG icon using cairosvg and PIL"""

import os
from pathlib import Path

try:
    import cairosvg
    from PIL import Image
    import io
except ImportError:
    print("Installing required packages...")
    os.system("pip install cairosvg pillow")
    import cairosvg
    from PIL import Image
    import io

# Paths
script_dir = Path(__file__).parent
root_dir = script_dir.parent
svg_path = root_dir / "public" / "brand" / "eduproof-icon.svg"
output_dir = root_dir / "public"

# Sizes to generate
sizes = [16, 32, 48, 64, 128, 256, 512]

print(f"📁 Reading SVG from: {svg_path}")

for size in sizes:
    # Convert SVG to PNG bytes
    png_bytes = cairosvg.svg2png(
        url=str(svg_path),
        output_width=size,
        output_height=size
    )
    
    # Save to file
    output_path = output_dir / f"favicon-{size}.png"
    with open(output_path, 'wb') as f:
        f.write(png_bytes)
    
    print(f"✅ Generated favicon-{size}.png")

print("✅ All favicons generated successfully!")
