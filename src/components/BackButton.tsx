// 文件路径: src/components/BackButton.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';

// [中文注释] 定义按钮的 props 类型，增加了 'to' 属性用于指定跳转路径
interface BackButtonProps {
  to?: string;
  // MODIFIED: onClick 现在接受 event 参数
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void; 
  goBack?: boolean;
  children: React.ReactNode;
}

const BackButton: React.FC<BackButtonProps> = ({ to, onClick, goBack, children }) => {
  // REMOVED: 移除 isFading 状态
  const navigate = useNavigate();

  // MODIFIED: 简化后的 handleClick，只处理导航，不进行延迟
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // 1. 立即触发淡出动画（如果父组件设置了）
    e.currentTarget.classList.add('animate-out');

    // 2. 如果提供了自定义 onClick，先执行它（通常用于处理延迟跳转）
    if (onClick) {
      onClick(e);
      return; // 如果有自定义 onClick，则跳过默认导航
    }
    
    // 3. 立即执行默认导航（如果父组件没有处理延迟）
    if (goBack) {
      navigate(-1); // 返回上一页
    } else if (to) {
      navigate(to); // 跳转到指定的 'to' 路径
    }
    // REMOVED: 移除 setTimeout 逻辑
  };

  return (
    <button
      // MODIFIED: 移除动态 className (由父组件在 onClick 时添加 'animate-out')
      className="back-button"
      onClick={handleClick}
      // REMOVED: 移除 disabled={isFading}
    >
      {children}
    </button>
  );
};

export default BackButton;
