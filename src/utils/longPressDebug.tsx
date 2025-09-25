// src/utils/longPressDebug.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import DebugReport, { AnalysisReport, ReportFinding } from "../components/DebugReport.tsx";
import { SourceMapConsumer } from "source-map-js";

type LogType = "error" | "network" | "lint" | "info";

interface DebugLog {
  id: string;
  type: LogType;
  message: string;
  stack?: string;
  collapsed?: boolean;
  meta?: any;
}

const DEFAULT_MAX_LINES = 50;

export const LongPressDebug: React.FC<{ maxLines?: number }> = ({ maxLines = DEFAULT_MAX_LINES }) => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [filter, setFilter] = useState("");
  const [visible, setVisible] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const consoleInputRef = useRef<HTMLTextAreaElement | null>(null);

  const addLog = useCallback((log: DebugLog) => {
    setLogs(prev => [log, ...prev].slice(0, maxLines));
  }, [maxLines]);

  const clearLogs = useCallback(() => setLogs([]), []);

  const serializeBody = (body: any) => {
    try {
      if (!body) return body;
      if (typeof body === "string") return body;
      if (body instanceof FormData) {
        const obj: Record<string, any> = {};
        for (const [k, v] of body.entries()) obj[k] = v;
        return obj;
      }
      return JSON.parse(JSON.stringify(body));
    } catch {
      return "[unserializable body]";
    }
  };

  const getSourceMapForStack = useCallback(async () => {
    const scripts = Array.from(document.scripts).filter(s => s.src);
    for (const script of scripts) {
      try {
        const res = await fetch(script.src);
        const text = await res.text();
        const match = text.match(/\/\/# sourceMappingURL=(.*)$/m);
        if (match) {
          const mapUrl = new URL(match[1], script.src).toString();
          const mapRes = await fetch(mapUrl);
          const rawSourceMap = await mapRes.json();
          return rawSourceMap;
        }
      } catch (e) {
        console.warn("获取 source map 失败:", e);
      }
    }
    return null;
  }, []);

  useEffect(() => {
    window.onerror = async (msg, src, line, col, err) => {
      let stack = err?.stack || `${msg} at ${src}:${line}:${col}`;
      try {
        const rawSourceMap = await getSourceMapForStack();
        if (rawSourceMap) {
          const consumer = await new SourceMapConsumer(rawSourceMap);
          stack = stack.split("\n").map(l => {
            const m = l.match(/:(\d+):(\d+)/);
            if (m) {
              const ln = parseInt(m[1], 10);
              const cn = parseInt(m[2], 10);
              const pos = consumer.originalPositionFor({ line: ln, column: cn });
              if (pos.source) return `${pos.source}:${pos.line}:${pos.column} ⬅️ ${l}`;
            }
            return l;
          }).join("\n");
          consumer.destroy();
        }
      } catch {}
      addLog({ id: Date.now() + "-error", type: "error", message: String(msg), stack, collapsed: true });
    };
  }, [addLog, getSourceMapForStack]);

 useEffect(() => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: any, init: any = {}) => {
    const url = typeof input === "string" ? input : input?.url || String(input);
    addLog({ id: Date.now() + "-net-start", type: "info", message: `Loading started for ${url}` });
    try {
      const res = await originalFetch(input, init);
      const text = await res.text();
      addLog({
        id: Date.now() + "-net",
        type: res.ok ? "network" : "error",
        message: `[${method}] ${url} → ${res.status} ${res.statusText}`,
        stack: text,
        meta: { method, url, options: init },
      });
      // 假设加载完成条件
      if (text.includes("noop") || text.includes("targetChange")) {
        addLog({ id: Date.now() + "-net-end", type: "info", message: `Loading ended for ${url}` });
      }
      return res;
    } catch (err) {
      addLog({ id: Date.now() + "-neterr", type: "error", message: `Failed: ${err.message}` });
      throw err;
    }
  };
  return () => { window.fetch = originalFetch; };
}, [addLog]);

  const runConsoleCode = useCallback(() => {
    const code = consoleInputRef.current?.value;
    if (!code || !code.trim()) return;
    addLog({ id: Date.now() + "-eval-in", type: "info", message: `> ${code}` });
    try {
      const result = eval(code);
      const display = typeof result === "object" ? JSON.stringify(result, null, 2) : String(result);
      addLog({ id: Date.now() + "-eval-out", type: "info", message: `<- ${display}` });
    } catch (e: any) {
      addLog({ id: Date.now() + "-eval-err", type: "error", message: String(e) });
    }
    if (consoleInputRef.current) consoleInputRef.current.value = "";
  }, [addLog]);

  const copyLogs = useCallback(async () => {
    const text = logs.map(l => `[${l.type.toUpperCase()}] ${l.message}${l.stack ? "\n" + l.stack : ""}`).join("\n\n");
    try { await navigator.clipboard.writeText(text); addLog({ id: Date.now() + "-copy", type: "info", message: "已复制日志到剪贴板" }); } catch { addLog({ id: Date.now() + "-copy-err", type: "error", message: "复制失败" }); }
  }, [logs, addLog]);

  const runAnalysis = useCallback(() => {
    addLog({ id: "analysis", type: "info", message: "正在运行智能分析..." });
    const logsSnapshot = [...logs];
    const findings: ReportFinding[] = [];

    logsSnapshot.filter(l => l.type === "error").forEach(l => {
      findings.push({ status: "error", description: l.message, details: l.stack });
    });
    logsSnapshot.filter(l => l.type === "network" && l.meta?.url).forEach(l => {
      findings.push({ status: l.message.includes("→") && !l.message.includes("200") ? "warning" : "info", description: `[${l.meta.method}] ${l.meta.url} → ${l.message.split("→")[1] ?? ""}`, details: JSON.stringify(l.meta, null, 2) });
    });
    logsSnapshot.filter(l => l.type === "lint" || l.type === "info").forEach(l => {
      findings.push({ status: "info", description: l.message });
    });

    const newReport: AnalysisReport = {
      title: "智能分析报告",
      findings,
      potentialCauses: ["变量未定义或拼写错误","函数调用顺序错误","API 返回数据结构不符合预期","网络异常或跨域问题"],
      suggestedActions: ["检查出错行附近的变量声明或函数调用","确认接口返回数据格式是否符合预期","重试请求或检查网络连接","查看堆栈信息定位具体出错文件和行号"],
    };
    setReport(newReport);
  }, [logs, addLog]);

  const filteredLogs = logs.filter(l => l.message.toLowerCase().includes(filter.toLowerCase()));

  return (
  <>
    <button 
      style={{ 
        position: "fixed", 
        right: 10, 
        bottom: 65, 
        width: 56, 
        height: 56, 
        borderRadius: 28, 
        background: "#007acc", 
        color: "#fff", 
        zIndex: 120001, // 提高 z-index
        fontSize: 12, 
        border: "none", 
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)" 
      }}
      onClick={() => setVisible(v => !v)}
    >
      Debug
    </button>

    {visible && (
      <div 
        style={{ 
          position: "fixed", 
          bottom: 0, 
          left: 0, 
          width: "100%", 
          height: "70vh", // 适配屏幕高度
          maxHeight: "90vh", 
          background: "#111", 
          color: "#fff", 
          fontFamily: "monospace", 
          fontSize: 12, 
          zIndex: 120000, 
          display: "flex", 
          flexDirection: "column" 
        }}
      >
        {/* 工具栏 */}
        <div style={{ display: "flex", gap: 8, padding: 8, alignItems: "center", borderBottom: "1px solid #333" }}>
          <input 
            placeholder="搜索日志" 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            style={{ flexGrow: 1, minWidth: 120, padding: 6, background: "#222", color: "#fff", border: "1px solid #333", borderRadius: 4 }} 
          />
          <button onClick={runAnalysis}>智能分析</button>
          <button onClick={clearLogs}>清除</button>
          <button onClick={copyLogs}>复制</button>
        </div>

        {/* 日志列表和报告容器 */}
        <div style={{ flexGrow: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column" }}>
          {filteredLogs.map((l, index) => (
            <div key={l.id} style={{ borderBottom: "1px solid #222", padding: "6px 4px", color: l.type === "error" ? "#f48771" : l.type === "network" ? "#cca700" : "#d4d4d4" }}>
              <div><strong>[{l.type.toUpperCase()}]</strong> {l.message}</div>
              {l.stack && <pre style={{ whiteSpace: "pre-wrap", marginTop: 6, color: "#ccc" }}>{l.stack}</pre>}
            </div>
          ))}
          {report && <DebugReport report={report} />} {/* 确保报告在可见区域 */}
        </div>

        {/* 控制台 */}
        <div style={{ borderTop: "1px solid #333", padding: 8 }}>
          <textarea 
            ref={consoleInputRef} 
            rows={3} 
            placeholder="输入 JS 代码 (Ctrl/Cmd+Enter 执行)" 
            style={{ width: "100%", background: "#222", color: "#fff", border: "1px solid #333", borderRadius: 4, padding: 8, fontFamily: "monospace" }} 
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); runConsoleCode(); } }} 
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button onClick={runConsoleCode}>运行</button>
            <button onClick={clearLogs}>清除</button>
            <button onClick={copyLogs}>复制</button>
          </div>
        </div>
      </div>
    )}
  </>
);
};

// 安装入口
export function installLongPressDebug(opts?: { maxLines?: number }) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(<LongPressDebug maxLines={opts?.maxLines} />);
}
