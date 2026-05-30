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

function drawSkyGradient(ctx, w, h) {
	var gradient = ctx.createLinearGradient(0, 0, 0, h);
	gradient.addColorStop(0, '#4ec0ca');
	gradient.addColorStop(1, '#70c5cf');
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, w, h);
}

var PHYSICS = {
	GRAVITY: 980,
	GRAVITY_RAMP: 420,
	JUMP_VELOCITY: -310,
	TERMINAL_VELOCITY: 520,
	ROTATION_LERP: 10,
	JUMP_BUFFER: 0.12,
	COYOTE_TIME: 0.07,
	PIPE_SPEED: 132,
	PIPE_SPEED_MAX: 210,
	PIPE_GAP_START: 128,
	PIPE_GAP_MIN: 82,
	PIPE_SPAWN_INTERVAL: 1.75,
	PIPE_SPAWN_INTERVAL_MIN: 1.45,
	PIPE_MIN_HORIZONTAL_GAP: 168,
	PIPE_DIFFICULTY_RAMP: 25
};

function getPipeDifficulty(passedPipes) {
	var t = Math.min(1, passedPipes / PHYSICS.PIPE_DIFFICULTY_RAMP);
	return {
		speed: PHYSICS.PIPE_SPEED + (PHYSICS.PIPE_SPEED_MAX - PHYSICS.PIPE_SPEED) * t,
		gap: Math.round(PHYSICS.PIPE_GAP_START - (PHYSICS.PIPE_GAP_START - PHYSICS.PIPE_GAP_MIN) * t),
		gapJitter: 45 + 155 * t,
		spawnInterval: PHYSICS.PIPE_SPAWN_INTERVAL -
			(PHYSICS.PIPE_SPAWN_INTERVAL - PHYSICS.PIPE_SPAWN_INTERVAL_MIN) * t * 0.55
	};
}

function hasPassedPipe(pipe, birdX) {
	return !pipe.scored && birdX > pipe.x + pipe.width;
}

function computeGapTopY(difficulty, canvasHeight, fgHeight, pipeHeight) {
	var minGapTop = canvasHeight - fgHeight - 120 - difficulty.gapJitter;
	var maxGapTop = canvasHeight - fgHeight - 120;
	var center = (minGapTop + maxGapTop) / 2;
	var halfRange = (maxGapTop - minGapTop) / 2;
	var offset = (Math.random() + Math.random() - 1) * halfRange;
	return center + offset;
}

var MEDAL_STORAGE_KEY = 'flappy-bird-medals';

var MEDAL_TIERS = [
	{ id: 'bronze', name: 'Bronze', threshold: 5, color: '#cd7f32', border: '#8b5a2b', label: 'B' },
	{ id: 'silver', name: 'Silver', threshold: 10, color: '#c0c0c0', border: '#808080', label: 'S' },
	{ id: 'gold', name: 'Gold', threshold: 25, color: '#ffd700', border: '#daa520', label: 'G' },
	{ id: 'platinum', name: 'Platinum', threshold: 50, color: '#e5e4e2', border: '#a8a8a8', label: 'P' },
	{ id: 'diamond', name: 'Diamond', threshold: 100, color: '#7ec8e3', border: '#4aa3c7', label: 'D' }
];

function getMedalForScore(gameScore) {
	var earned = null;
	for (var i = 0; i < MEDAL_TIERS.length; i++) {
		if (gameScore >= MEDAL_TIERS[i].threshold) {
			earned = MEDAL_TIERS[i];
		}
	}
	return earned;
}

function getNextMedal(gameScore) {
	for (var i = 0; i < MEDAL_TIERS.length; i++) {
		if (gameScore < MEDAL_TIERS[i].threshold) {
			return {
				medal: MEDAL_TIERS[i],
				pointsNeeded: MEDAL_TIERS[i].threshold - gameScore,
				prevThreshold: i > 0 ? MEDAL_TIERS[i - 1].threshold : 0
			};
		}
	}
	return null;
}

function getMedalProgress(gameScore) {
	var next = getNextMedal(gameScore);
	if (!next) {
		return {
			complete: true,
			ratio: 1,
			pointsNeeded: 0,
			nextMedal: null,
			earned: getMedalForScore(gameScore)
		};
	}
	var range = next.medal.threshold - next.prevThreshold;
	var progress = gameScore - next.prevThreshold;
	return {
		complete: false,
		ratio: range > 0 ? Math.min(1, Math.max(0, progress / range)) : 0,
		pointsNeeded: next.pointsNeeded,
		nextMedal: next.medal,
		earned: getMedalForScore(gameScore)
	};
}

function loadUnlockedMedals() {
	if (typeof localStorage === 'undefined') {
		return [];
	}
	try {
		var raw = localStorage.getItem(MEDAL_STORAGE_KEY);
		if (!raw) {
			return [];
		}
		var parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch (e) {
		return [];
	}
}

function saveUnlockedMedals(ids) {
	if (typeof localStorage === 'undefined') {
		return;
	}
	try {
		localStorage.setItem(MEDAL_STORAGE_KEY, JSON.stringify(ids));
	} catch (e) {}
}

function unlockMedalsForScore(gameScore, currentUnlocked) {
	var unlocked = currentUnlocked.slice();
	var changed = false;
	for (var i = 0; i < MEDAL_TIERS.length; i++) {
		if (gameScore >= MEDAL_TIERS[i].threshold && unlocked.indexOf(MEDAL_TIERS[i].id) === -1) {
			unlocked.push(MEDAL_TIERS[i].id);
			changed = true;
		}
	}
	return { unlocked: unlocked, changed: changed };
}

function drawMedalBadge(ctx, x, y, radius, medal, options) {
	options = options || {};
	var alpha = options.alpha == null ? 1 : options.alpha;
	var showLabel = options.showLabel !== false;

	ctx.save();
	ctx.globalAlpha = alpha;

	ctx.beginPath();
	ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
	ctx.fillStyle = medal.border;
	ctx.fill();

	ctx.beginPath();
	ctx.arc(x, y, radius, 0, Math.PI * 2);
	var gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
	gradient.addColorStop(0, '#ffffff');
	gradient.addColorStop(0.35, medal.color);
	gradient.addColorStop(1, medal.border);
	ctx.fillStyle = gradient;
	ctx.fill();

	ctx.strokeStyle = 'rgba(255,255,255,0.55)';
	ctx.lineWidth = 1.5;
	ctx.stroke();

	if (showLabel) {
		ctx.fillStyle = '#2c2c2c';
		ctx.font = 'bold ' + Math.round(radius * 1.1) + 'px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(medal.label, x, y + 1);
	}

	ctx.restore();
}

function drawMedalProgressBar(ctx, x, y, barWidth, barHeight, ratio, fillColor) {
	ctx.save();
	ctx.fillStyle = 'rgba(0,0,0,0.25)';
	ctx.fillRect(x, y, barWidth, barHeight);
	ctx.fillStyle = fillColor || '#ffd700';
	ctx.fillRect(x, y, barWidth * Math.min(1, Math.max(0, ratio)), barHeight);
	ctx.strokeStyle = 'rgba(255,255,255,0.45)';
	ctx.lineWidth = 1;
	ctx.strokeRect(x + 0.5, y + 0.5, barWidth - 1, barHeight - 1);
	ctx.restore();
}

function drawMedalHud(ctx, gameScore) {
	var progress = getMedalProgress(gameScore);
	if (progress.complete) {
		return;
	}

	var medal = progress.nextMedal;
	var padX = 10;
	var barWidth = Math.min(120, width - padX * 2);
	var barHeight = 8;
	var badgeRadius = 11;
	var xRight = width - padX;
	var barX = xRight - barWidth;
	var barY = 52;

	drawMedalBadge(ctx, xRight - badgeRadius, barY + barHeight / 2, badgeRadius, medal, { showLabel: false });
	drawMedalProgressBar(ctx, barX, barY, barWidth - badgeRadius * 2 - 6, barHeight, progress.ratio, medal.color);

	ctx.save();
	ctx.fillStyle = '#ffffff';
	ctx.font = '11px sans-serif';
	ctx.textAlign = 'right';
	ctx.textBaseline = 'bottom';
	ctx.fillText(progress.pointsNeeded + ' to ' + medal.name, xRight, barY - 4);
	ctx.restore();
}

function computeGameOverLayout(gameScore, unlockedIds, opts) {
	opts = opts || {};
	var canvasW = opts.width != null ? opts.width : width;
	var canvasH = opts.height != null ? opts.height : height;
	var okBtn = opts.okBtn || s_buttons.Ok;
	var scorePanel = opts.scorePanel || s_score;
	var gameOverText = opts.gameOverText || s_text.GameOver;
	var fgSprite = opts.fgSprite || s_fg;

	var progress = getMedalProgress(gameScore);
	var padX = Math.max(10, Math.round(canvasW * 0.04));
	var panelW = Math.min(260, canvasW - padX * 2);
	var panelX = (canvasW - panelW) / 2;
	var gap = Math.max(8, Math.round(canvasH * 0.016));
	var bottomPad = Math.max(12, Math.round(canvasH * 0.025));
	var topPad = Math.max(12, Math.round(canvasH * 0.03));

	var okH = okBtn.height;
	var okW = okBtn.width;
	var scoreH = scorePanel.height;
	var scoreW = scorePanel.width;
	var gameOverH = gameOverText.height;
	var gameOverW = gameOverText.width;

	var medalPanelH = progress.complete ? 50 : 76;
	var hasCollection = unlockedIds && unlockedIds.length > 0;
	var collectionBadgeH = 18;
	var collectionLabelAbove = 16;

	var fgTop = canvasH - fgSprite.height;
	var okY = fgTop - bottomPad - okH;
	var collectionY = 0;
	var medalPanelY;

	if (hasCollection) {
		collectionY = okY - gap - collectionBadgeH;
		medalPanelY = collectionY - collectionLabelAbove - gap - medalPanelH;
	} else {
		medalPanelY = okY - gap - medalPanelH;
	}

	var scoreY = medalPanelY - gap - scoreH;
	var gameOverY = scoreY - gap - gameOverH;

	if (gameOverY < topPad) {
		var shift = topPad - gameOverY;
		okY += shift;
		if (hasCollection) {
			collectionY += shift;
		}
		medalPanelY += shift;
		scoreY += shift;
		gameOverY = topPad;
	}

	var scoreX = (canvasW - scoreW) / 2;
	var scoreNumX = Math.min(canvasW - padX - 36, scoreX + scoreW - 72);

	return {
		gameOver: { x: (canvasW - gameOverW) / 2, y: gameOverY, w: gameOverW, h: gameOverH },
		score: { x: scoreX, y: scoreY, w: scoreW, h: scoreH },
		scoreNums: { x: scoreNumX, scoreY: scoreY + 36, bestY: scoreY + 78 },
		medalPanel: { x: panelX, y: medalPanelY, w: panelW, h: medalPanelH },
		collection: { y: collectionY, visible: hasCollection, h: collectionBadgeH, labelAbove: collectionLabelAbove },
		ok: { x: (canvasW - okW) / 2, y: okY, w: okW, h: okH },
		progress: progress,
		gap: gap,
		fgTop: fgTop
	};
}

function drawMedalGameOver(ctx, layout) {
	var progress = layout.progress;
	var panelX = layout.medalPanel.x;
	var panelY = layout.medalPanel.y;
	var panelW = layout.medalPanel.w;
	var panelH = layout.medalPanel.h;
	var cx = panelX + panelW / 2;
	var innerPad = Math.max(10, Math.round(panelW * 0.06));

	ctx.save();
	ctx.fillStyle = 'rgba(0,0,0,0.35)';
	ctx.fillRect(panelX, panelY, panelW, panelH);
	ctx.strokeStyle = 'rgba(255,255,255,0.35)';
	ctx.lineWidth = 1;
	ctx.strokeRect(panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1);

	if (progress.earned) {
		var badgeR = Math.min(16, Math.round(panelH * 0.2));
		var badgeY = panelY + (progress.complete ? panelH / 2 : innerPad + badgeR + 2);
		var title = progress.earned.name + ' Medal!';
		ctx.font = 'bold 13px sans-serif';
		var titleW = ctx.measureText(title).width;
		var groupW = badgeR * 2 + 8 + titleW;
		var groupX = cx - groupW / 2;

		drawMedalBadge(ctx, groupX + badgeR, badgeY, badgeR, progress.earned);
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';
		ctx.fillText(title, groupX + badgeR * 2 + 8, badgeY);
	} else {
		ctx.fillStyle = '#ffffff';
		ctx.font = '12px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('No medal yet', cx, panelY + (progress.complete ? panelH / 2 : innerPad + 10));
	}

	if (progress.complete) {
		ctx.fillStyle = '#ffe066';
		ctx.font = '11px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('All medals unlocked!', cx, panelY + panelH - innerPad);
	} else {
		var medal = progress.nextMedal;
		var barH = 10;
		var barW = panelW - innerPad * 2;
		var barX = panelX + innerPad;
		var barY = panelY + panelH - innerPad - barH - 16;
		drawMedalProgressBar(ctx, barX, barY, barW, barH, progress.ratio, medal.color);
		ctx.fillStyle = '#ffffff';
		ctx.font = '11px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'top';
		ctx.fillText(
			progress.pointsNeeded + ' point' + (progress.pointsNeeded === 1 ? '' : 's') + ' to ' + medal.name,
			cx,
			barY + barH + 4
		);
	}

	ctx.restore();
}

function drawUnlockedMedalsRow(ctx, unlockedIds, y) {
	if (!unlockedIds.length) {
		return;
	}

	var badgeRadius = 9;
	var gap = 6;
	var totalWidth = unlockedIds.length * (badgeRadius * 2 + gap) - gap;
	var startX = width / 2 - totalWidth / 2 + badgeRadius;

	ctx.save();
	ctx.fillStyle = 'rgba(255,255,255,0.85)';
	ctx.font = '10px sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'bottom';
	ctx.fillText('Collection', width / 2, y - 6);

	for (var i = 0; i < unlockedIds.length; i++) {
		for (var j = 0; j < MEDAL_TIERS.length; j++) {
			if (MEDAL_TIERS[j].id === unlockedIds[i]) {
				drawMedalBadge(ctx, startX + i * (badgeRadius * 2 + gap), y + badgeRadius, badgeRadius, MEDAL_TIERS[j], {
					showLabel: true
				});
				break;
			}
		}
	}

	ctx.restore();
}

var PAUSE_KEY = 'KeyP';

function togglePause() {
	if (currentState !== states.Game) {
		return false;
	}
	isPaused = !isPaused;
	return isPaused;
}

function getPauseButtonBounds(canvasW) {
	var size = 36;
	var pad = 10;
	return {
		x: canvasW - size - pad,
		y: pad,
		width: size,
		height: size
	};
}

function isPointInRect(px, py, rect) {
	return px >= rect.x && px <= rect.x + rect.width &&
		py >= rect.y && py <= rect.y + rect.height;
}

function drawPauseButton(ctx, bounds, paused) {
	ctx.save();
	ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
	ctx.beginPath();
	ctx.arc(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, bounds.width / 2, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
	ctx.lineWidth = 1.5;
	ctx.stroke();

	var cx = bounds.x + bounds.width / 2;
	var cy = bounds.y + bounds.height / 2;
	var barW = 4;
	var barH = 14;
	var gap = 4;
	ctx.fillStyle = '#ffffff';

	if (paused) {
		ctx.beginPath();
		ctx.moveTo(cx - 2, cy - barH / 2);
		ctx.lineTo(cx - 2, cy + barH / 2);
		ctx.lineTo(cx + 10, cy);
		ctx.closePath();
		ctx.fill();
	} else {
		ctx.fillRect(cx - gap / 2 - barW, cy - barH / 2, barW, barH);
		ctx.fillRect(cx + gap / 2, cy - barH / 2, barW, barH);
	}
	ctx.restore();
}

function drawPauseOverlay(ctx, canvasW, canvasH) {
	ctx.save();
	ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
	ctx.fillRect(0, 0, canvasW, canvasH);

	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 28px sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText('PAUSED', canvasW / 2, canvasH / 2 - 18);

	ctx.font = '14px sans-serif';
	ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
	ctx.fillText('Press P or tap pause to resume', canvasW / 2, canvasH / 2 + 18);
	ctx.restore();
}

var

canvas,

ctx,

width,

height,

fgpos = 0,

frames = 0,

score = 0,

best = 0,

unlockedMedals = [],

_scoreProcessed = false,

okbtn,

currentState,

isPaused = false,

pauseBtn,

lastTime = 0,

states = {
	Splash : 0,Game : 1,Score : 2
},

bird = {

	x : 60,
	y : 0,
	frame : 0,
	velocity : 0,
	radius : 12,
	animation : [0, 1, 2 , 1],
	rotation : 0,
	_jumpBuffer : 0,
	_coyoteTimer : 0,


	jump : function(){
		this._jumpBuffer = PHYSICS.JUMP_BUFFER;
	},

	_tryJump : function(){
		if(this._coyoteTimer > 0){
			this.velocity = PHYSICS.JUMP_VELOCITY;
			this._jumpBuffer = 0;
			this._coyoteTimer = 0;
		}
	},

	update : function(dt){

		var n = currentState === states.Splash ? 10 : 5;
		this.frame += frames%n === 0 ? 1 : 0;
		this.frame %= this.animation.length;

		if( currentState === states.Splash){
			this.y = height - 280 + 5 * Math.cos(frames/10);
			this.rotation = 0;
			this.velocity = 0;
			this._coyoteTimer = PHYSICS.COYOTE_TIME;
		}else{
			if(this._jumpBuffer > 0){
				this._tryJump();
				this._jumpBuffer -= dt;
			}

			var fallFactor = Math.max(0, this.velocity / PHYSICS.TERMINAL_VELOCITY);
			var gravity = PHYSICS.GRAVITY + PHYSICS.GRAVITY_RAMP * fallFactor * fallFactor;
			this.velocity += gravity * dt;
			this.velocity = Math.min(this.velocity, PHYSICS.TERMINAL_VELOCITY);
			this.y += this.velocity * dt;

			var groundY = height - s_fg.height - 10;
			if(this.y >= groundY){
				this.y = groundY;

				if(currentState === states.Game){
					currentState = states.Score;
				}
				this.velocity = 0;
				this._coyoteTimer = 0;
			}else if(this.y <= 0){
				this.y = 0;
				if(currentState === states.Game){
					currentState = states.Score;
				}
				this.velocity = 0;
				this._coyoteTimer = 0;
			}else{
				this._coyoteTimer = PHYSICS.COYOTE_TIME;
			}

			var targetRotation = Math.max(-0.35, Math.min(Math.PI / 2, this.velocity * 0.0028));
			var rotBlend = Math.min(1, PHYSICS.ROTATION_LERP * dt);
			this.rotation += (targetRotation - this.rotation) * rotBlend;

			if(this.velocity < -40){
				this.frame = this.animation.indexOf(1) >= 0 ? 1 : this.frame;
			}
		}
	},

	draw : function(ctx){
		
		ctx.save();
		ctx.translate(this.x, this.y);
		ctx.rotate(this.rotation);

		var n = this.animation[this.frame];

		s_bird[n].draw(ctx, -s_bird[n].width/2, -s_bird[n].height/2);
		ctx.restore();
		
	}
},

pipes = {

	_pipes : [],
	_spawnTimer : 0.9,


	reset : function(){
		this._pipes = [];
		this._spawnTimer = 0.9;
	},

	_spawnPipe : function(difficulty){
		var pipeHeight = s_pipeSouth.height;
		var gapTop = computeGapTopY(difficulty, height, s_fg.height, pipeHeight);
		this._pipes.push({
			x : width + 10,
			y : gapTop - pipeHeight,
			width : s_pipeSouth.width,
			height : pipeHeight,
			gap : difficulty.gap,
			scored : false
		});
	},

	update : function(dt){

		var difficulty = getPipeDifficulty(score);
		var pipeSpeed = difficulty.speed * dt;

		this._spawnTimer -= dt;
		var lastPipe = this._pipes[this._pipes.length - 1];
		var lastX = lastPipe ? lastPipe.x : -9999;
		if(this._spawnTimer <= 0 && lastX < width - PHYSICS.PIPE_MIN_HORIZONTAL_GAP){
			this._spawnPipe(difficulty);
			this._spawnTimer = difficulty.spawnInterval;
		}

		for (var i = 0, len = this._pipes.length; i < len; i++){
			var p = this._pipes[i];

			if(hasPassedPipe(p, bird.x)){
				p.scored = true;
				score++;
			}

			if(currentState === states.Game){
				var cx = Math.min(Math.max(bird.x, p.x), p.x + p.width);
				var cy1 = Math.min(Math.max(bird.y, p.y), p.y + p.height);
				var cy2 = Math.min(
					Math.max(bird.y, p.y + p.gap + p.height),
					p.y + p.gap + 2 * p.height
				);

				var dx = bird.x - cx;
				var dy1 = bird.y - cy1;
				var dy2 = bird.y - cy2;

				var d1 = dx * dx + dy1 * dy1;
				var d2 = dx * dx + dy2 * dy2;

				var r = bird.radius * bird.radius;

				if(r > d1 || r > d2){
					currentState = states.Score;
				}

				if(bird.y > height){
					currentState = states.Score;
				}
			}

			p.x -= pipeSpeed;
			if(p.x < -p.width - 20){
				this._pipes.splice(i, 1);
				i--;
				len--;
			}
		}

	},

	draw : function(ctx){
		for (var i = 0, len = this._pipes.length; i < len; i++){
			var p = this._pipes[i];
			s_pipeSouth.draw(ctx, p.x, p.y);
			s_pipeNorth.draw(ctx, p.x, p.y + p.gap + p.height);
		}
	}
};

function getEventCoords(evt, canvasEl) {
	var mx = evt.offsetX;
	var my = evt.offsetY;
	if (mx == null || my == null) {
		var rect = canvasEl.getBoundingClientRect();
		mx = evt.touches[0].clientX - rect.left;
		my = evt.touches[0].clientY - rect.top;
	}
	return { x: mx, y: my };
}

function onpress(evt){
	var coords = getEventCoords(evt, canvas);

	if (currentState === states.Game && pauseBtn &&
		isPointInRect(coords.x, coords.y, pauseBtn)) {
		togglePause();
		return;
	}

	if (currentState === states.Game && isPaused) {
		return;
	}

	switch(currentState){
		case states.Splash:
			currentState = states.Game;
			isPaused = false;
			bird.jump();
			break;

		case states.Game:
			bird.jump();
			break;

		case states.Score:
			var mx = coords.x;
			var my = coords.y;

			if(okbtn.x < mx && mx < okbtn.x + okbtn.width &&
				okbtn.y < my && my < okbtn.y + okbtn.height){
				pipes.reset();
				currentState = states.Splash;
				score = 0;
				isPaused = false;
				_scoreProcessed = false;
			}
			break;

	}
}

function onKeyDown(evt) {
	if (evt.code === PAUSE_KEY || evt.key === 'p' || evt.key === 'P') {
		if (currentState === states.Game) {
			togglePause();
			evt.preventDefault();
		}
	}
}

function main(){
	canvas = document.createElement('canvas');
	width = window.innerWidth;
	height = window.innerHeight;

	var evt = "touchstart";

	if(width >= 500){
		width = 320;
		height = 480;
		canvas.style.border = '1px solid #000';
		evt = "mousedown";
	}

	document.addEventListener(evt, onpress);
	document.addEventListener('keydown', onKeyDown);

	ctx = setupHiDpiCanvas(canvas, width, height);
	pauseBtn = getPauseButtonBounds(width);

	currentState = states.Splash;
	isPaused = false;
	unlockedMedals = loadUnlockedMedals();
	
	document.body.appendChild(canvas);

	var img = new Image();
	
	img.onload = function(){
		initSprites(this);
		ctx.fillStyle = s_bg.color;
		
		okbtn = {
			x : (width - s_buttons.Ok.width) / 2,
			y : height - s_fg.height - 40,
			width : s_buttons.Ok.width,
			height : s_buttons.Ok.height
		};

		lastTime = performance.now();
		run();
	}

	img.src = 'res/sheet.png';
}

function run(){

	var loop = function(now){
		var dt = Math.min(0.05, (now - lastTime) / 1000);
		lastTime = now;
		update(dt);
		render();

		window.requestAnimationFrame(loop, canvas);
	}
	window.requestAnimationFrame(loop, canvas);

}

function update(dt){
	if (currentState === states.Game && isPaused) {
		return;
	}

	frames++;

	if( currentState !== states.Score ){
		fgpos = (fgpos - getPipeDifficulty(score).speed * dt) % 14;
	} else {
		best = Math.max(best, score);
		if(!_scoreProcessed){
			_scoreProcessed = true;
			var medalResult = unlockMedalsForScore(score, unlockedMedals);
			unlockedMedals = medalResult.unlocked;
			if(medalResult.changed){
				saveUnlockedMedals(unlockedMedals);
			}
		}
	}
	if (currentState === states.Game)
		pipes.update(dt);	

	bird.update(dt);

}

function render(){
	drawSkyGradient(ctx, width, height);

	s_bg.draw(ctx, 0 ,height - s_bg.height);
	s_bg.draw(ctx, s_bg.width ,height - s_bg.height);

	pipes.draw(ctx);
	bird.draw(ctx);

	s_fg.draw(ctx, fgpos,height - s_fg.height);
	s_fg.draw(ctx, fgpos+s_fg.width,height - s_fg.height);


	if( currentState === states.Splash){
		s_splash.draw(ctx, width/2 - s_splash.width/2 ,height - 300);
		s_text.GetReady.draw(ctx, width/2 - s_text.GetReady.width/2, height - 380);
	}
	if( currentState === states.Score){
		var scoreLayout = computeGameOverLayout(score, unlockedMedals);

		okbtn.x = scoreLayout.ok.x;
		okbtn.y = scoreLayout.ok.y;
		okbtn.width = scoreLayout.ok.w;
		okbtn.height = scoreLayout.ok.h;

		s_text.GameOver.draw(ctx, scoreLayout.gameOver.x, scoreLayout.gameOver.y);
		s_score.draw(ctx, scoreLayout.score.x, scoreLayout.score.y);
		s_numberS.draw(ctx, scoreLayout.scoreNums.x, scoreLayout.scoreNums.scoreY, score);
		s_numberS.draw(ctx, scoreLayout.scoreNums.x, scoreLayout.scoreNums.bestY, best);

		drawMedalGameOver(ctx, scoreLayout);
		if (scoreLayout.collection.visible) {
			drawUnlockedMedalsRow(ctx, unlockedMedals, scoreLayout.collection.y);
		}
		s_buttons.Ok.draw(ctx, okbtn.x, okbtn.y);

	}else{
		s_numberB.draw(ctx, width/2, 20, score)
		drawMedalHud(ctx, score);
		if (currentState === states.Game) {
			drawPauseButton(ctx, pauseBtn, isPaused);
			if (isPaused) {
				drawPauseOverlay(ctx, width, height);
			}
		}
	}


}

if(typeof module !== 'undefined' && module.exports){
	module.exports = {
		getPipeDifficulty: getPipeDifficulty,
		hasPassedPipe: hasPassedPipe,
		computeGapTopY: computeGapTopY,
		PHYSICS: PHYSICS,
		MEDAL_TIERS: MEDAL_TIERS,
		MEDAL_STORAGE_KEY: MEDAL_STORAGE_KEY,
		getMedalForScore: getMedalForScore,
		getNextMedal: getNextMedal,
		getMedalProgress: getMedalProgress,
		loadUnlockedMedals: loadUnlockedMedals,
		saveUnlockedMedals: saveUnlockedMedals,
		unlockMedalsForScore: unlockMedalsForScore,
		computeGameOverLayout: computeGameOverLayout,
		PAUSE_KEY: PAUSE_KEY,
		togglePause: togglePause,
		getPauseButtonBounds: getPauseButtonBounds,
		isPointInRect: isPointInRect
	};
}else{
	main();
}
