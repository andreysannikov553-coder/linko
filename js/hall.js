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
const SOFT = (() => { const [c, g] = can(256, 256), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  [[0, .85], [.25, .55], [.5, .22], [.75, .06], [1, 0]].forEach(([k, a]) => r.addColorStop(k, `rgba(255,214,160,${a})`));
  g.fillStyle = r; g.fillRect(0, 0, 256, 256); return tex(c); })();
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
  T.push({ x: hero ? 0 : x + (rnd() - .5) * .6, z: hero ? 0 : z + (rnd() - .5) * .6, a: hero ? Math.PI / 2 : rnd() * Math.PI, hero }); }));
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
inst(new THREE.PlaneGeometry(1.3, 1.3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ ...add, map: SOFT, color: "#ffc078", opacity: .75 }), n - 1, (t, w) => { if (!t.hero) { at(t.x, .777, t.z); w(); } });
inst(new THREE.PlaneGeometry(3.6, 3.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ ...add, map: SOFT, color: "#ffa860", opacity: .45 }), n, (t, w) => { at(t.x, .003, t.z); w(); });
T.forEach((t) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ ...add, color: "#ffcf8a", opacity: 1, fog: true })); s.position.set(t.x, LY + .01, t.z); s.scale.setScalar(.95); S.add(s); });
// живой свет над ближними столами
T.filter((t) => t.z > -7 && Math.abs(t.x) < 4).forEach((t) => {
  const p = new THREE.PointLight("#ffc98e", t.hero ? 0 : 3.6, 4, 2); p.position.set(t.x, LY - .05, t.z); S.add(p); });
const spot = new THREE.SpotLight("#ffd29a", 9, 4, .62, .75, 2);
spot.position.set(0, LY - .02, 0); spot.target.position.set(0, .75, 0); spot.castShadow = true;
spot.shadow.mapSize.set(2048, 2048); spot.shadow.radius = 5; spot.shadow.bias = -.0004; spot.shadow.normalBias = .002; spot.shadow.camera.near = .25; spot.shadow.camera.far = 2.2; S.add(spot, spot.target);
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
  t.g = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ ...add, map: SOFT, color: "#f2c77e", opacity: 0 }));
  t.g.position.set(t.cx, .7783, t.cz); S.add(t.g);
  t.r = new THREE.Mesh(new THREE.RingGeometry(.93, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#e6c27f", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  t.r.position.set(t.cx, .7785, t.cz); S.add(t.r);
  if (!t.hero) { const c = new THREE.Mesh(new THREE.BoxGeometry(.086, .003, .054), new THREE.MeshStandardMaterial({ color: "#100d0a", roughness: .4, metalness: .3, emissive: "#c8a46b", emissiveIntensity: 0 }));
    c.position.set(t.cx, .7765, t.cz); c.rotation.y = t.a; S.add(c); t.c = c; }
});
const heroT = T.find((t) => t.hero); heroT.on = .5; heroT.r.visible = false;

// --- карточка героя и телефон
const [cc, cg] = can(1024, 644);
const [sc, sg] = can(720, 1530);
const cardTex = tex(cc), scrTex = tex(sc);
const card = new THREE.Mesh(new THREE.BoxGeometry(.086, .0025, .054), [iron, iron, new THREE.MeshStandardMaterial({ map: cardTex, roughness: .35, metalness: .2 }), iron, iron, iron]);
card.position.set(0, .7765, .06); card.rotation.y = -.22; card.castShadow = card.receiveShadow = true; S.add(card);

// отражения для металла и стекла: маленькая «комната» с лампами
const ENV = (() => { const es = new THREE.Scene(), hdr = (c, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide });
  es.add(new THREE.Mesh(new THREE.BoxGeometry(20, 8, 20), new THREE.MeshBasicMaterial({ color: "#1a120c", side: THREE.BackSide })));
  [[-3, 3.5, -2], [2, 3.6, 1], [0, 3.8, -5], [5, 3.4, -3], [-5, 3.5, 3]].forEach(([x, y, z]) => { const m = new THREE.Mesh(new THREE.CircleGeometry(.6, 24), hdr("#ffcf8f", 9)); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); });
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(14, .5), hdr("#ffb870", 4)); bar.position.set(0, 1.2, -9.5); es.add(bar);
  const soft = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), hdr("#fff1dc", 1.4)); soft.position.set(-6, 2, 6); soft.lookAt(0, 0, 0); es.add(soft);
  const pm = new THREE.PMREMGenerator(R), t = pm.fromScene(es, .03).texture; pm.dispose(); return t; })();
wood.envMap = ENV; wood.envMapIntensity = .35;
card.material[2].envMap = ENV; card.material[2].envMapIntensity = .6;

function rrShape(w, h, r) { const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0); s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI); s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5); return s; }
const PW = .0716, PH = .1476, PD = .0058, PB = .001;
const glassM = new THREE.MeshPhysicalMaterial({ color: "#050506", roughness: .08, metalness: 0, clearcoat: 1, clearcoatRoughness: .05, envMap: ENV, envMapIntensity: 1.1 });
const frameM = new THREE.MeshStandardMaterial({ color: "#a89c8c", roughness: .3, metalness: 1, envMap: ENV, envMapIntensity: 1.25 });
const body = new THREE.Mesh(new THREE.ExtrudeGeometry(rrShape(PW, PH, .0105), { depth: PD, bevelEnabled: true, bevelThickness: PB, bevelSize: .0009, bevelSegments: 5, curveSegments: 28 }), [glassM, frameM]);
body.rotation.x = -Math.PI / 2; body.position.y = -(PD + PB); body.castShadow = true;
function flatUV(geo, w, h) { const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5); uv.needsUpdate = true; return geo; }
const SW = .0676, SH = .1436;
const scrMat = new THREE.MeshBasicMaterial({ map: scrTex, color: "#000", toneMapped: false });
const scr = new THREE.Mesh(flatUV(new THREE.ShapeGeometry(rrShape(SW, SH, .0088), 24), SW, SH), scrMat); scr.rotation.x = -Math.PI / 2; scr.position.y = .00012;
// блик стекла поверх экрана
const glare = new THREE.Mesh(scr.geometry, new THREE.MeshStandardMaterial({ color: "#000", roughness: .05, metalness: 0, envMap: ENV, envMapIntensity: 1.1, transparent: true, opacity: .3, depthWrite: false, blending: THREE.AdditiveBlending }));
glare.rotation.x = -Math.PI / 2; glare.position.y = .00025;
const phone = new THREE.Group(); phone.add(body, scr, glare); S.add(phone);
[[-1, -.0455, .0135], [-1, -.0295, .0135], [-1, -.063, .007], [1, -.04, .021]].forEach(([sd, z, l]) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(.0011, .0024, l), frameM); b.position.set(sd * (PW / 2 + .0011), -(PD + PB) / 2 - PB / 2, z); phone.add(b); });
// свет экрана на стол и мягкая вспышка в момент касания
const scrLight = new THREE.PointLight("#dce6d4", 0, .6, 2); scrLight.position.set(0, .07, 0); phone.add(scrLight);
const tapGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ ...add, map: SOFT, color: "#f5cf8c", opacity: 0 }));
tapGlow.position.set(.02, .7784, .03); S.add(tapGlow);

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
const ICONS = { menu: "M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5M17 21V3c-2.5 1.5-3.5 4-3.5 7.5S15 14 17 14", bell: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5zM10 20.5a2 2 0 0 0 4 0",
  bill: "M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21zM9 8h6M9 12h6M9 16h3", star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" };
const rows4 = [["menu", "Меню", "блюда, фото и цены"], ["bell", "Позвать официанта", "подойдёт к столу 7"], ["bill", "Попросить счёт", "картой или наличными"], ["star", "Оставить отзыв", "на Яндекс Картах"]];
let scrK = -1;
function drawScreen(k) {
  const q = Math.round(k * 90) / 90; if (q === scrK) return; scrK = q;
  const g = sg, W = 540, Hh = 1147; g.setTransform(4 / 3, 0, 0, 4 / 3, 0, 0); g.fillStyle = "#0D0B09"; g.fillRect(0, 0, W, Hh);
  const bg = g.createRadialGradient(270, 210, 0, 270, 210, 560); bg.addColorStop(0, "rgba(22,44,34,.95)"); bg.addColorStop(1, "rgba(13,11,9,0)"); g.fillStyle = bg; g.fillRect(0, 0, W, Hh);
  // строка состояния и вырез камеры
  g.textBaseline = "middle"; g.fillStyle = "#F3EDE4"; g.font = "600 27px Onest, sans-serif"; g.textAlign = "left"; g.fillText("21:47", 54, 52);
  g.fillStyle = "#000"; rr(g, 205, 30, 130, 40, 20); g.fill();
  g.fillStyle = "#F3EDE4"; [0, 1, 2, 3].forEach((i) => { rr(g, 386 + i * 9, 60 - 6 - i * 4, 6, 8 + i * 4, 1.5); g.fill(); });
  g.strokeStyle = "rgba(243,237,228,.55)"; g.lineWidth = 2; rr(g, 434, 42, 46, 21, 6); g.stroke(); g.fillStyle = "#F3EDE4"; rr(g, 437, 45, 31, 15, 3.5); g.fill(); rr(g, 482, 48, 3, 9, 1.5); g.fill();
  const a = ss(0, .3, q), lift = (1 - a) * 22; g.globalAlpha = a; g.textAlign = "center";
  g.strokeStyle = "#C8A46B"; g.lineWidth = 3.2; rr(g, 228, 128 + lift, 48, 38, 19); g.stroke(); rr(g, 264, 128 + lift, 48, 38, 19); g.stroke();
  g.fillStyle = "#C8A46B"; g.font = "500 19px Onest, sans-serif"; g.letterSpacing = "7px"; g.fillText("СТОЛ 7", 273, 206 + lift); g.letterSpacing = "0px";
  g.fillStyle = "#F3EDE4"; g.font = '500 54px "Playfair Display", Georgia, serif'; g.fillText("Добрый вечер", 270, 268 + lift);
  g.fillStyle = "#A69D90"; g.font = "400 24px Onest, sans-serif"; g.fillText("Чем можем помочь?", 270, 318 + lift);
  g.textAlign = "left";
  rows4.forEach(([ic, t, sub], i) => { const v = ss(.18 + i * .13, .42 + i * .13, q), y = 382 + i * 146 + (1 - v) * 34; g.globalAlpha = v;
    g.fillStyle = "rgba(30,27,22,.96)"; rr(g, 34, y, 472, 124, 28); g.fill(); g.strokeStyle = "rgba(200,164,107,.28)"; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = "rgba(200,164,107,.13)"; g.beginPath(); g.arc(100, y + 62, 34, 0, 7); g.fill();
    g.save(); g.translate(82, y + 44); g.scale(1.5, 1.5); g.strokeStyle = "#D9B97E"; g.lineWidth = 1.5; g.lineCap = g.lineJoin = "round"; g.stroke(new Path2D(ICONS[ic])); g.restore();
    g.fillStyle = "#F3EDE4"; g.font = "500 29px Onest, sans-serif"; g.fillText(t, 154, y + 50);
    g.fillStyle = "#8F8578"; g.font = "400 21px Onest, sans-serif"; g.fillText(sub, 154, y + 84);
    g.strokeStyle = "#6f665b"; g.lineWidth = 2.6; g.beginPath(); g.moveTo(472, y + 50); g.lineTo(484, y + 62); g.lineTo(472, y + 74); g.stroke(); });
  g.globalAlpha = 1; g.fillStyle = "rgba(243,237,228,.45)"; rr(g, 200, 1112, 140, 6, 3); g.fill();
  scrTex.needsUpdate = true;
}
drawCard(); drawScreen(0);
Promise.all([d.fonts.load('500 54px "Playfair Display"'), d.fonts.load("500 34px Onest"), d.fonts.load("400 30px Onest")]).catch(() => {}).then(() => {
  const im = new Image(); im.onload = () => drawCard(im); im.onerror = () => drawCard(); im.src = "qr.svg"; scrK = -1; drawScreen(0);
});

// --- пылинки в свете ламп
const DN = mob ? 260 : 600, dp = new Float32Array(DN * 3), dv = new Float32Array(DN);
for (let i = 0; i < DN; i++) { dp[i * 3] = (rnd() - .5) * 16; dp[i * 3 + 1] = .8 + rnd() * 2.8; dp[i * 3 + 2] = 3 - rnd() * 21; dv[i] = .02 + rnd() * .05; }
const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
S.add(new THREE.Points(dg, new THREE.PointsMaterial({ ...add, color: "#f0d2a0", size: .02, opacity: .5 })));

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
const SNAP = /[?&]snap/.test(location.search); // для проверки кадров: без инерции
let cur = 0, run = true, last = performance.now(), fN = -90, fT = 0;
const prog = () => { const r = hall.getBoundingClientRect(); return cl(-r.top / (hall.offsetHeight - innerHeight)); };
function frame(now) {
  const raw = (now - last) / 1000, dt = Math.min(.05, raw), time = now / 1000; last = now;
  // плавность важнее пикселей: если кадры не успевают, чуть снижаем разрешение
  if (++fN > 0) { fT += raw; if (fN === 45) { if (fT / fN > 1 / 42 && dpr > 1) { dpr = Math.max(1, dpr - .25); R.setPixelRatio(dpr); size(); } fN = 0; fT = 0; } }
  cur = SNAP ? prog() : cur + (prog() - cur) * (1 - Math.exp(-dt * 2.6)); const p = cur;
  const u = seg(p); cP.getPoint(u, cam.position); cL.getPoint(u, tg);
  const sway = 1 - ss(.5, .8, p); cam.position.x += Math.sin(time * .23) * .25 * sway; cam.position.y += Math.sin(time * .31) * .1 * sway; cam.lookAt(tg);
  T.forEach((t) => { const k = ss(t.on, t.on + .05, p), w = p - t.on;
    if (t.c) t.c.material.emissiveIntensity = k * (1.8 + .5 * Math.sin(time * 2 + t.x));
    const near = t.hero ? 1 - ss(.55, .62, p) : 1;
    t.g.material.opacity = k * near * (t.hero ? .4 : .9); t.g.scale.setScalar(t.hero ? .16 + k * .08 : .2 + k * .5);
    const pulse = w > 0 && w < .08 ? w / .08 : ((time * .45 + t.x * .13 + t.z * .07) % 1);
    const ring = t.hero ? 0 : k; t.r.scale.setScalar(.04 + pulse * .34); t.r.material.opacity = ring * (1 - pulse) * .7; });
  // касание: телефон опускается на карточку, по столу расходится волна, экран загорается
  const down = ss(.56, .74, p), up = ss(.8, .97, p), tap = ss(.73, .76, p);
  // телефон опускается на карточку сверху, из-за кадра; тень проявляется по мере приближения к столу
  phone.position.set(.02 - .01 * up, 1.9 - (1.9 - .787) * down + .145 * up, .12 - .09 * down + .1 * up);
  phone.rotation.set(.25 * (1 - down) + .62 * up, -.22 + .15 * (1 - down), .08 * (1 - down));
  spot.shadow.intensity = 1 - ss(.9, 1.1, phone.position.y);
  phone.visible = p > .5;
  tapGlow.scale.setScalar(.24 + .22 * ss(.72, .9, p)); tapGlow.material.opacity = ss(.72, .755, p) * (1 - ss(.76, .9, p)) * .5;
  scrLight.intensity = .01 * tap; scrMat.color.setScalar(.015 + .985 * tap); drawScreen(ss(.76, .95, p));
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
