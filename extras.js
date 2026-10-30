'use strict';
// Each cat is a tiny original pixel drawing, built from rectangles (no image downloads).
function pixelCat(palette) {
  const {outline, fur, light, shade, ears, collar} = palette;
  return `<svg viewBox="0 0 96 100" aria-hidden="true" shape-rendering="crispEdges">
    <ellipse cx="48" cy="95" rx="33" ry="3" fill="#071f2433"/>
    <path d="M64 76H76V68H80V56H88V76H84V84H64Z" fill="${outline}"/>
    <path d="M68 76H80V60H84V76H80V80H68Z" fill="${shade}"/>
    <path d="M28 56H64V64H68V84H72V92H60V96H24V92H20V84H24V64H28Z" fill="${outline}"/>
    <path d="M32 60H60V68H64V88H28V68H32Z" fill="${fur}"/>
    <path d="M40 68H52V72H56V84H36V72H40Z" fill="${light}"/>
    <path d="M28 84H40V92H24V88H28ZM52 84H64V88H68V92H52Z" fill="${light}"/>
    <path d="M12 24V4H20V8H24V12H28V16H60V12H64V8H68V4H76V24H80V52H76V60H68V64H24V60H16V52H12Z" fill="${outline}"/>
    <path d="M16 24V12H20V16H24V20H64V16H68V12H72V28H76V48H72V56H64V60H28V56H20V48H16Z" fill="${fur}"/>
    <path d="M20 16H24V24H20ZM64 20H68V16H72V28H64Z" fill="${ears}"/>
    <path d="M28 20H36V28H32V24H28ZM40 20H48V24H44V28H40ZM52 20H60V24H56V28H52Z" fill="${shade}"/>
    <path d="M20 28H28V32H20ZM28 52H64V56H28ZM32 48H60V52H32Z" fill="${light}"/>
    <g class="cat-open-eyes"><path d="M28 32H36V44H28ZM56 32H64V44H56Z" fill="#302b44"/>
    <path d="M28 32H32V36H28ZM56 32H60V36H56Z" fill="#fff8ef"/></g>
    <path class="cat-happy-eyes" d="M24 36H28V32H36V36H40V40H36V36H28V40H24ZM52 36H56V32H64V36H68V40H64V36H56V40H52Z" fill="#302b44"/>
    <path d="M20 44H28V48H20ZM64 44H72V48H64Z" fill="${ears}"/>
    <path d="M40 40H52V44H48V48H44V44H40Z" fill="#b96f9b"/>
    <path d="M36 48H40V52H44V48H48V52H52V48H56V52H52V56H48V52H44V56H40V52H36Z" fill="${outline}"/>
    <path d="M28 60H64V64H28Z" fill="${collar}"/><path d="M44 60H52V68H44Z" fill="#efcf8f"/><path d="M44 60H48V64H44Z" fill="#fff0c8"/>
    <path d="M28 88H32V92H28ZM56 88H60V92H56Z" fill="${shade}"/>
  </svg>`;
}
document.querySelector('#peach-cat').innerHTML = pixelCat({outline:'#5e4677',fur:'#b997dc',light:'#e1cff5',shade:'#9b76be',ears:'#e6b6d5',collar:'#80609e'});
document.querySelector('#mint-cat').innerHTML = pixelCat({outline:'#657080',fur:'#c8d0db',light:'#f0f2f7',shade:'#a0adbf',ears:'#d9b9ce',collar:'#9a82b7'});
let catTimer, petCount = 0;
function cuddleCats() {
  clearTimeout(catTimer); petCount++;
  const couple = document.querySelector('#pixel-couple');
  couple.classList.remove('cuddling'); void couple.offsetWidth; couple.classList.add('cuddling');
  document.querySelector('#cat-message').textContent = ['میو… یکی برای من، یکی برای تو ♡','پیشی‌ها می‌گویند: کنار تو گرم‌تر است.','این همه قلب از یک نوازش کوچولو!'][petCount % 3];
  const love = document.querySelector('#pixel-love'); love.replaceChildren();
  for (let i=0;i<7;i++) { const heart=document.createElement('span');heart.textContent='♥';heart.style.setProperty('--drift',`${(i-3)*20}px`);heart.style.setProperty('--delay',`${i*.08}s`);love.append(heart); }
  catTimer=setTimeout(()=>couple.classList.remove('cuddling'),2400);
}
document.querySelectorAll('.pixel-cat').forEach(button=>button.addEventListener('click',cuddleCats));
const songAudio=document.querySelector('#lover-song');
const songToggle=document.querySelector('#song-toggle'), songSeek=document.querySelector('#song-seek');
const songStatus=document.querySelector('#song-status');
const formatSongTime=seconds=>Number.isFinite(seconds)?`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`:'—:—';
function syncSong(){
 const playing=!songAudio.paused&&!songAudio.ended;
 document.querySelector('.music-gift').classList.toggle('song-playing',playing);
 songToggle.setAttribute('aria-pressed',playing);songToggle.setAttribute('aria-label',playing?'توقف آهنگ':'پخش آهنگ');
 document.querySelector('#song-toggle-icon').textContent=playing?'Ⅱ':'▶';
}
function syncSongTime(){
 const duration=songAudio.duration, ready=Number.isFinite(duration)&&duration>0;
 songSeek.disabled=!ready;
 const progress=ready?Math.min(1000,Math.round(songAudio.currentTime/duration*1000)):0;
 songSeek.value=progress;songSeek.style.setProperty('--progress',`${progress/10}%`);
 songSeek.setAttribute('aria-valuetext',`${formatSongTime(songAudio.currentTime)} از ${formatSongTime(duration)}`);
 document.querySelector('#song-elapsed').textContent=formatSongTime(songAudio.currentTime);
 document.querySelector('#song-duration').textContent=formatSongTime(duration);
}
['play','pause','ended'].forEach(type=>songAudio.addEventListener(type,syncSong));
['loadedmetadata','durationchange','timeupdate','seeked','emptied'].forEach(type=>songAudio.addEventListener(type,syncSongTime));
songToggle.onclick=async()=>{
 if(!songAudio.paused){songAudio.pause();return;}
 songToggle.disabled=true;songStatus.textContent='آهنگ در حال آماده‌شدن است…';
 let timeout;
 try{
  await Promise.race([songAudio.play(),new Promise((_,reject)=>{timeout=setTimeout(()=>{songAudio.pause();reject(new Error('timeout'));},12000);})]);
  songStatus.textContent='این چند دقیقه، فقط برای ما ♡';
 }catch{songStatus.textContent='پخش شروع نشد؛ دوباره دکمه‌ی پخش را بزن.';}
 finally{clearTimeout(timeout);songToggle.disabled=false;syncSong();}
};
songSeek.addEventListener('input',()=>{if(Number.isFinite(songAudio.duration))songAudio.currentTime=Number(songSeek.value)/1000*songAudio.duration;syncSongTime();});
function skipSong(seconds){if(Number.isFinite(songAudio.duration))songAudio.currentTime=Math.max(0,Math.min(songAudio.duration,songAudio.currentTime+seconds));}
document.querySelector('#song-back').onclick=()=>skipSong(-10);
document.querySelector('#song-forward').onclick=()=>skipSong(10);
document.querySelector('#song-repeat').onclick=event=>{songAudio.loop=!songAudio.loop;event.currentTarget.setAttribute('aria-pressed',songAudio.loop);};
songAudio.volume=.8;
document.querySelector('#song-volume').addEventListener('input',event=>{songAudio.volume=Number(event.target.value);});
songAudio.addEventListener('error',()=>{songStatus.textContent='آهنگ بارگذاری نشد؛ صفحه را دوباره باز کن.';syncSong();});
document.querySelector('#song-console').hidden=false;songAudio.controls=false;songAudio.hidden=true;
syncSong();syncSongTime();

const symbols=[{icon:'♥',name:'قلب'},{icon:'☾',name:'ماه'},{icon:'✿',name:'گل'},{icon:'=^.^=',name:'پیشی'}];
let memoryDeck=[],openCards=[],matchedPairs=0,moves=0,lockBoard=false,memoryTimer=null;
function startMemory(){
  clearTimeout(memoryTimer);openCards=[];matchedPairs=0;moves=0;lockBoard=false;
  memoryDeck=[0,1,2,3,0,1,2,3];
  for(let i=memoryDeck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[memoryDeck[i],memoryDeck[j]]=[memoryDeck[j],memoryDeck[i]];}
  const board=document.querySelector('#memory-board');board.replaceChildren();
  memoryDeck.forEach((symbol,index)=>{const button=document.createElement('button');button.className='memory-card';button.innerHTML='<span class="memory-back" aria-hidden="true">✧</span><span class="memory-front" aria-hidden="true">'+symbols[symbol].icon+'</span>';button.setAttribute('aria-label',`کارت ${index+1}، بسته`);button.onclick=()=>flipMemory(index);board.append(button);});
  document.querySelector('#memory-score').textContent='۰ جفت از ۴';document.querySelector('#memory-message').textContent='بدون عجله؛ این بازی زمان‌سنج ندارد.';
}
function flipMemory(index){
  const cards=[...document.querySelectorAll('.memory-card')],button=cards[index];
  if(lockBoard||button.classList.contains('flipped')||button.classList.contains('matched'))return;
  button.classList.add('flipped');button.setAttribute('aria-label',symbols[memoryDeck[index]].name);openCards.push(index);
  if(openCards.length!==2)return;
  moves++;const [a,b]=openCards;
  if(memoryDeck[a]===memoryDeck[b]){
    matchedPairs++;[cards[a],cards[b]].forEach(el=>{el.classList.add('matched');el.disabled=true;});openCards=[];
    document.querySelector('#memory-score').textContent=`${new Intl.NumberFormat('fa').format(matchedPairs)} جفت از ۴`;
    if(matchedPairs===4){document.querySelector('#memory-message').textContent=`همه به هم رسیدند! با ${new Intl.NumberFormat('fa').format(moves)} حرکت ♡`;cuddleCats();document.querySelector('#memory-restart').focus({preventScroll:true});}
  }else{
    lockBoard=true;memoryTimer=setTimeout(()=>{[a,b].forEach(i=>{cards[i].classList.remove('flipped');cards[i].setAttribute('aria-label',`کارت ${i+1}، بسته`);});openCards=[];lockBoard=false;},900);
  }
}
document.querySelector('#memory-restart').onclick=startMemory;
startMemory();
