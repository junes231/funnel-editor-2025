import { useEffect, useState } from 'react';
import { auth } from '../firebase.ts';
import { onAuthStateChanged } from 'firebase/auth';

export default function Dashboard() {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // 监听登录状态
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        setAllowed(false);
        setChecking(false);
        window.location.replace('/#/login');
        return;
      }
      try {
        // 确保拿最新的 emailVerified
        await user.reload();
        if (user.emailVerified) {
          setAllowed(true);
        } else {
          setAllowed(false);
          window.location.replace('/#/login'); // 未验证，回登录
        }
      } finally {
        setChecking(false);
      }
    });
    return () => unsub();
  }, []);

  if (checking) {
    return <div style={{padding:40,color:'#0f0'}}>Loading...</div>;
  }

  if (!allowed) {
    return null; // 已经重定向
  }

  return (
    <div style={{padding:40,fontFamily:'sans-serif',color:'#0f0'}}>
      <h2>Dashboard</h2>
      <p>Only logged-in users with verified email addresses can see this。</p>
      <button
        onClick={async ()=>{
          await auth.signOut();
          window.location.replace('/#/login');
        }}
        style={{padding:'8px 16px'}}
      >
        Log out
      </button>
    </div>
  );
}
