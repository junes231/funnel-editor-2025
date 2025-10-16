import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDoc, doc } from 'firebase/firestore';
import { FunnelData, FunnelOutcome, ScoreOutcomeMapping, Answer } from '../types/funnel.ts';
// 【中文注释：简化后的 FunnelStep 接口，只关注问答属性】
interface FunnelStep {
  id: string;
  // 【中文注释：这里不再需要 type: 'quiz' | 'form'，因为它被视为 'quiz'】
  // 【中文注释：为兼容旧的 Question 结构，使用 title 或 text 字段】
  title?: string; 
  text?: string;
  answers?: { [key: string]: Answer };
  data?: { affiliateLinks?: string[] };
}

// 【中文注释：FunnelData 接口，包含 Lead Capture 的全局配置】
interface FunnelData {
  questions: FunnelStep[];
  finalRedirectLink?: string;
  primaryColor?: string;
  buttonColor?: string;
  backgroundColor?: string;
  textColor?: string;
  // 【中文注释：新增：Lead Capture 配置】
  enableLeadCapture?: boolean;
  leadCaptureWebhookUrl?: string;
}

interface QuizPlayerProps {
  db: any;
}

const defaultFunnelData: FunnelData = { questions: [] };

const findMatchingOutcome = (totalScore: number, outcomes: FunnelOutcome[], mappings: ScoreOutcomeMapping[]): FunnelOutcome | null => {
  if (!mappings || !outcomes) return null;
  
  // 1. 查找匹配的分数范围
  const matchingMapping = mappings.find(m => totalScore >= m.minScore && totalScore <= m.maxScore);

  if (!matchingMapping) {
    // 如果没有找到匹配的映射，尝试返回默认结果
    return outcomes.find(o => o.id === 'default-result') || null;
  }

  // 2. 查找匹配的结果对象
  return outcomes.find(o => o.id === matchingMapping.outcomeId) || null;
};
// ----------------------------------------------------------------------
// 辅助组件：Lead Capture 表单 (内联定义)
// ----------------------------------------------------------------------

interface LeadCaptureFormData { name: string, email: string }
interface LeadCaptureFormProps {
    onSuccess: (data: LeadCaptureFormData) => Promise<void>;
    buttonColor: string;
    textColor: string;
}

const LeadCaptureForm: React.FC<LeadCaptureFormProps> = ({ onSuccess, buttonColor, textColor }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

     const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!name.trim() || !email.trim()) {
            setError('Both name and email are required.');
            return;
        }
        setIsSubmitting(true);
        try {
            await onSuccess({ name, email });
            // ✅ 如果 onSuccess 成功，这里会继续，不需要额外的成功逻辑
        } catch (e: any) {
            // 🐛 重点修改：将错误提示改为警告，并假设如果到达这里是 Load Failed，数据可能仍已发送。
            // 实际生产环境中，如果 Webhook 成功触发，数据可能已经记录。
            console.error("Webhook submission failed (Network Error or CORS):", e);
            // 假设提交已经成功（因为Zapier返回了200，但浏览器报错Load failed），继续进行重定向。
            // 这一步是为了让用户流程继续，而不是卡死。
            setError('Warning: Network error detected. Proceeding to results...'); 
             await onSuccess({ name, email });
        } finally {
            setIsSubmitting(false);
           }
          };

    return (
        <form onSubmit={handleSubmit} style={{padding: '20px', border: `1px solid ${buttonColor}`, borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'}}>
            <h3 className="quiz-question-title" style={{color: textColor, marginBottom: '20px'}}>Grab Your Personalized Results!</h3>
            
            {error && <p style={{color: '#d32f2f', marginBottom: '15px'}}>{error}</p>}

            <div style={{marginBottom: '10px'}}>
                <input type="text" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} required 
                       className="quiz-answer-button" 
                       style={{backgroundColor: '#f8f9fa', color: textColor, textAlign: 'left', minHeight: '50px'}} />
            </div>
            <div style={{marginBottom: '20px'}}>
                <input type="email" placeholder="Your Email" value={email} onChange={e => setEmail(e.target.value)} required
                       className="quiz-answer-button" 
                       style={{backgroundColor: '#f8f9fa', color: textColor, textAlign: 'left', minHeight: '50px'}} />
            </div>
            <button type="submit" disabled={isSubmitting} 
                    className="quiz-answer-button" 
                    style={{backgroundColor: buttonColor, color: '#ffffff', minHeight: '55px'}}>
                {isSubmitting ? 'Sending...' : 'Get My Results!'}
            </button>
        </form>
    );
};

interface ExclusiveResultPageProps {
  outcome: FunnelOutcome;
  buttonColor: string;
  textColor: string;
}

const ExclusiveResultPage: React.FC<ExclusiveResultPageProps> = ({ outcome, buttonColor, textColor }) => {
  const handleCtaClick = () => {
    if (outcome.ctaLink) {
      window.location.href = outcome.ctaLink;
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h3 className="quiz-question-title" style={{ color: textColor, marginBottom: '20px' }}>
        {outcome.title || "Your exclusive results"}
      </h3>
      
      {outcome.imageUrl && (
        <img 
          src={outcome.imageUrl} 
          alt={outcome.name} 
          style={{ 
            maxWidth: '100%', 
            maxHeight: '300px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          }} 
        />
      )}
      
      <p style={{ color: textColor, lineHeight: 1.6, marginBottom: '30px' }}>
        {outcome.summary || "This is a report summary customized based on your responses."}
      </p>

      {outcome.ctaLink && (
        <button 
          onClick={handleCtaClick}
          className="quiz-answer-button" 
          style={{ backgroundColor: buttonColor, color: '#ffffff', minHeight: '55px' }}
        >
          Check out your exclusive recommendations now →
        </button>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// 主组件：QuizPlayer
// ----------------------------------------------------------------------
const QuizPlayer: React.FC<QuizPlayerProps> = ({ db }) => {
  const { funnelId } = useParams<{ funnelId: string }>();
  const navigate = useNavigate();
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [clickedAnswerIndex, setClickedAnswerIndex] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 【中文注释：新增状态来控制是否显示 Lead Capture 表单】
  const [showLeadCapture, setShowLeadCapture] = useState(false);
   const [totalScore, setTotalScore] = useState(0);
  // 【新增状态】用于控制是否渲染最终的结果页面
  const [showOutcome, setShowOutcome] = useState<FunnelOutcome | null>(null);

  // 【中文注释：数据加载和兼容性处理】
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
          const funnel = funnelDoc.data() as any; 
          
          const compatibleFunnelData: FunnelData = { 
                   // ... 假设这里正确地合并了所有字段和默认值
                   ...funnel.data,
                   outcomes: funnel.data.outcomes || [],
                   scoreMappings: funnel.data.scoreMappings || [],
               };
          if (compatibleFunnelData.questions) {
            compatibleFunnelData.questions = compatibleFunnelData.questions.map((question: FunnelStep) => {
              
              // 【中文注释：兼容性修复 1: 确保 answers 属性存在，即使是空的也初始化为一个空对象】
              if (!question.answers) {
                  question.answers = {};
              }

              // 【中文注释：兼容性修复 2: 处理旧数据结构中将答案数组转换为对象格式】
              if (Array.isArray(question.answers)) {
                const answersObj: { [answerId: string]: Answer } = {};
                (question.answers as Answer[]).forEach((answer: Answer) => {
                  // 【中文注释：确保每个答案都有 ID，如果缺失则生成一个】
                  answersObj[answer.id || `ans-${Date.now()}-${Math.random()}`] = answer;
                });
                question.answers = answersObj;
              }
              
              // 【中文注释：兼容性修复 3: 处理旧数据结构中将问题文本存储在 'text' 或 'question' 字段的情况】
              if (!question.title && (question as any).text) {
                  question.title = (question as any).text;
              } else if (!question.title && (question as any).question) {
                  question.title = (question as any).question;
              }

              return question; 
            });
          }
          
          setFunnelData({
            ...compatibleFunnelData,
            primaryColor: compatibleFunnelData.primaryColor || '#007bff',
            buttonColor: compatibleFunnelData.buttonColor || '#28a745',
            backgroundColor: compatibleFunnelData.backgroundColor || '#ffffff',
            textColor: compatibleFunnelData.textColor || '#333333',
          });

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
   const determineAndShowOutcome = useCallback(() => {
    if (!funnelData) return;

    // 1. 根据总分和映射表找到匹配的结果
    const matchedOutcome = findMatchingOutcome(
      totalScore,
      funnelData.outcomes,
      funnelData.scoreMappings
    );

    if (matchedOutcome) {
      // 2. 渲染结果页面
      setShowOutcome(matchedOutcome);
    } else {
      // 3. 如果未匹配到任何结果 (这是安全网)
      const redirectLink = funnelData.finalRedirectLink;
      if (redirectLink && redirectLink.trim() !== "") {
        window.location.href = redirectLink;
      } else {
        setError("Quiz complete! No outcome matched and no final redirect link set.");
      }
    }
  }, [funnelData, totalScore]);
  const handleFinalRedirect = (redirectUrl: string) => {
    window.location.href = redirectUrl;
  };
    
  // 【中文注释：处理 Lead Capture 表单提交和 Webhook 发送的最终逻辑】
  const handleLeadCaptureSubmit = async (data: LeadCaptureFormData) => {
      const webhookUrl = funnelData?.leadCaptureWebhookUrl;
      const finalRedirectLink = funnelData?.finalRedirectLink || '/';

         if (webhookUrl && webhookUrl.trim() !== '') {
            // 将数据对象转换为 URL 编码格式的字符串
            const formBody = new URLSearchParams(data).toString();

            await fetch(webhookUrl, {
                method: 'POST',
                // 【中文注释：关键修复：Content-Type 必须设置为 URL 编码，避免浏览器发送预检请求】
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, 
                body: formBody, // 发送 URL 编码后的数据
            });
        }
      
      // 【中文注释：重定向到最终链接】
      handleFinalRedirect(finalRedirectLink);
  };

  // [中文注释] 问答点击逻辑
  const handleAnswerClick = async (answerIndex: number, answerId: string) => {
    const currentStep = funnelData?.questions[currentQuestionIndex];

    if (isAnimating || !funnelData || !currentStep) return;

    setIsAnimating(true);
    setClickedAnswerIndex(answerIndex);

    const affiliateLink = currentStep.data?.affiliateLinks?.[answerIndex];

    if (funnelId && currentStep.id && answerId) {
      const trackClickEndpoint = "https://api-track-click-jgett3ucqq-uc.a.run.app/trackClick";
      fetch(trackClickEndpoint, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: { funnelId, questionId: currentStep.id, answerId },
        }),
      })
      .then(response => {
        if (!response.ok) {
          console.error("Failed to track click (API Error):", response.statusText);
        }
        return response.json().catch(() => ({})); 
      })
      .then(data => console.log("Tracking successful:", data))
      .catch(err => console.error("Tracking failed:", err.message || err));
    }
    
    if (affiliateLink && affiliateLink.trim() !== "") {
      window.open(affiliateLink, "_blank");
    }

    const answerValues = Object.values(currentStep.answers || {}) as Answer[];
    const selectedAnswer = answerValues.find(a => a.id === answerId);
    const answerScore = selectedAnswer?.resultScore || 0;
    setTotalScore(prevScore => prevScore + answerScore);
    // 【中文注释：获取下一个步骤的索引或 ID】
    const nextStepId = selectedAnswer?.nextStepId?.trim();
    setTimeout(() => {
      setIsAnimating(false);
      setClickedAnswerIndex(null);
      if (!funnelData) return;

        if (nextStepId) {
            // 【中文注释：如果设置了 nextStepId，查找目标问题的索引并跳转】
            const fullId = nextStepId.startsWith('question-') ? nextStepId : `question-${nextStepId}`;
            const simpleId = nextStepId.startsWith('question-') ? nextStepId.replace('question-', '') : nextStepId;

            // 尝试匹配完整 ID 或精简 ID
            const nextIndex = funnelData.questions.findIndex((q: any) => 
                q.id === fullId || q.id === simpleId
            );
            if (nextIndex !== -1) {
                setCurrentQuestionIndex(nextIndex);
                return; // 【中文注释：执行跳转并返回】
            }
            // 【中文注释：如果找不到 ID，程序将继续执行默认的线性流程】
            console.error(`Error: Destination ID ${nextStepId} not found. Proceeding linearly.`);
            }
      const isLastStep = currentQuestionIndex >= funnelData.questions.length - 1;

      if (isLastStep) {
        // 【核心修改 B：流程调整】
        if (funnelData.enableLeadCapture) {
          // 如果启用捕获，先显示表单
          setShowLeadCapture(true);
        } else {
          // 否则，直接进入结果判定和显示
          determineAndShowOutcome(); 
        }
        return;
      }

      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }, 500);
  };
        
 // [中文注释] 组件的 JSX 渲染部分
  if (isLoading) {
    // ... (Loading UI)
    return (
      <div className="quiz-player-container" style={{ textAlign: 'center', marginTop: '80px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff4f81', animation: 'pulse 1.5s infinite' }}>
          Ready to unlock your secret match? 🔥
        </h2>
      </div>
    );
  }

  if (error || !funnelData || funnelData.questions.length === 0) {
    // ... (Error UI)
    return (
      <div className="quiz-player-container">
        <h2>{error ? 'Error Loading Quiz' : 'Quiz Not Ready'}</h2>
        <p>{error || 'This funnel has no steps configured.'}</p>
      </div>
    );
  }
 if (showOutcome) {
    return (
        <div className="quiz-player-container" 
             style={{ backgroundColor: funnelData.backgroundColor, color: funnelData.textColor }}>
            <ExclusiveResultPage 
                outcome={showOutcome} 
                buttonColor={funnelData.buttonColor || '#28a745'} 
                textColor={funnelData.textColor || '#333333'} 
            />
        </div>
    );
  }

  // 优先级 2: 如果启用 Lead Capture，渲染表单
  if (funnelData.enableLeadCapture && showLeadCapture) {
      return (
        <div className="quiz-player-container" 
             style={{ backgroundColor: funnelData.backgroundColor, color: funnelData.textColor }}>
            <LeadCaptureForm 
                onSuccess={handleLeadCaptureSubmit}
                buttonColor={funnelData.buttonColor || '#28a745'}
                textColor={funnelData.textColor || '#333333'}
            />
        </div>
    );
  }
  const currentStep = funnelData.questions[currentQuestionIndex];

  if (!currentStep) {
    return (
      <div className="quiz-player-container">
        <p>Loading next step...</p>
      </div>
    );
  }

  // 3. 答案排序，确保使用 title 字段
  const sortedAnswers = (Object.values(currentStep.answers || {}) as Answer[])
    .sort((a, b) => a.text.localeCompare(b.text));

  const quizPlayerContainerStyle = {
    '--primary-color': funnelData.primaryColor,
    '--button-color': funnelData.buttonColor,
    '--background-color': funnelData.backgroundColor,
    '--text-color': funnelData.textColor,
  } as React.CSSProperties;
    
  return (
    <div 
      className="quiz-player-container" 
      style={{
         backgroundColor: funnelData.backgroundColor, 
         color: funnelData.textColor,
         ...quizPlayerContainerStyle 
       } as React.CSSProperties}
    >
      
      {showLeadCapture ? (
          // 【中文注释：渲染 Lead Capture 表单】
          <LeadCaptureForm 
              onSuccess={handleLeadCaptureSubmit}
              buttonColor={funnelData.buttonColor || '#28a745'}
              textColor={funnelData.textColor || '#333333'}
          />
      ) : (
        // 【中文注释：渲染问答步骤】
        <>
          {currentStep.title && (
             <h3 className="quiz-question-title">{currentStep.title}</h3>
          )}

          {/* 【新增：进度条和分数显示】 */}
          <div style={{ marginBottom: '20px', fontSize: '1em', color: 'var(--text-color)', display: 'flex', justifyContent: 'space-between' }}>
             <span>Question {currentQuestionIndex + 1} of {funnelData.questions.length}</span>
             <span>Current Score: {totalScore}</span>
          </div>
          <div className="progress-bar-container">
              <div 
                  className="progress-bar" 
                  style={{ width: `${((currentQuestionIndex + 1) / funnelData.questions.length) * 100}%` }}
              ></div>
          </div>
        
          <div className="quiz-answers-container">
            {sortedAnswers.length > 0 ? (
                sortedAnswers.map((answer, index) => {
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
                })
            ) : (
                <p style={{textAlign: 'center', color: 'gray'}}>No answers configured for this step.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};


export default QuizPlayer;
