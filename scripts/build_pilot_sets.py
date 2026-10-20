# Generuje zestawy pilotazowe do cwiczenia/tematy/. Uruchom: python3 scripts/build_pilot_sets.py
import json, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'cwiczenia', 'tematy')
os.makedirs(OUT, exist_ok=True)

def mc(prompt, opts, c, expl, notes=None, trap=None, tags=None):
    d = {"type": "multiple-choice", "kind": "form", "prompt": prompt, "options": opts, "correct": c, "explanation": expl}
    if notes: d["optionNotes"] = notes
    if trap: d["trap"] = trap
    if tags: d["tags"] = tags
    return d
def ro(ctx, answers, expl, extra=None, tags=None, trap=None):
    d = {"type": "reorder", "context": ctx, "answers": answers, "explanation": expl}
    if extra: d["extraTokens"] = extra
    if tags: d["tags"] = tags
    if trap: d["trap"] = trap
    return d
def fe(tokens, rng, fixes, expl, tags=None, trap=None):
    d = {"type": "find-error", "tokens": tokens.split(), "errorRange": rng, "fixes": fixes, "explanation": expl}
    if tags: d["tags"] = tags
    if trap: d["trap"] = trap
    return d

SETS = {}

SETS["a1-czasy-present-simple-1"] = ("a1-czasy-present-simple", "A1", "Present Simple – sprawdź się", [
 mc("My brother ___ football every Saturday.", ["play","plays","playing","is play"], 1,
    "Nawyk (every Saturday) = Present Simple. He/she/it dostaje -s: plays.",
    ["Brak -s przy he/she/it.", None, "-ing bez am/is/are nie tworzy czasu.", "is play to mieszanie dwóch form."], "W 3. osobie liczby pojedynczej dopisz -s.", ["he-she-it"]),
 mc("___ you like pizza?", ["Do","Does","Are","Is"], 0,
    "Pytanie z you w Present Simple tworzymy przez Do. Does jest tylko dla he/she/it.",
    [None,"Does tylko dla he/she/it.","Are/Is dotyczą czasownika be, a like nie jest be.","Are/Is dotyczą czasownika be, a like nie jest be."], None, ["pytania"]),
 mc("She ___ like coffee.", ["don't","doesn't","isn't","not"], 1,
    "Przeczenie dla she: doesn't + czasownik w formie podstawowej.",
    ["Don't pasuje do I/you/we/they.", None, "isn't łączy się z przymiotnikiem lub -ing, nie z like.", "Samo not nie tworzy przeczenia."], None, ["przeczenia"]),
 mc("My mum ___ at eight o'clock.", ["get up","gets up","getting up","does get up"], 1,
    "Czynność rutynowa, 3. osoba: gets up.",
    ["Brak -s.", None, "Brak am/is/are.", "does get up to forma pytająca lub emfatyczna."], None, ["he-she-it"]),
 ro("Ona nie mieszka w Lublinie.", ["She doesn't live in Lublin."], "Przeczenie: doesn't + live (bez -s).", ["does"], ["przeczenia"]),
 ro("Gdzie on pracuje?", ["Where does he work?"], "Pytanie: słowo pytające + does + podmiot + czasownik w formie podstawowej.", None, ["pytania"]),
 ro("Zawsze jem śniadanie w domu.", ["I always have breakfast at home."], "Przysłówek częstotliwości stoi przed czasownikiem głównym.", None, ["adverbs"]),
 fe("She don't like tea.", [1,1], ["doesn't"], "Dla she przeczenie to doesn't.", ["przeczenia"]),
 fe("He go to school by bus.", [1,1], ["goes"], "He/she/it: dodajemy -s lub -es (go → goes).", ["he-she-it"]),
 fe("Does she plays tennis?", [2,2], ["play"], "Po does czasownik wraca do formy podstawowej bez -s.", ["pytania"], "Po do/does nie dodajemy -s do czasownika."),
])

SETS["a1-czasy-present-continuous-1"] = ("a1-czasy-present-continuous", "A1", "Present Continuous – sprawdź się", [
 mc("Look! It ___ now.", ["rains","is raining","rain","raining"], 1,
    "Look! i now sygnalizują czynność dziejącą się w tej chwili: is raining.",
    ["Present Simple opisuje fakty i nawyki.", None, "Brak is.", "Brak is."], None, ["now"]),
 mc("They ___ TV at the moment.", ["watch","watches","are watching","is watching"], 2,
    "At the moment + they: are watching.",
    ["Present Simple, a tu chodzi o teraz.","Zła forma.", None, "Is nie pasuje do they."], None, ["now"]),
 mc("I ___ to music right now.", ["am not listening","not listening","don't listening","isn't listening"], 0,
    "Przeczenie w Present Continuous: am/is/are + not + -ing. Dla I: am not listening.",
    [None,"Brakuje am.","Don't nie łączy się z -ing.","Isn't nie pasuje do I."], None, ["przeczenia"]),
 mc("___ she studying now?", ["Does","Is","Are","Do"], 1,
    "Pytanie: Is + she + -ing.",
    ["Does stosujemy w Present Simple.", None, "Are dla you/we/they.", "Do stosujemy w Present Simple."], None, ["pytania"]),
 ro("Teraz czytam książkę.", ["I am reading a book now.", "I'm reading a book now.", "Now I am reading a book.", "Now I'm reading a book."], "Czynność w tej chwili: am + czasownik z -ing.", None, ["now"]),
 ro("Dzieci teraz nie śpią.", ["The children aren't sleeping now.", "The children are not sleeping now.", "Now the children aren't sleeping.", "Now the children are not sleeping."], "Przeczenie: are not / aren't + -ing.", None, ["przeczenia"]),
 ro("Co robisz?", ["What are you doing?"], "Pytanie: What + are + you + -ing.", None, ["pytania"]),
 fe("He is play football now.", [2,2], ["playing"], "Po is/am/are czasownik dostaje -ing.", ["ing"]),
 fe("They watching a film at the moment.", [1,1], ["are watching"], "Brakuje czasownika are przed watching.", ["be"]),
 fe("We are runing in the park.", [2,2], ["running"], "Run → running: podwajamy końcową spółgłoskę.", ["pisownia-ing"], "Krótkie czasowniki typu run, sit, swim podwajają ostatnią literę."),
])

SETS["a2-czasy-past-simple-1"] = ("a2-czasy-past-simple", "A2", "Past Simple – sprawdź się", [
 mc("We ___ to the cinema last night.", ["go","goes","went","gone"], 2,
    "Last night to zakończony moment w przeszłości, więc Past Simple: went.",
    ["Forma podstawowa.","Present Simple dla he/she/it.", None, "Trzecia forma bez have nie tworzy Past Simple."], None, ["irregular"]),
 mc("She ___ her keys yesterday.", ["lose","losed","lost","has lose"], 2,
    "Lose jest nieregularny: lose, lost, lost.",
    ["Forma podstawowa.","Nie dodajemy -ed do czasowników nieregularnych.", None, "Złe połączenie."], None, ["irregular"]),
 mc("___ you see the match on Sunday?", ["Do","Did","Were","Have"], 1,
    "Pytanie w Past Simple tworzymy przez Did + podmiot + forma podstawowa.",
    ["Do jest w czasie teraźniejszym.", None, "Were łączy się z przymiotnikiem lub -ing.", "Have tworzy Present Perfect."], None, ["pytania"]),
 mc("I ___ understand the question.", ["didn't","don't","wasn't","hadn't"], 0,
    "Przeczenie w Past Simple: didn't + forma podstawowa.",
    [None,"Don't to czas teraźniejszy.","Wasn't łączy się z przymiotnikiem lub -ing.","Hadn't to Past Perfect."], None, ["przeczenia"]),
 ro("Wczoraj nie poszedłem do szkoły.", ["I didn't go to school yesterday.", "Yesterday I didn't go to school."], "Przeczenie: didn't + go (forma podstawowa).", None, ["przeczenia"]),
 ro("Kiedy kupiłeś ten rower?", ["When did you buy this bike?"], "Pytanie: When + did + podmiot + forma podstawowa.", None, ["pytania"]),
 ro("Spotkaliśmy się w zeszły piątek.", ["We met last Friday."], "Meet to czasownik nieregularny: met.", ["meeted"], ["irregular"]),
 fe("I buyed a new bike last month.", [1,1], ["bought"], "Buy jest nieregularny: buy, bought.", ["irregular"]),
 fe("Did she went to the party?", [2,2], ["go"], "Po did czasownik wraca do formy podstawowej.", ["pytania"], "Po did nie używamy drugiej formy."),
 fe("He didn't called me yesterday.", [1,2], ["didn't call"], "Po didn't czasownik jest w formie podstawowej. Poprawka obejmuje oba słowa.", ["przeczenia"]),
])

SETS["a2-czasy-present-perfect-doswiadczenia-1"] = ("a2-czasy-present-perfect-doswiadczenia", "A2", "Present Perfect (doświadczenia) – sprawdź się", [
 mc("I ___ to London three times.", ["have been","was","went","am"], 0,
    "Doświadczenie z życia, bez konkretnej daty: have been.",
    [None,"Was nie łączy się z to London w tym sensie.","Went wymaga konkretnego momentu.","Am nie pasuje."], None, ["been"]),
 mc("She has never ___ sushi.", ["eat","ate","eaten","eating"], 2,
    "Present Perfect = have/has + trzecia forma czasownika: eaten.",
    ["Forma podstawowa.","Druga forma.", None, "Forma -ing."], None, ["participle"]),
 mc("___ you ever seen a whale?", ["Did","Do","Have","Are"], 2,
    "Pytanie o doświadczenie: Have you ever + trzecia forma.",
    ["Did wymaga konkretnego momentu.","Do jest w Present Simple.", None, "Are nie pasuje."], None, ["pytania"]),
 mc("He ___ never ___ a horse.", ["has / rode","has / ridden","have / ridden","did / ridden"], 1,
    "Present Perfect: has + trzecia forma. Ride, rode, ridden.",
    ["Po has potrzebna trzecia forma.", None, "Dla he używamy has.", "Did nie tworzy Present Perfect."], None, ["participle"]),
 ro("Nigdy nie byłem w Hiszpanii.", ["I have never been to Spain.", "I've never been to Spain."], "Never stoi między have a trzecią formą.", None, ["been"]),
 ro("Czy kiedykolwiek jadłeś ostrygi?", ["Have you ever eaten oysters?"], "Have + podmiot + ever + trzecia forma.", None, ["pytania"]),
 ro("Ona jeszcze nie skończyła zadania.", ["She hasn't finished her homework yet."], "Yet stoi na końcu zdania przeczącego.", None, ["yet"]),
 fe("I have see this film twice.", [2,2], ["seen"], "Po have potrzebna jest trzecia forma: seen.", ["participle"]),
 fe("She have never visited Rome.", [1,1], ["has"], "Dla she używamy has.", ["has-have"]),
 fe("Have you ever try sushi?", [3,3], ["tried"], "Po have potrzebna jest trzecia forma: tried.", ["participle"]),
])

SETS["b1-czasy-present-perfect-vs-past-simple-1"] = ("b1-czasy-present-perfect-vs-past-simple", "B1", "Present Perfect czy Past Simple – sprawdź się", [
 mc("I ___ him last week.", ["have seen","saw","have saw","see"], 1,
    "Last week to zakończony moment w przeszłości, więc Past Simple: saw.",
    ["Z określeniem czasu zakończonego nie używamy Present Perfect.", None, "Błędna forma.", "Present Simple."], "Last week, yesterday, in 2019, ago wymagają Past Simple.", ["time-expressions"]),
 mc("She ___ in Warsaw since 2018.", ["lives","lived","has lived","is living"], 2,
    "Since + punkt w czasie, sytuacja trwa do teraz: has lived.",
    ["Present Simple nie łączy się z since.","Past Simple oznacza, że już tam nie mieszka.", None, "Present Continuous nie pasuje do since."], None, ["since-for"]),
 mc("___ you finished your homework yet?", ["Did","Have","Do","Are"], 1,
    "Yet w pytaniu o skutek do teraz łączy się z Present Perfect: Have you finished.",
    ["Did wymagałoby formy finish, a tu mamy finished.", None, "Do nie pasuje do finished.", "Are nie pasuje do finished."], None, ["yet"]),
 mc("When ___ you buy that jacket?", ["have","did","do","are"], 1,
    "Pytanie z When o konkretny moment zawsze w Past Simple: did.",
    ["When wyklucza Present Perfect.", None, "Do to Present Simple.", "Are nie pasuje."], None, ["when"]),
 ro("Mieszkam tu od pięciu lat.", ["I have lived here for five years.", "I've lived here for five years."], "For + okres trwania, sytuacja trwa do teraz.", None, ["since-for"]),
 ro("Obejrzeliśmy ten film wczoraj.", ["We watched that film yesterday.", "Yesterday we watched that film."], "Yesterday = Past Simple.", ["have"], ["time-expressions"]),
 ro("Czy już zjadłeś obiad?", ["Have you had lunch yet?"], "Yet w pytaniu na końcu, Present Perfect.", None, ["yet"]),
 fe("I have visited Rome last year.", [1,2], ["visited"], "Last year wyklucza Present Perfect. Usuwamy have.", ["time-expressions"]),
 fe("She lives in Kraków since 2015.", [1,1], ["has lived"], "Since wymaga Present Perfect: has lived.", ["since-for"]),
 fe("Did you ever been to Italy?", [0,3], ["Have you ever been"], "Pytanie o doświadczenie w Present Perfect: Have you ever been.", ["been"]),
])

SETS["b1-czasy-wybor-formy-przyszlej-1"] = ("b1-czasy-wybor-formy-przyszlej", "B1", "Wybór formy przyszłej – sprawdź się", [
 mc("Look at those clouds! It ___ rain.", ["will","is going to","rains","is raining to"], 1,
    "Przewidywanie na podstawie dowodów, które widzimy: is going to.",
    ["Will pasuje do przewidywań bez dowodów lub decyzji w chwili mówienia.", None, "Present Simple nie pasuje.", "Błędna konstrukcja."], None, ["going-to"]),
 mc("A: There's no milk. B: I ___ buy some.", ["will","am going to","buy","am buying to"], 0,
    "Decyzja podjęta w chwili mówienia: will.",
    [None,"Going to oznacza plan z wcześniej.","Present Simple nie pasuje.","Błędna konstrukcja."], None, ["will"]),
 mc("I ___ my cousin on Saturday. We've arranged it.", ["will meet","am meeting","meet to","meeting"], 1,
    "Ustalone plany z konkretnym terminem: Present Continuous.",
    ["Will to decyzja spontaniczna.", None, "Błędna konstrukcja.", "Brak am."], None, ["present-continuous"]),
 mc("The train ___ at 6.15 tomorrow.", ["will leave","is leaving","leaves","is going to leave"], 2,
    "Rozkłady jazdy i oficjalne plany: Present Simple.",
    ["Możliwe, ale nienaturalne dla rozkładu.", "Możliwe dla osobistego planu.", None, "Nienaturalne dla rozkładu."], None, ["present-simple"]),
 ro("Zamierzam zacząć uczyć się niemieckiego.", ["I am going to start learning German.", "I'm going to start learning German."], "Plan i zamiar: be going to.", None, ["going-to"]),
 ro("Myślę, że jutro będzie padać.", ["I think it will rain tomorrow."], "Opinia o przyszłości: I think + will.", ["is"], ["will"]),
 ro("Spotykamy się o ósmej.", ["We are meeting at eight.", "We're meeting at eight."], "Ustalone spotkanie: Present Continuous.", None, ["present-continuous"]),
 fe("I'm tired. I go to bed now.", [3,3], ["will go"], "Decyzja w chwili mówienia: will go (lub I'll go).", ["will"]),
 fe("The film will start at 8 p.m. tomorrow, according to the cinema schedule.", [2,3], ["starts"], "Rozkład (schedule) = Present Simple: starts.", ["present-simple"]),
 fe("She is going to meets him tomorrow.", [3,3], ["meet"], "Po going to czasownik w formie podstawowej.", ["going-to"]),
])

import re
def norm_tokens(s):
    return sorted(re.sub(r"[.,!?;]+$", "", w).lower() for w in s.split())

for sid,(topic,level,title,items) in SETS.items():
    out_items=[]
    for n,it in enumerate(items,1):
        it=dict(it); it["id"]=f"{sid}-{n:02d}"
        if it["type"]=="reorder":
            base=norm_tokens(it["answers"][0])
            it["answers"]=[a for a in it["answers"] if norm_tokens(a)==base]
        out_items.append(it)
    data={"version":1,"id":sid,"topic":topic,"level":level,"title":title,
          "intro":"10 zadań: wybór formy, układanie zdań i szukanie błędów.","passage":None,"items":out_items}
    with open(os.path.join(OUT,sid+".json"),"w",encoding="utf-8") as f:
        json.dump(data,f,ensure_ascii=False,indent=2)
print(len(SETS),"zestawów")
