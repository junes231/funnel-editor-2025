// Minimal long-press debug panel utility
// Usage:
//   import { installLongPressDebug } from './utils/longPressDebug';
//   installLongPressDebug({ enable: true, longPressMs: 2000, maxLines: 300 });

export interface LongPressDebugOptions {
  enable?: boolean;
  longPressMs?: number;
  maxMovePx?: number;
  maxMultiTouch?: number;
  maxLines?: number; // optional: limit max log lines
}

export function installLongPressDebug(options: LongPressDebugOptions = {}) {
  const {
    enable = (window.location.search || '').indexOf('debug=1') !== -1,
    longPressMs = 3000,
    maxMovePx = 20,
    maxMultiTouch = 1,
    maxLines = 400,
  } = options as any;

  if (!enable) return;

  if ((window as any).__lp_debug_installed) return;
  (window as any).__lp_debug_installed = true;

  const panel = document.createElement('div');
  panel.id = '__long_press_debug_panel';
  Object.assign(panel.style, {
    position: 'fixed',
    left: '0',
    right: '0',
    bottom: '0',
    maxHeight: '40vh',
    background: 'rgba(0,0,0,0.85)',
    color: '#0f0',
    fontFamily: 'monospace',
    fontSize: '12px',
    zIndex: '99999',
    overflow: 'auto',
    padding: '6px 8px',
    display: 'none',
    whiteSpace: 'pre-wrap',
  } as CSSStyleDeclaration);
  document.body.appendChild(panel);

  const logs: string[] = [];
  function pushLog(line: string) {
    logs.push(line);
    if (logs.length > maxLines) logs.shift();
    panel.textContent = logs.join('\n');
  }

  const origConsoleLog = console.log.bind(console);
  console.log = (...args: any[]) => {
    origConsoleLog(...args);
    try { pushLog('[LOG] ' + args.map(a => stringify(a)).join(' ')); } catch {}
  };
  const origConsoleWarn = console.warn.bind(console);
  console.warn = (...args: any[]) => {
    origConsoleWarn(...args);
    try { pushLog('[WARN] ' + args.map(a => stringify(a)).join(' ')); } catch {}
  };
  const origConsoleError = console.error.bind(console);
  console.error = (...args: any[]) => {
    origConsoleError(...args);
    try { pushLog('[ERR] ' + args.map(a => stringify(a)).join(' ')); } catch {}
  };

  function stringify(v: any) {
    try {
      if (typeof v === 'string') return v;
      return typeof v === 'object' ? JSON.stringify(v, getCircularReplacer(), 2) : String(v);
    } catch (e) {
      return String(v);
    }
  }
  function getCircularReplacer() {
    const seen = new WeakSet();
    return (_: any, val: any) => {
      if (val !== null && typeof val === 'object') {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      return val;
    };
  }

  let timer: number | null = null;
  let startX = 0, startY = 0;
  const maxMove = maxMovePx;

  function onPressStart(e: TouchEvent | MouseEvent) {
    const pt = 'touches' in e && e.touches.length ? e.touches[0] : (e as MouseEvent);
    startX = (pt as any).clientX || 0;
    startY = (pt as any).clientY || 0;
    timer = window.setTimeout(() => {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      pushLog(`[DEBUG] longPress toggled panel (${new Date().toISOString()})`);
    }, longPressMs);
  }
  function onPressMove(e: TouchEvent | MouseEvent) {
    const pt = 'touches' in e && e.touches.length ? e.touches[0] : (e as MouseEvent);
    const dx = Math.abs((pt as any).clientX - startX);
    const dy = Math.abs((pt as any).clientY - startY);
    if (dx > maxMove || dy > maxMove) {
      if (timer) { clearTimeout(timer); timer = null; }
    }
  }
  function onPressEnd() {
    if (timer) { clearTimeout(timer); timer = null; }
  }

  document.addEventListener('touchstart', onPressStart, { passive: true });
  document.addEventListener('touchmove', onPressMove, { passive: true });
  document.addEventListener('touchend', onPressEnd, { passive: true });
  document.addEventListener('mousedown', onPressStart);
  document.addEventListener('mousemove', onPressMove);
  document.addEventListener('mouseup', onPressEnd);

  const btn = document.createElement('button');
  btn.textContent = '日志';
  Object.assign(btn.style, {
    position: 'fixed',
    right: '8px',
    bottom: '8px',
    zIndex: '100000',
    background: '#0b0',
    color: '#000',
    border: 'none',
    padding: '6px 8px',
    borderRadius: '6px',
    fontWeight: '700',
    cursor: 'pointer',
  } as CSSStyleDeclaration);
  btn.onclick = () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  };
  document.body.appendChild(btn);

  pushLog(`[DEBUG] longPressDebug installed — longPressMs=${longPressMs}`);
}
