function setupHiDpiCanvas(canvas, logicalWidth, logicalHeight) {
	var dpr = Math.min(window.devicePixelRatio || 1, 2);
	canvas.width = logicalWidth * dpr;
	canvas.height = logicalHeight * dpr;
	canvas.style.width = logicalWidth + 'px';
	canvas.style.height = logicalHeight + 'px';
	var context = canvas.getContext('2d', { alpha: false, desynchronized: true });
	context.scale(dpr, dpr);
	context.imageSmoothingEnabled = true;
	return context;
}

function drawStarfield(ctx, w, h, frame) {
	for (var i = 0; i < 40; i++) {
		var x = (i * 97 + frame * 0.4) % w;
		var y = (i * 53 + frame * 0.7) % h;
		var size = (i % 3) + 1;
		ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + (i % 5) * 0.12) + ')';
		ctx.fillRect(x, y, size, size);
	}
}

var MOVE = {
	MAX_SPEED: 420,
	ACCEL: 2200,
	FRICTION: 1600,
	BEAM_SPEED: 640,
	FIRE_COOLDOWN: 0.14
};

var canvas = document.getElementById('canvas');
var ctx;
var width = window.innerWidth;
var height = window.innerHeight;
var isMobile = width <= 500;
var lastTime = 0;
var frame = 0;
var flag = 0;
var esp = 90;
var score = 0;
var health = 100;
var enemy = [];
var beam = [];
var particles = [];
var screenShake = 0;
var fireCooldown = 0;
var gameOver = false;
var rafId = 0;

var map = {
	37: false,
	39: false,
	38: false,
	40: false,
	32: false
};

var playerImg = new Image();
var enemyImg = new Image();
var bgImg = new Image();
var beamImg = new Image();
var arrowkeysImg = new Image();
var shootbtnImg = new Image();
var startImg = new Image();

var player = {
	x: 0,
	y: 0,
	vx: 0,
	vy: 0,
	radius: 40,
	width: 0,
	height: 0
};

var startbtn = { x: 0, y: 0 };

var joystick = new VirtualJoystick({
	limitStickTravel: true,
	stickRadius: 20
});

joystick.addEventListener('touchStartValidation', function(event) {
	var touch = event.changedTouches[0];
	if (touch.pageX >= width / 2) return false;
	return true;
});

function resizeCanvas() {
	width = window.innerWidth;
	height = window.innerHeight;
	isMobile = width <= 500;
	ctx = setupHiDpiCanvas(canvas, width, height);
	clampPlayer();
}

function clampPlayer() {
	if (!player.width) return;
	player.x = Math.max(0, Math.min(width - player.width, player.x));
	player.y = Math.max(0, Math.min(height - player.height, player.y));
}

function spawnParticles(x, y, count, color, speed, life) {
	for (var i = 0; i < count; i++) {
		var angle = Math.random() * Math.PI * 2;
		var spd = speed * (0.4 + Math.random() * 0.6);
		particles.push({
			x: x,
			y: y,
			vx: Math.cos(angle) * spd,
			vy: Math.sin(angle) * spd,
			life: life * (0.6 + Math.random() * 0.4),
			maxLife: life,
			color: color,
			size: 1 + Math.random() * 2.5
		});
	}
}

function spawnEngineTrail() {
	var cx = player.x + player.width / 2;
	var cy = player.y + player.height - 4;
	spawnParticles(cx, cy, 1, '#7df9ff', 40, 0.18);
	spawnParticles(cx, cy, 1, '#ff9a3c', 55, 0.12);
}

function triggerScreenShake(intensity) {
	screenShake = Math.max(screenShake, intensity);
}

function fireBeam() {
	if (fireCooldown > 0 || !player.width) return;
	fireCooldown = MOVE.FIRE_COOLDOWN;
	beam.push({
		x: player.y,
		y: player.x + player.width / 2
	});
	spawnParticles(player.x + player.width / 2, player.y + 6, 4, '#7df9ff', 120, 0.15);
}

function getInputVector() {
	var ix = 0;
	var iy = 0;

	if (map[37]) ix -= 1;
	if (map[39]) ix += 1;
	if (map[38]) iy -= 1;
	if (map[40]) iy += 1;

	if (isMobile) {
		if (joystick.left()) ix -= 1;
		if (joystick.right()) ix += 1;
		if (joystick.up()) iy -= 1;
		if (joystick.down()) iy += 1;
	}

	var len = Math.hypot(ix, iy);
	if (len > 1) {
		ix /= len;
		iy /= len;
	}
	return { x: ix, y: iy };
}

function updatePlayer(dt) {
	var input = getInputVector();
	var moving = input.x !== 0 || input.y !== 0;

	if (moving) {
		player.vx += input.x * MOVE.ACCEL * dt;
		player.vy += input.y * MOVE.ACCEL * dt;
	} else {
		var friction = MOVE.FRICTION * dt;
		if (Math.abs(player.vx) <= friction) player.vx = 0;
		else player.vx -= Math.sign(player.vx) * friction;
		if (Math.abs(player.vy) <= friction) player.vy = 0;
		else player.vy -= Math.sign(player.vy) * friction;
	}

	var speed = Math.hypot(player.vx, player.vy);
	if (speed > MOVE.MAX_SPEED) {
		player.vx = (player.vx / speed) * MOVE.MAX_SPEED;
		player.vy = (player.vy / speed) * MOVE.MAX_SPEED;
	}

	player.x += player.vx * dt;
	player.y += player.vy * dt;
	clampPlayer();

	if (moving && flag === 1 && !gameOver) {
		spawnEngineTrail();
	}
}

function updateBeams(dt) {
	for (var j = beam.length - 1; j >= 0; j--) {
		beam[j].x -= MOVE.BEAM_SPEED * dt;
		if (beam[j].x < -beamImg.height) {
			beam.splice(j, 1);
		}
	}
}

function updateEnemies(dt) {
	for (var i = enemy.length - 1; i >= 0; i--) {
		enemy[i].y += esp * dt;

		if (enemy.length === 1) {
			enemy.push({
				x: Math.random() * (width - enemyImg.width),
				y: 10,
				radius: 40
			});
		}

		var dx = player.x + player.width / 2 - (enemy[i].x + enemyImg.width / 2);
		var dy = player.y + player.height / 2 - (enemy[i].y + enemyImg.height / 2);
		var distance = Math.sqrt(dx * dx + dy * dy);

		if (distance < player.radius + enemy[i].radius) {
			enemy.splice(i, 1);
			health -= 20;
			triggerScreenShake(8);
			spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 14, '#ff6b6b', 180, 0.35);
			continue;
		}

		if (enemy.length >= 2 && enemy[i].y > height) {
			enemy.splice(i, 1);
			health -= 5;
			triggerScreenShake(3);
		}
	}
}

function checkBeamHits() {
	for (var a = beam.length - 1; a >= 0; a--) {
		for (var b = enemy.length - 1; b >= 0; b--) {
			if (beam[a].y < enemy[b].x + enemyImg.width &&
				beam[a].y + beamImg.width > enemy[b].x &&
				beam[a].x < enemy[b].y + enemyImg.height &&
				beamImg.height + beam[a].x > enemy[b].y) {
				spawnParticles(enemy[b].x + enemyImg.width / 2, enemy[b].y + enemyImg.height / 2, 10, '#ffd166', 160, 0.3);
				triggerScreenShake(2);
				enemy.splice(b, 1);
				beam.splice(a, 1);
				score += 1;
				esp += 3;
				break;
			}
		}
	}
}

function updateParticles(dt) {
	for (var i = particles.length - 1; i >= 0; i--) {
		var p = particles[i];
		p.life -= dt;
		if (p.life <= 0) {
			particles.splice(i, 1);
			continue;
		}
		p.x += p.vx * dt;
		p.y += p.vy * dt;
		p.vy += 120 * dt;
	}
	if (screenShake > 0) {
		screenShake = Math.max(0, screenShake - 28 * dt);
	}
}

function drawParticles() {
	for (var i = 0; i < particles.length; i++) {
		var p = particles[i];
		ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
		ctx.fillStyle = p.color;
		ctx.beginPath();
		ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalAlpha = 1;
}

function drawHud() {
	ctx.fillStyle = 'white';
	ctx.font = (isMobile ? '24px' : '30px') + ' Arial';
	ctx.fillText('Score: ' + score, 10, 50);
	ctx.fillText('Health: ' + health, width - (isMobile ? 130 : 160), 50);
}

function drawTitleScreen() {
	ctx.fillStyle = 'white';
	if (isMobile) {
		ctx.font = '25px Arial';
		ctx.fillText('Space Shooter', 0, 100);
		ctx.font = '20px Arial';
		ctx.fillText('Tap anywhere to start ', 0, 150);
		ctx.font = '10px Arial';
		ctx.fillText('Instructions : ', 0, 230);
		ctx.fillText('1. Use the Joystick on your left hand side to move the ship.', 0, 260);
		ctx.fillText('2. Press shoot button on the right hand side to shoot.', 0, 280);
		ctx.fillText('3. Your Health is 100 at the start of the Game(as it should be).', 0, 300);
		ctx.fillText('3. Try to dodge the enemy ships or your health will decrease(by 20).', 0, 320);
		ctx.fillText('4. If any ships passes by you, your health will decrease(by 5).', 0, 340);
		ctx.drawImage(startImg, startbtn.x, startbtn.y);
	} else {
		ctx.font = '50px Arial';
		ctx.fillText('Space Shooter', 40, 200);
		ctx.font = '30px Arial';
		ctx.fillText('Press Enter to start', 40, 250);
		ctx.font = '20px Arial';
		ctx.fillText('Instructions : ', 150, 330);
		ctx.fillText('1. Press Arrow Keys to move the ship.', 150, 360);
		ctx.fillText('2. Press spacebar to shoot.', 150, 380);
		ctx.fillText('3. You Health is 100 at the start of the Game(as it should be).', 150, 400);
		ctx.fillText('3. Try to dodge the enemy ships or health will decrease(by 20).', 150, 420);
		ctx.fillText('4. If any ship passes by you your health will decrease(by 5).', 150, 440);
	}
}

function drawGameOver() {
	ctx.fillStyle = 'white';
	if (isMobile) {
		ctx.font = '25px Arial';
		ctx.fillText('GAME OVER!!', width / 2 - 60, height / 2);
		ctx.font = '10px Arial';
		ctx.fillText('Tap anywhere to restart', width / 2 - 55, height / 2 + 30);
	} else {
		ctx.font = '50px Arial';
		ctx.fillText('GAME OVER!!', width / 2 - 180, height / 2);
		ctx.font = '20px Arial';
		ctx.fillText('press ENTER to restart', width / 2 - 120, height / 2 + 40);
	}
}

function draw(now) {
	var dt = Math.min(0.05, (now - lastTime) / 1000);
	lastTime = now;
	frame++;

	ctx.save();
	if (screenShake > 0) {
		ctx.translate(
			(Math.random() - 0.5) * screenShake,
			(Math.random() - 0.5) * screenShake
		);
	}

	ctx.drawImage(bgImg, 0, 0, width, height);
	drawStarfield(ctx, width, height, frame);

	if (flag === 0) {
		drawTitleScreen();
	} else {
		if (!gameOver) {
			updatePlayer(dt);
			if (map[32]) fireBeam();
			if (fireCooldown > 0) fireCooldown -= dt;

			updateBeams(dt);
			updateEnemies(dt);
			checkBeamHits();
			updateParticles(dt);

			if (health <= 0) {
				gameOver = true;
			}
		} else {
			updateParticles(dt);
		}

		ctx.drawImage(playerImg, player.x, player.y);

		for (var j = 0; j < beam.length; j++) {
			ctx.save();
			ctx.shadowColor = '#7df9ff';
			ctx.shadowBlur = 8;
			ctx.drawImage(beamImg, beam[j].y, beam[j].x);
			ctx.restore();
		}

		for (var i = 0; i < enemy.length; i++) {
			ctx.drawImage(enemyImg, enemy[i].x, enemy[i].y);
		}

		drawParticles();

		if (isMobile && !gameOver) {
			ctx.drawImage(shootbtnImg, width - shootbtnImg.width, height - shootbtnImg.height);
		}

		drawHud();

		if (gameOver) {
			drawGameOver();
		}
	}

	ctx.restore();
	rafId = window.requestAnimationFrame(draw);
}

function startGame() {
	if (flag === 0) flag = 1;
}

function initGameState() {
	player.width = playerImg.width;
	player.height = playerImg.height;
	player.x = (width - player.width) / 4;
	player.y = height - player.height - 20;
	player.vx = 0;
	player.vy = 0;

	startbtn.x = (width - startImg.width) / 2;
	startbtn.y = height - startImg.height;

	enemy = [{
		x: (width - enemyImg.width) / 2,
		y: 10,
		radius: 40
	}];

	beam = [{
		x: player.y - player.height,
		y: player.x + player.width / 2
	}];
}

playerImg.onload = function() { initGameState(); };
enemyImg.src = 'enemy.png';
playerImg.src = 'player.png';
bgImg.src = 'bg.png';
beamImg.src = 'beam.png';
arrowkeysImg.src = 'arrowkeys.png';
shootbtnImg.src = 'shootbtn.png';
startImg.src = 'start.png';

document.addEventListener('keydown', function(e) {
	if (e.keyCode in map) {
		map[e.keyCode] = true;
		e.preventDefault();
	}
	if (e.keyCode === 13) {
		if (gameOver) location.reload();
		else startGame();
	}
	if (e.keyCode === 32 && flag === 1 && !gameOver) {
		fireBeam();
	}
});

document.addEventListener('keyup', function(e) {
	if (e.keyCode in map) {
		map[e.keyCode] = false;
	}
});

document.body.addEventListener('touchstart', function(e) {
	if (gameOver) {
		location.reload();
		return;
	}
	if (flag === 0) {
		startGame();
		return;
	}

	var mx = e.touches[0].clientX;
	var my = e.touches[0].clientY;

	if ((width - shootbtnImg.width) + 8 < mx && mx < (width - shootbtnImg.width) + 8 + 64 &&
		(height - shootbtnImg.height) + 8 < my && my < (height - shootbtnImg.height) + 8 + 62) {
		fireBeam();
	}
}, { passive: true });

window.addEventListener('resize', resizeCanvas);

resizeCanvas();
lastTime = performance.now();
draw(lastTime);
