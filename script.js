/*
 * ============================================================
 * Ultimate X/O - JavaScript
 * ============================================================
 *
 * تنظيم الملف:
 * - كل قسم قابل للطي والفتح من السهم في VS Code / Cursor.
 * - ابحث عن //#region لرؤية الأقسام الرئيسية.
 * - ابحث عن //#endregion لمعرفة نهاية كل قسم.
 *
 * ============================================================
 */

(() => {
'use strict';

const $ = id => document.getElementById(id);


//#region ======================================================
// 01 - الإعدادات والثوابت وحالة اللعبة
//#endregion ===================================================

const EMPTY_BOARD = () =>
  Array(9).fill(null).map(() => Array(9).fill(''));

const EMPTY_WINS = () =>
  Array(9).fill(null);

const WIN_LINES = [
  [0,1,2],
  [3,4,5],
  [6,7,8],
  [0,3,6],
  [1,4,7],
  [2,5,8],
  [0,4,8],
  [2,4,6]
];

const SESSION_KEY = 'uxo_session_v3';
const VIEW_KEY = 'uxo_view_v3';
const THEME_KEY = 'uxo_theme_v3';
const OFFLINE_KEY = 'uxo_offline_state_v3';
const MATCH_KEY = 'uxo_match_v3';

const DISCONNECT_SECONDS = 30;

let player = {
  id: null,
  name: '',
  pin: '',
  points: 10,

  stats: {
    total: 0,
    wins: 0,
    losses: 0
  },

  theme:
    localStorage.getItem(THEME_KEY) ||
    'theme-cyberpunk'
};

let currentRoute =
  localStorage.getItem(VIEW_KEY) ||
  'home';

let game = {
  mode: null,
  ai: null,

  format: '1',
  targetWins: 1,

  role: 'X',

  opponentId: null,
  opponentName: 'Opponent',

  matchId: null,

  board: EMPTY_BOARD(),
  wins: EMPTY_WINS(),

  target: null,

  turn: 'X',

  scores: {
    X: 0,
    O: 0
  },

  status: 'idle',
  winner: null,

  lastMoveId: null
};

let listeners = {
  presence: null,
  lobby: null,
  challenge: null,
  match: null,
  opponent: null
};

let timers = {
  ai: null,
  disconnect: null,
  disconnectEndsAt: 0,
  result: null
};

let challengeState = {
  id: null,
  matchId: null,
  fromId: null,
  fromName: null,
  format: '1'
};

let outgoingChallenge = null;

let resetHandledId = null;
let rematchHandledId = null;
let resultShownId = null;

let sessionToken =
  's_' +
  Math.random()
    .toString(36)
    .slice(2, 10);

let audio = null;


//#region ======================================================
// 02 - أدوات Firebase والوظائف المساعدة العامة
//#endregion ===================================================

function dbReady() {
  return !!window.db;
}

function ref(path) {
  return window.dbRef(window.db, path);
}

function cloneBoard() {
  return game.board.map(row => row.slice());
}

function targetWins(format) {
  if (format === '3') return 2;
  if (format === '5') return 3;
  return Infinity;
}

function formatLabel(format) {
  if (format === '3') return 'Best of 3';
  if (format === '5') return 'Best of 5';
  if (format === 'infinity') return 'Endless';

  return 'Single';
}

function routeHash(route) {
  return '#' + route;
}

function safeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9_\-؀-ي]/g, '')
    .slice(0, 20);
}

function showToast(message, type = '') {
  const el = document.createElement('div');

  el.className = 'toast ' + type;
  el.textContent = message;

  $('toastRoot').appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 3500);
}

function notice(title, text, after) {
  $('noticeTitle').textContent = title;
  $('noticeText').textContent = text;

  $('noticeOverlay').classList.remove('hidden');

  $('noticeOk').onclick = () => {
    $('noticeOverlay').classList.add('hidden');

    if (after) {
      after();
    }
  };
}

function playSound(type = 'click') {
  try {
    audio ||=
      new (
        window.AudioContext ||
        window.webkitAudioContext
      )();

    if (audio.state === 'suspended') {
      audio.resume();
    }

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.connect(gain);
    gain.connect(audio.destination);

    const now = audio.currentTime;

    const map = {
      click: [500, 700, 0.07],
      start: [500, 950, 0.16],
      win: [320, 720, 0.35],
      lose: [280, 110, 0.30],
      bell: [850, 1250, 0.25]
    };

    const [startFrequency, endFrequency, duration] =
      map[type] || map.click;

    oscillator.type =
      type === 'lose'
        ? 'sawtooth'
        : 'sine';

    oscillator.frequency.setValueAtTime(
      startFrequency,
      now
    );

    oscillator.frequency.exponentialRampToValueAtTime(
      endFrequency,
      now + duration
    );

    gain.gain.setValueAtTime(
      0.11,
      now
    );

    gain.gain.exponentialRampToValueAtTime(
      0.01,
      now + duration
    );

    oscillator.start(now);
    oscillator.stop(now + duration);

  } catch {}
}


//#region ======================================================
// 03 - الثيم والحفظ والتنقل بين الصفحات
//#endregion ===================================================

function setTheme(theme) {
  player.theme = theme;

  document.documentElement.className = theme;

  localStorage.setItem(
    THEME_KEY,
    theme
  );

  if (player.id && dbReady()) {
    window.dbUpdate(
      ref('players/' + player.id),
      {
        theme
      }
    );
  }
}

function persistSession() {
  if (!player.id) return;

  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      id: player.id,
      name: player.name,
      token: sessionToken
    })
  );
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function saveView() {
  localStorage.setItem(
    VIEW_KEY,
    currentRoute
  );
}

function saveMatchSession() {
  if (
    game.matchId &&
    game.mode === 'online'
  ) {
    localStorage.setItem(
      MATCH_KEY,
      JSON.stringify({
        matchId: game.matchId,
        role: game.role,
        opponentId: game.opponentId,
        opponentName: game.opponentName,
        format: game.format
      })
    );
  } else {
    localStorage.removeItem(MATCH_KEY);
  }
}

function clearMatchSession() {
  localStorage.removeItem(MATCH_KEY);
}

function navigate(route) {
  if (
    game.matchId &&
    route !== 'play' &&
    route !== 'online' &&
    route !== 'home' &&
    route !== 'leaderboard' &&
    route !== 'profile' &&
    route !== 'rules'
  ) {
    return;
  }

  currentRoute = route;

  saveView();

  location.hash = routeHash(route);

  renderPage();

  $('mobileNav').classList.remove('open');
}


//#region ======================================================
// 04 - الصفحات والواجهة الرئيسية وربط الأزرار
//#endregion ===================================================

function renderPage() {
  if (
    game.matchId &&
    game.status === 'playing'
  ) {
    $('app').classList.add('hidden');
    $('gameScreen').classList.remove('hidden');

    return;
  }

  $('gameScreen').classList.add('hidden');
  $('app').classList.remove('hidden');

  const page = $('page');

  const tpl =
    document.getElementById(
      currentRoute + 'Template'
    );

  page.innerHTML = '';

  if (tpl) {
    page.appendChild(
      tpl.content.cloneNode(true)
    );
  } else {
    currentRoute = 'home';

    saveView();

    page.appendChild(
      $('homeTemplate').content.cloneNode(true)
    );
  }

  bindPage();
  updateHeader();
}

function bindPage() {
  document
    .querySelectorAll('[data-route]')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          playSound();
          navigate(button.dataset.route);
        }
      );
    });

  if (currentRoute === 'home') {
    buildMiniGrid();
  }

  if (currentRoute === 'play') {
    bindPlay();
  }

  if (currentRoute === 'online') {
    bindOnline();
  }

  if (currentRoute === 'leaderboard') {
    loadLeaderboard();
  }

  if (currentRoute === 'profile') {
    bindProfile();
  }
}

function updateHeader() {
  $('topUserName').textContent =
    player.name || 'Player';

  $('topPoints').textContent =
    (player.points || 0) + ' pts';
}

function buildMiniGrid() {
  const miniGrid = $('miniGrid');

  if (!miniGrid) return;

  const marks = [
    'X', '', 'O',
    '', 'X', '',
    'O', '', 'X'
  ];

  miniGrid.innerHTML =
    marks
      .map(mark => `<div>${mark}</div>`)
      .join('');
}


//#region ======================================================
// 05 - الوضع المحلي Offline وبداية المباراة
//#endregion ===================================================

function bindPlay() {
  document
    .querySelectorAll('[data-ai]')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          startOffline(
            button.dataset.ai,
            $('offlineFormat').value
          );
        }
      );
    });
}

function startOffline(ai, format) {
  playSound('start');

  game = {
    ...game,

    mode: 'offline',

    ai,

    format,

    targetWins: targetWins(format),

    role: 'X',

    opponentId: null,

    opponentName:
      'AI ' + ai,

    matchId: null,

    board: EMPTY_BOARD(),

    wins: EMPTY_WINS(),

    target: null,

    turn: 'X',

    scores: {
      X: 0,
      O: 0
    },

    status: 'playing',

    winner: null,

    lastMoveId: null
  };

  localStorage.setItem(
    OFFLINE_KEY,
    JSON.stringify({
      ai,
      format
    })
  );

  openGame();
}


//#region ======================================================
// 06 - الوضع Online واللوبي والتحديات
//#endregion ===================================================

function bindOnline() {
  $('refreshPlayers').onclick = () => {
    playSound();
    refreshLobby();
  };

  refreshLobby();
}

function refreshLobby() {
  if (
    !dbReady() ||
    !player.id
  ) {
    $('playersList').innerHTML =
      '<p class="hint">قاعدة البيانات غير متاحة.</p>';

    return;
  }

  if (listeners.lobby) {
    listeners.lobby();
  }

  listeners.lobby =
    window.dbOnValue(
      ref('players'),
      snapshot => {
        const data =
          snapshot.val() || {};

        const players =
          Object.entries(data)
            .filter(
              ([id, user]) =>
                id !== player.id &&
                user &&
                user.status === 'online'
            )
            .sort(
              (a, b) =>
                (a[1].name || '')
                  .localeCompare(
                    b[1].name || ''
                  )
            );

        $('onlineCount').textContent =
          players.length;

        $('playersList').innerHTML =
          players.length
            ? ''
            : '<p class="hint">لا يوجد لاعب متاح الآن. اضغط تحديث بعد دخول لاعب آخر.</p>';

        players.forEach(
          ([id, user]) => {
            const row =
              document.createElement('div');

            row.className =
              'player-row';

            row.innerHTML = `
              <div>
                <strong>
                  🟢 ${escapeHtml(user.name || 'Player')}
                </strong>

                <small>
                  ${user.points || 0} pts
                </small>
              </div>

              <button class="primary-btn">
                Challenge
              </button>
            `;

            row
              .querySelector('button')
              .onclick = () =>
                sendChallenge(
                  id,
                  user.name
                );

            $('playersList')
              .appendChild(row);
          }
        );
      }
    );
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>'"]/g,
    character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[character])
  );
}

async function sendChallenge(
  targetId,
  targetName
) {
  if (
    !dbReady() ||
    !player.id
  ) {
    return;
  }

  const format =
    $('onlineFormat').value;

  const matchId =
    window.dbPush(
      ref('matches')
    ).key;

  outgoingChallenge = {
    targetId,
    matchId
  };

  game = {
    ...game,

    matchId,

    mode: 'online',

    role: 'X',

    opponentId: targetId,

    opponentName: targetName,

    format,

    targetWins:
      targetWins(format),

    status: 'waiting'
  };

  saveMatchSession();

  const match = {
    version: 1,

    status: 'waiting',

    format,

    createdAt: Date.now(),

    updatedAt: Date.now(),

    players: {
      X: player.id,
      O: targetId
    },

    playerNames: {
      X: player.name,
      O: targetName
    },

    board: EMPTY_BOARD(),

    wins: EMPTY_WINS(),

    turn: 'X',

    scores: {
      X: 0,
      O: 0
    },

    phase: 'waiting',

    request: null,

    rematch: null,

    result: null,

    closed: false
  };

  try {
    await window.dbSet(
      ref('matches/' + matchId),
      match
    );

    await window.dbSet(
      ref(
        'challenges/' + targetId
      ),
      {
        status: 'pending',
        matchId,
        fromId: player.id,
        fromName: player.name,
        format,
        createdAt: Date.now()
      }
    );

    showToast(
      `تم إرسال تحدي إلى ${targetName}`,
      'good'
    );

    watchMatch(matchId);

  } catch (error) {
    showToast(
      'تعذر إرسال التحدي',
      'bad'
    );

    game.matchId = null;
  }
}

function watchChallenge() {
  if (
    !dbReady() ||
    !player.id
  ) {
    return;
  }

  if (listeners.challenge) {
    listeners.challenge();
  }

  listeners.challenge =
    window.dbOnValue(
      ref(
        'challenges/' +
        player.id
      ),
      snapshot => {
        const data =
          snapshot.val();

        if (
          data &&
          data.status === 'pending' &&
          data.matchId
        ) {
          challengeState = {
            id: player.id,
            matchId: data.matchId,
            fromId: data.fromId,
            fromName: data.fromName,
            format: data.format || '1'
          };

          $('challengeTitle')
            .textContent =
            `تحدي من ${data.fromName}`;

          $('challengeText')
            .textContent =
            `طلب مباراة ${formatLabel(data.format || '1')}. المود المحدد من الطرف الآخر: Ultimate X/O Online.`;

          $('challengeOverlay')
            .classList
            .remove('hidden');
        }
      }
    );
}

async function acceptChallenge() {
  const challenge =
    challengeState;

  if (!challenge.matchId) {
    return;
  }

  playSound('start');

  $('challengeOverlay')
    .classList
    .add('hidden');

  game = {
    ...game,

    matchId:
      challenge.matchId,

    mode: 'online',

    role: 'O',

    opponentId:
      challenge.fromId,

    opponentName:
      challenge.fromName,

    format:
      challenge.format,

    targetWins:
      targetWins(
        challenge.format
      ),

    status: 'playing'
  };

  saveMatchSession();

  await window.dbUpdate(
    ref(
      'matches/' +
      challenge.matchId
    ),
    {
      status: 'playing',
      phase: 'active',
      updatedAt: Date.now(),
      acceptedAt: Date.now()
    }
  );

  await window.dbRemove(
    ref(
      'challenges/' +
      player.id
    )
  );

  watchMatch(
    challenge.matchId
  );
}

async function declineChallenge() {
  if (challengeState.matchId) {
    await window.dbUpdate(
      ref(
        'matches/' +
        challengeState.matchId
      ),
      {
        status: 'closed',
        closed: true,
        closedReason: 'declined',
        updatedAt: Date.now()
      }
    );
  }

  await window.dbRemove(
    ref(
      'challenges/' +
      player.id
    )
  );

  $('challengeOverlay')
    .classList
    .add('hidden');

  playSound();
}

function watchMatch(matchId) {
  if (listeners.match) {
    listeners.match();
  }

  listeners.match =
    window.dbOnValue(
      ref(
        'matches/' +
        matchId
      ),
      snapshot => {
        const data =
          snapshot.val();

        if (!data) {
          handleRemoteClose();
          return;
        }

        game.format =
          data.format ||
          game.format;

        game.targetWins =
          targetWins(
            game.format
          );

        game.status =
          data.status ||
          game.status;

        game.target =
          data.target === null ||
          typeof data.target === 'number'
            ? data.target
            : null;

        game.board =
          normalizeBoard(
            data.board
          );

        game.wins =
          Array.isArray(data.wins)
            ? data.wins.slice(0, 9)
            : EMPTY_WINS();

        game.turn =
          data.turn || 'X';

        game.scores =
          data.scores || {
            X: 0,
            O: 0
          };

        game.opponentName =
          game.role === 'X'
            ? (
                data.playerNames?.O ||
                game.opponentName
              )
            : (
                data.playerNames?.X ||
                game.opponentName
              );

        if (data.status === 'waiting') {
          game.status = 'waiting';
          return;
        }

        if (
          data.closed ||
          data.status === 'closed'
        ) {
          closeGameUI(
            'تم إنهاء المباراة من الطرف الآخر.'
          );

          return;
        }

        if (
          data.status === 'playing'
        ) {
          game.status = 'playing';

          saveMatchSession();

          registerPresence('in-game');

          renderGame();

          handleConnectionFromMatch(data);

          handleResetState(data);

          handleRematchState(data);

          if (data.result) {
            showResultOnce(
              data.result,
              data.result.id
            );
          }
        }
      }
    );
}


//#region ======================================================
// 07 - مزامنة المباراة Online وإغلاق الغرفة
//#endregion ===================================================

function normalizeBoard(board) {
  return (
    Array.isArray(board) &&
    board.length === 9
  )
    ? board.map(row =>
        Array.isArray(row) &&
        row.length === 9
          ? row.map(value => value || '')
          : Array(9).fill('')
      )
    : EMPTY_BOARD();
}

function handleRemoteClose() {
  if (game.matchId) {
    closeGameUI(
      'انتهت الغرفة أو تم إغلاقها.'
    );
  }
}

function closeGameUI(message) {
  stopDisconnect();

  clearMatchSession();

  game.matchId = null;
  game.status = 'idle';

  cleanupMatchListener();

  registerPresence('online');

  $('gameScreen')
    .classList
    .add('hidden');

  $('app')
    .classList
    .remove('hidden');

  navigate('online');

  if (message) {
    notice(
      'Match Closed',
      message
    );
  }
}

function cleanupMatchListener() {
  if (listeners.match) {
    listeners.match();
    listeners.match = null;
  }

  if (listeners.opponent) {
    listeners.opponent();
    listeners.opponent = null;
  }
}


//#region ======================================================
// 08 - رسم لوحة Ultimate X/O وحركات اللاعبين
//#endregion ===================================================

function renderGame() {
  $('app')
    .classList
    .add('hidden');

  $('gameScreen')
    .classList
    .remove('hidden');

  $('gameOpponent')
    .textContent =
    'vs ' + game.opponentName;

  $('gameTitle')
    .textContent =
    game.mode === 'offline'
      ? `AI • ${game.ai}`
      : `Online • ${formatLabel(game.format)}`;

  $('scoreX')
    .textContent =
    game.scores.X;

  $('scoreO')
    .textContent =
    game.scores.O;

  $('turnText')
    .textContent =
    game.turn;

  const board =
    $('ultimateBoard');

  board.innerHTML = '';

  for (let b = 0; b < 9; b++) {
    const local =
      document.createElement('div');

    const open =
      game.wins[b] === null;

    const active =
      game.target === null ||
      game.target === b;

    local.className =
      'local-board ' +
      (
        open && active
          ? 'active'
          : ''
      ) +
      (
        !open
          ? ' locked'
          : ''
      );

    if (!open) {
      const overlay =
        document.createElement('div');

      overlay.className =
        'local-overlay';

      overlay.textContent =
        game.wins[b] === 'DRAW'
          ? '='
          : game.wins[b];

      local.appendChild(
        overlay
      );
    }

    for (let c = 0; c < 9; c++) {
      const button =
        document.createElement('button');

      const value =
        game.board[b][c];

      button.className =
        'cell ' +
        (
          value === 'X'
            ? 'x'
            : value === 'O'
              ? 'o'
              : ''
        );

      button.textContent =
        value;

      button.disabled =
        !!value ||
        !open ||
        !active ||
        game.status !== 'playing' ||
        game.turn !== game.role;

      if (!button.disabled) {
        button.onclick = () =>
          makeMove(b, c);
      }

      local.appendChild(
        button
      );
    }

    board.appendChild(
      local
    );
  }
}

function openGame() {
  $('app')
    .classList
    .add('hidden');

  $('gameScreen')
    .classList
    .remove('hidden');

  registerPresence(
    game.mode === 'online'
      ? 'in-game'
      : 'online'
  );

  renderGame();
}

function validMove(b, c) {
  return (
    game.status === 'playing' &&
    game.wins[b] === null &&
    (
      game.target === null ||
      game.target === b
    ) &&
    !game.board[b][c] &&
    game.turn === game.role
  );
}

function makeMove(b, c) {
  if (!validMove(b, c)) {
    return;
  }

  playSound();

  applyMove(
    b,
    c,
    game.role
  );
}

function applyMove(b, c, mark) {
  game.board[b][c] = mark;

  if (
    checkSmallWin(
      game.board[b]
    )
  ) {
    game.wins[b] = mark;

  } else if (
    game.board[b].every(Boolean)
  ) {
    game.wins[b] = 'DRAW';
  }

  const winner =
    checkUltimateWin(
      game.wins
    );

  const draw =
    !winner &&
    game.wins.every(
      value => value !== null
    );

  if (winner || draw) {
    game.winner =
      winner || 'DRAW';

    finishRound(
      game.winner
    );

    return;
  }

  game.target =
    game.wins[c] !== null
      ? null
      : c;

  game.turn =
    mark === 'X'
      ? 'O'
      : 'X';

  renderGame();

  if (
    game.mode === 'online'
  ) {
    publishMove();

  } else if (
    game.turn === 'O'
  ) {
    scheduleAI();
  }
}

async function publishMove() {
  if (!game.matchId) {
    return;
  }

  const moveId =
    player.id +
    '_' +
    Date.now().toString(36) +
    '_' +
    Math.random()
      .toString(36)
      .slice(2, 6);

  game.lastMoveId =
    moveId;

  await window.dbUpdate(
    ref(
      'matches/' +
      game.matchId
    ),
    {
      board: cloneBoard(),
      wins: game.wins.slice(),
      target: game.target,
      turn: game.turn,
      version: Date.now(),
      lastMoveId: moveId,
      updatedAt: Date.now()
    }
  );
}


//#region ======================================================
// 09 - الذكاء الاصطناعي AI
//#endregion ===================================================


//#region ------------------------------------------------------
// 09.1 - تشغيل وتأخير الذكاء الاصطناعي
//#endregion --------------------------------------------------

function scheduleAI() {
  clearTimeout(timers.ai);

  timers.ai =
    setTimeout(
      () => {
        timers.ai = null;

        if (
          game.mode === 'offline' &&
          game.status === 'playing' &&
          game.turn === 'O'
        ) {
          aiMove();
        }
      },
      aiDelay()
    );
}

function aiDelay() {
  if (game.ai === 'easy') {
    return 220;
  }

  if (game.ai === 'medium') {
    return 330;
  }

  return 480;
}

function aiMove() {
  const moves =
    getLegalMoves();

  if (!moves.length) {
    return;
  }

  let move;

  if (game.ai === 'easy') {
    move =
      easyMove(moves);

  } else if (game.ai === 'medium') {
    move =
      mediumMove(moves);

  } else {
    move =
      grandmasterMove(moves);
  }

  applyMove(
    move.b,
    move.c,
    'O'
  );
}


//#region ------------------------------------------------------
// 09.2 - أدوات وتقييم حركات الذكاء الاصطناعي
//#endregion --------------------------------------------------

function getLegalMoves() {
  const moves = [];

  const boards =
    game.target === null
      ? game.wins
          .map(
            (value, index) =>
              value === null
                ? index
                : -1
          )
          .filter(index => index >= 0)
      : [game.target];

  for (const boardIndex of boards) {
    for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
      if (
        !game.board[boardIndex][cellIndex]
      ) {
        moves.push({
          b: boardIndex,
          c: cellIndex
        });
      }
    }
  }

  return moves;
}

function smallWinMove(b, mark) {
  for (let c = 0; c < 9; c++) {
    if (!game.board[b][c]) {
      game.board[b][c] = mark;

      const win =
        checkSmallWin(
          game.board[b]
        );

      game.board[b][c] = '';

      if (win) {
        return c;
      }
    }
  }

  return null;
}

function easyMove(moves) {
  const winning =
    moves.find(
      move =>
        smallWinMove(
          move.b,
          'O'
        ) === move.c
    );

  if (
    winning &&
    Math.random() < 0.72
  ) {
    return winning;
  }

  const blocking =
    moves.find(
      move =>
        smallWinMove(
          move.b,
          'X'
        ) === move.c
    );

  if (
    blocking &&
    Math.random() < 0.58
  ) {
    return blocking;
  }

  const scored =
    moves
      .map(move => ({
        move,

        score:
          cellHeuristic(
            move.b,
            move.c
          ) +
          Math.random() * 4
      }))
      .sort(
        (a, b) =>
          b.score - a.score
      );

  return scored[
    Math.floor(
      Math.random() *
      Math.min(
        4,
        scored.length
      )
    )
  ].move;
}

function mediumMove(moves) {
  const win =
    moves.find(
      move =>
        smallWinMove(
          move.b,
          'O'
        ) === move.c
    );

  if (win) {
    return win;
  }

  const block =
    moves.find(
      move =>
        smallWinMove(
          move.b,
          'X'
        ) === move.c
    );

  if (block) {
    return block;
  }

  const scored =
    moves
      .map(move => ({
        move,

        score:
          cellHeuristic(
            move.b,
            move.c
          ) +
          futureBoardValue(
            move.b,
            move.c
          ) * 1.4
      }))
      .sort(
        (a, b) =>
          b.score - a.score
      );

  return scored[0].move;
}

function grandmasterMove(moves) {
  let best = null;
  let bestScore = -Infinity;

  for (const move of moves) {
    const before =
      game.board[move.b][move.c];

    game.board[move.b][move.c] =
      'O';

    let score = 0;

    if (
      checkSmallWin(
        game.board[move.b]
      )
    ) {
      score += 100000;
    }

    const next =
      game.wins[move.c];

    if (next !== null) {
      score -= 1800;
    }

    score +=
      cellHeuristic(
        move.b,
        move.c
      ) * 8;

    score +=
      futureBoardValue(
        move.b,
        move.c
      ) * 20;

    score +=
      createThreats(
        move.b,
        'O'
      ) * 90;

    score -=
      createThreats(
        move.b,
        'X'
      ) * 120;

    score +=
      globalPotential(
        'O'
      ) * 150;

    score -=
      globalPotential(
        'X'
      ) * 170;

    const replies =
      getOpponentReplies(
        move.b,
        move.c
      );

    for (const reply of replies) {
      game.board[reply.b][reply.c] =
        'X';

      if (
        checkSmallWin(
          game.board[reply.b]
        )
      ) {
        score -= 45000;
      }

      score -=
        createThreats(
          reply.b,
          'X'
        ) * 90;

      game.board[reply.b][reply.c] =
        '';
    }

    game.board[move.b][move.c] =
      before;

    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }

  return best || moves[0];
}

function getOpponentReplies(b, c) {
  const target =
    game.wins[c] === null
      ? c
      : null;

  const boards =
    target === null
      ? game.wins
          .map(
            (value, index) =>
              value === null
                ? index
                : -1
          )
          .filter(index => index >= 0)
      : [target];

  const replies = [];

  for (const boardIndex of boards) {
    for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
      if (
        !game.board[boardIndex][cellIndex]
      ) {
        replies.push({
          b: boardIndex,
          c: cellIndex
        });
      }
    }
  }

  return replies.slice(0, 18);
}

function cellHeuristic(b, c) {
  let score = 0;

  if (c === 4) {
    score += 9;

  } else if (
    [0, 2, 6, 8].includes(c)
  ) {
    score += 5;

  } else {
    score += 2;
  }

  if (
    game.wins[c] === null
  ) {
    score += 5;
  } else {
    score -= 8;
  }

  return score;
}

function futureBoardValue(b, c) {
  let value = 0;

  if (
    game.wins[c] === null
  ) {
    const empties =
      game.board[c].filter(
        cell => !cell
      ).length;

    value +=
      (9 - empties) * 2;
  }

  return value;
}

function createThreats(b, mark) {
  let count = 0;

  for (const line of WIN_LINES) {
    const values =
      line.map(
        index =>
          game.board[b][index]
      );

    if (
      values.filter(
        value => value === mark
      ).length === 2 &&
      values.includes('')
    ) {
      count++;
    }
  }

  return count;
}

function globalPotential(mark) {
  let count = 0;

  for (const line of WIN_LINES) {
    const values =
      line.map(
        index =>
          game.wins[index]
      );

    const enemy =
      mark === 'O'
        ? 'X'
        : 'O';

    if (
      !values.includes(enemy) &&
      values.filter(
        value => value === mark
      ).length > 0
    ) {
      count++;
    }
  }

  return count;
}


//#region ======================================================
// 11 - فحص الفوز والتعادل وإنهاء الجولة
//#endregion ===================================================

function checkSmallWin(cells) {
  return WIN_LINES.some(
    ([a, b, c]) =>
      cells[a] &&
      cells[a] === cells[b] &&
      cells[a] === cells[c]
  );
}

function checkUltimateWin(wins) {
  return WIN_LINES.some(
    ([a, b, c]) =>
      wins[a] &&
      wins[a] !== 'DRAW' &&
      wins[a] === wins[b] &&
      wins[a] === wins[c]
  );
}

async function finishRound(winner) {
  if (
    game.status !== 'playing'
  ) {
    return;
  }

  game.status = 'finished';

  clearTimeout(timers.ai);

  const me = game.role;

  const isWin =
    winner !== 'DRAW' &&
    winner === me;

  const isDraw =
    winner === 'DRAW';

  if (isWin) {
    player.points += 3;
    player.stats.wins++;

  } else if (!isDraw) {
    player.points =
      Math.max(
        0,
        player.points - 1
      );

    player.stats.losses++;

  } else {
    player.points += 1;
  }

  player.stats.total++;

  updateHeader();

  await savePlayerStats();

  const cupWin =
    winner !== 'DRAW' &&
    game.scores[winner] + 1 >=
      game.targetWins;

  game.scores[
    winner === 'DRAW'
      ? 'X'
      : winner
  ] +=
    winner === 'DRAW'
      ? 0
      : 1;

  const result = {
    id:
      'r_' +
      Date.now().toString(36),

    winner,

    winnerName:
      winner === 'DRAW'
        ? 'Draw'
        : (
            winner === me
              ? player.name
              : game.opponentName
          ),

    cupWin,

    scores:
      game.scores
  };

  if (
    game.mode === 'online'
  ) {
    await window.dbUpdate(
      ref(
        'matches/' +
        game.matchId
      ),
      {
        status: 'playing',
        phase: 'result',
        scores: game.scores,
        result,
        updatedAt: Date.now()
      }
    );

    showResultOnce(
      result,
      result.id
    );

  } else {
    showResultOnce(
      result,
      result.id
    );
  }
}

function showResultOnce(result, id) {
  if (
    resultShownId === id
  ) {
    return;
  }

  resultShownId = id;

  playSound(
    result.winner === game.role
      ? 'win'
      : result.winner === 'DRAW'
        ? 'bell'
        : 'lose'
  );

  $('resultTitle')
    .textContent =
    result.winner === 'DRAW'
      ? '🤝 تعادل'
      : result.winner === game.role
        ? '🏆 أنت كسبت الجولة'
        : 'الجولة للخصم';

  $('resultText')
    .textContent =
    result.cupWin
      ? `انتهت الكأس — النتيجة ${result.scores.X} : ${result.scores.O}`
      : `النتيجة ${result.scores.X} : ${result.scores.O} — اختر الجولة التالية أو أنهِ المباراة.`;

  $('resultOverlay')
    .classList
    .remove('hidden');

  $('acceptRematch')
    .textContent =
    result.cupWin
      ? '🏆 كأس جديدة'
      : '▶ الجولة التالية';
}

$('acceptRematch').onclick =
  async () => {
    if (
      game.mode !== 'online'
    ) {
      $('resultOverlay')
        .classList
        .add('hidden');

      resultShownId = null;

      if (
        game.scores.X >= game.targetWins ||
        game.scores.O >= game.targetWins
      ) {
        game.scores = {
          X: 0,
          O: 0
        };
      }

      resetLocalRound();

      return;
    }

    if (!game.matchId) {
      return;
    }

    $('acceptRematch')
      .disabled = true;

    await window.dbUpdate(
      ref(
        'matches/' +
        game.matchId +
        '/rematch'
      ),
      {
        [game.role]: 'accepted',

        id:
          'rm_' +
          Date.now().toString(36)
      }
    );
  };

$('exitResult').onclick =
  () => endMatch('left');


//#region ======================================================
// 12 - إعادة الجولة وطلبات Restart و Rematch
//#endregion ===================================================

function resetLocalRound() {
  game.board =
    EMPTY_BOARD();

  game.wins =
    EMPTY_WINS();

  game.target = null;

  game.turn = 'X';

  game.winner = null;

  game.status = 'playing';

  renderGame();

  if (
    game.turn === 'O'
  ) {
    scheduleAI();
  }
}

function handleRematchState(data) {
  const rematch =
    data.rematch;

  if (!rematch) {
    return;
  }

  if (
    rematch.X === 'accepted' &&
    rematch.O === 'accepted' &&
    game.role === 'X' &&
    rematchHandledId !== rematch.id
  ) {
    rematchHandledId =
      rematch.id;

    const newScores =
      data.result?.cupWin
        ? {
            X: 0,
            O: 0
          }
        : game.scores;

    window.dbUpdate(
      ref(
        'matches/' +
        game.matchId
      ),
      {
        board: EMPTY_BOARD(),
        wins: EMPTY_WINS(),
        target: null,
        turn: 'X',
        scores: newScores,
        result: null,
        rematch: null,
        phase: 'active',
        status: 'playing',
        updatedAt: Date.now()
      }
    );
  }

  if (
    rematch[game.role] === 'accepted'
  ) {
    $('acceptRematch')
      .textContent =
      '⏳ انتظار موافقة الخصم';
  }

  if (
    rematch.X === 'declined' ||
    rematch.O === 'declined'
  ) {
    closeGameUI(
      'أحد اللاعبين أنهى المباراة.'
    );
  }
}

$('restartGame').onclick =
  async () => {
    if (
      game.mode !== 'online'
    ) {
      resetLocalRound();
      return;
    }

    if (
      !game.matchId ||
      game.status !== 'playing'
    ) {
      return;
    }

    const id =
      'rs_' +
      Date.now().toString(36);

    await window.dbUpdate(
      ref(
        'matches/' +
        game.matchId +
        '/request'
      ),
      {
        type: 'restart',
        id,
        from: game.role,
        status: 'pending'
      }
    );

    showToast(
      'تم إرسال طلب Restart. لن تتغير اللوحة قبل موافقة الخصم.'
    );
  };

function handleResetState(data) {
  const request =
    data.request;

  if (!request) {
    $('restartOverlay')
      .classList
      .add('hidden');

    return;
  }

  if (
    request.type === 'restart' &&
    request.status === 'pending' &&
    request.from !== game.role
  ) {
    $('restartText')
      .textContent =
      `${game.opponentName} يطلب إعادة الجولة الحالية.`;

    $('restartOverlay')
      .classList
      .remove('hidden');
  }

  if (
    request.type === 'restart' &&
    request.status === 'declined' &&
    request.from === game.role &&
    resetHandledId !== request.id
  ) {
    resetHandledId =
      request.id;

    $('restartOverlay')
      .classList
      .add('hidden');

    showToast(
      'الخصم رفض إعادة الجولة',
      'bad'
    );

    window.dbUpdate(
      ref(
        'matches/' +
        game.matchId +
        '/request'
      ),
      {
        status: 'cleared'
      }
    );
  }

  if (
    request.type === 'restart' &&
    request.status === 'accepted' &&
    game.role === 'X' &&
    resetHandledId !== request.id
  ) {
    resetHandledId =
      request.id;

    window.dbUpdate(
      ref(
        'matches/' +
        game.matchId
      ),
      {
        board: EMPTY_BOARD(),
        wins: EMPTY_WINS(),
        target: null,
        turn: 'X',
        result: null,
        rematch: null,
        request: null,
        phase: 'active',
        status: 'playing',
        updatedAt: Date.now()
      }
    );
  }
}

$('acceptRestart').onclick =
  async () => {
    const id =
      game.matchId;

    if (!id) {
      return;
    }

    $('restartOverlay')
      .classList
      .add('hidden');

    await window.dbUpdate(
      ref(
        'matches/' +
        id +
        '/request'
      ),
      {
        status: 'accepted'
      }
    );
  };

$('declineRestart').onclick =
  async () => {
    const id =
      game.matchId;

    if (!id) {
      return;
    }

    $('restartOverlay')
      .classList
      .add('hidden');

    await window.dbUpdate(
      ref(
        'matches/' +
        id +
        '/request'
      ),
      {
        status: 'declined'
      }
    );
  };

$('endGame').onclick =
  () => endMatch('left');

$('leaveGame').onclick =
  () => {
    if (
      game.mode === 'online'
    ) {
      endMatch('left');

    } else {
      clearTimeout(timers.ai);

      game.matchId = null;
      game.status = 'idle';

      $('gameScreen')
        .classList
        .add('hidden');

      $('app')
        .classList
        .remove('hidden');

      navigate('play');
    }
  };

$('disconnectLeave').onclick =
  () => {
    stopDisconnect();
    endMatch('left');
  };


//#region ======================================================
// 13 - إنهاء المباراة والاتصال والانقطاع 30 ثانية
//#endregion ===================================================

async function endMatch(reason) {
  if (
    game.mode === 'online' &&
    game.matchId &&
    dbReady()
  ) {
    try {
      await window.dbUpdate(
        ref(
          'matches/' +
          game.matchId
        ),
        {
          closed: true,
          status: 'closed',
          closedReason: reason,
          closedBy: game.role,
          updatedAt: Date.now()
        }
      );
    } catch {}
  }

  closeGameUI(
    'تم إنهاء المباراة للطرفين.'
  );
}

function handleConnectionFromMatch(data) {
  if (
    game.mode !== 'online'
  ) {
    return;
  }

  if (
    !listeners.opponent &&
    game.opponentId
  ) {
    listeners.opponent =
      window.dbOnValue(
        ref(
          'players/' +
          game.opponentId +
          '/status'
        ),
        snapshot => {
          const status =
            snapshot.val();

          if (
            status === 'offline'
          ) {
            startDisconnect();
          } else {
            stopDisconnect();
          }
        }
      );
  }
}

function startDisconnect() {
  if (
    timers.disconnect ||
    game.status !== 'playing'
  ) {
    return;
  }

  timers.disconnectEndsAt =
    Date.now() +
    DISCONNECT_SECONDS * 1000;

  $('disconnectOverlay')
    .classList
    .remove('hidden');

  updateDisconnectText();

  timers.disconnect =
    setInterval(
      updateDisconnectText,
      250
    );
}

function updateDisconnectText() {
  const left =
    Math.max(
      0,
      Math.ceil(
        (
          timers.disconnectEndsAt -
          Date.now()
        ) / 1000
      )
    );

  $('disconnectCountdown')
    .textContent = left;

  if (left <= 0) {
    stopDisconnect();

    if (game.matchId) {
      endMatch('timeout');
    }
  }
}

function stopDisconnect() {
  if (timers.disconnect) {
    clearInterval(
      timers.disconnect
    );

    timers.disconnect = null;
  }

  timers.disconnectEndsAt = 0;

  $('disconnectOverlay')
    .classList
    .add('hidden');
}


//#region ======================================================
// 14 - Presence وحفظ الإحصائيات وتسجيل الدخول
//#endregion ===================================================

function registerPresence(
  status = 'online'
) {
  if (
    !dbReady() ||
    !player.id
  ) {
    return;
  }

  const playerRef =
    ref(
      'players/' +
      player.id
    );

  window.dbOnDisconnect(
    playerRef
  ).update({
    status: 'offline',
    lastActive: Date.now(),
    currentSessionId:
      sessionToken
  });

  window.dbUpdate(
    playerRef,
    {
      name: player.name,
      points: player.points,
      stats: player.stats,
      theme: player.theme,
      status,
      lastActive: Date.now(),
      currentSessionId:
        sessionToken
    }
  );
}

async function savePlayerStats() {
  if (
    dbReady() &&
    player.id
  ) {
    await window.dbUpdate(
      ref(
        'players/' +
        player.id
      ),
      {
        points: player.points,
        stats: player.stats,
        lastActive: Date.now()
      }
    );
  }
}

async function loginOrRegister() {
  const name =
    safeName(
      $('authName').value
    );

  const pin =
    $('authPin')
      .value
      .trim();

  if (
    !name ||
    !/^[0-9]{4}$/.test(pin)
  ) {
    notice(
      'بيانات غير صحيحة',
      'اكتب اسم لاعب صالح وPIN مكونًا من 4 أرقام.'
    );

    return;
  }

  if (!dbReady()) {
    notice(
      'Firebase',
      'قاعدة البيانات لم تجهز بعد.'
    );

    return;
  }

  const snapshot =
    await window.dbGet(
      ref('players')
    );

  const all =
    snapshot.val() || {};

  let foundId = null;
  let found = null;

  for (
    const [id, user] of
    Object.entries(all)
  ) {
    if (
      user?.name === name
    ) {
      foundId = id;
      found = user;
      break;
    }
  }

  const register =
    $('authSubmit')
      .dataset
      .mode === 'register';

  if (register) {
    if (foundId) {
      notice(
        'الاسم مستخدم',
        'اختر اسمًا آخر أو سجّل الدخول.'
      );

      return;
    }

    player.id =
      'p_' +
      Math.random()
        .toString(36)
        .slice(2, 11);

    player.name = name;
    player.pin = pin;

    player.points = 10;

    player.stats = {
      total: 0,
      wins: 0,
      losses: 0
    };

    await window.dbSet(
      ref(
        'players/' +
        player.id
      ),
      {
        name,
        pin,
        points: 10,
        stats: player.stats,
        theme: player.theme,
        status: 'online',
        lastActive: Date.now(),
        currentSessionId:
          sessionToken
      }
    );

  } else {
    if (
      !foundId ||
      !found ||
      String(found.pin) !== pin
    ) {
      notice(
        'فشل الدخول',
        'اسم المستخدم أو PIN غير صحيح.'
      );

      return;
    }

    player.id =
      foundId;

    player.name =
      found.name;

    player.pin =
      found.pin;

    player.points =
      found.points ?? 10;

    player.stats =
      found.stats || {
        total: 0,
        wins: 0,
        losses: 0
      };

    player.theme =
      found.theme ||
      player.theme;
  }

  persistSession();

  setTheme(
    player.theme
  );

  registerPresence(
    'online'
  );

  $('authScreen')
    .classList
    .add('hidden');

  $('app')
    .classList
    .remove('hidden');

  watchChallenge();

  resumeState();

  renderPage();
}


//#region ======================================================
// 15 - المصادقة واستعادة الجلسة واستعادة المباراة
//#endregion ===================================================

function setupAuth() {
  $('authForm').onsubmit =
    event => {
      event.preventDefault();

      playSound();

      loginOrRegister();
    };

  $('authSwitch').onclick =
    () => {
      const register =
        $('authSubmit')
          .dataset
          .mode !== 'register';

      $('authSubmit')
        .dataset
        .mode =
        register
          ? 'register'
          : 'login';

      $('authSubmit')
        .textContent =
        register
          ? 'إنشاء الحساب'
          : 'دخول';

      $('authTitle')
        .textContent =
        register
          ? 'إنشاء حساب'
          : 'تسجيل الدخول';

      $('authHint')
        .textContent =
        register
          ? 'اختر اسمًا وPIN من 4 أرقام.'
          : 'ادخل باسم اللاعب ورقم الـPIN الخاص بك.';

      $('authSwitch')
        .textContent =
        register
          ? 'لديك حساب بالفعل؟ تسجيل الدخول'
          : 'ليس لديك حساب؟ إنشاء حساب';
    };

  $('authSubmit')
    .dataset
    .mode = 'login';
}

async function resumeSession() {
  setupAuth();

  if (!dbReady()) {
    return;
  }

  const raw =
    localStorage.getItem(
      SESSION_KEY
    );

  if (!raw) {
    $('authScreen')
      .classList
      .remove('hidden');

    return;
  }

  try {
    const session =
      JSON.parse(raw);

    const snapshot =
      await window.dbGet(
        ref(
          'players/' +
          session.id
        )
      );

    const user =
      snapshot.val();

    if (!user) {
      clearSession();

      $('authScreen')
        .classList
        .remove('hidden');

      return;
    }

    player.id =
      session.id;

    player.name =
      user.name;

    player.pin =
      user.pin || '';

    player.points =
      user.points ?? 10;

    player.stats =
      user.stats || {
        total: 0,
        wins: 0,
        losses: 0
      };

    player.theme =
      user.theme ||
      player.theme;

    sessionToken =
      session.token ||
      sessionToken;

    setTheme(
      player.theme
    );

    registerPresence(
      'online'
    );

    $('authScreen')
      .classList
      .add('hidden');

    watchChallenge();

    resumeState();

    renderPage();

  } catch {
    $('authScreen')
      .classList
      .remove('hidden');
  }
}

async function resumeState() {
  if (game.matchId) {
    return;
  }

  const raw =
    localStorage.getItem(
      MATCH_KEY
    );

  if (
    raw &&
    dbReady()
  ) {
    try {
      const session =
        JSON.parse(raw);

      const snapshot =
        await window.dbGet(
          ref(
            'matches/' +
            session.matchId
          )
        );

      const data =
        snapshot.val();

      if (
        data &&
        data.status !== 'closed'
      ) {
        game = {
          ...game,

          matchId:
            session.matchId,

          mode: 'online',

          role:
            session.role,

          opponentId:
            session.opponentId,

          opponentName:
            session.opponentName ||
            'Opponent',

          format:
            session.format ||
            data.format ||
            '1',

          targetWins:
            targetWins(
              session.format ||
              data.format ||
              '1'
            ),

          status:
            data.status
        };

        watchMatch(
          session.matchId
        );

        return;
      }

      clearMatchSession();

    } catch {
      clearMatchSession();
    }
  }
}


//#region ======================================================
// 16 - Ranking و Profile والإحصائيات
//#endregion ===================================================

async function loadLeaderboard() {
  if (!dbReady()) {
    return;
  }

  const element =
    $('leaderboardRows');

  element.innerHTML =
    '<p class="hint">جاري التحميل...</p>';

  const snapshot =
    await window.dbGet(
      ref('players')
    );

  const players =
    Object.values(
      snapshot.val() || {}
    ).sort(
      (a, b) =>
        (b.points || 0) -
        (a.points || 0)
    );

  element.innerHTML = '';

  players
    .slice(0, 100)
    .forEach(
      (user, index) => {
        const row =
          document.createElement('div');

        row.className =
          'rank-row';

        row.innerHTML = `
          <span>
            #${index + 1}
          </span>

          <strong>
            ${escapeHtml(user.name || 'Player')}
          </strong>

          <b>
            ${user.points || 0}
          </b>

          <span>
            ${user.stats?.wins || 0}
          </span>
        `;

        element.appendChild(row);
      }
    );

  if (!players.length) {
    element.innerHTML =
      '<p class="hint">لا يوجد لاعبين بعد.</p>';
  }
}

function bindProfile() {
  $('profileName')
    .textContent =
    player.name;

  $('profileAvatar')
    .textContent =
    (player.name || 'X')
      .slice(0, 1)
      .toUpperCase();

  $('profilePoints')
    .textContent =
    player.points;

  $('profileTotal')
    .textContent =
    player.stats.total;

  $('profileWins')
    .textContent =
    player.stats.wins;

  $('profileLosses')
    .textContent =
    player.stats.losses;

  $('themeSelect')
    .value =
    player.theme;

  $('themeSelect').onchange =
    event =>
      setTheme(
        event.target.value
      );

  $('logoutBtn').onclick =
    async () => {
      if (
        player.id &&
        dbReady()
      ) {
        await window.dbUpdate(
          ref(
            'players/' +
            player.id
          ),
          {
            status: 'offline'
          }
        );
      }

      clearSession();

      location.reload();
    };

  $('deleteBtn').onclick =
    async () => {
      if (
        !confirm(
          'حذف الحساب نهائيًا؟'
        )
      ) {
        return;
      }

      if (
        player.id &&
        dbReady()
      ) {
        await window.dbRemove(
          ref(
            'players/' +
            player.id
          )
        );

        await window.dbRemove(
          ref(
            'challenges/' +
            player.id
          )
        );
      }

      clearSession();

      location.reload();
    };
}


//#region ======================================================
// 17 - أزرار الواجهة والخلفية والمؤثرات
//#endregion ===================================================

$('mobileMenuBtn').onclick =
  () => {
    $('mobileNav')
      .classList
      .toggle('open');
  };

$('acceptChallenge').onclick =
  acceptChallenge;

$('declineChallenge').onclick =
  declineChallenge;

window.addEventListener(
  'hashchange',
  () => {
    const route =
      location.hash.replace(
        '#',
        ''
      );

    if (
      [
        'home',
        'play',
        'online',
        'leaderboard',
        'profile',
        'rules'
      ].includes(route)
    ) {
      currentRoute = route;

      saveView();

      renderPage();
    }
  }
);


//#region ------------------------------------------------------
// 17.1 - الخلفية المتحركة
//#endregion --------------------------------------------------

const canvas =
  $('bgCanvas');

const ctx =
  canvas.getContext('2d');

let particles = [];

function resizeCanvas() {
  const d =
    window.devicePixelRatio ||
    1;

  canvas.width =
    innerWidth * d;

  canvas.height =
    innerHeight * d;

  canvas.style.width =
    innerWidth + 'px';

  canvas.style.height =
    innerHeight + 'px';

  ctx.setTransform(
    d,
    0,
    0,
    d,
    0,
    0
  );

  particles =
    Array.from(
      {
        length: 26
      },
      () => ({
        x:
          Math.random() *
          innerWidth,

        y:
          Math.random() *
          innerHeight,

        s:
          Math.random() * 2 +
          0.5,

        a:
          Math.random() * 0.25 +
          0.04,

        t:
          Math.random() > 0.5
            ? 'X'
            : 'O'
      })
    );
}

function drawBg() {
  ctx.clearRect(
    0,
    0,
    innerWidth,
    innerHeight
  );

  const primary =
    getComputedStyle(
      document.documentElement
    )
      .getPropertyValue(
        '--primary'
      )
      .trim() ||
    '#22d3ee';

  ctx.fillStyle =
    primary;

  particles.forEach(
    particle => {
      particle.y -=
        particle.s;

      if (
        particle.y < -30
      ) {
        particle.y =
          innerHeight + 30;
      }

      ctx.globalAlpha =
        particle.a;

      ctx.font =
        '900 22px system-ui';

      ctx.fillText(
        particle.t,
        particle.x,
        particle.y
      );
    }
  );

  ctx.globalAlpha = 1;

  requestAnimationFrame(
    drawBg
  );
}

addEventListener(
  'resize',
  resizeCanvas
);

resizeCanvas();
drawBg();


//#region ======================================================
// 18 - تشغيل التطبيق والتهيئة النهائية
//#endregion ===================================================

function start() {
  setupAuth();

  if (location.hash) {
    const route =
      location.hash.slice(1);

    if (
      [
        'home',
        'play',
        'online',
        'leaderboard',
        'profile',
        'rules'
      ].includes(route)
    ) {
      currentRoute =
        route;
    }
  }

  if (window.db) {
    resumeSession();

  } else {
    window.addEventListener(
      'firebase-ready',
      resumeSession,
      {
        once: true
      }
    );
  }
}

start();


//#endregion ===================================================

})();