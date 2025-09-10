// src/components/BackButton.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function BackButton({ children, to }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const navigate = useNavigate();

  const handleClick = () => {
    setIsAnimating(true);
    setTimeout(() => {
      if (to) {
        navigate(to);   // 跳转到指定路径
      } else {
        navigate(-1);   // 如果没传路径，就返回上一页
      }
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
