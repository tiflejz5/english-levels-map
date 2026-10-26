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
def p1(i,title,text,gaps):
    G=[{"n":n,"options":dict(zip("ABCD",o)),"answer":a,"explanation":e} for n,(o,a,e) in enumerate(gaps,1)]
    w(D+i+".json",{"id":i,"part":1,"type":"multiple-choice-cloze","title":title,"instructions":INS1,"maxScore":8,"text":text,"gaps":G})
def p2(i,title,text,gaps):
    w(D+i+".json",{"id":i,"part":2,"type":"open-cloze","title":title,"instructions":INS2,"maxScore":8,"text":text,"gaps":[{"n":n,"accept":a,"explanation":e} for n,(a,e) in enumerate(gaps,1)]})
def p3(i,title,text,gaps):
    w(D+i+".json",{"id":i,"part":3,"type":"word-formation","title":title,"instructions":INS3,"maxScore":8,"text":text,"gaps":[{"n":n,"stem":s,"accept":a,"explanation":e} for n,(s,a,e) in enumerate(gaps,1)]})
def p4(i,title,focus,items):
    w(D+i+".json",{"id":i,"part":4,"type":"transformation","title":title,"focus":focus,"instructions":INS4,"maxScore":12,
      "items":[{"n":n,"first":f,"keyword":k,"before":b,"after":a,"parts":pt,"model":m,"explanation":e} for n,(f,k,b,a,pt,m,e) in enumerate(items,1)]})

# ---------- PART 1
p1("uoe-p1-4","The return of vinyl",
 "Few people would have predicted that vinyl records would {{1}} a comeback in the age of streaming. Yet sales have been {{2}} steadily for over a decade. Fans {{3}} the sound as warmer and richer, but for many the real appeal lies elsewhere: the large sleeves, the ritual of lowering the needle and the sense of owning something tangible. Record shops, once on the {{4}} of extinction, are now thriving in many cities. Some critics dismiss the trend as mere nostalgia, yet a {{5}} number of buyers are under thirty and have never owned a cassette player. The industry is, however, not without its {{6}}. Pressing plants struggle to {{7}} up with demand, and prices have risen sharply. Whether the revival will last remains to be {{8}}.",
 [(["make","take","pull","reach"],"A","Make a comeback = wrócić do łask."),
  (["rising","raising","arising","lifting"],"A","Rise jest nieprzechodnie: sales have been rising. Raise wymaga dopełnienia."),
  (["describe","explain","state","tell"],"A","Describe X as Y = określać X jako Y."),
  (["brink","rim","corner","border"],"A","On the brink of extinction = na progu wyginięcia."),
  (["considerable","plentiful","profound","intense"],"A","A considerable number = spora liczba. Pozostałe nie łączą się z number."),
  (["drawbacks","damages","losses","harms"],"A","Not without its drawbacks = nie bez wad."),
  (["keep","hold","stay","go"],"A","Keep up with demand = nadążać za popytem."),
  (["seen","looked","watched","noticed"],"A","Remains to be seen = to się dopiero okaże.")])
p1("uoe-p1-5","Urban green spaces",
 "Cities around the world are discovering that parks are not a luxury but a necessity. Studies show that residents with {{1}} to green spaces report lower stress levels and better physical health. Planners are therefore under pressure to {{2}} room for trees even in the most densely built districts. This is easier said than {{3}}, since land is expensive and every square metre {{4}} a high price. Some cities have responded by turning rooftops into gardens or {{5}} abandoned railway lines into public walkways. Critics point out that such projects can {{6}} up property prices, forcing out the very residents they were meant to benefit. Even so, most experts agree that the long-term benefits far {{7}} the costs, provided that new green areas are {{8}} fairly across the whole city.",
 [(["access","entry","admission","entrance"],"A","Access to = dostęp do."),
  (["make","do","bring","set"],"A","Make room for = zrobić miejsce dla."),
  (["done","made","put","got"],"A","Easier said than done = łatwiej powiedzieć niż zrobić."),
  (["fetches","buys","earns","wins"],"A","Fetch a high price = osiągać wysoką cenę."),
  (["converting","exchanging","replacing","translating"],"A","Convert X into Y = przekształcać X w Y."),
  (["push","hold","lay","take"],"A","Push up prices = podbijać ceny."),
  (["outweigh","overcome","overlook","outlast"],"A","Outweigh = przeważać nad."),
  (["distributed","scattered","dispersed","deposited"],"A","Distribute fairly = sprawiedliwie rozdzielać.")])
p1("uoe-p1-6","Learning from failure",
 "In many cultures, failure is still seen as something to be {{1}} of. Yet researchers increasingly argue that setbacks are an essential {{2}} of learning. When we make mistakes, our brains {{3}} attention to the gap between what we expected and what actually happened, and this is precisely what drives improvement. Several successful entrepreneurs have {{4}} out the benefits of early failure; one of them {{5}} his first business as 'the most expensive lesson of my life'. {{6}} this, not everyone benefits equally. People who are {{7}} of punishment tend to take fewer risks and therefore learn less. Schools and workplaces can help by {{8}} an atmosphere in which honest mistakes are treated as opportunities rather than offences.",
 [(["ashamed","embarrassing","humiliating","regretting"],"A","Be ashamed of = wstydzić się czegoś."),
  (["part","section","portion","segment"],"A","An essential part of = istotna część."),
  (["pay","take","make","spend"],"A","Pay attention to = zwracać uwagę na."),
  (["pointed","pulled","picked","pushed"],"A","Point out = wskazywać na."),
  (["described","explained","announced","reported"],"A","Describe X as Y = określać X jako Y."),
  (["Despite","Although","However","Whereas"],"A","Despite + this (rzeczownik/zaimek) = pomimo tego."),
  (["fearful","fearing","feared","frightening"],"A","Be fearful of = bać się czegoś."),
  (["fostering","raising","growing","feeding"],"A","Foster an atmosphere = pielęgnować atmosferę.")])
# ---------- PART 2
p2("uoe-p2-5","The smell of memory",
 "Few things bring back memories as vividly {{1}} a familiar smell. A whiff of freshly baked bread can transport us instantly to our grandmother's kitchen, {{2}} a certain perfume may remind us of a person we have not seen for years. Scientists believe this happens {{3}} the part of the brain that processes smells is closely linked to the areas responsible for emotion and memory. {{4}} other senses, smell does not pass through the thalamus, a kind of relay station, before reaching these areas. Researchers have even suggested that smells could be used to help people suffering {{5}} memory loss, although it is far from clear how effective such treatments would be. Whatever the answer, it is hard to deny {{6}} powerful a role scent plays in our lives. No sooner had the study been published {{7}} perfume companies began to show interest, hoping to turn its findings into profit. It remains {{8}} be seen whether they will succeed.",
 [(["AS"],"As ... as w porównaniu: as vividly as."),(["WHILE","WHEREAS","AND"],"Łącznik zestawiający dwie sytuacje: while/whereas."),(["BECAUSE","SINCE","AS"],"Przyczyna: this happens because..."),(["UNLIKE"],"Unlike other senses = w odróżnieniu od innych zmysłów."),(["FROM"],"Suffer from = cierpieć na."),(["HOW"],"Deny how powerful = zaprzeczać, jak potężna."),(["THAN"],"No sooner had... than = ledwie... a już."),(["TO"],"It remains to be seen = okaże się.")])
p2("uoe-p2-6","Island communities",
 "On the remote island of Tristan da Cunha, around 250 people live {{1}} what is often described as the most isolated community on earth. The nearest inhabited land is more than two thousand kilometres away, {{2}} means that supplies arrive only a few times a year by ship. Residents have learnt to rely {{3}} themselves, growing potatoes and fishing for lobster. Not only {{4}} they manage to survive, they have also built a close-knit society in which everyone knows everybody else. Visitors are rare, and those who do come are often surprised {{5}} the warmth of the welcome. Although life is simple, the islanders are by no {{6}} unaware of the modern world. Satellite internet has been available for several years, and many young people wish they {{7}} travel abroad for study. Yet the majority choose to return, saying that nowhere else offers {{8}} a sense of belonging.",
 [(["IN"],"Live in = mieszkać w."),(["WHICH"],"Zdanie względne odnoszące się do całej sytuacji: which means."),(["ON","UPON"],"Rely on = polegać na."),(["DO"],"Not only do they manage = inwersja po not only."),(["AT","BY"],"Surprised at/by = zaskoczony czymś."),(["MEANS"],"By no means = bynajmniej."),(["COULD"],"Wish + could = żałować, że nie można."),(["SUCH"],"Such a sense of belonging = takie poczucie przynależności.")])
p2("uoe-p2-7","The case for boredom",
 "In an age of constant stimulation, boredom is generally regarded as something to be avoided {{1}} all costs. We reach for our phones the moment we find ourselves waiting {{2}} a bus or standing in a queue. Psychologists, {{3}}, suggest that this habit may be doing us more harm than good. Boredom, they argue, is a signal telling us that {{4}} we are doing is no longer rewarding, and it pushes us to look for something new. People who are never bored may therefore miss {{5}} on opportunities to think creatively. In one experiment, volunteers who had spent time copying phone numbers came up {{6}} more original ideas than those who had gone straight to the task. Of course, this is not to say that we should deliberately make ourselves miserable. Rather, we should allow ourselves {{7}} time to do nothing in particular, and see where our minds wander. Such moments, however dull they may seem, can be {{8}} unexpected source of inspiration.",
 [(["AT"],"At all costs = za wszelką cenę."),(["FOR"],"Wait for = czekać na."),(["HOWEVER","THOUGH"],"Przerywnik kontrastu: psychologists, however, suggest."),(["WHAT"],"What we are doing = to, co robimy."),(["OUT"],"Miss out on = tracić okazję."),(["WITH"],"Come up with = wymyślić."),(["SOME","ENOUGH","MORE"],"Allow ourselves some time = pozwolić sobie na trochę czasu."),(["AN"],"An unexpected source = nieoczekiwane źródło.")])
# ---------- PART 3
p3("uoe-p3-5","AI in the classroom",
 "The arrival of artificial intelligence in the classroom has sparked a {{1}} debate among teachers. Supporters argue that AI tools can offer students {{2}} feedback instantly, making it possible to work at their own pace. Many teachers also welcome the {{3}} in time spent marking homework. Opponents, however, warn of a growing {{4}} on technology which may weaken pupils' ability to think independently. There are also concerns about {{5}} in automatically generated explanations, and about how pupils' data is {{6}}. Some educators go further and say that excessive use of AI is {{7}} because it encourages shortcuts. Most agree, though, that the technology is here to stay, so the question is how to use it {{8}}.",
 [("CONTROVERSY",["CONTROVERSIAL"],"Przymiotnik przed debate: controversial."),("PERSON",["PERSONALISED","PERSONALIZED"],"Przymiotnik przed feedback: personalised."),("REDUCE",["REDUCTION"],"Rzeczownik po the: reduction."),("RELY",["RELIANCE"],"Growing reliance on = rosnące uzależnienie od."),("ACCURATE",["INACCURACIES","INACCURACY"],"Przeczący rzeczownik: inaccuracies."),("PROTECT",["PROTECTED"],"Strona bierna: is protected."),("PRODUCE",["UNPRODUCTIVE","COUNTERPRODUCTIVE"],"Przymiotnik przeczący: unproductive."),("RESPONSIBLE",["RESPONSIBLY"],"Przysłówek: use it responsibly.")])
p3("uoe-p3-6","Urban farming",
 "A growing number of city dwellers are turning to {{1}} on rooftops and in disused car parks. Supporters stress the {{2}} benefits, such as shorter transport routes and less {{3}} waste. Locally grown vegetables are also {{4}} fresher than those transported over long distances. For many participants, however, the main {{5}} is social: community gardens bring neighbours together and give a sense of {{6}}. Not everything is rosy. Setting up a rooftop garden can be {{7}}, and the harvest is rarely enough to make a {{8}} difference to a family's food bill.",
 [("FARM",["FARMING"],"Rzeczownik odczasownikowy: farming."),("ENVIRONMENT",["ENVIRONMENTAL"],"Przymiotnik przed benefits."),("PACK",["PACKAGING"],"Packaging waste = odpady opakowaniowe."),("SIGNIFICANT",["SIGNIFICANTLY"],"Przysłówek przed przymiotnikiem fresher."),("ATTRACT",["ATTRACTION"],"The main attraction = główny atut."),("BELONG",["BELONGING"],"A sense of belonging = poczucie przynależności."),("EXPENSE",["EXPENSIVE"],"Przymiotnik po be."),("SUBSTANCE",["SUBSTANTIAL"],"A substantial difference = zasadnicza różnica.")])
p3("uoe-p3-7","A short history of coffee",
 "According to legend, coffee was discovered by an Ethiopian goat herder who noticed the {{1}} lively behaviour of his animals after they had eaten red berries. By the fifteenth century, the drink had spread to Arabia, where coffee houses became popular places for {{2}} and the exchange of news. European authorities viewed these gatherings with {{3}}, and some even tried to ban the drink. Such attempts proved {{4}}, and by the seventeenth century cafés had appeared in cities from Venice to London. Today, coffee is one of the world's most valuable {{5}}. Yet its production raises serious {{6}} questions, since many growers earn very little. Campaigners call for greater {{7}} in the supply chain, so that consumers can see who profits from their {{8}}.",
 [("USUAL",["UNUSUALLY"],"Przysłówek z przeczeniem: unusually lively."),("DISCUSS",["DISCUSSION","DISCUSSIONS"],"Rzeczownik po for: discussion."),("SUSPECT",["SUSPICION"],"Rzeczownik po with: suspicion."),("SUCCESS",["UNSUCCESSFUL"],"Przeczący przymiotnik: unsuccessful."),("EXPORT",["EXPORTS"],"Rzeczownik w liczbie mnogiej po most valuable."),("ETHIC",["ETHICAL"],"Przymiotnik przed questions."),("TRANSPARENT",["TRANSPARENCY"],"Rzeczownik po greater."),("PURCHASE",["PURCHASES"],"Rzeczownik po their.")])
# ---------- PART 4
p4("uoe-p4-wzorce-czasownikowe","Wzorce czasownikowe: -ing i bezokolicznik","Regret, get used to, can't help, it's no use, object to, look forward to",[
 ("I'm sorry that I didn't tell you earlier.","REGRET","I","you earlier.",[["REGRET NOT"],["TELLING","HAVING TOLD"]],"REGRET NOT TELLING","Regret + -ing: żałować, że się coś zrobiło."),
 ("Practising every day no longer feels strange to Maya.","USED","Maya has","every day.",[["GOT USED TO","BECOME USED TO"],["PRACTISING"]],"GOT USED TO PRACTISING","Get used to + -ing = przyzwyczaić się do."),
 ("I found it impossible not to laugh at his hat.","HELP","I","at his hat.",[["COULDN'T HELP","COULD NOT HELP"],["LAUGHING"]],"COULDN'T HELP LAUGHING","Can't help + -ing = nie móc się powstrzymać."),
 ("There is no point arguing with him.","USE","It is","with him.",[["NO USE"],["ARGUING"]],"NO USE ARGUING","It's no use + -ing."),
 ("She doesn't mind getting up early.","OBJECT","She doesn't","up early.",[["OBJECT TO"],["GETTING"]],"OBJECT TO GETTING","Object to + -ing = sprzeciwiać się (to jest przyimek)."),
 ("I am eager to see you again next month.","FORWARD","I am looking","you again next month.",[["FORWARD TO"],["SEEING"]],"FORWARD TO SEEING","Look forward to + -ing.")])
p4("uoe-p4-czasowniki-frazowe","Czasowniki frazowe i kolokacje","Call off, put up with, make up, look up to, run out of, come into effect",[
 ("They decided not to hold the meeting because of a lack of interest.","OFF","The meeting","because of a lack of interest.",[["WAS CALLED"],["OFF"]],"WAS CALLED OFF","Call off = odwołać."),
 ("I find it hard to tolerate his rudeness.","UP","I can't","his rudeness.",[["PUT UP"],["WITH"]],"PUT UP WITH","Put up with = znosić."),
 ("He invented an excuse for being late.","UP","He","for being late.",[["MADE UP"],["AN EXCUSE"]],"MADE UP AN EXCUSE","Make up an excuse = zmyślić wymówkę."),
 ("Everyone admires her for her honesty.","LOOKED","She","by everyone because of her honesty.",[["IS LOOKED"],["UP TO"]],"IS LOOKED UP TO","Look up to = podziwiać (strona bierna)."),
 ("We have almost no paper left.","RUNNING","We are","paper.",[["RUNNING OUT"],["OF"]],"RUNNING OUT OF","Run out of = skończyć się."),
 ("The new rules will start to apply in September.","EFFECT","The new rules will","in September.",[["COME INTO"],["EFFECT"]],"COME INTO EFFECT","Come into effect = wejść w życie.")])
p4("uoe-p4-spojniki-przyczyna","Spójniki, przyczyna i przeciwieństwo","In spite of, due to, as long as, in contrast to, as a result of, although",[
 ("Although it was raining, they carried on playing.","SPITE","They carried on playing","the rain.",[["IN SPITE"],["OF"]],"IN SPITE OF","In spite of + rzeczownik = pomimo."),
 ("He couldn't attend the meeting as he was ill.","DUE","He couldn't attend the meeting","ill.",[["DUE TO"],["BEING"]],"DUE TO BEING","Due to + -ing = z powodu."),
 ("I'll lend you the book provided that you return it by Friday.","LONG","I'll lend you the book","you return it by Friday.",[["AS LONG"],["AS"]],"AS LONG AS","As long as = pod warunkiem, że."),
 ("Whereas his brother is outgoing, Paul is rather shy.","CONTRAST","In","outgoing brother, Paul is rather shy.",[["CONTRAST TO","CONTRAST WITH"],["HIS"]],"CONTRAST TO HIS","In contrast to = w przeciwieństwie do."),
 ("Because of the heavy traffic, we missed the start of the concert.","RESULT","As","heavy traffic, we missed the start of the concert.",[["A RESULT"],["OF THE"]],"A RESULT OF THE","As a result of = w wyniku."),
 ("Despite his lack of experience, he got the job.","ALTHOUGH","He got the job","experience.",[["ALTHOUGH HE"],["LACKED"]],"ALTHOUGH HE LACKED","Although + zdanie, w miejsce despite + rzeczownik.")])
