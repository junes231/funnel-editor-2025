// src/components/BackButton.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function BackButton({ children, to }: { children: React.ReactNode, to: string }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const navigate = useNavigate();

  const handleClick = () => {
    setIsAnimating(true);
    setTimeout(() => {
      navigate(to);
    }, 1000); // 1秒后跳转
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
