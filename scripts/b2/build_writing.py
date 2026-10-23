from common import *
import json
F="certyfikat-b2"
tasks=[]
def tk(i,part,genre,title,prompt,model,points,checklist):
    tasks.append({"id":i,"genre":genre,"part":part,"title":title,"prompt":prompt,"points":points,"genreChecklist":checklist,"model":model})
ESSAY=["Czy omówiłem/am oba pomysły z ramki?","Czy dodałem/am własny pomysł?","Czy ton jest neutralny lub półformalny i spójny?","Czy mam 140–190 słów?"]
tk("essay-homework",1,"essay","Essay – domowe zadania",
"In your English class you have been talking about homework. Now your teacher has asked you to write an essay.\n\nWrite an essay using ALL the notes and give reasons for your point of view.\n\nIs homework a good idea?\nNotes - Write about:\n1. learning\n2. free time\n3. (your own idea)\n\nWrite your essay in 140–190 words.",
"""Homework is a part of school life in almost every country, but is it really a good idea?

On the one hand, homework helps students to learn. Repeating new vocabulary or solving maths problems at home makes it easier to remember what was taught in class. Moreover, pupils who do homework regularly learn to organise their time and take responsibility for their own progress.

On the other hand, homework takes up free time. After a long day at school, teenagers need to relax, meet friends or practise a sport. If they spend three hours every evening on assignments, they may feel tired and stressed, which can have a negative effect on their health and results.

Another point worth mentioning is the quality of homework. In my opinion, short and interesting tasks are far more useful than long, repetitive ones. Teachers could, for example, ask students to prepare a presentation about a subject that they enjoy.

To sum up, I believe that homework is useful as long as it is reasonable in amount and varied in type. Schools should find a balance between learning and rest.""",20,ESSAY)
tk("essay-transport",1,"essay","Essay – transport publiczny",
"In your English class you have been talking about public transport in cities. Now your teacher has asked you to write an essay.\n\nWrite an essay using ALL the notes and give reasons for your point of view.\n\nShould city centres be closed to cars?\nNotes - Write about:\n1. pollution\n2. convenience\n3. (your own idea)\n\nWrite your essay in 140–190 words.",
"""Many big cities struggle with heavy traffic, and some have started to ban cars from their centres. Is this a good solution? I think that, in most cases, it is.

First of all, closing the centre to cars would reduce pollution. Exhaust fumes are a serious health problem in cities, and they cause breathing difficulties, especially for children and older people. In cities where cars are not allowed, the air is noticeably cleaner, and the streets are much quieter.

However, convenience is an important issue. Some people, for example the elderly or the disabled, depend on cars to travel around. Shop owners are also afraid that they will lose customers if people can no longer park outside their doors. These worries should be taken seriously.

Another idea is to offer cheap and frequent public transport. If buses and trams are fast and reliable, many people will leave their cars at home without being forced to.

All things considered, I believe that limiting traffic in city centres brings more benefits than problems, provided that there are good alternatives for those who need them.""",20,ESSAY)
tk("article-friend",2,"article","Article – dobry przyjaciel",
"You see this announcement in an English-language magazine for young people.\n\nArticles wanted: What makes a good friend?\nWe would like to hear what you think. Write an article about the qualities of a good friend and say whether friendship has changed because of technology.\nThe best articles will be published next month.\n\nWrite your article in 140–190 words.",
"""What makes a good friend?

Have you ever wondered why some friendships last for decades, while others end after a few months? In my opinion, there are three main qualities of a real friend.

Firstly, a good friend is honest. He or she tells you the truth, even if it is not always pleasant. Secondly, you can rely on a true friend. When you have a problem, he or she is there to listen and help. Finally, good friends share your happiness. They are not jealous of your successes, but celebrate them with you.

Has technology changed friendship? Yes, but not completely. Thanks to messaging apps, we can stay in touch with people who live far away, and that is a great advantage. On the other hand, some people spend more time chatting online than meeting in person, and a message can never replace a hug or a long walk together.

To sum up, friendship still depends on trust and kindness, no matter how we communicate. So, put your phone down, call a friend, and meet for a coffee!""",20,["Czy mam tytuł i ciekawy początek?","Czy odpowiedziałem/am na oba pytania?","Czy zwracam się do czytelnika?","Czy mam 140–190 słów?"])
tk("email-organiser",2,"email","Email – wymiana językowa",
"You have received an email from your English friend Chris, who is coming to visit you.\n\nHi,\nI'm so excited about my visit! Can you tell me what kind of weather to expect, and what clothes I should bring? Also, is there anything special you'd like me to bring from England? Finally, what would you like to do on my first day?\nBest wishes, Chris\n\nWrite your email in 140–190 words.",
"""Hi Chris,

Thanks for your email. I'm really looking forward to your visit, too!

The weather here in October is usually cool and sometimes rainy, so I'd suggest bringing a warm jacket, an umbrella and comfortable shoes. It can also be sunny during the day, so a light sweater would be useful as well.

As for a present, don't worry about it. But if you could bring a few English magazines about music, that would be great, because I'd like to read something authentic. My mum would love some English tea, too, if it's not too much trouble.

On your first day, I thought we could have lunch at my favourite restaurant, which serves traditional Polish dishes. After that, we could walk around the old town and visit the castle. In the evening, I'm planning to invite a few friends so that you can meet them. I hope you'll like the plan.

Let me know if you want to change anything. Safe journey and see you soon!

Best wishes,
XYZ""",20,["Czy odpowiedziałem/am na wszystkie pytania?","Czy ton jest przyjacielski?","Czy mam początek i zakończenie?","Czy mam 140–190 słów?"])
tk("review-film",2,"review","Review – film",
"You have seen this notice in an English-language magazine.\n\nReviews wanted: A film you enjoyed\nWrite a review of a film that you enjoyed. Describe the story, say what you liked and disliked, and tell readers whether you would recommend it.\nThe best reviews will be published.\n\nWrite your review in 140–190 words.",
"""A film worth watching: The Lighthouse Keeper

If you enjoy quiet stories with beautiful scenery, I'd highly recommend the film The Lighthouse Keeper, which I watched last weekend.

The film tells the story of an old man who lives alone on a rocky island and looks after a lighthouse. One stormy night, he rescues a young girl from a broken boat, and their friendship slowly changes both their lives.

What I liked most was the photography. The sea, the sky and the old lighthouse look stunning on the screen. In addition, the main actor is brilliant: you can see his feelings in his eyes, even when he says nothing. The music is another highlight, as it matches the mood perfectly.

On the other hand, some scenes are too slow, and a few viewers may find them boring. The ending is also a little predictable.

Despite these small weaknesses, I'd recommend the film to anyone who wants to relax and think. It's not an action movie, but it stays in your mind for a long time.""",20,["Czy opisałem/am fabułę bez zdradzania zakończenia?","Czy podałem/am zalety i wady?","Czy jest rekomendacja?","Czy mam 140–190 słów?"])
tk("report-school",2,"report","Report – wycieczka szkolna",
"Your school wants to organise a trip for students at the end of the year. You have been asked to write a report for the headteacher on two possible places to visit: a science museum and a national park.\n\nIn your report, you should describe the advantages and disadvantages of each place and recommend which one the school should choose.\n\nWrite your report in 140–190 words.",
"""Report on possible school trips

Introduction
The aim of this report is to compare two destinations for the end-of-year trip and to recommend the better one.

The science museum
The museum offers interactive exhibitions, which would suit students of all ages. It is also close to the city, so the journey would be short and cheap. However, it can be very crowded at weekends, and the tickets are fairly expensive.

The national park
The park offers a chance to spend a whole day in nature, take part in outdoor activities and learn about the environment. The main disadvantage is the distance: the journey takes about two hours each way, and the weather could be a problem.

Conclusion and recommendation
Both places have advantages, but I would recommend the national park. Although it is further away, the experience would be more memorable, and students could develop teamwork skills. To avoid problems with the weather, the school could choose a date in early June and prepare an alternative programme.""",20,["Czy mam tytuł i nagłówki?","Czy porównałem/am oba miejsca?","Czy podałem/am rekomendację?","Czy mam 140–190 słów?"])
tk("story-secret",2,"story","Story – tajemnica (B2 First for Schools)",
"You have seen this announcement in an English-language magazine for students.\n\nStories wanted\nWe are looking for stories for our new magazine. Your story must begin with this sentence:\nWhen Maria opened the door, she could not believe what she saw.\nWrite your story.\n\nWrite your story in 140–190 words.",
"""When Maria opened the door, she could not believe what she saw. In the middle of the living room stood a huge cardboard box with a big red ribbon, and next to it was her grandfather, smiling broadly.

'Happy birthday, Maria!' he said. 'I know you've wanted this for years.'

Maria slowly lifted the lid. Inside, there was a small brown puppy, looking at her with big, curious eyes. She had asked for a dog every year since she was seven, but her parents had always said no because of the small flat.

'But how...?' she asked, with tears in her eyes.

'Your parents and I talked about it,' said her grandfather. 'We agreed that you're old enough to take care of a pet. And I'll help you with the walks.'

Maria hugged the puppy and then her grandfather. She had never felt so happy. That evening, she decided to call the dog Lucky, because he had been waiting for a family as long as she had been waiting for him. It was the best birthday of her life.""",20,["Czy użyłem/am podanego zdania?","Czy opowiadanie ma początek, rozwinięcie i zakończenie?","Czy używam czasów przeszłych?","Czy mam 140–190 słów?"])
w(F+"/trening/pisanie.json",{"id":"trening-pisanie","timeMinutes":40,"wordRange":[140,190],"targetRange":[150,180],"warnBelow":120,
 "rubric":[{"id":"content","label":"Content","max":5},{"id":"communicative","label":"Communicative Achievement","max":5},{"id":"organisation","label":"Organisation","max":5},{"id":"language","label":"Language","max":5}],
 "genericChecklist":["Czy odpowiedziałem/am na wszystkie punkty polecenia?","Czy styl pasuje do odbiorcy?","Czy tekst jest logicznie ułożony?","Czy użyłem/am różnych słów i struktur?","Czy sprawdziłem/am pisownię?"],"tasks":tasks})
