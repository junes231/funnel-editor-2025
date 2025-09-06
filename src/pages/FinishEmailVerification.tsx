// 文件路径: src/pages/FinishEmailVerification.tsx

import React, { useEffect, useState } from "react";
import { getAuth, applyActionCode, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function FinishEmailVerification() {
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [msg, setMsg] = useState("Verifying your email, please wait...");
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const hash = window.location.hash;
    const queryStringIndex = hash.indexOf('?');
    const queryString = queryStringIndex !== -1 ? hash.substring(queryStringIndex) : '';
    
    const params = new URLSearchParams(queryString);
    const oobCode = params.get("oobCode");

    if (!oobCode) {
      setStatus("error");
      setMsg("Link is invalid or has expired.");
      return;
    }

    applyActionCode(auth, oobCode)
      .then(() => {
        setMsg("Email verified! Logging you in automatically...");
        const pendingEmail = localStorage.getItem("pendingEmail");
        const pendingPwd = localStorage.getItem("pendingPwd");

        if (pendingEmail && pendingPwd) {
          signInWithEmailAndPassword(auth, pendingEmail, pendingPwd)
            .then(() => {
              localStorage.removeItem("pendingEmail");
              localStorage.removeItem("pendingPwd");
              setStatus("success");
              setMsg("Login successful! Redirecting to the editor...");
              // The redirect is now handled by App.tsx, so no navigate() call here.
            })
            .catch(() => {
              localStorage.removeItem("pendingEmail");
              localStorage.removeItem("pendingPwd");
              setStatus("error");
              setMsg("Your email is verified, but auto-login failed. Please sign in manually.");
            });
        } else {
          setStatus("success");
          // This case handles users clicking the link on a different browser/device
          setMsg("Your email has been successfully verified! Please proceed to the login page.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMsg("Verification link is invalid or has expired. Please try registering again.");
      });
  }, [auth, navigate]);

  return (
    <div style={{maxWidth: 400, margin: '80px auto', padding: 36, background: '#fff', borderRadius: 8, textAlign: 'center'}}>
      {/* 动态显示标题 */}
      <h2>{msg}</h2>
      
      {/* 当正在验证或成功时，显示等待信息，不提供任何按钮 */}
      {(status === "verifying" || status === "success") && (
        <div style={{marginTop: '20px'}}>
          <p>Please wait, you will be redirected automatically...</p>
          {/* 您可以在这里添加一个加载动画来优化体验 */}
        </div>
      )}

      {/* 只有在发生错误时，才提供返回登录页的按钮 */}
      {status === "error" && (
         <div style={{marginTop: '20px'}}>
          <p>Something went wrong. Please try again from the login page.</p>
          <button 
            onClick={() => navigate('/login')}
            style={{padding: '12px 24px', fontSize: 16, cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: 5}}
          >
            Go to Login Page
          </button>
        </div>
      )}
    </div>
  );
}
