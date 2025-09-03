// Long press (3s) to open an on‑screen log panel (only if URL contains debug=1 by default).
// Usage: import { installLongPressDebug } from '../utils/longPressDebug'; installLongPressDebug();
// Then add &debug=1 to URL and long‑press屏幕3秒(不要移动)即可弹出。

export interface LongPressDebugOptions {
  enable?: boolean;
  longPressMs?: number;
  maxMovePx?: number;
  maxMultiTouch?: number;
  maxLines?: number; // 可选：限制最大日志行数（超出清理旧行）
}

export function installLongPressDebug(options: LongPressDebugOptions = {}) {
  const {
    enable = window.location.search.includes('debug=1'),
    longPressMs = 3000,
    maxMovePx = 20,
    maxMultiTouch = 1,
    maxLines = 400,
  } = options;

  if (!enable) return;
  if ((window as any).__lp_debug_installed) return;
  (window as any).__lp_debug_installed = true;

  const PANEL_ID = '__lp_debug_panel__';
  let timer: number | null = null;
  let startX = 0, startY = 0;
  let pointerDown = false;
  let moved = false;
  let panelVisible = false;

  function ensurePanel(): HTMLDivElement {
    let panel = document.getElementById(PANEL_ID) as HTMLDivElement | null;
    if (panel) { panelVisible = true; return panel; }
    panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.cssText = `
      position:fixed;left:8px;bottom:8px;width:90%;max-width:640px;
      height:42%;max-height:55%;background:rgba(0,0,0,0.85);color:#0f0;
      font:12px/1.4 monospace;z-index:999999;border:1px solid #444;
      border-radius:8px;display:flex;flex-direction:column;
      backdrop-filter:blur(4px);box-shadow:0 4px 18px rgba(0,0,0,.5);
    `;
    panel.innerHTML = `
      <div style="flex:0 0 auto;padding:4px 8px;background:rgba(255,255,255,0.07);
           display:flex;align-items:center;gap:8px;cursor:move;">
        <strong style="flex:1;color:#fff;font:12px system-ui;">调试日志 (长按 3 秒可再次呼出)</strong>
        <button id="__lp_copy" style="background:#224;color:#fff;border:1px solid #335;font:11px;padding:2px 6px;border-radius:4px;">
          复制
        </button>
        <button id="__lp_clear" style="background:#333;color:#fff;border:1px solid #555;font:11px;padding:2px 6px;border-radius:4px;">
          清空
        </button>
        <button id="__lp_hide" style="background:#900;color:#fff;border:1px solid #b33;font:11px;padding:2px 6px;border-radius:4px;">
          关闭
        </button>
      </div>
      <div id="__lp_log_body" style="flex:1 1 auto;overflow:auto;padding:6px 8px;word-break:break-word;"></div>
    `;
    document.body.appendChild(panel);

    const body = panel.querySelector('#__lp_log_body') as HTMLDivElement;
    (panel.querySelector('#__lp_clear') as HTMLButtonElement).onclick = () => (body.innerHTML = '');
    (panel.querySelector('#__lp_hide') as HTMLButtonElement).onclick = () => { panel?.remove(); panelVisible = false; };
    (panel.querySelector('#__lp_copy') as HTMLButtonElement).onclick = () => {
      const text = Array.from(body.querySelectorAll('div[data-line]'))
        .map(d => (d as HTMLDivElement).innerText)
        .join('\n');
      navigator.clipboard.writeText(text).catch(()=>{});
    };

    enableDrag(panel);
    patchConsole(body);
    panelVisible = true;
    return panel;
  }

  function enableDrag(panel: HTMLDivElement) {
    const header = panel.firstElementChild as HTMLElement;
    let drag = false, ox = 0, oy = 0, startLeft = 0, startTop = 0;
    header.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      drag = true;
      panel.setPointerCapture(e.pointerId);
      ox = e.clientX; oy = e.clientY;
      const r = panel.getBoundingClientRect();
      startLeft = r.left; startTop = r.top;
    });
    header.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - ox, dy = e.clientY - oy;
      panel.style.left = Math.max(0, startLeft + dx) + 'px';
      panel.style.top = Math.max(0, startTop + dy) + 'px';
      panel.style.bottom = 'auto';
    });
    const end = () => { drag = false; };
    header.addEventListener('pointerup', end);
    header.addEventListener('pointercancel', end);
  }

  function patchConsole(bodyEl: HTMLDivElement) {
    if ((console as any).__lp_patched) return;
    (console as any).__lp_patched = true;
    ['log','warn','error','info'].forEach(level => {
      const raw = (console as any)[level];
      (console as any)[level] = (...args: any[]) => {
        try { raw.apply(console, args); } catch {}
        append(bodyEl, level, args);
      };
    });
    window.addEventListener('error', e => append(bodyEl,'error',[e.message, `${e.filename}:${e.lineno}:${e.colno}`]));
    window.addEventListener('unhandledrejection', e => append(bodyEl,'error',['UnhandledRejection', e.reason]));
  }

  function append(bodyEl: HTMLDivElement, level: string, args: any[]) {
    if (!panelVisible) return;
    const line = document.createElement('div');
    line.dataset.line = '1';
    line.style.whiteSpace = 'pre-wrap';
    line.style.marginBottom = '2px';
    line.style.color = level === 'error' ? '#f55'
                     : level === 'warn'  ? '#ff5'
                     : level === 'info'  ? '#6bf'
                     : '#0f0';
    const time = new Date().toISOString().split('T')[1].replace('Z','');
    line.textContent = `[${time}][${level}] ` + args.map(formatArg).join(' ');
    bodyEl.appendChild(line);

    // 限制最大行数
    const lines = bodyEl.querySelectorAll('div[data-line]');
    if (lines.length > maxLines) {
      const removeCount = lines.length - maxLines;
      for (let i = 0; i < removeCount; i++) {
        lines[i].remove();
      }
    }
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function formatArg(a: any): string {
    if (a instanceof Error) return a.stack || a.message;
    if (typeof a === 'object') {
      try { return JSON.stringify(a); } catch { return Object.prototype.toString.call(a); }
    }
    return String(a);
  }

  function start(e: any) {
    if (pointerDown) return;
    if (e.touches && e.touches.length > maxMultiTouch) return;
    pointerDown = true; moved = false;
    const p = firstPoint(e);
    startX = p.x; startY = p.y;
    timer = window.setTimeout(() => { if (!moved) ensurePanel(); }, longPressMs);
  }
  function cancel() {
    pointerDown = false;
    if (timer) { clearTimeout(timer); timer = null; }
  }
  function move(e: any) {
    if (!pointerDown) return;
    const p = firstPoint(e);
    if (Math.hypot(p.x - startX, p.y - startY) > maxMovePx) {
      moved = true;
      cancel();
    }
  }
  function firstPoint(e: any) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  window.addEventListener('pointerdown', start, { passive: true });
  window.addEventListener('pointerup', cancel, { passive: true });
  window.addEventListener('pointercancel', cancel, { passive: true });
  window.addEventListener('pointermove', move, { passive: true });

  window.addEventListener('touchstart', start, { passive: true });
  window.addEventListener('touchend', cancel, { passive: true });
  window.addEventListener('touchcancel', cancel, { passive: true });
  window.addEventListener('touchmove', move, { passive: true });

  (window as any).__showDebugPanel = () => ensurePanel();
}
