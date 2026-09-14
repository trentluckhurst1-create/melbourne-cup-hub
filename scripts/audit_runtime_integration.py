#!/usr/bin/env python3
import json,re,subprocess,sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
INDEX=ROOT/'index.html'
STRICT=ROOT/'data/form/2026-09-15-unique-full-form.json'
AUDIT=ROOT/'data/form/2026-09-15-unique-form-audit.json'
REPORT=ROOT/'data/form/2026-09-15-runtime-integration-audit.json'

html=INDEX.read_text(encoding='utf-8')
scripts=re.findall(r'<script\s+src="([^"]+\.js)"',html)
active=[ROOT/s for s in scripts if (ROOT/s).exists()]
errors=[]
checks=[]

def check(name,ok,detail):
    checks.append({'name':name,'ok':bool(ok),'detail':detail})
    if not ok: errors.append(f'{name}: {detail}')

check('strict_form_file_exists',STRICT.exists(),STRICT.relative_to(ROOT).as_posix())
check('strict_audit_exists',AUDIT.exists(),AUDIT.relative_to(ROOT).as_posix())
check('obsolete_supplement_loader_inactive','form-supplement-14-loader.js' not in scripts,'old supplement overlay must not load')

tf=(ROOT/'timeform-form.js').read_text(encoding='utf-8')
check('runtime_loads_strict_form','2026-09-15-unique-full-form.json' in tf,'timeform-form.js canonical source')
old_refs=[]
for p in active:
    text=p.read_text(encoding='utf-8')
    if re.search(r'2026-09-(13-form-index|13-form-supplement|14-form-supplement|15-full-form)\.json',text):
        old_refs.append(p.name)
check('no_active_stale_form_refs',not old_refs,old_refs or 'none')

if STRICT.exists():
    data=json.loads(STRICT.read_text(encoding='utf-8'))
    horses=data.get('horses',{})
    resolved=0; bad=[]
    nonstarts={'scr','scratched','wd','withdrawn','nr','non-runner','dns','did not start'}
    for horse,rec in horses.items():
        runs=[];dates=set()
        for r in rec.get('runs',[]):
            text=f"{r.get('classGroup','')} {r.get('race','')}".lower()
            finish=str(r.get('finish','')).strip().lower()
            if 'trial' in text or 'jump-out' in text or 'jumpout' in text or finish in nonstarts: continue
            d=r.get('date')
            if d and d in dates: continue
            if d: dates.add(d)
            runs.append(r)
        ok=len(runs)>=8 or (rec.get('careerComplete') is True and len(runs)>0)
        if ok: resolved+=1
        else: bad.append({'horse':horse,'runs':len(runs),'careerComplete':rec.get('careerComplete',False)})
    check('strict_101_resolved',resolved==101 and len(horses)==101,{'resolved':resolved,'universe':len(horses),'bad':bad})

if AUDIT.exists():
    a=json.loads(AUDIT.read_text(encoding='utf-8'))
    check('strict_audit_zero_gaps',a.get('resolved')==101 and a.get('partial')==0 and a.get('zero')==0,a)

required={
 'projected-field.js':['actualRaceRuns','formCompletionState'],
 'horse-dossier.js':['publicActualRuns','publicFormRating'],
 'ratings-rankings.js':['publicFormRating','publicRatedRuns'],
 'current-contender-board.js':['publicFormRating'],
 'form-pulse.js':['publicFormRating','formCompletionState'],
 'command-centre.js':['formCompletionSummary','publicActualRuns']
}
for name,tokens in required.items():
    p=ROOT/name
    text=p.read_text(encoding='utf-8') if p.exists() else ''
    missing=[t for t in tokens if t not in text]
    check(f'wired_{name}',not missing,missing or 'shared canonical helpers referenced')

syntax=[]
for p in active:
    r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
    if r.returncode: syntax.append({'file':p.name,'error':(r.stderr or r.stdout).strip()})
check('active_js_syntax',not syntax,syntax or f'{len(active)} files passed node --check')

out={'snapshotDate':'2026-09-15','activeScripts':scripts,'checks':checks,'pass':not errors,'errors':errors}
REPORT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'pass':out['pass'],'checks':len(checks),'errors':errors},ensure_ascii=False))
if errors: sys.exit(1)
