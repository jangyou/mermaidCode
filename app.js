import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

const sampleCode = `sequenceDiagram
autonumber
actor User as Student
participant API as Backend Orchestrator
participant DB as User/Book DB
participant LLM as vLLM Server (Qwen 9B)
participant RecAPI as Multi-vector Recommendation API

Note over User, API: [Step 1] Enter chat session
User->>API: Start a book conversation
API->>DB: Load grade, book genre, and current comprehension level
DB-->>API: Return user context

Note over User, LLM: [Step 2] Socratic questioning
User->>API: "Hong Gil-dong had no choice but to become an outlaw."
API->>LLM: [Agent A Router LoRA] Classify intent
LLM-->>API: "knowledge_reading"
API->>LLM: [Agent B Book LoRA] Call (Strategy: divergent thinking)
LLM-->>API: "If you were Gil-dong, what different choice could you make?"
API-->>User: Show AI question

Note over User, RecAPI: [Step 3] Switch activity
User->>API: "This book is too hard. Recommend a dinosaur book instead."
API->>LLM: [Agent A Router LoRA] Classify intent
LLM-->>API: "switch_activity" (destination: recommendation)
API->>DB: Auto-save previous reading history
API->>RecAPI: Query dinosaur books for the student's level
RecAPI-->>API: Return book metadata (Spotted Dinosaur, etc.)
API->>LLM: [Agent D Recommendation LoRA] Call (comfort + recommendation metadata)
LLM-->>API: "That was difficult. How about the exciting Spotted Dinosaur?"
API-->>User: Show recommendation

Note over User, DB: [Step 4] End session and issue badge
User->>API: "Thanks. I am done for today."
API->>LLM: [Agent A Router LoRA] Classify intent
LLM-->>API: "session_finish"
API->>DB: Save chat log, divergent-thinking record, and issue 1EdTech Open Badge
API-->>User: "Great work today! Let’s check your badge. See you! 👋"`;

const input = document.querySelector('#codeInput');
const output = document.querySelector('#diagramOutput');
const errorState = document.querySelector('#errorState');
const errorMessage = document.querySelector('#errorMessage');
const loading = document.querySelector('#loadingState');
const lineNumbers = document.querySelector('#lineNumbers');
const lineCount = document.querySelector('#lineCount');
const statusDot = document.querySelector('#statusDot');
const statusText = document.querySelector('#statusText');
const renderTime = document.querySelector('#renderTime');
const toast = document.querySelector('#toast');
const previewCanvas = document.querySelector('#previewCanvas');
const themeDialog = document.querySelector('#themeDialog');
const customSwatch = document.querySelector('#customSwatch');
const zoomValue = document.querySelector('#zoomValue');
let renderTimer;
let viewScale = 1;
let toastTimer;
let currentSvg = '';
let renderId = 0;

const themePresets = {
  indigo: { name: 'Modern Indigo', background: '#f8fafc', node: '#eef2ff', border: '#6366f1', line: '#475569', accent: '#c7d2fe', text: '#1e293b' },
  graphite: { name: 'Graphite', background: '#18181b', node: '#27272a', border: '#71717a', line: '#a1a1aa', accent: '#3f3f46', text: '#fafafa' },
  ocean: { name: 'Ocean Blue', background: '#f0f9ff', node: '#e0f2fe', border: '#0284c7', line: '#0369a1', accent: '#bae6fd', text: '#0c4a6e' },
  mint: { name: 'Clean Mint', background: '#f0fdfa', node: '#ccfbf1', border: '#0f766e', line: '#115e59', accent: '#99f6e4', text: '#134e4a' },
  rose: { name: 'Soft Rose', background: '#fff1f2', node: '#ffe4e6', border: '#e11d48', line: '#9f1239', accent: '#fecdd3', text: '#881337' },
  amber: { name: 'Warm Amber', background: '#fffbeb', node: '#fef3c7', border: '#d97706', line: '#92400e', accent: '#fde68a', text: '#78350f' },
  slate: { name: 'Slate Blue', background: '#f8fafc', node: '#e2e8f0', border: '#2563eb', line: '#334155', accent: '#dbeafe', text: '#1e293b' },
  classic: { name: 'Classic', background: '#ffffff', node: '#e8f3ff', border: '#337ca8', line: '#4b6580', accent: '#d8f8eb', text: '#25364a' }
};

let customTheme;
try { customTheme = JSON.parse(localStorage.getItem('mermaid-code-custom-theme') || 'null'); } catch { customTheme = null; }
let currentThemeKey = localStorage.getItem('mermaid-code-theme') || 'indigo';
if (currentThemeKey === 'custom' && !customTheme) currentThemeKey = 'indigo';

function currentColors() {
  return currentThemeKey === 'custom' ? customTheme : (themePresets[currentThemeKey] || themePresets.indigo);
}

function mermaidConfig(colors) {
  return {
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
    themeVariables: {
      background: colors.background, mainBkg: colors.node, primaryColor: colors.node,
      primaryTextColor: colors.text, primaryBorderColor: colors.border, lineColor: colors.line,
      secondaryColor: colors.accent, tertiaryColor: colors.background,
      actorBkg: colors.node, actorBorder: colors.border, actorTextColor: colors.text,
      signalColor: colors.line, signalTextColor: colors.text,
      noteBkgColor: colors.accent, noteTextColor: colors.text, noteBorderColor: colors.border,
      activationBkgColor: colors.accent, activationBorderColor: colors.border,
      labelBoxBkgColor: colors.node, labelBoxBorderColor: colors.border, labelTextColor: colors.text,
      clusterBkg: colors.background, clusterBorder: colors.border, edgeLabelBackground: colors.background,
      nodeTextColor: colors.text, textColor: colors.text, titleColor: colors.text
    },
    sequence: { useMaxWidth: false, diagramMarginX: 28, diagramMarginY: 20, actorMargin: 46, messageMargin: 34 }
  };
}

function updateThemeUi() {
  document.querySelectorAll('.theme-chip').forEach(button => button.classList.toggle('active', button.dataset.theme === currentThemeKey));
  const colors = currentColors();
  if (colors) customSwatch.style.background = `conic-gradient(${colors.border},${colors.accent},${colors.text},${colors.border})`;
}

function isDarkColor(hex) {
  const value = hex.replace('#', '');
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 < 128;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function updateLines() {
  const count = input.value.split('\n').length;
  lineNumbers.textContent = Array.from({ length: count }, (_, i) => i + 1).join('\n');
  lineCount.textContent = `${count} ${count === 1 ? 'line' : 'lines'}`;
  lineNumbers.scrollTop = input.scrollTop;
}

function setStatus(state, message) {
  statusDot.className = `status-dot ${state}`;
  statusText.textContent = message;
}

async function renderDiagram() {
  const code = input.value.trim();
  const started = performance.now();
  const thisRender = ++renderId;
  loading.hidden = false;
  loading.style.display = 'grid';
  errorState.hidden = true;
  setStatus('', 'Rendering');
  if (!code) {
    output.innerHTML = '';
    currentSvg = '';
    loading.style.display = 'none';
    errorState.hidden = false;
    errorMessage.textContent = 'Enter Mermaid code in the editor.';
    setStatus('error', 'No code');
    return;
  }
  try {
    const colors = currentColors();
    mermaid.initialize(mermaidConfig(colors));
    previewCanvas.style.backgroundColor = colors.background;
    const grid = isDarkColor(colors.background) ? 'rgba(255,255,255,.07)' : 'rgba(51,65,85,.10)';
    previewCanvas.style.backgroundImage = `linear-gradient(${grid} 1px, transparent 1px), linear-gradient(90deg, ${grid} 1px, transparent 1px)`;
    const { svg, bindFunctions } = await mermaid.render(`diagram-${thisRender}`, code);
    if (thisRender !== renderId) return;
    currentSvg = svg;
    output.innerHTML = svg;
    bindFunctions?.(output);
    errorState.hidden = true;
    loading.style.display = 'none';
    setStatus('ready', 'Rendered');
    renderTime.textContent = `${Math.round(performance.now() - started)}ms`;
    localStorage.setItem('mermaid-studio-code', input.value);
    localStorage.setItem('mermaid-code-theme', currentThemeKey);
    applyScale(viewScale);
  } catch (error) {
    if (thisRender !== renderId) return;
    currentSvg = '';
    output.innerHTML = '';
    loading.style.display = 'none';
    errorState.hidden = false;
    errorMessage.textContent = String(error?.message || error).split('\n')[0].slice(0, 220);
    setStatus('error', 'Syntax error');
    renderTime.textContent = '—';
  }
}

function scheduleRender() {
  updateLines();
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderDiagram, 420);
}

function svgSize() {
  const svg = output.querySelector('svg');
  if (!svg) return null;
  const rect = svg.getBoundingClientRect();
  const known = viewScale || 1;
  if (rect.width && rect.height) return { width: rect.width / known, height: rect.height / known };
  const vb = svg.viewBox?.baseVal;
  if (vb && vb.width) return { width: vb.width, height: vb.height };
  return null;
}

function applyScale(next) {
  const size = svgSize();
  if (!size) return;
  viewScale = Math.min(4, Math.max(0.2, next));
  output.style.transform = `scale(${viewScale})`;
  output.style.margin = `${-(1 - viewScale) * size.height / 2}px ${-(1 - viewScale) * size.width / 2}px`;
  zoomValue.textContent = `${Math.round(viewScale * 100)}%`;
}

function fitDiagram() {
  const size = svgSize();
  if (!size) return;
  const scale = Math.min(1,
    (previewCanvas.clientWidth - 56) / size.width,
    (previewCanvas.clientHeight - 56) / size.height);
  applyScale(scale);
}

function resetView() {
  applyScale(1);
  previewCanvas.scrollLeft = 0;
  previewCanvas.scrollTop = 0;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadSvg() {
  if (!currentSvg) return showToast('Render a valid diagram first.');
  downloadBlob(new Blob([currentSvg], { type: 'image/svg+xml;charset=utf-8' }), 'diagram.svg');
  showToast('SVG downloaded.');
}

async function downloadPng() {
  if (!currentSvg) return showToast('Render a valid diagram first.');
  const svgBlob = new Blob([currentSvg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f5f7fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => blob && downloadBlob(blob, 'diagram.png'), 'image/png');
    URL.revokeObjectURL(url);
    showToast('PNG downloaded.');
  };
  img.src = url;
}

input.addEventListener('input', scheduleRender);
input.addEventListener('scroll', () => { lineNumbers.scrollTop = input.scrollTop; });
input.addEventListener('keydown', event => {
  if (event.key === 'Tab') {
    event.preventDefault();
    const start = input.selectionStart;
    input.setRangeText('  ', start, input.selectionEnd, 'end');
    scheduleRender();
  }
});
document.querySelector('#sampleButton').addEventListener('click', () => { input.value = sampleCode; scheduleRender(); showToast('Sample code loaded.'); });
document.querySelector('#copyCodeButton').addEventListener('click', async () => { await navigator.clipboard.writeText(input.value); showToast('Code copied.'); });
document.querySelector('#fitButton').addEventListener('click', fitDiagram);
document.querySelector('#zoomInButton').addEventListener('click', () => applyScale(viewScale + 0.15));
document.querySelector('#zoomOutButton').addEventListener('click', () => applyScale(viewScale - 0.15));
zoomValue.addEventListener('click', resetView);
document.querySelector('#downloadSvgButton').addEventListener('click', downloadSvg);
document.querySelector('#downloadPngButton').addEventListener('click', downloadPng);
window.addEventListener('resize', () => applyScale(viewScale));

let panState = null;
previewCanvas.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  panState = { x: event.clientX, y: event.clientY, left: previewCanvas.scrollLeft, top: previewCanvas.scrollTop };
  previewCanvas.classList.add('panning');
  previewCanvas.setPointerCapture(event.pointerId);
});
previewCanvas.addEventListener('pointermove', event => {
  if (!panState) return;
  previewCanvas.scrollLeft = panState.left - (event.clientX - panState.x);
  previewCanvas.scrollTop = panState.top - (event.clientY - panState.y);
});
['pointerup', 'pointercancel'].forEach(type => previewCanvas.addEventListener(type, event => {
  if (!panState) return;
  panState = null;
  previewCanvas.classList.remove('panning');
  if (previewCanvas.hasPointerCapture(event.pointerId)) previewCanvas.releasePointerCapture(event.pointerId);
}));
previewCanvas.addEventListener('wheel', event => {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  applyScale(viewScale + (event.deltaY < 0 ? 0.12 : -0.12));
}, { passive: false });

document.querySelectorAll('.theme-chip').forEach(button => button.addEventListener('click', () => {
  currentThemeKey = button.dataset.theme;
  updateThemeUi();
  renderDiagram();
  showToast(`${themePresets[currentThemeKey].name} theme applied.`);
}));

document.querySelector('#customThemeButton').addEventListener('click', () => {
  const colors = customTheme || currentColors();
  document.querySelector('#customBackground').value = colors.background;
  document.querySelector('#customNode').value = colors.node;
  document.querySelector('#customBorder').value = colors.border;
  document.querySelector('#customLine').value = colors.line;
  document.querySelector('#customAccent').value = colors.accent;
  document.querySelector('#customText').value = colors.text;
  themeDialog.showModal();
});

document.querySelector('#applyCustomTheme').addEventListener('click', event => {
  event.preventDefault();
  customTheme = {
    name: 'Custom palette',
    background: document.querySelector('#customBackground').value,
    node: document.querySelector('#customNode').value,
    border: document.querySelector('#customBorder').value,
    line: document.querySelector('#customLine').value,
    accent: document.querySelector('#customAccent').value,
    text: document.querySelector('#customText').value
  };
  currentThemeKey = 'custom';
  localStorage.setItem('mermaid-code-custom-theme', JSON.stringify(customTheme));
  updateThemeUi();
  themeDialog.close();
  renderDiagram();
  showToast('Custom palette applied.');
});

const modelContext = document.modelContext;
if (modelContext?.registerTool) {
  const lifecycle = new AbortController();
  Promise.resolve(modelContext.registerTool({
    name: 'set_diagram_code',
    title: 'Set diagram code',
    description: 'Enter Mermaid code and update the live preview.',
    inputSchema: {
      type: 'object',
      properties: { code: { type: 'string', minLength: 1, description: 'Mermaid code to render' } },
      required: ['code'], additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    async execute({ code }) {
      if (typeof code !== 'string' || !code.trim()) throw new Error('A non-empty Mermaid code string is required.');
      input.value = code;
      updateLines();
      await renderDiagram();
      return { rendered: Boolean(currentSvg), lines: code.split('\n').length, status: statusText.textContent };
    }
  }, { signal: lifecycle.signal })).catch(() => {});
  Promise.resolve(modelContext.registerTool({
    name: 'get_diagram_code',
    title: 'Read diagram code',
    description: 'Read the current Mermaid code and render status.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute() { return { code: input.value, rendered: Boolean(currentSvg), status: statusText.textContent }; }
  }, { signal: lifecycle.signal })).catch(() => {});
}

input.value = localStorage.getItem('mermaid-studio-code') || localStorage.getItem('diagram-flow-code') || sampleCode;
updateThemeUi();
updateLines();
renderDiagram();
