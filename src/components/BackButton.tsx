// src/components/BackButton.tsx
import React, { useState } from "react";

interface BackButtonProps {
  children: React.ReactNode;
  to: string; // 跳转目标
}

function BackButton({ children, to }: BackButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    setTimeout(() => {
      window.location.href = to; // 1秒后跳转
    }, 1000);
  };

  return (
    <button
      className={`back-button ${isAnimating ? "animate-out" : ""}`}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

export default BackButton;
