import React from 'react';

// Helper function to handle both array and object formats for answers
const getAnswersAsArray = (answers: any): { id: string; text: string; }[] => {
  if (!answers) return [];
  if (Array.isArray(answers)) return answers;
  if (typeof answers === 'object') return Object.values(answers);
  return [];
};

interface QuizPreviewProps {
  quizData: {
    question: string;
    answers: { id: string; text: string; }[] | { [answerId: string]: { id: string; text: string; } };
    buttonColor: string;
    backgroundColor: string;
    textColor: string;
    buttonTextColor: string;
    affiliateLinks?: string[];
  };
  nodeId: string;
}

const QuizPreview: React.FC<QuizPreviewProps> = ({ quizData }) => {
  const generateQuizHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Interactive Quiz</title>
        <style>
          :root {
            --primary: ${quizData.buttonColor || '#007bff'};
            --bg: ${quizData.backgroundColor || '#ffffff'};
            --text: ${quizData.textColor || '#333333'};
            --button-text: ${quizData.buttonTextColor || '#ffffff'};
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--bg);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .quiz-container {
            max-width: 600px;
            width: 90%;
            padding: 40px;
            text-align: center;
          }
          
          .quiz-question {
            font-size: 2.2em;
            font-weight: bold;
            margin-bottom: 40px;
            line-height: 1.3;
          }
          
          .quiz-answers {
            display: flex;
            flex-direction: column;
            gap: 20px;
            max-width: 400px;
            margin: 0 auto;
          }
          
          .answer-button {
            background-color: var(--primary);
            color: var(--button-text);
            border: none;
            padding: 20px 30px;
            font-size: 1.2em;
            font-weight: 600;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            min-height: 60px;
            width: 100%;
          }
          
          .answer-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
            opacity: 0.9;
          }
          
          .answer-button:active {
            transform: translateY(0);
          }
          
          @media (max-width: 768px) {
            .quiz-container {
              padding: 20px;
            }
            
            .quiz-question {
              font-size: 1.8em;
              margin-bottom: 30px;
            }
            
            .answer-button {
              padding: 18px 25px;
              font-size: 1.1em;
              min-height: 55px;
            }
          }
        </style>
      </head>
      <body>
        <div class="quiz-container">
          <h1 class="quiz-question">${quizData.question || 'What\'s your biggest challenge?'}</h1>
          
          <div class="quiz-answers">
            ${getAnswersAsArray(quizData.answers).map((answer, index) => `
              <button 
                class="answer-button" 
                onclick="handleAnswer(${index})"
              >
                ${answer.text || answer || `Option ${String.fromCharCode(65 + index)}`}
              </button>
            `).join('')}
          </div>
        </div>
        
        <script>
          function handleAnswer(answerIndex) {
            console.log('Selected answer:', answerIndex);
            
            const affiliateLinks = ${JSON.stringify(quizData.affiliateLinks || [])};
            
            if (affiliateLinks[answerIndex] && affiliateLinks[answerIndex] !== '') {
              setTimeout(() => {
                window.open(affiliateLinks[answerIndex], '_blank');
              }, 500);
            }
          }
        </script>
      </body>
      </html>
    `;
  };

  return (
    <div className="quiz-preview">
      <h3>Live Preview</h3>
      <iframe 
        srcDoc={generateQuizHTML()}
        style={{ 
          width: '100%', 
          height: '600px', 
          border: '1px solid #ddd', 
          borderRadius: '8px' 
        }}
        title="Quiz Preview"
      />
    </div>
  );
};

export default QuizPreview;
