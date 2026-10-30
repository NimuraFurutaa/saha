'use strict';
// Each cat is a tiny original pixel drawing, built from rectangles (no image downloads).
const pixelPattern = ['..11......11..','..121....121..','..1221111221..','.122222222221.','.122222222221.','.122122221221.','.122222222221.','..1222322221..','...12222221...','....122221....','...12222221...','..1222222221..','..1222222221..','11122222222211','12222222222221','.111111111111.'];
function pixelCat(ink, blush) {
  const palette = {1:ink,2:blush,3:'#b36772'};
  return '<svg viewBox="0 0 56 64" aria-hidden="true" shape-rendering="crispEdges">'+pixelPattern.flatMap((row,y)=>[...row].map((cell,x)=>cell==='.'?'':`<rect x="${x*4}" y="${y*4}" width="4" height="4" fill="${palette[cell]}"/>`)).join('')+'</svg>';
}
document.querySelector('#peach-cat').innerHTML = pixelCat('#936e61','#e9bc96');
document.querySelector('#mint-cat').innerHTML = pixelCat('#4e766f','#a4c2ad');
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
const songButton=document.querySelector('#song-play');
songButton.onclick=()=>{
  const player=document.querySelector('#spotify-player');
  const open=player.hidden;
  if(open && !player.firstElementChild){
    const frame=document.createElement('iframe');
    frame.src='https://open.spotify.com/embed/track/1ucnuV88gFTfR3BalmznDk?utm_source=generator&theme=0';
    frame.title='پخش Lover Is a Day از Cuco در Spotify';
    frame.allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    frame.allowFullscreen=true;frame.width='100%';frame.height='352';
    player.append(frame);
  }
  // Keep the same frame when closing, so its playback state is not lost.
  player.hidden=!open;songButton.setAttribute('aria-expanded',open);
  songButton.textContent=open?'بستن پخش‌کننده':'♫ بازکردن پخش‌کننده';
};

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
