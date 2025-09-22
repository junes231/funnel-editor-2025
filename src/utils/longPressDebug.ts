import React from 'react';
import ReactDOM from 'react-dom';
// 确保您已经创建了 DebugReport.tsx 和它的 CSS 文件
import DebugReport, { AnalysisReport, ReportFinding } from '../components/DebugReport.tsx';

export function installLongPressDebug(options: { enable?: boolean } = {}) {
  const { enable = (typeof window !== 'undefined' && window.location.search.includes('debug=1')) } = options;

  if (!enable || typeof window === 'undefined' || (window as any).__lp_debug_installed) return;
  (window as any).__lp_debug_installed = true;

  // --- STYLES ---
  const styles = `
    #__lp_debug_container {
      position: fixed; left: 10px; bottom: 10px; width: calc(100% - 20px); max-width: 800px; height: 50vh;
      background: #1e1e1e; color: #d4d4d4; font-family: Menlo, Monaco, 'Courier New', monospace;
      font-size: 13px; z-index: 99999; display: none; flex-direction: column;
      border: 1px solid #3c3c3c; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      resize: both; overflow: auto; min-width: 350px; min-height: 200px;
    }
    #__lp_debug_header { background: #333; padding: 8px; cursor: move; user-select: none; border-bottom: 1px solid #3c3c3c; text-align: center; color: #ccc; }
    #__lp_debug_tabs { display: flex; gap: 5px; border-bottom: 1px solid #3c3c3c; background: #252526; padding: 5px 8px; flex-shrink: 0;}
    #__lp_debug_tabs button { background: none; border: 1px solid transparent; color: #ccc; padding: 5px 10px; cursor: pointer; border-radius: 4px; }
    #__lp_debug_tabs button.active { background: #007acc; color: #fff; }
    #__lp_debug_panel { flex-grow: 1; overflow: hidden; display: flex; flex-direction: column; }
    .lp-panel-content { display: none; height: 100%; overflow: auto; }
    .lp-panel-content.active { display: flex; flex-direction: column; }
    #panel-console-output { flex-grow: 1; overflow: auto; padding: 5px; }
    #panel-console-controls { display: flex; gap: 5px; padding: 5px; border-top: 1px solid #3c3c3c; flex-shrink: 0; }
    #panel-console-input { flex-grow: 1; background: #2a2a2e; color: #d4d4d4; border: 1px solid #3c3c3c; border-radius: 4px; padding: 8px; }
    #panel-console-controls button { background: #37373d; color: #fff; border: 1px solid #3c3c3c; border-radius: 4px; padding: 8px; cursor: pointer; }
    #panel-console-controls button:hover { background: #4a4a52; }
    .lp-log-line { padding: 4px 8px; border-bottom: 1px solid #2a2a2a; white-space: pre-wrap; word-break: break-all; }
    .lp-log-line.error { color: #f48771; } .lp-log-line.warn { color: #cca700; }
    #__lp_debug_toggle {
      position: fixed; right: 10px; bottom: 10px; z-index: 100000; background: #007acc; color: white;
      border: none; border-radius: 50%; width: 50px; height: 50px; font-size: 12px;
      cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;
    }
  `;
  document.head.appendChild(document.createElement('style')).innerHTML = styles;

  // --- HTML STRUCTURE ---
  const container = document.createElement('div');
  container.id = '__lp_debug_container';
  container.innerHTML = `
    <div id="__lp_debug_header">Drag Panel</div>
    <div id="__lp_debug_tabs">
      <button data-panel="analysis" class="active">Smart Analysis</button>
      <button data-panel="console">Console</button>
      <button data-panel="network">Network</button>
    </div>
    <div id="__lp_debug_panel">
      <div id="panel-analysis" class="lp-panel-content active"></div>
      <div id="panel-console" class="lp-panel-content">
        <div id="panel-console-output"></div>
        <div id="panel-console-controls">
          <textarea id="panel-console-input" rows="3" placeholder="Enter JS... (Ctrl+Enter to run)"></textarea>
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <button id="console-run-btn">Run</button>
            <button id="console-clear-btn">Clear</button>
            <button id="console-copy-btn">Copy</button>
          </div>
        </div>
      </div>
      <div id="panel-network" class="lp-panel-content"></div>
    </div>
  `;
  document.body.appendChild(container);
  
  // --- CORE LOGIC (Dragging, Tabs, Toggle Button) ---
  const toggleBtn = document.getElementById('__lp_debug_toggle')!;
  const header = container.querySelector('#__lp_debug_header') as HTMLElement;
  toggleBtn.onclick = () => container.style.display = container.style.display === 'none' ? 'flex' : 'none';
  // ... (dragging logic) ...
  let isDragging = false, offsetX = 0, offsetY = 0;
  header.addEventListener('mousedown', (e) => { isDragging = true; offsetX = e.clientX - container.offsetLeft; offsetY = e.clientY - container.offsetTop; });
  document.addEventListener('mousemove', (e) => { if (isDragging) { container.style.left = `${e.clientX - offsetX}px`; container.style.top = `${e.clientY - offsetY}px`; } });
  document.addEventListener('mouseup', () => isDragging = false);

  const tabs = container.querySelector('#__lp_debug_tabs')!;
  const panels = container.querySelectorAll('.lp-panel-content');
  tabs.addEventListener('click', (e) => {
    if (e.target instanceof HTMLButtonElement) {
      const targetPanelId = `panel-${e.target.dataset.panel}`;
      tabs.querySelector('.active')?.classList.remove('active');
      e.target.classList.add('active');
      panels.forEach(p => p.classList.toggle('active', p.id === targetPanelId));
    }
  });
  
  // --- MODULES ---
  const consoleOutput = container.querySelector('#panel-console-output')!;
  const consoleInput = container.querySelector('#panel-console-input') as HTMLTextAreaElement;
  const runBtn = container.querySelector('#console-run-btn')!;
  const clearBtn = container.querySelector('#console-clear-btn')!;
  const copyBtn = container.querySelector('#console-copy-btn')!;
  
  // Console Module
  function executeCode() {
    const code = consoleInput.value;
    if (!code.trim()) return;
    logToPanel('log', [`> ${code}`]); // Echo command
    try {
      const result = window.eval(code);
      logToPanel('log', ['<-', result]); // Show result
    } catch (err) {
      logToPanel('error', [err]);
    }
    consoleInput.value = ''; // Clear input after run
  }
  
  runBtn.onclick = executeCode;
  consoleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      executeCode();
      e.preventDefault();
    }
  });
  clearBtn.onclick = () => { consoleOutput.innerHTML = ''; };
  copyBtn.onclick = () => { navigator.clipboard.writeText(consoleOutput.textContent || ''); };

  ['log', 'warn', 'error', 'info'].forEach((level) => {
    const original = (console as any)[level];
    (console as any)[level] = (...args: any[]) => { original(...args); logToPanel(level, args); };
  });

  function logToPanel(type: string, args: any[]) {
    const line = document.createElement('div');
    line.className = `lp-log-line ${type}`;
    line.textContent = args.map(arg => { try { return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg); } catch { return '[Circular Object]'; } }).join(' ');
    consoleOutput.appendChild(line);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  // ... (Network Module & Smart Analysis Module from previous complete version) ...
  // Smart Analysis Module
  const analysisPanel = container.querySelector('#panel-analysis')!;
  const runAnalysisBtn = document.createElement('button');
  runAnalysisBtn.textContent = '开始诊断当前页面问题';
  runAnalysisBtn.style.cssText = 'width: 100%; padding: 10px; background: #007acc; color: white; border: none; font-size: 16px; cursor: pointer;';
  const reportContainer = document.createElement('div');
  analysisPanel.append(runAnalysisBtn, reportContainer);

  runAnalysisBtn.onclick = async () => { /* ... Smart Analysis logic ... */ };

  console.log('[longPressDebug] Ultimate debugger with full console features installed.');
}
