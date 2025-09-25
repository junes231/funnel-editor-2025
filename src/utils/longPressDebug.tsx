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

const DEFAULT_MAX_LINES = 500;
const isMobile = /Mobi|Android/i.test(navigator.userAgent);

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

  // 捕获 JS 全局错误
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
              if (pos.source) return `${pos.source}:${pos.line}:${pos.column}  ⬅️ ${l}`;
            }
            return l;
          }).join("\n");
          consumer.destroy();
        }
      } catch {}
      addLog({ id: Date.now() + "-error", type: "error", message: String(msg), stack, collapsed: true });
    };
  }, [addLog]);

  // fetch 拦截
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: any, init: any = {}) => {
      const method = ((init && init.method) || (typeof input === "string" ? "GET" : input?.method) || "GET").toUpperCase();
      const url = typeof input === "string" ? input : input?.url || String(input);
      const options = { ...init };
      if ("body" in options) options.body = serializeBody(options.body);

      const meta = { method, url, options };
      try {
        const res = await originalFetch(input, init);
        let text = "";
        try { text = await res.clone().text(); } catch {}
        addLog({
          id: Date.now() + "-net",
          type: res.ok ? "network" : "error",
          message: `[${method}] ${url} → ${res.status}`,
          stack: text,
          meta,
        });
        return res;
      } catch (err: any) {
        addLog({
          id: Date.now() + "-neterr",
          type: "error",
          message: `[${method}] ${url} → 请求失败`,
          stack: String(err?.message || err),
          meta,
        });
        throw err;
      }
    };
    return () => { window.fetch = originalFetch; };
  }, [addLog]);

  // 控制台执行 JS
  const runConsoleCode = useCallback(() => {
    const code = consoleInputRef.current?.value;
    if (!code || !code.trim()) return;
    addLog({ id: Date.now() + "-eval-in", type: "info", message: `> ${code}` });
    try {
      // eslint-disable-next-line no-eval
      const result = eval(code);
      addLog({ id: Date.now() + "-eval-out", type: "info", message: `<- ${String(result)}` });
    } catch (e: any) {
      addLog({ id: Date.now() + "-eval-err", type: "error", message: String(e) });
    }
    if (consoleInputRef.current) consoleInputRef.current.value = "";
  }, [addLog]);

  // 复制日志
  const copyLogs = useCallback(async () => {
    const text = logs.map(l => `[${l.type.toUpperCase()}] ${l.message}${l.stack ? "\n" + l.stack : ""}`).join("\n\n");
    try { await navigator.clipboard.writeText(text); addLog({ id: Date.now() + "-copy", type: "info", message: "已复制日志到剪贴板" }); } catch { addLog({ id: Date.now() + "-copy-err", type: "error", message: "复制失败" }); }
  }, [logs, addLog]);

  const filteredLogs = logs.filter(l => l.message.toLowerCase().includes(filter.toLowerCase()));

  return (
    <>
      <button
        style={{ position: "fixed", right: 10, bottom: 65, width: 56, height: 56, borderRadius: 28, background: "#007acc", color: "#fff", zIndex: 120000, fontSize: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
        onClick={() => setVisible(v => !v)}
      >
        Debug
      </button>

      {visible && (
        <div style={{ position: "fixed", bottom: 0, left: 0, width: "100%", height: 300, maxHeight: "90%", background: "#111", color: "#fff", fontFamily: "monospace", fontSize: 12, zIndex: 119999, display: "flex", flexDirection: "column" }}>
          {/* 工具栏 */}
          <div style={{ display: "flex", gap: 8, padding: 8, alignItems: "center", borderBottom: "1px solid #333" }}>
            <input placeholder="搜索日志" value={filter} onChange={e => setFilter(e.target.value)} style={{ flexGrow: 1, minWidth: 120, padding: 6, background: "#222", color: "#fff", border: "1px solid #333", borderRadius: 4 }} />
            <button onClick={clearLogs}>清除</button>
            <button onClick={copyLogs}>复制</button>
          </div>

          {/* 日志列表 */}
          <div style={{ flexGrow: 1, overflowY: "auto", padding: 8 }}>
            {filteredLogs.map((l, index) => (
              <div key={l.id} style={{ borderBottom: "1px solid #222", padding: "6px 4px", color: l.type === "error" ? "#f48771" : l.type === "network" ? "#cca700" : "#d4d4d4" }}>
                <div>
                  <strong>[{l.type.toUpperCase()}]</strong> {l.message}
                </div>
                {l.stack && (
                  <pre style={{ whiteSpace: "pre-wrap", marginTop: 6, color: "#ccc" }}>
                    {l.stack.split("\n").map((line, i) => {
                      const match = line.match(/\((.*):(\d+):(\d+)\)/);
                      if (match && !isMobile) {
                        const [_, file, lineNum, colNum] = match;
                        return (
                          <div key={i} style={{ cursor: "pointer", color: "#4fc3f7" }} onClick={() => window.open(`vscode://file/${file}:${lineNum}:${colNum}`)}>
                            {line}
                          </div>
                        );
                      }
                      return <div key={i}>{line}</div>;
                    })}
                  </pre>
                )}
              </div>
            ))}
          </div>

          {/* 控制台 */}
          <div style={{ borderTop: "1px solid #333", padding: 8 }}>
            <textarea ref={consoleInputRef} rows={3} placeholder="输入 JS 代码 (Ctrl/Cmd+Enter 执行)" style={{ width: "100%", background: "#222", color: "#fff", border: "1px solid #333", borderRadius: 4, padding: 8, fontFamily: "monospace", resize: "vertical" }} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); runConsoleCode(); } }} />
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


// 辅助：序列化 fetch body
function serializeBody(body: any) {
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
}

// 辅助：获取第一个 source map
async function getSourceMapForStack() {
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
        return rawSourceMap; // 找到第一个 source map 就返回
      }
    } catch (e) {
      console.warn("获取 source map 失败:", e);
    }
  }
  return null;
}

// 安装入口
export function installLongPressDebug(opts?: { maxLines?: number }) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(<LongPressDebug maxLines={opts?.maxLines} />);
}
