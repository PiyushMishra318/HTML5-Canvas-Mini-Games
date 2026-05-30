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
