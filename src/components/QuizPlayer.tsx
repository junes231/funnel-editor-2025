import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDoc, doc } from 'firebase/firestore';

interface Answer {
  id: string;
  text: string;
}

interface FunnelStep {
  id: string;
  type: 'quiz' | 'form'; // 步骤类型
  // 问答属性
  title?: string; 
  answers?: { [key: string]: Answer };
  data?: { affiliateLinks?: string[] };
  // 表单属性
  formTitle?: string;
  formFields?: { type: 'text' | 'email'; label: string; placeholder: string }[];
  webhookUrl?: string;
  redirectAfterSubmit?: string;
  submitButtonText?: string;
}

interface FunnelData {
  questions: FunnelStep[]; // 数组现在包含 FunnelStep
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

interface FormComponentRendererProps {
  step: FunnelStep;
  onSuccess: (redirectUrl: string) => void;
  buttonColor: string;
  textColor: string;
}

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

  // 【中文注释：从数据库加载漏斗数据... (逻辑保持不变)】
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
        // 【中文注释：注意：这里引用了 Funnel，但 Funnel 接口未在此文件定义，假设它在其他地方已全局可用，或应导入 Funnel 接口】
        const funnelDoc = await getDoc(funnelDocRef); 
        if (funnelDoc.exists()) {
          const funnel = funnelDoc.data() as any; // 【中文注释：使用 any 避免未定义 Funnel 接口的报错】
          
          // Add backward compatibility: convert answers from array to object if needed
             const compatibleFunnelData = { ...defaultFunnelData, ...funnel.data };
          if (compatibleFunnelData.questions) {
            compatibleFunnelData.questions = compatibleFunnelData.questions.map((question: FunnelStep) => {
              
              // 【中文注释：核心修复：如果 type 字段缺失，强制设定为 'quiz'，以确保后续渲染逻辑可以进行】
              if (!question.type) {
                  question.type = 'quiz';
              }

              // 【中文注释：兼容性修复：如果当前步骤是 Quiz 并且 answers 是数组，则转换为对象格式】
              if (question.type === 'quiz' && Array.isArray(question.answers)) {
                const answersObj: { [answerId: string]: Answer } = {};
                (question.answers as Answer[]).forEach((answer: Answer) => {
                  answersObj[answer.id] = answer;
                });
                question.answers = answersObj;
              }
              
              // 【中文注释：兼容性修复：处理旧数据结构中将问题文本存储在 'question' 字段的情况】
              if (question.type === 'quiz' && !question.title && (question as any).question) {
                  question.title = (question as any).question;
              }

              return question; 
            });
          }
          
          // 【中文注释：如果 firestore 返回的颜色字段是可选的，这里需要设置默认值，以确保样式生效】
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

  const handleFinalRedirect = (redirectUrl: string) => {
    // 使用 window.location.href 确保跳转到外部链接
    window.location.href = redirectUrl;
  };
    
  // [中文注释] 关键升级：这是新的 handleAnswerClick 函数
  const handleAnswerClick = async (answerIndex: number, answerId: string) => {
    // 【中文注释：统一使用 currentStep 变量，而不是 currentQuestion】
    const currentStep = funnelData?.questions[currentQuestionIndex];

    if (isAnimating || !funnelData || !currentStep || currentStep.type !== 'quiz') return;

    setIsAnimating(true);
    setClickedAnswerIndex(answerIndex);

    // 【中文注释：确保 answers 属性以数组形式存在，以便安全访问 affiliateLinks】
    const answerValues = Object.values(currentStep.answers || {});
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

    setTimeout(() => {
      setIsAnimating(false);
      setClickedAnswerIndex(null);
      if (!funnelData) return;

      const isLastStep = currentQuestionIndex >= funnelData.questions.length - 1;

      if (isLastStep) {
        const redirectLink = funnelData.finalRedirectLink;
        if (redirectLink && redirectLink.trim() !== "") {
          handleFinalRedirect(redirectLink);
        } else {
          console.log("Quiz complete! No final redirect link set.");
        }
        return;
      }

      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }, 500);
  };


  // [中文注释：组件的 JSX 渲染部分]
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
        <p>{error || 'This funnel has no steps configured.'}</p>
      </div>
    );
  }

  // 【中文注释：统一使用 currentStep，避免重复定义和逻辑混乱】
  const currentStep = funnelData.questions[currentQuestionIndex];

  // 【中文注释：移除冗余的防御性检查】
  
  if (!currentStep) {
    return (
      <div className="quiz-player-container">
        <p>Loading next step...</p>
      </div>
    );
  }

  // 3. 现在可以安全地使用 currentStep 了
  // 【中文注释：如果当前步骤是 Quiz，则计算排序后的答案】
  const sortedAnswers = currentStep.type === 'quiz' ? 
    (Object.values(currentStep.answers || {}) as Answer[]).sort((a, b) => a.text.localeCompare(b.text)) : 
    [];

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
         // 【中文注释：修复：直接应用背景色和文字颜色，确保其优先级高于外部 CSS 默认值。】
         backgroundColor: funnelData.backgroundColor, 
         color: funnelData.textColor,
         ...quizPlayerContainerStyle 
       } as React.CSSProperties}
    >
      
      {/* 【中文注释：核心修复：根据步骤类型进行条件渲染】 */}
      {currentStep.type === 'form' ? (
        <FormComponentRenderer 
          step={currentStep}
          onSuccess={handleFinalRedirect}
          // 【中文注释：将颜色属性传递给 FormComponentRenderer】
          buttonColor={funnelData.buttonColor || '#28a745'}
          textColor={funnelData.textColor || '#333333'}
        />
      ) : (
        // 【中文注释：问答渲染逻辑（原有的逻辑）】
        <>
          <h3 className="quiz-question-title">{currentStep.title || 'Loading question...'}</h3>
          <div className="quiz-answers-container">
            {sortedAnswers.map((answer, index) => {
              const match = answer.text.match(/^([A-Z]\.)\s*(.*)$/);
              const prefix = match ? match[1] : "";
              const content = match ? match[2] : answer.text;

              return (
                <button
                  key={answer.id}
                  className={`quiz-answer-button ${clickedAnswerIndex === index ? 'selected-answer animating' : ''}`}
                  // 【中文注释：确保只在 Quiz 步骤中调用 handleAnswerClick】
                  onClick={() => currentStep.type === 'quiz' && handleAnswerClick(index, answer.id)}
                  disabled={isAnimating}
                  style={{ backgroundColor: 'var(--button-color)', color: 'var(--text-color)', borderColor: 'var(--primary-color)' }}
                  >
                  <span className="answer-prefix">{prefix}</span>
                  <span className="answer-content">{content}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const FormComponentRenderer: React.FC<FormComponentRendererProps> = ({ step, onSuccess, buttonColor, textColor }) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getFieldName = (label: string) => label.toLowerCase().replace(/\s/g, '');

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    const { webhookUrl, redirectAfterSubmit, formFields } = step;

    // 基础验证
    const missingField = formFields?.find(f => !formData[getFieldName(f.label)]);
    if (missingField) {
      setSubmitError(`Please fill out the ${missingField.label} field.`);
      setIsSubmitting(false);
      return;
    }

    // 1. 整理发送给 Webhook 的数据
    const payload: Record<string, string> = {};
    formFields?.forEach(f => {
      payload[getFieldName(f.label)] = formData[getFieldName(f.label)];
    });

    try {
      // 2. 发送数据到 Webhook
      if (webhookUrl && webhookUrl.trim() !== '') {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      // 3. 成功后重定向
      const finalRedirect = redirectAfterSubmit || '/';
      onSuccess(finalRedirect);

    } catch (e) {
      console.error('Form submission failed:', e);
      setSubmitError('Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="quiz-player-container-inner" style={{color: textColor}}>
      <h3 className="quiz-question-title">{step.formTitle || 'Lead Form'}</h3>
      
      {submitError && <div style={{color: '#d32f2f', marginBottom: 15}}>{submitError}</div>}

      <form onSubmit={handleFormSubmit} className="quiz-answers-container">
        {(step.formFields || []).map((field, index) => (
          <div key={index} className="form-field-group">
            <input
              type={field.type}
              name={getFieldName(field.label)} // 用于 state 键和提交 payload
              placeholder={field.placeholder || field.label}
              value={formData[getFieldName(field.label)] || ''}
              onChange={handleInputChange}
              required
              className="quiz-answer-button" // 复用按钮样式以保持外观一致
              style={{
                backgroundColor: '#f8f9fa', // 表单背景色区别于按钮
                color: textColor,
                textAlign: 'left'
              }}
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={isSubmitting}
          className="quiz-answer-button"
          style={{
            backgroundColor: buttonColor,
            color: step.data?.buttonTextColor || '#ffffff',
            marginTop: '20px'
          }}
        >
          {isSubmitting ? 'Submitting...' : step.submitButtonText || 'Submit'}
        </button>
      </form>
    </div>
  );
};


export default QuizPlayer;
