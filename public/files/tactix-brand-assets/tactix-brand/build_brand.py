#!/usr/bin/env python3
import os, numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = "/home/claude/tactix-brand"
os.makedirs(OUT, exist_ok=True)
for d in ["icons","favicon","mark","spec","svg"]:
    os.makedirs(os.path.join(OUT,d), exist_ok=True)

# ---------- palette ----------
STEEL_POS = [0,.34,.52,.64,.82,1]
STEEL = [(26,46,77),(58,86,124),(155,175,206),(121,145,181),(52,80,111),(28,48,80)]
TILE_POS = [0,1]
TILE = [(22,26,36),(11,13,19)]
SILVER   = (166,186,216)   # #a6bad8 mono-light accent
NAVY     = (28,48,80)       # #1c3050 mono-dark
RING     = (184,200,226)    # #b8c8e2
HOLE     = (16,19,27)        # #10131b

STAR = [(50,36),(75,25),(64,50),(75,75),(50,64),(25,75),(36,50),(25,25)]

def grad_img(W, pos, cols):
    """Diagonal (top-left -> bottom-right) linear gradient, returns RGBA."""
    xs = np.arange(W)
    xx, yy = np.meshgrid(xs, xs)
    t = (xx + yy) / (2*(W-1))
    R = np.interp(t, pos, [c[0] for c in cols])
    G = np.interp(t, pos, [c[1] for c in cols])
    B = np.interp(t, pos, [c[2] for c in cols])
    A = np.full_like(R, 255)
    arr = np.stack([R,G,B,A], axis=-1).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")

def star_mask(W):
    m = Image.new("L",(W,W),0)
    d = ImageDraw.Draw(m)
    pts = [(x*W/100, y*W/100) for (x,y) in STAR]
    d.polygon(pts, fill=255)
    return m

def squircle_mask(W, inset=2, rad=23.5):
    m = Image.new("L",(W,W),0)
    d = ImageDraw.Draw(m)
    i = inset*W/100; r = rad*W/100
    d.rounded_rectangle([i,i,W-1-i,W-1-i], radius=r, fill=255)
    return m

def render_icon(N, aperture=True):
    SS=4; W=N*SS
    canvas = Image.new("RGBA",(W,W),(0,0,0,0))
    canvas.paste(grad_img(W,TILE_POS,TILE),(0,0),squircle_mask(W))
    canvas.paste(grad_img(W,STEEL_POS,STEEL),(0,0),star_mask(W))
    if aperture and N>=96:
        sc=W/100; cx=cy=50*sc
        # center hole (tile color)
        d=ImageDraw.Draw(canvas); rH=4*sc
        d.ellipse([cx-rH,cy-rH,cx+rH,cy+rH], fill=HOLE+(255,))
        # ring
        ring=Image.new("RGBA",(W,W),(0,0,0,0))
        dr=ImageDraw.Draw(ring); rR=8.4*sc; wR=max(1,int(2*sc))
        dr.ellipse([cx-rR,cy-rR,cx+rR,cy+rR], outline=RING+(210,), width=wR)
        canvas=Image.alpha_composite(canvas,ring)
    return canvas.resize((N,N), Image.LANCZOS)

def render_flat(N, color_grad=True, solid=None):
    SS=4; W=N*SS
    canvas=Image.new("RGBA",(W,W),(0,0,0,0))
    if solid is None:
        canvas.paste(grad_img(W,STEEL_POS,STEEL),(0,0),star_mask(W))
    else:
        layer=Image.new("RGBA",(W,W),solid+(255,))
        canvas.paste(layer,(0,0),star_mask(W))
    return canvas.resize((N,N),Image.LANCZOS)

# ---------- icons ----------
for n in [1024,512,256,192,128]:
    render_icon(n).save(f"{OUT}/icons/tactix-icon-{n}.png")
render_icon(180).save(f"{OUT}/icons/apple-touch-icon-180.png")

# ---------- favicon ----------
render_icon(64, aperture=False).save(f"{OUT}/favicon/favicon-64.png")
render_icon(48, aperture=False).save(f"{OUT}/favicon/favicon-48.png")
render_icon(32, aperture=False).save(f"{OUT}/favicon/favicon-32.png")
render_icon(16, aperture=False).save(f"{OUT}/favicon/favicon-16.png")
ico = render_icon(64, aperture=False)
ico.save(f"{OUT}/favicon/favicon.ico", sizes=[(16,16),(32,32),(48,48)])

# ---------- standalone mark ----------
render_flat(1024).save(f"{OUT}/mark/tactix-mark-flat-1024.png")
render_flat(1024, solid=SILVER).save(f"{OUT}/mark/tactix-mark-mono-light-1024.png")
render_flat(1024, solid=NAVY).save(f"{OUT}/mark/tactix-mark-mono-dark-1024.png")

# ================= SVG FILES =================
STARP = "M50 36 L75 25 L64 50 L75 75 L50 64 L25 75 L36 50 L25 25 Z"
DEFS_STEEL = (
 '<linearGradient id="steel" x1="0" y1="0" x2="1" y2="1">'
 '<stop offset="0" stop-color="#1a2e4d"/><stop offset=".34" stop-color="#3a567c"/>'
 '<stop offset=".52" stop-color="#9bafce"/><stop offset=".64" stop-color="#7991b5"/>'
 '<stop offset=".82" stop-color="#34506f"/><stop offset="1" stop-color="#1c3050"/></linearGradient>'
)
DEFS_TILE = ('<linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">'
 '<stop offset="0" stop-color="#161a24"/><stop offset="1" stop-color="#0b0d13"/></linearGradient>')
DEFS_EDGE = ('<linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">'
 '<stop offset="0" stop-color="#fff" stop-opacity=".20"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/>'
 '<stop offset="1" stop-color="#fff" stop-opacity=".05"/></linearGradient>')

mark_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
<defs>{DEFS_STEEL}{DEFS_TILE}{DEFS_EDGE}</defs>
<rect x="2" y="2" width="96" height="96" rx="23.5" fill="url(#tile)"/>
<path d="{STARP}" fill="url(#steel)"/>
<path d="{STARP}" fill="none" stroke="url(#edge)" stroke-width="1.1"/>
<circle cx="50" cy="50" r="8.4" fill="none" stroke="#b8c8e2" stroke-width="2" opacity=".82"/>
<circle cx="50" cy="50" r="4" fill="#10131b"/>
</svg>'''
open(f"{OUT}/svg/tactix-mark.svg","w").write(mark_svg)

flat_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
<defs>{DEFS_STEEL}</defs>
<path d="{STARP}" fill="url(#steel)"/>
</svg>'''
open(f"{OUT}/svg/tactix-mark-flat.svg","w").write(flat_svg)

mono_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
<!-- One-color mark. Set color via CSS 'color' or change fill. -->
<path d="{STARP}" fill="currentColor"/>
</svg>'''
open(f"{OUT}/svg/tactix-mark-mono.svg","w").write(mono_svg)

# favicon.svg (no aperture for clarity at tiny sizes)
fav_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="32" height="32">
<defs>{DEFS_STEEL}{DEFS_TILE}</defs>
<rect x="0" y="0" width="100" height="100" rx="23.5" fill="url(#tile)"/>
<path d="{STARP}" fill="url(#steel)"/>
</svg>'''
open(f"{OUT}/favicon/favicon.svg","w").write(fav_svg)

# wordmark (Chakra Petch webfont) + lockup
FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@700&display=swap');"
ACCENT_GRAD = ('<linearGradient id="xg" x1="0" y1="0" x2="1" y2="1">'
 '<stop offset="0" stop-color="#7991ba"/><stop offset=".55" stop-color="#cfdcef"/>'
 '<stop offset="1" stop-color="#6a85ad"/></linearGradient>')
wordmark_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 110" width="420" height="110">
<defs><style>{FONT_IMPORT}</style>{ACCENT_GRAD}</defs>
<text x="8" y="80" font-family="'Chakra Petch',sans-serif" font-weight="700" font-size="88" letter-spacing="1" fill="#e8edf5">Tacti<tspan fill="url(#xg)">x</tspan></text>
</svg>'''
open(f"{OUT}/svg/tactix-wordmark.svg","w").write(wordmark_svg)

lockup_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 120" width="540" height="120">
<defs><style>{FONT_IMPORT}</style>{DEFS_STEEL}{DEFS_TILE}{ACCENT_GRAD}</defs>
<g transform="translate(6,10)">
  <rect x="2" y="2" width="96" height="96" rx="23.5" fill="url(#tile)"/>
  <path d="{STARP}" fill="url(#steel)"/>
  <circle cx="50" cy="50" r="8.4" fill="none" stroke="#b8c8e2" stroke-width="2" opacity=".82"/>
  <circle cx="50" cy="50" r="4" fill="#10131b"/>
</g>
<text x="130" y="84" font-family="'Chakra Petch',sans-serif" font-weight="700" font-size="76" letter-spacing="1" fill="#e8edf5">Tacti<tspan fill="url(#xg)">x</tspan></text>
</svg>'''
open(f"{OUT}/svg/tactix-lockup.svg","w").write(lockup_svg)

print("rasters + svgs done")
