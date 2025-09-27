import React from 'react';
import ReactDOM from 'react-dom';
// 确保 DebugReport.tsx 和其 CSS 文件存在于 src/components/ 目录下
import DebugReport, { AnalysisReport, ReportFinding } from '../components/DebugReport.tsx';

// --- 模块 1: 全局致命错误捕获 ---
// 这个模块会捕获导致整个应用崩溃的错误，是智能分析的核心数据来源。
let capturedFatalError: ReportFinding | null = null;
window.onerror = function(message, source, lineno, colno, error) {
  // 忽略一些由浏览器插件等引起的、与应用本身无关的常见错误
  if (typeof message === 'string' && message.includes('ResizeObserver loop')) {
    return;
  }
  
  capturedFatalError = {
    status: 'error',
    description: '捕获到导致应用崩溃的致命错误 (Fatal Error)！',
    details: `Message: ${message}\nSource: ${source}\nLine: ${lineno}, Column: ${colno}`
  };
  // 也在原生控制台打印，以防万一
  console.log('>>> FATAL ERROR CAPTURED:', capturedFatalError);
  return true; // 阻止浏览器默认的错误处理（即在控制台显示红色错误）
};

// --- 模块 2: 调试器核心初始化函数 ---
// 这个函数负责创建调试器的所有界面和功能
function initializeDebugger() {
  if ((window as any).__lp_debug_installed) return;
  (window as any).__lp_debug_installed = true;

  // 1. 注入样式 (Inject Styles)
  const styles = `
    #__lp_debug_container {
      position: fixed; left: 0; bottom: 0; width: 100%; height: 50vh;
      background: #1e1e1e; color: #d4d4d4; font-family: Menlo, Monaco, 'Courier New', monospace;
      font-size: 14px; z-index: 99999; display: none; flex-direction: column;
      border-top: 1px solid #3c3c3c; box-shadow: 0 -5px 20px rgba(0,0,0,0.3);
      box-sizing: border-box; resize: vertical; overflow: auto;
    }
    #__lp_debug_header { background: #333; padding: 10px; cursor: ns-resize; user-select: none; border-bottom: 1px solid #3c3c3c; text-align: center; color: #ccc; font-weight: bold; flex-shrink: 0; }
    #__lp_debug_tabs { display: flex; gap: 5px; border-bottom: 1px solid #3c3c3c; background: #252526; padding: 5px 8px; flex-shrink: 0; overflow-x: auto; }
    #__lp_debug_tabs button { background: none; border: 1px solid transparent; color: #ccc; padding: 5px 10px; cursor: pointer; border-radius: 4px; font-size: 13px; white-space: nowrap; }
    #__lp_debug_tabs button.active { background: #007acc; color: #fff; }
    #__lp_debug_panel { flex-grow: 1; overflow: hidden; }
    .lp-panel-content { display: none; height: 100%; overflow: auto; }
    .lp-panel-content.active { display: block; }
    #panel-console.active { display: flex; flex-direction: column; }
    #panel-console-output, #panel-network { padding: 8px; }
    .lp-log-line { padding: 4px 0; border-bottom: 1px solid #2a2a2a; white-space: pre-wrap; word-break: break-all; }
    .lp-log-line.error { color: #f48771; } .lp-log-line.warn { color: #cca700; }
    #panel-console-controls { display: flex; flex-direction: column; gap: 8px; padding: 8px; border-top: 1px solid #3c3c3c; background: #252526; flex-shrink: 0; }
    #panel-console-input { background: #2a2a2e; color: #d4d4d4; border: 1px solid #3c3c3c; border-radius: 4px; padding: 8px; font-family: inherit; font-size: inherit; resize: vertical; min-height: 40px; box-sizing: border-box; width: 100%; }
    #panel-console-buttons { display: flex; flex-direction: row; gap: 8px; justify-content: flex-end; }
    #panel-console-buttons button { background: #37373d; color: #fff; border: 1px solid #3c3c3c; border-radius: 4px; padding: 8px 12px; cursor: pointer; font-size: 12px; }
    #panel-console-buttons button:active { background: #4a4a52; }
    #console-run-btn { background-color: #007acc; }
    #__lp_debug_toggle {
      position: fixed; right: -10px; bottom: 65px; z-index: 100000; background: #007acc; color: white;
      border: none; border-radius: 50%; width: 56px; height: 50px; font-size: 12px;
      cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;
    }
  `;
  document.head.appendChild(document.createElement('style')).innerHTML = styles;

  // 2. 创建 DOM 结构 (Create DOM Structure)
  const container = document.createElement('div');
  container.id = '__lp_debug_container';
  container.innerHTML = `
    <div id="__lp_debug_header">Debug Panel (Drag to Resize)</div>
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
          <textarea id="panel-console-input" rows="3" placeholder="Enter JS... (Ctrl+Enter)"></textarea>
          <div id="panel-console-buttons">
            <button id="console-copy-btn">Copy</button>
            <button id="console-clear-btn">Clear</button>
            <button id="console-run-btn">Run</button>
          </div>
        </div>
      </div>
      <div id="panel-network" class="lp-panel-content"></div>
    </div>
  `;
  document.body.appendChild(container);

  const toggleBtn = document.createElement('button');
  toggleBtn.id = '__lp_debug_toggle';
  toggleBtn.textContent = 'Debug';
  document.body.appendChild(toggleBtn);
  
  // 3. 绑定核心交互 (Bind Core Interactions)
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

  // --- 模块 3: 控制台模块 (Console Module) ---
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

  // --- 模块 4: 网络监视器模块 (Network Module) ---
  const networkPanel = container.querySelector('#panel-network')!;
  const capturedRequests: any[] = [];
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const requestInfo = { url: args[0].toString(), method: (args[1]?.method || 'GET'), status: 0, startTime: Date.now(), duration: 0, responseText: '' };
    capturedRequests.unshift(requestInfo);
    renderNetworkPanel();
    
    const promise = originalFetch(...args);
    promise.then(async res => {
      requestInfo.status = res.status;
      const resClone = res.clone();
      requestInfo.responseText = await resClone.text().catch(() => '[Response could not be read]');
    }).catch(err => {
      requestInfo.status = -1; // Indicate network error
      requestInfo.responseText = err.message;
    }).finally(() => {
      requestInfo.duration = Date.now() - requestInfo.startTime;
      renderNetworkPanel();
    });
    return promise;
  };
  function renderNetworkPanel() {
    networkPanel.innerHTML = capturedRequests.map(r => 
      `<div class="lp-log-line ${r.status === -1 || r.status >= 400 ? 'error' : ''}">[${r.status || '...'} | ${r.method}] ${r.url} (${r.duration}ms)</div>`
    ).join('');
  }
  
  // --- 模块 5: 智能分析模块 (Smart Analysis Module) ---
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
    const report = await analyzeCurrentState();
    ReactDOM.render(React.createElement(DebugReport, { report }), reportContainer);
    runAnalysisBtn.textContent = '重新诊断'; runAnalysisBtn.disabled = false;
  };

  async function analyzeCurrentState(): Promise<AnalysisReport> {
    let findings: ReportFinding[] = [];
    if (capturedFatalError) {
      findings.push(capturedFatalError);
    } else {
      findings.push({ status: 'info', description: '未捕获到任何导致应用崩溃的致命错误。' });
      const rootEl = document.getElementById('root');
      if (rootEl && rootEl.innerHTML.trim() !== '') {
        findings.push({ status: 'ok', description: 'React 应用已成功挂载到 #root 节点。' });
      } else {
        findings.push({ status: 'error', description: 'React 应用未能渲染到 #root 节点，这很可能是白屏的原因。' });
      }
    }
    
    const trackClickReq = capturedRequests.find(r => r.url.includes('api-track-click'));
    if (trackClickReq) {
      if (trackClickReq.status >= 200 && trackClickReq.status < 300) {
        findings.push({ status: 'ok', description: '已成功发送 "trackClick" 请求并收到成功响应。', details: `Status: ${trackClickReq.status}` });
      } else {
        findings.push({ status: 'error', description: '发送了 "trackClick" 请求，但服务器返回了错误。', details: `Status: ${trackClickReq.status}, Response: ${trackClickReq.responseText}`});
      }
    } else {
      findings.push({ status: 'warning', description: '在本次会话中，未检测到发送 "trackClick" 的网络请求。' });
    }

    return {
      title: '综合诊断报告',
      findings,
      potentialCauses: ['请根据上述[发现]中的红色或黄色项目，定位可能原因。'],
      suggestedActions: ['对于致命错误，请检查代码。对于网络错误，请检查后端日志。对于未发送请求，请检查前端点击事件逻辑。'],
    };
  }

  logToPanel('info', ['Ultimate Debugger Ready.']);
}

// --- 模块 6: 导出与安装 ---
// 这是我们工具的唯一入口，它确保所有操作都在页面准备好之后再执行。
export function installLongPressDebug(options: { enable?: boolean } = {}) {
  const { enable = (typeof window !== 'undefined' && window.location.search.includes('debug=1')) } = options;
  if (!enable) return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDebugger);
  } else {
    initializeDebugger();
  }
}
