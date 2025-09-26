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
    setIsFading(true);
    if (onClick) {
      onClick(e);
    }
  };

  useEffect(() => {
    if (isFading) {
      const timer = setTimeout(() => {
        if (goBack) {
          navigate(-1);
        } else if (to) {
          navigate(to);
        }
      }, 1000); 
      // 清理函数: 当组件卸载或 isFading 变化时，取消定时器
      return () => clearTimeout(timer);
    }
  }, [isFading, goBack, to, navigate]);

  return (
    <button
      className={`back-button ${isFading ? 'animate-out' : ''}`}
      onClick={handleClick}
      disabled={isFading}
    >
      {children}
    </button>
  );
};

export default BackButton;
