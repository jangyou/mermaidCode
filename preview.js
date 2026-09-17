import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

const output = document.querySelector('#diagramOutput');
const stage = document.querySelector('#diagramStage');
const loading = document.querySelector('#loadingState');
const empty = document.querySelector('#emptyState');
const zoomLabel = document.querySelector('#zoomLabel');
let scale = 1;
let fitScale = 1;

const themePresets = {
  indigo: { background: '#f8fafc', node: '#eef2ff', border: '#6366f1', line: '#475569', accent: '#c7d2fe', text: '#1e293b' },
  graphite: { background: '#18181b', node: '#27272a', border: '#71717a', line: '#a1a1aa', accent: '#3f3f46', text: '#fafafa' },
  ocean: { background: '#f0f9ff', node: '#e0f2fe', border: '#0284c7', line: '#0369a1', accent: '#bae6fd', text: '#0c4a6e' },
  mint: { background: '#f0fdfa', node: '#ccfbf1', border: '#0f766e', line: '#115e59', accent: '#99f6e4', text: '#134e4a' },
  rose: { background: '#fff1f2', node: '#ffe4e6', border: '#e11d48', line: '#9f1239', accent: '#fecdd3', text: '#881337' },
  amber: { background: '#fffbeb', node: '#fef3c7', border: '#d97706', line: '#92400e', accent: '#fde68a', text: '#78350f' },
  slate: { background: '#f8fafc', node: '#e2e8f0', border: '#2563eb', line: '#334155', accent: '#dbeafe', text: '#1e293b' },
  classic: { background: '#ffffff', node: '#e8f3ff', border: '#337ca8', line: '#4b6580', accent: '#d8f8eb', text: '#25364a' }
};

function getColors() {
  const key = localStorage.getItem('mermaid-code-theme') || 'indigo';
  if (key === 'custom') {
    try {
      const custom = JSON.parse(localStorage.getItem('mermaid-code-custom-theme') || 'null');
      if (custom) return custom;
    } catch {}
  }
  return themePresets[key] || themePresets.indigo;
}

function initializeTheme(colors) {
  mermaid.initialize({
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
  });
}

function isDarkColor(hex) {
  const value = hex.replace('#', '');
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 < 128;
}

function naturalSize(svg) {
  const rect = svg.getBoundingClientRect();
  const known = scale || 1;
  if (rect.width && rect.height) return { width: rect.width / known, height: rect.height / known };
  const vb = svg.viewBox?.baseVal;
  return { width: vb?.width || 0, height: vb?.height || 0 };
}

function applyScale(nextScale) {
  const svg = output.querySelector('svg');
  const size = svg ? naturalSize(svg) : null;
  scale = Math.min(2.5, Math.max(.25, nextScale));
  output.style.transform = `scale(${scale})`;
  if (size) output.style.margin = `${-(1-scale) * size.height / 2}px ${-(1-scale) * size.width / 2}px`;
  zoomLabel.textContent = `${Math.round(scale * 100)}%`;
}

function fitDiagram() {
  const svg = output.querySelector('svg');
  if (!svg) return;
  const { width, height } = naturalSize(svg);
  if (!width || !height) return;
  fitScale = Math.min(1, (stage.clientWidth - 90) / width, (stage.clientHeight - 120) / height);
  applyScale(fitScale);
}

async function render() {
  const code = (localStorage.getItem('mermaid-studio-code') || localStorage.getItem('diagram-flow-code'))?.trim();
  if (!code) {
    loading.hidden = true;
    empty.hidden = false;
    return;
  }
  try {
    const colors = getColors();
    initializeTheme(colors);
    stage.style.backgroundColor = colors.background;
    const grid = isDarkColor(colors.background) ? 'rgba(255,255,255,.07)' : 'rgba(51,65,85,.10)';
    stage.style.backgroundImage = `linear-gradient(${grid} 1px, transparent 1px), linear-gradient(90deg, ${grid} 1px, transparent 1px)`;
    const { svg, bindFunctions } = await mermaid.render('fullscreen-diagram', code);
    output.innerHTML = svg;
    bindFunctions?.(output);
    loading.hidden = true;
    fitDiagram();
  } catch {
    loading.hidden = true;
    empty.hidden = false;
    empty.querySelector('strong').textContent = 'Could not display the diagram';
    empty.querySelector('p').textContent = 'Go back to the editor and check the Mermaid syntax.';
  }
}

document.querySelector('#zoomOutButton').addEventListener('click', () => applyScale(scale - .1));
document.querySelector('#zoomInButton').addEventListener('click', () => applyScale(scale + .1));
zoomLabel.addEventListener('click', fitDiagram);
window.addEventListener('resize', fitDiagram);

let panState = null;
stage.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  panState = { x: event.clientX, y: event.clientY, left: stage.scrollLeft, top: stage.scrollTop };
  stage.classList.add('panning');
  stage.setPointerCapture(event.pointerId);
});
stage.addEventListener('pointermove', event => {
  if (!panState) return;
  stage.scrollLeft = panState.left - (event.clientX - panState.x);
  stage.scrollTop = panState.top - (event.clientY - panState.y);
});
['pointerup', 'pointercancel'].forEach(type => stage.addEventListener(type, event => {
  if (!panState) return;
  panState = null;
  stage.classList.remove('panning');
  if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
}));
stage.addEventListener('dblclick', () => applyScale(Math.abs(scale - fitScale) < 0.02 ? 1 : fitScale));
stage.addEventListener('wheel', event => {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  applyScale(scale + (event.deltaY < 0 ? .12 : -.12));
}, { passive: false });
render();
