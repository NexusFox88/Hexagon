"""Portable SVG translations of the website's ASCII and ordered-dither artwork.
Source: Haxegon-Website hero.js / style.css / journey.css, snapshot in WEBSITE-REUSE.md.
"""
from pathlib import Path
from functools import lru_cache
from html import escape
import math
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
BASE=Path(__file__).resolve().parents[1]
DISPLAY=TTFont(BASE/'fonts/funnel-display-400.ttf')
MONO=TTFont(BASE/'fonts/ibm-plex-mono-400.ttf')

def outlined(s,x,y,size,c,font):
 g=font.getGlyphSet();pen=SVGPathPen(g);scale=size/font['head'].unitsPerEm;cursor=0
 for ch in s:
  name=font.getBestCmap()[ord(ch)];g[name].draw(TransformPen(pen,(scale,0,0,-scale,x+cursor,y)));cursor+=font['hmtx'][name][0]*scale
 return f'<g aria-label="{escape(s,quote=True)}"><path fill="{c}" d="{pen.getCommands()}"/></g>'

def measure(s,size,font):return sum(font['hmtx'][font.getBestCmap()[ord(ch)]][0] for ch in s)*size/font['head'].unitsPerEm

def mono(s,x,y,size,c):return outlined(s,x,y,size,c,MONO)
def display(s,x,y,size,c):return outlined(s,x,y,size,c,DISPLAY)

@lru_cache(maxsize=16)
def dither(w,h,c,opacity=.4):
 # The website's Bayer matrix, sloping horizon and copy-protection field.
 bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];pixel=5;d=[]
 for y in range(0,h,pixel):
  for x in range(0,w,pixel):
   nx=x/w;ny=y/h;horizon=.98-.35*nx+.07*math.sin(nx*5)
   band=math.exp(-((ny-horizon)/.19)**2);halo=math.exp(-((nx-.93)**2/.2+(ny-.48)**2/.24))
   shade=1-.98*math.exp(-((nx-.22)**2/.18+(ny-.34)**2/.16))
   intensity=min(.86,(band*.65+halo*.12)*shade)
   if intensity>(bayer[((y//pixel)%4)*4+(x//pixel)%4]+.5)/16:d.append(f'M{x} {y}h2v2h-2Z')
 return f'<path d="{"".join(d)}" fill="{c}" opacity="{opacity}"/>'

@lru_cache(maxsize=8)
def craft_geometry(c):
 # Preserve hero.js character choices and geometry, not a stock spacecraft image.
 d=''
 for y in range(-22,23):
  line=''
  for x in range(-43,44):
   ax=abs(x);ay=abs(y);wing=ax>=24 and ax<=39-ay*.24
   edge=wing and (ax<25.4 or ax>37.5-ay*.24 or ay>=20);ring=math.hypot(x*.9,y);ch=' '
   if wing:ch='#' if edge else '+' if (x+y)%4==0 else ':' if (x-y)%3==0 else '.'
   if ax>=8 and ax<24 and ay<3:ch='=' if ay==2 else '-'
   if ring<10:ch='#' if ring>8 else '+' if ring>6 else '=' if ay<2 or ax<2 else '.'
   if ax<4 and ay<4:ch='+' if ax==3 or ay==3 else ' '
   line+=ch
  d+=mono(line,-26.1,y*1.1,1,c)
 return d

def craft(x,y,size,c,bg,tilt=-14,opacity=1):
 silhouette=f'<path fill="{bg}" d="M-23-24H-13V-4H13V-24H23V24H13V4H-13V24H-23Z"/><ellipse fill="{bg}" rx="8" ry="12"/>'
 return f'<g transform="translate({x} {y}) rotate({tilt}) scale({size})" opacity="{opacity}">{silhouette}{craft_geometry(c)}</g>'

def streaks(cx,cy,w,h,c):
 b=''
 for i in range(42):
  a=i*2.39996;depth=(i%17)/17;r=depth*depth*max(w,h)*.65
  x=cx+math.cos(a)*r;y=cy+math.sin(a)*r*.65;n=4+depth*27
  b+=f'<path d="M{x:.1f} {y:.1f}l{math.cos(a)*n:.1f} {math.sin(a)*n*.65:.1f}" stroke="{c}" stroke-dasharray="2 5" opacity="{.06+depth*.18}"/>'
 return b

def ticks(w,h,c):
 return ''.join(f'<path d="M{x-5} {y}h10M{x} {y-5}v10" stroke="{c}"/>' for x,y in [(40,106),(w-40,106),(40,h-94),(w-40,h-94)])

def chapters(x,y,w,c,bg,q,active=0):
 out='';names=['Fleet','Request','Dispatch','Harness','Tools','Return'];cw=w/6
 for i,name in enumerate(names):
  xx=x+i*cw;selected=i==active
  out+=f'<rect x="{xx}" y="{y}" width="{cw}" height="38" fill="{c if selected else bg}" stroke="{q}"/>'
  out+=mono(f'{i:02}  {name}',xx+12,y+24,11,bg if selected else c)
 return out

def fleet_scene(w,h,c,bg):
 # Aspect-specific composition protects copy and provides real depth variation.
 wide=w/h>1.6
 cx=w*.77 if wide else w*.58;cy=h*.59 if wide else h*.63
 unit=min(w*.0058,(h-300)*.012) if wide else min(w*.009,h*.007)
 out=dither(w,h,c,.38)+streaks(cx,cy,w,h,c)
 out+=craft(cx-w*.19,cy-h*.04,unit*.35,c,bg,-23,.45)
 out+=craft(cx+w*.12,cy-h*.19,unit*.45,c,bg,13,.65)
 out+=craft(cx,cy,unit,c,bg,-16)
 return out
