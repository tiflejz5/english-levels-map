import json, os
D=os.path.join(os.path.dirname(__file__),'..','dane'); os.makedirs(D,exist_ok=True)
def w(n,o): json.dump(o,open(os.path.join(D,n),'w',encoding='utf-8'),ensure_ascii=False,indent=2)

w('cwiczenia-tematy.json',{"version":1,"topics":{
 "a1-czasy-present-simple":["a1-czasy-present-simple-1"],
 "a1-czasy-present-continuous":["a1-czasy-present-continuous-1"],
 "a2-czasy-past-simple":["a2-czasy-past-simple-1"],
 "a2-czasy-present-perfect-doswiadczenia":["a2-czasy-present-perfect-doswiadczenia-1"],
 "b1-czasy-present-perfect-vs-past-simple":["b1-czasy-present-perfect-vs-past-simple-1"],
 "b1-czasy-wybor-formy-przyszlej":["b1-czasy-wybor-formy-przyszlej-1"]}})

def U(label,en,pl): return {"label":label,"en":en,"pl":pl}
def P(at,l=None): 
    e={"kind":"point","at":at}; 
    if l: e["label"]=l
    return e
def R(a,b,l=None):
    e={"kind":"range","from":a,"to":b}
    if l: e["label"]=l
    return e
def sc(i,l,d,*el): return {"id":i,"label":l,"description":d,"elements":list(el)}
def T(id,name,pl,group,aspect,level,summary,formation,uses,signals,scenes,traps,contrasts,nz,tags):
    return {"id":id,"name":name,"namePl":pl,"group":group,"aspect":aspect,"level":level,"summary":summary,
      "formation":formation,"uses":uses,"signals":signals,"scenes":scenes,"traps":traps,"contrasts":contrasts,
      "niezbednikIds":nz,"setTags":tags}
def F(aff,neg,q): return {"affirmative":aff,"negative":neg,"question":q}
def C(w_,rule,a,b): return {"with":w_,"rule":rule,"examples":[a,b]}

tenses=[
T("present-simple","Present Simple","Czas teraźniejszy prosty","present","simple","A1","Fakty, nawyki i rutyna.",
  F("I/you/we/they work · he/she/it works","do not (don't) / does not (doesn't) + work","Do/Does + podmiot + work?"),
  [U("Nawyki i rutyna","I get up at seven every day.","Codziennie wstaję o siódmej."),U("Fakty i prawdy ogólne","Water boils at 100 degrees.","Woda wrze w 100 stopniach."),U("Rozkłady","The train leaves at 6.15.","Pociąg odjeżdża o 6.15.")],
  ["always","usually","often","sometimes","never","every day","on Mondays"],
  [sc("habit","Nawyk","Powtarzająca się czynność, która dotyczy też teraz.",{"kind":"repeat","from":-0.9,"to":0.9,"count":7})],
  ["Po polsku mówimy „on pracuje”, ale po angielsku bez -s się nie obejdzie: he works."],
  [C("present-continuous","Simple = nawyk i fakty. Continuous = dzieje się teraz.","I drink tea every morning.","I am drinking tea now.")],
  ["a1-czasy-present-simple"],["present-simple"]),
T("present-continuous","Present Continuous","Czas teraźniejszy ciągły","present","continuous","A1","Czynność w toku teraz lub plan na bliską przyszłość.",
  F("am/is/are + czasownik-ing","am/is/are + not + czasownik-ing","Am/Is/Are + podmiot + czasownik-ing?"),
  [U("Dzieje się teraz","She is cooking dinner.","Ona gotuje obiad."),U("Tymczasowa sytuacja","I am staying with a friend this week.","W tym tygodniu mieszkam u znajomego."),U("Ustalone plany","We are meeting at eight tonight.","Spotykamy się dziś o ósmej.")],
  ["now","at the moment","right now","Look!","Listen!","today"],
  [sc("now","Teraz","Czynność trwa dokładnie w chwili mówienia.",R(-0.25,0.25,"trwa teraz")),
   sc("plan","Plan","Ustalona przyszła czynność, np. jutro.",P(0.55,"spotkanie"))],
  ["Nie używamy go do stanów (I know, I want, I like) i nawyków."],
  [C("present-simple","Continuous = teraz lub tymczasowo. Simple = zwykle.","He plays tennis on Sundays.","He is playing tennis now.")],
  ["a1-czasy-present-continuous","a2-czasy-present-continuous-plany"],["present-continuous"]),
T("present-perfect","Present Perfect","Czas teraźniejszy dokonany","present","perfect","A2","Przeszłość, która ma związek z teraźniejszością.",
  F("have/has + trzecia forma","have/has + not + trzecia forma","Have/Has + podmiot + trzecia forma?"),
  [U("Doświadczenie","I have been to Paris twice.","Byłem w Paryżu dwa razy."),U("Skutek teraz","I have lost my keys.","Zgubiłem klucze (i nadal ich nie mam)."),U("Trwa do teraz","She has lived here since 2018.","Mieszka tu od 2018.")],
  ["ever","never","already","yet","just","since","for","so far"],
  [sc("experience","Doświadczenie","Raz lub kilka razy w życiu, nie wiadomo kiedy.",P(-0.7),P(-0.35)),
   sc("result","Skutek teraz","Zdarzenie w przeszłości, skutek widać teraz.",P(-0.2),{"kind":"result","at":0,"label":"skutek"}),
   sc("until-now","Trwa do teraz","Sytuacja zaczęła się w przeszłości i trwa.",R(-0.6,0,"od 2018"))],
  ["Z określeniem czasu zakończonego (yesterday, in 2019, last week) używamy Past Simple.","Po polsku „mieszkam tu od 5 lat” = I have lived here for five years."],
  [C("past-simple","Perfect = związek z teraz. Past Simple = zamknięta przeszłość.","I have seen that film.","I saw that film last week.")],
  ["a2-czasy-present-perfect-doswiadczenia","b1-czasy-present-perfect-vs-past-simple"],["present-perfect"]),
T("present-perfect-continuous","Present Perfect Continuous","Czas teraźniejszy dokonany ciągły","present","perfect-continuous","B1","Czynność trwa od jakiegoś czasu, nacisk na czas lub wynik świeżej czynności.",
  F("have/has been + czasownik-ing","have/has not been + czasownik-ing","Have/Has + podmiot + been + czasownik-ing?"),
  [U("Trwa od jakiegoś czasu","I have been learning English for two years.","Uczę się angielskiego od dwóch lat."),U("Świeży skutek","She is tired. She has been running.","Jest zmęczona. Biegała.")],
  ["for","since","all day","lately","recently","How long"],
  [sc("duration","Trwa od...","Zaczęło się w przeszłości i nadal trwa.",{"kind":"open-left","to":0,"label":"od dwóch lat"})],
  ["Przy czasownikach stanu zwykle Present Perfect, nie Continuous: I have known him for years."],
  [C("present-perfect","Continuous = trwanie. Simple = wynik lub liczba.","I have been writing emails all morning.","I have written ten emails.")],
  ["b1-czasy-present-perfect-continuous"],["present-perfect-continuous"]),
T("past-simple","Past Simple","Czas przeszły prosty","past","simple","A2","Zakończone zdarzenia w przeszłości.",
  F("czasownik-ed lub druga forma","did not (didn't) + forma podstawowa","Did + podmiot + forma podstawowa?"),
  [U("Zakończone zdarzenie","We visited Gdańsk last summer.","Zwiedziliśmy Gdańsk zeszłego lata."),U("Seria zdarzeń","He got up, had breakfast and left.","Wstał, zjadł śniadanie i wyszedł."),U("Dawny nawyk","I played the piano as a child.","Jako dziecko grałem na pianinie.")],
  ["yesterday","last week","in 2019","ago","when"],
  [sc("finished","Zakończone","Zdarzenie w konkretnym momencie przeszłości.",P(-0.5,"yesterday"))],
  ["Po did czasownik wraca do formy podstawowej: Did you go?, nie Did you went?"],
  [C("present-perfect","Past Simple = konkretny moment. Present Perfect = brak daty, związek z teraz.","I lost my keys yesterday.","I have lost my keys.")],
  ["a2-czasy-past-simple"],["past-simple"]),
T("past-continuous","Past Continuous","Czas przeszły ciągły","past","continuous","A2","Czynność trwająca w pewnym momencie przeszłości.",
  F("was/were + czasownik-ing","was/were not + czasownik-ing","Was/Were + podmiot + czasownik-ing?"),
  [U("Trwało w danej chwili","At eight I was having dinner.","O ósmej jadłem kolację."),U("Tło dla zdarzenia","I was walking home when it started to rain.","Szedłem do domu, kiedy zaczęło padać.")],
  ["while","when","at 8 o'clock yesterday","all evening"],
  [sc("background","Tło","Dłuższa czynność przerwana krótkim zdarzeniem.",R(-0.8,-0.2,"was walking"),{"kind":"marker","at":-0.5,"label":"it rained"})],
  ["Po polsku nie odróżniamy „szedłem” od „poszedłem”, a po angielsku tak: was walking / walked."],
  [C("past-simple","Continuous = trwało. Simple = zdarzenie, które nastąpiło.","I was reading when he called.","I read the book yesterday.")],
  ["a2-czasy-past-continuous"],["past-continuous"]),
T("past-perfect","Past Perfect","Czas zaprzeszły","past","perfect","B1","Zdarzenie wcześniejsze niż inne zdarzenie w przeszłości.",
  F("had + trzecia forma","had not (hadn't) + trzecia forma","Had + podmiot + trzecia forma?"),
  [U("Wcześniej niż inne zdarzenie","When I arrived, the film had started.","Kiedy przyjechałem, film już się zaczął.")],
  ["already","by the time","before","after","when"],
  [sc("before","Wcześniej","Najpierw jedno zdarzenie, potem drugie, oba w przeszłości.",P(-0.7,"film started"),P(-0.3,"I arrived"))],
  ["Nie używamy go, jeśli kolejność jest oczywista i opisujemy zdarzenia po kolei."],
  [C("past-simple","Past Perfect = wcześniejsze. Past Simple = późniejsze lub kolejne.","He had left when I arrived.","He left and I arrived.")],
  ["b1-czasy-past-perfect"],["past-perfect"]),
T("past-perfect-continuous","Past Perfect Continuous","Czas zaprzeszły ciągły","past","perfect-continuous","B2","Czynność trwająca przez pewien czas przed momentem w przeszłości.",
  F("had been + czasownik-ing","had not been + czasownik-ing","Had + podmiot + been + czasownik-ing?"),
  [U("Trwało przed momentem w przeszłości","She was tired because she had been working all day.","Była zmęczona, bo pracowała cały dzień.")],
  ["for","since","all day","before"],
  [sc("duration","Trwało przed","Czynność trwała do momentu w przeszłości.",R(-0.9,-0.3,"had been working"),{"kind":"marker","at":-0.3,"label":"she arrived"})],
  ["Mylony z Past Continuous: tu liczy się to, co trwało przed innym momentem."],
  [C("past-continuous","Perfect Continuous = trwało przed momentem. Past Continuous = trwało w momencie.","I had been waiting for an hour when she came.","I was waiting when she came.")],
  ["b2-czasy-past-perfect-continuous"],["past-perfect-continuous"]),
T("future-will","will","Przyszłość z will","future","simple","A2","Decyzje w chwili mówienia, przewidywania, obietnice.",
  F("will + forma podstawowa","will not (won't) + forma podstawowa","Will + podmiot + forma podstawowa?"),
  [U("Decyzja w chwili mówienia","I'll have the soup.","Wezmę zupę."),U("Przewidywanie (opinia)","I think it will rain.","Myślę, że będzie padać."),U("Obietnica","I will help you.","Pomogę ci.")],
  ["I think","probably","maybe","tomorrow","soon"],
  [sc("decision","Decyzja","Decyzja podjęta w chwili mówienia.",P(0.4,"zrobię"))],
  ["Nie używamy will po when/if/as soon as: If it rains, we stay home."],
  [C("going-to","Will = spontaniczna decyzja. Going to = wcześniejszy plan.","I'll call him now.","I'm going to call him tonight.")],
  ["a2-czasy-future-will"],["will"]),
T("going-to","be going to","Przyszłość z be going to","future","simple","A1","Plany i przewidywania oparte na dowodach.",
  F("am/is/are going to + forma podstawowa","am/is/are not going to + forma podstawowa","Am/Is/Are + podmiot + going to + forma podstawowa?"),
  [U("Plan","I'm going to learn German.","Zamierzam uczyć się niemieckiego."),U("Przewidywanie z dowodami","Look at the sky! It's going to rain.","Spójrz na niebo! Będzie padać.")],
  ["tomorrow","next week","Look!","soon"],
  [sc("plan","Plan","Zamiar uformowany przed chwilą mówienia.",P(0.5,"plan"))],
  ["Nie mylić z przemieszczaniem się: I'm going to school (idę do szkoły)."],
  [C("future-will","Going to = plan lub dowody. Will = spontaniczna decyzja lub opinia.","We're going to travel in July.","I'll answer the phone.")],
  ["a1-czasy-going-to","b1-czasy-wybor-formy-przyszlej"],["going-to"]),
T("present-continuous-future","Present Continuous (przyszłość)","Present Continuous jako plan","future","continuous","A2","Ustalone plany z terminem.",
  F("am/is/are + czasownik-ing + czas przyszły","am/is/are not + czasownik-ing","Am/Is/Are + podmiot + czasownik-ing?"),
  [U("Umówione spotkanie","I'm seeing the dentist on Friday.","W piątek idę do dentysty.")],
  ["tonight","on Friday","next week"],
  [sc("arranged","Umówione","Plan z terminem i ustaleniami.",P(0.6,"piątek"))],
  ["Potrzebne jest określenie czasu lub kontekst: samo I'm meeting him brzmi jak teraz."],
  [C("going-to","Present Continuous = ustalone szczegóły. Going to = zamiar.","I'm flying to Rome on Monday.","I'm going to travel more.")],
  ["a2-czasy-present-continuous-plany"],["present-continuous"]),
T("present-simple-future","Present Simple (przyszłość)","Present Simple jako rozkład","future","simple","A2","Rozkłady, programy i oficjalne harmonogramy.",
  F("Present Simple + czas przyszły","do not / does not + forma podstawowa","Do/Does + podmiot + forma podstawowa?"),
  [U("Rozkład jazdy","The bus leaves at seven.","Autobus odjeżdża o siódmej.")],
  ["timetable","schedule","at 7 a.m.","tomorrow"],
  [sc("schedule","Rozkład","Zdarzenie wynikające z harmonogramu.",P(0.5,"7:00"))],
  ["Tylko dla rozkładów i oficjalnych planów, nie dla prywatnych zamiarów."],
  [C("present-continuous-future","Simple = rozkład. Continuous = osobiste ustalenie.","The film starts at eight.","We're seeing the film tonight.")],
  ["b1-czasy-wybor-formy-przyszlej"],["present-simple"]),
T("future-continuous","Future Continuous","Przyszłość ciągła","future","continuous","B2","Czynność w toku w przyszłym momencie.",
  F("will be + czasownik-ing","will not be + czasownik-ing","Will + podmiot + be + czasownik-ing?"),
  [U("Trwa w przyszłym momencie","At nine tomorrow I will be flying to Rome.","Jutro o dziewiątej będę lecieć do Rzymu.")],
  ["at this time tomorrow","this time next week"],
  [sc("in-progress","W toku","Czynność trwa w przyszłym punkcie.",R(0.35,0.7,"will be flying"),{"kind":"marker","at":0.5,"label":"9:00"})],
  ["Nie mylić z will: will fly = decyzja, will be flying = trwanie."],
  [C("future-will","Continuous = w toku. Will = zdarzenie.","I'll be working at six.","I'll finish at six.")],
  ["b2-czasy-future-continuous-perfect"],["future-continuous"]),
T("future-perfect","Future Perfect","Przyszłość dokonana","future","perfect","B2","Czynność zakończona przed przyszłym momentem.",
  F("will have + trzecia forma","will not have + trzecia forma","Will + podmiot + have + trzecia forma?"),
  [U("Zakończone do jutra","By Friday I will have finished the project.","Do piątku skończę projekt.")],
  ["by","by the time","by then","before"],
  [sc("done-by","Zakończone do","Najpóźniej do wskazanego momentu w przyszłości.",P(0.3,"koniec"),{"kind":"marker","at":0.6,"label":"piątek"})],
  ["W polskim „do piątku skończę” = angielskie by Friday, nie until."],
  [C("future-continuous","Perfect = zakończone do. Continuous = trwa wtedy.","By nine I will have left.","At nine I will be leaving.")],
  ["b2-czasy-future-continuous-perfect"],["future-perfect"]),
]
w('lab-czasow.json',{"version":1,"tenses":tenses})

N={}
def node(i,q,help_,opts): N[i]={"question":q,"help":help_,"options":opts}
node("start","Kiedy dzieje się ta czynność?","Wybierz moment, o którym mówisz.",[
 {"label":"Teraz lub zwykle","next":"present"},
 {"label":"W przeszłości","next":"past"},
 {"label":"W przyszłości","next":"future"}])
node("present","Co chcesz powiedzieć?","",[
 {"label":"Zwykle, regularnie lub fakt","result":["present-simple"],"why":"Nawyk, rutyna, prawdy ogólne."},
 {"label":"Dzieje się dokładnie teraz","result":["present-continuous"],"why":"Czynność w toku w chwili mówienia."},
 {"label":"Zaczęło się w przeszłości i ma związek z teraz","next":"pp"}])
node("pp","Co jest ważniejsze?","",[
 {"label":"Doświadczenie lub skutek (ważne co, nie ile)","result":["present-perfect"],"why":"Doświadczenie lub skutek teraz."},
 {"label":"Jak długo to trwa (ważny czas trwania)","result":["present-perfect","present-perfect-continuous"],"why":"For/since: Perfect dla stanów, Perfect Continuous dla czynności."}])
node("past","Jaki to rodzaj zdarzenia?","",[
 {"label":"Zakończone, konkretny moment","result":["past-simple"],"why":"Zamknięte zdarzenie w przeszłości."},
 {"label":"Trwało w pewnym momencie lub w tle","result":["past-continuous"],"why":"Czynność w toku w przeszłości."},
 {"label":"Zdarzyło się wcześniej niż inne zdarzenie w przeszłości","next":"pastbefore"}])
node("pastbefore","Czy liczy się, że czynność trwała?","",[
 {"label":"Nie, liczy się, że była zakończona wcześniej","result":["past-perfect"],"why":"Wcześniejsze zdarzenie."},
 {"label":"Tak, trwała przez jakiś czas przed tamtym momentem","result":["past-perfect-continuous"],"why":"Czas trwania przed momentem w przeszłości."}])
node("future","Jaki to rodzaj przyszłości?","",[
 {"label":"Decyzja w chwili mówienia lub opinia","result":["future-will"],"why":"Will dla spontanicznych decyzji i przewidywań."},
 {"label":"Plan lub przewidywanie z dowodami","result":["going-to"],"why":"Be going to dla zamiarów i dowodów."},
 {"label":"Umówione spotkanie","result":["present-continuous-future"],"why":"Ustalenia z terminem."},
 {"label":"Rozkład lub harmonogram","result":["present-simple-future"],"why":"Oficjalny rozkład."},
 {"label":"W toku w przyszłym momencie lub zakończone do niego","next":"futureadv"}])
node("futureadv","Co dokładnie?","",[
 {"label":"Będzie trwać w tym momencie","result":["future-continuous"],"why":"Czynność w toku w przyszłości."},
 {"label":"Będzie zakończone do tego momentu","result":["future-perfect"],"why":"Zakończone przed przyszłym punktem."}])
w('lab-wybor-czasu.json',{"version":1,"start":"start","nodes":N})

w('mixes.json',{"version":1,"mixes":[
 {"id":"mix-czasy-a1-a2","title":"Czasy A1–A2","description":"Present Simple, Continuous, Past Simple i Present Perfect pomieszane.","level":"A1-A2","count":15,"mode":"learn",
  "topics":["a1-czasy-present-simple","a1-czasy-present-continuous","a2-czasy-past-simple","a2-czasy-present-perfect-doswiadczenia"]},
 {"id":"mix-czasy-b1","title":"Czasy B1","description":"Present Perfect kontra Past Simple oraz wybór formy przyszłej.","level":"B1","count":15,"mode":"learn",
  "topics":["b1-czasy-present-perfect-vs-past-simple","b1-czasy-wybor-formy-przyszlej"]},
 {"id":"mix-znajdz-blad","title":"Znajdź błąd – czasy","description":"Same zdania z błędem do poprawienia.","level":"A1-B1","count":10,"mode":"learn","types":["find-error"],
  "topics":["a1-czasy-present-simple","a2-czasy-past-simple","b1-czasy-present-perfect-vs-past-simple"]}]})

w('egzaminy-manifest.json',{"version":1,"exams":[
 {"id":"egzamin-osmoklasisty","code":"E8","label":"Egzamin ósmoklasisty","route":"/egzamin-osmoklasisty","status":"active","accent":"#0e7c86","accent2":"#f5b800","suggestedDate":"2027-05-12","order":1,
  "description":"Przygotowanie do egzaminu z angielskiego po szkole podstawowej, poziom A2."},
 {"id":"matura-podstawowa","code":"MP","label":"Matura podstawowa","route":"/matura-podstawowa","status":"soon","order":2,"soonDescription":"Format arkusza, typy zadań i ćwiczenia pod maturę na poziomie podstawowym."},
 {"id":"matura-rozszerzona","code":"MR","label":"Matura rozszerzona","route":"/matura-rozszerzona","status":"soon","order":3,"soonDescription":"Rozszerzone zadania, rozprawki i ćwiczenia na poziom B2+."},
 {"id":"certyfikat-b2","code":"B2","label":"Certyfikat B2 (Cambridge)","route":"/certyfikat-b2","status":"soon","order":4,"soonDescription":"Przygotowanie do Cambridge B2 First: Reading, Use of English, Writing i Listening."},
 {"id":"certyfikat-c1","code":"C1","label":"Certyfikat C1","route":"/certyfikat-c1","status":"active","order":5,"existing":True,"description":"Cambridge C1 Advanced. Istniejący moduł, bez zmian."}]})
