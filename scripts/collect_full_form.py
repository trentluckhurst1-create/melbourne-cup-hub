#!/usr/bin/env python3
import json,re
from pathlib import Path
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
NOMS=ROOT/'data/nominations/2026-09-01.json'
FORM_DIR=ROOT/'data/form'
OUT=FORM_DIR/'2026-09-15-full-form.json'
AUDIT=FORM_DIR/'2026-09-15-form-coverage-audit.json'
GAPS=FORM_DIR/'2026-09-15-form-gaps.json'
RACEHUB_RAW=FORM_DIR/'2026-09-15-racehub-full-form.json'
BASE='https://racehub.com.au/horses/'
UA='Mozilla/5.0 (compatible; MelbourneCupHub/1.0; public-form-research)'

def slugify(name):
    s=name.lower().replace('’',"'")
    s=re.sub(r"['.]",'',s);s=re.sub(r'[^a-z0-9]+','-',s).strip('-');return s

def txt(el):return re.sub(r'\s+',' ',el.get_text(' ',strip=True)).strip() if el else ''
def parse_distance(s):
    m=re.search(r'(\d{3,4})\s*m',s or '',re.I);return int(m.group(1)) if m else None

def iso_date(s):
    from datetime import datetime
    s=re.sub(r'(?<=\d)(st|nd|rd|th)\b','',s.strip(),flags=re.I)
    for fmt in ('%d %b %Y','%d %B %Y'):
        try:return datetime.strptime(s,fmt).strftime('%Y-%m-%d')
        except:pass
    return None

def parse_profile(name):
    slug=slugify(name);url=BASE+quote(slug)
    try:r=requests.get(url,timeout=9,headers={'User-Agent':UA})
    except Exception as e:return {'horse':name,'url':url,'status':f'REQUEST_ERROR:{type(e).__name__}','runs':[]}
    if r.status_code!=200:return {'horse':name,'url':url,'status':f'HTTP_{r.status_code}','runs':[]}
    soup=BeautifulSoup(r.text,'html.parser');page=txt(soup)
    if 'Form history' not in page:return {'horse':name,'url':url,'status':'NO_FORM_HISTORY','runs':[]}
    target=None
    for table in soup.find_all('table'):
        hs=[txt(x).lower() for x in table.find_all('th')];joined='|'.join(hs)
        if 'date' in joined and 'track' in joined and ('dist' in joined or 'distance' in joined) and 'finish' in joined:target=table
    if target is None:return {'horse':name,'url':url,'status':'FORM_TABLE_NOT_FOUND','runs':[]}
    headers=[txt(x) for x in target.find_all('th')];hmap={re.sub(r'[^a-z0-9]','',h.lower()):i for i,h in enumerate(headers)}
    def idx(*keys):
        for key in keys:
            kk=re.sub(r'[^a-z0-9]','',key.lower())
            for hk,i in hmap.items():
                if kk==hk or hk.startswith(kk):return i
        return None
    ids={'date':idx('date'),'track':idx('track'),'dist':idx('dist','distance'),'cond':idx('cond','going'),'class':idx('class'),'finish':idx('finish'),'margin':idx('margin'),'wgt':idx('wgt','weight')}
    runs=[]
    for tr in target.find_all('tr'):
        cells=tr.find_all('td')
        if not cells:continue
        vals=[txt(c) for c in cells]
        def val(k):
            i=ids.get(k);return vals[i] if i is not None and i<len(vals) else ''
        date=iso_date(val('date'))
        if not date:continue
        rowtext=' '.join(vals).lower()
        if 'trial' in rowtext or 'jump-out' in rowtext or 'jumpout' in rowtext:continue
        finish=val('finish')
        if not finish:continue
        race_track=val('track');track_clean=re.sub(r'\s+R\d+\b.*$','',race_track,flags=re.I).strip();race_no=''
        mm=re.search(r'\bR(\d+)\b',race_track,re.I)
        if mm:race_no=f"R{mm.group(1)}"
        fm=re.search(r'^(\d+)(?:st|nd|rd|th)?\s+of\s+(\d+)',finish,re.I);field=int(fm.group(2)) if fm else None
        if fm:
            n=int(fm.group(1));suffix='th' if 10<=n%100<=20 else {1:'st',2:'nd',3:'rd'}.get(n%10,'th');pos=f'{n}{suffix}'
        else:pos=finish
        runs.append({'date':date,'race':race_no or 'Public race record','track':track_clean or race_track,'country':None,'distanceM':parse_distance(val('dist')),'going':val('cond') or None,'classGroup':val('class') or None,'finish':pos,'fieldSize':field,'weightCarried':val('wgt') or None,'margin':val('margin') or None,'performanceRating':None,'timefigure':None,'source':'RaceHub public form history','sourceUrl':url})
        if len(runs)>=8:break
    career_starts=None;m=re.search(r'Career\s+(\d+)\s*:',page,re.I) or re.search(r'From\s+(\d+)\s+starts',page,re.I)
    if m:career_starts=int(m.group(1))
    return {'horse':name,'url':url,'status':'OK' if runs else 'NO_ACTUAL_RUNS','runs':runs,'careerStarts':career_starts,'careerComplete':bool(career_starts is not None and career_starts<=7 and len(runs)>=career_starts)}

def run_key(r):return f"{r.get('date','')}|{r.get('track','')}|{r.get('race','')}"
def is_actual(r):
    s=(str(r.get('race',''))+' '+str(r.get('classGroup',''))).lower();return 'trial' not in s and 'jump-out' not in s and 'jumpout' not in s

def load_existing(horses):
    merged={h:{'runs':[],'careerComplete':False} for h in horses}
    skip={OUT.name,AUDIT.name,GAPS.name,RACEHUB_RAW.name}
    for path in sorted(FORM_DIR.glob('*.json')):
        if path.name in skip:continue
        try:d=json.loads(path.read_text(encoding='utf-8'))
        except:continue
        for h,rec in (d.get('horses') or {}).items():
            if h not in merged:continue
            by={run_key(r):r for r in merged[h]['runs'] if is_actual(r)}
            for r in rec.get('runs',[]):
                if is_actual(r):by[run_key(r)]=r
            merged[h]['runs']=sorted(by.values(),key=lambda r:r.get('date',''),reverse=True)
            if rec.get('careerComplete') is True:merged[h]['careerComplete']=True
    return merged

def main():
    data=json.loads(NOMS.read_text(encoding='utf-8'));horses=[h['horse'] for h in data['horses']]
    existing=load_existing(horses);results={}
    with ThreadPoolExecutor(max_workers=14) as ex:
        fut={ex.submit(parse_profile,name):name for name in horses}
        done=0
        for f in as_completed(fut):
            rec=f.result();results[rec['horse']]=rec;done+=1
            print(f"[{done:03d}/101] {rec['horse']}: {rec['status']} racehub={len(rec['runs'])} existing={len(existing[rec['horse']]['runs'])}",flush=True)
    raw={'snapshotDate':'2026-09-15','type':'public-form-full-field-racehub','targetRunsPerHorse':8,'horses':{}}
    canonical={'snapshotDate':'2026-09-15','type':'public-form-full-field-canonical','sourcePolicy':'Merge verified public Hub evidence with RaceHub public form histories; trials/jump-outs excluded; no Timeform values inferred','targetRunsPerHorse':8,'horses':{}}
    audit=[]
    for i,name in enumerate(horses,1):
        rec=results[name];raw['horses'][name]={'runs':rec['runs']}
        base=existing[name];by={run_key(r):r for r in base['runs'] if is_actual(r)}
        for r in rec['runs']:
            same=[ek for ek,er in by.items() if er.get('date')==r.get('date') and str(er.get('track','')).lower()==str(r.get('track','')).lower()]
            if same:continue
            by[run_key(r)]=r
        runs=sorted(by.values(),key=lambda r:r.get('date',''),reverse=True)[:8]
        career=bool(base.get('careerComplete') or rec.get('careerComplete'))
        canonical['horses'][name]={'runs':runs}
        if career:canonical['horses'][name]['careerComplete']=True
        state='COMPLETE' if len(runs)>=8 else ('CAREER_COMPLETE' if career and len(runs)>0 else ('PARTIAL' if runs else 'ZERO'))
        audit.append({'nominationNumber':i,'horse':name,'state':state,'actualRuns':len(runs),'missingRuns':max(0,8-len(runs)) if state=='PARTIAL' else 0,'racehubStatus':rec['status'],'racehubRuns':len(rec['runs']),'careerStarts':rec.get('careerStarts'),'careerComplete':career,'sourceUrl':rec['url']})
    RACEHUB_RAW.write_text(json.dumps(raw,ensure_ascii=False,indent=2)+"\n",encoding='utf-8');OUT.write_text(json.dumps(canonical,ensure_ascii=False,indent=2)+"\n",encoding='utf-8')
    complete=sum(1 for x in audit if x['state'] in ('COMPLETE','CAREER_COMPLETE'));partial=sum(1 for x in audit if x['state']=='PARTIAL');zero=sum(1 for x in audit if x['state']=='ZERO')
    AUDIT.write_text(json.dumps({'snapshotDate':'2026-09-15','universe':101,'targetRunsPerHorse':8,'completeOrCareerComplete':complete,'partial':partial,'zero':zero,'rows':audit},ensure_ascii=False,indent=2)+"\n",encoding='utf-8')
    gaps=[{'horse':x['horse'],'actualRuns':x['actualRuns'],'missingRuns':x['missingRuns'],'racehubStatus':x['racehubStatus'],'careerStarts':x['careerStarts']} for x in audit if x['state'] in ('PARTIAL','ZERO')]
    GAPS.write_text(json.dumps({'snapshotDate':'2026-09-15','gapCount':len(gaps),'gaps':gaps},ensure_ascii=False,indent=2)+"\n",encoding='utf-8')
    print(f"CANONICAL SUMMARY complete={complete} partial={partial} zero={zero}")
    print('GAPS '+', '.join(f"{x['horse']}({x['actualRuns']}/8)" for x in gaps))

if __name__=='__main__':main()
