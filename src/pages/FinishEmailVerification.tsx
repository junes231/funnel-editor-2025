// 文件路径: src/pages/FinishEmailVerification.tsx

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

    applyActionCode(auth, oobCode)
      .then(() => {
        setMsg("Email verified! Attempting to log you in...");
        const pendingEmail = localStorage.getItem("pendingEmail");
        const pendingPwd = localStorage.getItem("pendingPwd");

        if (pendingEmail && pendingPwd) {
          signInWithEmailAndPassword(auth, pendingEmail, pendingPwd)
            .then(() => {
              localStorage.removeItem("pendingEmail");
              localStorage.removeItem("pendingPwd");
              setStatus("success");
              setMsg("Login successful! Redirecting to the editor...");
            })
            .catch(loginError => {
              localStorage.removeItem("pendingEmail");
              localStorage.removeItem("pendingPwd");
              setStatus("error");
              setMsg("Your email is verified, but auto-login failed. Please go to the login page and sign in manually.");
              console.error("Auto sign-in failed after verification", loginError);
            });
        } else {
          setStatus("success");
          setMsg("Your email has been successfully verified! Please proceed to login.");
        }
      })
      .catch((error) => {
        setStatus("error");
        setMsg("Link is invalid or has expired. Please try registering again.");
        console.error("Error applying action code", error);
      });
  }, [auth, navigate]); // <-- 修正：将 navigate 添加回依赖数组

  return (
    <div style={{maxWidth: 400, margin: '80px auto', padding: 36, background: '#fff', borderRadius: 8, textAlign: 'center'}}>
      <h2>{msg}</h2>
      
      {status === "verifying" && <p>Please wait...</p>}

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
