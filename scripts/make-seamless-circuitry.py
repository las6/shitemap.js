"""Turn a traced circuit SVG into a seamless tile.

The artwork is not periodic, so tiling it directly leaves a visible cut where
the edges meet. Reflecting it into a 2x2 block makes every shared edge exactly
identical, so the tile repeats with no seam. Because the input is vector, the
result stays vector: it scales without pixelation and needs no SVG filter, so
it does not suffer the edge artefacts the raster mask had.

Run from the repo root with python3 scripts/make-seamless-circuitry.py.
"""
from pathlib import Path
import re

SOURCE = Path('public/textures/circuitry-new.svg')
OUTPUT = Path('public/textures/circuitry-seamless.svg')

source = SOURCE.read_text()
view = re.search(r'viewBox="([\d.\- ]+)"', source)
_, _, width, height = (float(n) for n in view.group(1).split())
body = re.search(r'<svg[^>]*>(.*)</svg>', source, re.S).group(1).strip()

tile = (
    f'<svg xmlns="http://www.w3.org/2000/svg" '
    f'xmlns:xlink="http://www.w3.org/1999/xlink" '
    f'width="{2 * width:g}" height="{2 * height:g}" '
    f'viewBox="0 0 {2 * width} {2 * height}">\n'
    f'<defs><g id="art">{body}</g></defs>\n'
    f'<use xlink:href="#art"/>\n'
    f'<use xlink:href="#art" transform="translate({2 * width} 0) scale(-1 1)"/>\n'
    f'<use xlink:href="#art" transform="translate(0 {2 * height}) scale(1 -1)"/>\n'
    f'<use xlink:href="#art" transform="translate({2 * width} {2 * height}) scale(-1 -1)"/>\n'
    f'</svg>\n'
)
OUTPUT.write_text(tile)
print(f'Wrote {OUTPUT} ({2 * width:g}x{2 * height:g}, seamless via reflection).')
