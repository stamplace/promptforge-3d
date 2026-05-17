import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const stage = document.querySelector("#stage");
const promptEl = document.querySelector("#prompt");
const forgeEl = document.querySelector("#forge");
const dnaEl = document.querySelector("#dna");
const scoreEl = document.querySelector("#score");
const titleEl = document.querySelector("#title");
const hintEl = document.querySelector("#hint");
const flashEl = document.querySelector("#flash");
const centerCard = document.querySelector("#centerCard");
const centerTitle = document.querySelector("#centerTitle");
const centerSub = document.querySelector("#centerSub");

let scene, camera, renderer, player, portal, rafId;
let lanes = [];
let objects = [];
let score = 0;
let lives = 3;
let targetScore = 24;
let spec = null;
let lastSpawn = 0;
let running = false;
let targetX = 0;
let targetZ = 4.6;
let touchActive = false;
let lastHitAt = 0;
let combo = 0;
let bestCombo = 0;
let startedAt = 0;
let speedBoost = 1;

function makeMat(color, emissive = 0) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: emissive,
    roughness: 0.32,
    metalness: 0.18
  });
}

function makeBox(color, size = [1, 1, 1], emissive = 0) {
  return new THREE.Mesh(new THREE.BoxGeometry(...size), makeMat(color, emissive));
}

function makeShard(color) {
  return new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), makeMat(color, 0.85));
}

function makeDanger(color) {
  return new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), makeMat(color, 0.22));
}

function clearStage() {
  if (rafId) cancelAnimationFrame(rafId);
  stage.querySelector("canvas")?.remove();
  if (renderer) renderer.dispose();
}

function renderDna(data) {
  dnaEl.innerHTML = data.atoms.map(atom => (
    `<div class="atom"><span class="dot"></span><span>${atom}</span></div>`
  )).join("");
}

function hud(message = null) {
  const comboText = combo > 1 ? ` · 🔥 ${combo}` : "";
  scoreEl.textContent = `🎯 ${score}/${targetScore} · ❤️ ${lives}${comboText}`;
  if (message) titleEl.textContent = message;
}

function vibrate(ms = 18) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function showCenter(title, sub = "", kicker = "PromptForge 3D") {
  if (!centerCard || !centerTitle || !centerSub) return;
  centerTitle.textContent = title;
  centerSub.textContent = sub;
  centerCard.querySelector(".center-kicker").textContent = kicker;
  centerCard.classList.add("show");
}

function hideCenter() {
  if (centerCard) centerCard.classList.remove("show");
}

function finishGame(title, sub) {
  running = false;
  showCenter(title, sub, "סיום משחק");
  hintEl.textContent = "לחץ פתח כדי ליצור משחק חדש";
  vibrate(60);
}

function flash() {
  flashEl.classList.add("on");
  setTimeout(() => flashEl.classList.remove("on"), 120);
}

function setupScene(data) {
  spec = data;
  score = 0;
  lives = data.tuning.lives;
  targetScore = data.tuning.targetScore;
  lastSpawn = 0;
  lastHitAt = 0;
  objects = [];
  lanes = [];
  running = false;
  combo = 0;
  bestCombo = 0;
  speedBoost = 1;
  targetX = 0;
  targetZ = 4.6;

  clearStage();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(data.colors.background);

  const w = stage.clientWidth || window.innerWidth;
  const h = stage.clientHeight || Math.floor(window.innerHeight * 0.72);

  camera = new THREE.PerspectiveCamera(64, w / h, 0.1, 100);
  camera.position.set(0, 7.6, 9.6);
  camera.lookAt(0, 0, 0.5);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  renderer.setSize(w, h);
  stage.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x111827, 2.25));

  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(3, 8, 5);
  scene.add(key);

  const floor = makeBox(data.colors.floor, [8.2, 0.18, 20], 0);
  floor.position.y = -0.18;
  scene.add(floor);

  for (let i = 0; i < 12; i++) {
    const left = makeBox(data.colors.rail, [0.06, 0.06, 1.25], 0.45);
    left.position.set(-4.15, 0.04, 7 - i * 1.75);
    scene.add(left);
    lanes.push(left);

    const right = makeBox(data.colors.rail, [0.06, 0.06, 1.25], 0.45);
    right.position.set(4.15, 0.04, 7 - i * 1.75);
    scene.add(right);
    lanes.push(right);
  }

  for (let x of [-2.6, 0, 2.6]) {
    const line = makeBox("#172033", [0.035, 0.035, 18], 0.08);
    line.position.set(x, 0.01, 0);
    scene.add(line);
  }

  player = makeBox(data.colors.player, [0.78, 0.78, 0.78], 0.42);
  player.position.set(0, 0.46, 4.6);
  scene.add(player);

  portal = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.075, 16, 64),
    makeMat(data.colors.portal, 0.78)
  );
  portal.position.set(0, 1, -7.4);
  scene.add(portal);

  renderDna(data);
  hud(data.world);
  hintEl.textContent = "המשחק נפתח...";
  animate();
  countdownStart();
}

function spawnObject(now) {
  if (!spec || now - lastSpawn < Math.max(360, spec.tuning.spawnEveryMs / speedBoost)) return;
  lastSpawn = now;

  const isDanger = Math.random() < spec.tuning.obstacleChance;
  const obj = isDanger ? makeDanger(spec.colors.danger) : makeShard(spec.colors.shard);
  obj.userData.kind = isDanger ? "danger" : "shard";
  obj.userData.spin = Math.random() * 0.04 + 0.018;

  const lanesX = [-2.8, -1.35, 0, 1.35, 2.8];
  obj.position.set(lanesX[Math.floor(Math.random() * lanesX.length)], 0.55, -8.8);
  objects.push(obj);
  scene.add(obj);
}

function moveWorld() {
  for (const rail of lanes) {
    rail.position.z += spec.speed * 1.9;
    if (rail.position.z > 8.4) rail.position.z = -11.2;
  }

  for (const obj of objects) {
    obj.position.z += spec.speed * 2.25 * speedBoost;
    obj.rotation.y += obj.userData.spin;
    obj.rotation.x += obj.userData.spin * 0.6;
  }
}

function cleanupObjects() {
  objects = objects.filter(obj => {
    if (obj.position.z > 8.6) {
      scene.remove(obj);
      return false;
    }
    return true;
  });
}

function updatePlayer() {
  player.position.x += (targetX - player.position.x) * 0.18;
  player.position.z += (targetZ - player.position.z) * 0.12;
  player.rotation.y += (targetX * 0.12 - player.rotation.y) * 0.1;
  player.rotation.x += 0.012;
}

function handleCollisions() {
  const now = Date.now();

  objects = objects.filter(obj => {
    if (obj.position.distanceTo(player.position) > 0.72) return true;

    scene.remove(obj);

    if (obj.userData.kind === "shard") {
      combo += 1;
      bestCombo = Math.max(bestCombo, combo);
      score += combo >= 5 ? 2 : 1;
      speedBoost = Math.min(1.65, 1 + score / 55);
      flash();
      vibrate(combo >= 5 ? 35 : 16);
      hud(combo >= 5 ? "קומבו כפול!" : "אנרגיה נאספה");
      if (score >= targetScore) {
        finishGame("ניצחת", `קומבו שיא: ${bestCombo}`);
      }
      return false;
    }

    if (now - lastHitAt > 900) {
      lastHitAt = now;
      lives -= 1;
      combo = 0;
      speedBoost = Math.max(1, speedBoost - 0.18);
      flash();
      vibrate(80);

      if (lives <= 0) {
        finishGame("נפלת", `הגעת ל־${score} נקודות`);
      } else {
        hud(`פגיעה — נשארו ${lives} חיים`);
      }
    }

    return false;
  });
}

function animate() {
  rafId = requestAnimationFrame(animate);
  if (!renderer || !spec) return;

  const now = Date.now();

  if (running) {
    speedBoost = Math.min(1.75, speedBoost + 0.00045);
    spawnObject(now);
    moveWorld();
    updatePlayer();
    handleCollisions();
    cleanupObjects();
  }

  portal.rotation.z += 0.024;
  portal.position.y = 1 + Math.sin(now / 420) * 0.05;
  camera.position.x += (player.position.x * 0.22 - camera.position.x) * 0.04;
  camera.lookAt(player.position.x * 0.1, 0, 0.4);

  hud();
  renderer.render(scene, camera);
}


function countdownStart() {
  hideCenter();
  let n = 3;
  showCenter(String(n), "המשחק נבנה מהמילים שלך", "מתחילים");
  const timer = setInterval(() => {
    n -= 1;
    if (n > 0) {
      showCenter(String(n), "תתכונן לגרירה", "מתחילים");
      vibrate(12);
      return;
    }
    if (n === 0) {
      showCenter("רוץ", "גרור אצבע על הזירה", spec.world);
      vibrate(35);
      return;
    }
    clearInterval(timer);
    hideCenter();
    running = true;
    startedAt = Date.now();
    lastSpawn = 0;
    hintEl.textContent = "גרור כדי להתחמק ולאסוף";
  }, 620);
}

function pointerToTarget(e) {
  const rect = stage.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;

  targetX = Math.max(-3.4, Math.min(3.4, x * 4.1));
  targetZ = Math.max(2.5, Math.min(6.2, 4.7 + y * 2.3));
}

stage.addEventListener("pointerdown", e => {
  touchActive = true;
  stage.setPointerCapture?.(e.pointerId);
  pointerToTarget(e);
  hintEl.textContent = "עזוב בעדינות, המשך לגרור";
});

stage.addEventListener("pointermove", e => {
  if (!touchActive) return;
  pointerToTarget(e);
});

stage.addEventListener("pointerup", e => {
  touchActive = false;
  stage.releasePointerCapture?.(e.pointerId);
  hintEl.textContent = "גרור אצבע על הזירה";
});

stage.addEventListener("pointercancel", () => {
  touchActive = false;
});

async function forge() {
  forgeEl.disabled = true;
  forgeEl.textContent = "פותח";
  const res = await fetch("/api/forge", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: promptEl.value })
  });
  const data = await res.json();
  setupScene(data);
  forgeEl.disabled = false;
  forgeEl.textContent = "פתח";
}

window.addEventListener("resize", () => {
  if (!camera || !renderer) return;
  const w = stage.clientWidth || window.innerWidth;
  const h = stage.clientHeight || Math.floor(window.innerHeight * 0.72);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

forgeEl.onclick = forge;
forge();
