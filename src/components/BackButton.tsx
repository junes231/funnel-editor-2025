// BackButton.tsx
import React, { useRef, useState } from "react";
import "../App.css"; // 确保路径对（或在 index.tsx 全局 import App.css）

interface BackButtonProps {
  children: React.ReactNode;
  to?: string; // 如果不传 to，则返回历史上一页
}

export default function BackButton({ children, to }: BackButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    // 如果在表单里，阻止默认提交
    e.preventDefault();

    console.log("BackButton clicked");
    setIsAnimating(true);

    // 可选：强制回流，让浏览器应用 class（通常不必）
    if (btnRef.current) btnRef.current.offsetHeight;

    setTimeout(() => {
      if (to) {
        // 普通跳转（会刷新页面）
        window.location.href = to;
      } else {
        // 返回上一页
        window.history.back();
      }
    }, 1000); // 1 秒后跳转
  };

  return (
    <button
      ref={btnRef}
      type="button" // <-- VERY IMPORTANT 防止表单提交
      className={`back-button ${isAnimating ? "animate-out" : ""}`}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}
