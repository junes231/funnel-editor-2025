import React from 'react';
import ReactDOM from 'react-dom';
// 确保 DebugReport.tsx 和其 CSS 文件存在于 src/components/ 目录下
import DebugReport, { AnalysisReport, ReportFinding } from '../components/DebugReport.tsx';

// --- 模块 1: 全局致命错误捕获 ---
let capturedFatalError: ReportFinding | null = null;
window.onerror = function(message, source, lineno, colno, error) {
  // 忽略一些由浏览器插件等引起的、与应用本身无关的常见错误
  if (typeof message === 'string' && message.includes('ResizeObserver loop')) {
    return false;
  }

  capturedFatalError = {
    status: 'error',
    description: '捕获到导致应用崩溃的致命错误 (Fatal Error)！',
    details: `Message: ${message}\nSource: ${source}\nLine: ${lineno}, Column: ${colno}\nError: ${error ? String(error) : 'N/A'}`
  };
  console.log('>>> FATAL ERROR CAPTURED:', capturedFatalError);
  // 允许浏览器继续输出错误到控制台（方便开发时追踪真实堆栈）
  return false;
};

// --- 模块 2: 调试器核心初始化函数 ---
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
      position: fixed; right: 10px; bottom: 65px; z-index: 100000; background: #007acc; color: white;
      border: none; border-radius: 50%; width: 50px; height: 50px; font-size: 12px;
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
   startUIMonitoring();
  startAnswerTracking();
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
  // --- 安全处理 consoleInput 的键盘事件 ---
consoleInput.addEventListener('keydown', (e) => {
  if (e.target === consoleInput && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    executeCode();
    e.preventDefault();
  }
});

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

  const originalFetch = window.fetch.bind(window);

  // helper: convert Headers to plain object
  function headersToObject(h: Headers | Record<string, any> | undefined) {
    try {
      if (!h) return {};
      if (h instanceof Headers) {
        const obj: Record<string, string> = {};
        h.forEach((v, k) => (obj[k] = v));
        return obj;
      }
      // may be plain object already
      return h;
    } catch (e) {
      return { error: 'Could not read headers' };
    }
  }

  // helper: safe read body representation (no throwing)
  async function safeReadBody(requestOrInit: Request | { body?: any }) {
    try {
      const body = (requestOrInit as any).body;
      if (!body) return null;
      // If it's a ReadableStream / non-readable, just return a placeholder
      if (typeof body === 'string') return body;
      if (body instanceof FormData) {
        const entries: any[] = [];
        body.forEach((v, k) => entries.push([k, v]));
        return { formData: entries };
      }
      if (body instanceof URLSearchParams) {
        return body.toString();
      }
      if (body instanceof Blob) {
        return `[Blob size=${body.size} type=${body.type}]`;
      }
      if (body instanceof ArrayBuffer) {
        return `[ArrayBuffer byteLength=${body.byteLength}]`;
      }
      // if it's a Request object, attempt to clone and text()
      if (requestOrInit instanceof Request) {
        try {
          const clone = requestOrInit.clone();
          return await clone.text().catch(() => '[Could not read request body]');
        } catch {
          return '[Unreadable Request body]';
        }
      }
      // fallback: try text() if exists
      if (typeof body.text === 'function') {
        return await body.text().catch(() => '[Could not read body via text()]');
      }
      // last resort, JSON stringify
      return typeof body === 'object' ? JSON.stringify(body) : String(body);
    } catch (e) {
      return `[Body read error: ${String(e)}]`;
    }
  }

  // override fetch safely
  window.fetch = async function (...args: any[]) {
    // Normalize to Request object when possible
    let request: Request;
    try {
      if (args[0] instanceof Request) {
        request = args[0];
      } else {
        request = new Request(args[0], args[1]);
      }
    } catch (e) {
      // If Request construction fails, fallback to calling originalFetch directly
      return originalFetch(...args);
    }

    // Build requestInfo safely
    const requestInfo: any = {
      url: request.url,
      method: request.method || 'GET',
      headers: {},
      body: null,
      status: 0,
      startTime: Date.now(),
      duration: 0,
      responseText: '',
    };
     if (requestInfo.method === 'GET' && requestInfo.url.includes('trackClick')) {
  console.warn('Unexpected GET request to trackClick:', requestInfo.url);
}
    // Read headers safely
    requestInfo.headers = headersToObject(request.headers);

    // Read body representation safely (non-blocking for actual request)
    try {
      requestInfo.body = await safeReadBody(request);
    } catch (e) {
      requestInfo.body = `[Body read error: ${String(e)}]`;
    }

    // push to captured list
    capturedRequests.unshift(requestInfo);
    renderNetworkPanel();

    // perform actual fetch and capture response/metrics, but do NOT swallow errors from original fetch
    let response: Response;
    try {
      response = await originalFetch(request);
    } catch (fetchError) {
      // mark as failed
      requestInfo.duration = Date.now() - requestInfo.startTime;
      requestInfo.status = -1;
      requestInfo.responseText = `[Fetch failed: ${String(fetchError)}]`;
      renderNetworkPanel();
      throw fetchError; // rethrow so application-level error handling still works
    }

    try {
      const resClone = response.clone();
      requestInfo.status = response.status;
      requestInfo.responseText = await resClone.text().catch(() => '[Response could not be read]');
      requestInfo.duration = Date.now() - requestInfo.startTime;
    } catch (e) {
      requestInfo.responseText = `[Response read error: ${String(e)}]`;
      requestInfo.duration = Date.now() - requestInfo.startTime;
    }

    renderNetworkPanel();
    return response;
  };

  // escape helper for safe HTML insertion
  function escapeHtml(s: any) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderNetworkPanel() {
    networkPanel.innerHTML = capturedRequests.map((r) => {
      const isError = r.status === -1 || (r.status >= 400 && r.status !== 0);
      return `
      <div class="lp-log-line ${isError ? 'error' : ''}">
        [${escapeHtml(r.status || '...')} | ${escapeHtml(r.method)}] ${escapeHtml(r.url)} (${escapeHtml(r.duration)}ms)
        <details>
          <summary>Details</summary>
          <pre>Headers: ${escapeHtml(JSON.stringify(r.headers, null, 2))}</pre>
          <pre>Body: ${escapeHtml(typeof r.body === 'object' ? JSON.stringify(r.body, null, 2) : r.body)}</pre>
          <pre>Response: ${escapeHtml(r.responseText)}</pre>
        </details>
      </div>`;
    }).join('');
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
    }

    const rootEl = document.getElementById('root');
    if (rootEl && rootEl.innerHTML.trim() !== '') {
      findings.push({ status: 'ok', description: 'React 应用已成功挂载到 #root 节点。' });
    } else {
      findings.push({ status: 'error', description: 'React 应用未能渲染到 #root 节点，这很可能是白屏的原因。' });
    }

    // --- 检查 Funnel 数据完整性 ---
const funnelData = (window as any).__funnelData || (window as any).funnelData || null;

if (!funnelData) {
  findings.push({
    status: 'error',
    description: '未检测到 funnelData，这意味着问题列表和答案可能未加载或未保存。'
  });
} else {
  // 检查问题列表
  if (!Array.isArray(funnelData.questions) || funnelData.questions.length === 0) {
    findings.push({
      status: 'warning',
      description: '问题列表为空，可能没有保存任何问题。'
    });
  } else {
    funnelData.questions.forEach((q: any, idx: number) => {
      if (!q.id || !q.text) {
        findings.push({
          status: 'error',
          description: `问题 #${idx + 1} 缺少 id 或 text，可能未正确保存。`
        });
      }
      // 检查答案
      const answers = q.answers ? Object.values(q.answers) : [];
      if (!answers.length) {
        findings.push({
          status: 'warning',
          description: `问题 "${q.text}" 没有答案，可能未保存完整。`
        });
      } else {
        answers.forEach((ans: any, aIdx: number) => {
          if (!ans.id || !ans.text) {
            findings.push({
              status: 'error',
              description: `问题 "${q.text}" 的答案 #${aIdx + 1} 缺少 id 或 text。`
            });
          }
        });
      }
      // 检查 affiliateLinks
      if (q.data?.affiliateLinks) {
        q.data.affiliateLinks.forEach((link: string, lIdx: number) => {
          if (typeof link !== 'string' || link.trim() === '') {
            findings.push({
              status: 'error',
              description: `问题 "${q.text}" 的链接 #${lIdx + 1} 无效，可能未保存。`
              });
              }
             });
             }
            // 检查重定向链接
if (q.data?.redirectLink) {
    if (typeof q.data.redirectLink !== 'string' || q.data.redirectLink.trim() === '') {
      findings.push({
        status: 'error',
        description: `问题 "${q.text}" 的重定向链接未设置或为空，可能未保存。`
      });
    }
  } else {
    findings.push({
      status: 'warning',
      description: `问题 "${q.text}" 没有重定向链接字段，可能未设置或未保存。`
    });
  }
 });
    // 尝试查找 trackClick 或 api-track-click 或 track-click 等变体
    const trackClickReq = capturedRequests.find((r: any) =>
      (r.url || '').includes('api-track-click') ||
      (r.url || '').includes('trackClick') ||
      (r.url || '').includes('track-click')
    );

    if (trackClickReq) {
      let reqBody: any = {};
      try {
        if (typeof trackClickReq.body === 'string') {
          reqBody = JSON.parse(trackClickReq.body || '{}')?.data || {};
        } else if (typeof trackClickReq.body === 'object' && trackClickReq.body !== null) {
          reqBody = (trackClickReq.body.data) || {};
        } else {
          reqBody = {};
        }
      } catch {
        reqBody = {};
      }

      if (trackClickReq.status >= 200 && trackClickReq.status < 300) {
        findings.push({ status: 'ok', description: '已成功发送 "trackClick" 请求并收到成功响应。', details: `Status: ${trackClickReq.status}` });
      } else {
        findings.push({ status: 'error', description: '发送了 "trackClick" 请求，但服务器返回了错误或请求失败。', details: `Status: ${trackClickReq.status}, Response: ${trackClickReq.responseText}` });

        // 添加 questionId 验证（尽可能安全地读取全局 funnel 数据）
        const funnelData = (window as any).__funnelData || (window as any).funnelData || null;
        const questionIds = funnelData?.questions?.map((q: any) => q.id) || [];
        const sentQuestionId = reqBody.questionId || reqBody?.question?.id || null;
        if (sentQuestionId && !questionIds.includes(sentQuestionId)) {
          findings.push({
            status: 'error',
            description: '发送的 questionId 不存在于 funnel 数据中。',
            details: `Sent: ${sentQuestionId}, Available: ${JSON.stringify(questionIds)}`,
            suggestedAction: '检查 QuizPlayer.tsx 中的 currentQuestion.id 或 Firestore 数据，确保前端使用的 funnel 数据是最新且完整的。',
          });
        }
      }
    } else {
      findings.push({ status: 'warning', description: '在本次会话中，未检测到发送 "trackClick" 的网络请求。' });
    }

    return {
      title: '综合诊断报告',
      findings,
      potentialCauses: ['请根据上述[发现]中的红色或黄色项目，定位可能原因。'],
      suggestedActions: ['对于致命错误，请检查代码。对于网络错误，请检查后端日志或前端 payload。对于未发送请求，请检查点击事件逻辑及请求构造。'],
    };
  }

  logToPanel('info', ['Ultimate Debugger Ready.']);
}


// --- 模块 6: UI 监控模块 (UI Monitoring) ---
function startUIMonitoring() {
  setInterval(() => {
    const rootEl = document.getElementById('root');
    if (!rootEl || rootEl.innerHTML.trim() === '') {
      console.error('[UI-Monitor] Root 节点为空，可能白屏');
    }

    // 检查 Debug 按钮是否存在
    if (!document.getElementById('__lp_debug_toggle')) {
      console.warn('[UI-Monitor] Debug 按钮丢失，调试器可能被卸载');
    }

    // 其他关键节点检测，例如按钮、输入框
    const backButton = document.querySelector('button[data-role="back"]');
    if (!backButton) {
      console.warn('[UI-Monitor] 返回按钮未找到');
    }
  }, 5000); // 每 5 秒检查一次
}
// --- 模块 7: 答案保存追踪 (Answer Tracking) ---
function startAnswerTracking() {
  // 每次捕获到请求时，分析 answerId / affiliateLink 是否存在
  const checkAnswerRequests = () => {
    const answerReqs = capturedRequests.filter(r =>
      (r.url || '').includes('trackClick') ||
      (r.url || '').includes('answer') ||
      (r.url || '').includes('save')
    );

    if (answerReqs.length === 0) {
      console.warn('[AnswerTracking] 暂未检测到答案保存请求');
      return;
    }

    answerReqs.forEach(req => {
      let reqBody: any = {};
      try {
        if (typeof req.body === 'string') {
          reqBody = JSON.parse(req.body || '{}')?.data || {};
        } else if (typeof req.body === 'object') {
          reqBody = req.body.data || {};
        }
      } catch (e) {
        console.error('[AnswerTracking] 请求体解析失败', e);
      }

      const answerId = reqBody.answerId || null;
      const questionId = reqBody.questionId || null;
      const affiliateLink = reqBody.affiliateLink || null;

      if (req.status >= 200 && req.status < 300) {
        console.log('[AnswerTracking] ✅ 答案保存成功', { questionId, answerId, affiliateLink });
      } else {
        console.error('[AnswerTracking] ❌ 答案保存失败', {
          questionId, answerId, affiliateLink,
          status: req.status, response: req.responseText
        });
      }
    });
  };

  // 定时检查（也可以改成按钮触发）
  setInterval(checkAnswerRequests, 5000);
}

// --- 模块 8: 导出与安装 ---
export function installLongPressDebug(options: { enable?: boolean } = {}) {
  const { enable = (typeof window !== 'undefined' && window.location.search.includes('debug=1')) } = options;
  if (!enable) return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDebugger);
  } else {
    initializeDebugger();
    
  }
}
