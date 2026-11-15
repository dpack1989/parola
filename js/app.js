"use strict";

const STORAGE_KEY = "parola-v1";
const DAY = 86400000;

const state = {
  words: [],
  catalogVersion: "",
  session: [],
  index: 0,
  mode: "cards",
  revealed: false,
  recognition: null,
  selectedGroup: "",
  trainingDirection: "de-it",
  libraryQuery: "",
  libraryGroup: "",
  librarySort: "italian",
  libraryDirection: "it-de",
  quickTotal: 0,
  quickCorrect: 0,
  quickMistakes: 0,
  speechSolved: false,
  speechAutoActive: false,
  nativeRecognitionActive: false,
  speechRestartTimer: null,
  speechPlaybackTimer: null,
  speechPlaybackStarted: false,
  autoAdvanceTimer: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const grammarExercises = {
  gender: [
    { prompt: "libro", translation: "Buch", answer: "männlich", spoken: "il libro", explanation: "Wörter auf -o sind meistens männlich: il libro." },
    { prompt: "casa", translation: "Haus", answer: "weiblich", spoken: "la casa", explanation: "Wörter auf -a sind meistens weiblich: la casa." },
    { prompt: "ristorante", translation: "Restaurant", answer: "männlich", spoken: "il ristorante", explanation: "Bei Wörtern auf -e muss man das Geschlecht mitlernen: il ristorante." },
    { prompt: "notte", translation: "Nacht", answer: "weiblich", spoken: "la notte", explanation: "Auch weibliche Wörter können auf -e enden: la notte." },
    { prompt: "problema", translation: "Problem", answer: "männlich", spoken: "il problema", explanation: "Il problema ist eine wichtige Ausnahme: Trotz -a ist das Wort männlich." },
    { prompt: "stazione", translation: "Bahnhof", answer: "weiblich", spoken: "la stazione", explanation: "Wörter auf -zione sind sehr häufig weiblich: la stazione." },
    { prompt: "cane", translation: "Hund", answer: "männlich", spoken: "il cane", explanation: "Die Endung -e verrät das Geschlecht nicht sicher: il cane." },
    { prompt: "chiave", translation: "Schlüssel", answer: "weiblich", spoken: "la chiave", explanation: "Die Endung -e verrät das Geschlecht nicht sicher: la chiave." }
  ],
  articles: [
    { prompt: "___ ragazzo", translation: "der Junge", answer: "il", choices: ["il", "lo", "la", "l’"], spoken: "il ragazzo", explanation: "Vor den meisten männlichen Wörtern mit Konsonant steht il." },
    { prompt: "___ studente", translation: "der Schüler", answer: "lo", choices: ["il", "lo", "la", "l’"], spoken: "lo studente", explanation: "Vor s + Konsonant verwendet man bei männlichen Wörtern lo." },
    { prompt: "___ zaino", translation: "der Rucksack", answer: "lo", choices: ["il", "lo", "la", "l’"], spoken: "lo zaino", explanation: "Vor z verwendet man bei männlichen Wörtern lo." },
    { prompt: "___ ragazza", translation: "das Mädchen", answer: "la", choices: ["il", "lo", "la", "l’"], spoken: "la ragazza", explanation: "Vor einem weiblichen Wort mit Konsonant steht la." },
    { prompt: "___ amico", translation: "der Freund", answer: "l’", choices: ["il", "lo", "la", "l’"], spoken: "l'amico", explanation: "Vor einem Vokal wird der Artikel im Singular zu l’." },
    { prompt: "___ amica", translation: "die Freundin", answer: "l’", choices: ["il", "lo", "la", "l’"], spoken: "l'amica", explanation: "L’ steht vor Vokalen sowohl bei männlichen als auch weiblichen Wörtern." },
    { prompt: "___ ragazzi", translation: "die Jungen", answer: "i", choices: ["i", "gli", "le"], spoken: "i ragazzi", explanation: "I ist die Mehrzahl von il." },
    { prompt: "___ studenti", translation: "die Schüler", answer: "gli", choices: ["i", "gli", "le"], spoken: "gli studenti", explanation: "Gli ist die Mehrzahl von lo." },
    { prompt: "___ amici", translation: "die Freunde", answer: "gli", choices: ["i", "gli", "le"], spoken: "gli amici", explanation: "Bei männlichen Wörtern mit Vokal wird l’ in der Mehrzahl zu gli." },
    { prompt: "___ ragazze", translation: "die Mädchen", answer: "le", choices: ["i", "gli", "le"], spoken: "le ragazze", explanation: "Le ist die weibliche Mehrzahl von la und l’." }
  ]
};

const grammarExerciseState = { gender: -1, articles: -1 };

const els = {
  dueCount: $("#dueCount"), dueLabel: $("#dueLabel"), todayHint: $("#todayHint"), wordCount: $("#wordCount"),
  wordList: $("#wordList"), emptyState: $("#emptyState"), wordDialog: $("#wordDialog"),
  libraryTools: $("#libraryTools"), wordSearch: $("#wordSearch"), wordSort: $("#wordSort"), wordGroupFilter: $("#wordGroupFilter"),
  wordResults: $("#wordResults"), filteredEmpty: $("#filteredEmpty"),
  swapWordDirection: $("#swapWordDirection"), wordDirectionLabel: $("#wordDirectionLabel"),
  wordForm: $("#wordForm"), wordDialogTitle: $("#wordDialogTitle"), editId: $("#editId"),
  italian: $("#italianInput"), german: $("#germanInput"), group: $("#groupInput"), note: $("#noteInput"),
  trainingGroup: $("#trainingGroup"), groupSuggestions: $("#groupSuggestions"),
  swapTrainingDirection: $("#swapTrainingDirection"), trainingDirectionLabel: $("#trainingDirectionLabel"), writeModeHint: $("#writeModeHint"),
  studyDialog: $("#studyDialog"), studyContent: $("#studyContent"), studyActions: $("#studyActions"),
  studyProgress: $("#studyProgress"), studyPosition: $("#studyPosition"),
  backupDialog: $("#backupDialog"), toast: $("#toast")
};

async function load() {
  let parsed = null;
  try {
    parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    state.words = Array.isArray(parsed?.words) ? parsed.words.map(normalizeWordData) : [];
    state.catalogVersion = parsed?.catalogVersion || "";
  } catch {
    state.words = [];
  }
  render();
  await syncCatalog(!state.catalogVersion);
}

async function syncCatalog(replaceLegacy = false) {
  try {
    const response = await fetch("./data/vocabulary.json", { cache: "no-cache" });
    if (!response.ok) throw new Error();
    const catalog = await response.json();
    if (!Array.isArray(catalog.words) || !catalog.version) throw new Error();

    if (replaceLegacy) state.words = [];
    const byId = new Map(state.words.map((word) => [word.id, word]));
    const byItalian = new Map(state.words.map((word) => [normalize(word.italian), word]));

    for (const sourceWord of catalog.words) {
      if (!sourceWord.italian || !sourceWord.german) continue;
      const existing = byId.get(sourceWord.id) || byItalian.get(normalize(sourceWord.italian));
      if (existing) {
        Object.assign(existing, {
          italian: sourceWord.italian,
          german: sourceWord.german,
          group: sourceWord.group || "Neu / prüfen",
          note: sourceWord.note || existing.note || "",
          source: "catalog",
          catalogUpdatedAt: sourceWord.catalogUpdatedAt || catalog.generatedAt
        });
      } else {
        const word = normalizeWordData({
          ...sourceWord,
          id: sourceWord.id || uid(),
          source: "catalog",
          due: new Date().toISOString(),
          interval: 0,
          repetitions: 0,
          createdAt: catalog.generatedAt || new Date().toISOString()
        });
        state.words.push(word);
        byId.set(word.id, word);
        byItalian.set(normalize(word.italian), word);
      }
    }

    state.catalogVersion = String(catalog.version);
    save();
  } catch {
    render();
  }
}

function normalizeWordData(word) {
  return {
    ...word,
    id: word.id || uid(),
    group: typeof word.group === "string" ? word.group.trim() : "",
    mistakeCount: Number.isFinite(word.mistakeCount) ? word.mistakeCount : 0,
    correctCount: Number.isFinite(word.correctCount) ? word.correctCount : 0,
    difficulty: Number.isFinite(word.difficulty) ? word.difficulty : 0
  };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, catalogVersion: state.catalogVersion, exportedAt: new Date().toISOString(), words: state.words }));
}

function save() {
  persist();
  render();
}

function dueWords() {
  const now = Date.now();
  return state.words.filter((word) => !word.due || new Date(word.due).getTime() <= now);
}

function render() {
  const due = dueWords().length;
  els.dueCount.textContent = due;
  els.dueLabel.textContent = due === 1 ? "Wort wartet" : "Wörter warten";
  els.wordCount.textContent = state.words.length;
  els.todayHint.textContent = state.words.length
    ? (due ? "Kurze Wiederholungen bringen dich heute am weitesten." : "Alles geschafft – du kannst trotzdem frei weiterüben.")
    : "Füge deine ersten Vokabeln hinzu und starte deine Lernserie.";
  els.emptyState.hidden = state.words.length > 0;
  els.libraryTools.hidden = state.words.length === 0;
  renderGroups();
  renderTrainingDirection();
  renderWordList();
}

function renderWordList() {
  const query = normalize(state.libraryQuery);
  const visibleWords = state.words.filter((word) => {
    const matchesGroup = !state.libraryGroup || word.group === state.libraryGroup;
    const matchesQuery = !query || [word.italian, word.german, word.group, word.note]
      .some((value) => normalize(value || "").includes(query));
    return matchesGroup && matchesQuery;
  });
  const compareText = (a, b, field, locale) => (a[field] || "").localeCompare(b[field] || "", locale, { sensitivity: "base" });
  visibleWords.sort((a, b) => {
    if (state.librarySort === "german") return compareText(a, b, "german", "de");
    if (state.librarySort === "group") return compareText(a, b, "group", "de") || compareText(a, b, "italian", "it");
    if (state.librarySort === "mistakes") return (b.mistakeCount || 0) - (a.mistakeCount || 0) || compareText(a, b, "italian", "it");
    return compareText(a, b, "italian", "it");
  });

  const germanFirst = state.libraryDirection === "de-it";
  els.wordDirectionLabel.textContent = germanFirst ? "Deutsch → Italienisch" : "Italienisch → Deutsch";
  els.swapWordDirection.setAttribute("aria-pressed", String(germanFirst));
  els.wordResults.textContent = query || state.libraryGroup ? `${visibleWords.length} von ${state.words.length} Vokabeln` : `${state.words.length} Vokabeln`;
  els.filteredEmpty.hidden = visibleWords.length > 0 || state.words.length === 0;
  els.wordList.hidden = visibleWords.length === 0;
  els.wordList.innerHTML = visibleWords
    .map((word) => `
      <article class="word-row">
        <div class="word-term">
          <small>${germanFirst ? "Deutsch" : "Italienisch"}</small>
          <strong>${escapeHtml(germanFirst ? word.german : word.italian)}</strong>
        </div>
        <div class="word-term secondary">
          <small>${germanFirst ? "Italienisch" : "Deutsch"}</small>
          <strong>${escapeHtml(germanFirst ? word.italian : word.german)}</strong>
        </div>
        <div class="word-actions">
          <button class="mini-button" data-speak="${word.id}" aria-label="${escapeHtml(word.italian)} anhören">🔊</button>
          <button class="mini-button" data-edit="${word.id}" aria-label="Vokabel bearbeiten">✎</button>
        </div>
        ${(word.group || word.mistakeCount || word.note) ? `<div class="word-meta">${word.group ? `<span class="word-tag">${escapeHtml(word.group)}</span>` : ""}${word.mistakeCount ? `<span class="word-tag errors">${word.mistakeCount} Fehler</span>` : ""}${word.note ? `<span class="word-note">${escapeHtml(word.note)}</span>` : ""}</div>` : ""}
      </article>`).join("");
}

function groups() {
  return [...new Set(state.words.map((word) => word.group).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));
}

function renderGroups() {
  const items = groups();
  if (state.selectedGroup && !items.includes(state.selectedGroup)) state.selectedGroup = "";
  if (state.libraryGroup && !items.includes(state.libraryGroup)) state.libraryGroup = "";
  const options = `<option value="">Alle Gruppen</option>${items.map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join("")}`;
  els.trainingGroup.innerHTML = options;
  els.trainingGroup.value = state.selectedGroup;
  els.wordGroupFilter.innerHTML = options;
  els.wordGroupFilter.value = state.libraryGroup;
  els.groupSuggestions.innerHTML = items.map((group) => `<option value="${escapeHtml(group)}"></option>`).join("");
}

function renderTrainingDirection() {
  const germanFirst = state.trainingDirection === "de-it";
  els.trainingDirectionLabel.textContent = germanFirst ? "Deutsch → Italienisch" : "Italienisch → Deutsch";
  els.swapTrainingDirection.setAttribute("aria-pressed", String(!germanFirst));
  els.writeModeHint.textContent = germanFirst ? "Italienisch eintippen" : "Deutsch eintippen";
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function normalize(value = "") {
  return value.trim().toLocaleLowerCase("it-IT").replace(/[.!?,;:]/g, "").replace(/\s+/g, " ");
}

function germanFirst() {
  return state.trainingDirection === "de-it";
}

function studyPrompt(word) {
  return germanFirst() ? word.german : word.italian;
}

function studyAnswer(word) {
  return germanFirst() ? word.italian : word.german;
}

function acceptedAnswers(word) {
  const answer = studyAnswer(word);
  const values = germanFirst() ? [answer] : [answer, ...answer.split(/[,;/]/)];
  return values.map((value) => normalize(value)).filter(Boolean);
}

function isCorrectAnswer(value, word) {
  return acceptedAnswers(word).includes(normalize(value));
}

function recognitionLanguage() {
  return germanFirst() ? "it-IT" : "de-DE";
}

function announceItalianPrompt(word) {
  if (!germanFirst()) setTimeout(() => {
    if (els.studyDialog.open && state.session[state.index]?.id === word.id) speak(word.italian);
  }, 180);
}

function renderGrammarExercise(topic) {
  const exercises = grammarExercises[topic];
  const container = $(`#${topic}Exercise`);
  if (!exercises || !container) return;
  let nextIndex = Math.floor(Math.random() * exercises.length);
  if (exercises.length > 1 && nextIndex === grammarExerciseState[topic]) nextIndex = (nextIndex + 1) % exercises.length;
  grammarExerciseState[topic] = nextIndex;
  const exercise = exercises[nextIndex];
  const choices = exercise.choices || ["männlich", "weiblich"];
  container.innerHTML = `
    <div class="grammar-question">
      <small>${escapeHtml(exercise.translation)}</small>
      <strong>${escapeHtml(exercise.prompt)}</strong>
      <button class="grammar-listen" type="button" data-grammar-speak="${topic}" aria-label="Beispiel auf Italienisch anhören">🔊 Italienisch anhören</button>
    </div>
    <div class="grammar-choices">
      ${choices.map((choice, index) => `<button class="grammar-choice" type="button" data-grammar-answer="${index}" data-grammar-topic="${topic}">${escapeHtml(choice)}</button>`).join("")}
    </div>`;
}

function answerGrammarExercise(topic, choiceIndex) {
  const exercises = grammarExercises[topic];
  const exercise = exercises?.[grammarExerciseState[topic]];
  const container = $(`#${topic}Exercise`);
  if (!exercise || !container) return;
  const choices = exercise.choices || ["männlich", "weiblich"];
  const chosen = choices[choiceIndex];
  const correct = chosen === exercise.answer;
  container.querySelectorAll("[data-grammar-answer]").forEach((button) => {
    const value = choices[Number(button.dataset.grammarAnswer)];
    button.disabled = true;
    if (value === exercise.answer) button.classList.add("correct");
    else if (button.dataset.grammarAnswer === String(choiceIndex)) button.classList.add("wrong");
  });
  container.insertAdjacentHTML("beforeend", `
    <p class="grammar-feedback"><strong>${correct ? "Richtig!" : `Richtig wäre „${escapeHtml(exercise.answer)}“.`}</strong> ${escapeHtml(exercise.explanation)}</p>
    <button class="primary-button grammar-next" type="button" data-grammar-next="${topic}">Nächste Aufgabe</button>`);
  if (correct) speak(exercise.spoken);
}

function uid() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nativePlugin(name) {
  if (!window.Capacitor?.isNativePlatform?.()) return null;
  return window.Capacitor?.Plugins?.[name] || null;
}

function openWord(word = null) {
  els.wordForm.reset();
  els.editId.value = word?.id || "";
  els.italian.value = word?.italian || "";
  els.german.value = word?.german || "";
  els.group.value = word?.group || state.selectedGroup || "";
  els.note.value = word?.note || "";
  els.wordDialogTitle.textContent = word ? "Wort bearbeiten" : "Neues Wort";
  $("#deleteWord").hidden = !word;
  els.wordDialog.showModal();
  setTimeout(() => els.italian.focus(), 120);
}

function speak(text, onEnd = null) {
  if (!("speechSynthesis" in window) || !text.trim()) {
    toast("Sprachausgabe wird hier nicht unterstützt.");
    onEnd?.();
    return;
  }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "it-IT";
  utterance.rate = .86;
  const italianVoice = speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("it"));
  if (italianVoice) utterance.voice = italianVoice;
  if (onEnd) {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onEnd();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    setTimeout(finish, Math.max(1800, text.length * 140));
  }
  speechSynthesis.speak(utterance);
}

function buildSession(mode) {
  if (!state.words.length) {
    toast("Füge zuerst mindestens eine Vokabel hinzu.");
    openWord();
    return;
  }
  const source = state.selectedGroup ? state.words.filter((word) => word.group === state.selectedGroup) : state.words;
  if (!source.length) {
    toast("In dieser Gruppe sind noch keine Vokabeln.");
    return;
  }
  if (mode === "quick") {
    state.session = shuffle([...source]).slice(0, Math.min(30, source.length));
    state.quickTotal = state.session.length;
    state.quickCorrect = 0;
    state.quickMistakes = 0;
    state.index = 0;
    state.mode = mode;
    state.revealed = false;
    els.studyDialog.showModal();
    renderStudy();
    return;
  }
  const now = Date.now();
  const ordered = shuffle([...source]).sort((a, b) => {
    const aDue = !a.due || new Date(a.due).getTime() <= now ? 1 : 0;
    const bDue = !b.due || new Date(b.due).getTime() <= now ? 1 : 0;
    return bDue - aDue || (b.difficulty || 0) - (a.difficulty || 0);
  });
  const repeats = ordered.flatMap((word) => Array.from({ length: Math.min(2, Math.floor((word.difficulty || 0) / 2)) }, () => word));
  state.session = [...ordered, ...shuffle(repeats)];
  state.index = 0;
  state.mode = mode;
  state.revealed = false;
  state.speechSolved = false;
  state.speechAutoActive = false;
  els.studyDialog.showModal();
  renderStudy();
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function currentMode() {
  if (state.mode !== "mixed") return state.mode;
  return ["cards", "write", "speak"][state.index % 3];
}

function renderStudy() {
  const word = state.session[state.index];
  if (!word) return finishSession();
  clearTimeout(state.speechRestartTimer);
  clearTimeout(state.speechPlaybackTimer);
  clearTimeout(state.autoAdvanceTimer);
  state.revealed = false;
  state.speechSolved = false;
  state.speechPlaybackStarted = false;
  const mode = currentMode();
  if (mode !== "speak") state.speechAutoActive = false;
  const isQuick = state.mode === "quick";
  els.studyPosition.textContent = isQuick ? `${state.quickCorrect}/${state.quickTotal}` : `${state.index + 1}/${state.session.length}`;
  els.studyProgress.style.width = `${isQuick ? (state.quickCorrect / state.quickTotal) * 100 : (state.index / state.session.length) * 100}%`;

  if (mode === "cards" || mode === "quick") renderCard(word);
  if (mode === "write") renderWrite(word);
  if (mode === "speak") renderSpeak(word);
}

function renderCard(word) {
  const quick = state.mode === "quick";
  const firstLanguage = germanFirst() ? "Deutsch" : "Italienisch";
  const secondLanguage = germanFirst() ? "Italienisch" : "Deutsch";
  els.studyContent.innerHTML = `
    <div class="study-prompt">
      <p class="language">${quick ? "Schnelle Übung · erst überlegen, dann aufdecken" : "Tippe auf die Karte zum Umdrehen"}</p>
      <button class="flashcard" id="flashcard" type="button" aria-label="${firstLanguage} aufdecken: ${escapeHtml(studyPrompt(word))}">
        <span class="flashcard-inner">
          <span class="flashcard-face flashcard-front" data-card-front aria-hidden="false">
            <small>${firstLanguage}</small>
            <strong>${escapeHtml(studyPrompt(word))}</strong>
            <em>Antippen zum Aufdecken</em>
          </span>
          <span class="flashcard-face flashcard-back" data-card-back aria-hidden="true">
            <small>${secondLanguage}</small>
            <strong>${escapeHtml(studyAnswer(word))}</strong>
            ${word.note ? `<em>${escapeHtml(word.note)}</em>` : `<em>Noch einmal tippen, um Italienisch zu hören</em>`}
          </span>
        </span>
      </button>
    </div>`;
  els.studyActions.className = "study-actions";
  els.studyActions.innerHTML = `<button class="primary-button full" id="revealButton">Karte umdrehen</button>`;
  announceItalianPrompt(word);
}

function renderWrite(word) {
  const answerLanguage = germanFirst() ? "Italienisch" : "Deutsch";
  els.studyContent.innerHTML = `
    <div class="study-prompt">
      <p class="language">Schreibe auf ${answerLanguage}</p>
      <div class="study-word">${escapeHtml(studyPrompt(word))}</div>
      <input class="study-input" id="answerInput" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Deine Antwort">
      <p class="feedback" id="feedback"></p>
    </div>`;
  els.studyActions.className = "study-actions";
  els.studyActions.innerHTML = `<button class="primary-button full" id="checkAnswer">Prüfen</button>`;
  announceItalianPrompt(word);
  setTimeout(() => $("#answerInput")?.focus(), 100);
}

function renderSpeak(word) {
  const supported = !!(nativePlugin("SpeechRecognition") || window.SpeechRecognition || window.webkitSpeechRecognition);
  const answerLanguage = germanFirst() ? "Italienisch" : "Deutsch";
  els.studyContent.innerHTML = `
    <div class="study-prompt">
      <p class="language">Sage es auf ${answerLanguage}</p>
      <div class="study-word">${escapeHtml(studyPrompt(word))}</div>
      <button class="speak-button" id="recordButton" aria-label="Mikrofon starten">🎙</button>
      <p class="feedback" id="feedback">${supported ? "Tippe einmal auf das Mikrofon und sprich." : "Spracherkennung ist hier nicht verfügbar. Nutze das Mikrofon deiner iPhone-Tastatur."}</p>
      <div id="speechAnswer"></div>
      <input class="study-input" id="speechFallback" autocomplete="off" autocapitalize="none" placeholder="Oder hier tippen bzw. diktieren">
    </div>`;
  els.studyActions.className = "study-actions";
  els.studyActions.innerHTML = `
    <button class="secondary-button" id="showSpeechAnswer">Antwort zeigen</button>
    <button class="primary-button full" id="checkSpeech">Eingabe prüfen</button>`;
  if (!supported) $("#recordButton").disabled = true;
  if (!germanFirst() && supported && state.speechAutoActive) {
    state.speechRestartTimer = setTimeout(() => speak(word.italian, () => {
      if (els.studyDialog.open && state.session[state.index]?.id === word.id) {
        state.speechRestartTimer = setTimeout(() => startRecognition(word), 300);
      }
    }), 180);
  } else {
    announceItalianPrompt(word);
    if (supported && state.speechAutoActive) state.speechRestartTimer = setTimeout(() => startRecognition(word), 500);
  }
}

function showSpeechAnswer(word) {
  state.revealed = true;
  const area = $("#speechAnswer");
  const answerLanguage = germanFirst() ? "Italienisch" : "Deutsch";
  if (area) area.innerHTML = `<div class="speech-answer"><small>${answerLanguage}</small><strong>${escapeHtml(studyAnswer(word))}</strong>${word.note ? `<br><span>${escapeHtml(word.note)}</span>` : ""}</div>`;
  const feedback = $("#feedback");
  if (feedback && !state.speechSolved) feedback.textContent = `Sprich die Antwort jetzt noch richtig auf ${answerLanguage}.`;
  const showButton = $("#showSpeechAnswer");
  if (showButton) showButton.disabled = true;
}

function recordMistake(word) {
  word.mistakeCount = (word.mistakeCount || 0) + 1;
  word.difficulty = Math.min(6, (word.difficulty || 0) + 1);
  word.lastMistake = new Date().toISOString();
  persist();
}

function recordSuccess(word) {
  word.correctCount = (word.correctCount || 0) + 1;
  word.difficulty = Math.max(0, (word.difficulty || 0) - .35);
  word.lastReviewed = new Date().toISOString();
}

function repeatSpokenAnswer(word) {
  if (state.speechPlaybackStarted || !state.speechSolved) return;
  state.speechPlaybackStarted = true;
  clearTimeout(state.speechPlaybackTimer);
  state.speechPlaybackTimer = setTimeout(() => {
    if (!els.studyDialog.open || !state.speechSolved) return;
    speak(word.italian, () => {
      if (!els.studyDialog.open || !state.speechSolved) return;
      state.autoAdvanceTimer = setTimeout(() => {
        state.index += 1;
        renderStudy();
      }, 650);
    });
  }, 350);
}

function finishSpokenWord(word, heard = "") {
  if (state.speechSolved) return;
  state.speechSolved = true;
  const recognitionWasActive = !!state.recognition || state.nativeRecognitionActive;
  state.recognition?.stop?.();
  nativePlugin("SpeechRecognition")?.stop?.().catch(() => {});
  recordSuccess(word);
  const nextDays = Math.max(1, Math.round(6 - (word.difficulty || 0)));
  word.interval = nextDays;
  word.repetitions = (word.repetitions || 0) + 1;
  word.due = new Date(Date.now() + nextDays * DAY).toISOString();
  persist();
  showSpeechAnswer(word);
  const feedback = $("#feedback");
  if (feedback) {
    feedback.className = "feedback good";
    feedback.textContent = heard ? `Richtig erkannt: „${heard}“` : "Richtig! Ottimo!";
  }
  els.studyActions.innerHTML = `<p class="feedback good">Richtig – hör dir das Wort noch einmal an …</p>`;
  if (recognitionWasActive) state.speechPlaybackTimer = setTimeout(() => repeatSpokenAnswer(word), 1200);
  else repeatSpokenAnswer(word);
}

function processSpokenAttempt(value, word) {
  if (!value.trim() || state.speechSolved) return;
  if (isCorrectAnswer(value, word)) {
    finishSpokenWord(word, value);
    return;
  }
  recordMistake(word);
  const feedback = $("#feedback");
  if (feedback) {
    feedback.className = "feedback bad";
    feedback.textContent = `„${value}“ wurde erkannt. Versuch es noch einmal.`;
  }
  const fallback = $("#speechFallback");
  if (fallback) fallback.value = "";
}

function reveal(word, message = "") {
  if (currentMode() === "cards" || currentMode() === "quick") {
    const card = $("#flashcard");
    if (state.revealed) {
      speak(word.italian);
      return;
    }
    state.revealed = true;
    card?.classList.add("flipped");
    card?.setAttribute("aria-label", `${germanFirst() ? "Italienisch" : "Deutsch"}: ${studyAnswer(word)}. Noch einmal tippen für die italienische Aussprache.`);
    $("[data-card-front]")?.setAttribute("aria-hidden", "true");
    $("[data-card-back]")?.setAttribute("aria-hidden", "false");
    if (germanFirst()) speak(word.italian);
    if (state.mode === "quick") {
      els.studyActions.className = "study-actions quick-actions";
      els.studyActions.innerHTML = `
        <button class="rating-button quick-again" data-quick-result="again">Noch einmal<small>kommt erneut</small></button>
        <button class="rating-button quick-known" data-quick-result="known">Gewusst<small>geschafft</small></button>`;
    } else {
      els.studyActions.className = "study-actions four";
      els.studyActions.innerHTML = `
        <button class="rating-button" data-rate="again">Nochmal<small>gleich</small></button>
        <button class="rating-button" data-rate="hard">Schwer<small>1 Tag</small></button>
        <button class="rating-button" data-rate="good">Gut<small>ein paar Tage</small></button>
        <button class="rating-button" data-rate="easy">Leicht<small>später</small></button>`;
    }
    return;
  }
  state.revealed = true;
  const area = $("#revealArea");
  if (area) area.innerHTML = `<div class="study-answer">${escapeHtml(studyAnswer(word))}${word.note ? `<small><br>${escapeHtml(word.note)}</small>` : ""}</div>`;
  if (message && $("#feedback")) $("#feedback").innerHTML = message;
  els.studyActions.className = "study-actions four";
  els.studyActions.innerHTML = `
    <button class="rating-button" data-rate="again">Nochmal<small>gleich</small></button>
    <button class="rating-button" data-rate="hard">Schwer<small>1 Tag</small></button>
    <button class="rating-button" data-rate="good">Gut<small>ein paar Tage</small></button>
    <button class="rating-button" data-rate="easy">Leicht<small>später</small></button>`;
}

function answerQuick(word, known) {
  if (known) {
    recordSuccess(word);
    state.quickCorrect += 1;
  } else {
    recordMistake(word);
    state.quickMistakes += 1;
    state.session.push(word);
  }
  persist();
  state.index += 1;
  renderStudy();
}

function checkTyped(value, word) {
  if (!value.trim()) return;
  const correct = isCorrectAnswer(value, word);
  if (!correct) recordMistake(word);
  const feedback = $("#feedback");
  feedback.className = `feedback ${correct ? "good" : "bad"}`;
  feedback.innerHTML = correct ? "Richtig! Ottimo!" : `Fast – richtig ist: <strong>${escapeHtml(studyAnswer(word))}</strong>`;
  speak(word.italian);
  reveal(word, feedback.innerHTML);
}

async function startNativeRecognition(word) {
  const recognition = nativePlugin("SpeechRecognition");
  if (!recognition || state.speechSolved || state.nativeRecognitionActive || currentMode() !== "speak") return;

  state.speechAutoActive = true;
  state.nativeRecognitionActive = true;
  const button = $("#recordButton");
  const feedback = $("#feedback");
  button?.classList.add("listening");
  if (feedback) feedback.textContent = "Ich höre zu …";

  try {
    let permission = await recognition.checkPermissions();
    if (permission.speechRecognition !== "granted") permission = await recognition.requestPermissions();
    if (permission.speechRecognition !== "granted") {
      if (feedback) feedback.textContent = "Bitte erlaube Mikrofon und Spracherkennung in den iPhone-Einstellungen.";
      state.speechAutoActive = false;
      return;
    }

    const result = await recognition.start({ language: recognitionLanguage(), maxResults: 3, partialResults: false, popup: false });
    const alternatives = Array.isArray(result.matches) ? result.matches : [];
    const heard = alternatives[0] || "";
    const fallback = $("#speechFallback");
    if (fallback) fallback.value = heard;
    if (!heard) {
      if (feedback) feedback.textContent = "Ich habe nichts verstanden. Versuch es noch einmal oder nutze die Diktierfunktion.";
    } else if (alternatives.some((value) => isCorrectAnswer(value, word))) {
      finishSpokenWord(word, heard);
    } else {
      processSpokenAttempt(heard, word);
    }
  } catch {
    if (!state.speechSolved && feedback) feedback.textContent = "Das hat nicht geklappt. Sprich noch einmal oder nutze unten die Diktierfunktion.";
  } finally {
    state.nativeRecognitionActive = false;
    button?.classList.remove("listening");
    if (state.speechSolved) {
      repeatSpokenAnswer(word);
    } else if (state.speechAutoActive && els.studyDialog.open && currentMode() === "speak") {
      state.speechRestartTimer = setTimeout(() => startNativeRecognition(word), 700);
    }
  }
}

function startRecognition(word) {
  if (nativePlugin("SpeechRecognition")) {
    startNativeRecognition(word);
    return;
  }
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition || state.speechSolved || currentMode() !== "speak") return;
  state.speechAutoActive = true;
  state.recognition?.abort?.();
  const recognition = new Recognition();
  state.recognition = recognition;
  recognition.lang = recognitionLanguage();
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;
  const button = $("#recordButton");
  const feedback = $("#feedback");
  button?.classList.add("listening");
  feedback.textContent = "Ich höre zu …";
  recognition.onresult = (event) => {
    const alternatives = [...event.results[0]].map((result) => result.transcript);
    const heard = alternatives[0] || "";
    const fallback = $("#speechFallback");
    if (fallback) fallback.value = heard;
    const correct = alternatives.some((value) => isCorrectAnswer(value, word));
    if (correct) {
      finishSpokenWord(word, heard);
    } else {
      processSpokenAttempt(heard, word);
    }
  };
  recognition.onerror = (event) => {
    if (event.error !== "aborted" && !state.speechSolved) feedback.textContent = "Das hat nicht geklappt. Sprich noch einmal oder nutze unten die Diktierfunktion.";
  };
  recognition.onend = () => {
    if (state.recognition !== recognition) return;
    state.recognition = null;
    button?.classList.remove("listening");
    if (state.speechSolved) {
      repeatSpokenAnswer(word);
      return;
    }
    if (state.speechAutoActive && !state.speechSolved && els.studyDialog.open && currentMode() === "speak") {
      state.speechRestartTimer = setTimeout(() => startRecognition(word), 700);
    }
  };
  try { recognition.start(); } catch { feedback.textContent = "Tippe noch einmal auf das Mikrofon."; }
}

function schedule(word, rating) {
  const intervals = { again: 0, hard: 1, good: Math.max(3, Math.round((word.interval || 1) * 2.2)), easy: Math.max(7, Math.round((word.interval || 2) * 3.2)) };
  const nextInterval = intervals[rating];
  word.interval = nextInterval;
  word.repetitions = rating === "again" ? 0 : (word.repetitions || 0) + 1;
  word.due = new Date(Date.now() + (rating === "again" ? 10 * 60000 : nextInterval * DAY)).toISOString();
  word.lastReviewed = new Date().toISOString();
  if (rating === "again") recordMistake(word);
  else if (rating === "hard") word.difficulty = Math.min(6, (word.difficulty || 0) + .5);
  else recordSuccess(word);
  persist();
  state.index += 1;
  renderStudy();
}

function finishSession() {
  els.studyProgress.style.width = "100%";
  const quick = state.mode === "quick";
  const count = quick ? state.quickTotal : state.session.length;
  const detail = quick
    ? `${count} ${count === 1 ? "Wort" : "Wörter"} geschafft${state.quickMistakes ? ` · ${state.quickMistakes} ${state.quickMistakes === 1 ? "Wiederholung" : "Wiederholungen"} nötig` : " · alles beim ersten Mal gewusst"}.`
    : `Du hast ${count} ${count === 1 ? "Wort" : "Wörter"} wiederholt.`;
  els.studyContent.innerHTML = `<div><div class="empty-illustration">bravo!</div><h2>${quick ? "Schnelle Übung geschafft" : "Runde geschafft"}</h2><p>${detail}</p></div>`;
  els.studyActions.className = "study-actions";
  els.studyActions.innerHTML = `<button class="primary-button full" id="finishStudy">Fertig</button>`;
  render();
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.remove("show"), 2600);
}

async function exportData() {
  const payload = JSON.stringify({ version: 1, app: "Parola", catalogVersion: state.catalogVersion, exportedAt: new Date().toISOString(), words: state.words }, null, 2);
  const filename = `parola-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
  const filesystem = nativePlugin("Filesystem");
  const share = nativePlugin("Share");
  if (filesystem && share) {
    try {
      const saved = await filesystem.writeFile({ path: filename, data: payload, directory: "CACHE", encoding: "utf8" });
      await share.share({ title: "Parola-Sicherung", text: "Sicherung deiner Parola-Vokabeln", files: [saved.uri] });
      return;
    } catch {
      toast("Die Sicherung konnte nicht zum Teilen geöffnet werden.");
      return;
    }
  }
  const blob = new Blob([payload], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function importData(file) {
  try {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed.words) || parsed.words.some((word) => !word.italian || !word.german)) throw new Error();
    if (state.words.length) await exportData();
    state.words = parsed.words.map(normalizeWordData);
    state.catalogVersion = parsed.catalogVersion || state.catalogVersion;
    persist();
    await syncCatalog(false);
    els.backupDialog.close();
    toast(`${state.words.length} Vokabeln wurden eingelesen.`);
  } catch {
    toast("Diese Sicherungsdatei konnte nicht gelesen werden.");
  }
}

els.wordForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const italian = els.italian.value.trim();
  const german = els.german.value.trim();
  const group = els.group.value.trim();
  if (!italian || !german) return;
  const existing = state.words.find((word) => word.id === els.editId.value);
  if (existing) Object.assign(existing, { italian, german, group, note: els.note.value.trim() });
  else state.words.unshift(normalizeWordData({ id: uid(), italian, german, group, note: els.note.value.trim(), due: new Date().toISOString(), interval: 0, repetitions: 0, createdAt: new Date().toISOString() }));
  save();
  els.wordDialog.close();
  toast(existing ? "Vokabel aktualisiert." : "Vokabel hinzugefügt.");
});

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.matches("#openAdd, #emptyAdd")) openWord();
  if (target.id === "closeWord") els.wordDialog.close();
  if (target.id === "deleteWord") {
    const word = state.words.find((item) => item.id === els.editId.value);
    if (word && confirm(`„${word.italian}“ wirklich löschen?`)) {
      state.words = state.words.filter((item) => item.id !== word.id);
      save();
      els.wordDialog.close();
      toast("Vokabel gelöscht.");
    }
  }
  if (target.id === "previewSpeech") speak(els.italian.value);
  if (target.dataset.speak) speak(state.words.find((word) => word.id === target.dataset.speak)?.italian || "");
  if (target.dataset.edit) openWord(state.words.find((word) => word.id === target.dataset.edit));
  if (target.dataset.mode) buildSession(target.dataset.mode);
  if (target.id === "startMixed") buildSession("mixed");
  if (target.dataset.grammarStart) renderGrammarExercise(target.dataset.grammarStart);
  if (target.dataset.grammarNext) renderGrammarExercise(target.dataset.grammarNext);
  if (target.dataset.grammarSpeak) {
    const exercise = grammarExercises[target.dataset.grammarSpeak]?.[grammarExerciseState[target.dataset.grammarSpeak]];
    if (exercise) speak(exercise.spoken);
  }
  if (target.hasAttribute("data-grammar-answer")) answerGrammarExercise(target.dataset.grammarTopic, Number(target.dataset.grammarAnswer));
  if (target.matches("#openSettings, [data-view='backup']")) els.backupDialog.showModal();
  if (target.dataset.view === "words") document.querySelector(".library-section").scrollIntoView({ behavior: "smooth" });
  if (target.dataset.view === "grammar") document.querySelector(".grammar-section").scrollIntoView({ behavior: "smooth" });
  if (target.dataset.view === "home") window.scrollTo({ top: 0, behavior: "smooth" });
  if (["home", "words", "grammar"].includes(target.dataset.view)) {
    $$(".nav-item").forEach((button) => button.classList.toggle("active", button === target));
  }
  if (target.id === "closeBackup") els.backupDialog.close();
  if (target.id === "closeStudy" || target.id === "finishStudy") {
    state.speechAutoActive = false;
    clearTimeout(state.speechRestartTimer);
    clearTimeout(state.speechPlaybackTimer);
    clearTimeout(state.autoAdvanceTimer);
    state.recognition?.abort?.();
    nativePlugin("SpeechRecognition")?.stop?.().catch(() => {});
    state.nativeRecognitionActive = false;
    window.speechSynthesis?.cancel?.();
    els.studyDialog.close();
  }
  const word = state.session[state.index];
  if (!word) return;
  if (target.hasAttribute("data-study-speak")) speak(word.italian);
  if (target.id === "flashcard") reveal(word);
  if (target.id === "revealButton") reveal(word);
  if (target.id === "checkAnswer") checkTyped($("#answerInput").value, word);
  if (target.id === "recordButton") startRecognition(word);
  if (target.id === "showSpeechAnswer") showSpeechAnswer(word);
  if (target.id === "checkSpeech") processSpokenAttempt($("#speechFallback").value, word);
  if (target.dataset.rate) schedule(word, target.dataset.rate);
  if (target.dataset.quickResult) answerQuick(word, target.dataset.quickResult === "known");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && $("#answerInput") && !state.revealed) { event.preventDefault(); checkTyped($("#answerInput").value, state.session[state.index]); }
  if (event.key === "Enter" && $("#speechFallback") && !state.speechSolved) { event.preventDefault(); processSpokenAttempt($("#speechFallback").value, state.session[state.index]); }
});

els.trainingGroup.addEventListener("change", () => {
  state.selectedGroup = els.trainingGroup.value;
  const count = state.selectedGroup ? state.words.filter((word) => word.group === state.selectedGroup).length : state.words.length;
  toast(state.selectedGroup ? `${count} Vokabeln aus „${state.selectedGroup}“ ausgewählt.` : "Alle Gruppen sind ausgewählt.");
});

els.swapTrainingDirection.addEventListener("click", () => {
  state.trainingDirection = germanFirst() ? "it-de" : "de-it";
  renderTrainingDirection();
  toast(`Trainingsrichtung: ${els.trainingDirectionLabel.textContent}`);
});

els.wordSearch.addEventListener("input", () => {
  state.libraryQuery = els.wordSearch.value;
  renderWordList();
});

els.wordSort.addEventListener("change", () => {
  state.librarySort = els.wordSort.value;
  renderWordList();
});

els.wordGroupFilter.addEventListener("change", () => {
  state.libraryGroup = els.wordGroupFilter.value;
  renderWordList();
});

els.swapWordDirection.addEventListener("click", () => {
  state.libraryDirection = state.libraryDirection === "it-de" ? "de-it" : "it-de";
  renderWordList();
});

$("#exportData").addEventListener("click", exportData);
$("#importData").addEventListener("change", (event) => event.target.files[0] && importData(event.target.files[0]));

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

load();
