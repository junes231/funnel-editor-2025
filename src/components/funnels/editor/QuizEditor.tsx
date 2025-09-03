import React, { ChangeEvent, useRef } from 'react';
import { Question } from '../../../types/funnel.ts';

interface Props {
  questions: Question[];
  onAddQuestion: () => void;
  onEditQuestion: (i: number) => void;
  onBack: () => void;
  onImportQuestions: (q: Question[]) => void;
}

export const QuizEditor: React.FC<Props> = ({
  questions,
  onAddQuestion,
  onEditQuestion,
  onBack,
  onImportQuestions
}) => {
  const fileRef = useRef<HTMLInputElement>(null);

  function trigger() {
    fileRef.current?.click();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) { alert('No file'); return; }
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      alert('Select a JSON file');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) { alert('Invalid JSON: expected array'); return; }
        const valid = parsed
          .filter((q: any) =>
            q.title &&
            q.title.trim() !== '' &&
            Array.isArray(q.answers) &&
            q.answers.length &&
            q.answers.every((a: any) => a.text && a.text.trim() !== '')
          )
          .map((q: any) => ({
            id: Date.now().toString() + Math.random(),
            title: q.title,
            type: q.type || 'single-choice',
            answers: q.answers.map((a: any) => ({
              id: a.id || Date.now().toString() + Math.random(),
              text: a.text
            }))
          }));
        if (!valid.length) { alert('No valid questions'); return; }
        onImportQuestions(valid);
        alert(`Imported ${valid.length} question(s)`);
      } catch {
        alert('Parse error');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="quiz-editor-container">
      <h2>📝 Quiz Question List</h2>
      <div className="quiz-editor-actions">
        <button className="add-button" onClick={onAddQuestion}>➕ Add New Question</button>
        <button className="import-button" onClick={trigger}>📥 Import Questions</button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {questions.length === 0 ? (
        <p className="no-questions-message">No questions yet.</p>
      ) : (
        <ul className="question-list">
          {questions.map((q, i) => (
            <li
              key={q.id}
              className="question-item"
              onClick={() => onEditQuestion(i)}
            >
              Question {i + 1}: {q.title}
            </li>
          ))}
        </ul>
      )}

      <button className="back-button" onClick={onBack}>← Back to Funnel Dashboard</button>
    </div>
  );
};
