// ==========================================
// 1. Audio & Lightweight Background
// ==========================================

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();

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
    }

    else if (type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.setValueAtTime(700, audioCtx.currentTime + 0.2);

        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    }

    else if (type === 'lose') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(150, audioCtx.currentTime + 0.4);

        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    }
}


// ==========================================
// 2. Background
// ==========================================

const bgCanvas = document.getElementById('bgCanvas');
const bgCtx = bgCanvas.getContext('2d');

let bgParticles = [];

function resizeBg() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeBg);
resizeBg();

for (let i = 0; i < 18; i++) {
    bgParticles.push({
        x: Math.random() * bgCanvas.width,
        y: Math.random() * bgCanvas.height,
        size: Math.random() * 28 + 24,
        speedY: Math.random() * 0.4 + 0.1,
        char: Math.random() > 0.5 ? 'X' : 'O',
        rot: Math.random() * Math.PI,
        rSpeed: (Math.random() - 0.5) * 0.01
    });
}

function animateBg() {
    bgCtx.clearRect(
        0,
        0,
        bgCanvas.width,
        bgCanvas.height
    );

    const primary =
        getComputedStyle(document.documentElement)
            .getPropertyValue('--primary')
            .trim() || '#06b6d4';

    bgParticles.forEach(p => {
        p.y -= p.speedY;
        p.rot += p.rSpeed;

        if (p.y < -50) {
            p.y = bgCanvas.height + 50;
            p.x = Math.random() * bgCanvas.width;
        }

        bgCtx.save();

        bgCtx.translate(p.x, p.y);
        bgCtx.rotate(p.rot);

        bgCtx.fillStyle = primary;
        bgCtx.globalAlpha = 0.08;
        bgCtx.font = `900 ${p.size}px sans-serif`;
        bgCtx.textAlign = 'center';
        bgCtx.textBaseline = 'middle';

        bgCtx.fillText(
            p.char,
            0,
            0
        );

        bgCtx.restore();
    });

    requestAnimationFrame(animateBg);
}

animateBg();


// ==========================================
// 3. Global State
// ==========================================

let playerId =
    localStorage.getItem('playerId') || null;

let playerName =
    localStorage.getItem('playerName') || '';

let playerPin =
    localStorage.getItem('playerPin') || '';

let sessionId =
    's_' +
    Math.random()
        .toString(36)
        .substr(2, 9);

let gameMode = 'offline';
let aiLevel = 'medium';

let currentFormat = '1';
let targetWins = 1;

let currentMatchId = null;
let myRole = 'X';

let opponentName = 'Opponent';
let opponentId = null;

let boardWins =
    Array(9).fill(null);

let boardStates =
    Array(9)
        .fill()
        .map(() => Array(9).fill(''));

let activeBoardIndex = -1;
let currentPlayer = 'X';

let scores = {
    X: 0,
    O: 0
};

async function initializeFirebaseSession() {
    if (!window.db) return;

    if (!playerId) {
        navigate('#login');
        return;
    }

    try {
        const snap = await window.dbGet(
            window.dbRef(window.db, `players/${playerId}`)
        );

        if (!snap.exists() || snap.val().pin !== playerPin) {
            localStorage.clear();

            playerId = null;
            playerName = '';
            playerPin = '';

            navigate('#login');
            return;
        }

        const d = snap.val() || {};

        userStats = {
            points: d.points || 0,
            wins: d.wins || 0,
            losses: d.losses || 0,
            history: d.history || []
        };

        // تشغيل الـ Presence والـ Challenge Listener
        setupPresence();

        await processPendingResults(true);

        navigate(window.location.hash || '#menu');

    } catch (err) {
        console.error('Firebase session init failed:', err);

        showCustomAlert(
            'Connection Error',
            'Could not connect to the game server. Please refresh and try again.'
        );
    }
}

// Firebase ممكن يكون جهز قبل تحميل script.js
// لذلك نفحص window.db مباشرة.
if (window.db) {
    initializeFirebaseSession();
} else {
    // ولو Firebase لسه ما جهزش، نستنى الحدث.
    window.addEventListener(
        'firebase-ready',
        initializeFirebaseSession,
        { once: true }
    );
}
// ==========================================
// 4. Custom Modals
// ==========================================

function showCustomAlert(title, text) {
    playSound('click');

    getEl('customModalTitle').textContent =
        title;

    getEl('customModalText').textContent =
        text;

    getEl('customModalButtons').innerHTML = `
        <button
            id="cmOk"
            class="w-full py-3 rounded-xl font-bold text-sm bg-cyan-600 text-white cursor-pointer"
        >
            OK
        </button>
    `;

    getEl('customModal').style.display =
        'flex';

    getEl('cmOk').onclick = () => {
        getEl('customModal').style.display =
            'none';
    };
}

function showCustomConfirm(
    title,
    text,
    onConfirm
) {
    playSound('click');

    getEl('customModalTitle').textContent =
        title;

    getEl('customModalText').textContent =
        text;

    getEl('customModalButtons').innerHTML = `
        <button
            id="cmYes"
            class="w-full py-3 rounded-xl font-bold text-sm bg-cyan-600 text-white cursor-pointer"
        >
            Yes
        </button>

        <button
            id="cmNo"
            class="w-full bg-rose-600 text-white font-bold py-3 rounded-xl text-sm cursor-pointer"
        >
            No
        </button>
    `;

    getEl('customModal').style.display =
        'flex';

    getEl('cmYes').onclick = () => {
        getEl('customModal').style.display =
            'none';

        onConfirm();
    };

    getEl('cmNo').onclick = () => {
        getEl('customModal').style.display =
            'none';
    };
}


// ==========================================
// 5. Routing
// ==========================================

function navigate(hash) {
    if (
        !playerId &&
        hash !== '#login'
    ) {
        window.location.hash =
            '#login';

        return;
    }

    if (
        playerId &&
        hash === '#login'
    ) {
        window.location.hash =
            '#menu';

        return;
    }

    document
        .querySelectorAll('.view-section')
        .forEach(el =>
            el.classList.add('hidden')
        );

    const target =
        getEl(
            `view-${hash.replace('#', '')}`
        );

    if (target) {
        target.classList.remove(
            'hidden'
        );
    }

    getEl('mainHeader')
        .classList
        .toggle(
            'hidden',
            hash === '#login'
        );

    if (hash === '#menu')
        updateMenuData();

    if (hash === '#lobby')
        fetchOnlinePlayers();

    if (hash === '#profile')
        loadProfileData();

    if (hash === '#history')
        loadHistoryData();

    if (hash === '#leaderboard')
        fetchLeaderboard();

    window.location.hash =
        hash;
}

window.addEventListener(
    'hashchange',
    () => {
        navigate(
            window.location.hash ||
            (playerId
                ? '#menu'
                : '#login')
        );
    }
);


// ==========================================
// 6. Theme
// ==========================================

const themeSelect =
    getEl('themeSelector');

themeSelect.value =
    localStorage.getItem('theme') ||
    'theme-cyberpunk';

getEl('htmlRoot').className =
    themeSelect.value;

themeSelect.addEventListener(
    'change',
    e => {
        playSound('click');

        localStorage.setItem(
            'theme',
            e.target.value
        );

        getEl('htmlRoot').className =
            e.target.value;

        if (
            window.db &&
            playerId
        ) {
            window.dbUpdate(
                window.dbRef(
                    window.db,
                    `players/${playerId}`
                ),
                {
                    theme:
                        e.target.value
                }
            );
        }
    }
);


// ==========================================
// 7. Authentication
// ==========================================

getEl('togglePinBtn').onclick =
    e => {
        const input =
            getEl('playerPinInput');

        if (
            input.classList.contains(
                'password-disc'
            )
        ) {
            input.classList.remove(
                'password-disc'
            );

            e.target.textContent =
                '🙈';
        } else {
            input.classList.add(
                'password-disc'
            );

            e.target.textContent =
                '👁️';
        }
    };

getEl('playerPinInput')
    .addEventListener(
        'input',
        function () {
            this.value =
                this.value.replace(
                    /[^0-9]/g,
                    ''
                );
        }
    );

getEl('playerNameInput')
    .addEventListener(
        'input',
        function () {
            this.value =
                this.value
                    .toLowerCase()
                    .replace(
                        /[^a-z ]/g,
                        ''
                    );
        }
    );

let isRegister = false;

getEl('authSwitchBtn').onclick =
    () => {
        isRegister =
            !isRegister;

        playSound('click');

        getEl(
            'authModalTitle'
        ).textContent =
            isRegister
                ? 'Create Account'
                : 'Player Login';

        getEl(
            'authSubmitBtn'
        ).textContent =
            isRegister
                ? 'Register'
                : 'Login';

        getEl(
            'authSwitchBtn'
        ).textContent =
            isRegister
                ? 'Have an account? Login'
                : 'Create Account';
    };

getEl('authSubmitBtn').onclick =
    async () => {
        playSound('click');

        const name =
            getEl('playerNameInput')
                .value
                .replace(
                    /\s{2,}/g,
                    ' '
                )
                .trim();

        const pin =
            getEl('playerPinInput')
                .value;

        if (
            !/^[a-z ]{3,40}$/.test(
                name
            )
        ) {
            return showCustomAlert(
                'Error',
                'Name must be 3-40 lowercase letters.'
            );
        }

        if (
            !/^\d{4}$/.test(pin)
        ) {
            return showCustomAlert(
                'Error',
                'PIN must be exactly 4 digits.'
            );
        }

        if (!window.db) {
            return showCustomAlert(
                'Wait',
                'Connecting to server...'
            );
        }

        const snap =
            await window.dbGet(
                window.dbRef(
                    window.db,
                    'players'
                )
            );

        let exists = false;
        let matchedId = null;
        let pData = null;

        if (snap.exists()) {
            snap.forEach(child => {
                const u =
                    child.val();

                if (
                    u.name === name
                ) {
                    exists = true;
                    matchedId =
                        child.key;
                    pData = u;
                }
            });
        }

        if (isRegister) {
            if (exists) {
                return showCustomAlert(
                    'Taken',
                    'Name exists. Try logging in.'
                );
            }

            playerId =
                'p_' +
                Math.random()
                    .toString(36)
                    .substr(2, 9);

            playerName = name;
            playerPin = pin;

            userStats = {
                points: 0,
                wins: 0,
                losses: 0,
                history: []
            };
        } else {
            if (
                !exists ||
                pData.pin !== pin
            ) {
                return showCustomAlert(
                    'Failed',
                    'Invalid name or PIN.'
                );
            }

            playerId =
                matchedId;

            playerName =
                pData.name;

            playerPin =
                pData.pin;

            userStats = {
                points:
                    pData.points || 0,

                wins:
                    pData.wins || 0,

                losses:
                    pData.losses || 0,

                history:
                    pData.history || []
            };
        }

        localStorage.setItem(
            'playerId',
            playerId
        );

        localStorage.setItem(
            'playerName',
            playerName
        );

        localStorage.setItem(
            'playerPin',
            playerPin
        );

        setupPresence();

        await processPendingResults(
            true
        );

        navigate('#menu');
    };


// ==========================================
// 8. Presence
// ==========================================

function setupPresence() {
    if (
        !window.db ||
        !playerId
    ) {
        return;
    }

    const r =
        window.dbRef(
            window.db,
            `players/${playerId}`
        );

    window.dbOnDisconnect(r)
        .update({
            status: 'offline',
            lastActive: Date.now()
        });

    if (presenceHeartbeat) {
        clearInterval(
            presenceHeartbeat
        );
    }

    presenceUpdater =
        stat =>
            window.dbUpdate(
                r,
                {
                    name:
                        playerName,

                    pin:
                        playerPin,

                    points:
                        userStats.points,

                    wins:
                        userStats.wins,

                    losses:
                        userStats.losses,

                    status:
                        stat,

                    sessionId,

                    lastActive:
                        Date.now()
                }
            );

    presenceUpdater(
        currentMatchId
            ? 'in-game'
            : 'online'
    );

    presenceHeartbeat =
        setInterval(
            () => {
                if (
                    document.visibilityState ===
                    'visible'
                ) {
                    presenceUpdater(
                        currentMatchId
                            ? 'in-game'
                            : 'online'
                    );
                }
            },
            5000
        );

    document.addEventListener(
        'visibilitychange',
        () => {
            if (
                document.visibilityState ===
                'visible'
            ) {
                presenceUpdater(
                    currentMatchId
                        ? 'in-game'
                        : 'online'
                );
            } else {
                presenceUpdater(
                    'offline'
                );
            }
        }
    );

    window.dbOnValue(
        window.dbRef(
            window.db,
            `players/${playerId}/sessionId`
        ),
        snap => {
            if (
                snap.exists() &&
                snap.val() !==
                    sessionId
            ) {
                localStorage.clear();

                alert(
                    'Logged in from another device!'
                );

                window.location.reload();
            }
        }
    );

    if (!challengeListener) {
        challengeListener =
            window.dbOnValue(
                window.dbRef(
                    window.db,
                    `challenges/${playerId}`
                ),
                snap => {
                    const data =
                        snap.val();

                    if (
                        data?.status ===
                        'pending'
                    ) {
                        showIncomingChallenge(
                            data
                        );
                    }
                }
            );
    }
}


// ==========================================
// 9. Firebase Ready
// ==========================================

window.addEventListener(
    'firebase-ready',
    async () => {
        if (playerId) {
            const snap =
                await window.dbGet(
                    window.dbRef(
                        window.db,
                        `players/${playerId}`
                    )
                );

            if (
                snap.exists() &&
                snap.val().pin ===
                    playerPin
            ) {
                const d =
                    snap.val();

                userStats = {
                    points:
                        d.points || 0,

                    wins:
                        d.wins || 0,

                    losses:
                        d.losses || 0,

                    history:
                        d.history || []
                };

                setupPresence();

                await processPendingResults(
                    true
                );

                navigate(
                    window.location.hash ||
                    '#menu'
                );
            } else {
                localStorage.clear();

                navigate('#login');
            }
        } else {
            navigate('#login');
        }
    }
);


// ==========================================
// 10. Logout
// ==========================================

getEl('logoutBtn').onclick =
    () =>
        showCustomConfirm(
            'Logout',
            'Are you sure?',
            () => {
                if (
                    window.db &&
                    playerId
                ) {
                    window.dbUpdate(
                        window.dbRef(
                            window.db,
                            `players/${playerId}`
                        ),
                        {
                            status:
                                'offline'
                        }
                    );
                }

                localStorage.clear();

                window.location.reload();
            }
        );


// ==========================================
// 11. Menu / Profile / History
// ==========================================

function updateMenuData() {
    getEl('menuUsername')
        .textContent =
        playerName;
}

function getRank(pts) {
    if (pts < 20)
        return 'Rookie 🥉';

    if (pts < 50)
        return 'Fighter 🥈';

    if (pts < 100)
        return 'Master 🥇';

    return 'Grandmaster 🏆';
}

async function getPlayerRank(id) {
    if (!window.db)
        return null;

    try {
        const snap =
            await window.dbGet(
                window.dbRef(
                    window.db,
                    'players'
                )
            );

        if (!snap.exists())
            return null;

        const players = [];

        snap.forEach(c => {
            const d =
                c.val() || {};

            if (d.name) {
                players.push({
                    id: c.key,
                    name: d.name,
                    points:
                        Number(
                            d.points
                        ) || 0
                });
            }
        });

        players.sort(
            (a, b) =>
                (b.points -
                    a.points) ||
                a.name.localeCompare(
                    b.name
                )
        );

        const i =
            players.findIndex(
                x => x.id === id
            );

        return i < 0
            ? null
            : i + 1;

    } catch (e) {
        return null;
    }
}


// ==========================================
// 12. Result Settlement
// ==========================================

async function commitPlayerResult(
    result
) {
    if (
        !window.db ||
        !playerId ||
        !result ||
        !result.players ||
        !result.players[playerId]
    ) {
        return null;
    }

    const mine =
        result.players[playerId];

    const matchKey =
        result.matchId;

    const playerRef =
        window.dbRef(
            window.db,
            `players/${playerId}`
        );

    try {
        const tx =
            await window.dbTransaction(
                playerRef,
                current => {
                    if (!current)
                        return current;

                    current = {
                        ...current
                    };

                    current.points =
                        Number(
                            current.points
                        ) || 0;

                    current.wins =
                        Number(
                            current.wins
                        ) || 0;

                    current.losses =
                        Number(
                            current.losses
                        ) || 0;

                    current.history =
                        Array.isArray(
                            current.history
                        )
                            ? current.history
                            : [];

                    current.processedMatches =
                        current.processedMatches ||
                        {};

                    if (
                        current
                            .processedMatches[
                            matchKey
                        ]
                    ) {
                        return current;
                    }

                    current.points +=
                        Number(
                            mine.delta
                        ) || 0;

                    if (
                        mine.outcome ===
                        'Win'
                    ) {
                        current.wins++;
                    }

                    if (
                        mine.outcome ===
                        'Loss'
                    ) {
                        current.losses++;
                    }

                    current.history.push({
                        res:
                            mine.outcome,

                        opp:
                            mine.opponentName ||
                            'Opponent',

                        pointsDelta:
                            mine.delta,

                        matchId:
                            matchKey,

                        at:
                            result.at ||
                            Date.now()
                    });

                    if (
                        current.history
                            .length > 50
                    ) {
                        current.history =
                            current.history.slice(
                                -50
                            );
                    }

                    current.processedMatches[
                        matchKey
                    ] = true;

                    return current;
                }
            );

        if (!tx.committed)
            return null;

        const updated =
            tx.snapshot.val() ||
            {};

        userStats = {
            points:
                Number(
                    updated.points
                ) || 0,

            wins:
                Number(
                    updated.wins
                ) || 0,

            losses:
                Number(
                    updated.losses
                ) || 0,

            history:
                Array.isArray(
                    updated.history
                )
                    ? updated.history
                    : []
        };

        return updated;

    } catch (e) {
        console.error(
            'Result settlement failed',
            e
        );

        return null;
    }
}

async function buildResultMessage(
    result,
    stats,
    mine
) {
    const rank =
        await getPlayerRank(
            playerId
        );

    const label =
        mine.outcome === 'Win'
            ? 'كسبت'
            : mine.outcome === 'Loss'
                ? 'خسرت'
                : 'تعادل';

    const deltaText =
        mine.delta > 0
            ? `+${mine.delta}`
            : `${mine.delta}`;

    return (
        `${label} ${Math.abs(mine.delta)} نقطة ` +
        `(${deltaText}) — ` +
        `نقاطك الحالية: ${
            Number(stats?.points) || 0
        }` +
        `${
            rank
                ? ` — ترتيبك: #${rank}`
                : ''
        }.`
    );
}

async function publishMatchResult(
    matchId,
    winnerRole = 'DRAW',
    reason = 'game'
) {
    if (
        !window.db ||
        !matchId
    ) {
        return null;
    }

    const matchRef =
        window.dbRef(
            window.db,
            `matches/${matchId}`
        );

    try {
        const tx =
            await window.dbTransaction(
                matchRef,
                d => {
                    if (!d)
                        return d;

                    if (d.result)
                        return d;

                    const players =
                        d.players || {};

                    const xId =
                        players.X?.id;

                    const oId =
                        players.O?.id;

                    if (!xId || !oId)
                        return d;

                    const xName =
                        players.X?.name ||
                        'Player X';

                    const oName =
                        players.O?.name ||
                        'Player O';

                    const draw =
                        winnerRole ===
                        'DRAW';

                    const xWin =
                        winnerRole === 'X';

                    d.result = {
                        matchId,

                        type:
                            draw
                                ? 'draw'
                                : reason,

                        winnerRole:
                            draw
                                ? null
                                : winnerRole,

                        at:
                            Date.now(),

                        players: {
                            [xId]: {
                                outcome:
                                    draw
                                        ? 'Draw'
                                        : xWin
                                            ? 'Win'
                                            : 'Loss',

                                delta:
                                    draw
                                        ? 1
                                        : xWin
                                            ? 3
                                            : -1,

                                opponentName:
                                    oName
                            },

                            [oId]: {
                                outcome:
                                    draw
                                        ? 'Draw'
                                        : xWin
                                            ? 'Loss'
                                            : 'Win',

                                delta:
                                    draw
                                        ? 1
                                        : xWin
                                            ? -1
                                            : 3,

                                opponentName:
                                    xName
                            }
                        }
                    };

                    return d;
                }
            );

        if (!tx.committed)
            return null;

        const result =
            tx.snapshot.val()
                ?.result || null;

        if (result?.players) {
            const updates = {};

            Object.keys(
                result.players
            ).forEach(id => {
                updates[
                    `pendingResults/${id}/${matchId}`
                ] = result;
            });

            await window.dbUpdate(
                window.dbRef(
                    window.db
                ),
                updates
            );
        }

        return result;

    } catch (e) {
        console.error(
            'Could not publish match result',
            e
        );

        return null;
    }
}

async function handleOnlineResult(
    result,
    showMessage = true
) {
    if (
        !result ||
        !result.players?.[playerId]
    ) {
        return;
    }

    if (
        lastHandledResultId ===
        result.matchId
    ) {
        return;
    }

    const mine =
        result.players[playerId];

    const stats =
        await commitPlayerResult(
            result
        );

    if (!stats)
        return;

    lastHandledResultId =
        result.matchId;

    if (showMessage) {
        const msg =
            await buildResultMessage(
                result,
                stats,
                mine
            );

        showCustomAlert(
            mine.outcome === 'Win'
                ? 'You Won'
                : mine.outcome === 'Loss'
                    ? 'You Lost'
                    : 'Draw',
            msg
        );
    }

    if (window.db) {
        await window.dbRemove(
            window.dbRef(
                window.db,
                `pendingResults/${playerId}/${result.matchId}`
            )
        );
    }

    loadProfileData();
}

async function processPendingResults() {
    if (
        !window.db ||
        !playerId
    ) {
        return;
    }

    const r =
        window.dbRef(
            window.db,
            `pendingResults/${playerId}`
        );

    const snap =
        await window.dbGet(r);

    if (!snap.exists())
        return;

    const jobs = [];

    snap.forEach(c => {
        jobs.push({
            key: c.key,
            value: c.val()
        });
    });

    for (const job of jobs) {
        await handleOnlineResult(
            job.value,
            false
        );

        await window.dbRemove(
            window.dbRef(
                window.db,
                `pendingResults/${playerId}/${job.key}`
            )
        );
    }
}


// ==========================================
// 13. Profile / History
// ==========================================

function loadProfileData() {
    getEl(
        'profileNameDisplay'
    ).textContent =
        playerName;

    getEl(
        'profileRankTitle'
    ).textContent =
        getRank(
            userStats.points
        );

    getEl(
        'statPoints'
    ).textContent =
        userStats.points;

    getEl(
        'statWins'
    ).textContent =
        userStats.wins;

    getEl(
        'statLosses'
    ).textContent =
        userStats.losses;
}

function loadHistoryData() {
    const hl =
        getEl('matchHistoryList');

    hl.innerHTML = '';

    if (
        !userStats.history ||
        userStats.history.length === 0
    ) {
        hl.innerHTML =
            '<p class="text-slate-500 text-center py-6 text-xs">No matches recorded yet.</p>';

        return;
    }

    [
        ...userStats.history
    ]
        .reverse()
        .forEach(m => {
            hl.innerHTML += `
                <li class="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5 text-xs">
                    <span class="${
                        m.res === 'Win'
                            ? 'text-emerald-400'
                            : m.res === 'Loss'
                                ? 'text-rose-400'
                                : 'text-amber-400'
                    } font-bold">
                        ${m.res}
                    </span>

                    <span class="text-slate-300">
                        vs ${m.opp}
                    </span>
                </li>
            `;
        });
}


// ==========================================
// 14. PIN / Account
// ==========================================

getEl('updatePinBtn').onclick =
    () => {
        if (currentMatchId) {
            return showCustomAlert(
                'Blocked',
                'Cannot change PIN while in a game.'
            );
        }

        const oldPin =
            getEl('updateOldPin')
                .value;

        const newPin =
            getEl('updateNewPin')
                .value;

        if (
            oldPin !== playerPin
        ) {
            return showCustomAlert(
                'Error',
                'Old PIN incorrect.'
            );
        }

        if (
            !/^\d{4}$/.test(
                newPin
            )
        ) {
            return showCustomAlert(
                'Error',
                'New PIN must be 4 digits.'
            );
        }

        playerPin =
            newPin;

        localStorage.setItem(
            'playerPin',
            newPin
        );

        window.dbUpdate(
            window.dbRef(
                window.db,
                `players/${playerId}`
            ),
            {
                pin: newPin
            }
        );

        showCustomAlert(
            'Success',
            'PIN updated safely.'
        );

        getEl(
            'updateOldPin'
        ).value = '';

        getEl(
            'updateNewPin'
        ).value = '';
    };

getEl('deleteAccountBtn').onclick =
    () => {
        if (currentMatchId) {
            return showCustomAlert(
                'Blocked',
                'Cannot delete account during a match.'
            );
        }

        const pinInput =
            getEl(
                'deleteAccountPin'
            ).value;

        if (
            pinInput !==
            playerPin
        ) {
            return showCustomAlert(
                'Error',
                'Incorrect PIN. Deletion cancelled.'
            );
        }

        showCustomConfirm(
            'Delete Account',
            'Are you sure you want to delete your account permanently?',
            async () => {
                if (
                    window.db &&
                    playerId
                ) {
                    await window.dbRemove(
                        window.dbRef(
                            window.db,
                            `players/${playerId}`
                        )
                    );

                    await window.dbRemove(
                        window.dbRef(
                            window.db,
                            `challenges/${playerId}`
                        )
                    );
                }

                localStorage.clear();
                window.location.reload();
            }
        );
    };


// ==========================================
// 15. Leaderboard
// ==========================================

function fetchLeaderboard() {
    if (!window.db)
        return;

    window.dbOnValue(
        window.dbRef(
            window.db,
            'players'
        ),
        snap => {
            const p =
                snap.val();

            if (!p)
                return;

            const arr =
                Object.values(p)
                    .filter(x => x.name)
                    .sort(
                        (a, b) =>
                            (b.points || 0) -
                            (a.points || 0)
                    )
                    .slice(
                        0,
                        10
                    );

            const list =
                getEl(
                    'leaderboardList'
                );

            list.innerHTML = '';

            arr.forEach(
                (x, i) => {
                    list.innerHTML += `
                        <div class="flex justify-between p-3 border-b border-white/10 last:border-0 items-center bg-black/20 rounded-lg mb-1 text-xs">
                            <span class="font-bold">
                                <span class="text-slate-400 mr-2">
                                    #${i + 1}
                                </span>

                                ${x.name}
                            </span>

                            <span class="text-amber-400 font-black">
                                ${x.points || 0}
                            </span>
                        </div>
                    `;
                }
            );
        },
        {
            onlyOnce: true
        }
    );
}


// ==========================================
// 16. Online Lobby
// ==========================================

getEl('refreshLobbyBtn').onclick =
    () => {
        playSound('click');
        fetchOnlinePlayers();
    };

function fetchOnlinePlayers() {
    if (
        !window.db ||
        !playerId
    ) {
        return;
    }

    if (lobbyListener) {
        lobbyListener();
        lobbyListener = null;
    }

    lobbyListener =
        window.dbOnValue(
            window.dbRef(
                window.db,
                'players'
            ),
            snap => {
                const list =
                    getEl(
                        'onlinePlayersList'
                    );

                if (!list)
                    return;

                list.innerHTML = '';

                const now =
                    Date.now();

                let found = false;

                snap.forEach(c => {
                    if (
                        c.key ===
                        playerId
                    ) {
                        return;
                    }

                    const u =
                        c.val() || {};

                    const fresh =
                        now -
                        (
                            Number(
                                u.lastActive
                            ) || 0
                        ) <
                        15000;

                    if (
                        u.status ===
                            'offline' ||
                        !fresh
                    ) {
                        return;
                    }

                    found = true;

                    const ingame =
                        u.status ===
                        'in-game';

                    const safeName =
                        String(
                            u.name ||
                            'Player'
                        )
                            .replace(
                                /"/g,
                                '&quot;'
                            );

                    list.innerHTML += `
                        <div class="flex justify-between items-center p-3 bg-black/40 rounded-xl border border-white/10 text-xs">

                            <span class="font-bold capitalize truncate max-w-[120px]">
                                <span class="${
                                    ingame
                                        ? 'text-rose-500'
                                        : 'text-emerald-500'
                                }">
                                    ●
                                </span>

                                ${u.name || 'Player'}
                            </span>

                            ${
                                ingame
                                    ? `
                                        <span class="text-[10px] text-rose-400 border border-rose-500/30 px-2 py-1 rounded bg-rose-900/30">
                                            In-Game
                                        </span>
                                    `
                                    : `
                                        <button
                                            data-id="${c.key}"
                                            data-name="${safeName}"
                                            class="challenge-btn bg-cyan-700 hover:bg-cyan-600 px-3 py-1.5 rounded-lg font-bold text-xs shadow-md cursor-pointer"
                                        >
                                            Challenge
                                        </button>
                                    `
                            }

                        </div>
                    `;
                });

                if (!found) {
                    list.innerHTML =
                        '<p class="text-slate-500 text-center py-4 text-xs">No one is online.</p>';
                }

                list
                    .querySelectorAll(
                        '.challenge-btn'
                    )
                    .forEach(
                        btn => {
                            btn.onclick =
                                () =>
                                    sendChallenge(
                                        btn.dataset.id,
                                        btn.dataset.name
                                    );
                        }
                    );
            }
        );
}


// ==========================================
// 17. Challenges
// ==========================================

async function sendChallenge(
    targetId,
    targetName
) {
    if (
        !window.db ||
        !targetId ||
        targetId === playerId ||
        currentMatchId
    ) {
        return;
    }

    if (
        challengeResponseListener
    ) {
        challengeResponseListener();
        challengeResponseListener =
            null;
    }

    const format =
        getEl(
            'matchFormatSelect'
        ).value;

    const challengeId =
        `c_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 7)}`;

    const challengeRef =
        window.dbRef(
            window.db,
            `challenges/${targetId}`
        );

    await window.dbSet(
        challengeRef,
        {
            id: challengeId,
            fromId: playerId,
            fromName: playerName,
            matchId: challengeId,
            status: 'pending',
            format,
            time: Date.now()
        }
    );

    showCustomAlert(
        'Sent!',
        `Waiting for ${targetName} to accept...`
    );

    let settled = false;

    challengeResponseListener =
        window.dbOnValue(
            challengeRef,
            snap => {
                const d =
                    snap.val();

                if (
                    settled ||
                    d?.id !==
                        challengeId
                ) {
                    return;
                }

                if (
                    d.status ===
                    'accepted'
                ) {
                    settled = true;

                    challengeResponseListener();
                    challengeResponseListener =
                        null;

                    startOnlineMatch(
                        challengeId,
                        'X',
                        targetName,
                        targetId,
                        format
                    );
                }

                else if (
                    d.status ===
                        'declined' ||
                    d.status ===
                        'expired'
                ) {
                    settled = true;

                    challengeResponseListener();
                    challengeResponseListener =
                        null;

                    showCustomAlert(
                        'Challenge',
                        `${targetName} declined the challenge.`
                    );
                }
            }
        );

    setTimeout(
        async () => {
            if (
                settled ||
                currentMatchId
            ) {
                return;
            }

            const snap =
                await window.dbGet(
                    challengeRef
                );

            const d =
                snap.val();

            if (
                d?.id ===
                    challengeId &&
                d.status ===
                    'pending'
            ) {
                settled = true;

                await window.dbUpdate(
                    challengeRef,
                    {
                        status:
                            'expired'
                    }
                );

                if (
                    challengeResponseListener
                ) {
                    challengeResponseListener();
                    challengeResponseListener =
                        null;
                }

                showCustomAlert(
                    'Challenge',
                    'Challenge expired.'
                );
            }
        },
        30000
    );
}

let activeIncoming = null;

function showIncomingChallenge(
    data
) {
    if (
        !data ||
        data.status !==
            'pending' ||
        currentMatchId
    ) {
        return;
    }

    if (
        Date.now() -
            (
                Number(
                    data.time
                ) || 0
            ) >
        30000
    ) {
        window.dbRemove(
            window.dbRef(
                window.db,
                `challenges/${playerId}`
            )
        );

        return;
    }

    activeIncoming =
        data;

    getEl(
        'challengeText'
    ).textContent =
        `${data.fromName} challenges you to [${
            data.format === '1'
                ? 'Single'
                : data.format === '3'
                    ? 'BO3'
                    : 'BO5'
        }]`;

    getEl(
        'challengeModal'
    ).style.display =
        'flex';
}

getEl(
    'acceptChallengeBtn'
).onclick =
    async () => {
        if (
            !activeIncoming ||
            !window.db ||
            currentMatchId
        ) {
            return;
        }

        const d =
            activeIncoming;

        const challengeRef =
            window.dbRef(
                window.db,
                `challenges/${playerId}`
            );

        const tx =
            await window.dbTransaction(
                challengeRef,
                current => {
                    if (
                        !current ||
                        current.id !==
                            d.id ||
                        current.status !==
                            'pending'
                    ) {
                        return;
                    }

                    current.status =
                        'accepted';

                    return current;
                }
            );

        if (!tx.committed) {
            getEl(
                'challengeModal'
            ).style.display =
                'none';

            activeIncoming =
                null;

            return;
        }

        const matchRef =
            window.dbRef(
                window.db,
                `matches/${d.matchId}`
            );

        await window.dbTransaction(
            matchRef,
            current =>
                current ||
                {
                    matchId:
                        d.matchId,

                    format:
                        d.format,

                    scores: {
                        X: 0,
                        O: 0
                    },

                    players: {
                        X: {
                            id:
                                d.fromId,

                            name:
                                d.fromName
                        },

                        O: {
                            id:
                                playerId,

                            name:
                                playerName
                        }
                    },

                    boardStates:
                        JSON.stringify(
                            Array(9)
                                .fill()
                                .map(
                                    () =>
                                        Array(
                                            9
                                        ).fill('')
                                )
                        ),

                    boardWins:
                        JSON.stringify(
                            Array(9).fill(
                                null
                            )
                        ),

                    currentPlayer:
                        'X',

                    activeBoardIndex:
                        -1,

                    lastMove:
                        null,

                    lastActive:
                        Date.now(),

                    turnStartedAt:
                        Date.now(),

                    result:
                        null,

                    rematch:
                        null,

                    roundProcessed:
                        false
                }
        );

        getEl(
            'challengeModal'
        ).style.display =
            'none';

        activeIncoming =
            null;

        startOnlineMatch(
            d.matchId,
            'O',
            d.fromName,
            d.fromId,
            d.format
        );
    };

getEl(
    'rejectChallengeBtn'
).onclick =
    async () => {
        if (
            activeIncoming &&
            window.db
        ) {
            await window.dbUpdate(
                window.dbRef(
                    window.db,
                    `challenges/${playerId}`
                ),
                {
                    status:
                        'declined'
                }
            );
        }

        getEl(
            'challengeModal'
        ).style.display =
            'none';

        activeIncoming =
            null;
    };

getEl(
    'cancelChallengeBtn'
).onclick =
    () => {
        getEl(
            'challengeModal'
        ).style.display =
            'none';
    };


// ==========================================
// 18. Core Game
// ==========================================

function isBoardFull(
    arr
) {
    return arr.every(
        c => c !== ''
    );
}

function checkSmallWin(
    arr
) {
    const lines = [
        [0,1,2],
        [3,4,5],
        [6,7,8],
        [0,3,6],
        [1,4,7],
        [2,5,8],
        [0,4,8],
        [2,4,6]
    ];

    for (
        const [a,b,c]
        of lines
    ) {
        if (
            arr[a] &&
            arr[a] === arr[b] &&
            arr[a] === arr[c]
        ) {
            return arr[a];
        }
    }

    return null;
}

function checkUltimateWin() {
    const lines = [
        [0,1,2],
        [3,4,5],
        [6,7,8],
        [0,3,6],
        [1,4,7],
        [2,5,8],
        [0,4,8],
        [2,4,6]
    ];

    for (
        const [a,b,c]
        of lines
    ) {
        if (
            boardWins[a] &&
            boardWins[a] !==
                'DRAW' &&
            boardWins[a] ===
                boardWins[b] &&
            boardWins[a] ===
                boardWins[c]
        ) {
            return boardWins[a];
        }
    }

    return null;
}

function initGameHTML() {
    const board =
        getEl(
            'ultimateBoard'
        );

    board.innerHTML =
        '';

    for (
        let b = 0;
        b < 9;
        b++
    ) {
        const local =
            document.createElement(
                'div'
            );

        local.className =
            `local-grid id-bg-${b}`;

        const overlay =
            document.createElement(
                'div'
            );

        overlay.className =
            `overlay-bg hidden id-ov-${b}`;

        local.appendChild(
            overlay
        );

        for (
            let c = 0;
            c < 9;
            c++
        ) {
            const btn =
                document.createElement(
                    'button'
                );

            btn.className =
                `cell-btn id-btn-${b}-${c}`;

            btn.onclick =
                () =>
                    tryMove(
                        b,
                        c
                    );

            local.appendChild(
                btn
            );
        }

        board.appendChild(
            local
        );
    }
}

function renderGameUI() {
    getEl(
        'turnIndicator'
    ).textContent =
        currentPlayer;

    getEl(
        'turnIndicator'
    ).className =
        `font-extrabold text-base ${
            currentPlayer === 'X'
                ? 'cell-x'
                : 'cell-o'
        }`;

    getEl(
        'scoreX'
    ).textContent =
        scores.X;

    getEl(
        'scoreO'
    ).textContent =
        scores.O;

    for (
        let b = 0;
        b < 9;
        b++
    ) {
        const bg =
            document.querySelector(
                `.id-bg-${b}`
            );

        const overlay =
            document.querySelector(
                `.id-ov-${b}`
            );

        if (
            boardWins[b]
        ) {
            overlay.classList.remove(
                'hidden'
            );

            bg.classList.add(
                'local-board-won'
            );

            overlay.textContent =
                boardWins[b] ===
                'DRAW'
                    ? '➖'
                    : boardWins[b];

            overlay.className =
                `overlay-bg id-ov-${b} ${
                    boardWins[b] ===
                    'X'
                        ? 'cell-x'
                        : boardWins[b] ===
                            'O'
                            ? 'cell-o'
                            : 'text-slate-400'
                }`;
        } else {
            overlay.classList.add(
                'hidden'
            );

            bg.classList.remove(
                'local-board-won'
            );
        }

        const active =
            (
                activeBoardIndex ===
                    -1 ||
                activeBoardIndex ===
                    b
            ) &&
            !boardWins[b];

        bg.classList.remove(
            'active-local-board',
            'waiting-local',
            'inactive-local'
        );

        if (active) {
            if (
                gameMode ===
                    'online' &&
                currentPlayer !==
                    myRole
            ) {
                bg.classList.add(
                    'waiting-local'
                );
            } else {
                bg.classList.add(
                    'active-local-board'
                );
            }
        } else {
            bg.classList.add(
                'inactive-local'
            );
        }

        for (
            let c = 0;
            c < 9;
            c++
        ) {
            const btn =
                document.querySelector(
                    `.id-btn-${b}-${c}`
                );

            if (!btn)
                continue;

            const val =
                boardStates[b][c];

            btn.textContent =
                val;

            btn.className =
                `cell-btn id-btn-${b}-${c} ${
                    val === 'X'
                        ? 'cell-x'
                        : val === 'O'
                            ? 'cell-o'
                            : ''
                } ${
                    lastMove &&
                    lastMove.b === b &&
                    lastMove.c === c
                        ? 'last-move-highlight'
                        : ''
                }`;

            btn.disabled =
                val !== '' ||
                !active ||
                isUI_Locked ||
                (
                    gameMode ===
                        'online' &&
                    currentPlayer !==
                        myRole
                );
        }
    }
}


// ==========================================
// 19. Turn Processing
// ==========================================

function processTurn(
    b,
    c,
    simulatedPlayer
) {
    const p =
        simulatedPlayer ||
        currentPlayer;

    boardStates[b][c] =
        p;

    lastMove = {
        b,
        c
    };

    const smallWin =
        checkSmallWin(
            boardStates[b]
        );

    if (smallWin) {
        boardWins[b] =
            smallWin;

        if (
            !simulatedPlayer
        ) {
            playSound('win');

            getEl(
                'htmlRoot'
            )
                .classList
                .add(
                    'screen-shake'
                );

            setTimeout(
                () =>
                    getEl(
                        'htmlRoot'
                    )
                        .classList
                        .remove(
                            'screen-shake'
                        ),
                300
            );
        }
    }

    else if (
        isBoardFull(
            boardStates[b]
        )
    ) {
        boardWins[b] =
            'DRAW';
    }

    const ultimateWin =
        checkUltimateWin();

    const ultimateDraw =
        boardWins.every(
            x => x !== null
        );

    if (
        ultimateWin ||
        ultimateDraw
    ) {
        return handleRoundEnd(
            ultimateWin ||
            'DRAW'
        );
    }

    if (
        boardWins[c] !==
            null ||
        isBoardFull(
            boardStates[c]
        )
    ) {
        activeBoardIndex =
            -1;
    } else {
        activeBoardIndex =
            c;
    }

    currentPlayer =
        p === 'X'
            ? 'O'
            : 'X';
}


// ==========================================
// 20. Round End
// ==========================================

async function handleRoundEnd(
    winner,
    reason = 'game'
) {
    winner =
        winner || 'DRAW';

    if (
        winner !== 'DRAW'
    ) {
        scores[winner]++;
    }

    const cupWon =
        winner !== 'DRAW' &&
        scores[winner] >=
            targetWins;

    if (
        gameMode ===
            'online' &&
        currentMatchId
    ) {
        if (
            currentFormat !==
                '1' &&
            !cupWon
        ) {
            return finishOnlineRound(
                winner
            );
        }

        const result =
            await publishMatchResult(
                currentMatchId,
                winner,
                reason
            );

        if (result) {
            await handleOnlineResult(
                result,
                true
            );
        }

        return;
    }

    if (
        cupWon ||
        currentFormat ===
            '1' ||
        winner === 'DRAW'
    ) {
        const outcome =
            winner === 'DRAW'
                ? 'Draw'
                : winner === 'X'
                    ? 'Win'
                    : 'Loss';

        if (
            outcome === 'Win'
        ) {
            userStats.wins++;
        }

        if (
            outcome === 'Loss'
        ) {
            userStats.losses++;
        }

        userStats.points +=
            winner === 'DRAW'
                ? 1
                : outcome === 'Win'
                    ? 3
                    : -1;

        userStats.history.push({
            res:
                outcome,

            opp:
                opponentName
        });

        if (
            window.db &&
            playerId
        ) {
            await window.dbUpdate(
                window.dbRef(
                    window.db,
                    `players/${playerId}`
                ),
                userStats
            );
        }
    }

    isUI_Locked =
        true;

    playSound(
        winner === 'DRAW'
            ? 'click'
            : winner === 'X'
                ? 'win'
                : 'lose'
    );

    getEl(
        'victoryTitle'
    ).textContent =
        winner === 'DRAW'
            ? 'DRAW!'
            : `WINNER: ${
                winner === 'X'
                    ? playerName
                    : opponentName
            }`;

    getEl(
        'victoryText'
    ).textContent =
        winner === 'DRAW'
            ? 'Game finished. Ready for a new game.'
            : cupWon
                ? `Cup Won! Score: ${scores.X}-${scores.O}`
                : `Round End! Score: ${scores.X}-${scores.O}`;

    getEl(
        'acceptRematchBtn'
    ).textContent =
        cupWon ||
        currentFormat === '1'
            ? 'Play Again'
            : 'Next Round / Ready';

    getEl(
        'victoryModal'
    ).style.display =
        'flex';
}

async function finishOnlineRound(
    winner
) {
    if (
        !currentMatchId ||
        !window.db
    ) {
        return;
    }

    const matchRef =
        window.dbRef(
            window.db,
            `matches/${currentMatchId}`
        );

    const tx =
        await window.dbTransaction(
            matchRef,
            current => {
                if (
                    !current ||
                    current.roundProcessed ||
                    current.result
                ) {
                    return current;
                }

                current.roundProcessed =
                    true;

                current.roundWinner =
                    winner;

                current.scores =
                    current.scores ||
                    {
                        X: 0,
                        O: 0
                    };

                if (
                    winner !==
                    'DRAW'
                ) {
                    current.scores[
                        winner
                    ] =
                        (
                            Number(
                                current.scores[
                                    winner
                                ]
                            ) || 0
                        ) + 1;
                }

                current.lastActive =
                    Date.now();

                return current;
            }
        );

    const d =
        tx.snapshot.val();

    if (
        !d?.roundWinner
    ) {
        return;
    }

    scores =
        d.scores ||
        scores;

    isUI_Locked =
        true;

    getEl(
        'victoryTitle'
    ).textContent =
        winner === 'DRAW'
            ? 'DRAW!'
            : `ROUND WIN: ${
                winner === myRole
                    ? playerName
                    : opponentName
            }`;

    getEl(
        'victoryText'
    ).textContent =
        `Score: ${scores.X}-${scores.O}`;

    getEl(
        'acceptRematchBtn'
    ).textContent =
        'Next Round / Ready';

    getEl(
        'victoryModal'
    ).style.display =
        'flex';
}


// ==========================================
// 21. Offline / AI
// ==========================================

document
    .querySelectorAll(
        '.ai-diff-btn'
    )
    .forEach(btn => {
        btn.onclick =
            e => {
                playSound('start');

                aiLevel =
                    e.target.getAttribute(
                        'data-level'
                    );

                gameMode =
                    'offline';

                currentFormat =
                    getEl(
                        'matchFormatSelect'
                    ).value;

                targetWins =
                    currentFormat ===
                        '1'
                        ? 1
                        : currentFormat ===
                            '3'
                            ? 2
                            : 3;

                opponentName =
                    `AI (${aiLevel})`;

                getEl(
                    'gameModeBadge'
                ).textContent =
                    opponentName;

                getEl(
                    'emojiBar'
                ).classList.add(
                    'hidden'
                );

                getEl(
                    'turnTimerContainer'
                ).classList.add(
                    'hidden'
                );

                startLocalRound(
                    true
                );

                navigate(
                    '#game'
                );
            };
    });

function startLocalRound(
    fullReset
) {
    if (fullReset) {
        scores = {
            X: 0,
            O: 0
        };
    }

    boardStates =
        Array(9)
            .fill()
            .map(() =>
                Array(9).fill('')
            );

    boardWins =
        Array(9).fill(null);

    currentPlayer =
        'X';

    activeBoardIndex =
        -1;

    lastMove =
        null;

    isUI_Locked =
        false;

    getEl(
        'victoryModal'
    ).style.display =
        'none';

    initGameHTML();
    renderGameUI();
}

async function tryMove(
    b,
    c
) {
    if (
        isUI_Locked ||
        boardStates[b][c] !== ''
    ) {
        return;
    }

    playSound('click');

    if (
        gameMode ===
        'offline'
    ) {
        processTurn(
            b,
            c
        );

        renderGameUI();

        if (
            !isUI_Locked &&
            currentPlayer === 'O'
        ) {
            isUI_Locked =
                true;

            setTimeout(
                () => {
                    isUI_Locked =
                        false;

                    makeAiMove();
                },
                600
            );
        }

        return;
    }

    if (
        !currentMatchId ||
        currentPlayer !==
            myRole
    ) {
        return;
    }

    isUI_Locked =
        true;

    const matchRef =
        window.dbRef(
            window.db,
            `matches/${currentMatchId}`
        );

    try {
        const tx =
            await window.dbTransaction(
                matchRef,
                current => {
                    if (
                        !current ||
                        current.result ||
                        current.roundProcessed ||
                        current.currentPlayer !==
                            myRole
                    ) {
                        return;
                    }

                    let states;
                    let wins;

                    try {
                        states =
                            JSON.parse(
                                current.boardStates
                            );

                        wins =
                            JSON.parse(
                                current.boardWins
                            );
                    } catch (e) {
                        return;
                    }

                    if (
                        !Array.isArray(
                            states[b]
                        ) ||
                        states[b][c] !==
                            '' ||
                        wins[b]
                    ) {
                        return;
                    }

                    const allowed =
                        current.activeBoardIndex ===
                            -1 ||
                        Number(
                            current.activeBoardIndex
                        ) === b;

                    if (!allowed)
                        return;

                    states[b][c] =
                        myRole;

                    const smallWin =
                        checkSmallWin(
                            states[b]
                        );

                    if (smallWin) {
                        wins[b] =
                            smallWin;
                    }

                    else if (
                        isBoardFull(
                            states[b]
                        )
                    ) {
                        wins[b] =
                            'DRAW';
                    }

                    const ultimate =
                        (() => {
                            const lines = [
                                [0,1,2],
                                [3,4,5],
                                [6,7,8],
                                [0,3,6],
                                [1,4,7],
                                [2,5,8],
                                [0,4,8],
                                [2,4,6]
                            ];

                            for (
                                const [
                                    x,
                                    y,
                                    z
                                ]
                                of lines
                            ) {
                                if (
                                    wins[x] &&
                                    wins[x] !==
                                        'DRAW' &&
                                    wins[x] ===
                                        wins[y] &&
                                    wins[x] ===
                                        wins[z]
                                ) {
                                    return wins[x];
                                }
                            }

                            return null;
                        })();

                    const full =
                        wins.every(
                            x =>
                                x !==
                                null
                        );

                    const next =
                        (
                            ultimate ||
                            full
                        )
                            ? -1
                            : (
                                wins[c] ||
                                isBoardFull(
                                    states[c]
                                )
                            )
                                ? -1
                                : c;

                    current.boardStates =
                        JSON.stringify(
                            states
                        );

                    current.boardWins =
                        JSON.stringify(
                            wins
                        );

                    current.activeBoardIndex =
                        next;

                    current.currentPlayer =
                        myRole === 'X'
                            ? 'O'
                            : 'X';

                    current.lastMove = {
                        b,
                        c
                    };

                    current.lastActive =
                        Date.now();

                    current.turnStartedAt =
                        Date.now();

                    return current;
                }
            );

        if (
            !tx.committed
        ) {
            return;
        }

    } finally {
        isUI_Locked =
            false;
    }
}

function makeAiMove() {
    const targetBoards =
        activeBoardIndex ===
            -1
            ? boardWins
                .map(
                    (v, i) =>
                        v === null
                            ? i
                            : -1
                )
                .filter(
                    i =>
                        i !== -1
                )
            : [
                activeBoardIndex
            ];

    const moves = [];

    targetBoards.forEach(
        b => {
            for (
                let c = 0;
                c < 9;
                c++
            ) {
                if (
                    boardStates[b][c] !==
                    ''
                ) {
                    continue;
                }

                let score = 0;

                if (
                    aiLevel ===
                        'medium' ||
                    aiLevel ===
                        'impossible'
                ) {
                    boardStates[b][c] =
                        'O';

                    if (
                        checkSmallWin(
                            boardStates[b]
                        )
                    ) {
                        score +=
                            100;
                    }

                    boardStates[b][c] =
                        '';

                    boardStates[b][c] =
                        'X';

                    if (
                        checkSmallWin(
                            boardStates[b]
                        )
                    ) {
                        score +=
                            50;
                    }

                    boardStates[b][c] =
                        '';
                }

                if (
                    aiLevel ===
                    'impossible'
                ) {
                    if (c === 4) {
                        score += 5;
                    }

                    else if (
                        [
                            0,
                            2,
                            6,
                            8
                        ].includes(c)
                    ) {
                        score += 2;
                    }
                }

                moves.push({
                    b,
                    c,
                    score:
                        score +
                        Math.random()
                });
            }
        }
    );

    if (
        moves.length > 0
    ) {
        moves.sort(
            (a, b) =>
                b.score -
                a.score
        );

        const best =
            moves[0];

        processTurn(
            best.b,
            best.c
        );

        renderGameUI();
    }
}


// ==========================================
// 22. Online Timer
// ==========================================

function stopTurnTimer() {
    if (
        turnTimerInterval
    ) {
        clearInterval(
            turnTimerInterval
        );

        turnTimerInterval =
            null;
    }
}

function startTurnTimer(d) {
    stopTurnTimer();

    if (
        gameMode !==
            'online' ||
        !d?.turnStartedAt
    ) {
        return;
    }

    const tick =
        async () => {
            const left =
                Math.max(
                    0,
                    120 -
                        Math.floor(
                            (
                                Date.now() -
                                Number(
                                    d.turnStartedAt
                                )
                            ) /
                                1000
                        )
                );

            getEl(
                'turnTimerText'
            ).textContent =
                left;

            if (
                left === 0 &&
                d.currentPlayer ===
                    myRole &&
                !d.result
            ) {
                await publishMatchResult(
                    currentMatchId,
                    myRole === 'X'
                        ? 'O'
                        : 'X',
                    'timeout'
                );
            }
        };

    tick();

    turnTimerInterval =
        setInterval(
            tick,
            500
        );
}


// ==========================================
// 23. Disconnect Grace
// ==========================================

function stopDisconnectGrace() {
    if (
        disconnectGraceInterval
    ) {
        clearInterval(
            disconnectGraceInterval
        );

        disconnectGraceInterval =
            null;
    }

    opponentOfflineSince =
        0;
}

function watchOpponentPresence() {
    if (
        opponentPresenceListener
    ) {
        opponentPresenceListener();
        opponentPresenceListener =
            null;
    }

    stopDisconnectGrace();

    if (
        !window.db ||
        !opponentId
    ) {
        return;
    }

    opponentPresenceListener =
        window.dbOnValue(
            window.dbRef(
                window.db,
                `players/${opponentId}`
            ),
            snap => {
                const u =
                    snap.val() ||
                    {};

                const offline =
                    u.status ===
                        'offline' ||
                    Date.now() -
                        (
                            Number(
                                u.lastActive
                            ) || 0
                        ) >
                        15000;

                if (
                    offline &&
                    !matchResultData
                ) {
                    if (
                        !opponentOfflineSince
                    ) {
                        opponentOfflineSince =
                            Date.now();
                    }

                    if (
                        !disconnectGraceInterval
                    ) {
                        disconnectGraceInterval =
                            setInterval(
                                async () => {
                                    const elapsed =
                                        Date.now() -
                                        opponentOfflineSince;

                                    if (
                                        elapsed >=
                                            120000 &&
                                        !matchResultData
                                    ) {
                                        stopDisconnectGrace();

                                        await publishMatchResult(
                                            currentMatchId,
                                            myRole ===
                                                'X'
                                                ? 'O'
                                                : 'X',
                                            'disconnect'
                                        );
                                    }
                                },
                                500
                            );
                    }
                } else {
                    stopDisconnectGrace();
                }
            }
        );
}


// ==========================================
// 24. Online Match
// ==========================================

function startOnlineMatch(
    matchId,
    role,
    oppName,
    oppId,
    format
) {
    currentMatchId =
        matchId;

    myRole =
        role;

    opponentName =
        oppName;

    opponentId =
        oppId;

    gameMode =
        'online';

    currentFormat =
        format;

    targetWins =
        format === '1'
            ? 1
            : format === '3'
                ? 2
                : 3;

    lastHandledResultId =
        null;

    matchResultShown =
        false;

    matchResultData =
        null;

    getEl(
        'gameModeBadge'
    ).textContent =
        `YOU VS ${opponentName}`;

    getEl(
        'emojiBar'
    ).classList.remove(
        'hidden'
    );

    getEl(
        'turnTimerContainer'
    ).classList.remove(
        'hidden'
    );

    getEl(
        'victoryModal'
    ).style.display =
        'none';

    initGameHTML();

    navigate(
        '#game'
    );

    window.dbUpdate(
        window.dbRef(
            window.db,
            `players/${playerId}`
        ),
        {
            status:
                'in-game',

            lastActive:
                Date.now()
        }
    );

    if (
        matchListener
    ) {
        matchListener();
        matchListener =
            null;
    }

    const matchRef =
        window.dbRef(
            window.db,
            `matches/${matchId}`
        );

    watchOpponentPresence();

    matchListener =
        window.dbOnValue(
            matchRef,
            async snap => {
                const d =
                    snap.val();

                if (!d) {
                    stopTurnTimer();

                    return leaveMatch(
                        false
                    );
                }

                try {
                    boardStates =
                        JSON.parse(
                            d.boardStates ||
                            '[]'
                        );

                    boardWins =
                        JSON.parse(
                            d.boardWins ||
                            '[]'
                        );
                } catch (e) {
                    boardStates =
                        Array(9)
                            .fill()
                            .map(
                                () =>
                                    Array(
                                        9
                                    ).fill('')
                            );

                    boardWins =
                        Array(9).fill(
                            null
                        );
                }

                activeBoardIndex =
                    d.activeBoardIndex ??
                    -1;

                currentPlayer =
                    d.currentPlayer ||
                    'X';

                lastMove =
                    d.lastMove ||
                    null;

                scores =
                    d.scores || {
                        X: 0,
                        O: 0
                    };

                if (d.result) {
                    stopTurnTimer();

                    matchResultData =
                        d.result;

                    await handleOnlineResult(
                        d.result,
                        !matchResultShown
                    );

                    matchResultShown =
                        true;

                    const mine =
                        d.result
                            .players?.[
                            playerId
                        ];

                    getEl(
                        'victoryTitle'
                    ).textContent =
                        mine?.outcome ===
                            'Win'
                            ? 'YOU WON!'
                            : mine?.outcome ===
                                'Loss'
                                ? 'YOU LOST'
                                : 'DRAW!';

                    getEl(
                        'victoryText'
                    ).textContent =
                        d.result.type ===
                            'forfeit' ||
                        d.result.type ===
                            'timeout' ||
                        d.result.type ===
                            'disconnect'
                            ? `${
                                mine?.opponentName ||
                                opponentName
                            } lost the match.`
                            : 'Match finished. Ready for a new game.';

                    getEl(
                        'acceptRematchBtn'
                    ).textContent =
                        'Play Again';

                    getEl(
                        'victoryModal'
                    ).style.display =
                        'flex';

                    isUI_Locked =
                        true;

                    renderGameUI();

                    return;
                }

                startTurnTimer(d);

                const ultimate =
                    checkUltimateWin();

                const draw =
                    !ultimate &&
                    boardWins.every(
                        x =>
                            x !== null
                    );

                if (
                    (
                        ultimate ||
                        draw
                    ) &&
                    !d.roundProcessed
                ) {
                    await finishOnlineRound(
                        ultimate ||
                        'DRAW'
                    );
                }

                else if (
                    !ultimate &&
                    !draw &&
                    !d.roundProcessed
                ) {
                    isUI_Locked =
                        currentPlayer !==
                        myRole;

                    getEl(
                        'victoryModal'
                    ).style.display =
                        'none';
                }

                if (
                    d.roundProcessed &&
                    d.roundWinner &&
                    !d.result
                ) {
                    isUI_Locked =
                        true;

                    getEl(
                        'victoryTitle'
                    ).textContent =
                        d.roundWinner ===
                            'DRAW'
                            ? 'DRAW!'
                            : `ROUND WIN: ${
                                d.roundWinner ===
                                    myRole
                                    ? playerName
                                    : opponentName
                            }`;

                    getEl(
                        'victoryText'
                    ).textContent =
                        `Score: ${scores.X}-${scores.O}`;

                    getEl(
                        'acceptRematchBtn'
                    ).textContent =
                        'Next Round / Ready';

                    getEl(
                        'victoryModal'
                    ).style.display =
                        'flex';
                }

                if (
                    d.rematch?.X &&
                    d.rematch?.O
                ) {
                    const token =
                        d.rematchToken ||
                        `${Date.now()}`;

                    if (
                        myRole ===
                            'X' &&
                        d.rematchApplied !==
                            token
                    ) {
                        await window.dbUpdate(
                            matchRef,
                            {
                                boardStates:
                                    JSON.stringify(
                                        Array(9)
                                            .fill()
                                            .map(
                                                () =>
                                                    Array(
                                                        9
                                                    ).fill('')
                                            )
                                    ),

                                boardWins:
                                    JSON.stringify(
                                        Array(
                                            9
                                        ).fill(
                                            null
                                        )
                                    ),

                                currentPlayer:
                                    'X',

                                activeBoardIndex:
                                    -1,

                                lastMove:
                                    null,

                                roundProcessed:
                                    false,

                                roundWinner:
                                    null,

                                rematch:
                                    null,

                                rematchApplied:
                                    token,

                                result:
                                    null,

                                scores:
                                    d.newCup
                                        ? {
                                            X: 0,
                                            O: 0
                                        }
                                        : scores,

                                turnStartedAt:
                                    Date.now(),

                                lastActive:
                                    Date.now()
                            }
                        );
                    }
                }

                if (
                    d.resetRequest &&
                    d.resetRequest !==
                        myRole &&
                    lastResetRequest !==
                        d.resetRequest
                ) {
                    lastResetRequest =
                        d.resetRequest;

                    showCustomConfirm(
                        'Reset Requested',
                        `${opponentName} wants to reset the current round. Accept?`,
                        async () => {
                            await window.dbUpdate(
                                matchRef,
                                {
                                    resetAccepted:
                                        d.resetRequest
                                }
                            );
                        }
                    );
                }

                if (
                    d.resetAccepted &&
                    d.resetAccepted !==
                        myRole &&
                    d.resetRequest ===
                        myRole
                ) {
                    await window.dbUpdate(
                        matchRef,
                        {
                            boardStates:
                                JSON.stringify(
                                    Array(9)
                                        .fill()
                                        .map(
                                            () =>
                                                Array(
                                                    9
                                                ).fill('')
                                        )
                                ),

                            boardWins:
                                JSON.stringify(
                                    Array(
                                        9
                                    ).fill(
                                        null
                                    )
                                ),

                            currentPlayer:
                                'X',

                            activeBoardIndex:
                                -1,

                            lastMove:
                                null,

                            roundProcessed:
                                false,

                            roundWinner:
                                null,

                            resetRequest:
                                null,

                            resetAccepted:
                                null,

                            turnStartedAt:
                                Date.now(),

                            lastActive:
                                Date.now()
                        }
                    );
                }

                if (
                    d.emoji &&
                    d.emoji.sender !==
                        myRole &&
                    d.emoji.time >
                        lastEmojiTime
                ) {
                    lastEmojiTime =
                        d.emoji.time;

                    showEmoji(
                        d.emoji.char
                    );
                }

                renderGameUI();
            }
        );
}


// ==========================================
// 25. Exit / Forfeit / Reset
// ==========================================

async function requestExit() {
    if (
        gameMode !==
            'online' ||
        !currentMatchId
    ) {
        return leaveMatch();
    }

    showCustomConfirm(
        'Leave Match?',
        'Are you sure you want to leave? The opponent will win and you will lose 1 point.',
        async () => {
            await publishMatchResult(
                currentMatchId,
                myRole === 'X'
                    ? 'O'
                    : 'X',
                'forfeit'
            );
        }
    );
}

function leaveMatch(
    force = false
) {
    if (
        gameMode ===
            'online' &&
        currentMatchId &&
        !matchResultData &&
        !force
    ) {
        return requestExit();
    }

    stopTurnTimer();
    stopDisconnectGrace();

    if (
        opponentPresenceListener
    ) {
        opponentPresenceListener();
        opponentPresenceListener =
            null;
    }

    getEl(
        'victoryModal'
    ).style.display =
        'none';

    if (matchListener) {
        matchListener();
        matchListener =
            null;
    }

    const oldMatch =
        currentMatchId;

    currentMatchId =
        null;

    matchResultShown =
        false;

    matchResultData =
        null;

    if (
        window.db &&
        playerId
    ) {
        window.dbUpdate(
            window.dbRef(
                window.db,
                `players/${playerId}`
            ),
            {
                status:
                    'online',

                lastActive:
                    Date.now()
            }
        );
    }

    if (
        force &&
        oldMatch &&
        window.db
    ) {
        window.dbRemove(
            window.dbRef(
                window.db,
                `matches/${oldMatch}`
            )
        );
    }

    navigate('#menu');
}

getEl(
    'surrenderBtn'
).onclick =
    () => {
        if (
            gameMode ===
            'offline'
        ) {
            scores[
                myRole === 'X'
                    ? 'O'
                    : 'X'
            ] =
                targetWins;

            handleRoundEnd(
                myRole === 'X'
                    ? 'O'
                    : 'X',
                'forfeit'
            );

            return;
        }

        requestExit();
    };

getEl(
    'resetMatchBtn'
).onclick =
    () => {
        if (
            gameMode ===
            'offline'
        ) {
            return startLocalRound(
                false
            );
        }

        if (
            !currentMatchId
        ) {
            return;
        }

        showCustomConfirm(
            'Reset Match?',
            'Send a reset request to your opponent?',
            async () => {
                await window.dbUpdate(
                    window.dbRef(
                        window.db,
                        `matches/${currentMatchId}`
                    ),
                    {
                        resetRequest:
                            myRole,

                        resetAccepted:
                            null
                    }
                );

                showCustomAlert(
                    'Reset Requested',
                    'Waiting for your opponent to accept.'
                );
            }
        );
    };

getEl(
    'acceptRematchBtn'
).onclick =
    async () => {
        playSound('click');

        if (
            gameMode ===
            'offline'
        ) {
            return startLocalRound(
                scores.X >=
                    targetWins ||
                scores.O >=
                    targetWins
            );
        }

        if (
            !currentMatchId
        ) {
            return;
        }

        getEl(
            'acceptRematchBtn'
        ).textContent =
            'Waiting...';

        const token =
            `${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 7)}`;

        const newCup =
            scores.X >=
                targetWins ||
            scores.O >=
                targetWins ||
            currentFormat ===
                '1';

        await window.dbUpdate(
            window.dbRef(
                window.db,
                `matches/${currentMatchId}`
            ),
            {
                rematch: {
                    X:
                        myRole ===
                        'X',

                    O:
                        myRole ===
                        'O'
                },

                rematchToken:
                    token,

                newCup
            }
        );
    };


// ==========================================
// 26. Emojis
// ==========================================

document
    .querySelectorAll(
        '.emoji-btn'
    )
    .forEach(btn => {
        btn.onclick =
            e => {
                if (
                    emojiCooldown
                ) {
                    return;
                }

                emojiCooldown =
                    true;

                setTimeout(
                    () =>
                        emojiCooldown =
                            false,
                    3000
                );

                const char =
                    e.target
                        .textContent;

                showEmoji(
                    char
                );

                playSound(
                    'click'
                );

                if (
                    gameMode ===
                        'online' &&
                    currentMatchId
                ) {
                    window.dbUpdate(
                        window.dbRef(
                            window.db,
                            `matches/${currentMatchId}`
                        ),
                        {
                            emoji: {
                                char,

                                sender:
                                    myRole,

                                time:
                                    Date.now()
                            }
                        }
                    );
                }
            };
    });

function showEmoji(char) {
    const el =
        getEl(
            'floatingEmoji'
        );

    el.textContent =
        char;

    el.classList.remove(
        'opacity-0',
        '-translate-y-1/2'
    );

    el.classList.add(
        'opacity-100',
        '-translate-y-[200px]'
    );

    setTimeout(
        () => {
            el.classList.add(
                'opacity-0',
                '-translate-y-1/2'
            );

            el.classList.remove(
                'opacity-100',
                '-translate-y-[200px]'
            );
        },
        1500
    );
}