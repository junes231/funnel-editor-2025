import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 1. 修改 Props 接口
interface BackButtonProps {
  to?: string; // 将 'to' 设为可选
  onClick?: () => void; // 添加一个可选的 onClick 函数
  children: React.ReactNode;
}

const BackButton: React.FC<BackButtonProps> = ({ to, onClick, children }) => {
  const [isFading, setIsFading] = useState(false);
  const navigate = useNavigate();

  const handleClick = () => {
    setIsFading(true);
    setTimeout(() => {
      // 2. 根据传入的 prop 执行不同操作
      if (to) {
        navigate(to);
      } else if (onClick) {
        onClick();
      }
      // (可选) 动画结束后可以重置状态
      // setIsFading(false); 
    }, 1000);
  };

  return (
    <button
      // 3. (重要) 根据您的 CSS 文件，确保类名正确
      // 如果您的 CSS 动画类是 .animate-out，这里就用 'animate-out'
      className={`back-button ${isFading ? 'animate-out' : ''}`}
      onClick={handleClick}
    >
      {children}
    </button>
  );
};

export default BackButton;
