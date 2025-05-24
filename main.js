// ==============================
// 画像管理
// ==============================
const images = { player: null, enemy1: null, boss: null, gameOver: null };
let playerImgLoaded = false, enemy1ImgLoaded = false, bossImgLoaded = false;

// アップロード＆プレビュー共通
function handleImageUpload(inputId, previewId, key) {
  document.getElementById(inputId).addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      const img = new window.Image();
      img.onload = function () {
        images[key] = img;
        document.getElementById(previewId).src = ev.target.result;
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}
handleImageUpload('playerImg', 'playerPreview', 'player');
handleImageUpload('enemy1Img', 'enemy1Preview', 'enemy1');
handleImageUpload('bossImg', 'bossPreview', 'boss');

// ==============================
// ゲーム初期化
// ==============================
let canvas, ctx;
let gameState = "title"; // title, playing, gameover, clear

// 自機
let player = { x: 370, y: 500, w: 60, h: 60, speed: 6, alive: true };
// 弾
let shots = [];
// 敵
let enemies = [];
// ボス
let boss = null;
let bossAppearScore = 500; // 500点で出現
let bossHPMax = 30;

// 敵弾
let enemyShots = [];
let score = 0;

// 入力管理
let leftPressed = false, rightPressed = false, shotPressed = false;
let shotCooldown = 0;
let enemySpawnCooldown = 0;

// ==============================
// イベントセットアップ
// ==============================
window.onload = function () {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');

  document.getElementById('startBtn').onclick = startGame;
  document.getElementById('retryBtn').onclick = () => location.reload();
  document.getElementById('retryClearBtn').onclick = () => location.reload();

  // PC操作
  window.addEventListener('keydown', function (e) {
    if (gameState !== "playing") return;
    if (e.key === "ArrowLeft") leftPressed = true;
    if (e.key === "ArrowRight") rightPressed = true;
    if (e.key === " " || e.key === "z") shotPressed = true;
  });
  window.addEventListener('keyup', function (e) {
    if (gameState !== "playing") return;
    if (e.key === "ArrowLeft") leftPressed = false;
    if (e.key === "ArrowRight") rightPressed = false;
    if (e.key === " " || e.key === "z") shotPressed = false;
  });

  // モバイル操作
  document.getElementById('leftBtn').ontouchstart = () => leftPressed = true;
  document.getElementById('leftBtn').ontouchend = () => leftPressed = false;
  document.getElementById('rightBtn').ontouchstart = () => rightPressed = true;
  document.getElementById('rightBtn').ontouchend = () => rightPressed = false;
  document.getElementById('shotBtn').ontouchstart = () => shotPressed = true;
  document.getElementById('shotBtn').ontouchend = () => shotPressed = false;

  // PC仮想ボタン対応（クリック）
  document.getElementById('leftBtn').onmousedown = () => leftPressed = true;
  document.getElementById('leftBtn').onmouseup = () => leftPressed = false;
  document.getElementById('rightBtn').onmousedown = () => rightPressed = true;
  document.getElementById('rightBtn').onmouseup = () => rightPressed = false;
  document.getElementById('shotBtn').onmousedown = () => shotPressed = true;
  document.getElementById('shotBtn').onmouseup = () => shotPressed = false;
};

function startGame() {
  document.getElementById('titleScreen').style.display = 'none';
  document.getElementById('gameArea').style.display = 'block';
  gameState = "playing";
  score = 0;
  player.x = 370;
  player.y = 500;
  player.alive = true;
  shots = [];
  enemies = [];
  enemyShots = [];
  boss = null;
  requestAnimationFrame(gameLoop);
}

function gameLoop() {
  if (gameState !== "playing") return;

  // 入力・移動
  if (leftPressed) player.x -= player.speed;
  if (rightPressed) player.x += player.speed;
  if (player.x < 0) player.x = 0;
  if (player.x > 800 - player.w) player.x = 800 - player.w;

  // 弾発射
  if (shotPressed && shotCooldown <= 0) {
    shots.push({ x: player.x + player.w / 2 - 5, y: player.y, w: 10, h: 20, speed: 10 });
    shotCooldown = 12; // 連射間隔
  }
  if (shotCooldown > 0) shotCooldown--;

  // 弾移動
  shots.forEach(s => s.y -= s.speed);
  // 画面外削除
  shots = shots.filter(s => s.y > -30);

  // 敵出現
  if (score < bossAppearScore) {
    enemySpawnCooldown--;
    if (enemySpawnCooldown <= 0) {
      spawnEnemy();
      enemySpawnCooldown = 80 + Math.random() * 60;
    }
  }

  // 敵移動
  enemies.forEach(e => e.y += e.speed);

  // 敵弾
  enemies.forEach(e => {
    e.shotCooldown--;
    if (e.shotCooldown <= 0) {
      enemyShots.push({
        x: e.x + e.w / 2 - 5, y: e.y + e.h, w: 10, h: 15, speed: 5
      });
      e.shotCooldown = 40 + Math.random() * 30;
    }
  });

  // 敵弾移動
  enemyShots.forEach(es => es.y += es.speed);
  enemyShots = enemyShots.filter(es => es.y < 620);

  // ボス出現
  if (score >= bossAppearScore && !boss) {
    boss = { x: 350, y: 60, w: 120, h: 120, hp: bossHPMax, dir: 1, shotCooldown: 0 };
  }

  // ボス移動・攻撃
  if (boss) {
    boss.x += boss.dir * 3;
    if (boss.x < 0 || boss.x > 800 - boss.w) boss.dir *= -1;
    boss.shotCooldown--;
    if (boss.shotCooldown <= 0) {
      enemyShots.push({
        x: boss.x + boss.w / 2 - 10, y: boss.y + boss.h, w: 20, h: 25, speed: 7
      });
      boss.shotCooldown = 22;
    }
  }

  // 敵と弾の当たり判定
  shots.forEach((s, si) => {
    enemies.forEach((e, ei) => {
      if (isHit(s, e)) {
        enemies.splice(ei, 1);
        shots.splice(si, 1);
        score += 100;
      }
    });
    if (boss && isHit(s, boss)) {
      boss.hp--;
      shots.splice(si, 1);
      if (boss.hp <= 0) {
        boss = null;
        setTimeout(gameClear, 500);
      }
    }
  });

  // 敵と自機の当たり判定
  enemies.forEach((e) => {
    if (isHit(e, player)) {
      gameOver();
    }
  });
  if (boss && isHit(boss, player)) gameOver();

  // 敵弾と自機の当たり判定
  enemyShots.forEach((es) => {
    if (isHit(es, player)) gameOver();
  });

  // 敵の画面外削除
  enemies = enemies.filter(e => e.y < 650);

  // 描画
  drawGame();

  // スコア更新
  document.getElementById('scoreDisplay').innerText = "スコア: " + score;

  // 次フレーム
  if (gameState === "playing") requestAnimationFrame(gameLoop);
}

function spawnEnemy() {
  enemies.push({
    x: Math.random() * (800 - 60),
    y: -60,
    w: 60,
    h: 60,
    speed: 2 + Math.random() * 1.5,
    shotCooldown: 30 + Math.random() * 40
  });
}

function isHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
    a.y < b.y + b.h && a.y + a.h > b.y;
}

function drawGame() {
  ctx.clearRect(0, 0, 800, 600);
  ctx.fillStyle = "#333";
  ctx.fillRect(0, 0, 800, 600);

  // 弾
  ctx.fillStyle = "#ff0";
  shots.forEach(s => ctx.fillRect(s.x, s.y, s.w, s.h));

  // 敵
  enemies.forEach(e => {
    if (images.enemy1) ctx.drawImage(images.enemy1, e.x, e.y, e.w, e.h);
    else {
      ctx.fillStyle = "#0af";
      ctx.fillRect(e.x, e.y, e.w, e.h);
    }
  });

  // ボス
  if (boss) {
    if (images.boss) ctx.drawImage(images.boss, boss.x, boss.y, boss.w, boss.h);
    else {
      ctx.fillStyle = "#f55";
      ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
    }
    // HPバー
    ctx.fillStyle = "#fff";
    ctx.fillRect(boss.x, boss.y - 16, boss.w, 8);
    ctx.fillStyle = "#f22";
    ctx.fillRect(boss.x, boss.y - 16, boss.w * (boss.hp / bossHPMax), 8);
  }

  // 自機
  if (images.player) ctx.drawImage(images.player, player.x, player.y, player.w, player.h);
  else {
    ctx.fillStyle = "#3af";
    ctx.fillRect(player.x, player.y, player.w, player.h);
  }

  // 敵弾・ボス弾
  ctx.fillStyle = "#f50";
  enemyShots.forEach(es => ctx.fillRect(es.x, es.y, es.w, es.h));
}

// ==============================
// ゲームオーバー・クリア
// ==============================
function gameOver() {
  gameState = "gameover";
  document.getElementById('gameArea').style.display = 'none';
  document.getElementById('gameOverScreen').style.display = 'block';
  // ゲームオーバー画像を出す場合はここで設定
}
function gameClear() {
  gameState = "clear";
  document.getElementById('gameArea').style.display = 'none';
  document.getElementById('clearScreen').style.display = 'block';
  document.getElementById('finalScore').innerText = "スコア: " + score;
  // ボスクリア画像表示
  if (images.boss) {
    const bossImg = document.createElement('img');
    bossImg.src = images.boss.src;
    bossImg.style.height = "100px";
    document.getElementById('bossClearImg').innerHTML = "";
    document.getElementById('bossClearImg').appendChild(bossImg);
  }
}
