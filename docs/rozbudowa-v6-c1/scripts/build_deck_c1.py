import json, os, re
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
DID="certyfikat-c1"
def cl(t,h,tag): return {"type":"cloze","text":t,"hint":h,"tags":["certyfikat-c1",tag]}
def ty(f,acc,h,tag): return {"type":"typed","front":f,"accepted":acc,"back":acc[0],"hint":h,"tags":["certyfikat-c1",tag]}
W="wyrazenia"; G="gramatyka"; P="przyimki"; S="slowotworstwo"
cards=[
 cl("The new law will {{come into force|come into effect}} next year.","wejść w życie",W),
 cl("Small businesses {{bore the brunt}} of the crisis.","najbardziej ucierpieć",W),
 cl("The proposal {{met with}} strong opposition.","spotkać się z",W),
 cl("We need to {{strike a balance}} between work and rest.","znaleźć równowagę",W),
 cl("His argument doesn't {{hold water}}.","trzymać się kupy",W),
 cl("The project is still {{in its infancy}}.","w powijakach",W),
 cl("{{In the long run}}, the investment will pay off.","na dłuższą metę",W),
 cl("This decision is {{bound to}} cause controversy.","na pewno (spowoduje)",W),
 cl("The article {{gave rise to}} a heated debate.","wywołać, dać początek",W),
 cl("She took the bad news {{in her stride}}.","przyjąć ze spokojem",W),
 cl("The results {{fell short of}} our expectations.","nie spełnić (oczekiwań)",W),
 cl("We must {{get to the bottom of}} this problem.","dotrzeć do sedna",W),
 cl("He {{is prone to}} exaggeration.","mieć skłonność do",W),
 cl("The company was {{in the red}} for three years.","na minusie, ze stratą",W),
 cl("We were {{taken aback}} by his reaction.","zaskoczony, zbity z tropu",W),
 cl("The hotel was {{a far cry from}} what the brochure promised.","daleko od, coś zupełnie innego niż",W),
 cl("She has {{a flair for}} languages.","talent do",W),
 cl("In an emergency, time is {{of the essence}}.","czas ma kluczowe znaczenie",W),
 cl("It took him years to {{come to terms with}} his loss.","pogodzić się z",W),
 cl("The sequel didn't {{live up to}} the hype.","sprostać",W),
 cl("The decision was made {{on the spur of the moment}}.","pod wpływem chwili",W),
 cl("Her comments were {{beside the point}}.","nie na temat",W),
 cl("The plan is {{by no means}} perfect.","bynajmniej",W),
 cl("His success was {{due to}} hard work.","wynikać z, zawdzięczać",W),
 cl("The two reports are {{at odds}} with each other.","sprzeczne",W),
 cl("{{On no account|Under no circumstances}} should you open this door.","pod żadnym pozorem (inwersja)",G),
 cl("{{Little did}} she know what was coming.","w ogóle nie wiedziała (inwersja)",G),
 cl("{{Not only}} did he lie, but he also blamed me.","nie tylko (inwersja)",G),
 cl("{{Hardly|Scarcely}} had we arrived when it started to rain.","ledwie (inwersja)",G),
 cl("{{Were}} I in your position, I would accept the offer.","gdybym był (warunek bez if)",G),
 cl("{{Should}} you need any help, please contact me.","gdybyś potrzebował (warunek bez if)",G),
 cl("{{Had}} I known, I would have helped.","gdybym wiedział (warunek bez if)",G),
 cl("It's high time we {{left}}.","najwyższy czas, żebyśmy wyszli",G),
 cl("I'd rather you {{didn't}} smoke in here.","wolałbym, żebyś nie",G),
 cl("She {{is said to}} be the best surgeon in town.","podobno jest",G),
 cl("He {{is thought to have}} left the country.","uważa się, że wyjechał",G),
 cl("There is {{no point in|no use}} arguing about it.","nie ma sensu",G),
 cl("{{What}} I need is a long holiday.","to, czego potrzebuję (emfaza)",G),
 cl("She is adept {{at}} handling difficult clients.","biegła w",P),
 cl("He was accused {{of}} fraud.","oskarżony o",P),
 cl("The town is renowned {{for}} its cheese.","słynący z",P),
 cl("The design is {{in}} keeping with local tradition.","zgodny z",P),
 cl("The project's success hinges {{on|upon}} funding.","zależeć od",P),
 cl("He seemed oblivious {{to}} the risks.","nieświadomy",P),
 cl("Smoking is detrimental {{to}} your health.","szkodliwy dla",P),
 cl("The prisoners were deprived {{of}} sleep.","pozbawiony",P),
 cl("Contrary {{to}} expectations, the plan worked.","wbrew",P),
 cl("She takes pride {{in}} her work.","być dumnym z",P),
 ty("ANXIOUS → rzeczownik",["anxiety"],"niepokój",S),
 ty("PERSIST → rzeczownik",["persistence"],"wytrwałość",S),
 ty("SCEPTIC → przymiotnik",["sceptical","skeptical"],"sceptyczny",S),
 ty("DIVERSE → rzeczownik",["diversity"],"różnorodność",S),
 ty("INEVITABLE → przysłówek",["inevitably"],"nieuchronnie",S),
 ty("ACCESS → przymiotnik przeczący",["inaccessible"],"niedostępny",S),
 ty("COMPREHEND → przymiotnik",["comprehensible"],"zrozumiały",S),
 ty("DEPEND → przymiotnik przeczący",["independent"],"niezależny",S),
 ty("REVERSE → przymiotnik przeczący",["irreversible"],"nieodwracalny",S),
 ty("SIGNIFY → rzeczownik",["significance"],"znaczenie, waga",S),
 ty("PROHIBIT → przysłówek",["prohibitively"],"zaporowo (drogi)",S),
 ty("ENCOURAGE → przysłówek zdaniowy",["encouragingly"],"co napawa optymizmem",S),
]
for n,c in enumerate(cards,1): c["id"]=f"{DID}-{n:03d}"
deck={"version":1,"id":DID,"title":"Certyfikat C1: wyrażenia, inwersja, przyimki, słowotwórstwo","description":f"{len(cards)} kart pod Cambridge C1 Advanced: stałe wyrażenia z Part 1 i 4, inwersja i konstrukcje z Part 4, przyimki zależne z Part 2, słowotwórstwo z Part 3.","level":"C1","cards":cards}
os.makedirs(os.path.join(ROOT,"dane/fiszki"),exist_ok=True)
json.dump(deck,open(os.path.join(ROOT,"dane/fiszki",DID+".json"),"w",encoding="utf-8"),ensure_ascii=False,indent=2)
entry={k:deck[k] for k in("id","title","description","level")}; entry.update(file=DID+".json",count=len(cards))
json.dump({"note":"Dopisz wpis na końcu tablicy decks w dane/fiszki/index.json. Nie zmieniaj istniejących wpisów. Talia ma być domyślnie włączona dla użytkownika (patrz spec 12).","addDecks":[entry]},open(os.path.join(ROOT,"dane/fiszki/index-patch.json"),"w",encoding="utf-8"),ensure_ascii=False,indent=2)
# walidacja
ids=set(); err=[]
for c in cards:
    if c["id"] in ids: err.append("dup "+c["id"])
    ids.add(c["id"])
    if c["type"]=="cloze":
        m=re.findall(r"\{\{([^{}]+)\}\}",c["text"])
        if len(m)!=1 or any(not v.strip() for v in m[0].split("|")): err.append("cloze "+c["id"])
    else:
        if c["back"] not in c["accepted"]: err.append("typed "+c["id"])
print(len(cards),"kart", "OK" if not err else err)
