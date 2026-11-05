import json, os
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
def w(path,obj):
    p=os.path.join(ROOT,path); os.makedirs(os.path.dirname(p),exist_ok=True)
    json.dump(obj,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
D="certyfikat-c1/cwiczenia/"
INS1="Wybierz słowo (A, B, C lub D), które najlepiej pasuje do luki. Każda luka to 1 punkt."
INS2="Wpisz w każdą lukę dokładnie jedno słowo. Skróty typu don't liczą się jako dwa słowa, więc nie są poprawną odpowiedzią. Każda luka to 1 punkt."
INS3="Utwórz od słowa podanego przy luce słowo, które pasuje do luki. Uważaj na przedrostki, liczbę mnogą i pisownię. Każda luka to 1 punkt."
INS4="Uzupełnij drugie zdanie tak, żeby znaczyło to samo co pierwsze. Użyj podanego słowa bez zmieniania go. Wpisz od 3 do 6 słów, łącznie ze słowem kluczowym (skróty typu doesn't liczą się jako dwa słowa). Każda odpowiedź jest warta 2 punkty – po 1 za każdą część."
import random, glob
def balanced_letters(seed):
    r=random.Random(seed); L=list("ABCD")*2; r.shuffle(L); return L
def place(opts,letter):
    """opts[0] = poprawna; ustaw ją pod literą letter, resztę w kolejności."""
    others=opts[1:]; out={}; it=iter(others)
    for l in "ABCD": out[l]=opts[0] if l==letter else next(it)
    return out
def p1(i,title,text,gaps):
    L=balanced_letters(i)
    G=[{"n":n,"options":place(o,L[n-1]),"answer":L[n-1],"explanation":e} for n,(o,a,e) in enumerate(gaps,1)]
    w(D+i+".json",{"id":i,"part":1,"type":"multiple-choice-cloze","title":title,"instructions":INS1,"maxScore":8,"text":text,"gaps":G})
def p2(i,title,text,gaps):
    w(D+i+".json",{"id":i,"part":2,"type":"open-cloze","title":title,"instructions":INS2,"maxScore":8,"text":text,"gaps":[{"n":n,"accept":a,"explanation":e} for n,(a,e) in enumerate(gaps,1)]})
def p3(i,title,text,gaps):
    w(D+i+".json",{"id":i,"part":3,"type":"word-formation","title":title,"instructions":INS3,"maxScore":8,"text":text,"gaps":[{"n":n,"stem":s,"accept":a,"explanation":e} for n,(s,a,e) in enumerate(gaps,1)]})
def p4(i,title,focus,items):
    w(D+i+".json",{"id":i,"part":4,"type":"transformation","title":title,"focus":focus,"instructions":INS4,"maxScore":12,
      "items":[{"n":n,"first":f,"keyword":k,"before":b,"after":a,"parts":pt,"model":m,"explanation":e} for n,(f,k,b,a,pt,m,e) in enumerate(items,1)]})

# ---------- poprawka v5: w uoe-p1-4..6 poprawna była zawsze pod A
V5=os.path.join(ROOT,"..","rozbudowa-v5","certyfikat-c1","cwiczenia")
for i in ["uoe-p1-4","uoe-p1-5","uoe-p1-6"]:
    d=json.load(open(os.path.join(V5,i+".json"),encoding="utf-8")); L=balanced_letters(i)
    for g in d["gaps"]:
        o=g["options"]; corr=o[g["answer"]]; rest=[o[l] for l in "ABCD" if l!=g["answer"]]
        g["options"]=place([corr]+rest,L[g["n"]-1]); g["answer"]=L[g["n"]-1]
    w(D+i+".json",d)

# ---------- PART 1 (w danych poprawna opcja jest pierwsza; litery losowane i zrównoważone)
p1("uoe-p1-7","The ethics of zoos",
 "Few institutions divide public opinion quite as {{1}} as zoos. Supporters argue that modern zoos play a {{2}} role in protecting endangered species, many of which would otherwise have {{3}} out long ago. Breeding programmes have, for example, {{4}} the Arabian oryx back from the brink. Critics, however, remain {{5}} that keeping wild animals in captivity can ever be justified. They point to animals {{6}} repetitive behaviour, such as pacing up and down, as evidence of stress. Zoos have responded by building larger, more natural enclosures, but for many campaigners this does not go far {{7}}. The debate is unlikely to be {{8}} any time soon.",
 [(["sharply","steeply","abruptly","severely"],"A","Divide opinion sharply = ostro dzielić opinię. Steeply łączy się ze wzrostem i spadkiem (rise steeply)."),
  (["vital","lively","living","vivid"],"A","Play a vital role = odgrywać kluczową rolę."),
  (["died","passed","gone","faded"],"A","Die out = wyginąć (o gatunkach)."),
  (["brought","carried","taken","fetched"],"A","Bring something back from the brink = uratować coś w ostatniej chwili."),
  (["unconvinced","unbelieving","discredited","disputed"],"A","Remain unconvinced that = nadal nie być przekonanym, że."),
  (["displaying","appearing","exposing","featuring"],"A","Display behaviour = przejawiać zachowanie."),
  (["enough","sufficient","ample","plenty"],"A","Not go far enough = być niewystarczającym. Stałe wyrażenie z enough."),
  (["settled","stilled","calmed","cured"],"A","Settle a debate = rozstrzygnąć spór.")])
p1("uoe-p1-8","Why we travel",
 "For most of human history, travel was {{1}} out of necessity rather than for pleasure. Today, tourism is one of the world's largest industries, and millions of people {{2}} off on holiday every year. But what {{3}} us to leave the comfort of home? For some, it is the chance to {{4}} new cultures at first hand. Others simply want to {{5}} away from the pressures of everyday life. Psychologists suggest that travel can also broaden the mind, {{6}} we are open to unfamiliar ideas. Yet the {{7}} growth of mass tourism has its downside. Residents of popular destinations increasingly complain that their cities have been {{8}} by visitors.",
 [(["undertaken","overtaken","taken over","undergone"],"A","Undertake a journey = podjąć podróż. Undergo dotyczy np. operacji lub zmian."),
  (["set","get","put","take"],"A","Set off = wyruszyć."),
  (["drives","rides","steers","pilots"],"A","What drives us to do something = co nas skłania do."),
  (["experience","practise","attempt","undergo"],"A","Experience a culture at first hand = poznać kulturę z pierwszej ręki."),
  (["get","come","put","take"],"A","Get away from = uciec od, oderwać się od."),
  (["provided","unless","whereas","despite"],"A","Provided (that) = pod warunkiem, że. Sens: podróż poszerza horyzonty, jeśli jesteśmy otwarci."),
  (["rapid","hasty","hurried","prompt"],"A","Rapid growth = szybki wzrost. Hasty i hurried oznaczają pośpiech w działaniu."),
  (["overrun","overtaken","overcome","overdone"],"A","Be overrun by = być opanowanym, zalanym przez (tłumy).")])

# ---------- PART 2
p2("uoe-p2-8","The lost art of letter writing",
 "There was a time {{1}} people wrote letters as a matter of course. Today, most of us would struggle to remember the last time we put pen {{2}} paper. {{3}} is not to say that we communicate less; on the contrary, we send more messages than ever. But the speed of email and instant messaging has come {{4}} a price. Messages are typed in a hurry and forgotten almost as quickly {{5}} they are read. A handwritten letter, by contrast, requires time and care, which is precisely {{6}} it is valued so highly by those who receive one. Historians, too, have reason to worry. Much of what we know about the past comes from private correspondence, {{7}} of which survives in archives. Future researchers may find {{8}} difficult to piece together our lives from deleted chats.",
 [(["WHEN"],"There was a time when = był czas, kiedy."),(["TO"],"Put pen to paper = zacząć pisać (odręcznie)."),(["THIS","THAT"],"This is not to say that = nie oznacza to, że."),(["AT"],"Come at a price = mieć swoją cenę."),(["AS"],"As quickly as = tak szybko, jak."),(["WHY"],"Which is precisely why = i właśnie dlatego."),(["MUCH","SOME","MOST"],"Much of which = której duża część (zdanie względne)."),(["IT"],"Find it difficult to = mieć trudność z. It to podmiot formalny.")])
p2("uoe-p2-9","Why we love lists",
 "Whether it is the ten best beaches in Europe or the books you must read before you die, lists are everywhere. But why {{1}} they so appealing? Part of the answer lies {{2}} the way our brains handle information. Faced {{3}} an overwhelming amount of content, we welcome anything that promises to organise it. A list tells us in advance how long the text will be, so we know exactly what we are letting ourselves in {{4}}. Numbered items also give us a pleasant sense of progress {{5}} we move from one point to the next. Psychologists point out, however, that lists can oversimplify complex issues. {{6}} matter how carefully it is compiled, a top-ten ranking rarely reflects reality. Readers often treat the order as if it {{7}} based on objective criteria, when in fact it may reflect little more than the author's taste. Nevertheless, lists are unlikely to go out of fashion any time {{8}}.",
 [(["ARE"],"Pytanie: why are they so appealing?"),(["IN"],"Lie in = tkwić w, polegać na."),(["WITH"],"Faced with = w obliczu."),(["FOR"],"Let yourself in for = pakować się w coś."),(["AS"],"As = w miarę jak."),(["NO"],"No matter how = bez względu na to, jak."),(["WERE","WAS"],"As if + forma przeszła (nierzeczywistość): as if it were."),(["SOON"],"Any time soon = w najbliższym czasie.")])

# ---------- PART 3
p3("uoe-p3-8","Citizen science",
 "In recent years, ordinary people have made a remarkable {{1}} to scientific research. Through so-called citizen science projects, {{2}} with no formal training count birds, classify galaxies or record the weather. The data they collect would be {{3}} expensive to gather in any other way. Scientists were initially {{4}} about the quality of such data, but studies have shown that, with clear instructions, amateurs can be surprisingly {{5}}. Participants, for their part, report a deeper {{6}} of how science works. Some projects have even led to genuine {{7}}, such as the identification of new planets. Critics warn, however, that volunteers should not be used as a cheap {{8}} for professional researchers.",
 [("CONTRIBUTE",["CONTRIBUTION"],"Make a contribution to = wnieść wkład w."),("ENTHUSIASM",["ENTHUSIASTS"],"Rzeczownik osobowy, liczba mnoga: enthusiasts."),("PROHIBIT",["PROHIBITIVELY"],"Przysłówek przed przymiotnikiem: prohibitively expensive = zaporowo drogi."),("DOUBT",["DOUBTFUL"],"Przymiotnik po be: doubtful about."),("RELY",["RELIABLE"],"Przymiotnik po be: reliable = wiarygodny."),("UNDERSTAND",["UNDERSTANDING"],"Rzeczownik po a deeper: understanding of."),("DISCOVER",["DISCOVERIES"],"Rzeczownik w liczbie mnogiej po genuine (bez przedimka)."),("REPLACE",["REPLACEMENT","REPLACEMENTS"],"Rzeczownik po a cheap: replacement for.")])
p3("uoe-p3-9","Fast fashion",
 "Clothes have never been cheaper or more {{1}} available. Fast-fashion brands release new collections every few weeks, encouraging {{2}} to buy far more than they need. The {{3}} cost of this model, however, is enormous. The industry is responsible for a {{4}} share of global carbon emissions, and working conditions in many factories remain {{5}}. {{6}}, a growing number of shoppers are changing their habits. Second-hand platforms and clothing rental services have seen a sharp rise in {{7}}, and some brands now promise to make their production more {{8}}.",
 [("READY",["READILY"],"Przysłówek przed available: readily available = łatwo dostępny."),("CONSUME",["CONSUMERS"],"Rzeczownik osobowy w liczbie mnogiej."),("ECOLOGY",["ECOLOGICAL"],"Przymiotnik przed cost."),("SIGNIFY",["SIGNIFICANT"],"Przymiotnik przed share: a significant share."),("ACCEPT",["UNACCEPTABLE"],"Przymiotnik przeczący: conditions remain unacceptable."),("ENCOURAGE",["ENCOURAGINGLY"],"Przysłówek zdaniowy na początku: Encouragingly, = co napawa optymizmem."),("POPULAR",["POPULARITY"],"Rzeczownik po rise in."),("SUSTAIN",["SUSTAINABLE"],"Przymiotnik po more: more sustainable.")])

# ---------- PART 4
p4("uoe-p4-wyrazenia-idiomatyczne","Wyrażenia idiomatyczne","In charge of, take into account, at a loss for, out of the question, make sense of, on the verge of",[
 ("The manager has been responsible for the project since March.","CHARGE","The manager","the project since March.",[["HAS BEEN"],["IN CHARGE OF"]],"HAS BEEN IN CHARGE OF","Be in charge of = odpowiadać za. Present Perfect z since."),
 ("You should consider the cost before you decide.","ACCOUNT","You should take","before you decide.",[["THE COST"],["INTO ACCOUNT"]],"THE COST INTO ACCOUNT","Take something into account = wziąć coś pod uwagę. Akceptowane też: into account the cost."),
 ("I didn't know what to say when she asked me.","LOSS","I","words when she asked me.",[["WAS"],["AT A LOSS FOR"]],"WAS AT A LOSS FOR","Be at a loss for words = nie wiedzieć, co powiedzieć."),
 ("There's no way you can borrow money from him.","QUESTION","Borrowing money from him",".",[["IS OUT OF"],["THE QUESTION"]],"IS OUT OF THE QUESTION","Out of the question = wykluczone."),
 ("His explanation was impossible to understand.","SENSE","I couldn't","his explanation.",[["MAKE ANY","MAKE"],["SENSE OF"]],"MAKE ANY SENSE OF","Make sense of = zrozumieć, połapać się w."),
 ("The company is about to go bankrupt.","VERGE","The company is","bankruptcy.",[["ON THE"],["VERGE OF"]],"ON THE VERGE OF","On the verge of = na skraju.")])
p4("uoe-p4-czas-nierzeczywisty","Czas nierzeczywisty i preferencje","It's time, would rather, as if, supposing, haven't… for, never… before",[
 ("You should start revising for your exams now.","TIME","It's","revising for your exams.",[["TIME YOU","HIGH TIME YOU"],["STARTED"]],"TIME YOU STARTED","It's (high) time + podmiot + czas przeszły = najwyższy czas, żeby."),
 ("I'd prefer you not to tell anyone about this.","RATHER","I'd","anyone about this.",[["RATHER YOU"],["DIDN'T TELL","DID NOT TELL"]],"RATHER YOU DIDN'T TELL","Would rather + podmiot + czas przeszły. Didn't liczy się jako dwa słowa."),
 ("He talks as though he knows everything, but he doesn't.","IF","He talks","everything.",[["AS IF"],["HE KNEW","HE KNOWS"]],"AS IF HE KNEW","As if + czas przeszły podkreśla nierzeczywistość. Forma he knows też jest poprawna."),
 ("What would you do if you lost your job?","SUPPOSING","What would you do,","your job?",[["SUPPOSING"],["YOU LOST","YOU WERE TO LOSE"]],"SUPPOSING YOU LOST","Supposing = przypuśćmy, że. Po nim czas przeszły dla sytuacji hipotetycznej."),
 ("I last saw Tom three years ago.","SEEN","I","three years.",[["HAVEN'T SEEN","HAVE NOT SEEN"],["TOM FOR"]],"HAVEN'T SEEN TOM FOR","Last… ago → haven't… for. Haven't liczy się jako dwa słowa."),
 ("It's the first time I have eaten sushi.","NEVER","I","sushi before.",[["HAVE NEVER"],["EATEN"]],"HAVE NEVER EATEN","It's the first time… → I have never… before.")])
print("OK")
