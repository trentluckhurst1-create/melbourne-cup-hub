#!/usr/bin/env python3
import json,re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
FORM=ROOT/'data'/'form'
NOMS=ROOT/'data'/'nominations'/'2026-09-01.json'
OUT=FORM/'2026-09-15-unique-full-form.json'
AUDIT=FORM/'2026-09-15-unique-form-audit.json'
GAPS=FORM/'2026-09-15-unique-form-gaps.json'
CORRECTIONS=FORM/'2026-09-17-form-integrity-corrections.json'

SKIP={
 '2026-09-15-full-form.json','2026-09-15-form-coverage-audit.json','2026-09-15-form-gaps.json',
 '2026-09-15-unique-full-form.json','2026-09-15-unique-form-audit.json','2026-09-15-unique-form-gaps.json',
 '2026-09-15-form-coverage-ledger.json','2026-09-15-form-canonical.json',
 '2026-09-15-ras-browser-capture.json','2026-09-15-ras-form-guide-enrichment.json',
 '2026-09-15-ras-form-guide-audit.json','2026-09-15-ras-http-search-capture.json',
 '2026-09-17-form-integrity-audit.json','2026-09-17-form-integrity-corrections.json'
}
NONSTART={'scr','scratched','wd','withdrawn','nr','non-runner','dns','did not start'}

def norm(s):return re.sub(r'[^a-z0-9]+',' ',str(s or '').lower()).strip()
def is_actual(r):
    text=norm(str(r.get('race',''))+' '+str(r.get('classGroup','')))
    finish=norm(r.get('finish'))
    if 'trial' in text or 'jump out' in text or 'jumpout' in text:return False
    if finish in NONSTART:return False
    if any(finish.startswith(x+' ') for x in NONSTART):return False
    if not r.get('date'):return False
    return True

def quality(r):
    q=0
    race=norm(r.get('race'))
    if race and race not in {'public race record'} and not re.fullmatch(r'r\d+',race):q+=5
    if r.get('track'):q+=2
    if r.get('distanceM'):q+=2
    if r.get('going') not in (None,'','—'):q+=1
    if r.get('classGroup') not in (None,'','—'):q+=2
    if r.get('weightCarried') not in (None,'','—'):q+=1
    if r.get('margin') not in (None,'','—'):q+=1
    if r.get('fieldSize'):q+=1
    src=norm(r.get('source'))
    if 'breednet' in src or 'sporting life' in src or 'racing nsw' in src or 'irishracing' in src:q+=2
    return q

def main():
    noms=json.loads(NOMS.read_text(encoding='utf-8'))
    names=[h['horse'] for h in noms['horses']]
    merged={n:{'byDate':{},'careerComplete':False,'sources':set()} for n in names}
    exclusions={}
    if CORRECTIONS.exists():
        c=json.loads(CORRECTIONS.read_text(encoding='utf-8'))
        exclusions={name:{str(x.get('date')) for x in rows if x.get('date')} for name,rows in (c.get('exclusions') or {}).items()}
    files=[]
    for p in sorted(FORM.glob('*.json')):
        if p.name in SKIP:continue
        try:d=json.loads(p.read_text(encoding='utf-8'))
        except Exception:continue
        if not isinstance(d,dict) or not isinstance(d.get('horses'),dict):continue
        files.append(p.name)
        for name,rec in d['horses'].items():
            if name not in merged or not isinstance(rec,dict):continue
            if rec.get('careerComplete') is True:merged[name]['careerComplete']=True
            for r in rec.get('runs',[]) or []:
                if not isinstance(r,dict) or not is_actual(r):continue
                date=str(r.get('date'))
                if date in exclusions.get(name,set()):continue
                old=merged[name]['byDate'].get(date)
                if old is None or quality(r)>quality(old):merged[name]['byDate'][date]=r
                if r.get('source'):merged[name]['sources'].add(str(r['source']))
    out={'snapshotDate':'2026-09-15','type':'strict-unique-public-form','targetRunsPerHorse':8,'dedupeRule':'one actual start per horse per calendar date; trials/jump-outs/non-starters excluded; evidence-backed exclusions applied before merge','sourceFiles':files,'horses':{}}
    rows=[]
    for h in noms['horses']:
        name=h['horse'];rec=merged[name]
        allruns=sorted(rec['byDate'].values(),key=lambda r:str(r.get('date','')),reverse=True)
        runs=allruns[:8]
        career=bool(rec['careerComplete'] and len(runs)<8)
        state='COMPLETE' if len(runs)>=8 else ('CAREER_COMPLETE' if career and len(runs)>0 else ('PARTIAL' if runs else 'ZERO'))
        out['horses'][name]={'runs':runs}
        if career:out['horses'][name]['careerComplete']=True
        rows.append({'nominationNumber':h['nominationNumber'],'horse':name,'state':state,'uniqueActualRuns':len(runs),'knownUniqueCareerDates':len(allruns),'missingRuns':0 if state in ('COMPLETE','CAREER_COMPLETE') else 8-len(runs),'careerComplete':career})
    complete=sum(r['state']=='COMPLETE' for r in rows);career=sum(r['state']=='CAREER_COMPLETE' for r in rows);partial=sum(r['state']=='PARTIAL' for r in rows);zero=sum(r['state']=='ZERO' for r in rows)
    audit={'snapshotDate':'2026-09-15','universe':101,'targetRunsPerHorse':8,'complete':complete,'careerComplete':career,'resolved':complete+career,'partial':partial,'zero':zero,'rows':rows}
    gaps=[r for r in rows if r['state'] in ('PARTIAL','ZERO')]
    OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    AUDIT.write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    GAPS.write_text(json.dumps({'snapshotDate':'2026-09-15','gapCount':len(gaps),'gaps':gaps},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'complete':complete,'careerComplete':career,'resolved':complete+career,'partial':partial,'zero':zero,'evidenceBackedExclusions':sum(len(v) for v in exclusions.values())}))
    print('GAPS '+', '.join(f"{r['horse']}({r['uniqueActualRuns']}/8)" for r in gaps))

if __name__=='__main__':main()
