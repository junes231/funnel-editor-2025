// 文件路径: src/pages/FinishEmailVerification.tsx

import React, { useEffect, useState } from "react";
import { 
  getAuth, 
  isSignInWithEmailLink, 
  signInWithEmailLink,
  updatePassword // 引入一个新方法来设置密码
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function FinishEmailVerification() {
  const [message, setMessage] = useState("Processing your secure link, please wait...");
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const processSignIn = async () => {
      // 1. 确认URL是否为有效的Firebase登录链接
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setMessage("This link is invalid, expired, or has already been used.");
        return;
      }

      // 2. 从localStorage获取邮箱和期望的密码
      let email = localStorage.getItem('emailForSignIn');
      const password = localStorage.getItem('passwordForSignIn');

      // 安全措施：如果localStorage中没有邮箱，则提示用户输入
      if (!email) {
        email = window.prompt('For your security, please re-enter your email address:');
      }
      
      if (!email) {
        setMessage("Process cancelled. No email was provided.");
        return;
      }

      try {
        setMessage("Verifying your email and signing you in...");
        
        // 3. 核心步骤：使用链接登录用户。
        // 这个操作会隐式地创建一个新用户（如果不存在的话），并将其邮箱标记为“已验证”。
        const userCredential = await signInWithEmailLink(auth, email, window.location.href);
        
        // 4. 如果是注册流程（即我们暂存了密码），则为这个新账户设置密码。
        if (password && userCredential.user) {
          setMessage("Setting your password...");
          await updatePassword(userCredential.user, password);
        }
        
        // 5. 清理工作
        localStorage.removeItem('emailForSignIn');
        localStorage.removeItem('passwordForSignIn');
        
        setMessage("Success! You are now signed in. Redirecting...");

        // 6. 自己负责跳转，确保成功
        // 此时，App.tsx中的onAuthStateChanged会接收到一个emailVerified为true的用户
        setTimeout(() => {
          navigate('/');
        }, 1500); // 延迟1.5秒给用户看成功信息

      } catch (error: any) {
        setMessage(`An error occurred: ${error.message}. Please try again from the login page.`);
        console.error("Error during sign-in with email link:", error);
      }
    };

    processSignIn();
  }, [auth, navigate]);

  return (
    <div style={{maxWidth: 400, margin: '80px auto', padding: 36, background: '#fff', borderRadius: 8, textAlign: 'center'}}>
      <h2>{message}</h2>
      <p>This page should redirect automatically. If it doesn't, please return to the login page.</p>
    </div>
  );
}
