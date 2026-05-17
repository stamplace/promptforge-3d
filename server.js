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

const WORLDS = [
  {
    id: "space",
    words: ["space", "planet", "star", "galaxy", "moon", "חלל", "כוכב", "גלקס", "ירח"],
    title: "Star Rush",
    tagline: "רוץ בין כוכבים. אסוף אור. אל תיפול לחושך.",
    world: "מסלול חלל חי",
    mood: "קר, חד, בין כוכבים",
    background: "#04070d",
    floor: "#09111f",
    rail: "#22ff99",
    shard: "#22ff99",
    danger: "#7c3cff"
  },
  {
    id: "magic",
    words: ["magic", "forest", "dragon", "treasure", "castle", "קסם", "יער", "דרקון", "אוצר", "טירה"],
    title: "Emerald Quest",
    tagline: "שביל קסום נפתח מהמילים שלך.",
    world: "שביל קסום מרחף",
    mood: "רך, זוהר, אגדי",
    background: "#06120d",
    floor: "#10251b",
    rail: "#a7f3d0",
    shard: "#d9f99d",
    danger: "#9333ea"
  },
  {
    id: "battle",
    words: ["battle", "war", "enemy", "fight", "ninja", "קרב", "אויב", "מלחמה", "נינג'ה", "לוחם"],
    title: "Neon Strike",
    tagline: "זירה מהירה. החלטה אחת. הישרדות.",
    world: "זירת קרב מהירה",
    mood: "לחוץ, חד, התקפי",
    background: "#08050d",
    floor: "#150b22",
    rail: "#f43f5e",
    shard: "#22ff99",
    danger: "#ef4444"
  },
  {
    id: "ocean",
    words: ["ocean", "sea", "water", "shark", "ים", "אוקיינוס", "מים", "כריש", "גלים"],
    title: "Aqua Glide",
    tagline: "צלול למסלול זוהר מתחת לפני הים.",
    world: "מנהרת ים זוהרת",
    mood: "עמוק, זורם, כחול",
    background: "#03111f",
    floor: "#082f49",
    rail: "#38bdf8",
    shard: "#67e8f9",
    danger: "#7c3aed"
  },
  {
    id: "desert",
    words: ["desert", "sand", "pyramid", "sun", "מדבר", "חול", "פירמידה", "שמש"],
    title: "Golden Run",
    tagline: "מסלול עתיק. אור זהב. סכנה בכל פנייה.",
    world: "מסלול מדבר עתיק",
    mood: "חם, זהוב, מסתורי",
    background: "#160f06",
    floor: "#3b2a12",
    rail: "#facc15",
    shard: "#fde68a",
    danger: "#ea580c"
  },
  {
    id: "city",
    words: ["city", "street", "car", "tower", "עיר", "רחוב", "מכונית", "בניין", "מגדל"],
    title: "Metro Pulse",
    tagline: "עיר עתידית נפתחת בקצב שלך.",
    world: "כביש עירוני עתידי",
    mood: "מהיר, אורבני, חד",
    background: "#070b14",
    floor: "#111827",
    rail: "#38bdf8",
    shard: "#22ff99",
    danger: "#f97316"
  },
  {
    id: "candy",
    words: ["candy", "sweet", "cake", "chocolate", "ממתק", "סוכריה", "עוגה", "שוקולד"],
    title: "Candy Dash",
    tagline: "מתוק, מהיר, צבעוני — ופתאום מסוכן.",
    world: "עולם ממתקים משוגע",
    mood: "צבעוני, מצחיק, קופצני",
    background: "#17051a",
    floor: "#2a1230",
    rail: "#fb7185",
    shard: "#f9a8d4",
    danger: "#a855f7"
  },
  {
    id: "ice",
    words: ["ice", "snow", "winter", "frozen", "קרח", "שלג", "חורף", "קפוא"],
    title: "Crystal Slide",
    tagline: "החלק על קרח זוהר בלי להישבר.",
    world: "מסלול קרח שקוף",
    mood: "נקי, קריר, מחליק",
    background: "#06111d",
    floor: "#0f2a3a",
    rail: "#bae6fd",
    shard: "#e0f2fe",
    danger: "#60a5fa"
  }
];

function pickWorld(p) {
  return WORLDS.find(w => hasAny(p, w.words)) || {
    id: "clean",
    title: "Energy Run",
    tagline: "משפט אחד. עולם אחד. משחק שנפתח עכשיו.",
    world: "מסלול אנרגיה נקי",
    mood: "נקי, מהיר, ממכר",
    background: "#07111c",
    floor: "#111827",
    rail: "#22ff99",
    shard: "#22ff99",
    danger: "#7c3cff"
  };
}

function pickIntent(p) {
  return {
    fast: hasAny(p, ["fast", "speed", "race", "runner", "turbo", "מהיר", "מירוץ", "רץ", "טיל", "טורבו"]),
    calm: hasAny(p, ["calm", "slow", "soft", "רגוע", "איטי", "רך"]),
    hard: hasAny(p, ["hard", "danger", "crazy", "קשה", "מסוכן", "משוגע"]),
    premium: hasAny(p, ["premium", "luxury", "cinematic", "יוקרתי", "קולנועי", "פרימיום"])
  };
}

function mobileGameFromPrompt(prompt) {
  const text = String(prompt || "").trim();
  const p = text.toLowerCase();
  const world = pickWorld(p);
  const intent = pickIntent(p);

  const speed = intent.fast ? 0.122 : intent.calm ? 0.078 : 0.096;
  const obstacleChance = intent.hard ? 0.48 : intent.calm ? 0.25 : 0.34;
  const spawnEveryMs = intent.fast ? 500 : intent.calm ? 760 : 630;
  const targetScore = intent.hard ? 30 : intent.calm ? 18 : 24;
  const lives = intent.hard ? 2 : intent.calm ? 4 : 3;

  return {
    version: "v0.8 publish",
    title: world.title,
    tagline: world.tagline,
    prompt: text,
    mode: "mobile-runner-publish-grade",
    world: world.world,
    mood: world.mood,
    adLine: "כתוב משחק. שחק בו עכשיו.",
    purpose: "להפוך משפט אחד לחוויית משחק מובייל מיידית.",
    goal: "גרור את האצבע, אסוף אנרגיה, ואל תפגע בסכנות",
    speed,
    colors: {
      background: world.background,
      floor: world.floor,
      player: "#22ff99",
      shard: world.shard,
      danger: world.danger,
      portal: "#ffffff",
      rail: world.rail
    },
    tuning: {
      targetScore,
      lives,
      spawnEveryMs,
      obstacleChance
    },
    atoms: [
      `שם: ${world.title}`,
      `עולם: ${world.world}`,
      `פרסום: ${world.tagline}`,
      `קצב: ${intent.fast ? "מהיר" : intent.calm ? "רגוע" : "מאוזן"}`,
      `קושי: ${intent.hard ? "גבוה" : intent.calm ? "קל" : "רגיל"}`
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
