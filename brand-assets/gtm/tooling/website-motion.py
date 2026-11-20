"""Render deterministic ASCII flyby frames and accessible vector motion."""
from build import ROOT, BASE, THEMES, COPY, rect, svg, text, mark
from website_visual import craft,dither,streaks,mono,chapters
import math
out=ROOT/'.local/gtm-flyby';out.mkdir(parents=True,exist_ok=True)
for theme,(bg,c,m,q) in THEMES.items():
 base=rect(0,0,1280,720,bg)+dither(1280,720,c,.38)+streaks(950,465,800,500,c)
 base+=mark(54,42,44,c)+text('Hexagon',112,75,25,c,600)+mono('[ ASCII EXECUTION FLEET ]',895,72,12,m)
 base+=text(COPY['headline_lines'][0],64,177,66,c,600)+text(COPY['headline_lines'][1],64,248,66,c,600)
 base+=mono('SELF-MANAGED / HEADLESS AGENT API',64,303,14,m)
 end=chapters(64,620,1152,c,bg,q,0)+mono('ILLUSTRATIVE MOTION / NOT LIVE EXECUTION',64,690,11,m)
 folder=out/theme;folder.mkdir(exist_ok=True)
 for frame in range(48):
  t=frame/48*math.pi*2
  units=craft(925+math.sin(t)*65,420+math.cos(t)*22,5.8+math.sin(t)*.4,c,bg,-15+math.sin(t)*5)
  units+=craft(680+math.sin(t+1)*22,470+math.cos(t+1)*12,2.1,c,bg,-25,.4)
  units+=craft(1120+math.sin(t+2)*25,385+math.cos(t+2)*15,2.4,c,bg,12,.65)
  (folder/f'{frame:04}.svg').write_text(svg(1280,720,base+units+end,'ASCII fleet flyby / illustrative motion'))
 css='<style>@keyframes flight{0%,100%{transform:translate(0,20px)}50%{transform:translate(55px,-18px)}}.flight{animation:flight 4s ease-in-out infinite}.wing{animation-delay:-1s}@media(prefers-reduced-motion:reduce){.flight{animation:none}}</style>'
 units=f'<g class="flight">{craft(925,420,5.8,c,bg,-15)}</g><g class="flight wing">{craft(680,470,2.1,c,bg,-25,.4)}{craft(1120,385,2.4,c,bg,12,.65)}</g>'
 (BASE/f'motion/flyby-{theme}.svg').write_text(svg(1280,720,css+base+units+end,'ASCII fleet flyby / illustrative motion'))
print('Generated 96 ASCII flyby frames and two animated SVGs')
