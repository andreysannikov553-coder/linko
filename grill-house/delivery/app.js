// Демо доставки «Гриль Хаус», Чайковский: меню, зоны на карте, прожарка и соус, промокод, повтор заказа, статусы гостю, ресторан, Яндекс Доставка, отчёт.
(function(){
"use strict";
var $ = function(s, r){ return (r || document).querySelector(s); };
var ruble = function(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₽"; };
var esc = function(s){ return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); };
var hhmm = function(d){ return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); };
var store = {get: function(k, d){ try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e){ return d; } }, set: function(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (e){} }};

var ITEMS = {}; DATA.sections.forEach(function(s){ s.items.forEach(function(i){ ITEMS[i.id] = i; i.sec = s.id; }); });
var REST = [56.77795, 54.13931], ADDR = "Приморский бульвар, 32/1";
var ZONES = [{n:"Зона 1 · до 2 км", r:2000, fee:150, min:800, eta:[35,50]}, {n:"Зона 2 · до 4 км", r:4000, fee:250, min:1200, eta:[45,65]}, {n:"Зона 3 · до 7 км", r:7000, fee:350, min:1500, eta:[60,80]}];
// запасной вариант, если геокодер недоступен: улицы по расстоянию от ресторана (замерено по OpenStreetMap)
var STEMS = [["приморск","ленина","мира","кабалевск","маркса","вокзальн","сосновая","промышленн"], ["азина","советск","нефтяник","заречн","энтузиаст","строительн","камская","мичурин","уральская","декабрист"], ["шлюзов"]];
// быстрые адреса — координаты из OpenStreetMap (Photon), по одному на зону
var QUICK = [["ул. Карла Маркса, 10", 56.78119, 54.15071], ["ул. Азина, 1", 56.76663, 54.10227], ["Шлюзовая улица", 56.75616, 54.08063]];
var FREE_FROM = 2500, OPEN = "12:00–22:30", SAUCE_P = 75, PROMO = "ПЕРВЫЙ";
var DONE = ["С кровью · rare", "Слабая · medium rare", "Средняя · medium", "Почти полная · medium well", "Полная · well done"];
var SAUCES = ["Без соуса", "Гранатовый", "Клюквенный", "Дзадзики", "Сацебели", "Барбекю", "Сырный", "Перечный", "Мангово-медовый"];
var MODS = {"grill-4": {done: true}, "grill-5": {}, "grill-6": {}, "grill-7": {}, "grill-9": {}, "grill-10": {}, "grill-16": {}};
var YMAPS = "https://yandex.ru/maps/org/grill_house/161086447623/reviews/";
var S = {mode:"d", addr:"", apt:"", geo:null, zone:null, cart:{}, pay:"sbp", when:"asap", promo:"", promoOk:false, step:0, view:"g", order:null, timer:null,
  stop:{"sharing-2": true}, name:"", tel:"", note:"", mod:null};

/* ---------- деньги ---------- */
var lineP = function(l){ return ITEMS[l.id].p + (l.sauce && l.sauce !== SAUCES[0] ? SAUCE_P : 0); };
var lineMods = function(l){ return [l.done, l.sauce && l.sauce !== SAUCES[0] ? "соус " + l.sauce.toLowerCase() + " +" + SAUCE_P + " ₽" : ""].filter(Boolean).join(" · "); };
var keys = function(){ return Object.keys(S.cart); };
var sub = function(){ return keys().reduce(function(a, k){ return a + lineP(S.cart[k]) * S.cart[k].q; }, 0); };
var count = function(){ return keys().reduce(function(a, k){ return a + S.cart[k].q; }, 0); };
var disc = function(){ return S.promoOk ? Math.round(sub() * .1) : 0; };
var zone = function(){ return S.zone === null || S.zone === "out" ? null : ZONES[S.zone]; };
var fee = function(){ var z = zone(); if (S.mode === "p" || !z) return 0; return sub() - disc() >= FREE_FROM ? 0 : z.fee; };
var qtyOf = function(id){ return keys().reduce(function(a, k){ return a + (S.cart[k].id === id ? S.cart[k].q : 0); }, 0); };

/* ---------- меню ---------- */
function ctrl(id){
  if (S.stop[id]) return '<span class="stop">Нет сегодня · стоп-лист</span>';
  if (MODS[id]){ var q = qtyOf(id); return (q ? '<span class="incart">в корзине: ' + q + '</span>' : "") + '<button type="button" class="add" data-a="mods" data-id="' + id + '">' + (MODS[id].done ? "Выбрать прожарку" : "Добавить") + '</button>'; }
  var k = id + "||", q2 = S.cart[k] ? S.cart[k].q : 0;
  return q2 ? '<span class="step"><button type="button" data-a="dec" data-k="' + k + '" aria-label="Убрать">−</button><span class="q">' + q2 + '</span><button type="button" data-a="inc" data-k="' + k + '" aria-label="Добавить">+</button></span>'
            : '<button type="button" class="add" data-a="add" data-id="' + id + '">Добавить</button>';
}
function renderMenu(){
  $("#bar-in").innerHTML = DATA.sections.map(function(s){ return '<a href="#s-' + s.id + '">' + esc(s.title) + '</a>'; }).join("");
  $("#menu").innerHTML = DATA.sections.map(function(s){ return '<section class="sec" id="s-' + s.id + '"><h2 class="sec-h">' + esc(s.title) + '</h2><div class="list">' + s.items.map(function(i){
    var m = MODS[i.id] ? '<div class="opt">' + (MODS[i.id].done ? "Прожарка на выбор · соус +" + SAUCE_P + " ₽" : "Соус на выбор +" + SAUCE_P + " ₽") + '</div>' : "";
    return '<article class="item' + (S.stop[i.id] ? " off" : "") + '" id="i-' + i.id + '"><img src="img/' + i.id + '.jpg" alt="' + esc(i.name) + '" loading="lazy" width="640" height="480"><div><div class="name">' + esc(i.name) + '</div>' + (i.desc ? '<div class="desc">' + esc(i.desc) + '</div>' : "") + '<div class="meta">' + esc(i.w) + '</div>' + m + '</div><div class="row"><span class="price">' + ruble(i.p) + '</span><span data-st="' + i.id + '">' + ctrl(i.id) + '</span></div></article>'; }).join("") + '</div></section>'; }).join("");
  observeBar();
}
function refreshItem(id){ var el = $('[data-st="' + id + '"]'); if (el) el.innerHTML = ctrl(id); }
function put(id, done, sauce, d){ var k = id + "|" + (done || "") + "|" + (sauce && sauce !== SAUCES[0] ? sauce : "");
  var l = S.cart[k] || {id: id, q: 0, done: done || "", sauce: sauce && sauce !== SAUCES[0] ? sauce : ""}; l.q += d;
  if (l.q <= 0) delete S.cart[k]; else { l.q = Math.min(l.q, 20); S.cart[k] = l; }
  refreshItem(id); renderCartBar(); if (!$("#ovl").hidden && !S.mod) renderSheet(); }

/* ---------- прожарка и соус ---------- */
function openMods(id){ var it = ITEMS[id], m = MODS[id]; S.mod = {id: id, done: m.done ? DONE[2] : "", sauce: SAUCES[0]}; renderMods(); openOvl(); }
function renderMods(){ var o = S.mod, it = ITEMS[o.id], p = it.p + (o.sauce !== SAUCES[0] ? SAUCE_P : 0);
  $("#sheet").innerHTML = '<div class="sh-h"><h2 id="sh-title">' + esc(it.name) + '</h2><button class="x" type="button" data-a="close" aria-label="Закрыть">×</button></div><img src="img/' + o.id + '.jpg" alt="" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:14px;margin:6px 0 4px">'
   + (o.done ? '<div class="fld"><span class="l">Прожарка</span><div class="seg sm" role="radiogroup" aria-label="Прожарка">' + DONE.map(function(d){ return '<button type="button" role="radio" aria-checked="' + (o.done === d) + '" data-done="' + esc(d) + '">' + esc(d) + '</button>'; }).join("") + '</div></div>' : "")
   + '<div class="fld"><span class="l">Соус · ' + SAUCE_P + ' ₽, 30 г</span><div class="seg sm" role="radiogroup" aria-label="Соус">' + SAUCES.map(function(s){ return '<button type="button" role="radio" aria-checked="' + (o.sauce === s) + '" data-sauce="' + esc(s) + '">' + esc(s) + '</button>'; }).join("") + '</div></div>'
   + '<button class="btn" type="button" data-a="modadd">Добавить · ' + ruble(p) + '</button>'; }

/* ---------- адрес, карта, зоны ---------- */
function dist(a, b){ var r = Math.PI / 180, x = (b[1] - a[1]) * r * Math.cos((a[0] + b[0]) / 2 * r), y = (b[0] - a[0]) * r; return Math.sqrt(x * x + y * y) * 6371000; }
var map = null, guest = null, circles = [];
function initMap(){ if (!window.L){ $("#map").hidden = true; $(".mapnote").hidden = true; return; }
  map = L.map("map", {zoomControl: false, scrollWheelZoom: false, attributionControl: true}).setView(REST, 12);
  var esri = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/";
  L.tileLayer(esri + "World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {maxZoom: 16, attribution: "Esri, HERE, Garmin, © OpenStreetMap"}).addTo(map);
  L.tileLayer(esri + "World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}", {maxZoom: 16, opacity: .8}).addTo(map);
  ZONES.slice().reverse().forEach(function(z, i){ circles.unshift(L.circle(REST, {radius: z.r, color: "#C9A35C", weight: 1, opacity: .7, fillColor: "#C9A35C", fillOpacity: .05 + i * .03, interactive: false}).addTo(map)); });
  L.circleMarker(REST, {radius: 8, color: "#0E0D0C", weight: 3, fillColor: "#C9A35C", fillOpacity: 1}).addTo(map).bindTooltip("Гриль Хаус", {direction: "top"});
  map.fitBounds(circles[2].getBounds(), {padding: [6, 6]});
  map.on("click", function(e){ var ll = [e.latlng.lat, e.latlng.lng]; setGeo(ll, "Точка на карте"); reverse(ll); });
}
function setGeo(ll, label){ S.geo = ll; S.addr = label; $("#addr").value = label; var d = dist(REST, ll); S.zone = d <= ZONES[0].r ? 0 : d <= ZONES[1].r ? 1 : d <= ZONES[2].r ? 2 : "out"; S.dist = d;
  if (map){ if (!guest) guest = L.circleMarker(ll, {radius: 7, color: "#0E0D0C", weight: 3, fillColor: "#EFE6D6", fillOpacity: 1}).addTo(map); else guest.setLatLng(ll); circles.forEach(function(c, i){ c.setStyle({weight: i === S.zone ? 2.5 : 1}); }); map.fitBounds(L.latLngBounds([REST, ll]), {padding: [40, 40], maxZoom: 14}); }
  renderZone(); hideSug(); renderCartBar(); }
var label = function(p){ var a = [p.street || p.name, p.housenumber].filter(Boolean).join(", "); return a || p.name || ""; };
function reverse(ll){ fetch("https://photon.komoot.io/reverse?lat=" + ll[0] + "&lon=" + ll[1]).then(function(r){ return r.json(); }).then(function(j){ var f = j.features && j.features[0]; if (f){ S.addr = label(f.properties) || S.addr; $("#addr").value = S.addr; } }).catch(function(){}); }
var tmr, ctl;
function search(v){ clearTimeout(tmr); if (v.trim().length < 3){ hideSug(); return; }
  tmr = setTimeout(function(){ if (ctl) ctl.abort(); ctl = window.AbortController ? new AbortController() : null;
    fetch("https://photon.komoot.io/api/?limit=6&bbox=53.95,56.70,54.35,56.86&q=" + encodeURIComponent("Чайковский " + v), ctl ? {signal: ctl.signal} : {}).then(function(r){ return r.json(); }).then(function(j){
      var seen = {}, res = (j.features || []).map(function(f){ return {t: label(f.properties), ll: [f.geometry.coordinates[1], f.geometry.coordinates[0]], k: f.properties.type}; }).filter(function(x){ if (!x.t || seen[x.t]) return false; seen[x.t] = 1; return true; });
      if (!res.length){ fallback(v); return; }
      $("#sug").innerHTML = res.map(function(x, i){ return '<button type="button" role="option" data-sug="' + i + '">' + esc(x.t) + '<small>' + Math.round(dist(REST, x.ll) / 100) / 10 + ' км</small></button>'; }).join("");
      $("#sug").hidden = false; $("#addr").setAttribute("aria-expanded", "true"); S.sugs = res; }).catch(function(e){ if (e.name !== "AbortError") fallback(v); }); }, 450); }
function hideSug(){ $("#sug").hidden = true; $("#addr").setAttribute("aria-expanded", "false"); }
function fallback(v){ hideSug(); var t = v.toLowerCase(); S.geo = null; S.zone = null; STEMS.forEach(function(st, i){ if (S.zone === null && st.some(function(s){ return t.indexOf(s) > -1; })) S.zone = i; }); renderZone(); }
function renderZone(){ var z = zone(), el = $("#zone");
  $("#rules").textContent = "Принимаем заказы " + OPEN + " · везут курьеры Яндекс Доставки · оплата онлайн · бесплатно от " + ruble(FREE_FROM);
  if (S.zone === "out"){ el.className = "zone warn"; el.innerHTML = "<span>Адрес дальше 7 км — сюда не возим. Можно оформить самовывоз.</span>"; return; }
  if (!z){ el.className = "zone"; el.innerHTML = "<span>Введите адрес или нажмите на карту — покажем зону, стоимость и время</span>"; return; }
  el.className = "zone"; el.innerHTML = '<span class="z-name">' + z.n + '</span>' + (S.dist ? '<span><b>' + (Math.round(S.dist / 100) / 10) + ' км</b> от ресторана</span>' : "") + '<span>Доставка <b>' + ruble(z.fee) + '</b></span><span>Минимум <b>' + ruble(z.min) + '</b></span><span>Время <b>' + z.eta[0] + '–' + z.eta[1] + ' мин</b></span>'; }

/* ---------- повтор и промокод ---------- */
function renderAgain(){ var last = store.get("ghd_last", null), el = $("#again");
  $("#promo").hidden = store.get("ghd_orders", 0) > 0;
  if (!last || !last.lines || !last.lines.length){ el.hidden = true; return; }
  el.hidden = false; el.innerHTML = '<span class="t">Ваш прошлый заказ</span><span class="l">' + last.lines.map(function(l){ return esc(ITEMS[l.id] ? ITEMS[l.id].name : "") + (l.q > 1 ? " × " + l.q : ""); }).join(", ") + ' · ' + ruble(last.total) + '</span><button class="btn" type="button" data-a="again">Повторить заказ</button>'; }
function repeat(){ var last = store.get("ghd_last", null), skipped = []; if (!last) return; S.cart = {};
  last.lines.forEach(function(l){ if (!ITEMS[l.id]) return; if (S.stop[l.id]){ skipped.push(ITEMS[l.id].name); return; } put(l.id, l.done, l.sauce, l.q); });
  renderMenu(); renderCartBar(); renderSheet(skipped.length ? "Сегодня нет: " + skipped.join(", ") + " — остальное добавили" : ""); openOvl(); }

/* ---------- корзина и оформление ---------- */
function renderCartBar(){ var n = count(); $("#cartbar").hidden = !n || !$("#done").hidden || !$("#ovl").hidden; $("#ccnt").textContent = n; $("#csum").textContent = ruble(sub()); }
function openOvl(){ $("#ovl").hidden = false; document.body.style.overflow = "hidden"; renderCartBar(); }
function closeOvl(){ keep(); S.mod = null; $("#ovl").hidden = true; document.body.style.overflow = ""; renderCartBar(); }
function slots(){ var z = zone() || ZONES[0], b = new Date(Date.now() + (S.mode === "p" ? 40 : z.eta[1] + 15) * 60000), out = [];
  b.setMinutes(Math.ceil(b.getMinutes() / 30) * 30, 0, 0); for (var i = 0; i < 6; i++) out.push(hhmm(new Date(b.getTime() + i * 1800000))); return out; }
var UPSELL = ["sides-1", "sides-3", "sides-2", "sides-6"];
function renderSheet(msg){
  var ks = keys(), s = sub(), d = disc(), z = zone(), isD = S.mode === "d", f = fee(), need = isD && z ? Math.max(0, z.min - (s - d)) : 0;
  var hasMain = ks.some(function(k){ return ["grill","sharing","burgers","hot"].indexOf(ITEMS[S.cart[k].id].sec) > -1; }), hasSide = ks.some(function(k){ return ITEMS[S.cart[k].id].sec === "sides"; });
  var ups = hasMain && !hasSide ? '<div class="up-t">Не забыли гарнир?</div><div class="chips">' + UPSELL.filter(function(i){ return !S.stop[i]; }).map(function(i){ return '<button type="button" data-a="add" data-id="' + i + '">+ ' + esc(ITEMS[i].name) + ' · ' + ruble(ITEMS[i].p) + '</button>'; }).join("") + '</div>' : "";
  var promoMsg = S.promoMsg ? '<div class="' + (S.promoOk ? "okm" : "bdm") + '">' + esc(S.promoMsg) + '</div>' : "";
  var btn = !ks.length ? "Корзина пуста" : isD && S.zone === "out" ? "Адрес вне зоны — выберите самовывоз" : need ? "Ещё " + ruble(need) + " до минимального заказа" : "Оформить заказ · " + ruble(s - d + f);
  $("#sheet").innerHTML = '<div class="sh-h"><h2 id="sh-title">Ваш заказ</h2><button class="x" type="button" data-a="close" aria-label="Закрыть">×</button></div>' + (msg ? '<div class="bdm">' + esc(msg) + '</div>' : "")
   + ks.map(function(k){ var l = S.cart[k], it = ITEMS[l.id], md = lineMods(l); return '<div class="ci"><img src="img/' + l.id + '.jpg" alt=""><div><b>' + esc(it.name) + '</b>' + (md ? '<em>' + esc(md) + '</em>' : "") + '<span>' + ruble(lineP(l)) + ' · ' + esc(it.w) + '</span></div><span class="step"><button type="button" data-a="dec" data-k="' + esc(k) + '" aria-label="Убрать">−</button><span class="q">' + l.q + '</span><button type="button" data-a="inc" data-k="' + esc(k) + '" aria-label="Добавить">+</button></span></div>'; }).join("")
   + ups
   + '<div class="fld two"><div><label for="f-name">Имя</label><input class="inp" id="f-name" autocomplete="given-name" value="' + esc(S.name) + '"></div><div><label for="f-tel">Телефон</label><input class="inp" id="f-tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7" value="' + esc(S.tel) + '"></div></div>'
   + (isD ? '<div class="fld"><span class="l">Адрес доставки' + (z ? " · " + z.n : "") + '</span><div class="addr-show"><span>' + (S.addr ? esc(S.addr) : "Не указан") + '</span><button type="button" data-a="editaddr">Изменить</button></div></div><div class="fld"><label for="f-apt">Квартира, подъезд, этаж</label><input class="inp" id="f-apt" value="' + esc(S.apt) + '"></div>'
          : '<div class="fld"><span class="l">Самовывоз</span><div class="pick">' + ADDR + ' · будет готов через 20–25 минут</div></div>')
   + '<div class="fld"><label for="f-when">' + (isD ? "Когда привезти" : "Когда забрать") + '</label><select class="inp" id="f-when"><option value="asap"' + (S.when === "asap" ? " selected" : "") + '>Как можно скорее</option>' + slots().map(function(t){ return '<option value="' + t + '"' + (S.when === t ? " selected" : "") + '>К ' + t + '</option>'; }).join("") + '</select></div>'
   + '<div class="fld"><span class="l">Оплата' + (isD ? " · только онлайн: курьер Яндекса деньги не берёт" : "") + '</span><div class="seg" role="radiogroup" aria-label="Оплата">' + (isD ? [["sbp","СБП"],["card","Картой онлайн"]] : [["sbp","СБП"],["card","Картой онлайн"],["cash","На кассе"]]).map(function(p){ return '<button type="button" role="radio" aria-checked="' + (S.pay === p[0]) + '" data-pay="' + p[0] + '">' + p[1] + '</button>'; }).join("") + '</div></div>'
   + '<div class="fld"><label for="f-promo">Промокод</label><div class="inl"><input class="inp" id="f-promo" autocomplete="off" placeholder="' + PROMO + '" value="' + esc(S.promo) + '"><button type="button" data-a="promo">Применить</button></div>' + promoMsg + '</div>'
   + '<div class="fld"><label for="f-note">Комментарий</label><textarea class="inp" id="f-note" rows="2" placeholder="Домофон, без лука…">' + esc(S.note) + '</textarea></div>'
   + '<div class="sum"><div><span>Блюда</span><span>' + ruble(s) + '</span></div>' + (d ? '<div><span>Промокод ' + PROMO + ' · −10%</span><span class="disc">−' + ruble(d) + '</span></div>' : "")
   + (isD ? '<div><span>Доставка</span><span class="' + (z && !f ? "free" : "") + '">' + (!z ? "укажите адрес" : f ? ruble(f) : "бесплатно") + '</span></div>' : "") + '<div class="t"><span>Итого</span><span>' + ruble(s - d + f) + '</span></div></div>'
   + '<div class="err" id="err" role="alert"></div><button class="btn" type="button" data-a="send"' + (!ks.length || need || (isD && S.zone === "out") ? " disabled" : "") + '>' + btn + '</button><div class="note">Демо: заказ никуда не отправляется, платить не нужно.</div>';
}
function keep(){ var g = function(i){ var e = $(i); return e ? e.value : null; }, v;
  if ((v = g("#f-name")) !== null) S.name = v; if ((v = g("#f-tel")) !== null) S.tel = v; if ((v = g("#f-apt")) !== null) S.apt = v;
  if ((v = g("#f-when")) !== null) S.when = v; if ((v = g("#f-note")) !== null) S.note = v; if ((v = g("#f-promo")) !== null) S.promo = v; }
function applyPromo(){ keep(); var c = S.promo.trim().toUpperCase();
  if (!c){ S.promoOk = false; S.promoMsg = ""; }
  else if (c !== PROMO){ S.promoOk = false; S.promoMsg = "Такого промокода нет"; }
  else if (store.get("ghd_orders", 0) > 0){ S.promoOk = false; S.promoMsg = "Промокод действует только на первый заказ"; }
  else { S.promoOk = true; S.promoMsg = "Скидка 10% на блюда применена"; }
  renderSheet(); }
function send(){ keep(); var err = function(m){ $("#err").textContent = m; }, isD = S.mode === "d";
  if (!S.name.trim()) return err("Укажите имя");
  if (S.tel.replace(/\D/g, "").length < 10) return err("Проверьте телефон: нужно не меньше 10 цифр");
  if (isD && !zone()) return err("Укажите адрес: выберите из подсказок или нажмите на карту");
  if (isD && S.pay === "cash") S.pay = "sbp";
  var z = zone() || ZONES[0], now = new Date(), eta;
  if (S.when === "asap") eta = new Date(now.getTime() + (isD ? z.eta[1] : 25) * 60000); else { eta = new Date(now); var p = S.when.split(":"); eta.setHours(+p[0], +p[1], 0, 0); }
  var lines = keys().map(function(k){ var l = S.cart[k]; return {id: l.id, q: l.q, done: l.done, sauce: l.sauce, n: ITEMS[l.id].name, m: lineMods(l), p: lineP(l)}; });
  S.order = {no: 214 + Math.floor(Math.random() * 60), mode: S.mode, name: S.name.trim(), tel: S.tel.trim(), addr: S.addr + (S.apt.trim() ? ", " + S.apt.trim() : ""), note: S.note.trim(), pay: S.pay, when: S.when, eta: eta, at: now,
    lines: lines, sub: sub(), disc: disc(), fee: fee(), zone: z.n, promo: S.promoOk};
  S.order.total = S.order.sub - S.order.disc + S.order.fee; S.step = 0; S.view = "g";
  if (S.pay === "cash") return finish();
  $("#sheet").innerHTML = '<div class="sh-h"><h2 id="sh-title">Оплата</h2><button class="x" type="button" data-a="close" aria-label="Закрыть">×</button></div><div class="pay"><span>Заказ №' + S.order.no + ' · Гриль Хаус, Чайковский</span><b>' + ruble(S.order.total) + '</b><small>' + (S.pay === "sbp" ? "Система быстрых платежей: откроется приложение вашего банка" : "Банковская карта") + '</small></div>'
    + '<button class="btn" type="button" data-a="paid">Оплатить ' + ruble(S.order.total) + '</button><div class="note">Демо: деньги не списываются. В рабочей версии — платёжная страница банка или ЮKassa с чеком по 54-ФЗ.</div>'; }
function finish(){ store.set("ghd_last", {lines: S.order.lines.map(function(l){ return {id: l.id, q: l.q, done: l.done, sauce: l.sauce}; }), total: S.order.total});
  store.set("ghd_orders", store.get("ghd_orders", 0) + 1);
  $("#ovl").hidden = true; S.mod = null; document.body.style.overflow = "hidden"; $("#cartbar").hidden = true; renderDone(); $("#done").hidden = false; $("#done").scrollTop = 0; }

/* ---------- после заказа ---------- */
var PAYN = {sbp: "СБП · оплачено", card: "картой онлайн · оплачено", cash: "на кассе при получении"};
function times(o){ var a = o.at.getTime(), e = o.eta.getTime(); return [new Date(a), new Date(a + 3 * 60000), new Date(Math.max(a + 6 * 60000, e - (o.mode === "d" ? 15 : 0) * 60000)), new Date(e)]; }
function steps(o){ var isD = o.mode === "d", t = times(o);
  var a = isD ? ["Оплачен и принят","Готовится","Курьер Яндекса в пути","Доставлен"] : ["Заказ принят","Готовится","Готов — можно забирать","Выдан"];
  var sb = isD ? ["Ресторан получил заказ и оплату","Повара готовят на мангале","Курьер Яндекс Доставки везёт заказ","Приятного аппетита"] : ["Ресторан подтвердил","Повара готовят на мангале","Ждём вас у кассы","Приятного аппетита"];
  return a.map(function(n, k){ return '<li class="' + (k <= S.step ? "on" : "") + (k === S.step && S.step < 3 ? " cur" : "") + '"><i>' + (k < S.step || S.step === 3 ? "✓" : k + 1) + '</i><div><b>' + n + '</b><small>' + sb[k] + '</small></div><time>' + (k <= S.step ? hhmm(t[k]) : "") + '</time></li>'; }).join(""); }
function sms(o){ var isD = o.mode === "d", t = times(o);
  var m = isD ? ["Гриль Хаус: заказ №" + o.no + " оплачен и принят. Статус — по ссылке в этом сообщении", "Готовим ваш заказ на мангале", "Курьер Яндекс Доставки везёт заказ, будет около " + hhmm(o.eta), "Заказ доставлен. Приятного аппетита!"]
              : ["Гриль Хаус: заказ №" + o.no + " принят. Статус — по ссылке в этом сообщении", "Готовим ваш заказ на мангале", "Заказ готов — ждём вас: " + ADDR, "Спасибо, что выбрали Гриль Хаус!"];
  return '<div class="card sms"><span class="h">СМС или мессенджер гостю</span>' + m.slice(0, S.step + 1).map(function(x, k){ return '<p>' + esc(x) + '<small>' + hhmm(t[k]) + '</small></p>'; }).join("") + '</div>'; }
function lines(o){ return o.lines.map(function(l){ return '<div class="l"><span>' + l.q + ' × ' + esc(l.n) + (l.m ? '<br><small style="color:var(--gold-l)">' + esc(l.m) + '</small>' : "") + '</span><span>' + ruble(l.p * l.q) + '</span></div>'; }).join(""); }
function viewG(o){ var isD = o.mode === "d";
  var rev = S.step === 3 ? '<div class="card fb"><span class="lbl">Через час гостю придёт</span><div class="bub"><b>Как вам ужин из Гриль Хауса?</b><span style="color:var(--soft)">Будем рады отзыву — он помогает другим гостям выбрать.</span></div><div class="bt"><a class="btn" href="' + YMAPS + '" target="_blank" rel="noopener">Оставить отзыв на Яндекс Картах</a>'
    + (S.fbSent ? '<div class="okm" style="text-align:center">Спасибо! Сообщение ушло управляющему</div>' : S.fbOpen ? '<textarea class="inp" id="fb" rows="3" placeholder="Что понравилось или что исправить"></textarea><button class="btn alt" type="button" data-a="fbsend">Отправить управляющему</button>' : '<button class="btn alt" type="button" data-a="fbopen">Написать управляющему</button>') + '</div><div class="note">Ссылка на отзыв приходит всем гостям одинаково.</div></div>' : "";
  return sms(o) + '<div class="card"><ol class="trk">' + steps(o) + '</ol></div><div class="card ord"><div><span>' + (isD ? "Адрес" : "Самовывоз") + '</span><b>' + esc(isD ? o.addr : ADDR) + '</b></div><div><span>' + (o.when === "asap" ? "Ожидаемое время" : "Время") + '</span><b>' + (o.when === "asap" ? "около " : "к ") + hhmm(o.eta) + '</b></div><div><span>Оплата</span><b>' + PAYN[o.pay] + '</b></div>' + (o.disc ? '<div><span>Скидка по промокоду</span><b>−' + ruble(o.disc) + '</b></div>' : "") + '<div><span>Итого</span><b>' + ruble(o.total) + '</b></div></div>' + rev; }
var STOPLIST = ["sharing-2", "grill-16", "burgers-1", "hot-2", "desserts-3"];
function viewR(o){ var isD = o.mode === "d";
  var b = S.step === 0 ? '<button class="btn" type="button" data-a="adv">Принять заказ</button>' : S.step === 1 ? '<button class="btn" type="button" data-a="adv">' + (isD ? "Готово — вызвать курьера Яндекса" : "Готово — можно выдавать") + '</button>' : S.step === 2 && !isD ? '<button class="btn" type="button" data-a="adv">Выдан гостю</button>' : '<button class="btn" type="button" disabled>' + (S.step === 2 ? "Курьер Яндекса везёт заказ" : "Заказ закрыт") + '</button>';
  return '<div class="card"><div class="msg-h"><i>LK</i><div><b>LINKO · заказы</b><span>мессенджер персонала · сейчас</span></div></div><div class="bub"><h3>Заказ №' + o.no + ' · ' + (isD ? "доставка" : "самовывоз") + '</h3><div class="tags"><span class="tag' + (S.step >= 2 ? " g" : "") + '">' + ["Новый","Принят · готовим",(isD ? "У курьера Яндекса" : "Готов"),"Закрыт"][S.step] + '</span><span class="tag' + (o.pay !== "cash" ? " g" : "") + '">' + (o.pay !== "cash" ? "Оплачен онлайн" : "Оплата на кассе") + '</span><span class="tag">r_keeper ✓ на кухне</span>' + (o.promo ? '<span class="tag">Новый гость · ' + PROMO + '</span>' : "") + '</div><div class="hr"></div>' + lines(o)
   + '<div class="hr"></div>' + (o.disc ? '<div class="l"><span>Промокод −10%</span><span>−' + ruble(o.disc) + '</span></div>' : "") + (o.fee ? '<div class="l"><span>Доставка · ' + esc(o.zone) + '</span><span>' + ruble(o.fee) + '</span></div>' : "") + '<div class="l"><b>Итого</b><b>' + ruble(o.total) + '</b></div><div class="hr"></div>'
   + '<div class="l"><span class="k">Гость</span><span>' + esc(o.name) + ' · ' + esc(o.tel) + '</span></div>' + (isD ? '<div class="l"><span class="k">Адрес</span><span>' + esc(o.addr) + '</span></div>' : "")
   + '<div class="l"><span class="k">Время</span><span>' + (o.when === "asap" ? "как можно скорее · около " + hhmm(o.eta) : "к " + hhmm(o.eta)) + '</span></div><div class="l"><span class="k">Оплата</span><span>' + PAYN[o.pay] + '</span></div>' + (o.note ? '<div class="l"><span class="k">Комментарий</span><span>' + esc(o.note) + '</span></div>' : "")
   + '</div><div class="bt">' + b + '</div></div>'
   + '<div class="card"><span class="lbl">Стоп-лист · приходит из r_keeper</span><div class="sl">' + STOPLIST.map(function(id){ return '<label><span>' + esc(ITEMS[id].name) + '</span><input type="checkbox" data-stop="' + id + '"' + (S.stop[id] ? " checked" : "") + '></label>'; }).join("") + '</div><div class="note">Отметьте блюдо — на сайте доставки оно сразу станет «Нет сегодня».</div></div>'; }
function viewC(o){ var st = ["Курьер будет вызван, когда заказ будет готов", "Курьер будет вызван, когда заказ будет готов", "Курьер забрал заказ и везёт гостю", "Заказ доставлен"][S.step];
  var b = S.step === 2 ? '<button class="btn" type="button" data-a="adv">Курьер доставил</button><div class="note">В жизни этот статус приходит из Яндекс Доставки сам.</div>' : '<button class="btn" type="button" disabled>' + (S.step === 3 ? "Заказ доставлен" : "Ждём готовности заказа") + '</button>';
  return '<div class="card"><div class="msg-h"><i>ЯД</i><div><b>Яндекс Доставка · заказ №' + o.no + '</b><span>' + st + '</span></div></div><div class="bub"><span class="k">Откуда</span><div>Гриль Хаус · ' + ADDR + '</div><span class="k">Куда</span><div class="addr-big">' + esc(o.addr) + '</div><span class="k">Получатель</span><div>' + esc(o.name) + ' · ' + esc(o.tel) + '</div>' + (o.note ? '<span class="k">Комментарий курьеру</span><div>' + esc(o.note) + '</div>' : "")
   + '<div class="cash"><span>Оплачено онлайн — курьер деньги не берёт</span><b>0 ₽</b></div><div class="l"><span class="k">Доставка</span><span>' + (o.fee ? ruble(o.fee) : "бесплатно для гостя") + ' · по тарифу Яндекса</span></div></div><div class="bt">' + b + '</div></div>'; }
function viewO(){ var rev = 112640, n = 64;
  return '<div class="card"><div class="msg-h"><i>LK</i><div><b>LINKO · отчёт по доставке</b><span>понедельник, 09:00 · пример, цифры условные</span></div></div><div class="kp"><div><span>Заказов</span><b>' + n + '</b></div><div><span>Выручка</span><b>' + ruble(rev) + '</b></div><div><span>Средний чек</span><b>' + ruble(rev / n) + '</b></div><div><span>Повторные заказы</span><b>38%</b></div><div><span>Новые гости по ' + PROMO + '</span><b>9</b></div><div><span>Отзывов после доставки</span><b>7</b></div></div>'
   + '<div class="bub" style="margin-top:12px"><span class="k">Топ блюд</span><div class="l"><span>Мясное плато</span><span>14</span></div><div class="l"><span>Классический бургер</span><span>11</span></div><div class="l"><span>Свиные рёбра гриль</span><span>9</span></div><div class="hr"></div><span class="k">Зоны</span><div class="l"><span>Зона 1 · до 2 км</span><span>58%</span></div><div class="l"><span>Зона 2 · до 4 км</span><span>31%</span></div><div class="l"><span>Зона 3 · до 7 км</span><span>11%</span></div></div>'
   + '<div class="vs"><div class="a"><span>Комиссия агрегатора 29,17% составила бы</span><b>' + ruble(rev * .2917) + '</b></div><div class="b"><span>LINKO, 2% с заказов</span><b>' + ruble(rev * .02) + '</b></div></div></div>'; }
function renderDone(){ var o = S.order, isD = o.mode === "d", caps = {g: "Так заказ видит гость: сообщения, статус, отзыв", r: "Так заказ приходит персоналу: в мессенджер и в кассу r_keeper", c: "Так заказ уходит в Яндекс Доставку: курьер вызывается одной кнопкой", o: "Так выглядит отчёт по доставке каждый понедельник"};
  var title = (isD ? ["принят","готовится","в пути","доставлен"] : ["принят","готовится","готов","выдан"])[S.step];
  $("#done").innerHTML = '<div class="in"><div class="d-top"><div class="ok"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h2>Заказ №' + o.no + ' ' + title + '</h2><p>' + (isD ? "Привезём к " : "Будет готов к ") + hhmm(o.eta) + ' · ' + ruble(o.total) + '</p></div>'
   + '<div class="tabs" role="tablist">' + [["g","Гость"],["r","Ресторан"],["c","Яндекс"],["o","Отчёт"]].map(function(t){ return '<button role="tab" type="button" data-v="' + t[0] + '" aria-selected="' + (S.view === t[0]) + '"' + (t[0] === "c" && !isD ? " disabled" : "") + '>' + t[1] + '</button>'; }).join("") + '</div>'
   + '<div class="cap">' + caps[S.view] + '</div>' + (S.view === "g" ? viewG(o) : S.view === "r" ? viewR(o) : S.view === "c" ? viewC(o) : viewO())
   + '<button class="btn alt" type="button" data-a="play">' + (S.timer ? "Остановить" : "Показать весь путь заказа") + '</button><button class="btn alt" type="button" data-a="new">Собрать новый заказ</button><div class="note">Демо: персонал получает заказ в мессенджер и в r_keeper, курьера Яндекса вызывает одной кнопкой. Отдельное приложение не нужно.</div></div>'; }
function advance(){ if (S.step < 3){ S.step++; renderDone(); } if (S.step >= 3) stop(); }
function stop(){ if (S.timer){ clearInterval(S.timer); S.timer = null; renderDone(); } }
function play(){ if (S.timer) return stop(); S.view = "g"; S.step = 0; S.timer = setInterval(advance, 2300); renderDone(); }
function newOrder(){ stop(); S.cart = {}; S.step = 0; S.order = null; S.promo = ""; S.promoOk = false; S.promoMsg = ""; S.fbOpen = S.fbSent = false;
  $("#done").hidden = true; document.body.style.overflow = ""; renderMenu(); renderAgain(); renderCartBar(); scrollTo(0, 0); }

/* ---------- события ---------- */
document.addEventListener("click", function(e){
  var t = e.target.closest("button, a"); if (!t) return; var a = t.dataset.a;
  if (a === "add") put(t.dataset.id, "", "", 1);
  else if (a === "inc" || a === "dec"){ var l = S.cart[t.dataset.k]; if (l) put(l.id, l.done, l.sauce, a === "inc" ? 1 : -1); }
  else if (a === "mods") openMods(t.dataset.id);
  else if (t.dataset.done){ S.mod.done = t.dataset.done; renderMods(); }
  else if (t.dataset.sauce){ S.mod.sauce = t.dataset.sauce; renderMods(); }
  else if (a === "modadd"){ var m = S.mod; S.mod = null; put(m.id, m.done, m.sauce, 1); closeOvl(); }
  else if (t.id === "cartbtn"){ renderSheet(); openOvl(); }
  else if (a === "close") closeOvl();
  else if (a === "send") send();
  else if (a === "paid") finish();
  else if (a === "promo") applyPromo();
  else if (a === "editaddr"){ closeOvl(); if (S.mode !== "d") return; $("#addr").focus(); $("#boxD").scrollIntoView({block: "center"}); }
  else if (a === "again") repeat();
  else if (a === "adv"){ stop(); advance(); }
  else if (a === "play") play();
  else if (a === "new") newOrder();
  else if (a === "fbopen"){ S.fbOpen = true; renderDone(); var f = $("#fb"); if (f) f.focus(); }
  else if (a === "fbsend"){ S.fbSent = true; renderDone(); }
  else if (a === "reset"){ try { localStorage.removeItem("ghd_last"); localStorage.removeItem("ghd_orders"); } catch (x){} renderAgain(); }
  else if (t.dataset.pay){ keep(); S.pay = t.dataset.pay; renderSheet(); }
  else if (t.dataset.v){ S.view = t.dataset.v; renderDone(); }
  else if (t.dataset.sug !== undefined){ var r = S.sugs[+t.dataset.sug]; setGeo(r.ll, r.t); }
  else if (t.dataset.q !== undefined){ var q = QUICK[+t.dataset.q]; setGeo([q[1], q[2]], q[0]); }
  else if (t.dataset.m){ S.mode = t.dataset.m; [].forEach.call(document.querySelectorAll(".mode button"), function(b){ b.setAttribute("aria-checked", String(b === t)); }); $("#boxD").hidden = S.mode !== "d"; $("#boxP").hidden = S.mode !== "p"; if (S.mode === "d" && map) setTimeout(function(){ map.invalidateSize(); }, 50); renderCartBar(); }
});
document.addEventListener("change", function(e){ var id = e.target.dataset && e.target.dataset.stop; if (!id) return; if (e.target.checked) S.stop[id] = true; else delete S.stop[id];
  keys().forEach(function(k){ if (S.cart[k].id === id && S.stop[id]) delete S.cart[k]; }); renderMenu(); });
$("#ovl").addEventListener("click", function(e){ if (e.target === this) closeOvl(); });
document.addEventListener("keydown", function(e){ if (e.key === "Escape"){ if (!$("#sug").hidden) hideSug(); else if (!$("#ovl").hidden) closeOvl(); } });
$("#addr").addEventListener("input", function(){ S.addr = this.value; S.geo = null; S.zone = null; S.dist = 0; renderZone(); search(this.value); });
document.addEventListener("click", function(e){ if (!e.target.closest(".ac")) hideSug(); });
var io = null;
function observeBar(){ var links = [].slice.call(document.querySelectorAll(".bar a")); if (!("IntersectionObserver" in window)) return; if (io) io.disconnect();
  io = new IntersectionObserver(function(es){ es.forEach(function(x){ if (!x.isIntersecting) return; links.forEach(function(a){ a.classList.toggle("on", a.getAttribute("href") === "#" + x.target.id); }); }); }, {rootMargin: "-20% 0px -70% 0px"});
  [].forEach.call(document.querySelectorAll(".sec"), function(s){ io.observe(s); }); }

$("#quick").innerHTML = QUICK.map(function(q, i){ return '<button type="button" data-q="' + i + '">' + esc(q[0]) + '</button>'; }).join("");
renderMenu(); renderZone(); renderAgain(); initMap();
})();
