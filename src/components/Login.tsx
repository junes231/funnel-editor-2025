// 文件路径: src/components/Login.tsx
// 请用以下内容完全替换此文件

import { useNavigate } from 'react-router-dom'; 
import React, { useEffect, useState, useRef } from 'react';
import { getAuth, sendSignInLinkToEmail } from 'firebase/auth';
import { evaluatePassword, PasswordStrengthResult } from '../utils/passwordStrength.ts';

type Mode = 'login' | 'register' | 'forgot';

// ... (LoginProps 和其他接口定义保持不变)

export default function Login({ setNotification }: any) { // 简化 props 类型以便替换
  const auth = getAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('register'); // 默认模式改为注册
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [notice, setNotice] = useState('Please register an account or switch to login mode'); // 初始提示
  const [loading, setLoading] = useState(false);

  // ... (密码强度相关的 state 和 useEffect 保持不变)

  // 主要修改：handleRegister 现在发送登录链接
  const handleRegister = async () => {
    setNotice('');
    if (!email.trim() || !pwd) {
      setNotice('Please enter your email and password。');
      return;
    }
    // ... (密码强度检查保持不变)

    setLoading(true);
    try {
      // 关键改动：我们将密码也暂存起来，因为创建账户需要它
      // 但这次是为了在用户点击链接回来后，完成账户的最终创建
      localStorage.setItem('emailForSignIn', email.trim());
      localStorage.setItem('passwordForSignIn', pwd);

      const actionCodeSettings = {
        url: `${window.location.origin}/#/finish-email-verification`,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, email.trim(), actionCodeSettings);
      
      setNotice(`A secure login link has been sent to your email! Please click the link in the email to complete your registration and log in automatically.。`);
      
    } catch (e: any) {
      setNotice('Failed to send login link: ' + (e?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // handleLogin 和其他函数现在可以被简化或移除，因为流程已改变
  // 为了简单起见，我们只保留注册流程的核心代码
  // ... (您可以根据需要保留或修改登录和忘记密码的逻辑)

  return (
    <div style={{ /* ... 您的样式 ... */ }}>
      {/* ... 您的 JSX ... */}
      {/* 确保注册按钮调用的是 handleRegister */}
      <button onClick={handleRegister} disabled={loading}>
        {loading ? 'Sending...' : 'Send login link to complete registration'}
      </button>
      {/* ... 其余 JSX ... */}
    </div>
  );
}

// ... (密码强度条组件等帮助组件保持不变)
