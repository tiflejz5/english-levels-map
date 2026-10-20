import json, os
R=os.path.join(os.path.dirname(__file__),'..','egzamin-osmoklasisty')
def w(p,o):
    p=os.path.join(R,p); os.makedirs(os.path.dirname(p),exist_ok=True)
    json.dump(o,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
def mc(kind,prompt,opts,c,expl,notes=None,**kw):
    d={"type":"multiple-choice","kind":kind,"prompt":prompt,"options":opts,"correct":c,"explanation":expl}
    if notes:d["optionNotes"]=notes
    d.update(kw); return d
def sa(ctx,prompt,acc,expl): return {"type":"short-answer","context":ctx,"prompt":prompt,"accepted":acc,"explanation":expl}
def ro(ctx,ans,expl,extra=None):
    d={"type":"reorder","context":ctx,"answers":ans,"explanation":expl}
    if extra:d["extraTokens"]=extra
    return d
def mkset(sid,level,title,items,intro,passage=None,mode=None):
    its=[]
    for n,i in enumerate(items,1):
        i=dict(i); i["id"]=f"{sid}-{n:02d}"; its.append(i)
    d={"version":1,"id":sid,"topic":None,"level":level,"title":title,"intro":intro,"passage":passage,"items":its}
    if mode:d["defaultMode"]=mode
    w(f"cwiczenia/{sid}.json",d)

# FUNKCJE
f=[]
def fn(q,opts,c,expl,notes): f.append(mc("function",q,opts,c,expl,notes))
fn("A: Would you like to come to my party on Saturday?\nB: ___",["I'd love to, thanks.","You're welcome.","I'm fine, thank you.","It's mine."],0,"Zaproszenie przyjmujemy np. słowami I'd love to.",[None,"You're welcome to odpowiedź na podziękowanie.","To odpowiedź na pytanie o samopoczucie.","Nie pasuje do zaproszenia."])
fn("A: I'm sorry I'm late.\nB: ___",["That's OK.","Thanks a lot.","Yes, please.","See you."],0,"Na przeprosiny odpowiadamy That's OK lub No problem.",[None,"Podziękowanie, nie reakcja na przeprosiny.","Yes, please to odpowiedź na ofertę.","Pożegnanie."])
fn("A: Could you open the window, please?\nB: ___",["Sure.","You're welcome.","Never mind.","Happy birthday."],0,"Na prośbę zgadzamy się: Sure, Of course.",[None,"Odpowiedź na podziękowanie.","Pasuje do przeprosin lub sprawy bez znaczenia.","Nie pasuje do sytuacji."])
fn("You want to ask the way to the station. You say: ___",["Excuse me, how can I get to the station?","Excuse me, what time is it?","Excuse me, who is that?","Excuse me, I can't find my phone."],0,"Pytanie o drogę: How can I get to...?",[None,"Pyta o godzinę.","Pyta o osobę.","Mówi o telefonie."])
fn("A: Shall we go to the cinema tonight?\nB: ___",["Good idea!","It's very good.","I'm eleven.","No, thank you very much for the gift."],0,"Na propozycję Shall we...? odpowiadamy Good idea! lub Sorry, I can't.",[None,"Nie reaguje na propozycję.","Nie odpowiada na pytanie.","Nie pasuje."])
fn("A: Happy birthday! This is for you.\nB: ___",["Thank you so much!","Good luck!","I'm sorry.","Not at all."],0,"Na życzenia i prezent dziękujemy.",[None,"Życzenie szczęścia, nie podziękowanie.","Przeprosiny.","Nie pasuje."])
fn("A: What does your brother look like?\nB: ___",["He's tall and has short dark hair.","He likes football.","He's a student.","He lives in Gdańsk."],0,"What does he look like? pyta o wygląd.",[None,"Odpowiada na pytanie o zainteresowania.","Odpowiada na pytanie o zawód.","Odpowiada na pytanie o miejsce."])
fn("A: I have a terrible headache.\nB: ___",["You should take a tablet and rest.","You are welcome.","What a nice day!","Let's play football."],0,"Rada: You should...",[None,"Nie pasuje.","Nie pasuje do problemu.","Nie pasuje do problemu."])
fn("A: How much is this T-shirt?\nB: ___",["It's twelve pounds.","It's blue.","It's in the bag.","It's my sister's."],0,"How much pyta o cenę.",[None,"Podaje kolor.","Podaje miejsce.","Podaje właściciela."])
fn("A: Can I have a glass of water, please?\nB: ___",["Here you are.","You're right.","I don't know.","Good night."],0,"Podając coś, mówimy Here you are.",[None,"Zgoda z opinią.","Nie odpowiada na prośbę.","Pożegnanie."])
mkset("e8-funkcje-1","A2","Funkcje językowe – dialogi","".join([]) or f,"10 krótkich dialogów. Wybierz najlepszą reakcję.")

# SRODKI
s=[sa("Moja mama pracuje w szpitalu.","My mum ___ in a hospital.",["works"],"Present Simple, 3. osoba: works."),
 sa("Wczoraj oglądaliśmy film.","We ___ a film yesterday.",["watched"],"Past Simple, czasownik regularny: watched."),
 sa("Czy lubisz muzykę?","___ you like music?",["Do","do"],"Pytanie w Present Simple dla you: Do."),
 sa("Mam dwa koty.","I have two ___.",["cats"],"Liczba mnoga: cats."),
 sa("Ona jest wyższa od brata.","She is ___ than her brother.",["taller"],"Stopień wyższy krótkiego przymiotnika: taller."),
 sa("Jutro jadę do Krakowa.","Tomorrow I ___ going to travel to Kraków.",["am"],"I am going to + czasownik."),
 sa("Nie mam czasu.","I ___ have time.",["don't","do not"],"Przeczenie Present Simple: don't."),
 sa("Mieszkam tu od trzech lat.","I have lived here ___ three years.",["for"],"For + okres, since + moment."),
 ro("Gdzie jest dworzec?",["Where is the station?"],"Szyk pytania: słowo pytające + is + podmiot."),
 ro("Nie lubię pomidorów.",["I don't like tomatoes."],"Przeczenie: don't + like.",["doesn't"]),
 ro("Pojechaliśmy nad morze w lipcu.",["We went to the seaside in July."],"Went to druga forma go.",["goed"]),
 ro("On nigdy nie jada ryb.",["He never eats fish."],"Never przed czasownikiem, 3. osoba: eats.",["eat"])]
mkset("e8-srodki-1","A2","Środki językowe – luki i układanie zdań",s,"12 zadań. Pisownia musi być w pełni poprawna.")

P1="""**Hi Kasia,**

I'm having a great time in Edinburgh! We arrived on Monday, and the weather has been quite cold, but the city is beautiful. Yesterday we visited the castle and walked along the Royal Mile. Today we are going to a small museum about chocolate. I can't wait!

We are staying in a small hotel near the station. Breakfast is included, and it is delicious. In the evening we usually go to a café and play cards. My brother Tom has already bought presents for everybody.

We come back on Saturday at 6 p.m. Can you meet us at the station?

Love,
Anna"""
r1=[
 mc("reading","What did Anna do yesterday?",["She visited the castle.","She went to a museum.","She bought presents.","She played cards at the hotel."],0,"Yesterday visited the castle and walked along the Royal Mile.",[None,"Do muzeum jadą dzisiaj.","Prezenty kupił Tom.","Karty grają wieczorem."]),
 mc("reading","What is the weather like in Edinburgh?",["Quite cold.","Very hot.","Rainy every day.","Windy and warm."],0,"The weather has been quite cold.",[None,None,None,None]),
 mc("reading","Where do they stay?",["In a hotel near the station.","In a flat.","With friends.","In a camp."],0,"A small hotel near the station.",[None,None,None,None]),
 mc("reading","What does Anna ask Kasia to do?",["Meet them at the station.","Send a postcard.","Buy tickets.","Call Tom."],0,"Can you meet us at the station?",[None,None,None,None]),
 mc("reading","Who has already bought presents?",["Tom","Anna","Kasia","Their mother"],0,"My brother Tom has already bought presents.",[None,None,None,None])]
mkset("e8-czytanie-1","A2","Czytanie – pocztówka z Edynburga",r1,"Przeczytaj e-mail i odpowiedz na 5 pytań.",P1)

P2="""**School Sports Day – Friday 14 June**

Come and join us for a day of fun! The event starts at 9:00 in the school garden. There will be races, a football match between Class 8A and 8B, and a long jump competition. Everyone can take part. Please wear comfortable shoes and a sports T-shirt.

The cafeteria will sell sandwiches, fruit and drinks from 11:00 to 13:00. Parents are welcome to watch and cheer. If it rains, the event will take place in the gym.

To enter a competition, sign up with Mr Nowak by Wednesday. The day ends at 14:00 with a prize ceremony."""
r2=[
 mc("reading","What time does the event start?",["9:00","11:00","13:00","14:00"],0,"The event starts at 9:00.",[None,None,None,None]),
 mc("reading","What should participants wear?",["Comfortable shoes and a sports T-shirt.","School uniform.","Swimming clothes.","Boots."],0,"Please wear comfortable shoes and a sports T-shirt.",[None,None,None,None]),
 mc("reading","What happens if it rains?",["The event moves to the gym.","The event is cancelled.","Parents stay at home.","It starts later."],0,"If it rains, the event will take place in the gym.",[None,None,None,None]),
 mc("reading","When can you buy sandwiches?",["Between 11:00 and 13:00.","At 9:00.","After 14:00.","All day."],0,"Cafeteria 11:00 to 13:00.",[None,None,None,None]),
 mc("reading","Who should students talk to to join a competition?",["Mr Nowak","The headteacher","Class 8A","The cafeteria"],0,"Sign up with Mr Nowak by Wednesday.",[None,None,None,None])]
mkset("e8-czytanie-2","A2","Czytanie – ogłoszenie o dniu sportu",r2,"Przeczytaj ogłoszenie i odpowiedz na 5 pytań.",P2)

L=[("A: What time does the film start?\nB: At half past seven. But let's meet at seven.","When will they meet?",["At 7:00","At 7:30","At 8:00","At 6:30"],0,"Spotkanie o siódmej, film o wpół do ósmej."),
 ("A: Is the museum open on Monday?\nB: No, it's closed on Mondays. It's open from Tuesday to Sunday.","When is the museum closed?",["On Mondays","On Sundays","On Tuesdays","On Saturdays"],0,"Closed on Mondays."),
 ("A: How much is the ticket?\nB: Twelve pounds for adults, but only six for students.","How much is a student ticket?",["Six pounds","Twelve pounds","Sixteen pounds","Sixty pounds"],0,"Only six for students."),
 ("A: Shall we go to the park or to the shopping centre?\nB: The weather is nice, so let's go to the park.","Where will they go?",["To the park","To the shopping centre","To the cinema","Home"],0,"Pogoda ładna, więc park."),
 ("A: Did you find your keys?\nB: Yes, they were in my bag, not on the table.","Where were the keys?",["In the bag","On the table","In the car","At school"],0,"They were in my bag.")]
l=[]
for sc,q,o,c,e in L:
    l.append(mc("listening",q,o,c,e,[None]*4,script=sc,maxPlays=2))
mkset("e8-sluchanie-1","A2","Słuchanie – 5 krótkich dialogów (syntezator mowy)",l,"Posłuchaj każdego dialogu dwa razy i wybierz odpowiedź.",None,"exam")

# MANIFEST
w("manifest.json",{"id":"egzamin-osmoklasisty","label":"Egzamin ósmoklasisty","title":"Egzamin ósmoklasisty z angielskiego","route":"/egzamin-osmoklasisty",
 "sections":[
  {"id":"start","label":"Start","pages":[{"id":"przeglad","file":"strony/przeglad.md","label":"Przegląd egzaminu"},{"id":"plan-powtorki","file":"strony/plan-powtorki.md","label":"Plan powtórki"}]},
  {"id":"czesci","label":"Części arkusza","pages":[
    {"id":"sluchanie","file":"strony/sluchanie.md","label":"Słuchanie"},
    {"id":"funkcje-jezykowe","file":"strony/funkcje-jezykowe.md","label":"Funkcje językowe"},
    {"id":"czytanie","file":"strony/czytanie.md","label":"Czytanie"},
    {"id":"srodki-jezykowe","file":"strony/srodki-jezykowe.md","label":"Środki językowe"},
    {"id":"wypowiedz-pisemna","file":"strony/wypowiedz-pisemna.md","label":"Wypowiedź pisemna"}]},
  {"id":"przygotowanie","label":"Przygotowanie","pages":[
    {"id":"gramatyka-pod-egzamin","file":"strony/gramatyka-pod-egzamin.md","label":"Gramatyka pod egzamin"},
    {"id":"slownictwo-tematyczne","file":"strony/slownictwo-tematyczne.md","label":"Słownictwo tematyczne"},
    {"id":"dzien-egzaminu","file":"strony/dzien-egzaminu.md","label":"Dzień egzaminu"}]},
  {"id":"cwiczenia","label":"Ćwiczenia","exerciseGroups":[
    {"part":"sluchanie","label":"Słuchanie","sets":[{"id":"e8-sluchanie-1","file":"cwiczenia/e8-sluchanie-1.json","label":"5 dialogów","maxScore":5}]},
    {"part":"funkcje","label":"Funkcje językowe","sets":[{"id":"e8-funkcje-1","file":"cwiczenia/e8-funkcje-1.json","label":"10 dialogów","maxScore":10}]},
    {"part":"czytanie","label":"Czytanie","sets":[{"id":"e8-czytanie-1","file":"cwiczenia/e8-czytanie-1.json","label":"Pocztówka z Edynburga","maxScore":5},{"id":"e8-czytanie-2","file":"cwiczenia/e8-czytanie-2.json","label":"Dzień sportu","maxScore":5}]},
    {"part":"srodki","label":"Środki językowe","sets":[{"id":"e8-srodki-1","file":"cwiczenia/e8-srodki-1.json","label":"Luki i układanie zdań","maxScore":12}]}]},
  {"id":"trening","label":"Trener pisania","trainer":{"id":"trening-pisanie","file":"trening/pisanie.json","label":"Wypowiedź pisemna"}}],
 "links":[{"label":"Informator CKE","url":"https://cke.gov.pl"}]})

w("powiazania.json",{"id":"powiazania-e8","description":"Ramka „Na egzaminie ósmoklasisty” na stronach tematów","links":[
 {"itemId":"a1-czasy-present-simple","examParts":["Środki językowe","Wypowiedź pisemna"],"note":"Present Simple wraca w lukach, parafrazach i opisach w e-mailach.","exercises":["e8-srodki-1"]},
 {"itemId":"a2-czasy-past-simple","examParts":["Środki językowe","Wypowiedź pisemna"],"note":"Past Simple to czas relacji z wydarzeń w e-mailu i na blogu.","exercises":["e8-srodki-1"]},
 {"itemId":"a1-czasy-going-to","examParts":["Wypowiedź pisemna"],"note":"Plany i zamiary w trzecim podpunkcie wypowiedzi.","exercises":[]},
 {"itemId":"a2-funkcje-propozycje-zaproszenia","examParts":["Funkcje językowe","Wypowiedź pisemna"],"note":"Propozycje i zaproszenia to klasyk w dialogach i e-mailach.","exercises":["e8-funkcje-1"]},
 {"itemId":"a2-funkcje-pytanie-o-droge","examParts":["Funkcje językowe","Słuchanie"],"note":"Pytanie o drogę i wskazówki w krótkich dialogach.","exercises":["e8-funkcje-1"]},
 {"itemId":"a1-funkcje-zamawianie","examParts":["Funkcje językowe"],"note":"Zamawianie i prośby wracają w dialogach.","exercises":["e8-funkcje-1"]},
 {"itemId":"a2-gramatyka-stopniowanie-przymiotnikow","examParts":["Środki językowe"],"note":"Stopniowanie często pojawia się w lukach i tłumaczeniu fragmentów.","exercises":["e8-srodki-1"]},
 {"itemId":"a1-slownictwo","examParts":["Czytanie","Słuchanie"],"note":"Podstawowe słownictwo wymagane na egzaminie.","exercises":[]},
 {"itemId":"a2-slownictwo","examParts":["Czytanie","Słuchanie","Wypowiedź pisemna"],"note":"Słownictwo tematyczne na poziomie A2.","exercises":[]}]})

# PISANIE
T=[
 ("email-holiday","email","E-mail do kolegi – wakacje","Hi Tom,",
  ["opisz, gdzie spędziłeś/aś ostatnie wakacje","napisz, co tam robiłeś/aś","zaproś Toma, żeby pojechał z tobą w przyszłym roku"],
  "Hi Tom,\nThanks for your email. Last summer I went to the seaside with my family. We stayed in a small hotel near the beach. Every day I swam in the sea and played volleyball with my cousins. In the evening we ate ice cream and walked along the pier. It was fantastic! Next year I want to go there again. Would you like to come with me? We can swim, play games and visit the old town. Write back soon.\nBest wishes,\nXYZ"),
 ("email-birthday","email","E-mail – zaproszenie na urodziny","Hi Ola,",
  ["napisz, kiedy i gdzie będzie impreza","napisz, co będziecie robić","poproś o odpowiedź i zapytaj o prezent lub jedzenie"],
  "Hi Ola,\nI'm writing to invite you to my birthday party. It will be on Saturday, 12 May, at 5 p.m. at my house. We are going to eat pizza, play board games and watch a film. My friends from school will come, too. Can you come? Please tell me if you like pizza with cheese or with ham. You don't have to bring a present, just come with a good mood! Let me know soon.\nSee you,\nXYZ"),
 ("blog-weekend","blog","Wpis na blogu – weekend","Hello everyone!",
  ["napisz, co robiłeś/aś w weekend","napisz, co ci się podobało najbardziej","zaproponuj czytelnikom, jak spędzić wolny czas"],
  "Hello everyone!\nLast weekend was great. On Saturday I met my friends in the park, and we played football for two hours. On Sunday I helped my dad in the garden, and then we cooked dinner together. My favourite moment was the football match because we won! I think a weekend outside is the best idea. You should try it. Go to a park, take a ball and invite your friends. It is simple, fun and free. See you next time!\nXYZ"),
 ("email-school-trip","email","E-mail – wycieczka szkolna","Dear Mr Brown,",
  ["napisz, dokąd klasa pojedzie na wycieczkę","napisz, czego potrzebujecie (np. bilety, jedzenie)","zapytaj o godzinę wyjazdu"],
  "Dear Mr Brown,\nOur class is going to visit the science museum next Friday. We want to see an interesting exhibition about space and take a lot of photos. We need tickets for 25 students and two teachers, and we would like lunch in the museum café. Could you tell me what time the bus leaves? I think it is at eight, but I am not sure. Thank you for your help.\nBest wishes,\nXYZ"),
 ("blog-hobby","blog","Wpis na blogu – hobby","Hi, readers!",
  ["napisz, jakie masz hobby","napisz, od kiedy je masz i dlaczego je lubisz","napisz, czy polecasz je innym"],
  "Hi, readers!\nMy hobby is drawing. I have been drawing since I was seven, because my grandmother gave me a box of pencils. I like it because I can relax after school and show my ideas on paper. Last month I made a picture of my cat and my friends said it was very good. I recommend drawing to everybody. You don't need much, only paper and a pencil. Try it and send me your pictures!\nXYZ"),
 ("email-help","email","E-mail – prośba o pomoc","Hi Kasia,",
  ["napisz, że potrzebujesz pomocy w zadaniu domowym","napisz, z jakiego przedmiotu i czego dotyczy zadanie","zaproponuj spotkanie i powiedz kiedy"],
  "Hi Kasia,\nI need your help with my homework. It is for English, and we have to write a short story about a trip. I don't know how to start, and I am not sure about the past tense. You are very good at English, so maybe you can explain it to me? Can we meet tomorrow at 4 p.m. in the school library? We can work for an hour. If you can't come, please tell me. Thanks a lot!\nXYZ")]
tasks=[]
for i,g,t,op,bul,m in T:
    prompt=("Napisz "+("e-mail" if g=="email" else "wpis na blogu")+" (50–120 wyrazów). Zacznij od podanego początku (nie liczy się do limitu). W tekście odnieś się do wszystkich trzech punktów:\n"+"\n".join("• "+b for b in bul))
    tasks.append({"id":i,"genre":g,"part":1,"title":t,"opening":op,"prompt":prompt,"bullets":bul,"points":10,
      "genreChecklist":["Czy napisałem/am początek zgodnie z poleceniem?","Czy odniosłem/am się do wszystkich 3 punktów?","Czy zakończyłem/am tekst pożegnaniem?"],"model":m})
w("trening/pisanie.json",{"id":"trening-pisanie","timeMinutes":20,"wordRange":[50,120],"targetRange":[70,100],"warnBelow":40,
 "rubric":[{"id":"tresc","label":"Treść","max":4},{"id":"spojnosc","label":"Spójność i logika","max":2},{"id":"zakres","label":"Zakres środków językowych","max":2},{"id":"poprawnosc","label":"Poprawność środków językowych","max":2}],
 "genericChecklist":["Czy odniosłem/am się do wszystkich trzech punktów?","Czy mam 50–120 wyrazów?","Czy zdania są proste i poprawne?","Czy sprawdziłem/am pisownię i czasy?"],"tasks":tasks})
