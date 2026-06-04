#!/usr/bin/env python3
import os
from PIL import Image, ImageDraw, ImageFont

OUT="/home/claude/tactix-brand"
FD="/usr/share/fonts/truetype/google-fonts"
S=2  # supersample
def F(name,size): return ImageFont.truetype(f"{FD}/{name}", size*S)
bold=lambda s:F("Poppins-Bold.ttf",s); med=lambda s:F("Poppins-Medium.ttf",s)
reg=lambda s:F("Poppins-Regular.ttf",s); light=lambda s:F("Poppins-Light.ttf",s)

W,H=1400,1000
img=Image.new("RGB",(W*S,H*S),(11,13,19))
d=ImageDraw.Draw(img)

INK=(232,237,245); MUT=(140,148,165); ACC=(166,186,216); LINE=(40,46,60)

def text(x,y,s,fnt,fill=INK,ls=0):
    if ls==0: d.text((x*S,y*S),s,font=fnt,fill=fill)
    else:
        cx=x*S
        for ch in s:
            d.text((cx,y*S),ch,font=fnt,fill=fill); cx+=d.textlength(ch,font=fnt)+ls*S

# bg glow strip
for i in range(H*S):
    pass
# header
text(70,54,"TACTIX",bold(34),INK)
text(70,104,"Brand Mark — usage & specifications",reg(17),MUT)
text(W-300,64,"STEEL STAR",med(13),ACC,ls=4)
text(W-300,90,"v1.0  ·  Navy to Silver",reg(12),MUT,ls=1)
d.line([(70*S,150*S),(int((W-70)*S),150*S)],fill=LINE,width=2)

# ---- left: clear space panel ----
px,py,pw,ph=70,182,560,560
d.rounded_rectangle([px*S,py*S,(px+pw)*S,(py+ph)*S],radius=22*S,fill=(15,17,24),outline=LINE,width=2)
icon=Image.open(f"{OUT}/icons/tactix-icon-512.png").convert("RGBA")
iw=300; icon_r=icon.resize((iw*S,iw*S),Image.LANCZOS)
ix=px+(pw-iw)//2; iy=py+(ph-iw)//2+6
img.paste(icon_r,(ix*S,iy*S),icon_r)
# clear-space dashed box (clear = 0.25 * icon = "x")
clr=int(iw*0.25)
bx0,by0,bx1,by1=ix-clr,iy-clr,ix+iw+clr,iy+iw+clr
def dash_rect(x0,y0,x1,y1,col,dl=14,gap=9,wd=2):
    def seg(a,b,horiz,fix):
        p=a
        while p<b:
            q=min(p+dl,b)
            if horiz: d.line([(p*S,fix*S),(q*S,fix*S)],fill=col,width=wd*S)
            else: d.line([(fix*S,p*S),(fix*S,q*S)],fill=col,width=wd*S)
            p=q+gap
    seg(x0,x1,True,y0); seg(x0,x1,True,y1); seg(y0,y1,False,x0); seg(y0,y1,False,x1)
dash_rect(bx0,by0,bx1,by1,(95,118,150))
text(px+22,py+ph-52,"Clear space  =  ¼ of the icon width (x) on all sides",reg(14),MUT)

# ---- right column ----
rx=680
# clear space label
text(rx,182,"01 — CLEAR SPACE & MIN SIZE",med(14),ACC,ls=2)
text(rx,212,"Keep padding of at least one x-unit around the",reg(15),MUT)
text(rx,234,"mark. The reticle ring drops out below 48 px.",reg(15),MUT)
# min sizes
sizes=[48,32,24,16]; sx=rx; sy=286
for s in sizes:
    im=Image.open(f"{OUT}/favicon/favicon-{'48' if s==48 else ('32' if s in(32,24) else '16')}.png").convert("RGBA")
    im=im.resize((s*S,s*S),Image.LANCZOS)
    # tile baseline
    base=sy+48
    img.paste(im,(sx*S,(base-s)*S),im)
    text(sx,base+8,f"{s}px",reg(12),MUT)
    sx+=s+44
d.line([(rx*S,396*S),((W-70)*S,396*S)],fill=LINE,width=2)

# colors
text(rx,418,"02 — COLOR",med(14),ACC,ls=2)
pal=[("Navy","#1A2E4D",(26,46,77)),("Steel","#3A567C",(58,86,124)),
     ("Mid","#7991B5",(121,145,181)),("Silver-blue","#9BAFCE",(155,175,206)),
     ("Light","#C9D6EA",(201,214,234)),("Accent","#A6BAD8",(166,186,216))]
cx=rx; cy=452; sw=104
for i,(nm,hx,rgb) in enumerate(pal):
    col=i%3; row=i//3
    x=rx+col*(sw+14); y=cy+row*120
    d.rounded_rectangle([x*S,y*S,(x+sw)*S,(y+72)*S],radius=10*S,fill=rgb)
    text(x,y+80,nm,med(13),INK)
    text(x,y+100,hx,reg(11),MUT)
d.line([(rx*S,712*S),((W-70)*S,712*S)],fill=LINE,width=2)

# mono / reverse
text(rx,734,"03 — ONE-COLOR & REVERSE",med(14),ACC,ls=2)
# silver on dark
ml=Image.open(f"{OUT}/mark/tactix-mark-mono-light-1024.png").convert("RGBA").resize((96*S,96*S),Image.LANCZOS)
md=Image.open(f"{OUT}/mark/tactix-mark-mono-dark-1024.png").convert("RGBA").resize((96*S,96*S),Image.LANCZOS)
tx=rx; ty=772
d.rounded_rectangle([tx*S,ty*S,(tx+150)*S,(ty+150)*S],radius=16*S,fill=(11,13,19),outline=LINE,width=2)
img.paste(ml,((tx+27)*S,(ty+27)*S),ml); text(tx,ty+158,"Silver on dark",reg(12),MUT)
tx2=tx+180
d.rounded_rectangle([tx2*S,ty*S,(tx2+150)*S,(ty+150)*S],radius=16*S,fill=(233,238,246))
img.paste(md,((tx2+27)*S,(ty+27)*S),md); text(tx2,ty+158,"Navy on light",reg(12),MUT)
# flat gradient
tx3=tx2+180
flat=Image.open(f"{OUT}/mark/tactix-mark-flat-1024.png").convert("RGBA").resize((96*S,96*S),Image.LANCZOS)
d.rounded_rectangle([tx3*S,ty*S,(tx3+150)*S,(ty+150)*S],radius=16*S,fill=(15,17,24),outline=LINE,width=2)
img.paste(flat,((tx3+27)*S,(ty+27)*S),flat); text(tx3,ty+158,"Flat / no tile",reg(12),MUT)

# footer
d.line([(70*S,938*S),((W-70)*S,938*S)],fill=LINE,width=2)
text(70,952,"Tactix visual identity  ·  mark is fully vector & font-independent  ·  wordmark set in Chakra Petch 700",reg(12),MUT)

img=img.resize((W,H),Image.LANCZOS)
img.save(f"{OUT}/spec/tactix-spec.png")
print("spec done")
