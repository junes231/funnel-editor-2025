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
  meta?: any; // method/url/options 等
}

const DEFAULT_MAX_LINES = 500;

export const LongPressDebug: React.FC<{ maxLines?: number }> = ({ maxLines = DEFAULT_MAX_LINES }) => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [filter, setFilter] = useState("");
  const [visible, setVisible] = useState(false);
  const consoleInputRef = useRef<HTMLTextAreaElement | null>(null);

  // 面板高度拖拽（手机触摸）
  const [height, setHeight] = useState(300);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const draggingRef = useRef(false);
  const onTouchStart = (e: React.TouchEvent) => {
    draggingRef.current = true;
    startYRef.current = e.touches[0].clientY;
    startHeightRef.current = height;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!draggingRef.current) return;
    const delta = startYRef.current - e.touches[0].clientY;
    setHeight(Math.max(120, startHeightRef.current + delta));
  };
  const onTouchEnd = () => (draggingRef.current = false);
  useEffect(() => {
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // addLog 使用 useCallback（稳定引用）
  const addLog = useCallback((log: DebugLog) => {
    setLogs((prev) => [log, ...prev].slice(0, maxLines));
  }, [maxLines]);

  // 序列化 body 的辅助（重试时能重建 body）
  function serializeBody(body: any) {
    try {
      if (!body) return body;
      if (typeof body === "string") return body;
      if (body instanceof FormData) {
        const obj: Record<string, any> = {};
        for (const [k, v] of (body as FormData).entries()) obj[k] = v;
        return obj;
      }
      return JSON.parse(JSON.stringify(body));
    } catch {
      return "[unserializable body]";
    }
  }

  // Fatal Error 捕获 + source map 还原
  useEffect(() => {
    window.onerror = async (msg: any, src: any, line: any, col: any, err: any) => {
      let stack = err?.stack || `${msg} at ${src}:${line}:${col}`;
      let mapped = stack;
      try {
        if (typeof src === "string") {
          const res = await fetch(src + ".map");
          if (res.ok) {
            const smap = await res.json();
            const consumer = await new SourceMapConsumer(smap);
            mapped = stack
              .split("\n")
              .map((l: string) => {
                const m = l.match(/:(\d+):(\d+)/);
                if (m) {
                  const ln = parseInt(m[1], 10);
                  const cn = parseInt(m[2], 10);
                  const pos = consumer.originalPositionFor({ line: ln, column: cn });
                  if (pos.source) return `${pos.source}:${pos.line}:${pos.column}`;
                }
                return l;
              })
              .join("\n");
            consumer.destroy();
          }
        }
      } catch {}
      addLog({ id: Date.now() + "-error", type: "error", message: String(msg), stack: mapped, collapsed: true });
    };
  }, [addLog]);

  // fetch 拦截（增强保存 meta）
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
    return () => {
      window.fetch = originalFetch;
    };
  }, [addLog]);

  // 控制台运行 JS（支持 Ctrl/Cmd+Enter）
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

  // 复制日志到剪贴板
  const copyLogs = useCallback(async () => {
    const text = logs.map(l => `[${l.type.toUpperCase()}] ${l.message}${l.stack ? "\n" + l.stack : ""}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      addLog({ id: Date.now() + "-copy", type: "info", message: "已复制日志到剪贴板" });
    } catch {
      addLog({ id: Date.now() + "-copy-err", type: "error", message: "复制失败" });
    }
  }, [logs, addLog]);

  const clearLogs = useCallback(() => setLogs([]), []);
  const toggleCollapse = useCallback((id: string) => setLogs(prev => prev.map(l => l.id === id ? { ...l, collapsed: !l.collapsed } : l)), []);

  const filteredLogs = logs.filter(l => l.message.toLowerCase().includes(filter.toLowerCase()));
  const getColor = (type: LogType) => type === "error" ? "#f48771" : type === "network" ? "#cca700" : type === "cyan" ? "cyan" : (type === "lint" ? "cyan" : "#d4d4d4");

  // 智能分析 + 重试弹窗（createRoot modal）
  const runAnalysis = useCallback(async () => {
    addLog({ id: "analysis", type: "info", message: "正在运行智能分析..." });
    // 快照 logs，避免异步时被改变
    const logsSnapshot = [...logs];
    // 简单分析函数（可替换/扩展）
    const analyzeCurrentState = async (): Promise<AnalysisReport> => {
      const findings: ReportFinding[] = [];
      const fatal = logsSnapshot.find(l => l.type === "error");
      if (fatal) findings.push({ status: "error", description: fatal.message, details: fatal.stack });
      else findings.push({ status: "ok", description: "未检测到致命错误" });

      logsSnapshot.filter(l => l.type === "network" || (l.type === "error" && l.message.includes("→"))).forEach(l => {
        findings.push({ status: l.type === "error" ? "warning" : "info", description: l.message, details: l.stack });
      });

      logsSnapshot.filter(l => l.type === "lint").forEach(l => findings.push({ status: "info", description: l.message }));

      return { title: "综合诊断报告", findings, potentialCauses: ["请根据上面红/黄/蓝提示定位问题"], suggestedActions: ["查看错误详情", "重试请求", "检查后端日志"] };
    };

    const report = await analyzeCurrentState();

    // 找出最近一次失败请求（优先使用 meta）
    const lastErr = logsSnapshot.slice().reverse().find(l => l.type === "error" && l.meta?.url) ?? logsSnapshot.slice().reverse().find(l => l.type === "error" && /\b(GET|POST|PUT|DELETE)\b/.test(l.message));
    let retryMeta = lastErr?.meta ?? null;
    // 若没有 meta，尝试从 message 解析 method/url
    if (!retryMeta && lastErr?.message) {
      const m = lastErr.message.match(/(GET|POST|PUT|DELETE)\s+(\S+)/);
      if (m) retryMeta = { method: m[1], url: m[2], options: {} };
    }

    const modalRoot = document.createElement("div");
    document.body.appendChild(modalRoot);
    const root = createRoot(modalRoot);

    const AnalysisModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
      const [status, setStatus] = useState<string>("idle");
      const [attempt, setAttempt] = useState<number>(0);
      const [maxRetries, setMaxRetries] = useState<number>(3);
      const abortRef = useRef<AbortController | null>(null);
      const cancelledRef = useRef(false);

      const doSingleRetry = async (meta: any) => {
        if (!meta?.url) {
          setStatus("无可重试 URL");
          return false;
        }
        try {
          setStatus(`重试 ${meta.method || "GET"} ${meta.url} ...`);
          abortRef.current = new AbortController();
          const options = { ...(meta.options || {}), signal: abortRef.current.signal };
          // 如果 options.body 是对象而不是 FormData, 且 Content-Type 是 JSON，序列化
          if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
            const contentType = options.headers?.["Content-Type"] || options.headers?.["content-type"] || "";
            if (contentType.includes("application/json") || !contentType) {
              options.body = JSON.stringify(options.body);
              options.headers = { ...(options.headers || {}), "Content-Type": "application/json" };
            }
          }
          const res = await fetch(meta.url, options);
          const text = await res.text().catch(() => "[response unreadable]");
          addLog({ id: `retry-${Date.now()}`, type: res.ok ? "info" : "error", message: `重试结果: ${res.status}`, stack: text, meta: { ...meta, responseStatus: res.status, responseBody: text } });
          setStatus(res.ok ? `成功 ${res.status}` : `失败 ${res.status}`);
          return res.ok;
        } catch (err: any) {
          addLog({ id: `retry-err-${Date.now()}`, type: "error", message: `重试异常: ${String(err?.message || err)}` });
          setStatus("异常");
          return false;
        }
      };

      const autoRetry = async () => {
        if (!retryMeta) return;
        cancelledRef.current = false;
        for (let i = 1; i <= maxRetries && !cancelledRef.current; i++) {
          setAttempt(i);
          const ok = await doSingleRetry(retryMeta);
          if (ok) return;
          const backoff = Math.min(10000, 500 * Math.pow(2, i)); // 指数退避，最大 10s
          setStatus(`第 ${i} 次失败，${backoff}ms 后重试...`);
          await new Promise(r => setTimeout(r, backoff));
        }
        if (!cancelledRef.current) setStatus("自动重试结束");
      };

      const cancel = () => {
        cancelledRef.current = true;
        abortRef.current?.abort();
        setStatus("已取消");
      };

      return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100001, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "94%", maxWidth: 800, maxHeight: "86%", overflow: "auto", background: "#222", color: "#fff", padding: 16, borderRadius: 8, position: "relative" }}>
            <button onClick={() => { onClose(); }} style={{ position: "absolute", right: 12, top: 12 }}>关闭</button>
            <h3 style={{ marginTop: 0 }}>综合诊断报告</h3>
            <div style={{ marginBottom: 12 }}>
              <DebugReport report={report} />
            </div>

            <div style={{ borderTop: "1px solid #333", paddingTop: 10 }}>
              <div style={{ marginBottom: 8 }}>最近失败请求： <strong>{retryMeta?.url ?? "无"}</strong></div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ color: "#ccc" }}>自动重试次数：</label>
                <input type="number" value={maxRetries} min={1} max={10} onChange={e => setMaxRetries(Math.max(1, Number(e.target.value || 1)))} style={{ width: 72 }} />
                <button disabled={!retryMeta} onClick={() => autoRetry()}>⏱ 自动重试</button>
                <button disabled={!retryMeta} onClick={async () => { await doSingleRetry(retryMeta); }}>🔄 重试一次</button>
                <button onClick={cancel}>取消</button>
              </div>
              <div style={{ marginTop: 10, color: "#ddd" }}>状态：{status} {attempt ? `(尝试 ${attempt})` : ""}</div>
            </div>
          </div>
        </div>
      );
    };

    root.render(<AnalysisModal onClose={() => { root.unmount(); modalRoot.remove(); }} />);
  }, [addLog, logs]);

  // UI 渲染
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
          zIndex: 120000,
          fontSize: 12,
          border: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
        }}
        onClick={() => setVisible(v => !v)}
      >
        Debug
      </button>

      {visible && (
        <div style={{ position: "fixed", bottom: 0, left: 0, width: "100%", height, maxHeight: "90%", background: "#111", color: "#fff", fontFamily: "monospace", fontSize: 12, zIndex: 119999, display: "flex", flexDirection: "column" }}>
          <div style={{ height: 10, background: "#333", cursor: "ns-resize" }} onTouchStart={onTouchStart}></div>

          {/* 工具栏 */}
          <div style={{ display: "flex", gap: 8, padding: 8, alignItems: "center", borderBottom: "1px solid #333" }}>
            <input placeholder="搜索日志" value={filter} onChange={e => setFilter(e.target.value)} style={{ flexGrow: 1, minWidth: 120, padding: 6, background: "#222", color: "#fff", border: "1px solid #333", borderRadius: 4 }} />
            <button onClick={runAnalysis}>诊断</button>
            <button onClick={clearLogs}>清除</button>
            <button onClick={copyLogs}>复制</button>
          </div>

          {/* 日志列表 */}
          <div style={{ flexGrow: 1, overflowY: "auto", padding: 8 }}>
            {filteredLogs.map(l => (
              <div key={l.id} style={{ borderBottom: "1px solid #222", padding: "6px 4px", color: l.type === "error" ? "#f48771" : l.type === "network" ? "#cca700" : "#d4d4d4" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1 }} onClick={() => l.stack && toggleCollapse(l.id)}>
                    <strong>[{l.type.toUpperCase()}]</strong> {l.message}
                  </div>
                  <div style={{ marginLeft: 8 }}>
                    <button onClick={() => toggleCollapse(l.id)} style={{ fontSize: 12, padding: "2px 6px" }}>{l.collapsed ? "展开" : "收起"}</button>
                  </div>
                </div>
                {l.stack && !l.collapsed && <pre style={{ whiteSpace: "pre-wrap", marginTop: 6, color: "#ccc" }}>{l.stack}</pre>}
              </div>
            ))}
          </div>

          {/* 控制台 */}
          <div style={{ borderTop: "1px solid #333", padding: 8 }}>
            <textarea
              ref={consoleInputRef}
              rows={3}
              placeholder="输入 JS 代码 (Ctrl/Cmd+Enter 执行)"
              style={{ width: "100%", background: "#222", color: "#fff", border: "1px solid #333", borderRadius: 4, padding: 8, fontFamily: "monospace", resize: "vertical" }}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  runConsoleCode();
                }
              }}
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

// 安装入口（在你的编辑器入口调用）
export function installLongPressDebug(opts?: { maxLines?: number }) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(<LongPressDebug maxLines={opts?.maxLines} />);
}
