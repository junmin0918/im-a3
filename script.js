
/*
TRIANGLE PROTOCOL（CLICK）

The JavaScript manages the memory-game interaction. It creates twenty
triangle buttons, generates a random sequence and checks each player
selection against the expected item. The sequence begins with three
triangles and increases in length as the player advances through seven
levels. This gives the experience a gradual increase in difficulty
while keeping the main action consistent: the player clicks triangles.

The game uses different modes to distinguish between standby, sequence
playback, player input, transitions, errors and completion. Checking the
current mode prevents a player from submitting answers while the
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
keyboard accessibility testing is needed to confirm that all controls
work as expected.

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


/* Get the intro screen, game screen and initial unlock button. */

const introScreen = document.getElementById("intro-screen");
const gameScreen = document.getElementById("game-screen");
const systemUnlockButton = document.getElementById("system-unlock-button");


/* Get the triangle matrix and its surrounding stage. */

const matrix = document.getElementById("matrix");
const matrixStage = document.getElementById("matrix-stage");


/* Get the level counter, progress information and progress bar. */

const levelCount = document.getElementById("level-count");
const levelProgress = document.getElementById("level-progress");
const progressFill = document.getElementById("progress-fill");
const progressTrack = document.getElementById("progress-track");


/* Get the text elements used to guide the player and show feedback. */

const matrixStatus = document.getElementById("matrix-status");
const instruction = document.getElementById("instruction");
const feedback = document.getElementById("feedback");
const stageInstruction = document.getElementById("stage-instruction");


/* Get the buttons used to start, reset and unlock the game. */

const startButton = document.getElementById("start-button");
const resetButton = document.getElementById("reset-button");
const unlockGameButton = document.getElementById("unlock-game-button");


/* Get the information displayed in the system HUD. */

const hudIndex = document.getElementById("hud-index");
const inputRequired = document.getElementById("input-required");
const signalStatus = document.getElementById("signal-status");
const securityLevel = document.getElementById("security-level");
const accessMode = document.getElementById("access-mode");


/* Get the error and success overlays shown during the game. */

const errorOverlay = document.getElementById("error-overlay");
const successOverlay = document.getElementById("success-overlay");


/* Set the number of triangle nodes, game levels and starting sequence length. */

const TOTAL_TRIANGLES = 20;
const TOTAL_LEVELS = 7;
const STARTING_SEQUENCE_LENGTH = 3;


/* Store the triangle buttons and current game progress. */

let triangles = [];
let currentLevel = 1;
let sequence = [];
let playerPosition = 0;
let mode = "idle";
let sessionId = 0;


/* Utility function: pause the game logic for a specified time. */

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}


/* Utility function: format a number with a leading zero. */

function padLevel(number) {
  return String(number).padStart(2, "0");
}


/* Calculate the sequence length for the current level. */

function getSequenceLength(level) {
  return STARTING_SEQUENCE_LENGTH + level - 1;
}


/* Update the feedback message displayed to the player. */

function setFeedback(message) {
  feedback.textContent = message;
}


/* Update the current level information and progress bar. */

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


/* Update the system status, required input and access mode. */

function setHudStatus(status, input, access) {
  signalStatus.textContent = status;
  inputRequired.textContent = input;
  accessMode.textContent = access;

  accessMode.classList.toggle("locked", access === "LOCKED");
}


/* Enable or disable all triangle buttons to control player input. */

function setTrianglesEnabled(enabled) {
  triangles.forEach(triangle => {
    triangle.disabled = !enabled;
  });
}


/* Remove all visual states from the triangle buttons. */

function clearTriangleStates() {
  triangles.forEach(triangle => {
    triangle.classList.remove("target", "active", "wrong");
  });
}


/*
Create the twenty triangle buttons dynamically.

Each button contains inline SVG shapes and a node number. An individual
click listener passes the selected triangle's index to the game logic.
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


/*
Generate a random sequence of triangles without repeating a node
within the same sequence. The required sequence length increases
as the player progresses through the levels.
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

    const selectedNode =
      availableNodes.splice(randomPosition, 1)[0];

    result.push(selectedNode);
  }

  return result;
}


/*
Display the generated sequence before the player starts clicking.

The mode changes to "showing" so that input is disabled during playback.
The session identifier prevents an older sequence from continuing
after the player restarts or resets the game.
*/

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


/*
Check whether the player's selected triangle matches the next
expected triangle in the sequence.

Correct selections advance the player's position. An incorrect
selection stops input and triggers the error feedback.
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

  /* Wrong answer: lock input and display the error overlay. */

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


/*
Complete the current level after every triangle has been selected
correctly. Advance to the next level or finish the game if the
player has completed all seven levels.
*/

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


/* Generate and display a new sequence for the current level. */

function startLevel(session) {
  if (session !== sessionId) return;

  sequence = generateSequence();
  playerPosition = 0;

  updateHud();
  showSequence(session);
}


/*
Display the final success state after all seven levels are complete.
Disable triangle input, update the progress display and reveal
the success overlay.
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
  stageInstruction.textContent = "SYSTEM UNLOCKED";

  setHudStatus("COMPLETE", "ALL SIGNALS VERIFIED", "UNLOCKED");
  setFeedback("PROTOCOL COMPLETE.");

  errorOverlay.hidden = true;
  successOverlay.hidden = false;

  matrixStage.classList.add("system-unlocked");
}


/*
BUTTON 1: UNLOCK THE SYSTEM

Hide the intro screen and display the game screen. The game
returns to standby; the player must click UNLOCK to begin.
*/

systemUnlockButton.addEventListener("click", () => {
  introScreen.hidden = true;
  gameScreen.hidden = false;

  /* Open the game in standby with all triangles dark. */
  resetGame();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});


/*
BUTTON 2: UNLOCK

Start the memory challenge only when the game is in standby.
If the game is already active, display a message instead.
*/

unlockGameButton.addEventListener("click", () => {
  if (mode !== "idle") {
    setFeedback("SYSTEM ACTIVE. USE RESTART TEST IF NEEDED.");
    return;
  }

  startGame();
});


/*
Start a new test from Level 1.

Increase the session identifier to invalidate any previous
sequence playback, then reset the game state and start the first level.
*/

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
RESET PROTOCOL

Stop the current game and return to standby. Incrementing sessionId
prevents any previous sequence playback from continuing. The triangles
stay dark until the player clicks UNLOCK again.
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


/*
RESTART TEST

Restart the challenge from Level 1. If the game is still in standby,
ask the player to click UNLOCK first.
*/

startButton.addEventListener("click", () => {
  if (mode === "idle") {
    setFeedback("CLICK UNLOCK TO BEGIN THE TEST.");
    return;
  }

  startGame();
});


/* RESET PROTOCOL: return to standby when the reset button is clicked. */

resetButton.addEventListener("click", resetGame);


/*
Initialise the triangle matrix and reset the game to standby.
The game does not begin automatically when the page loads.
*/

createMatrix();
resetGame();
