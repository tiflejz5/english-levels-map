from common import *
F="matura-podstawowa"
# ---- SŁUCHANIE
L=[("A: Hi, I'd like to return this jumper. It's too small.\nB: Do you have the receipt?\nA: Yes, here it is. I'd like a bigger size, not a refund.","What does the customer want?",["A refund","A bigger jumper","A different colour"],1,"Chce większy rozmiar, nie zwrot pieniędzy."),
 ("Welcome to the city museum. The guided tour starts at half past ten and lasts about an hour. Tickets for students cost five pounds. You can leave your bags in the cloakroom for free.","How long does the tour last?",["About an hour","Half an hour","Two hours"],0,"The tour lasts about an hour."),
 ("A: Are you going to the concert on Friday?\nB: I wanted to, but my cousin is visiting us, so I can't.\nA: What a pity! I'll send you a recording.","Why can't the boy go to the concert?",["He has an exam","He is ill","His cousin is visiting"],2,"Odwiedza go kuzyn."),
 ("A: The train to Gdańsk is delayed by twenty minutes.\nB: So it leaves at ten past five, not ten to five?\nA: No, it was supposed to leave at ten to five, now it leaves at ten past five.","When does the train leave now?",["At ten to five","At ten past five","At twenty past five"],1,"Nowa godzina: 5:10 (ten past five)."),
 ("Hi, it's Maria. I'm calling about the flat you advertised. I'd like to see it on Saturday morning if possible. Please call me back on 555 0123. Thanks!","Why is Maria calling?",["To rent a flat","To sell a flat","To cancel a meeting"],0,"Dzwoni w sprawie wynajmu ogłoszonego mieszkania."),
 ("A: I think I'll take the bus to school from now on.\nB: Why? You always cycled.\nA: It's raining so often these days, and my bike needs repairing.","Why will the girl take the bus?",["She is afraid of cars","The weather is bad and her bike is broken","She lives far away"],1,"Częsty deszcz i rower do naprawy.")]
l=[mc("listening",q,o,c,e,notes(c,*["Nie wynika z nagrania."]*(len(o)-1)),script=sc,maxPlays=2) for sc,q,o,c,e in L]
mkset(F,"mp-sluchanie-1","B1","Słuchanie – 6 krótkich nagrań (syntezator mowy)",l,"Posłuchaj każdego nagrania dwa razy i wybierz odpowiedź.",None,"exam")

# ---- CZYTANIE 1
P1="""**Why I stopped using my phone before bed**

Three months ago I noticed that I was always tired in the morning. I slept about seven hours, but I never felt rested. A friend told me to stop looking at my phone in bed, and I decided to try it for two weeks.

The first days were difficult. I kept reaching for the phone to check messages, and I felt a bit lonely without my usual videos. After a week, things changed. I fell asleep faster, and I started to read paper books again. Last Sunday I finished a novel I had begun in spring!

Now I charge my phone in the kitchen and use a normal alarm clock. I still check messages in the evening, but I put the phone away an hour before sleep. My marks at school haven't changed yet, but I have more energy for sport, and my mum says I'm much more cheerful.

If you want to try this, my advice is: start small. Begin with thirty minutes without a screen and make it longer every few days."""
r1=[mc("reading","Why did the author decide to stop using the phone in bed?",["A teacher asked him to.","He was always tired in the morning.","His phone was broken.","He wanted to read more."],1,"Zaczęło się od ciągłego zmęczenia rano.",notes(1,"Nauczyciel nie jest wspomniany.","Telefon nie był zepsuty.","Czytanie to skutek, nie powód.")),
 mc("reading","What happened after a week?",["He felt lonelier.","He slept less.","He fell asleep faster.","He bought a new phone."],2,"After a week he fell asleep faster.",notes(2,"Samotność dotyczyła pierwszych dni.","Nic o krótszym śnie.","Nic o nowym telefonie.")),
 mc("reading","Where does the author charge his phone now?",["In his bedroom","In the kitchen","At school","In the living room"],1,"Charges it in the kitchen.",notes(1,"Nie.","Nie.","Nie.")),
 mc("reading","What has NOT changed yet?",["His energy for sport","His mum's opinion","His marks at school","His reading habits"],2,"Marks at school haven't changed yet.",notes(2,"Zmieniło się.","Zmieniło się.","Zmieniło się.")),
 mc("reading","What advice does the author give?",["Throw away your phone.","Start with a short time without a screen.","Read only paper books.","Go to bed earlier."],1,"Start small: thirty minutes without a screen.",notes(1,"Nie radzi tego.","Nie radzi tego.","Nie radzi tego."))]
mkset(F,"mp-czytanie-1","B1","Czytanie – wpis na blogu o telefonie",r1,"Przeczytaj wpis i odpowiedz na 5 pytań.",P1)

# ---- CZYTANIE 2 (T/F/NS)
P2="""**Summer language camp in Brighton**

Our two-week camp is for students aged 14–17. Classes take place from Monday to Friday, from 9:00 to 13:00. In the afternoons there are workshops, sports and trips. On Saturdays students visit places such as the beach or museums, and on Sundays they can rest or meet their host families.

All participants live with English-speaking families. Each family provides breakfast and dinner, and lunch is organised by the school. The price is £1,250, which includes lessons, accommodation, food and one-day trip to London. Flights are not included.

To apply, send us an email with your age and a short description of your English level. A short online test is not obligatory but recommended. Applications close on 15 April."""
T=[("Classes take place in the afternoon.",1),("Students live with host families.",0),("The price includes a flight.",1),("The school organises lunch.",0),("A language test is compulsory.",1),("Students can visit London.",0)]
# 0 = True, 1 = False ; ostatnie: sprawdz
opts=["True","False","Not given"]
r2=[]
ans=[(1,"Zajęcia są rano, 9:00–13:00."),(0,"All participants live with English-speaking families."),(1,"Flights are not included."),(0,"Lunch is organised by the school."),(1,"Test nie jest obowiązkowy: not obligatory."),(0,"One-day trip to London w cenie.")]
for (s,_),(c,e) in zip(T,ans):
    r2.append(mc("reading",s,opts,c if c in(0,1) else 2,e,None,fixedOrder=True))
r2.append(mc("reading","The camp is organised in July.",opts,2,"Tekst nie podaje miesiąca obozu.",None,fixedOrder=True))
mkset(F,"mp-czytanie-2","B1","Czytanie – prawda, fałsz, brak informacji",r2,"Przeczytaj ogłoszenie i zdecyduj: True, False lub Not given.",P2)

# ---- MINIDIALOGI
D=[("A: Would you mind closing the window? It's a bit cold.\nB: ___",["Not at all.","Yes, I would.","You're welcome.","It's cold."],0,"Would you mind...? Zgoda: Not at all."),
 ("A: I'm afraid I can't come to your party.\nB: ___",["That's a pity.","Good idea.","Congratulations.","See you tomorrow."],0,"Na odmowę reagujemy współczuciem: That's a pity."),
 ("A: How about going to the cinema tonight?\nB: ___",["Sorry, I'm busy.","Yes, I have.","I can't stand it.","It was good."],0,"Propozycja: odmowa Sorry, I'm busy."),
 ("A: Excuse me, could you tell me how to get to the library?\nB: ___",["Go straight and turn left.","It was open yesterday.","I don't read much.","Yes, I can."],0,"Wskazanie drogi."),
 ("A: I've passed my driving test!\nB: ___",["Congratulations!","What a pity!","Never mind.","Take care."],0,"Gratulacje."),
 ("A: Do you think I should apply for this job?\nB: ___",["Yes, you've got nothing to lose.","Yes, it was.","No, it doesn't.","I don't mind the job."],0,"Udzielenie rady.")]
mkset(F,"mp-minidialogi-1","B1","Mini-dialogi – reakcje",[mc("function",q,o,c,e,notes(c,*["Nie pasuje do sytuacji."]*(len(o)-1))) for q,o,c,e in D],"Wybierz właściwą reakcję.")

# ---- CLOZE (C1-engine)
w(F+"/cwiczenia/mp-srodki-cloze-1.json",{"id":"mp-srodki-cloze-1","part":1,"type":"multiple-choice-cloze","title":"A day at the beach","instructions":"Wybierz słowo (A, B, C lub D), które najlepiej pasuje do luki. Każda luka to 1 punkt.","maxScore":8,
 "text":"Last summer we {{1}} a trip to the seaside. We got up early because the train {{2}} at six. When we arrived, the weather was lovely, so we {{3}} a swim at once. After lunch my brother {{4}} a sandcastle while I was reading. {{5}} the afternoon it started to rain, and we had to look for shelter. We spent two hours in a small café {{6}} hot chocolate. It was not the day we had planned, but we {{7}} a great time. I hope we can {{8}} there again next year.",
 "gaps":[{"n":1,"options":{"A":"did","B":"took","C":"went","D":"made"},"answer":"B","explanation":"take a trip = wybrać się na wycieczkę."},
 {"n":2,"options":{"A":"left","B":"was leaving","C":"leaves","D":"has left"},"answer":"A","explanation":"Past Simple: pociąg odjeżdżał o szóstej (left)."},
 {"n":3,"options":{"A":"had","B":"made","C":"did","D":"got"},"answer":"A","explanation":"have a swim = popływać."},
 {"n":4,"options":{"A":"built","B":"builded","C":"was built","D":"has built"},"answer":"A","explanation":"Past Simple, nieregularny: build, built."},
 {"n":5,"options":{"A":"At","B":"In","C":"On","D":"By"},"answer":"B","explanation":"in the afternoon."},
 {"n":6,"options":{"A":"drink","B":"drinking","C":"drunk","D":"to drink"},"answer":"B","explanation":"Zwrot z -ing opisujący czynność: drinking hot chocolate."},
 {"n":7,"options":{"A":"had","B":"made","C":"took","D":"gave"},"answer":"A","explanation":"have a great time = świetnie się bawić."},
 {"n":8,"options":{"A":"going","B":"go","C":"to go","D":"went"},"answer":"B","explanation":"Po can czasownik w formie podstawowej: can go."}]})

# ---- SŁOWOTWÓRSTWO
w(F+"/cwiczenia/mp-srodki-slowotworstwo-1.json",{"id":"mp-srodki-slowotworstwo-1","part":3,"type":"word-formation","title":"A volunteer weekend","instructions":"Utwórz od słowa w nawiasie słowo, które pasuje do luki. Uważaj na przedrostki, liczbę mnogą i pisownię. Każda luka to 1 punkt.","maxScore":8,
 "text":"Last weekend I took part in a {{1}} project in our town. It was a very {{2}} experience for me. At first I felt a bit {{3}} because I didn't know anyone. However, the other volunteers were {{4}} and soon we became friends. We cleaned the river bank {{5}} and collected a lot of rubbish left by visitors. The organisers thanked us for our {{6}} and promised to send each of us a small {{7}}. I'm sure I will join them again, because I think {{8}} others is important.",
 "gaps":[{"n":1,"stem":"VOLUNTEER","accept":["VOLUNTARY"],"explanation":"Przymiotnik: voluntary project."},
 {"n":2,"stem":"REWARD","accept":["REWARDING"],"explanation":"Przymiotnik: rewarding experience."},
 {"n":3,"stem":"COMFORT","accept":["UNCOMFORTABLE"],"explanation":"Przeczenie przymiotnika: comfort → uncomfortable."},
 {"n":4,"stem":"FRIEND","accept":["FRIENDLY"],"explanation":"Przymiotnik: friendly."},
 {"n":5,"stem":"CARE","accept":["CAREFULLY"],"explanation":"Przysłówek: carefully."},
 {"n":6,"stem":"CONTRIBUTE","accept":["CONTRIBUTION"],"explanation":"Rzeczownik po our: contribution."},
 {"n":7,"stem":"CERTIFY","accept":["CERTIFICATE"],"explanation":"Rzeczownik: a small certificate."},
 {"n":8,"stem":"HELP","accept":["HELPING"],"explanation":"Rzeczownik odczasownikowy jako podmiot: helping others is important."}]})

# ---- TRANSFORMACJE (short-answer)
TR=[("I haven't seen him for two years.","I last ___ two years ago.",["saw him"],"Present Perfect → Past Simple: I last saw him two years ago."),
 ("They built this house in 1990.","This house ___ in 1990.",["was built"],"Strona bierna Past Simple."),
 ("'Where do you live?' she asked me.","She asked me where ___ .",["I lived"],"Mowa zależna: where I lived."),
 ("My brother is taller than I am.","I am ___ my brother.",["not as tall as","not so tall as"],"Porównanie: not as tall as."),
 ("It's a pity I didn't study more.","I wish I ___ more.",["had studied"],"I wish + Past Perfect."),
 ("Don't forget to call me.","Remember ___ me.",["to call"],"remember to + bezokolicznik."),
 ("She started playing the piano when she was six.","She has been playing the piano ___ she was six.",["since"],"since + moment."),
 ("It's too cold to swim.","It isn't ___ to swim.",["warm enough"],"too + adj ↔ not + adj-opposite + enough.")]
mkset(F,"mp-srodki-transformacje-1","B1","Transformacje – dokończ zdanie",[sa(a,b,c,d) for a,b,c,d in TR],"Uzupełnij lukę tak, żeby zdanie znaczyło to samo. Pisownia musi być poprawna.")

# ---- TŁUMACZENIE
TL=[("Nie mogę przyjść, bo muszę pracować.","I can't come because I ___ work.",["have to","must"],"have to/must."),
 ("Kupiłem bilety dwa dni temu.","I bought the tickets two days ___.",["ago"],"ago."),
 ("Mój brat uczy się angielskiego od pięciu lat.","My brother has been learning English ___ five years.",["for"],"for + okres."),
 ("Czy mógłbyś mi pomóc?","___ you help me?",["Could","Can","Would"],"Uprzejma prośba: Could."),
 ("Jeśli jutro będzie padać, zostaniemy w domu.","If it ___ tomorrow, we will stay at home.",["rains"],"I okres warunkowy: if + Present Simple."),
 ("Nie lubię, gdy ktoś się spóźnia.","I don't like it when people are ___.",["late"],"be late.")]
mkset(F,"mp-srodki-tlumaczenie-1","B1","Tłumaczenie fragmentów",[sa(a,b,c,d) for a,b,c,d in TL],"Dokończ zdanie po angielsku.")

# ---- PISANIE
tasks=[]
def tk(i,g,t,opening,sit,bul,m):
    tasks.append({"id":i,"genre":g,"part":1,"title":t,"opening":opening,"prompt":sit+"\n\nW tekście:\n"+"\n".join("• "+b for b in bul),"bullets":bul,"points":12,
     "genreChecklist":["Czy odniosłem/am się do wszystkich 4 punktów?","Czy mam 100–150 wyrazów?","Czy mam wstęp i zakończenie?"],"model":m})
tk("email-exchange","email","E-mail do kolegi z zagranicy","Hi Ben,","Piszesz e-mail do kolegi z Anglii, który przyjedzie do Ciebie na wymianę szkolną.",
 ["napisz, jak spędzicie pierwszy dzień","poinformuj, jaką pogodę zwykle ma Polska w tym miesiącu","zapytaj o jego dietę lub alergie","zaproponuj miejsce, które chcesz mu pokazać"],
 "Hi Ben,\nThanks for your last message. I'm really happy that you are coming to Poland! On your first day we will have lunch at my house and then I'll show you around our school. You can meet my friends there. In October the weather here is usually cool and sometimes rainy, so please bring a warm jacket and an umbrella.\nCould you tell me if you are on a special diet or if you have any allergies? My mum is planning the menu and she wants to be sure that you can eat everything. I'd also like to take you to the old town on Saturday because it is beautiful and there are many cafés there. I'm sure you will love it.\nWrite back soon,\nXYZ")
tk("blog-trip","blog","Wpis na blogu – wycieczka","Hello everyone!","Prowadzisz bloga o podróżach. Napisz relację z niedawnej wycieczki.",
 ["napisz, dokąd pojechałeś/aś i z kim","opisz, co najbardziej Ci się podobało","wspomnij o problemie, który się pojawił","poradź czytelnikom, czy warto tam jechać"],
 "Hello everyone!\nLast weekend I went to Kraków with my class. We travelled by train, and it took about three hours. The best part of the trip was the visit to Wawel Castle, because the view of the river was fantastic and our guide told us many interesting stories.\nUnfortunately, there was a problem on Sunday. Our train was delayed and we waited at the station for an hour, so we were tired when we got home. However, it did not spoil the whole trip.\nI think you should definitely go to Kraków if you have time. Book your tickets early and wear comfortable shoes, because you will walk a lot. See you next time!\nXYZ")
tk("forum-sport","forum","Wpis na forum – sport","Hi everyone,","Na forum młodzieżowym ktoś pyta o pomysły na sport po szkole. Napisz odpowiedź.",
 ["napisz, jaki sport uprawiasz i jak często","wyjaśnij, dlaczego go lubisz","opowiedz o ostatnim meczu lub treningu","zaproponuj, czy ta osoba może do Ciebie dołączyć"],
 "Hi everyone,\nI saw your question about sport after school and I'd like to share my experience. I play basketball twice a week with my school team. We train on Tuesdays and Thursdays and we have a match every second Saturday.\nI love this sport because it is fast and I can spend time with my friends. It also helps me forget about homework and stress. Last Saturday we played against another school and we won by four points! I scored six points myself, so I was really proud.\nIf you want to try it, you can join us next Thursday at 5 p.m. in the school gym. We always need new players, and nobody will laugh at you if you make mistakes. Let me know!\nXYZ")
tk("email-complaint","email","E-mail – reklamacja","Dear Sir or Madam,","Kupiłeś/aś w internetowym sklepie słuchawki, które nie działają. Napisz e-mail do sklepu.",
 ["napisz, co kupiłeś/aś i kiedy","opisz, na czym polega problem","zapytaj, czy możesz dostać zwrot pieniędzy lub nowy produkt","poproś o szybką odpowiedź"],
 "Dear Sir or Madam,\nI'm writing to complain about a product that I bought from your shop. On 3 October I ordered a pair of wireless headphones, and they arrived two days later.\nUnfortunately, the left headphone does not work at all, and the sound in the right one is very quiet. I have charged them several times, but nothing has changed. I have attached a photo of the product and a copy of the receipt.\nCould you tell me whether I can have my money back or get a new pair? I would prefer a new pair, but I will accept a refund, too. I would be grateful if you could answer as soon as possible, because I need the headphones for school.\nYours faithfully,\nXYZ")
tk("blog-hobby","blog","Wpis na blogu – hobby","Hi, readers!","Prowadzisz bloga o czasie wolnym. Napisz o swoim hobby.",
 ["napisz, czym się interesujesz","wyjaśnij, od kiedy to robisz","opowiedz o swoim największym sukcesie","poradź, jak zacząć"],
 "Hi, readers!\nToday I want to write about my hobby, which is photography. I take pictures of nature, mostly in the forest near my house. I started three years ago when my dad gave me his old camera.\nMy biggest success was last spring, when my photo of a fox won a school competition. I was very surprised, because I didn't think it was good enough. The prize was a small tripod, which I use every day now.\nIf you would like to start, you don't need an expensive camera. Your phone is enough. Go for a walk, look around and take pictures of things that you like. After some time you will notice small details that you have never seen before. Good luck!\nXYZ")
tk("email-invite","email","E-mail – zaproszenie","Hi Anna,","Organizujesz wspólne wyjście do kina dla klasy. Napisz e-mail do koleżanki.",
 ["napisz, na jaki film chcesz iść i kiedy","wyjaśnij, dlaczego wybrałeś/aś ten film","zapytaj, czy ma jakieś preferencje co do miejsca","poproś o odpowiedź do piątku"],
 "Hi Anna,\nI hope you are well. I'm writing because our class is going to the cinema next Saturday at 6 p.m., and I'd love you to come with us. We want to see the new science fiction film, which has great reviews.\nI chose this film because many people in our class like this genre and the story is supposed to be exciting. I've also heard that the special effects are amazing.\nWould you prefer to sit in the front or at the back? And do you want to meet in front of the cinema or go there together from school? Please let me know by Friday so that I can book the tickets.\nSee you soon,\nXYZ")
w(F+"/trening/pisanie.json",{"id":"trening-pisanie","timeMinutes":25,"wordRange":[100,150],"targetRange":[110,140],"warnBelow":80,
 "rubric":[{"id":"tresc","label":"Treść","max":5},{"id":"spojnosc","label":"Spójność i logika","max":2},{"id":"zakres","label":"Zakres środków językowych","max":3},{"id":"poprawnosc","label":"Poprawność środków językowych","max":2}],
 "genericChecklist":["Czy odniosłem/am się do wszystkich 4 punktów?","Czy mam 100–150 wyrazów?","Czy zakończyłem/am tekst pożegnaniem?","Czy sprawdziłem/am pisownię i czasy?"],"tasks":tasks})

# ---- MANIFEST
sets=lambda *a:[{"id":i,"file":f"cwiczenia/{i}.json","label":l,"maxScore":m} for i,l,m in a]
w(F+"/manifest.json",{"id":"matura-podstawowa","label":"Matura podstawowa","title":"Matura podstawowa z angielskiego","route":"/matura-podstawowa",
 "sections":[
 {"id":"start","label":"Start","pages":[{"id":"przeglad","file":"strony/przeglad.md","label":"Przegląd egzaminu"},{"id":"plan-powtorki","file":"strony/plan-powtorki.md","label":"Plan powtórki"}]},
 {"id":"czesci","label":"Części egzaminu","pages":[
  {"id":"sluchanie","file":"strony/sluchanie.md","label":"Słuchanie"},{"id":"czytanie","file":"strony/czytanie.md","label":"Czytanie"},
  {"id":"srodki-jezykowe","file":"strony/srodki-jezykowe.md","label":"Środki językowe"},{"id":"wypowiedz-pisemna","file":"strony/wypowiedz-pisemna.md","label":"Wypowiedź pisemna"},
  {"id":"matura-ustna","file":"strony/matura-ustna.md","label":"Matura ustna"}]},
 {"id":"przygotowanie","label":"Przygotowanie","pages":[
  {"id":"gramatyka-pod-egzamin","file":"strony/gramatyka-pod-egzamin.md","label":"Gramatyka pod egzamin"},
  {"id":"slownictwo-tematyczne","file":"strony/slownictwo-tematyczne.md","label":"Słownictwo tematyczne"},
  {"id":"dzien-egzaminu","file":"strony/dzien-egzaminu.md","label":"Dzień egzaminu"}]},
 {"id":"cwiczenia","label":"Ćwiczenia","exerciseGroups":[
  {"part":"sluchanie","label":"Słuchanie","sets":sets(("mp-sluchanie-1","6 nagrań",6))},
  {"part":"czytanie","label":"Czytanie","sets":sets(("mp-czytanie-1","Blog o telefonie",5),("mp-czytanie-2","Prawda, fałsz, brak informacji",7))},
  {"part":"srodki","label":"Środki językowe","sets":sets(("mp-minidialogi-1","Mini-dialogi",6),("mp-srodki-cloze-1","Luki: wybór",8),("mp-srodki-slowotworstwo-1","Słowotwórstwo",8),("mp-srodki-transformacje-1","Transformacje",8),("mp-srodki-tlumaczenie-1","Tłumaczenie fragmentów",6))}]},
 {"id":"trening","label":"Trener pisania","trainer":{"id":"trening-pisanie","file":"trening/pisanie.json","label":"Wypowiedź pisemna"}}],
 "links":[{"label":"Informator CKE","url":"https://cke.gov.pl"}]})
w(F+"/powiazania.json",{"id":"powiazania-mp","description":"Ramka „Na maturze podstawowej” na stronach tematów","links":[
 {"itemId":"b1-czasy-present-perfect-vs-past-simple","examParts":["Środki językowe","Wypowiedź pisemna"],"note":"Wybór między Present Perfect a Past Simple wraca w lukach i transformacjach.","exercises":["mp-srodki-transformacje-1","mp-srodki-cloze-1"]},
 {"itemId":"b1-gramatyka-strona-bierna","examParts":["Środki językowe"],"note":"Strona bierna to typowa transformacja.","exercises":["mp-srodki-transformacje-1"]},
 {"itemId":"b1-gramatyka-mowa-zalezna","examParts":["Środki językowe"],"note":"Mowa zależna w transformacjach.","exercises":["mp-srodki-transformacje-1"]},
 {"itemId":"b1-gramatyka-conditionals-0-1-2","examParts":["Środki językowe","Wypowiedź pisemna"],"note":"Okresy warunkowe w lukach i rozwinięciu tekstu.","exercises":["mp-srodki-tlumaczenie-1"]},
 {"itemId":"b1-funkcje-rady","examParts":["Środki językowe","Matura ustna","Wypowiedź pisemna"],"note":"Rady wracają w mini-dialogach, odpowiedziach ustnych i ostatnim punkcie tekstu.","exercises":["mp-minidialogi-1"]},
 {"itemId":"b1-funkcje-skargi","examParts":["Wypowiedź pisemna"],"note":"E-mail reklamacyjny.","exercises":[]},
 {"itemId":"b1-funkcje-strategie-ratunkowe","examParts":["Matura ustna"],"note":"Gdy brakuje słowa na ustnej.","exercises":[]},
 {"itemId":"b1-slownictwo","examParts":["Czytanie","Słuchanie","Wypowiedź pisemna"],"note":"Słownictwo tematyczne B1.","exercises":[]}]})
