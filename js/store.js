/*
 * store.js — zapis i odczyt danych (localStorage), migracja,
 * walidacja oraz przygotowanie plików eksportu/importu.
 *
 * Dane trzymamy pod DWOMA osobnymi kluczami, żeby import treści
 * nie kasował postępu ucznia (i odwrotnie):
 *   elm_content_v1  — treści: kategorie, essentials, tematy
 *   elm_progress_v1 — postęp ucznia: { "id_punktu": true, ... }
 * Dodatkowo elm_ui_v1 pamięta tylko wybrany poziom/kategorię/temat.
 */
window.ELM = window.ELM || {};

(function (ELM) {
  "use strict";

  const U = ELM.utils;

  const CONTENT_KEY = "elm_content_v1";
  const PROGRESS_KEY = "elm_progress_v1";
  const UI_KEY = "elm_ui_v1";
  // Tu trafia kopia uszkodzonych danych, zanim zaczniemy od nowa
  const CORRUPT_BACKUP_KEY = "elm_content_corrupt_backup";

  // Aktualna wersja struktury danych treści
  const CURRENT_VERSION = 1;
  // Znacznik w plikach eksportu
  const APP_ID = "english-levels-map";

  // ---------- Dostęp do localStorage ----------

  /** Sprawdza, czy localStorage działa (bywa zablokowany w trybie prywatnym / ustawieniach). */
  function isStorageAvailable() {
    try {
      const testKey = "__elm_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  function readRaw(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  /** Zapisuje tekst; zwraca { ok, error }. */
  function writeRaw(key, text) {
    try {
      window.localStorage.setItem(key, text);
      return { ok: true };
    } catch (e) {
      const quota = e && (e.name === "QuotaExceededError" || e.code === 22);
      return {
        ok: false,
        error: quota ? "Brak miejsca w pamięci przeglądarki." : "Przeglądarka nie pozwoliła zapisać danych."
      };
    }
  }

  // ---------- Migracja i walidacja treści ----------

  /**
   * Migracja danych do aktualnej wersji.
   * Na razie istnieje tylko wersja 1, więc funkcja jedynie sprawdza pole version.
   * W przyszłości dopisz kolejne kroki, np.:
   *   if (data.version === 1) { ...zmiana struktury...; data.version = 2; }
   */
  function migrate(data) {
    if (!U.isPlainObject(data)) throw new Error("Dane nie są obiektem.");
    if (typeof data.version !== "number") throw new Error("Brak pola „version” w danych.");
    if (data.version > CURRENT_VERSION) {
      throw new Error("Dane pochodzą z nowszej wersji aplikacji (wersja " + data.version + "). Zaktualizuj pliki strony.");
    }
    // (miejsce na przyszłe migracje)
    return data;
  }

  function str(value) {
    if (typeof value === "string") return value;
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function arr(value) {
    return Array.isArray(value) ? value : [];
  }

  /**
   * Sprawdza strukturę treści i zwraca jej „czystą” kopię.
   * Poważne błędy (brak kategorii/poziomów) → wyjątek z opisem po polsku.
   * Drobne braki (brakujące pola, brakujące id) są uzupełniane.
   */
  function normalizeContent(raw) {
    if (!U.isPlainObject(raw)) throw new Error("Plik nie zawiera obiektu z danymi.");
    if (!Array.isArray(raw.categories)) throw new Error("Brak listy kategorii („categories”).");
    if (!Array.isArray(raw.levels)) throw new Error("Brak listy poziomów („levels”).");

    // Wszystkie id muszą być unikalne (postęp ucznia jest powiązany z id)
    const seen = new Set();
    function stableId(value, prefix) {
      let id = typeof value === "string" ? value.trim() : "";
      if (!id || seen.has(id)) id = U.uid(prefix);
      seen.add(id);
      return id;
    }

    const categories = raw.categories.map(function (c, i) {
      if (!U.isPlainObject(c) || typeof c.id !== "string" || !c.id.trim()) {
        throw new Error("Kategoria nr " + (i + 1) + " nie ma poprawnego identyfikatora.");
      }
      if (seen.has(c.id)) throw new Error("Powtórzony identyfikator kategorii: " + c.id);
      seen.add(c.id);
      return { id: c.id, name: str(c.name) };
    });

    const foundLevels = raw.levels.filter(function (l) {
      return U.isPlainObject(l) && ELM.LEVEL_IDS.indexOf(l.id) !== -1;
    });
    if (!foundLevels.length) throw new Error("Nie znaleziono żadnego poziomu A1–C2.");

    function normalizeTopic(t) {
      return {
        id: stableId(t.id, "t"),
        title: str(t.title),
        rule: str(t.rule),
        formula: str(t.formula),
        examples: arr(t.examples).filter(U.isPlainObject).map(function (x) {
          return { id: stableId(x.id, "x"), text: str(x.text) };
        }),
        mistakes: arr(t.mistakes).filter(U.isPlainObject).map(function (m) {
          return { id: stableId(m.id, "m"), wrong: str(m.wrong), correct: str(m.correct), note: str(m.note) };
        }),
        exercises: arr(t.exercises).filter(U.isPlainObject).map(function (e) {
          return { id: stableId(e.id, "ex"), prompt: str(e.prompt), answer: str(e.answer) };
        })
      };
    }

    function normalizeBucket(b) {
      return {
        essentials: arr(b.essentials).filter(U.isPlainObject).map(function (e) {
          return { id: stableId(e.id, "e"), text: str(e.text) };
        }),
        topics: arr(b.topics).filter(U.isPlainObject).map(normalizeTopic)
      };
    }

    // Zawsze komplet sześciu poziomów w stałej kolejności
    const levels = ELM.LEVEL_IDS.map(function (levelId) {
      const src = foundLevels.find(function (l) { return l.id === levelId; }) || {};
      const srcContent = U.isPlainObject(src.content) ? src.content : {};
      const level = { id: levelId, description: str(src.description), content: {} };
      categories.forEach(function (cat) {
        const bucket = U.isPlainObject(srcContent[cat.id]) ? srcContent[cat.id] : {};
        level.content[cat.id] = normalizeBucket(bucket);
      });
      return level;
    });

    return { version: CURRENT_VERSION, categories: categories, levels: levels };
  }

  /** Postęp: zostawiamy tylko wpisy „id → true”. */
  function normalizeProgress(raw) {
    if (!U.isPlainObject(raw)) throw new Error("Postęp nie jest obiektem.");
    const clean = {};
    Object.keys(raw).forEach(function (key) {
      if (raw[key] === true) clean[key] = true;
    });
    return clean;
  }

  // ---------- Wczytywanie / zapis ----------

  /**
   * Wczytuje treści. Zwraca:
   *   { status: "new",     data }  — brak zapisu, pusty szkielet
   *   { status: "ok",      data }
   *   { status: "corrupt", error, raw } — dane uszkodzone
   */
  function loadContent() {
    const raw = readRaw(CONTENT_KEY);
    if (raw === null) return { status: "new", data: ELM.createDefaultData() };
    try {
      const data = normalizeContent(migrate(parseJSON(raw)));
      return { status: "ok", data: data };
    } catch (e) {
      return { status: "corrupt", error: e.message || String(e), raw: raw };
    }
  }

  function saveContent(data) {
    return writeRaw(CONTENT_KEY, JSON.stringify(data));
  }

  /** Wczytuje postęp; uszkodzony postęp → pusty, z flagą „corrupt”. */
  function loadProgress() {
    const raw = readRaw(PROGRESS_KEY);
    if (raw === null) return { status: "new", data: {} };
    try {
      return { status: "ok", data: normalizeProgress(JSON.parse(raw)) };
    } catch (e) {
      writeRaw(PROGRESS_KEY + "_corrupt_backup", raw);
      return { status: "corrupt", data: {} };
    }
  }

  function saveProgress(progress) {
    return writeRaw(PROGRESS_KEY, JSON.stringify(progress));
  }

  /** Stan interfejsu (wybrany poziom itd.). Błędy ignorujemy — to tylko wygoda. */
  function loadUI() {
    const fallback = { levelId: ELM.LEVEL_IDS[0], categoryId: null, topics: {} };
    try {
      const ui = JSON.parse(readRaw(UI_KEY) || "null");
      if (!U.isPlainObject(ui)) return fallback;
      return {
        levelId: typeof ui.levelId === "string" ? ui.levelId : fallback.levelId,
        categoryId: typeof ui.categoryId === "string" ? ui.categoryId : null,
        topics: U.isPlainObject(ui.topics) ? ui.topics : {}
      };
    } catch (e) {
      return fallback;
    }
  }

  function saveUI(ui) {
    writeRaw(UI_KEY, JSON.stringify(ui));
  }

  /** Zachowuje uszkodzone dane pod osobnym kluczem (na wszelki wypadek). */
  function backupCorrupt(raw) {
    writeRaw(CORRUPT_BACKUP_KEY, raw);
  }

  /** Usuwa wszystkie dane aplikacji z tej przeglądarki. */
  function clearAll() {
    try {
      [CONTENT_KEY, PROGRESS_KEY, UI_KEY].forEach(function (k) { window.localStorage.removeItem(k); });
    } catch (e) { /* brak dostępu — nic do usunięcia */ }
  }

  // ---------- Eksport / import ----------

  /** Opakowanie pliku eksportu (pozwala rozpoznać rodzaj pliku przy imporcie). */
  function wrapExport(kind, data) {
    return {
      app: APP_ID,
      kind: kind, // "content" albo "progress"
      version: CURRENT_VERSION,
      exportedAt: new Date().toISOString(),
      data: data
    };
  }

  /** Pobiera obiekt jako plik .json (Blob + link z atrybutem download). */
  function downloadJSON(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = U.el("a", { href: url, download: filename });
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function parseJSON(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error("Dane nie są poprawnym zapisem JSON (" + e.message + ").");
    }
  }

  /** Odczytuje i sprawdza plik z treściami. Zwraca gotowe dane albo rzuca błąd. */
  function parseContentImport(text) {
    const obj = parseJSON(text);
    if (U.isPlainObject(obj) && obj.kind === "progress") {
      throw new Error("To jest plik z postępem ucznia, a nie z treściami. Użyj opcji „Importuj postęp”.");
    }
    // Akceptujemy plik z opakowaniem (eksport z aplikacji) albo „gołe” dane
    const data = U.isPlainObject(obj) && obj.app === APP_ID && obj.data ? obj.data : obj;
    return normalizeContent(migrate(data));
  }

  /** Odczytuje i sprawdza plik z postępem. */
  function parseProgressImport(text) {
    const obj = parseJSON(text);
    if (U.isPlainObject(obj) && (obj.kind === "content" || Array.isArray(obj.categories))) {
      throw new Error("To jest plik z treściami, a nie z postępem. Użyj opcji „Importuj treści”.");
    }
    const data = U.isPlainObject(obj) && obj.app === APP_ID && obj.kind === "progress" ? obj.data : obj;
    if (!U.isPlainObject(data)) throw new Error("Plik nie zawiera poprawnego zapisu postępu.");
    return normalizeProgress(data);
  }

  ELM.store = {
    CURRENT_VERSION: CURRENT_VERSION,
    isStorageAvailable: isStorageAvailable,
    migrate: migrate,
    normalizeContent: normalizeContent,
    loadContent: loadContent,
    saveContent: saveContent,
    loadProgress: loadProgress,
    saveProgress: saveProgress,
    loadUI: loadUI,
    saveUI: saveUI,
    backupCorrupt: backupCorrupt,
    clearAll: clearAll,
    wrapExport: wrapExport,
    downloadJSON: downloadJSON,
    parseContentImport: parseContentImport,
    parseProgressImport: parseProgressImport
  };
})(window.ELM);
