from common import *
F="certyfikat-b2"
def cloze(i,part,title,text,gaps):
    G=[]
    for n,(o,a,e) in enumerate(gaps,1):
        G.append({"n":n,"options":dict(zip("ABCD",o)),"answer":a,"explanation":e})
    w(f"{F}/cwiczenia/{i}.json",{"id":i,"part":part,"type":"multiple-choice-cloze","title":title,"instructions":"Wybierz słowo (A, B, C lub D), które najlepiej pasuje do luki. Każda luka to 1 punkt.","maxScore":len(G),"text":text,"gaps":G})
def openc(i,title,text,gaps):
    w(f"{F}/cwiczenia/{i}.json",{"id":i,"part":2,"type":"open-cloze","title":title,"instructions":"Wpisz w każdą lukę dokładnie jedno słowo. Skróty typu don't nie są poprawną odpowiedzią. Każda luka to 1 punkt.","maxScore":len(gaps),"text":text,"gaps":[{"n":n,"accept":[a.upper() for a in acc],"explanation":e} for n,(acc,e) in enumerate(gaps,1)]})
def wf(i,title,text,gaps):
    w(f"{F}/cwiczenia/{i}.json",{"id":i,"part":3,"type":"word-formation","title":title,"instructions":"Utwórz od słowa wielkimi literami słowo, które pasuje do luki. Uważaj na przedrostki, liczbę mnogą i pisownię. Każda luka to 1 punkt.","maxScore":len(gaps),"text":text,"gaps":[{"n":n,"stem":s,"accept":[a],"explanation":e} for n,(s,a,e) in enumerate(gaps,1)]})

cloze("b2-uoe-p1-1",1,"Learning to cook",
 "Learning to cook can be one of the most {{1}} things you do in your free time. At first, it may seem difficult, but with a little {{2}} you will soon notice progress. Many beginners {{3}} the mistake of trying complicated recipes. A better idea is to {{4}} with simple dishes such as soup or pasta. Cooking with friends is also a good way to {{5}} new ideas. If a recipe goes wrong, do not {{6}} up. Even professional chefs {{7}} mistakes, and they often learn more from them than from their successes. In the end, the {{8}} of a delicious meal made with your own hands is hard to beat.",
 [(["rewarding","reliable","reasonable","relevant"],"A","rewarding = dający satysfakcję."),
  (["practice","practise","practical","practically"],"A","Rzeczownik po a little: practice (BrE rzeczownik)."),
  (["do","make","take","have"],"B","make a mistake."),
  (["begin","start","open","go"],"B","start with = zacząć od."),
  (["exchange","share","divide","spread"],"B","share ideas = dzielić się pomysłami."),
  (["give","put","take","hold"],"A","give up = poddać się."),
  (["make","do","cause","create"],"A","make mistakes."),
  (["satisfaction","satisfied","satisfy","satisfying"],"A","Rzeczownik po the: satisfaction.")])
cloze("b2-uoe-p1-2",1,"Working from home",
 "More and more people are {{1}} to work from home, and the trend is likely to continue. One of the main {{2}} is the time saved on travelling. Employees can also {{3}} their working hours to suit their family life. However, there are drawbacks. Some people find it hard to {{4}} their private life from their work, especially when the office is in the living room. Others miss the contact with colleagues and {{5}} lonely. Managers, too, face new {{6}}, as it is more difficult to {{7}} how well the team is working. Experts therefore recommend that companies keep a {{8}} between remote and office work.",
 [(["choosing","deciding","judging","preferring"],"A","choose to work = decydować się pracować."),
  (["benefits","profits","gains","rewards"],"A","the main benefits."),
  (["adapt","adjust","arrange","regulate"],"B","adjust working hours = dopasować godziny."),
  (["separate","divide","split","part"],"A","separate X from Y."),
  (["feel","find","get","seem"],"A","feel lonely."),
  (["challenges","problems","fights","difficulties"],"A","face new challenges (kolokacja)."),
  (["measure","monitor","count","weigh"],"B","monitor how well = śledzić, jak dobrze."),
  (["balance","level","scale","rate"],"A","keep a balance between.")])
openc("b2-uoe-p2-1","A weekend in the mountains",
 "Last weekend my friends and I decided to go hiking {{1}} the mountains. We set off early in the morning, {{2}} the weather forecast had promised sun. After two hours, however, the sky turned grey, and it started to rain. We had not taken any waterproof jackets, so we got completely wet. {{3}} spite of this, we continued walking until we reached a small mountain hut. The owner was very kind. He gave us hot tea and made a fire, {{4}} helped us to warm up. We stayed there for an hour, talking and laughing. When the rain stopped, we went down. {{5}} we were tired and hungry, we felt happy. It was not the weekend we had planned, but it was {{6}} of the best weekends we have ever had. Next time, we will check the forecast more carefully, and we will not forget {{7}} take proper clothes. After all, as the saying goes, there is no bad weather, only bad {{8}}.",
 [(["in"],"hiking in the mountains."),(["because","as","since"],"Powód: because/as/since."),(["in"],"in spite of."),(["which"],"Zdanie względne: which helped us."),(["although","though"],"Przeciwstawienie: although."),(["one"],"one of the best = jeden z najlepszych."),(["to"],"forget to take."),(["clothes","clothing"],"Przysłowie: bad clothes.")])
openc("b2-uoe-p2-2","A new hobby",
 "My cousin has always enjoyed taking photographs, but it was only last year {{1}} he decided to turn his hobby into something more serious. He bought a second-hand camera and started attending a course at the local cultural centre. {{2}} first he found it difficult to understand how the settings work, but his teacher was patient and explained everything {{3}} the end of the lesson. Now he spends almost every weekend outside, looking {{4}} interesting subjects. He says that photography has taught him to notice details that he would never have seen otherwise. Last month his picture of an old bridge was published in a local magazine, {{5}} made him extremely proud. Although he does not earn any money yet, he hopes {{6}} be able to work as a professional photographer one day. In the meantime, he is saving up for a better lens. His advice to anyone {{7}} wants to try is simple: do not wait for the perfect equipment, but start {{8}} what you have.",
 [(["that"],"It was ... that: zdanie rozszczepione."),(["at"],"At first."),(["by"],"by the end of the lesson."),(["for"],"look for = szukać."),(["which"],"Zdanie względne odnoszące się do całego poprzedniego."),(["to"],"hope to be able to."),(["who","that"],"anyone who wants."),(["with"],"start with what you have.")])
wf("b2-uoe-p3-1","City life",
 "Living in a big city has both {{1}} and disadvantages. The main {{2}} is the choice of jobs and entertainment. In addition, public transport is usually more {{3}} than in small towns. On the other hand, the cost of living can be very high, and housing is often {{4}}. Many residents also complain about the {{5}} of the air and constant noise. As a result, some people leave the city to find a more {{6}} life in the countryside. However, a growing number of cities are now trying to become more {{7}} places by building parks and cycle lanes. Their {{8}} shows that city life can be made much healthier.",
 [("ADVANTAGE","ADVANTAGES","Liczba mnoga: advantages and disadvantages."),("ATTRACT","ATTRACTION","Rzeczownik po The main: attraction."),("RELY","RELIABLE","Przymiotnik: more reliable."),("AFFORD","UNAFFORDABLE","Przeczenie przymiotnika: unaffordable."),("POLLUTE","POLLUTION","Rzeczownik: the pollution of the air."),("PEACE","PEACEFUL","Przymiotnik: peaceful."),("SUSTAIN","SUSTAINABLE","Przymiotnik: sustainable."),("SUCCEED","SUCCESS","Rzeczownik: Their success.")])
wf("b2-uoe-p3-2","Online shopping",
 "Online shopping has gained great {{1}} in recent years. Customers appreciate the {{2}} of buying things without leaving home. Prices are often lower, and there is a much wider {{3}} of products. However, there are also some {{4}}. For example, it is impossible to try on clothes, and a wrong size can be {{5}}. Some shoppers have also had {{6}} experiences with companies which did not deliver on time. Experts advise {{7}} to read opinions of other customers before they buy. A little {{8}} before you click can save a lot of money and stress.",
 [("POPULAR","POPULARITY","Rzeczownik po great: popularity."),("CONVENIENT","CONVENIENCE","Rzeczownik po the."),("SELECT","SELECTION","Rzeczownik: wider selection."),("DISADVANTAGE","DISADVANTAGES","Liczba mnoga po some."),("FRUSTRATE","FRUSTRATING","Przymiotnik: frustrating."),("PLEASE","UNPLEASANT","Przeczący przymiotnik: unpleasant."),("SHOP","SHOPPERS","Rzeczownik w liczbie mnogiej: advise shoppers."),("PLAN","PLANNING","Rzeczownik: A little planning.")])

def tr(i,title,focus,items):
    out=[]
    for n,(first,kw,before,after,parts,model,expl) in enumerate(items,1):
        out.append({"n":n,"first":first,"keyword":kw,"before":before,"after":after,"parts":parts,"model":model,"explanation":expl})
    w(f"{F}/cwiczenia/{i}.json",{"id":i,"part":4,"type":"transformation","title":title,"focus":focus,"wordLimit":[2,5],
     "instructions":"Uzupełnij drugie zdanie tak, żeby znaczyło to samo co pierwsze. Użyj podanego słowa bez zmieniania go. Wpisz od 2 do 5 słów, łącznie ze słowem kluczowym (skróty typu doesn't liczą się jako dwa słowa). Każda odpowiedź jest warta 2 punkty – po 1 za każdą część.",
     "maxScore":2*len(out),"items":out})
tr("b2-uoe-p4-1","Strona bierna, warunki i mowa zależna","Podstawowe struktury B2",[
 ("They are repairing the road at the moment.","BEING","The road","at the moment.",[["IS BEING"],["REPAIRED"]],"IS BEING REPAIRED","Present Continuous passive: is being repaired."),
 ("If I had more time, I would learn Spanish.","WISH","I","more time to learn Spanish.",[["WISH I HAD"]],"WISH I HAD","I wish + Past Simple."),
 ("'I'll call you tomorrow,' said Tom.","WOULD","Tom said that he","me the next day.",[["WOULD"],["CALL"]],"WOULD CALL","Mowa zależna: would call."),
 ("It is possible that she forgot the appointment.","MIGHT","She","the appointment.",[["MIGHT HAVE"],["FORGOTTEN"]],"MIGHT HAVE FORGOTTEN","might have + III forma."),
 ("I started learning English five years ago.","BEEN","I","English for five years.",[["HAVE BEEN"],["LEARNING"]],"HAVE BEEN LEARNING","Present Perfect Continuous z for."),
 ("My sister is shorter than me.","NOT","My sister","as me.",[["IS NOT"],["AS TALL"]],"IS NOT AS TALL","not as tall as = niższa.")])
tr("b2-uoe-p4-2","Struktury emfatyczne i modalne","Bardziej wymagające transformacje",[
 ("It's a pity I didn't go to the party.","WISH","I","to the party.",[["WISH I HAD"],["GONE"]],"WISH I HAD GONE","wish + Past Perfect."),
 ("People say that he is a talented painter.","SAID","He","a talented painter.",[["IS SAID"],["TO BE"]],"IS SAID TO BE","Strona bierna z say: is said to be."),
 ("You should see a doctor.","BETTER","You","a doctor.",[["HAD BETTER"],["SEE"]],"HAD BETTER SEE","had better + bezokolicznik bez to."),
 ("He couldn't open the door because he had lost the key.","SINCE","He couldn't open the door","lost the key.",[["SINCE HE"],["HAD"]],"SINCE HE HAD","since jako przyczyna."),
 ("We began the meeting at nine and it is still going on.","BEEN","The meeting","since nine.",[["HAS BEEN"],["GOING ON"]],"HAS BEEN GOING ON","Present Perfect Continuous."),
 ("I find it hard to get up early.","USED","I am not","up early.",[["USED TO"],["GETTING"]],"USED TO GETTING","be used to + -ing.")])
