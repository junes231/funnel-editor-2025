// 文件路径: src/pages/reset.tsx

import React, { useEffect, useState, useRef } from 'react';
import {
  getAuth,
  verifyPasswordResetCode,
  confirmPasswordReset
} from 'firebase/auth';
import { evaluatePassword, PasswordStrengthResult } from '../utils/passwordStrength.ts';

export default function ResetPasswordPage() {
  const auth = getAuth();
  const [phase, setPhase] = useState<'checking'|'form'|'success'|'error'>('checking');
  const [email, setEmail] = useState('');
  const [oobCode, setOobCode] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [pwStrength, setPwStrength] = useState<PasswordStrengthResult | null>(null);
  const evalCounter = useRef(0);

  useEffect(() => {
    const hash = window.location.hash;
    const queryStringIndex = hash.indexOf('?');
    const queryString = queryStringIndex !== -1 ? hash.substring(queryStringIndex) : '';
    
    const sp = new URLSearchParams(queryString);
    const mode = sp.get('mode');
    const code = sp.get('oobCode');

    if (mode !== 'resetPassword' || !code) {
      setPhase('error');
      setNotice('Invalid or expired password reset link.');
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
        setNotice('Reset link is invalid, expired, or has already been used.');
      }
    })();
  }, [auth]);

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
      setNotice('Password must be at least 8 characters.');
      return;
    }
    if (pwStrength && pwStrength.score < 2) {
      setNotice('Password is too weak. Please choose a stronger one.');
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
      setNotice('Password has been reset successfully. Redirecting to sign in...');
      setTimeout(() => window.location.assign('/#/login'), 2000);
    } catch (e: any) {
      setNotice('Reset failed: ' + (e?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };
  
  const pageBox: React.CSSProperties = { maxWidth: 480, margin: '100px auto', padding: 40, border: '1px solid #ddd', borderRadius: 10, fontFamily: 'sans-serif', textAlign: 'center', background: '#fff' };
  const input: React.CSSProperties = { padding: '12px 14px', fontSize: 15, width: '100%', border: '1px solid #ccc', borderRadius: 6 };
  const btn = (d:boolean): React.CSSProperties => ({ padding:'12px 20px', fontSize:16, cursor:d?'not-allowed':'pointer', background:'#0069d9', color:'#fff', border:'none', borderRadius:6, fontWeight:600, opacity:d?0.7:1 });
  const alert: React.CSSProperties = { marginBottom:16, color:'#fff', padding:12, borderRadius:6, fontSize:14, textAlign:'left' };
  const link: React.CSSProperties = { color:'#0069d9', textDecoration:'underline' };
  const label: React.CSSProperties = { fontSize:12, fontWeight:600, display:'block', marginBottom:4, textAlign:'left' };

  return (
    <div style={pageBox} className="page-fade-in">
      <h2 style={{ marginTop: 0 }}>Reset Password</h2>
      {notice && <div style={{...alert, background: phase === 'error' ? '#d32f2f' : '#222'}} className={phase === 'error' ? 'error-shake' : ''}>{notice}</div>}
      
      {phase === 'checking' && <p>Verifying link...</p>}
      
      {phase === 'error' && (
        <p>
          <a href="/#/login" style={link}>Return to Login</a>
        </p>
      )}

      {phase === 'form' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: 13, color: '#555', margin: '0 0 4px' }}>Account: {email}</p>
          <div>
            <label style={label}>New Password</label>
            <input type="password" placeholder="At least 8 characters" value={p1} onChange={e => setP1(e.target.value)} style={input} autoComplete="new-password"/>
            <PasswordStrengthBar result={pwStrength} />
          </div>
          <div>
            <label style={label}>Confirm New Password</label>
            <input type="password" placeholder="Repeat new password" value={p2} onChange={e => setP2(e.target.value)} style={input} autoComplete="new-password"/>
          </div>
          <button onClick={submit} disabled={loading} style={btn(loading)}>
            {loading ? 'Submitting...' : 'Confirm Reset'}
          </button>
        </div>
      )}

      {phase === 'success' && <p style={{ fontSize: 13 }}>Redirecting...</p>}
      
      {/* --- 关键修改：之前版本在这里有一个多余的按钮，现已删除 --- */}

    </div>
  );
}

const PasswordStrengthBar: React.FC<{ result: PasswordStrengthResult | null }> = ({ result }) => {
    if(!result) return null;
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
