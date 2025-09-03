import React, { useEffect, useState } from 'react';
import { Answer, Question } from '../../../types/funnel.ts';

interface Props {
  question?: Question;
  questionIndex: number | null;
  onSave: (q: Question) => void;
  onCancel: () => void;
  onDelete: () => void;
}

export const QuestionForm: React.FC<Props> = ({
  question,
  questionIndex,
  onSave,
  onCancel,
  onDelete
}) => {
  const [title, setTitle] = useState(question ? question.title : '');
  const [answers, setAnswers] = useState<Answer[]>(
    question?.answers?.length
      ? question.answers
      : Array(4).fill(null).map((_, i) => ({
          id: `option-${Date.now()}-${i}`,
          text: `Option ${String.fromCharCode(65 + i)}`
        }))
  );

  useEffect(() => {
    setTitle(question ? question.title : '');
    if (question?.answers?.length) setAnswers(question.answers);
  }, [question]);

  function handleAnswerChange(i: number, value: string) {
    setAnswers(prev => {
      const copy = [...prev];
      if (!copy[i]) {
        copy[i] = {
          id: `option-${Date.now()}-${i}`,
          text: ''
        };
      }
      copy[i].text = value;
      return copy;
    });
  }

  function handleSave() {
    const filtered = answers.filter(a => a.text.trim() !== '');
    if (!title.trim()) return;
    if (!filtered.length) return;
    onSave({
      id: question?.id || Date.now().toString(),
      title,
      type: 'single-choice',
      answers: filtered
    });
  }

  return (
    <div className="question-form-container">
      <h2>📝 Quiz Question Editor</h2>
      <p className="question-index-display">
        {questionIndex !== null
          ? `Editing Question ${questionIndex + 1} of 6`
          : 'Adding New Question'}
      </p>
      <div className="form-group">
        <label>Question Title:</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g., What is your goal?"
        />
      </div>
      <div className="form-group">
        <label>Question Type:</label>
        <select value="single-choice" disabled>
          <option>Single Choice</option>
        </select>
      </div>
      <div className="answer-options-section">
        <p>Answer Options (Max 4):</p>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="answer-input-group">
            <input
              value={answers[i]?.text || ''}
              onChange={e => handleAnswerChange(i, e.target.value)}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
            />
          </div>
        ))}
      </div>
      <div className="form-actions">
        <button className="save-button" onClick={handleSave}>💾 Save Question</button>
        <button className="cancel-button" onClick={onCancel}>← Back to List</button>
        {questionIndex !== null && (
          <button className="delete-button" onClick={onDelete}>🗑️ Delete Question</button>
        )}
      </div>
    </div>
  );
};
