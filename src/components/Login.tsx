import React, { useEffect, useState, useRef } from 'react';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { evaluatePassword, PasswordStrengthResult } from '../utils/passwordStrength.ts';

type Mode = 'login' | 'register' | 'forgot';

// 新增：父级传下来的全局通知类型（根据你的父组件实际结构调整）
interface GlobalNotification {
  visible: boolean;
  type: 'success' | 'error' | 'info';
  message: string;
}
interface LoginProps {
  setNotification?: (n: GlobalNotification) => void;
}

export default function Login({ setNotification }: LoginProps) {
  const auth = getAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [notice, setNotice] = useState('');          // 仍保留本地 notice（你也可以删）
  const [loading, setLoading] = useState(false);
  const log = (...a:any[]) => console.log('[VERIFY-DEBUG]', ...a);
  // 重发验证冷却
  const [cooldown, setCooldown] = useState(0);

  // 密码强度状态（仅注册时展示）
  const [pwStrength, setPwStrength] = useState<PasswordStrengthResult | null>(null);
  const pwEvalCounter = useRef(0); // 节流/防竞态计数

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // 新增：使用全局通知（如果父级提供）
  useEffect(() => {
    // 仅在登录模式下处理
    if (mode !== 'login') return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('verified') === '1') {
      if (setNotification) {
        setNotification({
          visible: true,
            type: 'success',
          message: 'Email verified. Please sign in.'
        });
      } else {
        // 没传全局通知，就退回到本地 notice
        setNotice('Email verified. Please sign in.');
      }
    }
  }, [mode, setNotification]);

  // 监听密码变化（注册模式）评估强度
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
      setNotice('Password too weak. Please strengthen it (aim for Fair or above).');
      return;
    }
    setLoading(true);
    try {
      
// handleRegister try 内部：
log('start createUser', email.trim());
const cred = await createUserWithEmailAndPassword(auth, email.trim(), pwd);
log('created user uid', cred.user.uid, 'verified?', cred.user.emailVerified);
await sendEmailVerification(cred.user, {
  url: 'https://funnel-editor2025.netlify.app/#/login?verified=1',
  handleCodeInApp: false
});
log('sendEmailVerification resolved');
      await signOut(auth);
      setPwd('');
      setNotice('Registered. Verification email sent. Redirecting to sign in...');
      setTimeout(() => {
        switchMode('login');
      }, 2200);
    } catch (e: any) {
      setNotice('Register failed: ' + (e?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };
  const API_URL = process.env.REACT_APP_CLOUDRUN_URL!;

const callCloudRunAPI = async (userId: string) => {
  try {
    const res = await fetch(`${API_URL}/api/grant-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    console.log("Cloud Run response:", data);
  } catch (err) {
    console.error("Cloud Run call failed:", err);
  }
};
  const handleLogin = async () => {
    setNotice('');
    if (!email.trim() || !pwd) {
      setNotice('Please input email & password.');
      return;
    }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pwd);
      if (!cred.user.emailVerified) {
        setNotice('Email not verified. Check inbox or resend verification email below.');
        await signOut(auth);
        return;
      }
      callCloudRunAPI(cred.user.uid); // <-- 新增函数调用

    setNotice('Login success. Redirecting...');
    window.location.assign('/editor');

  } catch (e: any) {
    setNotice('Login failed: ' + (e?.message || 'Unknown error'));
  } finally {
    setLoading(false);
  }
};
      
 const resendVerification = async () => {
    if (cooldown > 0) return;
    if (!email.trim() || !pwd) {
      setNotice('Input email & password to resend verification.');
      return;
    }
    setLoading(true);
    setNotice('');
    try {
      log('resend signIn', email.trim());
const cred = await signInWithEmailAndPassword(auth, email.trim(), pwd);
log('resend got uid', cred.user.uid, 'verified?', cred.user.emailVerified);
await sendEmailVerification(cred.user, {
  url: 'https://funnel-editor2025.netlify.app/#/login?verified=1',
  handleCodeInApp: false
});
log('resend sendEmailVerification resolved');
      setNotice('Verification email sent again.');
      setCooldown(30);
      await signOut(auth);
    } catch (e: any) {
      setNotice('Resend failed: ' + (e?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    setNotice('');
    if (!email.trim()) {
      setNotice('Please input email.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim(), {
        url: 'https://funnel-editor2025.netlify.app/login'
      });
      setNotice('If the email exists, a reset link has been sent.');
    } catch {
      setNotice('If the email exists, a reset link has been sent.');
    } finally {
      setLoading(false);
    }
  };

  const primaryBtn = (disabled: boolean): React.CSSProperties => ({
    padding: '12px 20px',
    fontSize: 16,
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: '#0069d9',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontWeight: 600,
    letterSpacing: 0.3,
    opacity: disabled ? 0.7 : 1,
    transition: 'background .2s'
  });
  const secondaryBtn = (disabled: boolean): React.CSSProperties => ({
    padding: '10px 18px',
    fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    opacity: disabled ? 0.6 : 1
  });

  const strengthColors = ['#d32f2f', '#f57c00', '#fbc02d', '#388e3c', '#2e7d32'];

  return (
    <div style={{
      padding: 40,
      fontFamily: 'Inter, Arial, sans-serif',
      textAlign: 'center',
      maxWidth: 480,
      margin: '80px auto',
      border: '1px solid #ddd',
      borderRadius: 10,
      boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
      background: '#fff'
    }}>
      {notice && (
        <div style={{
          marginBottom: 16,
          color: '#fff',
          background: '#222',
          padding: 12,
          borderRadius: 6,
          fontSize: 14,
          lineHeight: 1.5,
          textAlign: 'left'
        }}>
          {notice}
        </div>
      )}

      <h2 style={{ marginTop: 0, fontSize: 24, letterSpacing: 0.5 }}>
        {mode === 'login' && 'Sign In (Verified Email Required)'}
        {mode === 'register' && 'Create Account'}
        {mode === 'forgot' && 'Reset Password'}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, textAlign: 'left' }}>
        {/* Email 输入 */}
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
            autoComplete="email"
          />
        </div>

        {/* 密码输入（登录 & 注册） */}
        {(mode === 'login' || mode === 'register') && (
          <div>
            <label style={labelStyle}>{mode === 'login' ? 'Password' : 'Password (min 8 chars)'}</label>
            <input
              type="password"
              placeholder={mode === 'login' ? '********' : 'At least 8 characters'}
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              style={inputStyle}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />

            {/* 注册模式下显示强度条 */}
            {mode === 'register' && (
              <PasswordStrengthBar result={pwStrength} colors={strengthColors} />
            )}
          </div>
        )}

        {/* 忘记密码模式不输入密码，只发送邮件 */}
        {mode === 'forgot' && (
          <p style={{ fontSize: 14, color: '#555', lineHeight: 1.4 }}>
            Enter your account email and we will send a password reset link if it exists.
          </p>
        )}

        {/* 按钮与操作区域 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'login' && (
            <>
              <button
                onClick={handleLogin}
                disabled={loading}
                style={primaryBtn(loading)}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <button
                onClick={resendVerification}
                disabled={loading || cooldown > 0}
                style={secondaryBtn(loading || cooldown > 0)}
                type="button"
              >
                {cooldown > 0 ? `Resend Verification (${cooldown}s)` : 'Resend Verification Email'}
              </button>
              <div style={linkRow}>
                <span
                  onClick={() => switchMode('forgot')}
                  style={linkStyle}
                >
                  Forgot password?
                </span>
              </div>
              <div style={switchText}>
                No account? <span onClick={() => switchMode('register')} style={linkStyle}>Create one</span>
              </div>
            </>
          )}

          {mode === 'register' && (
            <>
              <button
                onClick={handleRegister}
                disabled={loading}
                style={primaryBtn(loading)}
              >
                {loading ? 'Creating...' : 'Create & Send Verification'}
              </button>
              <div style={switchText}>
                Have an account? <span onClick={() => switchMode('login')} style={linkStyle}>Sign in</span>
              </div>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <button
                onClick={handleForgot}
                disabled={loading}
                style={primaryBtn(loading)}
              >
                {loading ? 'Sending...' : 'Send Reset Email'}
              </button>
              <div style={switchText}>
                Remembered? <span onClick={() => switchMode('login')} style={linkStyle}>Back to Sign in</span>
              </div>
              <div style={switchText}>
                New user? <span onClick={() => switchMode('register')} style={linkStyle}>Create account</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{
        marginTop: 32,
        fontSize: 12,
        color: '#888',
        lineHeight: 1.5,
        textAlign: 'left'
      }}>
        <p style={{ margin: '0 0 6px' }}>By continuing you agree to:</p>
        <a
          href="https://github.com/junes231/myfunnel-legal/blob/main/PRIVACY_POLICY.md"
          target="_blank"
          rel="noopener noreferrer"
          style={policyLink}
        >
          Privacy Policy
        </a>
        <a
          href="https://github.com/junes231/myfunnel-legal/blob/main/TERMS_OF_SERVICE.md"
          target="_blank"
          rel="noopener noreferrer"
          style={policyLink}
        >
          Terms of Service
        </a>
      </div>
    </div>
  );
}

/* 密码强度条组件 */
interface BarProps {
  result: PasswordStrengthResult | null;
  colors: string[];
}
const PasswordStrengthBar: React.FC<BarProps> = ({ result, colors }) => {
  // 没输入密码时展示灰色初始条
  const score = result ? result.score : 0;
  const label = result ? result.label : 'Very Weak';
  const calcBy = result ? result.calcBy : 'fallback';

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{
        display: 'flex',
        gap: 4
      }}>
        {[0, 1, 2, 3, 4].map(i => (
          <span
            key={i}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: i <= score ? colors[score] : '#e0e0e0',
              transition: 'background .25s'
            }}
          />
        ))}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          color: colors[score],
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
        aria-live="polite"
      >
        <span>Password strength: {label}</span>
        <span style={{ color: '#999' }}>{calcBy === 'zxcvbn' ? 'AI score' : 'Basic score'}</span>
      </div>
      {result?.suggestions?.length ? (
        <ul style={{ margin: '6px 0 0', paddingLeft: 16, color: '#666', fontSize: 11, lineHeight: 1.4 }}>
          {result.suggestions.map((s, idx) => <li key={idx}>{s}</li>)}
        </ul>
      ) : null}
    </div>
  );
};

/* 复用样式对象 */
const inputStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 15,
  width: '100%',
  border: '1px solid #cfd3d7',
  borderRadius: 6,
  outline: 'none',
  background: '#fafbfc',
  transition: 'border-color .2s',
  fontFamily: 'inherit'
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  display: 'block',
  marginBottom: 6,
  letterSpacing: 0.3,
  color: '#222'
};

const linkStyle: React.CSSProperties = {
  cursor: 'pointer',
  color: '#0069d9',
  textDecoration: 'underline'
};

const linkRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-start',
  fontSize: 13
};

const switchText: React.CSSProperties = {
  fontSize: 13,
  color: '#444'
};

const policyLink: React.CSSProperties = {
  display: 'inline-block',
  color: '#888',
  textDecoration: 'underline',
  marginRight: 14
};
