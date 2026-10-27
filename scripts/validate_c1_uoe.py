#!/usr/bin/env python3
"""Walidator nowych zestawów Use of English C1. Użycie: python3 scripts/validate_c1_uoe.py [katalog]"""
import json,os,re,sys,glob
root=sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
errs=[];ids=set()
def err(m): errs.append(m)
def words(s): return len(s.split())+len(re.findall(r"\w+n't|\w+'(?:s|d|ll|ve|re|m)\b",s))
for f in sorted(glob.glob(os.path.join(root,'certyfikat-c1','cwiczenia','*.json'))):
    d=json.load(open(f,encoding='utf-8')); n=os.path.basename(f)
    if d['id'] in ids: err(f"{n}: zdublowane id")
    ids.add(d['id'])
    if n!=d['id']+'.json': err(f"{n}: id != nazwa pliku")
    t=d['type']
    if t in('multiple-choice-cloze','open-cloze','word-formation'):
        found=sorted(map(int,re.findall(r"\{\{(\d+)\}\}",d['text'])))
        if found!=list(range(1,len(d['gaps'])+1)) or found!=sorted(g['n'] for g in d['gaps']): err(f"{n}: luki")
        if d['maxScore']!=len(d['gaps']) or len(d['gaps'])!=8: err(f"{n}: maxScore/liczba luk")
        for g in d['gaps']:
            if not g.get('explanation'): err(f"{n} luka {g['n']}: brak wyjaśnienia")
            if t=='multiple-choice-cloze':
                if g['answer'] not in g['options'] or len(set(g['options'].values()))!=4: err(f"{n} luka {g['n']}: opcje")
            else:
                if not g['accept']: err(f"{n} luka {g['n']}: accept")
                if any(a!=a.upper() for a in g['accept']): err(f"{n} luka {g['n']}: accept nie wielkimi")
                if t=='open-cloze' and any(' ' in a for a in g['accept']): err(f"{n} luka {g['n']}: open cloze to jedno słowo")
                if t=='word-formation':
                    if g['stem']!=g['stem'].upper(): err(f"{n} luka {g['n']}: stem")
                    if g['stem'] in g['accept']: err(f"{n} luka {g['n']}: stem == odpowiedź")
    elif t=='transformation':
        if d['maxScore']!=2*len(d['items']) or len(d['items'])!=6: err(f"{n}: maxScore/liczba")
        for it in d['items']:
            m=it['model']; c=words(m)
            if not 3<=c<=6: err(f"{n} #{it['n']}: {c} słów")
            if it['keyword'] not in m.split(): err(f"{n} #{it['n']}: model bez słowa kluczowego")
            if ' '.join(p[0] for p in it['parts'])!=m: err(f"{n} #{it['n']}: parts != model")
            if it['keyword'] in (it['before']+' '+it['after']).upper().split(): err(f"{n} #{it['n']}: słowo kluczowe w zdaniu")
            if not it.get('explanation'): err(f"{n} #{it['n']}: wyjaśnienie")
    else: err(f"{n}: typ {t}")
print("Zestawów:",len(ids))
if errs: print("BŁĘDY:"); [print(" -",e) for e in errs]; sys.exit(1)
print("OK")
