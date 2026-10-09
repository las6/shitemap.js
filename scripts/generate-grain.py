"""Seeded paper-like grain with periodic density and wrapped edge particles."""
from pathlib import Path
import random, math
r = random.Random(128)
parts = []
for i in range(4000):
    x, y = r.uniform(0, 512), r.uniform(0, 512)
    density = .55 + .22 * math.sin(x / 512 * math.tau * 3) * math.cos(y / 512 * math.tau * 2)
    if r.random() > density: continue
    rx = r.uniform(.25, .75)
    ry = rx * r.uniform(1.2, 3.4)
    opacity, angle = r.uniform(.25, .85), r.randrange(180)
    # Wrap the complete particle, including rotation, across the tile boundary.
    xs = [0] + ([512] if x < 4 else []) + ([-512] if x > 508 else [])
    ys = [0] + ([512] if y < 4 else []) + ([-512] if y > 508 else [])
    for dx in xs:
        for dy in ys:
            a, b = x + dx, y + dy
            parts.append(f'<ellipse cx="{a:.2f}" cy="{b:.2f}" rx="{rx:.2f}" ry="{ry:.2f}" opacity="{opacity:.2f}" transform="rotate({angle} {a:.2f} {b:.2f})"/>')
for i in range(350):
    x, y = r.uniform(5, 507), r.uniform(5, 507)
    dx, dy = r.uniform(-3, 3), r.uniform(1, 4)
    parts.append(f'<path d="M{x:.2f} {y:.2f} q{dx:.2f} {dy/2:.2f} {dx/2:.2f} {dy:.2f}" fill="none" stroke="white" stroke-width=".45" opacity=".35"/>')
Path('public/textures/grain.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><g fill="white">' + ''.join(parts) + '</g></svg>')
