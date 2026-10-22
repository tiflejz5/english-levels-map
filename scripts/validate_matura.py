#!/usr/bin/env python3
"""Walidator modułów matura-podstawowa i matura-rozszerzona. Użycie: python3 scripts/validate_matura.py [katalog_paczki]"""
import json, os, re, sys, glob
root=sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
errs=[]; ids=set()
def err(m): errs.append(m)
niez='/home/claude/niezbednik/index.json'
valid=None
if os.path.exists(niez): valid={i['id'] for l in json.load(open(niez))['levels'] for i in l['items']}
def item(it,f):
    i=it.get('id','?')
    if i in ids: err(f"{f}: zdublowane id {i}")
    ids.add(i)
    if not it.get('explanation'): err(f"{f} {i}: brak explanation")
    t=it.get('type')
    if t=='multiple-choice':
        o=it['options']; c=it['correct']
        if not 2<=len(o)<=4: err(f"{f} {i}: opcje")
        if not 0<=c<len(o): err(f"{f} {i}: correct")
        n=it.get('optionNotes')
        if n and (len(n)!=len(o) or n[c] is not None): err(f"{f} {i}: optionNotes")
        if len(set(o))!=len(o): err(f"{f} {i}: duplikaty opcji")
        if it.get('kind')=='listening' and not it.get('script'): err(f"{f} {i}: brak script")
    elif t=='short-answer':
        if it['prompt'].count('___')!=1: err(f"{f} {i}: luka")
        if not it.get('accepted'): err(f"{f} {i}: accepted")
    else: err(f"{f} {i}: typ {t}")
def cloze_like(d,f):
    gaps=d['gaps']; ns=[g['n'] for g in gaps]
    for n in ns:
        if f"{{{{{n}}}}}" not in d['text']: err(f"{f}: brak {{{{{n}}}}} w tekście")
    found=re.findall(r"\{\{(\d+)\}\}",d['text'])
    if sorted(map(int,found))!=sorted(ns): err(f"{f}: luki w tekście != gaps")
    if d['maxScore']!=len(gaps): err(f"{f}: maxScore != liczba luk")
    for g in gaps:
        if d['type']=='multiple-choice-cloze':
            if g['answer'] not in g['options']: err(f"{f}: luka {g['n']} answer")
        else:
            if not g.get('accept'): err(f"{f}: luka {g['n']} accept")
            if d['type']=='word-formation' and g['stem'].upper() in g['accept']: err(f"{f}: luka {g['n']} stem == odpowiedź")
for mod in ('matura-podstawowa','matura-rozszerzona'):
    base=os.path.join(root,mod)
    man=json.load(open(os.path.join(base,'manifest.json'),encoding='utf-8'))
    pages={p['id'] for s in man['sections'] for p in s.get('pages',[])}
    for s in man['sections']:
        for p in s.get('pages',[]):
            if not os.path.exists(os.path.join(base,p['file'])): err(f"{mod}: brak {p['file']}")
        for g in s.get('exerciseGroups',[]):
            for x in g['sets']:
                if not os.path.exists(os.path.join(base,x['file'])): err(f"{mod}: brak {x['file']}")
    for f in sorted(glob.glob(os.path.join(base,'cwiczenia','*.json'))):
        d=json.load(open(f,encoding='utf-8')); n=os.path.basename(f)
        if d.get('type') in('multiple-choice-cloze','open-cloze','word-formation'): cloze_like(d,n)
        elif 'items' in d:
            for it in d['items']: item(it,n)
            if any(i.get('kind')=='reading' for i in d['items']) and not d.get('passage'): err(f"{n}: brak passage")
        else: err(f"{n}: nieznany format")
    for f in glob.glob(os.path.join(base,'strony','*.md')):
        txt=open(f,encoding='utf-8').read()
        if not txt.startswith('---'): err(f"{f}: brak frontmatter")
        for m in re.findall(r'\[\[([^\]]+)\]\]',txt):
            if m not in pages and not (valid and m in valid): err(f"{os.path.basename(f)}: martwy link [[{m}]]")
    pw=json.load(open(os.path.join(base,'powiazania.json'),encoding='utf-8'))
    for l in pw['links']:
        if valid and l['itemId'] not in valid: err(f"{mod} powiazania: {l['itemId']}")
        for e in l['exercises']:
            if not os.path.exists(os.path.join(base,'cwiczenia',e+'.json')): err(f"{mod} powiazania: brak ćwiczenia {e}")
    P=json.load(open(os.path.join(base,'trening','pisanie.json'),encoding='utf-8'))
    lo,hi=P['wordRange']
    for t in P['tasks']:
        body=t['model'].split('\n',1)[1] if t.get('opening') else t['model']
        n=len(re.sub(r'\bXYZ\b','',body).split())
        if not lo<=n<=hi: err(f"{mod} pisanie {t['id']}: {n} wyrazów")
        if P.get('choiceGroups') and t.get('choiceGroup') not in P['choiceGroups']: err(f"{mod} {t['id']}: choiceGroup")
print("Zadań (nowy silnik):",len(ids))
if errs:
    print("BŁĘDY:"); [print(" -",e) for e in errs]; sys.exit(1)
print("OK")
