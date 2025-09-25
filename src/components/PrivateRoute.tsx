import { ReactNode, useEffect, useState } from 'react';
import { auth } from '../firebase.ts';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * PrivateRoute（升级版）
 * 状态：
 * - 未登录：跳转 /login
 * - 已登录但邮箱未验证：给提示（可跳回登录或提供重新发送按钮）
 * - 已登录且已验证：渲染子内容
 */
export default function PrivateRoute({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'checking' | 'deny' | 'needVerify' | 'allow'>('checking');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        setState('deny');
        return;
      }
      try {
        await user.reload(); // 更新 emailVerified
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

  if (state === 'checking') {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  if (state === 'deny') {
    // 未登录：重定向
    window.location.replace('/#/login');
    return null;
  }

  if (state === 'needVerify') {
    return (
      <div style={{ padding: 40, lineHeight: 1.6 }}>
        Your email has not been verified。<br />
        1. Go to your mailbox and click the link in the verification email<br />
        2. Come back and log in again<br /><br />
        <a href="#/login">Return to login</a>
      </div>
    );
  }

  return <>{children}</>;
}
