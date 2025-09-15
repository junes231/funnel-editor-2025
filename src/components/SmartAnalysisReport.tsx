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
const BackButton: React.FC<{ to?: string; children: React.ReactNode }> = ({ to, children }) => {
  // [中文注释] 注意：这个按钮的动画和跳转逻辑现在由通用的 BackButton 组件处理
  // [中文注释] 我们在这里简化它以便于理解，确保您的通用 BackButton.tsx 文件是正确的
  const navigateTo = () => {
    if (to) window.location.hash = to;
  };
  return (
    <button className="back-button" onClick={navigateTo}>
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
    if (repetitiveStarts > questions.length / 2 && questions.length > 1) {
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

    // [中文注释] 关键修正：当最终链接缺失时，不仅要提示，还要扣分
    if (!finalRedirectLink || finalRedirectLink.trim() === '') {
        clarityScore -= 50; // [中文注释] 这是一个严重问题，所以扣除大量分数
        report.clarity.suggestions.push("CRITICAL: You haven't set a final redirect link. The user journey is incomplete.");
    }
    report.clarity.score = Math.max(0, clarityScore);

    return report;
  };

  const report = analyzeFunnel();
  const overallScore = Math.round((report.monetization.score + report.engagement.score + report.clarity.score) / 3);

  const getScoreColor = (score: number) => {
    if (score < 40) return 'score-low';
    if (score < 75) return 'score-medium';
    return 'score-high';
  };

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
        {/* [中文注释] 关键修正：只有在有建议时才渲染列表 */}
        {report.monetization.suggestions.length > 0 && (
          <ul>{report.monetization.suggestions.map((text, i) => <li key={i}>{text}</li>)}</ul>
        )}
      </div>

      <div className="analysis-section">
        <h3 className={getScoreColor(report.engagement.score)}>User Engagement: {report.engagement.score}/100</h3>
        {report.engagement.suggestions.length > 0 && (
          <ul>{report.engagement.suggestions.map((text, i) => <li key={i}>{text}</li>)}</ul>
        )}
      </div>

      <div className="analysis-section">
        <h3 className={getScoreColor(report.clarity.score)}>Content Clarity: {report.clarity.score}/100</h3>
        {report.clarity.suggestions.length > 0 && (
          <ul>{report.clarity.suggestions.map((text, i) => <li key={i}>{text}</li>)}</ul>
        )}
      </div>
      
      {/* [中文注释] 注意：这个按钮现在应该使用您项目中的通用 BackButton 组件 */}
      <BackButton to="/">
          <span role="img" aria-label="back">←</span> Back to All Funnels
      </BackButton>
    </div>
  );
};

export default SmartAnalysisReport;
