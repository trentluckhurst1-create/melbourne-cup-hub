import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
FORM=ROOT/'data'/'form'
CANON=FORM/'2026-09-15-form-canonical.json'
OVR=FORM/'2026-09-15-form-authoritative-overrides.json'
LEDGER=FORM/'2026-09-15-form-coverage-ledger.json'
NOMS=ROOT/'data'/'nominations'/'2026-09-01.json'
can=json.loads(CANON.read_text(encoding='utf-8'))
ovr=json.loads(OVR.read_text(encoding='utf-8'))
for horse,rec in ovr.get('horses',{}).items():
    if horse not in can['horses']: continue
    can['horses'][horse]={**can['horses'][horse],**rec,'runs':rec.get('runs',[])}
    can['horses'][horse]['formIdentityVerified']=True
can['snapshotDate']='2026-09-15'
CANON.write_text(json.dumps(can,ensure_ascii=False,indent=2),encoding='utf-8')
noms=json.loads(NOMS.read_text(encoding='utf-8'))
rows=[]
for h in noms['horses']:
    rec=can['horses'][h['horse']];n=len(rec.get('runs',[]))
    state='COMPLETE' if n>=8 else ('CAREER_COMPLETE' if rec.get('careerComplete') else 'UNRESOLVED')
    rows.append({'nominationNumber':h['nominationNumber'],'horse':h['horse'],'runs':n,'state':state})
out={'total':101,'complete':sum(r['state']=='COMPLETE' for r in rows),'careerComplete':sum(r['state']=='CAREER_COMPLETE' for r in rows),'unresolved':sum(r['state']=='UNRESOLVED' for r in rows),'rows':rows}
LEDGER.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:out[k] for k in ('complete','careerComplete','unresolved')}))
