// 文件路径: src/components/BackButton.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// [中文注释] 定义按钮的 props 类型，增加了 onBeforeClick 用于在动画前执行操作
interface BackButtonProps {
  to?: string;
  onClick?: () => void;
  goBack?: boolean;
  children: React.ReactNode;
  onBeforeClick?: () => Promise<void> | void; // <-- 这是新增的 prop
}

const BackButton: React.FC<BackButtonProps> = ({ to, onClick, goBack, onBeforeClick, children }) => {
  // [中文注释] 使用 useState 来控制动画状态
  const [isFading, setIsFading] = useState(false);
  const navigate = useNavigate();

  const handleClick = async () => {
    if (isFading) return; // [中文注释] 防止动画期间重复点击

    // [中文注释] 步骤1: 首先执行传入的保存函数
    if (onBeforeClick) {
      await onBeforeClick();
    }

    // [中文注释] 步骤2: 保存后，立即启动隐藏动画
    setIsFading(true);
    
    // [中文注释] 步骤3: 1秒（1000毫秒）动画结束后，执行跳转逻辑
    setTimeout(() => {
      if (goBack) {
        navigate(-1); // [中文注释] 返回上一页
      } else if (to) {
        navigate(to); // [中文注释] 跳转到指定的 'to' 路径
      } else if (onClick) {
        onClick(); // [中文注释] 执行传入的 onClick 函数
      }
    }, 1000); 
  };

  return (
    <button
      // [中文注释] 根据 isFading 状态动态添加 'animate-out' 类
      className={`back-button ${isFading ? 'animate-out' : ''}`}
      onClick={handleClick}
      disabled={isFading} // [中文注释] 动画期间禁用按钮
    >
      {children}
    </button>
  );
};

export default BackButton;
