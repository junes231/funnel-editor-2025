import React, { useState } from "react";

export default function BackButton({ children, to }: { children: React.ReactNode, to: string }) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    console.log("点击按钮");           // 点击是否触发
    setIsAnimating(true);
    console.log("isAnimating = true"); // 状态是否更新
    console.log("className:", document.querySelector('.back-button')?.className);
    
    setTimeout(() => {
      console.log("1秒后跳转");
      window.location.href = to;
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
