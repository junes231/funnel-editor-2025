import { useState } from 'react';
import { auth } from '../firebase.ts';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { LEGAL_VERSIONS } from '../legal/legalConfig.ts';

// Registration page with email verification + required legal agreement
export default function Register() {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [accept, setAccept] = useState(false); // must accept legal

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!accept) {
      setMsg('You must accept the Terms of Service and Privacy Policy.');
      return;
    }
    setLoading(true);
    setMsg('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pwd);
      await sendEmailVerification(cred.user, {
        url: 'https://funnel-editor2025.netlify.app/#/login?verified=1',
        handleCodeInApp: false
      });
      setMsg(`Verification email sent to: ${email}. Please check your inbox and then sign in.`);
    } catch (e: any) {
      let text = e.message || 'Registration failed.';
      if (e.code === 'auth/email-already-in-use') text = 'This email is already registered. Please sign in.';
      if (e.code === 'auth/weak-password') text = 'Password is too weak. Use at least 8+ characters with complexity.';
      if (e.code === 'auth/invalid-email') text = 'Invalid email format.';
      if (e.code === 'auth/network-request-failed') text = 'Network error. Please try again.';
      setMsg(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={container}>
      <h2>Create Account</h2>
      <form onSubmit={handleRegister} noValidate>
        <label style={label}>
          Email
          <input
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
            style={input}
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
        <label style={label}>
          Password
          <input
            type="password"
            value={pwd}
            onChange={e=>setPwd(e.target.value)}
            required
            minLength={6}
            style={input}
            autoComplete="new-password"
            placeholder="At least 6 chars (recommend 8+)"
          />
        </label>

        <label style={legalRow}>
          <input
            type="checkbox"
            checked={accept}
            onChange={e=>setAccept(e.target.checked)}
            style={{marginRight:8}}
          />
          I agree to the
          &nbsp;<a href="#/legal/terms" target="_blank" rel="noopener noreferrer">
            Terms of Service (v{LEGAL_VERSIONS.tos})
          </a>
          &nbsp;and&nbsp;
          <a href="#/legal/privacy" target="_blank" rel="noopener noreferrer">
            Privacy Policy (v{LEGAL_VERSIONS.privacy})
          </a>.
        </label>

        <button
          type="submit"
          disabled={loading}
          style={button}
        >
          {loading ? 'Processing…' : 'Register & Send Verification Email'}
        </button>
      </form>

      {msg && (
        <div style={{
          marginTop:16,
          whiteSpace:'pre-wrap',
          color: msg.startsWith('Verification email sent') ? '#0a0' : '#c00',
          fontSize:13
        }}>
          {msg}
        </div>
      )}

      <div style={{marginTop:18, fontSize:14}}>
        Already have an account? <a href="#/login">Sign in</a>
      </div>
    </div>
  );
}

// Styles (中文注释：简单内联样式，减少外部依赖)
const container:React.CSSProperties = {
  maxWidth:400, margin:'40px auto', fontFamily:'sans-serif'
};
const label:React.CSSProperties = {
  display:'block', marginBottom:12, fontSize:14, fontWeight:600
};
const input:React.CSSProperties = {
  width:'100%', padding:8, marginTop:4, fontSize:14
};
const legalRow:React.CSSProperties = {
  display:'flex', alignItems:'center', flexWrap:'wrap', gap:4,
  fontSize:12, lineHeight:1.4, margin:'4px 0 16px'
};
const button:React.CSSProperties = {
  width:'100%', padding:10, cursor:'pointer',
  background:'#0069d9', color:'#fff', border:'none', borderRadius:4, fontWeight:600
};
