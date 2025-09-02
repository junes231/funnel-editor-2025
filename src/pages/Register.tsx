import { useState } from 'react';
import { auth } from '../firebase.ts'; // 确保 ../firebase 导出已初始化的 auth
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';

export default function Register() {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMsg('');
    try {
      console.log('[REG] start', email);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pwd);
      console.log('[REG] created user uid', cred.user.uid, 'verified?', cred.user.emailVerified);

      await sendEmailVerification(cred.user, {
        url: 'https://funnel-editor2025.netlify.app/#/login?verified=1',
        handleCodeInApp: false
      });
      console.log('[REG] verification email sent to', cred.user.email);

      setMsg(`Verification email has been sent to：${email}。Please go to your email and click the link, then return to the login page to log in。`);
      // 可选：自动跳转
      // setTimeout(()=> window.location.replace('/#/login?sent=1'), 1500);
    } catch (e: any) {
      console.error('[REG] ERROR', e.code, e.message);
      let text = e.message || 'Registration failed';
      // 简单错误中文化
      if (e.code === 'auth/email-already-in-use') text = 'This email address has been registered, please log in directly。';
      if (e.code === 'auth/weak-password') text = 'The password is too weak, please use a more complex password。';
      setMsg(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{maxWidth:400, margin:'40px auto', fontFamily:'sans-serif'}}>
      <h2>Create an account</h2>
      <form onSubmit={handleRegister}>
        <label style={{display:'block', marginBottom:8}}>
          Mail
          <input
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
            style={{width:'100%', padding:8, marginTop:4}}
            placeholder="you@example.com"
          />
        </label>
        <label style={{display:'block', marginBottom:12}}>
          password
            <input
              type="password"
              value={pwd}
              onChange={e=>setPwd(e.target.value)}
              required
              minLength={6}
              style={{width:'100%', padding:8, marginTop:4}}
              placeholder="At least 6 digits"
            />
        </label>
        <button
          type="submit"
          disabled={loading}
          style={{width:'100%', padding:10, cursor: loading?'not-allowed':'pointer'}}
        >
          {loading ? 'Processing...' : 'Register and send verification email'}
        </button>
      </form>
      {msg && (
        <div style={{marginTop:16, whiteSpace:'pre-wrap', color:'#0f0'}}>
          {msg}
        </div>
      )}
      <div style={{marginTop:20, fontSize:14}}>
        Already have an account？<a href="#/login">Go to login</a>
      </div>
    </div>
  );
}
