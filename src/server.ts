import { createServer, IncomingMessage, ServerResponse } from "http";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { readFileSync } from "fs";
import { dirname, normalize, resolve, sep } from "path";
import { fileURLToPath } from "url";
import { GameEngine } from "./gameEngine.ts";

dotenv.config();
const __dirname = dirname(fileURLToPath(import.meta.url));

const rawPort = process.env.PORT ?? "3000";
const PORT = parseInt(rawPort, 10);
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error(
    `[ERROR] Invalid PORT value: "${rawPort}". Must be a number between 1-65535.`,
  );
  process.exit(1);
}

const MAX_CONNECTIONS = 100;

const extMap: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".ico": "image/x-icon",
};

function serveStatic(req: IncomingMessage, res: ServerResponse): void {
  const publicDir = resolve(__dirname, "..", "public") + sep;

  let rawPath = req.url === "/" ? "/index.html" : (req.url ?? "/index.html");
  rawPath = rawPath.split("?")[0];

  const safePath = normalize(resolve(publicDir, rawPath.slice(1)));
  if (!safePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const ext = safePath.substring(safePath.lastIndexOf(".")) || ".html";
  const contentType = extMap[ext] ?? "text/plain";

  try {
    const content = readFileSync(safePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const httpServer = createServer(serveStatic);
const wss = new WebSocketServer({ server: httpServer });

function log(level: "INFO" | "WARN" | "ERROR", msg: string): void {
  console.log(`[${new Date().toISOString()}] [${level}] ${msg}`);
}

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  if (wss.clients.size > MAX_CONNECTIONS) {
    log("WARN", `Connection rejected — limit of ${MAX_CONNECTIONS} reached`);
    ws.close(1013, "Server full");
    return;
  }

  const ip = req.socket.remoteAddress ?? "unknown";
  log(
    "INFO",
    `Client connected [${ip}] — active sessions: ${wss.clients.size}`,
  );

  let isAlive = true;

  const heartbeat = setInterval(() => {
    if (!isAlive) {
      log("WARN", `Dead connection detected [${ip}] — terminating`);
      clearInterval(heartbeat);
      ws.terminate();
      return;
    }
    isAlive = false;
    ws.ping();
  }, 30_000);

  ws.on("pong", () => {
    isAlive = true;
  });

  const engine = new GameEngine((output: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "output", data: output }));
    }
  });

  engine.start();

  ws.on("message", (message: Buffer) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.type === "input") {
        engine.handleInput(parsed.data);
      }
    } catch {
      log("WARN", `Malformed message from [${ip}]`);
    }
  });

  ws.on("close", () => {
    clearInterval(heartbeat);
    log(
      "INFO",
      `Client disconnected [${ip}] — active sessions: ${wss.clients.size}`,
    );
  });

  ws.on("error", (err) => {
    log("ERROR", `WebSocket error [${ip}]: ${err.message}`);
  });
});

function shutdown(signal: string): void {
  log("INFO", `${signal} received — shutting down gracefully`);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "output",
          data: "Server is restarting. Please refresh to reconnect.",
        }),
      );
      client.close(1001, "Server shutting down");
    }
  });

  wss.close(() => {
    httpServer.close(() => {
      log("INFO", "Server closed cleanly");
      process.exit(0);
    });
  });

  setTimeout(() => {
    log("WARN", "Forced exit after timeout");
    process.exit(1);
  }, 5_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

httpServer.listen(PORT, () => {
  log("INFO", `🃏 Blackjack server running on http://localhost:${PORT}`);
});
