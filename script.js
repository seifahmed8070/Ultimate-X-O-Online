// ==========================================
// 1. Audio & Glowing X/O Canvas Background
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator(), gainNode = audioCtx.createGain();
    osc.connect(gainNode); gainNode.connect(audioCtx.destination);
    if (type === 'click') { 
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.08); 
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08); 
        osc.start(); osc.stop(audioCtx.currentTime + 0.08); 
    } else if (type === 'win') { 
        osc.type = 'triangle'; osc.frequency.setValueAtTime(300, audioCtx.currentTime); osc.frequency.setValueAtTime(700, audioCtx.currentTime + 0.2); 
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4); 
        osc.start(); osc.stop(audioCtx.currentTime + 0.4); 
    } else if (type === 'lose') { 
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, audioCtx.currentTime); osc.frequency.linearRampToValueAtTime(150, audioCtx.currentTime + 0.4); 
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4); 
        osc.start(); osc.stop(audioCtx.currentTime + 0.4); 
    }
}

const bgCanvas = document.getElementById('bgCanvas'); const bgCtx = bgCanvas.getContext('2d');
let bgParticles = [];
function resizeBg() { bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight; }
window.addEventListener('resize', resizeBg); resizeBg();
for (let i = 0; i < 18; i++) bgParticles.push({ x: Math.random() * bgCanvas.width, y: Math.random() * bgCanvas.height, size: Math.random() * 28 + 24, speedY: Math.random() * 0.4 + 0.1, char: Math.random() > 0.5 ? 'X' : 'O', rot: Math.random() * Math.PI, rSpeed: (Math.random() - 0.5) * 0.01 });
function animateBg() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#06b6d4';
    bgParticles.forEach(p => {
        p.y -= p.speedY; p.rot += p.rSpeed;
        if (p.y < -50) { p.y = bgCanvas.height + 50; p.x = Math.random() * bgCanvas.width; }
        bgCtx.save(); bgCtx.translate(p.x, p.y); bgCtx.rotate(p.rot);
        bgCtx.fillStyle = primary; bgCtx.globalAlpha = 0.08;
        bgCtx.font = `900 ${p.size}px sans-serif`; bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
        bgCtx.fillText(p.char, 0, 0);
        bgCtx.restore();
    });
    requestAnimationFrame(animateBg);
} animateBg();

// ==========================================
// 2. Global State & DOM Setup
// ==========================================
let playerId = localStorage.getItem('playerId') || null;
let playerName = localStorage.getItem('playerName') || '';
let playerPin = localStorage.getItem('playerPin') || '';
let sessionId = 's_' + Math.random().toString(36).substr(2, 9);

let gameMode = 'offline', aiLevel = 'medium', currentFormat = '1', targetWins = 1;
let currentMatchId = null, myRole = 'X', opponentName = 'Opponent', opponentId = null;
let boardWins = Array(9).fill(null), boardStates = Array(9).fill().map(() => Array(9).fill(''));
let activeBoardIndex = -1, currentPlayer = 'X', scores = { X: 0, O: 0 }, lastMove = null, isUI_Locked = false;
let userStats = { points: 0, wins: 0, losses: 0, history: [] };

let matchListener = null, challengeListener = null;
let emojiCooldown = false;

const getEl = id => document.getElementById(id);
function showCustomAlert(title, text) {
    playSound('click'); getEl('customModalTitle').textContent = title; getEl('customModalText').textContent = text;
    getEl('customModalButtons').innerHTML = `<button id="cmOk" class="w-full py-3 rounded-xl font-bold text-sm bg-cyan-600 text-white cursor-pointer">OK</button>`;
    getEl('customModal').style.display = 'flex';
    getEl('cmOk').onclick = () => getEl('customModal').style.display = 'none';
}
function showCustomConfirm(title, text, onConfirm) {
    playSound('click'); getEl('customModalTitle').textContent = title; getEl('customModalText').textContent = text;
    getEl('customModalButtons').innerHTML = `<button id="cmYes" class="w-full py-3 rounded-xl font-bold text-sm bg-cyan-600 text-white cursor-pointer">Yes</button><button id="cmNo" class="w-full bg-rose-600 text-white font-bold py-3 rounded-xl text-sm cursor-pointer">No</button>`;
    getEl('customModal').style.display = 'flex';
    getEl('cmYes').onclick = () => { getEl('customModal').style.display = 'none'; onConfirm(); };
    getEl('cmNo').onclick = () => { getEl('customModal').style.display = 'none'; };
}

// ==========================================
// 3. Routing (SPA Logic)
// ==========================================
function navigate(hash) {
    if (!playerId && hash !== '#login') { window.location.hash = '#login'; return; }
    if (playerId && hash === '#login') { window.location.hash = '#menu'; return; }
    
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    const target = getEl(`view-${hash.replace('#', '')}`);
    if (target) target.classList.remove('hidden');
    getEl('mainHeader').classList.toggle('hidden', hash === '#login');
    
    if (hash === '#menu') updateMenuData();
    if (hash === '#lobby') fetchOnlinePlayers();
    if (hash === '#profile') loadProfileData();
    if (hash === '#history') loadHistoryData();
    if (hash === '#leaderboard') fetchLeaderboard();
    
    window.location.hash = hash;
}
window.addEventListener('hashchange', () => navigate(window.location.hash || (playerId ? '#menu' : '#login')));

// Theme Management
const themeSelect = getEl('themeSelector');
themeSelect.value = localStorage.getItem('theme') || 'theme-cyberpunk';
getEl('htmlRoot').className = themeSelect.value;
themeSelect.addEventListener('change', (e) => {
    playSound('click'); localStorage.setItem('theme', e.target.value); getEl('htmlRoot').className = e.target.value;
    if(window.db && playerId) window.dbUpdate(window.dbRef(window.db, 'players/'+playerId), {theme: e.target.value});
});

// ==========================================
// 4. Auth & Presence System
// ==========================================
getEl('togglePinBtn').onclick = (e) => {
    const input = getEl('playerPinInput');
    if(input.classList.contains('password-disc')) { input.classList.remove('password-disc'); e.target.textContent = '🙈'; }
    else { input.classList.add('password-disc'); e.target.textContent = '👁️'; }
};

getEl('playerPinInput').addEventListener('input', function() { this.value = this.value.replace(/[^0-9]/g, ''); });
getEl('playerNameInput').addEventListener('input', function() { this.value = this.value.toLowerCase().replace(/[^a-z ]/g, ''); });

let isRegister = false;
getEl('authSwitchBtn').onclick = () => {
    isRegister = !isRegister; playSound('click');
    getEl('authModalTitle').textContent = isRegister ? 'Create Account' : 'Player Login';
    getEl('authSubmitBtn').textContent = isRegister ? 'Register' : 'Login';
    getEl('authSwitchBtn').textContent = isRegister ? 'Have an account? Login' : 'Create Account';
};

getEl('authSubmitBtn').onclick = async () => {
    playSound('click');
    let name = getEl('playerNameInput').value.replace(/\s{2,}/g, ' ').trim();
    let pin = getEl('playerPinInput').value;
    if (!/^[a-z ]{3,40}$/.test(name)) return showCustomAlert('Error', 'Name must be 3-40 lowercase letters.');
    if (!/^\d{4}$/.test(pin)) return showCustomAlert('Error', 'PIN must be exactly 4 digits.');
    if (!window.db) return showCustomAlert('Wait', 'Connecting to server...');

    const snap = await window.dbGet(window.dbRef(window.db, 'players'));
    let exists = false, matchedId = null, pData = null;
    if (snap.exists()) {
        snap.forEach(child => {
            let u = child.val(); if (u.name === name) { exists = true; matchedId = child.key; pData = u; }
        });
    }

    if (isRegister) {
        if (exists) return showCustomAlert('Taken', 'Name exists. Try logging in.');
        playerId = 'p_' + Math.random().toString(36).substr(2, 9);
        playerName = name; playerPin = pin; userStats = { points: 0, wins: 0, losses: 0, history: [] };
    } else {
        if (!exists || pData.pin !== pin) return showCustomAlert('Failed', 'Invalid name or PIN.');
        playerId = matchedId; playerName = pData.name; playerPin = pData.pin; 
        userStats = { points: pData.points||0, wins: pData.wins||0, losses: pData.losses||0, history: pData.history||[] };
    }

    localStorage.setItem('playerId', playerId); localStorage.setItem('playerName', playerName); localStorage.setItem('playerPin', playerPin);
    setupPresence(); navigate('#menu');
};

function setupPresence() {
    if(!window.db || !playerId) return;
    const ref = window.dbRef(window.db, 'players/' + playerId);
    window.dbOnDisconnect(ref).update({ status: 'offline', lastActive: Date.now() });
    
    window.dbOnValue(window.dbRef(window.db, `players/${playerId}/sessionId`), snap => {
        if(snap.exists() && snap.val() !== sessionId) {
            localStorage.clear(); alert("Logged in from another device!"); window.location.reload();
        }
    });

    const updatePresence = (stat) => window.dbUpdate(ref, { name: playerName, pin: playerPin, points: userStats.points, wins: userStats.wins, losses: userStats.losses, status: stat, sessionId: sessionId, lastActive: Date.now() });
    updatePresence(currentMatchId ? 'in-game' : 'online');
    
    document.addEventListener('visibilitychange', () => {
        if(document.visibilityState === 'visible') updatePresence(currentMatchId ? 'in-game' : 'online');
        else updatePresence('offline');
    });

    if(!challengeListener) {
        challengeListener = window.dbOnValue(window.dbRef(window.db, 'challenges/' + playerId), snap => {
            const data = snap.val();
            if(data && data.status === 'pending') { playSound('bell'); showIncomingChallenge(data); }
        });
    }
}

window.addEventListener('firebase-ready', async () => {
    if(playerId) {
        const snap = await window.dbGet(window.dbRef(window.db, `players/${playerId}`));
        if(snap.exists() && snap.val().pin === playerPin) {
            let d = snap.val(); userStats = { points: d.points||0, wins: d.wins||0, losses: d.losses||0, history: d.history||[] };
            setupPresence(); navigate(window.location.hash || '#menu');
        } else { localStorage.clear(); navigate('#login'); }
    } else navigate('#login');
});

getEl('logoutBtn').onclick = () => showCustomConfirm('Logout', 'Are you sure?', () => {
    if(window.db && playerId) window.dbUpdate(window.dbRef(window.db, `players/${playerId}`), { status: 'offline' });
    localStorage.clear(); window.location.reload();
});

// ==========================================
// 5. Menu, Profile, History & Leaderboard
// ==========================================
function updateMenuData() { getEl('menuUsername').textContent = playerName; }

function getRank(pts) {
    if(pts < 20) return 'Rookie 🥉'; if(pts < 50) return 'Fighter 🥈';
    if(pts < 100) return 'Master 🥇'; return 'Grandmaster 🏆';
}

function loadProfileData() {
    getEl('profileNameDisplay').textContent = playerName;
    getEl('profileRankTitle').textContent = getRank(userStats.points);
    getEl('statPoints').textContent = userStats.points;
    getEl('statWins').textContent = userStats.wins;
    getEl('statLosses').textContent = userStats.losses;
}

function loadHistoryData() {
    const hl = getEl('matchHistoryList'); hl.innerHTML = '';
    if(!userStats.history || userStats.history.length === 0) {
        hl.innerHTML = '<p class="text-slate-500 text-center py-6 text-xs">No matches recorded yet.</p>';
        return;
    }
    [...userStats.history].reverse().forEach(m => {
        hl.innerHTML += `<li class="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5 text-xs"><span class="${m.res==='Win'?'text-emerald-400':m.res==='Loss'?'text-rose-400':'text-amber-400'} font-bold">${m.res}</span> <span class="text-slate-300">vs ${m.opp}</span></li>`;
    });
}

getEl('updatePinBtn').onclick = () => {
    if(currentMatchId) return showCustomAlert('Blocked', 'Cannot change PIN while in a game.');
    let o = getEl('updateOldPin').value, n = getEl('updateNewPin').value;
    if(o !== playerPin) return showCustomAlert('Error', 'Old PIN incorrect.');
    if(!/^\d{4}$/.test(n)) return showCustomAlert('Error', 'New PIN must be 4 digits.');
    playerPin = n; localStorage.setItem('playerPin', n);
    window.dbUpdate(window.dbRef(window.db, `players/${playerId}`), { pin: n });
    showCustomAlert('Success', 'PIN updated safely.'); getEl('updateOldPin').value = ''; getEl('updateNewPin').value = '';
};

getEl('deleteAccountBtn').onclick = () => {
    if(currentMatchId) return showCustomAlert('Blocked', 'Cannot delete account during a match.');
    let pinInput = getEl('deleteAccountPin').value;
    if(pinInput !== playerPin) return showCustomAlert('Error', 'Incorrect PIN. Deletion cancelled.');
    
    showCustomConfirm('Delete Account', 'Are you sure you want to delete your account permanently?', async () => {
        if(window.db && playerId) {
            await window.dbRemove(window.dbRef(window.db, `players/${playerId}`));
            await window.dbRemove(window.dbRef(window.db, `challenges/${playerId}`));
        }
        localStorage.clear(); window.location.reload();
    });
};

function fetchLeaderboard() {
    if(!window.db) return;
    window.dbOnValue(window.dbRef(window.db, 'players'), snap => {
        const p = snap.val(); if(!p) return;
        const arr = Object.values(p).filter(x=>x.name).sort((a,b)=>(b.points||0)-(a.points||0)).slice(0,10);
        const list = getEl('leaderboardList'); list.innerHTML = '';
        arr.forEach((x, i) => {
            list.innerHTML += `<div class="flex justify-between p-3 border-b border-white/10 last:border-0 items-center bg-black/20 rounded-lg mb-1 text-xs"><span class="font-bold"><span class="text-slate-400 mr-2">#${i+1}</span> ${x.name}</span> <span class="text-amber-400 font-black">${x.points||0}</span></div>`;
        });
    }, {onlyOnce: true});
}

// ==========================================
// 6. Online Lobby & Challenges
// ==========================================
getEl('refreshLobbyBtn').onclick = () => { playSound('click'); fetchOnlinePlayers(); };

function fetchOnlinePlayers() {
    if(!window.db) return;
    window.dbGet(window.dbRef(window.db, 'matches')).then(snap => {
        if(snap.exists()) {
            const now = Date.now(); snap.forEach(c => {
                if(now - (c.val().lastActive || now) > 600000) window.dbRemove(window.dbRef(window.db, `matches/${c.key}`));
            });
        }
    });

    window.dbOnValue(window.dbRef(window.db, 'players'), snap => {
        const list = getEl('onlinePlayersList'); list.innerHTML = '';
        let found = false;
        snap.forEach(c => {
            if(c.key === playerId) return;
            let u = c.val(); if(u.status === 'offline') return; found = true;
            let isIngame = u.status === 'in-game';
            list.innerHTML += `<div class="flex justify-between items-center p-3 bg-black/40 rounded-xl border border-white/10 text-xs">
                <span class="font-bold capitalize truncate max-w-[120px]"><span class="${isIngame?'text-rose-500':'text-emerald-500'}">●</span> ${u.name}</span>
                ${isIngame ? `<span class="text-[10px] text-rose-400 border border-rose-500/30 px-2 py-1 rounded bg-rose-900/30">In-Game</span>` 
                           : `<button onclick="sendChallenge('${c.key}', '${u.name}')" class="bg-cyan-700 hover:bg-cyan-600 px-3 py-1.5 rounded-lg font-bold text-xs shadow-md cursor-pointer">Challenge</button>`}
            </div>`;
        });
        if(!found) list.innerHTML = '<p class="text-slate-500 text-center py-4 text-xs">No one is online.</p>';
    });
}

function sendChallenge(tId, tName) {
    playSound('bell');
    const format = getEl('matchFormatSelect').value;
    const mId = [playerId, tId].sort().join('_');
    window.dbSet(window.dbRef(window.db, `challenges/${tId}`), { fromId: playerId, fromName: playerName, matchId: mId, status: 'pending', format: format, time: Date.now() });
    showCustomAlert('Sent!', `Waiting for ${tName} to accept...`);
    
    const ref = window.dbRef(window.db, `challenges/${tId}`);
    window.dbOnValue(ref, snap => {
        let d = snap.val();
        if(d && d.status === 'accepted') { window.dbRemove(ref); startOnlineMatch(mId, 'X', tName, tId, format); }
        else if(!d || d.status === 'declined') { window.dbRemove(ref); showCustomAlert('Declined', `${tName} declined your challenge.`); navigate('#lobby'); }
    });
}

let activeIncoming = null;
function showIncomingChallenge(data) {
    if(Date.now() - (data.time || 0) > 30000) { window.dbRemove(window.dbRef(window.db, `challenges/${playerId}`)); return; }
    activeIncoming = data;
    getEl('challengeText').textContent = `${data.fromName} challenges you to [${data.format==='1'?'Single':data.format==='3'?'BO3':'BO5'}]`;
    getEl('challengeModal').style.display = 'flex';
}
getEl('acceptChallengeBtn').onclick = () => {
    playSound('start'); getEl('challengeModal').style.display = 'none';
    if(activeIncoming) {
        window.dbSet(window.dbRef(window.db, `matches/${activeIncoming.matchId}`), {
            format: activeIncoming.format, scores: {X:0,O:0}, boardStates: JSON.stringify(Array(9).fill().map(()=>Array(9).fill(''))), boardWins: JSON.stringify(Array(9).fill(null)),
            currentPlayer: 'X', activeBoardIndex: -1, lastActive: Date.now(), roundProcessed: false
        });
        window.dbUpdate(window.dbRef(window.db, `challenges/${playerId}`), {status: 'accepted'});
        startOnlineMatch(activeIncoming.matchId, 'O', activeIncoming.fromName, activeIncoming.fromId, activeIncoming.format);
        activeIncoming = null;
    }
};
getEl('rejectChallengeBtn').onclick = () => {
    playSound('click'); getEl('challengeModal').style.display = 'none';
    if(activeIncoming) { window.dbUpdate(window.dbRef(window.db, `challenges/${playerId}`), {status: 'declined'}); activeIncoming = null; }
};

// ==========================================
// 7. Core Game Logic & DOM Setup
// ==========================================
function isBoardFull(bArr) { return bArr.every(c => c !== ''); }
function checkSmallWin(arr) {
    const w = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(let [a,b,c] of w) if(arr[a] && arr[a]===arr[b] && arr[a]===arr[c]) return arr[a];
    return null;
}
function checkUltimateWin() {
    const w = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(let [a,b,c] of w) if(boardWins[a] && boardWins[a]!=='DRAW' && boardWins[a]===boardWins[b] && boardWins[a]===boardWins[c]) return boardWins[a];
    return null;
}

function initGameHTML() {
    const ub = getEl('ultimateBoard'); ub.innerHTML = '';
    for(let b=0; b<9; b++) {
        let l = document.createElement('div'); l.className = `local-grid id-bg-${b}`;
        let ov = document.createElement('div'); ov.className = `overlay-bg hidden id-ov-${b}`;
        l.appendChild(ov);
        for(let c=0; c<9; c++) {
            let btn = document.createElement('button'); btn.className = `cell-btn id-btn-${b}-${c}`;
            btn.onclick = () => tryMove(b, c);
            l.appendChild(btn);
        }
        ub.appendChild(l);
    }
}

function renderGameUI() {
    getEl('turnIndicator').textContent = currentPlayer;
    getEl('turnIndicator').className = `font-extrabold text-base ${currentPlayer==='X'?'cell-x':'cell-o'}`;
    getEl('scoreX').textContent = scores.X; getEl('scoreO').textContent = scores.O;

    for(let b=0; b<9; b++) {
        const bg = document.querySelector(`.id-bg-${b}`);
        const ov = document.querySelector(`.id-ov-${b}`);
        
        if(boardWins[b]) {
            ov.classList.remove('hidden'); bg.classList.add('local-board-won');
            ov.textContent = boardWins[b] === 'DRAW' ? '➖' : boardWins[b];
            ov.className = `overlay-bg id-ov-${b} ${boardWins[b]==='X'?'cell-x':boardWins[b]==='O'?'cell-o':'text-slate-400'}`;
        } else { ov.classList.add('hidden'); bg.classList.remove('local-board-won'); }

        let isActive = (activeBoardIndex === -1 || activeBoardIndex === b) && !boardWins[b];
        bg.classList.remove('active-local-board', 'waiting-local', 'inactive-local');
        if(isActive) {
            if(gameMode === 'online' && currentPlayer !== myRole) bg.classList.add('waiting-local');
            else bg.classList.add('active-local-board');
        } else bg.classList.add('inactive-local');

        for(let c=0; c<9; c++) {
            const btn = document.querySelector(`.id-btn-${b}-${c}`);
            let val = boardStates[b][c];
            btn.textContent = val;
            btn.className = `cell-btn id-btn-${b}-${c} ${val==='X'?'cell-x':val==='O'?'cell-o':''} ${lastMove && lastMove.b===b && lastMove.c===c ? 'last-move-highlight':''}`;
            btn.disabled = val !== '' || !isActive || isUI_Locked || (gameMode==='online' && currentPlayer!==myRole);
        }
    }
}

function processTurn(b, c, simulatedPlayer) {
    let p = simulatedPlayer || currentPlayer;
    boardStates[b][c] = p; lastMove = {b, c};
    let w = checkSmallWin(boardStates[b]);
    if(w) { boardWins[b] = w; if(!simulatedPlayer) { playSound('win'); getEl('htmlRoot').classList.add('screen-shake'); setTimeout(()=>getEl('htmlRoot').classList.remove('screen-shake'),300); } }
    else if(isBoardFull(boardStates[b])) boardWins[b] = 'DRAW';

    let uWin = checkUltimateWin();
    if(uWin || boardWins.every(x=>x!==null)) return handleRoundEnd(uWin);

    if(boardWins[c] !== null || isBoardFull(boardStates[c])) activeBoardIndex = -1;
    else activeBoardIndex = c;
    
    currentPlayer = p === 'X' ? 'O' : 'X';
}

function handleRoundEnd(winner) {
    if(winner && winner !== 'DRAW') scores[winner]++;
    let cupWon = winner && winner !== 'DRAW' && scores[winner] >= targetWins;
    
    // Save to Stats
    if(cupWon || currentFormat === '1') {
        let isMe = gameMode==='online' ? winner===myRole : winner==='X';
        if(winner !== 'DRAW') {
            if(isMe) userStats.wins++; else userStats.losses++;
        }
        userStats.points += isMe ? 3 : winner==='DRAW' ? 1 : Math.max(0, userStats.points - 1);
        userStats.history.push({res: winner==='DRAW' ? 'Draw' : isMe ? 'Win' : 'Loss', opp: opponentName});
        if(window.db && playerId) window.dbUpdate(window.dbRef(window.db, `players/${playerId}`), userStats);
    }
    
    isUI_Locked = true;
    if(winner && winner!=='DRAW') playSound(cupWon && (gameMode==='online'?winner===myRole:winner==='X') ? 'win':'lose');
    else playSound('bell');
    
    getEl('victoryTitle').textContent = winner==='DRAW' ? 'DRAW!' : `WINNER: ${winner}`;
    getEl('victoryText').textContent = cupWon ? `Cup Won! Score: ${scores.X}-${scores.O}` : `Round End! Score: ${scores.X}-${scores.O}`;
    getEl('acceptRematchBtn').textContent = cupWon ? (gameMode==='online'?'Play New Cup':'Play Again') : 'Next Round / Ready';
    setTimeout(() => getEl('victoryModal').style.display = 'flex', 800);
}

// ==========================================
// 8. Offline & AI Logic
// ==========================================
document.querySelectorAll('.ai-diff-btn').forEach(btn => btn.onclick = (e) => {
    playSound('start'); aiLevel = e.target.getAttribute('data-level'); gameMode = 'offline'; currentFormat = getEl('matchFormatSelect').value;
    targetWins = currentFormat === '1' ? 1 : currentFormat === '3' ? 2 : 3;
    opponentName = `AI (${aiLevel})`; getEl('gameModeBadge').textContent = opponentName; getEl('emojiBar').classList.add('hidden'); getEl('turnTimerContainer').classList.add('hidden');
    startLocalRound(true); navigate('#game');
});

function startLocalRound(fullReset) {
    if(fullReset) scores = {X:0, O:0};
    boardStates = Array(9).fill().map(()=>Array(9).fill('')); boardWins = Array(9).fill(null);
    currentPlayer = 'X'; activeBoardIndex = -1; lastMove = null; isUI_Locked = false;
    getEl('victoryModal').style.display = 'none';
    initGameHTML(); renderGameUI();
}

function tryMove(b, c) {
    if(isUI_Locked || boardStates[b][c] !== '') return;
    playSound('click');
    if(gameMode === 'offline') {
        processTurn(b, c); renderGameUI();
        if(!isUI_Locked && currentPlayer === 'O') {
            isUI_Locked = true; setTimeout(() => { isUI_Locked=false; makeAiMove(); }, 600);
        }
    } else {
        isUI_Locked = true; document.querySelector(`.id-btn-${b}-${c}`).classList.add('cell-pending');
        let tempStates = JSON.parse(JSON.stringify(boardStates)); tempStates[b][c] = myRole;
        let tempWins = [...boardWins]; let w = checkSmallWin(tempStates[b]); 
        if(w) tempWins[b] = w; else if(isBoardFull(tempStates[b])) tempWins[b] = 'DRAW';
        let nxtAct = (tempWins[c] !== null || isBoardFull(tempStates[c])) ? -1 : c;
        let nxtPl = myRole==='X'?'O':'X';
        
        let updates = { boardStates: JSON.stringify(tempStates), boardWins: JSON.stringify(tempWins), activeBoardIndex: nxtAct, currentPlayer: nxtPl, lastMove: {b,c}, lastActive: Date.now() };
        window.dbUpdate(window.dbRef(window.db, `matches/${currentMatchId}`), updates).then(()=> isUI_Locked = false);
    }
}

function makeAiMove() {
    let tBoards = activeBoardIndex === -1 ? boardWins.map((v,i)=>v===null?i:-1).filter(i=>i!==-1) : [activeBoardIndex];
    let moves = [];
    tBoards.forEach(b => {
        for(let c=0; c<9; c++) {
            if(boardStates[b][c] === '') {
                let score = 0;
                if(aiLevel === 'medium' || aiLevel === 'impossible') {
                    boardStates[b][c] = 'O'; if(checkSmallWin(boardStates[b])) score += 100; boardStates[b][c] = '';
                    boardStates[b][c] = 'X'; if(checkSmallWin(boardStates[b])) score += 50; boardStates[b][c] = '';
                }
                if(aiLevel === 'impossible') {
                    if(c===4) score+=5; else if([0,2,6,8].includes(c)) score+=2;
                }
                moves.push({b,c,score: score + Math.random()});
            }
        }
    });
    if(moves.length > 0) {
        moves.sort((x,y)=>y.score-x.score);
        let best = moves[0]; processTurn(best.b, best.c); renderGameUI();
    }
}

// ==========================================
// 9. Online Match Engine & Rematch Handshake
// ==========================================
function startOnlineMatch(mId, role, oppName, oppId, format) {
    currentMatchId = mId; myRole = role; opponentName = oppName; opponentId = oppId;
    gameMode = 'online'; currentFormat = format; targetWins = currentFormat === '1' ? 1 : currentFormat === '3' ? 2 : 3;
    getEl('gameModeBadge').textContent = `vs ${opponentName}`; getEl('emojiBar').classList.remove('hidden'); getEl('turnTimerContainer').classList.remove('hidden');
    window.dbUpdate(window.dbRef(window.db, `players/${playerId}`), {status: 'in-game'});
    initGameHTML(); navigate('#game');
    
    if(matchListener) matchListener();
    matchListener = window.dbOnValue(window.dbRef(window.db, `matches/${mId}`), snap => {
        let d = snap.val();
        if(!d) { showCustomAlert('Match Closed', 'The match was terminated.'); return leaveMatch(); }
        
        boardStates = JSON.parse(d.boardStates); boardWins = JSON.parse(d.boardWins);
        activeBoardIndex = d.activeBoardIndex; currentPlayer = d.currentPlayer;
        lastMove = d.lastMove || null; scores = d.scores || {X:0,O:0};
        
        if(d.rematch) {
            let r = d.rematch;
            if(r.X && r.O) {
                if(myRole === 'X') {
                    window.dbUpdate(window.dbRef(window.db, `matches/${mId}`), {
                        boardStates: JSON.stringify(Array(9).fill().map(()=>Array(9).fill(''))),
                        boardWins: JSON.stringify(Array(9).fill(null)),
                        currentPlayer: 'X', activeBoardIndex: -1, rematch: null, lastMove: null, roundProcessed: false
                    });
                }
            } else {
                let waitingFor = r.X ? 'O' : 'X';
                if(waitingFor === myRole) getEl('acceptRematchBtn').textContent = 'Waiting for opponent...';
            }
        }

        let uWin = checkUltimateWin();
        if((uWin || boardWins.every(x=>x!==null)) && !d.roundProcessed) {
            if(myRole === 'X' && uWin) {
                window.dbUpdate(window.dbRef(window.db, `matches/${mId}`), {roundProcessed: true});
            }
            if(!isUI_Locked) handleRoundEnd(uWin);
        } else if(!uWin && !boardWins.every(x=>x!==null)) {
            getEl('victoryModal').style.display = 'none'; isUI_Locked = false;
        }
        
        if(d.emoji && d.emoji.sender !== myRole && d.emoji.time > Date.now()-2000) showEmoji(d.emoji.char);

        if(d.req === 'forfeit' && d.reqFrom !== myRole) { showCustomAlert('Victory', 'Opponent forfeited!'); leaveMatch(); }

        renderGameUI();
    });
}

function leaveMatch() {
    getEl('victoryModal').style.display = 'none';
    if(gameMode === 'online' && currentMatchId && window.db) window.dbRemove(window.dbRef(window.db, `matches/${currentMatchId}`));
    if(matchListener) { matchListener(); matchListener = null; }
    currentMatchId = null; window.dbUpdate(window.dbRef(window.db, `players/${playerId}`), {status: 'online'}); navigate('#menu');
}

getEl('surrenderBtn').onclick = () => {
    if(gameMode==='offline') { scores[myRole==='X'?'O':'X'] = targetWins; handleRoundEnd(myRole==='X'?'O':'X'); }
    else showCustomConfirm('Forfeit?', 'Give up this match?', () => { window.dbUpdate(window.dbRef(window.db, `matches/${currentMatchId}`), {req: 'forfeit', reqFrom: myRole}); leaveMatch(); });
};

getEl('resetMatchBtn').onclick = () => {
    if(gameMode==='offline') startLocalRound(false);
    else { window.dbUpdate(window.dbRef(window.db, `matches/${currentMatchId}/rematch`), { [myRole]: true }); }
};

getEl('acceptRematchBtn').onclick = () => {
    playSound('click');
    if(gameMode === 'offline') startLocalRound(scores.X>=targetWins || scores.O>=targetWins);
    else {
        getEl('acceptRematchBtn').textContent = 'Waiting...';
        window.dbUpdate(window.dbRef(window.db, `matches/${currentMatchId}/rematch`), { [myRole]: true });
    }
};

document.querySelectorAll('.emoji-btn').forEach(btn => btn.onclick = (e) => {
    if(emojiCooldown) return; emojiCooldown = true; setTimeout(()=>emojiCooldown=false, 3000);
    let char = e.target.textContent; showEmoji(char); playSound('click');
    if(gameMode === 'online') window.dbUpdate(window.dbRef(window.db, `matches/${currentMatchId}`), { emoji: { char, sender: myRole, time: Date.now() } });
});

function showEmoji(char) {
    let el = getEl('floatingEmoji'); el.textContent = char;
    el.classList.remove('opacity-0', '-translate-y-1/2'); el.classList.add('opacity-100', '-translate-y-[200px]');
    setTimeout(() => { el.classList.add('opacity-0', '-translate-y-1/2'); el.classList.remove('opacity-100', '-translate-y-[200px]'); }, 1500);
}