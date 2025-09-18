import React from 'react';
import { FunnelComponent } from '../../../types/funnel';
import './QuizComponent.css';

interface QuizComponentProps {
  funnelId: string; // 新增 funnelId
  component: FunnelComponent;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<FunnelComponent>) => void;
}

const QuizComponent: React.FC<QuizComponentProps> = ({
  funnelId,
  component,
  isSelected,
  onSelect,
  onUpdate,
}) => {
  const { data, position, id: questionId } = component;

  // 新增：处理答案点击的函数
  const handleAnswerClick = async (answerId: string) => {
    try {
      // 替换为您的 Firebase Functions 的实际 URL
      const response = await fetch('https://trackclick-jgett3ucqq-uc.a.run.app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            funnelId: funnelId,
            questionId: questionId,
            answerId: answerId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to track click.');
      }
      console.log('Click tracked successfully.');
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  return (
    <div
      className={`quiz-component ${isSelected ? 'selected' : ''}`}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        backgroundColor: data.backgroundColor,
        color: data.textColor,
      }}
      onClick={onSelect}
    >
      <div className="quiz-preview">
        <h3 className="quiz-question">{data.question}</h3>
        
        <div className="quiz-answers">
          {data.answers?.map((answer, index) => (
            <button
              key={answer.id} // 使用 answer.id 作为 key
              className="quiz-answer-btn"
              style={{
                backgroundColor: data.buttonColor,
                color: data.buttonTextColor,
              }}
              // 新增：添加 onClick 事件
              onClick={() => handleAnswerClick(answer.id)}
            >
              {answer.text || `Answer ${index + 1}`}
            </button>
          ))}
        </div>
      </div>
      
      {isSelected && (
        <div className="component-controls">
          <button className="control-btn">✏️</button>
          <button className="control-btn">🗑️</button>
          <button className="control-btn">📋</button>
        </div>
      )}
    </div>
  );
};

export default QuizComponent;
