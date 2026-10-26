// Первый экран: ночной зал ресторана. Камера идёт за прокруткой: общий план -> на столах загораются карточки -> касание телефона.
import * as THREE from "./three.module.min.js";

const d = document, H = d.documentElement, hall = d.getElementById("hall"), cv = d.getElementById("hall-c");
const caps = [].slice.call(hall.querySelectorAll(".hall-cap")), fade = hall.querySelector(".hall-fade"), hint = hall.querySelector(".hall-hint");
const mob = matchMedia("(max-width: 760px)").matches;
const cl = (x) => Math.min(1, Math.max(0, x)), ss = (a, b, x) => { x = cl((x - a) / (b - a)); return x * x * (3 - 2 * x); };
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

let R;
try { R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" }); }
catch (e) { H.classList.add("nogl"); throw e; }
// чёткость: полное разрешение экрана (до 2x); если телефон не успевает — разрешение снижается само
const DPR = Math.min(devicePixelRatio || 1, 2); let dpr = DPR;
R.setPixelRatio(dpr);
R.toneMapping = THREE.NeutralToneMapping; R.toneMappingExposure = 1.5;
R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFShadowMap;
const ANI = Math.min(16, R.capabilities.getMaxAnisotropy());

const S = new THREE.Scene(), BG = new THREE.Color("#0d0a08");
S.background = BG; S.fog = new THREE.FogExp2(BG, mob ? .028 : .034);
const cam = new THREE.PerspectiveCamera(40, 1, .02, 80);

// --- текстуры, нарисованные на canvas
function can(w, h) { const c = d.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }
function tex(c, rep) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANI; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); } return t; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
const GLOW = (() => { const [c, g] = can(128, 128), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,232,190,1)"); r.addColorStop(.22, "rgba(255,196,120,.5)"); r.addColorStop(1, "rgba(255,170,90,0)");
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); return tex(c); })();
const FLOOR = (() => { const [c, g] = can(1024, 1024); g.fillStyle = "#1c140e"; g.fillRect(0, 0, 1024, 1024);
  for (let x = 0; x < 1024; x += 64) for (let y = -((x / 64) % 2) * 128; y < 1024; y += 256) {
    const l = 24 + rnd() * 12; g.fillStyle = `rgb(${l + 6},${l},${l * .7})`; g.fillRect(x + 1, y + 1, 62, 254);
    g.strokeStyle = "rgba(0,0,0,.25)"; for (let k = 0; k < 6; k++) { g.beginPath(); const gx = x + 6 + rnd() * 52; g.moveTo(gx, y); g.bezierCurveTo(gx + 6, y + 80, gx - 6, y + 170, gx + 2, y + 256); g.stroke(); } }
  return tex(c, 24); })();

// --- пол, свет
const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ map: FLOOR, roughness: .55, metalness: .05 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; S.add(floor);
S.add(new THREE.HemisphereLight("#a88160", "#1f150e", 1.45));
const moon = new THREE.DirectionalLight("#7d93b5", .55); moon.position.set(-6, 8, 4); S.add(moon);

// --- зал: столы, стулья, лампы
const cols = mob ? [-2.7, 0, 2.7] : [-9.9, -6.6, -3.3, 0, 3.3, 6.6, 9.9], rows = [0, -3.3, -6.6, -9.9, -13.2, -16.5];
const T = [];
rows.forEach((z) => cols.forEach((x) => { const hero = !x && !z;
  T.push({ x: hero ? 0 : x + (rnd() - .5) * .6, z: hero ? 0 : z + (rnd() - .5) * .6, a: rnd() * Math.PI, hero }); }));
const n = T.length, o = new THREE.Object3D();
function inst(geo, mat, count, place, shadow) {
  const m = new THREE.InstancedMesh(geo, mat, count); let k = 0;
  T.forEach((t) => place(t, () => { o.updateMatrix(); m.setMatrixAt(k++, o.matrix); }));
  m.castShadow = !!shadow; m.receiveShadow = true; S.add(m); return m;
}
const wood = new THREE.MeshStandardMaterial({ color: "#3a2416", roughness: .42, metalness: .05 });
const iron = new THREE.MeshStandardMaterial({ color: "#16130f", roughness: .5, metalness: .7 });
const seat = new THREE.MeshStandardMaterial({ color: "#2a1d15", roughness: .7 });
const brass = new THREE.MeshStandardMaterial({ color: "#3a2c1c", roughness: .3, metalness: .85, side: THREE.DoubleSide });
const at = (x, y, z, ry = 0, s = 1) => { o.position.set(x, y, z); o.rotation.set(0, ry, 0); o.scale.setScalar(s); };
inst(new THREE.CylinderGeometry(.55, .55, .045, 72), wood, n, (t, w) => { at(t.x, .7525, t.z); w(); }, true);
inst(new THREE.CylinderGeometry(.04, .055, .73, 12), iron, n, (t, w) => { at(t.x, .365, t.z); w(); });
inst(new THREE.CylinderGeometry(.26, .3, .025, 24), iron, n, (t, w) => { at(t.x, .0125, t.z); w(); });
const chairAt = (t, k, y) => { const a = t.a + k * Math.PI, r = .78; return [t.x + Math.sin(a) * r, y, t.z + Math.cos(a) * r, a]; };
inst(new THREE.BoxGeometry(.44, .05, .44), seat, n * 2, (t, w) => { for (let k = 0; k < 2; k++) { const [x, y, z, a] = chairAt(t, k, .46); at(x, y, z, a); w(); } }, true);
inst(new THREE.BoxGeometry(.44, .5, .045).translate(0, .25, .2), seat, n * 2, (t, w) => { for (let k = 0; k < 2; k++) { const [x, y, z, a] = chairAt(t, k, .48); at(x, y, z, a); w(); } }, true);
inst(new THREE.BoxGeometry(.05, .44, .05), iron, n * 2, (t, w) => { for (let k = 0; k < 2; k++) { const [x, , z, a] = chairAt(t, k); at(x, .22, z, a); w(); } });
const LY = 1.95;
inst(new THREE.ConeGeometry(.2, .17, 32, 1, true), brass, n, (t, w) => { at(t.x, LY + .07, t.z); w(); });
inst(new THREE.CylinderGeometry(.004, .004, 3), iron, n, (t, w) => { at(t.x, LY + 1.6, t.z); w(); });
const add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: GLOW };
inst(new THREE.SphereGeometry(.035, 12, 8), new THREE.MeshBasicMaterial({ color: "#ffe6b8" }), n, (t, w) => { at(t.x, LY + .02, t.z); w(); });
const poolT = new THREE.MeshBasicMaterial({ ...add, color: "#ffb36b", opacity: .55 });
inst(new THREE.CircleGeometry(.62, 40).rotateX(-Math.PI / 2), poolT, n, (t, w) => { at(t.x, .777, t.z); w(); });
inst(new THREE.CircleGeometry(1.7, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ ...add, color: "#ff9e55", opacity: .34 }), n, (t, w) => { at(t.x, .003, t.z); w(); });
T.forEach((t) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ ...add, color: "#ffcf8a", opacity: 1, fog: true })); s.position.set(t.x, LY + .01, t.z); s.scale.setScalar(.95); S.add(s); });
// живой свет над ближними столами
T.filter((t) => t.z > -7 && Math.abs(t.x) < 4).forEach((t) => {
  const p = new THREE.PointLight("#ffc98e", t.hero ? 0 : 3.6, 4, 2); p.position.set(t.x, LY - .05, t.z); S.add(p); });
const spot = new THREE.SpotLight("#ffd29a", 9, 4, .62, .75, 2);
spot.position.set(0, LY - .02, 0); spot.target.position.set(0, .75, 0); spot.castShadow = true;
spot.shadow.mapSize.set(2048, 2048); spot.shadow.radius = 5; spot.shadow.bias = -.0004; spot.shadow.normalBias = .002; spot.shadow.camera.near = .5; spot.shadow.camera.far = 2.2; S.add(spot, spot.target);
// стойка бара в глубине
const bar = new THREE.Mesh(new THREE.BoxGeometry(16, 1.1, .7), new THREE.MeshStandardMaterial({ color: "#1c140e", roughness: .5 }));
bar.position.set(0, .55, -20.5); S.add(bar);
const strip = new THREE.Mesh(new THREE.BoxGeometry(16, .025, .02), new THREE.MeshBasicMaterial({ color: "#d9a560" }));
strip.position.set(0, 1.08, -20.13); S.add(strip);
// тёплая стена в глубине: бра и подсветка полок над баром
const wall = new THREE.Mesh(new THREE.PlaneGeometry(48, 9), new THREE.MeshStandardMaterial({ color: "#3d2a1c", roughness: .9 }));
wall.position.set(0, 4.5, -22.6); S.add(wall);
const SHELF = (() => { const [c, g] = can(16, 128), r = g.createLinearGradient(0, 0, 0, 128);
  r.addColorStop(0, "rgba(255,190,120,0)"); r.addColorStop(.55, "rgba(255,200,130,.9)"); r.addColorStop(1, "rgba(255,170,90,.15)"); g.fillStyle = r; g.fillRect(0, 0, 16, 128); return tex(c); })();
const shelf = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.4), new THREE.MeshBasicMaterial({ ...add, map: SHELF, color: "#ffd29a", opacity: 1, fog: false }));
shelf.position.set(0, 2.1, -22.5); S.add(shelf);
for (let x = -20; x <= 20; x += 5) { if (Math.abs(x) < 9) continue;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ ...add, color: "#ffc27a", opacity: .9 })); s.position.set(x, 2.6, -22.4); s.scale.setScalar(2.2); S.add(s); }

// --- карточки на столах: свечение и волна, когда карточка «включается»
const order = T.filter((t) => !t.hero).sort((a, b) => a.z - b.z || a.x - b.x);
order.forEach((t, k) => { t.on = .1 + .36 * k / (order.length - 1); });
T.forEach((t) => {
  t.cx = t.hero ? 0 : t.x + Math.sin(t.a + 1.4) * .22; t.cz = t.hero ? .06 : t.z + Math.cos(t.a + 1.4) * .22;
  t.g = new THREE.Sprite(new THREE.SpriteMaterial({ ...add, color: "#e8c07a", opacity: 0 })); t.g.position.set(t.cx, .8, t.cz); S.add(t.g);
  t.r = new THREE.Mesh(new THREE.RingGeometry(.8, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#e6c27f", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  t.r.position.set(t.cx, .7785, t.cz); S.add(t.r);
  if (!t.hero) { const c = new THREE.Mesh(new THREE.BoxGeometry(.086, .003, .054), new THREE.MeshStandardMaterial({ color: "#100d0a", roughness: .4, metalness: .3, emissive: "#c8a46b", emissiveIntensity: 0 }));
    c.position.set(t.cx, .7765, t.cz); c.rotation.y = t.a; S.add(c); t.c = c; }
});
const heroT = T.find((t) => t.hero); heroT.on = .5;
heroT.r.geometry.dispose(); heroT.r.geometry = new THREE.RingGeometry(.985, 1, 128).rotateX(-Math.PI / 2);

// --- карточка героя и телефон
const [cc, cg] = can(1024, 644);
const [sc, sg] = can(720, 1480);
const cardTex = tex(cc), scrTex = tex(sc);
const card = new THREE.Mesh(new THREE.BoxGeometry(.086, .0025, .054), [iron, iron, new THREE.MeshStandardMaterial({ map: cardTex, roughness: .35, metalness: .2 }), iron, iron, iron]);
card.position.set(0, .7765, .06); card.rotation.y = -.22; card.castShadow = card.receiveShadow = true; S.add(card);

const shp = new THREE.Shape(); { const w = .074, h = .152, r = .012, x = -w / 2, y = -h / 2;
  shp.moveTo(x + r, y); shp.lineTo(x + w - r, y); shp.quadraticCurveTo(x + w, y, x + w, y + r); shp.lineTo(x + w, y + h - r); shp.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shp.lineTo(x + r, y + h); shp.quadraticCurveTo(x, y + h, x, y + h - r); shp.lineTo(x, y + r); shp.quadraticCurveTo(x, y, x + r, y); }
const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shp, { depth: .006, bevelEnabled: true, bevelThickness: .0015, bevelSize: .0015, bevelSegments: 3, curveSegments: 10 }),
  new THREE.MeshStandardMaterial({ color: "#1d1a16", roughness: .28, metalness: .75 }));
body.rotation.x = -Math.PI / 2; body.position.y = -.0075; body.castShadow = true;
const scrMat = new THREE.MeshBasicMaterial({ map: scrTex, color: "#000", toneMapped: false });
const scr = new THREE.Mesh(new THREE.PlaneGeometry(.068, .146), scrMat); scr.rotation.x = -Math.PI / 2; scr.position.y = .0002;
const phone = new THREE.Group(); phone.add(body, scr); S.add(phone);

function drawCard(qr) {
  const g = cg, W = 1024, Hh = 644, gr = g.createLinearGradient(0, 0, W, Hh);
  gr.addColorStop(0, "#26211a"); gr.addColorStop(.6, "#0f0d0a"); gr.addColorStop(1, "#1c1813"); g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
  g.strokeStyle = "rgba(230,204,152,.75)"; g.lineWidth = 4; rr(g, 34, 34, W - 68, Hh - 68, 26); g.stroke();
  g.lineWidth = 7; g.strokeStyle = "#C8A46B"; rr(g, 90, 92, 70, 58, 29); g.stroke(); rr(g, 128, 92, 70, 58, 29); g.stroke();
  g.fillStyle = "#F3EDE4"; g.font = '500 44px Onest, sans-serif'; g.letterSpacing = "18px"; g.textBaseline = "middle"; g.fillText("LINKO", 228, 122);
  g.letterSpacing = "0px"; g.strokeStyle = "#C8A46B"; g.lineWidth = 8; g.lineCap = "round";
  [0, 1, 2].forEach((k) => { g.beginPath(); g.arc(80, 470, 34 + k * 28, -.75, .75); g.stroke(); });
  g.fillStyle = "#F3EDE4"; g.font = '500 54px "Playfair Display", Georgia, serif'; g.fillText("Приложите", 196, 440); g.fillText("телефон", 196, 506);
  g.fillStyle = "#A69D90"; g.font = '400 30px Onest, sans-serif'; g.fillText("меню · официант · отзыв", 198, 572);
  g.fillStyle = "#F3EDE4"; rr(g, 676, 268, 290, 290, 26); g.fill(); if (qr) g.drawImage(qr, 696, 288, 250, 250);
  cardTex.needsUpdate = true;
}
const rows4 = ["Меню", "Позвать официанта", "Попросить счёт", "Оставить отзыв"];
let scrK = -1;
function drawScreen(k) {
  const q = Math.round(k * 90) / 90; if (q === scrK) return; scrK = q;
  const g = sg, W = 540, Hh = 1110; g.setTransform(4 / 3, 0, 0, 4 / 3, 0, 0); g.fillStyle = "#0E0C0A"; g.fillRect(0, 0, W, Hh);
  const bg = g.createRadialGradient(270, 260, 0, 270, 260, 520); bg.addColorStop(0, "rgba(20,40,31,.95)"); bg.addColorStop(1, "rgba(14,12,10,0)"); g.fillStyle = bg; g.fillRect(0, 0, W, Hh);
  g.fillStyle = "#000"; rr(g, 210, 22, 120, 34, 17); g.fill();
  const a = ss(0, .35, q); g.globalAlpha = a; g.textAlign = "center"; g.textBaseline = "middle";
  g.strokeStyle = "#C8A46B"; g.lineWidth = 4; rr(g, 222, 140, 54, 44, 22); g.stroke(); rr(g, 262, 140, 54, 44, 22); g.stroke();
  g.fillStyle = "#C8A46B"; g.font = '500 22px Onest, sans-serif'; g.letterSpacing = "8px"; g.fillText("СТОЛ 7", 274, 236); g.letterSpacing = "0px";
  g.fillStyle = "#F3EDE4"; g.font = '500 58px "Playfair Display", Georgia, serif'; g.fillText("Добрый вечер", 270, 312);
  g.textAlign = "left";
  rows4.forEach((t, i) => { const v = ss(.2 + i * .14, .45 + i * .14, q), y = 410 + i * 150 + (1 - v) * 40; g.globalAlpha = v;
    g.fillStyle = "rgba(29,26,21,.95)"; rr(g, 40, y, 460, 124, 26); g.fill(); g.strokeStyle = "rgba(200,164,107,.35)"; g.lineWidth = 2; g.stroke();
    g.strokeStyle = "#C8A46B"; g.lineWidth = 3; g.beginPath(); g.arc(104, y + 62, 30, 0, 7); g.stroke();
    g.fillStyle = "#C8A46B"; g.beginPath(); g.arc(104, y + 62, 7, 0, 7); g.fill();
    g.fillStyle = "#F3EDE4"; g.font = '500 34px Onest, sans-serif'; g.fillText(t, 158, y + 64); });
  g.globalAlpha = 1; scrTex.needsUpdate = true;
}
drawCard(); drawScreen(0);
Promise.all([d.fonts.load('500 54px "Playfair Display"'), d.fonts.load("500 34px Onest"), d.fonts.load("400 30px Onest")]).catch(() => {}).then(() => {
  const im = new Image(); im.onload = () => drawCard(im); im.onerror = () => drawCard(); im.src = "qr.svg"; scrK = -1; drawScreen(0);
});

// --- пылинки в свете ламп
const DN = mob ? 260 : 600, dp = new Float32Array(DN * 3), dv = new Float32Array(DN);
for (let i = 0; i < DN; i++) { dp[i * 3] = (rnd() - .5) * 16; dp[i * 3 + 1] = .8 + rnd() * 2.8; dp[i * 3 + 2] = 3 - rnd() * 21; dv[i] = .02 + rnd() * .05; }
const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
S.add(new THREE.Points(dg, new THREE.PointsMaterial({ ...add, color: "#f0d2a0", size: .03, opacity: .55 })));

// --- путь камеры
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const K = mob
  ? { t: [0, .32, .58, .76, 1], p: [V(0, 8.6, 11.5), V(3, 3.9, 5.2), V(.5, 1.6, 1.1), V(.14, 1.34, .56), V(.04, 1.3, .62)], l: [V(0, .3, -6), V(0, .6, -1.5), V(0, .72, .1), V(.02, .73, .12), V(0, .84, .22)] }
  : { t: [0, .32, .58, .76, 1], p: [V(0, 5.4, 8.2), V(3.6, 3, 4.2), V(.6, 1.3, .8), V(.22, 1.16, .42), V(.06, 1.16, .46)], l: [V(0, .7, -6), V(0, .6, -1.5), V(-.07, .78, .03), V(-.07, .79, .03), V(-.1, .92, .12)] };
const cP = new THREE.CatmullRomCurve3(K.p), cL = new THREE.CatmullRomCurve3(K.l), tg = new THREE.Vector3();
// плавное время пути: кривая через ключевые точки без остановок на стыках (монотонный кубический сплайн)
const KY = K.t.map((_, i) => i / (K.t.length - 1)), KD = K.t.slice(1).map((x, i) => (KY[i + 1] - KY[i]) / (x - K.t[i]));
const KM = K.t.map((_, i) => (i === 0 || i === K.t.length - 1) ? 0 : (KD[i - 1] + KD[i]) / 2);
function seg(p) { const t = K.t; let i = 0; while (i < t.length - 2 && p > t[i + 1]) i++;
  const h = t[i + 1] - t[i], k = (p - t[i]) / h, k2 = k * k, k3 = k2 * k;
  return (2 * k3 - 3 * k2 + 1) * KY[i] + (k3 - 2 * k2 + k) * h * KM[i] + (-2 * k3 + 3 * k2) * KY[i + 1] + (k3 - k2) * h * KM[i + 1]; }

function size() { const w = cv.clientWidth, h = cv.clientHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.fov = cam.aspect < .8 ? 56 : cam.aspect < 1.2 ? 48 : 40; cam.updateProjectionMatrix(); }
addEventListener("resize", size); size();

// --- кадр
const wins = caps.map((c) => c.dataset.w.split(",").map(Number));
let cur = 0, run = true, last = performance.now(), fN = -90, fT = 0;
const prog = () => { const r = hall.getBoundingClientRect(); return cl(-r.top / (hall.offsetHeight - innerHeight)); };
function frame(now) {
  const raw = (now - last) / 1000, dt = Math.min(.05, raw), time = now / 1000; last = now;
  // плавность важнее пикселей: если кадры не успевают, чуть снижаем разрешение
  if (++fN > 0) { fT += raw; if (fN === 45) { if (fT / fN > 1 / 42 && dpr > 1) { dpr = Math.max(1, dpr - .25); R.setPixelRatio(dpr); size(); } fN = 0; fT = 0; } }
  cur += (prog() - cur) * (1 - Math.exp(-dt * 3.6)); const p = cur;
  const u = seg(p); cP.getPoint(u, cam.position); cL.getPoint(u, tg);
  const sway = 1 - ss(.5, .8, p); cam.position.x += Math.sin(time * .23) * .25 * sway; cam.position.y += Math.sin(time * .31) * .1 * sway; cam.lookAt(tg);
  T.forEach((t) => { const k = ss(t.on, t.on + .05, p), w = p - t.on;
    if (t.c) t.c.material.emissiveIntensity = k * (1.8 + .5 * Math.sin(time * 2 + t.x));
    const near = t.hero ? 1 - ss(.55, .62, p) : 1;
    t.g.material.opacity = k * near; t.g.scale.setScalar(.15 + k * .55);
    const pulse = w > 0 && w < .08 ? w / .08 : ((time * .45 + t.x * .13 + t.z * .07) % 1);
    const ring = t.hero ? 0 : k; t.r.scale.setScalar(.04 + pulse * .6); t.r.material.opacity = ring * (1 - pulse) * .95; });
  // касание: телефон опускается на карточку, по столу расходится волна, экран загорается
  const down = ss(.56, .74, p), up = ss(.8, .97, p), tap = ss(.73, .76, p);
  phone.position.set(.02 - .01 * up, 1.35 - (1.35 - .787) * down + .145 * up, .42 - .39 * down + .1 * up);
  phone.rotation.set(.55 * (1 - down) + .62 * up, -.22 + .1 * (1 - down), 0);
  phone.visible = p > .5;
  const hw = ss(.74, .9, p); heroT.r.scale.setScalar(.03 + hw * .55); heroT.r.material.opacity = tap * (1 - hw) * .85;
  scrMat.color.setScalar(.06 + .94 * tap); drawScreen(ss(.76, .95, p));
  spot.intensity = 2.5 + 3 * ss(.3, .6, p);
  R.toneMappingExposure = 2 - .7 * ss(.45, .66, p);
  for (let i = 0; i < DN; i++) { dp[i * 3 + 1] += dv[i] * dt; dp[i * 3] += Math.sin(time * .3 + i) * dt * .02; if (dp[i * 3 + 1] > 3.6) dp[i * 3 + 1] = .8; }
  dg.attributes.position.needsUpdate = true;
  caps.forEach((c, i) => { const [a, b, e, f] = wins[i], v = (a === b ? 1 : ss(a, b, p)) * (1 - ss(e, f, p));
    c.style.opacity = v.toFixed(3); c.style.transform = `translateY(${((1 - v) * 24).toFixed(1)}px)`; c.style.visibility = v < .01 ? "hidden" : ""; });
  hint.style.opacity = (1 - ss(0, .04, p)).toFixed(3);
  fade.style.opacity = ss(.95, 1, p).toFixed(3);
  R.render(S, cam);
  if (run) requestAnimationFrame(frame);
}
new IntersectionObserver((e) => { const v = e[0].isIntersecting; if (v && !run) { run = true; last = performance.now(); fN = -30; fT = 0; requestAnimationFrame(frame); } run = v; }).observe(hall);
H.classList.add("gl-on");
requestAnimationFrame(frame);
