import json, glob, pathlib
from datetime import date
ROOT=pathlib.Path(__file__).resolve().parents[1]
def load(p):
    with open(ROOT/p,encoding='utf-8') as f:return json.load(f)
def names_from_silks():
    out={}
    for p in glob.glob(str(ROOT/'data/silks/*.json')):
        d=json.load(open(p,encoding='utf-8'))
        for n,v in (d.get('horses') or {}).items():out[n]=v
    return out
def market_names():
    out=set()
    for p in glob.glob(str(ROOT/'data/markets/*.json')):
        d=json.load(open(p,encoding='utf-8'))
        for key in ('runners','horses','prices','market'):
            v=d.get(key)
            if isinstance(v,list):
                for x in v:
                    if isinstance(x,dict) and x.get('horse'):out.add(x['horse'])
            elif isinstance(v,dict):out.update(v.keys())
    return out
noms=load('data/nominations/2026-09-01.json')['horses']; form=load('data/form/2026-09-15-unique-full-form.json').get('horses',{})
weights=load('data/weights/2026-09-13-working-predictions.json').get('predictions',[]); W={x['horse']:x for x in weights}
base_file='data/training-bases/2026-09-15-complete-registry.json' if (ROOT/'data/training-bases/2026-09-15-complete-registry.json').exists() else 'data/training-bases/2026-09-13.json'; bases=load(base_file).get('bases',{})
trainers=load('data/trainers/2026-09-13-bases.json').get('trainers',[]); T={x['trainer']:x for x in trainers};silks=names_from_silks();markets=market_names()
ras=load('data/ratings/2026-09-15-ras-public-peaks.json');rv=ras.get('ratings') or ras.get('horses') or ras.get('records') or [];R=set(rv.keys()) if isinstance(rv,dict) else {x.get('horse') for x in rv if isinstance(x,dict) and x.get('horse')}
rows=[]
for h in noms:
 n=h['horse'];fr=form.get(n,{});runs=fr.get('runs',[]) if isinstance(fr,dict) else [];s=silks.get(n);tb=bases.get(n);tr=T.get(h.get('trainer'))
 rows.append({'nominationNumber':h.get('nominationNumber'),'horse':n,'trainer':h.get('trainer'),'country':h.get('country'),'trainingRegion':h.get('trainingRegion'),'formRuns':len(runs),'formPresent':bool(runs),'weightModel':n in W,'trainingBase':tb.get('trainingBase') if tb else None,'trainingBaseAvailable':bool(tb),'horseSpecificTrainingBaseVerified':bool(tb and tb.get('horseSpecificCurrentVerified',tb.get('basis')=='HORSE_SPECIFIC_CURRENT')),'trainingBaseBasis':tb.get('basis') if tb else None,'trainerOperationBase':tr.get('primaryBase') if tr else None,'trainerOperationBaseVerified':bool(tr),'silkStatus':s.get('status') if s else None,'silkPresent':bool(s),'silkExact':bool(s and s.get('status')=='exact'),'rasPublicRating':n in R,'marketObserved':n in markets})
def miss(field):return [r['horse'] for r in rows if not r[field]]
report={'auditDate':str(date.today()),'universe':len(rows),'policy':{'membership':'All 101 official original nominees are permanent. Missing evidence must never remove a horse.','requiredStableData':['nomination identity','trainer','country','complete public form where historically available','modelled pre-release weight','best available training base with provenance','racing colours/silks where publicly verifiable'],'observationalData':['horse-specific current yard when no direct source exists','official weights before declaration','bookmaker market where horse is not quoted','lead-up event before one is announced','private subscription ratings','R&S rating when not publicly published'],'noFabrication':True},'coverage':{},'missing':{},'horses':rows}
for key in ['formPresent','weightModel','trainingBaseAvailable','horseSpecificTrainingBaseVerified','trainerOperationBaseVerified','silkPresent','silkExact','rasPublicRating','marketObserved']:
 c=sum(bool(r[key]) for r in rows);report['coverage'][key]={'count':c,'total':len(rows),'pct':round(100*c/len(rows),2)};report['missing'][key]=miss(key)
report['coverage']['identity']={'count':sum(bool(r['trainer'] and r['country']) for r in rows),'total':len(rows)}
required=['formPresent','weightModel','trainingBaseAvailable','trainerOperationBaseVerified','silkPresent'];report['status']='COMPLETE' if all(not report['missing'][k] for k in required) else 'GAPS_REMAIN'
out=ROOT/'data/intelligence/2026-09-15-full-program-data-audit.json';out.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({'status':report['status'],'coverage':report['coverage'],'requiredGaps':{k:report['missing'][k] for k in required},'researchGaps':{'horseSpecificTrainingBaseVerified':report['missing']['horseSpecificTrainingBaseVerified'],'silkExact':report['missing']['silkExact'],'rasPublicRating':report['missing']['rasPublicRating'],'marketObserved':report['missing']['marketObserved']}},indent=2,ensure_ascii=False))
