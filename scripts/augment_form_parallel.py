from __future__ import annotations
import json,re,unicodedata
from datetime import datetime,date
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from urllib.parse import quote_plus
import requests

ROOT=Path(__file__).resolve().parents[1]
FORM=ROOT/'data'/'form'; CANON=FORM/'2026-09-15-form-canonical.json'; LEDGER=FORM/'2026-09-15-form-coverage-ledger.json'; NOMS=ROOT/'data'/'nominations'/'2026-09-01.json'
TARGET=8; ASOF=date(2026,9,15)

def clean(s):return re.sub(r'\s+',' ',str(s or '')).strip()
def norm(s):
 return unicodedata.normalize('NFKD',str(s or '')).encode('ascii','ignore').decode().replace('’',"'").strip()
def slug(n):
 s=norm(n).lower().replace("'",'')
 return re.sub(r'[^a-z0-9]+','-',s).strip('-')
def pdate(s):
 for f in ('%d%b%y','%d %b %Y','%Y-%m-%d'):
  try:return datetime.strptime(clean(s),f).date()
  except:pass
 return None
def key(r):return f"{r.get('date','')}|{clean(r.get('race'))}|{clean(r.get('track'))}"
def actual(r):return not any(k in (clean(r.get('race'))+' '+clean(r.get('classGroup'))).lower() for k in ('trial','jump out','jump-out','jumpout'))
def stripmd(x):
 x=re.sub(r'!\[[^]]*\]\([^)]*\)','',x);x=re.sub(r'\[([^]]+)\]\([^)]*\)',r'\1',x);return clean(x.lstrip('#>*- ').replace('**','').replace('__',''))
def reader(url):
 base=url.replace('https://','').replace('http://','')
 try:
  r=requests.get('https://r.jina.ai/https://'+base,headers={'User-Agent':'Mozilla/5.0'},timeout=22)
  return r.text if r.ok and len(r.text)>300 else None
 except:return None
def cls(s):
 x=s.lower()
 for n in (1,2,3):
  if f'gr{n}' in x or f'group {n}' in x:return f'Group {n}'
 if re.search(r'\blr\b|listed',x):return 'Listed'
 m=re.search(r'\bbm\s*([0-9]{2,3})',x)
 if m:return 'BM'+m.group(1)
 m=re.search(r'\(c([1-6])\)',x,re.I)
 if m:return 'Class '+m.group(1)
 if 'maiden' in x or ' mdn' in x:return 'Maiden'
 if 'handicap' in x or ' hcp' in x:return 'Handicap'
 return None

def candidate_urls(name,country):
 qname=quote_plus(name); qcountry=quote_plus(country or '')
 urls=[f'https://www.breednet.com.au/horse/{slug(name)}',f'https://www.breednet.com.au/horses/profile?horse={qname}&horsecountry={qcountry}']
 # Breednet legacy import slugs sometimes append the breeding country.
 if country: urls.append(f'https://www.breednet.com.au/horse/{slug(name)}-%28{country.lower()}%29')
 return urls

def identity(txt,name,country):
 # Reader output can emit either Markdown headings or plain title text. Match exact horse name + breeding country + YOB anywhere near the profile header.
 flat=norm(txt)
 n=re.escape(norm(name)).replace(r'\ ',r'\s+')
 m=re.search(r'(?i)(?:^|\n|\b)\s*#*\s*'+n+r'\s*\(([A-Z]{2,3})\)\s*(20\d{2}|19\d{2})',flat)
 if not m:return None
 pc=m.group(1).upper()
 if country and pc!=str(country).upper().strip():return ('MISMATCH',pc,m.group(2))
 return ('OK',pc,m.group(2))

def parse_page(txt,url,name,country):
 ident=identity(txt,name,country)
 if not ident:return None,'IDENTITY_HEADER_MISSING'
 if ident[0]!='OK':return None,f'COUNTRY_MISMATCH:{ident[1]}'
 pagecountry=ident[1]
 cm=re.search(r'Career:\s*(\d+)\s*starts',txt,re.I);career=int(cm.group(1)) if cm else None
 lines=[stripmd(x) for x in txt.splitlines() if stripmd(x)]
 try:i=next(i for i,x in enumerate(lines) if x.lower()=='race record')
 except:return ({'runs':[],'career':career,'url':url},'NO_RACE_RECORD')
 lines=lines[i+1:];runs=[];j=0
 while j<len(lines):
  d=pdate(lines[j])
  if not d or d>ASOF:j+=1;continue
  finish=track=race=None;fi=None
  for k in range(j+1,min(j+8,len(lines))):
   if re.fullmatch(r'\d+(st|nd|rd|th)',lines[k],re.I):finish=lines[k];fi=k;break
  if fi is None:j+=1;continue
  ti=None
  for k in range(fi+1,min(fi+7,len(lines))):
   v=lines[k]
   if not v or re.fullmatch(r'\d+yo?',v,re.I):continue
   if not re.match(r'^(Good|Soft|Heavy|Dead|Slow|Synthetic|Firm)',v,re.I) and not re.search(r'\d{3,4}m\b',v):track=v;ti=k;break
  if ti is None:j+=1;continue
  ri=None
  for k in range(ti+1,min(ti+8,len(lines))):
   if re.search(r'\d{3,4}m\b',lines[k]):race=lines[k];ri=k;break
  if ri is None:j+=1;continue
  detail=' '.join(lines[ri+1:min(ri+5,len(lines))])
  if any(k in race.lower() for k in ('barrier trial','jump out','jump-out','jumpout')):j=ri+1;continue
  md=re.search(r'(\d{3,4})m\b',race);dist=int(md.group(1)) if md else None
  race_name=re.sub(r'\s+(?:Gr[123]|LR)?\s*\d{3,4}m.*$','',race).strip()
  gm=re.search(r'\b(Good\(?\d*\)?|Soft\(?\d*\)?|Heavy\(?\d*\)?|Dead\(?\d*\)?|Slow\(?\d*\)?|Firm|Synthetic)\b',detail,re.I)
  wm=re.search(r'\((\d+(?:\.\d+)?)\)',detail);mm=re.search(r'\(([0-9.]+)L\)',detail)
  runs.append({'date':d.isoformat(),'race':race_name,'track':track,'country':pagecountry,'distanceM':dist,'going':gm.group(1) if gm else None,'classGroup':cls(race),'finish':finish,'fieldSize':None,'weightCarried':wm.group(1)+'kg' if wm else None,'margin':float(mm.group(1)) if mm else None,'source':'Breednet public race record','sourceUrl':url})
  j=ri+1
 uniq={key(r):r for r in runs};runs=sorted(uniq.values(),key=lambda r:r['date'],reverse=True)
 return ({'runs':runs[:TARGET],'career':career,'url':url},'OK')

def parse(name,country):
 statuses=[]
 for url in candidate_urls(name,country):
  txt=reader(url)
  if not txt:statuses.append('NO_PAGE');continue
  parsed,status=parse_page(txt,url,name,country);statuses.append(status)
  if parsed and parsed['runs']:
   return name,parsed['runs'],parsed['career'],url,'OK'
 # Prefer reporting identity mismatches over generic no-page failures.
 status=next((s for s in statuses if s.startswith('COUNTRY_MISMATCH')),statuses[-1] if statuses else 'NO_PAGE')
 return name,[],None,None,status

def main():
 noms=json.loads(NOMS.read_text());can=json.loads(CANON.read_text());data=can['horses']
 targets=[h for h in noms['horses'] if len(data[h['horse']].get('runs',[]))<TARGET and not data[h['horse']].get('careerComplete')]
 results={}
 with ThreadPoolExecutor(max_workers=18) as ex:
  futs={ex.submit(parse,h['horse'],h.get('country')):h for h in targets}
  for f in as_completed(futs):
   name,runs,career,url,status=f.result();results[name]=(runs,career,url,status);print(name,status,len(runs),career,url or '',flush=True)
 for h in targets:
  name=h['horse'];runs,career,url,status=results[name]
  if status!='OK' or not runs:continue
  # Exact horse + country profile is authoritative. Short careers replace contaminated legacy rows rather than being padded to 8.
  if career is not None and career<=TARGET and len(runs)>=career:
   data[name]['runs']=runs[:career];data[name]['careerComplete']=True;data[name]['formIdentityVerified']=True
  else:
   by={key(r):r for r in data[name].get('runs',[]) if actual(r)}
   for r in runs:by[key(r)]=r
   data[name]['runs']=sorted(by.values(),key=lambda r:r.get('date',''),reverse=True)[:TARGET];data[name]['formIdentityVerified']=True
 can['snapshotDate']=ASOF.isoformat();CANON.write_text(json.dumps(can,ensure_ascii=False,indent=2))
 rows=[]
 for h in noms['horses']:
  rec=data[h['horse']];n=len(rec.get('runs',[]));state='COMPLETE' if n>=TARGET else ('CAREER_COMPLETE' if rec.get('careerComplete') else 'UNRESOLVED');rows.append({'nominationNumber':h['nominationNumber'],'horse':h['horse'],'runs':n,'state':state})
 out={'total':101,'complete':sum(x['state']=='COMPLETE' for x in rows),'careerComplete':sum(x['state']=='CAREER_COMPLETE' for x in rows),'unresolved':sum(x['state']=='UNRESOLVED' for x in rows),'rows':rows,'parallelStatus':{n:r[3] for n,r in results.items()}}
 LEDGER.write_text(json.dumps(out,ensure_ascii=False,indent=2));print(json.dumps({k:out[k] for k in ('complete','careerComplete','unresolved')}))
if __name__=='__main__':main()
