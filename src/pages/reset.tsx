import React, { useEffect, useState, useRef } from 'react';
import {
  getAuth,
  verifyPasswordResetCode,
  confirmPasswordReset
} from 'firebase/auth';
import { evaluatePassword, PasswordStrengthResult } from '../utils/passwordStrength';

export default function ResetPasswordPage() {
  const auth = getAuth();
  const [phase, setPhase] = useState<'checking'|'form'|'success'|'error'>('checking');
  const [email, setEmail] = useState('');
  const [oobCode, setOobCode] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  // 密码强度
  const [pwStrength, setPwStrength] = useState<PasswordStrengthResult | null>(null);
  const evalCounter = useRef(0);

  // 解析链接并验证 oobCode
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const mode = sp.get('mode');
    const code = sp.get('oobCode');
    if (mode !== 'resetPassword' || !code) {
      setPhase('error');
      setNotice('Invalid reset link.');
      return;
    }
    setOobCode(code);
    (async () => {
      try {
        const mail = await verifyPasswordResetCode(auth, code);
        setEmail(mail);
        setPhase('form');
      } catch {
        setPhase('error');
        setNotice('Reset link expired or already used.');
      }
    })();
  }, [auth]);

  // 监听 p1（新密码）评估强度
  useEffect(() => {
    if (!p1) {
      setPwStrength(null);
      return;
    }
    const current = ++evalCounter.current;
    const timer = setTimeout(async () => {
      const res = await evaluatePassword(p1);
      if (current === evalCounter.current) {
        setPwStrength(res);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [p1]);

  const submit = async () => {
    setNotice('');
    if (p1.length < 8) {
      setNotice('Password must be ≥ 8 characters.');
      return;
    }
    if (pwStrength && pwStrength.score < 2) {
      setNotice('Password too weak. Improve it to Fair or above.');
      return;
    }
    if (p1 !== p2) {
      setNotice('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, p1);
      setPhase('success');
      setNotice('Password reset successfully. Redirecting to sign in...');
      setTimeout(() => window.location.assign('/login'), 1800);
    } catch (e: any) {
      setNotice('Reset failed: ' + (e?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageBox}>
      <h2 style={{ marginTop: 0 }}>Reset Password</h2>
      {notice && <div style={alert}>{notice}</div>}
      {phase === 'checking' && <p>Validating link...</p>}
      {phase === 'error' && (
        <p>
          <a href="/forgot" style={link}>Request a new reset email</a>
        </p>
      )}
      {phase === 'form' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: 13, color: '#555', margin: '0 0 4px' }}>Account: {email}</p>
          <div>
            <label style={label}>New Password</label>
            <input
              type="password"
              placeholder="At least 8 characters"
              value={p1}
              onChange={e => setP1(e.target.value)}
              style={input}
              autoComplete="new-password"
            />
            <PasswordStrengthBar result={pwStrength} />
          </div>
            <div>
            <label style={label}>Confirm Password</label>
            <input
              type="password"
              placeholder="Repeat new password"
              value={p2}
              onChange={e => setP2(e.target.value)}
              style={input}
              autoComplete="new-password"
            />
          </div>
          <button
            onClick={submit}
            disabled={loading}
            style={btn(loading)}
          >
            {loading ? 'Submitting...' : 'Confirm Reset'}
          </button>
          <p style={{ fontSize: 13 }}>
            <a href="/login" style={link}>Back to Sign In</a>
          </p>
        </div>
      )}
      {phase === 'success' && <p style={{ fontSize: 13 }}>Redirecting...</p>}
    </div>
  );
}

/* 密码强度条组件（与 Login 可共用，可抽取复用，这里为简单复制） */
interface StrengthBarProps {
  result: PasswordStrengthResult | null;
}
const PasswordStrengthBar: React.FC<StrengthBarProps> = ({ result }) => {
  const colors = ['#d32f2f', '#f57c00', '#fbc02d', '#388e3c', '#2e7d32'];
  const score = result ? result.score : 0;
  const label = result ? result.label : 'Very Weak';
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0,1,2,3,4].map(i => (
          <span key={i} style={{
            flex: 1,
            height: 6,
            background: i <= score ? colors[score] : '#e0e0e0',
            borderRadius: 3,
            transition: 'background .25s'
          }} />
        ))}
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: colors[score] }} aria-live="polite">
        Strength: {label}
      </div>
    </div>
  );
};

const pageBox: React.CSSProperties = {
  maxWidth: 480, margin: '100px auto', padding: 40,
  border: '1px solid #ddd', borderRadius: 10,
  fontFamily: 'Inter, Arial, sans-serif', textAlign: 'center',
  background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.05)'
};
const input: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 15,
  width: '100%',
  border: '1px solid #cfd3d7',
  borderRadius: 6,
  background: '#fafbfc',
  outline: 'none'
};
const btn = (d:boolean): React.CSSProperties => ({
  padding:'12px 20px', fontSize:16,
  cursor:d?'not-allowed':'pointer',
  background:'#0069d9', color:'#fff',
  border:'none', borderRadius:6, fontWeight:600,
  letterSpacing:0.4, opacity:d?0.7:1
});
const alert: React.CSSProperties = { marginBottom:16, background:'#222', color:'#fff', padding:12, borderRadius:6, fontSize:14, lineHeight:1.5, textAlign:'left' };
const link: React.CSSProperties = { color:'#0069d9', textDecoration:'underline' };
const label: React.CSSProperties = { fontSize:12, fontWeight:600, display:'block', marginBottom:4, letterSpacing:0.4, color:'#222', textAlign:'left' };
