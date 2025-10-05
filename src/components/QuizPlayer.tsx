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
  primaryColor?: string;
  buttonColor?: string;
  backgroundColor?: string;
  textColor?: string;
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

  // [中文注释] 从数据库加载漏斗数据... (这部分逻辑保持不变)
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
          const funnel = funnelDoc.data() as Funnel;
          
          // Add backward compatibility: convert answers from array to object if needed
          const compatibleFunnelData = { ...defaultFunnelData, ...funnel.data };
          if (compatibleFunnelData.questions) {
            compatibleFunnelData.questions = compatibleFunnelData.questions.map(question => {
              if (Array.isArray(question.answers)) {
                // Convert legacy array format to object format
                const answersObj: { [answerId: string]: Answer } = {};
                question.answers.forEach((answer: Answer) => {
                  answersObj[answer.id] = answer;
                });
                return { ...question, answers: answersObj };
              }
              return question; // Already in object format
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

  // [中文注释] 关键升级：这是新的 handleAnswerClick 函数
  
const handleAnswerClick = async (answerIndex: number, answerId: string) => {
  if (isAnimating || !funnelData) return;

  setIsAnimating(true);
  setClickedAnswerIndex(answerIndex);

  const affiliateLink = currentQuestion?.data?.affiliateLinks?.[answerIndex];

  if (funnelId && currentQuestion?.id && answerId) {
    const trackClickEndpoint = "https://api-track-click-jgett3ucqq-uc.a.run.app/trackClick";
    fetch(trackClickEndpoint, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { funnelId, questionId: currentQuestion.id, answerId },
      }),
    })
    .then(response => {
      if (!response.ok) {
        console.error("Failed to track click (API Error):", response.statusText);
        // 确保即使 API 失败，前端流程也能继续（即进入 setTimeout 块）
        // 这里只是记录错误，然后让代码继续执行到 setTimeout
        // 无需抛出异常，否则可能会跳过后面的 setTimeout 逻辑
      }
      return response.json().catch(() => ({})); // 即使 JSON 解析失败也返回空对象
    })
    .then(data => console.log("Tracking successful:", data))
    .catch(err => console.error("Tracking failed:", err.message || err));
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

 // [中文注释] 组件的 JSX 渲染部分保持不变...
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

   const currentQuestion = funnelData.questions[currentQuestionIndex];

  // 2. 增加一个防御性检查：如果 currentQuestion 因为某种原因不存在，就显示加载状态
  if (!currentQuestion) {
    return (
      <div className="quiz-player-container">
        <p>Loading next question...</p>
      </div>
    );
  }

  // 3. 现在可以安全地使用 currentQuestion 了
  const sortedAnswers = (currentQuestion.answers 
    ? Object.values(currentQuestion.answers) 
    : []
  ).sort((a, b) => a.text.localeCompare(b.text));

  const quizPlayerContainerStyle = {
    '--primary-color': funnelData.primaryColor,
    '--button-color': funnelData.buttonColor,
    '--background-color': funnelData.backgroundColor,
    '--text-color': funnelData.textColor,
  } as React.CSSProperties;
    
  return (
    <div className="quiz-player-container" 
     style={{
         // 【中文注释：修复：直接应用背景色和文字颜色，确保其优先级高于外部 CSS 默认值。】
         backgroundColor: funnelData.backgroundColor, 
         color: funnelData.textColor,
         ...quizPlayerContainerStyle 
       } as React.CSSProperties}
    >
      <h3 style={{ color: 'var(--text-color)' }}>{currentQuestion?.title || 'Loading question...'}</h3>
      <div className="quiz-answers-container">
 {sortedAnswers.map((answer, index) => {
  const match = answer.text.match(/^([A-Z]\.)\s*(.*)$/);
  const prefix = match ? match[1] : "";
  const content = match ? match[2] : answer.text;

  return (
    <button
      key={answer.id}
      className={`quiz-answer-button ${clickedAnswerIndex === index ? 'selected-answer animating' : ''}`}
      onClick={() => handleAnswerClick(index, answer.id)}
      disabled={isAnimating}
      style={{ backgroundColor: 'var(--button-color)', color: 'var(--text-color)', borderColor: 'var(--primary-color)' }}
      >
      <span className="answer-prefix">{prefix}</span>
      <span className="answer-content">{content}</span>
    </button>
  );
})}
      </div>
    </div>
  );
};

export default QuizPlayer;
