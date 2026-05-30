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
	PIPE_SPEED: 132
};

var

canvas,

ctx,

width,

height,

fgpos = 0,

frames = 0,

score = 0,

best = 0,

okbtn,

currentState,

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


	reset : function(){
		this._pipes = [];
	},

	update : function(dt){

		if(frames % 100 === 0){
			var _y = height - (s_pipeSouth.height + s_fg.height + 120 + 200 * Math.random());
			this._pipes.push({
				x : 500,
				y : _y,
				width : s_pipeSouth.width,
				height : s_pipeSouth.height
			});
		}

		var pipeSpeed = PHYSICS.PIPE_SPEED * dt;

		for (var i = 0, len = this._pipes.length; i < len; i++){
			var p = this._pipes[i];

			if(i === 0){



				score += p.x === bird.x ? 1 : 0;

				var cx = Math.min(Math.max(bird.x, p.x), p.x + p.width);
				var cy1 = Math.min(Math.max(bird.y, p.y), p.y + p.height);
				var cy2 = Math.min(Math.max(bird.y, p.y + 80 + p.height), p.y + 2*p.height +80);

				var dx = bird.x - cx;
				var dy1 = bird.y - cy1;
				var dy2 = bird.y - cy2;

				var d1 = dx*dx + dy1*dy1;
				var d2 = dx*dx + dy2*dy2;

				var r = bird.radius*bird.radius;

				if(r>d1 || r>d2){
					currentState = states.Score;

				if(bird.y > height)
					currentState = states.Score;
				}


 
			}



			p.x -= pipeSpeed;
			if(p.x < -50){
				this._pipes.splice(i,1);
				i--;
				len--;
			}
		}

	},

	draw : function(ctx){
		for (var i = 0, len = this._pipes.length; i < len; i++){
			var p = this._pipes[i];
			s_pipeSouth.draw(ctx, p.x, p.y);
			s_pipeNorth.draw(ctx, p.x, p.y + 80 + p.height);
			}
	}
};

function onpress(evt){

	switch(currentState){
		case states.Splash:
			currentState = states.Game;
			bird.jump();
			break;

		case states.Game:
			bird.jump();
			break;

		case states.Score:
			var mx = evt.offsetX, my = evt.offsetY;

			if(mx == null || my == null){
				mx = evt.touches[0].clientX;
				my = evt.touches[0].clientY;
			}

			if(okbtn.x < mx && mx < okbtn.x + okbtn.width &&
				okbtn.y < my && my < okbtn.y + okbtn.height){
				pipes.reset();
				currentState = states.Splash;
				score = 0;
			}
			break;

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

	ctx = setupHiDpiCanvas(canvas, width, height);

	currentState = states.Splash;
	
	document.body.appendChild(canvas);

	var img = new Image();
	
	img.onload = function(){
		initSprites(this);
		ctx.fillStyle = s_bg.color;
		
		okbtn = {
			x : (width - s_buttons.Ok.width)/2,
			y : height - 200,
			width : s_buttons.Ok.width,
			height : s_buttons.Ok.height
		}

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

	frames++;

	if( currentState !== states.Score ){
		fgpos = (fgpos - PHYSICS.PIPE_SPEED * dt) % 14;
	} else {
		best = Math.max(best, score);
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
		s_score.draw(ctx, width/2 - s_score.width/2 ,height - 340);
		s_text.GameOver.draw(ctx, width/2 - s_text.GameOver.width/2, height - 400);
		s_buttons.Ok.draw(ctx, okbtn.x , okbtn.y);

		s_numberS.draw(ctx, width - 100, height - 304, score)
		s_numberS.draw(ctx, width - 100, height - 262, best)

	}else{
		s_numberB.draw(ctx, width/2, 20, score)
	}


}

main();
