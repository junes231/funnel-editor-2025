import React, { useEffect, useState } from 'react';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { Funnel, FunnelData, defaultFunnelData } from '../../types/funnel.ts';

interface Props {
  db: Firestore;
}

export const QuizPlayer: React.FC<Props> = ({ db }) => {
  const { funnelId } = useParams<{ funnelId: string }>();
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [clickedAnswerIndex, setClickedAnswerIndex] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!funnelId) { setError('Missing funnel ID'); setLoading(false); return; }
      setLoading(true);
      try {
        const ref = doc(db, 'funnels', funnelId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError('Funnel not found');
        } else {
          const raw = snap.data() as Funnel;
          setFunnelData({ ...defaultFunnelData, ...raw.data });
        }
      } catch {
        setError('Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [funnelId, db]);

  function handleAnswerClick(i: number) {
    if (isAnimating || !funnelData) return;
    setIsAnimating(true);
    setClickedAnswerIndex(i);

    setTimeout(() => {
      setIsAnimating(false);
      setClickedAnswerIndex(null);

      if (!funnelData.questions.length) return;

      // Completed 6th question (index 5) when total is 6
      if (currentQuestionIndex === 5 && funnelData.questions.length === 6) {
        let link = funnelData.finalRedirectLink || 'https://example.com/default-final-redirect-link';
        if (funnelData.tracking?.trim()) {
          link += (link.includes('?') ? '&' : '?') + funnelData.tracking.trim();
        }
        window.location.href = link;
        return;
      }

      if (currentQuestionIndex < funnelData.questions.length - 1) {
        setCurrentQuestionIndex(idx => idx + 1);
      } else {
        alert('Quiz complete!');
      }
    }, 500);
  }

  if (loading) return <div style={{ textAlign: 'center', marginTop: 80 }}><h2>Loading quiz...</h2></div>;
  if (error) return <div><h2>Error</h2><p>{error}</p></div>;
  if (!funnelData || !funnelData.questions.length) return <div><h2>Quiz Not Ready</h2></div>;

  const q = funnelData.questions[currentQuestionIndex];
  const style = {
    '--primary-color': funnelData.primaryColor,
    '--button-color': funnelData.buttonColor,
    '--background-color': funnelData.backgroundColor,
    '--text-color': funnelData.textColor,
    backgroundColor: funnelData.backgroundColor,
    color: funnelData.textColor
  } as React.CSSProperties;

  return (
    <div className="quiz-player-container" style={style}>
      <h3>{q.title}</h3>
      <div className="quiz-answers-container">
        {q.answers.map((a, idx) => (
          <button
            key={a.id}
            className={`quiz-answer-button ${clickedAnswerIndex === idx ? 'selected-answer animating' : ''}`}
            onClick={() => handleAnswerClick(idx)}
            disabled={isAnimating}
            style={{
              backgroundColor: 'var(--button-color)',
              color: 'var(--text-color)',
              borderColor: 'var(--primary-color)'
            }}
          >
            {a.text}
          </button>
        ))}
      </div>
    </div>
  );
};
