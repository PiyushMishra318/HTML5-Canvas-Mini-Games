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

function updateStarfield(dt, w, h, speedScale) {
	speedScale = speedScale == null ? 1 : speedScale;
	if (speedScale <= 0) {
		return;
	}
	starTime += dt * speedScale;
	for (var i = 0; i < stars.length; i++) {
		var star = stars[i];
		var speed = STAR_LAYERS[star.layer].speed * speedScale;
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

var POWERUP_SCORE_INTERVAL = 10;

var POWERUP_TYPES = {
	speed: {
		id: 'speed',
		label: 'TURBO',
		duration: 8,
		color: '#4ade80',
		glow: '#22c55e',
		shape: 'diamond'
	},
	rapid: {
		id: 'rapid',
		label: 'RAPID',
		duration: 6,
		color: '#fb923c',
		glow: '#f97316',
		shape: 'bolt'
	},
	shield: {
		id: 'shield',
		label: 'REPAIR',
		duration: 0,
		instant: true,
		color: '#60a5fa',
		glow: '#3b82f6',
		shape: 'cross'
	},
	spread: {
		id: 'spread',
		label: 'SPREAD',
		duration: 7,
		color: '#c084fc',
		glow: '#a855f7',
		shape: 'triangle'
	}
};

var POWERUP_TYPE_ORDER = ['speed', 'rapid', 'shield', 'spread'];

function getNextPowerUpThreshold(lastDropScore) {
	return lastDropScore + POWERUP_SCORE_INTERVAL;
}

function shouldDropPowerUp(score, lastDropScore) {
	var threshold = getNextPowerUpThreshold(lastDropScore);
	if (score < threshold) {
		return { drop: false, threshold: threshold, type: null };
	}
	var typeIndex = Math.floor(threshold / POWERUP_SCORE_INTERVAL - 1) % POWERUP_TYPE_ORDER.length;
	var typeId = POWERUP_TYPE_ORDER[typeIndex < 0 ? 0 : typeIndex];
	return {
		drop: true,
		threshold: threshold,
		type: POWERUP_TYPES[typeId]
	};
}

function pickPowerUpTypeForScore(score) {
	var cycle = Math.max(0, Math.floor(score / POWERUP_SCORE_INTERVAL) - 1);
	return POWERUP_TYPES[POWERUP_TYPE_ORDER[cycle % POWERUP_TYPE_ORDER.length]];
}

function circleCircleCollision(ax, ay, ar, bx, by, br) {
	var dx = ax - bx;
	var dy = ay - by;
	var r = ar + br;
	return dx * dx + dy * dy < r * r;
}

function getEffectiveMoveSettings(activeBuffs) {
	var maxSpeed = MOVE.MAX_SPEED;
	var fireCooldown = MOVE.FIRE_COOLDOWN;
	if (activeBuffs.speed && activeBuffs.speed.remaining > 0) {
		maxSpeed *= 1.85;
	}
	if (activeBuffs.rapid && activeBuffs.rapid.remaining > 0) {
		fireCooldown *= 0.35;
	}
	return { maxSpeed: maxSpeed, fireCooldown: fireCooldown };
}

function getPauseButtonBounds(canvasW, isMobileLayout) {
	var size = isMobileLayout ? 34 : 40;
	var pad = isMobileLayout ? 10 : 14;
	return {
		x: canvasW - size - pad,
		y: pad + (isMobileLayout ? 58 : 72),
		width: size,
		height: size
	};
}

function isPointInRect(px, py, rect) {
	return px >= rect.x && px <= rect.x + rect.width &&
		py >= rect.y && py <= rect.y + rect.height;
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

var canvas = typeof document !== 'undefined' ? document.getElementById('canvas') : null;
var ctx;
var width = typeof window !== 'undefined' ? window.innerWidth : 800;
var height = typeof window !== 'undefined' ? window.innerHeight : 600;
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
var isPaused = false;
var pauseBtn = null;
var rafId = 0;
var powerUps = [];
var activeBuffs = {};
var lastPowerUpDropScore = 0;
var animTime = 0;

var map = {
	37: false,
	39: false,
	38: false,
	40: false,
	32: false
};

function createImageAsset() {
	if (typeof Image !== 'undefined') {
		return new Image();
	}
	return { width: 0, height: 0, onload: null, src: '' };
}

var playerImg = createImageAsset();
var enemyImg = createImageAsset();
var bgImg = createImageAsset();
var beamImg = createImageAsset();
var arrowkeysImg = createImageAsset();
var shootbtnImg = createImageAsset();
var startImg = createImageAsset();

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

var joystick = null;

function bindJoystick() {
	if (typeof VirtualJoystick === 'undefined') return;
	joystick = new VirtualJoystick({
		limitStickTravel: true,
		stickRadius: 20
	});

	joystick.addEventListener('touchStartValidation', function(event) {
		var touch = event.changedTouches[0];
		if (touch.pageX >= width / 2) return false;
		return true;
	});
}

function resizeCanvas() {
	width = window.innerWidth;
	height = window.innerHeight;
	isMobile = width <= 500;
	ctx = setupHiDpiCanvas(canvas, width, height);
	initStarfield(width, height);
	initMothership(width, height);
	pauseBtn = getPauseButtonBounds(width, isMobile);
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

function togglePause() {
	if (flag !== 1 || gameOver) {
		return false;
	}
	isPaused = !isPaused;
	return isPaused;
}

function spawnPowerUp(x, y, typeDef) {
	powerUps.push({
		x: x,
		y: y,
		vx: (Math.random() - 0.5) * 30,
		vy: 42 + Math.random() * 18,
		radius: 16,
		type: typeDef,
		phase: Math.random() * Math.PI * 2,
		trail: []
	});
}

function activatePowerUp(typeDef) {
	if (typeDef.instant) {
		health = Math.min(HUD.MAX_HEALTH, health + 30);
		spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 18, typeDef.color, 160, 0.45);
		spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 10, typeDef.glow, 120, 0.35);
		return;
	}
	activeBuffs[typeDef.id] = {
		remaining: typeDef.duration,
		label: typeDef.label,
		color: typeDef.color
	};
	spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 14, typeDef.color, 180, 0.4);
}

function updateActiveBuffs(dt) {
	for (var id in activeBuffs) {
		if (!activeBuffs.hasOwnProperty(id)) continue;
		activeBuffs[id].remaining -= dt;
		if (activeBuffs[id].remaining <= 0) {
			delete activeBuffs[id];
		}
	}
}

function updatePowerUps(dt) {
	for (var i = powerUps.length - 1; i >= 0; i--) {
		var pu = powerUps[i];
		pu.trail.push({ x: pu.x, y: pu.y, life: 0.35 });
		if (pu.trail.length > 8) pu.trail.shift();
		for (var t = pu.trail.length - 1; t >= 0; t--) {
			pu.trail[t].life -= dt;
			if (pu.trail[t].life <= 0) pu.trail.splice(t, 1);
		}

		pu.phase += dt * 4.5;
		pu.x += pu.vx * dt;
		pu.y += pu.vy * dt;

		if (pu.x < pu.radius || pu.x > width - pu.radius) pu.vx *= -1;
		if (pu.y > height + pu.radius) {
			powerUps.splice(i, 1);
			continue;
		}

		if (player.width && circleCircleCollision(
			player.x + player.width / 2,
			player.y + player.height / 2,
			player.radius * 0.55,
			pu.x,
			pu.y,
			pu.radius
		)) {
			activatePowerUp(pu.type);
			powerUps.splice(i, 1);
		}
	}
}

function drawPowerUpShape(ctx, shape, size, color, glow, pulse) {
	ctx.save();
	ctx.shadowColor = glow;
	ctx.shadowBlur = 10 + pulse * 8;
	ctx.fillStyle = color;
	ctx.strokeStyle = glow;
	ctx.lineWidth = 2;

	if (shape === 'diamond') {
		ctx.beginPath();
		ctx.moveTo(0, -size);
		ctx.lineTo(size * 0.75, 0);
		ctx.lineTo(0, size);
		ctx.lineTo(-size * 0.75, 0);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	} else if (shape === 'bolt') {
		ctx.beginPath();
		ctx.moveTo(-size * 0.15, -size);
		ctx.lineTo(size * 0.35, -size * 0.15);
		ctx.lineTo(size * 0.05, -size * 0.15);
		ctx.lineTo(size * 0.25, size);
		ctx.lineTo(-size * 0.35, size * 0.1);
		ctx.lineTo(-size * 0.05, size * 0.1);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	} else if (shape === 'cross') {
		var arm = size * 0.35;
		ctx.fillRect(-arm / 2, -size, arm, size * 2);
		ctx.fillRect(-size, -arm / 2, size * 2, arm);
		ctx.strokeRect(-arm / 2, -size, arm, size * 2);
		ctx.strokeRect(-size, -arm / 2, size * 2, arm);
	} else {
		ctx.beginPath();
		ctx.moveTo(0, -size);
		ctx.lineTo(size * 0.9, size * 0.75);
		ctx.lineTo(-size * 0.9, size * 0.75);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	}
	ctx.restore();
}

function drawPowerUps() {
	for (var i = 0; i < powerUps.length; i++) {
		var pu = powerUps[i];
		var pulse = 0.5 + 0.5 * Math.sin(pu.phase);

		for (var t = 0; t < pu.trail.length; t++) {
			var tr = pu.trail[t];
			var alpha = Math.max(0, tr.life / 0.35) * 0.45;
			ctx.save();
			ctx.globalAlpha = alpha;
			ctx.fillStyle = pu.type.glow;
			ctx.beginPath();
			ctx.arc(tr.x, tr.y, pu.radius * 0.35, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}

		ctx.save();
		ctx.translate(pu.x, pu.y);
		ctx.rotate(pu.phase * 0.6);
		ctx.scale(1 + pulse * 0.12, 1 + pulse * 0.12);
		drawPowerUpShape(ctx, pu.type.shape, pu.radius * 0.75, pu.type.color, pu.type.glow, pulse);
		ctx.restore();
	}
}

function drawActiveBuffHud() {
	var ids = Object.keys(activeBuffs);
	if (!ids.length) return;

	var pad = hudPadding();
	var panelW = isMobile ? 132 : 168;
	var rowH = isMobile ? 22 : 26;
	var panelH = ids.length * rowH + (isMobile ? 14 : 18);
	var x = pad;
	var y = pad + (isMobile ? 58 : 72);

	drawGlassPanel(x, y, panelW, panelH, isMobile ? 10 : 12);

	ctx.save();
	ctx.textAlign = 'left';
	ctx.textBaseline = 'middle';
	ctx.font = (isMobile ? '8px' : '9px') + ' ' + HUD.FONT;
	ctx.fillStyle = HUD.COLORS.label;
	ctx.fillText('ACTIVE', x + (isMobile ? 10 : 12), y + (isMobile ? 10 : 12));

	for (var i = 0; i < ids.length; i++) {
		var buff = activeBuffs[ids[i]];
		var rowY = y + (isMobile ? 16 : 20) + i * rowH + rowH / 2;
		ctx.font = '700 ' + (isMobile ? '10px' : '12px') + ' ' + HUD.FONT;
		ctx.fillStyle = buff.color;
		ctx.fillText(buff.label, x + (isMobile ? 10 : 12), rowY);
		ctx.textAlign = 'right';
		ctx.font = '500 ' + (isMobile ? '10px' : '12px') + ' ' + HUD.FONT;
		ctx.fillStyle = HUD.COLORS.title;
		ctx.fillText(buff.remaining.toFixed(1) + 's', x + panelW - (isMobile ? 10 : 12), rowY);
		ctx.textAlign = 'left';
	}
	ctx.restore();
}

function drawPauseButton() {
	if (!pauseBtn) return;
	var cx = pauseBtn.x + pauseBtn.width / 2;
	var cy = pauseBtn.y + pauseBtn.height / 2;

	ctx.save();
	drawGlassPanel(pauseBtn.x, pauseBtn.y, pauseBtn.width, pauseBtn.height, 10);
	ctx.fillStyle = HUD.COLORS.title;
	var barW = 4;
	var barH = isMobile ? 12 : 14;
	var gap = 4;
	if (isPaused) {
		ctx.beginPath();
		ctx.moveTo(cx - 2, cy - barH / 2);
		ctx.lineTo(cx - 2, cy + barH / 2);
		ctx.lineTo(cx + 8, cy);
		ctx.closePath();
		ctx.fill();
	} else {
		ctx.fillRect(cx - gap / 2 - barW, cy - barH / 2, barW, barH);
		ctx.fillRect(cx + gap / 2, cy - barH / 2, barW, barH);
	}
	ctx.restore();
}

function drawPauseOverlay() {
	ctx.save();
	ctx.fillStyle = HUD.COLORS.overlay;
	ctx.fillRect(0, 0, width, height);

	var titleSize = isMobile ? '700 28px' : '900 44px';
	var hintSize = isMobile ? '500 12px' : '500 16px';

	drawCenteredText('PAUSED', width / 2, height / 2 - (isMobile ? 16 : 24), titleSize + ' ' + HUD.FONT, HUD.COLORS.title, {
		color: HUD.COLORS.accent,
		blur: isMobile ? 8 : 14
	});
	drawCenteredText(
		isMobile ? 'Tap pause or press P / Esc' : 'Press P, Esc, or pause button to resume',
		width / 2,
		height / 2 + (isMobile ? 18 : 28),
		hintSize + ' ' + HUD.FONT,
		HUD.COLORS.label,
		null
	);
	ctx.restore();
}

function fireBeam() {
	if (fireCooldown > 0 || !player.width || isPaused) return;
	var move = getEffectiveMoveSettings(activeBuffs);
	fireCooldown = move.fireCooldown;

	var originX = player.x + player.width / 2;
	var originY = player.y + 6;

	if (activeBuffs.spread && activeBuffs.spread.remaining > 0) {
		var offsets = [-18, 0, 18];
		for (var s = 0; s < offsets.length; s++) {
			beam.push({
				x: player.y,
				y: originX + offsets[s],
				drift: offsets[s] * 2.2
			});
		}
	} else {
		beam.push({
			x: player.y,
			y: originX,
			drift: 0
		});
	}
	spawnParticles(originX, originY, 4, '#7df9ff', 120, 0.15);
}

function getInputVector() {
	var ix = 0;
	var iy = 0;

	if (map[37]) ix -= 1;
	if (map[39]) ix += 1;
	if (map[38]) iy -= 1;
	if (map[40]) iy += 1;

	if (isMobile && joystick) {
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
	var move = getEffectiveMoveSettings(activeBuffs);

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
	if (speed > move.maxSpeed) {
		player.vx = (player.vx / speed) * move.maxSpeed;
		player.vy = (player.vy / speed) * move.maxSpeed;
	}

	player.x += player.vx * dt;
	player.y += player.vy * dt;
	clampPlayer();

	if (moving && flag === 1 && !gameOver && !isPaused) {
		spawnEngineTrail();
	}
}

function updateBeams(dt) {
	for (var j = beam.length - 1; j >= 0; j--) {
		beam[j].x -= MOVE.BEAM_SPEED * dt;
		if (beam[j].drift) {
			beam[j].y += beam[j].drift * dt;
		}
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
				var killX = enemy[b].x + enemyImg.width / 2;
				var killY = enemy[b].y + enemyImg.height / 2;
				spawnParticles(killX, killY, 10, '#ffd166', 160, 0.3);
				triggerScreenShake(2);
				enemy.splice(b, 1);
				beam.splice(a, 1);
				score += 1;
				esp += 3;

				var dropCheck = shouldDropPowerUp(score, lastPowerUpDropScore);
				if (dropCheck.drop) {
					spawnPowerUp(killX, killY, dropCheck.type);
					lastPowerUpDropScore = dropCheck.threshold;
				}
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
	drawActiveBuffHud();
	drawPauseButton();
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
			'Pause button — top right',
			'Collisions −20 · Escapes −5',
			'Power-ups drop every 10 pts',
			'Mothership hazard −15 shields',
			'Shields start at 100%'
		]
		: [
			'Arrow keys — move',
			'Spacebar — shoot',
			'P or Esc — pause',
			'Collisions cost 20 shields · Escapes cost 5',
			'Kill enemies for power-ups every 10 points',
			'Avoid the drifting mothership — 15 shield damage',
			'Shields start at full strength'
		];
	var panelH = isMobile ? 154 : 196;
	var panelY = isMobile ? height * 0.4 : height * 0.46;
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
	animTime += dt;

	var starScale = 1;
	if (flag === 1 && isPaused && !gameOver) {
		starScale = 0.08;
	}

	ctx.save();
	if (screenShake > 0 && !isPaused) {
		ctx.translate(
			(Math.random() - 0.5) * screenShake,
			(Math.random() - 0.5) * screenShake
		);
	}

	ctx.drawImage(bgImg, 0, 0, width, height);
	updateStarfield(dt, width, height, starScale);
	drawStarfield(ctx, width, height);

	if (flag === 0) {
		updateMothership(dt, width, height);
		drawMothership(ctx);
		drawTitleScreen();
	} else {
		var gameplayFrozen = isPaused && !gameOver;

		if (!gameOver && !gameplayFrozen) {
			updatePlayer(dt);
			updateMothership(dt, width, height);
			if (map[32]) fireBeam();
			if (fireCooldown > 0) fireCooldown -= dt;

			updateBeams(dt);
			updateEnemies(dt);
			checkBeamHits();
			checkMothershipCollision();
			updatePowerUps(dt);
			updateActiveBuffs(dt);
			updateParticles(dt);

			if (health <= 0) {
				gameOver = true;
			}
		} else if (!gameOver && gameplayFrozen) {
			updateParticles(dt * 0.15);
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

		drawPowerUps();
		drawParticles();

		if (isMobile && !gameOver && !gameplayFrozen) {
			ctx.drawImage(shootbtnImg, width - shootbtnImg.width, height - shootbtnImg.height);
		}

	}

	ctx.restore();

	if (flag === 1) {
		drawHud();
		if (gameOver) {
			drawGameOverOverlay();
		} else if (isPaused) {
			drawPauseOverlay();
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
		y: player.x + player.width / 2,
		drift: 0
	}];

	mothership.damageCooldown = 0;
	powerUps = [];
	activeBuffs = {};
	lastPowerUpDropScore = 0;
	isPaused = false;
	pauseBtn = getPauseButtonBounds(width, isMobile);
}

playerImg.onload = function() { initGameState(); };

function main() {
	bindJoystick();
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
		if ((e.code === 'KeyP' || e.keyCode === 27) && flag === 1 && !gameOver) {
			togglePause();
			e.preventDefault();
		}
		if (e.keyCode === 32 && flag === 1 && !gameOver && !isPaused) {
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

		if (pauseBtn && isPointInRect(mx, my, pauseBtn)) {
			togglePause();
			return;
		}

		if (isPaused) {
			return;
		}

		if ((width - shootbtnImg.width) + 8 < mx && mx < (width - shootbtnImg.width) + 8 + 64 &&
			(height - shootbtnImg.height) + 8 < my && my < (height - shootbtnImg.height) + 8 + 62) {
			fireBeam();
		}
	}, { passive: true });

	window.addEventListener('resize', resizeCanvas);

	resizeCanvas();
	lastTime = performance.now();
	draw(lastTime);
}

if (typeof module !== 'undefined' && module.exports) {
	module.exports = {
		POWERUP_SCORE_INTERVAL: POWERUP_SCORE_INTERVAL,
		POWERUP_TYPES: POWERUP_TYPES,
		POWERUP_TYPE_ORDER: POWERUP_TYPE_ORDER,
		getNextPowerUpThreshold: getNextPowerUpThreshold,
		shouldDropPowerUp: shouldDropPowerUp,
		pickPowerUpTypeForScore: pickPowerUpTypeForScore,
		getEffectiveMoveSettings: getEffectiveMoveSettings,
		getPauseButtonBounds: getPauseButtonBounds,
		isPointInRect: isPointInRect,
		circleCircleCollision: circleCircleCollision,
		togglePause: togglePause
	};
} else {
	main();
}
