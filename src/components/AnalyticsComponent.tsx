// 文件路径: src/components/AnalyticsComponent.tsx

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


// [中文注释] 定义分析组件所需的 props 类型
interface AnalyticsComponentProps {
  questions: Question[];
  finalRedirectLink: string;
  onBack: () => void;
}

// [中文注释] 这是“极简分析”功能的主组件
const AnalyticsComponent: React.FC<AnalyticsComponentProps> = ({ questions, finalRedirectLink, onBack }) => {
  
  // [中文注释] 分析漏斗并返回一个建议数组的函数
  const analyzeFunnel = () => {
    const suggestions: { type: 'tip' | 'warning'; text: string }[] = [];

    // [中文注释] 1. 检查漏斗的长度（按照您的要求，超过6个问题才警告）
    if (questions.length < 3) {
      suggestions.push({ type: 'tip', text: 'With less than 3 questions, you might not be getting enough information to propertly segment users.' });
    }
    if (questions.length > 6) {
        suggestions.push({ type: 'warning', text: "Having more than 6 questions may cause users to churn. Make sure each question is absolutely necessary." });
    }

    // [中文注释] 2. 检查问题和答案的质量
    questions.forEach((q, index) => {
      if (q.title.length < 10) {
        suggestions.push({ type: 'tip', text: `Question ${index + 1}'s title is too short. Try making it more descriptive.` });
      }
      if (q.answers.some(a => a.text.length < 2 || a.text.length > 35)) {
        suggestions.push({ type: 'warning', text: `Some answers in Question ${index + 1} are too short or too long. Keep them between 2 and 35 characters.` });
      }
    });

    // [中文注释] 3. 检查盈利潜力（推广链接的数量）
    const linksCount = questions.reduce((acc, q) => {
      return acc + (q.data?.affiliateLinks?.filter(link => link && link.trim() !== '').length || 0);
    }, 0);

    if (linksCount === 0) {
      suggestions.push({ type: 'warning', text: 'You have not configured any affiliate links for your answers. This is a missed monetization opportunity!' });
    }

    // [中文注释] 4. 检查最终重定向链接是否设置
    if (!finalRedirectLink || finalRedirectLink.trim() === '') {
        suggestions.push({ type: 'warning', text: "You haven't set a final redirect link. Users will have nowhere to go after answering all the questions." });
    }

    return suggestions;
  };

  const analysisResults = analyzeFunnel();

  // [中文注释] 渲染分析报告的 JSX 界面
  return (
    <div className="analytics-container">
      <h2>
        <span role="img" aria-label="analytics">📊</span> 
        Minimal Analysis Report
      </h2>
      <p>Based on your current setup, here are some areas for improvement:</p>
      
      <div className="suggestions-list">
        {analysisResults.length > 0 ? (
          analysisResults.map((suggestion, index) => (
            <div key={index} className={`suggestion-card ${suggestion.type}`}>
              <span className="suggestion-icon">{suggestion.type === 'tip' ? '💡' : '⚠️'}</span>
              <p>{suggestion.text}</p>
            </div>
          ))
        ) : (
          <div className="suggestion-card good">
            <span className="suggestion-icon">✅</span>
            <p>Great! According to our minimal analysis, your funnel setup looks good!</p>
          </div>
        )}
      </div>

      <BackButton onClick={onBack}>
        <span role="img" aria-label="back">←</span> Back to Editor
      </BackButton>
    </div>
  );
};

export default AnalyticsComponent;
