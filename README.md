# Blackjack 🃏

A Blackjack game written in TypeScript — playable in the **terminal** or in the **browser** through a live WebSocket terminal UI.

&nbsp;
 
## Features
 
- Terminal and browser play modes
- Casino-themed xterm.js UI
- Isolated session per browser tab
- Crypto shuffle via `crypto.getRandomValues()`
- WebSocket heartbeat — dead connections auto-cleaned every 30s
- Path traversal protection on the file server
- Graceful shutdown — players notified before server restarts
- 100 concurrent session cap

&nbsp;

## Two ways to play

| Mode | How |
|------|-----|
| Terminal | `npm run dev:cli` — classic prompt-sync CLI |
| Browser | `npm run dev:web` → open `http://localhost:3000` |

Both modes share the same core game logic. The terminal runs it synchronously with `prompt-sync`. The browser streams it over a WebSocket, with each tab getting its own isolated session.

&nbsp;

## Tech

- **Node.js** with **TypeScript**
- **WebSocket** server via the `ws` package — no framework
- **xterm.js** for the browser terminal UI (loaded from jsdelivr CDN)

&nbsp;

## Project structure

```
src/
  types.ts        Shared enums (Suit, GameState) and interfaces
  card.ts         Card model — value, suit, getName()
  deck.ts         52-card deck with crypto shuffle
  player.ts       Hand management and score calculation (Ace soft/hard logic)
  dealer.ts       Extends Player — no extra logic, kept separate by design
  game.ts         Terminal entry point — self-contained CLI loop
  gameEngine.ts   Core game logic decoupled from I/O (used by the web server)
  server.ts       HTTP static server + WebSocket server
public/
  index.html      Browser UI — xterm.js terminal with casino theme
```

&nbsp;

## How the architecture works

The interesting part is the split between `game.ts` and `gameEngine.ts`.

`game.ts` is the original CLI — it uses `prompt-sync` which blocks the thread waiting for input, so the game loop is simple and sequential.

That approach doesn't work over a WebSocket because you can't block — input arrives asynchronously as messages. So `gameEngine.ts` reimplements the same game logic using a callback pattern:

```
constructor(output: (msg: string) => void)   // called whenever the game has something to say
handleInput(input: string)                   // called whenever the player sends something
```

The server creates one `GameEngine` per WebSocket connection and wires the callbacks to `ws.send()` and `ws.on("message")`. The game logic itself doesn't know or care whether it's talking to a terminal or a browser.

&nbsp;

## Server design decisions

**Path traversal protection** — the static file server resolves `PUBLIC_DIR` once at startup using `path.resolve()` with a trailing separator. Every request path is checked with `startsWith(PUBLIC_DIR)` before any file is read. A `/../../../etc/passwd` attempt gets a 403 and a warning in the log.

**Dead connection detection** — a ping/pong heartbeat runs every 30 seconds per connection. If a client doesn't respond (closed laptop, network drop), the server calls `ws.terminate()` and clears the interval so the `GameEngine` instance is garbage collected. Without this, dead sessions accumulate in memory indefinitely.

**Connection cap** — hard limit of 100 concurrent WebSocket sessions. The 101st connection receives a `1013` close frame immediately.

**Graceful shutdown** — `SIGTERM` and `SIGINT` handlers notify all connected clients with a message before closing the WebSocket server and HTTP server in sequence. A 5-second force-exit timeout ensures the process always terminates even if something hangs.

**Structured logging** — every connect, disconnect, error, and security event is logged with an ISO timestamp and severity level.

&nbsp;

## Scripts

```bash
npm run dev:cli    # run the terminal game directly with tsx (no build needed)
npm run dev:web    # start the web server with tsx
npm run build      # compile TypeScript to dist/
npm start          # run the compiled server (production)
```

&nbsp;

## Environment variables

```
PORT   HTTP and WebSocket port (default: 3000)
```

Validated at startup — the server exits with a clear error if `PORT` is not a valid number.

&nbsp;

## License
 
MIT — see [LICENSE](./LICENSE)
