// src/pages/FinishEmailVerification.tsx

import React, { useEffect, useState } from "react";
import { getAuth, applyActionCode } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function FinishEmailVerification() {
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [msg, setMsg] = useState("Verifying your email...");
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    // 从 URL 的 hash 部分 (#/...) 中提取查询字符串
    const hash = window.location.hash;
    const queryStringIndex = hash.indexOf('?');
    const queryString = queryStringIndex !== -1 ? hash.substring(queryStringIndex) : '';
    
    const params = new URLSearchParams(queryString);
    const oobCode = params.get("oobCode");

    if (!oobCode) {
      setStatus("error");
      setMsg("Link is invalid or has expired. The verification code is missing.");
      return;
    }

    // 应用验证码
    applyActionCode(auth, oobCode)
      .then(() => {
        // 验证成功后，清除之前保存的密码（如果有）
        localStorage.removeItem("pendingEmail");
        localStorage.removeItem("pendingPwd");
        
        setStatus("success");
        setMsg("Your email has been successfully verified!");
      })
      .catch((error) => {
        setStatus("error");
        setMsg("Link is invalid or has expired. Please try registering again.");
        console.error("Error applying action code", error);
      });
  }, [auth]);

  // 渲染一个更清晰的UI
  return (
    <div style={{maxWidth: 400, margin: '80px auto', padding: 36, background: '#fff', borderRadius: 8, textAlign: 'center'}}>
      <h2>{msg}</h2>
      
      {status === "success" && (
        <div style={{marginTop: '20px'}}>
          <p>You can now log in to your account.</p>
          <button 
            onClick={() => navigate('/login')}
            style={{padding: '12px 24px', fontSize: 16, cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: 5}}
          >
            Go to Login Page
          </button>
        </div>
      )}

      {status === "error" && (
         <div style={{marginTop: '20px'}}>
          <a href="/#" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Back to main page</a>
        </div>
      )}
    </div>
  );
}
