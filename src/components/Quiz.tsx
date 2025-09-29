import React, { useState } from "react";

interface QuizProps {
  question: string;
  answers: string[];
}

const Quiz: React.FC<QuizProps> = ({ question, answers }) => {
  const [clickCount, setClickCount] = useState<Record<string, number>>({});
  const [clicked, setClicked] = useState<Record<string, boolean>>({});

  const handleClick = (answer: string) => {
    if (clicked[answer]) return;
    setClickCount((prev) => ({
      ...prev,
      [answer]: (prev[answer] || 0) + 1,
    }));
    setClicked((prev) => ({
      ...prev,
      [answer]: true,
    }));
  };

  return (
    <div>
      <h2>{question}</h2>
      {answers.map(
        (ans) =>
          !clicked[ans] && (
            <button key={ans} onClick={() => handleClick(ans)}>
              {ans} ({clickCount[ans] || 0})
            </button>
          )
      )}
    </div>
  );
};

export default Quiz;
