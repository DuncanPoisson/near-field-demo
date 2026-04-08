'use strict';

/* =============================================================
   NEAR-FIELD IR IMAGING DEMO — app.js
   ============================================================= */

/* ----- COLOR PALETTE ----- */
const C = {
  bg:        '#0d1117',
  bgPanel:   '#161b22',
  bgCard:    '#1f2937',
  accent:    '#58a6ff',
  hbo2:      '#ff6b6b',
  hb:        '#4ecdc4',
  gold:      '#d4a017',
  text:      '#e6edf3',
  muted:     '#8b949e',
  border:    '#30363d',
  skin:      '#c8956c',
  fat:       '#e8d5a3',
  muscle:    '#8b3a3a',
  green:     '#4ade80',
  yellow:    '#fbbf24',
  red:       '#f87171',
};

/* =============================================================
   CHAPTER 1  CONSTANTS
   ============================================================= */
const ROD_W_NM    = 20;
const ROD_GAP_NM  = 40;
const N_RODS      = 5;
const OFFSET_NM   = 50;   // left padding before first rod
const SPAN_NM     = N_RODS * ROD_W_NM + (N_RODS - 1) * ROD_GAP_NM; // 260 nm
const RANGE_NM    = SPAN_NM + 2 * OFFSET_NM;  // 360 nm display window
const N_SAMP      = 720;  // intensity array samples
const NM_PER_SAMP = RANGE_NM / N_SAMP;        // 0.5 nm / sample

/* Canvas logical sizes */
const CH1_W = 400;
const CH1_H = 160;
const TIS_W = 400;
const TIS_H = 200;
const SPC_W = 400;
const SPC_H = 200;

/* Tip SVG coordinate system (fixed viewBox) */
const SVG_W   = 800;
const SVG_H   = 90;
const APEX_Y  = SVG_H * 0.74;
const SURF_Y  = SVG_H - 7;

/* =============================================================
   CHAPTER 2  CONSTANTS
   ============================================================= */
const LAM_MIN = 600;
const LAM_MAX = 1400;
const WIN_MIN = 700;
const WIN_MAX = 1100;

/* Spectrum canvas margins */
const SM = { l: 46, r: 14, t: 20, b: 32 };
const SP_W = SPC_W - SM.l - SM.r;   // plot width  (340)
const SP_H = SPC_H - SM.t - SM.b;   // plot height (148)

/* =============================================================
   SPECTRAL DATA
   Approximate Hb / HbO₂ absorption coefficients (normalised 0–1).
   Source: shapes derived from Prahl tabulated data (Oregon MLC).
   Key features preserved:
     • Hb strong absorption at 660 nm (~10× HbO₂)
     • Hb peak at ~760 nm (deoxy NIR peak)
     • Isosbestic point ~800 nm (both equal)
     • HbO₂ dominant 800–1000 nm
     • Both low in 700–1100 nm NIR optical window
     • Both rise above 1100 nm (water dominates in real tissue)
   ============================================================= */
const HB_DATA = [
  [600,0.32],[620,0.42],[640,0.60],[655,0.73],
  [660,0.75],[670,0.58],[680,0.42],[700,0.29],
  [720,0.35],[740,0.44],[760,0.48],[780,0.28],
  [800,0.18],[820,0.12],[840,0.10],[870,0.09],
  [900,0.08],[940,0.085],[980,0.09],[1000,0.10],
  [1060,0.12],[1100,0.14],[1150,0.19],[1200,0.27],
  [1300,0.22],[1400,0.30],
];

const HBO2_DATA = [
  [600,0.26],[620,0.17],[640,0.10],[655,0.085],
  [660,0.08],[670,0.09],[680,0.10],[700,0.12],
  [720,0.14],[740,0.16],[760,0.18],[780,0.18],
  [800,0.18],[820,0.22],[840,0.27],[870,0.26],
  [900,0.22],[940,0.18],[980,0.15],[1000,0.14],
  [1060,0.15],[1100,0.17],[1150,0.22],[1200,0.30],
  [1300,0.25],[1400,0.33],
];

/* =============================================================
   MODAL CONTENT
   ============================================================= */
const MODALS = {
  rayleigh: {
    title: 'The Rayleigh Criterion',
    body: `<p>In conventional optics, two point sources can be resolved only when their angular separation exceeds roughly <strong>λ / D</strong>, giving a minimum focused spot size of <strong>≈ λ / 2</strong>. At mid-infrared wavelengths (λ = 10 µm), that limit is ~5 µm — 250× larger than the gold nanorods shown here.</p>
<p>The spatial information needed to resolve finer features travels as <em>evanescent waves</em> that decay exponentially away from the surface. Far-field optics can never capture them, because they vanish before reaching the lens or detector.</p>
<p>Near-field microscopy sidesteps the Rayleigh limit entirely: resolution is determined by the tip, not by the wavelength.</p>`,
  },
  fieldConfinement: {
    title: 'Field Confinement at the Tip',
    body: `<p>A sharp metallic tip acts as a <strong>nanoscale optical antenna</strong>. When an external laser illuminates the tip, free electrons oscillate collectively (a localised plasmon) and concentrate electromagnetic energy into a volume roughly equal to the <strong>tip radius</strong>.</p>
<p>This confinement is geometry-driven, not wavelength-driven. A 10 nm tip confines the field to a ~10 nm spot whether the illumination wavelength is 500 nm or 10,000 nm. Resolution scales with tip size, not λ.</p>
<p>The technique that exploits this is scattering-type scanning near-field optical microscopy (<strong>s-SNOM</strong>): the tip scatters a near-field signal that encodes local optical properties at nanometre spatial resolution.</p>`,
  },
  evanescent: {
    title: 'Evanescent Fields',
    body: `<p>The confined field at the tip apex is an <strong>evanescent wave</strong>: it carries high-spatial-frequency information but decays exponentially with distance <em>z</em> from the surface, roughly as e<sup>−z/r</sup> where <em>r</em> is the tip radius.</p>
<p>At <em>z = r</em> (~10–20 nm), the signal has already fallen to 1/e of its surface value. At <em>z = 10r</em> it is essentially gone. This steep decay means the tip must be maintained nanometres from the sample — typically by a tapping-mode atomic force microscope (AFM) feedback loop.</p>
<p>The same exponential decay makes near-field imaging exquisitely surface-selective: signals from buried features are naturally suppressed, while surface chemistry is highlighted with extraordinary sensitivity.</p>`,
  },
  nirWindow: {
    title: 'The NIR Optical Window',
    body: `<p>Biological tissue absorbs light strongly at most wavelengths. Water dominates above ~1150 nm and below 300 nm; haemoglobin and melanin dominate through the visible range. But between roughly <strong>700–1100 nm</strong>, all major tissue chromophores show relatively low absorption.</p>
<p>This is the <strong>NIR optical window</strong> (also called the therapeutic window). Light here can penetrate centimetres into tissue — enough to reach blood vessels, tumours, and metabolic activity non-invasively.</p>
<p>The window is narrow but critically important: pulse oximeters, functional near-infrared spectroscopy (fNIRS) brain imaging, photoacoustic scanners, and near-field tissue probes all operate within it for exactly this reason.</p>`,
  },
  hbSpectra: {
    title: 'HbO₂ vs Hb: Why the Spectra Differ',
    body: `<p>Haemoglobin's iron-porphyrin (heme) ring changes electronic structure when oxygen binds, shifting its absorption peaks. The key diagnostically useful differences between <strong>oxyhemoglobin (HbO₂)</strong> and <strong>deoxyhemoglobin (Hb)</strong>:</p>
<p>• <strong>660 nm</strong>: Hb absorbs ~10× more than HbO₂. Deoxygenated blood looks dark red; oxygenated looks bright red. This is the red channel of pulse oximetry.</p>
<p>• <strong>760 nm</strong>: Hb has a distinct NIR absorption peak absent in HbO₂ — the classic "deoxy peak."</p>
<p>• <strong>~800 nm</strong>: The <em>isosbestic point</em> — both species absorb equally, making this wavelength insensitive to oxygenation ratio. Used as a reference in quantitative measurements.</p>
<p>• <strong>850 nm</strong>: HbO₂ absorbs more than Hb (~2.5×). Paired with 660 nm, this encodes SpO₂.</p>`,
  },
  pulseOx: {
    title: 'Pulse Oximetry & Near-Field Extension',
    body: `<p><strong>Pulse oximetry</strong> measures blood oxygen saturation (SpO₂) using two wavelengths — typically 660 nm (where Hb >> HbO₂) and 940 nm (where HbO₂ > Hb). The ratio of pulsatile absorbance changes at those two wavelengths, arising from each heartbeat's arterial blood volume, encodes the HbO₂/Hb ratio to within ~2% accuracy.</p>
<p>This works non-invasively through fingertip skin because NIR light penetrates millimetres of tissue. The pulsatile (AC) component separates arterial blood from the DC background of venous blood, capillaries, and tissue.</p>
<p>Near-field IR imaging could extend this principle to the <strong>nanoscale</strong>: measuring oxygenation within individual red blood cells, sub-cellular mitochondria, or tumour microvessels — spatial scales 1,000× finer than conventional pulse oximetry, using the same two-wavelength spectral logic.</p>`,
  },
};

/* =============================================================
   APPLICATION STATE
   ============================================================= */
const state = {
  ch1: { tipRadius: 20 },
  ch2: { oxy: 75, lambda: 850, decoderOpen: false },
};

/* =============================================================
   CANVAS CONTEXTS  (set during init)
   ============================================================= */
let trueCtx, perceivedCtx, tissueCtx, spectrumCtx;
let decoderImgCtx, decoderSpecCtx;

/* =============================================================
   UTILITY: DPR-AWARE CANVAS SETUP
   Returns a 2D context already scaled by devicePixelRatio.
   All subsequent drawing commands use logical (CSS) pixels.
   ============================================================= */
function setupCanvas(canvas, lw, lh) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = lw * dpr;
  canvas.height = lh * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return ctx;
}

/* =============================================================
   UTILITY: ROUNDED RECTANGLE (compatible with all browsers)
   ============================================================= */
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

/* =============================================================
   UTILITY: LINEAR INTERPOLATION OF SPECTRAL DATA
   ============================================================= */
function interp(data, lam) {
  if (lam <= data[0][0])                  return data[0][1];
  if (lam >= data[data.length - 1][0])   return data[data.length - 1][1];
  for (let i = 0; i < data.length - 1; i++) {
    if (lam >= data[i][0] && lam <= data[i + 1][0]) {
      const t = (lam - data[i][0]) / (data[i + 1][0] - data[i][0]);
      return data[i][1] + t * (data[i + 1][1] - data[i][1]);
    }
  }
  return 0;
}

function hbAbs(l)   { return interp(HB_DATA,   l); }
function hbo2Abs(l) { return interp(HBO2_DATA, l); }
function mixAbs(oxy, l) {
  const f = oxy / 100;
  return f * hbo2Abs(l) + (1 - f) * hbAbs(l);
}

/* =============================================================
   CHAPTER 1 — NANOROD RESOLUTION SIMULATION
   ============================================================= */

/* Pre-computed true intensity array (0.5 nm / sample, 360 nm window) */
const TRUE_INT = (() => {
  const arr = new Float32Array(N_SAMP);
  for (let i = 0; i < N_SAMP; i++) {
    const nm = i * NM_PER_SAMP;
    for (let r = 0; r < N_RODS; r++) {
      const s = OFFSET_NM + r * (ROD_W_NM + ROD_GAP_NM);
      if (nm >= s && nm < s + ROD_W_NM) { arr[i] = 1; break; }
    }
  }
  return arr;
})();

/* Pre-computed mean intensity for the far-field approximation */
const TRUE_MEAN = TRUE_INT.reduce((a, b) => a + b, 0) / N_SAMP;

/* 1-D Gaussian convolution in sample space */
function gaussConvolve(input, sigma) {
  const n = input.length;
  const out = new Float32Array(n);

  if (sigma < 0.3) { out.set(input); return out; }

  /* Fast path: when σ >> array, output is essentially the mean */
  if (sigma > n * 1.5) { out.fill(TRUE_MEAN); return out; }

  const R = Math.min(Math.ceil(sigma * 3.8), Math.floor(n / 2));

  /* Pre-compute normalised Gaussian kernel */
  const kern = new Float32Array(2 * R + 1);
  const inv2s2 = 1 / (2 * sigma * sigma);
  let ksum = 0;
  for (let k = -R; k <= R; k++) {
    const w = Math.exp(-(k * k) * inv2s2);
    kern[k + R] = w;
    ksum += w;
  }
  for (let i = 0; i < kern.length; i++) kern[i] /= ksum;

  for (let x = 0; x < n; x++) {
    let v = 0;
    for (let k = 0; k < kern.length; k++) {
      const xi = x + k - R;
      if (xi >= 0 && xi < n) v += input[xi] * kern[k];
    }
    out[x] = v;
  }
  return out;
}

/* Draw the fixed "True Sample" canvas */
function drawTrueCanvas() {
  const ctx = trueCtx;
  const w = CH1_W, h = CH1_H;
  const pxNm = w / RANGE_NM;

  ctx.fillStyle = C.bgPanel;
  ctx.fillRect(0, 0, w, h);

  const rodH = h * 0.38;
  const rodY = (h - rodH) / 2;

  for (let r = 0; r < N_RODS; r++) {
    const xStart = (OFFSET_NM + r * (ROD_W_NM + ROD_GAP_NM)) * pxNm;
    const xW     = ROD_W_NM * pxNm;

    /* Gold body */
    ctx.fillStyle = C.gold;
    ctx.fillRect(xStart, rodY, xW, rodH);

    /* Subtle highlight */
    ctx.fillStyle = 'rgba(255,245,180,0.28)';
    ctx.fillRect(xStart, rodY, xW, rodH * 0.32);
  }

  /* Scale bar — 100 nm */
  const sbW = 100 * pxNm;
  const sbX = w - sbW - 10;
  const sbY = h - 14;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sbX, sbY);
  ctx.lineTo(sbX + sbW, sbY);
  ctx.stroke();
  ctx.fillStyle = C.muted;
  ctx.font = '9px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('100 nm', sbX + sbW / 2, sbY - 3);
  ctx.textAlign = 'left';

  /* Label */
  ctx.fillStyle = '#b88a00';
  ctx.font = '9px system-ui';
  ctx.fillText('Au nanorods  (20 nm × 5)', 7, h - 7);
}

/* Draw the "Perceived" canvas — updates on every slider tick */
function drawPerceivedCanvas(tipRadius) {
  const ctx = perceivedCtx;
  const w = CH1_W, h = CH1_H;
  const pxNm = w / RANGE_NM;

  const sigma = tipRadius / NM_PER_SAMP;  // σ in samples
  const perc  = gaussConvolve(TRUE_INT, sigma);

  ctx.fillStyle = C.bgPanel;
  ctx.fillRect(0, 0, w, h);

  const rodH = h * 0.38;
  const rodY = (h - rodH) / 2;

  /* Column-by-column false-colour rendering */
  for (let x = 0; x < w; x++) {
    const si = Math.min(Math.floor((x / w) * N_SAMP), N_SAMP - 1);
    const iv = perc[si];
    if (iv < 0.003) continue;

    /* Map intensity 0→1 to gold colour */
    ctx.fillStyle = `rgb(${Math.round(212*iv)},${Math.round(148*iv)},${Math.round(20*iv)})`;
    ctx.fillRect(x, rodY, 1, rodH);
  }

  /* Scale bar (same geometry as true canvas) */
  const sbW = 100 * pxNm;
  const sbX = w - sbW - 10;
  const sbY = h - 14;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sbX, sbY);
  ctx.lineTo(sbX + sbW, sbY);
  ctx.stroke();
  ctx.fillStyle = C.muted;
  ctx.font = '9px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('100 nm', sbX + sbW / 2, sbY - 3);
  ctx.textAlign = 'left';

  /* Regime label */
  let regime, col;
  if      (tipRadius <= 100)  { regime = 'Near-field regime';  col = C.green;  }
  else if (tipRadius <= 450)  { regime = 'Transition regime';  col = C.yellow; }
  else                        { regime = 'Far-field regime';   col = C.red;    }

  ctx.fillStyle = col;
  ctx.font = '9px system-ui';
  ctx.fillText(regime, 7, h - 7);
}

/* Update the tip-cone SVG */
function updateTipSVG(tipRadius) {
  const cx = SVG_W / 2;

  /* Cone width at the top: maps tip radius 5→2000 nm to 3→SVG_W*0.9 px (SVG units) */
  const t       = Math.pow((tipRadius - 5) / 1995, 0.55);
  const coneTopW = 3 + t * (SVG_W * 0.9 - 3);

  document.getElementById('tipCone').setAttribute('points',
    `${cx - coneTopW/2},2 ${cx + coneTopW/2},2 ${cx},${APEX_Y}`);

  /* Metallic tip body (small solid triangle at the very apex) */
  const tbW = 7, tbH = 11;
  document.getElementById('tipBody').setAttribute('points',
    `${cx - tbW},${APEX_Y - tbH} ${cx + tbW},${APEX_Y - tbH} ${cx},${APEX_Y}`);

  /* Apex dot */
  const ap = document.getElementById('tipApex');
  ap.setAttribute('cx', cx);
  ap.setAttribute('cy', APEX_Y);

  /* Surface line */
  const sl = document.getElementById('surfaceLine');
  sl.setAttribute('x1', 0);   sl.setAttribute('y1', SURF_Y);
  sl.setAttribute('x2', SVG_W); sl.setAttribute('y2', SURF_Y);

  /* Surface rods + spot indicator */
  const g = document.getElementById('surfaceRods');
  g.innerHTML = '';
  const pxNm = SVG_W / RANGE_NM;
  const NS = 'http://www.w3.org/2000/svg';

  for (let r = 0; r < N_RODS; r++) {
    const rx = (OFFSET_NM + r * (ROD_W_NM + ROD_GAP_NM)) * pxNm;
    const rw = ROD_W_NM * pxNm;
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('x', rx);
    rect.setAttribute('y', SURF_Y - 5);
    rect.setAttribute('width',  rw);
    rect.setAttribute('height', 5);
    rect.setAttribute('fill', C.gold);
    g.appendChild(rect);
  }

  /* Illuminated spot (width = tip radius, centred on SVG) */
  const spotW = Math.max(2, tipRadius * pxNm);
  const spotEl = document.createElementNS(NS, 'rect');
  spotEl.setAttribute('x',       cx - spotW / 2);
  spotEl.setAttribute('y',       SURF_Y - 1);
  spotEl.setAttribute('width',   spotW);
  spotEl.setAttribute('height',  4);
  spotEl.setAttribute('fill',    C.accent);
  spotEl.setAttribute('opacity', '0.75');
  g.appendChild(spotEl);

  /* Spot-size label */
  const lbl = document.createElementNS(NS, 'text');
  lbl.setAttribute('x',           cx);
  lbl.setAttribute('y',           SURF_Y + 14);
  lbl.setAttribute('text-anchor', 'middle');
  lbl.setAttribute('font-size',   '10');
  lbl.setAttribute('fill',        C.accent);
  lbl.setAttribute('fill-opacity','0.8');
  lbl.textContent = `~${tipRadius} nm spot`;
  g.appendChild(lbl);
}

/* Master update for Chapter 1 */
function updateCh1() {
  const r = state.ch1.tipRadius;

  drawPerceivedCanvas(r);
  updateTipSVG(r);

  document.getElementById('tipReadout').textContent = `${r} nm`;
  document.getElementById('resolutionReadout').textContent =
    `~${Math.round(1.22 * r)} nm`;

  /* Regime badge */
  const badge = document.getElementById('regimeBadge');
  badge.className = 'regime-badge';
  if (r <= 100)       { badge.textContent = 'near-field'; }
  else if (r <= 450)  { badge.textContent = 'transition'; badge.classList.add('transition'); }
  else                { badge.textContent = 'far-field';  badge.classList.add('far-field'); }
}

/* =============================================================
   CHAPTER 2 — TISSUE / SPECTRUM SIMULATION
   ============================================================= */

/* Penetration fraction: 0 (shallow) → 1 (deep) */
function penetrationFrac(oxy, lam) {
  const muA = mixAbs(oxy, lam);
  const MAX_MU = 0.85;
  return Math.max(0.10, Math.min(0.96, 0.96 - (muA / MAX_MU) * 0.82));
}

/* Approximate beam colour for the tissue canvas */
function beamHex(lam) {
  if (lam < 625) return '#ff6030';
  if (lam < 660) return '#ff2a10';
  if (lam < 700) return '#cc1200';
  if (lam < 800) return '#aa0800';
  if (lam < 1000) return '#880000';
  return '#640000';
}

/* Hex → [r,g,b] */
function hexRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* Draw tissue cross-section */
function drawTissueCanvas(oxy, lam) {
  const ctx = tissueCtx;
  const w = TIS_W, h = TIS_H;

  const skinH   = Math.round(h * 0.15);
  const fatH    = Math.round(h * 0.27);
  const muscH   = h - skinH - fatH;

  const pFrac   = penetrationFrac(oxy, lam);
  const pY      = pFrac * h;

  /* Base tissue layers */
  ctx.fillStyle = C.skin;   ctx.fillRect(0, 0,               w, skinH);
  ctx.fillStyle = C.fat;    ctx.fillRect(0, skinH,            w, fatH);
  ctx.fillStyle = C.muscle; ctx.fillRect(0, skinH + fatH,     w, muscH);

  /* Darkness below penetration depth */
  const fadeStart = Math.max(0, pY - h * 0.10);
  const fadeEnd   = Math.min(h, pY + h * 0.06);
  const grad = ctx.createLinearGradient(0, fadeStart, 0, fadeEnd);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.74)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, fadeStart, w, fadeEnd - fadeStart);
  if (fadeEnd < h) {
    ctx.fillStyle = 'rgba(0,0,0,0.74)';
    ctx.fillRect(0, fadeEnd, w, h - fadeEnd);
  }

  /* Light beam from top */
  const bw   = w * 0.28;
  const bx   = (w - bw) / 2;
  const bCol = beamHex(lam);
  const [br, bg, bb] = hexRGB(bCol);

  const beamGrad = ctx.createLinearGradient(0, 0, 0, Math.min(pY + 20, h));
  beamGrad.addColorStop(0,   `rgba(${br},${bg},${bb},0.75)`);
  beamGrad.addColorStop(0.6, `rgba(${br},${bg},${bb},0.30)`);
  beamGrad.addColorStop(1,   `rgba(${br},${bg},${bb},0.0)`);
  ctx.fillStyle = beamGrad;
  ctx.fillRect(bx, 0, bw, Math.min(pY + 20, h));

  /* Layer labels */
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur  = 3;
  ctx.fillStyle   = 'rgba(255,255,255,0.80)';
  ctx.font        = '11px system-ui';
  ctx.fillText('Skin',   6, skinH * 0.68);
  ctx.fillText('Fat',    6, skinH + fatH * 0.56);
  ctx.fillText('Muscle', 6, skinH + fatH + muscH * 0.22);
  ctx.restore();

  /* Penetration depth dashed line */
  ctx.setLineDash([5, 3]);
  ctx.strokeStyle = 'rgba(255,255,255,0.42)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(0, pY);
  ctx.lineTo(w, pY);
  ctx.stroke();
  ctx.setLineDash([]);

  /* Depth readout */
  ctx.fillStyle   = 'rgba(255,255,255,0.60)';
  ctx.font        = '10px system-ui';
  ctx.textAlign   = 'right';
  ctx.fillText(`depth ~${Math.round(pFrac * 100)}%`, w - 6, pY - 4);

  /* Wavelength tag */
  const tagCol = lam >= 700 ? '#cc5555' : bCol;
  ctx.fillStyle = tagCol;
  ctx.font      = 'bold 11px system-ui';
  ctx.fillText(`${lam} nm${lam >= 700 ? ' (NIR)' : ''}`, w - 6, 14);
  ctx.textAlign = 'left';
}

/* Wavelength → canvas x (spectrum plot) */
function lamX(lam) {
  return SM.l + (lam - LAM_MIN) / (LAM_MAX - LAM_MIN) * SP_W;
}

/* Absorption → canvas y (spectrum plot) */
function absY(a) {
  const MAX_A = 0.85;
  return SM.t + SP_H - (a / MAX_A) * SP_H;
}

/* x → wavelength */
function xLam(x) {
  const l = LAM_MIN + (x - SM.l) / SP_W * (LAM_MAX - LAM_MIN);
  return Math.max(LAM_MIN, Math.min(LAM_MAX, Math.round(l)));
}

/* Draw absorption spectrum */
function drawSpectrumCanvas(oxy, lam) {
  const ctx = spectrumCtx;
  const w = SPC_W, h = SPC_H;

  ctx.fillStyle = C.bgPanel;
  ctx.fillRect(0, 0, w, h);

  /* NIR optical window shading */
  const wx1 = lamX(WIN_MIN), wx2 = lamX(WIN_MAX);
  ctx.fillStyle = 'rgba(88,166,255,0.11)';
  ctx.fillRect(wx1, SM.t, wx2 - wx1, SP_H);

  /* Window label */
  ctx.fillStyle   = 'rgba(88,166,255,0.55)';
  ctx.font        = '9px system-ui';
  ctx.textAlign   = 'center';
  ctx.fillText('NIR',    (wx1 + wx2) / 2, SM.t + 10);
  ctx.fillText('window', (wx1 + wx2) / 2, SM.t + 20);
  ctx.textAlign = 'left';

  /* Vertical grid lines */
  for (const gl of [700, 800, 900, 1000, 1100, 1200, 1300]) {
    const gx = lamX(gl);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(gx, SM.t);
    ctx.lineTo(gx, SM.t + SP_H);
    ctx.stroke();
  }

  /* ----- Curve drawing helper ----- */
  function curve(data, color, lw, alpha) {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = lw;
    ctx.globalAlpha = alpha;
    let first = true;
    for (let l = LAM_MIN; l <= LAM_MAX; l += 2) {
      const x = lamX(l), y = absY(interp(data, l));
      first ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      first = false;
    }
    ctx.stroke();
    ctx.restore();
  }

  curve(HB_DATA,   C.hb,   1.5, 0.85);
  curve(HBO2_DATA, C.hbo2, 1.5, 0.85);

  /* Weighted sum */
  ctx.beginPath();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 2.5;
  let first = true;
  for (let l = LAM_MIN; l <= LAM_MAX; l += 2) {
    const x = lamX(l), y = absY(mixAbs(oxy, l));
    first ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    first = false;
  }
  ctx.stroke();

  /* Axes */
  ctx.strokeStyle = C.border;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(SM.l, SM.t);
  ctx.lineTo(SM.l, SM.t + SP_H);
  ctx.lineTo(SM.l + SP_W, SM.t + SP_H);
  ctx.stroke();

  /* X-axis ticks + labels */
  ctx.fillStyle = C.muted;
  ctx.font      = '9px system-ui';
  ctx.textAlign = 'center';
  for (const l of [600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400]) {
    const x  = lamX(l);
    const by = SM.t + SP_H;
    ctx.strokeStyle = C.border;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(x, by);
    ctx.lineTo(x, by + 4);
    ctx.stroke();
    ctx.fillText(l, x, by + 13);
  }
  ctx.textAlign = 'left';

  /* Y-axis label */
  ctx.save();
  ctx.translate(12, SM.t + SP_H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign  = 'center';
  ctx.fillStyle  = C.muted;
  ctx.font       = '9px system-ui';
  ctx.fillText('Absorption (a.u.)', 0, 0);
  ctx.restore();

  /* X-axis label */
  ctx.textAlign = 'center';
  ctx.fillStyle = C.muted;
  ctx.font      = '9px system-ui';
  ctx.fillText('Wavelength (nm)', SM.l + SP_W / 2, h - 5);
  ctx.textAlign = 'left';

  /* Isosbestic marker (~800 nm) */
  const isoX = lamX(800);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth   = 1;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(isoX, SM.t + SP_H * 0.18);
  ctx.lineTo(isoX, SM.t + SP_H);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle   = 'rgba(255,255,255,0.38)';
  ctx.font        = '8px system-ui';
  ctx.textAlign   = 'center';
  ctx.fillText('iso', isoX, SM.t + 11);
  ctx.textAlign   = 'left';

  /* Legend */
  const ly = SM.t + 8;
  const swatchH = 2;
  ctx.fillStyle = C.hb;
  ctx.fillRect(SM.l + 4, ly + swatchH, 13, swatchH);
  ctx.fillStyle = C.muted;
  ctx.font = '9px system-ui';
  ctx.fillText('Hb', SM.l + 21, ly + 6);

  ctx.fillStyle = C.hbo2;
  ctx.fillRect(SM.l + 4, ly + 12 + swatchH, 13, swatchH);
  ctx.fillStyle = C.muted;
  ctx.fillText('HbO\u2082', SM.l + 21, ly + 18);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(SM.l + 4, ly + 25 + swatchH, 13, 2.5);
  ctx.fillStyle = C.muted;
  ctx.fillText(`Mix (${oxy}% HbO\u2082)`, SM.l + 21, ly + 30);

  /* ----- Wavelength cursor ----- */
  const cx = lamX(lam);

  /* Cursor line */
  ctx.strokeStyle = C.accent;
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([4, 2]);
  ctx.beginPath();
  ctx.moveTo(cx, SM.t);
  ctx.lineTo(cx, SM.t + SP_H);
  ctx.stroke();
  ctx.setLineDash([]);

  /* Drag handle (circle at top) */
  ctx.fillStyle = C.accent;
  ctx.beginPath();
  ctx.arc(cx, SM.t + 7, 5, 0, Math.PI * 2);
  ctx.fill();

  /* Tooltip */
  const hbV   = hbAbs(lam);
  const hbo2V = hbo2Abs(lam);
  const domSpec = hbo2V * (oxy / 100) > hbV * (1 - oxy / 100) ? 'HbO\u2082' : 'Hb';
  const ttX   = cx + (cx > SPC_W * 0.65 ? -72 : 8);
  const ttY   = SM.t + 18;

  ctx.fillStyle = 'rgba(31,41,55,0.96)';
  roundRect(ctx, ttX, ttY, 66, 32, 4);
  ctx.fill();
  ctx.strokeStyle = C.border;
  ctx.lineWidth   = 1;
  roundRect(ctx, ttX, ttY, 66, 32, 4);
  ctx.stroke();

  ctx.fillStyle = C.text;
  ctx.font      = 'bold 10px system-ui';
  ctx.fillText(`${lam} nm`, ttX + 5, ttY + 12);
  ctx.fillStyle = C.muted;
  ctx.font      = '9px system-ui';
  ctx.fillText(`dom: ${domSpec}`, ttX + 5, ttY + 24);
}

/* Master update for Chapter 2 */
function updateCh2() {
  const { oxy, lambda } = state.ch2;
  drawTissueCanvas(oxy, lambda);
  drawSpectrumCanvas(oxy, lambda);
  document.getElementById('oxyReadout').textContent = `${oxy}%`;
  if (state.ch2.decoderOpen) updateDecoder(oxy);
}

/* =============================================================
   DECODER PANEL
   ============================================================= */
function decoderState(oxy) {
  if (oxy <= 20) return 'deoxy';
  if (oxy <= 60) return 'mixed';
  return 'oxy';
}

/* Seeded-deterministic sunflower-pattern noise for vessel texture */
const NOISE = (() => {
  const pts = [];
  for (let i = 0; i < 90; i++) {
    const angle  = i * 2.3999;  // golden angle rad
    const rFrac  = Math.sqrt(i / 90) * 0.50;
    pts.push({ rf: rFrac, a: angle, op: 0.03 + (i % 6) * 0.014 });
  }
  return pts;
})();

function drawDecoderImage(oxy) {
  const ctx = decoderImgCtx;
  const dpr = window.devicePixelRatio || 1;
  const w   = 240, h = 120;

  ctx.clearRect(0, 0, w, h);

  /* Background */
  ctx.fillStyle = '#120a0a';
  ctx.fillRect(0, 0, w, h);

  /* Scattered tissue speckle (deterministic) */
  for (const p of NOISE) {
    const x = w * 0.5 + Math.cos(p.a) * p.rf * w * 0.9;
    const y = h * 0.5 + Math.sin(p.a) * p.rf * h * 0.9;
    ctx.fillStyle = `rgba(80,35,35,${p.op})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Blood vessel */
  const vcx = w * 0.45, vcy = h * 0.50, vr = w * 0.21;
  const ds = decoderState(oxy);

  let vCol, vGlow;
  if      (ds === 'oxy')   { vCol = C.hbo2; vGlow = 'rgba(255,107,107,0.38)'; }
  else if (ds === 'deoxy') { vCol = C.hb;   vGlow = 'rgba(78,205,196,0.30)'; }
  else                     { vCol = '#c07730'; vGlow = 'rgba(192,119,48,0.32)'; }

  /* Glow */
  const glowGrad = ctx.createRadialGradient(vcx, vcy, 0, vcx, vcy, vr * 1.7);
  glowGrad.addColorStop(0,   vGlow);
  glowGrad.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(vcx, vcy, vr * 1.7, 0, Math.PI * 2);
  ctx.fill();

  /* Vessel disc */
  ctx.fillStyle = vCol;
  ctx.beginPath();
  ctx.arc(vcx, vcy, vr, 0, Math.PI * 2);
  ctx.fill();

  /* Inner highlight */
  const hlGrad = ctx.createRadialGradient(
    vcx - vr * 0.28, vcy - vr * 0.28, 0,
    vcx, vcy, vr);
  hlGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
  hlGrad.addColorStop(1, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = hlGrad;
  ctx.beginPath();
  ctx.arc(vcx, vcy, vr, 0, Math.PI * 2);
  ctx.fill();

  /* Scan-line overlay (aesthetic) */
  ctx.strokeStyle = 'rgba(0,0,0,0.10)';
  ctx.lineWidth   = 1;
  for (let y = 0; y < h; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  /* Labels */
  ctx.fillStyle   = 'rgba(255,255,255,0.45)';
  ctx.font        = '8px system-ui';
  ctx.textAlign   = 'right';
  ctx.fillText('s-SNOM amplitude', w - 3, h - 4);

  /* Scale bar */
  const sbW = w * 0.22;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(5, h - 8);
  ctx.lineTo(5 + sbW, h - 8);
  ctx.stroke();
  ctx.fillStyle   = 'rgba(255,255,255,0.55)';
  ctx.font        = '8px system-ui';
  ctx.textAlign   = 'left';
  ctx.fillText('100 nm', 5, h - 12);
}

function drawDecoderSpectrum(oxy) {
  const ctx = decoderSpecCtx;
  const w = 240, h = 90;

  ctx.fillStyle = C.bgPanel;
  ctx.fillRect(0, 0, w, h);

  const ml = 6, mr = 6, mt = 10, mb = 16;
  const pw = w - ml - mr;
  const ph = h - mt - mb;
  const MAX_A = 0.85;

  const lx = (l) => ml + (l - LAM_MIN) / (LAM_MAX - LAM_MIN) * pw;
  const ay = (a) => mt + ph - (a / MAX_A) * ph;

  /* NIR window */
  ctx.fillStyle = 'rgba(88,166,255,0.09)';
  ctx.fillRect(lx(WIN_MIN), mt, lx(WIN_MAX) - lx(WIN_MIN), ph);

  function miniCurve(data, color, lw) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = lw;
    let f = true;
    for (let l = LAM_MIN; l <= LAM_MAX; l += 5) {
      const x = lx(l), y = ay(interp(data, l));
      f ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      f = false;
    }
    ctx.stroke();
  }

  miniCurve(HB_DATA,   C.hb,   1.0);
  miniCurve(HBO2_DATA, C.hbo2, 1.0);

  ctx.beginPath();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 2;
  let f = true;
  for (let l = LAM_MIN; l <= LAM_MAX; l += 5) {
    const x = lx(l), y = ay(mixAbs(oxy, l));
    f ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    f = false;
  }
  ctx.stroke();

  /* Isosbestic */
  const isoX = lx(800);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth   = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(isoX, mt);
  ctx.lineTo(isoX, mt + ph);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle   = 'rgba(255,255,255,0.32)';
  ctx.font        = '7px system-ui';
  ctx.textAlign   = 'center';
  ctx.fillText('iso', isoX, mt + 7);

  /* X ticks */
  ctx.fillStyle   = C.muted;
  ctx.font        = '8px system-ui';
  for (const l of [700, 900, 1100, 1300]) {
    ctx.textAlign = 'center';
    ctx.fillText(l, lx(l), h - 3);
  }
  ctx.textAlign = 'left';
}

const DECODER_CALLOUTS = {
  oxy: [
    { col: C.hbo2,   text: 'High amplitude at 850 nm → HbO\u2082 dominant' },
    { col: '#ffffff', text: 'NIR window: light reaches 2–3 mm depth' },
    { col: C.accent,  text: 'Non-invasive vessel imaging possible' },
  ],
  mixed: [
    { col: '#c07730', text: 'Intermediate amplitude: Hb + HbO\u2082 contribute' },
    { col: '#ffffff', text: 'Weighted-sum curve between two species' },
    { col: C.accent,  text: 'Isosbestic (800 nm): oxygenation-independent' },
  ],
  deoxy: [
    { col: C.hb,      text: 'NIR peak at 760 nm → Hb dominant' },
    { col: '#ffffff',  text: 'Lower amplitude at 850 nm vs. oxy state' },
    { col: C.accent,   text: 'Ratio 660/850 nm encodes deoxygenation' },
  ],
};

const DECODER_LABELS = {
  oxy:   'Oxygenated tissue (≥ 80% HbO\u2082)',
  mixed: 'Mixed oxygenation (40–60%)',
  deoxy: 'Deoxygenated tissue (\u2264 20% HbO\u2082)',
};

function updateDecoder(oxy) {
  const ds = decoderState(oxy);
  document.getElementById('decoderStateLabel').textContent = DECODER_LABELS[ds];

  drawDecoderImage(oxy);
  drawDecoderSpectrum(oxy);

  const container = document.getElementById('decoderCallouts');
  container.innerHTML = '';
  for (const c of DECODER_CALLOUTS[ds]) {
    const div  = document.createElement('div');
    div.className = 'decoder-callout';
    const dot  = document.createElement('span');
    dot.className = 'callout-dot';
    dot.style.background = c.col;
    const txt  = document.createElement('span');
    txt.textContent = c.text;
    div.appendChild(dot);
    div.appendChild(txt);
    container.appendChild(div);
  }
}

function setDecoderOpen(open) {
  state.ch2.decoderOpen = open;
  const panel = document.getElementById('decoderPanel');
  const btn   = document.getElementById('showDecoderBtn');

  if (open) {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    btn.classList.add('active');
    btn.textContent = 'Hide Real Output';
    updateDecoder(state.ch2.oxy);
  } else {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    btn.classList.remove('active');
    btn.textContent = 'Show Real Output';
  }
}

/* =============================================================
   MODAL SYSTEM
   ============================================================= */
let activeModal = null;
let preFocusEl  = null;

function openModal(id) {
  const content = MODALS[id];
  if (!content) return;

  preFocusEl = document.activeElement;
  document.getElementById('modalTitle').textContent  = content.title;
  document.getElementById('modalBody').innerHTML     = content.body;

  const overlay = document.getElementById('modalOverlay');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  activeModal = id;

  document.getElementById('modalClose').focus();
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  activeModal = null;
  if (preFocusEl) preFocusEl.focus();
}

function initModals() {
  document.querySelectorAll('.info-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.modal));
  });

  document.getElementById('modalClose').addEventListener('click', closeModal);

  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  /* Focus trap */
  document.getElementById('modalCard').addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(
      document.getElementById('modalCard').querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    );
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { last.focus(); e.preventDefault(); }
    } else {
      if (document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && activeModal) closeModal();
  });
}

/* =============================================================
   CHAPTER INITIALISATION
   ============================================================= */
function initCh1() {
  const tCanvas = document.getElementById('trueCanvas');
  const pCanvas = document.getElementById('perceivedCanvas');

  trueCtx      = setupCanvas(tCanvas, CH1_W, CH1_H);
  perceivedCtx = setupCanvas(pCanvas, CH1_W, CH1_H);

  drawTrueCanvas();
  updateCh1();

  const slider = document.getElementById('tipSlider');
  slider.addEventListener('input', () => {
    state.ch1.tipRadius = parseInt(slider.value, 10);
    updateCh1();
  });

  document.getElementById('resetCh1').addEventListener('click', () => {
    state.ch1.tipRadius = 20;
    slider.value = 20;
    updateCh1();
  });
}

function initCh2() {
  const tCanvas = document.getElementById('tissueCanvas');
  const sCanvas = document.getElementById('spectrumCanvas');

  tissueCtx   = setupCanvas(tCanvas, TIS_W, TIS_H);
  spectrumCtx = setupCanvas(sCanvas, SPC_W, SPC_H);

  /* Decoder canvases */
  decoderImgCtx  = setupCanvas(document.getElementById('decoderImage'),    240, 120);
  decoderSpecCtx = setupCanvas(document.getElementById('decoderSpectrum'), 240, 90);

  updateCh2();

  /* Oxygenation slider */
  const oxySlider = document.getElementById('oxySlider');
  oxySlider.addEventListener('input', () => {
    state.ch2.oxy = parseInt(oxySlider.value, 10);
    updateCh2();
  });

  /* Wavelength cursor drag on spectrum canvas */
  let dragging = false;

  function scaleX(clientX) {
    const rect = sCanvas.getBoundingClientRect();
    const css  = rect.width || SPC_W;
    return (clientX - rect.left) * (SPC_W / css);
  }

  function hitTest(lx) {
    return Math.abs(lx - lamX(state.ch2.lambda)) < 11;
  }

  sCanvas.addEventListener('mousemove', e => {
    const lx = scaleX(e.clientX);
    sCanvas.style.cursor = hitTest(lx) ? 'ew-resize' : 'default';
    if (dragging) {
      state.ch2.lambda = xLam(lx);
      updateCh2();
    }
  });

  sCanvas.addEventListener('mousedown', e => {
    if (hitTest(scaleX(e.clientX))) dragging = true;
  });

  window.addEventListener('mouseup', () => { dragging = false; });

  /* Touch events for cursor drag */
  sCanvas.addEventListener('touchstart', e => {
    if (hitTest(scaleX(e.touches[0].clientX))) {
      dragging = true;
      e.preventDefault();
    }
  }, { passive: false });

  sCanvas.addEventListener('touchmove', e => {
    if (!dragging) return;
    e.preventDefault();
    state.ch2.lambda = xLam(scaleX(e.touches[0].clientX));
    updateCh2();
  }, { passive: false });

  window.addEventListener('touchend', () => { dragging = false; });

  /* Decoder toggle */
  document.getElementById('showDecoderBtn').addEventListener('click', () => {
    setDecoderOpen(!state.ch2.decoderOpen);
  });

  document.getElementById('decoderClose').addEventListener('click', () => {
    setDecoderOpen(false);
  });

  /* Reset */
  document.getElementById('resetCh2').addEventListener('click', () => {
    state.ch2.oxy    = 75;
    state.ch2.lambda = 850;
    oxySlider.value  = 75;
    updateCh2();
  });
}

/* =============================================================
   RESIZE HANDLER (debounced)
   ============================================================= */
function onResize() {
  /* Redraw both chapters (canvases stretch via CSS; content recalc ensures
     any element-size-dependent geometry is refreshed). */
  drawTrueCanvas();
  updateCh1();
  updateCh2();
}

/* =============================================================
   ENTRY POINT
   ============================================================= */
document.addEventListener('DOMContentLoaded', () => {
  initCh1();
  initCh2();
  initModals();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 180);
  });
});
