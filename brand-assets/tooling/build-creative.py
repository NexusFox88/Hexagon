"""Rebuild outlined creative SVGs using the repository's existing Geist font."""
from pathlib import Path
import json
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'brand-assets/creative'
HEADLINE=json.loads((ROOT/'brand-assets/brand-copy.json').read_text())['headline_lines']
HEADLINE_LABEL='Hexagon — '+' '.join(HEADLINE)
fonts={w:instantiateVariableFont(TTFont(ROOT/'apps/console/fonts/geist.woff2'),{'wght':w}) for w in (400,500,600)}
def text(s,x,y,size,c,w=400):
 f=fonts[w];g=f.getGlyphSet();pen=SVGPathPen(g);scale=size/1000;cursor=0
 for ch in s:
  name=f.getBestCmap()[ord(ch)];g[name].draw(TransformPen(pen,(scale,0,0,-scale,x+cursor,y)));cursor+=f['hmtx'][name][0]*scale
 return f'<path fill="{c}" d="{pen.getCommands()}"/>'
D='M16 36 44 19.834V108.166L16 92ZM84 19.834 112 36V92L84 108.166ZM52 54H76V74H52Z'
def mark(x,y,size,c):return f'<path transform="translate({x} {y}) scale({size/128})" fill="{c}" d="{D}"/>'
def line(d,c,op=1):return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="1" opacity="{op}"/>'
def sheet(name,w,h,body,label):
 (OUT/name).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{label}">{body}</svg>\n')
def fleet(x,y,c):
 b=''
 # A control boundary fans out into three independent execution lanes.
 for j in range(3):
  yy=y+j*130
  b+=line(f'M{x+92} {y+130}H{x+160}V{yy}H{x+360}',c,.3)
  for k in range(3):
   xx=x+210+k*58
   b+=f'<path fill="{c}" opacity="{1-k*.25}" d="M{xx} {yy-12}h32v24h-32Z"/>'
 b+=mark(x,y+66,128,c)
 return b
for mode,bg,c,muted in [('light','#FAFAFA','#111111','#65696F'),('dark','#111111','#F5F5F5','#A8ADB3')]:
 base=lambda w,h:f'<rect width="{w}" height="{h}" fill="{bg}"/>'
 b=base(1440,800)+mark(64,48,48,c)+text('Hexagon',126,82,28,c,600)
 b+=text('SELF-MANAGED AGENT INFRASTRUCTURE',80,235,14,muted,500)
 b+=text(HEADLINE[0],76,340,68,c,600)+text(HEADLINE[1],76,428,58,c,600)
 b+=text('A headless control plane for your Agent fleet.',80,503,22,muted)
 b+=text('Bring your Sandbox, Harness and LLM.',80,539,22,muted)
 b+=fleet(900,260,c)+line('M80 664H1360',c,.18)
 b+=text('ISOLATE',80,717,14,muted,500)+text('ROUTE',270,717,14,muted,500)+text('ORCHESTRATE',440,717,14,muted,500)
 b+=text('CONTROL PLANE / EXECUTION FLEET',1020,717,12,muted)
 sheet(f'hero-{mode}.svg',1440,800,b,HEADLINE_LABEL)
 b=base(1200,630)+mark(64,54,56,c)+text('Hexagon',134,95,32,c,600)
 b+=text(HEADLINE[0],64,258,68,c,600)+text(HEADLINE[1],64,346,58,c,600)
 b+=text('Self-managed Agent fleet control plane',68,412,25,muted)
 b+=mark(905,180,220,c)+line('M68 510H1132',c,.2)
 b+=text('BYO SANDBOX / HARNESS / LLM',68,558,17,muted,500)
 sheet(f'social-{mode}.svg',1200,630,b,'Hexagon — Self-managed Agent fleet control plane')
 # GitHub uses a 2:1 canvas; preserve the original artwork without stretching.
 github=base(1280,640)+f'<g transform="translate(40 5)">{b}</g>'
 sheet(f'github-social-{mode}.svg',1280,640,github,HEADLINE_LABEL)
 b=base(1280,320)+mark(54,69,170,c)+text('Hexagon',264,148,64,c,600)
 b+=text('Self-managed Agent fleet control plane',268,202,24,muted)
 for j in range(3):b+=line(f'M960 {106+j*48}H1200',c,.18)+f'<path fill="{c}" d="M{980+j*48} {98+j*48}h32v16h-32Z"/>'
 sheet(f'readme-banner-{mode}.svg',1280,320,b,'Hexagon — Bring your Sandbox, Harness and LLM')
 b=''
 for row in range(4):
  for col in range(4):
   x=col*128;y=row*128
   b+=f'<g opacity=".09">{mark(x+32,y+32,64,c)}</g>' if (row+col)%2==0 else line(f'M{x+32} {y+56}h64m-64 16h64',c,.09)
 sheet(f'pattern-{mode}.svg',512,512,b,'Hexagon modular pattern')
 b=base(1280,360)
 for i,label in enumerate(['01 / IDENTITY','02 / DISPATCH','03 / PARALLEL','04 / REASSEMBLE']):
  x=80+i*310;b+=text(label,x,58,13,muted,500)
  if i in (0,3):b+=mark(x+35,95,128,c)
  elif i==1:
   b+=f'<g transform="translate({x+35} 95)" fill="{c}"><path transform="rotate(40 30 64)" d="M16 36 44 19.834V108.166L16 92Z"/><path d="M40 54H88V74H40Z"/><path transform="rotate(40 98 64)" d="M84 19.834 112 36V92L84 108.166Z"/></g>'
  else:
   for j in range(3):b+=f'<path fill="{c}" d="M{x+52} {126+j*25}h90v9h-90Z"/>'
 b+=text('H becomes a parallel fleet, then returns to identity.',80,300,20,muted)
 sheet(f'motion-storyboard-{mode}.svg',1280,360,b,'Hexagon orchestration motion storyboard')
print('Created 12 creative SVGs with outlined typography')

# Build the contact sheet from current sources so previews cannot retain old copy.
rows=[('hero',1440,800),('social',1200,630),('github-social',1280,640),('readme-banner',1280,320),('motion-storyboard',1280,360)]
y=0; tiles=[]
for name,w,h in rows:
 scale=600/w
 for col,mode in enumerate(['light','dark']):
  source=(OUT/f'{name}-{mode}.svg').read_text()
  body=source[source.index('>')+1:source.rindex('</svg>')]
  tiles.append(f'<g transform="translate({col*600} {y}) scale({scale})">{body}</g>')
 y+=h*scale+4
preview=ROOT/'brand-assets/previews/creative-sheet.svg'
preview.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="{int(y)}" viewBox="0 0 1200 {int(y)}"><rect width="1200" height="{int(y)}" fill="#DDD"/>'+''.join(tiles)+'</svg>\n')
