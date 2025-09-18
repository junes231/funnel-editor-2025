// 文件路径: src/pages/FinishEmailVerification.tsx

import React, { useEffect, useState } from "react";
import {
  getAuth,
  isSignInWithEmailLink,
  signInWithEmailLink,
  updatePassword
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function FinishEmailVerification() {
  const [message, setMessage] = useState("Verifying your secure link...");
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const processSignIn = async () => {
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setMessage("This link is invalid or has expired.");
        setStatus("error");
        return;
      }

      let email = localStorage.getItem('emailForSignIn');
      const password = localStorage.getItem('passwordForSignIn');

      if (!email) {
        email = window.prompt('For your security, please re-enter your email address:');
      }
      
      if (!email) {
        setMessage("Process cancelled. No email was provided.");
        setStatus("error");
        return;
      }
      
      try {
        const userCredential = await signInWithEmailLink(auth, email, window.location.href);
        
        if (password && userCredential.user) {
          setMessage("Setting your password...");
          await updatePassword(userCredential.user, password);
        }
        
        localStorage.removeItem('emailForSignIn');
        localStorage.removeItem('passwordForSignIn');
        
        // --- 关键改动：更新状态为 success ---
        setStatus("success");
        setMessage("Success! Redirecting to your dashboard...");

        setTimeout(() => {
          navigate('/');
        }, 1500);

      } catch (error: any) {
        setMessage(`An error occurred: ${error.message}`);
        setStatus("error");
      }
    };

    processSignIn();
  }, [auth, navigate]);

  return (
    <div style={{maxWidth: 400, margin: '80px auto', padding: 36, background: '#fff', borderRadius: 8, textAlign: 'center'}}>
      
      {/* --- 根据状态显示不同动画 --- */}
      {status === 'verifying' && <div className="loader"></div>}
      {status === 'success' && <div className="success-checkmark">✓</div>}
      
      <h2 style={{marginTop: 10}}>{message}</h2>

      {status !== 'error' && (
        <p>This page will redirect automatically...</p>
      )}

      {status === 'error' && (
        <button 
          onClick={() => navigate('/login')}
          style={{padding: '12px 24px', fontSize: 16, cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: 5, marginTop: 20}}
        >
          Return to Login Page
        </button>
      )}
    </div>
  );
}
