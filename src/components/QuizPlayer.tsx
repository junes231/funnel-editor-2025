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

  setIsAnimating(true); // 1. 立即开始动画
  setClickedAnswerIndex(answerIndex);

  const affiliateLink = currentQuestion?.data?.affiliateLinks?.[answerIndex];

  // --- 2. 异步启动点击追踪（不使用 await，确保不阻塞主线程） ---
  if (funnelId && currentQuestion?.id && answerId) {
    const trackClickEndpoint = "https://api-track-click-jgett3ucqq-uc.a.run.app/trackClick";
    
    // 异步启动 fetch，不使用 await
    fetch(trackClickEndpoint, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          funnelId: funnelId,
          questionId: currentQuestion.id,
          answerId: answerId,
        },
      }),
    })
    .then(response => {
      // 追踪成功或失败，都在后台处理，不影响用户流程
      if (!response.ok) {
        console.error("Failed to track click (API Error):", response.statusText);
      }
    })
    .catch(err => {
      console.error("Failed to track click (Network or other error):", err);
    });
  }
  
  // --- 3. 立即打开按答案配置的推广链接 (如果存在) ---
  // 无论是否追踪成功，都立即打开链接（在新的标签页中），不阻塞流程
  if (affiliateLink && affiliateLink.trim() !== "") {
    window.open(affiliateLink, "_blank");
  }

  // --- 4. 动画结束后跳转（500ms 延迟，实现半秒动画）---
  setTimeout(() => {
    setIsAnimating(false);
    setClickedAnswerIndex(null);
    if (!funnelData) return;

    const isLastQuestion = currentQuestionIndex >= funnelData.questions.length - 1;

    if (isLastQuestion) {
      // 如果是最后一个问题，跳转到最终重定向链接
      const redirectLink = funnelData.finalRedirectLink;
      if (redirectLink && redirectLink.trim() !== "") {
        window.location.href = redirectLink; 
      } else {
        console.log("Quiz complete! No final redirect link set.");
      }
      return;
    }

    // 跳转到下一个问题
    setCurrentQuestionIndex(currentQuestionIndex + 1); 
  }, 500); // 500ms 延迟，实现半秒动画
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
    <div className="quiz-player-container" style={quizPlayerContainerStyle}>
      {/* --- 安全性增强：在访问 title 之前也检查 currentQuestion --- */}
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
