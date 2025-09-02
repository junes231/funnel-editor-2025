import React, { useEffect, useState } from 'react';
import { applyActionCode } from 'firebase/auth';
import { auth } from '../firebase.ts';
import { useNavigate } from 'react-router-dom';
import { installLongPressDebug } from '../utils/longPressDebug.ts';

type Status =
  | { state: 'checking' }
  | { state: 'success'; emailVerified: boolean | null }
  | { state: 'error'; code?: string; message: string };

export default function VerifyEmail() {
  const [status, setStatus] = useState<Status>({ state: 'checking' });
  const navigate = useNavigate();

  useEffect(() => {
    // 启用调试（仅 URL 含 debug=1 才真正生效）
    installLongPressDebug();

    let aborted = false;

    const run = async () => {
      const qs = new URLSearchParams(window.location.search);
      const mode = qs.get('mode');
      const oobCode = qs.get('oobCode');

      if (mode !== 'verifyEmail' || !oobCode) {
        if (!aborted) {
          setStatus({ state: 'error', message: 'Missing or invalid verification parameters.' });
        }
        return;
      }

      try {
        console.log('[VerifyEmail] Applying action code:', oobCode);
        await applyActionCode(auth, oobCode);
        console.log('[VerifyEmail] applyActionCode success');

        // 如果当前设备已登录用户，刷新状态
        let emailVerified: boolean | null = null;
        if (auth.currentUser) {
          await auth.currentUser.reload();
          emailVerified = auth.currentUser.emailVerified;
          console.log('[VerifyEmail] currentUser.emailVerified (after reload) =', emailVerified);
        } else {
          console.log('[VerifyEmail] No local currentUser (user may verify from a different device).');
        }

        if (!aborted) {
          setStatus({ state: 'success', emailVerified });
        }
      } catch (e: any) {
        console.error('[VerifyEmail] applyActionCode error', e);
        const code = e?.code;
        let msg = 'Invalid or expired verification link.';
        if (code === 'auth/invalid-action-code') {
            msg = 'This verification link is invalid or has already been used.';
        } else if (code === 'auth/expired-action-code') {
            msg = 'This verification link has expired. Please request a new one.';
        }
        if (!aborted) {
          setStatus({ state: 'error', code, message: msg });
        }
      }
    };

    run();

    return () => { aborted = true; };
  }, []);

  // 成功后跳转
  useEffect(() => {
    if (status.state === 'success') {
      const t = setTimeout(() => {
        // 登录页路由按你项目实际调整（HashRouter 会自动加 #）
        navigate('/login?verified=1', { replace: true });
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [status, navigate]);

  const box: React.CSSProperties = {
    maxWidth: 520,
    margin: '96px auto',
    padding: '38px 44px',
    fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif',
    border: '1px solid #e0e0e0',
    borderRadius: 14,
    background: '#fff',
    boxShadow: '0 4px 18px rgba(0,0,0,0.06)'
  };

  function renderContent() {
    if (status.state === 'checking') {
      return <p>Verifying your email...</p>;
    }
    if (status.state === 'success') {
      return (
        <div>
          <p style={{ color: '#2e7d32', fontWeight: 600, marginBottom: 10 }}>
            Email verified successfully!
          </p>
          {status.emailVerified !== null && (
            <p style={{ fontSize: 13, color: '#555' }}>
              Local user emailVerified = {String(status.emailVerified)}
            </p>
          )}
          <p style={{ fontSize: 13, color: '#666', marginTop: 16 }}>
            Redirecting to sign in...
          </p>
        </div>
      );
    }
    // error
    return (
      <div>
        <p style={{ color: '#d32f2f', fontWeight: 600, marginBottom: 8 }}>
          {status.message}
        </p>
        {status.code && (
          <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
            Code: {status.code}
          </p>
        )}
        <p style={{ marginTop: 18 }}>
          <a href="/#/login" style={{ color: '#1976d2', textDecoration: 'none' }}>
            Back to Sign In
          </a>
        </p>
      </div>
    );
  }

  return (
    <div style={box}>
      <h2 style={{ margin: 0, fontSize: 24, lineHeight: '30px' }}>Email Verification</h2>
      <div style={{ marginTop: 24 }}>{renderContent()}</div>
      <div style={{ marginTop: 32 }}>
        <small style={{ color: '#888' }}>
          Debug? Append &debug=1 then long‑press (3s) anywhere on mobile to open log panel.
        </small>
      </div>
    </div>
  );
}
