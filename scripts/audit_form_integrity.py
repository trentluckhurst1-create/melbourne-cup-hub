#!/usr/bin/env python3
import json,re,unicodedata
from pathlib import Path
from datetime import date
ROOT=Path(__file__).resolve().parents[1]
NOMS=ROOT/'data/nominations/2026-09-01.json'
FORM=ROOT/'data/form/2026-09-15-unique-full-form.json'
OUT=ROOT/'data/form/2026-09-17-form-integrity-audit.json'
TODAY=date(2026,9,17)

def norm(v):
 s=unicodedata.normalize('NFKD',str(v or '')).replace('’',"'").replace('‘',"'")
 return re.sub(r'[^a-z0-9]','',s.lower())
def pos(v):
 m=re.match(r'\s*(\d+)',str(v or ''))
 return int(m.group(1)) if m else None
def actual(r):
 text=f"{r.get('classGroup','')} {r.get('race','')}".lower(); f=str(r.get('finish','')).strip().lower()
 return not any(x in text for x in ('trial','jump-out','jumpout')) and f not in {'scr','scratched','wd','withdrawn','nr','non-runner','dns','did not start'}
def generic_race_name(v):
 s=norm(v)
 if not s:return True
 if re.fullmatch(r'r\d+',s):return True
 if s in {'publicracerecord','racerecord','formrecord','race'}:return True
 # Handicap/benchmark labels recur legitimately at the same venue.
 if re.fullmatch(r'(ive)?bm\d+',s) or re.fullmatch(r'benchmark\d+',s):return True
 return False
def main():
 noms=json.loads(NOMS.read_text(encoding='utf-8'))
 data=json.loads(FORM.read_text(encoding='utf-8'))
 names=[h['horse'] for h in noms['horses']]; horses=data.get('horses',{})
 ni={norm(n):n for n in names}; fi={norm(n):n for n in horses}
 global_issues=[]
 if len(names)!=101 or len(ni)!=101: global_issues.append({'severity':'CRITICAL','code':'NOMINATION_UNIVERSE_NOT_101','count':len(names)})
 missing=[n for k,n in ni.items() if k not in fi]; extra=[n for k,n in fi.items() if k not in ni]
 if missing: global_issues.append({'severity':'CRITICAL','code':'MISSING_NOMINEES','horses':missing})
 if extra: global_issues.append({'severity':'CRITICAL','code':'NON_NOMINEE_RECORDS','horses':extra})
 rows=[]; warning=0
 for nk,name in ni.items():
  rec=horses.get(fi.get(nk,''),{}) or {}; runs=rec.get('runs',[]) or []; issues=[]; seen_date={}; seen_race={}
  for i,r in enumerate(runs):
   if not actual(r): issues.append({'severity':'CRITICAL','code':'NON_ACTUAL_RUN_IN_CANONICAL','run':i})
   ds=str(r.get('date') or '')[:10]
   try:
    dd=date.fromisoformat(ds)
    if dd>TODAY: issues.append({'severity':'CRITICAL','code':'FUTURE_RUN','run':i,'date':ds})
   except Exception: issues.append({'severity':'CRITICAL','code':'MALFORMED_DATE','run':i,'date':ds})
   if ds:
    if ds in seen_date: issues.append({'severity':'CRITICAL','code':'DUPLICATE_START_DATE','run':i,'otherRun':seen_date[ds],'date':ds})
    else: seen_date[ds]=i
   race=r.get('race'); rk=(norm(race),norm(r.get('track')))
   # Only named races are useful duplicate-identity evidence. R8, BM84 and
   # "Public race record" are generic labels and can legitimately recur.
   if rk[0] and rk[1] and not generic_race_name(race):
    if rk in seen_race and seen_race[rk]!=ds: issues.append({'severity':'WARNING','code':'REPEATED_NAMED_RACE_TRACK_IDENTITY','run':i,'otherDate':seen_race[rk],'date':ds,'race':race,'track':r.get('track')})
    else: seen_race[rk]=ds
   dm=r.get('distanceM')
   if dm is not None and (not isinstance(dm,(int,float)) or dm<800 or dm>5000): issues.append({'severity':'WARNING','code':'IMPLAUSIBLE_DISTANCE','run':i,'distanceM':dm})
   f=pos(r.get('finish')); fs=r.get('fieldSize')
   if f is not None and f<1: issues.append({'severity':'CRITICAL','code':'INVALID_FINISH','run':i,'finish':r.get('finish')})
   if f is not None and isinstance(fs,(int,float)) and fs>0 and f>fs: issues.append({'severity':'CRITICAL','code':'FINISH_EXCEEDS_FIELD','run':i,'finish':f,'fieldSize':fs})
  if len(runs)>int(data.get('targetRunsPerHorse',8)): issues.append({'severity':'CRITICAL','code':'WINDOW_EXCEEDS_TARGET','runs':len(runs)})
  career=rec.get('careerComplete') is True
  if len(runs)<8 and not career: issues.append({'severity':'WARNING','code':'SHORT_WINDOW_NOT_CERTIFIED_CAREER','runs':len(runs)})
  sev='PASS'
  if any(x['severity']=='CRITICAL' for x in issues): sev='CRITICAL'
  elif any(x['severity']=='WARNING' for x in issues): sev='WARNING';warning+=1
  rows.append({'horse':name,'status':sev,'runs':len(runs),'careerComplete':career,'issues':issues})
 out={'snapshotDate':'2026-09-17','universe':len(names),'canonicalFile':str(FORM.relative_to(ROOT)).replace('\\','/'),'policy':'Canonical recent form is an eight-run-or-complete-career window only. It is never a full-career statistics source. One actual start per horse/date; no trials, jump-outs, non-starters, future runs, impossible finish/field relationships, or non-nominee identities. Repeated-race warnings apply only to named races, not generic race numbers, benchmark labels or placeholder source labels.','summary':{'pass':sum(r['status']=='PASS' for r in rows),'warning':warning,'criticalHorses':sum(r['status']=='CRITICAL' for r in rows),'globalCritical':any(x['severity']=='CRITICAL' for x in global_issues)},'globalIssues':global_issues,'rows':rows}
 OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(out['summary']))
if __name__=='__main__': main()
