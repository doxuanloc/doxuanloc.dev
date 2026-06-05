#!/usr/bin/env python3
"""Generate 6 cohesive, vivid procedural visuals for the journey timeline."""
import numpy as np, math, random
from PIL import Image, ImageDraw, ImageFilter, ImageChops

W, H = 1200, 800
import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "images", "journey")
BG = (10, 14, 26)
BLUE, TEAL, PURPLE, AMBER = (91,140,255), (54,214,195), (181,140,255), (240,178,50)

def bg_gradient(blooms):
    """blooms: list of (cx,cy,R,color,strength). Returns numpy float array."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    img = np.zeros((H, W, 3), np.float32) + np.array(BG, np.float32)
    for cx, cy, R, col, s in blooms:
        d = np.sqrt((xx-cx)**2 + (yy-cy)**2)
        inten = np.clip(1 - d/R, 0, 1)**2 * s
        for k in range(3):
            img[..., k] += col[k] * inten
    # vignette
    d = np.sqrt((xx-W/2)**2 + (yy-H/2)**2) / (math.hypot(W/2, H/2))
    vig = np.clip(1 - (d**2)*0.55, 0.35, 1)[..., None]
    img *= vig
    return np.clip(img, 0, 255)

def to_img(arr): return Image.fromarray(arr.astype(np.uint8), "RGB")

def glow(draw_fn, blur):
    layer = Image.new("RGB", (W, H), (0,0,0))
    draw_fn(ImageDraw.Draw(layer))
    return layer.filter(ImageFilter.GaussianBlur(blur))

def add(base, layer): return ImageChops.add(base, layer)

def lerp(a, b, t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))
def scale(c, f): return tuple(int(min(255, c[i]*f)) for i in range(3))

def finish(img, name):
    # subtle grain
    n = (np.random.randn(H, W, 1)*5).astype(np.int16)
    a = np.clip(np.asarray(img).astype(np.int16)+n, 0, 255).astype(np.uint8)
    Image.fromarray(a, "RGB").save(f"{OUT}/{name}.png", optimize=True)
    print("saved", name)

def nodes_net(seed, n, cols, link_dist, box, line_w=1):
    """Return (points, draw_glow, draw_crisp) for a node network inside box=(x0,y0,x1,y1)."""
    random.seed(seed)
    x0,y0,x1,y1 = box
    pts = [(random.uniform(x0,x1), random.uniform(y0,y1), random.choice(cols)) for _ in range(n)]
    def gdraw(d):
        for i in range(len(pts)):
            for j in range(i+1, len(pts)):
                ax,ay,_ = pts[i]; bx,by,_ = pts[j]
                dist = math.hypot(ax-bx, ay-by)
                if dist < link_dist:
                    t = 1 - dist/link_dist
                    c = scale(lerp(pts[i][2], pts[j][2], 0.5), 0.5+0.9*t)
                    d.line([ax,ay,bx,by], fill=c, width=line_w)
        for x,y,c in pts:
            d.ellipse([x-7,y-7,x+7,y+7], fill=scale(c,0.9))
    def cdraw(d):
        for x,y,c in pts:
            d.ellipse([x-2.5,y-2.5,x+2.5,y+2.5], fill=scale(c,1.3))
            d.ellipse([x-1,y-1,x+1,y+1], fill=(255,255,255))
    return pts, gdraw, cdraw

# ---------------- 1. Education: knowledge mesh ----------------
def education():
    base = to_img(bg_gradient([(820,180,720,BLUE,0.5),(300,640,640,TEAL,0.35)]))
    _, g, c = nodes_net(11, 34, [BLUE,TEAL], 230, (120,120,1080,680))
    base = add(base, glow(g, 9)); base = add(base, glow(g, 2))
    ImageDraw.Draw(base); d=ImageDraw.Draw(base); c(d)
    finish(base, "dai-hoc-nen-tang")

# ---------------- 2. Frontend / crypto: chart + lattice ----------------
def frontend():
    base = to_img(bg_gradient([(900,200,760,TEAL,0.45),(250,600,620,BLUE,0.4)]))
    random.seed(7)
    # rising line chart
    pts = []
    x = 120; y = 620
    for i in range(13):
        y += random.uniform(-70, 30) - 6
        y = max(180, min(660, y))
        pts.append((x, y)); x += (1080-120)/12
    def line_glow(d):
        d.line(pts, fill=TEAL, width=4, joint="curve")
        for i,(px,py) in enumerate(pts):
            col = AMBER if i%4==0 else BLUE
            d.line([px,py,px,700], fill=scale(col,0.5), width=2)
    base = add(base, glow(line_glow, 10)); base = add(base, glow(line_glow, 2))
    d = ImageDraw.Draw(base)
    d.line(pts, fill=scale(TEAL,1.2), width=2, joint="curve")
    for i,(px,py) in enumerate(pts):
        col = AMBER if i%4==0 else BLUE
        d.ellipse([px-3,py-3,px+3,py+3], fill=scale(col,1.3))
    finish(base, "buoc-chan-frontend")

# ---------------- 3. Full-stack / 3D wireframe ----------------
def fullstack():
    base = to_img(bg_gradient([(820,260,760,PURPLE,0.5),(360,600,600,BLUE,0.4)]))
    cx, cy, s = 660, 410, 180
    # isometric cube + nested grid
    def proj(x,y,z):
        ix = cx + (x - y)*math.cos(math.radians(30))*s
        iy = cy + (x + y)*math.sin(math.radians(30))*s - z*s
        return (ix, iy)
    edges = []
    cubepts = {(a,b,cc):proj(a,b,cc) for a in (-1,1) for b in (-1,1) for cc in (-1,1)}
    for (a,b,cc),p in cubepts.items():
        for (da,db,dc) in [(2,0,0),(0,2,0),(0,0,2)]:
            q=(a+da,b+db,cc+dc)
            if q in cubepts: edges.append((p, cubepts[q]))
    # perspective grid floor
    def gdraw(d):
        for gx in range(-2,3):
            d.line([proj(gx,-2,-1.2), proj(gx,2,-1.2)], fill=scale(BLUE,0.5), width=2)
            d.line([proj(-2,gx,-1.2), proj(2,gx,-1.2)], fill=scale(BLUE,0.5), width=2)
        for p,q in edges:
            d.line([p,q], fill=PURPLE, width=3)
    base = add(base, glow(gdraw, 9)); base = add(base, glow(gdraw, 2))
    d = ImageDraw.Draw(base)
    for p,q in edges: d.line([p,q], fill=scale(PURPLE,1.2), width=2)
    for p in cubepts.values():
        d.ellipse([p[0]-4,p[1]-4,p[0]+4,p[1]+4], fill=(255,255,255))
    finish(base, "fullstack-thuc-chien")

# ---------------- 4. Architecture: microservices nodes ----------------
def architecture():
    base = to_img(bg_gradient([(880,200,780,BLUE,0.5),(300,640,640,TEAL,0.4)]))
    random.seed(21)
    # central hub + service clusters
    hub = (600, 400)
    services = [(600+math.cos(a)*r, 400+math.sin(a)*r, random.choice([BLUE,TEAL,PURPLE]))
               for i,(a,r) in enumerate([(math.radians(k*45+10), random.uniform(180,300)) for k in range(8)])]
    def gdraw(d):
        for x,y,c in services:
            d.line([hub[0],hub[1],x,y], fill=scale(c,0.6), width=2)
            # sub-nodes
            for _ in range(2):
                sx,sy = x+random.uniform(-70,70), y+random.uniform(-70,70)
                d.line([x,y,sx,sy], fill=scale(c,0.4), width=1)
                d.ellipse([sx-4,sy-4,sx+4,sy+4], fill=scale(c,0.7))
            d.rectangle([x-11,y-11,x+11,y+11], outline=c, width=2)
        d.ellipse([hub[0]-20,hub[1]-20,hub[0]+20,hub[1]+20], fill=scale(BLUE,0.8))
    base = add(base, glow(gdraw, 8)); base = add(base, glow(gdraw, 2))
    d = ImageDraw.Draw(base)
    for x,y,c in services:
        d.rectangle([x-11,y-11,x+11,y+11], outline=scale(c,1.3), width=2)
        d.ellipse([x-3,y-3,x+3,y+3], fill=(255,255,255))
    d.ellipse([hub[0]-9,hub[1]-9,hub[0]+9,hub[1]+9], fill=(255,255,255))
    finish(base, "kien-truc-he-thong")

# ---------------- 5. AI: dense neural network ----------------
def ai():
    base = to_img(bg_gradient([(820,250,820,PURPLE,0.55),(400,560,640,TEAL,0.45)]))
    random.seed(33)
    layers = [4,6,6,5,3]
    xs = np.linspace(230, 970, len(layers))
    cols = []
    for li,(lx,cnt) in enumerate(zip(xs, layers)):
        ys = np.linspace(280, 540, cnt)
        cols.append([(lx, y) for y in ys])
    pal = [PURPLE,TEAL,BLUE]
    def gdraw(d):
        for li in range(len(cols)-1):
            for (ax,ay) in cols[li]:
                for (bx,by) in cols[li+1]:
                    d.line([ax,ay,bx,by], fill=scale(pal[li%3],0.45), width=1)
        for li,layer in enumerate(cols):
            for (x,y) in layer:
                d.ellipse([x-9,y-9,x+9,y+9], fill=scale(pal[li%3],0.85))
    base = add(base, glow(gdraw, 8)); base = add(base, glow(gdraw, 2))
    d = ImageDraw.Draw(base)
    for li,layer in enumerate(cols):
        for (x,y) in layer:
            d.ellipse([x-4,y-4,x+4,y+4], fill=scale(pal[li%3],1.3))
            d.ellipse([x-1.5,y-1.5,x+1.5,y+1.5], fill=(255,255,255))
    finish(base, "ai-va-toi-uu")

# ---------------- 6. Future: skyline + light bridge ----------------
def future():
    base = to_img(bg_gradient([(600,260,900,PURPLE,0.4),(600,250,520,BLUE,0.35),(600,720,700,TEAL,0.3)]))
    random.seed(45)
    horizon = 560
    def gdraw(d):
        # horizon glow line
        d.line([80,horizon,1120,horizon], fill=scale(BLUE,0.8), width=3)
        # buildings
        x = 150
        while x < 1080:
            bw = random.uniform(26,60); bh = random.uniform(60,230)
            col = random.choice([BLUE,PURPLE,TEAL])
            d.rectangle([x, horizon-bh, x+bw, horizon], outline=scale(col,0.7), width=2)
            x += bw + random.uniform(14,40)
        # light bridge arcs
        for k in range(3):
            yb = horizon - 30 - k*16
            d.arc([300, yb-160, 900, yb+160], start=200, end=340, fill=scale(TEAL,0.7-0.15*k), width=3)
        # vertical beams
        for bx in (380, 600, 820):
            d.line([bx, horizon, bx, 120], fill=scale(PURPLE,0.5), width=4)
    base = add(base, glow(gdraw, 9)); base = add(base, glow(gdraw, 2))
    d = ImageDraw.Draw(base)
    d.line([80,horizon,1120,horizon], fill=scale(BLUE,1.2), width=2)
    for bx in (380, 600, 820):
        d.ellipse([bx-4,118,bx+4,126], fill=(255,255,255))
    finish(base, "ai-solutions-architect")

for fn in (education, frontend, fullstack, architecture, ai, future):
    fn()
print("done")
