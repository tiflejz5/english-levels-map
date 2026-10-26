"""Implementacja referencyjna harmonogramu fiszek (spec 10, sekcja 3).
Generuje dane/fiszki/scheduler-vectors.json. Czas w ms (UTC). Bez losowości (fuzz wyłączony)."""
import json, os
MIN=60_000; DAY=86_400_000
CFG=dict(learningSteps=[1,10], relearnSteps=[10], graduatingInterval=1, easyInterval=4,
         startEase=2.5, minEase=1.3, maxEase=2.8, hardMultiplier=1.2, easyBonus=1.3,
         lapseMultiplier=0.5, maxInterval=365)
GRADES={"again":1,"hard":2,"good":3,"easy":4}
def new_card(): return dict(state="new",step=0,ease=CFG["startEase"],interval=0,pendingInterval=0,lapses=0,reps=0,due=0)
def r2(x): return round(x*100)/100
def jsround(x):  # zaokrąglenie jak Math.round (połówki w górę)
    import math; return math.floor(x+0.5)
def schedule(card,grade,now,cfg=CFG):
    c=dict(card); c["reps"]+=1
    ls,rs=cfg["learningSteps"],cfg["relearnSteps"]
    cap=lambda v:min(cfg["maxInterval"],v)
    if c["state"] in("new","learning"):
        if c["state"]=="new": c["state"]="learning"; c["step"]=0
        if grade=="again": c["step"]=0; c["due"]=now+ls[0]*MIN
        elif grade=="hard": c["due"]=now+ls[c["step"]]*MIN
        elif grade=="good":
            if c["step"]+1<len(ls): c["step"]+=1; c["due"]=now+ls[c["step"]]*MIN
            else: c.update(state="review",interval=cfg["graduatingInterval"],step=0,due=now+cfg["graduatingInterval"]*DAY)
        else: c.update(state="review",interval=cfg["easyInterval"],step=0,due=now+cfg["easyInterval"]*DAY)
    elif c["state"]=="review":
        iv=c["interval"]; e=c["ease"]
        if grade=="again":
            c["lapses"]+=1; c["ease"]=r2(max(cfg["minEase"],e-0.2))
            c["pendingInterval"]=max(1,jsround(iv*cfg["lapseMultiplier"]))
            c.update(state="relearning",step=0,due=now+rs[0]*MIN)
        else:
            hardI=max(iv+1,jsround(iv*cfg["hardMultiplier"]))
            goodI=max(hardI+1,jsround(iv*e))
            easyI=max(goodI+1,jsround(iv*e*cfg["easyBonus"]))
            if grade=="hard": c["ease"]=r2(max(cfg["minEase"],e-0.15)); new=hardI
            elif grade=="good": new=goodI
            else: c["ease"]=r2(min(cfg["maxEase"],e+0.15)); new=easyI
            new=cap(new); c.update(interval=new,due=now+new*DAY)
    else: # relearning
        if grade=="again": c["step"]=0; c["due"]=now+rs[0]*MIN
        elif grade=="hard": c["due"]=now+rs[c["step"]]*MIN
        elif grade=="good":
            if c["step"]+1<len(rs): c["step"]+=1; c["due"]=now+rs[c["step"]]*MIN
            else: c.update(state="review",interval=c["pendingInterval"],step=0,due=now+c["pendingInterval"]*DAY)
        else:
            iv=cap(c["pendingInterval"]+1); c.update(state="review",interval=iv,step=0,due=now+iv*DAY)
    return c
T0=1793527200000  # 2026-11-01T10:00:00Z
def run(grades,start=None):
    c=start or new_card(); now=T0; out=[]
    for g in grades:
        c=schedule(c,g,now); out.append(dict(grade=g,now=now,card=c)); now=c["due"]
    return out
scen={"nowa-good-good-good":["good","good","good","good","good"],
 "nowa-easy":["easy","good","good"],
 "again-w-nauce":["good","again","good","good"],
 "lapse-i-relearn":["easy","good","good","again","good","good"],
 "hard-w-powtorce":["easy","hard","hard","good"],
 "easy-w-powtorce":["easy","easy","easy","easy","easy","easy","easy","easy"],
 "limit-365":["easy"]+["easy"]*14}
if __name__=="__main__":
    root=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..")
    vec=dict(version=1,config=CFG,startTimeMs=T0,note="Każdy krok wykonywany dokładnie w chwili due poprzedniej karty. Pola karty: state, step, ease, interval (dni), pendingInterval, lapses, reps, due (ms).",
             scenarios=[dict(name=k,steps=run(v)) for k,v in scen.items()])
    json.dump(vec,open(os.path.join(root,"dane/fiszki/scheduler-vectors.json"),"w"),indent=1)
    for s in vec["scenarios"]:
        print(s["name"],[ (x["grade"],x["card"]["state"],x["card"]["interval"],x["card"]["ease"]) for x in s["steps"]])
