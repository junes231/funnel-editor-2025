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

export const LongPressDebug: React.FC<{ maxLines?: number }> = ({ maxLines = DEFAULT_MAX_LINES }) => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const logsRef = useRef<DebugLog[]>([]);
  const [filter, setFilter] = useState("");
  const [visible, setVisible] = useState(false);
  const consoleInputRef = useRef<HTMLTextAreaElement | null>(null);

  // 高度拖拽（pointer 兼容鼠标与触摸）
  const [height, setHeight] = useState(300);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const draggingRef = useRef(false);

  // 防止按钮重复触发
  const lastToggleRef = useRef(0);
  const handleToggleVisible = useCallback((e?: React.SyntheticEvent | any) => {
    const now = Date.now();
    if (now - lastToggleRef.current < 300) return;
    lastToggleRef.current = now;
    setVisible(v => !v);
    e?.preventDefault?.();
  }, []);

  // 保证 logsRef 与 state 同步
  const updateLogsState = useCallback((next: DebugLog[]) => {
    logsRef.current = next;
    setLogs(next);
  }, []);

  const addLog = useCallback((log: DebugLog) => {
    updateLogsState([log, ...logsRef.current].slice(0, maxLines));
  }, [maxLines, updateLogsState]);

  const serializeBody = (body: any) => {
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
  };

  // ---- SourceMap + 全局错误捕获 ----
  useEffect(() => {
    const handleErrorEvent = async (evtOrMsg: any, src?: any, line?: any, col?: any, err?: any) => {
      // 支持 window.onerror 旧签名与 addEventListener('error', ev)
      let message = "";
      let stack = "";
      let scriptUrl: string | null = null;
      if (evtOrMsg && evtOrMsg instanceof ErrorEvent) {
        message = String(evtOrMsg.message || "ErrorEvent");
        scriptUrl = evtOrMsg.filename || null;
        stack = (evtOrMsg.error && evtOrMsg.error.stack) || `${message} at ${scriptUrl}:${evtOrMsg.lineno}:${evtOrMsg.colno}`;
      } else {
        message = String(evtOrMsg);
        stack = err?.stack || `${message} at ${src}:${line}:${col}`;
        scriptUrl = typeof src === "string" ? src : null;
      }

      let mapped = stack;
      try {
        if (scriptUrl) {
          // 先尝试直接取 map
          const tryFetchMap = async (mapUrl: string) => {
            const r = await fetch(mapUrl);
            if (!r.ok) throw new Error("no map");
            return await r.json();
          };

          let smap: any = null;
          try {
            smap = await tryFetchMap(scriptUrl + ".map");
          } catch {
            // 失败则尝试解析脚本里的 sourceMappingURL
            try {
              const scriptText = await fetch(scriptUrl).then(r => r.text());
              const m = scriptText.match(/\/\/[#@]\s*sourceMappingURL\s*=\s*(\S+)/);
              if (m && m[1]) {
                const mapUrl = new URL(m[1].trim(), scriptUrl).toString();
                smap = await tryFetchMap(mapUrl);
              }
            } catch {
              // 忽略
            }
          }

          if (smap) {
            const consumer = await new SourceMapConsumer(smap);
            mapped = stack
              .split("\n")
              .map((l: string) => {
                const m = l.match(/(https?:\/\/[^:\s)]+):(\d+):(\d+)/) || l.match(/:(\d+):(\d+)/);
                if (m) {
                  const ln = parseInt(m[m.length - 2], 10);
                  const cn = parseInt(m[m.length - 1], 10);
                  // 尝试不同 column 偏移（有的工具列以0或1为起点）
                  for (const c of [cn, Math.max(0, cn - 1), cn + 1]) {
                    try {
                      const pos = consumer.originalPositionFor({ line: ln, column: c });
                      if (pos && pos.source) {
                        const name = pos.name ? ` (${pos.name})` : "";
                        return `${pos.source}:${pos.line}:${pos.column}${name}`;
                      }
                    } catch { /* ignore */ }
                  }
                }
                return l;
              })
              .join("\n");
            try { consumer.destroy(); } catch {}
          }
        }
      } catch (e) {
        // 不影响主流程
      }

      addLog({ id: `${Date.now()}-error`, type: "error", message, stack: mapped, collapsed: true });
    };

    // 支持两种方式捕获（兼容）
    const oldOnError = window.onerror;
    window.onerror = (...args: any[]) => {
      handleErrorEvent(...args);
      if (typeof oldOnError === "function") oldOnError.apply(window, args);
    };

    const onUnhandledRejection = (ev: PromiseRejectionEvent) => {
      const reason = ev.reason;
      const msg = reason?.message || String(reason);
      const stack = reason?.stack || msg;
      addLog({ id: `${Date.now()}-urej`, type: "error", message: msg, stack, collapsed: true });
    };
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.onerror = oldOnError as any;
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [addLog]);

  // ---- fetch 拦截 ----
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const wrapped = async (input: any, init: any = {}) => {
      const method = ((init && init.method) || (typeof input === "string" ? "GET" : input?.method) || "GET").toUpperCase();
      const url = typeof input === "string" ? input : input?.url || String(input);
      const options: any = { ...init };
      if ("body" in options) options.body = serializeBody(options.body);

      const meta = { method, url, options };
      try {
        const res = await originalFetch(input, init);
        let text = "";
        try { text = await res.clone().text(); } catch {}
        addLog({
          id: `${Date.now()}-net`,
          type: res.ok ? "network" : "error",
          message: `[${method}] ${url} → ${res.status}`,
          stack: text,
          meta,
        });
        return res;
      } catch (err: any) {
        addLog({
          id: `${Date.now()}-neterr`,
          type: "error",
          message: `[${method}] ${url} → 请求失败`,
          stack: String(err?.message || err),
          meta,
        });
        throw err;
      }
    };
    // 覆盖
    (window as any).fetch = wrapped;
    return () => {
      (window as any).fetch = originalFetch;
    };
  }, [addLog]);

  // 控制台运行 JS
  const runConsoleCode = useCallback(() => {
    const code = consoleInputRef.current?.value;
    if (!code || !code.trim()) return;
    addLog({ id: `${Date.now()}-eval-in`, type: "info", message: `> ${code}` });
    try {
      // eslint-disable-next-line no-eval
      const result = eval(code);
      addLog({ id: `${Date.now()}-eval-out`, type: "info", message: `<- ${String(result)}` });
    } catch (e: any) {
      addLog({ id: `${Date.now()}-eval-err`, type: "error", message: String(e) });
    }
    if (consoleInputRef.current) consoleInputRef.current.value = "";
  }, [addLog]);

  // 复制日志到剪贴板（使用 logsRef 保证最新）
  const copyLogs = useCallback(async () => {
    const text = logsRef.current.map(l => `[${l.type.toUpperCase()}] ${l.message}${l.stack ? `\n${l.stack}` : ""}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      addLog({ id: `${Date.now()}-copy`, type: "info", message: "已复制日志到剪贴板" });
    } catch {
      addLog({ id: `${Date.now()}-copy-err`, type: "error", message: "复制失败" });
    }
  }, [addLog]);

  const clearLogs = useCallback(() => {
    updateLogsState([]);
    addLog({ id: `${Date.now()}-info-clear`, type: "info", message: "已清除日志" });
  }, [updateLogsState, addLog]);

  const toggleCollapse = useCallback((id: string) => {
    updateLogsState(logsRef.current.map(l => (l.id === id ? { ...l, collapsed: !l.collapsed } : l)));
  }, [updateLogsState]);

  const filteredLogs = logs.filter(l => l.message.toLowerCase().includes(filter.toLowerCase()));

  // ---- 智能分析 & 重试 弹窗 ----
  const runAnalysis = useCallback(async () => {
    addLog({ id: `${Date.now()}-analysis-start`, type: "info", message: "正在运行智能分析..." });

    const logsSnapshot = [...logsRef.current];

    const analyzeCurrentState = async (): Promise<AnalysisReport> => {
      const findings: ReportFinding[] = [];
      const fatal = logsSnapshot.find(l => l.type === "error");
      if (fatal) findings.push({ status: "error", description: fatal.message, details: fatal.stack });
      else findings.push({ status: "ok", description: "未检测到致命错误" });

      logsSnapshot.filter(l => l.type === "network" || (l.type === "error" && l.message.includes("→"))).forEach(l => {
        findings.push({ status: l.type === "error" ? "warning" : "info", description: l.message, details: l.stack });
      });

      logsSnapshot.filter(l => l.type === "lint").forEach(l => findings.push({ status: "info", description: l.message }));
      return {
        title: "综合诊断报告",
        findings,
        potentialCauses: ["请根据上面红/黄/蓝提示定位问题", "检查后端 / 检查网络 / 检查 source map 是否可访问"],
        suggestedActions: ["查看错误详情", "重试请求", "检查后端日志"],
      };
    };

    const report = await analyzeCurrentState();

    const lastErr = logsSnapshot.slice().reverse().find(l => l.type === "error" && l.meta?.url) ?? logsSnapshot.slice().reverse().find(l => l.type === "error" && /\b(GET|POST|PUT|DELETE)\b/.test(l.message));
    let retryMeta = lastErr?.meta ?? null;
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
          const backoff = Math.min(10000, 500 * Math.pow(2, i));
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
  }, [addLog]);

  // ---- Resize handler using pointer events ----
  const onResizePointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    const target = e.currentTarget as Element;
    try { (target as any).setPointerCapture?.(e.pointerId); } catch {}
    const moveHandler = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const delta = startYRef.current - ev.clientY;
      setHeight(Math.max(120, startHeightRef.current + delta));
    };
    const upHandler = (ev: PointerEvent) => {
      draggingRef.current = false;
      try { (target as any).releasePointerCapture?.(e.pointerId); } catch {}
      window.removeEventListener("pointermove", moveHandler);
      window.removeEventListener("pointerup", upHandler);
    };
    window.addEventListener("pointermove", moveHandler);
    window.addEventListener("pointerup", upHandler);
  }, [height]);

  // ---- UI ----
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
        onClick={handleToggleVisible}
        onPointerUp={handleToggleVisible}
        onTouchEnd={handleToggleVisible}
      >
        Debug
      </button>

      {visible && (
        <div style={{ position: "fixed", bottom: 0, left: 0, width: "100%", height, maxHeight: "90%", background: "#111", color: "#fff", fontFamily: "monospace", fontSize: 12, zIndex: 119999, display: "flex", flexDirection: "column" }}>
          <div style={{ height: 10, background: "#333", cursor: "ns-resize" }} onPointerDown={onResizePointerDown}></div>

          <div style={{ display: "flex", gap: 8, padding: 8, alignItems: "center", borderBottom: "1px solid #333" }}>
            <input placeholder="搜索日志" value={filter} onChange={e => setFilter(e.target.value)} style={{ flexGrow: 1, minWidth: 120, padding: 6, background: "#222", color: "#fff", border: "1px solid #333", borderRadius: 4 }} />
            <button onClick={runAnalysis}>诊断</button>
            <button onClick={clearLogs}>清除</button>
            <button onClick={copyLogs}>复制</button>
          </div>

          <div style={{ flexGrow: 1, overflowY: "auto", padding: 8 }}>
            {filteredLogs.map(l => (
              <div key={l.id} style={{ borderBottom: "1px solid #222", padding: "6px 4px", color: l.type === "error" ? "#f48771" : l.type === "network" ? "#cca700" : "#d4d4d4" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1, cursor: l.stack ? "pointer" : "default" }} onClick={() => l.stack && toggleCollapse(l.id)}>
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
