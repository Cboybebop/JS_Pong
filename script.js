const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let width, height;
function resize() { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();

class Paddle {
  constructor(x) {
    this.x = x;
    this.baseHeight = 100;
    this.width = 10;
    this.height = this.baseHeight;
    this.y = (height - this.height) / 2;
    this.speed = 5;
    this.double = false;
    this.doubleTimer = 0;
  }
  update() {
    if (this.double && Date.now() > this.doubleTimer) {
      this.double = false;
      this.height = this.baseHeight * (options.doublePaddle ? 2 : 1);
    }
  }
  draw() { ctx.fillStyle = '#fff'; ctx.fillRect(this.x, this.y, this.width, this.height); }
}

class Ball {
  constructor() { this.reset(); }
  reset() {
    this.x = width/2;
    this.y = height/2;
    this.baseSpeed = 8;
    this.speed = this.baseSpeed;
    this.angle = (Math.random()*Math.PI/2 - Math.PI/4);
    this.vx = this.speed * Math.cos(this.angle) * (Math.random()<0.5 ? -1 : 1);
    this.vy = this.speed * Math.sin(this.angle);
  }
  update(p1, p2) {
    this.x += this.vx;
    this.y += this.vy;
    if (this.y < 0 || this.y > height) this.vy = -this.vy;
    let paddle = null;
    if (this.x < p1.x + p1.width && this.y > p1.y && this.y < p1.y + p1.height) paddle = p1;
    if (this.x > p2.x - p2.width && this.y > p2.y && this.y < p2.y + p2.height) paddle = p2;
    if (paddle) {
      lastHit = paddle;
      if (!options.noSpeed) this.speed += 0.01;
      const dir = this.x < width/2 ? 1 : -1;
      this.angle = Math.random()*Math.PI/2 - Math.PI/4;
      this.vx = this.speed * Math.cos(this.angle) * dir;
      this.vy = this.speed * Math.sin(this.angle);
      if (this.speed >= 5) {
        for (let i = 0; i < 3; i++) sparks.push(new Spark(this.x, this.y));
      }
    }
  }
  draw() { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(this.x, this.y, 8, 0, Math.PI*2); ctx.fill(); }
}

class Spark {
  constructor(x,y) { this.x = x; this.y = y; this.vx = (Math.random()-0.5)*4; this.vy = (Math.random()-0.5)*4; this.life = 30; }
  update() { this.x += this.vx; this.y += this.vy; this.life--; }
  draw() { ctx.fillRect(this.x, this.y, 2, 2); }
}

class PowerUp {
  constructor() {
    this.types = ['speedUp','speedDown','doublePaddle'];
    this.type = this.types[Math.floor(Math.random()*this.types.length)];
    this.x = Math.random()*(width-40)+20;
    this.y = Math.random()*(height-40)+20;
    this.size = 20;
  }
  draw() {
    ctx.fillStyle = '#ff0'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
    let icon = this.type === 'speedUp' ? '▲' : this.type === 'speedDown' ? '▼' : '↻';
    ctx.fillText(icon, this.x, this.y + 6);
  }
  apply() {
    if (this.type === 'speedUp') ball.speed += 0.5;
    if (this.type === 'speedDown') ball.speed = Math.max(0.5, ball.speed - 0.5);
    if (this.type === 'doublePaddle') {
      lastHit.double = true;
      lastHit.height *= 2;
      lastHit.doubleTimer = Date.now() + 30000;
    }
  }
}

let p1, p2, ball, sparks, powerUp, lastSpawn, nextSpawn, lastHit;
let score = { player: 0, cpu: 0 };
let playing = false;
const options = { unbeatable: false, doublePaddle: false, noSpeed: false, cpuMode: false };

function initGame() {
  p1 = new Paddle(10);
  p2 = new Paddle(width - 20);
  if (options.doublePaddle) {
    p1.height = p1.baseHeight * 2;
    p2.height = p2.baseHeight * 2;
  }
  ball = new Ball();
  sparks = [];
  powerUp = null;
  nextSpawn = Date.now() + (Math.random() * 90000 + 30000);
  lastHit = null;
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  p1.draw(); p2.draw(); ball.draw();
  sparks.forEach(s => { s.draw(); });
  if (powerUp) powerUp.draw();
  document.getElementById('scoreBoard').innerText = `${score.player} : ${score.cpu}`;
  document.getElementById('speedDisplay').innerText = `Speed: ${ball.speed.toFixed(2)}`;
}

function update() {
  if (!playing) return;
  p1.update(); p2.update(); ball.update(p1, p2);
  sparks = sparks.filter(s => { s.update(); return s.life > 0; });
  if (Date.now() > nextSpawn) { powerUp = new PowerUp(); nextSpawn = Date.now() + 120000; }
  if (powerUp && Math.hypot(ball.x - powerUp.x, ball.y - powerUp.y) < 20) { powerUp.apply(); powerUp = null; }

  if (ball.x < 0) { score.cpu++; checkWin(); }
  if (ball.x > width) { score.player++; checkWin(); }

  if (options.cpuMode) controlCPU(true);
  else {
    controlPlayer();
    controlCPU(false);
  }
}

function checkWin() {
  if (score.player === 5 || score.cpu === 5) {
    playing = false;
    const winner = score.player === 5 ? 'Player' : 'Computer';
    document.getElementById('endOverlay').innerText = `${winner} has won!`;
    document.getElementById('endOverlay').style.display = 'flex';
  } else {
    ball.reset();
  }
}

let up = false, down = false;
window.addEventListener('keydown', e => {
  if (playing) {
    if (e.key === 'ArrowUp') up = true;
    if (e.key === 'ArrowDown') down = true;
  } else {
    startGame();
  }
});
window.addEventListener('keyup', e => {
  if (e.key === 'ArrowUp') up = false;
  if (e.key === 'ArrowDown') down = false;
});
canvas.addEventListener('touchmove', e => { if (!options.cpuMode) { const t = e.touches[0]; p1.y = t.clientY - p1.height/2; }});

function controlPlayer() {
  if (up) p1.y -= p1.speed;
  if (down) p1.y += p1.speed;
  p1.y = Math.max(0, Math.min(height - p1.height, p1.y));
}

function controlCPU(dual) {
  if (dual) {
    p1.y = ball.y - p1.height/2;
    p2.y = ball.y - p2.height/2;
  } else if (options.unbeatable) {
    p2.y = ball.y - p2.height/2;
  } else {
    if (ball.y < p2.y + p2.height/2) p2.y -= p2.speed;
    else p2.y += p2.speed;
  }
  p2.y = Math.max(0, Math.min(height - p2.height, p2.y));
}

function startGame() {
  score = { player: 0, cpu: 0 };
  initGame();
  playing = true;
  document.getElementById('startOverlay').style.display = 'none';
  document.getElementById('endOverlay').style.display = 'none';
}

document.getElementById('menuBtn').onclick = () => {
  const m = document.getElementById('menu');
  m.style.display = m.style.display === 'flex' ? 'none' : 'flex';
};
['unbeatable','doublePaddle','noSpeed','cpuMode'].forEach(id => {
  document.getElementById(id).onchange = e => {
    options[id] = e.target.checked;
    if (id === 'doublePaddle') {
      p1.height = p1.baseHeight * (e.target.checked ? 2 : 1);
      p2.height = p2.baseHeight * (e.target.checked ? 2 : 1);
    }
  };
  document.getElementById(id + '_m').onchange = e => {
    document.getElementById(id).checked = e.target.checked;
    document.getElementById(id).onchange(e);
  };
});

initGame();
function loop() { update(); draw(); requestAnimationFrame(loop); }
loop();