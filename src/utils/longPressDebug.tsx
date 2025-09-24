import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import DebugReport, { AnalysisReport, ReportFinding } from "../components/DebugReport.tsx";
import { SourceMapConsumer } from "source-map-js";

type LogType = "error" | "network" | "lint" | "info";

interface DebugLog {
  id: string;
  type: LogType;
  message: string;
  stack?: string;
  file?: string;
  line?: number;
  collapsed?: boolean;
}

export const LongPressDebug: React.FC = () => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [filter, setFilter] = useState("");
  const [visible, setVisible] = useState(false);
  const consoleInputRef = useRef<HTMLTextAreaElement>(null);

  // 面板高度拖拽
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
    setHeight(Math.max(100, startHeightRef.current + delta));
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

  // Fatal Error 捕获
  useEffect(() => {
    window.onerror = async function (msg, src, line, col, err) {
      let stack = err?.stack || `${msg} at ${src}:${line}:${col}`;
      let mappedStack = stack;
      try {
        const mapUrl = src + ".map";
        const res = await fetch(mapUrl);
        if (res.ok) {
          const smap = await res.json();
          const consumer = await new SourceMapConsumer(smap);
          mappedStack = stack
            .split("\n")
            .map((l) => {
              const match = l.match(/:(\d+):(\d+)/);
              if (match) {
                const lineNum = parseInt(match[1], 10);
                const colNum = parseInt(match[2], 10);
                const pos = consumer.originalPositionFor({ line: lineNum, column: colNum });
                if (pos.source) return `${pos.source}:${pos.line}:${pos.column}`;
              }
              return l;
            })
            .join("\n");
          consumer.destroy();
        }
      } catch {}
      addLog({ id: Date.now() + "-error", type: "error", message: String(msg), stack: mappedStack, collapsed: true });
    };
  }, []);

  // 网络请求捕获
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = (...args: any) => {
      const stack = new Error().stack || "";
      addLog({ id: Date.now() + "-network", type: "network", message: String(args[0]), stack, collapsed: true });
      return originalFetch(...args);
    };
  }, []);

  const addLog = (log: DebugLog) => setLogs((prev) => [log, ...prev]);

  // 控制台运行 JS
  const runConsoleCode = () => {
    if (!consoleInputRef.current) return;
    const code = consoleInputRef.current.value;
    if (!code.trim()) return;
    addLog({ id: Date.now() + "-info", type: "info", message: "> " + code });
    try {
      const result = window.eval(code);
      addLog({ id: Date.now() + "-info", type: "info", message: "<- " + result });
    } catch (e: any) {
      addLog({ id: Date.now() + "-error", type: "error", message: String(e) });
    }
    consoleInputRef.current.value = "";
  };

  const clearLogs = () => setLogs([]);
  const copyLogs = () => navigator.clipboard.writeText(logs.map((l) => `${l.type}: ${l.message}`).join("\n"));
  const toggleCollapse = (id: string) => setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, collapsed: !l.collapsed } : l)));
  const filteredLogs = logs.filter((l) => l.message.toLowerCase().includes(filter.toLowerCase()));
  const getColor = (type: LogType) => ({ error: "red", network: "yellow", lint: "cyan", info: "white" }[type]);

  // 智能分析报告
  const runAnalysis = async () => {
  addLog({ id: "analysis", type: "info", message: "正在运行智能分析..." });
  const report: AnalysisReport = await analyzeCurrentState();

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.background = "rgba(0,0,0,0.7)";
  container.style.zIndex = "100001";
  document.body.appendChild(container);

  const close = () => container.remove();

  ReactDOM.createRoot(container).render(
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "#222",
        padding: 20,
        borderRadius: 8,
        width: "90%",
        maxWidth: 600,
        maxHeight: "80%",
        overflowY: "auto",
        color: "#fff",
      }}
    >
      <button
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: "red",
          color: "white",
          border: "none",
          borderRadius: 4,
          padding: "4px 8px",
          cursor: "pointer",
        }}
        onClick={close}
      >
        关闭
      </button>
      <DebugReport report={report} />
    </div>
  );
};

  async function analyzeCurrentState(): Promise<AnalysisReport> {
    let findings: ReportFinding[] = [];
    const fatalError = logs.find((l) => l.type === "error");
    if (fatalError) findings.push({ status: "error", description: fatalError.message, details: fatalError.stack });
    else findings.push({ status: "ok", description: "未检测到致命错误" });

    logs.filter((l) => l.type === "network").forEach((l) => findings.push({ status: "warning", description: l.message, details: l.stack }));
    logs.filter((l) => l.type === "lint").forEach((l) => findings.push({ status: "info", description: l.message }));

    return { title: "综合诊断报告", findings, potentialCauses: ["请检查红/黄/蓝提示"], suggestedActions: ["查看报错行、网络请求或代码风格问题"] };
  }

  return (
    <>
      {/* Debug 按钮 */}
      <button
        style={{
          position: "fixed",
          right: 10,
          bottom: 65,
          width: 50,
          height: 50,
          borderRadius: 25,
          background: "#007acc",
          color: "#fff",
          zIndex: 100000,
          fontSize: 12
        }}
        onClick={() => setVisible(!visible)}
      >
        Debug
      </button>

      {/* 面板 */}
      {visible && (
        <div style={{ position: "fixed", bottom: 0, left: 0, width: "100%", height, maxHeight: "90%", background: "#111", color: "#fff", fontFamily: "monospace", fontSize: 12, overflowY: "auto", zIndex: 99999, display: "flex", flexDirection: "column" }}>
          {/* 拖拽条 */}
          <div style={{ height: 10, background: "#333", cursor: "ns-resize", flexShrink: 0 }} onTouchStart={onTouchStart}></div>

          {/* 控制面板内容 */}
          <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
            <div style={{ display: "flex", gap: 8, padding: 4, flexWrap: "wrap" }}>
              <input placeholder="搜索日志" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ flexGrow: 1, minWidth: 120 }} />
              <button onClick={runAnalysis}>开始诊断</button>
              <button onClick={clearLogs}>清除</button>
              <button onClick={copyLogs}>复制</button>
            </div>

            {/* 日志列表 */}
            <div style={{ flexGrow: 1, overflowY: "auto", padding: 4 }}>
              {filteredLogs.map((l) => (
                <div key={l.id} style={{ borderBottom: "1px solid #333", color: getColor(l.type), cursor: l.stack ? "pointer" : "default", padding: "2px 0" }} onClick={() => l.stack && toggleCollapse(l.id)}>
                  <div>[{l.type.toUpperCase()}] {l.message}</div>
                  {l.stack && !l.collapsed && <pre style={{ color: "#ccc", whiteSpace: "pre-wrap" }}>{l.stack}</pre>}
                </div>
              ))}
            </div>

            {/* 控制台 */}
            <div style={{ borderTop: "1px solid #333", padding: 4 }}>
              <textarea ref={consoleInputRef} rows={3} style={{ width: "100%", background: "#222", color: "#fff", fontFamily: "monospace", fontSize: 12, resize: "vertical" }} placeholder="输入 JS 代码 (Ctrl+Enter 运行)"></textarea>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginTop: 4 }}>
                <button onClick={runConsoleCode}>运行</button>
                <button onClick={clearLogs}>清除</button>
                <button onClick={copyLogs}>复制</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// 安装入口
export function installLongPressDebug() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  ReactDOM.render(<LongPressDebug />, container);
}
