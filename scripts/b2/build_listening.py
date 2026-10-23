from common import *
F="certyfikat-b2"
# PART 1: 8 short extracts, 3 options
P1=[("Man: Hi Anna, it's Tom. I couldn't get tickets for Saturday, they were sold out. I got two for Sunday instead. Is that okay for you? Call me back when you can.","Why is Tom phoning Anna?",["to invite her to a concert","to ask whether she agrees to a change of day","to tell her the concert is cancelled"],1,"Biletów na sobotę zabrakło, pyta o zgodę na niedzielę."),
 ("Woman: I used to think the gym was only for people who wanted big muscles. Then my doctor said I should start doing some exercise because of my back. I joined a class for beginners, and it's actually really friendly.","What changed the woman's attitude to the gym?",["a friend's advice","a medical recommendation","an advertisement"],1,"Lekarz zalecił ćwiczenia."),
 ("Man: I've been trying to save money for a new laptop, but it's harder than I expected. Every time I get paid, something comes up, like a friend's birthday or a school trip. I'll probably need another three months.","How does the man feel about saving?",["It is more difficult than he thought.","It is easier than he thought.","It is not necessary."],0,"Harder than I expected."),
 ("Woman: Excuse me, is this the train to Edinburgh?\nMan: No, that's platform four. This one goes to Glasgow. You'd better hurry, it leaves in five minutes.","What does the man advise the woman to do?",["wait for the next train","change platforms quickly","buy a ticket to Glasgow"],1,"Platforma 4, pociąg za pięć minut."),
 ("Man: The film was beautifully shot, but I found the plot a bit slow. By the middle I was checking my watch. Still, the ending made up for it.","What is the man's opinion of the film?",["He liked the beginning most.","He had mixed feelings.","He thought it was too short."],1,"Opinia mieszana."),
 ("Woman: I've decided not to apply for the job in London. It's a great opportunity, but I'd have to leave my family and friends, and I'm not ready for that.","Why won't the woman apply?",["The salary is too low.","She doesn't want to leave her family.","She has another offer."],1,"Nie chce zostawiać rodziny i przyjaciół."),
 ("Man: Our teacher gave us a project about local history. I thought it would be boring, but my group interviewed an old man who remembered the war. It was fascinating.","What did the boy find surprising about the project?",["It was easy.","It was interesting.","It was short."],1,"Fascinating zamiast boring."),
 ("Woman: I'm so annoyed. I bought these shoes last week, and the sole is already coming off. I took them back, but the shop said I couldn't have a refund because I'd worn them.","Why is the woman annoyed?",["The shop refused to refund her.","The shoes were too small.","The shop was closed."],0,"Odmówiono zwrotu.")]
l=[]
for sc,q,o,c,e in P1:
    l.append(mc("listening",q,o,c,e,notes(c,*["Nie wynika z nagrania."]*2),script=sc,maxPlays=2))
mkset(F,"b2-listening-p1-1","B2","Listening Part 1 – 8 krótkich nagrań (syntezator mowy)",l,"Posłuchaj każdego nagrania dwa razy i wybierz odpowiedź A, B lub C.",None,"exam")

# PART 2: sentence completion, shared script
S2="""Hello everyone. Today I'd like to tell you about the Youth Sailing Camp, which takes place every summer on a lake in the north of the country. The camp lasts ten days, and it's open to teenagers aged between thirteen and seventeen.

Most participants have never sailed before, so on the first day we teach the basics. You'll learn the names of the parts of the boat, and you'll practise tying knots. The first lesson on the water is usually on the second day, in small boats for two people.

Each morning, the group starts with a short run along the beach. After breakfast, we have lessons until noon. In the afternoon, you can choose between windsurfing and kayaking. In the evenings, we often sit around a campfire and sing songs.

Accommodation is in tents, which are set up in a forest near the lake. Don't worry about the cold. We give everyone a warm sleeping bag. The price for the whole camp is four hundred and fifty pounds, and this includes all meals. You only need to bring your own towel and a waterproof jacket.

On the last day, there's a race, and the winners get a small trophy. Last year the winner was a fifteen-year-old girl who had never sailed before the camp! If you're interested, please book before the end of May, because places are limited to forty people."""
G2=[("The camp takes place on a lake in the ___ of the country.","north",["north","the north"],"The north."),
 ("Participants must be between thirteen and ___ years old.","17",["17","seventeen"],"Seventeen."),
 ("On the first day, participants practise tying ___.","knots",["knots"],"Knots."),
 ("The first lesson on the water is on the ___ day.","second",["second","2nd"],"The second day."),
 ("Each morning begins with a short ___ along the beach.","run",["run"],"A short run."),
 ("In the afternoon, participants can choose between windsurfing and ___.","kayaking",["kayaking"],"Kayaking."),
 ("Participants sleep in ___.","tents",["tents","tent","a tent"],"Tents in a forest."),
 ("The camp costs ___ pounds.","450",["450","four hundred and fifty","four hundred fifty"],"450 pounds."),
 ("Participants must bring a towel and a ___ jacket.","waterproof",["waterproof"],"A waterproof jacket."),
 ("Places are limited to ___ people.","40",["40","forty"],"Forty people.")]
items=[{"type":"short-answer","kind":"listening","context":"Uzupełnij zdanie jednym do trzech słów lub liczbą.","prompt":p,"accepted":acc,"explanation":e,"maxPlays":2} for p,_,acc,e in G2]
d={"version":1,"id":"b2-listening-p2-1","topic":None,"level":"B2","title":"Listening Part 2 – obóz żeglarski (syntezator mowy)","intro":"Posłuchaj wypowiedzi dwa razy i uzupełnij zdania.","passage":None,"script":S2,"defaultMode":"exam","items":[]}
for n,i in enumerate(items,1): i["id"]=f"b2-listening-p2-1-{n:02d}"; d["items"].append(i)
w(F+"/cwiczenia/b2-listening-p2-1.json",d)

# PART 3: matching, shared script
S3=[("Speaker 1","I thought I'd hate it, because I'm not very sporty. But the first week was fun, and now I'm really improving. My coach says I have talent."),
 ("Speaker 2","I only took up the course to please my parents. They think it will help me get into a good university. Honestly, I'd prefer to spend my evenings with friends."),
 ("Speaker 3","I've been doing it for years, so I wanted to try something different. I'm learning from people with much more experience, and I'm enjoying the challenge."),
 ("Speaker 4","I signed up because my best friend did. We always go together, so it doesn't feel like hard work. I'm not sure I'd carry on without her."),
 ("Speaker 5","I'm doing it to lose weight before the summer. It's quite tiring, but I can already see a difference, and that keeps me going.")]
OPT=["A. I was surprised by how much I liked it.","B. I'm doing it mainly because someone else wants me to.","C. I'm attending to improve my appearance.","D. I find it easier because I'm with a friend.","E. I'm happy to be learning from better players.","F. I'm too busy to do it regularly.","G. I wanted to challenge myself.","H. I think it's too expensive."]
ans=[0,1,6,3,2]
S3t="\n\n".join(f"{a}: {b}" for a,b in S3)
exp3=["Zaskoczony, że mu się podoba.","Robi to dla rodziców.","Chce spróbować nowego wyzwania z lepszymi.","Łatwiej, bo z przyjaciółką.","Chce poprawić wygląd."]
items=[{"type":"multiple-choice","kind":"listening","prompt":f"Speaker {n}: co wyraża ta osoba?","options":OPT,"correct":a,"fixedOrder":True,"explanation":e,"maxPlays":2} for n,(a,e) in enumerate(zip(ans,exp3),1)]
d={"version":1,"id":"b2-listening-p3-1","topic":None,"level":"B2","title":"Listening Part 3 – dopasowanie (syntezator mowy)","intro":"Pięć osób mówi o zajęciach sportowych. Dopasuj każdą do stwierdzenia A–H. Trzy stwierdzenia nie pasują do żadnej osoby.","passage":None,"script":S3t,"defaultMode":"exam","items":[]}
for n,i in enumerate(items,1): i["id"]=f"b2-listening-p3-1-{n:02d}"; d["items"].append(i)
w(F+"/cwiczenia/b2-listening-p3-1.json",d)

# PART 4: interview
S4="""Interviewer: Today I'm talking to Daniel Hart, who recently came back from a six-month trip around South America. Daniel, why did you decide to go?
Daniel: Well, I'd finished my studies and I didn't know what to do next. A friend of mine had done something similar, and he told me it changed his way of thinking. So I thought, why not?

Interviewer: Was it difficult to organise?
Daniel: The planning was easier than I expected. The hardest part was telling my parents. They were worried, especially when I said I would travel alone. In the end, they accepted it, as long as I called them every Sunday.

Interviewer: What was the best moment?
Daniel: Probably a night in the Andes. We were staying with a local family, and they invited me to a village festival. There was music, dancing, and everybody wanted to talk to me, even though my Spanish was terrible. I'll never forget it.

Interviewer: Were there any problems?
Daniel: Of course. In Peru, someone stole my backpack with my camera and my phone. At first I was devastated, but then I realised that it was just things. People helped me a lot, and I met more locals because I had to ask for directions without a phone.

Interviewer: What advice would you give to people planning a similar trip?
Daniel: Don't plan every day. Leave room for surprises. And learn at least some of the language. People respect the effort, even if you make mistakes.

Interviewer: And what have you learned about yourself?
Daniel: That I'm more patient than I thought. Things don't always go to plan, and that's okay."""
Q4=[("Why did Daniel decide to travel?",["He wanted to follow his friend's example.","He wanted to find a job abroad.","He was bored with his studies."],0,"Przyjaciel opowiedział, że to zmieniło jego sposób myślenia."),
 ("What was the most difficult part of preparing?",["Booking flights","Telling his parents","Learning Spanish"],1,"Najtrudniej było powiedzieć rodzicom."),
 ("What does Daniel say about the festival?",["He felt uncomfortable.","Everyone wanted to talk to him.","He understood everything."],1,"Everybody wanted to talk to me."),
 ("How did Daniel feel after the theft?",["He decided to return home.","He was upset but then accepted it.","He was angry with the locals."],1,"Devastated, ale potem zrozumiał, że to tylko rzeczy."),
 ("What good thing resulted from losing his phone?",["He saved money.","He met more local people.","He slept better."],1,"Pytał o drogę, poznawał ludzi."),
 ("What advice does Daniel give?",["Plan each day carefully.","Take a lot of money.","Leave time for the unexpected."],2,"Don't plan every day."),
 ("What has Daniel learned about himself?",["He is braver than he thought.","He is more patient than he thought.","He is more organised than he thought."],1,"More patient than I thought.")]
items=[mc("listening",q,o,c,e,notes(c,*["Nie wynika z nagrania."]*2),maxPlays=2) for q,o,c,e in Q4]
d={"version":1,"id":"b2-listening-p4-1","topic":None,"level":"B2","title":"Listening Part 4 – wywiad (syntezator mowy)","intro":"Posłuchaj wywiadu dwa razy i wybierz odpowiedź A, B lub C.","passage":None,"script":S4,"defaultMode":"exam","items":[]}
for n,i in enumerate(items,1): i["id"]=f"b2-listening-p4-1-{n:02d}"; d["items"].append(i)
w(F+"/cwiczenia/b2-listening-p4-1.json",d)
