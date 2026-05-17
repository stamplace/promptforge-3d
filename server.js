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

function gameFromPrompt(prompt) {
  const text = String(prompt || "").trim();
  const p = text.toLowerCase();

  const dna = {
    space: hasAny(p, ["space", "planet", "star", "galaxy", "חלל", "כוכב", "גלקס", "ירח"]),
    fast: hasAny(p, ["fast", "runner", "race", "speed", "מהיר", "רץ", "מירוץ", "טיל"]),
    magic: hasAny(p, ["magic", "dragon", "castle", "forest", "treasure", "קסם", "דרקון", "יער", "טירה", "אוצר"]),
    dark: hasAny(p, ["dark", "night", "neon", "shadow", "לילה", "ניאון", "צל", "סגול"]),
    maze: hasAny(p, ["maze", "walls", "מבוך", "קירות", "מסדרון"]),
    battle: hasAny(p, ["battle", "fight", "enemy", "war", "shoot", "קרב", "אויב", "מלחמה", "יריות"])
  };

  const gameMode = dna.maze ? "maze" : dna.battle ? "battle" : dna.fast || dna.space ? "runner" : "adventure";

  const modeLabels = {
    runner: "ראנר חלל",
    maze: "מבוך שערים",
    battle: "ארנת קרב",
    adventure: "הרפתקת איסוף"
  };

  const world =
    gameMode === "runner" ? "מסלול חלל מהיר" :
    gameMode === "maze" ? "מבוך חי עם שער לבן" :
    gameMode === "battle" ? "ארנת אויבים ניאונית" :
    dna.magic ? "יער קסום מרחף" :
    "עולם משחק נקי";

  const goal =
    gameMode === "runner" ? "רוץ קדימה, אסוף אנרגיה, ושרוד עד השער" :
    gameMode === "maze" ? "מצא דרך בין הקירות, אסוף מפתחות, והגע לשער" :
    gameMode === "battle" ? "התחמק מהאויבים, אסוף אנרגיה, והפעל את השער" :
    "אסוף אוצרות והגע אל הפורטל";

  return {
    title: "המשחק שלך נפתח",
    prompt: text,
    gameMode,
    genre: modeLabels[gameMode],
    world,
    player: gameMode === "runner" ? "שחקן מהיר ירוק" : "גיבור ירוק",
    goal,
    danger: gameMode === "maze" ? "קירות סגולים" : gameMode === "battle" ? "אויבים רודפים" : "מכשולים סגולים",
    mood: dna.dark || dna.space ? "ניאון חד, חשמלי וקולנועי" : dna.magic ? "קסום, עמוק ורך" : "נקי, שמח ומיידי",
    speed: gameMode === "runner" ? 0.22 : gameMode === "maze" ? 0.095 : gameMode === "battle" ? 0.135 : 0.12,
    colors: {
      background: dna.dark || dna.space ? "#05060a" : "#08111c",
      player: "#22ff99",
      danger: dna.dark || gameMode === "battle" ? "#7c3cff" : "#5b21b6",
      goal: "#ffffff",
      floor: dna.dark || dna.space ? "#0b1220" : "#111827",
      accent: dna.magic ? "#a7f3d0" : "#22ff99"
    },
    counts: {
      shards: gameMode === "runner" ? 14 : gameMode === "maze" ? 7 : gameMode === "battle" ? 10 : 12,
      blockers: gameMode === "runner" ? 10 : gameMode === "maze" ? 18 : gameMode === "battle" ? 11 : 6
    },
    atoms: [
      `מצב משחק: ${modeLabels[gameMode]}`,
      `עולם: ${world}`,
      `מטרה: ${goal}`,
      `סכנה: ${gameMode === "battle" ? "אויבים רודפים" : gameMode === "maze" ? "קירות ומעברים" : "מכשולים בתנועה"}`,
      `קצב: ${gameMode === "runner" ? "מהיר" : gameMode === "maze" ? "מדויק" : gameMode === "battle" ? "לחוץ" : "הרפתקני"}`
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
        sendJson(res, gameFromPrompt(data.prompt));
      } catch {
        sendJson(res, gameFromPrompt(""));
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
