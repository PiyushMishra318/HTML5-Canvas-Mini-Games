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
