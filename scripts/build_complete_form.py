from __future__ import annotations

import json, re, sys, time, unicodedata
from datetime import datetime, date
from pathlib import Path
from urllib.parse import quote_plus

import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
FORM=ROOT/'data'/'form'
NOMS=ROOT/'data'/'nominations'/'2026-09-01.json'
ASOF=date(2026,9,15)
TARGET=8
UA={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153 Safari/537.36'}
S=requests.Session(); S.headers.update(UA)

SPECIAL_URLS={
 'Stinger Glass':['https://en.netkeiba.com/db/horse/result/2021105829/'],
}

COUNTRY_SUFFIXES=['aus','nz','ire','gb','fr','usa','jpn']


def clean(s): return re.sub(r'\s+',' ',str(s or '')).strip()
def ascii_slug(name):
    s=unicodedata.normalize('NFKD',name).encode('ascii','ignore').decode().lower().replace("'",'')
    return re.sub(r'[^a-z0-9]+','-',s).strip('-')
def run_key(r): return f"{r.get('date','')}|{clean(r.get('race'))}|{clean(r.get('track'))}"
def actual(r):
    s=(clean(r.get('race'))+' '+clean(r.get('classGroup'))).lower()
    return 'trial' not in s and 'jump out' not in s and 'jump-out' not in s and 'jumpout' not in s

def parse_date(s):
    s=clean(s)
    for fmt in ('%d%b%y','%d %b %Y','%Y-%m-%d','%d/%m/%Y'):
        try:return datetime.strptime(s,fmt).date()
        except:pass
    return None

def iso(d): return d.isoformat() if d else None

def merge_record(dst, src):
    if src.get('careerComplete'): dst['careerComplete']=True
    by={run_key(r):r for r in dst.get('runs',[]) if actual(r)}
    for r in src.get('runs',[]):
        if not actual(r): continue
        d=parse_date(r.get('date'))
        if d and d>ASOF: continue
        k=run_key(r)
        if k in by:
            by[k]={**by[k],**{a:b for a,b in r.items() if b not in (None,'')}}
        else: by[k]=r
    dst['runs']=sorted(by.values(),key=lambda r:r.get('date',''),reverse=True)[:TARGET]
    return dst

def load_existing():
    noms=json.loads(NOMS.read_text(encoding='utf-8'))
    out={h['horse']:{'runs':[]} for h in noms['horses']}
    files=sorted(FORM.glob('*form-index.json'))+sorted(FORM.glob('*form-supplement-*.json'))
    for p in files:
        try:d=json.loads(p.read_text(encoding='utf-8'))
        except Exception:continue
        for horse,rec in (d.get('horses') or {}).items():
            if horse in out: out[horse]=merge_record(out[horse],rec)
    return noms,out

def get(url, timeout=20):
    try:
        r=S.get(url,timeout=timeout); r.raise_for_status(); return r.text
    except Exception:return None

def race_class(name):
    x=clean(name).lower()
    if 'group 1' in x or re.search(r'\bgr\.?\s*1\b',x): return 'Group 1'
    if 'group 2' in x or re.search(r'\bgr\.?\s*2\b',x): return 'Group 2'
    if 'group 3' in x or re.search(r'\bgr\.?\s*3\b',x): return 'Group 3'
    if re.search(r'\b(lr|listed)\b',x): return 'Listed'
    m=re.search(r'\bbm\s*([0-9]{2,3})\b',x)
    if m:return 'BM'+m.group(1)
    m=re.search(r'\bclass\s*([1-6])\b',x)
    if m:return 'Class '+m.group(1)
    if 'handicap' in x or ' hcp' in x:return 'Handicap'
    if 'maiden' in x or ' mdn' in x:return 'Maiden'
    return None

def parse_breednet(name, country):
    slug=ascii_slug(name)
    urls=[f'https://www.breednet.com.au/horse/{slug}']+[f'https://www.breednet.com.au/horse/{slug}-%28{x}%29' for x in COUNTRY_SUFFIXES]
    best=[]; career=None; used=None
    for url in urls:
        html=get(url)
        if not html or 'Race Record' not in html: continue
        soup=BeautifulSoup(html,'html.parser')
        text=[clean(x) for x in soup.get_text('\n').splitlines() if clean(x)]
        head=' '.join(text[:80]).lower()
        if name.lower().replace('’',"'") not in head.replace('’',"'"): continue
        m=re.search(r'Career:\s*(\d+)\s*starts', ' '.join(text[:120]), re.I)
        if m: career=int(m.group(1))
        try:i=next(i for i,x in enumerate(text) if x.lower()=='race record')
        except StopIteration: continue
        lines=text[i+1:]
        runs=[]; j=0
        while j<len(lines)-4:
            dm=re.fullmatch(r'(\d{1,2}[A-Z][a-z]{2}\d{2})',lines[j])
            if not dm: j+=1; continue
            d=parse_date(dm.group(1));
            if not d or d>ASOF: j+=1; continue
            finish=clean(lines[j+1]); track=clean(lines[j+2]); race=clean(lines[j+3])
            detail=clean(lines[j+4]) if j+4<len(lines) else ''
            if not re.match(r'^\d+(st|nd|rd|th)$',finish,re.I): j+=1; continue
            md=re.search(r'(\d{3,4})m\b',race)
            dist=int(md.group(1)) if md else None
            race_name=re.sub(r'\s+\d{3,4}m.*$','',race).strip()
            going=None; mg=re.match(r'([A-Za-z]+(?:\([0-9]+\))?)',detail)
            if mg: going=mg.group(1)
            mw=re.search(r'\((\d+(?:\.\d+)?)\)',detail)
            wt=(mw.group(1)+'kg') if mw else None
            mm=re.search(r'\(([0-9.]+)L\)\s*$',detail)
            margin=float(mm.group(1)) if mm else None
            runs.append({'date':d.isoformat(),'race':race_name,'track':track,'country':country,'distanceM':dist,'going':going,'classGroup':race_class(race),'finish':finish,'fieldSize':None,'weightCarried':wt,'margin':margin,'source':'Breednet public race record'})
            j+=5
        if len(runs)>len(best):best=runs;used=url
        if len(best)>=TARGET:break
    return best[:TARGET],career,used

def bing_sportinglife(name):
    q=quote_plus(f'site:sportinglife.com/racing/profiles/horse "{name}"')
    html=get('https://www.bing.com/search?q='+q)
    if not html:return None
    m=re.search(r'https://www\.sportinglife\.com/racing/profiles/horse/\d+',html)
    return m.group(0) if m else None

def furlong_to_m(s):
    s=clean(s).lower()
    # examples: 1m 4f 6y, 2m 56y, 7f
    miles=float(re.search(r'(\d+(?:\.\d+)?)m\b',s).group(1)) if re.search(r'(\d+(?:\.\d+)?)m\b',s) else 0
    furl=float(re.search(r'(\d+(?:\.\d+)?)f\b',s).group(1)) if re.search(r'(\d+(?:\.\d+)?)f\b',s) else 0
    yards=float(re.search(r'(\d+)y\b',s).group(1)) if re.search(r'(\d+)y\b',s) else 0
    if not (miles or furl or yards):return None
    return round(miles*1609.344+furl*201.168+yards*0.9144)

def course_name(abbr):
    mp={'ASC':'Ascot','CUR':'Curragh','EPS':'Epsom','LEO':'Leopardstown','NAV':'Navan','GWO':'Goodwood','YOR':'York','DON':'Doncaster','NMK':'Newmarket','CHS':'Chester','SAN':'Sandown','CAT':'Catterick','SAL':'Salisbury','FON':'Fontwell','KEM':'Kempton','CORK':'Cork','KLN':'Killarney','NAA':'Naas','LIM':'Limerick'}
    return mp.get(abbr.upper(),abbr.upper())

def parse_sportinglife(name):
    url=bing_sportinglife(name)
    if not url:return [],None,None
    html=get(url)
    if not html:return [],None,url
    soup=BeautifulSoup(html,'html.parser')
    raw=clean(soup.get_text(' '))
    career=None
    m=re.search(r'Form.*?(\d+)\s+runs',raw,re.I)
    if m: career=int(m.group(1))
    runs=[]
    # Sporting Life SSR rows often collapse into: 22Aug262/22 105... YOR1m 5f 188y ...
    for tr in soup.find_all('tr'):
        txt=clean(tr.get_text(' '))
        dm=re.search(r'(\d{2}[A-Z][a-z]{2}\d{2})',txt)
        if not dm:continue
        d=parse_date(dm.group(1));
        if not d or d>ASOF:continue
        tail=txt[dm.end():]
        fm=re.match(r'\s*(\d+)(?:/\d+)?',tail)
        if not fm:continue
        finish=fm.group(1)
        # find common course token before distance
        cm=re.search(r'\b([A-Z]{3})\s*(\d+m(?:\s*\d+f)?(?:\s*\d+y)?|\d+f(?:\s*\d+y)?)',txt)
        if not cm:continue
        track=course_name(cm.group(1)); dist=furlong_to_m(cm.group(2))
        gm=re.search(r'\b(Good(?: to (?:Firm|Soft))?|Soft|Heavy|Yielding(?: to Soft)?|Standard(?: to Slow)?)\b',txt,re.I)
        going=gm.group(1) if gm else None
        wm=re.findall(r'\b(\d{1,2}-\d{1,2})\b',txt); wt=wm[-1] if wm else None
        runs.append({'date':d.isoformat(),'race':'Sporting Life form run','track':track,'country':None,'distanceM':dist,'going':going,'classGroup':None,'finish':finish+'th' if finish not in ('1','2','3') else {'1':'1st','2':'2nd','3':'3rd'}[finish],'fieldSize':None,'weightCarried':wt,'source':'Sporting Life public race record','sourceUrl':url})
    # fallback regex on collapsed page text
    if not runs:
        for m in re.finditer(r'(\d{2}[A-Z][a-z]{2}\d{2})(\d+)/(\d+).*?\b([A-Z]{3})(\d+m(?:\s*\d+f)?(?:\s*\d+y)?|\d+f(?:\s*\d+y)?)',raw):
            d=parse_date(m.group(1));
            if not d or d>ASOF:continue
            pos=m.group(2); track=course_name(m.group(4)); dist=furlong_to_m(m.group(5))
            runs.append({'date':d.isoformat(),'race':'Sporting Life form run','track':track,'country':None,'distanceM':dist,'going':None,'classGroup':None,'finish':pos+'th' if pos not in ('1','2','3') else {'1':'1st','2':'2nd','3':'3rd'}[pos],'fieldSize':int(m.group(3)),'weightCarried':None,'source':'Sporting Life public race record','sourceUrl':url})
    uniq={run_key(r):r for r in runs}
    return sorted(uniq.values(),key=lambda r:r['date'],reverse=True)[:TARGET],career,url

def parse_netkeiba(url):
    html=get(url)
    if not html:return [],None
    soup=BeautifulSoup(html,'html.parser')
    runs=[]
    for tr in soup.find_all('tr'):
        cells=[clean(x.get_text(' ')) for x in tr.find_all(['td','th'])]
        if not cells:continue
        joined=' | '.join(cells)
        dm=re.search(r'(\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4})',joined)
        if not dm:continue
        d=parse_date(dm.group(1));
        if not d or d>ASOF:continue
        # Netkeiba English table varies; store source-backed row with available tokens.
        finish=None
        for c in cells:
            if re.fullmatch(r'\d{1,2}',c): finish=c; break
        dist=None
        md=re.search(r'T(\d{4})m',joined)
        if md:dist=int(md.group(1))
        runs.append({'date':d.isoformat(),'race':cells[0] if cells else 'Netkeiba form run','track':'Japan','country':'JPN','distanceM':dist,'going':None,'classGroup':race_class(joined),'finish':(finish+'th' if finish and finish not in ('1','2','3') else {'1':'1st','2':'2nd','3':'3rd'}.get(finish)),'fieldSize':None,'weightCarried':None,'source':'netkeiba public race record','sourceUrl':url})
    # fallback from RECENT FORM list
    if not runs:
        text=clean(soup.get_text(' '))
        for m in re.finditer(r'(\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4})\s+([A-Z]{3})\s+R\d+\s+(.+?)(?=\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4}|$)',text):
            d=parse_date(m.group(1));
            if d and d<=ASOF:
                seg=m.group(3); md=re.search(r'T(\d{4})m',seg); dist=int(md.group(1)) if md else None
                fm=re.search(r'\s(\d{1,2})\(\d+Fav\)',seg)
                finish=fm.group(1) if fm else None
                runs.append({'date':d.isoformat(),'race':clean(seg[:60]),'track':m.group(2),'country':'JPN','distanceM':dist,'going':None,'classGroup':race_class(seg),'finish':({'1':'1st','2':'2nd','3':'3rd'}.get(finish,finish+'th' if finish else None)),'fieldSize':None,'weightCarried':None,'source':'netkeiba public race record','sourceUrl':url})
    return sorted(runs,key=lambda r:r['date'],reverse=True)[:TARGET],None

def enrich(horse, meta, rec):
    if len(rec.get('runs',[]))>=TARGET or rec.get('careerComplete'):return rec,[]
    notes=[]
    b,career,url=parse_breednet(horse,meta.get('country'))
    if b:
        rec=merge_record(rec,{'runs':b}); notes.append(f'breednet:{len(b)}')
    if career is not None and career<=TARGET and len(rec.get('runs',[]))>=career:
        rec['careerComplete']=True
    if len(rec.get('runs',[]))<TARGET and not rec.get('careerComplete'):
        sl,career2,url2=parse_sportinglife(horse)
        if sl:
            rec=merge_record(rec,{'runs':sl}); notes.append(f'sportinglife:{len(sl)}')
        if career2 is not None and career2<=TARGET and len(rec.get('runs',[]))>=career2:rec['careerComplete']=True
    if horse in SPECIAL_URLS and len(rec.get('runs',[]))<TARGET:
        for u in SPECIAL_URLS[horse]:
            nr,car=parse_netkeiba(u)
            if nr:rec=merge_record(rec,{'runs':nr});notes.append(f'netkeiba:{len(nr)}')
    return rec,notes

def main():
    noms,data=load_existing(); metas={h['horse']:h for h in noms['horses']}
    log=[]
    for i,h in enumerate(noms['horses'],1):
        horse=h['horse']; before=len(data[horse].get('runs',[]))
        if before<TARGET and not data[horse].get('careerComplete'):
            data[horse],notes=enrich(horse,h,data[horse]); time.sleep(.2)
        else:notes=[]
        after=len(data[horse].get('runs',[])); log.append({'horse':horse,'before':before,'after':after,'careerComplete':bool(data[horse].get('careerComplete')),'notes':notes})
        print(f'{i:03d}/101 {horse}: {before}->{after}'+(' CAREER' if data[horse].get('careerComplete') else '')+' '+','.join(notes),flush=True)
    canonical={'snapshotDate':ASOF.isoformat(),'universe':'Official 2026 Melbourne Cup nominations','targetRunsPerHorse':TARGET,'policy':{'actualRaceStartsOnly':True,'excludeTrialsJumpouts':True,'factualPublicSourcesOnly':True,'noEstimatedTimeformValues':True},'horses':data}
    out=FORM/'2026-09-15-form-canonical.json';out.write_text(json.dumps(canonical,ensure_ascii=False,indent=2),encoding='utf-8')
    ledger=[]
    for h in noms['horses']:
        rec=data[h['horse']]; n=len(rec.get('runs',[])); state='COMPLETE' if n>=TARGET else ('CAREER_COMPLETE' if rec.get('careerComplete') else 'UNRESOLVED')
        ledger.append({'nominationNumber':h['nominationNumber'],'horse':h['horse'],'runs':n,'state':state})
    summary={'total':len(ledger),'complete':sum(x['state']=='COMPLETE' for x in ledger),'careerComplete':sum(x['state']=='CAREER_COMPLETE' for x in ledger),'unresolved':sum(x['state']=='UNRESOLVED' for x in ledger),'rows':ledger,'buildLog':log}
    (FORM/'2026-09-15-form-coverage-ledger.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:summary[k] for k in ('total','complete','careerComplete','unresolved')},indent=2))
    return 0
if __name__=='__main__':sys.exit(main())
