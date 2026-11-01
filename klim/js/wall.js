// Первый экран: готовая ванная. Прокрутка снимает плитку -> за стеной разводка -> по трубам идёт вода ->
// камера у коллекторного узла -> опрессовка на манометре -> плитка возвращается.
import * as THREE from "./three.module.min.js";

const d = document, H = d.documentElement, hall = d.getElementById("hall"), cv = d.getElementById("wall-c");
const caps = [...hall.querySelectorAll(".cap")], wins = caps.map((c) => c.dataset.w.split(",").map(Number));
const hint = hall.querySelector(".hint"), fade = hall.querySelector(".hall-fade"), barNum = hall.querySelector(".bar-num");
const cl = (x) => Math.min(1, Math.max(0, x)), ss = (a, b, x) => { x = cl((x - a) / (b - a)); return x * x * (3 - 2 * x); };
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

let R;
try { R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" }); }
catch (e) { H.classList.add("nogl"); throw e; }
R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
const ANI = Math.min(8, R.capabilities.getMaxAnisotropy());

const S = new THREE.Scene(), BG = new THREE.Color("#0b0c0e");
S.background = BG; S.fog = new THREE.Fog(BG, 6, 15);
const cam = new THREE.PerspectiveCamera(38, 1, .03, 40);

// --- окружение для отражений в хроме и нержавейке
{
  const pm = new THREE.PMREMGenerator(R), es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(.05, .05, .055), side: THREE.BackSide })));
  const lp = (c, x, y, z, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
  lp(new THREE.Color(6, 5.4, 4.6), 0, 8, 2, 8, 2); lp(new THREE.Color(1.2, 1.3, 1.6), -8, 2, 4, 3, 6); lp(new THREE.Color(2.2, 1.6, 1.1), 8, 1, 3, 2, 5);
  S.environment = pm.fromScene(es, .04).texture; pm.dispose();
}

// --- текстуры на canvas
function can(w, h) { const c = d.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANI; return t; }
const CONCRETE = (() => { const [c, g] = can(1024, 512); g.fillStyle = "#56544f"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 9000; i++) { const l = 60 + rnd() * 50; g.fillStyle = `rgba(${l},${l - 2},${l - 6},${.25 + rnd() * .3})`; g.fillRect(rnd() * 1024, rnd() * 512, 1 + rnd() * 2, 1 + rnd() * 2); }
  for (let i = 0; i < 40; i++) { const r = g.createRadialGradient(0, 0, 0, 0, 0, 60 + rnd() * 120); r.addColorStop(0, `rgba(30,28,26,${.12 + rnd() * .12})`); r.addColorStop(1, "rgba(30,28,26,0)");
    g.save(); g.translate(rnd() * 1024, rnd() * 512); g.fillStyle = r; g.fillRect(-200, -200, 400, 400); g.restore(); }
  g.strokeStyle = "rgba(20,20,18,.35)"; g.lineWidth = 2; for (let y = 120; y < 512; y += 170) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y + 4); g.stroke(); }
  // разметка карандашом, как на объектах
  g.fillStyle = "rgba(25,25,25,.55)"; g.font = "22px sans-serif"; g.fillText("ГВС", 760, 300); g.fillText("ХВС", 820, 300); g.fillText("1100", 170, 210);
  return tex(c); })();
const MARBLE = (() => { const [c, g] = can(2048, 1024); g.fillStyle = "#262522"; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 26000; i++) { const l = 30 + rnd() * 26; g.fillStyle = `rgba(${l},${l - 2},${l - 5},.35)`; g.fillRect(rnd() * 2048, rnd() * 1024, 2, 2); }
  g.filter = "blur(1.2px)";
  for (let i = 0; i < 24; i++) { g.strokeStyle = `rgba(${200 + rnd() * 40},${170 + rnd() * 30},${120 + rnd() * 30},${.06 + rnd() * .22})`; g.lineWidth = .8 + rnd() * 3.4;
    let x = rnd() * 2048, y = rnd() * 1024; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { const nx = x + 120 + rnd() * 260, ny = y + (rnd() - .35) * 220; g.bezierCurveTo(x + 60, y + (rnd() - .5) * 140, nx - 60, ny + (rnd() - .5) * 140, nx, ny); x = nx; y = ny; }
    g.stroke(); }
  g.filter = "none";
  return tex(c); })();
const PLATE = (() => { const [c, g] = can(256, 256); g.fillStyle = "#3b3d41"; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) for (let x = (y / 32) % 2 * 16; x < 256; x += 32) { g.save(); g.translate(x + 8, y + 8); g.rotate(((x + y) / 32) % 2 ? .8 : -.8);
    g.fillStyle = "rgba(255,255,255,.16)"; g.fillRect(-11, -2.5, 22, 5); g.restore(); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 4); return t; })();
const FLOOR = (() => { const [c, g] = can(512, 512); g.fillStyle = "#18191b"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * .04})`; g.fillRect(rnd() * 512, rnd() * 512, 2, 2); }
  g.fillStyle = "rgba(255,255,255,.06)"; g.font = "bold 40px sans-serif"; g.fillText("ЗВУКОИЗОЛ", 40, 180); g.fillText("ГИДРО", 260, 420);
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2); return t; })();
const GAUGE = (() => { const [c, g] = can(512, 512); g.fillStyle = "#f4f1ea"; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill();
  g.translate(256, 256); g.strokeStyle = "#c33"; g.lineWidth = 22; g.beginPath(); g.arc(0, 0, 200, Math.PI * .75 + Math.PI * 1.5 * 12 / 16, Math.PI * 2.25); g.stroke();
  g.fillStyle = "#1c1c1c"; g.font = "600 38px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  for (let i = 0; i <= 16; i++) { const a = Math.PI * .75 + Math.PI * 1.5 * i / 16; g.save(); g.rotate(a); g.fillRect(170, -2.5, i % 2 ? 22 : 38, i % 2 ? 4 : 6); g.restore();
    if (i % 2 === 0) g.fillText(i, Math.cos(a) * 128, Math.sin(a) * 128); }
  g.font = "500 34px sans-serif"; g.fillText("bar", 0, 80); g.font = "400 22px sans-serif"; g.fillStyle = "#777"; g.fillText("ОПРЕССОВКА", 0, 120);
  return tex(c); })();

// --- материалы
const M = {
  concrete: new THREE.MeshStandardMaterial({ map: CONCRETE, roughness: .95 }),
  floor: new THREE.MeshStandardMaterial({ map: FLOOR, roughness: .9 }),
  steel: new THREE.MeshStandardMaterial({ color: "#d9dde2", metalness: 1, roughness: .22 }),
  chrome: new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 1, roughness: .06 }),
  brass: new THREE.MeshStandardMaterial({ color: "#c79a4a", metalness: 1, roughness: .3 }),
  plate: new THREE.MeshStandardMaterial({ map: PLATE, metalness: .8, roughness: .45 }),
  red: new THREE.MeshStandardMaterial({ color: "#c8231c", roughness: .5 }),
  blue: new THREE.MeshStandardMaterial({ color: "#1f5fd6", roughness: .5 }),
  yellow: new THREE.MeshStandardMaterial({ color: "#f2c21b", roughness: .45 }),
  grey: new THREE.MeshStandardMaterial({ color: "#8d9096", roughness: .7 }),
  galv: new THREE.MeshStandardMaterial({ color: "#a7abb0", metalness: .7, roughness: .5 }),
  white: new THREE.MeshStandardMaterial({ color: "#f7f6f3", roughness: .18, transparent: true }),
  filter: new THREE.MeshStandardMaterial({ color: "#c9ced4", metalness: .9, roughness: .3 }),
};
const add = (geo, mat, x, y, z, parent = S) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
const cylY = (r, h, mat, x, y, z, p) => add(new THREE.CylinderGeometry(r, r, h, 24), mat, x, y, z, p);
const cylX = (r, h, mat, x, y, z, p) => { const m = cylY(r, h, mat, x, y, z, p); m.rotation.z = Math.PI / 2; return m; };
const cylZ = (r, h, mat, x, y, z, p) => { const m = cylY(r, h, mat, x, y, z, p); m.rotation.x = Math.PI / 2; return m; };

// --- помещение: бетонная стена 6 x 3 м, пол, боковые стены
add(new THREE.PlaneGeometry(6.4, 3.2), M.concrete, 0, 1.6, 0);
const fl = add(new THREE.PlaneGeometry(6.4, 5), M.floor, 0, 0, 2.5); fl.rotation.x = -Math.PI / 2;
const side = new THREE.MeshStandardMaterial({ color: "#2a2927", roughness: .95 });
const wl = add(new THREE.PlaneGeometry(5, 3.2), side, -3.2, 1.6, 2.5); wl.rotation.y = Math.PI / 2;
const wr = add(new THREE.PlaneGeometry(5, 3.2), side, 3.2, 1.6, 2.5); wr.rotation.y = -Math.PI / 2;

// --- коллекторный узел в нише: панель из рифлёной стали, фильтры, гребёнки, краны Neptun, манометр
const NX = 2.05, NODE = new THREE.Group(); S.add(NODE);
add(new THREE.BoxGeometry(1.05, 1.4, .02), M.plate, NX, 1.45, .01, NODE);
[-.26, .26].forEach((dx) => { // фильтры
  cylY(.075, .32, M.filter, NX + dx, 1.82, .1, NODE); cylY(.05, .06, M.steel, NX + dx, 2.01, .1, NODE);
  cylY(.016, .5, M.steel, NX + dx, 1.42, .1, NODE); });
cylY(.018, .55, M.steel, NX + .46, .3, .1, NODE); cylY(.018, 1.75, M.steel, NX + .46, 1.16, .1, NODE); // стояк ХВС
cylX(.018, .2, M.steel, NX + .36, 2.04, .1, NODE); cylX(.018, .2, M.steel, NX - .36, 2.04, .1, NODE);
cylY(.018, 2.04, M.steel, NX - .46, 1.02, .1, NODE); // стояк ГВС
const OUT = [-.32, -.16, 0, .16, .32];
[[1.32, M.blue], [1.12, M.red]].forEach(([y, cap], row) => {
  cylX(.03, .78, M.steel, NX, y, .11, NODE);
  OUT.forEach((dx, i) => { cylZ(.018, .07, M.steel, NX + dx, y, .15, NODE); const hnd = add(new THREE.BoxGeometry(.05, .02, .03), cap, NX + dx, y, .19, NODE); hnd.rotation.z = .4; });
  const nep = add(new THREE.BoxGeometry(.09, .08, .07), M.yellow, NX - .44 + row * .88, y, .13, NODE); nep.userData.neptun = true;
});
// манометр
const gauge = new THREE.Group(); gauge.position.set(NX, 2.12, .12); NODE.add(gauge);
cylZ(.085, .04, M.chrome, 0, 0, 0, gauge);
const face = add(new THREE.CircleGeometry(.075, 48), new THREE.MeshBasicMaterial({ map: GAUGE }), 0, 0, .021, gauge);
const needle = new THREE.Mesh(new THREE.BoxGeometry(.006, .062, .002), new THREE.MeshBasicMaterial({ color: "#b0121a" }));
needle.geometry.translate(0, .024, 0); needle.position.z = .024; gauge.add(needle);
cylY(.012, .06, M.steel, 0, -.11, 0, gauge);
const nodeLight = new THREE.PointLight("#ffd9a8", 0, 2.6, 1.6); nodeLight.position.set(NX, 1.6, .9); S.add(nodeLight);

// --- инсталляция TECE, смеситель скрытого монтажа, выводы под раковину, канализация
const IX = .45;
[-.2, .2].forEach((dx) => add(new THREE.BoxGeometry(.04, 1.15, .04), M.red, IX + dx, .575, .08));
add(new THREE.BoxGeometry(.44, .04, .04), M.red, IX, 1.13, .08); add(new THREE.BoxGeometry(.44, .04, .04), M.red, IX, .2, .08);
add(new THREE.BoxGeometry(.34, .36, .12), M.grey, IX, .92, .1);
cylZ(.055, .16, M.white, IX, .23, .14).material = M.grey;
add(new THREE.BoxGeometry(.26, .2, .06), M.galv, -1.85, 1.12, .05); add(new THREE.BoxGeometry(.12, .1, .06), M.brass, -1.85, 1.12, .09);
[-.07, .07].forEach((dx) => { add(new THREE.BoxGeometry(.05, .05, .05), M.brass, -.75 + dx, .62, .07); });
const sewer = new THREE.CurvePath(); sewer.add(new THREE.LineCurve3(new THREE.Vector3(IX, .23, .14), new THREE.Vector3(IX, .08, .14)));
sewer.add(new THREE.LineCurve3(new THREE.Vector3(IX, .08, .14), new THREE.Vector3(2.95, .08, .14)));
add(new THREE.TubeGeometry(sewer, 40, .055, 16), M.grey, 0, 0, 0);

// --- разводка в изоляции: по трубам пускаем воду шейдером (холодная синяя, горячая медная)
function routed(pts, r = .07) {
  const P = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2] ?? .07)), path = new THREE.CurvePath();
  let prev = P[0];
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i], c = P[i + 1];
    if (!c) { path.add(new THREE.LineCurve3(prev, b)); break; }
    const ab = b.clone().sub(a), bc = c.clone().sub(b), r1 = Math.min(r, ab.length() / 2), r2 = Math.min(r, bc.length() / 2);
    const p1 = b.clone().sub(ab.normalize().multiplyScalar(r1)), p2 = b.clone().add(bc.normalize().multiplyScalar(r2));
    path.add(new THREE.LineCurve3(prev, p1)); path.add(new THREE.QuadraticBezierCurve3(p1, b, p2)); prev = p2;
  }
  return path;
}
const VS = `varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const FS = `uniform float uT, uOn, uLen; uniform vec3 uCol; varying vec2 vUv; varying vec3 vN;
void main(){
  float l = .35 + .65 * max(dot(vN, normalize(vec3(.2, .7, 1.))), 0.);
  vec3 base = vec3(.032, .032, .036) * l + vec3(.05) * pow(max(dot(vN, vec3(0., .6, .8)), 0.), 12.);
  float front = uOn * 1.08, filled = 1. - smoothstep(front - .015, front, vUv.x);
  float pulse = pow(.5 + .5 * sin(vUv.x * uLen * 7. - uT * 6.), 8.);
  float rim = pow(1. - abs(dot(vN, vec3(0., 0., 1.))), 2.);
  vec3 c = base + uCol * filled * (.18 + .55 * rim + 1.6 * pulse) + uCol * smoothstep(.05, 0., abs(vUv.x - front)) * 2.5 * step(uOn, .99);
  gl_FragColor = vec4(c, 1.);
}`;
const COLD = new THREE.Color("#3e8bff"), HOT = new THREE.Color("#ff7a2e");
const LINES = [];
function line(pts, hot, start) {
  const path = routed(pts), len = path.getLength();
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { uT: { value: 0 }, uOn: { value: 0 }, uLen: { value: len }, uCol: { value: hot ? HOT : COLD } } });
  S.add(new THREE.Mesh(new THREE.TubeGeometry(path, Math.ceil(len * 40), .024, 10), mat));
  // цветные кольца маркировки, как на трубах с объекта
  for (let k = .08; k < .95; k += .3) { const p = path.getPointAt(k), t = path.getTangentAt(k);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.025, .004, 6, 18), hot ? M.red : M.blue); ring.position.copy(p); ring.lookAt(p.clone().add(t)); S.add(ring); }
  LINES.push({ mat, start });
}
const by = .78; // выход из узла
line([[NX - .32, by + .34, .15], [NX - .32, .34], [-1.92, .34], [-1.92, 1.06, .07]], false, 0);
line([[NX - .16, by + .34 - .2, .15], [NX - .16, .42], [-1.78, .42], [-1.78, 1.06, .07]], true, .04);
line([[NX, by + .34, .15], [NX, .5], [-.82, .5], [-.82, .6, .07]], false, .08);
line([[NX + .16, by + .34 - .2, .15], [NX + .16, .58], [-.68, .58], [-.68, .6, .07]], true, .12);
line([[NX + .32, by + .34, .15], [NX + .32, .66], [IX + .1, .66], [IX + .1, .86, .1]], false, .16);

// --- готовая отделка: плитка 600 x 600 и сантехника перед ней
const TW = .6, COLS = 10, ROWS = 5, TILES = [];
const tileMat = new THREE.MeshStandardMaterial({ map: MARBLE, roughness: .1, metalness: 0, side: THREE.DoubleSide });
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  const g = new THREE.PlaneGeometry(TW - .006, TW - .006), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (c + uv.getX(i)) / COLS, (r + uv.getY(i)) / ROWS);
  const mat = tileMat.clone(); mat.transparent = true;
  const m = new THREE.Mesh(g, mat), x = -3 + TW / 2 + c * TW, y = TW / 2 + r * TW; m.position.set(x, y, .26); S.add(m);
  const dist = Math.hypot(x - NX, y - 1.45) / 5.2; // плитка снимается волной от узла
  TILES.push({ m, x, y, delay: cl(dist * .8 + rnd() * .2), spin: (rnd() - .5) * 2.4, drift: (rnd() - .5) * .6 });
}
const FIX = new THREE.Group(); FIX.position.z = .06; S.add(FIX);
const fixMats = [];
const fm = (m) => { const c = m.clone(); c.transparent = true; fixMats.push(c); return c; };
{ const ch = fm(M.chrome), wh = fm(M.white);
  add(new THREE.CylinderGeometry(.16, .16, .015, 48), ch, -1.85, 2.32, .45, FIX);           // тропический душ
  cylZ(.012, .25, ch, -1.85, 2.4, .32, FIX); cylY(.012, .1, ch, -1.85, 2.35, .44, FIX);
  cylZ(.035, .05, ch, -1.85, 1.12, .23, FIX); add(new THREE.BoxGeometry(.012, .09, .012), ch, -1.85, 1.16, .26, FIX);
  const bowl = add(new THREE.CapsuleGeometry(.18, .22, 8, 24), wh, IX, .42, .44, FIX); bowl.rotation.x = Math.PI / 2; bowl.scale.set(1, 1.2, .78);
  add(new THREE.BoxGeometry(.22, .15, .01), wh, IX, .98, .205, FIX); add(new THREE.BoxGeometry(.07, .1, .005), ch, IX - .045, .98, .212, FIX); add(new THREE.BoxGeometry(.07, .1, .005), ch, IX + .045, .98, .212, FIX);
  add(new THREE.BoxGeometry(.62, .12, .42), wh, -.75, .84, .41, FIX);                        // раковина
  cylY(.012, .14, ch, -.75, .96, .3, FIX); cylZ(.01, .12, ch, -.75, 1.03, .35, FIX); }

// --- свет
const led = add(new THREE.BoxGeometry(6, .015, .02), fm(new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 1.4) })), 0, 3.05, .32, FIX);
const ledLight = new THREE.PointLight("#ffc98a", 6, 4, 1.4); ledLight.position.set(0, 2.9, .9); S.add(ledLight);
S.add(new THREE.HemisphereLight("#cfd6e2", "#2a2420", .35));
const key = new THREE.SpotLight("#ffe6c4", 40, 14, .7, .6, 1.4); key.position.set(-.6, 4.2, 4.5); key.target.position.set(0, 1.2, 0); S.add(key, key.target);
const rim = new THREE.PointLight("#9cc4ff", 2, 6, 1.5); rim.position.set(-2.8, 2.6, 1.6); S.add(rim);

// пылинки в луче света
const DN = 160, dg = new THREE.BufferGeometry(), dp = new Float32Array(DN * 3), dv = new Float32Array(DN);
for (let i = 0; i < DN; i++) { dp.set([(rnd() - .5) * 6, rnd() * 3, .4 + rnd() * 4], i * 3); dv[i] = .02 + rnd() * .05; }
dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: "#ffe2b8", size: .012, transparent: true, opacity: .55, depthWrite: false })); S.add(dust);

// --- камера: ключевые кадры по прокрутке
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const KEYS = [
  [0, V(0, 1.55, 7.4), V(0, 1.35, 0)],
  [.12, V(-.2, 1.5, 6.8), V(0, 1.35, 0)],
  [.34, V(.4, 1.45, 5.6), V(.2, 1.2, 0)],
  [.48, V(-1.1, .95, 3.4), V(-.4, .6, 0)],
  [.6, V(1.35, 1.55, 2.5), V(NX, 1.45, 0)],
  [.7, V(NX, 2.12, .95), V(NX, 2.12, .1)],
  [.8, V(NX, 2.12, .62), V(NX, 2.12, .1)],
  [.9, V(.3, 1.55, 6.6), V(0, 1.35, 0)],
  [1, V(0, 1.55, 7.4), V(0, 1.35, 0)],
];
const cp = V(0, 0, 0), ct = V(0, 0, 0);
function camAt(p) {
  let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
  const [a, pa, ta] = KEYS[i], [b, pb, tb] = KEYS[i + 1], k = ss(a, b, p);
  cp.lerpVectors(pa, pb, k); ct.lerpVectors(ta, tb, k);
}

function size() {
  const w = innerWidth, h = innerHeight; R.setSize(w, h, false); cam.aspect = w / h;
  cam.fov = w / h < 1 ? Math.min(78, 38 / (w / h) * .72) : 38; cam.updateProjectionMatrix();
}
addEventListener("resize", size); size();

let run = false, last = performance.now(), time = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; time += dt;
  // 3D идёт первую треть прокрутки (до подлёта к узлу), дальше сцену сменяют реальные кадры
  const r = hall.getBoundingClientRect(), pr = cl(-r.top / (r.height - innerHeight)), p = Math.min(1, pr / .34 * .62);

  camAt(p);
  const sway = 1 - ss(.62, .7, p) * (1 - ss(.82, .88, p));
  cam.position.copy(cp); cam.position.x += Math.sin(time * .4) * .03 * sway; cam.position.y += Math.sin(time * .3) * .02 * sway; cam.lookAt(ct);

  // плитка: снимается волной (0.12-0.34), возвращается (0.86-0.98)
  TILES.forEach((t) => {
    const out = ss(.12 + t.delay * .14, .2 + t.delay * .14, p), back = ss(.86 + t.delay * .08, .9 + t.delay * .08, p), k = out * (1 - back);
    t.m.position.set(t.x + t.drift * k, t.y - 1.3 * k * k, .26 + 2.4 * k);
    t.m.rotation.set(t.spin * k * 1.4, t.spin * k * .8, t.spin * k * .5);
    t.m.material.opacity = 1 - ss(.45, .9, k); t.m.visible = k < .99;
  });
  const fx = 1 - ss(.1, .18, p) + ss(.95, 1, p); fixMats.forEach((m) => { m.opacity = cl(fx); m.transparent = true; }); FIX.visible = fx > .01; ledLight.intensity = 6 * cl(fx);

  // вода идёт по трубам 0.36-0.55
  LINES.forEach((l) => { l.mat.uniforms.uOn.value = ss(.36 + l.start, .5 + l.start, p); l.mat.uniforms.uT.value = time; });
  const flow = ss(.36, .55, p);
  nodeLight.intensity = 3 * flow * (1 - ss(.9, 1, p));

  // опрессовка: стрелка до 10 бар
  const bar = 10 * ss(.7, .8, p);
  // угол деления на циферблате (canvas, по часовой) -> поворот стрелки, смотрящей вверх
  needle.rotation.z = -(Math.PI * .75 + Math.PI * 1.5 * bar / 16) - Math.PI / 2;
  if (barNum) barNum.textContent = bar.toFixed(1).replace(".", ",");

  key.intensity = 40 - 22 * ss(.14, .3, p) + 22 * ss(.88, 1, p);
  R.toneMappingExposure = 1.05 + .25 * flow * (1 - ss(.88, 1, p));

  for (let i = 0; i < DN; i++) { dp[i * 3 + 1] += dv[i] * dt; dp[i * 3] += Math.sin(time * .3 + i) * dt * .02; if (dp[i * 3 + 1] > 3) dp[i * 3 + 1] = 0; }
  dg.attributes.position.needsUpdate = true;

  caps.forEach((c, i) => { const [a, b, e, f] = wins[i], v = (a === b ? 1 : ss(a, b, pr)) * (1 - ss(e, f, pr));
    c.style.opacity = v.toFixed(3); c.style.transform = `translateY(${((1 - v) * 24).toFixed(1)}px)`; c.style.visibility = v < .01 ? "hidden" : ""; });
  hint.style.opacity = (1 - ss(0, .02, pr)).toFixed(3);
  fade.style.opacity = ss(.97, 1, pr).toFixed(3);

  if (pr < .36) R.render(S, cam);
  if (run) requestAnimationFrame(frame);
}
new IntersectionObserver((e) => { const v = e[0].isIntersecting; if (v && !run) { run = true; last = performance.now(); requestAnimationFrame(frame); } run = v; }).observe(hall);
H.classList.add("gl-on");
requestAnimationFrame(frame);
