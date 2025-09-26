// 文件路径: src/components/BackButton.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// [中文注释] 定义按钮的 props 类型，增加了 'to' 属性用于指定跳转路径
interface BackButtonProps {
  to?: string;
  onClick?: () => void;
  goBack?: boolean;
  children: React.ReactNode;
}

const BackButton: React.FC<BackButtonProps> = ({ to, onClick, goBack, children }) => {
  // [中文注释] 使用 useState 来控制动画状态
  const [isFading, setIsFading] = useState(false);
  const navigate = useNavigate();

  const handleClick = () => {
    // [中文注释] 点击时，立即启动动画
    setIsFading(true);
    
    // [中文注释] 1秒（1000毫秒）后执行跳转逻辑
    setTimeout(() => {
      if (goBack) {
        navigate(-1); // [中文注释] 返回上一页
      } else if (to) {
        navigate(to); // [中文注释] 跳转到指定的 'to' 路径
      } else if (onClick) {
        onClick(); // [中文注释] 执行传入的 onClick 函数
      }
      // [中文注释] 为了让动画效果持续，我们不在这里重置 isFading 状态
    }, 1000); 
  };

  return (
    <button
      // [中文注释] 根据 isFading 状态动态添加 'animate-out' 类
      className={`back-button ${isFading ? 'animate-out' : ''}`}
      onClick={handleClick}
      disabled={isFading} // [中文注释] 动画期间禁用按钮，防止重复点击
    >
      {children}
    </button>
  );
};

export default BackButton;
