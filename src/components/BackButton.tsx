// 文件路径: src/components/BackButton.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  to?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  goBack?: boolean;
  children: React.ReactNode;
}

const BackButton: React.FC<BackButtonProps> = ({ to, onClick, goBack, children }) => {
  const [isFading, setIsFading] = useState(false);
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // 立即开始淡出动画
    setIsFading(true); 
    
    // 如果有自定义 onClick，执行它
    if (onClick) {
      onClick(e);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isFading) {
      // 动画开始，设置 1000ms 延迟后执行跳转
      timer = setTimeout(() => {
        if (goBack) {
          navigate(-1);
        } else if (to) {
          navigate(to);
        } else if (onClick) {
            // 如果是纯 onClick 行为，但 to/goBack 都没设置，则执行 navigate('/')
            // 注意：我们假设 BackButton 总是需要导航的，如果不需要，to/goBack 应明确设置
            navigate('/'); 
        }
      }, 1000); 
    }
    
    // 清理函数：组件卸载或 isFading 状态变化时，取消定时器
    return () => clearTimeout(timer);
    
  }, [isFading, goBack, to, navigate, onClick]);

  return (
    <button
      // 确保应用了正确的 CSS 类，并在动画期间禁用按钮防止多次点击
      className={`back-button ${isFading ? 'animate-out' : ''}`}
      onClick={handleClick}
      disabled={isFading}
    >
      {children}
    </button>
  );
};

export default BackButton;
