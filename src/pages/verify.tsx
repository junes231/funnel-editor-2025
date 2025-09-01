import React, { useEffect, useState } from 'react';
import { getAuth, applyActionCode, checkActionCode } from 'firebase/auth';

export default function Verify() {
  const [status, setStatus] = useState<'checking'|'ok'|'error'>('checking');
  const [msg, setMsg] = useState('Verifying, please wait...');

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const mode = sp.get('mode');
    const code = sp.get('oobCode');
    if (mode !== 'verifyEmail' || !code) {
      setStatus('error');
      setMsg('The link is invalid or missing parameters。');
      return;
    }
    const auth = getAuth();
    (async () => {
      try {
        await checkActionCode(auth, code);
        await applyActionCode(auth, code);
        setStatus('ok');
        setMsg('Email verification successful! You will be redirected to the login page...');
        setTimeout(() => {
          window.location.assign('/login?verified=1');
        }, 1800);
      } catch (e: any) {
        setStatus('error');
        setMsg('Email verification failed：' + (e?.message || 'Unknown error'));
      }
    })();
  }, []);

  return (
    <div style={pageBox}>
      <h2>Email Verification</h2>
      <p style={{ lineHeight: 1.6 }}>{msg}</p>
      {status === 'error' && <p><a href="/login" style={link}>Return to login</a></p>}
    </div>
  );
}

const pageBox: React.CSSProperties = {
  maxWidth: 480, margin: '120px auto', padding: 40,
  border: '1px solid #ccc', borderRadius: 8,
  fontFamily: 'Arial', textAlign: 'center'
};
const link: React.CSSProperties = { color: '#007bff', textDecoration: 'underline' };
