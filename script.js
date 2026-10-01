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
const turnIndicator = document.getElementById('turnIndicator');
const resetBtn = document.getElementById('resetBtn');
const scoreXEl = document.getElementById('scoreX');
const scoreOEl = document.getElementById('scoreO');

const themeSelector = document.getElementById('themeSelector');
const htmlRoot = document.getElementById('htmlRoot');

const victoryModal = document.getElementById('victoryModal');
const victoryTitle = document.getElementById('victoryTitle');
const victoryText = document.getElementById('victoryText');
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

const rematchModal = document.getElementById('rematchModal');
const acceptRematchBtn = document.getElementById('acceptRematchBtn');
const rejectRematchBtn = document.getElementById('rejectRematchBtn');

const statsModal = document.getElementById('statsModal');
const statsMenuBtn = document.getElementById('statsMenuBtn');
const closeStatsBtn = document.getElementById('closeStatsBtn');
const statPoints = document.getElementById('statPoints');
const statTotal = document.getElementById('statTotal');

const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const matchFormatSelect = document.getElementById('matchFormatSelect');

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
        <h3 class="font-bold text-xs mb-2 brand-title uppercase tracking-wider">🏆 Global Arena Leaderboard</h3>
        <div id="leaderboardList" class="flex flex-col gap-1.5 max-h-36 overflow-y-auto sub-box p-2 rounded-xl border text-xs">
            <p class="text-center opacity-50 py-2">Loading leaderboard...</p>
        </div>
    `;
    statsModal.querySelector('.modal-box').appendChild(lbContainer);
    leaderboardList = document.getElementById('leaderboardList');
}

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

let currentMatchId = localStorage.getItem('ultimate_match_id') || null;
let myRole = localStorage.getItem('ultimate_my_role') || 'X';
let opponentName = 'Opponent';
let activeMatchUnsubscribe = null;
let activeChallengeRef = null;
let myChallengeStatusListener = null;

let currentFormat = '1';
let targetWins = 1;

htmlRoot.className = currentTheme;
themeSelector.value = currentTheme;

themeSelector.addEventListener('change', (e) => {
    playSound('click');
    currentTheme = e.target.value;
    htmlRoot.className = currentTheme;
    localStorage.setItem('ultimate_theme', currentTheme);
});

function getTargetWins(formatStr) {
    if (formatStr === '3') return 2;
    if (formatStr === '5') return 3;
    if (formatStr === 'infinity') return Infinity;
    return 1;
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


// --- الجزء الأهم: نظام الاتصال الذكي اللي بيعالج التقطيع والريفرش ---
function setupPresence() {
    if (!window.db) return;
    const connectedRef = window.dbRef(window.db, ".info/connected");
    window.dbOnValue(connectedRef, (snap) => {
        if (snap.val() === true && playerName) {
            // كل ما النت يشبك أو المتصفح يعمل ريفرش، بيرجع يسجلك أونلاين فوراً
            registerOnlinePresence(gameMode === 'online-p2p' ? 'in-game' : 'online');
        }
    });
}

function registerOnlinePresence(status = 'online') {
    if (!window.db || !playerName) return;
    const userRef = window.dbRef(window.db, 'players/' + playerId);
    
    // تأكيد إنك هتمسح بياناتك لو قفلت الصفحة
    window.dbOnDisconnect(userRef).remove().then(() => {
        window.dbSet(userRef, { 
            name: playerName, 
            points: userArenaPoints, 
            status: status, 
            lastActive: Date.now() 
        });
    });

    if (!activeChallengeRef) {
        const challengeRef = window.dbRef(window.db, 'challenges/' + playerId);
        activeChallengeRef = window.dbOnValue(challengeRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.status === 'pending') {
                showIncomingChallenge(data);
            }
        });
    }
}
// ------------------------------------------------------------


function checkPlayerName() {
    if (!playerName) {
        nameModal.style.display = 'flex';
        mainMenu.style.display = 'flex';
    } else {
        nameModal.style.display = 'none';
        menuUsername.textContent = playerName;
        userPoints.textContent = userArenaPoints;
        registerOnlinePresence();

        if (currentMatchId) {
            gameMode = 'online-p2p';
            mainMenu.style.display = 'none';
            leaveRoomBtn.classList.remove('hidden');
            listenToMatch(currentMatchId);
        } else {
            mainMenu.style.display = 'flex';
        }
    }
}

saveNameBtn.addEventListener('click', () => {
    playSound('click');
    const name = playerNameInput.value.trim();
    if (name) {
        playerName = name;
        localStorage.setItem('ultimate_player_name', playerName);
        nameModal.style.display = 'none';
        mainMenu.style.display = 'flex';
        menuUsername.textContent = playerName;
        userPoints.textContent = userArenaPoints;
        registerOnlinePresence();
    } else {
        alert('Please enter your name!');
    }
});

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
            row.innerHTML = `<span>#${index + 1} ${p.name}</span> <span class="font-bold brand-title">${p.points || 0} pts</span>`;
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
            let p = players[id];
            
            let div = document.createElement('div');
            div.className = 'sub-box p-2.5 rounded-xl border flex justify-between items-center text-xs font-bold';
            
            if (p.status === 'in-game') {
                div.innerHTML = `<span>🔴 ${p.name}</span> <span class="text-rose-400 text-[10px] px-2 py-1 rounded bg-rose-950/40 border border-rose-800/50">In Match 🎮</span>`;
            } else {
                count++;
                div.innerHTML = `<span>🟢 ${p.name}</span> <button class="action-btn px-3 py-1 rounded-lg text-xs">Challenge</button>`;
                div.querySelector('button').addEventListener('click', () => sendChallenge(id, p.name));
            }
            onlinePlayersList.appendChild(div);
        });

        if (count === 0 && onlinePlayersList.children.length === 0) {
            onlinePlayersList.innerHTML = '<p class="text-xs text-center opacity-50 py-4">No other available players online.</p>';
        }
    });
}

function sendChallenge(targetId, targetName) {
    playSound('click');
    myRole = 'X';
    opponentName = targetName;
    currentMatchId = playerId < targetId ? playerId + '_' + targetId : targetId + '_' + playerId;
    
    localStorage.setItem('ultimate_match_id', currentMatchId);
    localStorage.setItem('ultimate_my_role', myRole);

    const selectedFormat = matchFormatSelect.value;
    const initialBoardStates = Array(9).fill().map(() => Array(9).fill(''));
    const initialBoardWins = Array(9).fill(null);

    const matchRef = window.dbRef(window.db, 'matches/' + currentMatchId);
    window.dbSet(matchRef, {
        boardStates: initialBoardStates,
        boardWins: initialBoardWins,
        activeBoardIndex: null,
        currentPlayer: 'X',
        status: 'waiting',
        format: selectedFormat,
        matchScores: { X: 0, O: 0 },
        playerNames: { X: playerName, O: targetName }
    });

    const targetChallengeRef = window.dbRef(window.db, 'challenges/' + targetId);
    window.dbSet(targetChallengeRef, { 
        fromId: playerId, 
        fromName: playerName, 
        matchId: currentMatchId, 
        status: 'pending',
        format: selectedFormat 
    });

    onlineLobbyModal.style.display = 'none';
    challengeTitle.textContent = `Waiting for ${targetName}...`;
    challengeText.textContent = `Challenge sent! Waiting for them to accept.`;
    document.getElementById('challengeActionButtons').style.display = 'none';
    challengeModal.style.display = 'flex';
    gameModeBadge.textContent = `Online vs ${targetName}`;

    if (myChallengeStatusListener) {
        myChallengeStatusListener();
    }
    myChallengeStatusListener = window.dbOnValue(targetChallengeRef, (snap) => {
        const data = snap.val();
        if (data && data.status === 'declined') {
            alert(`${targetName} declined your challenge.`);
            challengeModal.style.display = 'none';
            onlineLobbyModal.style.display = 'flex';
            window.dbRemove(window.dbRef(window.db, 'matches/' + currentMatchId));
            if (myChallengeStatusListener) {
                myChallengeStatusListener();
                myChallengeStatusListener = null;
            }
        }
    });

    listenToMatch(currentMatchId);
}

let activeChallengeData = null;

function showIncomingChallenge(data) {
    activeChallengeData = data;
    currentMatchId = data.matchId;
    opponentName = data.fromName;
    
    let formatLabel = data.format === '3' ? 'Best of 3' : data.format === '5' ? 'Best of 5' : data.format === 'infinity' ? 'Endless' : 'Single Match';
    
    challengeTitle.textContent = `Challenge from ${data.fromName}!`;
    challengeText.textContent = `${data.fromName} wants to play a [${formatLabel}] Cup with you.`;
    document.getElementById('challengeActionButtons').style.display = 'flex';
    challengeModal.style.display = 'flex';
}

acceptChallengeBtn.onclick = () => {
    playSound('click');
    challengeModal.style.display = 'none';
    onlineLobbyModal.style.display = 'none';
    mainMenu.style.display = 'none';
    leaveRoomBtn.classList.remove('hidden');
    
    gameMode = 'online-p2p';
    myRole = 'O';
    localStorage.setItem('ultimate_match_id', currentMatchId);
    localStorage.setItem('ultimate_my_role', myRole);
    gameModeBadge.textContent = `Online vs ${opponentName}`;
    
    registerOnlinePresence('in-game');

    const matchRef = window.dbRef(window.db, 'matches/' + currentMatchId);
    window.dbUpdate(matchRef, {
        status: 'playing',
        ['playerNames/O']: playerName
    });

    window.dbRemove(window.dbRef(window.db, 'challenges/' + playerId));
    listenToMatch(currentMatchId);
};

rejectChallengeBtn.onclick = () => {
    playSound('click');
    challengeModal.style.display = 'none';
    if (activeChallengeData) {
        const ref = window.dbRef(window.db, 'challenges/' + playerId);
        window.dbUpdate(ref, { status: 'declined' });
        setTimeout(() => window.dbRemove(ref), 3000);
    }
};

leaveRoomBtn.addEventListener('click', () => {
    playSound('click');
    if (confirm('Are you sure you want to leave the current match room?')) {
        leaveRoom();
    }
});

function leaveRoom() {
    if (currentMatchId && window.db) {
        window.dbRemove(window.dbRef(window.db, 'matches/' + currentMatchId));
    }
    localStorage.removeItem('ultimate_match_id');
    localStorage.removeItem('ultimate_my_role');
    currentMatchId = null;
    leaveRoomBtn.classList.add('hidden');
    registerOnlinePresence('online');
    gameMode = 'pve';
    gameModeBadge.textContent = 'Offline Mode';
    mainMenu.style.display = 'flex';
    initGame();
}

function requestRestart() {
    playSound('click');
    if (gameMode === 'online-p2p' && currentMatchId && window.db) {
        const matchRef = window.dbRef(window.db, `matches/${currentMatchId}/rematch`);
        window.dbSet(matchRef, { from: myRole, status: 'pending' });
        resetBtn.textContent = 'Wait...';
        nextRoundBtn.textContent = 'Waiting...';
    } else {
        scores = { X: 0, O: 0 };
        initGame();
    }
}

acceptRematchBtn.onclick = () => {
    playSound('click');
    rematchModal.style.display = 'none';
    const matchRef = window.dbRef(window.db, 'matches/' + currentMatchId);
    window.dbUpdate(matchRef, {
        boardStates: Array(9).fill().map(() => Array(9).fill('')),
        boardWins: Array(9).fill(null),
        activeBoardIndex: null,
        currentPlayer: 'X',
        winnerData: null,
        rematch: null
    });
};

rejectRematchBtn.onclick = () => {
    playSound('click');
    rematchModal.style.display = 'none';
    window.dbUpdate(window.dbRef(window.db, `matches/${currentMatchId}/rematch`), { status: 'declined', from: myRole });
};

function sanitizeBoardStates(data) {
    let clean = Array(9).fill().map(() => Array(9).fill(''));
    if (!data) return clean;
    for (let i = 0; i < 9; i++) {
        if (data[i]) {
            for (let j = 0; j < 9; j++) {
                clean[i][j] = data[i][j] ? data[i][j] : '';
            }
        }
    }
    return clean;
}

function sanitizeBoardWins(data) {
    let clean = Array(9).fill(null);
    if (!data) return clean;
    for (let i = 0; i < 9; i++) {
        clean[i] = (data[i] && data[i] !== '') ? data[i] : null;
    }
    return clean;
}

function listenToMatch(matchId) {
    if (activeMatchUnsubscribe) {
        activeMatchUnsubscribe();
    }
    const matchRef = window.dbRef(window.db, 'matches/' + matchId);
    activeMatchUnsubscribe = window.dbOnValue(matchRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            currentFormat = data.format || '1';
            targetWins = getTargetWins(currentFormat);
            
            scores = data.matchScores || { X: 0, O: 0 };
            scoreXEl.textContent = scores.X;
            scoreOEl.textContent = scores.O;

            if (data.playerNames) {
                opponentName = myRole === 'X' ? (data.playerNames.O || 'Opponent') : (data.playerNames.X || 'Opponent');
                gameModeBadge.textContent = `Online vs ${opponentName}`;
            }

            boardStates = sanitizeBoardStates(data.boardStates);
            boardWins = sanitizeBoardWins(data.boardWins);
            activeBoardIndex = data.activeBoardIndex !== undefined ? data.activeBoardIndex : null;
            currentPlayer = data.currentPlayer || 'X';
            
            const isBoardReset = boardWins.every(win => win === null);
            if (isBoardReset) {
                victoryModal.style.display = 'none';
            }

            if (data.winnerData) {
                showEndModal(data.winnerData.winnerRole, data.winnerData.winnerName, data.winnerData.isCupWin);
            }
            
            if (data.rematch) {
                if (data.rematch.status === 'pending' && data.rematch.from !== myRole) {
                    rematchModal.style.display = 'flex';
                } else if (data.rematch.status === 'declined' && data.rematch.from !== myRole) {
                    alert('Opponent declined the rematch request.');
                    resetBtn.textContent = 'Restart';
                    nextRoundBtn.textContent = 'Play Again';
                    window.dbUpdate(matchRef, { rematch: null }); 
                }
            } else {
                rematchModal.style.display = 'none';
                resetBtn.textContent = 'Restart';
                nextRoundBtn.textContent = 'Play Again';
            }

            if (data.status === 'playing') {
                if (myChallengeStatusListener) {
                    myChallengeStatusListener();
                    myChallengeStatusListener = null;
                }
                mainMenu.style.display = 'none';
                onlineLobbyModal.style.display = 'none';
                challengeModal.style.display = 'none';
                aiDifficultyModal.style.display = 'none';
                gameMode = 'online-p2p';
                leaveRoomBtn.classList.remove('hidden');
                registerOnlinePresence('in-game');
                renderBoard();
                updateStatus();
            }
        } else {
            alert('The room has been closed by the opponent.');
            leaveRoom();
        }
    });
}

pveMenuBtn.addEventListener('click', () => { 
    playSound('click'); 
    aiDifficultyModal.style.display = 'flex'; 
});
cancelAiModalBtn.addEventListener('click', () => { playSound('click'); aiDifficultyModal.style.display = 'none'; });

document.querySelectorAll('.ai-diff-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        playSound('click');
        aiDifficulty = e.target.getAttribute('data-level');
        gameMode = 'pve';
        gameModeBadge.textContent = `vs AI (${aiDifficulty.toUpperCase()})`;
        
        currentFormat = matchFormatSelect.value;
        targetWins = getTargetWins(currentFormat);
        scores = { X: 0, O: 0 };
        
        aiDifficultyModal.style.display = 'none';
        mainMenu.style.display = 'none';
        initGame();
    });
});

homeBtn.addEventListener('click', () => { 
    playSound('click'); 
    if (gameMode === 'online-p2p' && currentMatchId) {
        if (confirm('Going to menu will keep your room active. Leave room completely?')) {
            leaveRoom();
        } else {
            mainMenu.style.display = 'flex';
        }
    } else {
        mainMenu.style.display = 'flex'; 
    }
});

function initGame() {
    currentPlayer = 'X';
    activeBoardIndex = null;
    boardWins = Array(9).fill(null);
    boardStates = Array(9).fill().map(() => Array(9).fill(''));
    victoryModal.style.display = 'none';
    
    scoreXEl.textContent = scores.X;
    scoreOEl.textContent = scores.O;

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
            if (gameMode === 'online-p2p') {
                if (currentPlayer === myRole) {
                    localBoardDiv.className += ' my-turn-local';
                } else {
                    localBoardDiv.className += ' waiting-local opacity-60';
                }
            } else {
                localBoardDiv.className += ' active-local-board';
            }
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

    if (checkUltimateWin()) {
        handleMatchEnd(currentPlayer);
        return;
    }

    activeBoardIndex = (boardWins[cIndex] !== null) ? null : cIndex;
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';

    if (gameMode === 'online-p2p' && currentMatchId) {
        const matchRef = window.dbRef(window.db, 'matches/' + currentMatchId);
        window.dbUpdate(matchRef, {
            boardStates: boardStates,
            boardWins: boardWins,
            activeBoardIndex: activeBoardIndex,
            currentPlayer: currentPlayer
        });
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

function handleMatchEnd(winnerRole) {
    playSound('win');
    scores[winnerRole]++;
    scoreXEl.textContent = scores.X;
    scoreOEl.textContent = scores.O;
    stats.total++;
    
    let winnerName = (gameMode === 'online-p2p') ? (winnerRole === myRole ? playerName : opponentName) : `Player ${winnerRole}`;

    if(winnerRole === 'X') { 
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

    const isCupWin = scores[winnerRole] >= targetWins;

    if (gameMode === 'online-p2p' && currentMatchId && window.db) {
        const matchRef = window.dbRef(window.db, 'matches/' + currentMatchId);
        window.dbUpdate(matchRef, {
            matchScores: scores,
            winnerData: { winnerRole, winnerName, isCupWin }
        });
    } else {
        showEndModal(winnerRole, winnerName, isCupWin);
    }
}

function showEndModal(winnerRole, winnerName, isCupWin) {
    const isMe = (gameMode === 'online-p2p') ? (winnerRole === myRole) : (winnerRole === 'X');

    if (isCupWin) {
        victoryTitle.textContent = isMe ? `🏆 YOU WON THE CUP! 🏆` : `💔 ${winnerName} WON THE CUP! 💔`;
        victoryText.textContent = `Target: ${targetWins} Wins Reached!`;
        scores = { X: 0, O: 0 };
    } else {
        victoryTitle.textContent = isMe ? `🎉 YOU WON THE ROUND! 🎉` : `😢 YOU LOST! (${winnerName} Wins)`;
        victoryText.textContent = `Score updated. Next round ready!`;
    }

    victoryModal.style.display = 'flex';
    nextRoundBtn.onclick = requestRestart;
}

function updateStatus() {
    turnIndicator.textContent = currentPlayer;
}

resetBtn.addEventListener('click', () => { playSound('click'); requestRestart(); });

// -- الدالة الأساسية لتشغيل اللعبة بعد التأكد من الفايربيس --
function startApp() {
    setupPresence();
    checkPlayerName();
}

// حل مشكلة الريفرش والسباق مع الفايربيس
if (window.db) {
    startApp();
} else {
    window.addEventListener('firebase-ready', startApp);
}