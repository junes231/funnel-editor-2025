import React from 'react';
import ReactDOM from 'react-dom';
import DebugReport, { AnalysisReport, ReportFinding } from '../components/DebugReport';

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
    #__lp_debug_panel { flex-grow: 1; overflow: hidden; }
    .lp-panel-content { display: none; height: 100%; overflow: auto; }
    .lp-panel-content.active { display: block; }
    .lp-log-line { padding: 4px 8px; border-bottom: 1px solid #2a2a2a; white-space: pre-wrap; word-break: break-all; }
    .lp-log-line.error { color: #f48771; } .lp-log-line.warn { color: #cca700; }
    .lp-table { width: 100%; border-collapse: collapse; } .lp-table th, .lp-table td { padding: 4px 8px; border: 1px solid #3c3c3c; text-align: left; }
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
      <button data-panel="storage">Storage</button>
    </div>
    <div id="__lp_debug_panel">
      <div id="panel-analysis" class="lp-panel-content active"></div>
      <div id="panel-console" class="lp-panel-content"></div>
      <div id="panel-network" class="lp-panel-content"></div>
      <div id="panel-storage" class="lp-panel-content"></div>
    </div>
  `;
  document.body.appendChild(container);

  const toggleBtn = document.createElement('button');
  toggleBtn.id = '__lp_debug_toggle';
  toggleBtn.textContent = 'Debug';
  document.body.appendChild(toggleBtn);

  // --- CORE LOGIC ---
  toggleBtn.onclick = () => container.style.display = container.style.display === 'none' ? 'flex' : 'none';
  const header = container.querySelector('#__lp_debug_header') as HTMLElement;
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
      if (e.target.dataset.panel === 'storage') renderStorage();
    }
  });

  // --- MODULES ---
  const consolePanel = container.querySelector('#panel-console')!;
  const networkPanel = container.querySelector('#panel-network')!;
  const storagePanel = container.querySelector('#panel-storage')!;
  const analysisPanel = container.querySelector('#panel-analysis')!;
  
  // Console Module
  ['log', 'warn', 'error', 'info'].forEach((level) => {
    const original = (console as any)[level];
    (console as any)[level] = (...args: any[]) => { original(...args); logToPanel(level, args); };
  });
  function logToPanel(type: string, args: any[]) {
    const line = document.createElement('div');
    line.className = `lp-log-line ${type}`;
    line.textContent = args.map(arg => { try { return typeof arg === 'object' ? JSON.stringify(arg) : String(arg); } catch { return '[Object]'; } }).join(' ');
    consolePanel.appendChild(line);
  }

  // Network Module
  const capturedRequests: any[] = [];
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
      const request = { url: args[0].toString(), method: (args[1]?.method || 'GET'), status: 0, startTime: Date.now(), duration: 0, response: '' };
      capturedRequests.unshift(request);
      renderNetwork();
      const promise = originalFetch(...args);
      promise.then(async res => {
          request.status = res.status;
          request.duration = Date.now() - request.startTime;
          const resClone = res.clone();
          request.response = await resClone.text();
      }).catch(err => {
          request.status = -1; // Indicate error
          request.response = err.message;
      }).finally(renderNetwork);
      return promise;
  };
  function renderNetwork() {
      networkPanel.innerHTML = capturedRequests.map(r => 
          `<div class="lp-log-line ${r.status === -1 ? 'error' : ''}">
              [${r.status || '...'} | ${r.method}] ${r.url} (${r.duration}ms)
          </div>`
      ).join('');
  }

  // Storage Module
  function renderStorage() {
    storagePanel.innerHTML = '<h3>LocalStorage</h3>' + createStorageTable(localStorage) + '<h3>SessionStorage</h3>' + createStorageTable(sessionStorage);
  }
  function createStorageTable(storage: Storage) {
    let html = '<table class="lp-table"><tr><th>Key</th><th>Value</th></tr>';
    for(let i = 0; i < storage.length; i++) {
      const key = storage.key(i)!;
      html += `<tr><td>${key}</td><td>${storage.getItem(key)}</td></tr>`;
    }
    return html + '</table>';
  }

  // --- SMART ANALYSIS MODULE ---
  const runAnalysisBtn = document.createElement('button');
  runAnalysisBtn.textContent = '开始诊断当前页面问题';
  runAnalysisBtn.style.cssText = 'width: 100%; padding: 10px; background: #007acc; color: white; border: none; font-size: 16px; cursor: pointer;';
  const reportContainer = document.createElement('div');
  analysisPanel.append(runAnalysisBtn, reportContainer);

  runAnalysisBtn.onclick = async () => {
    ReactDOM.render(React.createElement(DebugReport, { report: null }), reportContainer);
    runAnalysisBtn.textContent = '正在分析...';
    runAnalysisBtn.disabled = true;

    const report = await analyzeCurrentState();
    
    ReactDOM.render(React.createElement(DebugReport, { report }), reportContainer);
    runAnalysisBtn.textContent = '重新诊断';
    runAnalysisBtn.disabled = false;
  };
  
  async function analyzeCurrentState(): Promise<AnalysisReport> {
      let findings: ReportFinding[] = [];
      let potentialCauses: string[] = [];
      let suggestedActions: string[] = [];
  
      // Analyzer 1: Blank Page Check
      const rootEl = document.getElementById('root');
      if (rootEl && rootEl.innerHTML.trim() !== '') {
          findings.push({ status: 'ok', description: 'React 应用已成功挂载到 #root 节点。' });
      } else {
          findings.push({ status: 'error', description: 'React 应用未能渲染到 #root 节点，这是白屏的直接原因。' });
          potentialCauses.push('在应用初始化时发生了 JavaScript 致命错误。', '主 JavaScript 文件未能成功加载。');
          suggestedActions.push('打开浏览器原生开发者工具(F12)，查看控制台是否有红色错误。', '检查 Network 面板，确认 JS 文件是否404。');
      }
  
      // Analyzer 2: URL & Route Check
      const currentPath = window.location.hash || window.location.pathname;
      if (currentPath.includes('/play/')) {
          const funnelId = currentPath.split('/play/')[1];
          if (funnelId) {
              findings.push({ status: 'ok', description: `当前为 Play 页面，Funnel ID 为 "${funnelId}"。` });
          } else {
              findings.push({ status: 'warning', description: 'URL 包含 "/play/" 但未能提取 Funnel ID。' });
              potentialCauses.push('路由解析或 URL 格式可能存在问题。');
          }
      }
  
      // Analyzer 3: Click Tracking Check
      const trackClickReq = capturedRequests.find(r => r.url.includes('trackClick'));
      if (trackClickReq) {
          if (trackClickReq.status >= 200 && trackClickReq.status < 300) {
              findings.push({ status: 'ok', description: '已成功发送 "trackClick" 请求并收到成功响应。', details: `Status: ${trackClickReq.status}` });
          } else {
              findings.push({ status: 'error', description: '发送了 "trackClick" 请求，但服务器返回了错误。', details: `Status: ${trackClickReq.status}, Response: ${trackClickReq.response}`});
              potentialCauses.push('后端云函数出现 bug。', '发送的数据格式不正确。');
              suggestedActions.push('检查云函数的日志以获取详细错误。', '对比前端发送的数据和后端期望的数据格式。');
          }
      } else {
          findings.push({ status: 'warning', description: '在本次会话中，未检测到发送 "trackClick" 的网络请求。' });
          potentialCauses.push('点击事件处理函数 (handleAnswerClick) 未被触发。', '请求在发送前被代码逻辑中断。');
          suggestedActions.push('在 `handleAnswerClick` 函数入口处添加 `console.log` 以确认其是否执行。');
      }
  
      return {
          title: '综合诊断报告',
          findings,
          potentialCauses: [...new Set(potentialCauses)],
          suggestedActions: [...new Set(suggestedActions)],
      };
  }

  console.log('[longPressDebug] Ultimate debugger with Smart Analysis installed.');
}
