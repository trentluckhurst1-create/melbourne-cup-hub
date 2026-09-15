import json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
def load(p):return json.load(open(ROOT/p,encoding='utf-8'))
noms=load('data/nominations/2026-09-01.json')['horses']; direct=load('data/training-bases/2026-09-13.json').get('bases',{}); trainers=load('data/trainers/2026-09-13-bases.json').get('trainers',[]); tm={x['trainer']:x for x in trainers}
out={}
for h in noms:
 n=h['horse']
 if n in direct:
  r=dict(direct[n]);r['basis']='HORSE_SPECIFIC_CURRENT';r['horseSpecificCurrentVerified']=True;r['trainerOperationFallback']=False;out[n]=r;continue
 t=tm.get(h['trainer'])
 if not t:raise SystemExit(f'Missing trainer base: {h["trainer"]} / {n}')
 out[n]={'trainingBase':t['primaryBase'],'stateCountry':t.get('country'),'verifiedDate':'2026-09-15','source':f"Trainer operation registry: {h['trainer']} — {t.get('verification','verified public operation')}",'confidence':'Best available trainer-operation base; horse-specific current yard not separately verified','basis':'TRAINER_OPERATION_BASE','horseSpecificCurrentVerified':False,'trainerOperationFallback':True,'otherTrainerBases':t.get('otherBases',[])}
report={'snapshotDate':'2026-09-15','definition':'Complete 101-horse best-available training-base registry. HORSE_SPECIFIC_CURRENT means the current preparation base has direct horse-specific evidence. TRAINER_OPERATION_BASE is a transparent fallback to the verified trainer operation base and must not be represented as proof that the horse is physically at that yard.','policy':{'universe':101,'noBlankHorseBase':True,'noFalseHorseSpecificClaim':True,'horseSpecificEvidencePreferred':True},'coverage':{'nominees':len(noms),'baseDisplayed':len(out),'horseSpecificCurrentVerified':sum(x['horseSpecificCurrentVerified'] for x in out.values()),'trainerOperationFallback':sum(x['trainerOperationFallback'] for x in out.values())},'bases':out}
path=ROOT/'data/training-bases/2026-09-15-complete-registry.json';path.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');print(json.dumps(report['coverage'],indent=2))
