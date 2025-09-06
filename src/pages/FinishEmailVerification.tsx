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
  // 定义组件状态
  const [message, setMessage] = useState("Processing your sign-in link...");
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    // 定义一个异步函数来处理登录逻辑
    const processSignIn = async () => {
      // 检查当前页面的 URL 是否是一个有效的 Firebase 邮件登录链接
      if (isSignInWithEmailLink(auth, window.location.href)) {
        // 从 localStorage 中获取之前暂存的邮箱和密码
        let email = localStorage.getItem('emailForSignIn');
        const password = localStorage.getItem('passwordForSignIn');

        // 如果在当前浏览器中找不到邮箱 (例如，用户在手机上注册，在电脑上点击链接)
        if (!email) {
          // 提示用户输入他们的邮箱以完成登录
          email = window.prompt('For security, please provide your email to complete sign-in:');
          if (!email) {
            setMessage("Sign-in process cancelled. No email provided.");
            setError(true);
            return;
          }
        }

        // --- 核心逻辑: 判断是注册流程还是单纯的登录 ---
        if (password && email) {
          // 如果密码存在，说明这是注册流程的最后一步
          setMessage("Finalizing your account creation...");
          try {
            // 使用暂存的邮箱和密码创建用户账户
            await createUserWithEmailAndPassword(auth, email, password);
            // 账户创建成功后，Firebase 会自动将用户标记为登录状态。
            // App.tsx 中的 onAuthStateChanged 将会检测到这个变化并自动导航到编辑器页面。
            setMessage("Account created successfully! You are now logged in.");
            
            // 清理 localStorage 中的暂存数据
            localStorage.removeItem('emailForSignIn');
            localStorage.removeItem('passwordForSignIn');

          } catch (creationError: any) {
            // 如果创建账户失败 (最常见的原因是邮箱已存在)
            if (creationError.code === 'auth/email-already-in-use') {
              // 如果邮箱已存在，说明用户可能重复点击了链接，或者之前已经注册过。
              // 在这种情况下，我们直接为他们登录。
              setMessage("This email is already registered. Attempting to sign you in...");
              try {
                await signInWithEmailLink(auth, email, window.location.href);
                // 登录成功，清理数据
                localStorage.removeItem('emailForSignIn');
                localStorage.removeItem('passwordForSignIn');
              } catch (signInError: any) {
                setMessage(`Sign-in failed: ${signInError.message}`);
                setError(true);
              }
            } else {
              // 其他创建账户的错误
              setMessage(`Account creation failed: ${creationError.message}`);
              setError(true);
            }
          }
        } else if (email) {
          // 如果只有邮箱没有密码，说明这是一个单纯的“无密码登录”流程
          setMessage("Completing your sign-in...");
          try {
            await signInWithEmailLink(auth, email, window.location.href);
            localStorage.removeItem('emailForSignIn'); // 只需清理邮箱
          } catch (signInError: any) {
            setMessage(`Sign-in failed: ${signInError.message}`);
            setError(true);
          }
        }
      } else {
        setMessage("This sign-in link is invalid or has expired.");
        setError(true);
      }
    };

    processSignIn();
  }, [auth, navigate]);

  // --- UI 渲染部分 ---
  return (
    <div style={{maxWidth: 400, margin: '80px auto', padding: 36, background: '#fff', borderRadius: 8, textAlign: 'center'}}>
      <h2>{message}</h2>
      
      {!error && (
        <p>Please wait, the page will redirect automatically once the process is complete...</p>
      )}

      {error && (
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
