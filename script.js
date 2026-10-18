(function(){
  var TRACKS=[
    {title:'Paraluman',artist:'Adie',audio:'assets/audio/paraluman.mp3',cover:'assets/images/cover-paraluman.jpg',blur:'assets/images/blur-paraluman.jpg',note:'this songs always remind me of you po🥰',letter:true},
    {title:'Tahanan',artist:'Adie',audio:'assets/audio/tahanan.mp3',cover:'assets/images/cover-tahanan.jpg',blur:'assets/images/blur-tahanan.jpg',note:'this songs always remind me of you po🥰',letter:false},
    {title:'Mahika',artist:'Adie & Janine Berdin',audio:'assets/audio/mahika.mp3',cover:'assets/images/cover-mahika.jpg',blur:'assets/images/blur-mahika.jpg',note:'this songs always remind me of you po🥰',letter:false},
    {title:'Binibini',artist:'Zack Tabudlo',audio:'assets/audio/binibini.mp3',cover:'assets/images/cover-binibini.jpg',blur:'assets/images/blur-binibini.jpg',note:'this songs always remind me of you po🥰',letter:false}
  ];

  var $=function(id){return document.getElementById(id)};
  var audio=$('audio'),app=$('app'),btn=$('play'),seek=$('seek'),cur=$('cur'),dur=$('dur'),
      bgA=$('bg'),bgB=$('bg2'),veil=document.querySelector('.veil'),vz=$('viz'),
      cover=$('cover'),label=$('label'),disc=$('disc'),title=$('title'),artist=$('artist'),note=$('note'),chips=$('chips');
  var env=$('env'),idx=0,dragging=false,swapTimer=null,intent=false,fading=false,gen=0;
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fmt(s){if(!isFinite(s))return '0:00';var m=Math.floor(s/60),x=Math.floor(s%60);return m+':'+(x<10?'0':'')+x}
  function paint(){var p=audio.duration?audio.currentTime/audio.duration*100:0;
    seek.style.setProperty('--p',p+'%');if(!dragging)seek.value=p*10;cur.textContent=fmt(audio.currentTime)}

  chips.innerHTML=TRACKS.map(function(t,i){return '<button class="chip" data-i="'+i+'"><img alt="" src="'+t.cover+'"><span>'+t.title+'</span></button>'}).join('');
  chips.addEventListener('click',function(e){var b=e.target.closest('.chip');if(b&&+b.dataset.i!==idx)go(+b.dataset.i,true)});

  /* ===== background: two layers crossfade, it never dims between songs ===== */
  var bgFront=bgA,bgBack=bgB,bgTimer=0;
  function setBg(url){
    var nb=bgBack,ob=bgFront;
    clearTimeout(bgTimer);
    nb.style.setProperty('transition','none','important');
    nb.classList.remove('on');
    nb.style.backgroundImage='url('+url+')';
    veil.parentNode.insertBefore(nb,veil);
    void nb.offsetWidth;
    nb.style.removeProperty('transition');
    void nb.offsetWidth;
    nb.classList.add('on');
    bgTimer=setTimeout(function(){ob.classList.remove('on')},1500);
    bgFront=nb;bgBack=ob;
  }

  /* ===== look (cover, title, background) ===== */
  function ui(i){
    var t=TRACKS[i];
    cover.src=t.cover;label.src=t.cover;cover.alt='Cover of '+t.title;
    title.textContent=t.title;artist.textContent=t.artist;
    env.classList.toggle('off',!t.letter);
    note.firstChild.textContent=t.note||'';
    setBg(t.blur);
    document.title=t.title+' – '+t.artist;
    if('mediaSession' in navigator){try{navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.artist,artwork:[{src:t.cover,sizes:'447x447',type:'image/jpeg'}]})}catch(e){}}
  }
  function syncUI(){
    var on=!audio.paused&&!fading;
    app.classList.toggle('playing',on);
    btn.setAttribute('aria-label',on?'Pause':'Play');
  }

  /* ===== playing (switches right away, so the tap still counts as a user gesture) ===== */
  var playTimer=0,watch=0;
  function playSafe(tries,noWatch){
    clearTimeout(playTimer);
    if(!intent)return;
    var g=gen,p;
    try{p=audio.play()}catch(e){}
    if(p&&p.catch)p.catch(function(){
      if(g===gen&&tries>0)playTimer=setTimeout(function(){if(g===gen&&intent&&audio.paused)playSafe(tries-1,true)},300);
    });
    if(!noWatch){clearTimeout(watch);watch=setTimeout(function(){if(g===gen&&intent&&audio.paused&&!fading)playSafe(2,true)},2500)}
  }
  function audioSwitch(i,autoplay){
    gen++;idx=i;
    clearTimeout(playTimer);clearTimeout(watch);
    stopFade();
    intent=!!autoplay;
    try{audio.pause()}catch(e){}
    audio.src=TRACKS[i].audio;audio.load();
    seek.value=0;seek.style.setProperty('--p','0%');cur.textContent='0:00';dur.textContent='0:00';
    Array.prototype.forEach.call(chips.children,function(c,k){c.classList.toggle('on',k===i)});
    if(autoplay)playSafe(5);else syncUI();
  }
  function go(i,autoplay,instant){
    i=(i+TRACKS.length)%TRACKS.length;
    clearTimeout(swapTimer);
    audioSwitch(i,autoplay);
    if(instant){ui(i);return}
    app.classList.add('swap');
    swapTimer=setTimeout(function(){ui(idx);requestAnimationFrame(function(){app.classList.remove('swap')})},350);
  }

  /* ===== smooth fade-out when pausing ===== */
  var fadeTimer=0,FADE_MS=1600;
  var canVol=(function(){try{var o=audio.volume;audio.volume=.5;var ok=audio.volume===.5;audio.volume=o;return ok}catch(e){return false}})();
  function stopFade(){clearInterval(fadeTimer);fading=false;try{audio.volume=1}catch(e){}}
  function fadePause(){
    if(fading)return;
    intent=false;clearTimeout(playTimer);clearTimeout(watch);
    if(!canVol){audio.pause();return}
    fading=true;syncUI();
    var v0=audio.volume,t0=performance.now();
    clearInterval(fadeTimer);
    fadeTimer=setInterval(function(){
      var k=Math.max(0,Math.min(1,(performance.now()-t0)/FADE_MS)),e=(1-k)*(1-k);
      try{audio.volume=Math.max(0,Math.min(1,v0*e))}catch(x){}
      if(k>=1){clearInterval(fadeTimer);audio.pause();fading=false;try{audio.volume=1}catch(x){}syncUI()}
    },30);
  }

  /* ===== spinning record + sound meter ===== */
  var angle=0,speed=0,last=performance.now();
  function tick(now){var dt=Math.min(now-last,50);last=now;
    var target=(audio.paused||fading||reduce)?0:0.12;
    speed+=(target-speed)*Math.min(1,dt/500);
    if(speed>0.0005){angle=(angle+speed*dt)%360;disc.style.transform='rotate('+angle+'deg)'}
    drawViz(now);
    requestAnimationFrame(tick)}

  // The music always plays straight from the player. The meter only listens to a copy of it.
  var ac=null,an=null,fdata=null,msrc=null,realTap=false;
  function prepAC(){
    try{
      if(!ac){
        var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
        ac=new AC();an=ac.createAnalyser();an.fftSize=512;an.smoothingTimeConstant=.8;
        fdata=new Uint8Array(an.frequencyBinCount);
        var z=ac.createGain();z.gain.value=0;an.connect(z);z.connect(ac.destination);
      }
      if(ac.state==='suspended')ac.resume();
    }catch(e){ac=null}
  }
  function tap(){
    realTap=false;quiet=0;
    try{
      prepAC();if(!ac)return;
      var cs=audio.captureStream?audio.captureStream():(audio.mozCaptureStream?audio.mozCaptureStream():null);
      if(!cs||!cs.getAudioTracks().length)return;
      if(msrc){try{msrc.disconnect()}catch(e){}}
      msrc=ac.createMediaStreamSource(cs);msrc.connect(an);realTap=true;
    }catch(e){realTap=false}
  }
  document.addEventListener('pointerdown',prepAC,{passive:true});
  document.addEventListener('keydown',prepAC);

  var NB=16,lv=[],quiet=0;for(var q=0;q<NB;q++)lv.push(0);
  function drawViz(now){
    var dpr=window.devicePixelRatio||1,w=vz.clientWidth,h=vz.clientHeight;
    if(!w||!h)return;
    if(vz.width!==Math.round(w*dpr)||vz.height!==Math.round(h*dpr)){vz.width=Math.round(w*dpr);vz.height=Math.round(h*dpr)}
    var playing=!audio.paused,real=playing&&realTap&&an&&ac&&ac.state==='running';
    if(real){an.getByteFrequencyData(fdata);var tot=0;for(var z=0;z<fdata.length;z++)tot+=fdata[z];quiet=tot?0:quiet+1;if(quiet>90){realTap=false;real=false}}
    var vol=1;try{vol=audio.volume}catch(e){}
    vx=vz.getContext('2d');
    vx.setTransform(dpr,0,0,dpr,0,0);vx.clearRect(0,0,w,h);
    var gap=2.5,bw=Math.max(2,(w-gap*(NB-1))/NB),mid=h/2,maxB=fdata?fdata.length*.62:1;
    for(var i=0;i<NB;i++){
      var tgt=0;
      if(real){
        var a0=Math.floor(Math.pow(i/NB,1.7)*maxB)+1,a1=Math.max(a0+1,Math.floor(Math.pow((i+1)/NB,1.7)*maxB)+1),sum=0,n=0;
        for(var b=a0;b<a1&&b<fdata.length;b++){sum+=fdata[b];n++}
        tgt=n?sum/n/255:0;tgt=Math.pow(tgt,1.25)*(1+i/NB*.5);if(tgt>1)tgt=1;tgt*=vol;
      }else if(playing&&!realTap){
        tgt=(.25+.5*Math.abs(Math.sin(now/260+i*.9)))*(.6+.4*Math.sin(now/870+i*1.7))*vol;
      }
      lv[i]+=(tgt-lv[i])*(tgt>lv[i]?.5:.07);
      var bh=Math.max(3,lv[i]*h),x=i*(bw+gap);
      vx.globalAlpha=.35+lv[i]*.65;vx.fillStyle='#e8c3a6';
      if(vx.roundRect){vx.beginPath();vx.roundRect(x,mid-bh/2,bw,bh,bw/2);vx.fill()}else{vx.fillRect(x,mid-bh/2,bw,bh)}
    }
    vx.globalAlpha=1;
  }
  var vx=null;
  requestAnimationFrame(tick);

  /* ===== player events ===== */
  audio.addEventListener('loadedmetadata',function(){dur.textContent=fmt(audio.duration)});
  audio.addEventListener('timeupdate',paint);
  audio.addEventListener('canplay',function(){if(intent&&audio.paused&&!fading)playSafe(2,true)});
  audio.addEventListener('play',syncUI);
  audio.addEventListener('playing',function(){syncUI();tap()});
  audio.addEventListener('pause',function(){setTimeout(syncUI,150)});
  audio.addEventListener('ended',function(){go(idx+1,true)});

  btn.addEventListener('click',function(){
    if(audio.paused){stopFade();intent=true;playSafe(3);return}
    if(fading){stopFade();intent=true;syncUI();return}
    fadePause();
  });
  $('back').addEventListener('click',function(){audio.currentTime=Math.max(0,audio.currentTime-10)});
  $('fwd').addEventListener('click',function(){audio.currentTime=Math.min(audio.duration||0,audio.currentTime+10)});
  $('next').addEventListener('click',function(){go(idx+1,true)});
  $('prev').addEventListener('click',function(){if(audio.currentTime>3)audio.currentTime=0;else go(idx-1,true)});
  seek.addEventListener('input',function(){dragging=true;var t=seek.value/1000*(audio.duration||0);cur.textContent=fmt(t);seek.style.setProperty('--p',seek.value/10+'%')});
  seek.addEventListener('change',function(){audio.currentTime=seek.value/1000*(audio.duration||0);dragging=false});
  document.addEventListener('keydown',function(e){if(e.code==='Space'&&e.target===document.body){e.preventDefault();btn.click()}});
  if('mediaSession' in navigator){try{
    navigator.mediaSession.setActionHandler('play',function(){stopFade();intent=true;playSafe(3)});
    navigator.mediaSession.setActionHandler('pause',function(){fadePause()});
    navigator.mediaSession.setActionHandler('nexttrack',function(){go(idx+1,true)});
    navigator.mediaSession.setActionHandler('previoustrack',function(){go(idx-1,true)});
  }catch(e){}}

  go(0,false,true);

  /* ===== envelope ===== */
  var scene=$('scene'),big=$('bigenv'),isOpen=false,closing=false,timers=[],openW=0;
  function later(f,ms){timers.push(setTimeout(f,ms))}
  function clearT(){timers.forEach(clearTimeout);timers=[]}
  function openL(){
    if(isOpen||closing)return;isOpen=true;clearT();
    var vw=window.innerWidth,vh=window.innerHeight,E=Math.min(vw*.8,380,vh*.6);openW=vw;
    var S=Math.max(1,Math.min(Math.min(vw*.92,480)/(E*.9),(vh*.88)/(E*1.2)));
    scene.classList.add('reset');
    scene.style.setProperty('--E',E+'px');scene.style.setProperty('--L',(E*S)+'px');scene.style.setProperty('--k',1/S);
    var r=env.querySelector('.ea').getBoundingClientRect();
    big.style.setProperty('--fx',(r.left+r.width/2-vw/2)+'px');
    big.style.setProperty('--fy',(r.top+r.height/2-vh/2)+'px');
    big.style.setProperty('--fs',r.width/E);
    scene.classList.remove('show','open','slide','zoom');
    void scene.offsetWidth;scene.classList.remove('reset');
    scene.classList.add('on');env.classList.add('gone');
    void scene.offsetWidth;scene.classList.add('show');
    later(function(){scene.classList.add('open')},1200);
    later(function(){scene.classList.add('slide')},2200);
    later(function(){scene.classList.add('zoom')},3500);
  }
  function closeL(){
    if(!isOpen||closing)return;closing=true;clearT();
    scene.classList.remove('on');
    later(function(){
      scene.classList.add('reset');
      scene.classList.remove('show','open','slide','zoom');
      void scene.offsetWidth;scene.classList.remove('reset');
      env.classList.remove('gone');isOpen=false;closing=false;
    },700);
  }
  env.addEventListener('click',openL);
  $('close').addEventListener('click',closeL);
  $('sceneBg').addEventListener('click',closeL);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeL()});
  window.addEventListener('resize',function(){if(isOpen&&!closing&&Math.abs(window.innerWidth-openW)>60)closeL()});
})();
