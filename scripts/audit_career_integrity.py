#!/usr/bin/env python3
import json,re,unicodedata
from pathlib import Path
from datetime import date
ROOT=Path(__file__).resolve().parents[1]
NOMS=ROOT/'data/nominations/2026-09-01.json'
PUBLIC=ROOT/'data/profiles/2026-09-17-public-full-career.json'
VERIFIED=ROOT/'data/profiles/2026-09-17-career-stats.json'
CERTIFIED=ROOT/'data/profiles/2026-09-17-identity-certified-career-overrides.json'
OUT=ROOT/'data/profiles/2026-09-17-career-integrity-audit.json'
TODAY=date(2026,9,17)

def norm(s):
 s=unicodedata.normalize('NFKD',str(s or '')).replace('’',"'").replace('‘',"'")
 return re.sub(r'[^a-z0-9]','',s.lower())
def pos(v):
 m=re.match(r'\s*(\d+)',str(v or ''))
 return int(m.group(1)) if m else None
def index_by_norm(d,label):
 out={}
 for k,v in d.items():
  nk=norm(k)
  if nk in out and out[nk][0]!=k: raise ValueError(f'{label} normalized horse-name collision: {out[nk][0]!r} vs {k!r}')
  out[nk]=(k,v)
 return out

def main():
 noms=json.loads(NOMS.read_text(encoding='utf-8'))
 names=[h['horse'] for h in noms['horses']]
 if len(names)!=101 or len({norm(x) for x in names})!=101: raise ValueError('Nomination universe must contain exactly 101 unique normalized horse names')
 public=index_by_norm(json.loads(PUBLIC.read_text(encoding='utf-8')).get('horses',{}),'public')
 verified=index_by_norm(json.loads(VERIFIED.read_text(encoding='utf-8')).get('horses',{}),'verified')
 certified=index_by_norm(json.loads(CERTIFIED.read_text(encoding='utf-8')).get('horses',{}),'certified')
 rows=[]; critical=warning=provisional=0
 for name in names:
  nk=norm(name); p=(public.get(nk) or (None,{}))[1] or {}; v=(verified.get(nk) or (None,{}))[1] or {}; c=(certified.get(nk) or (None,{}))[1] or {}
  authoritative=c or v; runs=p.get('runs',[]) or []; issues=[]; seen={}
  for i,r in enumerate(runs):
   d=r.get('date'); track=norm(r.get('track'))
   if d:
    try:
     if date.fromisoformat(d)>TODAY: issues.append({'severity':'CRITICAL','code':'FUTURE_RUN','run':i,'date':d})
    except: issues.append({'severity':'CRITICAL','code':'MALFORMED_DATE','run':i,'date':d})
   key=(d,track)
   if d and track:
    if key in seen: issues.append({'severity':'CRITICAL','code':'DUPLICATE_DATE_TRACK','run':i,'otherRun':seen[key],'date':d,'track':r.get('track')})
    else: seen[key]=i
   dm=r.get('distanceM')
   if dm is not None and (not isinstance(dm,(int,float)) or dm<800 or dm>5000): issues.append({'severity':'WARNING','code':'IMPLAUSIBLE_DISTANCE','run':i,'distanceM':dm})
   f=pos(r.get('finish'))
   fs=r.get('fieldSize')
   if f is not None and f<1: issues.append({'severity':'CRITICAL','code':'INVALID_FINISH','run':i,'finish':r.get('finish')})
   if f is not None and isinstance(fs,int) and fs>0 and f>fs: issues.append({'severity':'CRITICAL','code':'FINISH_EXCEEDS_FIELD','run':i,'finish':f,'fieldSize':fs})
  calc={'starts':len(runs),'wins':sum(pos(r.get('finish'))==1 for r in runs),'seconds':sum(pos(r.get('finish'))==2 for r in runs),'thirds':sum(pos(r.get('finish'))==3 for r in runs)}
  pubcareer=p.get('career') or {}
  for k in ('starts','wins','seconds','thirds'):
   if k in pubcareer and pubcareer[k]!=calc[k]: issues.append({'severity':'CRITICAL','code':'PUBLIC_SUMMARY_MISMATCH','field':k,'stored':pubcareer[k],'calculated':calc[k]})
  ac=authoritative.get('career') or {}
  if ac and runs and isinstance(ac.get('starts'),int) and ac['starts']!=len(runs): issues.append({'severity':'INFO','code':'AUTHORITATIVE_OVERRIDES_PUBLIC_STARTS','authoritative':ac['starts'],'publicRuns':len(runs)})
  if c: issues.append({'severity':'INFO','code':'IDENTITY_CERTIFIED_OVERRIDE'})
  if v.get('verificationStatus','').startswith('PROVISIONAL'):
   issues.append({'severity':'WARNING','code':v['verificationStatus']}); provisional+=1
  if not runs and not authoritative: issues.append({'severity':'CRITICAL','code':'NO_CAREER_EVIDENCE'})
  sev='PASS'
  if any(x['severity']=='CRITICAL' for x in issues): sev='CRITICAL'; critical+=1
  elif any(x['severity']=='WARNING' for x in issues): sev='WARNING'; warning+=1
  rows.append({'horse':name,'status':sev,'publicRuns':len(runs),'verifiedOverride':bool(v),'identityCertifiedOverride':bool(c),'authoritativeCareerStarts':ac.get('starts'),'issues':issues})
 out={'snapshotDate':'2026-09-17','universe':101,'policy':'Recent-form/PFR windows are never career evidence. Unicode/punctuation-normalized joins are collision checked. Identity-certified overrides take precedence over verified records, which take precedence over broad public baseline. Informational stale-baseline differences do not fail a horse. Provisional records remain warnings until independent verification completes.','summary':{'pass':101-critical-warning,'warning':warning,'critical':critical,'provisionalRecords':provisional,'identityCertifiedOverrides':len(certified)},'rows':rows}
 OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(out['summary']))
if __name__=='__main__': main()
