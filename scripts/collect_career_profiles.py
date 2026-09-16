#!/usr/bin/env python3
import json,re
from pathlib import Path
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor,as_completed
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
NOMS=ROOT/'data/nominations/2026-09-01.json'
OUT=ROOT/'data/profiles/2026-09-17-public-full-career.json'
AUDIT=ROOT/'data/profiles/2026-09-17-public-full-career-audit.json'
BASE='https://racehub.com.au/horses/'
UA='Mozilla/5.0 (compatible; MelbourneCupHub/1.0; public-career-research)'

def slugify(name):
 s=name.lower().replace('’',"'");s=re.sub(r"['.]",'',s);return re.sub(r'[^a-z0-9]+','-',s).strip('-')
def txt(e):return re.sub(r'\s+',' ',e.get_text(' ',strip=True)).strip() if e else ''
def iso(s):
 from datetime import datetime
 s=re.sub(r'(?<=\d)(st|nd|rd|th)\b','',s.strip(),flags=re.I)
 for f in ('%d %b %Y','%d %B %Y'):
  try:return datetime.strptime(s,f).strftime('%Y-%m-%d')
  except:pass
 return None
def dist(s):
 m=re.search(r'(\d{3,4})\s*m',s or '',re.I);return int(m.group(1)) if m else None
def position(s):
 m=re.match(r'\s*(\d+)',s or '');return int(m.group(1)) if m else None
def going_band(s):
 s=(s or '').lower()
 if 'heavy' in s:return 'Heavy'
 if any(x in s for x in ('soft','slow','yield')):return 'Soft'
 if any(x in s for x in ('firm','fast')):return 'Fast'
 if any(x in s for x in ('synthetic','poly','all weather','awt')):return 'Synthetic'
 if 'good' in s:return 'Good'
 return 'Other'
def class_band(s):
 s=(s or '').upper()
 if re.search(r'GROUP\s*1|\bG1\b',s):return 'Group 1'
 if re.search(r'GROUP\s*2|\bG2\b',s):return 'Group 2'
 if re.search(r'GROUP\s*3|\bG3\b',s):return 'Group 3'
 if 'LISTED' in s or re.search(r'\bLR\b',s):return 'Listed'
 return 'Other'
def summarise(runs):
 def rec(xs):
  s=len(xs);w=sum(position(x.get('finish'))==1 for x in xs);sec=sum(position(x.get('finish'))==2 for x in xs);third=sum(position(x.get('finish'))==3 for x in xs)
  return {'starts':s,'wins':w,'seconds':sec,'thirds':third,'places':w+sec+third}
 out={'career':rec(runs),'going':{},'distance':{},'class':{}}
 for k in ('Fast','Good','Soft','Heavy','Synthetic','Other'):
  x=[r for r in runs if going_band(r.get('going'))==k]
  if x:out['going'][k]=rec(x)
 bands=[('<1600m',lambda d:d is not None and d<1600),('1600-1999m',lambda d:d is not None and 1600<=d<2000),('2000-2399m',lambda d:d is not None and 2000<=d<2400),('2400-2799m',lambda d:d is not None and 2400<=d<2800),('2800m+',lambda d:d is not None and d>=2800)]
 for k,f in bands:
  x=[r for r in runs if f(r.get('distanceM'))]
  if x:out['distance'][k]=rec(x)
 for k in ('Group 1','Group 2','Group 3','Listed','Other'):
  x=[r for r in runs if class_band(r.get('classGroup'))==k]
  if x:out['class'][k]=rec(x)
 return out
def parse(name):
 url=BASE+quote(slugify(name))
 try:r=requests.get(url,timeout=12,headers={'User-Agent':UA})
 except Exception as e:return name,{'status':'REQUEST_ERROR','sourceUrl':url,'runs':[],'error':type(e).__name__}
 if r.status_code!=200:return name,{'status':f'HTTP_{r.status_code}','sourceUrl':url,'runs':[]}
 soup=BeautifulSoup(r.text,'html.parser');table=None
 for t in soup.find_all('table'):
  hs=[txt(x).lower() for x in t.find_all('th')];j='|'.join(hs)
  if 'date' in j and 'track' in j and ('dist' in j or 'distance' in j) and 'finish' in j:table=t
 if table is None:return name,{'status':'FORM_TABLE_NOT_FOUND','sourceUrl':url,'runs':[]}
 hs=[txt(x) for x in table.find_all('th')];hm={re.sub(r'[^a-z0-9]','',h.lower()):i for i,h in enumerate(hs)}
 def ix(*keys):
  for key in keys:
   k=re.sub(r'[^a-z0-9]','',key.lower())
   for h,i in hm.items():
    if h==k or h.startswith(k):return i
  return None
 ids={k:ix(*v) for k,v in {'date':['date'],'track':['track'],'dist':['dist','distance'],'cond':['cond','going'],'class':['class'],'finish':['finish'],'margin':['margin'],'wgt':['wgt','weight']}.items()}
 runs=[];seen=set()
 for tr in table.find_all('tr'):
  cells=tr.find_all('td')
  if not cells:continue
  vals=[txt(c) for c in cells]
  def val(k):
   i=ids[k];return vals[i] if i is not None and i<len(vals) else ''
  date=iso(val('date'));finish=val('finish');row=' '.join(vals).lower()
  if not date or not finish or 'trial' in row or 'jump-out' in row or 'jumpout' in row:continue
  track=re.sub(r'\s+R\d+\b.*$','',val('track'),flags=re.I).strip();key=(date,track.lower())
  if key in seen:continue
  seen.add(key)
  runs.append({'date':date,'track':track or val('track'),'distanceM':dist(val('dist')),'going':val('cond') or None,'classGroup':val('class') or None,'finish':finish,'weightCarried':val('wgt') or None,'margin':val('margin') or None,'source':'RaceHub public form history','sourceUrl':url})
 runs.sort(key=lambda x:x['date'],reverse=True)
 return name,{'status':'OK' if runs else 'NO_ACTUAL_RUNS','source':'RaceHub public form history','sourceUrl':url,'runs':runs,**summarise(runs)}
def main():
 noms=json.loads(NOMS.read_text(encoding='utf-8'));names=[h['horse'] for h in noms['horses']];horses={}
 with ThreadPoolExecutor(max_workers=12) as ex:
  fs={ex.submit(parse,n):n for n in names}
  for i,f in enumerate(as_completed(fs),1):
   n,rec=f.result();horses[n]=rec;print(f'[{i:03d}/101] {n}: {rec["status"]} career_runs={len(rec["runs"])}',flush=True)
 ordered={n:horses[n] for n in names};ok=sum(x['status']=='OK' for x in ordered.values());zero=sum(not x['runs'] for x in ordered.values())
 OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps({'snapshotDate':'2026-09-17','type':'public-full-career-profile','policy':'Full-career profile evidence is separate from recent-form/PFR windows. Racing Australia/official evidence may override these public-form records when verified.','horses':ordered},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 AUDIT.write_text(json.dumps({'snapshotDate':'2026-09-17','universe':101,'profilesWithPublicCareerRuns':ok,'profilesWithoutRuns':zero,'rows':[{'horse':n,'status':r['status'],'careerRunsLoaded':len(r['runs']),'sourceUrl':r['sourceUrl']} for n,r in ordered.items()]},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(f'CAREER PROFILE SUMMARY ok={ok} no_runs={zero}')
if __name__=='__main__':main()
