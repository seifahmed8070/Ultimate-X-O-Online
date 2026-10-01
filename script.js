(() => {
"use strict";

//#region CONFIG
const EMPTY_BOARD = Array(9).fill(null).map(() => Array(9).fill(""));
const EMPTY_WINS = Array(9).fill("");
const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

const SESSION_KEY = "ultimate_xo_session";
const VIEW_KEY = "ultimate_xo_view";
const THEME_KEY = "ultimate_xo_theme";
const DISCONNECT_SECONDS = 30;

const $ = id => document.getElementById(id);

let audio = null;
let audioBusy = 0;
let bgLast = 0;

const game = {
  mode:"offline",
  ai:"easy",
  format:"1",
  target:1,
  role:"X",
  opponentId:"",
  opponentName:"",
  matchId:"",
  board:cloneBoard(),
  wins:[...EMPTY_WINS],
  turn:"X",
  scores:{X:0,O:0},
  status:"playing",
  winner:"",
  lastMoveId:"",
  phase:"playing"
};

let currentUser = null;
let currentPage = "home";
let authMode = "login";
let challengeData = null;
let listeners = [];
let aiMoveTimer = null;
let disconnectTimer = null;
let resultShown = false;
let settledResultId = "";
//#endregion


//#region HELPERS
function cloneBoard(){
  return Array.from({length:9},()=>Array(9).fill(""));
}

function targetWins(format){
  return format === "1"
    ? 1
    : format === "3"
      ? 2
      : format === "5"
        ? 3
        : Infinity;
}

function formatName(format){
  if(format === "1") return "Single";
  if(format === "3") return "Best of 3";
  if(format === "5") return "Best of 5";
  return "Endless";
}

function clone(obj){
  return JSON.parse(JSON.stringify(obj));
}

function sleep(ms){
  return new Promise(resolve=>setTimeout(resolve,ms));
}

function playSound(type="click"){
  try{
    const now = performance.now();

    if(type === "click" && now - audioBusy < 45) return;

    audioBusy = now;

    audio ||= new(window.AudioContext || window.webkitAudioContext)();

    if(audio.state === "suspended") audio.resume();

    const o = audio.createOscillator();
    const g = audio.createGain();
    const t = audio.currentTime;

    const sounds = {
      click:[520,720,.055],
      start:[520,900,.12],
      win:[360,680,.24],
      lose:[300,150,.22],
      bell:[760,1080,.18]
    };

    const v = sounds[type] || sounds.click;

    o.connect(g);
    g.connect(audio.destination);

    o.type = "triangle";

    o.frequency.setValueAtTime(v[0],t);
    o.frequency.exponentialRampToValueAtTime(v[1],t + v[2]);

    g.gain.setValueAtTime(.045,t);
    g.gain.exponentialRampToValueAtTime(.005,t + v[2]);

    o.start(t);
    o.stop(t + v[2]);
  }catch{}
}

function showToast(message,type=""){
  const root = $("toastRoot");
  if(!root) return;

  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;

  root.appendChild(el);

  setTimeout(()=>{
    el.style.opacity = "0";
    el.style.transform = "translateY(5px)";
    setTimeout(()=>el.remove(),180);
  },2200);
}

function showNotice(title,text){
  $("noticeTitle").textContent = title;
  $("noticeText").textContent = text;
  openOverlay("noticeOverlay");
}

function openOverlay(id){
  const el = $(id);
  if(el) el.classList.remove("hidden");
}

function closeOverlay(id){
  const el = $(id);
  if(el) el.classList.add("hidden");
}

function deepEqual(a,b){
  return JSON.stringify(a) === JSON.stringify(b);
}
//#endregion


//#region STORAGE
function saveSession(){
  if(!currentUser) return;

  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      id:currentUser.id,
      name:currentUser.name
    })
  );
}

function loadSession(){
  try{
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  }catch{
    return null;
  }
}

function saveView(view){
  localStorage.setItem(VIEW_KEY,view);
}

function loadView(){
  return localStorage.getItem(VIEW_KEY) || "home";
}

function saveTheme(theme){
  localStorage.setItem(THEME_KEY,theme);
}

function loadTheme(){
  return localStorage.getItem(THEME_KEY) || "theme-cyberpunk";
}
//#endregion


//#region THEME
function applyTheme(theme){
  const root = $("htmlRoot");

  if(root){
    root.className = theme;
  }

  saveTheme(theme);
}
//#endregion


//#region AUTH
function setAuthMode(mode){
  authMode = mode;

  $("authTitle").textContent =
    mode === "login" ? "تسجيل الدخول" : "إنشاء حساب";

  $("authHint").textContent =
    mode === "login"
      ? "ادخل باسم اللاعب ورقم الـPIN الخاص بك."
      : "أنشئ اسم لاعب ورقم PIN من 4 أرقام.";

  $("authSubmit").textContent =
    mode === "login" ? "دخول" : "إنشاء الحساب";

  $("authSwitch").textContent =
    mode === "login"
      ? "ليس لديك حساب؟ إنشاء حساب"
      : "لديك حساب؟ تسجيل الدخول";
}

async function authSubmit(e){
  e.preventDefault();

  const name = $("authName").value.trim();
  const pin = $("authPin").value.trim();

  if(name.length < 2){
    showToast("اكتب اسمًا من حرفين على الأقل","bad");
    return;
  }

  if(!/^\d{4}$/.test(pin)){
    showToast("الـPIN يجب أن يكون 4 أرقام","bad");
    return;
  }

  const id = name.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/gi,"").slice(0,20);

  if(!id){
    showToast("اسم اللاعب غير صالح","bad");
    return;
  }

  try{
    const userRef = dbRef(db,`players/${id}`);
    const snap = await dbGet(userRef);
    const existing = snap.exists() ? snap.val() : null;

    if(authMode === "login"){
      if(!existing){
        showToast("الحساب غير موجود","bad");
        return;
      }

      if(existing.pin !== pin){
        showToast("الـPIN غير صحيح","bad");
        return;
      }

      currentUser = {
        id,
        name:existing.name,
        pin,
        points:Number(existing.points ?? 10),
        total:Number(existing.total ?? 0),
        wins:Number(existing.wins ?? 0),
        losses:Number(existing.losses ?? 0),
        draws:Number(existing.draws ?? 0)
      };
    }else{
      if(existing){
        showToast("اسم اللاعب مستخدم بالفعل","bad");
        return;
      }

      currentUser = {
        id,
        name,
        pin,
        points:10,
        total:0,
        wins:0,
        losses:0,
        draws:0
      };

      await dbSet(userRef,{
        ...currentUser,
        status:"offline",
        updatedAt:Date.now()
      });
    }

    saveSession();
    await registerPresence();

    $("authScreen").classList.add("hidden");
    $("app").classList.remove("hidden");

    updateHeader();
    navigate(loadView());

    showToast(
      authMode === "login" ? "تم تسجيل الدخول" : "تم إنشاء الحساب",
      "good"
    );

  }catch(err){
    console.error(err);
    showToast("حصل خطأ في الاتصال بالسيرفر","bad");
  }
}

async function restoreSession(){
  const session = loadSession();

  if(!session) return false;

  try{
    const snap = await dbGet(dbRef(db,`players/${session.id}`));

    if(!snap.exists()) return false;

    const u = snap.val();

    currentUser = {
      id:session.id,
      name:u.name,
      pin:u.pin,
      points:Number(u.points ?? 10),
      total:Number(u.total ?? 0),
      wins:Number(u.wins ?? 0),
      losses:Number(u.losses ?? 0),
      draws:Number(u.draws ?? 0)
    };

    $("authScreen").classList.add("hidden");
    $("app").classList.remove("hidden");

    await registerPresence();

    updateHeader();
    navigate(loadView());

    return true;

  }catch{
    return false;
  }
}

async function logout(){
  try{
    await dbUpdate(dbRef(db,`players/${currentUser.id}`),{
      status:"offline",
      updatedAt:Date.now()
    });
  }catch{}

  localStorage.removeItem(SESSION_KEY);
  location.reload();
}

async function deleteAccount(){
  if(!currentUser) return;

  const ok = confirm("هل تريد حذف الحساب نهائيًا؟");
  if(!ok) return;

  try{
    await dbRemove(dbRef(db,`players/${currentUser.id}`));
    localStorage.removeItem(SESSION_KEY);
    location.reload();
  }catch{
    showToast("تعذر حذف الحساب","bad");
  }
}
//#endregion


//#region PRESENCE
async function registerPresence(){
  if(!currentUser) return;

  const refUser = dbRef(db,`players/${currentUser.id}`);

  await dbUpdate(refUser,{
    name:currentUser.name,
    points:Number(currentUser.points ?? 10),
    total:Number(currentUser.total ?? 0),
    wins:Number(currentUser.wins ?? 0),
    losses:Number(currentUser.losses ?? 0),
    draws:Number(currentUser.draws ?? 0),
    status:"online",
    updatedAt:Date.now()
  });

  try{
    await dbOnDisconnect(refUser).update({
      status:"offline",
      updatedAt:Date.now()
    });
  }catch{}
}

async function savePlayerStats(){
  if(!currentUser) return;

  await dbUpdate(
    dbRef(db,`players/${currentUser.id}`),
    {
      name:currentUser.name,
      points:Number(currentUser.points || 0),
      total:Number(currentUser.total || 0),
      wins:Number(currentUser.wins || 0),
      losses:Number(currentUser.losses || 0),
      draws:Number(currentUser.draws || 0),
      status:"online",
      updatedAt:Date.now()
    }
  );

  updateHeader();
}
//#endregion


//#region NAVIGATION
function navigate(page){
  if(!currentUser) return;

  currentPage = page;
  saveView(page);

  renderPage(page);
  updateHeader();

  if(page === "online"){
    refreshLobby();
    watchChallenges();
  }
}

function renderPage(page){
  const template = $(`${page}Template`);

  if(!template){
    page = "home";
  }

  const finalTemplate = $(`${page}Template`);

  $("page").innerHTML = finalTemplate.innerHTML;

  bindPage(page);

  if(page === "home") buildMiniGrid();
  if(page === "leaderboard") loadLeaderboard();
  if(page === "profile") renderProfile();

  window.scrollTo({top:0,behavior:"smooth"});
}

function bindPage(page){
  document.querySelectorAll("[data-route]").forEach(btn=>{
    btn.onclick = ()=>navigate(btn.dataset.route);
  });

  if(page === "play"){
    document.querySelectorAll("[data-ai]").forEach(btn=>{
      btn.onclick = ()=>{
        const format = $("offlineFormat").value;
        startOffline(btn.dataset.ai,format);
      };
    });
  }

  if(page === "online"){
    $("refreshPlayers")?.addEventListener("click",refreshLobby);
  }

  if(page === "profile"){
    $("themeSelect").value = loadTheme();

    $("themeSelect").addEventListener("change",e=>{
      applyTheme(e.target.value);
    });

    $("logoutBtn").addEventListener("click",logout);
    $("deleteBtn").addEventListener("click",deleteAccount);
  }
}

function updateHeader(){
  if(!currentUser) return;

  $("topUserName").textContent = currentUser.name;
  $("topPoints").textContent = `${currentUser.points ?? 0} pts`;
}

function renderProfile(){
  if(!currentUser) return;

  $("profileName").textContent = currentUser.name;
  $("profileAvatar").textContent =
    currentUser.name.charAt(0).toUpperCase();

  $("profilePoints").textContent = currentUser.points ?? 0;
  $("profileTotal").textContent = currentUser.total ?? 0;
  $("profileWins").textContent = currentUser.wins ?? 0;
  $("profileLosses").textContent = currentUser.losses ?? 0;
}

function buildMiniGrid(){
  const el = $("miniGrid");
  if(!el) return;

  const chars = ["X","","O","","X","","O","",""];

  el.innerHTML = chars.map(x=>`<div>${x}</div>`).join("");
}

function toggleMobileMenu(){
  $("mobileNav")?.classList.toggle("open");
}
//#endregion


//#region LEADERBOARD
function loadLeaderboard(){
  dbOnValue(
    dbRef(db,"players"),
    snap=>{
      const rows = [];

      snap.forEach(child=>{
        const p = child.val();

        rows.push({
          name:p.name || child.key,
          points:Number(p.points || 0),
          wins:Number(p.wins || 0)
        });
      });

      rows.sort((a,b)=>{
        if(b.points !== a.points) return b.points - a.points;
        return b.wins - a.wins;
      });

      const target = $("leaderboardRows");
      if(!target) return;

      target.innerHTML = rows.slice(0,50).map((p,i)=>`
        <div class="rank-row">
          <span>${i+1}</span>
          <span>${escapeHtml(p.name)}</span>
          <span>${p.points}</span>
          <span>${p.wins}</span>
        </div>
      `).join("");

      if(!rows.length){
        target.innerHTML =
          `<div class="rank-row"><span>—</span><span>لا يوجد لاعبين</span><span>0</span><span>0</span></div>`;
      }
    }
  );
}
//#endregion


//#region ONLINE LOBBY
function refreshLobby(){
  if(!currentUser || currentPage !== "online") return;

  dbGet(dbRef(db,"players"))
    .then(snap=>{
      const players = [];

      snap.forEach(child=>{
        if(child.key === currentUser.id) return;

        const p = child.val();

        if(p.status === "online"){
          players.push({
            id:child.key,
            name:p.name || child.key,
            points:Number(p.points || 0)
          });
        }
      });

      const list = $("playersList");
      const count = $("onlineCount");

      if(count) count.textContent = players.length;

      if(!list) return;

      if(!players.length){
        list.innerHTML = `
          <div class="player-row">
            <div>
              <strong>لا يوجد لاعبين الآن</strong>
              <small>اضغط تحديث بعد قليل.</small>
            </div>
          </div>
        `;
        return;
      }

      list.innerHTML = players.map(p=>`
        <div class="player-row">
          <div>
            <strong>${escapeHtml(p.name)}</strong>
            <small>${p.points} pts • Online</small>
          </div>
          <button class="primary-btn challenge-btn"
                  data-player="${p.id}"
                  data-name="${escapeAttr(p.name)}">
            تحدي
          </button>
        </div>
      `).join("");

      list.querySelectorAll(".challenge-btn").forEach(btn=>{
        btn.onclick = ()=>{
          sendChallenge(
            btn.dataset.player,
            btn.dataset.name,
            $("onlineFormat")?.value || "1"
          );
        };
      });

    })
    .catch(()=>{
      showToast("تعذر تحميل اللاعبين","bad");
    });
}

function watchChallenges(){
  if(!currentUser) return;

  dbOnValue(
    dbRef(db,`challenges/${currentUser.id}`),
    snap=>{
      if(!snap.exists()) return;

      const data = snap.val();

      if(data.status === "pending"){
        challengeData = data;

        $("challengeTitle").textContent =
          `تحدي من ${data.fromName || "لاعب"}`;

        $("challengeText").textContent =
          `${data.fromName || "لاعب"} يريد اللعب بنظام ${formatName(data.format)}`;

        openOverlay("challengeOverlay");
      }
    }
  );
}

async function sendChallenge(playerId,playerName,format){
  if(!currentUser || !playerId) return;

  try{
    const matchId = dbPush(dbRef(db,"matches")).key;

    const challenge = {
      id:matchId,
      from:currentUser.id,
      fromName:currentUser.name,
      to:playerId,
      toName:playerName,
      format,
      target:targetWins(format),
      status:"pending",
      createdAt:Date.now()
    };

    await dbSet(
      dbRef(db,`challenges/${playerId}`),
      challenge
    );

    showToast(`تم إرسال التحدي إلى ${playerName}`,"good");

  }catch(err){
    console.error(err);
    showToast("تعذر إرسال التحدي","bad");
  }
}

async function acceptChallenge(){
  if(!challengeData) return;

  const data = challengeData;

  try{
    const match = {
      id:data.id,
      playerX:data.from,
      playerXName:data.fromName,
      playerO:currentUser.id,
      playerOName:currentUser.name,
      format:data.format,
      target:data.target,
      board:cloneBoard(),
      wins:[...EMPTY_WINS],
      turn:"X",
      scores:{X:0,O:0},
      status:"playing",
      phase:"playing",
      version:0,
      lastMoveId:"",
      createdAt:Date.now(),
      updatedAt:Date.now()
    };

    await dbSet(dbRef(db,`matches/${data.id}`),match);

    await dbUpdate(
      dbRef(db,`challenges/${currentUser.id}`),
      {status:"accepted",matchId:data.id}
    );

    closeOverlay("challengeOverlay");

    openOnlineMatch(
      data.id,
      "O",
      data.from,
      data.fromName,
      data.format
    );

  }catch(err){
    console.error(err);
    showToast("تعذر قبول التحدي","bad");
  }
}

async function declineChallenge(){
  if(!challengeData) return;

  try{
    await dbUpdate(
      dbRef(db,`challenges/${currentUser.id}`),
      {
        status:"declined",
        updatedAt:Date.now()
      }
    );
  }catch{}

  challengeData = null;
  closeOverlay("challengeOverlay");
}
//#endregion


//#region OFFLINE GAME
function startOffline(ai,format){
  game.mode = "offline";
  game.ai = ai;
  game.format = format;
  game.target = targetWins(format);
  game.role = "X";
  game.opponentId = "AI";
  game.opponentName = ai === "impossible"
    ? "Grandmaster AI"
    : `${ai.toUpperCase()} AI`;
  game.matchId = "";
  game.scores = {X:0,O:0};

  resetRoundLocal();

  showGameScreen();

  playSound("start");
}

function resetRoundLocal(){
  clearTimeout(aiMoveTimer);

  game.board = cloneBoard();
  game.wins = [...EMPTY_WINS];
  game.turn = "X";
  game.status = "playing";
  game.winner = "";
  game.phase = "playing";
  game.lastMoveId = "";

  resultShown = false;

  renderGame();

  if(game.mode === "offline" && game.turn === "O"){
    scheduleAI();
  }
}

function scheduleAI(){
  clearTimeout(aiMoveTimer);

  const delay =
    game.ai === "easy" ? 420 :
    game.ai === "medium" ? 520 :
    650;

  aiMoveTimer = setTimeout(()=>{
    if(game.status !== "playing") return;
    if(game.turn !== "O") return;

    const move = chooseAIMove();

    if(move){
      makeMove(move.board,move.cell,"O");
    }
  },delay);
}

function chooseAIMove(){
  const legal = getLegalMoves(game.board,game.wins);

  if(!legal.length) return null;

  if(game.ai === "easy"){
    return easyMove(legal);
  }

  if(game.ai === "medium"){
    return mediumMove(legal);
  }

  return grandmasterMove(legal);
}

function easyMove(legal){
  const win = findWinningMove("O",legal);
  if(win && Math.random() > .15) return win;

  const block = findWinningMove("X",legal);
  if(block && Math.random() > .18) return block;

  const center = legal.find(m=>m.cell === 4);
  if(center && Math.random() > .35) return center;

  return legal[Math.floor(Math.random()*legal.length)];
}

function mediumMove(legal){
  const win = findWinningMove("O",legal);
  if(win) return win;

  const block = findWinningMove("X",legal);
  if(block) return block;

  const scored = legal.map(move=>({
    move,
    score:scoreMove(move,"O")
  }));

  scored.sort((a,b)=>b.score-a.score);

  return scored[0]?.move || legal[0];
}

function grandmasterMove(legal){
  const win = findWinningMove("O",legal);
  if(win) return win;

  const block = findWinningMove("X",legal);
  if(block) return block;

  let best = null;
  let bestScore = -Infinity;

  for(const move of legal){
    const score =
      scoreMove(move,"O") +
      localBoardPotential(move.board,"O") * 2 +
      nextBoardPressure(move) * 1.5;

    if(score > bestScore){
      bestScore = score;
      best = move;
    }
  }

  return best || legal[0];
}

function getLegalMoves(board,wins){
  const result = [];

  const forced = game.turn === "X" ? game.lastMoveId : game.lastMoveId;
  let forcedBoard = null;

  if(game.lastMoveId){
    const n = Number(game.lastMoveId);
    if(Number.isInteger(n) && n >= 0 && n < 9){
      if(!wins[n] && board[n].some(v=>!v)){
        forcedBoard = n;
      }
    }
  }

  for(let b=0;b<9;b++){
    if(wins[b]) continue;
    if(forcedBoard !== null && b !== forcedBoard) continue;

    for(let c=0;c<9;c++){
      if(!board[b][c]){
        result.push({board:b,cell:c});
      }
    }
  }

  if(!result.length && forcedBoard !== null){
    for(let b=0;b<9;b++){
      if(wins[b]) continue;

      for(let c=0;c<9;c++){
        if(!board[b][c]){
          result.push({board:b,cell:c});
        }
      }
    }
  }

  return result;
}

function findWinningMove(symbol,legal){
  for(const move of legal){
    const test = clone(game.board);
    test[move.board][move.cell] = symbol;

    if(checkLocalWinner(test[move.board]) === symbol){
      return move;
    }

    const localWins = [...game.wins];

    if(checkLocalWinner(test[move.board])){
      localWins[move.board] = symbol;

      if(checkUltimateWinner(localWins) === symbol){
        return move;
      }
    }
  }

  return null;
}

function scoreMove(move,symbol){
  let score = 0;

  if(move.cell === 4) score += 5;
  if([0,2,6,8].includes(move.cell)) score += 3;

  const board = game.board[move.board];

  const own = board.filter(v=>v===symbol).length;
  const opp = board.filter(v=>v && v!==symbol).length;

  score += own * 2;
  score -= opp;

  if(move.board === move.cell) score += 3;

  return score;
}

function localBoardPotential(move,symbol){
  const board = game.board[move.board];
  return board.filter(v=>v===symbol).length;
}

function nextBoardPressure(move){
  const next = move.cell;

  if(game.wins[next]) return 3;
  if(game.board[next].every(Boolean)) return 2;

  return 1;
}
//#endregion


//#region MOVE ENGINE
function validMove(boardIndex,cellIndex){
  if(game.status !== "playing") return false;
  if(game.phase !== "playing") return false;

  if(!Number.isInteger(boardIndex) || !Number.isInteger(cellIndex)){
    return false;
  }

  if(game.board[boardIndex][cellIndex]) return false;
  if(game.wins[boardIndex]) return false;

  if(game.turn !== game.role) return false;

  if(game.lastMoveId !== ""){
    const forced = Number(game.lastMoveId);

    if(
      Number.isInteger(forced) &&
      forced >= 0 &&
      forced < 9 &&
      !game.wins[forced] &&
      game.board[forced].some(v=>!v) &&
      boardIndex !== forced
    ){
      return false;
    }
  }

  return true;
}

function makeMove(boardIndex,cellIndex,symbol){
  if(game.status !== "playing") return;
  if(game.board[boardIndex][cellIndex]) return;

  game.board[boardIndex][cellIndex] = symbol;

  const localWinner = checkLocalWinner(game.board[boardIndex]);

  if(localWinner && !game.wins[boardIndex]){
    game.wins[boardIndex] = localWinner;
  }

  const ultimateWinner = checkUltimateWinner(game.wins);

  if(ultimateWinner){
    game.status = "finished";
    game.winner = ultimateWinner;
    game.phase = "result";

    renderGame();

    finishRound(ultimateWinner);
    return;
  }

  if(game.board.every((b,i)=>game.wins[i] || b.every(Boolean))){
    game.status = "finished";
    game.winner = "DRAW";
    game.phase = "result";

    renderGame();

    finishRound("DRAW");
    return;
  }

  game.lastMoveId = String(cellIndex);
  game.turn = symbol === "X" ? "O" : "X";

  playSound("click");

  renderGame();

  if(game.mode === "offline" && game.turn === "O"){
    scheduleAI();
  }

  if(game.mode === "online"){
    publishMove();
  }
}

function checkLocalWinner(board){
  for(const [a,b,c] of WIN_LINES){
    if(board[a] && board[a] === board[b] && board[a] === board[c]){
      return board[a];
    }
  }

  return "";
}

function checkUltimateWinner(wins){
  return checkLocalWinner(wins);
}
//#endregion


//#region GAME RENDER
function showGameScreen(){
  $("gameScreen").classList.remove("hidden");
  renderGame();
}

function hideGameScreen(){
  $("gameScreen").classList.add("hidden");
  closeOverlay("resultOverlay");
  closeOverlay("disconnectOverlay");

  clearTimeout(aiMoveTimer);
  clearInterval(disconnectTimer);
}

function renderGame(){
  if(!$("ultimateBoard")) return;

  $("gameTitle").textContent =
    game.mode === "offline"
      ? `ضد ${game.opponentName}`
      : `Online • ${formatName(game.format)}`;

  $("gameOpponent").textContent =
    `vs ${game.opponentName || "Opponent"}`;

  $("scoreX").textContent = game.scores.X;
  $("scoreO").textContent = game.scores.O;

  $("turnText").textContent = game.turn;

  const root = $("ultimateBoard");
  root.innerHTML = "";

  for(let b=0;b<9;b++){
    const boardEl = document.createElement("div");
    boardEl.className = "local-board";

    const forced =
      game.lastMoveId !== "" &&
      Number(game.lastMoveId) === b &&
      !game.wins[b] &&
      game.board[b].some(v=>!v);

    if(forced) boardEl.classList.add("active");
    if(game.wins[b]) boardEl.classList.add("locked");

    for(let c=0;c<9;c++){
      const cell = document.createElement("button");

      cell.className = "cell";

      const value = game.board[b][c];

      if(value){
        cell.textContent = value;
        cell.classList.add(value.toLowerCase());
      }

      cell.disabled =
        !validMove(b,c) ||
        Boolean(value);

      cell.onclick = ()=>{
        if(validMove(b,c)){
          makeMove(b,c,game.role);
        }
      };

      boardEl.appendChild(cell);
    }

    if(game.wins[b]){
      const overlay = document.createElement("div");
      overlay.className = "local-overlay";
      overlay.textContent = game.wins[b];
      overlay.style.color =
        game.wins[b] === "X"
          ? "#67e8f9"
          : "#f9a8d4";

      boardEl.appendChild(overlay);
    }

    root.appendChild(boardEl);
  }
}
//#endregion


//#region ROUND RESULT
async function finishRound(winner){
  if(resultShown) return;

  resultShown = true;

  const resultId =
    game.matchId
      ? `${game.matchId}-${game.scores.X}-${game.scores.O}-${Date.now()}`
      : `offline-${Date.now()}`;

  settledResultId = resultId;

  let myResult = "draw";

  if(winner === game.role){
    myResult = "win";
  }else if(winner !== "DRAW"){
    myResult = "loss";
  }

  await settleStats(myResult);

  if(winner === game.role){
    game.scores[game.role]++;
  }else if(winner !== "DRAW"){
    const other = game.role === "X" ? "O" : "X";
    game.scores[other]++;
  }

  renderGame();

  if(game.mode === "online"){
    await writeOnlineResult(winner,resultId);
  }

  showResult(winner);
}

async function settleStats(result){
  if(!currentUser) return;

  if(result === "win"){
    currentUser.points += 3;
    currentUser.wins++;
  }else if(result === "loss"){
    currentUser.points = Math.max(0,currentUser.points - 1);
    currentUser.losses++;
  }else{
    currentUser.points += 1;
    currentUser.draws++;
  }

  currentUser.total++;

  await savePlayerStats();
}

async function settleRemoteResult(result){
  if(!result || !result.id) return;
  if(settledResultId === result.id) return;

  settledResultId = result.id;

  let myResult = "draw";

  if(result.winner === game.role){
    myResult = "win";
  }else if(result.winner !== "DRAW"){
    myResult = "loss";
  }

  await settleStats(myResult);
}

function showResult(winner){
  if(game.mode === "online"){
    if(winner === game.role){
      $("resultTitle").textContent = "🏆 فوز!";
      $("resultText").textContent = "أنت فزت بالجولة.";
      playSound("win");
    }else if(winner === "DRAW"){
      $("resultTitle").textContent = "تعادل";
      $("resultText").textContent = "الجولة انتهت بالتعادل.";
      playSound("bell");
    }else{
      $("resultTitle").textContent = "الجولة انتهت";
      $("resultText").textContent = "الخصم فاز بالجولة.";
      playSound("lose");
    }

    $("acceptRematch").textContent =
      game.scores.X >= game.target ||
      game.scores.O >= game.target
        ? "مباراة جديدة"
        : "الجولة التالية";

    openOverlay("resultOverlay");
    return;
  }

  if(winner === "X"){
    $("resultTitle").textContent = "🏆 فوز!";
    $("resultText").textContent = "أحسنت! فزت بالجولة.";
    playSound("win");
  }else if(winner === "DRAW"){
    $("resultTitle").textContent = "تعادل";
    $("resultText").textContent = "الجولة انتهت بالتعادل.";
    playSound("bell");
  }else{
    $("resultTitle").textContent = "انتهت الجولة";
    $("resultText").textContent = "الذكاء الاصطناعي فاز.";
    playSound("lose");
  }

  const matchFinished =
    game.format === "1" ||
    game.target === Infinity ||
    game.scores.X >= game.target ||
    game.scores.O >= game.target;

  $("acceptRematch").textContent =
    matchFinished ? "مباراة جديدة" : "الجولة التالية";

  openOverlay("resultOverlay");
}
//#endregion


//#region ONLINE MATCH
function openOnlineMatch(matchId,role,opponentId,opponentName,format){
  game.mode = "online";
  game.matchId = matchId;
  game.role = role;
  game.opponentId = opponentId;
  game.opponentName = opponentName;
  game.format = format;
  game.target = targetWins(format);
  game.phase = "playing";
  resultShown = false;

  showGameScreen();
  watchMatch(matchId);
}

function watchMatch(matchId){
  if(!matchId) return;

  dbOnValue(
    dbRef(db,`matches/${matchId}`),
    async snap=>{
      if(!snap.exists()){
        endLocalMatch("المباراة غير موجودة.");
        return;
      }

      const d = snap.val();

      game.board = d.board || cloneBoard();
      game.wins = d.wins || [...EMPTY_WINS];
      game.turn = d.turn || "X";
      game.scores = d.scores || {X:0,O:0};
      game.target = Number(d.target ?? targetWins(d.format));
      game.format = d.format || "1";

      if(d.status === "closed"){
        endLocalMatch(d.closedMessage || "تم إنهاء المباراة.");
        return;
      }

      if(d.status === "playing"){
        game.status = "playing";

        if(d.phase === "result" && d.result){
          game.status = "finished";
          game.phase = "result";

          await settleRemoteResult(d.result);

          if(!resultShown){
            showResult(d.result.winner);
            resultShown = true;
          }

          return;
        }

        game.phase = "playing";
      }

      if(d.status === "finished" && d.result){
        game.status = "finished";
        game.phase = "result";

        await settleRemoteResult(d.result);

        if(!resultShown){
          showResult(d.result.winner);
          resultShown = true;
        }

        return;
      }

      renderGame();
    }
  );
}

async function publishMove(){
  if(!game.matchId) return;

  const matchRef = dbRef(db,`matches/${game.matchId}`);

  const version = Date.now();
  const moveId = `${currentUser.id}-${version}`;

  game.lastMoveId = game.lastMoveId || "";

  try{
    await dbUpdate(matchRef,{
      board:clone(game.board),
      wins:[...game.wins],
      turn:game.turn,
      scores:clone(game.scores),
      status:"playing",
      phase:"playing",
      version,
      lastMoveId:moveId,
      updatedAt:version
    });
  }catch(err){
    console.error(err);
    showToast("تعذر مزامنة الحركة","bad");
  }
}

async function writeOnlineResult(winner,resultId){
  if(!game.matchId) return;

  const result = {
    id:resultId,
    winner,
    scores:clone(game.scores),
    at:Date.now()
  };

  try{
    await dbUpdate(
      dbRef(db,`matches/${game.matchId}`),
      {
        board:clone(game.board),
        wins:[...game.wins],
        scores:clone(game.scores),
        turn:game.turn,
        status:"playing",
        phase:"result",
        result,
        updatedAt:Date.now()
      }
    );
  }catch(err){
    console.error(err);
  }
}

async function requestRestart(){
  if(game.mode !== "online" || !game.matchId) return;

  try{
    await dbUpdate(
      dbRef(db,`matches/${game.matchId}/restart`),
      {
        requestedBy:currentUser.id,
        status:"pending",
        at:Date.now()
      }
    );

    showToast("تم إرسال طلب إعادة الجولة","good");
  }catch{
    showToast("تعذر إرسال طلب الإعادة","bad");
  }
}

async function acceptRestart(){
  if(!game.matchId) return;

  await dbUpdate(
    dbRef(db,`matches/${game.matchId}/restart`),
    {
      status:"accepted",
      acceptedBy:currentUser.id,
      at:Date.now()
    }
  );

  closeOverlay("restartOverlay");
}

async function declineRestart(){
  if(!game.matchId) return;

  await dbUpdate(
    dbRef(db,`matches/${game.matchId}/restart`),
    {
      status:"declined",
      declinedBy:currentUser.id,
      at:Date.now()
    }
  );

  closeOverlay("restartOverlay");
}

async function requestRematch(){
  if(game.mode !== "online" || !game.matchId) return;

  const finalMatch =
    game.target !== Infinity &&
    (game.scores.X >= game.target || game.scores.O >= game.target);

  if(finalMatch || game.format === "1"){
    await dbUpdate(
      dbRef(db,`matches/${game.matchId}/rematch`),
      {
        status:"pending",
        requestedBy:currentUser.id,
        at:Date.now()
      }
    );

    $("acceptRematch").disabled = true;
    $("acceptRematch").textContent = "في انتظار الخصم...";
    return;
  }

  await dbUpdate(
    dbRef(db,`matches/${game.matchId}/rematch`),
    {
      status:"pending",
      requestedBy:currentUser.id,
      at:Date.now()
    }
  );

  $("acceptRematch").disabled = true;
  $("acceptRematch").textContent = "في انتظار الخصم...";
}

async function endMatch(message="تم إنهاء المباراة."){
  if(game.mode !== "online" || !game.matchId){
    endLocalMatch(message);
    return;
  }

  try{
    await dbUpdate(
      dbRef(db,`matches/${game.matchId}`),
      {
        status:"closed",
        phase:"closed",
        closedBy:currentUser.id,
        closedMessage:message,
        updatedAt:Date.now()
      }
    );
  }catch{}

  endLocalMatch(message);
}

function endLocalMatch(message){
  clearTimeout(aiMoveTimer);
  clearInterval(disconnectTimer);

  closeOverlay("challengeOverlay");
  closeOverlay("restartOverlay");
  closeOverlay("resultOverlay");
  closeOverlay("disconnectOverlay");

  hideGameScreen();
  navigate("home");

  if(message){
    showToast(message);
  }
}
//#endregion


//#region ONLINE STATE WATCHERS
function watchRestart(){
  if(!game.matchId) return;

  dbOnValue(
    dbRef(db,`matches/${game.matchId}/restart`),
    async snap=>{
      if(!snap.exists()) return;

      const d = snap.val();

      if(
        d.status === "pending" &&
        d.requestedBy !== currentUser.id
      ){
        $("restartText").textContent =
          "الخصم يطلب إعادة الجولة الحالية.";

        openOverlay("restartOverlay");
      }

      if(
        d.status === "accepted" &&
        d.acceptedBy !== currentUser.id
      ){
        await resetOnlineRound();
      }

      if(d.status === "declined"){
        closeOverlay("restartOverlay");
        showToast("الخصم رفض إعادة الجولة","bad");
      }
    }
  );
}

async function resetOnlineRound(){
  if(!game.matchId) return;

  game.board = cloneBoard();
  game.wins = [...EMPTY_WINS];
  game.turn = "X";
  game.status = "playing";
  game.phase = "playing";
  game.lastMoveId = "";
  resultShown = false;

  closeOverlay("resultOverlay");
  closeOverlay("restartOverlay");

  await dbUpdate(
    dbRef(db,`matches/${game.matchId}`),
    {
      board:clone(game.board),
      wins:[...game.wins],
      turn:"X",
      status:"playing",
      phase:"playing",
      result:null,
      updatedAt:Date.now()
    }
  );

  renderGame();
}

function watchRematch(){
  if(!game.matchId) return;

  dbOnValue(
    dbRef(db,`matches/${game.matchId}/rematch`),
    async snap=>{
      if(!snap.exists()) return;

      const d = snap.val();

      if(
        d.status === "pending" &&
        d.requestedBy !== currentUser.id
      ){
        $("resultTitle").textContent = "الخصم يريد جولة جديدة";
        $("resultText").textContent =
          "وافق لبدء جولة جديدة بنفس نظام المباراة.";

        $("acceptRematch").disabled = false;
        $("acceptRematch").textContent = "قبول";

        openOverlay("resultOverlay");
      }

      if(
        d.status === "accepted" &&
        d.acceptedBy !== currentUser.id
      ){
        await resetOnlineRound();
      }
    }
  );
}
//#endregion


//#region DISCONNECT
function startDisconnectCountdown(){
  clearInterval(disconnectTimer);

  let left = DISCONNECT_SECONDS;

  $("disconnectCountdown").textContent = left;
  openOverlay("disconnectOverlay");

  disconnectTimer = setInterval(()=>{
    left--;

    $("disconnectCountdown").textContent = Math.max(0,left);

    if(left <= 0){
      clearInterval(disconnectTimer);
      endMatch("انتهت مهلة إعادة الاتصال.");
    }
  },1000);
}

function stopDisconnectCountdown(){
  clearInterval(disconnectTimer);
  disconnectTimer = null;
  closeOverlay("disconnectOverlay");
}

function watchOpponentPresence(){
  if(!game.opponentId) return;

  dbOnValue(
    dbRef(db,`players/${game.opponentId}/status`),
    snap=>{
      const status = snap.val();

      if(game.mode !== "online") return;

      if(status === "offline"){
        startDisconnectCountdown();
      }else{
        stopDisconnectCountdown();
      }
    }
  );
}
//#endregion


//#region GAME BUTTONS
function leaveGame(){
  if(game.mode === "online"){
    const ok = confirm("الخروج سيُنهي المباراة للطرفين. هل أنت متأكد؟");

    if(!ok) return;

    endMatch("قام أحد اللاعبين بإنهاء المباراة.");
    return;
  }

  hideGameScreen();
  navigate("home");
}

function restartGame(){
  if(game.mode === "offline"){
    resetRoundLocal();
    return;
  }

  requestRestart();
}

function acceptRematchClick(){
  if(game.mode !== "online"){
    resetRoundLocal();
    closeOverlay("resultOverlay");
    return;
  }

  requestRematch();
}

async function exitResult(){
  if(game.mode === "online"){
    await endMatch("انتهت المباراة.");
  }else{
    closeOverlay("resultOverlay");
    hideGameScreen();
    navigate("home");
  }
}
//#endregion


//#region EVENTS
function bindGlobalEvents(){
  $("authForm").addEventListener("submit",authSubmit);

  $("authSwitch").addEventListener("click",()=>{
    setAuthMode(authMode === "login" ? "register" : "login");
  });

  $("mobileMenuBtn").addEventListener("click",toggleMobileMenu);

  $("leaveGame").addEventListener("click",leaveGame);
  $("restartGame").addEventListener("click",restartGame);
  $("endGame").addEventListener("click",()=>{
    if(game.mode === "online"){
      endMatch("قام أحد اللاعبين بإنهاء المباراة.");
    }else{
      hideGameScreen();
      navigate("home");
    }
  });

  $("acceptChallenge").addEventListener("click",acceptChallenge);
  $("declineChallenge").addEventListener("click",declineChallenge);

  $("acceptRestart").addEventListener("click",acceptRestart);
  $("declineRestart").addEventListener("click",declineRestart);

  $("acceptRematch").addEventListener("click",acceptRematchClick);
  $("exitResult").addEventListener("click",exitResult);

  $("disconnectLeave").addEventListener("click",()=>{
    endMatch("غادرت المباراة.");
  });

  $("noticeOk").addEventListener("click",()=>{
    closeOverlay("noticeOverlay");
  });

  window.addEventListener("beforeunload",()=>{
    if(currentUser && game.mode === "online"){
      try{
        dbUpdate(
          dbRef(db,`players/${currentUser.id}`),
          {
            status:"offline",
            updatedAt:Date.now()
          }
        );
      }catch{}
    }
  });
}
//#endregion


//#region ESCAPE
function escapeHtml(value){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function escapeAttr(value){
  return escapeHtml(value);
}
//#endregion


//#region BACKGROUND
const canvas = $("bgCanvas");
const ctx = canvas.getContext("2d");
let particles = [];

function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  particles = Array.from({length:12},()=>({
    x:Math.random()*canvas.width,
    y:Math.random()*canvas.height,
    r:Math.random()*2 + 1,
    vx:(Math.random()-.5)*.25,
    vy:(Math.random()-.5)*.25,
    a:Math.random()*.45 + .15
  }));
}

function drawBg(now=0){
  if(now - bgLast < 33){
    requestAnimationFrame(drawBg);
    return;
  }

  bgLast = now;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  for(const p of particles){
    p.x += p.vx;
    p.y += p.vy;

    if(p.x < -10) p.x = canvas.width + 10;
    if(p.x > canvas.width + 10) p.x = -10;

    if(p.y < -10) p.y = canvas.height + 10;
    if(p.y > canvas.height + 10) p.y = -10;

    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle = `rgba(56,189,248,${p.a})`;
    ctx.fill();
  }

  requestAnimationFrame(drawBg);
}
//#endregion


//#region START
async function boot(){
  applyTheme(loadTheme());
  bindGlobalEvents();
  resizeCanvas();

  window.addEventListener("resize",resizeCanvas);
  requestAnimationFrame(drawBg);

  setAuthMode("login");

  const restored = await restoreSession();

  if(!restored){
    $("authScreen").classList.remove("hidden");
    $("app").classList.add("hidden");
  }
}

if(window.db){
  boot();
}else{
  window.addEventListener("firebase-ready",boot,{once:true});
}
//#endregion

})();