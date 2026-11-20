"""Build portable outlined SVG campaign artwork and an indexed local gallery."""
from pathlib import Path
from html import escape
import json, math, base64, argparse
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
ROOT=Path(__file__).resolve().parents[3]
BASE=ROOT/'brand-assets/gtm'
COPY=json.loads((ROOT/'brand-assets/brand-copy.json').read_text())
FONTS={w:instantiateVariableFont(TTFont(ROOT/'apps/console/fonts/geist.woff2'),{'wght':w}) for w in [400,500,600]}
MARK='M16 36 44 19.834V108.166L16 92ZM84 19.834 112 36V92L84 108.166ZM52 54H76V74H52Z'
THEMES={'dark':('#090909','#FAFAFA','#AAAAAA','#343434'),'light':('#FAFAFA','#171717','#626262','#DEDEDE')}
FORMATS={'wide':(1280,640),'video':(1280,720),'square':(1080,1080),'portrait':(1080,1350),'story':(1080,1920)}
from website_visual import DISPLAY, display, mono, measure, dither, craft, fleet_scene, ticks, chapters
INDEX=[]
def text(s,x,y,size,c,w=400):
 if size>=34:return display(s,x,y,size,c)
 f=FONTS[w];g=f.getGlyphSet();pen=SVGPathPen(g);scale=size/1000;cursor=0
 for ch in s:
  name=f.getBestCmap()[ord(ch)];g[name].draw(TransformPen(pen,(scale,0,0,-scale,x+cursor,y)));cursor+=f['hmtx'][name][0]*scale
 return f'<g aria-label="{escape(s,quote=True)}"><path fill="{c}" d="{pen.getCommands()}"/></g>'
def width(s,size,w=600):
 if w==600:return measure(s,size,DISPLAY)
 f=FONTS[w];return sum(f['hmtx'][f.getBestCmap()[ord(ch)]][0] for ch in s)*size/1000

def lines(s,limit=26):
 out=[];line=''
 for word in s.split():
  if len(line)+len(word)+1>limit and line:out.append(line);line=word
  else:line=(line+' '+word).strip()
 if line:out.append(line)
 return out

def mark(x,y,n,c,opacity=1):return f'<path transform="translate({x} {y}) scale({n/128})" fill="{c}" opacity="{opacity}" d="{MARK}"/>'
def path(d,c,stroke=1,opacity=1,dash=''):return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{stroke}" opacity="{opacity}"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>'
def rect(x,y,w,h,c,stroke=None):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}"'+(f' stroke="{stroke}"' if stroke else '')+'/>'
def label(s,x,y,c):return mono(s,x,y,12,c)
def node(x,y,s,c,muted):return rect(x,y,124,52,'none',muted)+label(s,x+12,y+31,c)
def art(kind,c,m,quiet):
 b=''
 # Geometry uses a shared 720 x 420 canvas; labels stay editable in source.
 if kind=='fleet':
  b+=craft(360,190,6,c,'none',-12)+craft(105,90,2,c,'none',-22,.4)+craft(620,300,2.5,c,'none',16,.55)
  b+=path('M30 400H690',m)+label('INDEPENDENT UNITS / SHARED CONTROL',32,416,m)
 elif kind=='formation-grid':
  for row in range(4):
   for col in range(6):
    x=40+col*108;y=15+row*96
    b+=mark(x,y,72,c,1 if col+row<5 else .2)
  b+=path('M30 400H690',m)+label('INDEPENDENT UNITS / SHARED CONTROL',32,416,m)
 elif kind=='stack':
  for i,name in enumerate(['SANDBOX','HARNESS','LLM']):
   y=36+i*108
   b+=path(f'M80 {y+40}L270 {y-12}L580 {y-12}L390 {y+40}Z',c,2)
   b+=path(f'M80 {y+40}v34h310l190-52v-34M390 {y+40}v34',m)
   b+=label(name,104,y+64,c)+label(f'0{i+1}',600,y+18,m)
  b+=path('M670 20V370M660 20h20M660 370h20',m)
 elif kind=='control':
  b+=rect(30,130,205,150,'none',c)+mark(72,146,116,c)+label('CONTROL PLANE',54,307,m)
  for i in range(3):
   y=20+i*142;b+=path(f'M235 205H330V{y+48}H435',m,2)+rect(435,y,250,96,'none',m)
   b+=mark(452,y+12,70,c)+label('RUNTIME / HARNESS',535,y+53,c)
  b+=label('LIFECYCLE + ACCESS',267,404,m)
 elif kind=='isolation':
  for i in range(3):
   x=28+i*228;b+=rect(x,66,202,270,'none',c)+rect(x+12,78,178,246,'none',quiet)
   b+=mark(x+43,110,116,c)+label(f'SANDBOX 0{i+1}',x+30,290,m)
  b+=path('M18 370H702',m,1,1,'3 8')+label('SEPARATE EXECUTION BOUNDARIES',30,404,m)
 elif kind=='continuity':
  b+=path('M50 150H670',c,3)
  for i in range(4):
   x=32+i*176;b+=rect(x,128,42,42,c)+label(f'TURN 0{i+1}',x,214,m)
  b+=path('M52 263v50h620v-50',m)+mark(286,268,120,c)+label('ONE SESSION IDENTITY',230,405,c)
 elif kind=='wake':
  b+=mark(42,112,142,c)+rect(292,151,48,12,m)+rect(352,151,48,12,m)+mark(529,112,142,c)
  b+=path('M180 181H280M406 181H526',m,2,1,'5 9')
  b+=label('EXECUTE',71,309,c)+label('PAUSE',313,309,m)+label('WAKE',567,309,c)
  b+=path('M80 360H640',m)+label('PRESERVATION DEPENDS ON THE STACK',134,399,m)
 elif kind=='tools':
  b+=mark(20,142,130,c)+rect(240,80,210,245,'none',c)+label('SCOPED ACCESS',273,131,c)
  for i,name in enumerate(['AUTHORIZE','APPROVE','DISPATCH']):b+=label(name,278,191+i*40,m)
  b+=path('M150 207H240',c,2)
  for i,name in enumerate(['MCP','APPS','HTTP']):
   y=35+i*138;b+=path(f'M450 207H506V{y+26}H554',m)+node(554,y,name,c,m)
 elif kind=='delivery':
  b+=node(20,177,'REQUEST',c,m)+path('M144 203H250',m,2)+mark(250,125,166,c)+path('M416 203H510',m,2)
  for i,name in enumerate(['ANSWER','EVENTS','ARTIFACTS']):
   y=35+i*138;b+=path(f'M510 203V{y+26}H554',m)+node(554,y,name,c,m)
  b+=label('DURABLE RECORDS / EXPORTED OUTPUT',80,402,m)
 return b

def svg(w,h,b,title):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img"><title>{escape(title)}</title>{b}</svg>\n'
def save(file,w,h,b,title,kind,theme,**meta):
 p=BASE/file;p.parent.mkdir(parents=True,exist_ok=True)
 content=svg(w,h,b,title)
 if not p.exists() or p.read_text()!=content:p.write_text(content)
 INDEX.append({'id':str(file).removesuffix('.svg').replace('/','.'),'file':str(file),'export':str(file).replace('.svg','.png'),'kind':kind,'theme':theme,'width':w,'height':h,'language':'en','alt':title,'source':'tooling/build.py','claim_type':'illustration',**meta})

def furniture(w,h,theme,kicker):
 bg,c,m,q=THEMES[theme];b=rect(0,0,w,h,bg)
 b+=ticks(w,h,q)+mark(54,42,44,c)+text('Hexagon',112,75,25,c,600)+label('[ '+kicker.upper()+' ]',w-350,72,m)
 b+=path(f'M64 {h-94}H{w-64}',q)
 b+=label('AGENT FLEET CONTROL PLANE',64,h-52,m)+label('OPEN SOURCE / APACHE 2.0',w-281,h-52,m)
 return b

def composition(title,sub,concept,theme,fmt,kicker='FIELD NOTES',number=None):
 w,h=FORMATS[fmt];bg,c,m,q=THEMES[theme];b=furniture(w,h,theme,kicker)
 wide=w/h>1.6;left=64
 ts=title if isinstance(title,list) else lines(title,24 if wide else 29)
 size=54 if wide else 66
 avail=(w*.61-100) if wide else w-128
 size=min(size,min(avail/width(t,1) for t in ts))
 y=180 if wide else 195
 for t in ts:b+=text(t,left,y,size,c,600);y+=size*1.14
 for t in lines(sub,48 if wide else 66):b+=text(t,left,y+26,19 if wide else 23,m);y+=28
 if wide:
  ax=w*.60;ay=150;aw=w*.37;ah=h-280
 else:
  ax=70;ay=max(y+75,h*.39);aw=w-140;ah=h-130-ay
 sc=min(aw/720,ah/420)
 b+=f'<g transform="translate({ax+(aw-720*sc)/2} {ay}) scale({sc})">{art(concept,c,m,q)}</g>'
 if number:b+=text(number,w-180,120,70,q,600)
 return b
CONCEPTS=[
 ('fleet','Fleet in formation.','Independent agents. Coordinated execution.','execution-architecture.md'),
 ('stack','Bring your stack.','Sandbox. Harness. LLM. Independently configurable.','execution-architecture.md'),
 ('control','One control plane.','Coordinate lifecycle, access and execution records.','execution-architecture.md'),
 ('isolation','Boundaries by design.','Separate cloud workspaces for agent execution.','security-boundaries.md'),
 ('continuity','Keep the thread.','Inspect identity and pinned Session initialization.','initialization.md'),
 ('wake','Work. Rest. Resume.','Pause and wake follow provider-specific strategies.','serverless-lifecycle.md'),
 ('tools','Access with intent.','Bind tools to Sessions. Authorize operations.','security-boundaries.md'),
 ('delivery','Deliver more than text.','Return answers, events and exported artifacts.','persistence.md')]

def build_concepts():
 for i,(key,title,sub,doc) in enumerate(CONCEPTS):
  for theme,(_,c,m,q) in THEMES.items():
   save(Path(f'concepts/{key}/art-{theme}.svg'),720,420,art(key,c,m,q),title,'concept-component',theme,export=None,transparent=True,topics=[key],evidence=f'../../docs/product/en/concepts/{doc}')
   for fmt in ['wide','square','portrait']:
    w,h=FORMATS[fmt];save(Path(f'concepts/{key}/{fmt}-{theme}.svg'),w,h,composition(title,sub,key,theme,fmt,'CONCEPT / '+f'{i+1:02}'),title+' '+sub,'concept-card',theme,topics=[key],evidence=f'../../docs/product/en/concepts/{doc}')

DEFAULTS={
 'launch':{'headline':COPY['headline_lines'],'description':'Self-managed Agent fleet control plane.','concept':'fleet','kicker':'INTRODUCING HEXAGON'},
 'feature':{'headline':['Bring your stack.','Keep your control.'],'description':'Choose your Sandbox, Harness and model endpoint.','concept':'stack','kicker':'INSIDE HEXAGON'},
 'code':{'headline':['An API for','agent execution.'],'description':'Create a Session. Submit a Run. Observe the result.','concept':'delivery','kicker':'DEVELOPER WORKFLOW'},
 'explainer':{'headline':['Control here.','Execute there.'],'description':'The control plane owns lifecycle. The Sandbox runs the Harness.','concept':'control','kicker':'ARCHITECTURE NOTES'},
 'carousel':{'headline':['From request','to result.'],'description':'A five-part tour of headless agent infrastructure.','concept':'delivery','kicker':'FIELD GUIDE / 01'},
 'release':{'headline':['Inside the','developer preview.'],'description':'Session initialization, tool access and execution observability.','concept':'continuity','kicker':'PRODUCT NOTES'}
}
def template(name,data,theme,fmt):
 w,h=FORMATS[fmt];bg,c,m,q=THEMES[theme];wide=w/h>1.6
 if name=='feature':return composition(data['headline'],data['description'],data['concept'],theme,fmt,data['kicker'])
 b=furniture(w,h,theme,data['kicker'])
 if name=='launch':
  b=rect(0,0,w,h,bg)+fleet_scene(w,h,c,bg)+furniture(w,h,theme,data['kicker']).split('/>',1)[1]
  y=176 if wide else 190
  size=min(72 if wide else 80,min((w-128)/width(t,1) for t in data['headline']))
  for t in data['headline']:b+=text(t,64,y,size,c,600);y+=size*1.08
  b+=mono('SELF-MANAGED / HEADLESS AGENT API',64,y+27,14,m)
  b+=chapters(64,h-150,w-128,c,bg,q,0)
  return b
 if wide and name in ['code','release','explainer','carousel']:
  y=205
  for t in data['headline']:
   size=min(54,530/width(t,1));b+=text(t,64,y,size,c,600);y+=66
  for t in lines(data['description'],37):b+=text(t,64,y+36,20,m);y+=29
  if name=='code':
   b+=rect(650,140,566,355,'none',q)+label('TYPESCRIPT / API EXCERPT',674,179,m)
   code=['const client = await Hexagon.local();','const run = await client.submit(','  session.id,','  "Inspect the project",','  crypto.randomUUID(),',');','const result = await client.run(run.id);']
   for i,t in enumerate(code):b+=mono(t,674,223+i*32,20,c)
  elif name=='release':
   for i,(title,desc) in enumerate([('Define','Pinned Session initialization'),('Authorize','Tool bindings and recorded calls'),('Observe','Events and exported output')]):
    yy=150+i*111;b+=path(f'M650 {yy}H1216',q)+text(f'0{i+1}',650,yy+58,40,m)+text(title,740,yy+39,28,c,600)+text(desc,740,yy+77,18,m)
  else:b+=f'<g transform="translate(650 155) scale(.78)">{art(data['concept'],c,m,q)}</g>'
  return b
 title=data['headline'];size=min(76 if wide else 78,min((w-128)/width(t,1) for t in title))
 y=180
 for t in title:b+=text(t,64,y,size,c,600);y+=size*1.08
 if name=='code':
  ax=64;ay=y+40;aw=w-128;ah=min(400,h-ay-140)
  b+=rect(ax,ay,aw,ah,'none',q)+label('TYPESCRIPT / API EXCERPT',ax+24,ay+38,m)
  code=['const client = await Hexagon.local();','const run = await client.submit(','  session.id,','  "Inspect the project",','  crypto.randomUUID(),',');','const result = await client.run(run.id);']
  size2=min(28,(aw-60)/max(width(t,1,400) for t in code),(ah-90)/len(code)*.75)
  for i,t in enumerate(code):b+=mono(t,ax+24,ay+78+i*size2*1.3,size2,c)
  remaining=h-150-(ay+ah)
  if remaining>280:
   sc=min((w-160)/720,(remaining-64)/420);xx=(w-720*sc)/2;yy=ay+ah+50
   b+=f'<g transform="translate({xx} {yy}) scale({sc})">{art("delivery",c,m,q)}</g>'
 elif name=='release':
  top=y+45;rh=(h-150-top)/3
  for i,(t,desc) in enumerate([('Define','Inspect pinned Session initialization.'),('Authorize','Bind tools and inspect recorded calls.'),('Observe','Follow execution and retrieve exported output.')]):
   yy=top+i*rh;b+=path(f'M64 {yy}H{w-64}',q)+text(f'0{i+1}',64,yy+rh*.65,min(62,rh*.6),m,500)+text(t,190,yy+rh*.48,min(36,rh*.3),c,600)
   b+=text(desc,190,yy+rh*.78,min(22,rh*.2),m)
 else:
  top=y+55;aw=w-128;ah=h-top-145;sc=min(aw/720,ah/420)
  b+=f'<g transform="translate({(w-720*sc)/2} {top}) scale({sc})">{art(data['concept'],c,m,q)}</g>'
  if name=='carousel':b+=text('01 / 05',w-230,h-135,32,m,500)
 return b

def build_templates():
 config=BASE/'templates/content.json'
 if not config.exists():config.write_text(json.dumps(DEFAULTS,indent=2)+'\n')
 data=json.loads(config.read_text())
 if data['launch']['headline']!=COPY['headline_lines']:raise ValueError('Launch headline must match brand-copy.json')
 for name,d in data.items():
  if name not in DEFAULTS:raise ValueError('Unknown template: '+name)
  if not isinstance(d['headline'],list) or not 1<=len(d['headline'])<=3:raise ValueError('Use 1-3 headline lines')
  if any(len(t)>38 for t in d['headline']):raise ValueError('Headline line exceeds 38 characters')
  if len(d['description'])>100 or len(d['kicker'])>28:raise ValueError('Copy exceeds template budget')
  if d['concept'] not in {v[0] for v in CONCEPTS}:raise ValueError('Unknown concept')
  for theme in THEMES:
   for fmt,(w,h) in FORMATS.items():
    save(Path(f'exports/{name}-{fmt}-{theme}.svg'),w,h,template(name,d,theme,fmt),' '.join(d['headline']),'campaign-template',theme,template=name,topics=[d['concept']],content_source='templates/content.json')
 for i,(title,sub,concept) in enumerate([
  ('Start with your stack.','Connect a compatible Sandbox and model endpoint.','stack'),
  ('Pin the definition.','Choose identity, context, Harness and tool bindings.','continuity'),
  ('Submit the work.','Your application sends tasks through Python, TypeScript or REST.','control'),
  ('Observe execution.','Inspect recorded events and authorized tool activity.','tools'),
  ('Keep the result.','Retrieve the answer and exported artifacts. Confirm cleanup.','delivery')]):
  for theme in THEMES:
   save(Path(f'exports/carousel-{i+1:02}-{theme}.svg'),1080,1350,composition(title,sub,concept,theme,'portrait',f'FIELD GUIDE / {i+1:02} OF 05'),title,'carousel-slide',theme,sequence=i+1,topics=[concept])

def build_product():
 stories=json.loads((BASE/'product/provenance.json').read_text())['stories']
 for item in stories:
  cap=(BASE/'product'/item['capture']).resolve()
  raw=cap.read_bytes();import struct
  iw,ih=struct.unpack('>II',raw[16:24]);encoded=base64.b64encode(raw).decode()
  for variant in ['full','detail']:
   bg,c,m,q=THEMES['dark'];b=furniture(1600,1000,'dark','PRODUCT / ACTUAL CONSOLE')
   b+=text(item['title'],64,157,54,c,600)
   b+=text(item['caption'],64,204,min(23,1472/width(item['caption'],1,400)),m)
   if variant=='full':
    b+=f'<image x="64" y="250" width="1472" height="600" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,{encoded}"/>'
   else:
    # Declared editorial crop: remove navigation and outer margins only.
    crop=[int(iw*.18),int(ih*.08),int(iw*.72),int(ih*.84)]
    b+=f'<svg x="64" y="250" width="1472" height="600" viewBox="{crop[0]} {crop[1]} {crop[2]} {crop[3]}" preserveAspectRatio="xMidYMid meet"><defs><clipPath id="capture-crop"><rect x="{crop[0]}" y="{crop[1]}" width="{crop[2]}" height="{crop[3]}"/></clipPath></defs><image clip-path="url(#capture-crop)" width="{iw}" height="{ih}" href="data:image/png;base64,{encoded}"/></svg>'
   b+=label('CAPTURED 2026-11-20 / RETAINED TEST DATA',64,881,m)
   save(Path(f'product/stories/{item["id"]}-{variant}.svg'),1600,1000,b,item['title'],'product-story','dark',claim_type='real-product-framing',capture=str(cap.relative_to(BASE.parent)),provenance='product/provenance.json',limits=item['limits'],crop='none' if variant=='full' else crop,topics=[item['id']])

if __name__=='__main__':
 build_concepts();build_templates();build_product()
 from website_collection import build_website_collection
 build_website_collection(save,THEMES)
 (BASE/'index.generated.json').write_text(json.dumps({'version':1,'assets':INDEX},indent=2)+'\n')
 print(f'Built {len(INDEX)} outlined SVG assets')
