/*
 * base-content.js — BAZOWA lista umiejętności („Angielski A1–C2: niezbędnik do rozmowy”).
 *
 * Ta treść wczytuje się przy pierwszym otwarciu strony w danej przeglądarce
 * (oraz po „Resetuj dane”). W aplikacji lista jest tylko do odczytu; treści
 * zapisane wcześniej w przeglądarce (localStorage) mają pierwszeństwo.
 *
 * Aby zmienić bazę dla wszystkich (np. na GitHub Pages), zmień ten plik
 * albo wklej tu dane z eksportu (pole data.content.data z pliku .json).
 * Usunięcie tego pliku z index.html = start od pustego szkieletu.
 */
window.ELM = window.ELM || {};

window.ELM.BASE_CONTENT = {
  "version": 1,
  "categories": [
    {
      "id": "cat_grammar",
      "name": "Gramatyka i czasy"
    },
    {
      "id": "cat_functions",
      "name": "Funkcje komunikacyjne"
    },
    {
      "id": "cat_vocabulary",
      "name": "Słownictwo"
    }
  ],
  "levels": [
    {
      "id": "A1",
      "description": "**Początkujący**\nCel: przedstawić się i załatwić najprostsze sprawy, gdy rozmówca mówi wolno i wyraźnie.",
      "content": {
        "cat_grammar": {
          "essentials": [
            {
              "id": "e_a1_g01",
              "text": "Present Simple – fakty i rutyna (I live in Wrocław. She works at a bank.)"
            },
            {
              "id": "e_a1_g02",
              "text": "Present Continuous – co dzieje się teraz (I'm reading.)"
            },
            {
              "id": "e_a1_g03",
              "text": "Czasownik to be w przeszłości: was / were (I was at home.)"
            },
            {
              "id": "e_a1_g04",
              "text": "going to – najprostsze plany (I'm going to visit my mum.)"
            },
            {
              "id": "e_a1_g05",
              "text": "to be i have got we wszystkich formach (twierdzenia, przeczenia, pytania)"
            },
            {
              "id": "e_a1_g06",
              "text": "Zaimki osobowe (I, you, he…) i dzierżawcze (my, your, his…)"
            },
            {
              "id": "e_a1_g07",
              "text": "Przedimki a / an / the – podstawy"
            },
            {
              "id": "e_a1_g08",
              "text": "Liczba mnoga rzeczowników, w tym nieregularne (man → men, child → children)"
            },
            {
              "id": "e_a1_g09",
              "text": "There is / there are"
            },
            {
              "id": "e_a1_g10",
              "text": "This / that / these / those"
            },
            {
              "id": "e_a1_g11",
              "text": "Can / can't – umiejętności i prośby"
            },
            {
              "id": "e_a1_g12",
              "text": "Pytania z what, where, when, who, how much, how old"
            },
            {
              "id": "e_a1_g13",
              "text": "Przyimki miejsca (in, on, under, next to) i czasu (at 5 o'clock, on Monday, in July)"
            },
            {
              "id": "e_a1_g14",
              "text": "Szyk zdania: podmiot + orzeczenie + dopełnienie"
            }
          ],
          "topics": []
        },
        "cat_functions": {
          "essentials": [
            {
              "id": "e_a1_f01",
              "text": "Przywitać się, pożegnać, przedstawić siebie i innych"
            },
            {
              "id": "e_a1_f02",
              "text": "Podać imię, wiek, skąd jesteś, czym się zajmujesz"
            },
            {
              "id": "e_a1_f03",
              "text": "Przeliterować imię, podać numer telefonu, godzinę, datę"
            },
            {
              "id": "e_a1_f04",
              "text": "Zamówić coś w kawiarni, zapytać o cenę"
            },
            {
              "id": "e_a1_f05",
              "text": "Poprosić o powtórzenie: Sorry, can you repeat that? Can you speak more slowly?"
            },
            {
              "id": "e_a1_f06",
              "text": "Powiedzieć, co lubisz i czego nie (I like…, I don't like…)"
            }
          ],
          "topics": []
        },
        "cat_vocabulary": {
          "essentials": [
            {
              "id": "e_a1_v01",
              "text": "Zasób słownictwa: ok. 500–700 słów"
            },
            {
              "id": "e_a1_v02",
              "text": "Liczby"
            },
            {
              "id": "e_a1_v03",
              "text": "Dni"
            },
            {
              "id": "e_a1_v04",
              "text": "Miesiące"
            },
            {
              "id": "e_a1_v05",
              "text": "Kolory"
            },
            {
              "id": "e_a1_v06",
              "text": "Rodzina"
            },
            {
              "id": "e_a1_v07",
              "text": "Jedzenie"
            },
            {
              "id": "e_a1_v08",
              "text": "Dom"
            },
            {
              "id": "e_a1_v09",
              "text": "Zawody"
            },
            {
              "id": "e_a1_v10",
              "text": "Codzienne czynności"
            }
          ],
          "topics": []
        }
      }
    },
    {
      "id": "A2",
      "description": "**Podstawowy**\nCel: opowiedzieć o sobie, przeszłości i planach prostymi zdaniami oraz poradzić sobie w sklepie, w podróży i w pracy.",
      "content": {
        "cat_grammar": {
          "essentials": [
            {
              "id": "e_a2_g01",
              "text": "Past Simple – czasowniki regularne i ok. 50 najczęstszych nieregularnych (went, saw, had, made)"
            },
            {
              "id": "e_a2_g02",
              "text": "Past Continuous – tło wydarzeń (I was cooking when he called.)"
            },
            {
              "id": "e_a2_g03",
              "text": "Present Perfect – doświadczenia (Have you ever been to London?), just / already / yet"
            },
            {
              "id": "e_a2_g04",
              "text": "Future z will – decyzje spontaniczne i przewidywania"
            },
            {
              "id": "e_a2_g05",
              "text": "Present Continuous dla ustalonych planów (I'm meeting Tom tomorrow.)"
            },
            {
              "id": "e_a2_g06",
              "text": "Stopniowanie przymiotników (bigger, the biggest, more interesting)"
            },
            {
              "id": "e_a2_g07",
              "text": "Przysłówki częstotliwości (always, usually, sometimes, never) i ich miejsce w zdaniu"
            },
            {
              "id": "e_a2_g08",
              "text": "Rzeczowniki policzalne i niepoliczalne: some / any, much / many, a lot of"
            },
            {
              "id": "e_a2_g09",
              "text": "Czasowniki modalne: must, have to, should, could"
            },
            {
              "id": "e_a2_g10",
              "text": "Pytania o podmiot (Who called you?) vs. o dopełnienie (Who did you call?)"
            },
            {
              "id": "e_a2_g11",
              "text": "Spójniki: and, but, because, so, then"
            },
            {
              "id": "e_a2_g12",
              "text": "Czasownik + -ing / to (I like swimming, I want to go)"
            }
          ],
          "topics": []
        },
        "cat_functions": {
          "essentials": [
            {
              "id": "e_a2_f01",
              "text": "Opowiedzieć, co robiłeś w weekend / na wakacjach"
            },
            {
              "id": "e_a2_f02",
              "text": "Zaproponować coś, przyjąć lub odrzucić zaproszenie (Would you like to…? Let's… How about…?)"
            },
            {
              "id": "e_a2_f03",
              "text": "Zapytać o drogę i ją wyjaśnić"
            },
            {
              "id": "e_a2_f04",
              "text": "Kupić bilet, zarezerwować stolik, zgłosić prosty problem"
            },
            {
              "id": "e_a2_f05",
              "text": "Opisać osobę, miejsce, mieszkanie"
            },
            {
              "id": "e_a2_f06",
              "text": "Porównać dwie rzeczy i powiedzieć, co wolisz"
            }
          ],
          "topics": []
        },
        "cat_vocabulary": {
          "essentials": [
            {
              "id": "e_a2_v01",
              "text": "Zasób słownictwa: ok. 1000–1500 słów"
            },
            {
              "id": "e_a2_v02",
              "text": "Podróże"
            },
            {
              "id": "e_a2_v03",
              "text": "Zakupy"
            },
            {
              "id": "e_a2_v04",
              "text": "Zdrowie"
            },
            {
              "id": "e_a2_v05",
              "text": "Pogoda"
            },
            {
              "id": "e_a2_v06",
              "text": "Praca"
            },
            {
              "id": "e_a2_v07",
              "text": "Czas wolny"
            },
            {
              "id": "e_a2_v08",
              "text": "Ubrania"
            },
            {
              "id": "e_a2_v09",
              "text": "Uczucia"
            },
            {
              "id": "e_a2_v10",
              "text": "Podstawowe phrasal verbs (get up, turn on, look for)"
            }
          ],
          "topics": []
        }
      }
    },
    {
      "id": "B1",
      "description": "**Samodzielny**\nCel: prowadzić rozmowę na znane tematy bez przygotowania, wyrazić opinię i poradzić sobie w większości sytuacji w podróży. To próg „mówię po angielsku”.",
      "content": {
        "cat_grammar": {
          "essentials": [
            {
              "id": "e_b1_g01",
              "text": "Present Perfect vs. Past Simple – świadomy wybór (I've lived here for 3 years vs. I lived there in 2019)"
            },
            {
              "id": "e_b1_g02",
              "text": "Present Perfect Continuous (I've been waiting for an hour.)"
            },
            {
              "id": "e_b1_g03",
              "text": "Past Perfect – co stało się wcześniej (When I arrived, the film had started.)"
            },
            {
              "id": "e_b1_g04",
              "text": "will vs. going to vs. Present Continuous – wybór formy przyszłej"
            },
            {
              "id": "e_b1_g05",
              "text": "used to – dawne nawyki (I used to play football.)"
            },
            {
              "id": "e_b1_g06",
              "text": "Zero, First i Second Conditional (If I had more time, I would travel.)"
            },
            {
              "id": "e_b1_g07",
              "text": "Strona bierna w czasach podstawowych (The house was built in 1920.)"
            },
            {
              "id": "e_b1_g08",
              "text": "Mowa zależna – podstawy (She said she was tired.)"
            },
            {
              "id": "e_b1_g09",
              "text": "Zdania względne: who, which, that, where"
            },
            {
              "id": "e_b1_g10",
              "text": "Modalne do przypuszczeń: might, may, must, can't (He must be tired.)"
            },
            {
              "id": "e_b1_g11",
              "text": "Pytania pośrednie (Could you tell me where the station is?)"
            },
            {
              "id": "e_b1_g12",
              "text": "too / enough, so / such"
            }
          ],
          "topics": []
        },
        "cat_functions": {
          "essentials": [
            {
              "id": "e_b1_f01",
              "text": "Wyrazić i uzasadnić opinię (I think…, In my opinion…, because…)"
            },
            {
              "id": "e_b1_f02",
              "text": "Zgodzić się i nie zgodzić uprzejmie (I see your point, but…)"
            },
            {
              "id": "e_b1_f03",
              "text": "Opowiedzieć historię z początkiem, rozwinięciem i końcem"
            },
            {
              "id": "e_b1_f04",
              "text": "Opisać plany, marzenia, ambicje"
            },
            {
              "id": "e_b1_f05",
              "text": "Dać radę i o nią poprosić"
            },
            {
              "id": "e_b1_f06",
              "text": "Złożyć skargę, wyjaśnić nieporozumienie"
            },
            {
              "id": "e_b1_f07",
              "text": "Strategie ratunkowe: obejść brakujące słowo (It's a kind of…, the thing you use to…), poprosić o wyjaśnienie"
            },
            {
              "id": "e_b1_f08",
              "text": "Utrzymać rozmowę: pytania zwrotne, Really? That's interesting! What happened next?"
            }
          ],
          "topics": []
        },
        "cat_vocabulary": {
          "essentials": [
            {
              "id": "e_b1_v01",
              "text": "Zasób słownictwa: ok. 2000–2500 słów"
            },
            {
              "id": "e_b1_v02",
              "text": "Praca i edukacja"
            },
            {
              "id": "e_b1_v03",
              "text": "Media"
            },
            {
              "id": "e_b1_v04",
              "text": "Technologia"
            },
            {
              "id": "e_b1_v05",
              "text": "Środowisko"
            },
            {
              "id": "e_b1_v06",
              "text": "Relacje"
            },
            {
              "id": "e_b1_v07",
              "text": "Emocje"
            },
            {
              "id": "e_b1_v08",
              "text": "Częste kolokacje (make a decision, do homework)"
            },
            {
              "id": "e_b1_v09",
              "text": "Więcej phrasal verbs"
            },
            {
              "id": "e_b1_v10",
              "text": "Łączniki (however, although, first of all)"
            }
          ],
          "topics": []
        }
      }
    },
    {
      "id": "B2",
      "description": "**Wyższy samodzielny**\nCel: rozmawiać płynnie i spontanicznie z native speakerem bez wysiłku po obu stronach, dyskutować o tematach abstrakcyjnych i zawodowych. To typowy poziom wymagany w pracy.",
      "content": {
        "cat_grammar": {
          "essentials": [
            {
              "id": "e_b2_g01",
              "text": "Wszystkie 12 czasów aktywnie, w tym Future Continuous (This time tomorrow I'll be flying) i Future Perfect (I'll have finished by 5)"
            },
            {
              "id": "e_b2_g02",
              "text": "Past Perfect Continuous (She had been working there for years before…)"
            },
            {
              "id": "e_b2_g03",
              "text": "Swobodne łączenie czasów w jednej opowieści"
            },
            {
              "id": "e_b2_g04",
              "text": "Third Conditional i mixed conditionals (If I had studied, I would be a doctor now.)"
            },
            {
              "id": "e_b2_g05",
              "text": "wish / if only (I wish I had more time. I wish I hadn't said that.)"
            },
            {
              "id": "e_b2_g06",
              "text": "Modalne w przeszłości: should have, could have, must have, might have"
            },
            {
              "id": "e_b2_g07",
              "text": "Strona bierna we wszystkich czasach + have something done"
            },
            {
              "id": "e_b2_g08",
              "text": "Pełna mowa zależna: następstwo czasów, pytania, polecenia, czasowniki raportujące (suggest, deny, admit)"
            },
            {
              "id": "e_b2_g09",
              "text": "Zdania względne definiujące i niedefiniujące (z przecinkami)"
            },
            {
              "id": "e_b2_g10",
              "text": "Konstrukcje przyczyny i przeciwieństwa: despite, in spite of, whereas, even though"
            },
            {
              "id": "e_b2_g11",
              "text": "Gerund vs. infinitive ze zmianą znaczenia (stop doing / stop to do, remember, try)"
            }
          ],
          "topics": []
        },
        "cat_functions": {
          "essentials": [
            {
              "id": "e_b2_f01",
              "text": "Argumentować: przedstawić za i przeciw, zbić kontrargument"
            },
            {
              "id": "e_b2_f02",
              "text": "Spekulować o przeszłości i przyszłości"
            },
            {
              "id": "e_b2_f03",
              "text": "Negocjować, przekonywać, osiągać kompromis"
            },
            {
              "id": "e_b2_f04",
              "text": "Prowadzić spotkanie lub rozmowę o pracę"
            },
            {
              "id": "e_b2_f05",
              "text": "Przerwać uprzejmie i odzyskać głos (Sorry to interrupt, but… / As I was saying…)"
            },
            {
              "id": "e_b2_f06",
              "text": "Złagodzić wypowiedź (I'm not sure that's entirely right. It might be better to…)"
            },
            {
              "id": "e_b2_f07",
              "text": "Rozumieć różne akcenty i tempo naturalnej mowy, filmy bez napisów na znane tematy"
            }
          ],
          "topics": []
        },
        "cat_vocabulary": {
          "essentials": [
            {
              "id": "e_b2_v01",
              "text": "Zasób słownictwa: ok. 3500–4000 słów"
            },
            {
              "id": "e_b2_v02",
              "text": "Kolokacje"
            },
            {
              "id": "e_b2_v03",
              "text": "Idiomy codzienne (a piece of cake, on the same page)"
            },
            {
              "id": "e_b2_v04",
              "text": "Phrasal verbs z kilkoma znaczeniami"
            },
            {
              "id": "e_b2_v05",
              "text": "Słowotwórstwo (prefiksy i sufiksy)"
            },
            {
              "id": "e_b2_v06",
              "text": "Różnica rejestru formalnego i potocznego"
            }
          ],
          "topics": []
        }
      }
    },
    {
      "id": "C1",
      "description": "**Zaawansowany**\nCel: mówić płynnie, precyzyjnie i elastycznie w życiu prywatnym, zawodowym i akademickim, rzadko szukając słów. Czasy nie są już tematem do nauki – liczy się dobór struktur do efektu.",
      "content": {
        "cat_grammar": {
          "essentials": [
            {
              "id": "e_c1_g01",
              "text": "Czasy użyte stylistycznie: Past Continuous / Past Simple dla grzeczności (I was wondering if…, I wanted to ask…)"
            },
            {
              "id": "e_c1_g02",
              "text": "Present Simple i Continuous w narracji i streszczeniach (So he walks into the room and…)"
            },
            {
              "id": "e_c1_g03",
              "text": "be to / be about to / be on the verge of – formy przyszłe w rejestrze formalnym"
            },
            {
              "id": "e_c1_g04",
              "text": "Inwersja dla emfazy (Never have I seen…, Not only did she…, Hardly had we…)"
            },
            {
              "id": "e_c1_g05",
              "text": "Zdania rozszczepione – cleft sentences (What I need is…, It was John who…)"
            },
            {
              "id": "e_c1_g06",
              "text": "Okresy warunkowe bez if (Had I known…, Should you need…, Were it not for…)"
            },
            {
              "id": "e_c1_g07",
              "text": "Konstrukcje imiesłowowe (Having finished the report, she left.)"
            },
            {
              "id": "e_c1_g08",
              "text": "Nominalizacja w języku formalnym (the implementation of… zamiast we implemented…)"
            },
            {
              "id": "e_c1_g09",
              "text": "Elipsa i substytucja (I hope so, I'd love to, Neither do I)"
            },
            {
              "id": "e_c1_g10",
              "text": "Strona bierna bezosobowa (It is said that…, He is believed to have…)"
            }
          ],
          "topics": []
        },
        "cat_functions": {
          "essentials": [
            {
              "id": "e_c1_f01",
              "text": "Dostosowywać rejestr do sytuacji i rozmówcy – od luźnej rozmowy do prezentacji"
            },
            {
              "id": "e_c1_f02",
              "text": "Hedging – ostrożne formułowanie tez (It would seem that…, arguably, to some extent)"
            },
            {
              "id": "e_c1_f03",
              "text": "Wyrażać subtelne odcienie opinii, ironię, dystans"
            },
            {
              "id": "e_c1_f04",
              "text": "Prowadzić prezentację, odpowiadać na trudne pytania na żywo"
            },
            {
              "id": "e_c1_f05",
              "text": "Rozumieć implikacje i podteksty, humor i aluzje"
            },
            {
              "id": "e_c1_f06",
              "text": "Parafrazować i streszczać cudze argumenty"
            },
            {
              "id": "e_c1_f07",
              "text": "Korzystać z markerów dyskursu (Having said that…, That being the case…, On a related note…)"
            }
          ],
          "topics": []
        },
        "cat_vocabulary": {
          "essentials": [
            {
              "id": "e_c1_v01",
              "text": "Zasób słownictwa: ok. 6000–8000 słów"
            },
            {
              "id": "e_c1_v02",
              "text": "Precyzyjne synonimy z różnicą znaczenia"
            },
            {
              "id": "e_c1_v03",
              "text": "Idiomy i wyrażenia przenośne"
            },
            {
              "id": "e_c1_v04",
              "text": "Słownictwo specjalistyczne z własnej branży"
            },
            {
              "id": "e_c1_v05",
              "text": "Kolokacje akademickie (draw a conclusion, pose a threat)"
            }
          ],
          "topics": []
        }
      }
    },
    {
      "id": "C2",
      "description": "**Biegły**\nCel: rozumieć praktycznie wszystko i wyrażać się z precyzją wykształconego native speakera, także w złożonych i delikatnych sytuacjach. Różnica wobec C1 to naturalność, a nie nowe reguły.",
      "content": {
        "cat_grammar": {
          "essentials": [
            {
              "id": "e_c2_g01",
              "text": "Pełna kontrola wszystkich struktur bez błędów systemowych, także pod presją"
            },
            {
              "id": "e_c2_g02",
              "text": "Świadome łamanie reguł dla efektu (język potoczny, slang, skróty w mowie)"
            },
            {
              "id": "e_c2_g03",
              "text": "Subjunctive (I suggest that he be informed. If need be…)"
            },
            {
              "id": "e_c2_g04",
              "text": "Zaawansowana inwersja i fronting (Strange as it may seem…, Much as I'd like to…)"
            },
            {
              "id": "e_c2_g05",
              "text": "Rejestry skrajne: od prawniczego i akademickiego po slang i dialekty"
            }
          ],
          "topics": []
        },
        "cat_functions": {
          "essentials": [
            {
              "id": "e_c2_f01",
              "text": "Mówić płynnie bez zauważalnego szukania słów, z naturalną intonacją i rytmem"
            },
            {
              "id": "e_c2_f02",
              "text": "Przeformułować myśl w locie, gdy rozmówca nie rozumie, bez gubienia wątku"
            },
            {
              "id": "e_c2_f03",
              "text": "Rozumieć szybką mowę, mocne akcenty regionalne, gry słów, kontekst kulturowy"
            },
            {
              "id": "e_c2_f04",
              "text": "Prowadzić negocjacje, mediacje, trudne rozmowy (zwolnienie, konflikt) z wyczuciem tonu"
            },
            {
              "id": "e_c2_f05",
              "text": "Używać humoru, ironii, niedopowiedzenia (understatement) jak native speaker"
            },
            {
              "id": "e_c2_f06",
              "text": "Tłumaczyć i streszczać złożone treści między polskim a angielskim"
            }
          ],
          "topics": []
        },
        "cat_vocabulary": {
          "essentials": [
            {
              "id": "e_c2_v01",
              "text": "Zasób słownictwa: ok. 10 000+ słów"
            },
            {
              "id": "e_c2_v02",
              "text": "Idiomy"
            },
            {
              "id": "e_c2_v03",
              "text": "Przysłowia"
            },
            {
              "id": "e_c2_v04",
              "text": "Odniesienia kulturowe"
            },
            {
              "id": "e_c2_v05",
              "text": "Archaizmy i neologizmy"
            },
            {
              "id": "e_c2_v06",
              "text": "Słownictwo literackie"
            },
            {
              "id": "e_c2_v07",
              "text": "Precyzyjne konotacje (slim vs. skinny vs. scrawny)"
            }
          ],
          "topics": []
        }
      }
    }
  ]
};
