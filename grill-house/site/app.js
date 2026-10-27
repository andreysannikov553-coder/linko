(function(){
  var d=document,root=d.documentElement,body=d.body;
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine=matchMedia("(pointer: fine)").matches;
  var $=function(s,c){return (c||d).querySelector(s)},$$=function(s,c){return [].slice.call((c||d).querySelectorAll(s))};

  // буквы заголовка по одной
  $$("[data-split]").forEach(function(el){
    var t=el.textContent,n=0;el.setAttribute("aria-label",t);el.textContent="";
    t.split(" ").forEach(function(word,wi){
      if(wi)el.appendChild(d.createTextNode(" "));
      var w=d.createElement("span");w.className="w";w.setAttribute("aria-hidden","true");
      [].forEach.call(word,function(c){var s=d.createElement("span");s.className="ch";s.style.setProperty("--i",n++);s.textContent=c;w.appendChild(s)});
      el.appendChild(w);
    });
  });

  // загрузчик
  var t0=performance.now(),started=false;
  function ready(){if(started)return;started=true;root.classList.add("ready");setTimeout(function(){root.classList.add("done")},1500)}
  function go(){setTimeout(ready,reduce?0:Math.max(0,1400-(performance.now()-t0)))}
  if(d.readyState==="complete")go();else addEventListener("load",go);
  setTimeout(ready,5000);

  // появление блоков
  var rv=$$(".rv,.wipe");
  function counters(el){
    $$("[data-count]",el).forEach(function(n){
      var to=parseFloat(n.dataset.count),dec=+(n.dataset.dec||0),t=performance.now(),dur=1700;
      function fmt(v){return v.toFixed(dec).replace(".",",")+(n.dataset.suf||"")}
      if(reduce){n.textContent=fmt(to);return}
      (function tick(now){var p=Math.min(1,(now-t)/dur),e=1-Math.pow(1-p,3);n.textContent=fmt(to*e);if(p<1)requestAnimationFrame(tick)})(t);
    });
  }
  if("IntersectionObserver" in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add("in");counters(x.target);io.unobserve(x.target)}})},{threshold:.14,rootMargin:"0px 0px -6% 0px"});
    rv.forEach(function(e){io.observe(e)});
  }else{rv.forEach(function(e){e.classList.add("in");counters(e)})}

  // навигация, прогресс, параллакс
  var nav=$("#nav"),bar=$("#progress"),px=$$("[data-speed]"),lastY=0,ticking=false;
  var frame=function(){
    var y=scrollY,h=root.scrollHeight-innerHeight;
    bar.style.width=(h>0?y/h*100:0)+"%";
    nav.classList.toggle("solid",y>40);
    nav.classList.toggle("hide",y>260&&y>lastY&&!root.classList.contains("open"));
    lastY=y;
    if(!reduce)px.forEach(function(el){
      var r=el.parentElement.getBoundingClientRect();
      if(r.bottom<-200||r.top>innerHeight+200)return;
      var off=(r.top+r.height/2-innerHeight/2)*parseFloat(el.dataset.speed);
      el.style.transform="translate3d(0,"+off.toFixed(1)+"px,0)";
    });
    ticking=false;
  };
  addEventListener("scroll",function(){if(!ticking){ticking=true;requestAnimationFrame(function(){frame()})}},{passive:true});
  addEventListener("resize",function(){frame()});


  // первый экран — сцена из съёмки: видео перематывается вместе с прокруткой
  var tun=$(".tunnel");
  if(tun&&!reduce)(function(){
    var vid=$(".t-cv",tun),hero=$(".t-hero",tun),dim=$(".t-dim",tun),fin=$(".t-final",tun),bar2=$(".t-load i",tun);
    var cl=function(x){return x<0?0:x>1?1:x},seg=function(p,a,b){return cl((p-a)/(b-a))};
    var io3=function(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
    var set,dur=0,ready=false,cur=0,want=0,raf=0,gen=0;
    // компьютер — видео 16:9, телефон — вертикальное; при повороте экрана файл меняется
    // файл скачиваем целиком: перемотка по уже загруженному видео идёт без задержек
    var start=function(){
      var s=innerWidth>=innerHeight?"d":"m";if(s===set)return;
      set=s;var g=++gen;ready=false;tun.classList.remove("loaded");vid.classList.remove("on");
      var url=tun.dataset.src+s+".mp4?v="+tun.dataset.v;
      var use=function(src){if(g!==gen)return;vid.src=src;vid.load()};
      fetch(url).then(function(r){
        var total=+r.headers.get("content-length")||0,got=0,parts=[],rd=r.body&&r.body.getReader&&r.body.getReader();
        if(!rd||!r.ok)return r.blob().then(function(b){use(URL.createObjectURL(b))});
        return (function pull(){return rd.read().then(function(x){
          if(x.done){use(URL.createObjectURL(new Blob(parts,{type:"video/mp4"})));return}
          parts.push(x.value);got+=x.value.length;if(total)bar2.style.transform="scaleX("+(got/total).toFixed(3)+")";return pull()})})();
      }).catch(function(){use(url)});
    };
    vid.addEventListener("loadeddata",function(){
      dur=vid.duration||0;ready=dur>0;
      // Safari показывает кадры после перемотки только у «запущенного» видео
      var pp=vid.play();if(pp&&pp.then)pp.then(function(){vid.pause();kick()}).catch(function(){});else vid.pause();
      bar2.style.transform="scaleX(1)";tun.classList.add("loaded");vid.classList.add("on");kick();
    });
    vid.addEventListener("seeked",function(){kick()});
    // плавность: позиция догоняет прокрутку мягко, новая перемотка — только когда закончилась прошлая
    var loop=function(){raf=0;var dd=want-cur;cur=Math.abs(dd)<.0003?want:cur+dd*.16;
      if(ready&&!vid.seeking){var t=cur*(dur-.04);if(Math.abs(vid.currentTime-t)>.008)vid.currentTime=t}
      if(cur!==want||(ready&&vid.seeking))kick()};
    var kick=function(){if(!raf)raf=requestAnimationFrame(loop)};
    start();addEventListener("resize",start);
    var tunnelFrame=function(){
      var r=tun.getBoundingClientRect(),total=tun.offsetHeight-innerHeight;
      if(r.bottom<-50||r.top>innerHeight+50)return;
      var p=cl(-r.top/total);
      want=seg(p,0,.88);kick();
      var go=seg(p,0,.07);
      hero.style.opacity=(1-go).toFixed(3);hero.style.transform="translateY("+(-70*go).toFixed(1)+"px)";hero.style.visibility=go>=1?"hidden":"";
      dim.style.opacity=Math.max(.42*(1-seg(p,0,.08)),.45*seg(p,.88,.95)).toFixed(3);
      var f=io3(seg(p,.88,.96));
      fin.style.opacity=f.toFixed(3);fin.style.transform="translateY("+((1-f)*30).toFixed(1)+"px)";fin.classList.toggle("on",f>.5);
    };
    var oldFrame=frame;frame=function(){oldFrame();tunnelFrame()};
  })();

  frame();

  // бронь: в примере сайта заявка никуда не уходит — показываем, как её увидит администратор, и через пару секунд «подтверждаем»
  var bk=$("#bk");
  if(bk){
    // «Заявка на банкет» — та же форма брони, с банкетным столом и пометкой
    $$("[data-banq]").forEach(function(a){a.addEventListener("click",function(){bk.hall.value="Банкетный стол";if(!bk.comment.value)bk.comment.value="Банкет: ";bk.guests.value="11 и больше"})});
    var bst=$("#bk-st"),bpre=$("#bk-pre"),berr=$("#bk-err"),bt;
    var dd=new Date(),p2=function(n){return("0"+n).slice(-2)};bk.date.min=dd.getFullYear()+"-"+p2(dd.getMonth()+1)+"-"+p2(dd.getDate());bk.date.value=bk.date.min;
    var bshow=function(s){bst.hidden=false;bst.setAttribute("data-s",s);$("span",bst).textContent=s==="bk_ok"?"Бронь № B12345 подтверждена. Ждём вас!":"Бронь № B12345 у администратора · ждём ответа"};
    bk.addEventListener("submit",function(e){
      e.preventDefault();berr.hidden=true;
      var b={date:bk.date.value,time:bk.time.value,guests:bk.guests.value,hall:bk.hall.value,name:bk.name.value.trim(),phone:bk.phone.value.trim(),comment:bk.comment.value.trim()};
      if(!b.date||!b.time||!b.name||b.phone.replace(/\D/g,"").length<6){berr.hidden=false;berr.textContent="Заполните дату, время, имя и телефон";return}
      var x=b.date.split("-");
      bpre.hidden=false;bpre.textContent="Пример: так бронь увидит администратор\n\n📅 Новая бронь № B12345\nДата: "+x[2]+"."+x[1]+"."+x[0]+"\nВремя: "+b.time+"\nГостей: "+b.guests+"\nЗал: "+b.hall+"\nИмя: "+b.name+"\nТелефон: "+b.phone+(b.comment?"\nПожелания: "+b.comment:"")+"\n\n[ ✅ Подтвердить ]  [ ❌ Нет мест ]\n\nНа рабочем сайте заявка сразу приходит администратору с этими кнопками, а гость видит ответ на этой странице.";
      bshow("sent");clearTimeout(bt);bt=setTimeout(function(){bshow("bk_ok")},3500);
    });
  }

  // мобильное меню
  var burger=$("#burger");
  function menu(open){root.classList.toggle("open",open);burger.setAttribute("aria-expanded",open);body.style.overflow=open?"hidden":""}
  burger.addEventListener("click",function(){menu(!root.classList.contains("open"))});
  $$("#drawer a").forEach(function(a){a.addEventListener("click",function(){menu(false)})});
  addEventListener("keydown",function(e){if(e.key==="Escape")menu(false)});

  // вкладки меню
  var tabs=$$(".tab"),panels=$$(".panel");
  function pick(i,focus){
    tabs.forEach(function(t,k){t.setAttribute("aria-selected",k===i);t.tabIndex=k===i?0:-1});
    panels.forEach(function(p,k){p.classList.toggle("on",k===i);p.hidden=k!==i});
    var t=tabs[i];if(focus)t.focus();
    // сдвигаем только полосу вкладок: scrollIntoView прокручивал всю страницу к меню при открытии сайта
    var bar=t.parentElement,x=bar.scrollLeft+t.getBoundingClientRect().left-bar.getBoundingClientRect().left-(bar.clientWidth-t.offsetWidth)/2;bar.scrollLeft=x;
  }
  tabs.forEach(function(t,i){
    t.addEventListener("click",function(){pick(i)});
    t.addEventListener("keydown",function(e){
      if(e.key==="ArrowRight")pick((i+1)%tabs.length,true);
      if(e.key==="ArrowLeft")pick((i-1+tabs.length)%tabs.length,true);
    });
  });
  if(tabs.length)pick(0);

  // «сейчас открыто» по времени Чайковского: пн–чт 9–22, пт–сб 9–01, вс 9–23
  var badge=$("#open");
  if(badge){
    var now=new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Yekaterinburg"})),h=now.getHours()+now.getMinutes()/60,wd=now.getDay();
    var close=[23,22,22,22,22,25,25],prevLate=[25,23,22,22,22,22,25];
    var yes=(h>=9&&h<close[wd])||(h<(prevLate[wd]-24));
    badge.classList.toggle("yes",yes);
    var till=close[wd]>24?"до 01:00":"до "+close[wd]+":00";
    badge.textContent=yes?"Сейчас открыто · "+(h<9?"до 01:00":till):"Сейчас закрыто · откроемся в 09:00";
  }

  // магнитные кнопки и курсор
  if(fine&&!reduce){
    $$("[data-mag]").forEach(function(b){
      b.addEventListener("mousemove",function(e){var r=b.getBoundingClientRect();b.style.transform="translate("+((e.clientX-r.left-r.width/2)*.22)+"px,"+((e.clientY-r.top-r.height/2)*.3)+"px)"});
      b.addEventListener("mouseleave",function(){b.style.transform=""});
    });
    var cur=$("#cur"),cx=0,cy=0,tx=0,ty=0;
    addEventListener("mousemove",function(e){tx=e.clientX;ty=e.clientY},{passive:true});
    (function loop(){cx+=(tx-cx)*.2;cy+=(ty-cy)*.2;cur.style.transform="translate("+cx+"px,"+cy+"px)";requestAnimationFrame(loop)})();
    d.addEventListener("mouseover",function(e){cur.classList.toggle("big",!!e.target.closest("a,button,.tab,.card,select,input"))});
  }

  // фон: плавающий «боке» как лампы
  var cv=$("#fx");
  if(cv&&!reduce){
    var g=cv.getContext("2d"),W,H,dots=[],dpr=Math.min(devicePixelRatio||1,2);
    function size(){W=cv.width=innerWidth*dpr;H=cv.height=innerHeight*dpr}
    size();addEventListener("resize",size);
    for(var i=0;i<26;i++)dots.push({x:Math.random(),y:Math.random(),r:30+Math.random()*90,a:.025+Math.random()*.06,vy:-(.00004+Math.random()*.00012),vx:(Math.random()-.5)*.00005});
    (function draw(){
      g.clearRect(0,0,W,H);
      dots.forEach(function(o){
        o.y+=o.vy;o.x+=o.vx;if(o.y<-.2)o.y=1.2;if(o.x<-.2)o.x=1.2;if(o.x>1.2)o.x=-.2;
        var x=o.x*W,y=o.y*H,r=o.r*dpr,gr=g.createRadialGradient(x,y,0,x,y,r);
        gr.addColorStop(0,"rgba(227,211,164,"+o.a+")");gr.addColorStop(1,"rgba(227,211,164,0)");
        g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,6.2832);g.fill();
      });
      requestAnimationFrame(draw);
    })();
  }
})();
