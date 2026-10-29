// калькулятор стоимости, кнопка Telegram на телефоне, Яндекс Метрика
(function(){
  var d = document;
  var YM = ""; // номер счётчика Яндекс Метрики — вписать, и счётчик включится
  var goal = function(g){ if (YM && window.ym) ym(+YM, "reachGoal", g); };
  if (YM){
    (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,d,"script","https://mc.yandex.ru/metrika/tag.js","ym");
    ym(+YM, "init", {clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true});
  }
  window.linkoGoal = goal;
  // ссылки внутри страницы: плавно к разделу, без #якоря в адресе — иначе сохранённая ссылка открывается с середины
  d.addEventListener("click", function(e){ var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute("href").slice(1), el = id ? d.getElementById(id) : null; if (id && !el) return; e.preventDefault();
    if (el) el.scrollIntoView({behavior: "smooth"}); else scrollTo({top: 0, behavior: "smooth"});
    if (location.hash) history.replaceState(null, "", location.pathname + location.search); });
  [].forEach.call(d.querySelectorAll("[data-goal]"), function(a){ a.addEventListener("click", function(){ goal(a.dataset.goal); }); });

  // калькулятор: цены за одно заведение (как в КП)
  var c = d.getElementById("calc"); if (!c) return;
  var P = {card: ["Страница стола", 5900, 0], m1: ["QR-меню", 7900, 1500], m2: ["Меню с заказом со стола", 14900, 2900],
    rev: ["Карточка на кассу", 3000, 0], s1: ["Мини-сайт с бронью", 15000, 0, 1], s2: ["Сайт со сценой", 30000, 0, 1]};
  var tn = d.getElementById("c-t"), tv = d.getElementById("c-tv"), L = d.getElementById("c-l"), one = d.getElementById("c-one"), mo = d.getElementById("c-mo"), sum = "";
  var rub = function(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₽"; };
  var row = function(a, b){ return "<div><span>" + a + "</span><b>" + b + "</b></div>"; };
  function calc(){
    var t = +tn.value, o = 0, m = 0, from = false, h = "", s = [];
    tv.textContent = t;
    [].forEach.call(c.querySelectorAll("input[data-k]:checked"), function(i){ var p = P[i.dataset.k]; if (!p) return;
      o += p[1]; m += p[2]; if (p[3]) from = true;
      h += row(p[0], (p[3] ? "от " : "") + rub(p[1])) + (p[2] ? row("&nbsp;&nbsp;абонплата", rub(p[2]) + "/мес") : ""); s.push(p[0]);
      if (i.dataset.k === "card"){ o += 2000 * t; h += row("Карточки NFC + QR × " + t, rub(2000 * t)); } });
    L.innerHTML = h || "<div><span>Выберите сервисы</span></div>";
    one.textContent = (from ? "от " : "") + rub(o); mo.textContent = rub(m);
    sum = "Расчёт: столов " + t + "; " + s.join(", ") + " — разово " + (from ? "от " : "") + rub(o) + ", в месяц " + rub(m);
  }
  c.addEventListener("input", calc); c.addEventListener("change", calc); calc();
  // «Получить точный расчёт»: переносим выбор в заявку
  var map = {card: "NFC-карточки", m1: "Меню с заказом", m2: "Меню с заказом", rev: "Отзывы", s1: "Онлайн-бронь", s2: "Сайт"};
  d.getElementById("c-go").addEventListener("click", function(){ var f = d.getElementById("form"); if (!f) return; goal("calc");
    [].forEach.call(c.querySelectorAll("input[data-k]:checked"), function(i){ var v = map[i.dataset.k], x = v && f.querySelector('input[name="want"][value="' + v + '"]'); if (x) x.checked = true; });
    if (!f.comment.value.trim()) f.comment.value = sum.replace(/ /g, " "); });

  // кнопка Telegram: появляется после первого экрана, прячется у формы заявки
  var tg = d.getElementById("tgb"), lead = d.getElementById("lead"), hall = d.getElementById("hall");
  function tgs(){ var y = innerHeight, h = hall && hall.offsetHeight ? hall.offsetHeight - y : y * .6;
    tg.classList.toggle("on", scrollY > h && lead.getBoundingClientRect().top > y * .9); }
  addEventListener("scroll", tgs, {passive: true}); addEventListener("resize", tgs); tgs();
})();
