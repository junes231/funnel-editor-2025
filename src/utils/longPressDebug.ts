// longPressDebug with input console
// Usage: import { installLongPressDebug } from './utils/longPressDebug';
// Enable via options or ?debug=1 in URL.

export interface LongPressDebugOptions {
  enable?: boolean;
  longPressMs?: number;
  maxMovePx?: number;
  maxMultiTouch?: number;
  maxLines?: number;
}

export function installLongPressDebug(options: LongPressDebugOptions = {}) {
  const {
    enable = (typeof window !== 'undefined' && window.location.search.indexOf('debug=1') !== -1) || false,
    longPressMs = 2000,
    maxMovePx = 20,
    maxMultiTouch = 1,
    maxLines = 400,
  } = options as any;

  if (!enable) return;
  if (typeof window === 'undefined') return;
  if ((window as any).__lp_debug_installed) return;
  (window as any).__lp_debug_installed = true;

  // Create container
  const container = document.createElement('div');
  container.id = '__lp_debug_container';
  Object.assign(container.style, {
    position: 'fixed',
    left: '0',
    right: '0',
    bottom: '0',
    maxHeight: '50vh',
    background: 'rgba(0,0,0,0.9)',
    color: '#0f0',
    fontFamily: 'monospace',
    fontSize: '12px',
    zIndex: '99999',
    overflow: 'hidden',
    display: 'none',
    boxSizing: 'border-box',
  } as CSSStyleDeclaration);
  document.body.appendChild(container);

  // Controls (input area + buttons)
  const controls = document.createElement('div');
  Object.assign(controls.style, {
    display: 'flex',
    gap: '8px',
    padding: '6px',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.95)',
  } as CSSStyleDeclaration);
  container.appendChild(controls);

  const textarea = document.createElement('textarea');
  textarea.placeholder = '在这里粘贴或编写要执行的 JS（支持 async/await）。按 Ctrl/Cmd+Enter 执行。';
  Object.assign(textarea.style, {
    flex: '1 1 auto',
    minHeight: '56px',
    maxHeight: '120px',
    resize: 'vertical',
    background: '#071316',
    color: '#b7f59a',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '6px',
    fontFamily: 'monospace',
    fontSize: '12px',
    borderRadius: '6px',
  } as CSSStyleDeclaration);
  controls.appendChild(textarea);

  const btnRun = document.createElement('button');
  btnRun.textContent = 'Run';
  Object.assign(btnRun.style, {
    padding: '6px 10px',
    background: '#1e90ff',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  } as CSSStyleDeclaration);
  controls.appendChild(btnRun);

  const btnClear = document.createElement('button');
  btnClear.textContent = 'Clear';
  Object.assign(btnClear.style, {
    padding: '6px 10px',
    background: '#666',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  } as CSSStyleDeclaration);
  controls.appendChild(btnClear);

  const btnExport = document.createElement('button');
  btnExport.textContent = 'Export';
  Object.assign(btnExport.style, {
    padding: '6px 10px',
    background: '#0b0',
    color: '#000',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  } as CSSStyleDeclaration);
  controls.appendChild(btnExport);

  const logsPanel = document.createElement('div');
  Object.assign(logsPanel.style, {
    padding: '8px',
    height: 'calc(50vh - 120px)',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    background: 'rgba(0,0,0,0.85)',
    color: '#8ff28f',
  } as CSSStyleDeclaration);
  container.appendChild(logsPanel);

  // Visible small toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = '日志';
  Object.assign(toggleBtn.style, {
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
  document.body.appendChild(toggleBtn);

  toggleBtn.onclick = () => {
    container.style.display = container.style.display === 'none' ? 'block' : 'none';
    if (container.style.display === 'block') {
      textarea.focus();
    }
  };

  // Log handling
  const logs: string[] = [];
  function pushLog(line: string) {
    logs.push(line);
    if (logs.length > maxLines) logs.shift();
    logsPanel.textContent = logs.join('\n');
    logsPanel.scrollTop = logsPanel.scrollHeight;
  }

  // Hook console
  const origLog = console.log.bind(console);
  console.log = (...args: any[]) => {
    origLog(...args);
    try { pushLog('[LOG] ' + args.map(stringify).join(' ')); } catch {}
  };
  const origWarn = console.warn.bind(console);
  console.warn = (...args: any[]) => {
    origWarn(...args);
    try { pushLog('[WARN] ' + args.map(stringify).join(' ')); } catch {}
  };
  const origError = console.error.bind(console);
  console.error = (...args: any[]) => {
    origError(...args);
    try { pushLog('[ERR] ' + args.map(stringify).join(' ')); } catch {}
  };

  function stringify(v: any) {
    try {
      if (typeof v === 'string') return v;
      return typeof v === 'object' ? JSON.stringify(v, getCircularReplacer(), 2) : String(v);
    } catch {
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

  // Exec history
  const history: string[] = [];
  let historyIndex = -1;

  textarea.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    if ((isMac ? e.metaKey : e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      runCode(textarea.value);
    } else if (e.key === 'ArrowUp' && (e.ctrlKey || e.metaKey)) {
      // recall history
      if (history.length > 0) {
        historyIndex = Math.max(0, (historyIndex === -1 ? history.length : historyIndex) - 1);
        textarea.value = history[historyIndex] || '';
      }
    } else if (e.key === 'ArrowDown' && (e.ctrlKey || e.metaKey)) {
      if (history.length > 0) {
        if (historyIndex === -1) historyIndex = history.length;
        historyIndex = Math.min(history.length - 1, historyIndex + 1);
        textarea.value = history[historyIndex] || '';
      }
    }
  });

  btnRun.onclick = () => runCode(textarea.value);
  btnClear.onclick = () => { logs.length = 0; logsPanel.textContent = ''; };
  btnExport.onclick = () => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lp-debug-log.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Run user code in global scope, support async
  async function runCode(code: string) {
    if (!code || !code.trim()) {
      pushLog('[EXEC] empty code');
      return;
    }
    history.push(code);
    historyIndex = -1;
    pushLog('[EXEC] ' + (code.split('\n')[0] || '').slice(0, 300));
    try {
      // Run inside an async IIFE in global scope
      const fn = new Function('return (async function(){' + code + '})()');
      const res = await fn();
      pushLog('[EXEC-RES] ' + stringify(res));
    } catch (err) {
      pushLog('[EXEC-ERR] ' + stringify(err));
    }
  }

  // long press detection to toggle panel
  let timer: number | null = null;
  let startX = 0, startY = 0;
  const maxMove = maxMovePx;
  function onPressStart(e: TouchEvent | MouseEvent) {
    const pt = ('touches' in e && (e as TouchEvent).touches.length) ? (e as TouchEvent).touches[0] : (e as MouseEvent);
    startX = (pt as any).clientX || 0;
    startY = (pt as any).clientY || 0;
    timer = window.setTimeout(() => {
      container.style.display = container.style.display === 'none' ? 'block' : 'none';
      if (container.style.display === 'block') textarea.focus();
      pushLog(`[DEBUG] longPress toggled panel (${new Date().toISOString()})`);
    }, longPressMs);
  }
  function onPressMove(e: TouchEvent | MouseEvent) {
    const pt = ('touches' in e && (e as TouchEvent).touches.length) ? (e as TouchEvent).touches[0] : (e as MouseEvent);
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

  // initial log
  pushLog(`[DEBUG] longPressDebug installed — longPressMs=${longPressMs}`);
}
