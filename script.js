
/*
TRIANGLE PROTOCOL（CLICK）

The JavaScript manages the memory-game interaction. It creates twenty
triangle buttons, generates a random sequence and checks each player
selection against the expected item. The sequence begins with three
triangles and increases in length as the player advances through seven
levels. This gives the experience a gradual increase in difficulty
while keeping the main action consistent: the player clicks triangles.

The game uses different modes to distinguish between standby, sequence
playback, player input, transitions, errors and completion. Checking
the current mode prevents a player from submitting answers while the
sequence is being shown. The separate restart and reset actions also
give the controls different purposes: restart begins a new test, while
reset returns the game to standby.

The triangle nodes are generated as HTML buttons containing inline SVG.
The SVG polygon, lines and circle form a consistent visual symbol
without needing a separate image file for each node. The click listener
is attached to each generated button, and the selected node's index is
passed to the game logic.

Technical reference — MDN Web Docs, addEventListener():
https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener

Technical reference — MDN Web Docs, SVG polygon:
https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/polygon

The wait() utility returns a Promise that resolves after a delay. It
allows the sequence to be displayed one triangle at a time, with a
short pause between highlights. The sessionId value helps cancel older
sequence playback after the player restarts or resets the game. Each
new game changes the session identifier.

Feedback is important because the player needs to understand whether
an action was accepted. Correct selections update the feedback message
and highlight the selected triangle. Incorrect selections display an
error overlay and replay the sequence. Completing the final level
updates the progress display and reveals the success overlay.

The progress bar also updates its aria-valuenow attribute so its current
value is available to assistive technology. Status text and accessible
labels provide information beyond colour alone. These details support
the goal of making the interaction understandable, although further
testing with keyboard.

Development reflection: one challenge is coordinating timing, player
input and screen state. If a reset happens while a sequence is playing,
the old sequence must not continue to control the interface. Another
challenge is keeping the visual status, progress bar and game logic
consistent after an incorrect answer or restart. Testing each state
separately helps reveal problems that may not appear during a successful
playthrough.

AI assistance disclosure:
I used AI assistance during parts of development to help me understand
code structure and investigate possible solutions. I reviewed and
adapted the relevant parts to fit my own project design and interaction
requirements. I tested the prototype and made my own decisions about
its visual presentation and game flow. I remain responsible for
understanding the submitted code and ensuring it meets the project requirements.

No external JavaScript library, downloaded sound file or third-party
image asset is referenced in the supplied script. The interaction
logic, timing and SVG markup should not be attributed to an external
creator unless an external source was actually used. Technical
references are provided to identify documentation consulted for
understanding browser features; they do not claim that MDN created
this project.
*/

/*
  TRIANGLE PROTOCOL — GAME LOGIC

  1. UNLOCK THE SYSTEM opens the game screen.
  2. UNLOCK starts the memory sequence.
  3. RESTART TEST restarts from Level 1.
  4. RESET PROTOCOL returns to standby.
*/

const introScreen = document.getElementById("intro-screen");
const gameScreen = document.getElementById("game-screen");
const systemUnlockButton = document.getElementById("system-unlock-button");

const matrix = document.getElementById("matrix");
const matrixStage = document.getElementById("matrix-stage");

const levelCount = document.getElementById("level-count");
const levelProgress = document.getElementById("level-progress");
const progressFill = document.getElementById("progress-fill");
const progressTrack = document.getElementById("progress-track");

const matrixStatus = document.getElementById("matrix-status");
const instruction = document.getElementById("instruction");
const feedback = document.getElementById("feedback");
const stageInstruction = document.getElementById("stage-instruction");

const startButton = document.getElementById("start-button");
const resetButton = document.getElementById("reset-button");
const unlockGameButton = document.getElementById("unlock-game-button");

const hudIndex = document.getElementById("hud-index");
const inputRequired = document.getElementById("input-required");
const signalStatus = document.getElementById("signal-status");
const securityLevel = document.getElementById("security-level");
const accessMode = document.getElementById("access-mode");

const errorOverlay = document.getElementById("error-overlay");
const successOverlay = document.getElementById("success-overlay");

const TOTAL_TRIANGLES = 20;
const TOTAL_LEVELS = 7;
const STARTING_SEQUENCE_LENGTH = 3;

let triangles = [];
let currentLevel = 1;
let sequence = [];
let playerPosition = 0;
let mode = "idle";
let sessionId = 0;

/* Utility functions */

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

/* Update level information and progress bar */

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

/* Update system status */

function setHudStatus(status, input, access) {
  signalStatus.textContent = status;
  inputRequired.textContent = input;
  accessMode.textContent = access;

  accessMode.classList.toggle("locked", access === "LOCKED");
}

/* Enable or disable triangle buttons */

function setTrianglesEnabled(enabled) {
  triangles.forEach(triangle => {
    triangle.disabled = !enabled;
  });
}

/* Clear triangle highlights */

function clearTriangleStates() {
  triangles.forEach(triangle => {
    triangle.classList.remove("target", "active", "wrong");
  });
}

/* Create the 20 triangle buttons */

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
        <line class="inner-line"
          x1="50" y1="24" x2="50" y2="70"></line>
        <line class="inner-line"
          x1="28" y1="70" x2="72" y2="70"></line>
        <circle class="node-dot"
          cx="50" cy="48" r="3"></circle>
      </svg>
      <span class="node-number">${padLevel(i + 1)}</span>
    `;

    button.addEventListener("click", () => {
      handleTriangleClick(i);
    });

    matrix.appendChild(button);
    triangles.push(button);
  }
}

/* Generate a random sequence without repeated triangles */

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

    const selectedNode =
      availableNodes.splice(randomPosition, 1)[0];

    result.push(selectedNode);
  }

  return result;
}

/* Show the sequence before the player clicks */

async function showSequence(session) {
  mode = "showing";
  playerPosition = 0;

  errorOverlay.hidden = true;
  successOverlay.hidden = true;

  setTrianglesEnabled(false);
  clearTriangleStates();

  matrixStatus.textContent = "SIGNAL RECEIVED.";
  instruction.textContent = "OBSERVE THE SEQUENCE.";
  stageInstruction.textContent = "OBSERVE THE HIGHLIGHTED TRIANGLES";

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
  stageInstruction.textContent = "CLICK THE TRIANGLES IN SEQUENCE";

  setHudStatus("READY", "INPUT REQUIRED", "INPUT");
  setFeedback("YOUR TURN. REPEAT THE SEQUENCE.");
}

/* Check the player's selection */

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

  /* Wrong answer */

  mode = "wrong";
  setTrianglesEnabled(false);
  selectedTriangle.classList.add("wrong");

  errorOverlay.hidden = false;

  matrixStatus.textContent = "SIGNAL ERROR.";
  instruction.textContent = "SEQUENCE MISMATCH.";
  stageInstruction.textContent = "SIGNAL ERROR DETECTED";

  setHudStatus("ERROR DETECTED", "TRY AGAIN", "LOCKED");

  setFeedback("INCORRECT NODE. REPLAYING THE SAME SEQUENCE.");

  const session = sessionId;

  wait(1200).then(() => {
    if (session !== sessionId) return;

    errorOverlay.hidden = true;
    showSequence(session);
  });
}

/* Complete a level */

async function completeLevel(session) {
  if (session !== sessionId) return;

  mode = "transition";
  setTrianglesEnabled(false);

  matrixStatus.textContent = "SEQUENCE VERIFIED.";
  instruction.textContent = "LEVEL COMPLETE.";
  stageInstruction.textContent = "SEQUENCE VERIFIED";

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

/* Start an individual level */

function startLevel(session) {
  if (session !== sessionId) return;

  sequence = generateSequence();
  playerPosition = 0;

  updateHud();
  showSequence(session);
}

/* Show the final success screen */

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
  stageInstruction.textContent = "SYSTEM UNLOCKED";

  setHudStatus("COMPLETE", "ALL SIGNALS VERIFIED", "UNLOCKED");
  setFeedback("PROTOCOL COMPLETE.");

  errorOverlay.hidden = true;
  successOverlay.hidden = false;

  matrixStage.classList.add("system-unlocked");
}

/*
  BUTTON 1:
  UNLOCK THE SYSTEM

  Hide the intro screen and show the game.
  This does not start the memory sequence.
*/

systemUnlockButton.addEventListener("click", () => {
  introScreen.hidden = true;
  gameScreen.hidden = false;

  /* Game opens in standby with all triangles dark. */
  resetGame();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});

/*
  BUTTON 2:
  UNLOCK

  Start the memory challenge only when the game is in standby.
*/

unlockGameButton.addEventListener("click", () => {
  if (mode !== "idle") {
    setFeedback("SYSTEM ACTIVE. USE RESTART TEST IF NEEDED.");
    return;
  }

  startGame();
});

/* Start a new test from Level 1 */

function startGame() {
  sessionId++;

  const session = sessionId;

  currentLevel = 1;
  playerPosition = 0;
  sequence = [];
  mode = "showing";

  errorOverlay.hidden = true;
  successOverlay.hidden = true;

  matrixStage.classList.remove("system-unlocked");

  clearTriangleStates();
  setTrianglesEnabled(false);

  matrixStatus.textContent = "SIGNAL RECEIVED.";
  instruction.textContent = "PREPARING SEQUENCE.";
  stageInstruction.textContent = "INITIALISING SEQUENCE";

  setHudStatus("INITIALISING", "PREPARE INPUT", "DEMO MODE");
  setFeedback("NEW TEST INITIALISING.");

  updateHud();
  startLevel(session);
}

/*
  RESET PROTOCOL:
  Stop the current game and return to standby.
  The triangles stay dark until UNLOCK is clicked.
*/

function resetGame() {
  sessionId++;

  currentLevel = 1;
  playerPosition = 0;
  sequence = [];
  mode = "idle";

  errorOverlay.hidden = true;
  successOverlay.hidden = true;

  matrixStage.classList.remove("system-unlocked");

  clearTriangleStates();
  setTrianglesEnabled(false);

  matrixStatus.textContent = "SYSTEM STANDBY.";
  instruction.textContent = "CLICK UNLOCK TO BEGIN.";
  stageInstruction.textContent = "SYSTEM IN STANDBY";

  setHudStatus("STANDBY", "AWAITING INPUT", "STANDBY");
  setFeedback("SYSTEM READY. CLICK UNLOCK TO BEGIN.");

  updateHud();
}

/* RESTART TEST */

startButton.addEventListener("click", () => {
  if (mode === "idle") {
    setFeedback("CLICK UNLOCK TO BEGIN THE TEST.");
    return;
  }

  startGame();
});

/* RESET PROTOCOL */

resetButton.addEventListener("click", resetGame);

/* Initialise the game without starting it */

createMatrix();
resetGame();