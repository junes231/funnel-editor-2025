import React, { useState } from "react";

const BackButton: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [isFading, setIsFading] = useState(false);

  const handleClick = () => {
    setIsFading(true);
    setTimeout(() => {
      window.history.back();
    }, 1000);
  };

  return (
    <button
      onClick={handleClick}
      style={{
        transition: "opacity 1s",
        opacity: isFading ? 0 : 1,
      }}
      disabled={isFading}
    >
      {children || "return"}
    </button>
  );
};

export default BackButton;
