import React, { useCallback, useEffect, useState } from 'react';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { Funnel, FunnelData, Question, defaultFunnelData } from '../../../types/funnel.ts';
import { QuestionForm } from './QuestionForm.tsx';
import { QuizEditor } from './QuizEditor.tsx';
import { LinkSettings } from './LinkSettings.tsx';
import { ColorCustomizer } from './ColorCustomizer.tsx';

interface Props {
  db: Firestore;
  updateFunnelData: (id: string, data: FunnelData) => Promise<void>;
  notify: (m: string, t?: 'success' | 'error') => void;
}

type SubView =
  | 'mainEditorDashboard'
  | 'quizEditorList'
  | 'questionForm'
  | 'linkSettings'
  | 'colorCustomizer';

export const FunnelEditor: React.FC<Props> = ({
  db,
  updateFunnelData,
  notify
}) => {
  const { funnelId } = useParams<{ funnelId: string }>();
  const [funnelName, setFunnelName] = useState('Loading...');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [finalRedirectLink, setFinalRedirectLink] = useState('');
  const [tracking, setTracking] = useState('');
  const [conversionGoal, setConversionGoal] = useState('Product Purchase');
  const [primaryColor, setPrimaryColor] = useState(defaultFunnelData.primaryColor);
  const [buttonColor, setButtonColor] = useState(defaultFunnelData.buttonColor);
  const [backgroundColor, setBackgroundColor] = useState(defaultFunnelData.backgroundColor);
  const [textColor, setTextColor] = useState(defaultFunnelData.textColor);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [currentSubView, setCurrentSubView] = useState<SubView>('mainEditorDashboard');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [debugLinkValue, setDebugLinkValue] = useState('Debug: N/A');

  useEffect(() => {
    const load = async () => {
      if (!funnelId) return;
      const ref = doc(db, 'funnels', funnelId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        alert('Funnel not found');
        window.location.hash = '#/';
        return;
      }
      const f = snap.data() as Funnel;
      setFunnelName(f.name);
      setQuestions(f.data.questions || []);
      setFinalRedirectLink(f.data.finalRedirectLink || '');
      setTracking(f.data.tracking || '');
      setConversionGoal(f.data.conversionGoal || 'Product Purchase');
      setPrimaryColor(f.data.primaryColor || defaultFunnelData.primaryColor);
      setButtonColor(f.data.buttonColor || defaultFunnelData.buttonColor);
      setBackgroundColor(f.data.backgroundColor || defaultFunnelData.backgroundColor);
      setTextColor(f.data.textColor || defaultFunnelData.textColor);
      setDebugLinkValue(`Loaded: ${f.data.finalRedirectLink || 'Empty'}`);
      setIsDataLoaded(true);
    };
    load();
  }, [funnelId, db]);

  const save = useCallback(() => {
    if (!funnelId) return;
    const newData: FunnelData = {
      questions,
      finalRedirectLink,
      tracking,
      conversionGoal,
      primaryColor,
      buttonColor,
      backgroundColor,
      textColor
    };
    setDebugLinkValue(`Saving: ${finalRedirectLink || 'Empty'}`);
    updateFunnelData(funnelId, newData);
  }, [
    funnelId,
    questions,
    finalRedirectLink,
    tracking,
    conversionGoal,
    primaryColor,
    buttonColor,
    backgroundColor,
    textColor,
    updateFunnelData
  ]);

  useEffect(() => {
    if (!isDataLoaded) return;
    const handle = setTimeout(save, 500);
    return () => clearTimeout(handle);
  }, [
    questions,
    finalRedirectLink,
    tracking,
    conversionGoal,
    primaryColor,
    buttonColor,
    backgroundColor,
    textColor,
    save,
    isDataLoaded
  ]);

  function handleAddQuestion() {
    if (questions.length >= 6) {
      alert('Max 6 questions');
      return;
    }
    const newQ: Question = {
      id: Date.now().toString(),
      title: `New Question ${questions.length + 1}`,
      type: 'single-choice',
      answers: Array(4).fill(null).map((_, i) => ({
        id: `option-${Date.now()}-${i}`,
        text: `Option ${String.fromCharCode(65 + i)}`
      }))
    };
    setQuestions(q => [...q, newQ]);
    setSelectedQuestionIndex(questions.length);
    setCurrentSubView('questionForm');
  }

  function handleEditQuestion(i: number) {
    setSelectedQuestionIndex(i);
    setCurrentSubView('questionForm');
  }

  function handleDeleteQuestion() {
    if (selectedQuestionIndex === null) return;
    setQuestions(q => q.filter((_, idx) => idx !== selectedQuestionIndex));
    setSelectedQuestionIndex(null);
    notify('Question deleted');
    setCurrentSubView('quizEditorList');
  }

  function handleImportQuestions(imported: Question[]) {
    if (questions.length + imported.length > 6) {
      notify('Import would exceed 6-question limit', 'error');
      return;
    }
    const valid = imported.filter(q =>
      q.title &&
      q.title.trim() !== '' &&
      Array.isArray(q.answers) &&
      q.answers.length > 0 &&
      q.answers.every(a => a.text && a.text.trim() !== '')
    );
    if (!valid.length) {
      notify('No valid questions in file', 'error');
      return;
    }
    setQuestions(prev => [...prev, ...valid]);
    notify(`Imported ${valid.length} questions`);
  }

  function renderContent() {
    switch (currentSubView) {
      case 'quizEditorList':
        return (
          <QuizEditor
            questions={questions}
            onAddQuestion={handleAddQuestion}
            onEditQuestion={handleEditQuestion}
            onBack={() => setCurrentSubView('mainEditorDashboard')}
            onImportQuestions={handleImportQuestions}
          />
        );
      case 'questionForm': {
        const q = selectedQuestionIndex !== null ? questions[selectedQuestionIndex] : undefined;
        return (
          <QuestionForm
            question={q}
            questionIndex={selectedQuestionIndex}
            onSave={qq => {
              if (selectedQuestionIndex === null) return;
              setQuestions(prev => {
                const copy = [...prev];
                copy[selectedQuestionIndex] = qq;
                return copy;
              });
              setSelectedQuestionIndex(null);
              setCurrentSubView('quizEditorList');
            }}
            onCancel={() => {
              setSelectedQuestionIndex(null);
              setCurrentSubView('quizEditorList');
            }}
            onDelete={handleDeleteQuestion}
          />
        );
      }
      case 'linkSettings':
        return (
          <LinkSettings
            finalRedirectLink={finalRedirectLink}
            setFinalRedirectLink={setFinalRedirectLink}
            tracking={tracking}
            setTracking={setTracking}
            conversionGoal={conversionGoal}
            setConversionGoal={setConversionGoal}
            onBack={() => setCurrentSubView('mainEditorDashboard')}
            notify={notify}
          />
        );
      case 'colorCustomizer':
        return (
          <ColorCustomizer
            primaryColor={primaryColor}
            setPrimaryColor={setPrimaryColor}
            buttonColor={buttonColor}
            setButtonColor={setButtonColor}
            backgroundColor={backgroundColor}
            setBackgroundColor={setBackgroundColor}
            textColor={textColor}
            setTextColor={setTextColor}
            onBack={() => setCurrentSubView('mainEditorDashboard')}
            notify={notify}
          />
        );
      default:
        return (
          <div className="dashboard-container">
            <h2>🥞 {funnelName} Editor</h2>
            <p>Manage components for this funnel.</p>

            <div className="dashboard-card" onClick={() => setCurrentSubView('quizEditorList')}>
              <h3>📝 Interactive Quiz Builder</h3>
              <p>Manage quiz questions.</p>
            </div>

            <div className="dashboard-card" onClick={() => setCurrentSubView('linkSettings')}>
              <h3>🔗 Final Redirect Link Settings</h3>
              <p>Configure final redirect link & tracking.</p>
            </div>

            <div className="dashboard-card" onClick={() => setCurrentSubView('colorCustomizer')}>
              <h3>🎨 Color Customization</h3>
              <p>Customize theme colors.</p>
            </div>

            <button
              className="back-button"
              onClick={() => window.location.hash = '#/'}
            >
              ← Back to All Funnels
            </button>

            <div style={{
              marginTop: 20,
              padding: 10,
              border: '1px dashed #ccc',
              fontSize: '0.8em'
            }}>
              <strong>DEBUG:</strong> {debugLinkValue}
            </div>
          </div>
        );
    }
  }

  return <>{renderContent()}</>;
};
