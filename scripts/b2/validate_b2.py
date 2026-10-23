#!/usr/bin/env python3
"""Walidator modułu certyfikat-b2. Użycie: python3 scripts/validate_b2.py [katalog_paczki]"""
import json, os, re, sys, glob
root=sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
errs=[]; ids=set()
def err(m): errs.append(m)
niez='/home/claude/niezbednik/index.json'
valid=None
if os.path.exists(niez): valid={i['id'] for l in json.load(open(niez))['levels'] for i in l['items']}
def item(it,f,d):
    i=it.get('id','?')
    if i in ids: err(f"{f}: zdublowane id {i}")
    ids.add(i)
    if not it.get('explanation'): err(f"{f} {i}: brak explanation")
    t=it.get('type')
    if t=='multiple-choice':
        o=it['options']; c=it['correct']; mx=8 if it.get('fixedOrder') else 4
        if not 2<=len(o)<=mx: err(f"{f} {i}: liczba opcji {len(o)}")
        if not 0<=c<len(o): err(f"{f} {i}: correct")
        n=it.get('optionNotes')
        if n and (len(n)!=len(o) or n[c] is not None): err(f"{f} {i}: optionNotes")
        if len(set(o))!=len(o): err(f"{f} {i}: duplikaty opcji")
    elif t=='short-answer':
        if it['prompt'].count('___')!=1: err(f"{f} {i}: luka")
        if not it.get('accepted'): err(f"{f} {i}: accepted")
    else: err(f"{f} {i}: typ {t}")
    if it.get('kind')=='listening' and not (it.get('script') or d.get('script')): err(f"{f} {i}: brak script")
def cloze(d,f):
    gaps=d['gaps']; ns=[g['n'] for g in gaps]
    found=sorted(map(int,re.findall(r"\{\{(\d+)\}\}",d['text'])))
    if found!=sorted(ns): err(f"{f}: luki w tekście != gaps")
    if d['maxScore']!=len(gaps): err(f"{f}: maxScore")
    for g in gaps:
        if d['type']=='multiple-choice-cloze':
            if g['answer'] not in g['options']: err(f"{f}: luka {g['n']} answer")
        else:
            if not g.get('accept'): err(f"{f}: luka {g['n']} accept")
            if d['type']=='word-formation' and g['stem'].upper() in [a.upper() for a in g['accept']]: err(f"{f}: luka {g['n']} stem == odpowiedź")
            if d['type']=='word-formation' and 'Zob.' in g.get('explanation',''): err(f"{f}: luka {g['n']} słabe wyjaśnienie")
def transf(d,f):
    lo,hi=d['wordLimit']
    if d['maxScore']!=2*len(d['items']): err(f"{f}: maxScore")
    for it in d['items']:
        n=len(it['model'].split())
        if not lo<=n<=hi: err(f"{f} #{it['n']}: model ma {n} słów (limit {lo}-{hi})")
        if it['keyword'] not in it['first'].upper() and it['keyword'] not in it['model'].upper(): err(f"{f} #{it['n']}: słowo kluczowe nie występuje w modelu")
        if it['keyword'] not in it['model'].split(): err(f"{f} #{it['n']}: model nie zawiera słowa kluczowego")
base=os.path.join(root,'certyfikat-b2')
man=json.load(open(os.path.join(base,'manifest.json'),encoding='utf-8'))
pages={p['id'] for s in man['sections'] for p in s.get('pages',[])}
setfiles=set()
for s in man['sections']:
    for p in s.get('pages',[]):
        if not os.path.exists(os.path.join(base,p['file'])): err(f"brak {p['file']}")
    for g in s.get('exerciseGroups',[]):
        for x in g['sets']:
            setfiles.add(x['file'])
            if not os.path.exists(os.path.join(base,x['file'])): err(f"brak {x['file']}")
    for t in s.get('trainers',[]):
        if not os.path.exists(os.path.join(base,t['file'])): err(f"brak {t['file']}")
for f in sorted(glob.glob(os.path.join(base,'cwiczenia','*.json'))):
    d=json.load(open(f,encoding='utf-8')); n=os.path.basename(f)
    if 'cwiczenia/'+n not in setfiles: err(f"{n}: nie ma w manifeście")
    if d.get('type') in('multiple-choice-cloze','open-cloze','word-formation'): cloze(d,n)
    elif d.get('type')=='transformation': transf(d,n)
    elif 'items' in d:
        for it in d['items']: item(it,n,d)
        if any(i.get('kind')=='reading' for i in d['items']) and not d.get('passage'): err(f"{n}: brak passage")
        if not isinstance(d.get('items'),list) or not d['items']: err(f"{n}: pusty")
    else: err(f"{n}: nieznany format")
    for g in [d] if d.get('type') in ('multiple-choice-cloze',) else []:
        pass
for f in glob.glob(os.path.join(base,'strony','*.md')):
    txt=open(f,encoding='utf-8').read()
    if not txt.startswith('---'): err(f"{f}: brak frontmatter")
    for m in re.findall(r'\[\[([^\]]+)\]\]',txt):
        if m not in pages and not (valid and m in valid): err(f"{os.path.basename(f)}: martwy link [[{m}]]")
pw=json.load(open(os.path.join(base,'powiazania.json'),encoding='utf-8'))
for l in pw['links']:
    if valid and l['itemId'] not in valid: err(f"powiazania: {l['itemId']}")
    for e in l['exercises']:
        if not os.path.exists(os.path.join(base,'cwiczenia',e+'.json')): err(f"powiazania: brak ćwiczenia {e}")
P=json.load(open(os.path.join(base,'trening','pisanie.json'),encoding='utf-8'))
lo,hi=P['wordRange']
for t in P['tasks']:
    n=len(re.sub(r'\bXYZ\b','',t['model']).split())
    if not lo<=n<=hi: err(f"pisanie {t['id']}: {n} słów")
M=json.load(open(os.path.join(base,'trening','mowienie.json'),encoding='utf-8'))
for k in('part1','part2','part3','part4'):
    if k not in M: err(f"mowienie: brak {k}")
print("Zadań (nowy silnik):",len(ids))
if errs:
    print("BŁĘDY:"); [print(" -",e) for e in errs]; sys.exit(1)
print("OK")
