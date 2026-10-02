const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') { audioCtx.resume(); }
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode); gainNode.connect(audioCtx.destination);
    
    if (type === 'click') { osc.type = 'sine'; osc.frequency.setValueAtTime(400, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.08); gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08); osc.start(); osc.stop(audioCtx.currentTime + 0.08); }
    else if (type === 'win') { osc.type = 'triangle'; osc.frequency.setValueAtTime(300, audioCtx.currentTime); osc.frequency.setValueAtTime(500, audioCtx.currentTime + 0.1); osc.frequency.setValueAtTime(700, audioCtx.currentTime + 0.2); gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4); osc.start(); osc.stop(audioCtx.currentTime + 0.4); }
    else if (type === 'bell') { osc.type = 'sine'; osc.frequency.setValueAtTime(880, audioCtx.currentTime); osc.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.15); gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35); osc.start(); osc.stop(audioCtx.currentTime + 0.35); }
    else if (type === 'lose') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, audioCtx.currentTime); osc.frequency.linearRampToValueAtTime(150, audioCtx.currentTime + 0.4); gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4); osc.start(); osc.stop(audioCtx.currentTime + 0.4); }
}

const bgCanvas = document.getElementById('bgCanvas'); const bgCtx = bgCanvas.getContext('2d'); let bgParticles = [];
function resizeBgCanvas() { const dpr = window.devicePixelRatio || 1; bgCanvas.width = window.innerWidth * dpr; bgCanvas.height = window.innerHeight * dpr; bgCtx.scale(dpr, dpr); }
window.addEventListener('resize', resizeBgCanvas); resizeBgCanvas();
for (let i = 0; i < 30; i++) { bgParticles.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, size: Math.floor(Math.random() * 22) + 12, speedY: (Math.random() * 0.5) + 0.2, speedX: (Math.random() - 0.5) * 0.2, char: Math.random() > 0.5 ? 'X' : 'O', alpha: Math.random() * 0.08 + 0.02, rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.008 }); }
function animateBgCanvas() {
    bgCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#06b6d4';
    bgParticles.forEach(p => { p.y -= p.speedY; p.x += p.speedX; p.rotation += p.rotSpeed; if (p.y < -50) { p.y = window.innerHeight + 50; p.x = Math.random() * window.innerWidth; } bgCtx.save(); bgCtx.translate(p.x, p.y); bgCtx.rotate(p.rotation); bgCtx.font = `bold ${p.size}px sans-serif`; bgCtx.fillStyle = primaryColor; bgCtx.globalAlpha = p.alpha; bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle'; bgCtx.fillText(p.char, 0, 0); bgCtx.restore(); });
    requestAnimationFrame(animateBgCanvas);
} animateBgCanvas();

const ultimateBoard = document.getElementById('ultimateBoard'); const turnIndicator = document.getElementById('turnIndicator'); const resetBtn = document.getElementById('resetBtn'); const scoreXEl = document.getElementById('scoreX'); const scoreOEl = document.getElementById('scoreO'); const themeSelector = document.getElementById('themeSelector'); const htmlRoot = document.getElementById('htmlRoot');
const victoryModal = document.getElementById('victoryModal'); const victoryTitle = document.getElementById('victoryTitle'); const victoryText = document.getElementById('victoryText'); const acceptRematchBtn = document.getElementById('acceptRematchBtn'); const declineRematchBtn = document.getElementById('declineRematchBtn');
const resetRequestModal = document.getElementById('resetRequestModal'); const acceptResetBtn = document.getElementById('acceptResetBtn'); const declineResetBtn = document.getElementById('declineResetBtn');
const disconnectModal = document.getElementById('disconnectModal'); const disconnectTimerEl = document.getElementById('disconnectTimer'); const forceLeaveBtn = document.getElementById('forceLeaveBtn');
const connectionStatus = document.getElementById('connectionStatus'); const connDot = document.getElementById('connDot'); const connText = document.getElementById('connText');
const nameModal = document.getElementById('nameModal'); const playerNameInput = document.getElementById('playerNameInput'); const playerPinInput = document.getElementById('playerPinInput'); const authSubmitBtn = document.getElementById('authSubmitBtn'); const authSwitchBtn = document.getElementById('authSwitchBtn'); const authModalTitle = document.getElementById('authModalTitle'); const authModalDesc = document.getElementById('authModalDesc');
const mainMenu = document.getElementById('mainMenu'); const menuUsername = document.getElementById('menuUsername'); const userPoints = document.getElementById('userPoints'); const aiDifficultyModal = document.getElementById('aiDifficultyModal'); const pveMenuBtn = document.getElementById('pveMenuBtn'); const cancelAiModalBtn = document.getElementById('cancelAiModalBtn');
const onlineLobbyModal = document.getElementById('onlineLobbyModal'); const onlineLobbyMenuBtn = document.getElementById('onlineLobbyMenuBtn'); const closeOnlineLobbyBtn = document.getElementById('closeOnlineLobbyBtn'); const refreshLobbyBtn = document.getElementById('refreshLobbyBtn'); const onlinePlayersList = document.getElementById('onlinePlayersList');
const challengeModal = document.getElementById('challengeModal'); const challengeTitle = document.getElementById('challengeTitle'); const challengeText = document.getElementById('challengeText'); const acceptChallengeBtn = document.getElementById('acceptChallengeBtn'); const rejectChallengeBtn = document.getElementById('rejectChallengeBtn'); const cancelChallengeBtn = document.getElementById('cancelChallengeBtn');
const rulesModal = document.getElementById('rulesModal'); const menuRulesBtn = document.getElementById('menuRulesBtn'); const closeRulesBtn = document.getElementById('closeRulesBtn'); const statsModal = document.getElementById('statsModal'); const statsMenuBtn = document.getElementById('statsMenuBtn'); const closeStatsBtn = document.getElementById('closeStatsBtn'); const statPoints = document.getElementById('statPoints'); const statTotal = document.getElementById('statTotal'); const profileNameDisplay = document.getElementById('profileNameDisplay'); const deleteAccountBtn = document.getElementById('deleteAccountBtn'); const logoutBtn = document.getElementById('logoutBtn'); const homeBtn = document.getElementById('homeBtn'); const matchFormatSelect = document.getElementById('matchFormatSelect'); const gameModeBadge = document.getElementById('gameModeBadge');

let gameMode = 'pve'; let aiDifficulty = 'impossible'; let currentPlayer = 'X'; let activeBoardIndex = null; let boardWins = Array(9).fill(null); let boardStates = Array(9).fill().map(() => Array(9).fill(''));
let playerName = localStorage.getItem('playerName') || ''; 
let playerPin = localStorage.getItem('playerPin') || ''; 
let playerId = localStorage.getItem('playerId') || null; 
let clientSessionId = 's_' + Math.random().toString(36).substring(2, 9); let userArenaPoints = 10; let stats = { total: 0, wins: 0, losses: 0 }; let scores = { X: 0, O: 0 }; let currentTheme = localStorage.getItem('ultimate_theme') || 'theme-cyberpunk';
let currentMatchId = localStorage.getItem('currentMatchId') || null; 
let myRole = localStorage.getItem('myRole') || 'X'; 
let opponentName = 'Opponent'; let opponentId = null; let activeMatchUnsubscribe = null; let activeChallengeRef = null; let myChallengeStatusListener = null; let sessionListenerRef = null; let opponentStatusUnsubscribe = null; let disconnectTimerInterval = null;
let currentFormat = '1'; let targetWins = 1; let roundProcessed = false;

htmlRoot.className = currentTheme; themeSelector.value = currentTheme;
themeSelector.addEventListener('change', (e) => { playSound('click'); currentTheme = e.target.value; htmlRoot.className = currentTheme; localStorage.setItem('ultimate_theme', currentTheme); if (window.db && playerId) window.dbUpdate(window.dbRef(window.db, 'players/' + playerId), { theme: currentTheme }); });
function getTargetWins(formatStr) { if (formatStr === '3') return 2; if (formatStr === '5') return 3; if (formatStr === 'infinity') return Infinity; return 1; }

// --- نظام الـ Routing (التنقل بين الصفحات) ---
function navigateTo(hash) {
    window.location.hash = hash;
    // إخفاء كل النوافذ
    nameModal.style.display = 'none'; mainMenu.style.display = 'none'; onlineLobbyModal.style.display = 'none'; 
    aiDifficultyModal.style.display = 'none'; rulesModal.style.display = 'none'; statsModal.style.display = 'none';
    challengeModal.style.display = 'none';
    
    // إظهار النافذة المطلوبة
    if (hash === '#login') nameModal.style.display = 'flex';
    else if (hash === '#menu') mainMenu.style.display = 'flex';
    else if (hash === '#lobby') { onlineLobbyModal.style.display = 'flex'; fetchOnlinePlayers(); }
    else if (hash === '#game') { /* واجهة اللعب الأساسية تظهر أوتوماتيك خلف النوافذ */ }
}

window.addEventListener('hashchange', () => {
    let hash = window.location.hash;
    if (!playerId && hash !== '#login') { window.location.hash = '#login'; return; }
    navigateTo(hash);
});

// --- التنبيهات ---
let customModal = document.createElement('div'); customModal.id = 'customModal'; customModal.className = 'fixed inset-0 bg-black/80 z-[80] hidden items-center justify-center p-4 backdrop-blur-md';
customModal.innerHTML = `<div class="modal-box border p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl flex flex-col gap-4 relative z-10"><h2 id="customModalTitle" class="font-black text-xl text-cyan-400">Notice</h2><p id="customModalText" class="text-sm text-slate-200 leading-relaxed"></p><div id="customModalButtons" class="flex gap-2 mt-2"></div></div>`; document.body.appendChild(customModal);
function showCustomAlert(title, text, onClose = null) { playSound('click'); document.getElementById('customModalTitle').textContent = title; document.getElementById('customModalText').textContent = text; document.getElementById('customModalButtons').innerHTML = `<button id="customModalOkBtn" class="w-full py-3 rounded-xl font-bold text-sm bg-cyan-600 text-white cursor-pointer">OK</button>`; customModal.style.display = 'flex'; document.getElementById('customModalOkBtn').onclick = () => { customModal.style.display = 'none'; if (onClose) onClose(); }; }
function showCustomConfirm(title, text, onConfirm, onCancel = null) { playSound('click'); document.getElementById('customModalTitle').textContent = title; document.getElementById('customModalText').textContent = text; document.getElementById('customModalButtons').innerHTML = `<button id="customModalConfirmBtn" class="w-full py-3 rounded-xl font-bold text-sm bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer">Yes</button><button id="customModalCancelBtn" class="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl text-sm cursor-pointer">Cancel</button>`; customModal.style.display = 'flex'; document.getElementById('customModalConfirmBtn').onclick = () => { customModal.style.display = 'none'; onConfirm(); }; document.getElementById('customModalCancelBtn').onclick = () => { customModal.style.display = 'none'; if (onCancel) onCancel(); }; }

menuRulesBtn.addEventListener('click', () => { playSound('click'); rulesModal.style.display = 'flex'; }); closeRulesBtn.addEventListener('click', () => { playSound('click'); rulesModal.style.display = 'none'; });
if (statsMenuBtn) { statsMenuBtn.addEventListener('click', () => { playSound('click'); profileNameDisplay.textContent = playerName; statPoints.textContent = userArenaPoints; statTotal.textContent = stats.total; fetchGlobalLeaderboard(); statsModal.style.display = 'flex'; }); }
if (closeStatsBtn) { closeStatsBtn.addEventListener('click', () => { playSound('click'); statsModal.style.display = 'none'; }); }
logoutBtn.addEventListener('click', () => { playSound('click'); showCustomConfirm('Logout', 'Are you sure you want to sign out?', async () => { if (window.db && playerId) await window.dbUpdate(window.dbRef(window.db, 'players/' + playerId), { status: 'offline' }); localStorage.clear(); location.reload(); }, () => {}); });
deleteAccountBtn.addEventListener('click', () => { playSound('click'); showCustomConfirm('Delete Account', 'Are you sure you want to delete your account permanently?', async () => { if (window.db && playerId) { await window.dbRemove(window.dbRef(window.db, 'players/' + playerId)); await window.dbRemove(window.dbRef(window.db, 'challenges/' + playerId)); } localStorage.clear(); location.reload(); }, () => {}); });

homeBtn.addEventListener('click', () => { 
    playSound('click'); 
    if (gameMode === 'online-p2p' && currentMatchId) {
        showCustomConfirm('Leave Match?', 'Are you sure you want to leave the current match?', () => { leaveRoom(); }, () => {} );
    } else { window.location.hash = '#menu'; } 
});

let leaderboardList = document.getElementById('leaderboardList');
if (!leaderboardList && statsModal) { let lbContainer = document.createElement('div'); lbContainer.className = 'mt-4 text-left'; lbContainer.innerHTML = `<h3 class="font-bold text-xs mb-2 text-cyan-400 uppercase tracking-wider">🏆 Global Arena Leaderboard</h3><div id="leaderboardList" class="flex flex-col gap-1.5 max-h-36 overflow-y-auto bg-black/50 p-2.5 rounded-xl border border-white/10 text-xs"><p class="text-center text-slate-400 py-2">Loading leaderboard...</p></div>`; statsModal.querySelector('.modal-box').appendChild(lbContainer); leaderboardList = document.getElementById('leaderboardList'); }

// --- نظام مراقبة التاب (Visibility API) العبقري ---
document.addEventListener("visibilitychange", () => {
    if (!window.db || !playerId) return;
    if (document.visibilityState === "visible") {
        registerOnlinePresence(gameMode === 'online-p2p' ? 'in-game' : 'online');
    } else {
        // بمجرد ما التاب تنزل أو يقفلها المتصفح يبان أوفلاين
        window.dbUpdate(window.dbRef(window.db, 'players/' + playerId), { status: 'offline', lastActive: Date.now() });
    }
});

function setupPresence() { 
    if (!window.db) return; 
    window.dbOnValue(window.dbRef(window.db, ".info/connected"), (snap) => { 
        if (snap.val() === true && playerName && playerId) {
            registerOnlinePresence(gameMode === 'online-p2p' ? 'in-game' : 'online'); 
        }
    }); 
}

function registerOnlinePresence(status = 'online') { 
    if (!window.db || !playerName || !playerId || document.visibilityState !== "visible") return; 
    const userRef = window.dbRef(window.db, 'players/' + playerId); 
    window.dbOnDisconnect(userRef).update({ status: 'offline', lastActive: Date.now() }).then(() => { 
        window.dbSet(userRef, { name: playerName, pin: playerPin, points: userArenaPoints, status: status, theme: currentTheme, currentSessionId: clientSessionId, lastActive: Date.now() }); 
    }); 
    if (sessionListenerRef) sessionListenerRef(); sessionListenerRef = window.dbOnValue(window.dbRef(window.db, 'players/' + playerId + '/currentSessionId'), (snap) => { const remoteSession = snap.val(); if (remoteSession && remoteSession !== clientSessionId) { showCustomAlert('Session Terminated', '⚠ تم تسجيل الدخول بهذا الحساب من جهاز آخر!', () => { localStorage.clear(); location.reload(); }); } }); 
    if (!activeChallengeRef) { activeChallengeRef = window.dbOnValue(window.dbRef(window.db, 'challenges/' + playerId), (snapshot) => { const data = snapshot.val(); if (data && data.status === 'pending') { playSound('bell'); showIncomingChallenge(data); } else if (data && data.status === 'cancelled') { challengeModal.style.display = 'none'; showCustomAlert('Challenge Cancelled', 'The challenge was cancelled by the sender.'); window.dbRemove(window.dbRef(window.db, 'challenges/' + playerId)); } }); } 
}

let isRegisterMode = false;
authSwitchBtn.addEventListener('click', () => { playSound('click'); isRegisterMode = !isRegisterMode; authModalTitle.textContent = isRegisterMode ? 'Create Account' : 'Player Login'; authModalDesc.textContent = isRegisterMode ? 'Choose lowercase username (no spaces) & 4-digit PIN:' : 'Enter your lowercase username (no spaces) and 4-digit PIN:'; authSubmitBtn.textContent = isRegisterMode ? 'Register' : 'Login'; authSwitchBtn.textContent = isRegisterMode ? 'Already have an account? Login' : "Don't have an account? Create one"; });
authSubmitBtn.addEventListener('click', async () => { 
    playSound('click'); let name = playerNameInput.value.toLowerCase().replace(/\s+/g, ''); let pin = playerPinInput.value.trim(); 
    if (!name || pin.length !== 4 || isNaN(pin)) return showCustomAlert('Error', 'Please enter a valid lowercase name (no spaces) and a 4-digit numeric PIN!'); 
    if (!window.db) return showCustomAlert('Error', 'Database connecting... Please wait.'); 
    const snapshot = await window.dbGet(window.dbRef(window.db, 'players')); 
    if (isRegisterMode) { 
        let exists = false; if (snapshot.exists()) { snapshot.forEach(childSnap => { if (childSnap.val().name === name) exists = true; }); } 
        if (exists) return showCustomAlert('Error', 'Username already taken!'); 
        playerId = 'p_' + Math.random().toString(36).substring(2, 9); playerName = name; playerPin = pin; userArenaPoints = 10; 
    } else { 
        let matchedUser = null; let matchedId = null; if (snapshot.exists()) { snapshot.forEach(childSnap => { let u = childSnap.val(); if (u.name === name && u.pin === pin) { matchedUser = u; matchedId = childSnap.key; } }); } 
        if (!matchedUser) return showCustomAlert('Login Failed', 'Invalid username or 4-digit PIN!'); 
        playerId = matchedId; playerName = matchedUser.name; playerPin = matchedUser.pin; userArenaPoints = matchedUser.points || 10; 
    } 
    
    // حفظ البيانات في الـ Local Storage عشان الريفريش
    localStorage.setItem('playerId', playerId);
    localStorage.setItem('playerName', playerName);
    localStorage.setItem('playerPin', playerPin);
    
    menuUsername.textContent = playerName; userPoints.textContent = userArenaPoints; 
    registerOnlinePresence(); window.location.hash = '#menu'; initGame(); 
});

// Auto-Login Logic
async function handleAutoLogin() {
    if (playerId && playerName) {
        if (!window.db) return; // wait for firebase
        const snap = await window.dbGet(window.dbRef(window.db, 'players/' + playerId));
        if (snap.exists() && snap.val().pin === playerPin) {
            userArenaPoints = snap.val().points || 10;
            menuUsername.textContent = playerName; userPoints.textContent = userArenaPoints;
            registerOnlinePresence();
            
            // لو كان بيعمل ريفريش وهو جوه ماتش!
            if (currentMatchId) {
                gameMode = 'online-p2p';
                window.location.hash = '#game';
                listenToMatch(currentMatchId);
            } else if (!window.location.hash || window.location.hash === '#login') {
                window.location.hash = '#menu';
            } else {
                navigateTo(window.location.hash);
            }
        } else {
            localStorage.clear(); playerId = null; window.location.hash = '#login';
        }
    } else {
        window.location.hash = '#login';
    }
}

function fetchGlobalLeaderboard() { if (!window.db) return; window.dbOnValue(window.dbRef(window.db, 'players'), (snapshot) => { const players = snapshot.val(); if (!players || !leaderboardList) return; let sortedPlayers = Object.values(players).sort((a, b) => (b.points || 0) - (a.points || 0)); leaderboardList.innerHTML = ''; sortedPlayers.slice(0, 5).forEach((p, index) => { let row = document.createElement('div'); row.className = 'flex justify-between items-center py-1.5 px-2.5 border-b border-white/10 last:border-none'; row.innerHTML = `<span>#${index + 1} ${p.name}</span> <span class="font-bold text-cyan-400">${p.points || 0} pts</span>`; leaderboardList.appendChild(row); }); }, { onlyOnce: true }); }

onlineLobbyMenuBtn.addEventListener('click', () => { playSound('click'); window.location.hash = '#lobby'; }); 
closeOnlineLobbyBtn.addEventListener('click', () => { playSound('click'); window.location.hash = '#menu'; }); 
refreshLobbyBtn.addEventListener('click', () => { playSound('click'); fetchOnlinePlayers(); });
function fetchOnlinePlayers() { if (!window.db) return; window.dbOnValue(window.dbRef(window.db, 'players'), (snapshot) => { const players = snapshot.val(); onlinePlayersList.innerHTML = ''; if (!players) return onlinePlayersList.innerHTML = '<p class="text-xs text-center opacity-50 py-4">No players online.</p>'; let count = 0; Object.keys(players).forEach(id => { if (id === playerId) return; let p = players[id]; if (p.status === 'offline') return; // لا تظهر الأوفلاين أبداً
    let div = document.createElement('div'); div.className = 'bg-black/40 p-3 rounded-2xl border border-white/10 flex justify-between items-center text-xs font-bold'; if (p.status === 'in-game') { div.innerHTML = `<span>🔴 ${p.name}</span> <span class="text-rose-400 text-[10px] px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-800/50">In Match 🎮</span>`; } else { count++; div.innerHTML = `<span>🟢 ${p.name}</span> <button class="bg-cyan-600 hover:bg-cyan-500 px-3.5 py-1.5 rounded-xl text-xs text-white shadow cursor-pointer">Challenge</button>`; div.querySelector('button').addEventListener('click', () => sendChallenge(id, p.name)); } onlinePlayersList.appendChild(div); }); if (count === 0 && onlinePlayersList.children.length === 0) onlinePlayersList.innerHTML = '<p class="text-xs text-center opacity-50 py-4">No other available players online.</p>'; }); }

let outgoingTargetId = null;
function sendChallenge(targetId, targetName) { playSound('bell'); myRole = 'X'; localStorage.setItem('myRole', 'X'); opponentName = targetName; opponentId = targetId; outgoingTargetId = targetId; currentMatchId = playerId < targetId ? playerId + '_' + targetId : targetId + '_' + playerId; localStorage.setItem('currentMatchId', currentMatchId); const selectedFormat = matchFormatSelect.value; window.dbSet(window.dbRef(window.db, 'matches/' + currentMatchId), { boardStates: Array(9).fill().map(() => Array(9).fill('')), boardWins: Array(9).fill(null), activeBoardIndex: null, currentPlayer: 'X', status: 'waiting', format: selectedFormat, matchScores: { X: 0, O: 0 }, playerNames: { X: playerName, O: targetName } }); window.dbSet(window.dbRef(window.db, 'challenges/' + targetId), { fromId: playerId, fromName: playerName, matchId: currentMatchId, status: 'pending', format: selectedFormat }); onlineLobbyModal.style.display = 'none'; challengeTitle.textContent = `Waiting for ${targetName}...`; challengeText.textContent = `Challenge sent! Waiting for them to accept.`; document.getElementById('challengeActionButtons').style.display = 'none'; cancelChallengeBtn.classList.remove('hidden'); challengeModal.style.display = 'flex'; gameModeBadge.textContent = `Online vs ${targetName}`; if (myChallengeStatusListener) myChallengeStatusListener(); myChallengeStatusListener = window.dbOnValue(window.dbRef(window.db, 'challenges/' + targetId), (snap) => { const data = snap.val(); if (data && data.status === 'declined') { showCustomAlert('Challenge Declined', `${targetName} declined your challenge.`); challengeModal.style.display = 'none'; cancelChallengeBtn.classList.add('hidden'); window.location.hash = '#lobby'; window.dbRemove(window.dbRef(window.db, 'matches/' + currentMatchId)); if (myChallengeStatusListener) { myChallengeStatusListener(); myChallengeStatusListener = null; } } }); listenToMatch(currentMatchId); }
cancelChallengeBtn.onclick = () => { playSound('click'); if (outgoingTargetId) window.dbUpdate(window.dbRef(window.db, 'challenges/' + outgoingTargetId), { status: 'cancelled' }); challengeModal.style.display = 'none'; cancelChallengeBtn.classList.add('hidden'); if (currentMatchId) window.dbRemove(window.dbRef(window.db, 'matches/' + currentMatchId)); window.location.hash = '#lobby'; };
let activeChallengeData = null;
function showIncomingChallenge(data) { activeChallengeData = data; currentMatchId = data.matchId; localStorage.setItem('currentMatchId', currentMatchId); opponentName = data.fromName; opponentId = data.fromId; let formatLabel = data.format === '3' ? 'Best of 3' : data.format === '5' ? 'Best of 5' : data.format === 'infinity' ? 'Endless' : 'Single Match'; challengeTitle.textContent = `Challenge from ${data.fromName}!`; challengeText.textContent = `${data.fromName} challenged you to a [${formatLabel}].`; document.getElementById('challengeActionButtons').style.display = 'flex'; cancelChallengeBtn.classList.add('hidden'); challengeModal.style.display = 'flex'; }
acceptChallengeBtn.onclick = () => { playSound('start'); challengeModal.style.display = 'none'; window.location.hash = '#game'; gameMode = 'online-p2p'; myRole = 'O'; localStorage.setItem('myRole', 'O'); gameModeBadge.textContent = `Online vs ${opponentName}`; registerOnlinePresence('in-game'); window.dbUpdate(window.dbRef(window.db, 'matches/' + currentMatchId), { status: 'playing', ['playerNames/O']: playerName }); window.dbRemove(window.dbRef(window.db, 'challenges/' + playerId)); listenToMatch(currentMatchId); };
rejectChallengeBtn.onclick = () => { playSound('click'); challengeModal.style.display = 'none'; if (activeChallengeData) { window.dbUpdate(window.dbRef(window.db, 'challenges/' + playerId), { status: 'declined' }); setTimeout(() => window.dbRemove(window.dbRef(window.db, 'challenges/' + playerId)), 3000); } };

function startDisconnectTimer() { if (disconnectTimerInterval) return; disconnectModal.style.display = 'flex'; let timeLeft = 30; disconnectTimerEl.textContent = timeLeft; disconnectTimerInterval = setInterval(() => { timeLeft--; disconnectTimerEl.textContent = timeLeft; if (timeLeft <= 0) { stopDisconnectTimer(); showCustomAlert('Match Aborted', 'Opponent disconnected. Match closed.', () => { leaveRoom(); }); } }, 1000); }
function stopDisconnectTimer() { if (disconnectTimerInterval) { clearInterval(disconnectTimerInterval); disconnectTimerInterval = null; } disconnectModal.style.display = 'none'; }
forceLeaveBtn.addEventListener('click', () => { playSound('click'); stopDisconnectTimer(); leaveRoom(); });

function listenToOpponentStatus(oppId) {
    if (opponentStatusUnsubscribe) opponentStatusUnsubscribe();
    opponentStatusUnsubscribe = window.dbOnValue(window.dbRef(window.db, 'players/' + oppId + '/status'), (snap) => {
        let st = snap.val();
        if (st === 'offline') { connDot.className = 'w-2 h-2 rounded-full bg-rose-500 animate-pulse'; connText.textContent = 'Disconnected'; if (gameMode === 'online-p2p' && currentMatchId) startDisconnectTimer(); } 
        else { connDot.className = 'w-2 h-2 rounded-full bg-emerald-500'; connText.textContent = 'Online'; stopDisconnectTimer(); }
    });
}

function leaveRoom() {
    stopDisconnectTimer(); if (opponentStatusUnsubscribe) { opponentStatusUnsubscribe(); opponentStatusUnsubscribe = null; }
    if (currentMatchId && window.db) window.dbRemove(window.dbRef(window.db, 'matches/' + currentMatchId));
    currentMatchId = null; localStorage.removeItem('currentMatchId'); localStorage.removeItem('myRole'); connectionStatus.classList.add('hidden'); registerOnlinePresence('online'); gameMode = 'pve'; gameModeBadge.textContent = 'Offline Mode'; window.location.hash = '#menu'; initGame();
}

resetBtn.addEventListener('click', () => { playSound('click'); if (gameMode === 'online-p2p' && currentMatchId) { showCustomAlert('Restart Request', 'Restart request sent! Waiting for opponent...', null); window.dbUpdate(window.dbRef(window.db, 'matches/' + currentMatchId), { resetRequest: { from: myRole, response: 'pending' } }); } else { initGame(); } });
acceptResetBtn.onclick = () => { playSound('start'); resetRequestModal.style.display = 'none'; if (currentMatchId) window.dbUpdate(window.dbRef(window.db, 'matches/' + currentMatchId), { boardStates: Array(9).fill().map(() => Array(9).fill('')), boardWins: Array(9).fill(null), activeBoardIndex: null, currentPlayer: 'X', winnerData: null, resetRequest: null }); };
declineResetBtn.onclick = () => { playSound('click'); resetRequestModal.style.display = 'none'; if (currentMatchId) window.dbUpdate(window.dbRef(window.db, 'matches/' + currentMatchId + '/resetRequest'), { response: 'declined' }); };
acceptRematchBtn.onclick = () => { playSound('click'); acceptRematchBtn.textContent = '⏳ Waiting...'; acceptRematchBtn.disabled = true; if (gameMode === 'online-p2p' && currentMatchId && window.db) { window.dbUpdate(window.dbRef(window.db, `matches/${currentMatchId}/postMatch`), { [myRole]: 'accepted' }); } else { victoryModal.style.display = 'none'; initGame(); } };
declineRematchBtn.onclick = () => { playSound('click'); if (gameMode === 'online-p2p' && currentMatchId && window.db) { window.dbUpdate(window.dbRef(window.db, `matches/${currentMatchId}/postMatch`), { [myRole]: 'declined' }); } else { victoryModal.style.display = 'none'; leaveRoom(); } };

let hasDeclinedAlertShown = false;

function listenToMatch(matchId) {
    if (activeMatchUnsubscribe) activeMatchUnsubscribe();
    activeMatchUnsubscribe = window.dbOnValue(window.dbRef(window.db, 'matches/' + matchId), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            currentFormat = data.format || '1'; targetWins = getTargetWins(currentFormat);
            scores = data.matchScores || { X: 0, O: 0 }; scoreXEl.textContent = scores.X; scoreOEl.textContent = scores.O;
            
            if (data.playerNames) { opponentName = myRole === 'X' ? (data.playerNames.O || 'Opponent') : (data.playerNames.X || 'Opponent'); gameModeBadge.textContent = `Online vs ${opponentName}`; }
            
            boardStates = data.boardStates || Array(9).fill().map(() => Array(9).fill('')); boardWins = data.boardWins || Array(9).fill(null); activeBoardIndex = data.activeBoardIndex !== undefined ? data.activeBoardIndex : null; currentPlayer = data.currentPlayer || 'X';

            if (data.resetRequest) { let req = data.resetRequest; if (req.response === 'pending' && req.from !== myRole) { resetRequestModal.style.display = 'flex'; } else if (req.response === 'declined' && req.from === myRole) { showCustomAlert('Request Declined', 'Your opponent declined to restart.'); window.dbUpdate(window.dbRef(window.db, 'matches/' + matchId), { resetRequest: null }); } } else { resetRequestModal.style.display = 'none'; }
            
            if (data.winnerData) {
                if (!roundProcessed) { roundProcessed = true; processMatchEnd(data.winnerData.winnerRole, data.winnerData.isCupWin, data.winnerData.winnerName); }
            } else { roundProcessed = false; victoryModal.style.display = 'none'; acceptRematchBtn.disabled = false; hasDeclinedAlertShown = false; }

            if (data.postMatch) {
                let xVote = data.postMatch.X, oVote = data.postMatch.O;
                if (xVote === 'accepted' && oVote === 'accepted') {
                    playSound('start'); let newScores = scores; if (scores.X >= targetWins || scores.O >= targetWins) newScores = { X: 0, O: 0 };
                    if (myRole === 'X') window.dbUpdate(window.dbRef(window.db, 'matches/' + matchId), { boardStates: Array(9).fill().map(() => Array(9).fill('')), boardWins: Array(9).fill(null), activeBoardIndex: null, currentPlayer: 'X', winnerData: null, postMatch: null, matchScores: newScores });
                } else if ((xVote === 'declined' || oVote === 'declined') && !hasDeclinedAlertShown) {
                    hasDeclinedAlertShown = true; victoryModal.style.display = 'none'; showCustomAlert('Match Ended', 'تم إنهاء المباراة لأن المنافس رفض الإكمال أو غادر.', () => leaveRoom());
                }
            }
            
            if (data.status === 'playing') {
                if (myChallengeStatusListener) { myChallengeStatusListener(); myChallengeStatusListener = null; }
                navigateTo('#game'); gameMode = 'online-p2p'; connectionStatus.classList.remove('hidden'); connectionStatus.style.display = 'flex'; registerOnlinePresence('in-game'); renderBoard(); updateStatus();
                if (!opponentStatusUnsubscribe && matchId) { let parts = matchId.split('_'); opponentId = (parts[0] === playerId) ? parts[1] : parts[0]; listenToOpponentStatus(opponentId); }
            }
        } else {
            if (gameMode === 'online-p2p' && !hasDeclinedAlertShown) { hasDeclinedAlertShown = true; showCustomAlert('Room Closed', 'انتهت الجلسة لأن المنافس غادر الغرفة.', () => leaveRoom()); }
        }
    });
}

pveMenuBtn.addEventListener('click', () => { playSound('click'); aiDifficultyModal.style.display = 'flex'; }); cancelAiModalBtn.addEventListener('click', () => { playSound('click'); aiDifficultyModal.style.display = 'none'; });
document.querySelectorAll('.ai-diff-btn').forEach(btn => {
    btn.addEventListener('click', (e) => { playSound('start'); aiDifficulty = e.target.getAttribute('data-level'); gameMode = 'pve'; gameModeBadge.textContent = `vs AI (${aiDifficulty.toUpperCase()})`; currentFormat = matchFormatSelect.value; targetWins = getTargetWins(currentFormat); scores = { X: 0, O: 0 }; window.location.hash = '#game'; connectionStatus.style.display = 'none'; connectionStatus.classList.add('hidden'); initGame(); });
});

function initGame() { currentPlayer = 'X'; activeBoardIndex = null; boardWins = Array(9).fill(null); boardStates = Array(9).fill().map(() => Array(9).fill('')); victoryModal.style.display = 'none'; roundProcessed = false; scoreXEl.textContent = scores.X; scoreOEl.textContent = scores.O; renderBoard(); updateStatus(); }

function renderBoard() {
    ultimateBoard.innerHTML = '';
    for (let b = 0; b < 9; b++) {
        const localBoardDiv = document.createElement('div'); localBoardDiv.className = 'local-grid local-board-bg p-2 rounded-xl border-2 transition-all relative overflow-hidden';
        const isBoardActive = (activeBoardIndex === null || activeBoardIndex === b);
        if (boardWins[b]) { localBoardDiv.className += ' border-opacity-40 opacity-90'; const overlay = document.createElement('div'); overlay.className = 'absolute inset-0 overlay-bg flex items-center justify-center font-black text-5xl z-10'; overlay.textContent = boardWins[b]; localBoardDiv.appendChild(overlay); }
        else if (isBoardActive) { if (gameMode === 'online-p2p') { if (currentPlayer === myRole) localBoardDiv.className += ' my-turn-local'; else localBoardDiv.className += ' waiting-local opacity-60'; } else localBoardDiv.className += ' active-local-board'; }
        else { localBoardDiv.className += ' opacity-40'; }
        for (let c = 0; c < 9; c++) {
            const cellBtn = document.createElement('button'); cellBtn.className = 'cell-btn aspect-square rounded-md font-bold text-lg md:text-xl flex items-center justify-center transition-all cursor-pointer'; cellBtn.textContent = boardStates[b] && boardStates[b][c] ? boardStates[b][c] : '';
            if ((boardStates[b] && boardStates[b][c] !== '') || !isBoardActive || boardWins[b]) { cellBtn.disabled = true; } else { cellBtn.addEventListener('click', () => { playSound('click'); handleCellClick(b, c); }); }
            localBoardDiv.appendChild(cellBtn);
        }
        ultimateBoard.appendChild(localBoardDiv);
    }
}

function handleCellClick(bIndex, cIndex) {
    if (gameMode === 'online-p2p' && currentPlayer !== myRole) return;
    if (!boardStates[bIndex] || boardStates[bIndex][cIndex] !== '' || boardWins[bIndex] !== null) return;

    boardStates[bIndex][cIndex] = currentPlayer;
    if (checkSmallWin(boardStates[bIndex])) { boardWins[bIndex] = currentPlayer; } else if (boardStates[bIndex].every(cell => cell !== '')) { boardWins[bIndex] = 'DRAW'; }

    let matchWinner = null;
    if (checkUltimateWin()) { matchWinner = currentPlayer; } else if (boardWins.every(win => win !== null)) { matchWinner = 'DRAW'; }

    activeBoardIndex = (boardWins[cIndex] !== null) ? null : cIndex;
    let nextPlayer = currentPlayer === 'X' ? 'O' : 'X';

    if (gameMode === 'online-p2p' && currentMatchId) {
        let updates = { boardStates: boardStates, boardWins: boardWins, activeBoardIndex: activeBoardIndex, currentPlayer: nextPlayer };
        if (matchWinner) {
            let wName = matchWinner === 'DRAW' ? 'No One' : (matchWinner === myRole ? playerName : opponentName);
            let newScores = { X: scores.X, O: scores.O }; if (matchWinner !== 'DRAW') newScores[matchWinner]++;
            let cupWon = matchWinner !== 'DRAW' && (newScores[matchWinner] >= targetWins);
            updates.matchScores = newScores; updates.winnerData = { winnerRole: matchWinner, winnerName: wName, isCupWin: cupWon };
        }
        window.dbUpdate(window.dbRef(window.db, 'matches/' + currentMatchId), updates);
    } else {
        currentPlayer = nextPlayer; renderBoard(); updateStatus();
        if (matchWinner) {
            if (matchWinner !== 'DRAW') scores[matchWinner]++;
            let cupWon = matchWinner !== 'DRAW' && (scores[matchWinner] >= targetWins);
            processMatchEnd(matchWinner, cupWon, matchWinner === 'DRAW' ? 'No One' : `Player ${matchWinner}`);
        } else if (gameMode === 'pve' && currentPlayer === 'O') { setTimeout(makeAiMove, 600); }
    }
}

function processMatchEnd(winnerRole, isCupWin, winnerName) {
    const isMe = (gameMode === 'online-p2p') ? (winnerRole === myRole) : (winnerRole === 'X');
    if (winnerRole === 'DRAW' || isMe) playSound('win'); else playSound('lose');
    stats.total++;
    if (winnerRole === 'DRAW') { userArenaPoints += 1; } else { if (isMe) { stats.wins++; userArenaPoints += 3; } else { stats.losses++; userArenaPoints = Math.max(0, userArenaPoints - 1); } }
    if (window.db && playerId) { window.dbUpdate(window.dbRef(window.db, 'players/' + playerId), { points: userArenaPoints }); }
    showEndModal(winnerRole, winnerName, isCupWin);
}

function showEndModal(winnerRole, winnerName, isCupWin) {
    if (winnerRole === 'DRAW') { victoryTitle.textContent = `🤝 IT'S A DRAW! 🤝`; victoryText.textContent = `Both played well! (+1 pt)`; acceptRematchBtn.innerHTML = (targetWins > 1 && currentFormat !== 'infinity') ? '▶️ Ready for Next Round' : '🤝 Play Again'; } else {
        const isMe = (gameMode === 'online-p2p') ? (winnerRole === myRole) : (winnerRole === 'X');
        if (isCupWin) { victoryTitle.textContent = isMe ? `🏆 YOU WON THE CUP! 🏆` : `💔 ${winnerName} WON THE CUP! 💔`; victoryText.textContent = `Target: ${targetWins} Wins Reached!`; acceptRematchBtn.innerHTML = '🏆 Start New Cup'; declineRematchBtn.innerHTML = '🚪 Exit to Menu'; } else { victoryTitle.textContent = isMe ? `🎉 ROUND WON! 🎉` : `😢 ROUND LOST!`; victoryText.textContent = `Score: ${scores.X} - ${scores.O} | First to ${targetWins} wins!`; acceptRematchBtn.innerHTML = '▶️ Ready for Next Round'; declineRematchBtn.innerHTML = '🏳️ Forfeit & Exit'; }
    }
    victoryModal.style.display = 'flex';
}

function getAiWinBlockMove(b, empty, player) { for (let i of empty) { boardStates[b][i] = player; let wins = checkSmallWin(boardStates[b]); boardStates[b][i] = ''; if (wins) return i; } return null; }
function evaluateCellForImpossibleAI(b, c) { let score = 0; if (c === 4) score += 4; else if ([0,2,6,8].includes(c)) score += 2; if (boardWins[c] !== null) score -= 30; else { let nextEmpty = []; for (let i=0; i<9; i++) if (boardStates[c][i] === '') nextEmpty.push(i); let oppCanWin = getAiWinBlockMove(c, nextEmpty, 'X'); if (oppCanWin !== null) score -= 15; } return score; }
function makeAiMove() {
    let targetBoards = []; if (activeBoardIndex === null || boardWins[activeBoardIndex] !== null) { for (let i = 0; i < 9; i++) if (boardWins[i] === null) targetBoards.push(i); } else { targetBoards.push(activeBoardIndex); }
    if (targetBoards.length === 0) return; let bestMoves = []; let maxScore = -Infinity;
    for (let b of targetBoards) {
        let empty = []; for (let c = 0; c < 9; c++) if (boardStates[b][c] === '') empty.push(c);
        if (empty.length > 0) {
            if (aiDifficulty === 'easy') { bestMoves.push({b: b, c: empty[Math.floor(Math.random() * empty.length)]}); } else if (aiDifficulty === 'medium') { let win = getAiWinBlockMove(b, empty, 'O'); let block = getAiWinBlockMove(b, empty, 'X'); if (win !== null) bestMoves.push({b: b, c: win}); else if (block !== null) bestMoves.push({b: b, c: block}); else bestMoves.push({b: b, c: empty[Math.floor(Math.random() * empty.length)]}); } else {
                let win = getAiWinBlockMove(b, empty, 'O'); let block = getAiWinBlockMove(b, empty, 'X'); if (win !== null) { triggerMove(b, win); return; }
                if (block !== null) { let score = 60 + evaluateCellForImpossibleAI(b, block); if (score > maxScore) { maxScore = score; bestMoves = [{b: b, c: block}]; } else if (score === maxScore) { bestMoves.push({b: b, c: block}); } continue; }
                for (let c of empty) { let score = evaluateCellForImpossibleAI(b, c); if (score > maxScore) { maxScore = score; bestMoves = [{b: b, c: c}]; } else if (score === maxScore) { bestMoves.push({b: b, c: c}); } }
            }
        }
    }
    if (bestMoves.length > 0) { let move = bestMoves[Math.floor(Math.random() * bestMoves.length)]; handleCellClick(move.b, move.c); }
}

function checkSmallWin(cells) { if (!cells) return false; const wins = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]]; return wins.some(([x,y,z]) => cells[x] && cells[x] === cells[y] && cells[x] === cells[z]); }
function checkUltimateWin() { const wins = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]]; return wins.some(([x,y,z]) => boardWins[x] && boardWins[x] !== 'DRAW' && boardWins[x] === boardWins[y] && boardWins[x] === boardWins[z]); }
function updateStatus() { turnIndicator.textContent = currentPlayer; }

function startApp() { setupPresence(); handleAutoLogin(); }
if (window.db) { startApp(); } else { window.addEventListener('firebase-ready', startApp); }