from common import *
import random
F="certyfikat-b2"
# PART 5
P5="""**Learning to live with less**

When Clara Mendez moved into a flat that was half the size of her previous home, she had to decide what to do with most of her belongings. 'I thought it would be a disaster,' she says. 'But after a month I realised that I didn't miss anything.' Clara, a graphic designer, is one of a growing number of people who are trying a simpler lifestyle. She sold her car, gave away more than half of her clothes and now uses a single shelf for her books.

Her friends were not all supportive. 'Some of them thought I was going through a difficult time,' she admits. 'My sister kept asking whether I was sure.' Clara, however, found that her new life gave her more time. She no longer spent weekends cleaning or looking for things, and she started to cycle to work, which she had never done before. 'I feel lighter,' she says. 'And I've discovered that a smaller space makes it easier to concentrate.'

Not everything has been easy, though. Clara found it hard to throw away objects that carried memories, such as letters from her grandmother. In the end, she photographed them and kept only the most important ones. She also admits that she sometimes buys something on impulse, 'but now I ask myself if I will really use it'.

Experts say that Clara's experience is typical. According to researcher Dr Paul Weston, many people feel relief when they own fewer things, but only if the change is their own decision. 'If it is forced, people tend to feel they have lost something,' he explains. 'The key is choice.' For Clara, the biggest surprise was financial. 'I spend about a third less per month,' she says. 'I didn't plan that, but it's a nice bonus.'"""
q=[("Why was Clara worried about her new flat at first?",["She did not like the area.","She had to get rid of many things.","It was more expensive than her old home.","Her friends lived far away."],1,"Had to decide what to do with most of her belongings."),
 ("How did Clara's sister react to her decision?",["She was very proud.","She copied Clara's lifestyle.","She doubted whether it was a good idea.","She offered to help."],2,"My sister kept asking whether I was sure."),
 ("What does Clara say about her smaller space?",["It helps her to focus.","It is hard to keep clean.","It makes her feel lonely.","It is good for her work as a designer."],0,"A smaller space makes it easier to concentrate."),
 ("How did Clara deal with objects from her grandmother?",["She sold them.","She gave them to her sister.","She kept only photographs of them.","She took photographs and kept the most important ones."],3,"She photographed them and kept only the most important ones."),
 ("What does Dr Weston say about people who own fewer things?",["They are always happier.","They feel relief if they decide it themselves.","They tend to save money.","They need advice from experts."],1,"Relief only if the change is their own decision."),
 ("What surprised Clara most?",["She had more friends.","She cycled more.","She spent less money.","She needed fewer clothes."],2,"Spends about a third less per month.")]
items=[mc("reading",a,o,c,e,notes(c,*["Tekst tego nie mówi."]*3)) for a,o,c,e in q]
mkset(F,"b2-reading-p5-1","B2","Reading Part 5 – Learning to live with less",items,"Przeczytaj tekst i wybierz odpowiedź A–D.",P5)

# PART 6
P6="""**A year without a phone**

Last January, 17-year-old Marta decided to give up her smartphone for a whole year. [1] She replaced it with a simple phone that could only call and send messages.

At first, the change felt strange. 'I kept reaching for my pocket,' she says. [2] Her friends also found it difficult, because they were used to sending her photos and links.

After a few months, however, Marta began to see advantages. [3] She read more books, joined a chess club and learned to cook a few dishes. 'I had so much more time,' she says.

Not everything was positive. Without a map on her phone, Marta got lost twice on school trips. [4] She also missed some invitations that were sent only through online groups.

By the end of the year, her feelings were mixed. [5] 'I don't want to give up technology completely,' she says. 'But now I use it, instead of it using me.' [6] She has bought a new phone but removed most of the apps.

**Sentences:**
A. Her idea came after she noticed that she checked her screen about two hundred times a day.
B. Instead of staying at home, she spent evenings doing things she had never tried before.
C. It was a habit she hadn't realised she had.
D. These situations made her realise how much she depended on the device.
E. She says the experience taught her to be more careful about how she spends her time.
F. Her parents have always been strict about screens.
G. Since then, her friends have started to follow her example."""
ans=[("1","A"),("2","C"),("3","B"),("4","D"),("5","E"),("6","G")]
exp={"1":"A wyjaśnia pomysł (po decision).","2":"C: nawyk, o którym mówi 'I kept reaching'.","3":"B rozwija advantages: nowe zajęcia.","4":"D wyciąga wniosek z zabłądzenia.","5":"E podsumowuje jej mieszane uczucia.","6":"G: skutek po powrocie do telefonu: przykład dla znajomych."}
random.seed(3)
items=[]
for n,a in ans:
    others=[x for x in "ABCDEFG" if x!=a]
    opts=sorted([a]+random.sample(others,3))
    items.append(mc("reading",f"Które zdanie pasuje do luki [{n}]?",opts,opts.index(a),exp[n],None,fixedOrder=True))
mkset(F,"b2-reading-p6-1","B2","Reading Part 6 – wstawianie zdań",items,"Wybierz zdanie (A–G) pasujące do każdej luki. Jedno zdanie jest nadmiarowe.",P6)

# PART 7
P7="""**Four people talk about their first job**

**A – Piotr**
My first job was in a bookshop. The manager trusted me to organise the shelves, which I enjoyed because I like order. The pay was low, but I got a discount on books, which I used a lot. I stayed for a year and then left to go to university. The best thing was learning how to talk to customers who didn't know what they wanted.

**B – Hannah**
I worked as a waitress at a seaside café. It was exhausting, as we had hundreds of customers in summer and no time to rest. My colleagues were great, though, and we often went swimming after work. I learned to stay calm under pressure, which later helped me in exams.

**C – Luis**
I delivered newspapers before school. It was cold and dark in winter, and I hated getting up early. But I earned enough to buy my first bike. My father said that the job would teach me responsibility, and he was right. I never missed a day, even when I was ill.

**D – Karen**
I helped at a veterinary clinic on Saturdays. I wasn't allowed to do anything medical, so I mostly cleaned and answered the phone. Still, I loved being around animals and decided to become a vet. Unfortunately, the money was very poor, and I had to ask my parents for help sometimes."""
Q=[("learned to deal with stress","B"),("was influenced by the job when choosing a career","D"),("was encouraged by a parent","C"),("was glad about a reduction in prices of products","A"),("did not enjoy the working hours","C"),("made friends at work","B"),("was not paid well enough","D"),("was responsible for the arrangement of goods","A"),("never missed work","C"),("did a job that was physically tiring","B")]
mkset(F,"b2-reading-p7-1","B2","Reading Part 7 – dopasowanie",[mc("reading",f"Która osoba {t}?",["A","B","C","D"],"ABCD".index(a),f"Dowód w tekście osoby {a}.",None,fixedOrder=True) for t,a in Q],"Przeczytaj cztery krótkie teksty i zdecyduj, która osoba odpowiada każdemu stwierdzeniu.",P7)
