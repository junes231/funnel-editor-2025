import { useState, useEffect } from 'react';
import { auth } from '../firebase.ts';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';

// Tracks last resend timestamp (中文注释：限制一分钟一次重发)
let lastResend = 0;

function parseHashQuery() {
  const h = window.location.hash; // e.g. #/login?verified=1
  const i = h.indexOf('?');
  if (i === -1) return {};
  const sp = new URLSearchParams(h.slice(i + 1));
  const o: Record<string,string> = {};
  sp.forEach((v,k) => { o[k] = v; });
  return o;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingUnverified, setPendingUnverified] = useState(false); // show resend section

  useEffect(() => {
    const q = parseHashQuery();
    if (q.verified === '1') {
      setMsg('Email verified. Please sign in.');
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMsg('');
    setPendingUnverified(false);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pwd);
      await cred.user.reload();
      if (!cred.user.emailVerified) {
        setPendingUnverified(true);
        setMsg('Email not verified. Check your inbox or resend verification below.');
        return;
      }
      // Success: redirect to protected area (中文注释：根据你自己的受保护路由调整)
      window.location.replace('/#/');
    } catch (e: any) {
      setMsg(e.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    if (!auth.currentUser) {
      setMsg('Sign in (even if unverified) first so we can resend the email.');
      return;
    }
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) {
      setMsg('Already verified. Just sign in again.');
      setPendingUnverified(false);
      return;
    }
    if (Date.now() - lastResend < 60_000) {
      setMsg('Too many requests. Please wait a minute.');
      return;
    }
    try {
      await sendEmailVerification(auth.currentUser, {
        url: 'https://funnel-editor2025.netlify.app/#/login?verified=1',
        handleCodeInApp: false
      });
      lastResend = Date.now();
      setMsg('Verification email resent. Check your inbox.');
    } catch (e: any) {
      setMsg('Resend failed: ' + (e.message || e.code));
    }
  }

  return (
    <div style={container}>
      <h2>Sign In</h2>
      <form onSubmit={onSubmit} noValidate>
        <input
          style={input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          style={input}
            type="password"
          placeholder="Password"
          value={pwd}
          onChange={e=>setPwd(e.target.value)}
          required
          autoComplete="current-password"
        />
        <button style={button} disabled={loading}>
          {loading ? 'Processing…' : 'Sign In'}
        </button>
      </form>

      {pendingUnverified && (
        <button
          onClick={resendVerification}
          style={{ ...button, background: '#555', marginTop: 10 }}
        >
          Resend Verification Email
        </button>
      )}

      {msg && (
        <div style={{ marginTop: 12, whiteSpace: 'pre-wrap', color: '#064', fontSize: 13 }}>
          {msg}
        </div>
      )}

      <div style={{ marginTop: 20, fontSize: 14 }}>
        No account? <a href="#/register">Create one</a>
      </div>
    </div>
  );
}

// Styles (中文注释：简单内联)
const container:React.CSSProperties = {
  maxWidth:360, margin:'40px auto', fontFamily:'sans-serif'
};
const input:React.CSSProperties = {
  width:'100%', padding:8, marginBottom:10, fontSize:14
};
const button:React.CSSProperties = {
  width:'100%', padding:10, cursor:'pointer',
  background:'#0069d9', color:'#fff', border:'none', borderRadius:4, fontWeight:600
};
