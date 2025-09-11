import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 1. 更新 Props 接口，添加 'goBack' 选项
interface BackButtonProps {
  to?: string;
  onClick?: () => void;
  goBack?: boolean; // 如果为 true，则返回上一页
  children: React.ReactNode;
}

const BackButton: React.FC<BackButtonProps> = ({ to, onClick, goBack, children }) => {
  const [isFading, setIsFading] = useState(false);
  const navigate = useNavigate();

  const handleClick = () => {
    setIsFading(true);
    setTimeout(() => {
      // 2. 根据传入的 Prop 决定执行哪个操作
      if (goBack) {
        navigate(-1); // <-- 这里的 -1 就是“返回前一页”
      } else if (to) {
        navigate(to);
      } else if (onClick) {
        onClick();
      }
      // 动画结束后可以重置状态，以便按钮可以再次使用
      // setIsFading(false);
    }, 1000); // 1秒延迟
  };

  return (
    <button
      // 3. 确保动画类名正确
      className={`back-button ${isFading ? 'animate-out' : ''}`}
      onClick={handleClick}
    >
      {children}
    </button>
  );
};

export default BackButton;
