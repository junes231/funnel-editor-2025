import React from 'react';
import { FunnelComponent } from '../../../types/funnel.ts';
import './QuizComponent.css';

// Helper function to handle both array and object formats for answers
const getAnswersAsArray = (answers: any): { id: string; text: string; }[] => {
  if (!answers) return [];
  if (Array.isArray(answers)) return answers;
  if (typeof answers === 'object') return Object.values(answers);
  return [];
};

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
        <h3 className="quiz-question">{data.title}</h3>
        
        <div className="quiz-answers">
          {getAnswersAsArray(data.answers).map((answer: { id: string; text: string; }, index: number) => (
            <button
              key={answer.id || index}
              className="quiz-answer-btn"
              style={{
                backgroundColor: data.buttonColor,
                color: data.buttonTextColor,
              }}
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
