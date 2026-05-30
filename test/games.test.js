const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const requiredFiles = [
  'index.html',
  'flappy-bird/index.html',
  'flappy-bird/game.js',
  'flappy-bird/sprite.js',
  'flappy-bird/res/sheet.png',
  'space-shooter/index.html',
  'space-shooter/game.js',
  'space-shooter/virtualjoystick.js',
  'space-shooter/player.png',
  'space-shooter/enemy.png',
  'space-shooter/bg.png',
  'space-shooter/beam.png',
];

test('required game files exist', () => {
  for (const rel of requiredFiles) {
    assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
  }
});

test('flappy bird sprite module defines initSprites', () => {
  const src = fs.readFileSync(path.join(root, 'flappy-bird/sprite.js'), 'utf8');
  assert.match(src, /function initSprites/);
  assert.match(src, /function Sprite/);
});

test('space shooter defines VirtualJoystick usage', () => {
  const src = fs.readFileSync(path.join(root, 'space-shooter/game.js'), 'utf8');
  assert.match(src, /VirtualJoystick/);
  assert.match(src, /requestAnimationFrame/);
});

test('games use high-DPI canvas setup', () => {
  for (const game of ['flappy-bird/game.js', 'space-shooter/game.js']) {
    const src = fs.readFileSync(path.join(root, game), 'utf8');
    assert.match(src, /devicePixelRatio/);
    assert.match(src, /desynchronized:\s*true/);
  }
});

test('manifests use relative start_url', () => {
  for (const game of ['flappy-bird', 'space-shooter']) {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, game, 'manifest.json'), 'utf8'),
    );
    assert.equal(manifest.start_url, './index.html');
  }
});

test('dead PWA boilerplate directories were removed', () => {
  assert.equal(fs.existsSync(path.join(root, 'flappy-bird/js')), false);
  assert.equal(fs.existsSync(path.join(root, 'space-shooter/js')), false);
});

test('flappy bird pipe helpers handle spacing and scoring', () => {
  const helpers = require(path.join(root, 'flappy-bird/game.js'));

  const easy = helpers.getPipeDifficulty(0);
  const hard = helpers.getPipeDifficulty(50);
  assert.ok(easy.gap > hard.gap, 'gap should shrink as difficulty rises');
  assert.ok(easy.speed < hard.speed, 'speed should increase with difficulty');
  assert.ok(easy.gapJitter < hard.gapJitter, 'gap randomness should grow over time');
  assert.ok(easy.spawnInterval >= hard.spawnInterval, 'spawn interval tightens slightly at high speed');

  const pipe = { x: 100, width: 52, scored: false };
  assert.equal(helpers.hasPassedPipe(pipe, 60), false);
  assert.equal(helpers.hasPassedPipe(pipe, 153), true);
  assert.equal(helpers.hasPassedPipe({ x: 100, width: 52, scored: true }, 200), false);

  const gapTop = helpers.computeGapTopY(easy, 480, 112, 400);
  assert.ok(gapTop >= 48 && gapTop <= 248, 'gap stays inside playable area');
});

test('flappy bird medal helpers resolve tiers and progress', () => {
  const helpers = require(path.join(root, 'flappy-bird/game.js'));

  assert.equal(helpers.getMedalForScore(0), null);
  assert.equal(helpers.getMedalForScore(4), null);
  assert.equal(helpers.getMedalForScore(5).id, 'bronze');
  assert.equal(helpers.getMedalForScore(25).id, 'gold');
  assert.equal(helpers.getMedalForScore(100).id, 'diamond');

  const nextFromZero = helpers.getNextMedal(0);
  assert.equal(nextFromZero.medal.id, 'bronze');
  assert.equal(nextFromZero.pointsNeeded, 5);

  const progress = helpers.getMedalProgress(8);
  assert.equal(progress.nextMedal.id, 'silver');
  assert.equal(progress.pointsNeeded, 2);
  assert.ok(Math.abs(progress.ratio - 0.6) < 0.001, 'progress spans bronze to silver');

  const maxProgress = helpers.getMedalProgress(150);
  assert.equal(maxProgress.complete, true);
  assert.equal(maxProgress.nextMedal, null);

  const unlocked = helpers.unlockMedalsForScore(12, ['bronze']);
  assert.deepEqual(unlocked.unlocked.sort(), ['bronze', 'silver']);
  assert.equal(unlocked.changed, true);

  const unchanged = helpers.unlockMedalsForScore(12, unlocked.unlocked.slice());
  assert.equal(unchanged.changed, false);
});

function installFlappyLayoutGlobals(logicalWidth, logicalHeight) {
  return {
    width: logicalWidth,
    height: logicalHeight,
    okBtn: { width: 80, height: 28 },
    scorePanel: { width: 226, height: 116 },
    gameOverText: { width: 188, height: 38 },
    fgSprite: { height: 112 },
  };
}

function assertLayoutNoOverlap(layout) {
  const gap = layout.gap;

  assert.ok(layout.ok.y + layout.ok.h <= layout.fgTop, 'OK button stays above foreground');

  const scoreBottom = layout.score.y + layout.score.h;
  const medalBottom = layout.medalPanel.y + layout.medalPanel.h;

  assert.ok(layout.medalPanel.y >= scoreBottom + gap - 1,
    'medal panel sits below score panel with spacing');
  assert.ok(layout.gameOver.y + layout.gameOver.h <= layout.score.y - gap + 1,
    'game over title sits above score panel with spacing');

  if (layout.collection.visible) {
    const collectionTop = layout.collection.y - layout.collection.labelAbove;
    assert.ok(medalBottom <= collectionTop - gap + 1,
      'collection sits below medal panel with spacing');
    assert.ok(layout.collection.y + layout.collection.h <= layout.ok.y - gap + 1,
      'collection sits above OK with spacing');
  } else {
    assert.ok(medalBottom <= layout.ok.y - gap + 1,
      'medal panel sits above OK with spacing');
  }
}

test('flappy bird game over layout avoids panel overlap', () => {
  const helpers = require(path.join(root, 'flappy-bird/game.js'));
  const sizes = [
    { width: 320, height: 480 },
    { width: 400, height: 600 },
  ];

  for (const size of sizes) {
    const layoutOpts = installFlappyLayoutGlobals(size.width, size.height);

    const withCollection = helpers.computeGameOverLayout(3, ['bronze'], layoutOpts);
    assertLayoutNoOverlap(withCollection);

    const withoutCollection = helpers.computeGameOverLayout(0, [], layoutOpts);
    assertLayoutNoOverlap(withoutCollection);

    const maxMedals = helpers.computeGameOverLayout(
      100,
      ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
      layoutOpts,
    );
    assertLayoutNoOverlap(maxMedals);
  }
});

test('flappy bird pause helpers expose bounds and hit testing', () => {
  const helpers = require(path.join(root, 'flappy-bird/game.js'));

  assert.equal(helpers.PAUSE_KEY, 'KeyP');
  const bounds = helpers.getPauseButtonBounds(320);
  assert.ok(bounds.width > 0);
  assert.ok(bounds.x + bounds.width <= 320);

  assert.equal(helpers.isPointInRect(bounds.x + 1, bounds.y + 1, bounds), true);
  assert.equal(helpers.isPointInRect(0, 0, bounds), false);
});

test('space shooter power-up spawn logic respects score thresholds', () => {
  const helpers = require(path.join(root, 'space-shooter/game.js'));

  assert.equal(helpers.POWERUP_SCORE_INTERVAL, 10);
  assert.equal(helpers.getNextPowerUpThreshold(0), 10);
  assert.equal(helpers.getNextPowerUpThreshold(10), 20);

  const tooEarly = helpers.shouldDropPowerUp(9, 0);
  assert.equal(tooEarly.drop, false);
  assert.equal(tooEarly.threshold, 10);

  const firstDrop = helpers.shouldDropPowerUp(10, 0);
  assert.equal(firstDrop.drop, true);
  assert.equal(firstDrop.threshold, 10);
  assert.equal(firstDrop.type.id, 'speed');

  const secondDrop = helpers.shouldDropPowerUp(20, 10);
  assert.equal(secondDrop.drop, true);
  assert.equal(secondDrop.type.id, 'rapid');

  const thirdDrop = helpers.shouldDropPowerUp(30, 20);
  assert.equal(thirdDrop.type.id, 'shield');

  const fourthDrop = helpers.shouldDropPowerUp(40, 30);
  assert.equal(fourthDrop.type.id, 'spread');

  const cycleAgain = helpers.shouldDropPowerUp(50, 40);
  assert.equal(cycleAgain.type.id, 'speed');
});

test('space shooter buff helpers adjust movement and pause bounds', () => {
  const helpers = require(path.join(root, 'space-shooter/game.js'));

  const base = helpers.getEffectiveMoveSettings({});
  assert.ok(base.maxSpeed > 0);
  assert.ok(base.fireCooldown > 0);

  const buffed = helpers.getEffectiveMoveSettings({
    speed: { remaining: 2 },
    rapid: { remaining: 2 }
  });
  assert.ok(buffed.maxSpeed > base.maxSpeed);
  assert.ok(buffed.fireCooldown < base.fireCooldown);

  const pauseBtn = helpers.getPauseButtonBounds(800, false);
  assert.ok(helpers.isPointInRect(pauseBtn.x + 2, pauseBtn.y + 2, pauseBtn));
  assert.equal(helpers.circleCircleCollision(0, 0, 10, 15, 0, 10), true);
  assert.equal(helpers.circleCircleCollision(0, 0, 5, 20, 0, 5), false);
});
