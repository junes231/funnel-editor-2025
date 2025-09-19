// 文件路径: src/components/SmartAnalysisReport.tsx

import React from 'react';
import BackButton from './BackButton.tsx';

// [中文注释] 组件所需的类型定义...
interface Answer { id: string; text: string; clickCount?: number; }
interface Question {
  id: string;
  title: string;
  type: 'single-choice' | 'text-input';
  answers: { [answerId: string]: Answer }; // Changed from Answer[] to object/Map
  data?: { affiliateLinks?: string[]; };
}
interface SmartAnalysisReportProps {
  questions: Question[];
  finalRedirectLink: string;
  onBack: () => void;
}

// [中文注释] 这是“智能分析报告”功能的主组件
const SmartAnalysisReport: React.FC<SmartAnalysisReportProps> = ({ questions, finalRedirectLink, onBack }) => {
  
  // [中文注释] 分析逻辑... (这部分保持不变)
  const analyzeFunnel = () => {
  const report = {
    monetization: { score: 0, suggestions: [] as string[] },
    engagement: { score: 0, suggestions: [] as string[] },
    clarity: { score: 0, suggestions: [] as string[] },
  };
  if (questions.length === 0) return report;

  // --- 变现潜力分析 (核心升级) ---
  const totalClicks = questions.reduce((total, q) => 
    total + (Object.values(q.answers).reduce((answerTotal, a) => answerTotal + (a.clickCount || 0), 0)), 
  0);

  const totalAnswersWithLinks = questions.reduce((acc, q) => 
      acc + (q.data?.affiliateLinks?.filter(link => link && link.trim() !== '').length || 0), 
  0);

  // 新的评分标准：基于平均点击数。假设每个带链接的答案平均获得5次点击算满分。
  const averageClicks = totalAnswersWithLinks > 0 ? totalClicks / totalAnswersWithLinks : 0;
  report.monetization.score = Math.min(100, Math.round((averageClicks / 5) * 100)); // 最高100分

  // 提供基于真实点击数据的建议
  if (totalClicks === 0) {
    report.monetization.suggestions.push("Note: Your funnel doesn't have any clickthrough data yet. Share your funnel link to start collecting user feedback!");
  } else {
    questions.forEach((q, qIndex) => {
      Object.values(q.answers).forEach((a, aIndex) => {
        const hasLink = q.data?.affiliateLinks?.[aIndex]?.trim();
        if (hasLink && (a.clickCount || 0) > 5) {
          report.monetization.suggestions.push(`Outstanding performance: Question ${qIndex + 1} The answer"${a.text}" Obtained ${a.clickCount} Clicks, very popular!`);
        }
        if (hasLink && (a.clickCount || 0) === 0) {
          report.monetization.suggestions.push(`Optimization suggestion: Problem ${qIndex + 1} The answer"${a.text}" If there is a link but 0 clicks, you can try to optimize the copy or offer.`);
        }
      });
    });
  }
  if (report.monetization.suggestions.length === 0) {
    report.monetization.suggestions.push("Your monetization setup looks great and you've already received some clicks!");
  }


  // --- 用户参与度和内容清晰度分析 (保持不变) ---
  let engagementScore = 100;
  if (questions.length < 3 || questions.length > 6) engagementScore -= 25;
  const repetitiveStarts = questions.filter(q => q.title.toLowerCase().startsWith("what's your")).length;
  if (repetitiveStarts > questions.length / 2 && questions.length > 1) {
    engagementScore -= 20;
    report.engagement.suggestions.push("TIP: Multiple questions start with similar phrases. Try to vary your wording to keep users engaged.");
  }
  report.engagement.score = Math.max(0, engagementScore);
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
  if (!finalRedirectLink || finalRedirectLink.trim() === '') {
      clarityScore -= 50;
      report.clarity.suggestions.push("CRITICAL: You haven't set a final redirect link. The user journey is incomplete.");
  }
  report.clarity.score = Math.max(0, clarityScore);
  return report;
};

  const report = analyzeFunnel();
  const overallScore = Math.round((report.monetization.score + report.engagement.score + report.clarity.score) / 3);

  const getScoreColorClass = (score: number) => {
    if (score < 40) return 'score-low';
    if (score < 75) return 'score-medium';
    return 'score-high';
  };

  // [中文注释] 渲染分析报告的 JSX 界面 (已优化结构)
  return (
    <div className="smart-analysis-container">
      <div className="smart-analysis-header">
        <h2>Smart Analysis Report</h2>
        <div className={`overall-score-circle ${getScoreColorClass(overallScore)}`}>
          <strong>{overallScore}</strong>
          <span>Overall Score</span>
        </div>
      </div>
      
      <div className="analysis-section">
        <div className="section-header">
          <h3>Monetization Potential</h3>
          <span className={`score-badge ${getScoreColorClass(report.monetization.score)}`}>{report.monetization.score}/100</span>
        </div>
        {report.monetization.suggestions.length > 0 && (
          <ul>{report.monetization.suggestions.map((text, i) => <li key={i}>{text}</li>)}</ul>
        )}
      </div>

      <div className="analysis-section">
        <div className="section-header">
          <h3>User Engagement</h3>
          <span className={`score-badge ${getScoreColorClass(report.engagement.score)}`}>{report.engagement.score}/100</span>
        </div>
        {report.engagement.suggestions.length > 0 && (
          <ul>{report.engagement.suggestions.map((text, i) => <li key={i}>{text}</li>)}</ul>
        )}
      </div>

      <div className="analysis-section">
        <div className="section-header">
          <h3>Content Clarity</h3>
          <span className={`score-badge ${getScoreColorClass(report.clarity.score)}`}>{report.clarity.score}/100</span>
        </div>
        {report.clarity.suggestions.length > 0 && (
          <ul>{report.clarity.suggestions.map((text, i) => <li key={i}>{text}</li>)}</ul>
        )}
      </div>
      
      <BackButton to="/">
          <span role="img" aria-label="back">←</span> Back to All Funnels
      </BackButton>
    </div>
  );
};

export default SmartAnalysisReport;
