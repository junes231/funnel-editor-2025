import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  to: string;
  children: React.ReactNode;
}

const BackButton: React.FC<BackButtonProps> = ({ to, children }) => {
  const [isFading, setIsFading] = useState(false);
  const navigate = useNavigate();

  const handleClick = () => {
    setIsFading(true);
    setTimeout(() => {
      navigate(-1, { replace: true });
    }, 1000);
  };

  return (
    <button
      className="back-button"
      onClick={handleClick}
      style={{
        transition: "opacity 1s",
        opacity: isFading ? 0 : 1,
      }}
      disabled={isFading}
    >
      {children}
    </button>
  );
};

export default BackButton;
