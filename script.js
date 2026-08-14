const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 24;
const BOARD_WIDTH = COLS * BLOCK_SIZE;
const BOARD_HEIGHT = ROWS * BLOCK_SIZE;
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");

const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const messageBox = document.getElementById("messageBox");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");

const TETROMINOES = {
  I: {
    color: "#37d3ff",
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  O: {
    color: "#ffd84d",
    matrix: [
      [1, 1],
      [1, 1],
    ],
  },
  T: {
    color: "#b16cff",
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  S: {
    color: "#4ade80",
    matrix: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
  },
  Z: {
    color: "#ff5d73",
    matrix: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
  },
  J: {
    color: "#4c7dff",
    matrix: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  L: {
    color: "#ff9f43",
    matrix: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
};

const LEVEL_MELODIES = [
  ["C5", "G5", "A5", "G5", "E5", "G5", "A5", "C6"],
  ["D5", "A5", "B5", "A5", "F5", "A5", "C6", "D6"],
  ["E5", "B5", "C6", "B5", "G5", "B5", "D6", "E6"],
  ["F5", "C6", "D6", "C6", "A5", "C6", "E6", "F6"],
  ["G5", "D6", "E6", "D6", "B5", "D6", "F6", "G6"],
  ["A5", "E6", "F6", "E6", "C6", "E6", "G6", "A6"],
  ["B5", "F6", "G6", "F6", "D6", "F6", "A6", "B6"],
  ["C6", "G6", "A6", "G6", "E6", "G6", "B6", "C7"],
  ["D6", "A6", "B6", "A6", "F6", "A6", "C7", "D7"],
  ["E6", "B6", "C7", "B6", "G6", "B6", "D7", "E7"],
];

const WORLD_TUNE = ["C5", "G5", "A5", "G5", "E5", "G5", "A5", "C6", "B5", "A5", "G5", "E5", "D5", "E5", "G5", "C6"];

const LEVEL_THEMES = [
  { name: "파도", bgTop: "#0d1337", bgBottom: "#1f2d79", accent: "#4ddcff" },
  { name: "별빛", bgTop: "#120d3b", bgBottom: "#2a1b6d", accent: "#ff7ad9" },
  { name: "무지개", bgTop: "#132b46", bgBottom: "#2d6b70", accent: "#4ade80" },
  { name: "불꽃", bgTop: "#3b1227", bgBottom: "#7e2f43", accent: "#ff9f43" },
  { name: "우주", bgTop: "#111827", bgBottom: "#1f3a5f", accent: "#a78bfa" },
];

let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let lines = 0;
let level = 1;
let gameRunning = false;
let paused = false;
let dropCounter = 0;
let lastTime = 0;
let dropInterval = 800;
let audioCtx = null;
let musicTimer = null;
let musicIndex = 0;

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomType() {
  const types = Object.keys(TETROMINOES);
  return types[Math.floor(Math.random() * types.length)];
}

function createPiece(type) {
  const piece = TETROMINOES[type];
  return {
    type,
    matrix: piece.matrix.map((row) => [...row]),
    color: piece.color,
    row: 0,
    col: Math.floor(COLS / 2) - 1,
  };
}

function clonePiece(piece) {
  if (!piece) return null;
  return {
    ...piece,
    matrix: piece.matrix.map((row) => [...row]),
    row: 0,
    col: 0,
  };
}

function showMessage(text, tone = "default") {
  if (messageBox) {
    messageBox.textContent = text;
    messageBox.className = `message-box ${tone}`.trim();
  }
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = BOARD_WIDTH * dpr;
  canvas.height = BOARD_HEIGHT * dpr;
  canvas.style.width = "100%";
  canvas.style.height = "auto";
  canvas.style.maxWidth = "360px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  nextCanvas.width = 110 * dpr;
  nextCanvas.height = 110 * dpr;
  nextCanvas.style.width = "110px";
  nextCanvas.style.height = "110px";
  nextCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function applyLevelTheme() {
  const theme = LEVEL_THEMES[Math.min(level - 1, LEVEL_THEMES.length - 1)];
  document.documentElement.style.setProperty("--accent", theme.accent);
  document.documentElement.style.setProperty("--accent2", theme.accent === "#4ddcff" ? "#7bdcff" : "#ffd86b");
  document.documentElement.style.setProperty("--bg", theme.bgTop);
  document.documentElement.style.setProperty("--panel", theme.bgBottom);
  const shell = document.querySelector(".game-shell");
  shell.style.boxShadow = `0 24px 70px rgba(0, 0, 0, 0.35)`;
  shell.style.transition = "box-shadow 0.25s ease";
}

function burstCelebration() {
  const container = document.querySelector(".board-frame");
  for (let i = 0; i < 16; i += 1) {
    const spark = document.createElement("span");
    spark.className = "spark";
    spark.style.left = `${Math.random() * 180 + 10}px`;
    spark.style.top = `${Math.random() * 360 + 20}px`;
    spark.style.background = ["#ff7ad9", "#4ddcff", "#ffd84d", "#4ade80"][Math.floor(Math.random() * 4)];
    spark.style.animationDelay = `${Math.random() * 0.1}s`;
    container.appendChild(spark);
    setTimeout(() => spark.remove(), 900);
  }
}

function resetGame() {
  board = createEmptyBoard();
  score = 0;
  lines = 0;
  level = 1;
  dropInterval = 800;
  gameRunning = true;
  paused = false;
  dropCounter = 0;
  lastTime = 0;
  musicIndex = 0;
  currentPiece = null;
  nextPiece = createPiece(randomType());
  applyLevelTheme();
  spawnPiece();
  updateHud();
  draw();
  ensureAudio();
  startMusic(level);
  hideOverlay();
  showMessage("신나는 미션 시작! 블록을 맞춰주세요!", "default");
}

function spawnPiece() {
  const queuedPiece = clonePiece(nextPiece) || createPiece(randomType());
  currentPiece = queuedPiece;
  nextPiece = createPiece(randomType());

  currentPiece.row = 0;
  currentPiece.col = Math.floor(COLS / 2) - Math.ceil(currentPiece.matrix[0].length / 2);
  updateHud();

  const attempts = [0, -1, 1, -2, 2, -3, 3, -4, 4];
  let placed = false;

  for (const offset of attempts) {
    if (!collides(currentPiece, 0, offset)) {
      currentPiece.col += offset;
      placed = true;
      break;
    }
  }

  if (!placed) {
    gameRunning = false;
    paused = false;
    stopMusic();
    playSound("gameover");
    showOverlay("게임 오버! 다시 시작해볼까요?");
    showMessage("게임 오버! 다시 도전해볼까요?", "default");
  }
}

function updateHud() {
  scoreEl.textContent = score;
  linesEl.textContent = lines;
  levelEl.textContent = level;
  drawNextPiece();
}

function draw() {
  ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  const theme = LEVEL_THEMES[Math.min(level - 1, LEVEL_THEMES.length - 1)];
  const bg = ctx.createLinearGradient(0, 0, 0, BOARD_HEIGHT);
  bg.addColorStop(0, theme.bgTop);
  bg.addColorStop(1, theme.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

  if (!Array.isArray(board) || board.length === 0) {
    board = createEmptyBoard();
  }

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (board[y] && board[y][x]) {
        drawCell(x, y, board[y][x]);
      }
    }
  }

  if (currentPiece) {
    drawPiece(currentPiece, currentPiece.color);
  }

  drawGrid();
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.strokeRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
}

function drawPiece(piece, color) {
  piece.matrix.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (value) {
        const x = piece.col + colIndex;
        const y = piece.row + rowIndex;
        if (y >= 0) {
          drawCell(x, y, color);
        }
      }
    });
  });
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  for (let x = 0; x <= COLS; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK_SIZE, 0);
    ctx.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK_SIZE);
    ctx.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
    ctx.stroke();
  }
}

function drawNextPiece() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextCtx.fillStyle = "#060916";
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  if (!nextPiece || !Array.isArray(nextPiece.matrix) || nextPiece.matrix.length === 0) return;

  const matrix = nextPiece.matrix;
  const previewSize = 24;
  const offsetX = (nextCanvas.width - matrix[0].length * previewSize) / 2;
  const offsetY = (nextCanvas.height - matrix.length * previewSize) / 2;

  matrix.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (value) {
        nextCtx.fillStyle = nextPiece.color;
        nextCtx.fillRect(offsetX + colIndex * previewSize, offsetY + rowIndex * previewSize, previewSize - 2, previewSize - 2);
      }
    });
  });
}

function collides(piece, rowOffset = 0, colOffset = 0) {
  return piece.matrix.some((row, rowIndex) =>
    row.some((value, colIndex) => {
      if (!value) return false;
      const newRow = piece.row + rowOffset + rowIndex;
      const newCol = piece.col + colOffset + colIndex;
      return (
        newCol < 0 ||
        newCol >= COLS ||
        newRow >= ROWS ||
        (newRow >= 0 && board[newRow][newCol])
      );
    })
  );
}

function mergePiece() {
  currentPiece.matrix.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (value) {
        const y = currentPiece.row + rowIndex;
        const x = currentPiece.col + colIndex;
        if (y >= 0) {
          board[y][x] = currentPiece.color;
        }
      }
    });
  });
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (board[y].every(Boolean)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(0));
      cleared += 1;
      y += 1;
    }
  }

  if (cleared > 0) {
    playSound("line");
    burstCelebration();
    const scoreMap = [0, 100, 300, 500, 800];
    score += scoreMap[cleared] * level;
    lines += cleared;
    const newLevel = Math.min(10, Math.floor(lines / 5) + 1);
    if (newLevel > level) {
      const previousLevel = level;
      level = newLevel;
      dropInterval = Math.max(140, 780 - (level - 1) * 70);
      startMusic(level);
      applyLevelTheme();
      showMessage(`와아! ${level}단계로 레벨 업! 더 빠르게 가요!`, "level");
      showOverlay(`레벨 업! ${level}단계로 가요!`);
      window.setTimeout(() => {
        if (gameRunning && !paused) {
          hideOverlay();
          draw();
        }
      }, 420);
      if (previousLevel < level) {
        draw();
      }
    } else {
      showMessage(`${cleared}줄 지우기 성공! 아주 좋아요!`, "success");
    }
    updateHud();
  }
}

function lockPiece() {
  mergePiece();
  clearLines();
  spawnPiece();
  draw();
}

function movePiece(deltaX) {
  if (!gameRunning || paused) return;
  if (!collides(currentPiece, 0, deltaX)) {
    currentPiece.col += deltaX;
    draw();
  }
}

function dropPiece() {
  if (!gameRunning || paused) return;
  if (collides(currentPiece, 1, 0)) {
    lockPiece();
  } else {
    currentPiece.row += 1;
    draw();
  }
}

function hardDrop() {
  if (!gameRunning || paused) return;
  while (!collides(currentPiece, 1, 0)) {
    currentPiece.row += 1;
  }
  lockPiece();
}

function rotatePiece() {
  if (!gameRunning || paused || !currentPiece) return;
  const rotated = currentPiece.matrix[0].map((_, index) => currentPiece.matrix.map((row) => row[index]).reverse());
  const previous = currentPiece.matrix;
  currentPiece.matrix = rotated;

  if (collides(currentPiece, 0, 0)) {
    for (const offset of [1, -1, 2, -2]) {
      if (!collides(currentPiece, 0, offset)) {
        currentPiece.col += offset;
        draw();
        return;
      }
    }
    currentPiece.matrix = previous;
  }

  draw();
}

function gameLoop(timestamp) {
  if (!gameRunning) return;
  if (!lastTime) lastTime = timestamp;
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  if (!paused) {
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
      dropCounter = 0;
      dropPiece();
    }
  }

  draw();
  window.requestAnimationFrame(gameLoop);
}

function togglePause() {
  if (!gameRunning) return;
  paused = !paused;
  if (paused) {
    stopMusic();
    showOverlay("일시정지! 다시 시작하려면 계속하세요.");
    showMessage("잠깐 쉬는 시간! 다시 시작해요.", "default");
  } else {
    startMusic(level);
    hideOverlay();
    showMessage("계속 플레이해요!", "default");
  }
  draw();
}

function showOverlay(message) {
  let overlay = document.getElementById("overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "overlay";
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.62)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.color = "white";
    overlay.style.fontSize = "22px";
    overlay.style.fontWeight = "700";
    overlay.style.textAlign = "center";
    overlay.style.borderRadius = "20px";
    overlay.style.padding = "20px";
    overlay.style.backdropFilter = "blur(2px)";
    overlay.style.transition = "opacity 0.25s ease";
    overlay.style.opacity = "1";
    document.querySelector(".board-panel").appendChild(overlay);
  }
  overlay.textContent = message;
  overlay.style.display = "flex";
  overlay.style.opacity = "1";
}

function hideOverlay() {
  const overlay = document.getElementById("overlay");
  if (overlay) {
    overlay.style.opacity = "0";
    window.setTimeout(() => {
      overlay.style.display = "none";
    }, 220);
  }
}

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function playTone(frequency, duration = 0.2, volume = 0.05, type = "triangle") {
  ensureAudio();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gainNode.gain.value = volume;
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
}

function noteToFrequency(note) {
  const map = {
    C4: 261.63,
    D4: 293.66,
    E4: 329.63,
    F4: 349.23,
    G4: 392.0,
    A4: 440.0,
    B4: 493.88,
    C5: 523.25,
    D5: 587.33,
    E5: 659.25,
    F5: 698.46,
    G5: 783.99,
    A5: 880.0,
    B5: 987.77,
    C6: 1046.5,
    D6: 1174.66,
    E6: 1318.51,
    F6: 1396.91,
    G6: 1567.98,
    A6: 1760.0,
    B6: 1975.53,
    C7: 2093.0,
    D7: 2349.32,
    E7: 2637.02,
  };
  return map[note] || 440;
}

function getBeatInterval(level) {
  return Math.max(120, 420 - (level - 1) * 24);
}

function startMusic(currentLevel) {
  stopMusic();
  ensureAudio();
  const melody = LEVEL_MELODIES[Math.min(currentLevel - 1, LEVEL_MELODIES.length - 1)];
  const baseMelody = currentLevel === 1 ? WORLD_TUNE : melody;
  musicIndex = 0;

  const playNextStep = () => {
    const note = baseMelody[musicIndex % baseMelody.length];
    const beat = musicIndex % 2 === 0;
    const accent = musicIndex % 4 === 0;

    playTone(noteToFrequency(note), 0.18, beat ? 0.06 : 0.042, "triangle");

    if (beat) {
      playTone(noteToFrequency(note) * 0.5, 0.13, 0.028, "sine");
    }

    if (accent) {
      playTone(840, 0.08, 0.025, "square");
    }

    if (musicIndex % 8 === 3) {
      playTone(1046, 0.05, 0.018, "square");
    }

    musicIndex += 1;
    musicTimer = window.setTimeout(playNextStep, getBeatInterval(currentLevel));
  };

  playNextStep();
}

function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

function playSound(type) {
  if (type === "line") {
    playTone(880, 0.08, 0.03, "square");
    setTimeout(() => playTone(1046, 0.08, 0.03, "square"), 70);
  } else if (type === "gameover") {
    playTone(220, 0.24, 0.04, "sawtooth");
    setTimeout(() => playTone(180, 0.24, 0.04, "sawtooth"), 130);
  }
}

function handleKeydown(event) {
  if (event.repeat) return;
  if (event.code === "ArrowLeft") {
    event.preventDefault();
    movePiece(-1);
  } else if (event.code === "ArrowRight") {
    event.preventDefault();
    movePiece(1);
  } else if (event.code === "ArrowDown") {
    event.preventDefault();
    dropPiece();
  } else if (event.code === "ArrowUp") {
    event.preventDefault();
    rotatePiece();
  } else if (event.code === "Space") {
    event.preventDefault();
    hardDrop();
  } else if (event.code === "KeyP") {
    event.preventDefault();
    togglePause();
  }
}

startBtn.addEventListener("click", () => {
  if (!gameRunning) {
    resetGame();
    if (!window.__gameLoopStarted) {
      window.__gameLoopStarted = true;
      requestAnimationFrame(gameLoop);
    }
  } else if (paused) {
    paused = false;
    startMusic(level);
    hideOverlay();
    showMessage("계속 플레이해요!", "default");
  }
});

pauseBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", () => {
  resetGame();
  if (!window.__gameLoopStarted) {
    window.__gameLoopStarted = true;
    requestAnimationFrame(gameLoop);
  }
});

document.addEventListener("keydown", handleKeydown);

window.addEventListener("load", () => {
  resizeCanvas();
  applyLevelTheme();
  updateHud();
  draw();
  showOverlay("버튼을 눌러 게임을 시작하세요!");
  showMessage("준비됐나요? 시작 버튼을 눌러 미션을 시작해요!", "default");
});

window.addEventListener("resize", resizeCanvas);
