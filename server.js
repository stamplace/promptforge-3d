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
    magic: hasAny(p, ["magic", "dragon", "castle", "forest", "קסם", "דרקון", "יער", "טירה"]),
    dark: hasAny(p, ["dark", "night", "neon", "shadow", "לילה", "ניאון", "צל", "סגול"]),
    maze: hasAny(p, ["maze", "walls", "מבוך", "קירות", "מסדרון"]),
    battle: hasAny(p, ["battle", "fight", "enemy", "war", "קרב", "אויב", "מלחמה", "יריות"])
  };

  const genre = dna.maze ? "מבוך חי" : dna.battle ? "ארנת קרב" : dna.fast ? "ראנר מהיר" : "איסוף והרפתקה";
  const world = dna.space ? "זירת חלל ניאונית" : dna.magic ? "יער קסום מרחף" : dna.dark ? "ארנת לילה חשמלית" : "עולם צעצוע נקי";
  const player = dna.fast ? "שחקן ירוק מהיר" : dna.battle ? "גיבור ירוק בזירה" : "גיבור ירוק ממוקד";
  const danger = dna.battle ? "אויבים סגולים זזים" : dna.maze ? "קירות ומכשולים סגולים" : "מכשולים סגולים";
  const goal = dna.battle ? "אסוף אנרגיה, התחמק מאויבים, והפעל את השער" : "אסוף את כל האנרגיות והגע לשער";
  const mood = dna.dark || dna.space ? "ניאון חד, חשמלי וקולנועי" : dna.magic ? "קסום, עמוק ורך" : "נקי, שמח ומיידי";

  return {
    title: "המשחק שלך נפתח",
    prompt: text,
    genre,
    world,
    player,
    goal,
    danger,
    mood,
    speed: dna.fast ? 0.2 : dna.maze ? 0.095 : 0.125,
    camera: dna.fast ? "runner" : dna.maze ? "maze" : "arena",
    colors: {
      background: dna.dark || dna.space ? "#05060a" : "#f8fafc",
      player: "#22ff99",
      danger: dna.dark ? "#7c3cff" : "#5b21b6",
      goal: "#ffffff",
      floor: dna.dark || dna.space ? "#0b1220" : "#e5e7eb",
      accent: dna.magic ? "#a7f3d0" : "#22ff99"
    },
    counts: {
      shards: dna.magic ? 12 : dna.fast ? 10 : 8,
      blockers: dna.battle ? 12 : dna.maze ? 14 : dna.dark ? 9 : 6
    },
    atoms: [
      `סוג: ${genre}`,
      `עולם: ${world}`,
      `שחקן: ${player}`,
      `מטרה: ${goal}`,
      `סכנה: ${danger}`,
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
