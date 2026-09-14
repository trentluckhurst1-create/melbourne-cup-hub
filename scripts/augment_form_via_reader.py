from __future__ import annotations
import json,re,time,unicodedata
from datetime import datetime,date
from pathlib import Path
from urllib.parse import quote_plus
import requests

ROOT=Path(__file__).resolve().parents[1]
FORM=ROOT/'data'/'form'; NOMS=ROOT/'data'/'nominations'/'2026-09-01.json'
CANON=FORM/'2026-09-15-form-canonical.json'; LEDGER=FORM/'2026-09-15-form-coverage-ledger.json'
ASOF=date(2026,9,15); TARGET=8
S=requests.Session();S.headers['User-Agent']='Mozilla/5.0'
COUNTRY_SUFFIXES=['aus','nz','ire','gb','fr','usa','jpn']

def clean(s):return re.sub(r'\s+',' ',str(s or '')).strip()
def slug(n):
 s=unicodedata.normalize('NFKD',n).encode('ascii','ignore').decode().lower().replace("'",'')
 return re.sub(r'[^a-z0-9]+','-',s).strip('-')
def parse_date(s):
 for fmt in ('%d%b%y','%d %b %Y','%Y-%m-%d'):
  try:return datetime.strptime(clean(s),fmt).date()
  except:pass
 return None
def actual(r):
 x=(clean(r.get('race'))+' '+clean(r.get('classGroup'))).lower()
 return all(k not in x for k in ('trial','jump out','jump-out','jumpout'))
def key(r):return f"{r.get('date','')}|{clean(r.get('race'))}|{clean(r.get('track'))}"
def merge(dst,runs):
 by={key(r):r for r in dst.get('runs',[]) if actual(r)}
 for r in runs:
  if not actual(r):continue
  d=parse_date(r.get('date'))
  if d and d>ASOF:continue
  by[key(r)]={**by.get(key(r),{}),**r}
 dst['runs']=sorted(by.values(),key=lambda r:r.get('date',''),reverse=True)[:TARGET]
 return dst

def reader(url):
 for p in ('https://r.jina.ai/http://','https://r.jina.ai/https://'):
  base=url.replace('https://','').replace('http://','')
  try:
   r=S.get(p+base,timeout=35)
   if r.ok and len(r.text)>200:return r.text
  except:pass
 return None

def strip_md(s):
 s=re.sub(r'!\[[^\]]*\]\([^)]*\)','',s)
 s=re.sub(r'\[([^\]]+)\]\([^)]*\)',r'\1',s)
 s=s.replace('**','').replace('__','').replace('`','')
 return clean(s.lstrip('#-* >'))
def cls(race):
 x=race.lower()
 for n in (1,2,3):
  if f'group {n}' in x or re.search(rf'\bgr\.?\s*{n}\b',x):return f'Group {n}'
 if 'listed' in x or re.search(r'\blr\b',x):return 'Listed'
 m=re.search(r'\bbm\s*([0-9]{2,3})',x)
 if m:return 'BM'+m.group(1)
 if 'handicap' in x or ' hcp' in x:return 'Handicap'
 if 'maiden' in x or ' mdn' in x:return 'Maiden'
 return None

def breednet(name,country):
 urls=[f'https://www.breednet.com.au/horse/{slug(name)}']+[f'https://www.breednet.com.au/horse/{slug(name)}-%28{x}%29' for x in COUNTRY_SUFFIXES]
 best=[];career=None;used=None
 for u in urls:
  txt=reader(u)
  if not txt or 'Race Record' not in txt:continue
  if name.lower().replace('’',"'") not in txt[:2500].lower().replace('’',"'"):continue
  m=re.search(r'Career:\s*(\d+)\s*starts',txt,re.I)
  if m:career=int(m.group(1))
  lines=[strip_md(x) for x in txt.splitlines() if strip_md(x)]
  try:i=next(i for i,x in enumerate(lines) if x.lower()=='race record')
  except:continue
  lines=lines[i+1:];runs=[]
  for j,line in enumerate(lines):
   d=parse_date(line)
   if not d or d>ASOF:continue
   # Search forward because age labels/images can be interspersed.
   finish=track=race=detail=None
   for x in lines[j+1:j+5]:
    if re.fullmatch(r'\d+(st|nd|rd|th)',x,re.I):finish=x;break
   if not finish:continue
   fi=lines.index(finish,j+1,min(len(lines),j+6))
   for x in lines[fi+1:fi+5]:
    if not re.search(r'\d{3,4}m\b',x) and not re.match(r'^(Good|Soft|Heavy|Dead|Slow|Synthetic)',x,re.I):track=x;break
   if not track:continue
   ti=lines.index(track,fi+1,min(len(lines),fi+6))
   for x in lines[ti+1:ti+6]:
    if re.search(r'\d{3,4}m\b',x):race=x;break
   if not race:continue
   ri=lines.index(race,ti+1,min(len(lines),ti+7))
   detail=' '.join(lines[ri+1:ri+3])
   md=re.search(r'(\d{3,4})m\b',race);dist=int(md.group(1)) if md else None
   race_name=re.sub(r'\s+\d{3,4}m.*$','',race).strip()
   gm=re.search(r'\b(Good\(?\d*\)?|Soft\(?\d*\)?|Heavy\(?\d*\)?|Dead\(?\d*\)?|Slow\(?\d*\)?|Synthetic)\b',detail,re.I)
   wm=re.search(r'\((\d+(?:\.\d+)?)\)',detail)
   mm=re.search(r'\(([0-9.]+)L\)',detail)
   runs.append({'date':d.isoformat(),'race':race_name,'track':track,'country':country,'distanceM':dist,'going':gm.group(1) if gm else None,'classGroup':cls(race),'finish':finish,'fieldSize':None,'weightCarried':wm.group(1)+'kg' if wm else None,'margin':float(mm.group(1)) if mm else None,'source':'Breednet public race record','sourceUrl':u})
  # de-dupe by date/track/race
  uniq={key(r):r for r in runs}
  runs=sorted(uniq.values(),key=lambda r:r['date'],reverse=True)
  if len(runs)>len(best):best=runs;used=u
  if len(best)>=TARGET:break
 return best[:TARGET],career,used

def sporting_url(name):
 q=quote_plus(f'site:sportinglife.com/racing/profiles/horse/ "{name}"')
 for engine in [f'https://www.google.com/search?q={q}',f'https://www.bing.com/search?q={q}']:
  txt=reader(engine)
  if not txt:continue
  urls=re.findall(r'https://www\.sportinglife\.com/racing/profiles/horse/\d+',txt)
  if urls:return urls[0]
 return None

def dist_m(s):
 miles=float(re.search(r'(\d+(?:\.\d+)?)m\b',s).group(1)) if re.search(r'(\d+(?:\.\d+)?)m\b',s) else 0
 furl=float(re.search(r'(\d+(?:\.\d+)?)f\b',s).group(1)) if re.search(r'(\d+(?:\.\d+)?)f\b',s) else 0
 yards=float(re.search(r'(\d+)y\b',s).group(1)) if re.search(r'(\d+)y\b',s) else 0
 return round(miles*1609.344+furl*201.168+yards*.9144) if (miles or furl or yards) else None
COURSE={'ASC':'Ascot','CUR':'Curragh','EPS':'Epsom','LEO':'Leopardstown','NAV':'Navan','GWO':'Goodwood','YOR':'York','DON':'Doncaster','NMK':'Newmarket','CHS':'Chester','SAN':'Sandown','CAT':'Catterick','SAL':'Salisbury','FON':'Fontwell','KEM':'Kempton','NAA':'Naas','GOW':'Gowran Park','PAR':'ParisLongchamp','KEN':'Kentucky Downs'}
def sporting(name):
 u=sporting_url(name)
 if not u:return [],None,None
 txt=reader(u)
 if not txt:return [],None,u
 career=None;m=re.search(r'\b(\d+)\s+runs\b',txt,re.I)
 if m:career=int(m.group(1))
 lines=[strip_md(x) for x in txt.splitlines() if strip_md(x)]
 runs=[]
 # Markdown tables usually preserve a row beginning with date.
 for line in lines:
  if not re.search(r'\d{2}[A-Z][a-z]{2}\d{2}',line):continue
  dm=re.search(r'(\d{2}[A-Z][a-z]{2}\d{2})',line);d=parse_date(dm.group(1))
  if not d or d>ASOF:continue
  tail=line[dm.end():]
  fm=re.search(r'^\D*(\d{1,2})(?:/\d{1,2})?',tail)
  if not fm:continue
  pos=fm.group(1); fsize=None
  fsm=re.search(r'\b'+re.escape(pos)+r'/(\d{1,2})',tail)
  if fsm:fsize=int(fsm.group(1))
  cm=re.search(r'\b([A-Z]{3})\s*(\d+m(?:\s*\d+f)?(?:\s*\d+y)?|\d+f(?:\s*\d+y)?)',line)
  if not cm:continue
  track=COURSE.get(cm.group(1),cm.group(1));distance=dist_m(cm.group(2))
  gm=re.search(r'\b(Good(?: to (?:Firm|Soft))?|Soft|Heavy|Yielding(?: to Soft)?|Standard(?: to Slow)?)\b',line,re.I)
  finish={'1':'1st','2':'2nd','3':'3rd'}.get(pos,pos+'th')
  runs.append({'date':d.isoformat(),'race':'Sporting Life form run','track':track,'country':None,'distanceM':distance,'going':gm.group(1) if gm else None,'classGroup':None,'finish':finish,'fieldSize':fsize,'weightCarried':None,'source':'Sporting Life public race record','sourceUrl':u})
 uniq={key(r):r for r in runs};return sorted(uniq.values(),key=lambda r:r['date'],reverse=True)[:TARGET],career,u

def main():
 noms=json.loads(NOMS.read_text(encoding='utf-8')); can=json.loads(CANON.read_text(encoding='utf-8'));data=can['horses']
 for i,h in enumerate(noms['horses'],1):
  name=h['horse'];rec=data[name];before=len(rec.get('runs',[]))
  if before>=TARGET or rec.get('careerComplete'):continue
  br,career,u=breednet(name,h.get('country'))
  if br:merge(rec,br)
  # Only trust Breednet career count as full career for AUS/NZ originals. Imported profiles can be local-only.
  if h.get('country') in ('AUS','NZ') and career is not None and career<=TARGET and len(rec.get('runs',[]))>=career:rec['careerComplete']=True
  if len(rec.get('runs',[]))<TARGET and not rec.get('careerComplete'):
   sr,sc,u2=sporting(name)
   if sr:merge(rec,sr)
   if sc is not None and sc<=TARGET and len(rec.get('runs',[]))>=sc:rec['careerComplete']=True
  print(f'{i:03d} {name}: {before}->{len(rec.get("runs",[]))}'+(' CAREER' if rec.get('careerComplete') else ''),flush=True)
 can['snapshotDate']=ASOF.isoformat();CANON.write_text(json.dumps(can,ensure_ascii=False,indent=2),encoding='utf-8')
 rows=[]
 for h in noms['horses']:
  r=data[h['horse']];n=len(r.get('runs',[]));state='COMPLETE' if n>=TARGET else ('CAREER_COMPLETE' if r.get('careerComplete') else 'UNRESOLVED')
  rows.append({'nominationNumber':h['nominationNumber'],'horse':h['horse'],'runs':n,'state':state})
 out={'total':101,'complete':sum(x['state']=='COMPLETE' for x in rows),'careerComplete':sum(x['state']=='CAREER_COMPLETE' for x in rows),'unresolved':sum(x['state']=='UNRESOLVED' for x in rows),'rows':rows}
 LEDGER.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({k:out[k] for k in ('total','complete','careerComplete','unresolved')}))
if __name__=='__main__':main()
