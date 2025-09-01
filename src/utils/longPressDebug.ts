// Long press debug panel for mobile (React + TS).
// Usage: import { installLongPressDebug } from '../utils/longPressDebug'; then call installLongPressDebug()
// Only activates if enable=true (default: URL 包含 debug=1).

export interface LongPressDebugOptions {
  enable?: boolean;
  longPressMs?: number;
  maxMovePx?: number;
  maxMultiTouch?: number;
}

export function installLongPressDebug(options: LongPressDebugOptions = {}) {
  const {
    enable = window.location.search.includes('debug=1'),
    longPressMs = 3000,
    maxMovePx = 20,
    maxMultiTouch = 1,
  } = options;

  if (!enable) return;
  // 防止重复安装
  if ((window as any).__lp_debug_installed) return;
  (window as any).__lp_debug_installed = true;

  const PANEL_ID = '__lp_debug_panel__';

  let timer: number | null = null;
  let startX = 0;
  let startY = 0;
  let pointerDown = false;
  let moved = false;
  let panelVisible = false;

  function ensurePanel(): HTMLDivElement {
    let panel = document.getElementById(PANEL_ID) as HTMLDivElement | null;
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.cssText = [
      'position:fixed',
      'left:8px',
      'bottom:8px',
      'width:90%',
      'max-width:640px',
      'height:40%',
      'max-height:50%',
      'background:rgba(0,0,0,0.85)',
      'color:#0f0',
      'font:12px/1.4 monospace',
      'z-index:999999',
      'border:1px solid #444',
      'border-radius:8px',
      'display:flex',
      'flex-direction:column',
      'backdrop-filter:blur(4px)',
      'box-shadow:0 4px 18px rgba(0,0,0,.5)',
    ].join(';');

    panel.innerHTML = `
      <div style="flex:0 0 auto;padding:4px 8px;background:rgba(255,255,255,0.06);display:flex;align-items:center;gap:8px;cursor:move;">
        <strong style="flex:1;color:#fff;font:12px system-ui;">调试日志 (长按 3 秒再次呼出)</strong>
        <button id="__lp_clear" style="background:#333;color:#fff;border:1px solid #555;font:11px;padding:2px 6px;border-radius:4px;">清空</button>
        <button id="__lp_hide" style="background:#900;color:#fff;border:1px solid #b33;font:11px;padding:2px 6px;border-radius:4px;">关闭</button>
      </div>
      <div id="__lp_log_body" style="flex:1 1 auto;overflow:auto;padding:6px 8px;word-break:break-word;"></div>
    `;
    document.body.appendChild(panel);

    const body = panel.querySelector('#__lp_log_body') as HTMLDivElement;
    const btnClear = panel.querySelector('#__lp_clear') as HTMLButtonElement;
    const btnHide = panel.querySelector('#__lp_hide') as HTMLButtonElement;

    btnClear.onclick = () => (body.innerHTML = '');
    btnHide.onclick = () => {
      panel?.remove();
      panelVisible = false;
    };

    enableDrag(panel);
    patchConsole(body);
    panelVisible = true;
    return panel;
  }

  function enableDrag(panel: HTMLDivElement) {
    const header = panel.firstElementChild as HTMLElement;
    let drag = false;
    let ox = 0;
    let oy = 0;
    let startLeft = 0;
    let startTop = 0;

    header.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      drag = true;
      panel.setPointerCapture(e.pointerId);
      ox = e.clientX;
      oy = e.clientY;
      const rect = panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
    });

    header.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - ox;
      const dy = e.clientY - oy;
      panel.style.left = Math.max(0, startLeft + dx) + 'px';
      panel.style.top = Math.max(0, startTop + dy) + 'px';
      panel.style.bottom = 'auto';
    });

    const endDrag = () => {
      drag = false;
    };
    header.addEventListener('pointerup', endDrag);
    header.addEventListener('pointercancel', endDrag);
  }

  function patchConsole(bodyEl: HTMLDivElement) {
    if ((console as any).__lp_patched) return;
    (console as any).__lp_patched = true;

    ['log', 'warn', 'error', 'info'].forEach((level) => {
      const raw = (console as any)[level];
      (console as any)[level] = (...args: any[]) => {
        try {
          raw.apply(console, args);
        } catch {}
        appendLogLine(bodyEl, level, args);
      };
    });

    window.addEventListener('error', (e) => {
      appendLogLine(bodyEl, 'error', [e.message, `${e.filename}:${e.lineno}:${e.colno}`]);
    });

    window.addEventListener('unhandledrejection', (e) => {
      appendLogLine(bodyEl, 'error', ['UnhandledRejection', e.reason]);
    });
  }

  function appendLogLine(bodyEl: HTMLDivElement, level: string, args: any[]) {
    if (!panelVisible) return;
    const line = document.createElement('div');
    const color =
      level === 'error' ? '#f55' : level === 'warn' ? '#ff5' : '#0f0';
    line.style.color = color;
    line.style.marginBottom = '2px';
    line.style.whiteSpace = 'pre-wrap';
    const time = new Date().toISOString().split('T')[1].replace('Z', '');
    line.textContent = `[${time}][${level}] ` + args.map(formatArg).join(' ');
    bodyEl.appendChild(line);
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function formatArg(a: any): string {
    if (a instanceof Error) return a.stack || a.message;
    if (typeof a === 'object') {
      try {
        return JSON.stringify(a);
      } catch {
        return Object.prototype.toString.call(a);
      }
    }
    return String(a);
  }

  function startLongPress(e: any) {
    if (pointerDown) return;
    if (e.touches && e.touches.length > maxMultiTouch) return;
    pointerDown = true;
    moved = false;

    const p = firstPoint(e);
    startX = p.x;
    startY = p.y;
    timer = window.setTimeout(() => {
      if (!moved) ensurePanel();
    }, longPressMs);
  }

  function cancelLongPress() {
    pointerDown = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function moveCheck(e: any) {
    if (!pointerDown) return;
    const p = firstPoint(e);
    const dx = p.x - startX;
    const dy = p.y - startY;
    if (Math.hypot(dx, dy) > maxMovePx) {
      moved = true;
      cancelLongPress();
    }
  }

  function firstPoint(e: any) {
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  // 事件绑定
  window.addEventListener('pointerdown', startLongPress, { passive: true });
  window.addEventListener('pointerup', cancelLongPress, { passive: true });
  window.addEventListener('pointercancel', cancelLongPress, { passive: true });
  window.addEventListener('pointermove', moveCheck, { passive: true });

  window.addEventListener('touchstart', startLongPress, { passive: true });
  window.addEventListener('touchend', cancelLongPress, { passive: true });
  window.addEventListener('touchcancel', cancelLongPress, { passive: true });
  window.addEventListener('touchmove', moveCheck, { passive: true });

  (window as any).__showDebugPanel = () => ensurePanel();
}
