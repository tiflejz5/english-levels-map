import json, os, re, sys
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
D=os.path.join(ROOT,'dane/fiszki')
err=[]
idx=json.load(open(os.path.join(D,'index.json'),encoding='utf-8'))
ids=set(); total=0
for d in idx["decks"]:
    p=os.path.join(D,d["file"])
    if not os.path.exists(p): err.append("brak pliku "+d["file"]); continue
    x=json.load(open(p,encoding='utf-8'))
    if x["id"]!=d["id"]: err.append("id talii "+d["id"])
    if len(x["cards"])!=d["count"]: err.append("count "+d["id"])
    for c in x["cards"]:
        total+=1
        if c["id"] in ids: err.append("duplikat "+c["id"])
        ids.add(c["id"])
        if not re.fullmatch(r"[a-z0-9-]+-\d{3}",c["id"]): err.append("zły id "+c["id"])
        t=c["type"]
        if t=="cloze":
            m=re.findall(r"\{\{([^{}]+)\}\}",c["text"])
            if len(m)!=1: err.append("cloze: "+c["id"])
            elif any(not v.strip() for v in m[0].split("|")): err.append("pusta alternatywa "+c["id"])
            if not c.get("hint"): err.append("brak hint "+c["id"])
        elif t=="typed":
            if not c.get("accepted") or any(not a.strip() for a in c["accepted"]): err.append("typed: "+c["id"])
            if c["back"] not in c["accepted"]: err.append("back poza accepted "+c["id"])
        elif t=="basic":
            if not c.get("front") or not c.get("back"): err.append("basic: "+c["id"])
        else: err.append("typ "+c["id"])
v=json.load(open(os.path.join(D,'scheduler-vectors.json')))
if len(v["scenarios"])<5: err.append("za mało wektorów")
print("Talii:",len(idx["decks"]),"Kart:",total,"Scenariuszy harmonogramu:",len(v["scenarios"]))
print("\n".join(err) if err else "OK"); sys.exit(1 if err else 0)
