
/*
  TRIANGLE PROTOCOL — GAME LOGIC

  The player observes a sequence of highlighted triangles and clicks the
  same triangles in the same order. Each new level adds one step.

  Design and usability decisions:
  - Real buttons provide individual click targets.
  - Feedback text communicates the current game state.
  - A wrong answer displays a red error panel and replays the same sequence.
  - The final level replaces the triangle matrix with a SYSTEM UNLOCKED screen.
  - A session ID prevents old animations from changing a restarted game.

  References:
  Events: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
  Timers: https://developer.mozilla.org/en-US/docs/Web/API/setTimeout
  Random numbers: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
  SVG: https://developer.mozilla.org/en-US/docs/Web/SVG
*/

const matrix = document.getElementById("matrix");
const matrixStage = document.getElementById("matrix-stage");

const levelCount = document.getElementById("level-count");
const levelProgress = document.getElementById("level-progress");
const progressFill = document.getElementById("progress-fill");
const progressTrack = document.getElementById("progress-track");

const matrixStatus = document.getElementById("matrix-status");
const instruction = document.getElementById("instruction");
const feedback = document.getElementById("feedback");

const startButton = document.getElementById("start-button");
const resetButton = document.getElementById("reset-button");

const hudIndex = document.getElementById("hud-index");
const inputRequired = document.getElementById("input-required");
const signalStatus = document.getElementById("signal-status");
const securityLevel = document.getElementById("security-level");
const accessMode = document.getElementById("access-mode");

const errorOverlay = document.getElementById("error-overlay");
const unlockOverlay = document.getElementById("unlock-overlay");

const TOTAL_TRIANGLES = 20;
const TOTAL_LEVELS = 7;
const STARTING_SEQUENCE_LENGTH = 3;

let triangles = [];
let currentLevel = 1;
let sequence = [];
let playerPosition = 0;
let mode = "idle";

/*
  Incrementing this number cancels the effect of older asynchronous
  sequences after restart or reset.
*/
let sessionId = 0;

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function padLevel(number) {
  return String(number).padStart(2, "0");
}

function getSequenceLength(level) {
  return STARTING_SEQUENCE_LENGTH + level - 1;
}

function setFeedback(message) {
  feedback.textContent = message;
}

/*
  Updates the HUD and progress bar from the current game state.
  This avoids manually changing level numbers in multiple places.
*/
function updateHud() {
  const levelText =
    `${padLevel(currentLevel)} / ${padLevel(TOTAL_LEVELS)}`;

  hudIndex.textContent = padLevel(currentLevel);
  securityLevel.textContent = levelText;
  levelCount.textContent = levelText;

  const completedLevels = currentLevel - 1;
  const percentage = (completedLevels / TOTAL_LEVELS) * 100;

  levelProgress.textContent =
    `${padLevel(completedLevels)} / ${padLevel(TOTAL_LEVELS)}`;

  progressFill.style.width = `${percentage}%`;
  progressTrack.setAttribute("aria-valuenow", completedLevels);
}

/* Change the HUD status and highlight LOCKED in red when needed. */
function setHudStatus(status, input, access) {
  signalStatus.textContent = status;
  inputRequired.textContent = input;
  accessMode.textContent = access;

  accessMode.classList.toggle("locked", access === "LOCKED");
}

/* Prevent the player from clicking while the sequence is being shown. */
function setTrianglesEnabled(enabled) {
  triangles.forEach(triangle => {
    triangle.disabled = !enabled;
  });
}

function clearTriangleStates() {
  triangles.forEach(triangle => {
    triangle.classList.remove("target", "active", "wrong");
  });
}

/*
  Create 20 buttons with SVG triangle graphics.
  SVG allows the outlines and internal lines to scale with each button.
*/
function createMatrix() {
  matrix.innerHTML = "";
  triangles = [];

  for (let i = 0; i < TOTAL_TRIANGLES; i++) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "triangle";
    button.disabled = true;
    button.setAttribute("aria-label", `Triangle ${i + 1}`);

    button.innerHTML = `
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <polygon points="50,7 93,86 7,86"></polygon>
        <line class="inner-line" x1="50" y1="24" x2="50" y2="70"></line>
        <line class="inner-line" x1="28" y1="70" x2="72" y2="70"></line>
        <circle class="node-dot" cx="50" cy="48" r="3"></circle>
      </svg>
      <span class="node-number">${padLevel(i + 1)}</span>
    `;

    button.addEventListener("click", () => handleTriangleClick(i));

    matrix.appendChild(button);
    triangles.push(button);
  }
}

/*
  Generate a random sequence without repeating a triangle within the
  same round. The available-node list prevents duplicate selections.
*/
function generateSequence() {
  const availableNodes = Array.from(
    { length: TOTAL_TRIANGLES },
    (_, index) => index
  );

  const result = [];
  const requiredLength = getSequenceLength(currentLevel);

  for (let i = 0; i < requiredLength; i++) {
    const randomPosition = Math.floor(
      Math.random() * availableNodes.length
    );

    const selectedNode = availableNodes.splice(randomPosition, 1)[0];
    result.push(selectedNode);
  }

  return result;
}

/*
  Show each node in the sequence in order.
  The player can only start clicking after the demonstration ends.
*/
async function showSequence(session) {
  mode = "showing";
  playerPosition = 0;

  errorOverlay.hidden = true;
  unlockOverlay.hidden = true;

  setTrianglesEnabled(false);
  clearTriangleStates();

  matrixStatus.textContent = "SIGNAL RECEIVED.";
  instruction.textContent = "OBSERVE THE SEQUENCE.";
  setHudStatus("TRANSMITTING", "OBSERVE SIGNAL", "DEMO MODE");
  setFeedback("MEMORISE THE HIGHLIGHTED TRIANGLES.");

  await wait(500);

  for (const index of sequence) {
    if (session !== sessionId) return;

    clearTriangleStates();
    triangles[index].classList.add("target");

    await wait(650);

    if (session !== sessionId) return;

    triangles[index].classList.remove("target");
    await wait(220);
  }

  if (session !== sessionId) return;

  clearTriangleStates();
  mode = "playing";

  setTrianglesEnabled(true);
  matrixStatus.textContent = "SIGNAL RECEIVED.";
  instruction.textContent = "AWAITING YOUR INPUT.";
  setHudStatus("READY", "INPUT REQUIRED", "INPUT");
  setFeedback("YOUR TURN. REPEAT THE SEQUENCE.");
}

/*
  Correct input advances the player's position.
  Incorrect input shows ACCESS LOCKED inside the triangle frame and
  changes ACCESS MODE to red. The same sequence is then replayed.
*/
function handleTriangleClick(index) {
  if (mode !== "playing") return;

  const selectedTriangle = triangles[index];

  if (index === sequence[playerPosition]) {
    selectedTriangle.classList.add("active");
    playerPosition++;

    setFeedback(
      `CORRECT INPUT: ${playerPosition} / ${sequence.length}`
    );

    if (playerPosition === sequence.length) {
      mode = "transition";
      setTrianglesEnabled(false);
      completeLevel(sessionId);
    }

    return;
  }

  mode = "wrong";
  setTrianglesEnabled(false);
  selectedTriangle.classList.add("wrong");

  errorOverlay.hidden = false;

  matrixStatus.textContent = "SIGNAL ERROR.";
  instruction.textContent = "SEQUENCE MISMATCH.";
  setHudStatus("ERROR DETECTED", "TRY AGAIN", "LOCKED");
  setFeedback("INCORRECT NODE. REPLAYING THE SAME SEQUENCE.");

  const session = sessionId;

  wait(1200).then(() => {
    if (session !== sessionId) return;

    errorOverlay.hidden = true;
    showSequence(session);
  });
}

/* Advance to the next level after a correct sequence. */
async function completeLevel(session) {
  if (session !== sessionId) return;

  mode = "transition";
  setTrianglesEnabled(false);

  matrixStatus.textContent = "SEQUENCE VERIFIED.";
  instruction.textContent = "LEVEL COMPLETE.";
  setHudStatus("VERIFIED", "SEQUENCE ACCEPTED", "UNLOCKING");
  setFeedback("ACCESS GRANTED.");

  await wait(900);

  if (session !== sessionId) return;

  if (currentLevel >= TOTAL_LEVELS) {
    finishGame();
    return;
  }

  currentLevel++;
  updateHud();
  startLevel(session);
}

function startLevel(session) {
  if (session !== sessionId) return;

  sequence = generateSequence();
  playerPosition = 0;

  updateHud();
  showSequence(session);
}

/*
  FINAL UNLOCK:
  After level seven, the triangle matrix fades out and the SYSTEM UNLOCKED
  overlay appears inside the same game frame. The game controls remain
  available so the player can restart or reset the experience.
*/
function finishGame() {
  mode = "complete";

  setTrianglesEnabled(false);
  clearTriangleStates();

  progressFill.style.width = "100%";
  levelProgress.textContent = "07 / 07";
  levelCount.textContent = "07 / 07";
  securityLevel.textContent = "07 / 07";
  progressTrack.setAttribute("aria-valuenow", TOTAL_LEVELS);

  matrixStatus.textContent = "SYSTEM RESTORED.";
  instruction.textContent = "ALL LEVELS COMPLETE.";
  setHudStatus("COMPLETE", "ALL SIGNALS VERIFIED", "UNLOCKED");
  setFeedback("PROTOCOL COMPLETE.");

  errorOverlay.hidden = true;

  /*
    Adding the class starts the CSS fade-out animation.
    Showing the overlay replaces the triangles with the final message.
  */
  matrixStage.classList.add("system-unlocked");
  unlockOverlay.hidden = false;
}

/* Start a fresh game from level one with a new random sequence. */
function startGame() {
  sessionId++;
  const session = sessionId;

  currentLevel = 1;
  playerPosition = 0;
  sequence = [];
  mode = "showing";

  errorOverlay.hidden = true;
  unlockOverlay.hidden = true;
  matrixStage.classList.remove("system-unlocked");

  clearTriangleStates();
  setTrianglesEnabled(false);

  matrixStatus.textContent = "SIGNAL RECEIVED.";
  instruction.textContent = "PREPARING SEQUENCE.";
  setHudStatus("INITIALISING", "PREPARE INPUT", "DEMO MODE");
  setFeedback("NEW TEST INITIALISING.");

  updateHud();
  startLevel(session);
}

/*
  Reset returns the interface to standby without automatically playing.
  This is different from RESTART TEST, which immediately starts a new round.
*/
function resetGame() {
  sessionId++;

  currentLevel = 1;
  playerPosition = 0;
  sequence = [];
  mode = "idle";

  errorOverlay.hidden = true;
  unlockOverlay.hidden = true;
  matrixStage.classList.remove("system-unlocked");

  clearTriangleStates();
  setTrianglesEnabled(false);

  matrixStatus.textContent = "SIGNAL RECEIVED.";
  instruction.textContent = "AWAITING YOUR INPUT.";
  setHudStatus("READY", "AWAITING INPUT", "STANDBY");
  setFeedback("SYSTEM READY.");

  updateHud();
}

/* Connect the visible controls to their corresponding actions. */
startButton.addEventListener("click", startGame);
resetButton.addEventListener("click", resetGame);

/* Build the matrix and initialise the game in standby mode. */
createMatrix();
resetGame();

/*
  Future development:
  Possible improvements include sound feedback, a saved high score,
  adjustable difficulty and a short tutorial. Each feature should be
  tested to check that it improves clarity without distracting from memory.
*/
