// 文件路径: src/components/Login.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, sendSignInLinkToEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { evaluatePassword, PasswordStrengthResult } from '../utils/passwordStrength.ts';

// 定义组件接受的属性类型
interface LoginProps {
  setNotification?: (notification: { message: string; type: 'success' | 'error'; visible: boolean }) => void;
}

// 定义组件内部的模式
type Mode = 'login' | 'register' | 'forgot';

export default function Login({ setNotification }: LoginProps) {
  // 初始化 Firebase Auth 和 React Router 的导航功能
  const auth = getAuth();
  const navigate = useNavigate();

  // 定义组件状态
  const [mode, setMode] = useState<Mode>('register'); // 默认模式为注册
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [notice, setNotice] = useState('Please create an account or switch to login mode.'); // 初始提示信息
  const [loading, setLoading] = useState(false);
  const [pwStrength, setPwStrength] = useState<PasswordStrengthResult | null>(null);
  const pwEvalCounter = useRef(0);

  // 监听密码输入以评估其强度
  useEffect(() => {
    if (mode !== 'register') {
      setPwStrength(null);
      return;
    }
    const current = ++pwEvalCounter.current;
    const handler = setTimeout(async () => {
      const res = await evaluatePassword(pwd);
      if (current === pwEvalCounter.current) {
        setPwStrength(res);
      }
    }, 180);
    return () => clearTimeout(handler);
  }, [pwd, mode]);

  // 切换模式的函数 (登录/注册/忘记密码)
  const switchMode = (m: Mode) => {
    setNotice('');
    setMode(m);
  };

  // --- 核心修改：处理注册和发送登录链接 ---
  const handleRegister = async () => {
    setNotice('');
    // 验证用户输入
    if (!email.trim() || !pwd) {
      setNotice('Please enter both email and password.');
      return;
    }
    if (pwd.length < 8) {
      setNotice('Password must be at least 8 characters long.');
      return;
    }
    if (pwStrength && pwStrength.score < 2) {
      setNotice('Password is too weak. Please choose a stronger one.');
      return;
    }

    setLoading(true);
    try {
      // 关键步骤 1: 将用户的邮箱和期望的密码暂存到 localStorage。
      // 这是为了当用户点击邮件链接返回时，我们可以用这些信息来创建账户。
      localStorage.setItem('emailForSignIn', email.trim());
      localStorage.setItem('passwordForSignIn', pwd);

      // 定义邮件链接的行为
      const actionCodeSettings = {
        // 用户点击链接后将被重定向到这个 URL
        url: `${window.location.origin}/#/finish-email-verification`,
        // 必须设置为 true
        handleCodeInApp: true,
      };

      // 关键步骤 2: 发送包含安全链接的邮件给用户
      await sendSignInLinkToEmail(auth, email.trim(), actionCodeSettings);
      
      // 更新提示，告知用户下一步操作
      setNotice(`A secure sign-in link has been sent to your email! Please click the link in the email to complete your registration and log in.`);
      
    } catch (e: any) {
      setNotice('Failed to send sign-in link: ' + (e?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };
  
  // 处理常规登录的函数
  const handleLogin = async () => {
    setNotice('');
    if (!email.trim() || !pwd) {
      setNotice('Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pwd);
      // 登录成功后的跳转现在由 App.tsx 统一处理
      setNotice('Login successful! Redirecting...');
    } catch (e: any) {
        setNotice('Login failed: ' + (e?.message || 'Unknown error'));
    } finally {
        setLoading(false);
    }
  };


  // --- UI 渲染部分 ---
  // (这里的样式和布局与您项目中的保持一致，核心是确保按钮调用正确的函数)
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center', maxWidth: 480, margin: '80px auto', border: '1px solid #ddd', borderRadius: 10 }}>
        {notice && <div style={{ marginBottom: 16, padding: 12, background: '#222', color: '#fff', borderRadius: 6 }}>{notice}</div>}

        <h2>
            {mode === 'login' && 'Sign In'}
            {mode === 'register' && 'Create Account'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, textAlign: 'left' }}>
            <div>
                <label>Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ width: '100%', padding: 8 }}
                />
            </div>

            <div>
                <label>Password</label>
                <input
                    type="password"
                    value={pwd}
                    onChange={e => setPwd(e.target.value)}
                    style={{ width: '100%', padding: 8 }}
                />
                {mode === 'register' && <PasswordStrengthBar result={pwStrength} />}
            </div>

            {mode === 'register' && (
                <button onClick={handleRegister} disabled={loading} style={{ padding: 12 }}>
                    {loading ? 'Sending Link...' : 'Send Link to Complete Registration'}
                </button>
            )}

            {mode === 'login' && (
                <button onClick={handleLogin} disabled={loading} style={{ padding: 12 }}>
                    {loading ? 'Signing In...' : 'Sign In'}
                </button>
            )}

            <div style={{ textAlign: 'center', marginTop: 16 }}>
                {mode === 'register' ? (
                    <p>Already have an account? <span onClick={() => switchMode('login')} style={{ color: 'blue', cursor: 'pointer' }}>Sign In</span></p>
                ) : (
                    <p>No account? <span onClick={() => switchMode('register')} style={{ color: 'blue', cursor: 'pointer' }}>Create one</span></p>
                )}
            </div>
        </div>
    </div>
  );
}

// 密码强度条的辅助组件 (保持不变)
const PasswordStrengthBar: React.FC<{ result: PasswordStrengthResult | null }> = ({ result }) => {
    if (!result) return null;
    const colors = ['#d32f2f', '#f57c00', '#fbc02d', '#388e3c', '#2e7d32'];
    const score = result.score;
    return (
        <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2, 3, 4].map(i => (
                    <span key={i} style={{ flex: 1, height: 6, background: i <= score ? colors[score] : '#e0e0e0', borderRadius: 3 }} />
                ))}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: colors[score] }}>
                Strength: {result.label}
            </div>
        </div>
    );
};
