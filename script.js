const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') { audioCtx.resume(); }
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.08);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
    } else if (type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.setValueAtTime(500, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(700, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    }
}

const ultimateBoard = document.getElementById('ultimateBoard');
const mainBoardContainer = document.getElementById('mainBoardContainer');
const turnIndicator = document.getElementById('turnIndicator');
const resetBtn = document.getElementById('resetBtn');
const scoreXEl = document.getElementById('scoreX');
const scoreOEl = document.getElementById('scoreO');

const themeSelector = document.getElementById('themeSelector');
const htmlRoot = document.getElementById('htmlRoot');

const victoryModal = document.getElementById('victoryModal');
const victoryTitle = document.getElementById('victoryTitle');
const nextRoundBtn = document.getElementById('nextRoundBtn');

const nameModal = document.getElementById('nameModal');
const playerNameInput = document.getElementById('playerNameInput');
const saveNameBtn = document.getElementById('saveNameBtn');
const menuUsername = document.getElementById('menuUsername');
const userPoints = document.getElementById('userPoints');

const aiDifficultyModal = document.getElementById('aiDifficultyModal');
const pveMenuBtn = document.getElementById('pveMenuBtn');
const cancelAiModalBtn = document.getElementById('cancelAiModalBtn');

const onlineLobbyModal = document.getElementById('onlineLobbyModal');
const onlineLobbyMenuBtn = document.getElementById('onlineLobbyMenuBtn');
const closeOnlineLobbyBtn = document.getElementById('closeOnlineLobbyBtn');
const onlinePlayersList = document.getElementById('onlinePlayersList');

const challengeModal = document.getElementById('challengeModal');
const challengeTitle = document.getElementById('challengeTitle');
const challengeText = document.getElementById('challengeText');
const acceptChallengeBtn = document.getElementById('acceptChallengeBtn');
const rejectChallengeBtn = document.getElementById('rejectChallengeBtn');

const statsModal = document.getElementById('statsModal');
const statsMenuBtn = document.getElementById('statsMenuBtn');
const closeStatsBtn = document.getElementById('closeStatsBtn');
const statPoints = document.getElementById('statPoints');
const statTotal = document.getElementById('statTotal');

// زرار مسح البيانات
const resetDataBtn = document.createElement('button');
resetDataBtn.id = 'resetDataBtn';
resetDataBtn.className = 'w-full bg-rose-600/85 hover:bg-rose-600 text-white font-bold py-2.5 rounded-xl text-sm mb-2 shadow-lg transition-all';
resetDataBtn.textContent = '🗑️ Reset Local Data & Profile';

if (statsModal) {
    statsModal.querySelector('.modal-box').insertBefore(resetDataBtn, closeStatsBtn);
}

resetDataBtn.addEventListener('click', async () => {
    playSound('click');
    if (confirm('Are you sure you want to reset your local data and name?')) {
        if (window.db && playerId) {
            try {
                await window.dbRemove(window.dbRef(window.db, 'players/' + playerId));
                await window.dbRemove(window.dbRef(window.db, 'challenges/' + playerId));
            } catch (e) {
                console.log(e);
            }
        }
        localStorage.clear();
        alert('Data cleared successfully! The page will reload.');
        location.reload();
    }
});

let leaderboardList = document.getElementById('leaderboardList');
if (!leaderboardList && statsModal) {
    let lbContainer = document.createElement('div');
    lbContainer.className = 'mt-4 text-left';
    lbContainer.innerHTML = `
        <h3 class="font-bold text-xs mb-2 text-cyan-400 uppercase tracking-wider">🏆 Global Arena Leaderboard</h3>
        <div id="leaderboardList" class="flex flex-col gap-1.5 max-h-36 overflow-y-auto sub-box p-2 rounded-xl border text-xs">
            <p class="text-center opacity-50 py-2">Loading leaderboard...</p>
        </div>
    `;
    statsModal.querySelector('.modal-box').appendChild(lbContainer);
    leaderboardList = document.getElementById('leaderboardList');
}

const rulesModal = document.getElementById('rulesModal') || createRulesModal();
const menuRulesBtn = document.getElementById('menuRulesBtn');

const mainMenu = document.getElementById('mainMenu');
const homeBtn = document.getElementById('homeBtn');
const gameModeBadge = document.getElementById('gameModeBadge');

let gameMode = 'pve'; 
let aiDifficulty = 'impossible'; 
let currentPlayer = 'X';
let activeBoardIndex = null; 
let boardWins = Array(9).fill(null); 
let boardStates = Array(9).fill().map(() => Array(9).fill(''));

let playerName = localStorage.getItem('ultimate_player_name') || '';
let playerId = localStorage.getItem('ultimate_player_id') || 'p_' + Math.random().toString(36).substring(2, 9);
localStorage.setItem('ultimate_player_id', playerId);

let userArenaPoints = parseInt(localStorage.getItem('ultimate_points')) || 10;
let stats = JSON.parse(localStorage.getItem('ultimate_stats')) || { total: 0, wins: 0, losses: 0 };
let scores = { X: 0, O: 0 };
let currentTheme = localStorage.getItem('ultimate_theme') || 'theme-cyberpunk';

let currentMatchId = null;
let myRole = 'X';
let activeMatchUnsubscribe = null;
let activeChallengeRef = null;

htmlRoot.className = currentTheme;
themeSelector.value = currentTheme;

themeSelector.addEventListener('change', (e) => {
    playSound('click');
    currentTheme = e.target.value;
    htmlRoot.className = currentTheme;
    localStorage.setItem('ultimate_theme', currentTheme);
});

function createRulesModal() {
    let modal = document.createElement('div');
    modal.id = 'rulesModal';
    modal.className = 'fixed inset-0 bg-black/70 z-50 hidden items-center justify-center p-4 backdrop-blur-md';
    modal.innerHTML = `
        <div class="modal-box border-2 p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl flex flex-col gap-3">
            <h2 class="font-black text-lg brand-title">📜 Game Rules</h2>
            <p class="text-xs text-left leading-relaxed opacity-90">
                1. Each move sends your opponent to the corresponding local board.<br>
                2. Win 3 local boards in a row to win the ultimate match!<br>
                3. +3 Points for Win, +1 for Draw.
            </p>
            <button id="closeRulesBtn" class="action-btn font-bold py-2 rounded-xl text-xs mt-2">Got it</button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#closeRulesBtn').onclick = () => modal.style.display = 'none';
    return modal;
}

if (menuRulesBtn) {
    menuRulesBtn.addEventListener('click', () => { playSound('click'); rulesModal.style.display = 'flex'; });
}

if (statsMenuBtn) {
    statsMenuBtn.addEventListener('click', () => {
        playSound('click');
        statPoints.textContent = userArenaPoints;
        statTotal.textContent = stats.total;
        fetchGlobalLeaderboard();
        statsModal.style.display = 'flex';
    });
}

if (closeStatsBtn) {
    closeStatsBtn.addEventListener('click', () => { playSound('click'); statsModal.style.display = 'none'; });
}

function checkPlayerName() {
    if (!localStorage.getItem('ultimate_player_name')) {
        nameModal.style.display = 'flex';
        mainMenu.style.display = 'flex';
    } else {
        playerName = localStorage.getItem('ultimate_player_name');
        nameModal.style.display = 'none';
        mainMenu.style.display = 'flex';
        menuUsername.textContent = playerName;
        userPoints.textContent = userArenaPoints;
        registerOnlinePresence();
    }
}

function submitPlayerName(event) {
    if (event) event.preventDefault();
    try { playSound('click'); } catch (e) {}

    const name = playerNameInput.value.trim();
    if (!name) {
        alert('Please enter your name!');
        playerNameInput.focus();
        return;
    }

    playerName = name;
    localStorage.setItem('ultimate_player_name', playerName);
    nameModal.style.display = 'none';
    mainMenu.style.display = 'flex';
    menuUsername.textContent = playerName;
    userPoints.textContent = userArenaPoints;
    whenFirebaseReady(registerOnlinePresence);
}

const nameForm = document.getElementById('nameForm');
if (nameForm) {
    nameForm.addEventListener('submit', submitPlayerName);
} else if (saveNameBtn) {
    saveNameBtn.addEventListener('click', submitPlayerName);
}

playerNameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        submitPlayerName(event);
    }
});

function whenFirebaseReady(callback) {
    if (window.db) {
        callback();
        return;
    }
    window.addEventListener('firebase-ready', callback, { once: true });
}

function registerOnlinePresence() {
    if (!window.db) return;
    const userRef = window.dbRef(window.db, 'players/' + playerId);
    window.dbSet(userRef, { 
        name: playerName, 
        points: userArenaPoints, 
        status: 'online', 
        lastActive: Date.now() 
    });

    if (window.dbOnDisconnect) {
        window.dbOnDisconnect(userRef).remove();
    }

    if (activeChallengeRef) {
        activeChallengeRef();
    }
    const challengeRef = window.dbRef(window.db, 'challenges/' + playerId);
    activeChallengeRef = window.dbOnValue(challengeRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data.status === 'pending') {
            showIncomingChallenge(data);
        }
    });
}

function fetchGlobalLeaderboard() {
    if (!window.db) return;
    const playersRef = window.dbRef(window.db, 'players');
    window.dbOnValue(playersRef, (snapshot) => {
        const players = snapshot.val();
        if (!players || !leaderboardList) return;
        
        let sortedPlayers = Object.values(players).sort((a, b) => (b.points || 0) - (a.points || 0));
        leaderboardList.innerHTML = '';
        
        sortedPlayers.slice(0, 5).forEach((p, index) => {
            let row = document.createElement('div');
            row.className = 'flex justify-between items-center py-1 px-2 border-b border-white/10 last:border-none';
            row.innerHTML = `<span>#${index + 1} ${p.name}</span> <span class="font-bold text-emerald-400">${p.points || 0} pts</span>`;
            leaderboardList.appendChild(row);
        });
    }, { onlyOnce: true });
}

onlineLobbyMenuBtn.addEventListener('click', () => {
    playSound('click');
    onlineLobbyModal.style.display = 'flex';
    fetchOnlinePlayers();
});

closeOnlineLobbyBtn.addEventListener('click', () => {
    playSound('click');
    onlineLobbyModal.style.display = 'none';
});

function fetchOnlinePlayers() {
    whenFirebaseReady(() => {
        if (!window.db) return;
        const playersRef = window.dbRef(window.db, 'players');
        window.dbOnValue(playersRef, (snapshot) => {
            const players = snapshot.val();
            onlinePlayersList.innerHTML = '';
            if (!players) {
                onlinePlayersList.innerHTML = '<p class="text-xs text-center opacity-50 py-4">No players online.</p>';
                return;
            }

            let count = 0;
            Object.keys(players).forEach(id => {
                if (id === playerId) return;
                count++;
                let p = players[id];
                let div = document.createElement('div');
                div.className = 'sub-box p-2.5 rounded-xl border flex justify-between items-center text-xs font-bold';
                div.innerHTML = `<span>🟢 ${p.name}</span> <button class="action-btn px-3 py-1 rounded-lg text-xs">Challenge</button>`;
                div.querySelector('button').addEventListener('click', () => sendChallenge(id, p.name));
                onlinePlayersList.appendChild(div);
            });

            if (count === 0) {
                onlinePlayersList.innerHTML = '<p class="text-xs text-center opacity-50 py-4">No other players online. Open another browser/device!</p>';
            }
        });
    });
}

function sendChallenge(targetId, targetName) {
    playSound('click');
    myRole = 'X';
    currentMatchId = playerId < targetId ? playerId + '_' + targetId : targetId + '_' + playerId;
    
    const initialBoardStates = Array(9).fill().map(() => Array(9).fill(''));
    const initialBoardWins = Array(9).fill(null);

    const matchRef = window.dbRef(window.db, 'matches/' + currentMatchId);
    window.dbSet(matchRef, {
        boardStates: initialBoardStates,
        boardWins: initialBoardWins,
        activeBoardIndex: null,
        currentPlayer: 'X',
        status: 'waiting'
    });

    const challengeRef = window.dbRef(window.db, 'challenges/' + targetId);
    window.dbSet(challengeRef, { 
        fromId: playerId, 
        fromName: playerName, 
        matchId: currentMatchId, 
        status: 'pending' 
    });

    onlineLobbyModal.style.display = 'none';
    challengeTitle.textContent = `Waiting for ${targetName}...`;
    challengeText.textContent = `Challenge sent! Waiting for them to accept.`;
    challengeActionButtons.style.display = 'none';
    challengeModal.style.display = 'flex';

    gameModeBadge.textContent = `Online vs ${targetName}`;
    listenToMatch(currentMatchId);
}

let activeChallengeData = null;
const challengeActionButtons = document.getElementById('challengeActionButtons');

function showIncomingChallenge(data) {
    activeChallengeData = data;
    currentMatchId = data.matchId;
    challengeTitle.textContent = `Challenge from ${data.fromName}!`;
    challengeText.textContent = `${data.fromName} wants to play with you in the Arena.`;
    challengeActionButtons.style.display = 'flex';
    challengeModal.style.display = 'flex';
}

acceptChallengeBtn.onclick = () => {
    playSound('click');
    challengeModal.style.display = 'none';
    onlineLobbyModal.style.display = 'none';
    mainMenu.style.display = 'none';
    
    gameMode = 'online-p2p';
    myRole = 'O';
    gameModeBadge.textContent = `Online vs ${activeChallengeData.fromName}`;
    
    const initialBoardStates = Array(9).fill().map(() => Array(9).fill(''));
    const initialBoardWins = Array(9).fill(null);

    const matchRef = window.dbRef(window.db, 'matches/' + currentMatchId);
    window.dbSet(matchRef, {
        boardStates: initialBoardStates,
        boardWins: initialBoardWins,
        activeBoardIndex: null,
        currentPlayer: 'X',
        status: 'playing'
    });

    window.dbRemove(window.dbRef(window.db, 'challenges/' + playerId));

    boardStates = initialBoardStates;
    boardWins = initialBoardWins;
    activeBoardIndex = null;
    currentPlayer = 'X';
    renderBoard();
    updateStatus();

    listenToMatch(currentMatchId);
};

rejectChallengeBtn.onclick = () => {
    playSound('click');
    challengeModal.style.display = 'none';
    if (activeChallengeData) {
        window.dbRemove(window.dbRef(window.db, 'challenges/' + playerId));
    }
};

function padBoardRow(row) {
    const cells = Array.isArray(row)
        ? row
        : (row && typeof row === 'object' ? Object.values(row) : []);
    const padded = [];
    for (let i = 0; i < 9; i++) {
        padded[i] = cells[i] == null ? '' : cells[i];
    }
    return padded;
}

function sanitizeBoardStates(arr) {
    const source = !arr ? [] : (Array.isArray(arr) ? arr : Object.values(arr));
    const boards = [];
    for (let b = 0; b < 9; b++) {
        boards[b] = padBoardRow(source[b]);
    }
    return boards;
}

function sanitizeBoardWins(arr) {
    const source = !arr ? [] : (Array.isArray(arr) ? arr : Object.values(arr));
    const wins = [];
    for (let b = 0; b < 9; b++) {
        wins[b] = source[b] == null ? null : source[b];
    }
    return wins;
}

function listenToMatch(matchId) {
    if (activeMatchUnsubscribe) {
        activeMatchUnsubscribe();
    }
    const matchRef = window.dbRef(window.db, 'matches/' + matchId);
    activeMatchUnsubscribe = window.dbOnValue(matchRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            boardStates = sanitizeBoardStates(data.boardStates);
            boardWins = sanitizeBoardWins(data.boardWins);
            activeBoardIndex = data.activeBoardIndex !== undefined ? data.activeBoardIndex : null;
            currentPlayer = data.currentPlayer || 'X';
            
            if (data.status === 'playing') {
                mainMenu.style.display = 'none';
                onlineLobbyModal.style.display = 'none';
                challengeModal.style.display = 'none';
                aiDifficultyModal.style.display = 'none';
                gameMode = 'online-p2p';
                renderBoard();
                updateStatus();
            }
        }
    });
}

pveMenuBtn.addEventListener('click', () => { playSound('click'); aiDifficultyModal.style.display = 'flex'; });
cancelAiModalBtn.addEventListener('click', () => { playSound('click'); aiDifficultyModal.style.display = 'none'; });

document.querySelectorAll('.ai-diff-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        playSound('click');
        aiDifficulty = e.target.getAttribute('data-level');
        gameMode = 'pve';
        gameModeBadge.textContent = `vs AI (${aiDifficulty.toUpperCase()})`;
        aiDifficultyModal.style.display = 'none';
        mainMenu.style.display = 'none';
        initGame();
    });
});

homeBtn.addEventListener('click', () => { 
    playSound('click'); 
    mainMenu.style.display = 'flex'; 
});

function initGame() {
    currentPlayer = 'X';
    activeBoardIndex = null;
    boardWins = Array(9).fill(null);
    boardStates = Array(9).fill().map(() => Array(9).fill(''));
    victoryModal.style.display = 'none';
    renderBoard();
    updateStatus();
}

function renderBoard() {
    ultimateBoard.innerHTML = '';
    for (let b = 0; b < 9; b++) {
        const localBoardDiv = document.createElement('div');
        localBoardDiv.className = 'local-grid local-board-bg p-2 rounded-xl border-2 transition-all relative overflow-hidden';
        const isBoardActive = (activeBoardIndex === null || activeBoardIndex === b);
        
        if (boardWins[b]) {
            localBoardDiv.className += ' border-opacity-40 opacity-90';
            const overlay = document.createElement('div');
            overlay.className = 'absolute inset-0 overlay-bg flex items-center justify-center font-black text-5xl z-10';
            overlay.textContent = boardWins[b];
            localBoardDiv.appendChild(overlay);
        } else if (isBoardActive) {
            localBoardDiv.className += ' active-local-board shadow-[0_0_15px_rgba(59,130,246,0.3)]';
        } else {
            localBoardDiv.className += ' opacity-40';
        }

        for (let c = 0; c < 9; c++) {
            const cellBtn = document.createElement('button');
            cellBtn.className = 'cell-btn aspect-square rounded-md font-bold text-lg md:text-xl flex items-center justify-center transition-all';
            cellBtn.textContent = boardStates[b] && boardStates[b][c] ? boardStates[b][c] : '';

            if ((boardStates[b] && boardStates[b][c] !== '') || !isBoardActive || boardWins[b]) {
                cellBtn.disabled = true;
            } else {
                cellBtn.addEventListener('click', () => {
                    playSound('click');
                    handleCellClick(b, c);
                });
            }
            localBoardDiv.appendChild(cellBtn);
        }
        ultimateBoard.appendChild(localBoardDiv);
    }
}

function handleCellClick(bIndex, cIndex) {
    if (gameMode === 'online-p2p' && currentPlayer !== myRole) return;
    if (!boardStates[bIndex] || boardStates[bIndex][cIndex] !== '' || boardWins[bIndex] !== null) return;

    boardStates[bIndex][cIndex] = currentPlayer;

    if (checkSmallWin(boardStates[bIndex])) {
        boardWins[bIndex] = currentPlayer;
    } else if (boardStates[bIndex].every(cell => cell !== '')) {
        boardWins[bIndex] = 'DRAW';
    }

    const matchWon = checkUltimateWin();
    if (!matchWon) {
        activeBoardIndex = (boardWins[cIndex] !== null) ? null : cIndex;
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    }

    if (gameMode === 'online-p2p' && currentMatchId) {
        const matchRef = window.dbRef(window.db, 'matches/' + currentMatchId);
        window.dbUpdate(matchRef, {
            boardStates: boardStates,
            boardWins: boardWins,
            activeBoardIndex: activeBoardIndex,
            currentPlayer: currentPlayer,
            status: matchWon ? 'finished' : 'playing'
        });
    }

    if (matchWon) {
        handleMatchEnd(currentPlayer);
        return;
    }

    renderBoard();
    updateStatus();

    if (gameMode === 'pve' && currentPlayer === 'O') {
        setTimeout(makeAiMove, 600);
    }
}

function makeAiMove() {
    let targetBoards = [];
    if (activeBoardIndex === null || boardWins[activeBoardIndex] !== null) {
        for (let i = 0; i < 9; i++) if (boardWins[i] === null) targetBoards.push(i);
    } else {
        targetBoards.push(activeBoardIndex);
    }
    if (targetBoards.length === 0) return;
    let b = targetBoards[Math.floor(Math.random() * targetBoards.length)];
    let empty = [];
    for (let c = 0; c < 9; c++) if (boardStates[b][c] === '') empty.push(c);
    if (empty.length > 0) {
        let c = empty[Math.floor(Math.random() * empty.length)];
        playSound('click');
        handleCellClick(b, c);
    }
}

function checkSmallWin(cells) {
    if (!cells) return false;
    const wins = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
    return wins.some(([x,y,z]) => cells[x] && cells[x] === cells[y] && cells[x] === cells[z]);
}

function checkUltimateWin() {
    const wins = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
    return wins.some(([x,y,z]) => boardWins[x] && boardWins[x] !== 'DRAW' && boardWins[x] === boardWins[y] && boardWins[x] === boardWins[z]);
}

function handleMatchEnd(winner) {
    playSound('win');
    scores[winner]++;
    scoreXEl.textContent = scores.X;
    scoreOEl.textContent = scores.O;
    stats.total++;
    
    if(winner === 'X') { 
        stats.wins++; 
        userArenaPoints += 3; 
    } else { 
        stats.losses++; 
        userArenaPoints = Math.max(0, userArenaPoints - 1); 
    }
    
    localStorage.setItem('ultimate_points', userArenaPoints);
    localStorage.setItem('ultimate_stats', JSON.stringify(stats));
    
    if (window.db) {
        window.dbUpdate(window.dbRef(window.db, 'players/' + playerId), { points: userArenaPoints });
    }

    victoryTitle.textContent = `${winner} WINS THE MATCH! (+3 pts)`;
    victoryModal.style.display = 'flex';
    nextRoundBtn.onclick = initGame;
}

function updateStatus() {
    turnIndicator.textContent = `Turn: ${currentPlayer}`;
}

resetBtn.addEventListener('click', () => { playSound('click'); initGame(); });
whenFirebaseReady(checkPlayerName);
initGame();