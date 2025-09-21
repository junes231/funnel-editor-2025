import React from 'react';
import './DebugReport.css'; // 我们将在下一步创建这个 CSS 文件

export interface ReportFinding {
  status: 'ok' | 'error' | 'warning' | 'info';
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
  if (!report) {
    return <div className="debug-report"><p>点击上方按钮开始诊断...</p></div>;
  }

  const getStatusIcon = (status: ReportFinding['status']) => {
    switch (status) {
      case 'ok': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '';
    }
  };

  return (
    <div className="debug-report">
      <h2>{report.title}</h2>

      <div className="report-section">
        <h3>[发现] Findings</h3>
        <ul className="findings-list">
          {report.findings.map((finding, index) => (
            <li key={index} className={`finding-item status-${finding.status}`}>
              <span className="status-icon">{getStatusIcon(finding.status)}</span>
              <div className="finding-content">
                <p className="finding-description">{finding.description}</p>
                {finding.details && <pre className="finding-details">{finding.details}</pre>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="report-section">
        <h3>[可能原因] Potential Causes</h3>
        <ul>
          {report.potentialCauses.map((cause, index) => <li key={index}>{cause}</li>)}
        </ul>
      </div>

      <div className="report-section">
        <h3>[建议操作] Suggested Actions</h3>
        <ul>
          {report.suggestedActions.map((action, index) => <li key={index}>{action}</li>)}
        </ul>
      </div>
    </div>
  );
};

export default DebugReport;
