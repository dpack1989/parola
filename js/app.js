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

const els = {
  dueCount: $("#dueCount"), dueLabel: $("#dueLabel"), todayHint: $("#todayHint"), wordCount: $("#wordCount"),
  wordList: $("#wordList"), emptyState: $("#emptyState"), wordDialog: $("#wordDialog"),
  wordForm: $("#wordForm"), wordDialogTitle: $("#wordDialogTitle"), editId: $("#editId"),
  italian: $("#italianInput"), german: $("#germanInput"), group: $("#groupInput"), note: $("#noteInput"),
  trainingGroup: $("#trainingGroup"), groupSuggestions: $("#groupSuggestions"),
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
  els.wordList.hidden = state.words.length === 0;
  renderGroups();
  els.wordList.innerHTML = [...state.words]
    .sort((a, b) => a.italian.localeCompare(b.italian, "it"))
    .map((word) => `
      <article class="word-row">
        <div><strong>${escapeHtml(word.italian)}</strong><small>${escapeHtml(word.german)}${word.note ? ` · ${escapeHtml(word.note)}` : ""}</small>
          ${(word.group || word.mistakeCount) ? `<div class="word-meta">${word.group ? `<span class="word-tag">${escapeHtml(word.group)}</span>` : ""}${word.mistakeCount ? `<span class="word-tag errors">${word.mistakeCount} Fehler</span>` : ""}</div>` : ""}
        </div>
        <div class="word-actions">
          <button class="mini-button" data-speak="${word.id}" aria-label="${escapeHtml(word.italian)} anhören">🔊</button>
          <button class="mini-button" data-edit="${word.id}" aria-label="Vokabel bearbeiten">✎</button>
        </div>
      </article>`).join("");
}

function groups() {
  return [...new Set(state.words.map((word) => word.group).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));
}

function renderGroups() {
  const items = groups();
  if (state.selectedGroup && !items.includes(state.selectedGroup)) state.selectedGroup = "";
  els.trainingGroup.innerHTML = `<option value="">Alle Gruppen</option>${items.map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join("")}`;
  els.trainingGroup.value = state.selectedGroup;
  els.groupSuggestions.innerHTML = items.map((group) => `<option value="${escapeHtml(group)}"></option>`).join("");
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function normalize(value = "") {
  return value.trim().toLocaleLowerCase("it-IT").replace(/[.!?,;:]/g, "").replace(/\s+/g, " ");
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
  els.studyPosition.textContent = `${state.index + 1}/${state.session.length}`;
  els.studyProgress.style.width = `${(state.index / state.session.length) * 100}%`;

  if (mode === "cards") renderCard(word);
  if (mode === "write") renderWrite(word);
  if (mode === "speak") renderSpeak(word);
}

function renderCard(word) {
  els.studyContent.innerHTML = `
    <div class="study-prompt">
      <p class="language">Italienisch</p>
      <div class="study-word">${escapeHtml(word.italian)}</div>
      <button class="speak-button" data-study-speak aria-label="Aussprache anhören">🔊</button>
      <div id="revealArea"></div>
    </div>`;
  els.studyActions.className = "study-actions";
  els.studyActions.innerHTML = `<button class="primary-button full" id="revealButton">Antwort zeigen</button>`;
}

function renderWrite(word) {
  els.studyContent.innerHTML = `
    <div class="study-prompt">
      <p class="language">Schreibe auf Italienisch</p>
      <div class="study-word">${escapeHtml(word.german)}</div>
      <input class="study-input" id="answerInput" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Deine Antwort">
      <p class="feedback" id="feedback"></p>
    </div>`;
  els.studyActions.className = "study-actions";
  els.studyActions.innerHTML = `<button class="primary-button full" id="checkAnswer">Prüfen</button>`;
  setTimeout(() => $("#answerInput")?.focus(), 100);
}

function renderSpeak(word) {
  const supported = !!(nativePlugin("SpeechRecognition") || window.SpeechRecognition || window.webkitSpeechRecognition);
  els.studyContent.innerHTML = `
    <div class="study-prompt">
      <p class="language">Sage es auf Italienisch</p>
      <div class="study-word">${escapeHtml(word.german)}</div>
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
  if (supported && state.speechAutoActive) state.speechRestartTimer = setTimeout(() => startRecognition(word), 500);
}

function showSpeechAnswer(word) {
  state.revealed = true;
  const area = $("#speechAnswer");
  if (area) area.innerHTML = `<div class="speech-answer"><small>Italienisch</small><strong>${escapeHtml(word.italian)}</strong>${word.note ? `<br><span>${escapeHtml(word.note)}</span>` : ""}</div>`;
  const feedback = $("#feedback");
  if (feedback && !state.speechSolved) feedback.textContent = "Sprich das italienische Wort jetzt noch richtig aus.";
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
  if (normalize(value) === normalize(word.italian)) {
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
  state.revealed = true;
  const area = $("#revealArea");
  if (area) area.innerHTML = `<div class="study-answer">${escapeHtml(word.german)}${word.note ? `<small><br>${escapeHtml(word.note)}</small>` : ""}</div>`;
  if (message && $("#feedback")) $("#feedback").innerHTML = message;
  els.studyActions.className = "study-actions four";
  els.studyActions.innerHTML = `
    <button class="rating-button" data-rate="again">Nochmal<small>gleich</small></button>
    <button class="rating-button" data-rate="hard">Schwer<small>1 Tag</small></button>
    <button class="rating-button" data-rate="good">Gut<small>ein paar Tage</small></button>
    <button class="rating-button" data-rate="easy">Leicht<small>später</small></button>`;
}

function checkTyped(value, word) {
  if (!value.trim()) return;
  const correct = normalize(value) === normalize(word.italian);
  if (!correct) recordMistake(word);
  const feedback = $("#feedback");
  feedback.className = `feedback ${correct ? "good" : "bad"}`;
  feedback.innerHTML = correct ? "Richtig! Ottimo!" : `Fast – richtig ist: <strong>${escapeHtml(word.italian)}</strong>`;
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

    const result = await recognition.start({ language: "it-IT", maxResults: 3, partialResults: false, popup: false });
    const alternatives = Array.isArray(result.matches) ? result.matches : [];
    const heard = alternatives[0] || "";
    const fallback = $("#speechFallback");
    if (fallback) fallback.value = heard;
    if (!heard) {
      if (feedback) feedback.textContent = "Ich habe nichts verstanden. Versuch es noch einmal oder nutze die Diktierfunktion.";
    } else if (alternatives.some((value) => normalize(value) === normalize(word.italian))) {
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
  recognition.lang = "it-IT";
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
    const correct = alternatives.some((value) => normalize(value) === normalize(word.italian));
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
  els.studyContent.innerHTML = `<div><div class="empty-illustration">bravo!</div><h2>Runde geschafft</h2><p>Du hast ${state.session.length} ${state.session.length === 1 ? "Wort" : "Wörter"} wiederholt.</p></div>`;
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
  if (target.matches("#openSettings, [data-view='backup']")) els.backupDialog.showModal();
  if (target.dataset.view === "words") document.querySelector(".library-section").scrollIntoView({ behavior: "smooth" });
  if (target.dataset.view === "home") window.scrollTo({ top: 0, behavior: "smooth" });
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
  if (target.id === "revealButton") reveal(word);
  if (target.id === "checkAnswer") checkTyped($("#answerInput").value, word);
  if (target.id === "recordButton") startRecognition(word);
  if (target.id === "showSpeechAnswer") showSpeechAnswer(word);
  if (target.id === "checkSpeech") processSpokenAttempt($("#speechFallback").value, word);
  if (target.dataset.rate) schedule(word, target.dataset.rate);
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

$("#exportData").addEventListener("click", exportData);
$("#importData").addEventListener("change", (event) => event.target.files[0] && importData(event.target.files[0]));

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

load();
