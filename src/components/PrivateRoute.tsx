// src/components/PrivateRoute.tsx

import { ReactNode, useEffect, useState } from 'react';
import { auth } from '../firebase.ts'; // 确保路径正确
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom'; // 1. 导入 useNavigate

export default function PrivateRoute({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'checking' | 'deny' | 'needVerify' | 'allow'>('checking');
  const navigate = useNavigate(); // 2. 获取 navigate 函数

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        setState('deny');
        return;
      }
      try {
        await user.reload();
      } catch (e) {
        console.warn('[PrivateRoute] reload failed', e);
      }
      if (user.emailVerified) {
        setState('allow');
      } else {
        setState('needVerify');
      }
    });
    return () => unsub();
  }, []);

  // 3. 使用 useEffect 来处理跳转逻辑，以避免在渲染期间执行副作用
  useEffect(() => {
    if (state === 'deny') {
      navigate('/login'); // 使用 navigate 进行跳转
    }
  }, [state, navigate]);

  if (state === 'checking') {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  if (state === 'needVerify') {
    return (
      <div style={{ padding: 40, lineHeight: 1.6 }}>
        Your email has not been verified。<br />
        1. Go to your mailbox and click the link in the verification email<br />
        2. Come back and log in again<br /><br />
        {/* 这里也可以使用 navigate */}
        <a href="#/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
          Return to login
        </a>
      </div>
    );
  }

  // 当 state 为 'deny' 时，因为 useEffect 会执行跳转，这里可以返回 null
  if (state === 'allow') {
    return <>{children}</>;
  }

  return null; // 其他情况（如 'deny' 时）不渲染任何内容，等待跳转
}
