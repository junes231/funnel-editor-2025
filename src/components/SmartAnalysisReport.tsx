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

  // --- 1. 变现潜力分析 (优化为对比分析) ---
  let totalLinksFound = 0;
  let totalClicks = 0;
  let maxClicks = 0; // 用于对比的基准
  
  // 遍历所有问题和答案，收集数据
  questions.forEach((q) => {
    Object.values(q.answers).forEach((a, aIndex) => {
      const isLinked = q.data?.affiliateLinks?.[aIndex] && q.data.affiliateLinks[aIndex].trim() !== '';
      const clicks = a.clickCount || 0;
      
      if (isLinked) {
        totalLinksFound++;
        totalClicks += clicks;
        if (clicks > maxClicks) {
          maxClicks = clicks; // 更新最高点击数
        }
      }
    });
  });

  // A. 变现评分逻辑：如果最高点击数大于 10，则以最高点击数作为优化潜力基准，否则以设置的链接数计算。
  if (totalClicks > 0 && maxClicks > 0) {
    // 评分：基于最高点击率 vs 平均点击率（最高点击数越多，证明变现潜力越大）
    const avgClicks = totalClicks / totalLinksFound;
    // 使用对比度公式：最高点击数是平均点击数的多少倍，作为评分因子
    const contrastFactor = maxClicks / (avgClicks || 1);
    report.monetization.score = Math.min(100, Math.round(50 + contrastFactor * 10)); // 基础 50 分 + 对比度奖励
  } else if (totalLinksFound > 0) {
     // 如果设置了链接但没有点击，得分 50
    report.monetization.score = 50;
  } else {
    // 没设置链接，0 分
    report.monetization.score = 0;
  }

  // B. 变现建议逻辑：找出低于平均值 50% 的答案，建议优化
  const avgClicks = totalLinksFound > 0 ? totalClicks / totalLinksFound : 0;
  
  if (totalClicks === 0 && totalLinksFound > 0) {
    report.monetization.suggestions.push("⚠️ Warning: Your funnel is linked, but the total number of clicks is 0. Please ensure that your Cloud Run service (track-click) It is deployed correctly and the permissions are correct.");
  } else if (totalLinksFound === 0) {
    report.monetization.suggestions.push("❌ Serious: No affiliate links are set for any answers. You need to set at least one link to track monetization potential.");
  } else {
    questions.forEach((q, qIndex) => {
      Object.values(q.answers).forEach((a, aIndex) => {
        const isLinked = q.data?.affiliateLinks?.[aIndex] && q.data.affiliateLinks[aIndex].trim() !== '';
        const clicks = a.clickCount || 0;
        
        if (isLinked && clicks < avgClicks * 0.5 && avgClicks > 0.5) {
          report.monetization.suggestions.push(`Optimization Opportunities: Problems ${qIndex + 1} The answer"${a.text}" Number of clicks (${clicks}) Well below average (${avgClicks.toFixed(1)})。Consider optimizing your copy or making a more enticing offer.`);
        } else if (isLinked && clicks === 0 && avgClicks > 0) {
          report.monetization.suggestions.push(`Key optimization: Problems ${qIndex + 1} The answer "${a.text}" The link exists but the number of clicks is 0。This is a weakness in the current monetization chain.`);
        }
      });
    });
    if (report.monetization.suggestions.length === 0) {
        report.monetization.suggestions.push(`✅ The monetization setup looks great and you've got ${totalClicks} Total clicks. Please continue to promote!`);
    }
  }


  // --- 2. 用户参与度和内容清晰度分析 (Content Clarity 增加关键检查) ---
  
  // 参与度（保持大部分逻辑）
  let engagementScore = 100;
  if (questions.length < 3 || questions.length > 6) engagementScore -= 25;
  const repetitiveStarts = questions.filter(q => q.title.toLowerCase().startsWith("what's your")).length;
  if (repetitiveStarts > questions.length / 2 && questions.length > 1) {
    engagementScore -= 20;
    report.engagement.suggestions.push("TIP: Multiple questions start with similar phrases. Try to vary your wording to keep users engaged.");
  }
  report.engagement.score = Math.max(0, engagementScore);
  if (report.engagement.suggestions.length === 0 && questions.length > 0) {
       report.engagement.suggestions.push("✅ The quizzes were excellent in terms of length and wording variety.");
  }

  // 清晰度 (增加强制链接检查)
  let clarityScore = 100;
  questions.forEach((q, index) => {
    if (q.title.split(' ').length > 15) {
      clarityScore -= 10;
      report.clarity.suggestions.push(`question ${index + 1}'s title is very long. Consider simplifying it.`);
    }
     if (Object.values(q.answers).some(a => a.text.split(' ').length > 7)) {
      clarityScore -= 5;
      report.clarity.suggestions.push(`Some answers in Question ${index + 1} are a bit wordy. Shorter answers are easier to read.`);
    }
  });

  // ↓↓↓ 关键检查：强制要求设置最终重定向链接 ↓↓↓
  if (!finalRedirectLink || finalRedirectLink.trim() === '') {
      clarityScore -= 50;
      report.clarity.suggestions.push("❌ CRITICAL: You haven't set a final redirect link. The user journey is incomplete.");
  }
  // ↑↑↑ 关键检查 ↑↑↑
  
  if (totalLinksFound === 0) {
      clarityScore -= 30; // 如果没有设置任何联盟链接，降低清晰度得分
      report.clarity.suggestions.push("⚠️ Warning: There are no affiliate links in any of the answers. This means that the conversion path after the user completes the quiz is missing.");
  }

  report.clarity.score = Math.max(0, clarityScore);
  if (report.clarity.suggestions.length === 0) {
      report.clarity.suggestions.push("✅ The content and conversion endpoints are clearly defined.");
  }

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
