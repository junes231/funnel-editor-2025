import React from 'react';
import { FunnelComponent } from '../../../types/funnel';
import './QuizComponent.css';

interface QuizComponentProps {
  component: FunnelComponent;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<FunnelComponent>) => void;
}

const QuizComponent: React.FC<QuizComponentProps> = ({
  component,
  isSelected,
  onSelect,
  onUpdate,
}) => {
  const { data, position } = component;

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
          {data.answers.map((answer: string, index: number) => (
            <button
              key={index}
              className="quiz-answer-btn"
              style={{
                backgroundColor: data.buttonColor,
                color: data.buttonTextColor,
              }}
            >
              {answer || `Answer ${index + 1}`}
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
