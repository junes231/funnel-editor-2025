import React, { useState } from "react";
import "./DebugReport.css";

export interface ReportFinding {
  status: "ok" | "error" | "warning" | "info";
  description: string;
  details?: string;
}

export interface AnalysisReport {
  title: string;
  findings: ReportFinding[];
  potentialCauses: string[];
  suggestedActions: string[];
}

interface DebugReportProps {
  report: AnalysisReport | null;
}

const DebugReport: React.FC<DebugReportProps> = ({ report }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!report) {
    return (
      <div className="debug-report">
        <p>点击上方按钮开始诊断...</p>
      </div>
    );
  }

  const getStatusIcon = (status: ReportFinding["status"]) => {
    switch (status) {
      case "ok":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "";
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      alert("✅ 报告已复制到剪贴板");
    } catch {
      alert("❌ 复制失败");
    }
  };

  return (
    <div className="debug-report">
      <div className="report-header">
        <h2>{report.title}</h2>
        <button onClick={handleCopy}>📋 复制报告</button>
      </div>

      {/* Findings */}
      <div className="report-section">
        <h3>[发现] Findings</h3>
        <div className="findings-list">
          {report.findings.map((finding, index) => (
            <div
              key={index}
              className={`finding-card status-${finding.status}`}
              onClick={() =>
                setExpandedIndex(expandedIndex === index ? null : index)
              }
            >
              <div className="finding-header">
                <span className="status-icon">{getStatusIcon(finding.status)}</span>
                <span className="finding-description">
                  {finding.description}
                </span>
              </div>
              {finding.details && expandedIndex === index && (
                <pre className="finding-details">{finding.details}</pre>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Potential Causes */}
      <div className="report-section">
        <h3>[可能原因] Potential Causes</h3>
        <ul className="causes-list">
          {report.potentialCauses.map((cause, index) => (
            <li key={index}>🔍 {cause}</li>
          ))}
        </ul>
      </div>

      {/* Suggested Actions */}
      <div className="report-section">
        <h3>[建议操作] Suggested Actions</h3>
        <ul className="actions-list">
          {report.suggestedActions.map((action, index) => (
            <li key={index}>👉 {action}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DebugReport;
