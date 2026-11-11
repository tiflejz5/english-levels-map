"""Generuje szlak/szlak.json i quizy przystanków (A1, A2). Uruchom: python3 scripts/build_szlak.py"""
import json, os, random
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
def w(p,o):
    p=os.path.join(ROOT,p); os.makedirs(os.path.dirname(p),exist_ok=True)
    json.dump(o,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
LANDS={"A1":"Polana","A2":"Las","B1":"Wzgórza","B2":"Jezioro","C1":"Góry","C2":"Szczyt"}
# Odcinki: (tytuł, [przystanki]); przystanek: (tytuł, [checklistId sufiksy], strona lub None)
S={
"A1":[("Pierwsze zdania",[("Przedstawianie się",["f01"],"funkcje-przedstawianie-sie"),("To be i have got",["g05"],"gramatyka-to-be-have-got"),("Zaimki",["g06"],"gramatyka-zaimki"),("Kim jesteś: dane osobowe",["f02"],"funkcje-dane-osobowe"),("Liczby, godzina, dni i miesiące",["f03","v02","v03","v04"],"funkcje-liczby-godzina-data")]),
      ("Mój świat",[("Przedimki a, an, the",["g07"],"gramatyka-przedimki"),("Liczba mnoga",["g08"],"gramatyka-liczba-mnoga"),("This, that, these, those",["g10"],"gramatyka-this-that-these-those"),("There is, there are: mój dom",["g09","v08"],"gramatyka-there-is-there-are"),("Kolory i rodzina",["v05","v06"],"slownictwo")]),
      ("Codzienność",[("Present Simple: mój dzień",["g01","v10"],"czasy-present-simple"),("Szyk zdania",["g14"],"gramatyka-szyk-zdania"),("Pytania what, where, when",["g12"],"gramatyka-pytania-wh"),("Lubię i nie lubię",["f06"],"funkcje-lubie-nie-lubie"),("Przyimki miejsca i czasu",["g13"],"gramatyka-przyimki-miejsca-czasu")]),
      ("W mieście",[("Zamawianie: jedzenie i picie",["f04","v07"],"funkcje-zamawianie"),("Can i can't",["g11"],"gramatyka-can-cant"),("Proszę powtórzyć",["f05"],"funkcje-prosba-o-powtorzenie"),("Present Continuous: co się dzieje",["g02"],"czasy-present-continuous"),("Zawody",["v09","v01"],"slownictwo")]),
      ("Przeszłość i plany",[("Was i were",["g03"],"czasy-was-were"),("Going to: plany",["g04"],"czasy-going-to")])],
"A2":[("Wczoraj",[("Past Simple",["g01"],"czasy-past-simple"),("Mój weekend i czas wolny",["f01","v07"],"funkcje-opowiadanie-o-weekendzie"),("Past Continuous: tło",["g02"],"czasy-past-continuous"),("Spójniki and, but, because, so",["g11"],"gramatyka-spojniki")]),
      ("Ludzie i miejsca",[("Opisywanie ludzi i ubrań",["f05","v08"],"funkcje-opisywanie"),("Stopniowanie przymiotników",["g06"],"gramatyka-stopniowanie-przymiotnikow"),("Porównania i zakupy",["f06","v03"],"funkcje-porownywanie-preferencje"),("Jak często?",["g07"],"gramatyka-przyslowki-czestotliwosci"),("Some, any, much, many",["g08"],"gramatyka-policzalne-niepoliczalne")]),
      ("W podróży",[("Pytanie o drogę i podróże",["f03","v02"],"funkcje-pytanie-o-droge"),("Bilety, rezerwacje i pogoda",["f04","v05"],"funkcje-bilety-rezerwacje"),("Plany: Present Continuous",["g05"],"czasy-present-continuous-plany"),("Will: decyzje i przewidywania",["g04"],"czasy-future-will"),("Propozycje i zaproszenia",["f02"],"funkcje-propozycje-zaproszenia")]),
      ("Doświadczenia",[("Present Perfect: czy kiedyś…?",["g03"],"czasy-present-perfect-doswiadczenia"),("Must, should, have to i zdrowie",["g09","v04"],"gramatyka-modalne-must-should"),("Pytania o podmiot",["g10"],"gramatyka-pytania-o-podmiot"),("-ing czy to? Uczucia",["g12","v09"],"gramatyka-czasownik-ing-to"),("Praca",["v06","v01"],"slownictwo"),("Pierwsze phrasal verbs",["v10"],"slownictwo")])],
"B1":[("Doświadczenia i historie",[("Present Perfect czy Past Simple",["g01"],"czasy-present-perfect-vs-past-simple"),("Present Perfect Continuous",["g02"],"czasy-present-perfect-continuous"),("Past Perfect",["g03"],"czasy-past-perfect"),("Opowiadanie historii",["f03"],"funkcje-opowiadanie-historii"),("Used to i relacje",["g05","v06"],"czasy-used-to")]),
      ("Plany i przyszłość",[("Wybór formy przyszłej",["g04"],"czasy-wybor-formy-przyszlej"),("Plany, marzenia, praca i edukacja",["f04","v02"],"funkcje-plany-marzenia"),("Conditionals 0, 1, 2",["g06"],"gramatyka-conditionals-0-1-2"),("Rady",["f05"],"funkcje-rady"),("Might, must, can't: przypuszczenia",["g10"],"gramatyka-modalne-przypuszczenia")]),
      ("Opinie",[("Opinia i media",["f01","v03"],"funkcje-opinia"),("Zgoda i niezgoda",["f02"],"funkcje-zgoda-niezgoda"),("Too, enough, so, such",["g12"],"gramatyka-too-enough-so-such"),("Łączniki",["v10"],"slownictwo"),("Zdania względne i technologia",["g09","v04"],"gramatyka-zdania-wzgledne")]),
      ("Świat i sprawy",[("Strona bierna i środowisko",["g07","v05"],"gramatyka-strona-bierna"),("Mowa zależna",["g08"],"gramatyka-mowa-zalezna"),("Pytania pośrednie",["g11"],"gramatyka-pytania-posrednie"),("Skargi",["f06"],"funkcje-skargi"),("Gdy brakuje słowa",["f07"],"funkcje-strategie-ratunkowe"),("Podtrzymywanie rozmowy i emocje",["f08","v07"],"funkcje-podtrzymywanie-rozmowy"),("Kolokacje i phrasal verbs",["v08","v09","v01"],"slownictwo")])],
"B2":[("Czasy w pełni",[("Future Continuous i Future Perfect",["g01"],"czasy-future-continuous-perfect"),("Past Perfect Continuous",["g02"],"czasy-past-perfect-continuous"),("Łączenie czasów w opowieści",["g03"],"czasy-laczenie-czasow"),("Modalne w przeszłości",["g06"],"gramatyka-modalne-przeszlosc"),("Spekulowanie",["f02"],"funkcje-spekulowanie")]),
      ("Gdyby…",[("Third i mixed conditionals",["g04"],"gramatyka-third-mixed-conditionals"),("Wish i if only",["g05"],"gramatyka-wish-if-only"),("Gerund czy infinitive",["g11"],"gramatyka-gerund-infinitive-zmiana-znaczenia"),("Phrasal verbs z kilkoma znaczeniami",["v04"],"slownictwo")]),
      ("Argumenty",[("Argumentowanie",["f01"],"funkcje-argumentowanie"),("Przyczyna i przeciwieństwo",["g10"],"gramatyka-przyczyna-przeciwienstwo"),("Zdania względne niedefiniujące",["g09"],"gramatyka-zdania-wzgledne-niedefiniujace"),("Łagodzenie wypowiedzi",["f06"],"funkcje-lagodzenie"),("Rejestr formalny i potoczny",["v06"],"slownictwo")]),
      ("Praca i rozmowy",[("Strona bierna i have something done",["g07"],"gramatyka-strona-bierna-have-something-done"),("Pełna mowa zależna",["g08"],"gramatyka-mowa-zalezna-pelna"),("Negocjowanie",["f03"],"funkcje-negocjowanie"),("Spotkanie i rozmowa o pracę",["f04","v02"],"funkcje-spotkanie-rozmowa-o-prace"),("Przerywanie i odzyskiwanie głosu",["f05"],"funkcje-przerywanie"),("Akcenty i naturalne tempo",["f07"],"funkcje-rozumienie-akcentow"),("Idiomy codzienne",["v03"],"slownictwo"),("Słowotwórstwo",["v05","v01"],"slownictwo")])],
"C1":[("Styl i rejestr",[("Rejestr",["f01"],"funkcje-rejestr"),("Czasy dla dystansu i grzeczności",["g01"],"czasy-dystans-grzecznosc"),("Present w narracji",["g02"],"czasy-narracja-present"),("Be to, be about to",["g03"],"czasy-be-to-about-to"),("Hedging",["f02"],"funkcje-hedging")]),
      ("Emfaza",[("Inwersja",["g04"],"gramatyka-inwersja"),("Cleft sentences",["g05"],"gramatyka-cleft-sentences"),("Warunki bez if",["g06"],"gramatyka-warunkowe-bez-if"),("Odcienie opinii, ironia i idiomy",["f03","v03"],"funkcje-odcienie-opinii-ironia")]),
      ("Tekst formalny",[("Nominalizacja i kolokacje akademickie",["g08","v05"],"gramatyka-nominalizacja"),("Strona bierna bezosobowa",["g10"],"gramatyka-strona-bierna-bezosobowa"),("Konstrukcje imiesłowowe",["g07"],"gramatyka-konstrukcje-imieslowowe"),("Markery dyskursu",["f07"],"funkcje-markery-dyskursu"),("Parafrazowanie",["f06"],"funkcje-parafrazowanie")]),
      ("Na żywo",[("Elipsa i substytucja",["g09"],"gramatyka-elipsa-substytucja"),("Prezentacje i słownictwo branżowe",["f04","v04"],"funkcje-prezentacje"),("Implikacje i podteksty",["f05"],"funkcje-implikacje-podteksty"),("Precyzyjne synonimy",["v02","v01"],"slownictwo")])],
"C2":[("Struktury",[("Subjunctive",["g03"],"gramatyka-subjunctive"),("Inwersja i fronting",["g04"],"gramatyka-inwersja-fronting"),("Rejestry skrajne, archaizmy i neologizmy",["g05","v05"],"gramatyka-rejestry-skrajne"),("Świadome łamanie reguł",["g02"],"gramatyka-lamanie-regul")]),
      ("Słowo",[("Idiomy i przysłowia",["v02","v03"],"slownictwo"),("Konotacje",["v07"],"slownictwo"),("Słownictwo literackie",["v06"],"slownictwo"),("Humor, ironia i odniesienia kulturowe",["f05","v04"],"funkcje-humor-ironia-understatement")]),
      ("Mistrzostwo",[("Płynność i intonacja",["f01"],"funkcje-plynnosc-intonacja"),("Przeformułowanie w locie",["f02"],"funkcje-przeformulowanie"),("Szybka mowa i gry słów",["f03"],"funkcje-rozumienie-akcenty-gry-slow"),("Trudne rozmowy",["f04"],"funkcje-trudne-rozmowy"),("Tłumaczenie i mediacja",["f06"],"funkcje-tlumaczenie-mediacja"),("Kontrola pod presją",["g01","v01"],"gramatyka-kontrola-pod-presja")])]}
# istniejące zestawy tematyczne (cwiczenia-indeks): topic -> set
SETS={"a1-czasy-present-simple":"a1-czasy-present-simple-1","a1-czasy-present-continuous":"a1-czasy-present-continuous-1","a2-czasy-past-simple":"a2-czasy-past-simple-1","a2-czasy-present-perfect-doswiadczenia":"a2-czasy-present-perfect-doswiadczenia-1","b1-czasy-present-perfect-vs-past-simple":"b1-czasy-present-perfect-vs-past-simple-1","b1-czasy-wybor-formy-przyszlej":"b1-czasy-wybor-formy-przyszlej-1","b1-czasy-used-to":"b1-czasy-used-to-1","b1-gramatyka-conditionals-0-1-2":"b1-gramatyka-conditionals-0-1-2-1","b1-gramatyka-strona-bierna":"b1-gramatyka-strona-bierna-1","b1-slownictwo":"b1-slownictwo-1","b2-gramatyka-wish-if-only":"b2-gramatyka-wish-if-only-1"}
BRANCHES={"A2":[{"exam":"egzamin-osmoklasisty","label":"Egzamin ósmoklasisty","route":"#/egzamin-osmoklasisty","note":"Po A2 masz podstawy do E8. Odnoga jest zawsze otwarta."}],
 "B1":[{"exam":"matura-podstawowa","label":"Matura podstawowa","route":"#/matura-podstawowa","note":"Matura podstawowa to poziom B1."}],
 "B2":[{"exam":"matura-rozszerzona","label":"Matura rozszerzona","route":"#/matura-rozszerzona","note":"Matura rozszerzona to poziom B2+."},{"exam":"certyfikat-b2","label":"Certyfikat B2 First","route":"#/certyfikat-b2","note":"B2 First sprawdza poziom B2."}],
 "C1":[{"exam":"certyfikat-c1","label":"Certyfikat C1 Advanced","route":"#/certyfikat-c1","note":"C1 Advanced sprawdza poziom C1."}]}
from quizy import QUIZ
out={"version":1,"note":"Kolejność nauki. Identyfikatory checklisty (e_a1_g01…) i stron niezbędnika (a1/czasy-present-simple) jak w aplikacji.","levels":[]}
ids=set(); n_quiz=0
for L,units in S.items():
    lv={"level":L,"land":LANDS[L],"finalTest":f"#/{L.lower()}/test","units":[],"branches":BRANCHES.get(L,[])}
    k=0
    for ui,(ut,stops) in enumerate(units,1):
        u={"id":f"{L.lower()}-u{ui}","title":ut,"stops":[]}
        for (t,items,page) in stops:
            k+=1; sid=f"{L.lower()}-{k:02d}"
            st={"id":sid,"type":"lesson","title":t,"items":[f"e_{L.lower()}_{x}" for x in items],"page":f"{L.lower()}/{page}" if page else None}
            topic=f"{L.lower()}-{page}"
            if topic in SETS: st["set"]=SETS[topic]
            if sid in QUIZ:
                qid=f"szlak-{sid}"; st["quiz"]=qid; n_quiz+=1
                r=random.Random(qid); items_=[]
                for j,(pr,opts,ex) in enumerate(QUIZ[sid],1):
                    o=list(opts); corr=o[0]; r.shuffle(o)
                    items_.append({"id":f"{qid}-{j:02d}","type":"multiple-choice","kind":"form","prompt":pr,"options":o,"correct":o.index(corr),"explanation":ex})
                w(f"szlak/quizy/{L.lower()}/{qid}.json",{"version":1,"id":qid,"topic":st["page"] and st["page"].replace('/','-'),"level":L,"title":f"Przystanek: {t}","intro":"4 szybkie pytania. Zaliczenie od 3 dobrych odpowiedzi.","passage":None,"passScore":3,"items":items_})
            u["stops"].append(st); ids.add(sid)
        u["stops"].append({"id":f"{L.lower()}-u{ui}-powtorka","type":"review","title":f"Powtórka: {ut}","from":[s["id"] for s in u["stops"]],"size":6})
        lv["units"].append(u)
    out["levels"].append(lv)
w("szlak/szlak.json",out)
print("przystanków:",len(ids),"quizów:",n_quiz)
