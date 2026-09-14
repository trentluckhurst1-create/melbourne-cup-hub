#!/usr/bin/env python3
import json,re,time,html
from pathlib import Path
from urllib.parse import quote
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
NOMS=ROOT/'data/nominations/2026-09-01.json'
OUT=ROOT/'data/form/2026-09-15-racehub-full-form.json'
AUDIT=ROOT/'data/form/2026-09-15-form-coverage-audit.json'
BASE='https://racehub.com.au/horses/'
UA='Mozilla/5.0 (compatible; MelbourneCupHub/1.0; public-form-research)'

def slugify(name):
    s=name.lower().replace('’',"'")
    s=re.sub(r"['.]",'',s)
    s=re.sub(r'[^a-z0-9]+','-',s).strip('-')
    return s

def txt(el):
    return re.sub(r'\s+',' ',el.get_text(' ',strip=True)).strip() if el else ''

def parse_int(s):
    m=re.search(r'(\d+)',s or '')
    return int(m.group(1)) if m else None

def parse_distance(s):
    m=re.search(r'(\d{3,4})\s*m',s or '',re.I)
    return int(m.group(1)) if m else None

def iso_date(s):
    from datetime import datetime
    s=re.sub(r'(?<=\d)(st|nd|rd|th)\b','',s.strip(),flags=re.I)
    for fmt in ('%d %b %Y','%d %B %Y'):
        try:return datetime.strptime(s,fmt).strftime('%Y-%m-%d')
        except:pass
    return None

def parse_profile(name,session):
    slug=slugify(name)
    url=BASE+quote(slug)
    r=session.get(url,timeout=25,headers={'User-Agent':UA})
    if r.status_code!=200:
        return {'horse':name,'url':url,'status':f'HTTP_{r.status_code}','runs':[]}
    soup=BeautifulSoup(r.text,'html.parser')
    page=txt(soup)
    # Reject obvious wrong/missing profiles.
    if 'Form history' not in page:
        return {'horse':name,'url':url,'status':'NO_FORM_HISTORY','runs':[]}
    # Find the form-history table by its header signature.
    target=None
    for table in soup.find_all('table'):
        hs=[txt(x).lower() for x in table.find_all('th')]
        joined='|'.join(hs)
        if 'date' in joined and 'track' in joined and ('dist' in joined or 'distance' in joined) and 'finish' in joined:
            target=table
    if target is None:
        return {'horse':name,'url':url,'status':'FORM_TABLE_NOT_FOUND','runs':[]}
    headers=[txt(x) for x in target.find_all('th')]
    hmap={re.sub(r'[^a-z0-9]','',h.lower()):i for i,h in enumerate(headers)}
    def idx(*keys):
        for key in keys:
            kk=re.sub(r'[^a-z0-9]','',key.lower())
            for hk,i in hmap.items():
                if kk==hk or hk.startswith(kk):return i
        return None
    ids={
      'date':idx('date'),'track':idx('track'),'dist':idx('dist','distance'),'cond':idx('cond','going'),
      'class':idx('class'),'finish':idx('finish'),'margin':idx('margin'),'wgt':idx('wgt','weight')
    }
    runs=[]
    for tr in target.find_all('tr'):
        cells=tr.find_all(['td'])
        if not cells:continue
        vals=[txt(c) for c in cells]
        def val(k):
            i=ids.get(k);return vals[i] if i is not None and i<len(vals) else ''
        date=iso_date(val('date'))
        if not date:continue
        cls=val('class')
        track=val('track')
        rowtext=' '.join(vals).lower()
        if 'trial' in rowtext or 'jump-out' in rowtext or 'jumpout' in rowtext:continue
        dist=parse_distance(val('dist'))
        finish=val('finish')
        if not finish:continue
        # RaceHub track cells may contain R# suffix; retain it as race identifier but normalize track.
        race_track=track
        track_clean=re.sub(r'\s+R\d+\b.*$','',track,flags=re.I).strip()
        race_no=''
        mm=re.search(r'\bR(\d+)\b',race_track,re.I)
        if mm: race_no=f"R{mm.group(1)}"
        margin=val('margin') or None
        fm=re.search(r'^(\d+)(?:st|nd|rd|th)?\s+of\s+(\d+)',finish,re.I)
        field=int(fm.group(2)) if fm else None
        pos=(fm.group(1)+({'1':'st','2':'nd','3':'rd'}.get(fm.group(1)[-1],'th'))) if fm else finish
        runs.append({
          'date':date,
          'race':race_no or 'Public race record',
          'track':track_clean or race_track,
          'country':None,
          'distanceM':dist,
          'going':val('cond') or None,
          'classGroup':cls or None,
          'finish':pos,
          'fieldSize':field,
          'weightCarried':val('wgt') or None,
          'margin':margin,
          'performanceRating':None,
          'timefigure':None,
          'source':'RaceHub public form history',
          'sourceUrl':url
        })
        if len(runs)>=8:break
    career_starts=None
    # RaceHub page displays Career 21: 6-2-3 or similar.
    m=re.search(r'Career\s+(\d+)\s*:',page,re.I)
    if not m:
        m=re.search(r'From\s+(\d+)\s+starts',page,re.I)
    if m: career_starts=int(m.group(1))
    return {'horse':name,'url':url,'status':'OK' if runs else 'NO_ACTUAL_RUNS','runs':runs,'careerStarts':career_starts,
            'careerComplete': bool(career_starts is not None and career_starts<=7 and len(runs)>=career_starts)}

def main():
    data=json.loads(NOMS.read_text(encoding='utf-8'))
    horses=[h['horse'] for h in data['horses']]
    session=requests.Session()
    out={'snapshotDate':'2026-09-15','type':'public-form-full-field','source':'RaceHub public horse profiles','sourcePolicy':'Publicly accessible form history only; trials/jump-outs excluded; no Timeform values inferred','targetRunsPerHorse':8,'horses':{}}
    audit=[]
    for i,name in enumerate(horses,1):
        rec=parse_profile(name,session)
        out['horses'][name]={'runs':rec['runs']}
        if rec.get('careerComplete'):out['horses'][name]['careerComplete']=True
        audit.append({'nominationNumber':i,'horse':name,'status':rec['status'],'actualRuns':len(rec['runs']),'careerStarts':rec.get('careerStarts'),'careerComplete':rec.get('careerComplete',False),'sourceUrl':rec['url']})
        print(f"[{i:03d}/101] {name}: {rec['status']} runs={len(rec['runs'])} career={rec.get('careerStarts')}",flush=True)
        time.sleep(0.12)
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding='utf-8')
    complete=sum(1 for x in audit if x['actualRuns']>=8 or x['careerComplete'])
    partial=sum(1 for x in audit if 0<x['actualRuns']<8 and not x['careerComplete'])
    zero=sum(1 for x in audit if x['actualRuns']==0)
    summary={'snapshotDate':'2026-09-15','universe':len(audit),'targetRunsPerHorse':8,'completeOrCareerComplete':complete,'partial':partial,'zero':zero,'rows':audit}
    AUDIT.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+"\n",encoding='utf-8')
    print(f"SUMMARY complete={complete} partial={partial} zero={zero}")
    # Fail only if nothing was retrieved; partial coverage is committed for subsequent fallback passes.
    if complete==0 and partial==0: raise SystemExit(2)

if __name__=='__main__':main()
