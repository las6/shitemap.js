"""Generate a single-layer board: component keepouts and non-crossing routed nets.
Run from the repo root with python3 scripts/generate-circuitry.py.
"""
from pathlib import Path
import heapq
import math

UNIT = 20
WIDTH, HEIGHT = 130, 90
# Centres, half widths/heights, and role. Large packages act as branching hubs;
# smaller packages and circular terminals are their children.
NODES = [
    (23, 20, 5, 4, 'hub'), (59, 20, 4, 3, 'hub'),
    (101, 24, 5, 4, 'hub'), (42, 61, 5, 4, 'hub'),
    (88, 69, 4, 3, 'hub'),
    (7, 9, 2, 2, 'socket'), (10, 37, 3, 2, 'package'),
    (39, 8, 3, 2, 'package'), (43, 29, 3, 2, 'package'),
    (68, 32, 3, 2, 'package'), (78, 8, 2, 2, 'socket'),
    (119, 9, 3, 2, 'package'), (120, 39, 2, 2, 'socket'),
    (88, 43, 3, 2, 'package'), (113, 60, 3, 2, 'package'),
    (14, 57, 3, 2, 'package'), (11, 78, 2, 2, 'socket'),
    (33, 81, 3, 2, 'package'), (61, 74, 3, 2, 'package'),
    (64, 52, 2, 2, 'socket'), (103, 83, 3, 2, 'package'),
    (76, 86, 2, 2, 'socket'), (124, 77, 2, 2, 'socket'),
]
EDGES = [(0,5),(0,6),(0,7),(0,8),(0,1),(1,9),(1,10),(1,2),
         (2,11),(2,12),(2,13),(2,14),(0,3),(3,15),(3,16),
         (3,17),(3,18),(3,19),(3,4),(4,20),(4,21),(4,22),(4,14)]
blocked = set()
for x,y,w,h,_ in NODES:
    blocked.update((a,b) for a in range(x-w,x+w+1) for b in range(y-h,y+h+1))
occupied = set()
diagonals = set()
used_ports = set()
paths = []
pads = []
junctions = []


def ports(index):
    x,y,w,h,role = NODES[index]
    span = 1 if role == 'socket' else min(w,h)-1
    result=[]
    for i in range(-span,span+1):
        result.extend([((x-w-1,y+i),(x-w,y+i)),((x+w+1,y+i),(x+w,y+i)),
                       ((x+i,y-h-1),(x+i,y-h)),((x+i,y+h+1),(x+i,y+h))])
    return [p for p in result if p[0] not in used_ports and p[0] not in occupied]


def route(start,end):
    goals = end if isinstance(end, set) else {end}
    frontier=[(0,0,start,None)]
    costs={(start,None):0}
    previous={}
    found=None
    directions=[(1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)]
    while frontier:
        _,cost,p,direction=heapq.heappop(frontier)
        state=(p,direction)
        if cost != costs.get(state): continue
        if p in goals:
            found=state
            break
        for d in directions:
            q=(p[0]+d[0],p[1]+d[1])
            if not (1<=q[0]<WIDTH-1 and 1<=q[1]<HEIGHT-1): continue
            if q in blocked or (q in occupied and q not in goals): continue
            if d[0] and d[1]:
                # Reject corner-cutting and crossing a previously routed diagonal.
                if (p[0],q[1]) in blocked or (q[0],p[1]) in blocked: continue
                if (p[0],q[1]) in occupied or (q[0],p[1]) in occupied: continue
                if frozenset(((p[0],q[1]),(q[0],p[1]))) in diagonals: continue
            turn=0 if direction in (None,d) else 1.6
            nearby=sum((q[0]+dx,q[1]+dy) in occupied for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)))
            nc=cost+math.hypot(*d)+turn+nearby*.15
            ns=(q,d)
            if nc<costs.get(ns,float('inf')):
                costs[ns]=nc
                previous[ns]=state
                heuristic=0 if len(goals)>1 else max(abs(q[0]-end[0]),abs(q[1]-end[1]))
                heapq.heappush(frontier,(nc+heuristic,nc,q,d))
    if found is None: return None
    result=[]
    while found in previous:
        result.append(found[0]); found=previous[found]
    result.append(start)
    return result[::-1]

# Route the backbone before short local branches can enclose a hub.
for a,b in sorted(EDGES, key=lambda edge: math.dist(NODES[edge[0]][:2], NODES[edge[1]][:2]), reverse=True):
    # Multiple nets between packages make coherent routing corridors.
    for lane in range(2 if NODES[b][4]!='socket' else 1):
        candidates=sorted(((pa,pb) for pa in ports(a) for pb in ports(b)),
                          key=lambda pair:math.dist(pair[0][0],pair[1][0]))
        for pa,pb in candidates[:12]:
            points=route(pa[0],pb[0])
            if points:
                occupied.update(points)
                used_ports.update((pa[0],pb[0]))
                for p,q in zip(points,points[1:]):
                    if p[0]!=q[0] and p[1]!=q[1]: diagonals.add(frozenset((p,q)))
                paths.append(points)
                pads.extend(((a,pa),(b,pb)))
                break
        else:
            if lane:
                continue
            # A congested branch can join an existing bus at an explicit junction,
            # rather than crossing it or leaving a floating component.
            for port in sorted(ports(b), key=lambda p: min(math.dist(p[0],q) for q in occupied)):
                points=route(port[0],occupied)
                if points:
                    occupied.update(points)
                    used_ports.add(port[0])
                    paths.append(points)
                    pads.append((b,port))
                    junctions.append(points[-1])
                    for p,q in zip(points,points[1:]):
                        if p[0]!=q[0] and p[1]!=q[1]: diagonals.add(frozenset((p,q)))
                    break
            else:
                raise RuntimeError(f'Component {b} could not reach a bus')

parts=[]
for points in paths:
    # Remove collinear waypoints while retaining the original clearance.
    compact=[points[0]]
    for i in range(1,len(points)-1):
        p,q,r=points[i-1:i+2]
        if (q[0]-p[0],q[1]-p[1])!=(r[0]-q[0],r[1]-q[1]): compact.append(q)
    compact.append(points[-1])
    parts.append('<path d="M '+' L '.join(f'{x*UNIT} {y*UNIT}' for x,y in compact)+'"/>')
for index,(outer,inner) in pads:
    x,y=outer; a,b=inner
    if NODES[index][4] == 'socket':
        cx,cy=NODES[index][:2]
        dx,dy=a-cx,b-cy
        scale=28/math.hypot(dx*UNIT,dy*UNIT)
        parts.append(f'<path d="M {a*UNIT} {b*UNIT} L {cx*UNIT+dx*UNIT*scale:.2f} {cy*UNIT+dy*UNIT*scale:.2f}"/>')
    parts.append(f'<path stroke-width="5" d="M {x*UNIT} {y*UNIT} L {a*UNIT} {b*UNIT}"/>')
# Unused contact fingers complete the component footprint without crossing nets.
for index in range(len(NODES)):
    if NODES[index][4] == 'socket': continue
    for outer,inner in ports(index):
        if outer in occupied: continue
        x,y=outer; a,b=inner
        parts.append(f'<path stroke-width="4" d="M {x*UNIT} {y*UNIT} L {a*UNIT} {b*UNIT}"/>')
for x,y,w,h,role in NODES:
    cx,cy=x*UNIT,y*UNIT
    if role=='socket':
        parts.append(f'<circle cx="{cx}" cy="{cy}" r="28"/><circle cx="{cx}" cy="{cy}" r="15"/>')
        # Via arrays connect the circular terminal to its package boundary.
        for dx,dy in ((-1,-1),(1,-1),(-1,1),(1,1)):
            parts.append(f'<circle cx="{cx+dx*32}" cy="{cy+dy*32}" r="5"/>')
    else:
        left,top=(x-w)*UNIT,(y-h)*UNIT
        width,height=w*UNIT*2,h*UNIT*2
        parts.append(f'<rect x="{left}" y="{top}" width="{width}" height="{height}" rx="9"/>')
        if role=='hub':
            parts.append(f'<rect x="{left+16}" y="{top+16}" width="{width-32}" height="{height-32}" rx="3"/>')
            # A smaller three-way tree inside each hub links PCB language to sitemaps.
            parts.append(f'<path d="M {cx-30} {cy} H {cx} M {cx} {cy-28} V {cy+28} M {cx} {cy-28} H {cx+24} M {cx} {cy+28} H {cx+24}"/>')
            for px,py in ((cx-37,cy),(cx+31,cy-28),(cx+31,cy+28)):
                parts.append(f'<circle cx="{px}" cy="{py}" r="7"/>')
            parts.append(f'<circle cx="{left+27}" cy="{top+27}" r="4"/>')
        else:
            parts.append(f'<path d="M {cx-15} {cy} H {cx+15}"/><circle cx="{left+14}" cy="{top+14}" r="3"/>')
# Vias along selected routed nets are intentional electrical junction markers.
for index,points in enumerate(paths):
    if index%3==0 and len(points)>16:
        x,y=points[len(points)//2]
        parts.append(f'<circle cx="{x*UNIT}" cy="{y*UNIT}" r="6"/>')
for x,y in junctions:
    parts.append(f'<circle cx="{x*UNIT}" cy="{y*UNIT}" r="6"/><circle cx="{x*UNIT}" cy="{y*UNIT}" r="2" fill="white"/>')
assert {index for index,_ in pads} == set(range(len(NODES))), 'Every component must be connected'
seen = set()
for points in paths:
    assert not (set(points) & seen) - set(junctions), 'Undeclared trace junction'
    seen.update(points)
svg='<svg xmlns="http://www.w3.org/2000/svg" width="2600" height="1800" viewBox="0 0 2600 1800"><g fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'+''.join(parts)+'</g></svg>\n'
Path('public/textures/circuitry.svg').write_text(svg)
print(f'Generated {len(NODES)} components and {len(paths)} non-crossing nets.')
