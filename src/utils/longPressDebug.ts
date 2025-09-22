import React from 'react';
import ReactDOM from 'react-dom';
import DebugReport, { AnalysisReport } from '../components/DebugReport.tsx';

let capturedFatalError: ReportFinding | null = null;
window.onerror = function(message, source, lineno, colno, error) {
  // 忽略一些不重要的、由浏览器插件等引起的错误
  if (typeof message === 'string' && message.includes('ResizeObserver loop')) {
    return;
  }
  
  capturedFatalError = {
    status: 'error',
    description: '捕获到导致应用崩溃的致命错误 (Fatal Error)！',
    details: `Message: ${message}\nSource: ${source}\nLine: ${lineno}, Column: ${colno}`
  };
  // 可以在这里也打印到原生 console，以防万一
  console.log('>>> FATAL ERROR CAPTURED:', capturedFatalError);
  return true; // 返回 true 可以阻止浏览器默认的错误处理
};
function initializeDebugger() {
  if ((window as any).__lp_debug_installed) return;
  (window as any).__lp_debug_installed = true;

  const styles = `
    #__lp_debug_container {
      position: fixed; left: 0; bottom: 0; width: 100%; height: 50vh;
      background: #1e1e1e; color: #d4d4d4; font-family: Menlo, Monaco, 'Courier New', monospace;
      font-size: 14px; z-index: 99999; display: none; flex-direction: column;
      border-top: 1px solid #3c3c3c; box-shadow: 0 -5px 20px rgba(0,0,0,0.3);
      box-sizing: border-box;
    }
    #__lp_debug_header { background: #333; padding: 10px; cursor: move; user-select: none; border-bottom: 1px solid #3c3c3c; text-align: center; color: #ccc; font-weight: bold; flex-shrink: 0; }
    #__lp_debug_tabs { display: flex; gap: 5px; border-bottom: 1px solid #3c3c3c; background: #252526; padding: 5px 8px; flex-shrink: 0; overflow-x: auto; }
    #__lp_debug_tabs button { background: none; border: 1px solid transparent; color: #ccc; padding: 5px 10px; cursor: pointer; border-radius: 4px; font-size: 13px; white-space: nowrap; }
    #__lp_debug_tabs button.active { background: #007acc; color: #fff; }
    #__lp_debug_panel { flex-grow: 1; overflow: hidden; }
    .lp-panel-content { display: none; height: 100%; overflow: auto; }
    .lp-panel-content.active { display: block; }
    #panel-console.active { display: flex; flex-direction: column; }
    #panel-console-output { flex-grow: 1; overflow-y: auto; padding: 8px; }
    .lp-log-line { padding: 4px 0; border-bottom: 1px solid #2a2a2a; white-space: pre-wrap; word-break: break-all; }
    .lp-log-line.error { color: #f48771; } .lp-log-line.warn { color: #cca700; }
    #__lp_debug_toggle {
      position: fixed; right: 10px; bottom: 65px;
      z-index: 100000; background: #007acc; color: white; border: none;
      border-radius: 50%; width: 50px; height: 50px; font-size: 12px;
      cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;
    }
    #panel-console-controls {
      display: flex; flex-direction: column; gap: 8px;
      padding: 8px; border-top: 1px solid #3c3c3c;
      background: #252526; flex-shrink: 0;
    }
    #panel-console-input {
      background: #2a2a2e; color: #d4d4d4; border: 1px solid #3c3c3c;
      border-radius: 4px; padding: 8px; font-family: inherit; font-size: inherit; resize: vertical;
      min-height: 40px; box-sizing: border-box; width: 100%;
    }
    #panel-console-buttons {
      display: flex; flex-direction: row; gap: 8px;
      justify-content: flex-end;
    }
    #panel-console-buttons button {
      background: #37373d; color: #fff; border: 1px solid #3c3c3c; border-radius: 4px;
      padding: 8px 12px; cursor: pointer; font-size: 12px;
    }
    #panel-console-buttons button:active { background: #4a4a52; }
    #console-run-btn { background-color: #007acc; }
  `;
  document.head.appendChild(document.createElement('style')).innerHTML = styles;

  const container = document.createElement('div');
  container.id = '__lp_debug_container';
  container.innerHTML = `
    <div id="__lp_debug_header">Debug Panel</div>
    <div id="__lp_debug_tabs">
      <button data-panel="analysis" class="active">Smart Analysis</button>
      <button data-panel="console">Console</button>
    </div>
    <div id="__lp_debug_panel">
      <div id="panel-analysis" class="lp-panel-content active"></div>
      <div id="panel-console" class="lp-panel-content">
        <div id="panel-console-output"></div>
        <div id="panel-console-controls">
          <textarea id="panel-console-input" rows="3" placeholder="Enter JS... (Ctrl+Enter)"></textarea>
          <div id="panel-console-buttons">
            <button id="console-copy-btn">Copy</button>
            <button id="console-clear-btn">Clear</button>
            <button id="console-run-btn">Run</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  const toggleBtn = document.createElement('button');
  toggleBtn.id = '__lp_debug_toggle';
  toggleBtn.textContent = 'Debug';
  document.body.appendChild(toggleBtn);
  toggleBtn.onclick = () => { container.style.display = container.style.display === 'none' ? 'flex' : 'none'; };

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

  const consoleOutput = container.querySelector('#panel-console-output')!;
  const consoleInput = container.querySelector('#panel-console-input') as HTMLTextAreaElement;
  const runBtn = container.querySelector('#console-run-btn')!;
  const clearBtn = container.querySelector('#console-clear-btn')!;
  const copyBtn = container.querySelector('#console-copy-btn')!;

  function executeCode() {
    const code = consoleInput.value;
    if (!code.trim()) return;
    logToPanel('log', [`> ${code}`]);
    try {
      const result = window.eval(code);
      logToPanel('log', ['<-', result]);
    } catch (err) {
      logToPanel('error', [err]);
    }
    consoleInput.value = '';
  }

  runBtn.addEventListener('click', executeCode);
  clearBtn.addEventListener('click', () => { consoleOutput.innerHTML = ''; });
  copyBtn.addEventListener('click', () => { navigator.clipboard.writeText(consoleOutput.textContent || ''); });
  consoleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { executeCode(); e.preventDefault(); } });

  function logToPanel(type: string, args: any[]) {
    const line = document.createElement('div');
    line.className = `lp-log-line ${type}`;
    line.textContent = args.map(arg => { try { return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg); } catch { return '[Circular Object]'; } }).join(' ');
    consoleOutput.appendChild(line);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  ['log', 'warn', 'error', 'info'].forEach((level) => {
    const original = (console as any)[level];
    (console as any)[level] = (...args: any[]) => { original(...args); logToPanel(level, args); };
  });

   const analysisPanel = container.querySelector('#panel-analysis')!;
  const runAnalysisBtn = document.createElement('button');
  runAnalysisBtn.textContent = '开始诊断当前页面问题';
  runAnalysisBtn.style.cssText = 'width: 100%; padding: 10px; background: #007acc; color: white; border: none; font-size: 16px; cursor: pointer;';
  const reportContainer = document.createElement('div');
  analysisPanel.append(runAnalysisBtn, reportContainer);

  runAnalysisBtn.onclick = async () => {
    ReactDOM.render(React.createElement(DebugReport, { report: null }), reportContainer);
    runAnalysisBtn.textContent = '正在分析...'; runAnalysisBtn.disabled = true;
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // --- 核心升级：调用新的分析函数 ---
    const report = await analyzeCurrentStateWithFatalErrorCheck();
    
    ReactDOM.render(React.createElement(DebugReport, { report }), reportContainer);
    runAnalysisBtn.textContent = '重新诊断'; runAnalysisBtn.disabled = false;
  };

  async function analyzeCurrentStateWithFatalErrorCheck(): Promise<AnalysisReport> {
    let findings: ReportFinding[] = [];
    let potentialCauses: string[] = [];
    let suggestedActions: string[] = [];

    // --- 核心升级：优先检查捕获到的致命错误 ---
    if (capturedFatalError) {
      findings.push(capturedFatalError);
      potentialCauses.push('代码中存在一个未被处理的 bug，导致了整个应用的崩溃。');
      suggestedActions.push('请仔细检查上述错误信息中提到的文件和行号，定位并修复该 bug。', '如果出错文件是 `bundle.js` 或 `main.chunk.js` 等打包后的文件，请检查您的项目构建过程是否正常。');
    } else {
      // 如果没有致命错误，再执行常规检查
      findings.push({ status: 'info', description: '未捕获到任何导致应用崩溃的致命错误。' });
      const rootEl = document.getElementById('root');
      if (rootEl && rootEl.innerHTML.trim() !== '') {
        findings.push({ status: 'ok', description: 'React 应用已成功挂载到 #root 节点。' });
        potentialCauses.push('页面看起来是空白的，但 React 已成功渲染。问题可能出在 CSS 样式、数据未加载或组件逻辑上。');
        suggestedActions.push('请检查相关组件的 CSS，确保元素没有被隐藏（如 `display: none` 或 `opacity: 0`）。', '在相关组件的 `useEffect` 中添加 `console.log`，检查数据是否成功获取。');
      } else {
        findings.push({ status: 'warning', description: 'React 应用未能渲染到 #root 节点，但没有捕获到致命错误。' });
        potentialCauses.push('可能存在异步加载问题或 React 初始化逻辑错误。');
        suggestedActions.push('请检查您的 `src/index.tsx` 文件，确保 `ReactDOM.render` 或 `root.render` 被正确调用。');
      }
    }

    return {
      title: '综合诊断报告 (含错误捕获)',
      findings,
      potentialCauses: [...new Set(potentialCauses)],
      suggestedActions: [...new Set(suggestedActions)],
    };
  }
}

// 导出函数，确保在 DOMContentLoaded 后执行
export function installLongPressDebug(options: { enable?: boolean } = {}) {
  const { enable = (typeof window !== 'undefined' && window.location.search.includes('debug=1')) } = options;
  if (!enable) return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDebugger);
  } else {
    initializeDebugger();
  }
}
