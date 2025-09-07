// 文件路径: src/components/Login.tsx

import { useNavigate } from 'react-router-dom'; 
import React, { useEffect, useState, useRef } from 'react';
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendSignInLinkToEmail // 引入新的方法
} from 'firebase/auth';
import { evaluatePassword, PasswordStrengthResult } from '../utils/passwordStrength.ts';

// 定义组件内部模式
type Mode = 'login' | 'register' | 'forgot';

// 定义组件属性接口
interface LoginProps {
  setNotification?: (n: any) => void;
}

export default function Login({ setNotification }: LoginProps) {
  const auth = getAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [pwStrength, setPwStrength] = useState<PasswordStrengthResult | null>(null);
  const pwEvalCounter = useRef(0);

  // 密码强度评估的 useEffect (保持不变)
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

  const switchMode = (m: Mode) => {
    setNotice('');
    setMode(m);
  };

  // --- 核心修改: 注册流程现在发送魔法链接 ---
  const handleRegister = async () => {
    setNotice('');
    if (!email.trim() || !pwd) {
      setNotice('Please input email & password.');
      return;
    }
    if (pwd.length < 8) {
      setNotice('Password must be at least 8 characters.');
      return;
    }
    if (pwStrength && pwStrength.score < 2) {
      setNotice('Password too weak. Please strengthen it.');
      return;
    }
    setLoading(true);
    try {
      // 关键步骤1: 将邮箱和期望的密码暂存，以便在用户点击链接回来后创建账户
      localStorage.setItem('emailForSignIn', email.trim());
      localStorage.setItem('passwordForSignIn', pwd);

      const actionCodeSettings = {
        url: `${window.location.origin}/#/finish-email-verification`,
        handleCodeInApp: true,
      };

      // 关键步骤2: 发送安全的登录链接
      await sendSignInLinkToEmail(auth, email.trim(), actionCodeSettings);
      setNotice('A secure sign-in link has been sent to your email! Please click the link to complete registration and log in.');
      
    } catch (e: any) {
      setNotice('Failed to send link: ' + (e?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // 常规登录逻辑 (保持不变)
   const handleLogin = async () => {
    setNotice('');
    if (!email.trim() || !pwd) {
      setNotice('Please input email & password.');
      return;
    }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pwd);
      // 检查邮箱是否已验证
      if (!cred.user.emailVerified) {
          // 强制刷新用户状态
          await cred.user.reload();
          // 再次检查
          if (!auth.currentUser?.emailVerified) {
              setNotice('Email not verified. Please check your inbox for the verification link.');
              await auth.signOut(); // 保持登出状态
              return;
          }
      }
      setNotice('Login success. Redirecting...');
      // 成功的跳转由 App.tsx 统一处理
    } catch (e: any) {
      setNotice('Login failed: ' + (e?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };
  const handleForgot = async () => {
    setNotice('');
    if (!email.trim()) {
      setNotice('Please input your account email.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim(), {
        url: `${window.location.origin}/#/reset` // 确保链接指向我们之前添加的 /reset 路由
      });
      setNotice('If the email exists, a password reset link has been sent.');
    } catch (e: any) {
      setNotice('If the email exists, a password reset link has been sent.');
    } finally {
      setLoading(false);
    }
  };
  // (忘记密码、重发邮件等其他函数保持您原有的逻辑)

  // --- UI渲染: 使用您原有的完整UI代码 ---
  const strengthColors = ['#d32f2f', '#f57c00', '#fbc02d', '#388e3c', '#2e7d32'];
  const primaryBtn = (disabled: boolean): React.CSSProperties => ({
    padding: '12px 20px', fontSize: 16, cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: '#0069d9', color: '#fff', border: 'none', borderRadius: 4,
    fontWeight: 600, opacity: disabled ? 0.7 : 1,
  });
  const secondaryBtn = (disabled: boolean): React.CSSProperties => ({
    padding: '10px 18px', fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: 4,
    opacity: disabled ? 0.6 : 1
  });
  const inputStyle: React.CSSProperties = {
    padding: '12px 14px', fontSize: 15, width: '100%', border: '1px solid #cfd3d7',
    borderRadius: 6, outline: 'none', background: '#fafbfc'
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#222'
  };
  const linkStyle: React.CSSProperties = { cursor: 'pointer', color: '#0069d9', textDecoration: 'underline' };

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center', maxWidth: 480, margin: '80px auto', border: '1px solid #ddd', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.05)', background: '#fff' }}>
      {notice && <div style={{ marginBottom: 16, color: '#fff', background: '#222', padding: 12, borderRadius: 6, fontSize: 14, lineHeight: 1.5, textAlign: 'left' }}>{notice}</div>}
      
      <h2 style={{ marginTop: 0, fontSize: 24 }}>
        {mode === 'login' && 'Sign In'}
        {mode === 'register' && 'Create Account'}
        {mode === 'forgot' && 'Reset Password'}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, textAlign: 'left' }}>
        <div>
          <label style={labelStyle}>Email</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
        </div>

        {(mode === 'login' || mode === 'register') && (
          <div>
            <label style={labelStyle}>{mode === 'login' ? 'Password' : 'Password (min 8 chars)'}</label>
            <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} style={inputStyle} />
            {mode === 'register' && <PasswordStrengthBar result={pwStrength} colors={strengthColors} />}
          </div>
        )}
        
        {mode === 'forgot' && (
           <p style={{ fontSize: 14, color: '#555' }}>Enter your email to receive a password reset link.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
          {mode === 'login' && (
            <>
              <button onClick={handleLogin} disabled={loading} style={primaryBtn(loading)}>{loading ? 'Signing in...' : 'Sign In'}</button>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span onClick={() => switchMode('forgot')} style={linkStyle}>Forgot password?</span>
                <span>No account? <span onClick={() => switchMode('register')} style={linkStyle}>Create one</span></span>
              </div>
            </>
          )}
          {mode === 'register' && (
            <>
              <button onClick={handleRegister} disabled={loading} style={primaryBtn(loading)}>{loading ? 'Sending Link...' : 'Send Link to Complete Registration'}</button>
              <div>Have an account? <span onClick={() => switchMode('login')} style={linkStyle}>Sign in</span></div>
            </>
          )}
           {mode === 'forgot' && (
            <>
              <button onClick={handleForgot} disabled={loading} style={primaryBtn(loading)}>{loading ? 'Sending...' : 'Send Reset Email'}</button>
              <div>Remembered your password? <span onClick={() => switchMode('login')} style={linkStyle}>Sign in</span></div>
            </>
          )}
        </div>
      </div>

      {/* --- 将这段代码添加到这里 --- */}
      <div style={{ marginTop: 32, fontSize: 12, color: '#888', lineHeight: 1.5, textAlign: 'left' }}>
        <p style={{ margin: '0 0 6px' }}>By continuing you agree to:</p>
        <a href="https://github.com/junes231/myfunnel-legal/blob/main/PRIVACY_POLICY.md" target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, color: '#888', marginRight: 14 }}>Privacy Policy</a>
        <a href="https://github.com/junes231/myfunnel-legal/blob/main/TERMS_OF_SERVICE.md" target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, color: '#888' }}>Terms of Service</a>
      </div>
      
    </div>
  );
}
// 密码强度条辅助组件 (保持不变)
const PasswordStrengthBar: React.FC<{ result: PasswordStrengthResult | null, colors: string[] }> = ({ result, colors }) => {
    const score = result ? result.score : -1;
    if (score < 0) return null;
    return (
        <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2, 3, 4].map(i => (
                    <span key={i} style={{ flex: 1, height: 6, background: i <= score ? colors[score] : '#e0e0e0', borderRadius: 3 }} />
                ))}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: colors[score] }}>Strength: {result?.label}</div>
        </div>
    );
};
