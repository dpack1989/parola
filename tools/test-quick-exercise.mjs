"use strict";

const debugPort = process.argv[2] || "9333";
const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((response) => response.json());
const target = targets.find((item) => item.type === "page" && item.url.includes("127.0.0.1:8768"));
if (!target) throw new Error("Parola-Testseite wurde nicht gefunden.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

function send(method, params = {}) {
  const id = ++nextId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Zeitüberschreitung bei: ${expression}`);
}

await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 3,
  mobile: true
});
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await waitFor("Number(document.querySelector('#wordCount')?.textContent) > 0");

const viewport = await evaluate("({ width: innerWidth, height: innerHeight })");
if (viewport.width !== 390 || viewport.height !== 844) throw new Error(`Falsche Testgröße: ${viewport.width}x${viewport.height}`);

const navigation = await evaluate(`(() => {
  const labels = [...document.querySelectorAll('.nav-item')].map((button) => button.textContent.trim());
  const results = [];
  for (const view of ['home', 'practice', 'words', 'grammar', 'home']) {
    document.querySelector('[data-view="' + view + '"]').click();
    results.push({
      view,
      activeButton: document.querySelector('.nav-item.active')?.dataset.view,
      visiblePanels: [...document.querySelectorAll('[data-view-panel]')].filter((panel) => !panel.hidden).map((panel) => panel.dataset.viewPanel)
    });
  }
  return {
    labels,
    results,
    stats: [...document.querySelectorAll('.stats-grid strong')].map((item) => item.textContent)
  };
})()`);
if (navigation.labels.join('|') !== '⌂Home|▶Üben|≡Wörter|◎Grammatik' || navigation.results.some((item) => item.activeButton !== item.view || item.visiblePanels.length !== 1 || item.visiblePanels[0] !== item.view)) {
  throw new Error("Die Seitennavigation arbeitet nicht korrekt.");
}

await evaluate(`(() => {
  window.__spoken = [];
  const originalSpeak = speechSynthesis.speak.bind(speechSynthesis);
  speechSynthesis.speak = (utterance) => {
    window.__spoken.push({ text: utterance.text, lang: utterance.lang });
    originalSpeak(utterance);
  };
  state.words = state.words.slice(0, 2);
  state.selectedGroup = '';
  document.querySelector('[data-mode="quick"]').click();
})()`);

await waitFor("document.querySelector('#studyDialog')?.open && document.querySelector('#studyPosition')?.textContent === '0/2'");
const firstGerman = await evaluate("document.querySelector('[data-card-front] strong').textContent");
await evaluate("document.querySelector('#flashcard').click()");
await waitFor("document.querySelector('#flashcard')?.classList.contains('flipped')");

const firstReveal = await evaluate(`({
  italian: document.querySelector('[data-card-back] strong').textContent,
  spoken: window.__spoken.at(-1),
  again: !!document.querySelector('[data-quick-result="again"]'),
  known: !!document.querySelector('[data-quick-result="known"]')
})`);
if (!firstReveal.spoken || firstReveal.spoken.text !== firstReveal.italian || firstReveal.spoken.lang !== "it-IT") {
  throw new Error("Die italienische Aussprache wurde beim Umdrehen nicht ausgelöst.");
}
if (!firstReveal.again || !firstReveal.known) throw new Error("Bewertungsschaltflächen fehlen.");

await evaluate(`document.querySelector('[data-quick-result="again"]').click()`);
await waitFor("document.querySelector('#studyPosition')?.textContent === '0/2' && !document.querySelector('#flashcard')?.classList.contains('flipped')");
await evaluate(`document.querySelector('#flashcard').click(); document.querySelector('[data-quick-result="known"]').click()`);
await waitFor("document.querySelector('#studyPosition')?.textContent === '1/2'");

const repeatedGerman = await evaluate("document.querySelector('[data-card-front] strong').textContent");
if (repeatedGerman !== firstGerman) throw new Error("Das falsch bewertete Wort wurde nicht erneut vorgelegt.");

await evaluate(`document.querySelector('#flashcard').click(); document.querySelector('[data-quick-result="known"]').click()`);
await waitFor("document.querySelector('#studyContent h2')?.textContent === 'Schnelle Übung geschafft'");

const result = await evaluate(`({
  heading: document.querySelector('#studyContent h2').textContent,
  summary: document.querySelector('#studyContent p').textContent,
  spokenCount: window.__spoken.length,
  errors: performance.getEntriesByType('resource').filter((entry) => entry.responseStatus >= 400).length
})`);

await evaluate(`(() => {
  document.querySelector('#finishStudy').click();
  document.querySelector('#swapTrainingDirection').click();
  window.__spoken = [];
  document.querySelector('[data-mode="quick"]').click();
})()`);
await waitFor("document.querySelector('#studyDialog')?.open && document.querySelector('[data-card-front] small')?.textContent === 'Italienisch' && window.__spoken.length > 0");

const reverseDirection = await evaluate(`({
  frontLanguage: document.querySelector('[data-card-front] small').textContent,
  front: document.querySelector('[data-card-front] strong').textContent,
  backLanguage: document.querySelector('[data-card-back] small').textContent,
  back: document.querySelector('[data-card-back] strong').textContent,
  spoken: window.__spoken.at(-1)
})`);
if (reverseDirection.spoken.text !== reverseDirection.front || reverseDirection.spoken.lang !== "it-IT") {
  throw new Error("Das italienische Ausgangswort wurde nicht automatisch ausgesprochen.");
}

await evaluate(`(() => {
  document.querySelector('#closeStudy').click();
  const group = state.words[0].group;
  const filter = document.querySelector('#wordGroupFilter');
  filter.value = group;
  filter.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
const groupFilter = await evaluate(`({
  selected: document.querySelector('#wordGroupFilter').value,
  rows: [...document.querySelectorAll('#wordList .word-row')].length,
  groups: [...document.querySelectorAll('#wordList .word-tag:not(.errors)')].map((item) => item.textContent)
})`);
if (!groupFilter.rows || groupFilter.groups.some((group) => group !== groupFilter.selected)) {
  throw new Error("Der Gruppenfilter der Vokabelliste arbeitet nicht korrekt.");
}

await evaluate(`document.querySelector('[data-mode="write"]').click()`);
await waitFor("document.querySelector('#answerInput') && document.querySelector('.study-prompt .language')?.textContent === 'Schreibe auf Deutsch'");
const reverseWrite = await evaluate(`(() => {
  const answer = studyAnswer(state.session[state.index]).split(',')[0].trim();
  document.querySelector('#answerInput').value = answer;
  document.querySelector('#checkAnswer').click();
  return { answer, feedback: document.querySelector('#feedback').textContent };
})()`);
if (!reverseWrite.feedback.includes("Richtig")) throw new Error("Schreiben in umgekehrter Richtung wurde nicht richtig geprüft.");
await evaluate(`document.querySelector('#closeStudy').click()`);

await evaluate(`(() => {
  window.SpeechRecognition = class {
    start() { window.__recognitionLang = this.lang; }
    stop() {}
    abort() {}
  };
  document.querySelector('[data-mode="speak"]').click();
})()`);
await waitFor("document.querySelector('.study-prompt .language')?.textContent === 'Sage es auf Deutsch'");
await evaluate(`document.querySelector('#recordButton').click()`);
await waitFor("window.__recognitionLang === 'de-DE'");
const reverseSpeak = await evaluate(`(() => {
  const answer = studyAnswer(state.session[state.index]).split(',')[0].trim();
  document.querySelector('#speechFallback').value = answer;
  document.querySelector('#checkSpeech').click();
  return { answer, language: window.__recognitionLang, feedback: document.querySelector('#feedback').textContent };
})()`);
if (reverseSpeak.language !== "de-DE" || !reverseSpeak.feedback.includes("Richtig")) {
  throw new Error("Sprechen in umgekehrter Richtung wurde nicht richtig geprüft.");
}
await evaluate(`document.querySelector('#closeStudy').click()`);

await evaluate(`(() => {
  document.querySelector('[data-view="grammar"]').click();
  document.querySelector('[data-grammar-start="gender"]').click();
})()`);
await waitFor("document.querySelector('#genderExercise [data-grammar-answer]')");
const grammarGender = await evaluate(`(() => {
  const firstPrompt = document.querySelector('#genderExercise .grammar-question strong').textContent;
  const exercise = grammarExercises.gender[grammarExerciseState.gender];
  const choices = exercise.choices || ['männlich', 'weiblich'];
  document.querySelectorAll('#genderExercise [data-grammar-answer]')[choices.indexOf(exercise.answer)].click();
  const feedback = document.querySelector('#genderExercise .grammar-feedback').textContent;
  document.querySelector('#genderExercise [data-grammar-next]').click();
  return { firstPrompt, nextPrompt: document.querySelector('#genderExercise .grammar-question strong').textContent, feedback };
})()`);
if (grammarGender.firstPrompt === grammarGender.nextPrompt || !grammarGender.feedback.includes("Richtig")) {
  throw new Error("Die wechselnde Genus-Übung funktioniert nicht korrekt.");
}

await evaluate(`(() => {
  document.querySelectorAll('.grammar-topic')[1].open = true;
  document.querySelector('[data-grammar-start="articles"]').click();
})()`);
await waitFor("document.querySelector('#articlesExercise [data-grammar-answer]')");
const grammarArticles = await evaluate(`(() => {
  const exercise = grammarExercises.articles[grammarExerciseState.articles];
  const button = [...document.querySelectorAll('#articlesExercise [data-grammar-answer]')]
    .find((item) => exercise.choices[Number(item.dataset.grammarAnswer)] === exercise.answer);
  button.click();
  return {
    prompt: document.querySelector('#articlesExercise .grammar-question strong').textContent,
    feedback: document.querySelector('#articlesExercise .grammar-feedback').textContent,
    correctMarked: button.classList.contains('correct'),
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth
  };
})()`);
if (!grammarArticles.correctMarked || !grammarArticles.feedback.includes("Richtig") || grammarArticles.horizontalOverflow) {
  throw new Error("Die Artikelübung oder die mobile Grammatikdarstellung funktioniert nicht korrekt.");
}

const cloudDialog = await evaluate(`(() => {
  document.querySelector('#openSettings').click();
  document.querySelector('#cloudSignIn').click();
  const dialog = document.querySelector('#backupDialog');
  const panel = document.querySelector('.cloud-panel');
  const result = {
    open: dialog.open,
    emailVisible: !document.querySelector('#cloudSignedOut').hidden,
    status: document.querySelector('#cloudStatus').textContent,
    message: document.querySelector('#cloudMessage').textContent,
    fitsViewport: panel.getBoundingClientRect().width <= innerWidth - 24
  };
  document.querySelector('#closeBackup').click();
  return result;
})()`);
if (!cloudDialog.open || !cloudDialog.emailVisible || !cloudDialog.fitsViewport || !cloudDialog.message.includes('mindestens 8 Zeichen')) {
  throw new Error("Die Cloud-Anmeldung ist auf dem iPhone nicht korrekt bedienbar.");
}

const cloudSync = await evaluate(`(async () => {
  const remoteWord = normalizeWordData({
    id: 'cloud-test-word',
    italian: 'la nuvola',
    german: 'die Wolke',
    group: 'Cloud-Test',
    createdAt: '2026-11-15T08:00:00.000Z',
    updatedAt: '2026-11-15T08:00:00.000Z'
  });
  window.__cloudPushes = [];
  window.ParolaCloud = {
    available: true,
    pullState: async () => ({
      payload: {
        version: 1,
        catalogVersion: state.catalogVersion,
        exportedAt: '2026-11-15T08:00:00.000Z',
        words: [remoteWord],
        deletedWords: {}
      }
    }),
    pushState: async (userId, payload) => {
      window.__cloudPushes.push({ userId, payload });
      return { updated_at: new Date().toISOString() };
    }
  };
  state.cloud.session = { user: { id: 'cloud-test-user', email: 'test@example.com' } };
  state.cloud.ready = false;
  state.cloud.syncing = false;
  await syncFromCloud();
  const pulled = state.words.some((word) => word.id === remoteWord.id);
  const firstPushCount = window.__cloudPushes.length;
  const localWord = state.words.find((word) => word.id === remoteWord.id);
  localWord.note = 'am iPhone ergänzt';
  localWord.updatedAt = new Date().toISOString();
  persist();
  await new Promise((resolve) => setTimeout(resolve, 900));
  return {
    pulled,
    firstPushCount,
    totalPushes: window.__cloudPushes.length,
    pushedNote: window.__cloudPushes.at(-1)?.payload?.words?.find((word) => word.id === remoteWord.id)?.note,
    status: document.querySelector('#cloudStatus')?.textContent,
    account: document.querySelector('#cloudAccount')?.textContent,
    homeName: document.querySelector('#homeUserName')?.textContent
  };
})()`);
if (!cloudSync.pulled || cloudSync.firstPushCount !== 1 || cloudSync.totalPushes < 2 || cloudSync.pushedNote !== "am iPhone ergänzt" || cloudSync.status !== "Verbunden" || cloudSync.homeName !== "Ciao, test!") {
  throw new Error("Die lokale Cloud-Synchronisierung funktioniert nicht korrekt.");
}

console.log(JSON.stringify({ viewport, navigation, firstGerman, firstReveal, repeatedGerman, result, reverseDirection, groupFilter, reverseWrite, reverseSpeak, grammarGender, grammarArticles, cloudDialog, cloudSync }, null, 2));
socket.close();
