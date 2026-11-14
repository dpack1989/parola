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
console.log(JSON.stringify({ viewport, firstGerman, firstReveal, repeatedGerman, result }, null, 2));
socket.close();
