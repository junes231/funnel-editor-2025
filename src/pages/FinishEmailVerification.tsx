// src/pages/FinishEmailVerification.tsx

import React, { useEffect, useState } from "react";
import { getAuth, applyActionCode, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function FinishEmailVerification() {
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [msg, setMsg] = useState("Verifying your email...");
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
      setMsg("Link is invalid or has expired. The verification code is missing.");
      return;
    }

    // 1. 应用验证码
    applyActionCode(auth, oobCode)
      .then(() => {
        setMsg("Email verified! Attempting to log you in...");

        // 2. 从 localStorage 获取暂存的凭据
        const pendingEmail = localStorage.getItem("pendingEmail");
        const pendingPwd = localStorage.getItem("pendingPwd");

        if (pendingEmail && pendingPwd) {
          // 3. 尝试使用凭据自动登录
          signInWithEmailAndPassword(auth, pendingEmail, pendingPwd)
            .then(() => {
              // 4. 登录成功后，清除凭据并重定向
              localStorage.removeItem("pendingEmail");
              localStorage.removeItem("pendingPwd");
              
              setStatus("success");
              setMsg("Login successful! Redirecting to the editor...");

              // 延时一小段时间让用户看到成功消息，然后跳转
              
            .catch(loginError => {
              // 如果自动登录失败
              localStorage.removeItem("pendingEmail");
              localStorage.removeItem("pendingPwd");
              setStatus("error");
              setMsg("Your email is verified, but auto-login failed. Please go to the login page and sign in manually.");
              console.error("Auto sign-in failed after verification", loginError);
            });
        } else {
          // 如果没找到凭据（例如，用户在另一台设备上点击链接）
          setStatus("success");
          setMsg("Your email has been successfully verified! Please proceed to login.");
        }
      })
      .catch((error) => {
        setStatus("error");
        setMsg("Link is invalid or has expired. Please try registering again.");
        console.error("Error applying action code", error);
      });
  }, [auth]);

  // UI部分保持不变，用于向用户展示当前处理状态
  return (
    <div style={{maxWidth: 400, margin: '80px auto', padding: 36, background: '#fff', borderRadius: 8, textAlign: 'center'}}>
      <h2>{msg}</h2>
      
      {status === "verifying" && <p>Please wait...</p>}

      {status === "success" && (
        <div style={{marginTop: '20px'}}>
          <p>You will be redirected shortly.</p>
        </div>
      )}

      {status === "error" && (
         <div style={{marginTop: '20px'}}>
          <p>Something went wrong. You can try logging in from the main page.</p>
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
