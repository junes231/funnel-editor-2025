import { useState, useEffect } from 'react';
import { auth } from '../firebase.ts';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';

let lastResend = 0;

function parseHashQuery() {
  const h = window.location.hash; // #/login?verified=1
  const i = h.indexOf('?');
  if (i === -1) return {};
  const sp = new URLSearchParams(h.slice(i+1));
  const o:any = {};
  sp.forEach((v,k)=>o[k]=v);
  return o;
}

export default function Login() {
  const [email,setEmail] = useState('');
  const [pwd,setPwd] = useState('');
  const [msg,setMsg] = useState('');
  const [loading,setLoading] = useState(false);
  const [resending,setResending] = useState(false);

  useEffect(()=>{
    const q = parseHashQuery();
    if (q.verified === '1') setMsg('Your email has been verified, please log in。');
  }, []);

  async function onSubmit(e:React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMsg('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pwd);
      await cred.user.reload();
      if (!cred.user.emailVerified) {
        setMsg('Your email address has not been verified. Please go to your email address and click the verification link.。');
        return;
      }
      window.location.replace('/#/'); // 登录成功去首页（受保护区域）
    } catch(e:any) {
      setMsg(e.message || 'Login Failed');
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (resending) return;
    if (!auth.currentUser) {
      setMsg('Requires successful login (even if not verified) before resending。');
      return;
    }
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) {
      setMsg('Already verified, just log in。');
      return;
    }
    if (Date.now() - lastResend < 60000) {
      setMsg('Sending too frequently, try again later。');
      return;
    }
    try {
      setResending(true);
      await sendEmailVerification(auth.currentUser, {
        url: 'https://funnel-editor2025.netlify.app/#/login?verified=1',
        handleCodeInApp: false
      });
      lastResend = Date.now();
      setMsg('Verification email has been resent, please check your mailbox。');
    } catch(e:any) {
      setMsg('Resend failed：'+(e.message||e.code));
    } finally {
      setResending(false);
    }
  }

  return (
    <div style={{maxWidth:360, margin:'40px auto', fontFamily:'sans-serif'}}>
      <h2>Log in</h2>
      <form onSubmit={onSubmit}>
        <input
          style={{width:'100%',padding:8,marginBottom:10}}
          type="email" placeholder="Mail"
          value={email} onChange={e=>setEmail(e.target.value)} required
        />
        <input
          style={{width:'100%',padding:8,marginBottom:10}}
          type="password" placeholder="password"
          value={pwd} onChange={e=>setPwd(e.target.value)} required
        />
        <button style={{width:'100%',padding:10}} disabled={loading}>
          {loading? 'Processing...' : 'Log in'}
        </button>
      </form>
      <button
        onClick={resend}
        disabled={resending}
        style={{marginTop:10,width:'100%',padding:8}}
      >
        {resending?'Sending...' : 'Resend verification email'}
      </button>
      {msg && <div style={{marginTop:12,whiteSpace:'pre-wrap',color:'#0a0'}}>{msg}</div>}
      <div style={{marginTop:20,fontSize:14}}>
        No account？<a href="#/register">Go to register</a>
      </div>
    </div>
  );
}
