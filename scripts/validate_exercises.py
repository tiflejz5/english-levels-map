#!/usr/bin/env python3
"""Walidator zestawów ćwiczeń i danych. Użycie: python3 scripts/validate_exercises.py [katalog_paczki]"""
import json, os, re, sys, glob
root = sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(__file__),'..')
errs=[]; ids=set()
def err(m): errs.append(m)
def toks(s): return sorted(re.sub(r"[.,!?;]+$","",w).lower().replace("’","'") for w in s.split())
def check_item(it, f, set_topic):
    i=it.get('id','?')
    if not it.get('id'): err(f"{f}: zadanie bez id")
    elif i in ids: err(f"{f}: zdublowane id {i}")
    ids.add(i)
    if not it.get('explanation'): err(f"{f} {i}: brak explanation")
    t=it.get('type')
    if t=='multiple-choice':
        o=it.get('options',[])
        if not 2<=len(o)<=4: err(f"{f} {i}: liczba opcji")
        c=it.get('correct')
        if not isinstance(c,int) or not 0<=c<len(o): err(f"{f} {i}: correct poza zakresem")
        n=it.get('optionNotes')
        if n is not None:
            if len(n)!=len(o): err(f"{f} {i}: optionNotes długość")
            elif isinstance(c,int) and n[c] is not None: err(f"{f} {i}: optionNotes poprawnej nie null")
        if len(set(o))!=len(o): err(f"{f} {i}: duplikaty opcji")
        if it.get('kind')=='listening' and not it.get('script'): err(f"{f} {i}: brak script")
    elif t=='reorder':
        a=it.get('answers',[])
        if not a: err(f"{f} {i}: brak answers")
        else:
            b=toks(a[0])
            for x in a[1:]:
                if toks(x)!=b: err(f"{f} {i}: answers mają różne tokeny: {x}")
            for e in it.get('extraTokens',[]):
                if e.lower() in b: err(f"{f} {i}: extraToken {e} występuje w odpowiedzi")
            if len(it.get('extraTokens',[]))>2: err(f"{f} {i}: za dużo extraTokens")
    elif t=='find-error':
        tk=it.get('tokens',[]); r=it.get('errorRange')
        if not it.get('noError'):
            if not (isinstance(r,list) and len(r)==2 and 0<=r[0]<=r[1]<len(tk)): err(f"{f} {i}: errorRange")
            if not it.get('fixes'): err(f"{f} {i}: brak fixes")
    elif t=='short-answer':
        if it.get('prompt','').count('___')!=1: err(f"{f} {i}: dokładnie jedna luka")
        if not it.get('accepted'): err(f"{f} {i}: brak accepted")
    else: err(f"{f} {i}: nieznany typ {t}")

def check_set(path, valid_topics):
    d=json.load(open(path,encoding='utf-8'))
    if d.get('topic') and valid_topics is not None and d['topic'] not in valid_topics: err(f"{path}: temat {d['topic']} nie istnieje")
    for it in d['items']:
        check_item(it, os.path.basename(path), d.get('topic'))
        if it.get('kind')=='reading' and not d.get('passage'): err(f"{path} {it['id']}: reading bez passage")
    return d

niez=os.path.join(root,'niezbednik','index.json')
valid=None
if os.path.exists(niez):
    valid={i['id'] for l in json.load(open(niez,encoding='utf-8'))['levels'] for i in l['items']}
for p in sorted(glob.glob(os.path.join(root,'cwiczenia','**','*.json'),recursive=True)+glob.glob(os.path.join(root,'egzamin-osmoklasisty','cwiczenia','*.json'))):
    check_set(p,valid)
m=os.path.join(root,'dane','cwiczenia-tematy.json')
if os.path.exists(m):
    for t,sets in json.load(open(m,encoding='utf-8'))['topics'].items():
        if valid and t not in valid: err(f"mapa: nieznany temat {t}")
        for s in sets:
            if not os.path.exists(os.path.join(root,'cwiczenia','tematy',s+'.json')): err(f"mapa: brak pliku {s}")
# lab
lp=os.path.join(root,'dane','lab-czasow.json')
tenses=set()
if os.path.exists(lp):
    L=json.load(open(lp,encoding='utf-8'))
    for t in L['tenses']:
        tenses.add(t['id'])
        for sc in t['scenes']:
            for e in sc['elements']:
                for k in ('at','from','to'):
                    if k in e and not -1<=e[k]<=1: err(f"lab {t['id']}: {k} poza [-1,1]")
                if 'from' in e and 'to' in e and e['from']>e['to']: err(f"lab {t['id']}: from>to")
        for n in t.get('niezbednikIds',[]):
            if valid and n not in valid: err(f"lab {t['id']}: nieznany niezbednikId {n}")
    for t in L['tenses']:
        for c in t.get('contrasts',[]):
            if c['with'] not in tenses: err(f"lab {t['id']}: contrast z nieznanym {c['with']}")
dp=os.path.join(root,'dane','lab-wybor-czasu.json')
if os.path.exists(dp):
    D=json.load(open(dp,encoding='utf-8')); N=D['nodes']
    if D['start'] not in N: err("drzewo: brak start")
    reach=set(); stack=[D['start']]
    while stack:
        n=stack.pop()
        if n in reach: continue
        reach.add(n)
        for o in N[n]['options']:
            if 'next' in o:
                if o['next'] not in N: err(f"drzewo: {n} -> brak {o['next']}")
                else: stack.append(o['next'])
            elif 'result' in o:
                for r in o['result']:
                    if tenses and r not in tenses: err(f"drzewo: nieznany czas {r}")
            else: err(f"drzewo: opcja bez next/result w {n}")
    for n in N:
        if n not in reach: err(f"drzewo: martwy węzeł {n}")
    # cykle
    def dfs(n,path):
        if n in path: err(f"drzewo: cykl przez {n}"); return
        for o in N[n]['options']:
            if 'next' in o and o['next'] in N: dfs(o['next'],path|{n})
    dfs(D['start'],frozenset())
mp=os.path.join(root,'dane','mixes.json')
if os.path.exists(mp):
    for x in json.load(open(mp,encoding='utf-8'))['mixes']:
        for t in x['topics']:
            if valid and t not in valid: err(f"mixes {x['id']}: nieznany temat {t}")
# egzamin
ep=os.path.join(root,'egzamin-osmoklasisty')
if os.path.exists(os.path.join(ep,'powiazania.json')):
    for l in json.load(open(os.path.join(ep,'powiazania.json'),encoding='utf-8'))['links']:
        if valid and l['itemId'] not in valid: err(f"powiazania: nieznany {l['itemId']}")
pp=os.path.join(ep,'trening','pisanie.json')
if os.path.exists(pp):
    P=json.load(open(pp,encoding='utf-8'))
    def count(s):
        s=re.sub(r"\bXYZ\b","",s)
        return len([w for w in s.split() if re.search(r"[A-Za-z0-9]",w)])
    for t in P['tasks']:
        n=count(t['model'])
        lo,hi=P['wordRange']
        if not lo<=n<=hi: err(f"pisanie {t['id']}: model ma {n} wyrazów")
        t['_n']=n
print("Zadań:",len(ids))
if errs:
    print("BŁĘDY:"); [print(" -",e) for e in errs]; sys.exit(1)
print("OK")
