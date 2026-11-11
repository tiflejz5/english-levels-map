"""Walidator szlaku. Użycie: python3 scripts/validate_szlak.py [ścieżka do niezbednik/index.json]"""
import json, os, sys, glob
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
err=[]
S=json.load(open(os.path.join(ROOT,'szlak/szlak.json'),encoding='utf-8'))
EXP={"A1":(14,6,10),"A2":(12,6,10),"B1":(12,8,10),"B2":(11,7,6),"C1":(10,7,5),"C2":(5,6,7)}
pages=None
if len(sys.argv)>1:
    idx=json.load(open(sys.argv[1],encoding='utf-8'))
    pages={i['file'][:-3] for l in idx['levels'] for i in l['items']}
ids=set(); quizzes=set(); nstops=0
for lv in S['levels']:
    L=lv['level'].lower(); g,f,v=EXP[lv['level']]
    expected={f"e_{L}_g{i:02d}" for i in range(1,g+1)}|{f"e_{L}_f{i:02d}" for i in range(1,f+1)}|{f"e_{L}_v{i:02d}" for i in range(1,v+1)}
    seen=[]
    for u in lv['units']:
        if u['stops'][-1]['type']!='review': err.append(f"{u['id']}: brak powtórki na końcu odcinka")
        for st in u['stops']:
            if st['id'] in ids: err.append("duplikat "+st['id'])
            ids.add(st['id'])
            if st['type']=='lesson':
                nstops+=1; seen+=st['items']
                if pages is not None and st['page'] not in pages: err.append(f"{st['id']}: brak strony {st['page']}")
                if 'quiz' in st: quizzes.add(st['quiz'])
            elif st['type']=='review':
                if not all(x in ids for x in st['from']): err.append(f"{st['id']}: from wskazuje na nieznane przystanki")
    if sorted(seen)!=sorted(expected):
        err.append(f"{lv['level']}: pokrycie checklisty – brak {sorted(expected-set(seen))}, nadmiar {sorted(set(seen)-expected)}, duplikaty {sorted({x for x in seen if seen.count(x)>1})}")
nq=0
for p in glob.glob(os.path.join(ROOT,'szlak/quizy/*/*.json')):
    q=json.load(open(p,encoding='utf-8')); nq+=1
    if q['id'] not in quizzes: err.append(f"{q['id']}: quiz nieprzypisany do przystanku")
    if len(q['items'])!=4 or q['passScore']!=3: err.append(f"{q['id']}: liczba pytań / passScore")
    for it in q['items']:
        o=it['options']
        if len(o)!=4 or len(set(o))!=4 or not 0<=it['correct']<4 or not it['explanation']: err.append(f"{it['id']}: opcje/correct/wyjaśnienie")
if nq!=len(quizzes): err.append(f"quizy w plikach: {nq}, w szlaku: {len(quizzes)}")
print(f"Poziomów: {len(S['levels'])}, przystanków-lekcji: {nstops}, wszystkich węzłów: {len(ids)}, quizów: {nq}")
print("OK" if not err else "BŁĘDY:\n - "+"\n - ".join(err)); sys.exit(1 if err else 0)
