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

var STAR_LAYERS = [
	{ count: 90, speed: 18, maxSize: 1.4, baseAlpha: 0.28 },
	{ count: 55, speed: 42, maxSize: 2.2, baseAlpha: 0.52 },
	{ count: 28, speed: 88, maxSize: 3.2, baseAlpha: 0.82 }
];

var stars = [];
var starTime = 0;

function seededRandom(seed) {
	var x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453;
	return x - Math.floor(x);
}

function initStarfield(w, h) {
	stars = [];
	for (var layer = 0; layer < STAR_LAYERS.length; layer++) {
		var cfg = STAR_LAYERS[layer];
		for (var i = 0; i < cfg.count; i++) {
			var seed = layer * 1000 + i;
			stars.push({
				layer: layer,
				x: seededRandom(seed) * w,
				y: seededRandom(seed + 1) * h,
				size: 0.6 + seededRandom(seed + 2) * cfg.maxSize,
				phase: seededRandom(seed + 3) * Math.PI * 2,
				twinkleSpeed: 1.2 + seededRandom(seed + 4) * 2.8,
				twinkleAmp: 0.15 + seededRandom(seed + 5) * 0.35
			});
		}
	}
}

function updateStarfield(dt, w, h) {
	starTime += dt;
	for (var i = 0; i < stars.length; i++) {
		var star = stars[i];
		var speed = STAR_LAYERS[star.layer].speed;
		star.y += speed * dt;
		if (star.y > h + star.size) {
			star.y = -star.size;
			star.x = Math.random() * w;
		}
	}
}

function drawStarfield(ctx, w, h) {
	for (var i = 0; i < stars.length; i++) {
		var star = stars[i];
		var cfg = STAR_LAYERS[star.layer];
		var twinkle = 0.5 + 0.5 * Math.sin(starTime * star.twinkleSpeed + star.phase);
		var alpha = cfg.baseAlpha * (1 - star.twinkleAmp + star.twinkleAmp * twinkle);
		ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
		if (star.size <= 1.2) {
			ctx.fillRect(star.x, star.y, star.size, star.size);
		} else {
			ctx.beginPath();
			ctx.arc(star.x, star.y, star.size * 0.5, 0, Math.PI * 2);
			ctx.fill();
		}
	}
}

var MOTHERSHIP = {
	DRIFT_X: 12,
	DRIFT_Y: 6,
	DAMAGE: 15,
	COOLDOWN: 1.4,
	WARNING_PULSE: 2.4
};

var mothership = {
	x: 0,
	y: 0,
	width: 0,
	height: 0,
	hitW: 0,
	hitH: 0,
	hitOffsetX: 0,
	hitOffsetY: 0,
	damageCooldown: 0
};

function initMothership(w, h) {
	var scale = Math.min(w, h) / 900;
	mothership.width = Math.max(280, w * 0.55);
	mothership.height = mothership.width * 0.38;
	mothership.hitW = mothership.width * 0.62;
	mothership.hitH = mothership.height * 0.55;
	mothership.hitOffsetX = (mothership.width - mothership.hitW) / 2;
	mothership.hitOffsetY = mothership.height * 0.22;
	mothership.x = w * 0.5 - mothership.width * 0.5;
	mothership.y = h * 0.18;
	mothership.damageCooldown = 0;
	mothership._scale = scale;
}

function updateMothership(dt, w, h) {
	mothership.x += Math.sin(starTime * 0.18) * MOTHERSHIP.DRIFT_X * dt;
	mothership.y += Math.cos(starTime * 0.14) * MOTHERSHIP.DRIFT_Y * dt;
	mothership.x = Math.max(-mothership.width * 0.15, Math.min(w - mothership.width * 0.85, mothership.x));
	mothership.y = Math.max(h * 0.06, Math.min(h * 0.42, mothership.y));
	if (mothership.damageCooldown > 0) {
		mothership.damageCooldown -= dt;
	}
}

function getMothershipHitbox() {
	return {
		x: mothership.x + mothership.hitOffsetX,
		y: mothership.y + mothership.hitOffsetY,
		w: mothership.hitW,
		h: mothership.hitH
	};
}

function circleRectCollision(cx, cy, radius, rect) {
	var closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
	var closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
	var dx = cx - closestX;
	var dy = cy - closestY;
	return dx * dx + dy * dy < radius * radius;
}

function drawMothership(ctx) {
	var mx = mothership.x;
	var my = mothership.y;
	var mw = mothership.width;
	var mh = mothership.height;
	var pulse = 0.55 + 0.45 * Math.sin(starTime * MOTHERSHIP.WARNING_PULSE);

	ctx.save();
	ctx.translate(mx, my);

	var hullGrad = ctx.createLinearGradient(0, 0, 0, mh);
	hullGrad.addColorStop(0, 'rgba(12, 18, 36, 0.92)');
	hullGrad.addColorStop(0.5, 'rgba(6, 10, 24, 0.96)');
	hullGrad.addColorStop(1, 'rgba(2, 4, 12, 0.98)');

	ctx.fillStyle = hullGrad;
	ctx.beginPath();
	ctx.moveTo(mw * 0.5, mh * 0.02);
	ctx.lineTo(mw * 0.92, mh * 0.38);
	ctx.lineTo(mw * 0.78, mh * 0.88);
	ctx.lineTo(mw * 0.22, mh * 0.88);
	ctx.lineTo(mw * 0.08, mh * 0.38);
	ctx.closePath();
	ctx.fill();

	ctx.strokeStyle = 'rgba(248, 113, 113, ' + (0.25 + pulse * 0.35) + ')';
	ctx.lineWidth = 2;
	ctx.stroke();

	ctx.fillStyle = 'rgba(18, 28, 52, 0.85)';
	ctx.beginPath();
	ctx.moveTo(0, mh * 0.42);
	ctx.lineTo(mw * 0.14, mh * 0.55);
	ctx.lineTo(mw * 0.14, mh * 0.78);
	ctx.lineTo(0, mh * 0.72);
	ctx.closePath();
	ctx.fill();
	ctx.beginPath();
	ctx.moveTo(mw, mh * 0.42);
	ctx.lineTo(mw * 0.86, mh * 0.55);
	ctx.lineTo(mw * 0.86, mh * 0.78);
	ctx.lineTo(mw, mh * 0.72);
	ctx.closePath();
	ctx.fill();

	var lightColors = ['#f87171', '#fb923c', '#f87171'];
	for (var l = 0; l < 3; l++) {
		var lx = mw * (0.32 + l * 0.18);
		var ly = mh * 0.72;
		var lightPulse = 0.4 + 0.6 * Math.sin(starTime * 3.2 + l * 1.4);
		ctx.fillStyle = 'rgba(248, 113, 113, ' + (0.35 + lightPulse * 0.45) + ')';
		ctx.beginPath();
		ctx.arc(lx, ly, 4 + lightPulse * 2, 0, Math.PI * 2);
		ctx.fill();
		ctx.shadowColor = lightColors[l];
		ctx.shadowBlur = 10 + lightPulse * 8;
		ctx.fill();
		ctx.shadowBlur = 0;
	}

	ctx.fillStyle = 'rgba(125, 249, 255, 0.08)';
	ctx.beginPath();
	ctx.ellipse(mw * 0.5, mh * 0.28, mw * 0.12, mh * 0.14, 0, 0, Math.PI * 2);
	ctx.fill();

	ctx.restore();
}

function checkMothershipCollision() {
	if (mothership.damageCooldown > 0 || !player.width) return;
	var hitbox = getMothershipHitbox();
	var cx = player.x + player.width / 2;
	var cy = player.y + player.height / 2;
	if (!circleRectCollision(cx, cy, player.radius * 0.85, hitbox)) return;

	mothership.damageCooldown = MOTHERSHIP.COOLDOWN;
	health -= MOTHERSHIP.DAMAGE;
	triggerScreenShake(10);
	spawnParticles(cx, cy, 16, '#f87171', 200, 0.4);
	spawnParticles(cx, cy, 8, '#7df9ff', 140, 0.25);
}

var MOVE = {
	MAX_SPEED: 420,
	ACCEL: 2200,
	FRICTION: 1600,
	BEAM_SPEED: 640,
	FIRE_COOLDOWN: 0.14
};

var HUD = {
	MAX_HEALTH: 100,
	SEGMENTS: 5,
	FONT: 'Orbitron, Arial, sans-serif',
	COLORS: {
		panel: 'rgba(8, 12, 28, 0.72)',
		panelBorder: 'rgba(125, 249, 255, 0.35)',
		label: 'rgba(180, 220, 255, 0.85)',
		score: '#ffffff',
		scoreGlow: '#7df9ff',
		healthHigh: '#4ade80',
		healthMid: '#fbbf24',
		healthLow: '#f87171',
		healthEmpty: 'rgba(255, 255, 255, 0.12)',
		overlay: 'rgba(4, 8, 20, 0.55)',
		title: '#ffffff',
		accent: '#7df9ff'
	}
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
	initStarfield(width, height);
	initMothership(width, height);
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

function hudPadding() {
	return isMobile ? 10 : 16;
}

function roundRectPath(ctx, x, y, w, h, r) {
	var radius = Math.min(r, w / 2, h / 2);
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + w - radius, y);
	ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
	ctx.lineTo(x + w, y + h - radius);
	ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
	ctx.lineTo(x + radius, y + h);
	ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
}

function drawGlassPanel(x, y, w, h, radius) {
	ctx.save();
	roundRectPath(ctx, x, y, w, h, radius);
	ctx.fillStyle = HUD.COLORS.panel;
	ctx.fill();
	ctx.strokeStyle = HUD.COLORS.panelBorder;
	ctx.lineWidth = isMobile ? 1 : 1.5;
	ctx.stroke();
	ctx.restore();
}

function drawCenteredText(text, centerX, y, font, fillStyle, shadow) {
	ctx.save();
	ctx.font = font;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	if (shadow) {
		ctx.shadowColor = shadow.color;
		ctx.shadowBlur = shadow.blur;
	}
	ctx.fillStyle = fillStyle;
	ctx.fillText(text, centerX, y);
	ctx.restore();
}

function healthSegmentColor(ratio) {
	if (ratio > 0.6) return HUD.COLORS.healthHigh;
	if (ratio > 0.3) return HUD.COLORS.healthMid;
	return HUD.COLORS.healthLow;
}

function drawScoreHud() {
	var pad = hudPadding();
	var panelW = isMobile ? 118 : 156;
	var panelH = isMobile ? 52 : 64;
	var x = pad;
	var y = pad;

	drawGlassPanel(x, y, panelW, panelH, isMobile ? 10 : 12);

	ctx.save();
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	ctx.font = (isMobile ? '9px' : '11px') + ' ' + HUD.FONT;
	ctx.fillStyle = HUD.COLORS.label;
	ctx.fillText('SCORE', x + (isMobile ? 10 : 14), y + (isMobile ? 8 : 10));

	ctx.font = '700 ' + (isMobile ? '22px' : '28px') + ' ' + HUD.FONT;
	ctx.shadowColor = HUD.COLORS.scoreGlow;
	ctx.shadowBlur = isMobile ? 6 : 10;
	ctx.fillStyle = HUD.COLORS.score;
	ctx.fillText(String(score), x + (isMobile ? 10 : 14), y + (isMobile ? 22 : 28));
	ctx.restore();
}

function drawHealthHud() {
	var pad = hudPadding();
	var panelW = isMobile ? 148 : 196;
	var panelH = isMobile ? 52 : 64;
	var x = width - panelW - pad;
	var y = pad;
	var innerPad = isMobile ? 10 : 14;
	var barH = isMobile ? 10 : 12;
	var barY = y + (isMobile ? 30 : 36);
	var barW = panelW - innerPad * 2;
	var gap = isMobile ? 3 : 4;
	var segW = (barW - gap * (HUD.SEGMENTS - 1)) / HUD.SEGMENTS;
	var hpPerSeg = HUD.MAX_HEALTH / HUD.SEGMENTS;

	drawGlassPanel(x, y, panelW, panelH, isMobile ? 10 : 12);

	ctx.save();
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	ctx.font = (isMobile ? '9px' : '11px') + ' ' + HUD.FONT;
	ctx.fillStyle = HUD.COLORS.label;
	ctx.fillText('SHIELDS', x + innerPad, y + (isMobile ? 8 : 10));

	ctx.font = '500 ' + (isMobile ? '11px' : '13px') + ' ' + HUD.FONT;
	ctx.textAlign = 'right';
	ctx.fillStyle = healthSegmentColor(health / HUD.MAX_HEALTH);
	ctx.fillText(Math.max(0, health) + '%', x + panelW - innerPad, y + (isMobile ? 8 : 10));
	ctx.textAlign = 'left';

	for (var s = 0; s < HUD.SEGMENTS; s++) {
		var segX = x + innerPad + s * (segW + gap);
		var segFill = Math.max(0, Math.min(1, (health - s * hpPerSeg) / hpPerSeg));
		roundRectPath(ctx, segX, barY, segW, barH, 3);
		ctx.fillStyle = HUD.COLORS.healthEmpty;
		ctx.fill();
		if (segFill > 0) {
			roundRectPath(ctx, segX, barY, segW * segFill, barH, 3);
			ctx.fillStyle = healthSegmentColor((health - s * hpPerSeg) / hpPerSeg);
			if (health <= 25 && frame % 30 < 15) {
				ctx.globalAlpha = 0.75 + 0.25 * segFill;
			}
			ctx.fill();
			ctx.globalAlpha = 1;
		}
	}
	ctx.restore();
}

function drawHud() {
	drawScoreHud();
	drawHealthHud();
}

function drawWrappedLines(lines, centerX, startY, lineHeight, font, fillStyle) {
	ctx.save();
	ctx.font = font;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';
	ctx.fillStyle = fillStyle;
	for (var i = 0; i < lines.length; i++) {
		ctx.fillText(lines[i], centerX, startY + i * lineHeight);
	}
	ctx.restore();
}

function drawTitleScreen() {
	var pad = hudPadding();
	var titleSize = isMobile ? '700 26px' : '900 52px';
	var subtitleSize = isMobile ? '500 14px' : '500 22px';
	var bodySize = isMobile ? '500 11px' : '500 15px';
	var panelW = Math.min(width - pad * 2, isMobile ? width - 24 : 520);
	var panelX = (width - panelW) / 2;
	var titleY = isMobile ? height * 0.14 : height * 0.18;

	drawCenteredText('SPACE SHOOTER', width / 2, titleY, titleSize + ' ' + HUD.FONT, HUD.COLORS.title, {
		color: HUD.COLORS.accent,
		blur: isMobile ? 8 : 16
	});
	drawCenteredText(
		isMobile ? 'Tap anywhere to start' : 'Press Enter to start',
		width / 2,
		titleY + (isMobile ? 34 : 56),
		subtitleSize + ' ' + HUD.FONT,
		HUD.COLORS.accent,
		null
	);

	var instructLines = isMobile
		? [
			'Left joystick — move',
			'Right button — shoot',
			'Collisions −20 · Escapes −5',
			'Mothership hazard −15 shields',
			'Shields start at 100%'
		]
		: [
			'Arrow keys — move',
			'Spacebar — shoot',
			'Collisions cost 20 shields · Escapes cost 5',
			'Avoid the drifting mothership — 15 shield damage',
			'Shields start at full strength'
		];
	var panelH = isMobile ? 136 : 168;
	var panelY = isMobile ? height * 0.42 : height * 0.48;
	drawGlassPanel(panelX, panelY, panelW, panelH, isMobile ? 12 : 14);
	drawCenteredText('HOW TO PLAY', width / 2, panelY + (isMobile ? 14 : 18), bodySize + ' ' + HUD.FONT, HUD.COLORS.label, null);
	drawWrappedLines(
		instructLines,
		width / 2,
		panelY + (isMobile ? 34 : 42),
		isMobile ? 18 : 24,
		bodySize + ' ' + HUD.FONT,
		HUD.COLORS.title
	);

	if (isMobile) {
		ctx.drawImage(startImg, startbtn.x, startbtn.y);
	}
}

function drawGameOverOverlay() {
	ctx.save();
	ctx.fillStyle = HUD.COLORS.overlay;
	ctx.fillRect(0, 0, width, height);

	var pad = hudPadding();
	var panelW = Math.min(width - pad * 2, isMobile ? width - 32 : 420);
	var panelH = isMobile ? 148 : 188;
	var panelX = (width - panelW) / 2;
	var panelY = (height - panelH) / 2;

	drawGlassPanel(panelX, panelY, panelW, panelH, isMobile ? 14 : 16);

	var titleSize = isMobile ? '700 24px' : '900 40px';
	var scoreSize = isMobile ? '700 18px' : '700 24px';
	var hintSize = isMobile ? '500 11px' : '500 16px';
	var centerY = panelY + panelH / 2;

	drawCenteredText('GAME OVER', width / 2, centerY - (isMobile ? 28 : 36), titleSize + ' ' + HUD.FONT, HUD.COLORS.healthLow, {
		color: 'rgba(248, 113, 113, 0.6)',
		blur: isMobile ? 6 : 12
	});
	drawCenteredText('Score ' + score, width / 2, centerY + (isMobile ? 2 : 4), scoreSize + ' ' + HUD.FONT, HUD.COLORS.score, {
		color: HUD.COLORS.scoreGlow,
		blur: 8
	});
	drawCenteredText(
		isMobile ? 'Tap anywhere to restart' : 'Press Enter to restart',
		width / 2,
		centerY + (isMobile ? 32 : 44),
		hintSize + ' ' + HUD.FONT,
		HUD.COLORS.label,
		null
	);
	ctx.restore();
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
	updateStarfield(dt, width, height);
	drawStarfield(ctx, width, height);

	if (flag === 0) {
		updateMothership(dt, width, height);
		drawMothership(ctx);
		drawTitleScreen();
	} else {
		if (!gameOver) {
			updatePlayer(dt);
			updateMothership(dt, width, height);
			if (map[32]) fireBeam();
			if (fireCooldown > 0) fireCooldown -= dt;

			updateBeams(dt);
			updateEnemies(dt);
			checkBeamHits();
			checkMothershipCollision();
			updateParticles(dt);

			if (health <= 0) {
				gameOver = true;
			}
		} else {
			updateMothership(dt, width, height);
			updateParticles(dt);
		}

		drawMothership(ctx);
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

	}

	ctx.restore();

	if (flag === 1) {
		drawHud();
		if (gameOver) {
			drawGameOverOverlay();
		}
	}

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

	mothership.damageCooldown = 0;
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
