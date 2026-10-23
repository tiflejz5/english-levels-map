from common import *
F="matura-rozszerzona"
# SŁUCHANIE
L=[("Interviewer: You've been a volunteer at the animal shelter for three years. What made you start?\nWoman: Honestly, I wanted something to put on my CV. But after the first week I realised that it was about much more than that. Now I go there every Saturday, even when I have an exam on Monday.","What does the woman say about her reasons for volunteering?",["She began for practical reasons, but her motivation changed.","She was asked by her teacher to help.","She has always wanted to work with animals."],0,"Zaczęła dla CV, potem motywacja się zmieniła."),
 ("Man: I used to think that learning a language meant memorising word lists. Then I spent a summer in Spain and nobody cared about my grammar, they just wanted me to talk. It was terrifying at first, but my Spanish improved more in two months than in two years at school.","What is the man's opinion about learning languages?",["Grammar is the most important thing.","Speaking with real people is the fastest way.","Word lists are enough for beginners."],1,"Mówienie z ludźmi dało największy postęp."),
 ("Woman: Our city is introducing a new rule: cars will not be allowed in the town centre on Sundays. Some shop owners are afraid that they will lose customers. However, research from other cities suggests that the opposite happens, because more people walk and stay longer.","What do the shop owners fear?",["Higher prices","Losing customers","Traffic jams on other days"],1,"Obawiają się utraty klientów."),
 ("Man: I'd say the film was a bit disappointing. The story started well, but the ending was very predictable. Having said that, the music was fantastic and the actors did a great job, so I wouldn't tell people to avoid it.","What does the speaker think of the film?",["He doesn't recommend it at all.","He has mixed feelings about it.","He thinks the ending was the best part."],1,"Opinia mieszana: słaba końcówka, świetna muzyka."),
 ("Woman: Every year I make a list of resolutions, and every year I give up by February. This time I'm doing it differently. Instead of big goals like 'get fit', I set tiny ones, for instance, 'walk for ten minutes after dinner'. So far it's working.","How is the speaker's approach to resolutions different this year?",["She sets smaller goals.","She makes a longer list.","She asks friends for help."],0,"Ustala bardzo małe cele."),
 ("Man: The company's new policy allows employees to work from home two days a week. My manager says it will save money on office space. Personally, I'm not sure. I think teamwork suffers when people don't see each other regularly.","What is the speaker's concern?",["Working from home is too expensive.","Teamwork may get worse.","The policy will be cancelled."],1,"Obawia się pogorszenia pracy zespołowej.")]
mkset(F,"mr-sluchanie-1","B2","Słuchanie – 6 wypowiedzi (syntezator mowy)",[mc("listening",q,o,c,e,notes(c,*["Nie wynika z nagrania."]*(len(o)-1)),script=sc,maxPlays=2) for sc,q,o,c,e in L],"Posłuchaj każdej wypowiedzi dwa razy i wybierz odpowiedź.",None,"exam")

# CZYTANIE 1: dobieranie zdań do luk
P1="""**The case for a longer summer holiday**

Every year, teachers complain that students forget a great deal during the summer. [1] Yet the idea of shortening the holiday keeps coming back. Supporters argue that a shorter break would help children remember more of what they learned.

However, many experts disagree. They point out that the summer is the only time when young people can follow their own interests. [2] A teenager who spends July building a robot, for instance, may learn more than in a month of lessons.

Another argument concerns health. School terms are demanding, and constant pressure can lead to exhaustion. [3] Several studies suggest that students who rest properly return to class with greater concentration.

Finally, families need time together. [4] A long break gives them the chance to travel, visit relatives or simply spend time without a timetable.

In conclusion, the summer holiday should not be treated as lost time. [5] Perhaps the real challenge is to make school more interesting, not to make the holiday shorter.

**Sentences:**
A. This is a worry that has existed for decades.
B. Such experiences develop skills which classrooms rarely teach.
C. In reality, rest is an important part of learning.
D. During term time, parents and children often meet only in the evening.
E. It gives young people room to grow in ways that school cannot provide.
F. Most schools have changed the length of the holiday several times.
G. Experts have not yet agreed on the best number of lessons."""
q=[("1","A","Zdanie A nawiązuje do skargi nauczycieli: a worry that has existed for decades."),("2","B","Zdanie B rozwija przykład z robotem: Such experiences."),("3","C","Zdanie C łączy się z tematem zmęczenia i odpoczynku."),("4","D","Zdanie D wprowadza potrzebę czasu rodzinnego."),("5","E","Zdanie E podsumowuje wartość wakacji.")]
letters="ABCDEFG"
items=[]
import random
random.seed(7)
for n,a,e in q:
    opts=[a]+random.sample([x for x in letters if x!=a],3)
    random.shuffle(opts); opts.sort()
    items.append(mc("reading",f"Które zdanie pasuje do luki [{n}]?",opts,opts.index(a),e,None,fixedOrder=True))
mkset(F,"mr-czytanie-1","B2","Czytanie – wstawianie zdań do tekstu",items,"Przeczytaj tekst i wybierz zdanie (A–G) pasujące do każdej luki. Dwa zdania są nadmiarowe.",P1)

# CZYTANIE 2: dwa teksty
P2="""**Text 1 – Alex**

I've been using an e-reader for five years, and I wouldn't go back. It is light, I can carry hundreds of books on holiday, and I can read in the dark. People say they love the smell of paper, but I'd rather have the convenience. What matters to me is the story, not the object.

**Text 2 – Maya**

I understand why people like e-readers, but I can't give up paper books. When I read on a screen, I get tired and find it hard to concentrate. Paper books also make wonderful gifts, and my shelves tell the story of my life. Besides, nothing is more relaxing than turning a real page."""
r2=[mc("reading","What does Alex say about his e-reader?",["It is cheap.","It lets him read anywhere, even in the dark.","It smells like a paper book."],1,"Alex: light, many books, reading in the dark.",notes(1,"Cena nie jest wspomniana.","Zapach papieru to argument przeciwny.")),
 mc("reading","Why does Maya prefer paper books?",["They are cheaper.","Screens make her tired.","She doesn't like gifts."],1,"Maya: tired and harder to concentrate on a screen.",notes(1,"Nie.","Przeciwnie, lubi prezenty.")),
 mc("reading","What do both writers agree on?",["Books are important to them.","E-readers are too expensive.","Paper smells better."],0,"Obydwoje cenią czytanie książek.",notes(0,"Nie.","Nie.")),
 mc("reading","What is the main difference between their opinions?",["Alex values convenience, Maya values the physical experience.","Alex reads more than Maya.","Maya cannot afford an e-reader."],0,"Wygoda kontra doświadczenie fizyczne.",notes(0,"Brak informacji.","Brak informacji.")),
 mc("reading","What does Maya say about her bookshelves?",["They are too full.","They represent her life story.","They are a gift from Alex."],1,"My shelves tell the story of my life.",notes(1,"Nie.","Nie.")),
 mc("reading","Which statement is true for Alex?",["He prefers the story to the form of the book.","He never reads on holiday.","He misses the smell of paper."],0,"What matters is the story, not the object.",notes(0,"Przeciwnie.","Przeciwnie."))]
mkset(F,"mr-czytanie-2","B2","Czytanie – dwa teksty powiązane tematycznie",r2,"Przeczytaj oba teksty i odpowiedz na pytania.",P2)

# CLOZE
w(F+"/cwiczenia/mr-uoe-cloze-1.json",{"id":"mr-uoe-cloze-1","part":1,"type":"multiple-choice-cloze","title":"The value of volunteering","instructions":"Wybierz słowo (A, B, C lub D), które najlepiej pasuje do luki. Każda luka to 1 punkt.","maxScore":6,
 "text":"Volunteering is often seen as something that only benefits others, but it also brings many advantages to the volunteers themselves. For example, working in a team helps young people {{1}} their confidence. Many employers {{2}} voluntary work very highly. Moreover, volunteers often {{3}} new friends who share their values. Some people worry that they will not have enough time, but even a few hours a week can {{4}} a real difference. The key is to choose an activity that you genuinely {{5}} about. If you do, the experience will certainly {{6}} you in the long run.",
 "gaps":[{"n":1,"options":{"A":"raise","B":"build","C":"hold","D":"turn"},"answer":"B","explanation":"build confidence = budować pewność siebie."},
 {"n":2,"options":{"A":"value","B":"pay","C":"count","D":"keep"},"answer":"A","explanation":"value something highly = wysoko cenić."},
 {"n":3,"options":{"A":"make","B":"do","C":"get","D":"take"},"answer":"A","explanation":"make friends."},
 {"n":4,"options":{"A":"do","B":"make","C":"give","D":"put"},"answer":"B","explanation":"make a difference."},
 {"n":5,"options":{"A":"care","B":"mind","C":"worry","D":"matter"},"answer":"A","explanation":"care about something."},
 {"n":6,"options":{"A":"benefit","B":"profit","C":"gain","D":"earn"},"answer":"A","explanation":"benefit someone = przynieść korzyść."}]})

# SŁOWOTWÓRSTWO
w(F+"/cwiczenia/mr-uoe-slowotworstwo-1.json",{"id":"mr-uoe-slowotworstwo-1","part":3,"type":"word-formation","title":"Technology and everyday life","instructions":"Utwórz od słowa w nawiasie słowo, które pasuje do luki. Uważaj na przedrostki, liczbę mnogą i pisownię. Każda luka to 1 punkt.","maxScore":8,
 "text":"Modern technology has changed our methods of {{1}}. It is hard to imagine our lives without it. Smartphones offer us a great deal of {{2}}, but they can also make us less {{3}} to the world around us. Many people feel that they are {{4}} on their devices. Experts suggest that we should be more {{5}} when we choose how much time to spend online. A lack of {{6}} can lead to health problems, which is why a growing number of schools has introduced screen-free hours. It is {{7}} to say that technology itself is bad. The real question is how {{8}} we use it.",
 "gaps":[{"n":1,"stem":"COMMUNICATE","accept":["COMMUNICATION"],"explanation":"Rzeczownik po of: methods of communication."},
 {"n":2,"stem":"CONVENIENT","accept":["CONVENIENCE"],"explanation":"Rzeczownik po a great deal of: convenience."},
 {"n":3,"stem":"ATTENTION","accept":["ATTENTIVE"],"explanation":"Przymiotnik: less attentive to."},
 {"n":4,"stem":"DEPEND","accept":["DEPENDENT"],"explanation":"Przymiotnik: dependent on."},
 {"n":5,"stem":"SELECT","accept":["SELECTIVE"],"explanation":"Przymiotnik: selective."},
 {"n":6,"stem":"ACTIVE","accept":["ACTIVITY"],"explanation":"Rzeczownik: a lack of activity."},
 {"n":7,"stem":"FAIR","accept":["UNFAIR"],"explanation":"Przeczenie: It is unfair to say."},
 {"n":8,"stem":"WISE","accept":["WISELY"],"explanation":"Przysłówek: how wisely."}]})

# UZUPEŁNIANIE ZDAŃ (do 5 wyrazów)
TR=[("People say that she is the best singer in our town.","She ___ the best singer in our town.",["is said to be","is said to being"],"Strona bierna z say: is said to be."),
 ("I regret not studying harder.","I wish I ___ harder.",["had studied","had studied"],"Wish + Past Perfect."),
 ("It's a long time since we saw each other.","We ___ each other for a long time.",["haven't seen","have not seen"],"Present Perfect z for."),
 ("He didn't arrive until midnight.","It was not ___ midnight that he arrived.",["until"],"Cleft sentence: It was not until... that."),
 ("The manager will see you in a minute.","You will ___ by the manager in a minute.",["be seen"],"Strona bierna z will: will be seen."),
 ("'I'll call you tomorrow,' he said to me.","He told me that he ___ me the next day.",["would call","would phone"],"Mowa zależna: would call.")]
mkset(F,"mr-uoe-uzupelnianie-1","B2","Uzupełnianie zdań – do 5 wyrazów",[sa(a,b,c,d) for a,b,c,d in TR],"Uzupełnij lukę tak, żeby zdanie znaczyło to samo. Maksymalnie 5 wyrazów.")

# PISANIE
tasks=[]
def tk(g,gid,i,t,prompt,m,gen):
    tasks.append({"id":i,"genre":g,"choiceGroup":gid,"part":1,"title":t,"prompt":prompt,"points":13,"genreChecklist":gen,"model":m})
tk("essay","A","essay-phones","Rozprawka – telefony w szkole",
"Napisz rozprawkę na temat: „Czy należy zakazać używania telefonów komórkowych w szkołach?”. W rozprawce: 1) omów możliwe korzyści zakazu, 2) omów jego możliwe wady, 3) wyraź własne stanowisko.",
"""Nowadays, almost every teenager owns a smartphone, and the question of whether schools should ban them causes heated debate. In my opinion, a complete ban is not the best solution, although there are good reasons to limit phone use.

On the one hand, a ban would help students to concentrate. When phones stay in lockers, pupils are less likely to check messages during a lesson, and they talk to each other during breaks instead of looking at screens. Furthermore, a ban reduces the risk of cyberbullying at school, as it is harder to film or photograph classmates.

On the other hand, phones are useful tools. Students can use them to look up information, translate a word or take a photo of the board. A total ban would also make it difficult for parents to contact their children in an emergency. For instance, in case of a sudden change of timetable, a short message can save a lot of worry.

All things considered, I believe that schools should introduce clear rules rather than an absolute ban. Phones could be switched off during lessons and used only when the teacher allows it. In this way, students would learn to use technology responsibly, which is a skill they will need for the rest of their lives.""",
["Czy mam wstęp, dwa elementy i zakończenie?","Czy użyłem/am formalnych łączników?","Czy mam 200–250 wyrazów?"])
tk("letter","A","letter-cycle","List formalny – ścieżki rowerowe",
"Napisz list formalny do urzędu miasta w sprawie braku ścieżek rowerowych. W liście: 1) opisz problem, 2) wyjaśnij, dlaczego jest ważny, 3) zaproponuj rozwiązanie.",
"""Dear Sir or Madam,

I am writing to express my concern about the lack of safe cycle paths in our town. I have been cycling to school for three years, and I have noticed that the situation is getting worse every year.

At the moment, cyclists have to ride on busy roads, because the nearest cycle path ends two kilometres before the town centre. Last month a classmate was nearly hit by a lorry when she was cycling along Mickiewicza Street. Unfortunately, this is not an isolated incident, as many people in my neighbourhood have had similar experiences.

This problem is important for several reasons. First of all, safe paths would encourage more residents to leave their cars at home, which would reduce traffic and pollution. In addition, they would make our town more attractive for tourists, who often travel by bike.

I would therefore like to suggest that the council builds a continuous path along the main road, from the housing estate to the town centre. Even a simple path separated from the road by a painted line would be a great improvement for everyone who cycles every day.

I would be grateful if you could consider my proposal. I look forward to hearing from you.

Yours faithfully,
XYZ""",
["Czy zacząłem/am od Dear Sir or Madam i skończyłem/am Yours faithfully?","Czy ton jest formalny?","Czy mam 200–250 wyrazów?"])
tk("article","B","article-volunteering","Artykuł – wolontariat",
"Napisz artykuł do szkolnej gazetki na temat: „Czy wolontariat to dobry sposób na spędzanie wolnego czasu przez młodzież?”. W artykule: 1) omów korzyści dla wolontariuszy, 2) omów trudności, 3) wyraź opinię.",
"""Is volunteering worth your time?

Imagine spending your Saturday morning helping at an animal shelter or teaching children to read. Many young people choose this kind of activity, and I think they are right.

First of all, volunteering brings real benefits. It gives you the chance to learn useful skills such as teamwork, communication and organisation. What is more, it can make a big difference on your CV, because employers value people who take responsibility. Above all, helping others makes you feel needed, which improves your mood and confidence.

Nevertheless, there are some difficulties. Teenagers have a lot of homework, and finding time every week is not always easy. Some volunteers also say that they feel tired or sad after working with people in difficult situations. For this reason, it is important to choose an activity which you really care about and to talk to someone when the job becomes stressful.

If you ask me, the advantages are much greater than the problems. Start small, for example with two hours a month, and see how it feels. You may be surprised to discover how much you gain by giving a little of your time, and how many people will be grateful for your help.""",
["Czy mam tytuł i ciekawy początek?","Czy ton jest półformalny i zaangażowany?","Czy mam 200–250 wyrazów?"])
tk("essay","B","essay-social-media","Rozprawka – media społecznościowe",
"Napisz rozprawkę na temat: „Czy media społecznościowe sprawiają, że ludzie są bliżej siebie?”. W rozprawce: 1) omów argumenty za, 2) omów argumenty przeciw, 3) wyraź własne zdanie.",
"""Social media has become part of everyday life for millions of people. Some say that it brings us closer together, while others claim that it makes us lonelier. In this essay I will consider both points of view.

To begin with, social media makes it easy to stay in touch. People who live in different countries can talk to each other every day, share photos and celebrate important moments together. Moreover, it helps people with similar interests to find each other, for instance in online groups about music or sport. Without these platforms, many friendships would never exist.

However, there are also serious disadvantages. Many users spend hours looking at other people's lives instead of talking to the people next to them. As a result, they may feel left out or unhappy about their own lives. In addition, online conversations are often short and superficial, which means that real closeness is difficult to build.

All things considered, I believe that social media is neither good nor bad in itself. It can bring people closer if it is used as an addition to real meetings, not as a replacement for them. Everyone should therefore decide for themselves how much time they spend online.""",
["Czy mam wstęp, dwa elementy i zakończenie?","Czy użyłem/am formalnych łączników?","Czy mam 200–250 wyrazów?"])
w(F+"/trening/pisanie.json",{"id":"trening-pisanie","timeMinutes":40,"wordRange":[200,250],"targetRange":[210,240],"warnBelow":160,
 "choiceGroups":{"A":"Wybierz jedno z dwóch zadań: rozprawka lub list formalny","B":"Wybierz jedno z dwóch zadań: artykuł lub rozprawka"},
 "rubric":[{"id":"realizacja","label":"Realizacja zadania","max":5},{"id":"spojnosc","label":"Spójność i logika","max":2},{"id":"zakres","label":"Zakres środków językowych","max":3},{"id":"poprawnosc","label":"Poprawność środków językowych","max":3}],
 "genericChecklist":["Czy odniosłem/am się do wszystkich elementów polecenia?","Czy mam 200–250 wyrazów?","Czy tekst ma akapity i łączniki?","Czy sprawdziłem/am pisownię i interpunkcję?"],"tasks":tasks})

sets=lambda *a:[{"id":i,"file":f"cwiczenia/{i}.json","label":l,"maxScore":m} for i,l,m in a]
w(F+"/manifest.json",{"id":"matura-rozszerzona","label":"Matura rozszerzona","title":"Matura rozszerzona z angielskiego","route":"/matura-rozszerzona",
 "sections":[
 {"id":"start","label":"Start","pages":[{"id":"przeglad","file":"strony/przeglad.md","label":"Przegląd egzaminu"},{"id":"plan-powtorki","file":"strony/plan-powtorki.md","label":"Plan powtórki"}]},
 {"id":"czesci","label":"Części arkusza","pages":[{"id":"sluchanie","file":"strony/sluchanie.md","label":"Słuchanie"},{"id":"czytanie","file":"strony/czytanie.md","label":"Czytanie"},{"id":"use-of-english","file":"strony/use-of-english.md","label":"Środki językowe"}]},
 {"id":"pisanie","label":"Pisanie i ustna","pages":[{"id":"wypowiedz-pisemna","file":"strony/wypowiedz-pisemna.md","label":"Wypowiedź pisemna"},{"id":"rozprawka","file":"strony/rozprawka.md","label":"Rozprawka"},{"id":"list-formalny","file":"strony/list-formalny.md","label":"List formalny"},{"id":"artykul","file":"strony/artykul.md","label":"Artykuł"},{"id":"matura-ustna","file":"strony/matura-ustna.md","label":"Matura ustna"}]},
 {"id":"przygotowanie","label":"Przygotowanie","pages":[{"id":"slownictwo-i-kolokacje","file":"strony/slownictwo-i-kolokacje.md","label":"Słownictwo i kolokacje"},{"id":"gramatyka-pod-egzamin","file":"strony/gramatyka-pod-egzamin.md","label":"Gramatyka pod egzamin"},{"id":"dzien-egzaminu","file":"strony/dzien-egzaminu.md","label":"Dzień egzaminu"}]},
 {"id":"cwiczenia","label":"Ćwiczenia","exerciseGroups":[
  {"part":"sluchanie","label":"Słuchanie","sets":sets(("mr-sluchanie-1","6 wypowiedzi",6))},
  {"part":"czytanie","label":"Czytanie","sets":sets(("mr-czytanie-1","Wstawianie zdań",5),("mr-czytanie-2","Dwa teksty",6))},
  {"part":"uoe","label":"Środki językowe","sets":sets(("mr-uoe-cloze-1","Luki: wybór",6),("mr-uoe-slowotworstwo-1","Słowotwórstwo",8),("mr-uoe-uzupelnianie-1","Uzupełnianie zdań",6))}]},
 {"id":"trening","label":"Trener pisania","trainer":{"id":"trening-pisanie","file":"trening/pisanie.json","label":"Wypowiedź pisemna"}}],
 "links":[{"label":"Informator CKE","url":"https://cke.gov.pl"}]})
w(F+"/powiazania.json",{"id":"powiazania-mr","description":"Ramka „Na maturze rozszerzonej” na stronach tematów","links":[
 {"itemId":"b2-czasy-laczenie-czasow","examParts":["Środki językowe","Wypowiedź pisemna"],"note":"Łączenie czasów wraca w lukach i w narracji.","exercises":["mr-uoe-cloze-1"]},
 {"itemId":"b1-gramatyka-strona-bierna","examParts":["Środki językowe"],"note":"Strona bierna z say, believe, think w uzupełnianiu zdań.","exercises":["mr-uoe-uzupelnianie-1"]},
 {"itemId":"b1-gramatyka-mowa-zalezna","examParts":["Środki językowe"],"note":"Mowa zależna w uzupełnianiu zdań.","exercises":["mr-uoe-uzupelnianie-1"]},
 {"itemId":"b1-gramatyka-conditionals-0-1-2","examParts":["Środki językowe","Wypowiedź pisemna"],"note":"Warunki i wish w zdaniach i rozprawkach.","exercises":["mr-uoe-uzupelnianie-1"]},
 {"itemId":"b1-funkcje-opinia","examParts":["Wypowiedź pisemna","Matura ustna"],"note":"Wyrażanie opinii w rozprawce i na ustnej.","exercises":[]},
 {"itemId":"b1-funkcje-skargi","examParts":["Wypowiedź pisemna"],"note":"List formalny ze skargą.","exercises":[]},
 {"itemId":"b2-slownictwo","examParts":["Czytanie","Środki językowe","Wypowiedź pisemna"],"note":"Słownictwo B2 w kolokacjach.","exercises":[]}]})
