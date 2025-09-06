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
  const [message, setMessage] = useState("Processing your secure link, please wait...");
  const auth = getAuth();
  const navigate = useNavigate(); // 保留navigate用于处理错误情况

  useEffect(() => {
    const processSignIn = async () => {
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setMessage("This link is invalid, expired, or has already been used.");
        return;
      }

      let email = localStorage.getItem('emailForSignIn');
      const password = localStorage.getItem('passwordForSignIn');

      if (!email) {
        email = window.prompt('For your security, please re-enter your email address:');
      }
      
      if (!email) {
        setMessage("Process cancelled. No email was provided.");
        return;
      }
      
      try {
        setMessage("Verifying your email and signing you in...");
        const userCredential = await signInWithEmailLink(auth, email, window.location.href);
        
        if (password && userCredential.user) {
          setMessage("Setting your password...");
          await updatePassword(userCredential.user, password);
        }
        
        localStorage.removeItem('emailForSignIn');
        localStorage.removeItem('passwordForSignIn');
        
        setMessage("Success! You are now signed in. Redirecting...");
        // **关键改动**: 不再执行任何跳转。App.tsx 将会接管。

      } catch (error: any) {
        setMessage(`An error occurred: ${error.message}. Please try again.`);
        console.error("Error during sign-in with email link:", error);
      }
    };

    processSignIn();
  }, [auth, navigate]); // 依赖数组中保留 navigate

  return (
    <div style={{maxWidth: 400, margin: '80px auto', padding: 36, background: '#fff', borderRadius: 8, textAlign: 'center'}}>
      <h2>{message}</h2>
      <p>This page should redirect automatically. If it doesn't, please return to the login page.</p>
    </div>
  );
}
