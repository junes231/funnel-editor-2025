import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDoc, doc } from 'firebase/firestore';

interface Answer {
  id: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  answers: { [key: string]: Answer };
  data?: { affiliateLinks?: string[] };
}

interface FunnelData {
  questions: Question[];
  finalRedirectLink?: string;
}

interface QuizPlayerProps {
  db: any;
}

const defaultFunnelData: FunnelData = { questions: [] };

const QuizPlayer: React.FC<QuizPlayerProps> = ({ db }) => {
  const { funnelId } = useParams<{ funnelId: string }>();
  const navigate = useNavigate();
  const debounceRef = useRef(false);
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [clickedAnswerIndex, setClickedAnswerIndex] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = funnelData?.questions[currentQuestionIndex];

  useEffect(() => {
    const getFunnelForPlay = async () => {
      if (!funnelId) {
        setError('No funnel ID provided!');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const funnelDocRef = doc(db, 'funnels', funnelId);
        const funnelDoc = await getDoc(funnelDocRef);
        if (funnelDoc.exists()) {
          const funnel = funnelDoc.data() as { data: FunnelData };
          const compatibleFunnelData = { ...defaultFunnelData, ...funnel.data };
          if (compatibleFunnelData.questions) {
            compatibleFunnelData.questions = compatibleFunnelData.questions.map(question => {
              if (Array.isArray(question.answers)) {
                const answersObj: { [answerId: string]: Answer } = {};
                question.answers.forEach((answer: Answer) => {
                  answersObj[answer.id] = answer;
                });
                return { ...question, answers: answersObj };
              }
              return question;
            });
          }
          setFunnelData(compatibleFunnelData);
        } else {
          setError('Funnel not found!');
        }
      } catch (err) {
        console.error('Error loading funnel for play:', err);
        setError('Failed to load quiz.');
      } finally {
        setIsLoading(false);
      }
    };
    getFunnelForPlay();
  }, [funnelId, db]);

  const handleAnswerClick = async (answerIndex: number, answerId: string) => {
    if (isAnimating || !funnelData || !currentQuestion) return;

    setIsAnimating(true);
    setClickedAnswerIndex(answerIndex);

    const affiliateLink = currentQuestion?.data?.affiliateLinks?.[answerIndex];

    if (funnelId && currentQuestion.id && answerId) {
      const trackClickEndpoint = "https://api-track-click-jgett3ucqq-uc.a.run.app/trackClick";
      fetch(trackClickEndpoint, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: { funnelId, questionId: currentQuestion.id, answerId },
        }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.error) console.error("API Error:", data.error);
        else console.log("Tracking successful:", data);
      })
      .catch(err => console.error("Tracking failed:", err));
    }

    if (affiliateLink && affiliateLink.trim() !== "") {
      window.open(affiliateLink, "_blank");
    }

    setTimeout(() => {
      setIsAnimating(false);
      setClickedAnswerIndex(null);
      if (!funnelData) return;

      const isLastQuestion = currentQuestionIndex >= funnelData.questions.length - 1;
      if (isLastQuestion) {
        const redirectLink = funnelData.finalRedirectLink;
        if (redirectLink && redirectLink.trim() !== "") {
          window.location.href = redirectLink;
        } else {
          console.log("Quiz complete! No final redirect link set.");
        }
        return;
      }

      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }, 500);
  };

  if (isLoading) {
    return (
      <div className="quiz-player-container" style={{ textAlign: 'center', marginTop: '80px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff4f81', animation: 'pulse 1.5s infinite' }}>
          Ready to unlock your secret match? 🔥
        </h2>
      </div>
    );
  }

  if (error || !funnelData || funnelData.questions.length === 0) {
    return (
      <div className="quiz-player-container">
        <h2>{error ? 'Error Loading Quiz' : 'Quiz Not Ready'}</h2>
        <p>{error || 'This funnel has no questions configured.'}</p>
      </div>
    );
  }

  return (
    <div className="quiz-player-container">
      <h2>{currentQuestion.text}</h2>
      {Object.values(currentQuestion.answers).map((answer, index) => (
        <button
          key={answer.id}
          onClick={() => handleAnswerClick(index, answer.id)}
          style={{
            background: clickedAnswerIndex === index && isAnimating ? '#e0e0e0' : '#007acc',
            color: 'white',
            padding: '10px',
            margin: '5px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            transition: 'background 0.5s',
          }}
        >
          {answer.text}
        </button>
      ))}
    </div>
  );
};

export default QuizPlayer;
