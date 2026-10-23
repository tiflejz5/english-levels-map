from common import *
F="certyfikat-b2"
# SPEAKING
w(F+"/trening/mowienie.json",{"id":"trening-mowienie","version":1,
 "criteria":[{"id":"gv","label":"Grammar and Vocabulary","hint":"Różnorodne struktury i słownictwo, mało błędów."},{"id":"dm","label":"Discourse Management","hint":"Rozwijam odpowiedzi, łączę myśli, mówię płynnie."},{"id":"pr","label":"Pronunciation","hint":"Wyraźne głoski, akcent zdaniowy i intonacja."},{"id":"ic","label":"Interactive Communication","hint":"Reaguję na partnera, zadaję pytania, pomagam rozmowie."}],
 "part1":{"title":"Part 1 – rozmowa z egzaminatorem","seconds":120,"groups":[
  {"topic":"Dom i okolica","questions":["Where do you live? What do you like about it?","Do you prefer living in a flat or a house? Why?","What would you change about your neighbourhood?"]},
  {"topic":"Czas wolny","questions":["What do you usually do at the weekend?","Tell me about a hobby you have.","What did you do last weekend?"]},
  {"topic":"Nauka i praca","questions":["What are you studying? Why did you choose it?","What would your ideal job be?","How do you usually prepare for exams?"]},
  {"topic":"Podróże","questions":["Where did you go on your last holiday?","What kind of holiday do you prefer? Why?","Which country would you like to visit in the future?"]}]},
 "part2":{"title":"Part 2 – porównaj dwie sytuacje (opis słowny zamiast zdjęć)","seconds":60,"cards":[
  {"a":"A family having a picnic in a park","b":"A group of friends eating in a restaurant","question":"Why might the people have chosen to eat in these places?"},
  {"a":"A student studying alone in a library","b":"Students working together on a project in a classroom","question":"How might the students be feeling?"},
  {"a":"A person running along a beach at sunrise","b":"A group of people playing basketball in a gym","question":"What are the advantages of exercising in these ways?"},
  {"a":"A tourist taking photos in front of a famous monument","b":"A tourist relaxing in a hotel pool","question":"Why might people choose these kinds of holiday?"},
  {"a":"A chef cooking in a busy restaurant kitchen","b":"A person cooking dinner at home for their family","question":"What might be difficult about these situations?"},
  {"a":"A person working at a laptop in a café","b":"A person working in a crowded open-plan office","question":"Which might be better for concentrating, and why?"}]},
 "part3":{"title":"Part 3 – wspólna rozmowa (z partnerem)","discussionSeconds":120,"decisionSeconds":60,"tasks":[
  {"central":"A school is planning to organise an event to raise money for charity. Talk about how good each of these ideas would be, then decide which would raise the most money.","options":["a bake sale","a sports match","a concert","a car wash","a quiz night"],"decision":"Which would raise the most money?"},
  {"central":"A town wants to encourage young people to spend more time outdoors. Talk about the advantages of each idea and decide which is the best.","options":["a new skate park","a cycling festival","free sports lessons","a youth camping trip","an outdoor cinema"],"decision":"Which is the best idea for the town?"},
  {"central":"Some students want to improve their English over the summer. Talk about how useful each way would be, then decide which is the most effective.","options":["watching films in English","a language course abroad","a conversation club","reading English books","online lessons"],"decision":"Which is the most effective way?"}]},
 "part4":{"title":"Part 4 – dyskusja","seconds":240,"groups":[
  {"topic":"Charytatywne zbiórki","questions":["Do you think young people should be encouraged to do charity work? Why?","What is the best way to persuade people to give money?","Is it better to give time or money to a charity?","How can schools help students to care about others?"]},
  {"topic":"Czas w naturze","questions":["Do you think people spend enough time outdoors these days?","What are the benefits of spending time in nature?","Why do some people prefer to stay at home?","How can cities provide more green space?"]},
  {"topic":"Nauka języków","questions":["Why is it important to learn foreign languages?","Is it better to learn a language at school or abroad?","Do you think everyone will speak English in the future?","What helps you to learn languages effectively?"]}]}})

sets=lambda *a:[{"id":i,"file":f"cwiczenia/{i}.json","label":l,"maxScore":m} for i,l,m in a]
w(F+"/manifest.json",{"id":"certyfikat-b2","label":"Certyfikat B2","title":"Cambridge B2 First","route":"/certyfikat-b2",
 "sections":[
 {"id":"start","label":"Start","pages":[{"id":"przeglad","file":"strony/przeglad.md","label":"Przegląd egzaminu"},{"id":"plan-powtorki","file":"strony/plan-powtorki.md","label":"Plan powtórki"}]},
 {"id":"reading-uoe","label":"Reading and Use of English","pages":[{"id":"use-of-english","file":"strony/use-of-english.md","label":"Use of English – Parts 1–4"},{"id":"reading","file":"strony/reading.md","label":"Reading – Parts 5–7"}]},
 {"id":"writing","label":"Writing","pages":[{"id":"writing","file":"strony/writing.md","label":"Przegląd"},{"id":"writing-esej","file":"strony/writing-esej.md","label":"Esej"},{"id":"writing-artykul-email-recenzja","file":"strony/writing-artykul-email-recenzja.md","label":"Artykuł, e-mail, recenzja"},{"id":"writing-raport","file":"strony/writing-raport.md","label":"Raport"},{"id":"writing-opowiadanie","file":"strony/writing-opowiadanie.md","label":"Opowiadanie"}]},
 {"id":"listening-speaking","label":"Listening i Speaking","pages":[{"id":"listening","file":"strony/listening.md","label":"Listening – Parts 1–4"},{"id":"speaking","file":"strony/speaking.md","label":"Speaking – Parts 1–4"}]},
 {"id":"przygotowanie","label":"Przygotowanie","pages":[{"id":"gramatyka-pod-egzamin","file":"strony/gramatyka-pod-egzamin.md","label":"Gramatyka pod egzamin"},{"id":"slownictwo","file":"strony/slownictwo.md","label":"Słownictwo i kolokacje"},{"id":"dzien-egzaminu","file":"strony/dzien-egzaminu.md","label":"Dzień egzaminu"}]},
 {"id":"cwiczenia","label":"Ćwiczenia","exerciseGroups":[
  {"part":1,"label":"Part 1 – Multiple-choice cloze","sets":sets(("b2-uoe-p1-1","Learning to cook",8),("b2-uoe-p1-2","Working from home",8))},
  {"part":2,"label":"Part 2 – Open cloze","sets":sets(("b2-uoe-p2-1","A weekend in the mountains",8),("b2-uoe-p2-2","A new hobby",8))},
  {"part":3,"label":"Part 3 – Word formation","sets":sets(("b2-uoe-p3-1","City life",8),("b2-uoe-p3-2","Online shopping",8))},
  {"part":4,"label":"Part 4 – Key word transformation","sets":sets(("b2-uoe-p4-1","Strona bierna, warunki, mowa zależna",12),("b2-uoe-p4-2","Emfaza i modalne",12))},
  {"part":5,"label":"Part 5 – Multiple choice","sets":sets(("b2-reading-p5-1","Learning to live with less",6))},
  {"part":6,"label":"Part 6 – Gapped text","sets":sets(("b2-reading-p6-1","A year without a phone",6))},
  {"part":7,"label":"Part 7 – Multiple matching","sets":sets(("b2-reading-p7-1","Four people, first jobs",10))},
  {"part":"L1","label":"Listening Part 1","sets":sets(("b2-listening-p1-1","8 krótkich nagrań",8))},
  {"part":"L2","label":"Listening Part 2","sets":sets(("b2-listening-p2-1","Obóz żeglarski",10))},
  {"part":"L3","label":"Listening Part 3","sets":sets(("b2-listening-p3-1","Dopasowanie",5))},
  {"part":"L4","label":"Listening Part 4","sets":sets(("b2-listening-p4-1","Wywiad",7))}]},
 {"id":"trening","label":"Trenery","trainers":[{"id":"trening-pisanie","file":"trening/pisanie.json","label":"Writing","type":"writing"},{"id":"trening-mowienie","file":"trening/mowienie.json","label":"Speaking","type":"speaking"}]}],
 "links":[{"label":"Cambridge English – B2 First","url":"https://www.cambridgeenglish.org/exams-and-tests/first/"}]})
w(F+"/powiazania.json",{"id":"powiazania-b2","description":"Ramka „Na egzaminie B2 First” na stronach tematów","links":[
 {"itemId":"b2-czasy-laczenie-czasow","examParts":["Use of English – Parts 1–4","Writing"],"note":"Łączenie czasów w lukach i w narracji.","exercises":["b2-uoe-p1-1","b2-uoe-p4-1"]},
 {"itemId":"b2-gramatyka-wish-if-only","examParts":["Use of English – Part 4"],"note":"Wish + Past Simple / Past Perfect to częste transformacje.","exercises":["b2-uoe-p4-1","b2-uoe-p4-2"]},
 {"itemId":"b1-gramatyka-strona-bierna","examParts":["Use of English – Part 4"],"note":"Strona bierna z say i w czasach ciągłych.","exercises":["b2-uoe-p4-1","b2-uoe-p4-2"]},
 {"itemId":"b1-gramatyka-mowa-zalezna","examParts":["Use of English – Part 4"],"note":"Mowa zależna w transformacjach.","exercises":["b2-uoe-p4-1"]},
 {"itemId":"b2-gramatyka-modalne-przeszlosc","examParts":["Use of English – Part 4","Writing"],"note":"might have, must have, should have: spekulacje o przeszłości.","exercises":["b2-uoe-p4-1"]},
 {"itemId":"b2-funkcje-spekulowanie","examParts":["Speaking – Part 2","Speaking – Part 3"],"note":"Spekulowanie przy porównywaniu zdjęć i w dyskusji.","exercises":[]},
 {"itemId":"b2-funkcje-argumentowanie","examParts":["Writing – esej","Speaking – Part 4"],"note":"Argumentowanie w eseju i dyskusji.","exercises":[]},
 {"itemId":"b2-funkcje-negocjowanie","examParts":["Speaking – Part 3"],"note":"Dochodzenie do wspólnej decyzji.","exercises":[]},
 {"itemId":"b2-slownictwo","examParts":["Use of English – Parts 1 i 3","Reading","Writing"],"note":"Kolokacje i słowotwórstwo B2.","exercises":["b2-uoe-p3-1","b2-uoe-p3-2"]}]})
w("dane/egzaminy-manifest.json",{"version":3,"note":"Podmień wpis certyfikat-b2 w rejestrze projektu.","exams":[
 {"id":"certyfikat-b2","code":"B2","label":"Certyfikat B2","route":"/certyfikat-b2","status":"active","accent":"#1f6f8b","accent2":"#d9a21b","suggestedDate":None,"order":4,"description":"Cambridge B2 First: Reading and Use of English, Writing, Listening i Speaking."}]})
