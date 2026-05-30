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

var
	canvas = document.getElementById('canvas'),
	ctx,
	enemy = [];
	var beam = [];
	var score = 0;
	var health = 100;
	var player;
	var width = window.innerWidth;
	var height = window.innerHeight;
	var flag = 0;
	var esp = 1;
	var psp = 5;
	var bsp = 10;
	var map = {
		37: false, // Left Arrow Key
		39: false, // Right Arrow Key
		38: false, // Top Arrow Key
		40: false, // Bottom Arrow Key
		32: false,
	}
	playerImg = new Image();
	enemyImg = new Image();
	bgImg = new Image();
	beamImg = new Image();
	arrowkeysImg = new Image();
	shootbtnImg = new Image();
	startImg = new Image();
	var joystick	= new VirtualJoystick({
		
		// stationaryBase: true,
  //                     baseX: 70,
  //                     baseY: height - 70,
		limitStickTravel: true,
		stickRadius	: 20
	});
	joystick.addEventListener('touchStartValidation', function(event){
		var touch	= event.changedTouches[0];
		if( touch.pageX >= width/2 )	return false;
		return true
	});
	// var joystick	= new VirtualJoystick({
	// 	stationaryBase: true,
 //                      baseX: width - 150,
 //                      baseY: height - 150,
	// 	strokeStyle	: 'orange',
	// 	limitStickTravel: true,
	// 	stickRadius	: 0		
	// });
	// joystick.addEventListener('touchStartValidation', function(event){
	// 	var touch	= event.changedTouches[0];
	// 	if( touch.pageX >= width/2 )	return false;
	// 	return true
	// });
	// joystick.addEventListener('touchStart', function(){
	// 	beam.push({
	// 			x : player.y,
	// 			y : player.x + playerImg.width/2,
	// 		})
	// 		bsp += .001
	// })



	

	player = {
		x : (width - playerImg.width)/4,
		y : (height - playerImg.height),
		radius : 5,
		speed : 5 + psp
	}


	playerImg.src = 'player.png';
	enemyImg.src = 'enemy.png';
	bgImg.src = 'bg.png';
	beamImg.src = 'beam.png';
	arrowkeysImg.src = 'arrowkeys.png';
	shootbtnImg.src = 'shootbtn.png';
	startImg.src = 'start.png';

	var startbtn = {
		x : (width - startImg.width)/2,
		y : height - startImg.height,
	}


	enemy[0] = {
		x : (width - enemyImg.width)/2,
		y : 10,
		radius : 40,
	}

	beam[0] = {
		x : player.y - playerImg.height,
		y : player.x + playerImg.width/2,
	}

document.addEventListener("keydown",function(e){
		if(event.keyCode in map){
			map[event.keyCode] = true;
		
			if(map[37]){
			   player.x -= 5 + psp;
			   
			}else if(map[39]){
			   player.x += 5 + psp;
			   
			}else if(map[38]){
			   player.y -= 5 + psp;
			   
			}else if(map[40]){
			   player.y += 5 + psp;
			}
		}	
	})

	document.addEventListener("keydown",function(e){
		if(event.keyCode in map){
			map[event.keyCode] = true;
			if(map[32]){
				beam.push({
					x : player.y,
					y : player.x + playerImg.width/2,
				})
				bsp += .001
			}
		}
	})

	document.addEventListener('keyup', function(event){
		if(event.keyCode in map){
			map[event.keyCode] = false;
		}
	});

	function start(event){
		flag = 1; 
	}
	document.body.addEventListener('touchstart', function(e) {
		if (flag === 0) start(e);
	}, { passive: true });
	document.addEventListener("touchstart",function(e){
		mx = e.touches[0].clientX;
		my = e.touches[0].clientY;

		

		if(0 < mx && mx < 44 &&
			(height - arrowkeysImg.height) + 30 < my && my < (height - arrowkeysImg.height) + 30 + 40){
			player.x -= 5 + psp;
		}else if(28 < mx && mx < 28 + 44 &&
			(height - arrowkeysImg.height) < my && my < (height - arrowkeysImg.height) + 40){
			player.y -= 5 + psp;
		}else if(58 < mx && mx < 58 + 44 &&
			(height - arrowkeysImg.height) + 30< my && my < (height - arrowkeysImg.height) + 30 + 40){
			player.x += 5 + psp;
		}else if(28 < mx && mx < 28 + 44 &&
			(height - arrowkeysImg.height) + 62 < my && my < (height - arrowkeysImg.height) + 62 + 40){
			player.y += 5 + psp;
		}else if((width - shootbtnImg.width) + 8 < mx && mx < (width - shootbtnImg.width) + 8 + 64 &&
			(height - shootbtnImg.height) + 8 < my && my < (height - shootbtnImg.height) + 8 + 62){
			beam.push({
				x : player.y,
				y : player.x + playerImg.width/2,
			})
			bsp += .001
		}
	})

	var frame = 0;

	function draw(){
		frame++;

		if(width > 500){
			width = 800;
			height = 600;
			ctx.drawImage(bgImg, 0, 0, width, height);
			drawStarfield(ctx, width, height, frame);

				if (flag === 0) {
					ctx.fillStyle = "white"
					ctx.font = '50px Arial';
					ctx.fillText("Space Shooter", 40, 200);
					ctx.font = '30px Arial';
					ctx.fillText("Press Enter to start", 40, 250);
					ctx.font = '20px Arial';
					ctx.fillText("Instructions : ", 150,330);
					ctx.font = '20px Arial';
					ctx.fillText("1. Press Arrow Keys to move the ship.", 150, 360)
					ctx.fillText("2. Press spacebar to shoot.", 150, 380)
					ctx.fillText("3. You Health is 100 at the start of the Game(as it should be).", 150, 400)
					ctx.fillText("3. Try to dodge the enemy ships or health will decrease(by 20).", 150, 420)
					ctx.fillText("4. If any ship passes by you your health will decrease(by 5).", 150, 440)
					ctx.font = '10px Arial'
					
					document.addEventListener("keydown",function(e){
						if(e.keyCode == 13){
							flag = 1;
						}
					})
				}else{

				ctx.drawImage(playerImg, player.x, player.y)


				for(var j = 1; j < beam.length; j++){
					ctx.save();
					ctx.shadowColor = '#7df9ff';
					ctx.shadowBlur = 8;
					ctx.drawImage(beamImg, beam[j].y, beam[j].x);
					ctx.restore();
					beam[j].x -= bsp

					if(beam[j].x < 20){
						beam.splice(j,1)
					}

				}

				for (var a = 0; a < beam.length; a++) {
					
					for (var b = 0; b < enemy.length; b++) {
					
						if (beam[a].y < enemy[b].x + enemyImg.width &&
						beam[a].y + beamImg.width > enemy[b].x &&
						beam[a].x < enemy[b].y + enemyImg.height &&
						beamImg.height + beam[a].x > enemy[b].y) {
							enemy.splice(b,1)
							beam.splice(a,1)
							score += 1
							esp += .05
							psp += .05
						}
					// var dx = beam[a].y - enemy[b].x;
					// var dy = beam[a].x - enemy[b].y;
					// var distance = Math.sqrt(dx * dx + dy * dy);
				
					// if (distance < beam[a].radius + enemy[b].radius){
					// 	enemy.splice(b,1)
					// 	beam.splice(a,1)
					// 	score += 5
					// }

					}

				}			


				for (var i = 0; i < enemy.length; i++) {
					ctx.drawImage(enemyImg, enemy[i].x, enemy[i].y)

					enemy[i].y += esp;

					if(enemy.length === 1){
						enemy.push({
							x : Math.random()*(width - enemyImg.width),
							y : 10,
							radius : 40,
						})
					}

				
					var dx = player.x - enemy[i].x;
					var dy = player.y - enemy[i].y;
					var distance = Math.sqrt(dx * dx + dy * dy);
				
					if (distance < player.radius + enemy[i].radius){
						enemy.splice(i,1)
						health -= 20
					}
					if(enemy.length >= 2){
						if(enemy[i].y > height){
							enemy.splice(i,1)
							health -= 5
						}
					}
				
					if(health <= 0){
						ctx.fillStyle = "white"
						ctx.font = "50px Arial";
						ctx.fillText("GAME OVER!!", 250, 300);
						ctx.font = "10px Arial";
						ctx.fillText("press ENTER to restart",350,330);
						document.addEventListener("keydown",function(e){
							if(e.keyCode == 13){
								location.reload();
							}
						})
						window.cancelAnimationFrame();
					}
				}
				if(player.x < 0 ){
					player.x = 0
				}else if(player.y < 0){
					player.y = 0
				}else if(player.y > height - playerImg.height){
					player.y = height - playerImg.height
				}else if(player.x > width - playerImg.width ){
					player.x = width - playerImg.width
				}

				ctx.fillStyle = "white";
				ctx.font = "30px Arial";
				ctx.fillText("Score: "+score, 10, 50);
				ctx.fillText("Health: "+health, width - 160, 50)
				psp += .001;
			}
			window.requestAnimationFrame(draw);
		}else{

			
			
			ctx.drawImage(bgImg, 0, 0, width, height);
			drawStarfield(ctx, width, height, frame);
			if (flag === 0) {
					ctx.fillStyle = "white"
					ctx.font = '25px Arial';
					ctx.fillText("Space Shooter", 0, 100);
					ctx.font = '20px Arial';
					ctx.fillText("Tap anywhere to start ", 0, 150);
					ctx.font = '10px Arial';
					ctx.fillText("Instructions : ", 0,230);
					ctx.font = '10px Arial';
					ctx.fillText("1. Use the Joystick on your left hand side to move the ship.", 0, 260)
					ctx.fillText("2. Press shoot button on the right hand side to shoot.", 0, 280)
					ctx.fillText("3. Your Health is 100 at the start of the Game(as it should be).", 0, 300)
					ctx.fillText("3. Try to dodge the enemy ships or your health will decrease(by 20).", 0, 320)
					ctx.fillText("4. If any ships passes by you, your health will decrease(by 5).", 0, 340)
					ctx.font = '10px Arial'
					ctx.drawImage(startImg, startbtn.x, startbtn.y)
				}else{

					ctx.drawImage(playerImg, player.x, player.y)
					ctx.drawImage(shootbtnImg, width - shootbtnImg.width, height - shootbtnImg.height)


				for(var j = 1; j < beam.length; j++){
					ctx.save();
					ctx.shadowColor = '#7df9ff';
					ctx.shadowBlur = 8;
					ctx.drawImage(beamImg, beam[j].y, beam[j].x);
					ctx.restore();
					beam[j].x -= bsp

					if(beam[j].x < 0){
						beam.splice(j,1)
					}

				}

				for (var a = 0; a < beam.length; a++) {
					
					for (var b = 0; b < enemy.length; b++) {
					
						if (beam[a].y < enemy[b].x + enemyImg.width &&
						beam[a].y + beamImg.width > enemy[b].x &&
						beam[a].x < enemy[b].y + enemyImg.height &&
						beamImg.height + beam[a].x > enemy[b].y) {
							enemy.splice(b,1)
							beam.splice(a,1)
							score += 1
							psp += .05;
							esp += .05;
						}
					// var dx = beam[a].y - enemy[b].x;
					// var dy = beam[a].x - enemy[b].y;
					// var distance = Math.sqrt(dx * dx + dy * dy);
				
					// if (distance < beam[a].radius + enemy[b].radius){
					// 	enemy.splice(b,1)
					// 	beam.splice(a,1)
					// 	score += 5
					// }

					}

				}			


				for (var i = 0; i < enemy.length; i++) {
					ctx.drawImage(enemyImg, enemy[i].x, enemy[i].y)

					enemy[i].y += esp;

					if(enemy.length === 1){
						enemy.push({
							x : Math.random()*(width - enemyImg.width),
							y : 10,
							radius : 40,
						})
					}

				
					var dx = player.x - enemy[i].x;
					var dy = player.y - enemy[i].y;
					var distance = Math.sqrt(dx * dx + dy * dy);
				
					if (distance < player.radius + enemy[i].radius){
						enemy.splice(i,1)
						health -= 20
					}
					if(enemy.length >= 2){
						if(enemy[i].y > height){
							enemy.splice(i,1)
							health -= 5
						}
					}
				
					if(health <= 0){
						ctx.fillStyle = "white"
						ctx.font = "25px Arial";
						ctx.fillText("GAME OVER!!", width/2 - 25, 300);
						ctx.font = "10px Arial";
						ctx.fillText("Tap anywhere to restart", width/2 - 10,330);
						document.addEventListener("touchstart",function(e){
							location.reload()
						})
						window.cancelAnimationFrame();
					}
				}
				if(player.x < 0 ){
					player.x = 0
				}else if(player.y < 0){
					player.y = 0
				}else if(player.y > height - playerImg.height){
					player.y = height - playerImg.height
				}else if(player.x > width - playerImg.width ){
					player.x = width - playerImg.width
				}
				if( joystick.right() ){
					player.x += 1 + psp;    
				}
				if( joystick.left() ){
					player.x -= 1 + psp;     
				}
				if( joystick.up() ){
					player.y -= 1 + psp;       
				}
				if( joystick.down() ){
					player.y += 1 + psp;
				}
				
				ctx.fillStyle = "white";
				ctx.font = "30px Arial";
				ctx.fillText("Score: "+score, 10, 50);
				ctx.fillText("Health: "+health, width - 160, 50)
			}
			window.requestAnimationFrame(draw);
			}
		}		
	ctx = setupHiDpiCanvas(canvas, width, height);
	draw();
