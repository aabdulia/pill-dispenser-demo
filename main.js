const $ = (id) => document.getElementById(id);
const els = Object.fromEntries(['clock','mode-badge','device-status','device-message','dose-chip','enter','dispense','observe','reset','camera','camera-status','camera-label','video','vision-canvas','r-face','r-hands','r-dist','r-hold','hint'].map(id => [id, $(id)]));
const canvas = els['vision-canvas'], ctx = canvas.getContext('2d');
const ORANGE = '#d97757', ORANGE_DEEP = '#9e4a2c', ORANGE_SOFT = '#fbeee8';
const MOUTH_RADIUS = 0.42;      // fingertip-to-mouth distance, as a fraction of face width
const PRESENCE_FRAMES = 6, GESTURE_FRAMES = 8;

let state, timers = [], mode = 'idle';
let camError = null, stream, faceLandmarker, handLandmarker, handConnections = [], lastVideoTime = -1, lastObs = null, loading = false;
let presenceFrames = 0, gestureFrames = 0;

const delay = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
const stamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function speak(message) { if (!('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(message); u.rate = .92; u.lang = 'en-US'; speechSynthesis.speak(u); }
function flash(btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 450); }

// ---------- State machine ----------
function render() {
  els.clock.textContent = stamp(); els['dose-chip'].textContent = `DOSE ${state.dose} OF 2`;
  els.enter.disabled = state.phase !== 'waiting'; els.dispense.disabled = state.phase !== 'prompted'; els.observe.disabled = state.phase !== 'dispensed';
  const labels = { waiting: 'Waiting for presence', prompted: 'Reminder active', dispensed: 'Cup ready', completed: 'Dose recorded', finished: 'Demo complete' };
  els['device-status'].textContent = labels[state.phase];
}
function reset() {
  timers.forEach(clearTimeout); timers = []; if ('speechSynthesis' in window) speechSynthesis.cancel();
  state = { dose: 1, phase: 'waiting' };
  presenceFrames = gestureFrames = 0;
  els['device-message'].innerHTML = 'Dose 1 is due.<br>Waiting for someone to enter.'; render();
}
function enter() {
  if (state.phase !== 'waiting') return; state.phase = 'prompted';
  els['device-message'].textContent = `It’s time for dose ${state.dose}. Please press the button.`;
  speak(`It's time for dose ${state.dose}. Please come to the dispenser and press the button.`); render();
}
function dispense() {
  if (state.phase !== 'prompted') return; state.phase = 'dispensed';
  els['device-message'].textContent = 'Medication in cup. Please take it.';
  speak('Please take the medication from the cup.'); render();
}
function observe() {
  if (state.phase !== 'dispensed') return; state.phase = state.dose === 2 ? 'finished' : 'completed';
  els['device-message'].textContent = state.dose === 2 ? 'Two doses complete. Thank you.' : 'Dose taken. Next dose is scheduled.';
  speak('Thank you. Your dose is recorded.'); render();
  if (state.dose === 1) delay(() => { if (state.phase !== 'completed') return; state.dose = 2; state.phase = 'waiting'; presenceFrames = 0; els['device-message'].textContent = 'Dose 2 is due. Waiting for someone to enter.'; render(); }, 8000);
}

// ---------- Shared vision analysis ----------
// obs: { face: {x0,y0,x1,y1,mouth,width} | null, hands: [{tips:[{x,y}], points}] } in mirrored, normalized coords.
function analyze(obs) {
  const face = obs.face, hands = obs.hands;
  presenceFrames = face ? presenceFrames + 1 : 0;
  if (state.phase === 'waiting' && presenceFrames >= PRESENCE_FRAMES) enter();

  let ratio = Infinity, nearest = null;
  if (face) for (const h of hands) for (const t of h.tips) { const r = dist(t, face.mouth) / face.width; if (r < ratio) { ratio = r; nearest = t; } }
  const near = ratio < MOUTH_RADIUS;
  gestureFrames = state.phase === 'dispensed' && near ? gestureFrames + 1 : 0;
  if (gestureFrames >= GESTURE_FRAMES) { gestureFrames = 0; observe(); }

  els['r-face'].textContent = face ? 'Present' : 'None';
  els['r-hands'].textContent = String(hands.length);
  els['r-dist'].style.width = `${isFinite(ratio) ? clamp(1 - (ratio - MOUTH_RADIUS) / 1.6) * 100 : 0}%`;
  els['r-hold'].style.width = `${gestureFrames / GESTURE_FRAMES * 100}%`;
  return { ratio, nearest, near };
}
function clearReadouts() { els['r-face'].textContent = els['r-hands'].textContent = '—'; els['r-dist'].style.width = els['r-hold'].style.width = '0%'; }

// ---------- Drawing ----------
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function tag(text, x, y, fill = ORANGE) {
  ctx.font = '600 13px Inter, system-ui, sans-serif'; const w = ctx.measureText(text).width + 12;
  ctx.fillStyle = fill; roundRect(x, y - 18, w, 20, 5); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(text, x + 6, y - 4);
}
function drawOverlay(obs, a) {
  const W = canvas.width, H = canvas.height, s = W / 640;
  const f = obs.face;
  if (f) {
    ctx.lineWidth = 2.5 * s; ctx.strokeStyle = ORANGE; roundRect(f.x0 * W, f.y0 * H, (f.x1 - f.x0) * W, (f.y1 - f.y0) * H, 10 * s); ctx.stroke();
    tag(presenceFrames >= PRESENCE_FRAMES ? 'PERSON PRESENT' : 'FACE', f.x0 * W, f.y0 * H - 4 * s);
    const rx = MOUTH_RADIUS * f.width * W, ry = MOUTH_RADIUS * f.width * H;
    ctx.beginPath(); ctx.ellipse(f.mouth.x * W, f.mouth.y * H, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = a.near ? '#d9775766' : '#d977571a'; ctx.fill();
    ctx.setLineDash([6 * s, 5 * s]); ctx.strokeStyle = a.near ? ORANGE_DEEP : ORANGE; ctx.lineWidth = 2 * s; ctx.stroke(); ctx.setLineDash([]);
  }
  for (const h of obs.hands) {
    if (h.points) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * s;
      for (const c of handConnections) { const p = h.points[c.start], q = h.points[c.end]; ctx.beginPath(); ctx.moveTo(p.x * W, p.y * H); ctx.lineTo(q.x * W, q.y * H); ctx.stroke(); }
      for (const p of h.points) { ctx.beginPath(); ctx.arc(p.x * W, p.y * H, 3 * s, 0, Math.PI * 2); ctx.fillStyle = ORANGE; ctx.fill(); }
    }
    for (const t of h.tips) { ctx.beginPath(); ctx.arc(t.x * W, t.y * H, 6 * s, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.5 * s; ctx.strokeStyle = ORANGE; ctx.stroke(); }
  }
  if (f && a.nearest) {
    ctx.strokeStyle = a.near ? ORANGE_DEEP : ORANGE; ctx.lineWidth = 1.5 * s; ctx.setLineDash([3 * s, 4 * s]);
    ctx.beginPath(); ctx.moveTo(a.nearest.x * W, a.nearest.y * H); ctx.lineTo(f.mouth.x * W, f.mouth.y * H); ctx.stroke(); ctx.setLineDash([]);
    tag(a.near ? 'HAND AT MOUTH' : `${a.ratio.toFixed(2)} × face`, (a.nearest.x + f.mouth.x) / 2 * W, (a.nearest.y + f.mouth.y) / 2 * H, a.near ? ORANGE_DEEP : ORANGE);
  }
}
function drawRoom() {
  const W = canvas.width, H = canvas.height;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ORANGE_SOFT; roundRect(W * .08, H * .1, W * .26, H * .34, 8); ctx.fill();
  ctx.strokeStyle = '#f1d5c8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W * .21, H * .1); ctx.lineTo(W * .21, H * .44); ctx.moveTo(W * .08, H * .27); ctx.lineTo(W * .34, H * .27); ctx.stroke();
  ctx.fillStyle = '#f6e3d9'; ctx.fillRect(0, H * .8, W, H * .2);
}
function drawIdle(text, sub = 'Click Start camera demo to begin') {
  drawRoom(); const W = canvas.width, H = canvas.height;
  ctx.fillStyle = '#ffffffcc'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ORANGE_DEEP; ctx.textAlign = 'center'; ctx.font = '700 36px Inter, system-ui, sans-serif'; ctx.fillText(text, W / 2, H / 2);
  ctx.font = '22px Inter, system-ui, sans-serif'; ctx.fillStyle = '#7a6a62'; ctx.fillText(sub, W / 2, H / 2 + 40); ctx.textAlign = 'start';
}

// ---------- Live camera ----------
function toObs(faces, hands) {
  const m = (p) => ({ x: 1 - p.x, y: p.y });
  let face = null;
  if (faces.length) {
    const f = faces[0]; let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (const p of f) { const q = m(p); x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
    face = { x0, y0, x1, y1, mouth: m({ x: (f[13].x + f[14].x) / 2, y: (f[13].y + f[14].y) / 2 }), width: dist(f[234], f[454]) || .15 };
  }
  return { face, hands: hands.map(h => ({ points: h.map(m), tips: [4, 8, 12].map(i => m(h[i])) })) };
}
function liveFrame() {
  const v = els.video, W = canvas.width, H = canvas.height;
  if (v.readyState < 2) return drawIdle('Starting camera…');
  ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.drawImage(v, 0, 0, W, H); ctx.restore();
  if (!faceLandmarker) { ctx.fillStyle = '#ffffffb3'; ctx.fillRect(0, 0, W, H); tag('Loading vision models…', 12 * W / 640, 36 * W / 640); return; }
  if (v.currentTime !== lastVideoTime) {
    lastVideoTime = v.currentTime; const t = performance.now();
    try { lastObs = toObs(faceLandmarker.detectForVideo(v, t).faceLandmarks, handLandmarker.detectForVideo(v, t).landmarks); lastObs.a = analyze(lastObs); } catch { return; }
    els['camera-label'].textContent = lastObs.face ? `LIVE · face · ${lastObs.hands.length} hand(s)` : 'LIVE · no face in frame';
  }
  if (lastObs) drawOverlay(lastObs, lastObs.a);
}

function loop() {
  requestAnimationFrame(loop);
  if (mode === 'live') liveFrame();
  else if (camError) drawIdle('Camera blocked', camError);
  else drawIdle('Camera off');
}
function setMode(m) {
  mode = m; const badge = els['mode-badge'];
  badge.textContent = { idle: 'Idle', live: 'Live camera' }[m]; badge.classList.toggle('live', m !== 'idle');
  els['camera-label'].textContent = { idle: 'Camera off', live: 'LIVE · starting' }[m];
  els.camera.textContent = m === 'live' ? 'Stop camera' : 'Start camera demo';
  if (m === 'idle') clearReadouts();
}

async function createLandmarkers(vision, FaceLandmarker, HandLandmarker, delegate) {
  const base = 'https://storage.googleapis.com/mediapipe-models/';
  return Promise.all([
    FaceLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: base + 'face_landmarker/face_landmarker/float16/1/face_landmarker.task', delegate }, runningMode: 'VIDEO', numFaces: 1 }),
    HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: base + 'hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate }, runningMode: 'VIDEO', numHands: 2 }),
  ]);
}
// Frames stay in the browser. Model files and the MediaPipe runtime load from public CDNs.
async function startCamera() {
  if (loading) return; loading = true;
  camError = null; reset(); setMode('live'); els['camera-status'].textContent = 'Requesting camera and loading models…';
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw Error('Camera access requires localhost or HTTPS.');
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false });
    els.video.srcObject = stream; await els.video.play();
    canvas.width = els.video.videoWidth || 640; canvas.height = els.video.videoHeight || 480;
    const { FaceLandmarker, HandLandmarker, FilesetResolver } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/+esm');
    handConnections = HandLandmarker.HAND_CONNECTIONS;
    const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm');
    let pair; try { pair = await createLandmarkers(vision, FaceLandmarker, HandLandmarker, 'GPU'); } catch { pair = await createLandmarkers(vision, FaceLandmarker, HandLandmarker, 'CPU'); }
    if (!stream) { pair.forEach(p => p.close()); return; }
    [faceLandmarker, handLandmarker] = pair;
    els['camera-status'].textContent = 'Live analysis running on this device.';
  } catch (err) {
    camError = err.name === 'NotAllowedError' ? 'Allow camera access for this site, then try again'
      : err.name === 'NotFoundError' ? 'No camera found on this device'
      : !window.isSecureContext ? 'Open the page over localhost or HTTPS'
      : 'Could not start: ' + err.message;
    els['camera-status'].textContent = `Camera unavailable: ${err.message}`; stopCamera(false);
  }
  finally { loading = false; }
}
function stopCamera(message = true) {
  stream?.getTracks().forEach(t => t.stop()); stream = null; els.video.srcObject = null;
  faceLandmarker?.close(); handLandmarker?.close(); faceLandmarker = handLandmarker = null; lastVideoTime = -1; lastObs = null;
  canvas.width = 640; canvas.height = 480;
  if (mode === 'live') setMode('idle');
  if (message) els['camera-status'].textContent = 'Camera off.';
}

els.enter.onclick = enter; els.dispense.onclick = dispense; els.observe.onclick = observe;
els.reset.onclick = reset;
els.camera.onclick = () => stream || loading ? stopCamera() : startCamera();
document.addEventListener('keydown', (e) => { if (e.code === 'Space' && !['BUTTON','INPUT','TEXTAREA'].includes(e.target.tagName)) { e.preventDefault(); if (!els.dispense.disabled) { flash(els.dispense); dispense(); } } });
window.addEventListener('pagehide', () => stopCamera(false));
reset(); setMode('idle'); loop(); setInterval(() => els.clock.textContent = stamp(), 1000);
