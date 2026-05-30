# HTML5 Canvas Mini Games

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](package.json)

Vanilla **HTML5 Canvas** mini-games with **high-DPI scaling** and low-latency `desynchronized` 2D contexts — no frameworks, no build step required.
| Game | Description |
|------|-------------|
| [Flappy Bird](flappy-bird/) | Tap or click to fly through pipes (sprite-sheet canvas clone) |
| [Space Shooter](space-shooter/) | Dodge enemies, shoot beams — keyboard on desktop, joystick on mobile |

## Play locally

```bash
git clone git@github.com:PiyushMishra318/Canvas-Js-Games.git
cd Canvas-Js-Games
npm start
# open http://localhost:3000
```

Or open `index.html` in a browser via any static file server (canvas games need HTTP for assets).

## Deploy

**Live on Vercel:** [https://html5-canvas-games.vercel.app](https://html5-canvas-games.vercel.app)

- [Flappy Bird](https://html5-canvas-games.vercel.app/flappy-bird)
- [Space Shooter](https://html5-canvas-games.vercel.app/space-shooter)

You can also enable [GitHub Pages](https://docs.github.com/en/pages) from the `master` branch root. Games are at:

- `/flappy-bird/index.html`
- `/space-shooter/index.html`

Both GitHub Pages and Vercel can serve this static site.
## Development

```bash
npm test
```

## Project layout

```text
index.html                 # Landing page
flappy-bird/
  index.html, game.js, sprite.js
  res/sheet.png            # Sprite sheet
space-shooter/
  index.html, game.js, virtualjoystick.js
  *.png                    # Game assets
test/games.test.js
```

## Credits

- Flappy Bird tutorial: [maxwihlborg/youtube-tutorials](https://github.com/maxwihlborg/youtube-tutorials)
- VirtualJoystick: included in space-shooter (mobile controls)

## License

MIT © 2026 [Piyush Mishra](https://github.com/PiyushMishra318)
