import json, os
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
def w(path,obj):
    p=os.path.join(ROOT,path); os.makedirs(os.path.dirname(p),exist_ok=True)
    json.dump(obj,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
def mc(kind,prompt,opts,c,expl,notes=None,**kw):
    d={"type":"multiple-choice","kind":kind,"prompt":prompt,"options":opts,"correct":c,"explanation":expl}
    if notes:d["optionNotes"]=notes
    d.update(kw); return d
def sa(ctx,prompt,acc,expl): return {"type":"short-answer","context":ctx,"prompt":prompt,"accepted":acc,"explanation":expl}
def mkset(folder,sid,level,title,items,intro,passage=None,mode=None):
    its=[]
    for n,i in enumerate(items,1):
        i=dict(i); i["id"]=f"{sid}-{n:02d}"; its.append(i)
    d={"version":1,"id":sid,"topic":None,"level":level,"title":title,"intro":intro,"passage":passage,"items":its}
    if mode:d["defaultMode"]=mode
    w(f"{folder}/cwiczenia/{sid}.json",d)
def notes(correct,*wrong):
    out=[];it=iter(wrong)
    n=len(wrong)+1
    for i in range(n): out.append(None if i==correct else next(it))
    return out
