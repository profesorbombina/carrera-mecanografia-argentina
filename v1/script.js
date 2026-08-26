const WORD_BANK = [
  "Santa Fe",
  "San Martín",
  "Buenos Aires",
  "Belgrano",
  "Messi",
  "Malvinas Argentinas",
  "Mate",
  "Asado",
  "Córdoba",
  "Tucumán",
  "Dulce de Leche",
  "Chacarera",
  "Patagonia",
  "Mendoza",
  "Jujuy",
  "Salta",
  "La Pampa",
  "Sarmiento",
  "Eva Perón",
  "Carlos Gardel",
  "Manuel Belgrano",
  "Juana Azurduy",
  "Río de la Plata",
  "Aconcagua",
  "Tierra del Fuego",
  "Iguazú",
  "Maradona",
  "Cataratas del Iguazú",
  "Casa Rosada",
  "Obelisco",
  "Locro",
  "Empanadas",
  "Tango",
  "Fernet",
  "Gaucho",
  "Puna",
  "Rosario",
  "La Rioja",
  "San Juan",
  "Entre Ríos"
];

const WORDS_TO_WIN = 20;
const PLAYER_STEP = 100 / WORDS_TO_WIN;
const RECORD_KEY = "carreraArgentinaRecord";

const elements = {
  setupPanel: document.querySelector("#setupPanel"),
  racePanel: document.querySelector("#racePanel"),
  resultsPanel: document.querySelector("#resultsPanel"),
  raceForm: document.querySelector("#raceForm"),
  playerName: document.querySelector("#playerName"),
  recordText: document.querySelector("#recordText"),
  playerLabel: document.querySelector("#playerLabel"),
  timerText: document.querySelector("#timerText"),
  wordsText: document.querySelector("#wordsText"),
  charactersText: document.querySelector("#charactersText"),
  errorsText: document.querySelector("#errorsText"),
  countdown: document.querySelector("#countdown"),
  playerCar: document.querySelector("#playerCar"),
  aiCar: document.querySelector("#aiCar"),
  playerProgress: document.querySelector("#playerProgress"),
  aiProgress: document.querySelector("#aiProgress"),
  playerPercent: document.querySelector("#playerPercent"),
  aiPercent: document.querySelector("#aiPercent"),
  targetWord: document.querySelector("#targetWord"),
  characterFeedback: document.querySelector("#characterFeedback"),
  typingInput: document.querySelector("#typingInput"),
  winnerText: document.querySelector("#winnerText"),
  metricsGrid: document.querySelector("#metricsGrid"),
  playAgainButton: document.querySelector("#playAgainButton")
};

const state = {
  playerName: "Jugador",
  duration: 30,
  aiWpm: 4,
  raceStartedAt: 0,
  elapsedMs: 0,
  playerProgress: 0,
  aiProgress: 0,
  wordsCompleted: 0,
  typedCharacters: 0,
  correctCharacters: 0,
  currentTarget: "",
  wordQueue: [],
  lastWord: "",
  animationId: null,
  isRunning: false
};

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function buildWordQueue() {
  let queue = shuffle(WORD_BANK);

  if (queue[0] === state.lastWord && queue.length > 1) {
    [queue[0], queue[1]] = [queue[1], queue[0]];
  }

  state.wordQueue = queue;
}

function getNextWord() {
  if (state.wordQueue.length === 0) {
    buildWordQueue();
  }

  const nextWord = state.wordQueue.shift();
  state.lastWord = nextWord;
  return nextWord;
}

function readSettings(form) {
  const formData = new FormData(form);
  const cleanName = String(formData.get("playerName") || "").trim();

  return {
    playerName: cleanName || "Jugador",
    duration: Number(formData.get("duration")),
    aiWpm: Number(formData.get("difficulty"))
  };
}

function resetRace(settings = {}) {
  Object.assign(state, {
    playerName: settings.playerName || "Jugador",
    duration: settings.duration || 30,
    aiWpm: settings.aiWpm || 4,
    raceStartedAt: 0,
    elapsedMs: 0,
    playerProgress: 0,
    aiProgress: 0,
    wordsCompleted: 0,
    typedCharacters: 0,
    correctCharacters: 0,
    currentTarget: "",
    wordQueue: [],
    lastWord: "",
    animationId: null,
    isRunning: false
  });

  buildWordQueue();
  state.currentTarget = getNextWord();
}

function showPanel(panelName) {
  elements.setupPanel.classList.toggle("hidden", panelName !== "setup");
  elements.racePanel.classList.toggle("hidden", panelName !== "race");
  elements.resultsPanel.classList.toggle("hidden", panelName !== "results");
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function updateCarPosition(car, progress) {
  const boundedProgress = Math.min(progress, 100);
  const carWidth = car.offsetWidth || 58;
  const offset = (boundedProgress / 100) * carWidth;
  car.style.left = `calc(${boundedProgress}% - ${offset}px)`;
}

function renderProgress() {
  const playerRounded = Math.round(state.playerProgress);
  const aiRounded = Math.round(state.aiProgress);

  elements.playerProgress.value = state.playerProgress;
  elements.aiProgress.value = state.aiProgress;
  elements.playerPercent.textContent = `${playerRounded}%`;
  elements.aiPercent.textContent = `${aiRounded}%`;
  elements.wordsText.textContent = `${state.wordsCompleted}/${WORDS_TO_WIN}`;
  elements.charactersText.textContent = `${state.typedCharacters}`;
  elements.errorsText.textContent = `${getErrorCount()}`;
  updateCarPosition(elements.playerCar, state.playerProgress);
  updateCarPosition(elements.aiCar, state.aiProgress);
}

function renderTarget() {
  elements.targetWord.textContent = state.currentTarget;
  renderCharacterFeedback("");
}

function renderCharacterFeedback(value) {
  const characters = [...state.currentTarget];
  const typed = [...value];

  elements.characterFeedback.innerHTML = characters
    .map((character, index) => {
      let className = "char-pending";

      if (typed[index] !== undefined) {
        className = typed[index] === character ? "char-correct" : "char-wrong";
      }

      return `<span class="${className}">${escapeHtml(character)}</span>`;
    })
    .join("");
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function focusTypingInput() {
  if (elements.racePanel.classList.contains("hidden")) {
    return;
  }

  elements.typingInput.focus({ preventScroll: true });
}

function countTypedCharacters(inputEvent) {
  if (!inputEvent.data) {
    return;
  }

  const insertedCharacters = [...inputEvent.data];
  const selectionStart = elements.typingInput.selectionStart || elements.typingInput.value.length;
  const startIndex = Math.max(0, selectionStart - insertedCharacters.length);

  insertedCharacters.forEach((character, offset) => {
    const typedIndex = startIndex + offset;
    state.typedCharacters += 1;

    if (state.currentTarget[typedIndex] === character) {
      state.correctCharacters += 1;
    }
  });
}

function handleTyping(event) {
  if (!state.isRunning) {
    elements.typingInput.value = "";
    return;
  }

  countTypedCharacters(event);
  renderCharacterFeedback(elements.typingInput.value);

  if (elements.typingInput.value === state.currentTarget) {
    completeWord();
  }
}

function completeWord() {
  state.wordsCompleted += 1;
  state.playerProgress = Math.min(100, state.wordsCompleted * PLAYER_STEP);
  elements.typingInput.value = "";
  state.currentTarget = getNextWord();
  renderTarget();
  renderProgress();
  focusTypingInput();

  if (state.playerProgress >= 100) {
    finishRace("player");
  }
}

function calculateAiProgress(elapsedMs) {
  const elapsedMinutes = elapsedMs / 60000;
  const theoreticalWords = state.aiWpm * elapsedMinutes;
  return Math.min(100, theoreticalWords * PLAYER_STEP);
}

function updateRaceFrame(timestamp) {
  if (!state.isRunning) {
    return;
  }

  state.elapsedMs = timestamp - state.raceStartedAt;
  state.aiProgress = calculateAiProgress(state.elapsedMs);
  const remainingSeconds = state.duration - state.elapsedMs / 1000;

  elements.timerText.textContent = formatTime(remainingSeconds);
  renderProgress();

  if (state.aiProgress >= 100) {
    finishRace("ai");
    return;
  }

  if (remainingSeconds <= 0) {
    finishRace("time");
    return;
  }

  state.animationId = requestAnimationFrame(updateRaceFrame);
}

function startCountdown() {
  const steps = ["3", "2", "1", "¡Ya!"];
  let index = 0;

  elements.countdown.classList.remove("hidden");
  elements.countdown.textContent = steps[index];
  focusTypingInput();

  const countdownId = window.setInterval(() => {
    index += 1;
    elements.countdown.textContent = steps[index] || "";
    focusTypingInput();

    if (index === steps.length) {
      window.clearInterval(countdownId);
      elements.countdown.classList.add("hidden");
      beginRace();
    }
  }, 900);
}

function beginRace() {
  state.isRunning = true;
  state.raceStartedAt = performance.now();
  elements.typingInput.value = "";
  elements.typingInput.disabled = false;
  focusTypingInput();
  state.animationId = requestAnimationFrame(updateRaceFrame);
}

function startRace(event) {
  event.preventDefault();
  const settings = readSettings(event.currentTarget);

  resetRace(settings);
  elements.playerLabel.textContent = state.playerName;
  elements.timerText.textContent = formatTime(state.duration);
  elements.typingInput.disabled = false;
  renderTarget();
  renderProgress();
  showPanel("race");
  startCountdown();
}

function finishRace(reason) {
  if (!state.isRunning && reason !== "player" && reason !== "ai" && reason !== "time") {
    return;
  }

  state.isRunning = false;
  state.elapsedMs = Math.max(1, performance.now() - state.raceStartedAt);
  state.aiProgress = calculateAiProgress(state.elapsedMs);
  elements.typingInput.disabled = true;

  if (state.animationId) {
    cancelAnimationFrame(state.animationId);
  }

  renderProgress();
  const winner = determineWinner(reason);
  const metrics = calculateMetrics();
  saveRecord(metrics);
  renderResults(winner, metrics);
  showPanel("results");
}

function determineWinner(reason) {
  if (reason === "player") {
    return "player";
  }

  if (reason === "ai") {
    return "ai";
  }

  if (state.playerProgress > state.aiProgress) {
    return "player";
  }

  if (state.aiProgress > state.playerProgress) {
    return "ai";
  }

  return "tie";
}

function calculateMetrics() {
  const elapsedMinutes = Math.max(state.elapsedMs / 60000, 1 / 60000);
  const keystrokesPerMinute = state.typedCharacters / elapsedMinutes;
  const wordsPerMinute = state.wordsCompleted / elapsedMinutes;
  const accuracy = state.typedCharacters === 0
    ? 100
    : (state.correctCharacters / state.typedCharacters) * 100;

  return {
    keystrokesPerMinute,
    wordsPerMinute,
    accuracy,
    typedCharacters: state.typedCharacters,
    errors: getErrorCount(),
    wordsCompleted: state.wordsCompleted
  };
}

function getErrorCount() {
  return Math.max(0, state.typedCharacters - state.correctCharacters);
}

function renderResults(winner, metrics) {
  const winnerMessages = {
    player: `¡${state.playerName} gana!`,
    ai: "¡Gana la Máquina!",
    tie: "¡Empate!"
  };

  elements.winnerText.textContent = winnerMessages[winner];
  elements.metricsGrid.innerHTML = [
    ["Pulsaciones/min", `${Math.round(metrics.keystrokesPerMinute)}`],
    ["PPM neto", `${metrics.wordsPerMinute.toFixed(1)} palabras/min`],
    ["Precisión", `${metrics.accuracy.toFixed(1)}%`],
    ["Caracteres escritos", `${metrics.typedCharacters}`],
    ["Errores", `${metrics.errors}`],
    ["Palabras correctas", `${metrics.wordsCompleted}`]
  ]
    .map(([label, value]) => `
      <div class="metric">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `)
    .join("");
}

function saveRecord(metrics) {
  const currentRecord = loadRecord();

  if (currentRecord && (currentRecord.wordsPerMinute ?? currentRecord.netWpm) >= metrics.wordsPerMinute) {
    return;
  }

  const newRecord = {
    name: state.playerName,
    wordsPerMinute: Number(metrics.wordsPerMinute.toFixed(1)),
    date: new Date().toISOString()
  };

  localStorage.setItem(RECORD_KEY, JSON.stringify(newRecord));
}

function loadRecord() {
  try {
    const rawRecord = localStorage.getItem(RECORD_KEY);
    return rawRecord ? JSON.parse(rawRecord) : null;
  } catch {
    return null;
  }
}

function renderRecord() {
  const record = loadRecord();
  const recordSpeed = record ? record.wordsPerMinute ?? record.netWpm : null;

  elements.recordText.textContent = record
    ? `Récord: ${record.name} - ${recordSpeed} palabras/min`
    : "Récord: todavía no hay marca";
}

function returnToSetup() {
  resetRace();
  elements.typingInput.value = "";
  elements.typingInput.disabled = false;
  renderRecord();
  showPanel("setup");
  elements.playerName.focus();
}

function keepMobileInputReady() {
  if (state.isRunning) {
    focusTypingInput();
  }
}

function init() {
  renderRecord();
  resetRace();
  renderProgress();
  elements.raceForm.addEventListener("submit", startRace);
  elements.typingInput.addEventListener("input", handleTyping);
  elements.playAgainButton.addEventListener("click", returnToSetup);
  document.addEventListener("visibilitychange", keepMobileInputReady);
  document.addEventListener("pointerdown", keepMobileInputReady);
}

init();
