// 文件路径: src/pages/FinishEmailVerification.tsx

import React, { useEffect, useState } from "react";
import { 
  getAuth, 
  isSignInWithEmailLink, 
  signInWithEmailLink,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function FinishEmailVerification() {
  const [message, setMessage] = useState("Processing your sign-in link, please wait...");
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const processSignIn = async () => {
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setMessage("This link is invalid or has expired.");
        return;
      }

      let email = localStorage.getItem('emailForSignIn');
      const password = localStorage.getItem('passwordForSignIn');

      if (!email) {
        email = window.prompt('For security, please provide your email to complete the process:');
      }
      
      if (!email) {
        setMessage("Process cancelled. No email was provided.");
        return;
      }
      
      // 如果密码存在，说明这是“注册并登录”流程
      if (password) {
        try {
          setMessage("Creating your account...");
          await createUserWithEmailAndPassword(auth, email, password);
          
          setMessage("Account created successfully! You are now logged in.");
          
          // 清理 localStorage
          localStorage.removeItem('emailForSignIn');
          localStorage.removeItem('passwordForSignIn');

          // 关键步骤: 成功后延迟一小会，然后强制跳转到编辑器主页
          setTimeout(() => {
            navigate('/');
          }, 1500); // 延迟1.5秒

        } catch (error: any) {
          // 如果错误是“邮箱已占用”，说明用户可能刷新或重复点击了链接
          if (error.code === 'auth/email-already-in-use') {
            setMessage("Account already exists. Signing you in...");
            try {
              await signInWithEmailLink(auth, email, window.location.href);
              localStorage.removeItem('emailForSignIn');
              localStorage.removeItem('passwordForSignIn');
              setTimeout(() => {
                navigate('/');
              }, 1500);
            } catch (signInError: any) {
              setMessage(`Sign-in failed: ${signInError.message}`);
            }
          } else {
            setMessage(`Account creation failed: ${error.message}`);
          }
        }
      } else {
        // 如果没有密码，说明是“仅登录”流程
        try {
          setMessage("Signing you in...");
          await signInWithEmailLink(auth, email, window.location.href);
          localStorage.removeItem('emailForSignIn');
          setTimeout(() => {
            navigate('/');
          }, 1500);
        } catch (signInError: any) {
          setMessage(`Sign-in failed: ${signInError.message}`);
        }
      }
    };

    processSignIn();
  }, [auth, navigate]);

  return (
    <div style={{maxWidth: 400, margin: '80px auto', padding: 36, background: '#fff', borderRadius: 8, textAlign: 'center'}}>
      <h2>{message}</h2>
      <p>Please wait, the page will redirect automatically after this process is complete...</p>
    </div>
  );
}
