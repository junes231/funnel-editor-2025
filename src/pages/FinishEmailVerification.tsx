// src/pages/FinishEmailVerification.tsx

import React, { useEffect, useState } from "react";
import { getAuth, applyActionCode, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function FinishEmailVerification() {
  const [msg, setMsg] = useState("Verifying your email...");
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    console.log("FinishEmailVerification page loaded."); // <-- 添加日志
     const hash = window.location.hash;
    const queryStringIndex = hash.indexOf('?');
    const queryString = queryStringIndex !== -1 ? hash.substring(queryStringIndex) : '';

    // 2. 使用提取出的查询字符串来解析参数
    const params = new URLSearchParams(queryString);
    const oobCode = params.get("oobCode");
    
    if (!oobCode) {
      console.error("oobCode not found in URL!"); // <-- 添加日志
      setMsg("Information is missing or the link is invalid.");
      return;
    }

    console.log("Applying action code:", oobCode); // <-- 添加日志
    applyActionCode(auth, oobCode)
      .then(() => {
        console.log("Email verification successful in Firebase!"); // <-- 添加日志
        setMsg("Email verification successful, logging in automatically...");
        
        const email = localStorage.getItem("pendingEmail");
        const pwd = localStorage.getItem("pendingPwd");

        if (!email || !pwd) {
            console.error("Pending email/password not found in localStorage."); // <-- 添加日志
            setMsg("Could not log in automatically. Please go to the login page.");
            return;
        }

        // ... 自动登录逻辑
        return signInWithEmailAndPassword(auth, email, pwd);
      })
      .then((userCredential) => {
          if (userCredential) {
            console.log("Auto sign-in successful, navigating to editor."); // <-- 添加日志
            localStorage.removeItem("pendingEmail");
            localStorage.removeItem("pendingPwd");
            navigate("/editor");
          }
      })
      .catch((error) => {
        console.error("Verification failed:", error); // <-- 添加错误日志
        setMsg(`Verification failed: ${error.message}. Please try registering again.`);
      });
  }, [navigate, auth]);

  return (
    <div style={{maxWidth:400,margin:'80px auto',padding:36,background:'#fff',borderRadius:8}}>
      <h2>{msg}</h2>
    </div>
  );
}
