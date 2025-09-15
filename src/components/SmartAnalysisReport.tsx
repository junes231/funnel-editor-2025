// 文件路径: src/components/SmartAnalysisReport.tsx

import React from 'react';

// [中文注释] 定义 App.tsx 中用到的类型，让这个组件可以独立工作
interface Answer {
  id: string;
  text: string;
}

interface Question {
  id: string;
  title: string;
  type: 'single-choice' | 'text-input';
  answers: Answer[];
  data?: {
    affiliateLinks?: string[];
  };
}

// [中文注释] 这是一个自包含的返回按钮组件
const BackButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => {
  return (
    <button className="back-button" onClick={onClick}>
      {children}
    </button>
  );
};


// [中文注释] 定义智能分析组件所需的 props 类型
interface SmartAnalysisReportProps {
  questions: Question[];
  finalRedirectLink: string;
  onBack: () => void;
}

// [中文注释] 这是“智能分析报告”功能的主组件
const SmartAnalysisReport: React.FC<SmartAnalysisReportProps> = ({ questions, finalRedirectLink, onBack }) => {
  
  // [中文注释] 执行智能分析并返回一个包含各类建议的报告对象
  const analyzeFunnel = () => {
    const report = {
      monetization: { score: 0, suggestions: [] as string[] },
      engagement: { score: 0, suggestions: [] as string[] },
      clarity: { score: 0, suggestions: [] as string[] },
    };

    if (questions.length === 0) return report;

    // --- 1. 盈利潜力分析 (Monetization Analysis) ---
    const totalAnswers = questions.reduce((acc, q) => acc + q.answers.length, 0);
    const answersWithLinks = questions.reduce((acc, q) => {
        return acc + (q.data?.affiliateLinks?.filter(link => link && link.trim() !== '').length || 0);
    }, 0);
    
    report.monetization.score = totalAnswers > 0 ? Math.round((answersWithLinks / totalAnswers) * 100) : 0;
    if (report.monetization.score < 30) {
      report.monetization.suggestions.push("CRITICAL: Monetization is very low. Add affiliate links to most of your answers to increase earnings.");
    } else if (report.monetization.score < 70) {
      report.monetization.suggestions.push("TIP: Good start, but you can still add more affiliate links to answers that currently have none.");
    }

    // --- 2. 用户参与度分析 (Engagement Analysis) ---
    let engagementScore = 100;
    if (questions.length < 3 || questions.length > 6) engagementScore -= 25;
    
    const repetitiveStarts = questions.filter(q => q.title.toLowerCase().startsWith("what's your")).length;
    if (repetitiveStarts > questions.length / 2) {
      engagementScore -= 20;
      report.engagement.suggestions.push("TIP: Multiple questions start with similar phrases. Try to vary your wording to keep users engaged.");
    }
    report.engagement.score = Math.max(0, engagementScore);

    // --- 3. 内容清晰度分析 (Clarity Analysis) ---
    let clarityScore = 100;
    questions.forEach((q, index) => {
      if (q.title.split(' ').length > 15) {
        clarityScore -= 10;
        report.clarity.suggestions.push(`Question ${index + 1}'s title is very long. Consider simplifying it.`);
      }
      if (q.answers.some(a => a.text.split(' ').length > 7)) {
        clarityScore -= 5;
        report.clarity.suggestions.push(`Some answers in Question ${index + 1} are a bit wordy. Shorter answers are easier to read.`);
      }
    });
    report.clarity.score = Math.max(0, clarityScore);

    // [中文注释] 检查最终链接
    if (!finalRedirectLink || finalRedirectLink.trim() === '') {
        report.clarity.suggestions.push("CRITICAL: You haven't set a final redirect link. The user journey is incomplete.");
    }

    return report;
  };

  const report = analyzeFunnel();
  const overallScore = Math.round((report.monetization.score + report.engagement.score + report.clarity.score) / 3);

  // [中文注释] 根据分数决定总评颜色
  const getScoreColor = (score: number) => {
    if (score < 40) return 'score-low';
    if (score < 75) return 'score-medium';
    return 'score-high';
  };

  // [中文注释] 渲染分析报告的 JSX 界面
  return (
    <div className="smart-analysis-container">
      <div className="smart-analysis-header">
        <h2>Smart Analysis Report</h2>
        <div className={`overall-score ${getScoreColor(overallScore)}`}>
          <span>Overall Score</span>
          <strong>{overallScore}</strong>
        </div>
      </div>
      
      <div className="analysis-section">
        <h3 className={getScoreColor(report.monetization.score)}>Monetization Potential: {report.monetization.score}/100</h3>
        <ul>{report.monetization.suggestions.map((text, i) => <li key={i}>{text}</li>)}</ul>
      </div>

      <div className="analysis-section">
        <h3 className={getScoreColor(report.engagement.score)}>User Engagement: {report.engagement.score}/100</h3>
        <ul>{report.engagement.suggestions.map((text, i) => <li key={i}>{text}</li>)}</ul>
      </div>

      <div className="analysis-section">
        <h3 className={getScoreColor(report.clarity.score)}>Content Clarity: {report.clarity.score}/100</h3>
        <ul>{report.clarity.suggestions.map((text, i) => <li key={i}>{text}</li>)}</ul>
      </div>

      <BackButton to="/">
         <span role="img" aria-label="back">←</span> Back to All Funnels
      </BackButton>
    </div>
  );
};

export default SmartAnalysisReport;
