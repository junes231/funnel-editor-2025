import React from 'react';
import ReactDOM from 'react-dom';
// 确保 DebugReport.tsx 和其 CSS 文件存在于 src/components/ 目录下
import DebugReport, { AnalysisReport, ReportFinding } from '../components/DebugReport.tsx';

// 核心修复：将所有逻辑包裹在一个函数中，而不是立即执行
function initializeDebugger() {
  if ((window as any).__lp_debug_installed) return;
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
  const toggleBtn = document.createElement('button');
  toggleBtn.id = '__lp_debug_toggle';
  toggleBtn.textContent = 'Debug';
  document.body.appendChild(toggleBtn);
  toggleBtn.onclick = () => container.style.display = container.style.display === 'none' ? 'flex' : 'none';
  // ... (rest of core logic)
  
  // --- MODULES ---
  // ... (Console, Network, Smart Analysis modules as in the previous complete version)
  console.log('[longPressDebug] Ultimate debugger installed and ready.');
}

// 核心修复：导出一个函数，而不是立即执行代码
export function installLongPressDebug(options: { enable?: boolean } = {}) {
  const { enable = (typeof window !== 'undefined' && window.location.search.includes('debug=1')) } = options;

  if (!enable) return;

  // 关键修复：监听 DOMContentLoaded 事件
  // 这可以确保我们的代码只在页面 HTML 完全加载和解析完成后运行
  if (document.readyState === 'loading') {
    // 如果页面还在加载中，就添加一个事件监听器
    document.addEventListener('DOMContentLoaded', initializeDebugger);
  } else {
    // 如果页面已经加载完毕，就直接运行
    initializeDebugger();
  }
}
