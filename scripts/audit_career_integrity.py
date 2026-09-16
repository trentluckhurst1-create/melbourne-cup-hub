#!/usr/bin/env python3
import json,re
from pathlib import Path
from datetime import date
ROOT=Path(__file__).resolve().parents[1]
NOMS=ROOT/'data/nominations/2026-09-01.json'
PUBLIC=ROOT/'data/profiles/2026-09-17-public-full-career.json'
VERIFIED=ROOT/'data/profiles/2026-09-17-career-stats.json'
OUT=ROOT/'data/profiles/2026-09-17-career-integrity-audit.json'
TODAY=date(2026,9,17)

def norm(s): return re.sub(r'[^a-z0-9]','',str(s or '').lower())
def pos(v):
 m=re.match(r'\s*(\d+)',str(v or ''))
 return int(m.group(1)) if m else None

def main():
 noms=json.loads(NOMS.read_text(encoding='utf-8'))
 names=[h['horse'] for h in noms['horses']]
 public=json.loads(PUBLIC.read_text(encoding='utf-8')).get('horses',{})
 verified=json.loads(VERIFIED.read_text(encoding='utf-8')).get('horses',{})
 rows=[]; critical=0; warning=0
 for name in names:
  p=public.get(name,{}) or {}; v=verified.get(name,{}) or {}; runs=p.get('runs',[]) or []
  issues=[]; seen={}
  for i,r in enumerate(runs):
   d=r.get('date'); track=norm(r.get('track'))
   if d:
    try:
     dd=date.fromisoformat(d)
     if dd>TODAY: issues.append({'severity':'CRITICAL','code':'FUTURE_RUN','run':i,'date':d})
    except: issues.append({'severity':'CRITICAL','code':'MALFORMED_DATE','run':i,'date':d})
   key=(d,track)
   if d and track:
    if key in seen: issues.append({'severity':'CRITICAL','code':'DUPLICATE_DATE_TRACK','run':i,'otherRun':seen[key],'date':d,'track':r.get('track')})
    else: seen[key]=i
   dm=r.get('distanceM')
   if dm is not None and (not isinstance(dm,(int,float)) or dm<800 or dm>5000): issues.append({'severity':'WARNING','code':'IMPLAUSIBLE_DISTANCE','run':i,'distanceM':dm})
   f=pos(r.get('finish'))
   if f is not None and f<1: issues.append({'severity':'CRITICAL','code':'INVALID_FINISH','run':i,'finish':r.get('finish')})
  calc={'starts':len(runs),'wins':sum(pos(r.get('finish'))==1 for r in runs),'seconds':sum(pos(r.get('finish'))==2 for r in runs),'thirds':sum(pos(r.get('finish'))==3 for r in runs)}
  pubcareer=p.get('career') or {}
  for k in ('starts','wins','seconds','thirds'):
   if k in pubcareer and pubcareer[k]!=calc[k]: issues.append({'severity':'CRITICAL','code':'PUBLIC_SUMMARY_MISMATCH','field':k,'stored':pubcareer[k],'calculated':calc[k]})
  vc=v.get('career') or {}
  if vc and runs and isinstance(vc.get('starts'),int) and vc['starts']!=len(runs):
   issues.append({'severity':'WARNING','code':'VERIFIED_VS_PUBLIC_STARTS','verified':vc['starts'],'publicRuns':len(runs),'note':'May be a stale public snapshot; verified layer must take precedence.'})
  # Known same-name / contamination risk requires manual identity confirmation before promotion.
  if name in {'Aethelwulf','Golden Century','Portland','Pounding','Saint George','Sapphire Siren','Wolfgang','Valiant King'}:
   issues.append({'severity':'WARNING','code':'IDENTITY_REVIEW_REQUIRED'})
  if not runs and not v: issues.append({'severity':'CRITICAL','code':'NO_CAREER_EVIDENCE'})
  sev='PASS'
  if any(x['severity']=='CRITICAL' for x in issues): sev='CRITICAL';critical+=1
  elif issues: sev='WARNING';warning+=1
  rows.append({'horse':name,'status':sev,'publicRuns':len(runs),'verifiedOverride':bool(v),'issues':issues})
 out={'snapshotDate':'2026-09-17','universe':len(names),'policy':'Recent-form/PFR windows are never career evidence. Verified/official career records override public baseline. Warnings require review before promotion; critical records must not be shown as verified career data.','summary':{'pass':len(names)-critical-warning,'warning':warning,'critical':critical},'rows':rows}
 OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(out['summary']))
if __name__=='__main__': main()
