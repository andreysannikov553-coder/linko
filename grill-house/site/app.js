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


  // спуск и «камера» по настоящему фото блюда: всё привязано к прокрутке
  var tun=$("#tunnel");
  if(tun&&!reduce){
    var tbg=$(".t-bg",tun),tin=$(".t-intro",tun),shot=$(".t-shot",tun),cam=$(".t-cam",tun),img=$(".t-cam img",tun),sheen=$(".t-sheen",tun),fin=$(".t-final",tun);
    var steps=$$(".t-step",tun);
    var cl=function(x){return x<0?0:x>1?1:x},seg=function(p,a,b){return cl((p-a)/(b-a))};
    var io3=function(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2},lerp=function(a,b,t){return a+(b-a)*t};
    var IW=1280,IH=853,SW,SH,k,dw,dh,ox,oy,cr;
    var lay=function(){SW=shot.clientWidth||innerWidth;SH=shot.clientHeight||innerHeight;k=Math.max(SW/IW,SH/IH);dw=IW*k;dh=IH*k;ox=(SW-dw)/2;oy=(SH-dh)/2;
      img.style.width=dw+"px";img.style.height=dh+"px";img.style.left=ox+"px";img.style.top=oy+"px";cr=Math.min(SW/IW,SH/IH)/k};
    lay();addEventListener("resize",function(){lay();tunnelFrame()});
    // ключевые кадры камеры: [прогресс, фокус x, фокус y, зум]
    var K=[[.24,.40,.32,3.0],[.38,.42,.36,2.8],[.55,.62,.66,2.8],[.70,.36,.68,2.4],[.88,.55,.55,0]];
    var tunnelFrame=function(){
      var r=tun.getBoundingClientRect(),total=tun.offsetHeight-innerHeight;
      if(r.bottom<-50||r.top>innerHeight+50)return;
      var p=cl(-r.top/total);
      var dive=io3(seg(p,0,.3));
      tbg.style.transform="scale("+(1+dive*2.2).toFixed(3)+")";tbg.style.opacity=(1-dive).toFixed(3);
      var iv=seg(p,0,.06)*(1-seg(p,.16,.26)),go=seg(p,.16,.26);
      tin.style.opacity=iv.toFixed(3);tin.style.transform="translateY(calc(-50% - "+(70*go).toFixed(1)+"px)) scale("+(1+.35*go).toFixed(3)+")";
      shot.style.opacity=io3(seg(p,.2,.32)).toFixed(3);
      var smax=Math.min(3.2,2.4/k),zs=function(z){return z===0?Math.min(1,cr*1.15):1+(z-1)*(smax-1)/2.2};
      var a=K[0],b=K[K.length-1];
      for(var i=0;i<K.length-1;i++){if(p>=K[i][0]&&p<=K[i+1][0]){a=K[i];b=K[i+1];break}}
      if(p<K[0][0]){a=b=K[0]}
      var t=a===b?0:io3(seg(p,a[0],b[0]));
      var fx=lerp(a[1],b[1],t),fy=lerp(a[2],b[2],t),s=lerp(zs(a[3]),zs(b[3]),t);
      var px=ox+fx*dw,py=oy+fy*dh,dx=SW/2,dy=SH/2-(p>.8?seg(p,.8,.92)*SH*.08:0);
      var blur=(1-seg(p,.22,.38))*14;
      cam.style.transform="translate("+dx.toFixed(1)+"px,"+dy.toFixed(1)+"px) scale("+s.toFixed(4)+") translate("+(-px).toFixed(1)+"px,"+(-py).toFixed(1)+"px)";
      cam.style.filter=blur>.2?"blur("+blur.toFixed(1)+"px) saturate(1.05)":"saturate(1.05)";
      var sw=seg(p,.4,.8);sheen.style.opacity=(Math.sin(sw*Math.PI)*.9).toFixed(3);sheen.style.transform="translateX("+((sw-.5)*120).toFixed(1)+"%)";
      var si=p<.3?-1:p<.5?0:p<.66?1:p<.82?2:-1;
      steps.forEach(function(el,n){el.classList.toggle("on",n===si)});
      var f=io3(seg(p,.86,.97));
      fin.style.opacity=f.toFixed(3);fin.style.transform="translateY("+((1-f)*30).toFixed(1)+"px)";fin.classList.toggle("on",f>.5);
    };
    var oldFrame=frame;frame=function(){oldFrame();tunnelFrame()};
  }

  frame();

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
    t.scrollIntoView({block:"nearest",inline:"center",behavior:reduce?"auto":"smooth"});
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
