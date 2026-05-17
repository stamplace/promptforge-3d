import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const stage = document.querySelector("#stage");
const promptEl = document.querySelector("#prompt");
const forgeEl = document.querySelector("#forge");
const dnaEl = document.querySelector("#dna");
const scoreEl = document.querySelector("#score");
const titleEl = document.querySelector("#title");

let scene, camera, renderer, player, portal;
let shards = [];
let blockers = [];
let keys = {};
let score = 0;
let activeSpec = null;

function makeBox(color, size = [1,1,1]) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.18 })
  );
}

function clearStage() {
  const old = stage.querySelector("canvas");
  if (old) old.remove();
}

function initGame(spec) {
  activeSpec = spec;
  score = 0;
  shards = [];
  blockers = [];
  clearStage();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(spec.colors.background);

  const w = stage.clientWidth || window.innerWidth;
  const h = stage.clientHeight || Math.floor(window.innerHeight * 0.52);

  camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
  camera.position.set(0, 7, 9);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(w, h);
  stage.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x182033, 2.4));

  const floor = makeBox(spec.colors.floor, [14, 0.25, 18]);
  floor.position.y = -0.2;
  scene.add(floor);

  player = makeBox(spec.colors.player, [0.82, 0.82, 0.82]);
  player.position.set(0, 0.45, 6);
  scene.add(player);

  for (let i = 0; i < spec.counts.shards; i++) {
    const shard = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 24, 24),
      new THREE.MeshStandardMaterial({
        color: spec.colors.player,
        emissive: spec.colors.player,
        emissiveIntensity: 0.65
      })
    );
    shard.position.set((Math.random() - 0.5) * 11, 0.55, (Math.random() - 0.5) * 13);
    shards.push(shard);
    scene.add(shard);
  }

  for (let i = 0; i < spec.counts.blockers; i++) {
    const blocker = makeBox(spec.colors.danger, [1, 1, 1]);
    blocker.position.set((Math.random() - 0.5) * 11, 0.5, (Math.random() - 0.5) * 12);
    blockers.push(blocker);
    scene.add(blocker);
  }

  portal = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.08, 16, 64),
    new THREE.MeshStandardMaterial({
      color: spec.colors.goal,
      emissive: spec.colors.goal,
      emissiveIntensity: 0.7
    })
  );
  portal.position.set(0, 1, -7);
  scene.add(portal);

  titleEl.textContent = spec.world;
  dnaEl.textContent = `${spec.player} · ${spec.goal} · ${spec.danger} · ${spec.mood}`;
  animate();
}

function move(dx, dz) {
  if (!player) return;
  player.position.x = Math.max(-6, Math.min(6, player.position.x + dx));
  player.position.z = Math.max(-8, Math.min(7, player.position.z + dz));
}

function animate() {
  requestAnimationFrame(animate);
  if (!activeSpec || !renderer) return;

  const v = activeSpec.speed;
  if (keys.ArrowLeft) move(-v, 0);
  if (keys.ArrowRight) move(v, 0);
  if (keys.ArrowUp) move(0, -v);
  if (keys.ArrowDown) move(0, v);

  blockers.forEach((b, i) => {
    b.rotation.y += 0.025;
    b.position.x += Math.sin(Date.now() / 600 + i) * 0.006;
    if (b.position.distanceTo(player.position) < 0.85) {
      player.position.set(0, 0.45, 6);
      titleEl.textContent = "נפגעת — נסה שוב";
    }
  });

  shards = shards.filter(s => {
    s.rotation.y += 0.03;
    if (s.position.distanceTo(player.position) < 0.7) {
      scene.remove(s);
      score += 1;
      return false;
    }
    return true;
  });

  if (portal.position.distanceTo(player.position) < 1.1 && shards.length === 0) {
    titleEl.textContent = "ניצחת — כתוב עולם חדש";
  }

  scoreEl.textContent = `${score} / ${activeSpec.counts.shards}`;
  portal.rotation.z += 0.02;
  renderer.render(scene, camera);
}

async function forge() {
  const res = await fetch("/api/forge", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: promptEl.value })
  });
  const spec = await res.json();
  initGame(spec);
}

forgeEl.onclick = forge;

addEventListener("keydown", e => keys[e.key] = true);
addEventListener("keyup", e => keys[e.key] = false);

function bindHold(id, key) {
  const el = document.querySelector("#" + id);
  const on = e => { e.preventDefault(); keys[key] = true; };
  const off = e => { e.preventDefault(); keys[key] = false; };
  el.addEventListener("touchstart", on);
  el.addEventListener("touchend", off);
  el.addEventListener("mousedown", on);
  el.addEventListener("mouseup", off);
}

bindHold("left", "ArrowLeft");
bindHold("right", "ArrowRight");
bindHold("up", "ArrowUp");

forge();
