"""Website-derived six-chapter editorial sequence and reusable transparent layers."""
from pathlib import Path
from website_visual import mono, display, dither, craft, chapters, ticks, fleet_scene

CHAPTERS=[
 ('Fleet','An agent fleet. On your terms.','Your application chooses compatible infrastructure and owns the experience.'),
 ('Request','Start inside your product.','Your backend creates the Session and submits the work.'),
 ('Dispatch','One API. Separate workspaces.','The control plane manages resources and dispatches execution.'),
 ('Harness','Your runtime. Your Harness.','The Sandbox Runtime supervises the selected Harness process.'),
 ('Tools','Access stays intentional.','Configured connections scope model and tool access.'),
 ('Return','Bring the result home.','Deliver answers, committed events and exported artifacts to your product.')]

def flow(step,c,bg,m,q):
 b=''
 def line(d,stroke=q,dash='3 7'):
  return f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="1.5" stroke-dasharray="{dash}"/>'
 def box(x,y,w,h,active=False):
  return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{bg}" stroke="{c if active else q}"/>'
 b+=line('M270 410H418',c if step==1 else q)+line('M590 410H680M680 295V525M680 295H758M680 410H758M680 525H758')
 b+=box(64,320,206,183,step in [1,5])+mono('[ / ] YOUR PRODUCT',82,348,12,m)
 b+=display('Result delivered.' if step==5 else 'Review a release.',82,390,21,c)
 for i,t in enumerate(['ANSWER / EVENTS','EXPORTED ARTIFACTS'] if step==5 else ['YOUR BACKEND','SUBMIT A RUN']):b+=mono(t,82,433+i*29,12,c)
 b+=line('M418 350H590M418 470H590',c,'')+display('HEXAGON',430,402,28,c)+mono('SESSION / RUN',435,431,13,m)
 if step>=2:
  for i in range(3):
   y=255+i*115;b+=box(758,y,230,94,step==3)+mono(f'SANDBOX / {i+1:02}',775,y+23,12,m)
   b+=craft(791,y+59,.92,c,bg,0)
   b+=mono('HARNESS' if step>=3 else 'RUNTIME',833,y+62,13,c)
   if step>=4:
    b+=line(f'M988 {y+47}H1075',c if step==4 else q)+box(1075,y+18,141,58)
    b+=mono(['MODEL','MCP','APP / API'][i],1090,y+52,13,c)
 else:
  b+=craft(870,410,3.5,c,bg,-14,.45)+mono('AWAITING DISPATCH',765,552,13,m)
 if step==1:b+=f'<rect x="340" y="406" width="8" height="8" fill="{c}"/>'
 if step==4:b+=mono('ORIGINAL CREDENTIALS STAY IN THE CONTROL PLANE',64,571,12,m)
 if step==5:b+=line('M758 558H504V522H167',c)+mono('RESULT / RETURN PATH',335,582,12,c)
 return b

def build_website_collection(save,themes):
 for theme,(bg,c,m,q) in themes.items():
  for i,(chapter,title,sub) in enumerate(CHAPTERS):
   b=f'<rect width="1280" height="720" fill="{bg}"/>'
   if i==0:b+=fleet_scene(1280,720,c,bg)
   else:b+=dither(1280,720,c,.055)+flow(i,c,bg,m,q)
   b+=ticks(1280,720,q)+mono(f'[ {i:02} / {chapter.upper()} ]',64,75,14,m)+mono('HEXAGON / FIELD GUIDE',980,75,13,m)
   b+=display(title,64,166,54,c)+mono(sub,64,206,14,m)
   b+=chapters(64,620,1152,c,bg,q,i)+mono('ILLUSTRATIVE FLOW / NO LIVE EXECUTION',64,690,11,m)
   save(Path(f'website/sequence-{i:02}-{theme}.svg'),1280,720,b,title,'website-story',theme,sequence=i,topics=['website',chapter.lower()],visual_source='WEBSITE-REUSE.md')
  save(Path(f'components/ascii-unit-{theme}.svg'),720,420,craft(360,210,7,c,'none',0),'ASCII execution unit','website-component',theme,export=None,transparent=True,topics=['website','fleet'],visual_source='WEBSITE-REUSE.md')
  save(Path(f'components/dither-horizon-{theme}.svg'),1280,720,dither(1280,720,c,.38),'Ordered-dither horizon','website-component',theme,export=None,transparent=True,topics=['website','texture'],visual_source='WEBSITE-REUSE.md')
