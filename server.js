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

function hasAny(text, words) {
  return words.some(w => text.includes(w));
}

function mobileGameFromPrompt(prompt) {
  const text = String(prompt || "").trim();
  const p = text.toLowerCase();

  const isSpace = hasAny(p, ["space", "planet", "star", "galaxy", "חלל", "כוכב", "גלקס", "ירח"]);
  const isNeon = hasAny(p, ["neon", "dark", "night", "cyber", "ניאון", "חושך", "לילה", "סייבר"]);
  const isMagic = hasAny(p, ["magic", "forest", "dragon", "treasure", "קסם", "יער", "דרקון", "אוצר"]);
  const isFast = hasAny(p, ["fast", "speed", "race", "runner", "מהיר", "מירוץ", "רץ", "טיל"]);

  const world =
    isSpace ? "מסלול חלל חי" :
    isMagic ? "שביל קסום מרחף" :
    isNeon ? "מסלול ניאון חשמלי" :
    "מסלול אנרגיה נקי";

  const mood =
    isSpace || isNeon ? "חד, חשמלי, עתידי" :
    isMagic ? "קסום, רך, זוהר" :
    "נקי, מהיר, ממכר";

  return {
    version: "v0.5 mobile",
    title: "המשחק שלך נפתח",
    prompt: text,
    mode: "mobile-runner",
    world,
    mood,
    goal: "גרור את האצבע, אסוף אנרגיה ירוקה, ואל תפגע בקוביות הסגולות",
    speed: isFast ? 0.118 : 0.094,
    colors: {
      background: isSpace || isNeon ? "#04070d" : "#07111c",
      floor: isSpace || isNeon ? "#09111f" : "#111827",
      player: "#22ff99",
      shard: isMagic ? "#a7f3d0" : "#22ff99",
      danger: "#7c3cff",
      portal: "#ffffff",
      rail: isMagic ? "#a7f3d0" : "#22ff99"
    },
    tuning: {
      targetScore: 24,
      lives: 3,
      spawnEveryMs: isFast ? 520 : 640,
      obstacleChance: isFast ? 0.42 : 0.34
    },
    atoms: [
      `חוויה: מובייל אצבע אחת`,
      `עולם: ${world}`,
      `מטרה: איסוף אנרגיה והתחמקות`,
      `שליטה: גרירה ישירה על המסך`,
      `אווירה: ${mood}`
    ]
  };
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/forge") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        sendJson(res, mobileGameFromPrompt(data.prompt));
      } catch {
        sendJson(res, mobileGameFromPrompt(""));
      }
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
