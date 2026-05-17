import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const port = process.env.PORT || 8787;

function sendJson(res, data) {
  res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data, null, 2));
}

function gameFromPrompt(prompt) {
  const text = String(prompt || "").trim();
  const p = text.toLowerCase();

  const isSpace = /space|planet|star|galaxy|חלל|כוכב|גלקס/.test(p);
  const isFast = /fast|runner|race|speed|מהיר|רץ|מירוץ/.test(p);
  const isMagic = /magic|dragon|castle|forest|קסם|דרקון|יער|טירה/.test(p);
  const isDark = /dark|night|neon|shadow|לילה|ניאון|צל/.test(p);

  return {
    title: "Your Game Is Alive",
    prompt: text,
    world: isSpace ? "Neon Space Arena" : isMagic ? "Floating Myth Forest" : "Clean Toy Reality",
    player: isFast ? "Fast green cube" : "Focused green hero",
    goal: "Collect all shards and reach the portal",
    danger: isDark ? "Purple shadow blockers" : "Moving blockers",
    mood: isDark ? "electric and cinematic" : "clean and playful",
    speed: isFast ? 0.18 : 0.11,
    colors: {
      background: isDark || isSpace ? "#05060a" : "#f8fafc",
      player: "#22ff99",
      danger: "#7c3cff",
      goal: "#ffffff",
      floor: isDark || isSpace ? "#111827" : "#e5e7eb"
    },
    counts: {
      shards: isMagic ? 12 : 8,
      blockers: isDark ? 9 : 6
    }
  };
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/forge") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      const data = JSON.parse(body || "{}");
      sendJson(res, gameFromPrompt(data.prompt));
    });
    return;
  }

  const requestPath = req.url === "/" ? "/index.html" : req.url;
  const fullPath = path.join(publicDir, requestPath.replace(/^\/+/, ""));

  if (!fullPath.startsWith(publicDir) || !fs.existsSync(fullPath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const type = fullPath.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8";
  res.writeHead(200, { "content-type": type });
  fs.createReadStream(fullPath).pipe(res);
});

server.listen(port, () => {
  console.log(`PromptForge 3D running at http://localhost:${port}`);
});
