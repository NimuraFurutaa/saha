'use strict';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const persister = {
  read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
};
const fa = new Intl.NumberFormat('en');
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  document.body.classList.add('motion-ready');
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: .08 });
  $$('.appear').forEach(el => observer.observe(el));
}
function hearts() {
  if (reducedMotion.matches) return;
  for (let i = 0; i < 16; i++) {
    const el = document.createElement('span');
    el.className = 'heart'; el.textContent = '♡'; el.setAttribute('aria-hidden', 'true');
    el.style.left = `${Math.random() * 96}vw`; el.style.fontSize = `${20 + Math.random() * 22}px`;
    el.style.animationDelay = `${Math.random() * .8}s`; document.body.append(el);
    setTimeout(() => el.remove(), 5000);
  }
}

// Drawings are stored as normalized vectors, so they survive resizing and export cleanly.
const canvas = $('#drawing'), ctx = canvas.getContext('2d');
const colors = $$('.swatch').map(el => el.dataset.color);
const brushTypes = ['pen', 'heart', 'flower', 'mirror', 'watercolor', 'rainbow', 'star', 'moon', 'cat', 'eraser'];
const stampTypes = ['heart', 'flower', 'star', 'moon', 'cat'];
const paperThemes = { cream: '#f7efdf', mint: '#e1eddf', rose: '#f3e1dc', night: '#183039' };
let paperTheme = persister.read('our-world-paper-v1', 'cream');
if (!Object.hasOwn(paperThemes, paperTheme)) paperTheme = 'cream';
let undoHistory = [], redoHistory = [], replayFrame = null;
let strokes = persister.read('our-world-drawing-v1', []);
if (!Array.isArray(strokes)) strokes = [];
strokes = strokes.filter(s => s && /^#[0-9a-f]{6}$/i.test(s.color) && brushTypes.includes(s.brush) && Number.isFinite(s.size) && s.size >= 2 && s.size <= 18 && (s.opacity === undefined || (Number.isFinite(s.opacity) && s.opacity >= .15 && s.opacity <= 1)) && Array.isArray(s.points) && s.points.length > 0 && s.points.length <= 5000 && s.points.every(p => Array.isArray(p) && p.length === 2 && p.every(n => Number.isFinite(n) && n >= 0 && n <= 1)));
let color = colors[0], brush = 'pen', brushSize = 5, brushOpacity = 1, currentStroke = null, activePointer = null;
let canvasWidth = 1, canvasHeight = 1;
function stamp(context, x, y, size, type, ink) {
  context.save(); context.translate(x, y); context.fillStyle = ink;
  if (type === 'heart') {
    context.scale(size / 20, size / 20); context.beginPath(); context.moveTo(0, 8);
    context.bezierCurveTo(-22, -5, -7, -21, 0, -9); context.bezierCurveTo(7, -21, 22, -5, 0, 8); context.fill();
  } else if (type === 'star') {
    context.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5 - Math.PI / 2, r = size * (i % 2 ? .38 : .9);
      context.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    context.closePath(); context.fill();
  } else if (type === 'moon') {
    context.beginPath(); context.arc(0, 0, size * .8, .6, Math.PI * 2 - .6);
    context.quadraticCurveTo(-size * .45, 0, Math.cos(.6) * size * .8, Math.sin(.6) * size * .8); context.fill();
  } else if (type === 'cat') {
    context.scale(size / 20, size / 20); context.beginPath(); context.moveTo(-16, -5);
    context.lineTo(-18, -22); context.lineTo(-6, -13); context.quadraticCurveTo(0, -16, 6, -13);
    context.lineTo(18, -22); context.lineTo(16, -5); context.bezierCurveTo(23, 20, -23, 20, -16, -5); context.fill();
    context.strokeStyle = '#f7efdf'; context.lineWidth = 1.5; context.beginPath();
    context.moveTo(-10, -2); context.lineTo(-6, 0); context.lineTo(-3, -2);
    context.moveTo(3, -2); context.lineTo(6, 0); context.lineTo(10, -2); context.moveTo(-2, 5); context.lineTo(0, 7); context.lineTo(2, 5); context.stroke();
  } else {
    for (let i = 0; i < 5; i++) {
      context.save(); context.rotate(i * Math.PI * 2 / 5); context.beginPath(); context.ellipse(0, -size * .45, size * .25, size * .45, 0, 0, Math.PI * 2); context.fill(); context.restore();
    }
    context.fillStyle = '#f3d28c'; context.beginPath(); context.arc(0, 0, size * .19, 0, Math.PI * 2); context.fill();
  }
  context.restore();
}
function renderStroke(context, stroke, width, height) {
  context.save();
  context.globalAlpha = stroke.opacity ?? 1;
  if (stroke.brush === 'eraser') context.globalCompositeOperation = 'destination-out';
  renderStrokeInk(context, stroke, width, height);
  context.restore();
}
function renderStrokeInk(context, stroke, width, height) {
  const scale = Math.min(width, height) / 420, lineWidth = stroke.size * scale;
  if (stampTypes.includes(stroke.brush)) {
    stroke.points.forEach(([x, y]) => stamp(context, x * width, y * height, (stroke.size + 12) * scale, stroke.brush, stroke.color)); return;
  }
  if (stroke.brush === 'watercolor') {
    const radius = (stroke.size + 9) * scale;
    stroke.points.forEach(([x, y]) => {
      const gradient = context.createRadialGradient(x * width, y * height, 0, x * width, y * height, radius);
      gradient.addColorStop(0, stroke.color + '38'); gradient.addColorStop(.6, stroke.color + '18'); gradient.addColorStop(1, stroke.color + '00');
      context.fillStyle = gradient; context.fillRect(x * width - radius, y * height - radius, radius * 2, radius * 2);
    }); return;
  }
  if (stroke.brush === 'rainbow') {
    context.lineWidth = lineWidth; context.lineCap = 'round';
    stroke.points.forEach(([x, y], i) => {
      const previous = stroke.points[Math.max(0, i - 1)];
      context.strokeStyle = context.fillStyle = `hsl(${(x * 360 + y * 180) % 360} 65% 60%)`;
      context.beginPath(); context.moveTo(previous[0] * width, previous[1] * height); context.lineTo(x * width, y * height); context.stroke();
      if (!i) { context.beginPath(); context.arc(x * width, y * height, lineWidth / 2, 0, Math.PI * 2); context.fill(); }
    }); return;
  }
  const path = mirror => {
    context.beginPath(); context.strokeStyle = stroke.color; context.fillStyle = stroke.color;
    context.lineWidth = stroke.brush === 'eraser' ? lineWidth * 4 : lineWidth; context.lineCap = 'round'; context.lineJoin = 'round';
    const points = stroke.points.map(([x, y]) => [(mirror ? 1 - x : x) * width, y * height]);
    if (points.length === 1) { context.arc(points[0][0], points[0][1], context.lineWidth / 2, 0, Math.PI * 2); context.fill(); return; }
    points.forEach(([x, y], i) => i ? context.lineTo(x, y) : context.moveTo(x, y)); context.stroke();
  };
  path(false); if (stroke.brush === 'mirror') path(true);
}
function renderDrawing() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  strokes.forEach(s => renderStroke(ctx, s, canvasWidth, canvasHeight));
  if (currentStroke) renderStroke(ctx, currentStroke, canvasWidth, canvasHeight);
  $('#canvas-hint').classList.toggle('hidden', strokes.length > 0 || !!currentStroke);
  $('#undo').disabled = strokes.length === 0 && undoHistory.length === 0;
  $('#redo').disabled = redoHistory.length === 0;
}
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvasWidth = rect.width; canvasHeight = rect.height;
  canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0); renderDrawing();
}
new ResizeObserver(resizeCanvas).observe(canvas);
function saveDrawing() {
  const saved = persister.write('our-world-drawing-v1', strokes);
  $('#save-status').textContent = saved ? 'Your drawing stays in this browser ♡' : 'Use the download button to keep your drawing.';
}
function point(event) {
  const rect = canvas.getBoundingClientRect();
  return [Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))];
}
// Drawing gestures should not become double-taps or synthetic clicks on the next tool.
canvas.addEventListener('touchstart', event => { if (event.cancelable) event.preventDefault(); }, { passive: false });
canvas.addEventListener('pointerdown', event => {
  if (activePointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
  stopReplay(); canvas.focus({ preventScroll: true });
  activePointer = event.pointerId; canvas.setPointerCapture(event.pointerId);
  currentStroke = { color, brush, size: brushSize, opacity: brushOpacity, points: [point(event)] }; renderDrawing();
});
canvas.addEventListener('pointermove', event => {
  if (event.pointerId !== activePointer || !currentStroke || currentStroke.points.length >= 5000) return;
  const p = point(event), prev = currentStroke.points.at(-1);
  const distance = Math.hypot((p[0] - prev[0]) * canvasWidth, (p[1] - prev[1]) * canvasHeight);
  const threshold = stampTypes.includes(currentStroke.brush) ? (currentStroke.size + 12) * Math.min(canvasWidth, canvasHeight) / 420 * 1.5 : currentStroke.brush === 'watercolor' ? 4 : 1;
  if (distance < threshold) return;
  currentStroke.points.push(p); renderDrawing();
});
function finishStroke(event) {
  if (event.pointerId !== activePointer) return;
  if (currentStroke) { commitDrawing([...strokes, currentStroke]); currentStroke = null; }
  activePointer = null; renderDrawing(); saveDrawing();
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => canvas.addEventListener(type, finishStroke));
$$('.swatch').forEach(button => button.addEventListener('click', () => {
  color = button.dataset.color;
  $$('.swatch').forEach(el => { el.classList.toggle('selected', el === button); el.setAttribute('aria-pressed', el === button); });
}));
$$('[data-brush]').forEach(button => button.addEventListener('click', () => {
  brush = button.dataset.brush;
  $$('[data-brush]').forEach(el => { el.classList.toggle('selected', el === button); el.setAttribute('aria-pressed', el === button); });
}));
$('#brush-size').addEventListener('input', event => { brushSize = +event.target.value; });
$('#brush-opacity').addEventListener('input', event => { brushOpacity = +event.target.value / 100; });
$('#custom-color').addEventListener('input', event => { color = event.target.value; $$('.swatch').forEach(el => { el.classList.remove('selected'); el.setAttribute('aria-pressed', 'false'); }); });
function stopReplay() { if (replayFrame !== null) { cancelAnimationFrame(replayFrame); replayFrame = null; renderDrawing(); } $('#replay-drawing').textContent = '▷ Replay'; }
function commitDrawing(next) {
  stopReplay(); undoHistory.push(strokes); if (undoHistory.length > 40) undoHistory.shift();
  redoHistory = []; strokes = next; renderDrawing(); saveDrawing();
}
function undoDrawing() {
  stopReplay(); if (!strokes.length && !undoHistory.length) return;
  redoHistory.push(strokes); strokes = undoHistory.length ? undoHistory.pop() : strokes.slice(0, -1); renderDrawing(); saveDrawing();
}
function redoDrawing() { stopReplay(); if (!redoHistory.length) return; undoHistory.push(strokes); strokes = redoHistory.pop(); renderDrawing(); saveDrawing(); }
$('#undo').addEventListener('click', undoDrawing);
$('#redo').addEventListener('click', redoDrawing);
$('.drawing-studio').addEventListener('keydown', event => {
  if (event.target.matches('input, textarea, select') || !(event.ctrlKey || event.metaKey)) return;
  if (event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redoDrawing() : undoDrawing(); }
  if (event.key.toLowerCase() === 'y') { event.preventDefault(); redoDrawing(); }
});
$('#replay-drawing').onclick = () => {
  if (replayFrame !== null) { stopReplay(); return; }
  if (!strokes.length || reducedMotion.matches) { renderDrawing(); return; }
  const start = performance.now(), count = strokes.reduce((sum, s) => sum + s.points.length, 0);
  $('#replay-drawing').textContent = 'Ⅱ Stop replay';
  const frame = time => {
    let left = Math.ceil(Math.min(1, (time - start) / 3500) * count);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    for (const s of strokes) { if (left <= 0) break; renderStroke(ctx, {...s, points: s.points.slice(0, left)}, canvasWidth, canvasHeight); left -= s.points.length; }
    if (time - start < 3500) replayFrame = requestAnimationFrame(frame); else { replayFrame = null; stopReplay(); renderDrawing(); }
  };
  replayFrame = requestAnimationFrame(frame);
};
function applyPaper() {
  $('.canvas-wrap').style.backgroundColor = paperThemes[paperTheme];
  $('.canvas-wrap').classList.toggle('night-paper', paperTheme === 'night');
  $('#paper-theme').value = paperTheme;
}
$('#paper-theme').onchange = event => { paperTheme = event.target.value; applyPaper(); persister.write('our-world-paper-v1', paperTheme); };
applyPaper();
$$('[data-template]').forEach(button => button.onclick = () => {
  const additions = [], make = (b, points, c = color, size = 5) => ({ brush: b, color: c, size, opacity: 1, points });
  if (button.dataset.template === 'heart') {
    const points = Array.from({ length: 101 }, (_, i) => { const t = i / 100 * Math.PI * 2; return [.5 + .19 * Math.sin(t) ** 3, .45 - .018 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]; });
    additions.push(make('pen', points, color, 3));
  } else if (button.dataset.template === 'wreath') {
    for (let i = 0; i < 14; i++) { const t = i * Math.PI / 7; additions.push(make('flower', [[.5 + Math.cos(t) * .25, .5 + Math.sin(t) * .32]], colors[i % colors.length], 9)); }
  } else {
    additions.push(make('moon', [[.5, .37]], '#d6a44b', 18));
    [[.2,.25],[.3,.62],[.7,.24],[.8,.54],[.62,.7],[.4,.18]].forEach(p => additions.push(make('star', [p], '#d6a44b', 6)));
  }
  commitDrawing([...strokes, ...additions]);
});
const drawingIdeas = ['Draw a butterfly with the mirror brush. Two wings, one movement.', 'Two cats under the moon. One for you, one for me.', 'Paint a watercolor sunset, then add a few stars.', 'Add a heart stencil and draw flowers around it.', 'Invent a little planet. You choose its colors.', 'A bouquet of flowers that only exists in our world!'];
let drawingIdeaIndex = 0;
$('#drawing-idea').onclick = () => { $('#idea-hint').textContent = drawingIdeas[drawingIdeaIndex++ % drawingIdeas.length]; };

$('#clear-drawing').addEventListener('click', () => {
  if (!strokes.length) return;
  showModal('<h2 id="modal-title">A fresh canvas?</h2><p>This will clear your drawing. Download a keepsake first if you love it.</p><button id="confirm-clear" class="primary">Clear and start again</button>');
  $('#confirm-clear').onclick = () => { commitDrawing([]); modal.close(); };
});
function makeArt(width = 1600) {
  const output = document.createElement('canvas'); output.width = width; output.height = Math.round(width * canvasHeight / canvasWidth);
  const ink = output.getContext('2d');
  // Render on transparency first: the eraser must not punch holes through the paper.
  strokes.forEach(s => renderStroke(ink, s, output.width, output.height));
  ink.globalCompositeOperation = 'destination-over'; ink.fillStyle = paperThemes[paperTheme]; ink.fillRect(0, 0, output.width, output.height); ink.globalCompositeOperation = 'source-over';
  return output;
}
function downloadCanvas(output, filename) {
  output.toBlob(blob => {
    if (!blob) { $('#save-status').textContent = 'Could not save. Please try again.'; return; }
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.download = filename; link.href = url; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000); $('#save-status').textContent = 'A little piece of our world to keep ♡';
  }, 'image/png');
}
$('#download').addEventListener('click', () => {
  const output = makeArt(), ink = output.getContext('2d');
  ink.fillStyle = '#80917e'; ink.font = '16px Georgia'; ink.fillText('MADE BY US ♡', 30, output.height - 25);
  downloadCanvas(output, 'our-little-world.png');
});
$('#postcard').onclick = () => {
  stopReplay();
  showModal('<h2 id="modal-title">Made by you, for your person</h2><canvas id="postcard-preview" width="1000" height="1000" aria-label="Drawing postcard preview"></canvas><div class="postcard-controls"><label>Frame <select id="postcard-frame"><option value="cream">Vintage paper</option><option value="rose">Peach</option><option value="night">Starry night</option></select></label><label for="postcard-message">A little signature</label><input id="postcard-message" maxlength="50" value="A little piece of our world ♡"><button id="download-postcard" class="primary">↓ Save postcard</button></div>');
  const preview = $('#postcard-preview'), c = preview.getContext('2d'), art = makeArt(880);
  function drawPostcard() {
    const theme = $('#postcard-frame').value;
    c.fillStyle = paperThemes[theme]; c.fillRect(0, 0, 1000, 1000);
    c.strokeStyle = theme === 'night' ? '#c4ad77' : '#ae9871'; c.lineWidth = 2; c.strokeRect(28, 28, 944, 944);
    const ratio = Math.min(880 / art.width, 700 / art.height), w = art.width * ratio, h = art.height * ratio;
    c.save(); c.shadowColor = '#00000022'; c.shadowBlur = 20; c.shadowOffsetY = 9; c.drawImage(art, (1000-w)/2, 70 + (700-h)/2, w, h); c.restore();
    c.fillStyle = theme === 'night' ? '#ead6ad' : '#435c4e'; c.font = '30px Tahoma'; c.textAlign = 'center'; c.direction = 'rtl';
    c.fillText($('#postcard-message').value, 500, 858, 850); c.font = '15px Georgia'; c.fillText('MADE BY US • WITH LOVE', 500, 920);
    for (const [x,y] of [[65,55],[935,55],[65,945],[935,945]]) stamp(c,x,y,10,'star','#b09a6d');
  }
  $('#postcard-frame').onchange = drawPostcard; $('#postcard-message').oninput = drawPostcard;
  $('#download-postcard').onclick = () => downloadCanvas(preview, 'a-postcard-for-you.png'); drawPostcard();
};

// A small, locally remembered garden. All SVG values come from validated numbers.
let flowers = persister.read('our-world-garden-v1', []);
if (!Array.isArray(flowers)) flowers = [];
flowers = flowers.filter(f => f && ['x', 'y', 'height', 'hue', 'lean'].every(key => Number.isFinite(f[key])) && f.x >= 20 && f.x <= 580 && f.y >= 180 && f.y <= 340 && f.height >= 45 && f.height <= 110 && f.hue >= 0 && f.hue <= 3 && Number.isInteger(f.hue) && Math.abs(f.lean) <= 15).slice(-36);
const flowerColors = ['#e5ae9b', '#f1d491', '#d5b9c9', '#f0e5bc'];
function flowerMarkup(f) {
  const petals = Array.from({length: 6}, (_, i) => `<ellipse cx="0" cy="-10" rx="7" ry="12" fill="${flowerColors[f.hue]}" transform="rotate(${i * 60})"/>`).join('');
  return `<g transform="translate(${f.x} ${f.y})"><g class="flower-grow"><g class="flower-sway" style="animation-delay:-${f.hue}s"><path d="M0 0Q${f.lean} ${-f.height / 2} 0 ${-f.height}" fill="none" stroke="#466b4d" stroke-width="3"/><path d="M0 -20Q-30 -50-26 -25Q-14 -16 0 -20M0 -40Q28 -63 27 -42Q17 -31 0 -40" fill="#66845b"/><g transform="translate(0 ${-f.height})">${petals}<circle r="6" fill="#a98448"/><circle r="2" fill="#f7e7ae"/></g></g></g></g>`;
}
function updateGarden(animate = false) {
  $('#flowers').innerHTML = flowers.map(flowerMarkup).join('');
  if (!animate) $$('#flowers .flower-grow').forEach(el => { el.style.animation = 'none'; });
  else $$('#flowers .flower-grow').slice(0, -1).forEach(el => { el.style.animation = 'none'; });
  $('#flower-count').textContent = flowers.length ? `${fa.format(flowers.length)} flowers, planted by you` : 'Our little garden';
}
function plant(x, y) {
  flowers.push({ x: Math.max(20, Math.min(580, x)), y: Math.max(180, Math.min(340, y)), height: 45 + Math.random() * 65, hue: Math.floor(Math.random() * 4), lean: (Math.random() - .5) * 30 });
  if (flowers.length > 36) flowers.shift();
  updateGarden(true); persister.write('our-world-garden-v1', flowers);
}
$('#garden').addEventListener('click', event => {
  const rect = event.currentTarget.getBoundingClientRect(); plant((event.clientX - rect.left) / rect.width * 600, (event.clientY - rect.top) / rect.height * 370);
});
$('#plant-flower').addEventListener('click', () => plant(50 + Math.random() * 500, 210 + Math.random() * 120));
$('#clear-garden').addEventListener('click', () => {
  if (!flowers.length) return;
  showModal('<h2 id="modal-title">Plant a new garden?</h2><p>This will clear the flowers so you can plant a fresh garden.</p><button class="primary" id="confirm-garden">A fresh garden</button>');
  $('#confirm-garden').onclick = () => { flowers = []; updateGarden(); persister.write('our-world-garden-v1', flowers); modal.close(); };
});
updateGarden();

const starPoints = [[300, 115], [235, 70], [160, 100], [155, 180], [300, 285], [445, 180], [440, 100], [365, 70]];
let visitedStars = 0;
$('#sky-dust').innerHTML = Array.from({length: 45}, (_, i) => `<circle cx="${(i * 137 + 27) % 590}" cy="${(i * 73 + 19) % 340}" r="${i % 4 === 0 ? 1.3 : .7}" fill="#d6dcb5" opacity="${.15 + (i % 5) * .1}"/>`).join('');
starPoints.forEach(([x, y], i) => {
  const button = document.createElement('button'); button.className = 'star-button'; button.textContent = '✦';
  button.style.left = `${x / 6}%`; button.style.top = `${y / 3.7}%`; button.setAttribute('aria-label', `Connect star ${fa.format(i + 1)}`);
  button.onclick = () => { if (i === visitedStars) { visitedStars++; updateStars(); if (visitedStars === starPoints.length) hearts(); } };
  $('#star-buttons').append(button);
});
function updateStars() {
  const done = visitedStars === starPoints.length;
  $$('.star-button').forEach((button, i) => { button.classList.toggle('next', i === visitedStars); button.classList.toggle('visited', i < visitedStars); button.disabled = i !== visitedStars; });
  const points = starPoints.slice(0, visitedStars);
  $('#constellation-line').setAttribute('d', points.length ? points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ') + (done ? ' Z' : '') : '');
  $('#constellation').classList.toggle('complete', done);
  $('#sky-hint').textContent = done ? 'Look! Even distance can turn into a heart.' : 'Tap the glowing star';
  $('#star-count').textContent = `${fa.format(visitedStars)} of 8 stars`;
  if (visitedStars > 0 && !done) $$('.star-button')[visitedStars].focus({ preventScroll: true });
  if (done) $('#reset-stars').focus({ preventScroll: true });
}
$('#reset-stars').onclick = () => { visitedStars = 0; updateStars(); $$('.star-button')[0].focus({ preventScroll: true }); };
updateStars();

const modal = $('#modal'), content = $('#content');
function showModal(html) { content.innerHTML = html; if (!modal.open) modal.showModal(); }
const dates = [
  ['☕', 'kheli khari osgol', 'I loaf my gav'],
  ['☾', 'hihihih', 'I really wanna be in our home together'],
  ['❀', 'rangarangi', 'pishi bazi'],
  ['♨', 'osgol bazi donafare', 'ahmagho']
];
let dateIndex = -1;
function openDate() {
  dateIndex = (dateIndex + 1) % dates.length; const [art, title, body] = dates[dateIndex];
  showModal(`<div class="eyebrow">Dates still to come</div><div class="date-art" aria-hidden="true">${art}</div><h2 id="modal-title">${title}</h2><p>${body}</p><button id="next-date" class="primary">Another little date ↶</button>`);
  $('#next-date').onclick = openDate;
}
$$('[data-room]').forEach(button => button.onclick = () => {
  if (button.dataset.room === 'letter') {
    showModal('<div class="date-art" aria-hidden="true">✉</div><h2 id="modal-title">helloooo saha</h2><p>You are ma lil pretty mommy</p><button class="primary" id="secret">open it</button>');
    $('#secret').onclick = event => { event.target.outerHTML = '<div class="reveal">I’m so glad to have you.</div>'; hearts(); };
  } else if (button.dataset.room === 'future') openDate();
  else {
    showModal('<div class="date-art" aria-hidden="true">✧</div><h2 id="modal-title">you wish</h2><label for="wish" class="hint">Put your wish in the bottle</label><textarea id="wish" maxlength="240" placeholder="us.one day"></textarea><button id="release-wish" class="primary">Let it fly ↑</button><p class="hint">Just for this moment. Your wish is not saved or sent anywhere.</p>');
    $('#release-wish').onclick = () => {
      if (!$('#wish').value.trim()) { $('#wish').focus(); return; }
      content.innerHTML = '<h2 id="modal-title">Now the sky knows.</h2><div class="wish-flight" aria-hidden="true">✧</div><p>one day we are together</p>'; hearts();
    };
  }
});
$('#moon').onclick = () => { showModal('<div class="date-art" aria-hidden="true">☾</div><h2 id="modal-title">moon</h2><p>us?</p><button id="moon-garden" class="primary">Grow a flower for us</button>'); $('#moon-garden').onclick = () => { modal.close(); $('#garden').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'center' }); plant(300, 300); }; };
$('.close').onclick = () => modal.close();
modal.addEventListener('click', event => {
  const rect = modal.getBoundingClientRect();
  if (event.target === modal && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) modal.close();
});

// Stereo rain: continuous pink noise, soft leaf rustle and scattered filtered splashes.
// No external recordings, autoplay, downloads or microphone access.
class RainSoundscape {
  constructor() { this.context = null; this.playing = false; this.timer = null; this.levels = { rain: .48, drops: .30, wind: .20, frequency: 6500 }; this.busy = false; this.sources = []; }
  init() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('unsupported');
    this.context = new Audio(); const ac = this.context;
    this.master = ac.createGain(); this.master.gain.value = 0;
    const compressor = ac.createDynamicsCompressor(); compressor.threshold.value = -16; compressor.knee.value = 15; compressor.ratio.value = 3;
    this.master.connect(compressor).connect(ac.destination);
    this.rain = ac.createGain(); this.rain.gain.value = this.levels.rain * .46; this.rain.connect(this.master);
    this.wind = ac.createGain(); this.wind.gain.value = this.levels.wind * .32; this.wind.connect(this.master);
    const noise = ac.createBuffer(2, ac.sampleRate * 12, ac.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = noise.getChannelData(channel); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = .99886 * b0 + white * .0555179; b1 = .99332 * b1 + white * .0750759;
        b2 = .969 * b2 + white * .153852; b3 = .8665 * b3 + white * .3104856;
        b4 = .55 * b4 + white * .5329522; b5 = -.7616 * b5 - white * .016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * .5362) * .11; b6 = white * .115926;
      }
      // Crossfade the loop boundary, preserving a continuous rain bed.
      const fade = Math.floor(ac.sampleRate * .1);
      for (let i = 0; i < fade; i++) { const t = i / fade; data[data.length - fade + i] = data[data.length - fade + i] * (1 - t) + data[i] * t; }
    }
    const source = ac.createBufferSource(); source.buffer = noise; source.loop = true; source.loopStart = .1;
    const high = ac.createBiquadFilter(); high.type = 'highpass'; high.frequency.value = 500;
    this.rainFilter = ac.createBiquadFilter(); this.rainFilter.type = 'lowpass'; this.rainFilter.frequency.value = this.levels.frequency;
    source.connect(high).connect(this.rainFilter).connect(this.rain); source.start(); this.sources.push(source);
    const windSource = ac.createBufferSource(); windSource.buffer = noise; windSource.loop = true; windSource.loopStart = .1; windSource.playbackRate.value = .72;
    const windFilter = ac.createBiquadFilter(); windFilter.type = 'lowpass'; windFilter.frequency.value = 460;
    const windHigh = ac.createBiquadFilter(); windHigh.type = 'highpass'; windHigh.frequency.value = 90;
    windSource.connect(windHigh).connect(windFilter).connect(this.wind); windSource.start(0, 4); this.sources.push(windSource);
    const breeze = ac.createOscillator(), depth = ac.createGain(); breeze.frequency.value = .13; depth.gain.value = 110; breeze.connect(depth).connect(windFilter.frequency); breeze.start(); this.sources.push(breeze);
    this.dropBuffer = ac.createBuffer(1, Math.floor(ac.sampleRate * .12), ac.sampleRate);
    const dropData = this.dropBuffer.getChannelData(0); for (let i = 0; i < dropData.length; i++) dropData[i] = Math.random() * 2 - 1;
  }
  splash() {
    if (!this.playing || this.context.state !== 'running') return;
    const ac = this.context, now = ac.currentTime;
    if (Math.random() < .78 && this.levels.drops > 0) {
      const noise = ac.createBufferSource(), filter = ac.createBiquadFilter(), gain = ac.createGain(), pan = ac.createStereoPanner();
      noise.buffer = this.dropBuffer; filter.type = 'bandpass'; filter.frequency.value = 1500 + Math.random() * 3400; filter.Q.value = .5 + Math.random() * 1.3;
      pan.pan.value = Math.random() * 1.8 - .9; const amplitude = this.levels.drops * (.025 + Math.random() * .055);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(amplitude, now + .004); gain.gain.exponentialRampToValueAtTime(.0001, now + .09);
      noise.connect(filter).connect(gain).connect(pan).connect(this.master); noise.start(); noise.stop(now + .12);
      noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); pan.disconnect(); };
    }
    this.timer = setTimeout(() => this.splash(), 65 + Math.random() * 160);
  }
  update(levels) {
    Object.assign(this.levels, levels); if (!this.context) return;
    const now = this.context.currentTime;
    this.rainFilter.frequency.setTargetAtTime(this.levels.frequency, now, .5);
    this.rain.gain.setTargetAtTime(this.levels.rain * .46, now, .25); this.wind.gain.setTargetAtTime(this.levels.wind * .32, now, .4);
  }
  async toggle() {
    if (this.busy) return; this.busy = true;
    try {
      if (!this.context) this.init();
      if (this.playing) {
        this.playing = false; clearTimeout(this.timer);
        this.master.gain.cancelScheduledValues(this.context.currentTime); this.master.gain.setTargetAtTime(0, this.context.currentTime, .12);
        await new Promise(resolve => setTimeout(resolve, 550)); await this.context.suspend();
      } else {
        await this.context.resume(); this.playing = true;
        this.master.gain.cancelScheduledValues(this.context.currentTime); this.master.gain.setTargetAtTime(.65, this.context.currentTime, .5); this.splash();
      }
    } finally { this.busy = false; }
  }
}
const rain = new RainSoundscape();
function closeSound() { $('#sound-panel').hidden = true; $('#sound').setAttribute('aria-expanded', 'false'); }
$('#sound').onclick = () => { const hidden = !$('#sound-panel').hidden; $('#sound-panel').hidden = hidden; $('#sound').setAttribute('aria-expanded', !hidden); };
$('#close-sound').onclick = () => { closeSound(); $('#sound').focus(); };
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#sound-panel').hidden) { closeSound(); $('#sound').focus(); } });
$('#play-rain').onclick = async () => {
  const button = $('#play-rain'); button.disabled = true;
  try {
    await rain.toggle(); button.textContent = rain.playing ? 'Ⅱ Pause rain' : '▶ Play rain'; button.setAttribute('aria-pressed', rain.playing);
    $('#sound').classList.toggle('playing', rain.playing); $('#audio-status').textContent = rain.playing ? 'Rain, droplets and a breeze. Just the way you like it.' : 'Whenever you want, the rain is here.';
  } catch { $('#audio-status').textContent = 'Audio could not start. Try again or use a newer browser.'; }
  finally { button.disabled = false; }
};
['rain', 'drop', 'wind'].forEach(id => $(`#${id}-level`).addEventListener('input', event => rain.update({ [id === 'drop' ? 'drops' : id]: +event.target.value / 100 })));
const presets = { soft: [.48, .30, .20, 6500], window: [.65, .65, .08, 4200], garden: [.55, .38, .50, 8500] };
$$('[data-preset]').forEach(button => button.onclick = () => {
  const [r, d, w, frequency] = presets[button.dataset.preset];
  $('#rain-level').value = r * 100; $('#drop-level').value = d * 100; $('#wind-level').value = w * 100;
  rain.update({ rain: r, drops: d, wind: w, frequency });
  $$('[data-preset]').forEach(el => { el.classList.toggle('active', el === button); el.setAttribute('aria-pressed', el === button); });
});
