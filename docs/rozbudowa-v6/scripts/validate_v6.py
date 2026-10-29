#!/usr/bin/env python3
"""
Walidator paczki v6 (specyfikacje 12–18).

Użycie (z katalogu głównego repozytorium):
  python3 docs/rozbudowa-v6/scripts/validate_v6.py .                      # wszystko (ścisłe liczby)
  python3 docs/rozbudowa-v6/scripts/validate_v6.py . --only zadania,test  # tylko wybrane części
  python3 docs/rozbudowa-v6/scripts/validate_v6.py . --przyklady docs/rozbudowa-v6/przyklady

Części (--only): zadania, test, testy-koncowe, fiszki, sciagi, zycie, wzorce, zwroty, mowienie.
Błędy → „BŁĄD: …” i kod wyjścia 1. Ostrzeżenia → „UWAGA: …”.
Tryb --przyklady sprawdza pliki-wzorce z łagodnymi limitami liczności (formaty ściśle).
Reguły są wzorem dla walidatorów w tools/*.js (Node) – przenieś je tam, ten plik zostaje jako referencja.
"""
import json
import os
import re
import sys
import glob

LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
ERRORS, WARNINGS = [], []


def err(msg):
    ERRORS.append(msg)


def warn(msg):
    WARNINGS.append(msg)


def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        err(f"{path}: brak pliku")
    except json.JSONDecodeError as e:
        err(f"{path}: niepoprawny JSON ({e})")
    return None


def normalize(s):
    s = re.sub(r"\s+", " ", str(s).strip()).replace("’", "'")
    s = re.sub(r"[.,!?;]+$", "", s)
    return s.lower()


def words(s):
    return [w for w in re.split(r"\s+", str(s).strip()) if w]


CONTRACTION = re.compile(r"(n't|'s|'re|'ve|'d|'ll|'m)$", re.I)


def count_words_cambridge(s):
    n = 0
    for w in words(s.replace("’", "'")):
        n += 2 if CONTRACTION.search(w) and w.lower() not in ("let's",) else 1
    return n


def level_index(level):
    return LEVELS.index(level) if level in LEVELS else -1


def index_ids(root):
    """id podstron z niezbednik/index.json → {id: (poziom, kategoria, plik)}"""
    data = load(os.path.join(root, "niezbednik", "index.json"))
    out = {}
    if not data:
        return out
    for lvl in data.get("levels", []):
        for it in lvl.get("items", []):
            out[it["id"]] = (lvl["level"], it.get("category"), it.get("file"))
    return out


# ---------------------------------------------------------------- zadania (spec 12)

NEW_TYPES = {"gap-fill", "match", "transformation", "translate", "dictation"}
OLD_TYPES = {"multiple-choice", "reorder", "find-error", "short-answer"}
MATCH_MODES = {"definition", "halves", "translation", "response"}


def check_item(item, where, topics):
    iid = item.get("id")
    t = item.get("type")
    p = f"{where} [{iid}]"
    if not iid:
        err(f"{where}: zadanie bez id")
    if t not in NEW_TYPES | OLD_TYPES:
        err(f"{p}: nieznany typ {t!r}")
        return
    if not str(item.get("explanation", "")).strip():
        err(f"{p}: brak explanation")
    topic = item.get("topic")
    if topic and topics and topic not in topics:
        err(f"{p}: topic {topic!r} nie istnieje w niezbednik/index.json")
    lvl = item.get("level")
    if lvl is not None and lvl not in LEVELS:
        err(f"{p}: level {lvl!r} spoza A1–C2")

    if t == "gap-fill":
        text = item.get("text", "")
        nums = [int(n) for n in re.findall(r"\{\{(\d+)\}\}", text)]
        gaps = item.get("gaps", [])
        if not 1 <= len(nums) <= 4:
            err(f"{p}: gap-fill musi mieć 1–4 luki, ma {len(nums)}")
        if nums != list(range(1, len(nums) + 1)):
            err(f"{p}: luki muszą być numerowane {{{{1}}}}…{{{{n}}}} po kolei")
        if len(gaps) != len(nums):
            err(f"{p}: gaps ma {len(gaps)} elementów, a luk jest {len(nums)}")
        for i, g in enumerate(gaps):
            if not g.get("accepted") or not all(str(a).strip() for a in g["accepted"]):
                err(f"{p}: luka {i + 1} bez accepted")
    elif t == "match":
        pairs = item.get("pairs", [])
        if not 3 <= len(pairs) <= 6:
            err(f"{p}: match musi mieć 3–6 par, ma {len(pairs)}")
        if any(not isinstance(x, list) or len(x) != 2 for x in pairs):
            err(f"{p}: każda para to [lewa, prawa]")
            return
        left = [normalize(a) for a, _ in pairs]
        right = [normalize(b) for _, b in pairs]
        if len(set(left)) != len(left) or len(set(right)) != len(right):
            err(f"{p}: teksty par muszą być unikalne")
        extra = item.get("extraRight", [])
        if len(extra) > 2:
            err(f"{p}: extraRight maks. 2")
        if any(normalize(e) in right for e in extra):
            err(f"{p}: extraRight powtarza prawą stronę pary")
        if item.get("mode") not in MATCH_MODES:
            err(f"{p}: mode musi być jednym z {sorted(MATCH_MODES)}")
    elif t == "transformation":
        kw = str(item.get("keyword", "")).strip()
        answers = item.get("answers", [])
        lim = item.get("wordLimit", [2, 5])
        if not kw or not answers:
            err(f"{p}: transformation wymaga keyword i answers")
        for a in answers:
            if not re.search(r"(?<![\w'])" + re.escape(kw.lower()) + r"(?![\w])", a.lower()):
                err(f"{p}: odpowiedź {a!r} nie zawiera słowa kluczowego {kw}")
            n = count_words_cambridge(a)
            if not lim[0] <= n <= lim[1]:
                err(f"{p}: odpowiedź {a!r} ma {n} słów, limit {lim}")
        if "parts" in item and (not isinstance(item["parts"], list) or len(item["parts"]) != 2):
            err(f"{p}: parts musi mieć dokładnie 2 elementy")
        for k in ("source", "before", "after"):
            if k not in item:
                err(f"{p}: brak pola {k}")
    elif t == "translate":
        acc = item.get("accepted", [])
        if not 1 <= len(acc) <= 8:
            err(f"{p}: translate wymaga 1–8 accepted")
        if not str(item.get("source", "")).strip():
            err(f"{p}: brak source")
    elif t == "dictation":
        n = len(words(item.get("text", "")))
        if not 4 <= n <= 30:
            err(f"{p}: dyktando ma {n} słów (4–30)")
        mp = item.get("maxPlays", 3)
        if not 1 <= mp <= 5:
            err(f"{p}: maxPlays 1–5")
    elif t == "multiple-choice":
        opts = item.get("options", [])
        if not 2 <= len(opts) <= 4 or not 0 <= item.get("correct", -1) < len(opts):
            err(f"{p}: multiple-choice – 2–4 opcje i poprawne correct")
    elif t == "short-answer":
        if item.get("prompt", "").count("___") != 1 or not item.get("accepted"):
            err(f"{p}: short-answer – jedna luka ___ i accepted")
    elif t == "reorder":
        ans = item.get("answers", [])
        bags = {tuple(sorted(normalize(w) for w in words(a))) for a in ans}
        if not ans or len(bags) != 1:
            err(f"{p}: reorder – answers muszą mieć ten sam zestaw wyrazów")
    elif t == "find-error":
        toks = item.get("tokens", [])
        if not item.get("noError"):
            a, b = item.get("errorRange", [-1, -1])
            if not (0 <= a <= b < len(toks)) or not item.get("fixes"):
                err(f"{p}: find-error – zły errorRange albo brak fixes")


def exercise_files(root):
    files = glob.glob(os.path.join(root, "cwiczenia", "tematy", "*.json"))
    files += glob.glob(os.path.join(root, "niezbednik", "*", "cwiczenia", "*.json"))
    files += glob.glob(os.path.join(root, "niezbednik", "testy-poziomow", "*.json"))
    return sorted(files)


def validate_zadania(root, topics, seen_ids, files=None):
    used = {t: 0 for t in NEW_TYPES}
    for f in files or exercise_files(root):
        data = load(f)
        if not data or not isinstance(data.get("items"), list):
            continue
        for it in data["items"]:
            if it.get("type") in NEW_TYPES or "testy-poziomow" in f:
                check_item(it, os.path.relpath(f, root), topics)
            if it.get("type") in used:
                used[it["type"]] += 1
            iid = it.get("id")
            if iid in seen_ids:
                err(f"{os.path.relpath(f, root)}: id zadania {iid!r} powtarza się (także w {seen_ids[iid]})")
            elif iid:
                seen_ids[iid] = os.path.relpath(f, root)
    return used


# ---------------------------------------------------------------- test poziomu (spec 13.1)

SKILLS = {"grammar": 5, "vocabulary": 3, "reading": 2}
PASSAGE_RANGE = {"A1": (30, 80), "A2": (30, 80), "B1": (30, 80), "B2": (60, 130), "C1": (60, 130), "C2": (60, 130)}


def validate_test(path, topics, strict=True):
    data = load(path)
    if not data:
        return
    qs = data.get("questions", [])
    ids = set()
    counts = {l: {s: 0 for s in SKILLS} for l in LEVELS}
    for q in qs:
        p = f"{path} [{q.get('id')}]"
        if q.get("id") in ids:
            err(f"{p}: powtórzone id")
        ids.add(q.get("id"))
        lvl, skill = q.get("level"), q.get("skill", "grammar")
        if lvl not in LEVELS:
            err(f"{p}: zły level")
            continue
        if skill not in SKILLS:
            err(f"{p}: skill {skill!r} spoza {list(SKILLS)}")
            continue
        if "skill" not in q:
            warn(f"{p}: brak skill (traktowane jak grammar) – uzupełnij")
        counts[lvl][skill] += 1
        opts = q.get("options", [])
        if not 0 <= q.get("correct", -1) < len(opts):
            err(f"{p}: correct poza zakresem")
        if len(opts) != 4:
            (err if "skill" in q else warn)(f"{p}: pytanie powinno mieć 4 opcje (ma {len(opts)})")
        if not str(q.get("explanation", "")).strip():
            err(f"{p}: brak explanation")
        if skill == "reading":
            n = len(words(q.get("passage", "")))
            lo, hi = PASSAGE_RANGE[lvl]
            if not lo <= n <= hi:
                err(f"{p}: passage ma {n} słów, dla {lvl} wymagane {lo}–{hi}")
        if q.get("itemId") and topics and q["itemId"] not in topics:
            err(f"{p}: itemId {q['itemId']!r} nie istnieje")
    if strict:
        for l in LEVELS:
            for s, want in SKILLS.items():
                if counts[l][s] != want:
                    err(f"{path}: poziom {l}, {s}: {counts[l][s]} pytań, wymagane {want}")


# ---------------------------------------------------------------- testy końcowe (spec 13.2)

def validate_level_test(path, topics, strict=True):
    data = load(path)
    if not data:
        return
    lvl = data.get("level")
    p = path
    for k, v in (("kind", "level-test"), ("draw", 20), ("passPercent", 80), ("defaultMode", "exam")):
        if data.get(k) != v:
            err(f"{p}: {k} musi być {v!r}")
    items = data.get("items", [])
    if strict and len(items) != 30:
        err(f"{p}: pula musi mieć 30 zadań, ma {len(items)}")
    mc = 0
    covered = set()
    for it in items:
        q = f"{p} [{it.get('id')}]"
        t = it.get("type")
        if not it.get("topic"):
            err(f"{q}: brak wymaganego topic")
        elif topics and topics.get(it["topic"], (None,))[0] != lvl:
            err(f"{q}: topic {it['topic']!r} nie należy do poziomu {lvl}")
        else:
            covered.add(it["topic"])
        if t == "dictation":
            err(f"{q}: dyktando niedozwolone w teście końcowym")
        if t == "transformation" and level_index(lvl) < 2:
            err(f"{q}: transformation dopiero od B1")
        if t == "translate" and level_index(lvl) < 1:
            err(f"{q}: translate dopiero od A2")
        if t not in {"multiple-choice", "gap-fill", "short-answer", "match", "transformation", "translate", "reorder", "find-error"}:
            err(f"{q}: typ {t!r} niedozwolony")
        mc += t == "multiple-choice"
    if items and mc * 2 < len(items):
        (err if strict else warn)(f"{p}: multiple-choice to {mc}/{len(items)} – wymagana co najmniej połowa")
    if strict and topics:
        level_topics = [k for k, v in topics.items() if v[0] == lvl]
        if level_topics and len(covered) < 0.7 * len(level_topics):
            err(f"{p}: pula pokrywa {len(covered)}/{len(level_topics)} podstron (wymagane ≥ 70%)")


# ---------------------------------------------------------------- fiszki (spec 15)

THEME_DECKS = ["temat-dom", "temat-jedzenie", "temat-praca", "temat-podroze", "temat-zdrowie", "temat-emocje", "temat-technologia"]
EXAM_DECKS = {"egz-e8": (40, 40), "egz-matura": (50, 50), "egz-b2-first": (50, 50)}
EXAM_TAGS = {"e8", "mp", "mr", "matura", "b2", "c1"}
CARD_TYPES = {"basic", "cloze", "typed"}


def card_answer(c):
    if c.get("type") == "typed":
        return normalize((c.get("accepted") or [c.get("back", "")])[0])
    if c.get("type") == "cloze":
        m = re.search(r"\{\{(.+?)\}\}", c.get("text", ""))
        return normalize(m.group(1).split("|")[0]) if m else ""
    return normalize(c.get("back", ""))


def check_deck(path, deck_id, kind, strict=True):
    data = load(path)
    if not data:
        return []
    cards = data.get("cards", [])
    if data.get("id") != deck_id:
        err(f"{path}: id talii {data.get('id')!r} ≠ {deck_id!r}")
    lo, hi = (30, 40) if kind == "theme" else EXAM_DECKS[deck_id]
    if strict and not lo <= len(cards) <= hi:
        err(f"{path}: {len(cards)} kart, wymagane {lo}–{hi}")
    last_level = 0
    for c in cards:
        p = f"{path} [{c.get('id')}]"
        if not re.fullmatch(re.escape(deck_id) + r"-\d{3}", str(c.get("id", ""))):
            err(f"{p}: id karty musi mieć postać {deck_id}-NNN")
        if c.get("type") not in CARD_TYPES:
            err(f"{p}: nieznany typ karty")
        if c.get("type") == "cloze" and len(re.findall(r"\{\{.+?\}\}", c.get("text", ""))) != 1:
            err(f"{p}: cloze musi mieć dokładnie jedną lukę")
        if c.get("type") == "typed" and not c.get("accepted"):
            err(f"{p}: typed bez accepted")
        if c.get("type") == "basic" and not (c.get("front") and c.get("back")):
            err(f"{p}: basic wymaga front i back")
        if kind == "theme":
            li = level_index(c.get("level"))
            if li not in (0, 1, 2):
                err(f"{p}: karta tematyczna wymaga level A1/A2/B1")
            elif li < last_level:
                err(f"{p}: karty muszą iść od A1 do B1 (kolejność poziomów)")
            else:
                last_level = li
        else:
            if not EXAM_TAGS & set(c.get("tags", [])):
                err(f"{p}: karta egzaminacyjna bez tagu egzaminu ({sorted(EXAM_TAGS)})")
    return [(card_answer(c), c.get("id")) for c in cards]


def validate_fiszki(root):
    d = os.path.join(root, "dane", "fiszki")
    idx = load(os.path.join(d, "index.json")) or {}
    entries = {x["id"]: x for x in idx.get("decks", [])}
    answers = {}
    for f in glob.glob(os.path.join(d, "*.json")):
        data = load(f)
        if data and isinstance(data.get("cards"), list):
            for c in data["cards"]:
                answers.setdefault(card_answer(c), []).append(c.get("id"))
    for deck_id in THEME_DECKS + list(EXAM_DECKS):
        path = os.path.join(d, deck_id + ".json")
        if deck_id not in entries:
            err(f"dane/fiszki/index.json: brak wpisu {deck_id}")
        kind = "theme" if deck_id in THEME_DECKS else "exam"
        res = check_deck(path, deck_id, kind)
        if deck_id in entries and entries[deck_id].get("count") != len(res):
            err(f"dane/fiszki/index.json: count {deck_id} = {entries[deck_id].get('count')}, a kart jest {len(res)}")
    for a, ids in answers.items():
        decks = {re.sub(r"-\d{3}$", "", str(i)) for i in ids}
        if a and len(decks) > 1 and (decks & set(THEME_DECKS + list(EXAM_DECKS))):
            warn(f"fiszki: ta sama odpowiedź {a!r} w różnych taliach: {', '.join(ids)}")


# ---------------------------------------------------------------- ściągi (spec 16.1)

SCIAGA_HEADINGS = ["Gramatyka", "Zwroty", "Słowa-sygnały", "Uwaga na"]


def check_sciaga(path, level):
    try:
        text = open(path, encoding="utf-8").read()
    except FileNotFoundError:
        err(f"{path}: brak pliku")
        return
    m = re.match(r"---\n(.*?)\n---", text, re.S)
    if not m or f"id: sciaga-{level.lower()}" not in m.group(1):
        err(f"{path}: frontmatter musi mieć id: sciaga-{level.lower()}")
    heads = re.findall(r"^## (.+)$", text, re.M)
    if not ({"Czasy i formy", "Struktury"} & set(heads)):
        err(f"{path}: brak sekcji „Czasy i formy” albo „Struktury”")
    for h in SCIAGA_HEADINGS:
        if h not in heads:
            err(f"{path}: brak sekcji „{h}”")
    if "~~" in text:
        err(f"{path}: renderer nie obsługuje ~~przekreślenia~~ – użyj ✗ … → ✓ …")
    n = len(words(re.sub(r"[|#*\-_>`]", " ", text[m.end():] if m else text)))
    if n > 650:
        warn(f"{path}: {n} słów – ryzyko, że ściąga nie zmieści się na 1 stronie A4")


# ---------------------------------------------------------------- Życie i egzamin (spec 16.2)

CODES = {"E8", "MP", "MR", "B2", "C1"}
ALLOWED = {"A1": {"E8", "MP"}, "A2": {"E8", "MP"}, "B1": {"E8", "MP", "MR", "B2"},
           "B2": {"MP", "MR", "B2", "C1"}, "C1": {"MR", "B2", "C1"}, "C2": {"C1"}}


def check_zycie(text, where, level):
    heads = [(m.start(), m.group(1).strip()) for m in re.finditer(r"^## (.+)$", text, re.M)]
    pos = [i for i, (_, h) in enumerate(heads) if h.lower().startswith("życie i egzamin")]
    if len(pos) != 1:
        err(f"{where}: wymagana dokładnie jedna sekcja „## Życie i egzamin” (jest {len(pos)})")
        return
    i = pos[0]
    names = [h for _, h in heads]
    if "Typowe błędy Polaków" in names and names.index("Typowe błędy Polaków") < i:
        err(f"{where}: „Życie i egzamin” musi stać przed „Typowe błędy Polaków”")
    if "Ćwiczenie" in names and names.index("Ćwiczenie") < i:
        err(f"{where}: „Życie i egzamin” musi stać przed „Ćwiczenie”")
    if "Przykłady" in names and names.index("Przykłady") > i:
        err(f"{where}: „Życie i egzamin” musi stać po „Przykłady”")
    end = heads[i + 1][0] if i + 1 < len(heads) else len(text)
    body = text[heads[i][0]:end]
    rows = [r for r in body.splitlines() if r.strip().startswith("|")]
    if len(rows) < 2 or not re.match(r"^\|\s*-", rows[1]):
        err(f"{where}: sekcja musi zawierać tabelę z nagłówkiem")
        return
    data = rows[2:]
    if not 3 <= len(data) <= 4:
        err(f"{where}: tabela ma {len(data)} wierszy (3–4)")
    for n, r in enumerate(data, 1):
        cells = [c.strip() for c in r.strip().strip("|").split("|")]
        if len(cells) != 3:
            err(f"{where}: wiersz {n} ma {len(cells)} kolumn (3)")
            continue
        if "→" not in cells[1] or "**" not in cells[1].split("→")[-1]:
            err(f"{where}: wiersz {n}: kolumna 2 wymaga „→ **odpowiedź**”")
        if "*" not in cells[0] or "(" not in cells[0]:
            err(f"{where}: wiersz {n}: kolumna 1 – zdanie kursywą + tłumaczenie w nawiasie")
        codes = {c.strip() for c in cells[2].split("·") if c.strip()}
        if not codes or not codes <= CODES:
            err(f"{where}: wiersz {n}: kody egzaminów {cells[2]!r} spoza {sorted(CODES)}")
        elif level and not codes <= ALLOWED[level]:
            err(f"{where}: wiersz {n}: kody {sorted(codes - ALLOWED[level])} niedozwolone dla {level}")


def validate_zycie(root, topics):
    for tid, (lvl, _, f) in sorted(topics.items()):
        path = os.path.join(root, "niezbednik", f)
        try:
            check_zycie(open(path, encoding="utf-8").read(), f"niezbednik/{f}", lvl)
        except FileNotFoundError:
            err(f"niezbednik/{f}: brak pliku")


# ---------------------------------------------------------------- wzorce (spec 17.1)

NOTE_TYPES = ["punkty", "lacznik", "rejestr", "struktura", "zakres", "uwaga"]
NOTE_RANGE = {"egzamin-osmoklasisty": (6, 9), "matura-podstawowa": (6, 9), "matura-rozszerzona": (8, 12),
              "certyfikat-b2": (8, 12), "certyfikat-c1": (10, 14)}
CAMBRIDGE = {"content", "communicative", "organisation", "language"}


def check_notes(notes, model, rubric, where, exam, strict=True):
    anns = notes.get("annotations", [])
    if not 3 <= len(notes.get("summary", [])) <= 5:
        err(f"{where}: summary musi mieć 3–5 zdań")
    lo, hi = NOTE_RANGE[exam]
    if strict and not lo <= len(anns) <= hi:
        err(f"{where}: {len(anns)} komentarzy, wymagane {lo}–{hi}")
    spans = []
    for a in anns:
        anc = a.get("anchor", "")
        q = f"{where} [{anc[:30]}…]"
        cnt = model.count(anc) if anc else 0
        if cnt != 1:
            err(f"{q}: kotwica występuje w tekście {cnt} razy (wymagane 1)")
        else:
            s = model.index(anc)
            spans.append((s, s + len(anc)))
        if not 3 <= len(words(anc)) <= 15:
            err(f"{q}: kotwica ma {len(words(anc))} słów (3–15)")
        if a.get("type") not in NOTE_TYPES:
            err(f"{q}: type spoza {NOTE_TYPES}")
        if a.get("criterion") not in rubric:
            err(f"{q}: criterion {a.get('criterion')!r} spoza kryteriów {sorted(rubric)}")
        if not a.get("note") or len(a["note"]) > 220:
            err(f"{q}: note wymagane, maks. 220 znaków (ma {len(a.get('note', ''))})")
    spans.sort()
    for (a1, b1), (a2, _) in zip(spans, spans[1:]):
        if a2 < b1:
            err(f"{where}: kotwice nakładają się")
    missing = set(NOTE_TYPES) - {a.get("type") for a in anns}
    if missing:
        err(f"{where}: brak komentarzy typu {sorted(missing)}")


def validate_wzorce(root):
    for exam in NOTE_RANGE:
        path = os.path.join(root, "niezbednik", exam, "trening", "pisanie.json")
        data = load(path)
        if not data:
            continue
        rubric = {r["id"] for r in data.get("rubric", [])} or (CAMBRIDGE if exam == "certyfikat-c1" else set())
        with_model = 0
        for t in data.get("tasks", []):
            if not t.get("model"):
                continue
            with_model += 1
            where = f"niezbednik/{exam}/trening/pisanie.json [{t['id']}]"
            if exam == "certyfikat-c1":
                n = len(words(t["model"]))
                if not 220 <= n <= 260:
                    err(f"{where}: wzorzec C1 ma {n} słów (220–260)")
            if "modelNotes" not in t:
                err(f"{where}: zadanie ma model, ale nie ma modelNotes")
                continue
            check_notes(t["modelNotes"], t["model"], rubric, where, exam)
        if exam == "certyfikat-c1" and with_model < 5:
            err(f"{path}: C1 ma {with_model} wzorców, wymagane min. 5")


# ---------------------------------------------------------------- zwroty (spec 17.2)

GENRES = {"email", "letter", "blog", "forum", "essay", "article", "review", "report", "proposal", "story"}
REGISTERS = {"formal", "neutral", "informal"}


def validate_zwroty(path, strict=True):
    data = load(path)
    if not data:
        return
    groups = data.get("groups", [])
    if strict and len(groups) < 14:
        err(f"{path}: {len(groups)} grup, wymagane min. 14")
    ids, ens, total = set(), {}, 0
    for g in groups:
        ph = g.get("phrases", [])
        total += len(ph)
        if strict and not 8 <= len(ph) <= 14:
            err(f"{path} [{g.get('id')}]: {len(ph)} zwrotów (8–14)")
        if not set(g.get("genres", [])) <= GENRES or not g.get("genres"):
            err(f"{path} [{g.get('id')}]: genres spoza {sorted(GENRES)}")
        for x in ph:
            q = f"{path} [{x.get('id')}]"
            if x.get("id") in ids:
                err(f"{q}: powtórzone id")
            ids.add(x.get("id"))
            if x.get("level") not in ("B1", "B2", "C1"):
                err(f"{q}: level B1/B2/C1")
            if x.get("register") not in REGISTERS:
                err(f"{q}: register spoza {sorted(REGISTERS)}")
            if "genres" in x and not set(x["genres"]) <= set(g.get("genres", [])):
                err(f"{q}: genres zwrotu muszą być podzbiorem genres grupy")
            if not x.get("en") or not x.get("pl"):
                err(f"{q}: wymagane en i pl")
            key = normalize(x.get("en", "").replace("…", ""))
            if key in ens:
                err(f"{q}: zwrot powtarza {ens[key]}")
            ens[key] = x.get("id")
    if strict and not 140 <= total <= 180:
        err(f"{path}: {total} zwrotów razem (140–180)")


# ---------------------------------------------------------------- mówienie (spec 18)

def wc(s):
    return len(words(s))


def validate_matura(path, strict=True):
    d = load(path)
    if not d:
        return
    if d.get("format") != "matura":
        err(f"{path}: format musi być \"matura\"")
    ids = set()

    def uid(x, part):
        if x.get("id") in ids or not x.get("id"):
            err(f"{path} [{part}]: brak id albo powtórzone id {x.get('id')!r}")
        ids.add(x.get("id"))

    need = {"intro": 10, "roleplay": 12, "picture": 12, "choice": 12} if strict else {}
    for g in d.get("intro", {}).get("groups", []):
        uid(g, "intro")
        if not 3 <= len(g.get("questions", [])) <= 4:
            err(f"{path} [{g.get('id')}]: rozmowa wstępna – 3–4 pytania")
    for c in d.get("roleplay", {}).get("cards", []):
        uid(c, "roleplay")
        if len(c.get("elements", [])) != 4:
            err(f"{path} [{c.get('id')}]: dokładnie 4 elements")
        if not 4 <= len(c.get("examinerLines", [])) <= 6:
            err(f"{path} [{c.get('id')}]: 4–6 examinerLines")
    for c in d.get("picture", {}).get("cards", []):
        uid(c, "picture")
        if len(c.get("questions", [])) != 3:
            err(f"{path} [{c.get('id')}]: dokładnie 3 pytania")
        if not 40 <= wc(c.get("description", "")) <= 80:
            err(f"{path} [{c.get('id')}]: description {wc(c.get('description', ''))} słów (40–80)")
    for c in d.get("choice", {}).get("cards", []):
        uid(c, "choice")
        if len(c.get("options", [])) != 3 or len(c.get("questions", [])) != 2 or len(c.get("criteria", [])) != 2:
            err(f"{path} [{c.get('id')}]: 3 options, 2 criteria, 2 questions")
        for o in c.get("options", []):
            if not 8 <= wc(o) <= 40:
                err(f"{path} [{c.get('id')}]: opcja ma {wc(o)} słów (8–40)")
    for part, n in need.items():
        key = "groups" if part == "intro" else "cards"
        have = len(d.get(part, {}).get(key, []))
        if have < n:
            err(f"{path}: {part} ma {have}, wymagane min. {n}")


def validate_simple(path, strict=True):
    d = load(path)
    if not d:
        return
    if d.get("format") != "simple":
        err(f"{path}: format musi być \"simple\"")
    kinds = {"opis": 0, "sytuacja": 0, "opinia": 0}
    ids = set()
    for c in d.get("cards", []):
        q = f"{path} [{c.get('id')}]"
        if c.get("id") in ids:
            err(f"{q}: powtórzone id")
        ids.add(c.get("id"))
        if c.get("kind") not in kinds:
            err(f"{q}: kind spoza {list(kinds)}")
        else:
            kinds[c["kind"]] += 1
        if not 2 <= len(c.get("questions", [])) <= 4:
            err(f"{q}: 2–4 pytania")
        if not 60 <= c.get("seconds", 0) <= 90:
            err(f"{q}: seconds 60–90")
    if strict and any(v != 8 for v in kinds.values()):
        err(f"{path}: wymagane po 8 kart każdego rodzaju, jest {kinds}")


def validate_b2(path):
    d = load(path)
    if not d:
        return
    need = {"part1": ("groups", 10), "part2": ("cards", 14), "part3": ("tasks", 10), "part4": ("groups", 10)}
    ids = set()
    for part, (key, n) in need.items():
        items = d.get(part, {}).get(key, [])
        if len(items) < n:
            err(f"{path}: {part} ma {len(items)}, wymagane min. {n}")
        for x in items:
            if not x.get("id") or x["id"] in ids:
                err(f"{path} [{part}]: brak id albo powtórzone id {x.get('id')!r}")
            ids.add(x.get("id"))


def validate_mowienie(root):
    validate_matura(os.path.join(root, "niezbednik", "matura-podstawowa", "trening", "mowienie.json"))
    validate_simple(os.path.join(root, "niezbednik", "egzamin-osmoklasisty", "trening", "mowienie.json"))
    validate_b2(os.path.join(root, "niezbednik", "certyfikat-b2", "trening", "mowienie.json"))


# ---------------------------------------------------------------- przykłady

def validate_przyklady(root, d):
    topics = index_ids(root) if os.path.exists(os.path.join(root, "niezbednik", "index.json")) else {}
    seen = {}
    validate_zadania(root, topics, seen, [os.path.join(d, "cwiczenia", "v6-pilot-nowe-typy.json")])
    validate_test(os.path.join(d, "test-poziomu", "pytania-przyklad.json"), topics, strict=False)
    validate_level_test(os.path.join(d, "testy-poziomow", "a1-przyklad.json"), topics, strict=False)
    validate_zadania(root, topics, seen, [os.path.join(d, "testy-poziomow", "a1-przyklad.json")])
    check_deck(os.path.join(d, "fiszki", "temat-dom-przyklad.json"), "temat-dom", "theme", strict=False)
    check_deck(os.path.join(d, "fiszki", "egz-e8-przyklad.json"), "egz-e8", "exam", strict=False)
    check_sciaga(os.path.join(d, "sciagi", "a2-przyklad.md"), "A2")
    check_zycie(open(os.path.join(d, "zycie-i-egzamin-przyklad.md"), encoding="utf-8").read(),
                "zycie-i-egzamin-przyklad.md", "A2")
    validate_zwroty(os.path.join(d, "pisanie", "zwroty-przyklad.json"), strict=False)
    validate_matura(os.path.join(d, "mowienie", "matura-ustna-przyklad.json"), strict=False)
    validate_simple(os.path.join(d, "mowienie", "e8-mowienie-przyklad.json"), strict=False)
    sample = load(os.path.join(d, "pisanie", "mr-essay-phones-komentarze.json"))
    task_file = os.path.join(root, "niezbednik", "matura-rozszerzona", "trening", "pisanie.json")
    if sample and os.path.exists(task_file):
        data = load(task_file)
        task = next(t for t in data["tasks"] if t["id"] == sample["taskId"])
        check_notes(sample["modelNotes"], task["model"], {r["id"] for r in data["rubric"]},
                    "mr-essay-phones-komentarze.json", "matura-rozszerzona")
    elif sample:
        warn("pominięto sprawdzenie kotwic wzorca (brak repozytorium)")


# ---------------------------------------------------------------- main

PARTS = ["zadania", "test", "testy-koncowe", "fiszki", "sciagi", "zycie", "wzorce", "zwroty", "mowienie"]


def main(argv):
    if not argv or argv[0].startswith("-"):
        print(__doc__)
        return 2
    root = argv[0]
    if "--przyklady" in argv:
        validate_przyklady(root, argv[argv.index("--przyklady") + 1])
    else:
        only = PARTS
        if "--only" in argv:
            only = argv[argv.index("--only") + 1].split(",")
            bad = set(only) - set(PARTS)
            if bad:
                print(f"Nieznane części: {sorted(bad)}. Dostępne: {', '.join(PARTS)}")
                return 2
        topics = index_ids(root)
        if "zadania" in only:
            used = validate_zadania(root, topics, {})
            for t, n in used.items():
                if n == 0:
                    err(f"zadania: żaden zestaw nie używa typu {t}")
        if "test" in only:
            validate_test(os.path.join(root, "niezbednik", "test-poziomu", "pytania.json"), topics)
        if "testy-koncowe" in only:
            for l in LEVELS:
                validate_level_test(os.path.join(root, "niezbednik", "testy-poziomow", l.lower() + ".json"), topics)
        if "fiszki" in only:
            validate_fiszki(root)
        if "sciagi" in only:
            for l in LEVELS:
                check_sciaga(os.path.join(root, "niezbednik", "sciagi", l.lower() + ".md"), l)
        if "zycie" in only:
            validate_zycie(root, topics)
        if "wzorce" in only:
            validate_wzorce(root)
        if "zwroty" in only:
            validate_zwroty(os.path.join(root, "dane", "pisanie", "zwroty.json"))
        if "mowienie" in only:
            validate_mowienie(root)
    for w in WARNINGS:
        print("UWAGA: " + w)
    for e in ERRORS:
        print("BŁĄD: " + e)
    print(f"Walidacja v6: {len(ERRORS)} błędów, {len(WARNINGS)} ostrzeżeń.")
    return 1 if ERRORS else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
