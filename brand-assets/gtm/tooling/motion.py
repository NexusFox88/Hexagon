"""Generate deterministic formation-animation frames; no execution data is depicted."""
from pathlib import Path
import math
from build import ROOT,BASE,THEMES,mark,text,path,rect,svg,COPY
out=ROOT/'.local/gtm-motion';out.mkdir(parents=True,exist_ok=True)
for theme,(bg,c,m,q) in THEMES.items():
 folder=out/theme;folder.mkdir(exist_ok=True)
 for frame in range(48):
  t=frame/47;spread=math.sin(math.pi*t)**2
  b=rect(0,0,1280,720,bg)
  b+=text('Hexagon',64,82,28,c,600)+text('FLEET IN FORMATION',890,80,16,m,500)
  for row in range(3):
   for col in range(5):
    tx=310+col*145;ty=135+row*112
    xx=594+(tx-594)*spread;yy=220+(ty-220)*spread
    b+=mark(xx,yy,92,c,1 if (row,col)==(1,2) else spread*.7)
  b+=path('M64 550H1216',q)
  b+=text(COPY['headline_lines'][0],64,604,36,c,600)+text(COPY['headline_lines'][1],64,653,36,c,600)
  (folder/f'{frame:04}.svg').write_text(svg(1280,720,b,'Hexagon fleet formation / illustrative motion'))
 # A reduced-motion-safe SVG is useful as an inline motion component.
 body=rect(0,0,1280,720,bg)+text('Hexagon',64,82,28,c,600)
 body+='<style>@keyframes fleet{0%,100%{transform:translate(0,0);opacity:0}50%{transform:translate(var(--x),var(--y));opacity:.7}}.unit{animation:fleet 4s ease-in-out infinite}@media(prefers-reduced-motion:reduce){.unit{display:none}}</style>'
 for row in range(3):
  for col in range(5):
   if(row,col)!=(1,2):body+=f'<g class="unit" style="--x:{(col-2)*145}px;--y:{(row-1)*112}px">{mark(594,220,92,c)}</g>'
 body+=mark(594,220,92,c)+text(COPY['headline_lines'][0],64,604,36,c,600)+text(COPY['headline_lines'][1],64,653,36,c,600)
 (BASE/f'motion/formation-{theme}.svg').write_text(svg(1280,720,body,'Hexagon fleet formation / illustrative motion'))
print('Generated 96 motion frames and two animated SVGs')
