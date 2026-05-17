import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const stage = document.querySelector("#stage");
const promptEl = document.querySelector("#prompt");
const forgeEl = document.querySelector("#forge");
const dnaEl = document.querySelector("#dna");
const scoreEl = document.querySelector("#score");
const titleEl = document.querySelector("#title");

let scene, camera, renderer, player, portal, rafId;
let shards = [];
let blockers = [];
let keys = {};
let score = 0;
let activeSpec = null;
let startMs = Date.now();

function makeBox(color, size = [1, 1, 1]) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.22 })
  );
}

function makeShard(color) {
  return new THREE.Mesh(
    new THREE.OctahedronGeometry(0.26, 0),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.85 })
  );
}

function clearStage() {
  if (rafId) cancelAnimationFrame(rafId);
  const old = stage.querySelector("canvas");
  if (old) old.remove();
  if (renderer) renderer.dispose();
}

function renderDna(spec) {
  dnaEl.innerHTML = spec.atoms.map(atom => (
    `<div class="atom"><span class="dot"></span><span>${atom}</span></div>`
  )).join("");
}

function addSceneRails(spec) {
  if (spec.gameMode === "runner") {
    for (let i = 0; i < 16; i++) {
      const rail = makeBox(spec.colors.accent, [0.08, 0.08, 1.2]);
      rail.position.set(i % 2 ? 6.2 : -6.2, 0.08, 7 - i * 1.1);
      rail.material.emissive = new THREE.Color(spec.colors.accent);
      rail.material.emissiveIntensity = 0.35;
      scene.add(rail);
    }
  }

  if (spec.gameMode === "maze") {
    for (let z = -7; z <= 6; z += 2) {
      const left = makeBox(spec.colors.danger, [0.32, 1.2, 1.4]);
      left.position.set(-4 + Math.sin(z) * 1.2, 0.55, z);
      scene.add(left);
      blockers.push(left);

      const right = makeBox(spec.colors.danger, [0.32, 1.2, 1.4]);
      right.position.set(4 + Math.cos(z) * 1.2, 0.55, z);
      scene.add(right);
      blockers.push(right);
    }
  }

  if (spec.gameMode === "battle") {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(5.6, 0.05, 12, 96),
      new THREE.MeshStandardMaterial({ color: spec.colors.danger, emissive: spec.colors.danger, emissiveIntensity: 0.35 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.04;
    scene.add(ring);
  }
}

function placeShards(spec) {
  const n = spec.counts.shards;
  for (let i = 0; i < n; i++) {
    const shard = makeShard(spec.colors.player);

    if (spec.gameMode === "runner") {
      shard.position.set(Math.sin(i * 1.4) * 3.5, 0.6, 6 - i * 1.05);
    } else if (spec.gameMode === "maze") {
      shard.position.set((i % 2 ? 2.8 : -2.8), 0.6, 5 - i * 1.65);
    } else if (spec.gameMode === "battle") {
      const a = (i / n) * Math.PI * 2;
      shard.position.set(Math.cos(a) * 4.2, 0.6, Math.sin(a) * 4.2);
    } else {
      shard.position.set((Math.random() - 0.5) * 10, 0.6, (Math.random() - 0.5) * 12);
    }

    shards.push(shard);
    scene.add(shard);
  }
}

function placeBlockers(spec) {
  if (spec.gameMode === "maze") return;

  for (let i = 0; i < spec.counts.blockers; i++) {
    const size = spec.gameMode === "runner" ? [0.75, 0.75, 0.75] : [1, 1, 1];
    const blocker = makeBox(spec.colors.danger, size);

    if (spec.gameMode === "runner") {
      blocker.position.set(Math.sin(i * 2.1) * 4.8, 0.5, 5.5 - i * 1.25);
    } else if (spec.gameMode === "battle") {
      const a = (i / spec.counts.blockers) * Math.PI * 2;
      blocker.position.set(Math.cos(a) * 5.2, 0.5, Math.sin(a) * 5.2);
    } else {
      blocker.position.set((Math.random() - 0.5) * 11, 0.5, (Math.random() - 0.5) * 12);
    }

    blocker.userData.phase = Math.random() * Math.PI * 2;
    blockers.push(blocker);
    scene.add(blocker);
  }
}

function initGame(spec) {
  activeSpec = spec;
  startMs = Date.now();
  score = 0;
  shards = [];
  blockers = [];
  clearStage();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(spec.colors.background);

  const w = stage.clientWidth || window.innerWidth;
  const h = stage.clientHeight || Math.floor(window.innerHeight * 0.55);

  camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
  if (spec.gameMode === "runner") camera.position.set(0, 6.2, 9.8);
  else if (spec.gameMode === "maze") camera.position.set(0, 8.5, 8.2);
  else camera.position.set(0, 7.3, 9.2);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(w, h);
  stage.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x182033, 2.45));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(3, 8, 4);
  scene.add(key);

  const floor = makeBox(spec.colors.floor, [14, 0.25, 18]);
  floor.position.y = -0.2;
  scene.add(floor);

  addSceneRails(spec);

  player = makeBox(spec.colors.player, [0.82, 0.82, 0.82]);
  player.position.set(0, 0.45, 6.8);
  scene.add(player);

  placeShards(spec);
  placeBlockers(spec);

  portal = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.08, 16, 64),
    new THREE.MeshStandardMaterial({ color: spec.colors.goal, emissive: spec.colors.goal, emissiveIntensity: 0.9 })
  );
  portal.position.set(0, 1, -7.4);
  scene.add(portal);

  titleEl.textContent = spec.world;
  renderDna(spec);
  animate();
}

function move(dx, dz) {
  if (!player) return;
  player.position.x = Math.max(-6, Math.min(6, player.position.x + dx));
  player.position.z = Math.max(-8, Math.min(7.2, player.position.z + dz));
}

function updateControls() {
  const v = activeSpec.speed;
  if (keys.ArrowLeft) move(-v, 0);
  if (keys.ArrowRight) move(v, 0);
  if (keys.ArrowUp) move(0, -v);
  if (keys.ArrowDown) move(0, v);

  if (activeSpec.gameMode === "runner") {
    move(0, -v * 0.34);
    if (player.position.z < -7.2) player.position.z = 6.8;
  }
}

function updateBlockers(t) {
  blockers.forEach((b, i) => {
    b.rotation.y += 0.024;
    b.rotation.x += activeSpec.gameMode === "battle" ? 0.018 : 0.006;

    if (activeSpec.gameMode === "battle") {
      const dx = player.position.x - b.position.x;
      const dz = player.position.z - b.position.z;
      const len = Math.max(0.001, Math.hypot(dx, dz));
      b.position.x += (dx / len) * 0.018;
      b.position.z += (dz / len) * 0.018;
    } else if (activeSpec.gameMode === "runner") {
      b.position.z += 0.038;
      if (b.position.z > 7.2) b.position.z = -7.2;
    } else if (activeSpec.gameMode !== "maze") {
      b.position.x += Math.sin(t / 620 + b.userData.phase + i) * 0.006;
    }

    if (b.position.distanceTo(player.position) < 0.82) {
      player.position.set(0, 0.45, 6.8);
      titleEl.textContent = "נפגעת — המשחק נבנה מחדש";
    }
  });
}

function updateShards(t) {
  shards = shards.filter(s => {
    s.rotation.y += 0.055;
    s.position.y = 0.6 + Math.sin(t / 320 + s.position.x) * 0.06;
    if (activeSpec.gameMode === "runner") {
      s.position.z += 0.018;
      if (s.position.z > 7.2) s.position.z = -7.2;
    }

    if (s.position.distanceTo(player.position) < 0.7) {
      scene.remove(s);
      score += 1;
      return false;
    }
    return true;
  });
}

function animate() {
  rafId = requestAnimationFrame(animate);
  if (!activeSpec || !renderer) return;

  const t = Date.now();
  updateControls();
  updateBlockers(t);
  updateShards(t);

  if (portal.position.distanceTo(player.position) < 1.1 && shards.length === 0) {
    titleEl.textContent = "ניצחת — כתוב משחק חדש";
  }

  scoreEl.textContent = `${score} / ${activeSpec.counts.shards}`;
  portal.rotation.z += 0.025;
  player.rotation.y += 0.02;

  if (activeSpec.gameMode === "runner") {
    camera.position.x += (player.position.x * 0.28 - camera.position.x) * 0.05;
    camera.lookAt(player.position.x * 0.18, 0, player.position.z - 2.2);
  }

  renderer.render(scene, camera);
}

async function forge() {
  forgeEl.disabled = true;
  forgeEl.textContent = "פותח משחק...";
  const res = await fetch("/api/forge", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: promptEl.value })
  });
  const spec = await res.json();
  initGame(spec);
  forgeEl.disabled = false;
  forgeEl.textContent = "פתח את המשחק שלי";
}

forgeEl.onclick = forge;

addEventListener("keydown", e => keys[e.key] = true);
addEventListener("keyup", e => keys[e.key] = false);

function bindHold(id, key) {
  const el = document.querySelector("#" + id);
  const on = e => { e.preventDefault(); keys[key] = true; };
  const off = e => { e.preventDefault(); keys[key] = false; };
  el.addEventListener("touchstart", on, { passive: false });
  el.addEventListener("touchend", off, { passive: false });
  el.addEventListener("touchcancel", off, { passive: false });
  el.addEventListener("mousedown", on);
  el.addEventListener("mouseup", off);
  el.addEventListener("mouseleave", off);
}

bindHold("left", "ArrowLeft");
bindHold("right", "ArrowRight");
bindHold("up", "ArrowUp");

window.addEventListener("resize", () => {
  if (!camera || !renderer) return;
  const w = stage.clientWidth || window.innerWidth;
  const h = stage.clientHeight || Math.floor(window.innerHeight * 0.55);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

forge();
