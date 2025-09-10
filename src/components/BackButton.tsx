// src/components/BackButton.tsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // 1. 导入 useNavigate

export default function BackButton({ children }: { children: React.ReactNode }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const navigate = useNavigate(); // 2. 初始化 navigate

  const handleClick = () => {
    if (isAnimating) return; // 防止重复点击

    console.log(`[Log] 'Back' 按钮被点击，开始1秒隐藏动画...`);
    setIsAnimating(true); // 触发动画
    
    // 在动画持续1秒后执行跳转
    setTimeout(() => {
      console.log(`[Log] 动画结束，返回上一页。`);
      navigate(-1); // 3. 使用 navigate(-1) 跳转到历史记录中的前一个页面
    }, 1000);
  };

  return (
    <button
      // 动态添加 'animate-out' 类来触发 CSS 过渡
      className={`back-button ${isAnimating ? "animate-out" : ""}`}
      onClick={handleClick}
      disabled={isAnimating} // 动画期间禁用按钮，防止多次触发
    >
      {children}
    </button>
  );
}
