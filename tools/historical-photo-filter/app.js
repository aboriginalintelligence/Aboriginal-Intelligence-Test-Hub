/**
 * Draft: client-side subject cutout + 1800s studio backdrop composite.
 * Face/subject preserved. No costume/ethnicity morphing.
 */

const PRESETS = [
  {
    id: 'curtains',
    label: 'Draped curtains',
    src: './backdrops/generated-curtains.jpg',
    note: 'Generated painted studio',
  },
  {
    id: 'plain',
    label: 'Plain studio wall',
    src: './backdrops/generated-plain-wall.jpg',
    note: 'Generated painted studio',
  },
  {
    id: 'pastoral',
    label: 'Painted pastoral',
    src: './backdrops/generated-pastoral.jpg',
    note: 'Generated landscape backdrop',
  },
  {
    id: 'columns',
    label: 'Classical columns',
    src: './backdrops/generated-columns.jpg',
    note: 'Generated architectural studio',
  },
  {
    id: 'seidel',
    label: 'Seidel atelier',
    src: './backdrops/seidel-atelier.jpg',
    note: 'Wikimedia Commons photo',
  },
  {
    id: 'beuren',
    label: 'Beuren atelier',
    src: './backdrops/beuren-atelier.jpg',
    note: 'Wikimedia Commons photo',
  },
];

const MAX_EDGE = 1400;

const els = {
  fileInput: document.getElementById('fileInput'),
  dropzone: document.getElementById('dropzone'),
  presets: document.getElementById('presets'),
  tone: document.getElementById('tone'),
  toneLabel: document.getElementById('toneLabel'),
  grain: document.getElementById('grain'),
  grainLabel: document.getElementById('grainLabel'),
  vignette: document.getElementById('vignette'),
  btnProcess: document.getElementById('btnProcess'),
  btnReset: document.getElementById('btnReset'),
  btnPng: document.getElementById('btnPng'),
  btnJpeg: document.getElementById('btnJpeg'),
  status: document.getElementById('status'),
  canvas: document.getElementById('canvas'),
  placeholder: document.getElementById('placeholder'),
};

const state = {
  sourceFile: null,
  sourceUrl: null,
  sourceImg: null,
  cutoutUrl: null,
  cutoutImg: null,
  presetId: PRESETS[0].id,
  backdropCache: new Map(),
  removeBackground: null,
  busy: false,
};

function setStatus(msg, kind = '') {
  els.status.textContent = msg || '';
  els.status.className = 'status' + (kind ? ' ' + kind : '');
}

function enableControls(on) {
  [els.tone, els.grain, els.vignette, els.btnProcess, els.btnReset].forEach((el) => {
    el.disabled = !on;
  });
}

function enableDownload(on) {
  els.btnPng.disabled = !on;
  els.btnJpeg.disabled = !on;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image: ' + src));
    img.src = src;
  });
}

async function getBackdrop(preset) {
  if (state.backdropCache.has(preset.id)) {
    return state.backdropCache.get(preset.id);
  }
  const img = await loadImage(preset.src);
  state.backdropCache.set(preset.id, img);
  return img;
}

function renderPresetButtons() {
  els.presets.innerHTML = '';
  PRESETS.forEach((p) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn' + (p.id === state.presetId ? ' active' : '');
    btn.dataset.id = p.id;
    btn.title = p.note;
    const thumb = document.createElement('img');
    thumb.src = p.src;
    thumb.alt = '';
    thumb.loading = 'lazy';
    const label = document.createElement('span');
    label.textContent = p.label;
    btn.append(thumb, label);
    btn.addEventListener('click', () => {
      state.presetId = p.id;
      document.querySelectorAll('.preset-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.id === p.id);
      });
      if (state.cutoutImg) composite();
    });
    els.presets.appendChild(btn);
  });
}

function updateSliderLabels() {
  els.toneLabel.textContent = 'Light historical tone: ' + els.tone.value + '%';
  els.grainLabel.textContent = 'Grain: ' + els.grain.value + '%';
}

async function ensureRemover() {
  if (state.removeBackground) return state.removeBackground;
  setStatus('Loading background-removal library (first time may download models)…', 'busy');
  const mod = await import(
    'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm'
  );
  state.removeBackground = mod.removeBackground || mod.default;
  if (typeof state.removeBackground !== 'function') {
    throw new Error('Background removal export not found');
  }
  return state.removeBackground;
}

function revoke(url) {
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
}

async function acceptFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    setStatus('Please choose an image file.', 'error');
    return;
  }
  revoke(state.sourceUrl);
  revoke(state.cutoutUrl);
  state.sourceFile = file;
  state.sourceUrl = URL.createObjectURL(file);
  state.sourceImg = await loadImage(state.sourceUrl);
  state.cutoutUrl = null;
  state.cutoutImg = null;
  enableControls(true);
  enableDownload(false);
  els.canvas.hidden = true;
  els.placeholder.hidden = false;
  setStatus('Photo ready. Choose a backdrop, then run “Remove background & composite”.');
}

async function processCutout() {
  if (!state.sourceFile || state.busy) return;
  state.busy = true;
  els.btnProcess.disabled = true;
  try {
    const removeBackground = await ensureRemover();
    setStatus('Removing background in your browser…', 'busy');
    const blob = await removeBackground(state.sourceFile, {
      progress: (key, current, total) => {
        if (total) {
          const pct = Math.round((current / total) * 100);
          setStatus('Model / removal progress: ' + key + ' ' + pct + '%', 'busy');
        }
      },
    });
    revoke(state.cutoutUrl);
    state.cutoutUrl = URL.createObjectURL(blob);
    state.cutoutImg = await loadImage(state.cutoutUrl);
    setStatus('Compositing onto backdrop…', 'busy');
    await composite();
    setStatus('Done. Face/subject preserved; only the background changed.');
  } catch (err) {
    console.error(err);
    setStatus(
      'Background removal failed: ' +
        (err && err.message ? err.message : String(err)) +
        '. Try another browser, check network (CDN models), or serve over http(s).',
      'error'
    );
  } finally {
    state.busy = false;
    els.btnProcess.disabled = !state.sourceFile;
  }
}

function applyLightTone(ctx, w, h, amount) {
  if (amount <= 0) return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const a = amount;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const tr = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
    const tg = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
    const tb = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
    d[i] = r * (1 - a) + tr * a;
    d[i + 1] = g * (1 - a) + tg * a;
    d[i + 2] = b * (1 - a) + tb * a;
  }
  ctx.putImageData(img, 0, 0);
}

function applyGrain(ctx, w, h, amount) {
  if (amount <= 0) return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const strength = amount * 40;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    const n = (Math.random() - 0.5) * strength;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

function applyVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.35,
    w / 2,
    h / 2,
    Math.hypot(w, h) * 0.55
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(30,20,12,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

async function composite() {
  if (!state.cutoutImg) return;
  const preset = PRESETS.find((p) => p.id === state.presetId) || PRESETS[0];
  const backdrop = await getBackdrop(preset);
  const cut = state.cutoutImg;

  let bw = backdrop.naturalWidth;
  let bh = backdrop.naturalHeight;
  const scaleBg = Math.min(1, MAX_EDGE / Math.max(bw, bh));
  bw = Math.round(bw * scaleBg);
  bh = Math.round(bh * scaleBg);

  const canvas = els.canvas;
  canvas.width = bw;
  canvas.height = bh;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, bw, bh);
  ctx.drawImage(backdrop, 0, 0, bw, bh);

  // Fit subject: cover ~78% of height, centered horizontally, slight bottom bias
  const targetH = bh * 0.82;
  const scale = targetH / cut.naturalHeight;
  const dw = cut.naturalWidth * scale;
  const dh = cut.naturalHeight * scale;
  const dx = (bw - dw) / 2;
  const dy = bh - dh - bh * 0.04;

  // Draw subject to offscreen for optional tone/grain without affecting backdrop much
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.round(dw));
  off.height = Math.max(1, Math.round(dh));
  const octx = off.getContext('2d');
  octx.drawImage(cut, 0, 0, off.width, off.height);

  const toneAmt = Number(els.tone.value) / 100;
  const grainAmt = Number(els.grain.value) / 100;
  applyLightTone(octx, off.width, off.height, toneAmt * 0.85);
  applyGrain(octx, off.width, off.height, grainAmt);

  ctx.drawImage(off, dx, dy);

  if (els.vignette.checked) applyVignette(ctx, bw, bh);

  els.placeholder.hidden = true;
  canvas.hidden = false;
  enableDownload(true);
}

function download(type) {
  const canvas = els.canvas;
  if (canvas.hidden || !canvas.width) return;
  const mime = type === 'jpeg' ? 'image/jpeg' : 'image/png';
  const ext = type === 'jpeg' ? 'jpg' : 'png';
  const quality = type === 'jpeg' ? 0.92 : undefined;
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = 'historical-studio-portrait.' + ext;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    },
    mime,
    quality
  );
}

function resetAll() {
  revoke(state.sourceUrl);
  revoke(state.cutoutUrl);
  state.sourceFile = null;
  state.sourceUrl = null;
  state.sourceImg = null;
  state.cutoutUrl = null;
  state.cutoutImg = null;
  els.fileInput.value = '';
  els.canvas.hidden = true;
  els.placeholder.hidden = false;
  enableControls(false);
  enableDownload(false);
  setStatus('');
}

// Drag / drop / file
els.dropzone.addEventListener('click', () => els.fileInput.click());
els.dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    els.fileInput.click();
  }
});
els.fileInput.addEventListener('change', () => {
  const f = els.fileInput.files && els.fileInput.files[0];
  if (f) acceptFile(f);
});
['dragenter', 'dragover'].forEach((ev) => {
  els.dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    els.dropzone.classList.add('dragover');
  });
});
['dragleave', 'drop'].forEach((ev) => {
  els.dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    els.dropzone.classList.remove('dragover');
  });
});
els.dropzone.addEventListener('drop', (e) => {
  const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) acceptFile(f);
});

els.btnProcess.addEventListener('click', processCutout);
els.btnReset.addEventListener('click', resetAll);
els.btnPng.addEventListener('click', () => download('png'));
els.btnJpeg.addEventListener('click', () => download('jpeg'));
els.tone.addEventListener('input', () => {
  updateSliderLabels();
  if (state.cutoutImg) composite();
});
els.grain.addEventListener('input', () => {
  updateSliderLabels();
  if (state.cutoutImg) composite();
});
els.vignette.addEventListener('change', () => {
  if (state.cutoutImg) composite();
});

renderPresetButtons();
updateSliderLabels();
setStatus('Waiting for a photo. Draft only — not a live hub feature.');
