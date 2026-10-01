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
    } else if (type === 'bell') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
    } else if (type === 'start') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(261.63, audioCtx.currentTime);
        osc.frequency.setValueAtTime(329.63, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(392.00, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    } else if (type === 'lose') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(150, audioCtx.currentTime + 0.4);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    }
}

// --- كود الخلفية المتحركة الشاملة (Canvas Background Animation للـ X و O) ---
const bgCanvas = document.getElementById('bgCanvas');
const bgCtx = bgCanvas.getContext('2d');
let bgParticles = [];

function resizeBgCanvas() {
    const dpr = window.devicePixelRatio || 1;
    bgCanvas.width = window.innerWidth * dpr;
    bgCanvas.height = window.innerHeight * dpr;
    bgCtx.scale(dpr, dpr);
}
window.addEventListener('resize', resizeBgCanvas);
resizeBgCanvas();

for (let i = 0; i < 35; i++) {
    bgParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.floor(Math.random() * 32) + 16,
        speedY: (Math.random() * 0.7) + 0.2,
        speedX: (Math.random() - 0.5) * 0.3,
        char: Math.random() > 0.5 ? 'X' : 'O',
        alpha: Math.random() * 0.3 + 0.1,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.012
    });
}

function animateBgCanvas() {
    bgCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor = computedStyle.getPropertyValue('--primary').trim() || '#06b6d4';

    bgParticles.forEach(p => {
        p.y -= p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotSpeed;

        if (p.y < -50) {
            p.y = window.innerHeight + 50;
            p.x = Math.random() * window.innerWidth;
        }

        bgCtx.save();
        bgCtx.translate(p.x, p.y);
        bgCtx.rotate(p.rotation);
        bgCtx.font = `bold ${p.size}px sans-serif`;
        bgCtx.fillStyle = primaryColor;
        bgCtx.globalAlpha = p.alpha;
        bgCtx.textAlign = 'center';
        bgCtx.textBaseline = 'middle';
        bgCtx.fillText(p.char, 0, 0);
        bgCtx.restore();
    });

    requestAnimationFrame(animateBgCanvas);
}
animateBgCanvas();

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
const acceptRematchBtn = document.getElementById('acceptRematchBtn');
const declineRematchBtn = document.getElementById('declineRematchBtn');

const nameModal = document.getElementById('nameModal');
const playerNameInput = document.getElementById('playerNameInput');
const playerPinInput = document.getElementById('playerPinInput');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authSwitchBtn = document.getElementById('authSwitchBtn');
const authModalTitle = document.getElementById('authModalTitle');
const authModalDesc = document.getElementById('authModalDesc');

const menuUsername = document.getElementById('menuUsername');
const userPoints = document.getElementById('userPoints');

const aiDifficultyModal = document.getElementById('aiDifficultyModal');
const pveMenuBtn = document.getElementById('pveMenuBtn');
const cancelAiModalBtn = document.getElementById('cancelAiModalBtn');

const onlineLobbyModal = document.getElementById('onlineLobbyModal');
const onlineLobbyMenuBtn = document.getElementById('onlineLobbyMenuBtn');
const closeOnlineLobbyBtn = document.getElementById('closeOnlineLobbyBtn');
const refreshLobbyBtn = document.getElementById('refreshLobbyBtn');
const onlinePlayersList = document.getElementById('onlinePlayersList');

const challengeModal = document.getElementById('challengeModal');
const challengeTitle = document.getElementById('challengeTitle');
const challengeText = document.getElementById('challengeText');
const acceptChallengeBtn = document.getElementById('acceptChallengeBtn');
const rejectChallengeBtn = document.getElementById('rejectChallengeBtn');
const cancelChallengeBtn = document.getElementById('cancelChallengeBtn');

const rulesModal = document.getElementById('rulesModal');
const menuRulesBtn = document.getElementById('menuRulesBtn');
const closeRulesBtn = document.getElementById('closeRulesBtn');

const statsModal = document.getElementById('statsModal');
const statsMenuBtn = document.getElementById('statsMenuBtn');
const closeStatsBtn = document.getElementById('closeStatsBtn');
const statPoints = document.getElementById('statPoints');
const statTotal = document.getElementById('statTotal');
const profileNameDisplay = document.getElementById('profileNameDisplay');
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
const logoutBtn = document.getElementById('logoutBtn');

const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const matchFormatSelect = document.getElementById('matchFormatSelect');

let customModal = document.createElement('div');
customModal.id = 'customModal';
customModal.className = 'fixed inset-0 bg-black/75 z-50 hidden items-center justify-center p-4 backdrop-blur-md';
customModal.innerHTML = `
    <div class="modal-box border p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl flex flex-col gap-4 relative z-10">
        <h2 id="customModalTitle" class="font-black text-xl text-cyan-400">Notice</h2>
        <p id="customModalText" class="text-sm text-slate-200 leading-relaxed"></p>
        <div id="customModalButtons" class="flex gap-2 mt-2">
            <button id="customModalOkBtn" class="w-full py-3 rounded-xl font-bold text-sm bg-cyan-600 text-white cursor-pointer">OK</button>
        </div>
    </div>
`;
document.body.appendChild(customModal);

function showCustomAlert(title, text, onClose = null) {
    playSound('click');
    document.getElementById('customModalTitle').textContent = title;
    document.getElementById('customModalText').textContent = text;
    let btnContainer = document.getElementById('customModalButtons');
    btnContainer.innerHTML = `<button id="customModalOkBtn" class="w-full py-3 rounded-xl font-bold text-sm bg-cyan-600 text-white cursor-pointer">OK</button>`;
    customModal.style.display = 'flex';
    document.getElementById('customModalOkBtn').onclick = () => {
        customModal.style.display = 'none';
        if (onClose) onClose();
    };
}

function showCustomConfirm(title, text, onConfirm, onCancel = null) {
    playSound('click');
    document.getElementById('customModalTitle').textContent = title;
    document.getElementById('customModalText').textContent = text;
    let btnContainer = document.getElementById('customModalButtons');
    btnContainer.innerHTML = `
        <button id="customModalConfirmBtn" class="w-full py-3 rounded-xl font-bold text-sm bg-cyan-600 text-white cursor-pointer">Yes, Confirm</button>
        <button id="customModalCancelBtn" class="w-full bg-rose-600 text-white font-bold py-3 rounded-xl text-sm cursor-pointer">Cancel</button>
    `;
    customModal.style.display = 'flex';
    document.getElementById('customModalConfirmBtn').onclick = () => {
        customModal.style.display = 'none';
        onConfirm();
    };
    document.getElementById('customModalCancelBtn').onclick = () => {
        customModal.style.display = 'none';
        if (onCancel) onCancel();
    };
}

menuRulesBtn.addEventListener('click', () => { playSound('click'); rulesModal.style.display = 'flex'; });
closeRulesBtn.addEventListener('click', () => { playSound('click'); rulesModal.style.display = 'none'; });

logoutBtn.addEventListener('click', () => {
    playSound('click');
    showCustomConfirm('Logout', 'Are you sure you want to sign out?', async () => {
        if (window.db && playerId) {
            try {
                await window.dbUpdate(window.dbRef(window.db, 'players/' + playerId), { status: 'offline' });
            } catch (e) {
                console.log(e);
            }
        }
        localStorage.clear();
        location.reload();
    });
});

deleteAccountBtn.addEventListener('click', () => {
    playSound('click');
    showCustomConfirm('Delete Account', 'Are you sure you want to delete your account permanently?', async () => {
        if (window.db && playerId) {
            try {
                await window.dbRemove(window.dbRef(window.db, 'players/' + playerId));
                await window.dbRemove(window.dbRef(window.db, 'challenges/' + playerId));
            } catch (e) {
                console.log(e);
            }
        }
        localStorage.clear();
        showCustomAlert('Account Deleted', 'Your account has been wiped from the server. Page will reload.', () => location.reload());
    });
});

let leaderboardList = document.getElementById('leaderboardList');
if (!leaderboardList && statsModal) {
    let lbContainer = document.createElement('div');
    lbContainer.className = 'mt-4 text-left';
    lbContainer.innerHTML = `
        <h3 class="font-bold text-xs mb-2 text-cyan-400 uppercase tracking-wider">🏆 Global Arena Leaderboard</h3>
        <div id="leaderboardList" class="flex flex-col gap-1.5 max-h-36 overflow-y-auto bg-black/50 p-2.5 rounded-xl border border-white/10 text-xs">
            <p class="text-center text-slate-400 py-2">Loading leaderboard...</p>
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

let playerName = '';
let playerPin = '';
let playerId = null;
let clientSessionId = 's_' + Math.random().toString(36).substring(2, 9);

let userArenaPoints = 10;
let stats = { total: 0, wins: 0, losses: 0 };
let scores = { X: 0, O: 0 };
let currentTheme = localStorage.getItem('ultimate_theme') || 'theme-cyberpunk';

let currentMatchId = null;
let myRole = 'X';
let opponentName = 'Opponent';
let activeMatchUnsubscribe = null;
let activeChallengeRef = null;
let myChallengeStatusListener = null;
let sessionListenerRef = null;

let currentFormat = '1';
let targetWins = 1;

htmlRoot.className = currentTheme;
themeSelector.value = currentTheme;

themeSelector.addEventListener('change', (e) => {
    playSound('click');
    currentTheme = e.target.value;
    htmlRoot.className = currentTheme;
    localStorage.setItem('ultimate_theme', currentTheme);
    if (window.db && playerId) {
        window.dbUpdate(window.dbRef(window.db, 'players/' + playerId), { theme: currentTheme });
    }
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
        profileNameDisplay.textContent = playerName;
        statPoints.textContent = userArenaPoints;
        statTotal.textContent = stats.total;
        fetchGlobalLeaderboard();
        statsModal.style.display = 'flex';
    });
}

if (closeStatsBtn) {
    closeStatsBtn.addEventListener('click', () => { playSound('click'); statsModal.style.display = 'none'; });
}

function setupPresence() {
    if (!window.db) return;
    const connectedRef = window.dbRef(window.db, ".info/connected");
    window.dbOnValue(connectedRef, (snap) => {
        if (snap.val() === true && playerName && playerId) {
            registerOnlinePresence(gameMode === 'online-p2p' ? 'in-game' : 'online');
        }
    });
}

function registerOnlinePresence(status = 'online') {
    if (!window.db || !playerName || !playerId) return;
    const userRef = window.dbRef(window.db, 'players/' + playerId);
    
    window.dbOnDisconnect(userRef).update({ 
        status: 'offline',
        lastActive: Date.now() 
    }).then(() => {
        window.dbSet(userRef, { 
            name: playerName, 
            pin: playerPin,
            points: userArenaPoints, 
            status: status,
            theme: currentTheme,
            currentSessionId: clientSessionId,
            lastActive: Date.now() 
        });
    });

    if (sessionListenerRef) sessionListenerRef();
    sessionListenerRef = window.dbOnValue(window.dbRef(window.db, 'players/' + playerId + '/currentSessionId'), (snap) => {
        const remoteSession = snap.val();
        if (remoteSession && remoteSession !== clientSessionId) {
            showCustomAlert('Session Terminated', '⚠️ تم تسجيل الدخول بهذا الحساب من جهاز آخر!', () => {
                location.reload();
            });
        }
    });

    if (!activeChallengeRef) {
        const challengeRef = window.dbRef(window.db, 'challenges/' + playerId);
        activeChallengeRef = window.dbOnValue(challengeRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.status === 'pending') {
                playSound('bell');
                showIncomingChallenge(data);
            } else if (data && data.status === 'cancelled') {
                challengeModal.style.display = 'none';
                showCustomAlert('Challenge Cancelled', 'The challenge was cancelled by the sender.');
                window.dbRemove(challengeRef);
            }
        });
    }
}

let isRegisterMode = false;

authSwitchBtn.addEventListener('click', () => {
    playSound('click');
    isRegisterMode = !isRegisterMode;
    if (isRegisterMode) {
        authModalTitle.textContent = 'Create Account';
        authModalDesc.textContent = 'Choose lowercase username (no spaces) & 4-digit PIN:';
        authSubmitBtn.textContent = 'Register';
        authSwitchBtn.textContent = 'Already have an account? Login';
    } else {
        authModalTitle.textContent = 'Player Login';
        authModalDesc.textContent = 'Enter your lowercase username (no spaces) and 4-digit PIN:';
        authSubmitBtn.textContent = 'Login';
        authSwitchBtn.textContent = "Don't have an account? Create one";
    }
});

authSubmitBtn.addEventListener('click', async () => {
    playSound('click');
    let name = playerNameInput.value.toLowerCase().replace(/\s+/g, '');
    let pin = playerPinInput.value.trim();

    if (!name || pin.length !== 4 || isNaN(pin)) {
        showCustomAlert('Error', 'Please enter a valid lowercase name (no spaces) and a 4-digit numeric PIN!');
        return;
    }

    if (!window.db) {
        showCustomAlert('Error', 'Database connecting... Please wait a second.');
        return;
    }

    const playersRef = window.dbRef(window.db, 'players');
    const snapshot = await window.dbGet(playersRef);

    if (isRegisterMode) {
        let exists = false;
        if (snapshot.exists()) {
            snapshot.forEach(childSnap => {
                if (childSnap.val().name === name) {
                    exists = true;
                }
            });
        }

        if (exists) {
            showCustomAlert('Error', 'Username already taken! Please login or choose another name.');
            return;
        }

        playerId = 'p_' + Math.random().toString(36).substring(2, 9);
        playerName = name;
        playerPin = pin;
        userArenaPoints = 10;
        stats = { total: 0, wins: 0, losses: 0 };

        nameModal.style.display = 'none';
        mainMenu.style.display = 'flex';
        menuUsername.textContent = playerName;
        userPoints.textContent = userArenaPoints;
        registerOnlinePresence();
        initGame();
    } else {
        let matchedUser = null;
        let matchedId = null;

        if (snapshot.exists()) {
            snapshot.forEach(childSnap => {
                let u = childSnap.val();
                if (u.name === name && u.pin === pin) {
                    matchedUser = u;
                    matchedId = childSnap.key;
                }
            });
        }

        if (!matchedUser) {
            showCustomAlert('Login Failed', 'Invalid username or 4-digit PIN! If new, click "Create one" below.');
            return;
        }

        playerId = matchedId;
        playerName = matchedUser.name;
        playerPin = matchedUser.pin;
        userArenaPoints = matchedUser.points || 10;

        nameModal.style.display = 'none';
        menuUsername.textContent = playerName;
        userPoints.textContent = userArenaPoints;
        registerOnlinePresence();

        mainMenu.style.display = 'flex';
        initGame();
    }
});

function checkPlayerName() {
    nameModal.style.display = 'flex';
    mainMenu.style.display = 'flex';
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
            row.className = 'flex justify-between items-center py-1.5 px-2.5 border-b border-white/10 last:border-none';
            row.innerHTML = `<span>#${index + 1} ${p.name}</span> <span class="font-bold text-cyan-400">${p.points || 0} pts</span>`;
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

refreshLobbyBtn.addEventListener('click', () => {
    playSound('click');
    fetchOnlinePlayers();
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
            div.className = 'bg-black/40 p-3 rounded-2xl border border-white/10 flex justify-between items-center text-xs font-bold';
            
            if (p.status === 'in-game') {
                div.innerHTML = `<span>🔴 ${p.name}</span> <span class="text-rose-400 text-[10px] px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-800/50">In Match 🎮</span>`;
            } else {
                count++;
                div.innerHTML = `<span>🟢 ${p.name}</span> <button class="bg-cyan-600 hover:bg-cyan-500 px-3.5 py-1.5 rounded-xl text-xs text-white shadow cursor-pointer">Challenge</button>`;
                div.querySelector('button').addEventListener('click', () => sendChallenge(id, p.name));
            }
            onlinePlayersList.appendChild(div);
        });

        if (count === 0 && onlinePlayersList.children.length === 0) {
            onlinePlayersList.innerHTML = '<p class="text-xs text-center opacity-50 py-4">No other available players online.</p>';
        }
    });
}

let outgoingTargetId = null;

function sendChallenge(targetId, targetName) {
    playSound('bell');
    myRole = 'X';
    opponentName = targetName;
    outgoingTargetId = targetId;
    currentMatchId = playerId < targetId ? playerId + '_' + targetId : targetId + '_' + playerId;

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
    cancelChallengeBtn.classList.remove('hidden');
    challengeModal.style.display = 'flex';
    gameModeBadge.textContent = `Online vs ${targetName}`;

    if (myChallengeStatusListener) {
        myChallengeStatusListener();
    }
    myChallengeStatusListener = window.dbOnValue(targetChallengeRef, (snap) => {
        const data = snap.val();
        if (data && data.status === 'declined') {
            showCustomAlert('Challenge Declined', `${targetName} declined your challenge.`);
            challengeModal.style.display = 'none';
            cancelChallengeBtn.classList.add('hidden');
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

cancelChallengeBtn.onclick = () => {
    playSound('click');
    if (outgoingTargetId) {
        const targetChallengeRef = window.dbRef(window.db, 'challenges/' + outgoingTargetId);
        window.dbUpdate(targetChallengeRef, { status: 'cancelled' });
    }
    challengeModal.style.display = 'none';
    cancelChallengeBtn.classList.add('hidden');
    if (currentMatchId) {
        window.dbRemove(window.dbRef(window.db, 'matches/' + currentMatchId));
    }
    onlineLobbyModal.style.display = 'flex';
};

let activeChallengeData = null;

function showIncomingChallenge(data) {
    activeChallengeData = data;
    currentMatchId = data.matchId;
    opponentName = data.fromName;
    
    let formatLabel = data.format === '3' ? 'Best of 3' : data.format === '5' ? 'Best of 5' : data.format === 'infinity' ? 'Endless' : 'Single Match';
    
    challengeTitle.textContent = `Challenge from ${data.fromName}!`;
    challengeText.textContent = `${data.fromName} wants to play a [${formatLabel}] match with you.`;
    document.getElementById('challengeActionButtons').style.display = 'flex';
    cancelChallengeBtn.classList.add('hidden');
    challengeModal.style.display = 'flex';
}

acceptChallengeBtn.onclick = () => {
    playSound('start');
    challengeModal.style.display = 'none';
    onlineLobbyModal.style.display = 'none';
    mainMenu.style.display = 'none';
    leaveRoomBtn.classList.remove('hidden');
    
    gameMode = 'online-p2p';
    myRole = 'O';
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
    showCustomConfirm('Leave Room', 'Are you sure you want to leave? This will close the match room.', () => {
        leaveRoom();
    });
});

function leaveRoom() {
    if (currentMatchId && window.db) {
        window.dbRemove(window.dbRef(window.db, 'matches/' + currentMatchId));
    }
    currentMatchId = null;
    leaveRoomBtn.classList.add('hidden');
    registerOnlinePresence('online');
    gameMode = 'pve';
    gameModeBadge.textContent = 'Offline Mode';
    mainMenu.style.display = 'flex';
    initGame();
}

acceptRematchBtn.onclick = () => {
    playSound('click');
    acceptRematchBtn.textContent = '⏳ Waiting for Opponent...';
    acceptRematchBtn.disabled = true;

    if (gameMode === 'online-p2p' && currentMatchId && window.db) {
        const matchRef = window.dbRef(window.db, `matches/${currentMatchId}/postMatch`);
        window.dbUpdate(matchRef, { [myRole]: 'accepted' });
    } else {
        victoryModal.style.display = 'none';
        initGame();
    }
};

declineRematchBtn.onclick = () => {
    playSound('click');
    if (gameMode === 'online-p2p' && currentMatchId && window.db) {
        const matchRef = window.dbRef(window.db, `matches/${currentMatchId}/postMatch`);
        window.dbUpdate(matchRef, { [myRole]: 'declined' });
    } else {
        victoryModal.style.display = 'none';
        leaveRoom();
    }
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

let hasDeclinedAlertShown = false;

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
                acceptRematchBtn.textContent = '🤝 Play Again (Accept)';
                acceptRematchBtn.disabled = false;
                hasDeclinedAlertShown = false;
            }

            if (data.winnerData) {
                showEndModal(data.winnerData.winnerRole, data.winnerData.winnerName, data.winnerData.isCupWin);
            }

            if (data.postMatch) {
                let xVote = data.postMatch.X;
                let oVote = data.postMatch.O;

                if (xVote === 'accepted' && oVote === 'accepted') {
                    playSound('start');
                    let newScores = scores;
                    if (scores.X >= targetWins || scores.O >= targetWins) {
                        newScores = { X: 0, O: 0 };
                    }
                    if (myRole === 'X') {
                        window.dbUpdate(matchRef, {
                            boardStates: Array(9).fill().map(() => Array(9).fill('')),
                            boardWins: Array(9).fill(null),
                            activeBoardIndex: null,
                            currentPlayer: 'X',
                            winnerData: null,
                            postMatch: null,
                            matchScores: newScores
                        });
                    }
                } else if ((xVote === 'declined' || oVote === 'declined') && !hasDeclinedAlertShown) {
                    hasDeclinedAlertShown = true;
                    victoryModal.style.display = 'none';
                    showCustomAlert('Match Ended', 'تم إنهاء المباراة لأن أحد اللاعبين رفض إعادة اللعب.', () => {
                        leaveRoom();
                    });
                }
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
            if (gameMode === 'online-p2p' && !hasDeclinedAlertShown) {
                hasDeclinedAlertShown = true;
                showCustomAlert('Room Closed', 'انتهت الجلسة أو قام المنافس بمغادرة الغرفة.', () => {
                    leaveRoom();
                });
            }
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
        playSound('start');
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
        showCustomConfirm('Return to Menu', 'Going to menu will keep your room active. Leave room completely?', () => {
            leaveRoom();
        }, () => {
            mainMenu.style.display = 'flex';
        });
    } else {
        mainMenu.style.display = 'flex'; 
    }
});

// إصلاح زر الاستارت (Reset)
resetBtn.addEventListener('click', () => {
    playSound('click');
    if (gameMode === 'online-p2p' && currentMatchId) {
        const matchRef = window.dbRef(window.db, 'matches/' + currentMatchId);
        window.dbUpdate(matchRef, {
            boardStates: Array(9).fill().map(() => Array(9).fill('')),
            boardWins: Array(9).fill(null),
            activeBoardIndex: null,
            currentPlayer: 'X',
            winnerData: null
        });
    } else {
        initGame();
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
            cellBtn.className = 'cell-btn aspect-square rounded-md font-bold text-lg md:text-xl flex items-center justify-center transition-all cursor-pointer';
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

    const isGlobalDraw = boardWins.every(win => win !== null);
    if (isGlobalDraw) {
        handleMatchEnd('DRAW');
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
    const isMe = (gameMode === 'online-p2p') ? (winnerRole === myRole) : (winnerRole === 'X');
    if (winnerRole === 'DRAW' || isMe) {
        playSound('win');
    } else {
        playSound('lose');
    }

    stats.total++;
    
    let winnerName = 'No One';
    let isCupWin = false;

    if (winnerRole === 'DRAW') {
        userArenaPoints += 1;
    } else {
        scores[winnerRole]++;
        winnerName = (gameMode === 'online-p2p') ? (winnerRole === myRole ? playerName : opponentName) : `Player ${winnerRole}`;
        
        const isWin = (gameMode === 'online-p2p') ? (winnerRole === myRole) : (winnerRole === 'X');
        if (isWin) { 
            stats.wins++; 
            userArenaPoints += 3; 
        } else { 
            stats.losses++; 
            userArenaPoints = Math.max(0, userArenaPoints - 1); 
        }
        
        isCupWin = scores[winnerRole] >= targetWins;
    }
    
    scoreXEl.textContent = scores.X;
    scoreOEl.textContent = scores.O;
    
    if (window.db) {
        window.dbUpdate(window.dbRef(window.db, 'players/' + playerId), { points: userArenaPoints });
    }

    if (gameMode === 'online-p2p' && currentMatchId && window.db) {
        const matchRef = window.dbRef(window.db, 'matches/' + currentMatchId);
        window.dbUpdate(matchRef, {
            matchScores: scores,
            winnerData: { winnerRole, winnerName, isCupWin },
            postMatch: { X: 'pending', O: 'pending' }
        });
    } else {
        showEndModal(winnerRole, winnerName, isCupWin);
    }
}

function showEndModal(winnerRole, winnerName, isCupWin) {
    if (winnerRole === 'DRAW') {
        victoryTitle.textContent = `🤝 IT'S A DRAW! 🤝`;
        victoryText.textContent = `Both played well! (+1 pt)`;
    } else {
        const isMe = (gameMode === 'online-p2p') ? (winnerRole === myRole) : (winnerRole === 'X');

        if (isCupWin) {
            victoryTitle.textContent = isMe ? `🏆 YOU WON THE CUP! 🏆` : `💔 ${winnerName} WON THE CUP! 💔`;
            victoryText.textContent = `Target: ${targetWins} Wins Reached!`;
        } else {
            victoryTitle.textContent = isMe ? `🎉 YOU WON THE ROUND! 🎉` : `😢 YOU LOST! (${winnerName} Wins)`;
            victoryText.textContent = `Choose your action for the next match:`;
        }
    }

    victoryModal.style.display = 'flex';
}

function updateStatus() {
    turnIndicator.textContent = currentPlayer;
}

function startApp() {
    setupPresence();
    checkPlayerName();
}

if (window.db) {
    startApp();
} else {
    window.addEventListener('firebase-ready', startApp);
}